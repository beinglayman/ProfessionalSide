/**
 * Demo Service for Career Stories
 *
 * Manages demo/sandbox data in parallel tables, completely isolated from
 * real user data. This allows users to test the Career Stories feature
 * in production without affecting their actual work history.
 *
 * Tables used:
 * - demo_tool_activities (instead of tool_activities)
 * - demo_story_clusters (instead of story_clusters)
 * - demo_career_stories (instead of career_stories)
 *
 * @module demo.service
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { generateMockActivities } from './mock-data.service';
import { ClusteringService } from './clustering.service';
import { RefExtractorService } from './ref-extractor.service';
import { getModelSelector, ModelSelectorService } from '../ai/model-selector.service';
import { ChatCompletionMessageParam } from 'openai/resources/index';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum activities required to form a cluster */
const MIN_CLUSTER_SIZE = 2;

/** Duration in days for each journal entry time window */
const JOURNAL_WINDOW_SIZE_DAYS = 14;

/** Minimum activities required to create a journal entry */
const MIN_ACTIVITIES_PER_ENTRY = 3;

/** Milliseconds in a day */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Timeout for all narrative generation (30 seconds) */
const NARRATIVE_GENERATION_TIMEOUT_MS = 30000;

/** LLM temperature for narrative generation */
const NARRATIVE_TEMPERATURE = 0.7;

/** Max tokens for narrative generation */
const NARRATIVE_MAX_TOKENS = 1500;

/** Default workspace ID for demo mode when user has no workspace */
const DEFAULT_DEMO_WORKSPACE_ID = 'demo-workspace';

/** Default persona for demo mode when user data is unavailable */
export const DEFAULT_DEMO_PERSONA = {
  displayName: 'Demo User',
  emails: ['demo@example.com'],
  identities: {},
};

// =============================================================================
// LOGGER (DHH: Replace console.log with conditional logging)
// =============================================================================

const DEBUG_DEMO = process.env.DEBUG_DEMO === 'true' || process.env.NODE_ENV === 'development';

const log = {
  debug: (msg: string, data?: object) => DEBUG_DEMO && console.log(`[DemoService] ${msg}`, data ?? ''),
  info: (msg: string, data?: object) => DEBUG_DEMO && console.log(`[DemoService] ${msg}`, data ?? ''),
  warn: (msg: string, data?: object) => console.warn(`[DemoService] ${msg}`, data ?? ''),
  error: (msg: string, data?: object) => console.error(`[DemoService] ${msg}`, data ?? ''),
};

// =============================================================================
// UTILITIES (KB: Extract reusable helpers)
// =============================================================================

/**
 * Execute a promise with timeout. Returns undefined if timeout is reached.
 *
 * WARNING: This does NOT cancel the underlying promise. The original work
 * continues executing in the background even after timeout. This is a
 * "UI convenience" timeout, not a resource protection mechanism.
 * For cancellable operations, use AbortController instead.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T | undefined> {
  const timeout = new Promise<undefined>((resolve) => {
    setTimeout(() => {
      log.warn(`${label} timeout reached after ${ms}ms`);
      resolve(undefined);
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

// =============================================================================
// DEPENDENCY INJECTION (SM: Class-based DI)
// =============================================================================

export interface DemoServiceDeps {
  prisma: PrismaClient;
  clusteringService: ClusteringService;
  refExtractor: RefExtractorService;
}

// Default instances - can be overridden via configureDemoService for testing
let deps: DemoServiceDeps = {
  prisma: new PrismaClient(),
  clusteringService: null as unknown as ClusteringService, // Lazy init below
  refExtractor: new RefExtractorService(),
};
deps.clusteringService = new ClusteringService(deps.prisma);

/**
 * Configure service dependencies (primarily for testing)
 */
