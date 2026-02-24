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
import { isUniqueConstraintError } from '../../lib/prisma-errors';
import { ClusteringService } from './clustering.service';
import { RefExtractorService, refExtractor } from './ref-extractor.service';
import { getModelSelector } from '../ai/model-selector.service';
import { ActivityInput } from './activity-persistence.service';
import { JournalService } from '../journal.service';
import { sseService } from '../sse.service';
import { assignClusters } from './cluster-assign.service';
import type { ClusterSummary, CandidateActivity } from '../ai/prompts/cluster-assign.prompt';
import { extractSignals } from './signal-extractor';

// =============================================================================
// CONSTANTS (match seed.service.ts)
// =============================================================================

const MIN_CLUSTER_SIZE = 2;
const JOURNAL_WINDOW_SIZE_DAYS = 14;
const MIN_ACTIVITIES_PER_ENTRY = 3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NARRATIVE_GENERATION_TIMEOUT_MS = 30000;
const DEFAULT_WORKSPACE_NAME = 'My Workspace';

// =============================================================================
// TYPES
// =============================================================================

interface InMemoryCluster {
  name: string | null;
  dominantContainer: string | null;
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

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T | undefined> {
  let timerId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<undefined>((resolve) => {
    timerId = setTimeout(() => {
      log.warn(`${label} timeout reached after ${ms}ms`);
      resolve(undefined);
    }, ms);
  });
  const result = await Promise.race([promise, timeout]);
  clearTimeout(timerId!);
  return result;
}

/** Run async functions with bounded concurrency. */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (e) {
        results[i] = { status: 'rejected', reason: e };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// TODO: Replace with word-boundary regex or LLM extraction for better precision.
// Current substring matching produces false positives (e.g., "API" matches "capital").
// Feeds JournalEntry.skills → profile + network filtering in frontend.
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

  const lower = content.toLowerCase();
  return skillKeywords.filter((skill) => {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return pattern.test(lower);
  });
}

function computeDateRange(timestamps: Date[]): { start: Date; end: Date } {
  if (timestamps.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }
  const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
  return { start: sorted[0], end: sorted[sorted.length - 1] };
}

function extractToolTypes(activities: Array<{ source: string }>): string[] {
  return [...new Set(activities.map((a) => a.source))];
}

/** Find the most frequent container signal across activities. */
export function computeDominantContainer(
  activities: Array<{ container?: string | null }>,
): string | null {
  const counts = new Map<string, number>();
  for (const a of activities) {
    if (a.container) {
      counts.set(a.container, (counts.get(a.container) || 0) + 1);
    }
  }
  let dominant: string | null = null;
  let max = 0;
  for (const [container, count] of counts) {
    if (count > max) {
      max = count;
      dominant = container;
    }
  }
  return dominant;
}

export function buildToolSummary(activities: Array<{ source: string }>): string {
  const tools = extractToolTypes(activities);
  if (tools.length === 1) return tools[0];
  if (tools.length === 2) return `${tools[0]} and ${tools[1]}`;
  return `${tools.slice(0, -1).join(', ')}, and ${tools[tools.length - 1]}`;
}

/**
 * Extract short repo name from "owner/repo" format → "repo".
 * Handles repo: prefix from container signal. Non-repo containers pass through as-is.
 */
export function shortRepoName(fullName: string): string {
  if (fullName.startsWith('repo:')) {
    const repo = fullName.slice(5);
    const parts = repo.split('/');
    return parts[parts.length - 1];
  }
  return fullName;
}

/**
 * Derive display name for a cluster: LLM name > container signal > "Project".
 */
export function deriveClusterName(
  llmName: string | null,
  dominantContainer?: string | null,
): string {
  if (llmName) return llmName;
  if (dominantContainer) return shortRepoName(dominantContainer);
  return 'Project';
}

// =============================================================================
// CLUSTER NAMING
// =============================================================================

/**
 * Returns true if name looks like a raw crossToolRef rather than a human-readable name.
 * Catches: "arig", "local#1", "DH-905", "tacit-web" but preserves
 * "OAuth2 Authentication", "Bidirectional Sync Server".
 */
export function looksLikeRawRef(name: string): boolean {
  if (!name) return false;
  // Human-readable names have spaces
  if (name.includes(' ')) return false;
  // All lowercase single word under 15 chars (e.g., "arig", "capture")
  if (name === name.toLowerCase() && name.length < 15) return true;
  // Matches "local#N" pattern
  if (/^local#\d+$/i.test(name)) return true;
  // Matches "PROJ-NNN" Jira-style pattern
  if (/^[A-Z]+-\d+$/.test(name)) return true;
  // Kebab-case single word (e.g., "tacit-web", "interview-prep")
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) return true;
  return false;
}

/**
 * Rename clusters that have raw-ref names using a cheap LLM call.
 * Mutates cluster.name in place.
 */
async function nameClusters(clusters: InMemoryCluster[]): Promise<void> {
  const modelSelector = getModelSelector();
  if (!modelSelector) return;

  for (const cluster of clusters) {
    if (cluster.name && !looksLikeRawRef(cluster.name)) continue;

    const titles = cluster.activities.slice(0, 8).map(a => a.title).join('\n');
    try {
      const result = await modelSelector.executeTask('cluster-name', [
        { role: 'system', content: 'Name this group of work activities in 3-6 words. Return ONLY the name, no quotes.' },
        { role: 'user', content: titles },
      ], 'quick', { maxTokens: 30, temperature: 0.3 });

      const name = result.content.trim().replace(/^["']|["']$/g, '');
      if (name.length > 0 && name.length < 60) {
        cluster.name = name;
      }
    } catch (err) {
      log.warn(`Failed to name cluster: ${(err as Error).message}`);
    }
  }
}

// =============================================================================
// DYNAMIC ENTRY COUNT
// =============================================================================

/**
 * Compute target entry count from data characteristics.
 * Uses distinct projects (with ≥3 activities) as the natural guide,
 * adjusted for existing stories. Single-activity tool groups are noise.
 */
export function computeEntryTarget(
  activities: Array<{ source: string; rawData?: any; container?: string | null }>,
  existingProductionStoryCount: number,
): { targetEntries: number; minActivitiesPerEntry: number } {
  const projectCounts = new Map<string, number>();
  for (const a of activities) {
    // Prefer container signal (repo, epic, space, channel) for project grouping
    let key: string;
    if (a.container) {
      key = a.container;
    } else {
      const raw = a.rawData as Record<string, unknown> | null;
      key = raw && typeof raw.repository === 'string'
        ? raw.repository as string
        : `tool:${a.source}`;
    }
    projectCounts.set(key, (projectCounts.get(key) || 0) + 1);
  }

  // Only count projects with meaningful activity volume (≥3)
  let significantProjects = 0;
  for (const count of projectCounts.values()) {
    if (count >= 3) significantProjects++;
  }

  const cappedProjects = Math.min(significantProjects, 10);
  const remaining = cappedProjects - existingProductionStoryCount;

  // When user already has enough stories, don't create more
  if (remaining <= 0) {
    return { targetEntries: 0, minActivitiesPerEntry: Infinity };
  }

  const targetEntries = Math.max(3, remaining);
  const minActivitiesPerEntry = Math.max(3, Math.floor(activities.length / (targetEntries * 3)));

  return { targetEntries, minActivitiesPerEntry };
}

/**
 * Merge smallest clusters until cluster count is at or below target × 1.2.
 * Prefers merging clusters that share the same dominantContainer.
 * Returns a new array; individual cluster objects are mutated during merge.
 */
export function mergeSmallClusters(
  clusters: InMemoryCluster[],
  targetEntries: number,
): InMemoryCluster[] {
  if (targetEntries <= 0) return clusters;
  const maxClusters = Math.ceil(targetEntries * 1.2);
  if (clusters.length <= maxClusters) return clusters;

  // Sort by size ascending — merge smallest first
  const sorted = [...clusters].sort((a, b) => a.activityIds.length - b.activityIds.length);

  while (sorted.length > maxClusters) {
    const smallest = sorted[0];
    // Prefer same-container partner; fall back to smallest neighbor
    const sameContainerIdx = sorted.findIndex(
      (c, i) => i > 0 && c.dominantContainer === smallest.dominantContainer && smallest.dominantContainer != null
    );
    const partnerIdx = sameContainerIdx !== -1 ? sameContainerIdx : 1;
    if (sorted.length < 2) break;

    const partner = sorted[partnerIdx];
    partner.activityIds.push(...smallest.activityIds);
    partner.activities.push(...smallest.activities);
    partner.metrics.dateRange = computeDateRange(partner.activities.map(a => a.timestamp));
    partner.metrics.toolTypes = extractToolTypes(partner.activities);
    partner.dominantContainer = computeDominantContainer(partner.activities);
    if (smallest.name && (!partner.name || smallest.name.length > partner.name.length)) {
      partner.name = smallest.name;
    }
    sorted.splice(0, 1);

    // Re-sort after merge so the smallest is always first
    sorted.sort((a, b) => a.activityIds.length - b.activityIds.length);
  }

  return sorted;
}

/**
 * Merge clusters that share the same dominantContainer (same repo = same project).
 * Prevents duplicate entries like "Sync Server Implementation" and "Sync Server Protocol"
 * when both came from the same repo.
 *
 * Size-gated: only merges when at least one of the two clusters is small (below maxMergeSize).
 * Large clusters from temporal splits are intentional and should NOT be collapsed.
 *
 * Returns a new array; individual cluster objects are mutated during merge.
 */
export function dedupClustersByContainer(
  clusters: InMemoryCluster[],
  maxMergeSize: number = 15,
): InMemoryCluster[] {
  const byContainer = new Map<string, InMemoryCluster>();
  const result: InMemoryCluster[] = [];

  for (const cluster of clusters) {
    if (!cluster.dominantContainer) {
      result.push(cluster);
      continue;
    }

    const existing = byContainer.get(cluster.dominantContainer);
    if (existing) {
      // Only merge if at least one cluster is small — large temporal splits stay separate
      const eitherIsSmall =
        existing.activityIds.length < maxMergeSize || cluster.activityIds.length < maxMergeSize;

      if (eitherIsSmall) {
        // Merge into existing — combine activities, keep longer name
        existing.activityIds.push(...cluster.activityIds);
        existing.activities.push(...cluster.activities);
        existing.metrics.dateRange = computeDateRange(existing.activities.map(a => a.timestamp));
        existing.metrics.toolTypes = extractToolTypes(existing.activities);
        existing.dominantContainer = computeDominantContainer(existing.activities);
        if (cluster.name && (!existing.name || cluster.name.length > existing.name.length)) {
          existing.name = cluster.name;
        }
      } else {
        // Both large — keep separate (intentional temporal split)
        result.push(cluster);
      }
    } else {
      byContainer.set(cluster.dominantContainer, cluster);
      result.push(cluster);
    }
  }

  return result;
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
  options: { clearExisting?: boolean; backgroundNarratives?: boolean; quickMode?: boolean; skipPersist?: boolean; selfIdentifiers?: string[]; skipNarratives?: boolean } = {}
): Promise<ProductionSyncResult> {
  log.info('Starting production sync', { userId, activityCount: activities.length, backgroundNarratives: options.backgroundNarratives, quickMode: options.quickMode, skipPersist: options.skipPersist });

  const clusteringService = new ClusteringService(prisma);

  // Step 1: Optionally clear existing production data
  if (options.clearExisting) {
    await clearProductionData(userId);
  }

  // Step 2: Persist activities to ToolActivity table (or load from DB if already persisted per-tool)
  let persistedActivities;
  if (options.skipPersist) {
    persistedActivities = await prisma.toolActivity.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
    log.debug(`Loaded ${persistedActivities.length} already-persisted activities from DB`);
  } else {
    persistedActivities = await persistProductionActivities(userId, activities);
    log.debug(`Persisted ${persistedActivities.length} activities`);
  }

  // Step 2b: Count activities by source
  const activitiesBySource: Record<string, number> = {};
  for (const activity of persistedActivities) {
    activitiesBySource[activity.source] = (activitiesBySource[activity.source] || 0) + 1;
  }
  log.debug('Activities by source:', activitiesBySource);

  // Quick mode: persist only, skip clustering + journal entries + narratives
  if (options.quickMode) {
    log.info('Quick mode: skipping steps 3-5, returning after activity persistence');
    return {
      activitiesSeeded: persistedActivities.length,
      activitiesBySource,
      clustersCreated: 0,
      entriesCreated: 0,
      temporalEntriesCreated: 0,
      clusterEntriesCreated: 0,
      entryPreviews: [],
      narrativesGeneratingInBackground: false,
    };
  }

  // Step 2c: Extract signals from rawData for multi-signal clustering
  // selfIdentifiers: tool usernames/emails from currentUser + userId as fallback
  const selfIdentifiers = options.selfIdentifiers?.length
    ? [...options.selfIdentifiers, userId]
    : [userId];
  const activitiesWithSignals = persistedActivities.map((a) => {
    const signals = extractSignals(
      a.source,
      a.rawData as Record<string, unknown> | null,
      selfIdentifiers,
    );
    return {
      ...a,
      sourceUrl: a.sourceUrl ?? null,
      collaborators: signals.collaborators,
      container: signals.container,
    };
  });

  // Signal instrumentation
  const signalStats = {
    withContainer: activitiesWithSignals.filter(a => a.container !== null).length,
    withCollaborators: activitiesWithSignals.filter(a => a.collaborators.length > 0).length,
  };
  log.info('Signal extraction complete', signalStats);

  // Step 3: Cluster activities in-memory with multi-signal edges
  let clusters = clusterProductionActivities(activitiesWithSignals, clusteringService);
  log.debug(`Created ${clusters.length} in-memory clusters`);

  // Step 3b: Layer 2 — LLM cluster refinement
  clusters = await refineWithLLM(clusters, activitiesWithSignals);

  // Step 3c: LLM cluster naming — rename raw-ref names to human-readable
  await nameClusters(clusters);
  log.debug(`Named ${clusters.length} clusters`);

  // Step 3d: Dynamic entry count — compute target and merge small clusters
  // Count existing journal entries (not career stories) — these are what the user sees.
  // Using careerStory.count missed entries that haven't been promoted to stories yet,
  // causing re-sync to create duplicate entries with different LLM-generated names.
  const existingEntryCount = await prisma.journalEntry.count({
    where: { authorId: userId, sourceMode: 'production' },
  });
  const { targetEntries, minActivitiesPerEntry } = computeEntryTarget(activitiesWithSignals, existingEntryCount);

  if (targetEntries === 0) {
    log.info(`User already has ${existingEntryCount} entries covering ${persistedActivities.length} activities — skipping entry creation`);
    return {
      activitiesSeeded: persistedActivities.length,
      activitiesBySource,
      clustersCreated: clusters.length,
      entriesCreated: 0,
      temporalEntriesCreated: 0,
      clusterEntriesCreated: 0,
      entryPreviews: [],
      narrativesGeneratingInBackground: false,
    };
  }

  clusters = mergeSmallClusters(clusters, targetEntries);
  clusters = dedupClustersByContainer(clusters);
  log.debug(`Dynamic entry target: ${targetEntries}, minActivitiesPerEntry: ${minActivitiesPerEntry}, clusters after dedup: ${clusters.length}`);

  // Step 4: Create journal entries (temporal + cluster-based)
  const journalResult = await createProductionJournalEntries(userId, persistedActivities, clusters, minActivitiesPerEntry);
  log.debug(`Created ${journalResult.entries.length} journal entries (${journalResult.temporalCount} temporal, ${journalResult.clusterCount} cluster)`);

  // Step 5: Generate narratives (in background if requested for faster sync response)
  if (options.skipNarratives) {
    log.info('Skipping narrative generation (skipNarratives option)');
  } else if (options.backgroundNarratives) {
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
  rawData: Prisma.JsonValue;
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
  // Catch P2002 (unique constraint) from concurrent sync races — safe to ignore
  for (const activity of activitiesToCreate) {
    try {
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
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        log.debug(`Skipping duplicate activity ${activity.source}/${activity.sourceId} (concurrent sync)`);
      } else {
        throw err;
      }
    }
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
    collaborators?: string[];
    container?: string | null;
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
      collaborators: a.collaborators,
      container: a.container,
    })),
    { minClusterSize: MIN_CLUSTER_SIZE }
  );

