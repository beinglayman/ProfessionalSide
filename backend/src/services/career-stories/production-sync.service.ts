/**
 * Production Sync Service for Career Stories
 *
 * Mirrors the demo seed.service.ts flow exactly, but:
 * - Uses ToolActivity table (not DemoToolActivity)
 * - Uses sourceMode: 'production' (not 'demo')
 * - Fetches real data from MCP tools (GitHub, OneDrive, etc.)
 *
 * Flow (matches seed.service.ts):
 * 1. Clear existing production data (optional)
 * 2. Fetch & persist activities to ToolActivity
 * 3. Cluster activities in-memory
 * 4. Create JournalEntry records (temporal + cluster-based)
 * 5. Generate narratives via LLM
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ClusteringService } from './clustering.service';
import { RefExtractorService, refExtractor } from './ref-extractor.service';
import { getModelSelector } from '../ai/model-selector.service';
import { ActivityInput } from './activity-persistence.service';
import { JournalService } from '../journal.service';
import { sseService } from '../sse.service';
import { assignClusters } from './cluster-assign.service';
import type { ClusterSummary, CandidateActivity } from '../ai/prompts/cluster-assign.prompt';

// =============================================================================
// CONSTANTS (match seed.service.ts)
// =============================================================================

const MIN_CLUSTER_SIZE = 2;
const JOURNAL_WINDOW_SIZE_DAYS = 14;
const MIN_ACTIVITIES_PER_ENTRY = 3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NARRATIVE_GENERATION_TIMEOUT_MS = 30000;
const DEFAULT_PRODUCTION_WORKSPACE_ID = 'production-workspace';

// =============================================================================
// TYPES
// =============================================================================

interface InMemoryCluster {
  name: string | null;
  activityIds: string[];
  activities: Array<{
    id: string;
    source: string;
    sourceId: string;
    sourceUrl: string | null;
    title: string;
    description: string | null;
    timestamp: Date;
    crossToolRefs: string[];
  }>;
  metrics: {
    dateRange: { start: Date; end: Date };
    toolTypes: string[];
  };
}

interface EntryPreview {
  id: string;
  title: string;
  groupingMethod: 'time' | 'cluster';
  activityCount: number;
}

interface JournalEntryData {
  id: string;
  title: string;
  activityIds: string[];
  timeRangeStart: Date;
  timeRangeEnd: Date;
  groupingMethod: 'time' | 'cluster';
}

export interface ProductionSyncResult {
  activitiesSeeded: number;
  activitiesBySource: Record<string, number>;
  clustersCreated: number;
  entriesCreated: number;
  temporalEntriesCreated: number;
  clusterEntriesCreated: number;
  entryPreviews: EntryPreview[];
  /** True if narrative generation is happening in background */
  narrativesGeneratingInBackground?: boolean;
}

// =============================================================================
// LOGGER
// =============================================================================

const DEBUG = process.env.DEBUG_PRODUCTION_SYNC === 'true' || process.env.NODE_ENV === 'development';

const log = {
  debug: (msg: string, data?: object) => DEBUG && console.log(`[ProductionSync] ${msg}`, data ?? ''),
  info: (msg: string, data?: object) => console.log(`[ProductionSync] ${msg}`, data ?? ''),
  warn: (msg: string, data?: object) => console.warn(`[ProductionSync] ${msg}`, data ?? ''),
  error: (msg: string, data?: object) => console.error(`[ProductionSync] ${msg}`, data ?? ''),
};

// =============================================================================
// UTILITIES
// =============================================================================

async function withTimeout<T>(
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

function extractSkillsFromContent(content: string): string[] {
  const skillKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
    'API', 'REST', 'GraphQL', 'Database', 'PostgreSQL', 'MongoDB',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'CI/CD', 'Git', 'Testing', 'Architecture', 'Performance',
    'Security', 'Authentication', 'OAuth', 'JWT',
    'Frontend', 'Backend', 'Full-stack', 'DevOps',
    'Agile', 'Scrum', 'Code Review', 'Documentation',
  ];

  return skillKeywords.filter((skill) =>
    content.toLowerCase().includes(skill.toLowerCase())
  );
}

