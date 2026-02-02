/**
 * Seed Service for Career Stories
 *
 * Generates sample data in parallel tables, completely isolated from
 * real user data. Once seeded, the app works identically to production.
 * This allows users to test the Career Stories feature without affecting
 * their actual work history.
 *
 * Tables used:
 * - demo_tool_activities: Raw activity data from integrations (source-level)
 * - JournalEntry (sourceMode='demo'): Journal entries with activityIds inline
 * - CareerStory (sourceMode='demo'): Career stories (if needed)
 *
 * NOTE: DemoStoryCluster has been removed. Clustering is now done in-memory
 * and stored inline in JournalEntry (activityIds, groupingMethod, clusterRef).
 *
 * @module seed.service
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { generateMockActivities } from './mock-data.service';
import { ClusteringService } from './clustering.service';
import { RefExtractorService } from './ref-extractor.service';
import { getModelSelector } from '../ai/model-selector.service';
// NOTE: ModelSelectorService, ChatCompletionMessageParam removed
// Narrative generation now lives in JournalService.regenerateNarrative()

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

// NOTE: NARRATIVE_TEMPERATURE and NARRATIVE_MAX_TOKENS removed
// These are now in JournalService

/** Default workspace ID for demo mode when user has no workspace */
const DEFAULT_DEMO_WORKSPACE_ID = 'demo-workspace';

/** Default persona for demo/seed mode when user data is unavailable */
export const DEFAULT_SEED_PERSONA = {
  displayName: 'Demo User',
  emails: ['demo@example.com'],
  identities: {},
};

/** @deprecated Use DEFAULT_SEED_PERSONA instead */
export const DEFAULT_DEMO_PERSONA = DEFAULT_SEED_PERSONA;

// =============================================================================
// LOGGER (DHH: Replace console.log with conditional logging)
// =============================================================================

const DEBUG_DEMO = process.env.DEBUG_DEMO === 'true' || process.env.NODE_ENV === 'development';