export function configureDemoService(overrides: Partial<DemoServiceDeps>): void {
  if (overrides.prisma) {
    deps.prisma = overrides.prisma;
    // Re-create clustering service with new prisma instance unless also provided
    deps.clusteringService = overrides.clusteringService || new ClusteringService(overrides.prisma);
  }
  if (overrides.clusteringService) deps.clusteringService = overrides.clusteringService;
  if (overrides.refExtractor) deps.refExtractor = overrides.refExtractor;
}

// =============================================================================
// HELPER FUNCTIONS (Exported for testing)
// =============================================================================

/**
 * Extract skills from journal entry content.
 * Looks for common technical keywords.
 */
export function extractSkillsFromContent(content: string): string[] {
  const skillKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
    'API', 'REST', 'GraphQL', 'Database', 'PostgreSQL', 'MongoDB',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'CI/CD', 'Git', 'Testing', 'Architecture', 'Performance',
    'Security', 'Authentication', 'OAuth', 'JWT',
    'Frontend', 'Backend', 'Full-stack', 'DevOps',
    'Agile', 'Scrum', 'Code Review', 'Documentation',
  ];

  const lowerContent = content.toLowerCase();
  return skillKeywords.filter((skill) =>
    lowerContent.includes(skill.toLowerCase())
  ).slice(0, 5); // Limit to 5 skills
}

/**
 * Compute date range from timestamps.
 * Returns undefined if timestamps array is empty.
 */
export function computeDateRange(timestamps: Date[]): { start: string; end: string } | undefined {
  if (timestamps.length === 0) return undefined;
  const times = timestamps.map((t) => t.getTime());
  return {
    start: new Date(Math.min(...times)).toISOString(),
    end: new Date(Math.max(...times)).toISOString(),
  };
}

/**
 * Extract unique tool types from activities.
 */
export function extractToolTypes(activities: Array<{ source: string }>): string[] {
  return [...new Set(activities.map((a) => a.source))];
}

/**
 * Build tool summary string (e.g., "3 github, 2 jira")
 */
export function buildToolSummary(activities: Array<{ source: string }>): string {
  const toolCounts: Record<string, number> = {};
  activities.forEach((a) => {
    toolCounts[a.source] = (toolCounts[a.source] || 0) + 1;
  });
  return Object.entries(toolCounts)
    .map(([tool, count]) => `${count} ${tool}`)
    .join(', ');
}

// =============================================================================
// TYPES
// =============================================================================

export interface DemoCluster {
  id: string;
  name: string | null;
  activityCount: number;
  activities?: DemoActivity[];
  metrics?: {
    dateRange?: { start: string; end: string };
    toolTypes?: string[];
  };
}

export interface DemoActivity {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: Date;
  crossToolRefs: string[];
}

interface DemoJournalEntryData {
  id: string;
  title: string;
  activityIds: string[];
  timeRangeStart: Date;
  timeRangeEnd: Date;
}

interface SeedDemoDataResult {
  activitiesSeeded: number;
  clustersCreated: number;
  entriesCreated: number;
  clusters: DemoCluster[];
}

// =============================================================================
// ORCHESTRATOR: seedDemoData (MF: Extract into smaller functions)
// =============================================================================

/**
 * Seed demo data for a user.
 * Creates mock activities in the demo tables and clusters them.
 *
 * (MF: Now orchestrates smaller, focused functions)
 */
export async function seedDemoData(userId: string): Promise<SeedDemoDataResult> {
  log.info('Starting demo data seed', { userId });

  // Step 1: Clear existing data
  await clearDemoData(userId);

  // Step 2: Seed activities
  const activities = await seedDemoActivities(userId);
  log.debug(`Seeded ${activities.length} activities`);

  // Step 3: Cluster activities
  const clusters = await clusterDemoActivities(userId, activities);
  log.debug(`Created ${clusters.length} clusters`);

  // Step 4: Create journal entries
  const journalEntries = await seedDemoJournalEntries(userId, activities);
  log.debug(`Created ${journalEntries.length} journal entries`);

  // Step 5: Generate narratives (with timeout)
  await generateAllNarratives(userId, journalEntries);

  log.info('Demo data seed complete', {
    activities: activities.length,
    clusters: clusters.length,
    entries: journalEntries.length,
  });

  return {
    activitiesSeeded: activities.length,
    clustersCreated: clusters.length,
    entriesCreated: journalEntries.length,
    clusters,
  };
}