function computeDateRange(timestamps: Date[]): { start: Date; end: Date } {
  const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
  return { start: sorted[0], end: sorted[sorted.length - 1] };
}

function extractToolTypes(activities: Array<{ source: string }>): string[] {
  return [...new Set(activities.map((a) => a.source))];
}

function buildToolSummary(activities: Array<{ source: string }>): string {
  const tools = extractToolTypes(activities);
  if (tools.length === 1) return tools[0];
  if (tools.length === 2) return `${tools[0]} and ${tools[1]}`;
  return `${tools.slice(0, -1).join(', ')}, and ${tools[tools.length - 1]}`;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Run production sync - mirrors seedDemoData exactly.
 *
 * @param userId User ID
 * @param activities Pre-fetched activities (from MCP tools)
 * @param options Sync options
 * @param options.clearExisting - Clear existing data before sync
 * @param options.backgroundNarratives - Generate narratives in background for faster sync response (default: false)
 */
export async function runProductionSync(
  userId: string,
  activities: ActivityInput[],
  options: { clearExisting?: boolean; backgroundNarratives?: boolean } = {}
): Promise<ProductionSyncResult> {
  log.info('Starting production sync', { userId, activityCount: activities.length, backgroundNarratives: options.backgroundNarratives });

  const clusteringService = new ClusteringService(prisma);

  // Step 1: Optionally clear existing production data
  if (options.clearExisting) {
    await clearProductionData(userId);
  }

  // Step 2: Persist activities to ToolActivity table
  const persistedActivities = await persistProductionActivities(userId, activities);
  log.debug(`Persisted ${persistedActivities.length} activities`);

  // Step 2b: Count activities by source
  const activitiesBySource: Record<string, number> = {};
  for (const activity of persistedActivities) {
    activitiesBySource[activity.source] = (activitiesBySource[activity.source] || 0) + 1;
  }
  log.debug('Activities by source:', activitiesBySource);

  // Step 3: Cluster activities in-memory (same as demo)
  const activitiesWithSourceUrl = persistedActivities.map((a) => ({
    ...a,
    sourceUrl: a.sourceUrl ?? null,
  }));
  let clusters = clusterProductionActivities(activitiesWithSourceUrl, clusteringService);
  log.debug(`Created ${clusters.length} in-memory clusters`);

  // Step 3b: Layer 2 — LLM cluster refinement
  clusters = await refineWithLLM(clusters, activitiesWithSourceUrl);

  // Step 4: Create journal entries (temporal + cluster-based)
  const journalResult = await createProductionJournalEntries(userId, persistedActivities, clusters);
  log.debug(`Created ${journalResult.entries.length} journal entries (${journalResult.temporalCount} temporal, ${journalResult.clusterCount} cluster)`);

  // Step 5: Generate narratives (in background if requested for faster sync response)
  if (options.backgroundNarratives) {
    // Fire and forget - don't await, let it complete in background
    // Emit per-entry events so frontend can update UI progressively
    log.info('Starting background narrative generation', { entryCount: journalResult.entries.length });
    generateProductionNarratives(userId, journalResult.entries, true)
      .then(() => {
        // Notify connected clients that ALL narratives are complete
        log.info('Background narrative generation complete, sending SSE event');
        sseService.broadcastToUser(userId, {
          type: 'narratives-complete',
          data: {
            entriesUpdated: journalResult.entries.length,
            timestamp: new Date().toISOString(),
          },
        });
      })
      .catch(err => {
        log.error('Background narrative generation failed', { error: err.message });
        // Still notify so UI can stop showing loading state
        sseService.broadcastToUser(userId, {
          type: 'narratives-complete',
          data: {
            error: err.message,
            timestamp: new Date().toISOString(),
          },
        });
      });
  } else {
    await generateProductionNarratives(userId, journalResult.entries, false);
  }

  log.info('Production sync complete', {
    activities: persistedActivities.length,
    clusters: clusters.length,
    entries: journalResult.entries.length,
  });

  // Build entry previews for UI
  const entryPreviews: EntryPreview[] = journalResult.entries.map(entry => ({
    id: entry.id,
    title: entry.title,
    groupingMethod: entry.groupingMethod,
    activityCount: entry.activityIds?.length || 0,
  }));

  return {
    activitiesSeeded: persistedActivities.length,
    activitiesBySource,
    clustersCreated: clusters.length,
    entriesCreated: journalResult.entries.length,
    temporalEntriesCreated: journalResult.temporalCount,
    clusterEntriesCreated: journalResult.clusterCount,
    entryPreviews,
    narrativesGeneratingInBackground: options.backgroundNarratives ?? false,
  };
}

// =============================================================================
// STEP 1: CLEAR EXISTING DATA
// =============================================================================

async function clearProductionData(userId: string): Promise<void> {
  log.debug('Clearing existing production data');

  // Delete journal entries with sourceMode: 'production'
  await prisma.journalEntry.deleteMany({
    where: { authorId: userId, sourceMode: 'production' },
  });

  // Delete tool activities
  await prisma.toolActivity.deleteMany({
    where: { userId },
  });

  log.debug('Production data cleared');
}

// =============================================================================
// STEP 2: PERSIST ACTIVITIES
// =============================================================================

async function persistProductionActivities(
  userId: string,
  activities: ActivityInput[]
): Promise<Array<{
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: Date;
  crossToolRefs: string[];
}>> {
  const activitiesToCreate = activities.map((activity) => {
    const allText = [
      activity.sourceId,
      activity.title,
      activity.description || '',
      activity.rawData ? JSON.stringify(activity.rawData) : '',
    ].join(' ');
    const refs = refExtractor.extractRefs(allText);

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

  // Use upsert to handle duplicates gracefully
  for (const activity of activitiesToCreate) {
    await prisma.toolActivity.upsert({
      where: {
        userId_source_sourceId: {
          userId: activity.userId,
          source: activity.source,
          sourceId: activity.sourceId,
        },
      },
      create: activity,
      update: {
        title: activity.title,
        description: activity.description,
        sourceUrl: activity.sourceUrl,
        crossToolRefs: activity.crossToolRefs,
        rawData: activity.rawData,
      },
    });
  }

  return prisma.toolActivity.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  });
}

// =============================================================================
// STEP 3: CLUSTER ACTIVITIES
// =============================================================================

function clusterProductionActivities(
  activities: Array<{
    id: string;
    source: string;
    sourceId: string;
    sourceUrl: string | null;
    title: string;
    description: string | null;
    timestamp: Date;
    crossToolRefs: string[];
  }>,
  clusteringService: ClusteringService
): InMemoryCluster[] {
  const clusterResults = clusteringService.clusterActivitiesInMemory(
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

// =============================================================================
// STEP 3b: LAYER 2 — LLM CLUSTER REFINEMENT
// =============================================================================

type ActivityWithSourceUrl = {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: Date;
  crossToolRefs: string[];
};

async function refineWithLLM(
  clusters: InMemoryCluster[],
  allActivities: ActivityWithSourceUrl[],
): Promise<InMemoryCluster[]> {
  // Work on a shallow copy to avoid mutating the input array
  const result = [...clusters];

  // Collect all activity IDs already in a cluster
  const clusteredIds = new Set(result.flatMap(c => c.activityIds));

  // Find unclustered activities
  const unclustered = allActivities.filter(a => !clusteredIds.has(a.id));
  if (unclustered.length === 0) {
    log.debug('[Layer 2] All activities already clustered, skipping LLM');
    return clusters;
  }

  // Build ClusterSummary[] from existing Layer 1 clusters.
  // Synthetic IDs (layer1_0, layer1_1, ...) since in-memory clusters have no DB id yet.
  // These IDs are used only for MOVE targets and are mapped back to array indices below.
  const existingClusters: ClusterSummary[] = result.map((c, idx) => ({
    id: `layer1_${idx}`,
    name: c.name || `Cluster ${idx + 1}`,
    activityCount: c.activityIds.length,
    dateRange: `${c.metrics.dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${c.metrics.dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    toolSummary: c.metrics.toolTypes.join(', '),
    topActivities: c.activities.slice(0, 3).map(a => a.title).join(', '),
    isReferenced: false,
  }));

  // Build CandidateActivity[] from unclustered activities.
  // TODO(Phase 2): Also include weak-confidence assignments from Layer 1 for reassignment.
  // Currently only unclustered activities are sent — KEEP is never valid for these candidates.
  const candidates: CandidateActivity[] = unclustered.map(a => ({
    id: a.id,
    source: a.source,
    title: a.title,
    date: a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    currentClusterId: null,
    confidence: null,
    description: a.description,
  }));

  log.debug(`[Layer 2] Sending ${candidates.length} unclustered activities to LLM (${existingClusters.length} existing clusters)`);

  const llmResult = await assignClusters(existingClusters, candidates);

  if (llmResult.fallback) {
    log.warn('[Layer 2] LLM fallback — returning Layer 1 clusters only');
    return result;
  }

  log.info(`[Layer 2] LLM assigned ${Object.keys(llmResult.assignments).length} activities (model: ${llmResult.model}, ${llmResult.processingTimeMs}ms)`);

  // Build index from layer1_N id back to cluster index
  const clusterIdToIndex = new Map<string, number>();
  existingClusters.forEach((c, idx) => clusterIdToIndex.set(c.id, idx));

  // Build activity lookup
  const activityMap = new Map(allActivities.map(a => [a.id, a]));

  // Group NEW assignments by target name
  const newClusterGroups = new Map<string, string[]>();

  for (const [actId, assignment] of Object.entries(llmResult.assignments)) {
    switch (assignment.action) {
      case 'MOVE': {
        const clusterIdx = clusterIdToIndex.get(assignment.target);
        if (clusterIdx !== undefined) {
          const activity = activityMap.get(actId);
          if (activity) {
            result[clusterIdx].activityIds.push(actId);
            result[clusterIdx].activities.push({
              id: activity.id,
              source: activity.source,
              sourceId: activity.sourceId,
              sourceUrl: activity.sourceUrl,
              title: activity.title,
              description: activity.description,
              timestamp: activity.timestamp,
              crossToolRefs: activity.crossToolRefs,
            });
            // Recalculate dateRange after adding activity
            result[clusterIdx].metrics.dateRange = computeDateRange(
              result[clusterIdx].activities.map(a => a.timestamp)
            );
          }
        }
        break;
      }
      case 'NEW': {
        const group = newClusterGroups.get(assignment.target) || [];
        group.push(actId);
        newClusterGroups.set(assignment.target, group);
        break;
      }
      // KEEP: no-op — already in cluster
    }
  }

  // Create new InMemoryCluster entries for NEW groups
  for (const [name, activityIds] of newClusterGroups) {
    const groupActivities = activityIds
      .map(id => activityMap.get(id))
      .filter((a): a is ActivityWithSourceUrl => a !== undefined);

    if (groupActivities.length === 0) continue;

    result.push({
      name,
      activityIds,
      activities: groupActivities.map(a => ({
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
        dateRange: computeDateRange(groupActivities.map(a => a.timestamp)),
        toolTypes: extractToolTypes(groupActivities),
      },
    });
  }

  return result;
}

// =============================================================================
// STEP 4: CREATE JOURNAL ENTRIES
// =============================================================================

async function createProductionJournalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string; crossToolRefs?: string[] }>,
  inMemoryClusters: InMemoryCluster[]
): Promise<{ entries: JournalEntryData[]; temporalCount: number; clusterCount: number }> {
  if (activities.length === 0) return { entries: [], temporalCount: 0, clusterCount: 0 };

  // Query workspace ONCE
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
  });
  const workspaceId = workspace?.id || DEFAULT_PRODUCTION_WORKSPACE_ID;

  // 1. Create temporal entries (14-day windows)
  const temporalEntries = await createTemporalEntries(userId, activities, workspaceId);

  // 2. Create cluster-based entries
  const clusterEntries = await createClusterEntries(userId, workspaceId, inMemoryClusters);

  return {
    entries: [...temporalEntries, ...clusterEntries],
    temporalCount: temporalEntries.length,
    clusterCount: clusterEntries.length,
  };
}

async function createTemporalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string }>,
  workspaceId: string
): Promise<JournalEntryData[]> {
  const sorted = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const earliest = sorted[0].timestamp;
  const latest = sorted[sorted.length - 1].timestamp;
  const entries: JournalEntryData[] = [];

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
      if (entry) entries.push(entry); // Skip null (duplicate) entries
    }

    windowStart = windowEnd;
  }

  return entries;
}

async function createClusterEntries(
  userId: string,
  workspaceId: string,
  inMemoryClusters: InMemoryCluster[]
): Promise<JournalEntryData[]> {
  const entries: JournalEntryData[] = [];

  for (const cluster of inMemoryClusters) {
    if (cluster.activities.length >= MIN_ACTIVITIES_PER_ENTRY) {
      const entry = await createJournalEntryFromCluster(userId, cluster, workspaceId);
      if (entry) entries.push(entry); // Skip null (duplicate) entries
    }
  }

  return entries;
}

async function createJournalEntryFromWindow(
  userId: string,
  windowActivities: Array<{ id: string; timestamp: Date; title: string; source: string }>,
  workspaceId: string
): Promise<JournalEntryData | null> {
  const startDate = windowActivities[0].timestamp;
  const endDate = windowActivities[windowActivities.length - 1].timestamp;

  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const title = `Week of ${startStr} - ${endStr}`;

  const toolSummary = buildToolSummary(windowActivities);
  const description = `${windowActivities.length} activities across ${toolSummary}`;

  const combinedContent = `${title} ${description}`;
  const skills = extractSkillsFromContent(combinedContent);
  const activityIds = windowActivities.map((a) => a.id);

  // Check if a temporal entry with overlapping time range already exists
  // This prevents duplicate entries on repeated syncs
  const existing = await prisma.journalEntry.findFirst({
    where: {
      authorId: userId,
      sourceMode: 'production',
      groupingMethod: 'time',
      // Find entries with overlapping time ranges
      OR: [
        // Existing entry contains this window
        {
          timeRangeStart: { lte: startDate },
          timeRangeEnd: { gte: endDate },
        },
        // This window contains existing entry
        {
          timeRangeStart: { gte: startDate },
          timeRangeEnd: { lte: endDate },
        },
        // Overlapping ranges
        {
          timeRangeStart: { lte: endDate },
          timeRangeEnd: { gte: startDate },
        },
      ],
    },
  });

  if (existing) {
    // Update existing entry with merged activities
    const mergedActivityIds = [...new Set([...existing.activityIds, ...activityIds])];

    // Only update if there are new activities
    if (mergedActivityIds.length === existing.activityIds.length) {
      log.debug(`Skipping duplicate temporal entry: ${title}`);
      return null; // No new activities, skip
    }

    const updated = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: {
        activityIds: mergedActivityIds,
        description: `${mergedActivityIds.length} activities across ${toolSummary}`,
        // Reset narrative since activities changed
        generatedAt: null,
        fullContent: `# ${title}\n\n${mergedActivityIds.length} activities across ${toolSummary}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
      },
    });

    log.debug(`Updated existing temporal entry: ${title} (${existing.activityIds.length} -> ${mergedActivityIds.length} activities)`);

    return {
      id: updated.id,
      title: updated.title,
      activityIds: updated.activityIds,
      timeRangeStart: startDate,
      timeRangeEnd: endDate,
      groupingMethod: 'time',
    };
  }

  // Create new entry
  const entry = await prisma.journalEntry.create({
    data: {
      authorId: userId,
      workspaceId,
      title,
      description,
      fullContent: `# ${title}\n\n${description}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
      activityIds,
      groupingMethod: 'time',
      timeRangeStart: startDate,
      timeRangeEnd: endDate,
      generatedAt: null,
      // Production mode fields
      sourceMode: 'production',
      visibility: 'workspace',
      category: 'achievement',
      tags: ['production', 'temporal'],
      skills,
    },
  });

  return {
    id: entry.id,
    title: entry.title,
    activityIds: entry.activityIds,
    timeRangeStart: startDate,
    timeRangeEnd: endDate,
    groupingMethod: 'time',
  };
}

async function createJournalEntryFromCluster(
  userId: string,
  cluster: InMemoryCluster,
  workspaceId: string
): Promise<JournalEntryData | null> {
  const activities = cluster.activities;
  const sorted = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const startDate = sorted[0].timestamp;
  const endDate = sorted[sorted.length - 1].timestamp;

  const clusterName = cluster.name || 'Project';
  const summary = getClusterSummary(activities);
  const title = `${clusterName}: ${summary}`;

  const toolSummary = buildToolSummary(activities);
  const description = `${activities.length} related activities across ${toolSummary}`;

  const combinedContent = `${title} ${description}`;
  const skills = extractSkillsFromContent(combinedContent);

  // Check if a cluster entry with the same clusterRef already exists
  // This prevents duplicate entries on repeated syncs
  if (cluster.name) {
    const existing = await prisma.journalEntry.findFirst({
      where: {
        authorId: userId,
        sourceMode: 'production',
        groupingMethod: 'cluster',
        clusterRef: cluster.name,
      },
    });

    if (existing) {
      // Update existing entry with merged activities
      const mergedActivityIds = [...new Set([...existing.activityIds, ...cluster.activityIds])];

      // Only update if there are new activities
      if (mergedActivityIds.length === existing.activityIds.length) {
        log.debug(`Skipping duplicate cluster entry: ${cluster.name}`);
        return null; // No new activities, skip
      }

      const updated = await prisma.journalEntry.update({
        where: { id: existing.id },
        data: {
          activityIds: mergedActivityIds,
          description: `${mergedActivityIds.length} related activities across ${toolSummary}`,
          // Reset narrative since activities changed
          generatedAt: null,
          fullContent: `# ${title}\n\n${mergedActivityIds.length} related activities across ${toolSummary}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
        },
      });

      log.debug(`Updated existing cluster entry: ${cluster.name} (${existing.activityIds.length} -> ${mergedActivityIds.length} activities)`);

      return {
        id: updated.id,
        title: updated.title,
        activityIds: updated.activityIds,
        timeRangeStart: startDate,
        timeRangeEnd: endDate,
        groupingMethod: 'cluster',
      };
    }
  }

  // Create new entry
  const entry = await prisma.journalEntry.create({
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
      // Production mode fields
      sourceMode: 'production',
      visibility: 'workspace',
      category: 'achievement',
      tags: ['production', 'cluster-based'],
      skills,
    },
  });

  return {
    id: entry.id,
    title: entry.title,
    activityIds: entry.activityIds,
    timeRangeStart: startDate,
    timeRangeEnd: endDate,
    groupingMethod: 'cluster',
  };
}