const log = {
  debug: (msg: string, data?: object) => DEBUG_DEMO && console.log(`[SeedService] ${msg}`, data ?? ''),
  info: (msg: string, data?: object) => DEBUG_DEMO && console.log(`[SeedService] ${msg}`, data ?? ''),
  warn: (msg: string, data?: object) => console.warn(`[SeedService] ${msg}`, data ?? ''),
  error: (msg: string, data?: object) => console.error(`[SeedService] ${msg}`, data ?? ''),
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

export interface SeedServiceDeps {
  prisma: PrismaClient;
  clusteringService: ClusteringService;
  refExtractor: RefExtractorService;
}

// Default instances - can be overridden via configureSeedService for testing
let deps: SeedServiceDeps = {
  prisma: new PrismaClient(),
  clusteringService: null as unknown as ClusteringService, // Lazy init below
  refExtractor: new RefExtractorService(),
};
deps.clusteringService = new ClusteringService(deps.prisma);

/**
 * Configure service dependencies (primarily for testing)
 */
export function configureSeedService(overrides: Partial<SeedServiceDeps>): void {
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

/**
 * In-memory cluster result from clustering service.
 * Used only during journal entry creation - not persisted to database.
 * Clustering info is stored inline in JournalEntry (activityIds, groupingMethod, clusterRef).
 */
export interface InMemoryCluster {
  name: string | null;
  activityIds: string[];
  activities: DemoActivity[];
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
  groupingMethod: 'time' | 'cluster';
}

/** Summary of a created journal entry for UI animation */
export interface EntryPreview {
  id: string;
  title: string;
  groupingMethod: 'time' | 'cluster';
  activityCount: number;
}

export interface SeedDemoDataResult {
  activitiesSeeded: number;
  /** Activity counts by source (e.g., { github: 18, jira: 14 }) */
  activitiesBySource: Record<string, number>;
  clustersCreated: number;
  entriesCreated: number;
  temporalEntriesCreated: number;
  clusterEntriesCreated: number;
  /** Entry previews for UI animation */
  entryPreviews: EntryPreview[];
  clusters: InMemoryCluster[];
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

  // Step 2b: Count activities by source
  const activitiesBySource: Record<string, number> = {};
  for (const activity of activities) {
    activitiesBySource[activity.source] = (activitiesBySource[activity.source] || 0) + 1;
  }
  log.debug('Activities by source:', activitiesBySource);

  // Step 3: Cluster activities (in-memory, no database persistence)
  const activitiesWithSourceUrl = activities.map((a) => ({
    ...a,
    sourceUrl: a.sourceUrl ?? null,
  }));
  const clusters = clusterDemoActivities(activitiesWithSourceUrl);
  log.debug(`Created ${clusters.length} in-memory clusters`);

  // Step 4: Create journal entries (using in-memory clusters)
  const journalResult = await seedDemoJournalEntries(userId, activities, clusters);
  log.debug(`Created ${journalResult.entries.length} journal entries (${journalResult.temporalCount} temporal, ${journalResult.clusterCount} cluster)`);

  // Step 5: Generate narratives (with timeout)
  await generateAllNarratives(userId, journalResult.entries);

  log.info('Demo data seed complete', {
    activities: activities.length,
    clusters: clusters.length,
    entries: journalResult.entries.length,
    temporalEntries: journalResult.temporalCount,
    clusterEntries: journalResult.clusterCount,
  });

  // Build entry previews for UI animation
  const entryPreviews: EntryPreview[] = journalResult.entries.map(entry => ({
    id: entry.id,
    title: entry.title,
    groupingMethod: entry.groupingMethod as 'time' | 'cluster',
    activityCount: entry.activityIds?.length || 0,
  }));

  return {
    activitiesSeeded: activities.length,
    activitiesBySource,
    clustersCreated: clusters.length,
    entriesCreated: journalResult.entries.length,
    temporalEntriesCreated: journalResult.temporalCount,
    clusterEntriesCreated: journalResult.clusterCount,
    entryPreviews,
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
  sourceUrl: string | null;
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
 * Cluster demo activities in-memory (no database persistence).
 * Clusters are stored inline in JournalEntry.activityIds.
 */
function clusterDemoActivities(
  activities: Array<{
    id: string;
    source: string;
    sourceId: string;
    sourceUrl: string | null;
    title: string;
    description: string | null;
    timestamp: Date;
    crossToolRefs: string[];
  }>
): InMemoryCluster[] {
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

  return clusterResults.map((result) => {
    const clusterActivities = activities.filter((a) => result.activityIds.includes(a.id));
    return {
      name: result.name,
      activityIds: result.activityIds,
      activities: clusterActivities.map((a) => ({
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
        dateRange: computeDateRange(clusterActivities.map((a) => a.timestamp)),
        toolTypes: extractToolTypes(clusterActivities),
      },
    };
  });
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
 * Seed demo journal entries using BOTH temporal AND cluster-based grouping.
 * Creates:
 * - Temporal entries: bi-weekly time windows (existing logic)
 * - Cluster entries: grouped by cross-tool references like AUTH-123
 *
 * NOTE: Clusters are now passed in-memory, not queried from database.
 */
async function seedDemoJournalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string; crossToolRefs?: string[] }>,
  inMemoryClusters: InMemoryCluster[]
): Promise<{ entries: DemoJournalEntryData[]; temporalCount: number; clusterCount: number }> {
  if (activities.length === 0) return { entries: [], temporalCount: 0, clusterCount: 0 };

  // Query workspace ONCE before the loop (RJ: avoid N+1)
  const workspace = await deps.prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
  });
  const workspaceId = workspace?.id || DEFAULT_DEMO_WORKSPACE_ID;

  // 1. Create temporal entries (existing logic - 14-day windows)
  const temporalEntries = await createTemporalEntries(userId, activities, workspaceId);

  // 2. Create cluster-based entries (from in-memory clusters)
  const clusterEntries = await createClusterEntries(userId, workspaceId, inMemoryClusters);

  return {
    entries: [...temporalEntries, ...clusterEntries],
    temporalCount: temporalEntries.length,
    clusterCount: clusterEntries.length,
  };
}

/**
 * Create temporal entries using bi-weekly time windows.
 */
async function createTemporalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string }>,
  workspaceId: string
): Promise<DemoJournalEntryData[]> {
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
 * Create cluster-based entries from in-memory clusters.
 * Only creates entries for clusters with enough activities.
 */
async function createClusterEntries(
  userId: string,
  workspaceId: string,
  inMemoryClusters: InMemoryCluster[]
): Promise<DemoJournalEntryData[]> {
  const entries: DemoJournalEntryData[] = [];

  for (const cluster of inMemoryClusters) {
    if (cluster.activities.length >= MIN_ACTIVITIES_PER_ENTRY) {
      const entry = await createJournalEntryFromCluster(userId, cluster, workspaceId);
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Create a single journal entry from an in-memory cluster.
 */
async function createJournalEntryFromCluster(
  userId: string,
  cluster: InMemoryCluster,
  workspaceId: string
): Promise<DemoJournalEntryData> {
  const activities = cluster.activities;
  const sorted = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const startDate = sorted[0].timestamp;
  const endDate = sorted[sorted.length - 1].timestamp;

  // Generate title from cluster name or derive from activities
  const clusterName = cluster.name || 'Project';
  const summary = getClusterSummary(activities);
  const title = `${clusterName}: ${summary}`;

  const toolSummary = buildToolSummary(activities);
  const description = `${activities.length} related activities across ${toolSummary}`;

  // Extract skills from the title and description
  const combinedContent = `${title} ${description}`;
  const skills = extractSkillsFromContent(combinedContent);

  const entry = await deps.prisma.journalEntry.create({
    data: {
      authorId: userId,
      workspaceId,
      title,
      description,
      fullContent: `# ${title}\n\n${description}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
      activityIds: cluster.activityIds,
      groupingMethod: 'cluster',
      clusterRef: cluster.name || undefined,
      timeRangeStart: startDate,
      timeRangeEnd: endDate,
      generatedAt: null,
      // Demo mode fields
      sourceMode: 'demo',
      // Required JournalEntry fields with sensible defaults
      visibility: 'workspace',
      category: 'achievement',
      tags: ['demo', 'cluster-based'],
      skills,
    },
  });

  return {
    id: entry.id,
    title: entry.title,
    activityIds: entry.activityIds,
    timeRangeStart: startDate,
    timeRangeEnd: endDate,
    groupingMethod: 'cluster' as const,
  };
}

/**
 * Generate a summary of cluster activities for the title.
 */
function getClusterSummary(activities: Array<{ title: string }>): string {
  // Extract common keywords from activity titles
  const words = activities
    .flatMap((a) => a.title.toLowerCase().split(/\s+/))
    .filter((word) => word.length > 3);

  const wordCounts: Record<string, number> = {};
  words.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  // Find most common meaningful word
  const sorted = Object.entries(wordCounts)
    .filter(([word]) => !['this', 'that', 'with', 'from', 'into', 'the', 'and', 'for'].includes(word))
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0 && sorted[0][1] > 1) {
    const keyword = sorted[0][0];
    return keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Work';
  }

  return 'Cross-Tool Collaboration';
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

  // Extract skills from the title and description
  const combinedContent = `${title} ${description}`;
  const skills = extractSkillsFromContent(combinedContent);

  const entry = await deps.prisma.journalEntry.create({
    data: {
      authorId: userId,
      workspaceId,
      title,
      description,
      fullContent: `# ${title}\n\n${description}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
      activityIds: windowActivities.map((a) => a.id),
      groupingMethod: 'time',
      timeRangeStart: startDate,
      timeRangeEnd: endDate,
      generatedAt: null,
      // Demo mode fields
      sourceMode: 'demo',
      // Required JournalEntry fields with sensible defaults
      visibility: 'workspace',
      category: 'achievement',
      tags: ['demo', 'temporal'],
      skills,
    },
  });

  return {
    id: entry.id,
    title: entry.title,
    activityIds: entry.activityIds,
    timeRangeStart: startDate,
    timeRangeEnd: endDate,
    groupingMethod: 'time' as const,
  };
}

// =============================================================================
// PUBLIC API: Activities
// =============================================================================

/**
 * Get all demo activities for a user.
 */
export async function getDemoActivities(userId: string): Promise<DemoActivity[]> {
  const activities = await deps.prisma.demoToolActivity.findMany({
    where: { userId },
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
 * Get demo activities by IDs (for journal entry activity lookup).
 */
export async function getDemoActivitiesByIds(
  userId: string,
  activityIds: string[]
): Promise<DemoActivity[]> {
  const activities = await deps.prisma.demoToolActivity.findMany({
    where: { userId, id: { in: activityIds } },
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
 * Clear all demo data for a user.
 * Uses transaction to ensure atomic deletion (no partial state on failure).
 */
export async function clearDemoData(userId: string): Promise<void> {
  await deps.prisma.$transaction([
    // Delete demo career stories from unified CareerStory table
    deps.prisma.careerStory.deleteMany({
      where: { userId, sourceMode: 'demo' },
    }),
    // Delete demo tool activities (source-level data)
    deps.prisma.demoToolActivity.deleteMany({
      where: { userId },
    }),
    // Delete demo journal entries from unified JournalEntry table
    deps.prisma.journalEntry.deleteMany({
      where: { authorId: userId, sourceMode: 'demo' },
    }),
  ]);
}

/**
 * Clear only demo journal entries for a user.
 * Keeps demo activities intact so they can be re-grouped into new entries.
 * Returns count of deleted entries.
 */
export async function clearDemoJournalEntries(userId: string): Promise<{ deletedCount: number }> {
  // Also delete career stories since they're generated from journal entries
  const [careerStoryResult, journalResult] = await deps.prisma.$transaction([
    deps.prisma.careerStory.deleteMany({
      where: { userId, sourceMode: 'demo' },
    }),
    deps.prisma.journalEntry.deleteMany({
      where: { authorId: userId, sourceMode: 'demo' },
    }),
  ]);

  log.info('Cleared demo journal entries', {
    userId,
    journalEntriesDeleted: journalResult.count,
    careerStoriesDeleted: careerStoryResult.count,
  });

  return { deletedCount: journalResult.count };
}

// =============================================================================
// PUBLIC API: Journal Entries
// =============================================================================
// NOTE: getDemoJournalEntries has been REMOVED.
// All journal entry reads now go through the unified JournalService.
// Use JournalService.getJournalEntries(userId, filters, isDemoMode=true) instead.
// See: backend/src/services/journal.service.ts
// =============================================================================

/**
 * Update activity IDs for a demo journal entry.
 */
export async function updateDemoJournalEntryActivities(
  userId: string,
  entryId: string,
  activityIds: string[]
): Promise<{ id: string; activityIds: string[]; groupingMethod: string }> {
  const entry = await deps.prisma.journalEntry.findFirst({
    where: { id: entryId, authorId: userId, sourceMode: 'demo' },
  });

  if (!entry) {
    throw new DemoServiceError('Demo journal entry not found', 'ENTRY_NOT_FOUND');
  }

  const updated = await deps.prisma.journalEntry.update({
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


// =============================================================================
// NARRATIVE GENERATION
// =============================================================================

// Import JournalService for delegation
import { JournalService } from '../journal.service';

/**
 * Regenerate narrative for a demo journal entry.
 *
 * @deprecated Use JournalService.regenerateNarrative() instead.
 * This function now delegates to the unified JournalService method.
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
  // Delegate to unified JournalService (isDemoMode=true)
  const journalService = new JournalService(true);
  return journalService.regenerateNarrative(userId, entryId, {
    style: (options?.style as 'professional' | 'casual' | 'technical' | 'storytelling') || 'professional',
    maxRetries: options?.maxRetries || 1,
  });
}

// NOTE: generateNarrativeWithLLM and generateFallbackNarrative have been REMOVED.
// These are now in JournalService.regenerateNarrative() - the unified method.

// =============================================================================
// ERROR HANDLING (RC: Reusable error types)
// =============================================================================

export class SeedServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'ENTRY_NOT_FOUND' | 'CLUSTER_NOT_FOUND' | 'NO_ACTIVITIES' | 'INVALID_INPUT'
  ) {
    super(message);
    this.name = 'SeedServiceError';
  }
}

// Backwards compatibility aliases
/** @deprecated Use SeedServiceDeps instead */
export type DemoServiceDeps = SeedServiceDeps;

/** @deprecated Use configureSeedService instead */
export const configureDemoService = configureSeedService;

/** @deprecated Use SeedServiceError instead */
export const DemoServiceError = SeedServiceError;