/**
 * Seed mock activities into demo tables
 */
async function seedDemoActivities(userId: string): Promise<Array<{
  id: string;
  source: string;
  sourceId: string;
  title: string;
  description: string | null;
  timestamp: Date;
  crossToolRefs: string[];
}>> {
  const mockActivities = generateMockActivities();
  const activitiesToCreate = mockActivities.map((activity) => {
    const allText = [
      activity.sourceId,
      activity.title,
      activity.description || '',
      activity.rawData ? JSON.stringify(activity.rawData) : '',
    ].join(' ');
    const refs = deps.refExtractor.extractRefs(allText);

    return {
      userId,
      source: activity.source,
      sourceId: activity.sourceId,
      sourceUrl: activity.sourceUrl || null,
      title: activity.title,
      description: activity.description || null,
      timestamp: activity.timestamp,
      crossToolRefs: refs,
      rawData: (activity.rawData || Prisma.JsonNull) as Prisma.InputJsonValue,
    };
  });

  await deps.prisma.demoToolActivity.createMany({
    data: activitiesToCreate,
    skipDuplicates: true,
  });

  return deps.prisma.demoToolActivity.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Cluster demo activities and persist to database
 */
async function clusterDemoActivities(
  userId: string,
  activities: Array<{
    id: string;
    source: string;
    sourceId: string;
    title: string;
    description: string | null;
    timestamp: Date;
    crossToolRefs: string[];
  }>
): Promise<DemoCluster[]> {
  const clusterResults = deps.clusteringService.clusterActivitiesInMemory(
    activities.map((a) => ({
      id: a.id,
      source: a.source,
      sourceId: a.sourceId,
      title: a.title,
      description: a.description,
      timestamp: a.timestamp,
      crossToolRefs: a.crossToolRefs,
    })),
    { minClusterSize: MIN_CLUSTER_SIZE }
  );

  const clusters: DemoCluster[] = [];

  for (const result of clusterResults) {
    const cluster = await deps.prisma.demoStoryCluster.create({
      data: { userId, name: result.name },
    });

    await deps.prisma.demoToolActivity.updateMany({
      where: { id: { in: result.activityIds } },
      data: { clusterId: cluster.id },
    });

    const clusterActivities = activities.filter((a) => result.activityIds.includes(a.id));

    clusters.push({
      id: cluster.id,
      name: cluster.name,
      activityCount: result.activityIds.length,
      metrics: {
        dateRange: computeDateRange(clusterActivities.map((a) => a.timestamp)),
        toolTypes: extractToolTypes(clusterActivities),
      },
    });
  }

  return clusters;
}

/**
 * Generate narratives for all journal entries with timeout
 */
async function generateAllNarratives(
  userId: string,
  entries: DemoJournalEntryData[]
): Promise<void> {
  const selector = getModelSelector();
  if (!selector) {
    log.info('ModelSelector not available, skipping narrative generation');
    return;
  }

  log.debug('ModelSelector available', selector.getModelInfo());

  const narrativePromises = entries.map(async (entry) => {
    try {
      log.debug(`Generating narrative for entry ${entry.id}`);
      await regenerateDemoJournalNarrative(userId, entry.id, { style: 'professional' });
      log.debug(`Narrative generated for entry ${entry.id}`);
    } catch (error) {
      log.warn(`Failed to generate narrative for entry ${entry.id}`, {
        error: (error as Error).message,
      });
    }
  });

  log.info('Waiting for narrative generation...');
  await withTimeout(
    Promise.allSettled(narrativePromises),
    NARRATIVE_GENERATION_TIMEOUT_MS,
    'Narrative generation'
  );
  log.info('Narrative generation complete');
}

// =============================================================================
// JOURNAL ENTRY SEEDING
// =============================================================================

/**
 * Seed demo journal entries using bi-weekly time windows.
 * Creates 4-6 entries spanning the activity date range.
 */
async function seedDemoJournalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string }>
): Promise<DemoJournalEntryData[]> {
  if (activities.length === 0) return [];

  // Query workspace ONCE before the loop (RJ: avoid N+1)
  const workspace = await deps.prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
  });
  const workspaceId = workspace?.id || DEFAULT_DEMO_WORKSPACE_ID;

  const sorted = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const earliest = sorted[0].timestamp;
  const latest = sorted[sorted.length - 1].timestamp;
  const entries: DemoJournalEntryData[] = [];

  let windowStart = earliest;

  while (windowStart.getTime() <= latest.getTime()) {
    const windowEnd = new Date(windowStart.getTime() + JOURNAL_WINDOW_SIZE_DAYS * MS_PER_DAY);

    const windowActivities = sorted.filter(
      (a) =>
        a.timestamp.getTime() >= windowStart.getTime() &&
        a.timestamp.getTime() < windowEnd.getTime()
    );

    if (windowActivities.length >= MIN_ACTIVITIES_PER_ENTRY) {
      const entry = await createJournalEntryFromWindow(userId, windowActivities, workspaceId);
      entries.push(entry);
    }

    windowStart = windowEnd;
  }

  return entries;
}