  return clusterResults.map((result) => {
    const clusterActivities = activities.filter((a) => result.activityIds.includes(a.id));

    return {
      name: result.name,
      dominantContainer: computeDominantContainer(clusterActivities),
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
  container: string | null;
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

  // Build activity lookup (used by batching loop)
  const activityMap = new Map(allActivities.map(a => [a.id, a]));

  // Build CandidateActivity[] from unclustered activities.
  const candidates: CandidateActivity[] = unclustered.map(a => ({
    id: a.id,
    source: a.source,
    title: a.title,
    date: a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    currentClusterId: null,
    confidence: null,
    description: a.description,
  }));

  log.debug(`[Layer 2] Sending ${candidates.length} unclustered activities to LLM (${result.length} existing clusters)`);

  // Batch candidates to avoid overwhelming the LLM with large payloads
  const BATCH_SIZE = 40;
  let allAssignments: Record<string, { action: string; target: string }> = {};
  let totalFallback = false;

  for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
    const batch = candidates.slice(batchStart, batchStart + BATCH_SIZE);

    // Rebuild existingClusters snapshot including any NEW clusters from prior batches
    const currentClusters: ClusterSummary[] = result.map((c, idx) => ({
      id: `layer1_${idx}`,
      name: c.name || `Cluster ${idx + 1}`,
      activityCount: c.activityIds.length,
      dateRange: `${c.metrics.dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${c.metrics.dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      toolSummary: c.metrics.toolTypes.join(', '),
      topActivities: c.activities.slice(0, 3).map(a => a.title).join(', '),
      isReferenced: false,
    }));

    log.debug(`[Layer 2] Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batch.length} candidates, ${currentClusters.length} clusters`);

    const llmResult = await assignClusters(currentClusters, batch);

    if (llmResult.fallback) {
      log.warn(`[Layer 2] LLM fallback on batch ${Math.floor(batchStart / BATCH_SIZE) + 1}`);
      totalFallback = true;
      continue; // Try next batch — partial results are better than none
    }

    log.info(`[Layer 2] Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: assigned ${Object.keys(llmResult.assignments).length} activities (model: ${llmResult.model}, ${llmResult.processingTimeMs}ms)`);

    // Apply MOVE and NEW assignments from this batch immediately so the next batch sees updated clusters
    const batchClusterIdToIndex = new Map<string, number>();
    currentClusters.forEach((c, idx) => batchClusterIdToIndex.set(c.id, idx));

    const batchNewClusterGroups = new Map<string, string[]>();

    for (const [actId, assignment] of Object.entries(llmResult.assignments)) {
      allAssignments[actId] = assignment;

      if (assignment.action === 'MOVE') {
        const clusterIdx = batchClusterIdToIndex.get(assignment.target);
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
            result[clusterIdx].metrics.dateRange = computeDateRange(
              result[clusterIdx].activities.map(a => a.timestamp)
            );
          }
        }
      } else if (assignment.action === 'NEW') {
        const group = batchNewClusterGroups.get(assignment.target) || [];
        group.push(actId);
        batchNewClusterGroups.set(assignment.target, group);
      }
    }

    // Create new clusters from this batch so next batch sees them
    for (const [name, activityIds] of batchNewClusterGroups) {
      const groupActivities = activityIds
        .map(id => activityMap.get(id))
        .filter((a): a is ActivityWithSourceUrl => a !== undefined);

      if (groupActivities.length === 0) continue;

      result.push({
        name,
        dominantContainer: computeDominantContainer(groupActivities),
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
  }

  if (totalFallback && Object.keys(allAssignments).length === 0) {
    log.warn('[Layer 2] All batches fell back — returning Layer 1 clusters only');
  } else {
    log.info(`[Layer 2] Total assignments: ${Object.keys(allAssignments).length}`);
  }

  return result;
}

// =============================================================================
// STEP 4: CREATE JOURNAL ENTRIES
// =============================================================================

async function createProductionJournalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string; crossToolRefs?: string[]; rawData?: any }>,
  inMemoryClusters: InMemoryCluster[],
  minActivitiesPerEntry: number = MIN_ACTIVITIES_PER_ENTRY
): Promise<{ entries: JournalEntryData[]; temporalCount: number; clusterCount: number }> {
  if (activities.length === 0) return { entries: [], temporalCount: 0, clusterCount: 0 };

  // Ensure workspace exists (create if missing — handles sync before onboarding completes)
  let workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: DEFAULT_WORKSPACE_NAME,
        description: 'Auto-created during sync',
        isPersonal: true,
        allowTeamMembers: false,
        members: { create: { userId, role: 'owner', permissions: {} } },
      },
    });
    log.debug(`Created workspace ${workspace.id} for user ${userId}`);
  }
  const workspaceId = workspace.id;

  // 1. Find orphan activities (not in any cluster after Layer 1 + Layer 2)
  const clusteredIds = new Set(inMemoryClusters.flatMap(c => c.activityIds));
  const orphanActivities = activities.filter(a => !clusteredIds.has(a.id));
  log.debug(`Orphan activities: ${orphanActivities.length} of ${activities.length} (${clusteredIds.size} clustered)`);

  // 2. Create temporal entries only for orphans (14-day windows)
  const temporalEntries = await createTemporalEntries(userId, orphanActivities, workspaceId, minActivitiesPerEntry);

  // 3. Create cluster-based entries
  const clusterEntries = await createClusterEntries(userId, workspaceId, inMemoryClusters, minActivitiesPerEntry);

  return {
    entries: [...temporalEntries, ...clusterEntries],
    temporalCount: temporalEntries.length,
    clusterCount: clusterEntries.length,
  };
}

async function createTemporalEntries(
  userId: string,
  activities: Array<{ id: string; timestamp: Date; title: string; source: string; rawData?: any }>,
  workspaceId: string,
  minActivitiesPerEntry: number = MIN_ACTIVITIES_PER_ENTRY
): Promise<JournalEntryData[]> {
  if (activities.length === 0) return [];

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

    if (windowActivities.length >= minActivitiesPerEntry) {
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
  inMemoryClusters: InMemoryCluster[],
  minActivitiesPerEntry: number = MIN_ACTIVITIES_PER_ENTRY
): Promise<JournalEntryData[]> {
  const entries: JournalEntryData[] = [];

  for (const cluster of inMemoryClusters) {
    if (cluster.activities.length >= minActivitiesPerEntry) {
      const entry = await createJournalEntryFromCluster(userId, cluster, workspaceId);
      if (entry) entries.push(entry); // Skip null (duplicate) entries
    }
  }

  return entries;
}

export function buildTemporalTitle(
  windowActivities: Array<{ source: string; rawData?: any }>,
  startStr: string,
  endStr: string,
): string {
  // Extract repo names from rawData for meaningful titles
  const repoNames = new Set<string>();
  for (const a of windowActivities) {
    const raw = a.rawData;
    if (raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).repository === 'string') {
      const fullRepo = (raw as Record<string, unknown>).repository as string;
      const parts = fullRepo.split('/');
      repoNames.add(parts[parts.length - 1]);
    }
  }

  if (repoNames.size === 1) {
    const repo = [...repoNames][0];
    return `${repo}: ${startStr} - ${endStr} (${windowActivities.length} activities)`;
  } else if (repoNames.size > 1) {
    return `${repoNames.size} projects: ${startStr} - ${endStr} (${windowActivities.length} activities)`;
  }

  const toolCounts: Record<string, number> = {};
  for (const a of windowActivities) {
    toolCounts[a.source] = (toolCounts[a.source] || 0) + 1;
  }
  const toolCountStr = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tool, count]) => `${count} ${tool}`)
    .join(', ');
  return `Week of ${startStr} - ${endStr} (${toolCountStr})`;
}

async function createJournalEntryFromWindow(
  userId: string,
  windowActivities: Array<{ id: string; timestamp: Date; title: string; source: string; rawData?: any }>,
  workspaceId: string
): Promise<JournalEntryData | null> {
  const startDate = windowActivities[0].timestamp;
  const endDate = windowActivities[windowActivities.length - 1].timestamp;

  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const title = buildTemporalTitle(windowActivities, startStr, endStr);

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
  if (activities.length === 0) return null;

  const sorted = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const startDate = sorted[0].timestamp;
  const endDate = sorted[sorted.length - 1].timestamp;

  const clusterName = deriveClusterName(cluster.name, cluster.dominantContainer);
  const summary = getClusterSummary(activities);
  const title = `${clusterName}: ${summary}`;

  const toolSummary = buildToolSummary(activities);
  const description = `${activities.length} related activities across ${toolSummary}`;

  const combinedContent = `${title} ${description}`;
  const skills = extractSkillsFromContent(combinedContent);

  // Check if a cluster entry with the same clusterRef already exists
  // This prevents duplicate entries on repeated syncs
  // Use derived clusterName (not cluster.name) so container-derived names also dedup
  const existing = await prisma.journalEntry.findFirst({
    where: {
      authorId: userId,
      sourceMode: 'production',
      groupingMethod: 'cluster',
      clusterRef: clusterName,
    },
  });

  if (existing) {
    // Update existing entry with merged activities
    const mergedActivityIds = [...new Set([...existing.activityIds, ...cluster.activityIds])];

    // Only update if there are new activities
    if (mergedActivityIds.length === existing.activityIds.length) {
      log.debug(`Skipping duplicate cluster entry: ${clusterName}`);
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

    log.debug(`Updated existing cluster entry: ${clusterName} (${existing.activityIds.length} -> ${mergedActivityIds.length} activities)`);

    return {
      id: updated.id,
      title: updated.title,
      activityIds: updated.activityIds,
      timeRangeStart: startDate,
      timeRangeEnd: endDate,
      groupingMethod: 'cluster',
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
      activityIds: cluster.activityIds,
      groupingMethod: 'cluster',
      clusterRef: clusterName,
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

export function getClusterSummary(activities: Array<{ title: string }>): string {
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

  // Skip entries that already have generated narratives (generatedAt != null).
  // This prevents burning Sonnet tokens on re-sync when activities haven't changed.
  // Safety: createJournalEntryFromWindow/Cluster resets generatedAt to null when
  // new activities are merged, so stale narratives always get regenerated.
  const existingEntries = await prisma.journalEntry.findMany({
    where: { id: { in: entries.map(e => e.id) } },
    select: { id: true, generatedAt: true },
  });
  const alreadyGenerated = new Set(
    existingEntries.filter(e => e.generatedAt !== null).map(e => e.id)
  );
  const needsNarrative = entries.filter(e => !alreadyGenerated.has(e.id));

  if (needsNarrative.length < entries.length) {
    log.info(`Skipping ${entries.length - needsNarrative.length} entries with existing narratives`);
  }
  if (needsNarrative.length === 0) {
    log.info('All entries already have narratives, nothing to generate');
    return;
  }

  const journalService = new JournalService();
  const MAX_CONCURRENT_NARRATIVES = 3;

  const narrativeTasks = needsNarrative.map((entry) => async () => {
    log.debug(`Generating narrative for entry ${entry.id}`);
    await journalService.regenerateNarrative(userId, entry.id, { style: 'professional', maxRetries: 1 });
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
  });

  log.info(`Generating narratives for ${needsNarrative.length} entries (max ${MAX_CONCURRENT_NARRATIVES} concurrent, ${alreadyGenerated.size} skipped)`);
  const perEntryTimeout = 30_000;
  const totalTimeout = perEntryTimeout * Math.ceil(needsNarrative.length / MAX_CONCURRENT_NARRATIVES) + 10_000;

  const results = await withTimeout(
    runWithConcurrency(narrativeTasks, MAX_CONCURRENT_NARRATIVES),
    totalTimeout,
    'Narrative generation'
  );

  // Report failures via SSE
  if (results && emitProgressEvents) {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const error = r.reason instanceof Error ? r.reason.message : String(r.reason);
        log.warn(`Failed to generate narrative for entry ${needsNarrative[i].id}`, { error });
        sseService.broadcastToUser(userId, {
          type: 'data-changed',
          data: {
            entryId: needsNarrative[i].id,
            status: 'error',
            error,
            timestamp: new Date().toISOString(),
          },
        });
      }
    });
  }

  const succeeded = results ? results.filter(r => r.status === 'fulfilled').length : 0;
  log.info(`Narrative generation complete: ${succeeded}/${needsNarrative.length} succeeded (${alreadyGenerated.size} skipped)`);
}