function getClusterSummary(activities: Array<{ title: string }>): string {
  const words = activities
    .flatMap((a) => a.title.toLowerCase().split(/\s+/))
    .filter((word) => word.length > 3);

  const wordCounts: Record<string, number> = {};
  words.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  const sorted = Object.entries(wordCounts)
    .filter(([word]) => !['this', 'that', 'with', 'from', 'into', 'the', 'and', 'for'].includes(word))
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0 && sorted[0][1] > 1) {
    const keyword = sorted[0][0];
    return keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Work';
  }

  return 'Cross-Tool Collaboration';
}

// =============================================================================
// STEP 5: GENERATE NARRATIVES
// =============================================================================

async function generateProductionNarratives(
  userId: string,
  entries: JournalEntryData[],
  emitProgressEvents = false
): Promise<void> {
  const selector = getModelSelector();
  if (!selector) {
    log.info('ModelSelector not available, skipping narrative generation');
    return;
  }

  log.debug('ModelSelector available', selector.getModelInfo());

  const journalService = new JournalService();

  const narrativePromises = entries.map(async (entry) => {
    try {
      log.debug(`Generating narrative for entry ${entry.id}`);
      await journalService.regenerateNarrative(userId, entry.id, { style: 'professional', maxRetries: 2 });
      log.debug(`Narrative generated for entry ${entry.id}`);

      // Emit SSE event for this entry if background generation
      if (emitProgressEvents) {
        sseService.broadcastToUser(userId, {
          type: 'data-changed',
          data: {
            entryId: entry.id,
            status: 'complete',
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      log.warn(`Failed to generate narrative for entry ${entry.id}`, {
        error: (error as Error).message,
      });

      // Emit error event for this entry if background generation
      if (emitProgressEvents) {
        sseService.broadcastToUser(userId, {
          type: 'data-changed',
          data: {
            entryId: entry.id,
            status: 'error',
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          },
        });
      }
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