/**
 * Create a single journal entry from a window of activities
 */
async function createJournalEntryFromWindow(
  userId: string,
  windowActivities: Array<{ id: string; timestamp: Date; title: string; source: string }>,
  workspaceId: string
): Promise<DemoJournalEntryData> {
  const startDate = windowActivities[0].timestamp;
  const endDate = windowActivities[windowActivities.length - 1].timestamp;

  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const title = `Week of ${startStr} - ${endStr}`;

  const toolSummary = buildToolSummary(windowActivities);
  const description = `${windowActivities.length} activities across ${toolSummary}`;

  const entry = await deps.prisma.demoJournalEntry.create({
    data: {
      userId,
      workspaceId,
      title,
      description,
      fullContent: `# ${title}\n\n${description}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
      activityIds: windowActivities.map((a) => a.id),
      groupingMethod: 'time',
      timeRangeStart: startDate,
      timeRangeEnd: endDate,
      generatedAt: null,
    },
  });

  return {
    id: entry.id,
    title: entry.title,
    activityIds: entry.activityIds,
    timeRangeStart: startDate,
    timeRangeEnd: endDate,
  };
}

// =============================================================================
// PUBLIC API: Clusters
// =============================================================================

/**
 * Get all demo clusters for a user.
 */
export async function getDemoClusters(userId: string): Promise<DemoCluster[]> {
  const clusters = await deps.prisma.demoStoryCluster.findMany({
    where: { userId },
    include: {
      activities: true,
      _count: { select: { activities: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return clusters.map((cluster) => ({
    id: cluster.id,
    name: cluster.name,
    activityCount: cluster._count.activities,
    metrics: {
      dateRange: computeDateRange(cluster.activities.map((a) => a.timestamp)),
      toolTypes: extractToolTypes(cluster.activities),
    },
  }));
}

/**
 * Get a single demo cluster with activities.
 */
export async function getDemoClusterById(
  userId: string,
  clusterId: string
): Promise<DemoCluster | null> {
  const cluster = await deps.prisma.demoStoryCluster.findFirst({
    where: { id: clusterId, userId },
    include: {
      activities: { orderBy: { timestamp: 'desc' } },
    },
  });

  if (!cluster) return null;

  return {
    id: cluster.id,
    name: cluster.name,
    activityCount: cluster.activities.length,
    activities: cluster.activities.map((a) => ({
      id: a.id,
      source: a.source,
      sourceId: a.sourceId,
      sourceUrl: a.sourceUrl,
      title: a.title,
      description: a.description,
      timestamp: a.timestamp,
      crossToolRefs: a.crossToolRefs,
    })),
    metrics: {
      dateRange: computeDateRange(cluster.activities.map((a) => a.timestamp)),
      toolTypes: extractToolTypes(cluster.activities),
    },
  };
}

/**
 * Get demo activities for a cluster (for STAR generation).
 */
export async function getDemoActivitiesForCluster(
  userId: string,
  clusterId: string
): Promise<DemoActivity[]> {
  const activities = await deps.prisma.demoToolActivity.findMany({
    where: { userId, clusterId },
    orderBy: { timestamp: 'desc' },
  });

  return activities.map((a) => ({
    id: a.id,
    source: a.source,
    sourceId: a.sourceId,
    sourceUrl: a.sourceUrl,
    title: a.title,
    description: a.description,
    timestamp: a.timestamp,
    crossToolRefs: a.crossToolRefs,
  }));
}

/**
 * Check if a cluster ID is a demo cluster.
 */
export async function isDemoCluster(clusterId: string): Promise<boolean> {
  const count = await deps.prisma.demoStoryCluster.count({
    where: { id: clusterId },
  });
  return count > 0;
}

/**
 * Clear all demo data for a user.
 * Uses transaction to ensure atomic deletion (no partial state on failure).
 */
export async function clearDemoData(userId: string): Promise<void> {
  await deps.prisma.$transaction([
    deps.prisma.demoCareerStory.deleteMany({
      where: { cluster: { userId } },
    }),
    deps.prisma.demoStoryCluster.deleteMany({
      where: { userId },
    }),
    deps.prisma.demoToolActivity.deleteMany({
      where: { userId },
    }),
    deps.prisma.demoJournalEntry.deleteMany({
      where: { userId },
    }),
  ]);
}

// =============================================================================
// PUBLIC API: Journal Entries
// =============================================================================

/**
 * Demo Journal Entry formatted for frontend display.
 * Matches the JournalEntry type expected by JournalCard component.
 */
export interface DemoJournalEntryFormatted {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  organizationName: string | null;
  description: string;
  fullContent: string;
  abstractContent: string;
  createdAt: Date;
  lastModified: Date;
  author: {
    id: string;
    name: string;
    avatar: string;
    position: string;
  };
  collaborators: Array<{ id: string; name: string; avatar: string; role: string }>;
  reviewers: Array<{ id: string; name: string; avatar: string; department: string }>;
  artifacts: Array<{ id: string; name: string; type: string; url: string }>;
  skills: string[];
  outcomes: Array<{ category: string; title: string; description: string }>;
  visibility: 'private' | 'workspace' | 'network';
  isPublished: boolean;
  likes: number;
  comments: number;
  hasLiked: boolean;
  tags: string[];
  category: string;
  appreciates: number;
  hasAppreciated: boolean;
  activityIds: string[];
  groupingMethod: string | null;
  timeRangeStart: Date | null;
  timeRangeEnd: Date | null;
  generatedAt: Date | null;
}

/**
 * Get demo journal entries for a user.
 * Returns entries formatted for the JournalCard component.
 */
export async function getDemoJournalEntries(userId: string): Promise<DemoJournalEntryFormatted[]> {
  const entries = await deps.prisma.demoJournalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const user = await deps.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  const workspace = await deps.prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    select: { id: true, name: true },
  });

  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    workspaceId: workspace?.id || DEFAULT_DEMO_WORKSPACE_ID,
    workspaceName: workspace?.name || 'Demo Workspace',
    organizationName: null,
    description: e.description,
    fullContent: e.fullContent,
    abstractContent: e.description,
    createdAt: e.createdAt,
    lastModified: e.createdAt,
    author: {
      id: user?.id || userId,
      name: user?.name || 'Demo User',
      avatar: '',
      position: 'Software Engineer',
    },
    collaborators: [],
    reviewers: [],
    artifacts: [],
    skills: extractSkillsFromContent(e.fullContent),
    outcomes: [],
    visibility: 'workspace' as const,
    isPublished: false,
    likes: 0,
    comments: 0,
    hasLiked: false,
    tags: ['demo'],
    category: 'achievement',
    appreciates: 0,
    hasAppreciated: false,
    activityIds: e.activityIds,
    groupingMethod: e.groupingMethod,
    timeRangeStart: e.timeRangeStart,
    timeRangeEnd: e.timeRangeEnd,
    generatedAt: e.generatedAt,
  }));
}

/**
 * Update activity IDs for a demo journal entry.
 */
export async function updateDemoJournalEntryActivities(
  userId: string,
  entryId: string,
  activityIds: string[]
): Promise<{ id: string; activityIds: string[]; groupingMethod: string }> {
  const entry = await deps.prisma.demoJournalEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!entry) {
    throw new DemoServiceError('Demo journal entry not found', 'ENTRY_NOT_FOUND');
  }

  const updated = await deps.prisma.demoJournalEntry.update({
    where: { id: entryId },
    data: {
      activityIds,
      groupingMethod: 'manual',
      lastGroupingEditAt: new Date(),
    },
  });

  return {
    id: updated.id,
    activityIds: updated.activityIds,
    groupingMethod: updated.groupingMethod || 'manual',
  };
}

/**
 * Update activity assignments for a demo cluster.
 * Sets groupingMethod to 'manual' when activities are changed.
 */
export async function updateDemoClusterActivities(
  userId: string,
  clusterId: string,
  activityIds: string[]
): Promise<{ id: string; activityCount: number; groupingMethod: string }> {
  const cluster = await deps.prisma.demoStoryCluster.findFirst({
    where: { id: clusterId, userId },
  });

  if (!cluster) {
    throw new DemoServiceError('Demo cluster not found', 'CLUSTER_NOT_FOUND');
  }

  await deps.prisma.demoToolActivity.updateMany({
    where: { clusterId },
    data: { clusterId: null },
  });

  if (activityIds.length > 0) {
    await deps.prisma.demoToolActivity.updateMany({
      where: { id: { in: activityIds }, userId },
      data: { clusterId },
    });
  }

  await deps.prisma.demoStoryCluster.update({
    where: { id: clusterId },
    data: {
      groupingMethod: 'manual',
      lastGroupingEditAt: new Date(),
    },
  });

  return {
    id: clusterId,
    activityCount: activityIds.length,
    groupingMethod: 'manual',
  };
}

// =============================================================================
// NARRATIVE GENERATION
// =============================================================================

/**
 * Regenerate narrative for a demo journal entry.
 * Uses ModelSelectorService (GPT-4o) for LLM-powered narrative generation.
 * Falls back to structured content if LLM is unavailable.
 */
export async function regenerateDemoJournalNarrative(
  userId: string,
  entryId: string,
  options?: { style?: string; maxRetries?: number }
): Promise<{
  id: string;
  title: string;
  description: string;
  fullContent: string;
  generatedAt: Date;
}> {
  const entry = await deps.prisma.demoJournalEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!entry) {
    throw new DemoServiceError('Demo journal entry not found', 'ENTRY_NOT_FOUND');
  }

  const activities = await deps.prisma.demoToolActivity.findMany({
    where: { id: { in: entry.activityIds }, userId },
    orderBy: { timestamp: 'asc' },
  });

  if (activities.length === 0) {
    throw new DemoServiceError('No activities found for this journal entry', 'NO_ACTIVITIES');
  }

  const toolSummary = buildToolSummary(activities);
  const selector = getModelSelector();
  let fullContent: string;
  let description: string;

  if (selector) {
    try {
      const result = await generateNarrativeWithLLM(selector, entry.title, activities, options?.style);
      fullContent = result.fullContent;
      description = result.description;
    } catch (error) {
      log.warn('LLM narrative generation failed, using fallback', { error: (error as Error).message });
      const fallback = generateFallbackNarrative(entry.title, activities, toolSummary);
      fullContent = fallback.fullContent;
      description = fallback.description;
    }
  } else {
    const fallback = generateFallbackNarrative(entry.title, activities, toolSummary);
    fullContent = fallback.fullContent;
    description = fallback.description;
  }

  const updated = await deps.prisma.demoJournalEntry.update({
    where: { id: entryId },
    data: { description, fullContent, generatedAt: new Date() },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    fullContent: updated.fullContent,
    generatedAt: updated.generatedAt!,
  };
}

/**
 * Generate narrative using LLM (GPT-4o via ModelSelectorService)
 */
async function generateNarrativeWithLLM(
  selector: ModelSelectorService,
  title: string,
  activities: Array<{
    source: string;
    title: string;
    description: string | null;
    timestamp: Date;
  }>,
  style?: string
): Promise<{ fullContent: string; description: string }> {
  const activitiesText = activities
    .map((a) => {
      const date = a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `- [${date}] ${a.source}: ${a.title}${a.description ? ` - ${a.description}` : ''}`;
    })
    .join('\n');

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a professional journal writer helping someone document their work accomplishments.
Write in first person with a ${style || 'professional'} tone.
Focus on achievements, learnings, and impact.
Be concise but meaningful.
Always return valid JSON.`,
    },
    {
      role: 'user',
      content: `Generate a journal entry narrative for "${title}" based on these activities:

${activitiesText}

Return JSON with this structure:
{
  "description": "A 1-2 sentence summary of the key accomplishments",
  "fullContent": "A detailed narrative (3-5 paragraphs) in first person describing the work, challenges, solutions, and outcomes. Use markdown formatting."
}`,
    },
  ];

  const result = await selector.executeTask('generate', messages, 'high', {
    temperature: NARRATIVE_TEMPERATURE,
    maxTokens: NARRATIVE_MAX_TOKENS,
  });

  // Strip markdown code blocks if present
  let jsonContent = result.content.trim();
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed.fullContent || !parsed.description) {
      throw new Error('Missing required fields in LLM response');
    }
    return { fullContent: parsed.fullContent, description: parsed.description };
  } catch (parseError) {
    log.error('Failed to parse LLM response', {
      error: (parseError as Error).message,
      contentPreview: jsonContent.substring(0, 200),
    });
    throw new Error(`LLM returned invalid JSON: ${(parseError as Error).message}`);
  }
}

/**
 * Generate fallback narrative when LLM is unavailable
 */
function generateFallbackNarrative(
  title: string,
  activities: Array<{ source: string; title: string; timestamp: Date }>,
  toolSummary: string
): { fullContent: string; description: string } {
  const description = `${activities.length} activities across ${toolSummary}`;

  const activitySummaries = activities.map((a) => {
    const date = a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `- **${date}** [${a.source}]: ${a.title}`;
  });

  const fullContent = `# ${title}

## Summary
${description}

## Activities
${activitySummaries.join('\n')}

---
*This is a structured summary. Click regenerate when LLM service is available for a richer narrative.*

*Generated at ${new Date().toISOString()}*`;

  return { fullContent, description };
}

// =============================================================================
// ERROR HANDLING (RC: Reusable error types)
// =============================================================================

export class DemoServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'ENTRY_NOT_FOUND' | 'CLUSTER_NOT_FOUND' | 'NO_ACTIVITIES' | 'INVALID_INPUT'
  ) {
    super(message);
    this.name = 'DemoServiceError';
  }
}
