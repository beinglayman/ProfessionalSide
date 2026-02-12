/**
 * Career Stories Controller
 *
 * API endpoints for tool activities, clustering, and story generation.
 */

import { Request, Response } from 'express';
import { sendSuccess, sendError, sendPaginated, asyncHandler } from '../utils/response.utils';
import { prisma } from '../lib/prisma';
import {
  ActivityPersistenceService,
  ClusteringService,
  generateMockActivities,
  getExpectedClusters,
  createStoryPublishingService,
  Visibility,
  createCareerStoryService,
} from '../services/career-stories';
import * as seedService from '../services/career-stories/seed.service';
import { DEFAULT_SEED_PERSONA, SeedServiceError } from '../services/career-stories/seed.service';
import {
  starGenerationService,
  STARGenerationOptions,
} from '../services/career-stories/star-generation.service';
import { ActivityWithRefs } from '../services/career-stories/pipeline/cluster-hydrator';
import { Cluster } from '../services/career-stories/pipeline/types';
import { buildPersonaFromUser } from '../services/career-stories/persona-builder';
import {
  generateClustersSchema,
  updateClusterSchema,
  addActivitySchema,
  mergeClustersSchema,
  generateStarSchema,
  regenerateStorySchema,
  createSourceSchema,
  updateSourceSchema,
  createAnnotationSchema,
  updateAnnotationSchema,
  deriveStorySchema,
  derivePacketSchema,
  formatZodErrors,
} from './career-stories.schemas';
import { storySourceService } from '../services/career-stories/story-source.service';
import { storyAnnotationService } from '../services/career-stories/story-annotation.service';
import { deriveStory as deriveStoryService } from '../services/career-stories/derivation.service';
import { derivePacket as derivePacketService } from '../services/career-stories/derivation-multi.service';
import { WalletService } from '../services/wallet.service';
import { StoryDerivationService } from '../services/career-stories/story-derivation.service';

const activityService = new ActivityPersistenceService(prisma);
const clusteringService = new ClusteringService(prisma);

/**
 * Enrich a story object with sources and sourceCoverage.
 * Used by all endpoints that return a single story.
 */
async function enrichStoryWithSources(story: { id: string; framework: string; sections: Record<string, { summary?: string }>; journalEntryId?: string | null }) {
  try {
    const sources = await storySourceService.getSourcesForStory(story.id);
    const { FRAMEWORK_SECTIONS } = await import('../services/ai/prompts/career-story.prompt');
    const sectionKeys = FRAMEWORK_SECTIONS[story.framework as keyof typeof FRAMEWORK_SECTIONS] || Object.keys(story.sections);
    const sourceCoverage = storySourceService.computeCoverage(sources, story.sections, sectionKeys);

    // Look up groupingMethod from linked journal entry
    let groupingMethod: string | null = null;
    if (story.journalEntryId) {
      const entry = await prisma.journalEntry.findUnique({
        where: { id: story.journalEntryId },
        select: { groupingMethod: true },
      });
      groupingMethod = entry?.groupingMethod ?? null;
    }

    const annotations = await storyAnnotationService.getAnnotationsForStory(story.id);

    return { ...story, sources, sourceCoverage, groupingMethod, annotations };
  } catch (error) {
    // Sources/annotations are supplementary — don't fail the whole request if enrichment fails
    console.error(`Failed to enrich story ${story.id} with sources:`, error);
    return { ...story, sources: [], sourceCoverage: { total: 0, sourced: 0, gaps: [], vagueMetrics: [] }, annotations: [] };
  }
}

// =============================================================================
// DEMO MODE DETECTION
// =============================================================================

/**
 * Check if the request is in demo mode.
 * Reads from:
 * 1. req.isDemoMode (set by middleware if applied)
 * 2. X-Demo-Mode header
 * 3. isDemoMode query parameter
 */
function isDemoModeRequest(req: Request): boolean {
  // Middleware-set value takes precedence
  if (req.isDemoMode !== undefined) {
    return req.isDemoMode;
  }
  // Fall back to header
  if (req.headers['x-demo-mode'] === 'true') {
    return true;
  }
  // Fall back to query parameter
  if (req.query.isDemoMode === 'true') {
    return true;
  }
  return false;
}

// =============================================================================
// ERROR HANDLING (RC: Reusable error handler for demo endpoints)
// =============================================================================

/**
 * Handle SeedServiceError and return appropriate HTTP status.
 * Returns true if error was handled, false if it should be re-thrown.
 */
function handleSeedServiceError(error: unknown, res: Response): boolean {
  if (error instanceof SeedServiceError) {
    const statusMap: Record<string, number> = {
      ENTRY_NOT_FOUND: 404,
      CLUSTER_NOT_FOUND: 404,
      NO_ACTIVITIES: 400,
      INVALID_INPUT: 400,
    };
    const status = statusMap[error.code] || 500;
    sendError(res, error.message, status, { code: error.code });
    return true;
  }
  return false;
}

// ============================================================================
// TOOL ACTIVITIES
// ============================================================================

/**
 * GET /api/career-stories/activities
 * List user's tool activities with optional filtering
 */
export const getActivities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const {
    source,
    startDate,
    endDate,
    limit = '50',
    offset = '0',
  } = req.query;

  const activities = await activityService.getActivities(userId, {
    source: source as string | undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: parseInt(limit as string, 10),
    offset: parseInt(offset as string, 10),
  });

  const total = await activityService.getActivityCount(userId);

  sendPaginated(res, activities, {
    page: Math.floor(parseInt(offset as string, 10) / parseInt(limit as string, 10)) + 1,
    limit: parseInt(limit as string, 10),
    total,
  });
});

/**
 * GET /api/career-stories/activities/:id
 * Get a single activity by ID
 */
export const getActivityById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const activity = await prisma.toolActivity.findFirst({
    where: { id, userId },
  });

  if (!activity) {
    return void sendError(res, 'Activity not found', 404);
  }

  sendSuccess(res, activity);
});

/**
 * GET /api/career-stories/activities/unclustered
 * Get activities not assigned to any cluster
 */
export const getUnclusteredActivities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const activities = await activityService.getUnclusteredActivities(userId);

  sendSuccess(res, activities);
});

// ============================================================================
// CLUSTERS
// ============================================================================

/**
 * POST /api/career-stories/clusters/generate
 * Run clustering algorithm on unclustered activities
 */
export const generateClusters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body with Zod
  const parseResult = generateClustersSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { startDate, endDate, minClusterSize = 2 } = parseResult.data;

  const results = await clusteringService.clusterActivities(userId, {
    dateRange: startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined,
    minClusterSize,
  });

  sendSuccess(res, {
    clustersCreated: results.length,
    clusters: results,
  }, `Created ${results.length} clusters`);
});

/**
 * GET /api/career-stories/clusters
 * List user's clusters with activity counts
 */
export const getClusters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const clusters = await clusteringService.getClusters(userId);

  sendSuccess(res, clusters);
});

/**
 * GET /api/career-stories/clusters/:id
 * Get a single cluster with its activities
 */
export const getClusterById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const cluster = await clusteringService.getClusterWithActivities(id);

  if (!cluster || cluster.userId !== userId) {
    return void sendError(res, 'Cluster not found', 404);
  }

  sendSuccess(res, cluster);
});

/**
 * PATCH /api/career-stories/clusters/:id
 * Update cluster (rename)
 */
export const updateCluster = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body with Zod
  const parseResult = updateClusterSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { name } = parseResult.data;

  // Verify ownership
  const existing = await prisma.storyCluster.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return void sendError(res, 'Cluster not found', 404);
  }

  const cluster = await clusteringService.renameCluster(id, name);

  sendSuccess(res, cluster, 'Cluster renamed');
});

/**
 * DELETE /api/career-stories/clusters/:id
 * Delete a cluster (activities become unclustered)
 */
export const deleteCluster = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Verify ownership
  const existing = await prisma.storyCluster.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return void sendError(res, 'Cluster not found', 404);
  }

  await clusteringService.deleteCluster(id);

  sendSuccess(res, null, 'Cluster deleted');
});

/**
 * POST /api/career-stories/clusters/:id/activities
 * Add an activity to a cluster
 */
export const addActivityToCluster = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id: clusterId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body with Zod
  const parseResult = addActivitySchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { activityId } = parseResult.data;

  // Verify cluster ownership
  const cluster = await prisma.storyCluster.findFirst({
    where: { id: clusterId, userId },
  });

  if (!cluster) {
    return void sendError(res, 'Cluster not found', 404);
  }

  // Verify activity ownership
  const activity = await prisma.toolActivity.findFirst({
    where: { id: activityId, userId },
  });

  if (!activity) {
    return void sendError(res, 'Activity not found', 404);
  }

  const updated = await clusteringService.addActivityToCluster(clusterId, activityId);

  sendSuccess(res, updated, 'Activity added to cluster');
});

/**
 * DELETE /api/career-stories/clusters/:id/activities/:activityId
 * Remove an activity from a cluster
 */
export const removeActivityFromCluster = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id: clusterId, activityId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Verify ownership
  const activity = await prisma.toolActivity.findFirst({
    where: { id: activityId, userId, clusterId },
  });

  if (!activity) {
    return void sendError(res, 'Activity not found in cluster', 404);
  }

  const updated = await clusteringService.removeActivityFromCluster(activityId);

  sendSuccess(res, updated, 'Activity removed from cluster');
});

/**
 * POST /api/career-stories/clusters/:id/generate-star
 * Generate a STAR narrative from a cluster
 */
export const generateStar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id: clusterId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body with Zod
  const parseResult = generateStarSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { personaId, options } = parseResult.data;

  // Step 1: Get cluster and verify ownership
  const dbCluster = await prisma.storyCluster.findFirst({
    where: { id: clusterId, userId },
    include: {
      activities: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!dbCluster) {
    return void sendError(res, 'Cluster not found', 404);
  }

  // Step 2: Get user and build persona
  // TODO: Add CareerPersona model lookup in Phase 3
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return void sendError(res, 'User not found', 404);
  }

  const persona = buildPersonaFromUser(user);

  // Step 3: Calculate shared refs from activities
  const refCounts = new Map<string, number>();
  for (const activity of dbCluster.activities) {
    const refs = (activity.crossToolRefs as string[]) || [];
    for (const ref of refs) {
      refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
    }
  }
  const sharedRefs = Array.from(refCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([ref]) => ref);

  // Step 4: Transform DB cluster to pipeline Cluster type
  const cluster: Cluster = {
    id: dbCluster.id,
    activityIds: dbCluster.activities.map((a) => a.id),
    sharedRefs,
    metrics: {
      activityCount: dbCluster.activities.length,
      refCount: sharedRefs.length,
      toolTypes: [...new Set(dbCluster.activities.map((a) => a.source))],
      dateRange: dbCluster.activities.length > 0
        ? {
            earliest: dbCluster.activities[0].timestamp,
            latest: dbCluster.activities[dbCluster.activities.length - 1].timestamp,
          }
        : undefined,
    },
  };

  // Step 5: Transform DB activities to ActivityWithRefs type
  const activities: ActivityWithRefs[] = dbCluster.activities.map((a) => ({
    id: a.id,
    source: a.source,
    sourceId: a.sourceId,
    sourceUrl: a.sourceUrl,
    title: a.title,
    description: a.description,
    timestamp: a.timestamp,
    refs: (a.crossToolRefs as string[]) || [],
    rawData: a.rawData as Record<string, unknown> | null,
  }));

  // Step 6: Generate STAR using Result-based API
  const generationOptions: STARGenerationOptions = {
    debug: options?.debug,
    polish: options?.polish,
    framework: options?.framework,
  };

  const generationResult = await starGenerationService.generate(
    cluster,
    activities,
    persona,
    generationOptions
  );

  // Handle generation errors
  if (generationResult.isErr()) {
    const error = generationResult.error;
    const statusCode = error.code === 'CLUSTER_NOT_FOUND' ? 404 : 500;
    return void sendError(res, error.message, statusCode, {
      code: error.code,
      stage: error.stage,
    });
  }

  const result = generationResult.value;

  // Step 7: Return result
  if (result.star) {
    sendSuccess(res, {
      star: result.star,
      polishStatus: result.polishStatus,
      processingTimeMs: result.processingTimeMs,
    });
  } else {
    // Validation failed but not an error - return success with null star
    sendSuccess(res, {
      star: null,
      reason: 'VALIDATION_GATES_FAILED',
      failedGates: result.failedGates,
      participations: result.participations,
      processingTimeMs: result.processingTimeMs,
    });
  }
});

/**
 * POST /api/career-stories/clusters/merge
 * Merge multiple clusters into one
 */
export const mergeClusters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body with Zod
  const parseResult = mergeClustersSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { targetClusterId, sourceClusterIds } = parseResult.data;

  // Verify all clusters belong to user
  const allClusterIds = [targetClusterId, ...sourceClusterIds];
  const ownedClusters = await prisma.storyCluster.findMany({
    where: { id: { in: allClusterIds }, userId },
    select: { id: true },
  });

  if (ownedClusters.length !== allClusterIds.length) {
    return void sendError(res, 'One or more clusters not found', 404);
  }

  const merged = await clusteringService.mergeClusters(targetClusterId, sourceClusterIds);

  sendSuccess(res, merged, `Merged ${sourceClusterIds.length} clusters`);
});

// ============================================================================
// STATS
// ============================================================================

/**
 * GET /api/career-stories/stats
 * Get summary stats for career stories
 */
export const getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const [activityCount, clusterCount, unclusteredCount, storyCount] = await Promise.all([
    prisma.toolActivity.count({ where: { userId } }),
    prisma.storyCluster.count({ where: { userId } }),
    prisma.toolActivity.count({ where: { userId, clusterId: null } }),
    prisma.careerStory.count({
      where: { userId },
    }),
  ]);

  // Get activity counts by source
  const bySource = await prisma.toolActivity.groupBy({
    by: ['source'],
    where: { userId },
    _count: true,
  });

  sendSuccess(res, {
    activities: {
      total: activityCount,
      unclustered: unclusteredCount,
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
    },
    clusters: clusterCount,
    stories: storyCount,
  });
});

// ============================================================================
// MOCK DATA (Development/Testing)
// ============================================================================

/**
 * POST /api/career-stories/mock/seed
 * Seed mock tool activities for testing the pipeline
 */
export const seedMockData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Check if running in development
  if (process.env.NODE_ENV === 'production') {
    return void sendError(res, 'Mock data seeding not available in production', 403);
  }

  const mockActivities = generateMockActivities();
  const count = await activityService.persistActivities(userId, mockActivities);

  sendSuccess(res, {
    activitiesCreated: count,
    expectedClusters: getExpectedClusters(),
    nextSteps: [
      'GET /api/v1/career-stories/activities to see seeded activities',
      'POST /api/v1/career-stories/clusters/generate to run clustering',
      'GET /api/v1/career-stories/clusters to see resulting clusters',
    ],
  }, `Seeded ${count} mock activities`);
});

/**
 * DELETE /api/career-stories/mock/clear
 * Clear all activities and clusters for the user (testing reset)
 */
export const clearMockData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Check if running in development
  if (process.env.NODE_ENV === 'production') {
    return void sendError(res, 'Mock data clearing not available in production', 403);
  }

  // Delete in order: stories -> clusters -> activities
  const deletedStories = await prisma.careerStory.deleteMany({
    where: { userId },
  });

  const deletedClusters = await prisma.storyCluster.deleteMany({
    where: { userId },
  });

  const deletedActivities = await prisma.toolActivity.deleteMany({
    where: { userId },
  });

  sendSuccess(res, {
    deleted: {
      activities: deletedActivities.count,
      clusters: deletedClusters.count,
      stories: deletedStories.count,
    },
  }, 'All career stories data cleared');
});

/**
 * POST /api/career-stories/mock/full-pipeline
 * Run full pipeline using DEMO tables: seed -> cluster -> return results.
 * Safe for production - uses isolated demo_* tables, not real user data.
 */
export const runFullPipeline = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Use demo service - safe for production as it uses separate demo_* tables
  const result = await seedService.seedDemoData(userId);

  sendSuccess(res, {
    pipeline: {
      activitiesSeeded: result.activitiesSeeded,
      clustersCreated: result.clustersCreated,
    },
    clusters: result.clusters,
  }, 'Demo stories created successfully');
});

/**
 * @deprecated DemoStoryCluster table has been removed.
 * Clusters are now stored inline in JournalEntry (activityIds, groupingMethod, clusterRef).
 * Use GET /api/v1/journal/feed with X-Demo-Mode header instead.
 */
export const getDemoClusters = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  return void sendError(res, 'DemoStoryCluster has been deprecated. Use journal entries with groupingMethod="cluster" instead.', 410);
});

/**
 * @deprecated DemoStoryCluster table has been removed.
 * Use GET /api/v1/journal/entries/:id with X-Demo-Mode header instead.
 */
export const getDemoClusterById = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  return void sendError(res, 'DemoStoryCluster has been deprecated. Use journal entries with groupingMethod="cluster" instead.', 410);
});

/**
 * @deprecated Use POST /api/v1/demo/journal-entries/:id/regenerate instead.
 * STAR generation now works on journal entries directly.
 */
export const generateDemoStar = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  return void sendError(res, 'generateDemoStar has been deprecated. Use POST /api/v1/demo/journal-entries/:id/regenerate instead.', 410);
});

/**
 * DELETE /api/career-stories/demo/clear
 * Clear all demo data for a user.
 */
export const clearDemoData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  await seedService.clearDemoData(userId);
  sendSuccess(res, { cleared: true }, 'Demo data cleared');
});

/**
 * POST /api/v1/demo/sync
 * Seed demo data for the user (activities, clusters).
 * Used by the frontend Sync button in demo mode.
 */
export const syncDemoData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const dataset = req.query.dataset === 'v2' ? 'v2' as const : undefined;
  const result = await seedService.seedDemoData(userId, { backgroundNarratives: true, dataset });
  sendSuccess(res, {
    activityCount: result.activitiesSeeded,
    activitiesBySource: result.activitiesBySource,
    entryCount: result.entriesCreated,
    temporalEntryCount: result.temporalEntriesCreated,
    clusterEntryCount: result.clusterEntriesCreated,
    entryPreviews: result.entryPreviews,
  }, 'Demo data synced successfully');
});


/**
 * PATCH /api/v1/demo/journal-entries/:id/activities
 * Update activity IDs for a demo journal entry.
 */
export const updateDemoJournalEntryActivities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { activityIds } = req.body;
  if (!Array.isArray(activityIds)) {
    return void sendError(res, 'activityIds must be an array', 400);
  }

  try {
    const result = await seedService.updateDemoJournalEntryActivities(userId, id, activityIds);
    sendSuccess(res, result, 'Journal entry activities updated');
  } catch (error) {
    if (!handleSeedServiceError(error, res)) throw error;
  }
});

/**
 * @deprecated DemoStoryCluster table has been removed.
 * Use PATCH /api/v1/demo/journal-entries/:id/activities instead.
 */
export const updateDemoClusterActivities = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  return void sendError(res, 'DemoStoryCluster has been deprecated. Use PATCH /api/v1/demo/journal-entries/:id/activities instead.', 410);
});

/**
 * POST /api/v1/demo/journal-entries/:id/regenerate
 * Regenerate narrative for a demo journal entry.
 */
export const regenerateDemoJournalNarrative = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { options } = req.body || {};

  try {
    const result = await seedService.regenerateDemoJournalNarrative(userId, id, options);
    sendSuccess(res, result, 'Journal narrative regenerated');
  } catch (error) {
    if (!handleSeedServiceError(error, res)) throw error;
  }
});

// ============================================================================
// STORY PUBLISHING (Demo Mode)
// ============================================================================

/**
 * POST /api/v1/career-stories/demo/stories/:id/publish
 * Publish a demo story to the user's profile.
 */
export const publishDemoStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { visibility = 'private' } = req.body;

  const service = createStoryPublishingService(true); // Demo mode
  const result = await service.publish(id, userId, visibility as Visibility);

  if (!result.success) {
    const status = result.error === 'Story not found' ? 404 :
                   result.error?.includes('own') ? 403 :
                   result.missingFields ? 400 : 500;
    return void sendError(res, result.error || 'Publish failed', status, {
      missingFields: result.missingFields,
    });
  }

  sendSuccess(res, result.story, 'Story published');
});

/**
 * POST /api/v1/career-stories/demo/stories/:id/unpublish
 * Unpublish a demo story from the profile.
 */
export const unpublishDemoStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const service = createStoryPublishingService(true); // Demo mode
  const result = await service.unpublish(id, userId);

  if (!result.success) {
    const status = result.error === 'Story not found' ? 404 : 403;
    return void sendError(res, result.error || 'Unpublish failed', status);
  }

  sendSuccess(res, result.story, 'Story unpublished');
});

/**
 * PUT /api/v1/career-stories/demo/stories/:id/visibility
 * Change visibility of a demo story.
 */
export const setDemoStoryVisibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const { visibility } = req.body;
  if (!visibility) {
    return void sendError(res, 'visibility is required', 400);
  }

  const service = createStoryPublishingService(true); // Demo mode
  const result = await service.setVisibility(id, userId, visibility as Visibility);

  if (!result.success) {
    const status = result.error === 'Story not found' ? 404 :
                   result.error?.includes('own') ? 403 : 400;
    return void sendError(res, result.error || 'Failed to update visibility', status);
  }

  sendSuccess(res, result.story, 'Visibility updated');
});

/**
 * GET /api/v1/career-stories/demo/stories/:id
 * Get a demo story with publishing info.
 */
export const getDemoStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const service = createStoryPublishingService(true); // Demo mode
  const result = await service.getStory(id, userId);

  if (!result.success) {
    return void sendError(res, result.error || 'Story not found', 404);
  }

  sendSuccess(res, result);
});

// ============================================================================
// CAREER STORIES CRUD (Unified - uses sourceMode from request)
// ============================================================================

/**
 * GET /api/v1/career-stories/stories
 * List all career stories for the current user.
 */
export const listStories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);
  const result = await service.listStories(userId);

  // Enrich each story with sources and coverage
  const enrichedStories = await Promise.all(
    result.stories.map(async (story) => story ? enrichStoryWithSources(story) : story)
  );

  sendSuccess(res, { ...result, stories: enrichedStories });
});

/**
 * GET /api/v1/career-stories/stories/:id
 * Get a single career story by ID.
 */
export const getStoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);
  const story = await service.getStoryById(id, userId);

  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  // Include sources and coverage
  const enriched = await enrichStoryWithSources(story);
  sendSuccess(res, enriched);
});

/**
 * POST /api/v1/career-stories/stories
 * Create a new career story.
 */
export const createStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);
  const story = await service.createStory(userId, req.body);

  sendSuccess(res, story, 'Story created', 201);
});

/**
 * PUT /api/v1/career-stories/stories/:id
 * Update an existing career story.
 */
export const updateStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);

  // updateStory already checks existence and returns error
  const result = await service.updateStory(id, userId, req.body);
  if (!result.success) {
    const status = result.error === 'Story not found' ? 404 : 400;
    return void sendError(res, result.error || 'Update failed', status);
  }

  const enriched = await enrichStoryWithSources(result.story!);
  sendSuccess(res, enriched, 'Story updated');
});

/**
 * DELETE /api/v1/career-stories/stories/:id
 * Delete a career story.
 */
export const deleteStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);

  // deleteStory already checks existence
  const result = await service.deleteStory(id, userId);
  if (!result.success) {
    return void sendError(res, result.error || 'Delete failed', 404);
  }

  sendSuccess(res, { deleted: true }, 'Story deleted');
});

/**
 * POST /api/v1/career-stories/stories/:id/regenerate
 * Regenerate a career story with optional new framework.
 */
export const regenerateStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body with Zod
  const parseResult = regenerateStorySchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { framework, style, userPrompt, archetype } = parseResult.data;

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);

  const result = await service.regenerate(id, userId, framework, style, userPrompt, archetype);
  if (!result.success) {
    const status = result.error === 'Story not found' ? 404 : 500;
    return void sendError(res, result.error || 'Regeneration failed', status);
  }

  const enriched = await enrichStoryWithSources(result.story!);
  sendSuccess(res, { ...enriched, _sourceDebug: result._sourceDebug }, 'Story regenerated');
});

/**
 * POST /api/v1/career-stories/stories/:id/publish
 * Publish a career story.
 */
export const publishStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { visibility = 'private', category, role } = req.body;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createStoryPublishingService(isDemoMode);
  const result = await service.publish(id, userId, visibility as Visibility, { category, role });

  if (!result.success) {
    const status = result.error === 'Story not found' ? 404 :
                   result.error?.includes('own') ? 403 :
                   result.missingFields ? 400 : 500;
    return void sendError(res, result.error || 'Publish failed', status, {
      missingFields: result.missingFields,
    });
  }

  sendSuccess(res, result.story, 'Story published');
});

/**
 * POST /api/v1/career-stories/stories/:id/unpublish
 * Unpublish a career story.
 */
export const unpublishStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createStoryPublishingService(isDemoMode);
  const result = await service.unpublish(id, userId);

  if (!result.success) {
    return void sendError(res, result.error || 'Unpublish failed', 404);
  }

  sendSuccess(res, result.story, 'Story unpublished');
});

/**
 * PUT /api/v1/career-stories/stories/:id/visibility
 * Update story visibility.
 */
export const setStoryVisibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { visibility } = req.body;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!visibility || !['network', 'workspace', 'private'].includes(visibility)) {
    return void sendError(res, 'Invalid visibility value', 400);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createStoryPublishingService(isDemoMode);
  const result = await service.setVisibility(id, userId, visibility as Visibility);

  if (!result.success) {
    return void sendError(res, result.error || 'Update failed', 404);
  }

  sendSuccess(res, result.story, 'Visibility updated');
});

// ============================================================================
// STORY SOURCES
// ============================================================================

/**
 * POST /api/v1/career-stories/stories/:storyId/sources
 * Add a user note source to a story section.
 */
export const addStorySource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = createSourceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { sectionKey, content } = parseResult.data;

  // Verify story ownership
  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  const source = await storySourceService.createUserNote(storyId, sectionKey, content);
  sendSuccess(res, source, 'Source added', 201);
});

/**
 * PATCH /api/v1/career-stories/stories/:storyId/sources/:sourceId
 * Exclude or restore a source (set excludedAt).
 */
export const updateStorySource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId, sourceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = updateSourceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  // Verify story ownership
  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  // Verify source belongs to story
  const isOwned = await storySourceService.verifyOwnership(sourceId, storyId);
  if (!isOwned) {
    return void sendError(res, 'Source not found', 404);
  }

  const { excludedAt } = parseResult.data;
  const source = await storySourceService.updateExcludedAt(
    sourceId,
    storyId,
    excludedAt ? new Date(excludedAt) : null
  );
  sendSuccess(res, source, excludedAt ? 'Source excluded' : 'Source restored');
});

// ============================================================================
// STORY ANNOTATIONS
// ============================================================================

/**
 * GET /api/v1/career-stories/stories/:storyId/annotations
 * List annotations for a story.
 */
export const listAnnotations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  const annotations = await storyAnnotationService.getAnnotationsForStory(storyId);
  sendSuccess(res, annotations);
});

/**
 * POST /api/v1/career-stories/stories/:storyId/annotations
 * Create an annotation on a story section.
 */
export const createAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = createAnnotationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  const annotation = await storyAnnotationService.createAnnotation(storyId, parseResult.data);
  sendSuccess(res, annotation, 'Annotation created', 201);
});

/**
 * PATCH /api/v1/career-stories/stories/:storyId/annotations/:annotationId
 * Update an annotation (note text or style).
 */
export const updateAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId, annotationId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = updateAnnotationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  const isOwned = await storyAnnotationService.verifyOwnership(annotationId, storyId);
  if (!isOwned) {
    return void sendError(res, 'Annotation not found', 404);
  }

  const annotation = await storyAnnotationService.updateAnnotation(annotationId, storyId, parseResult.data);
  sendSuccess(res, annotation, 'Annotation updated');
});

/**
 * DELETE /api/v1/career-stories/stories/:storyId/annotations/:annotationId
 * Delete an annotation.
 */
export const deleteAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId, annotationId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  const isOwned = await storyAnnotationService.verifyOwnership(annotationId, storyId);
  if (!isOwned) {
    return void sendError(res, 'Annotation not found', 404);
  }

  await storyAnnotationService.deleteAnnotation(annotationId, storyId);
  sendSuccess(res, null, 'Annotation deleted');
});

// ============================================================================
// DERIVATION ANNOTATIONS
// ============================================================================

/**
 * GET /api/v1/career-stories/derivations/:derivationId/annotations
 * List annotations for a derivation.
 */
export const listDerivationAnnotations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { derivationId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Verify derivation belongs to user
  const derivation = await prisma.storyDerivation.findFirst({
    where: { id: derivationId, userId },
    select: { id: true },
  });
  if (!derivation) {
    return void sendError(res, 'Derivation not found', 404);
  }

  const annotations = await storyAnnotationService.getAnnotationsForDerivation(derivationId);
  sendSuccess(res, annotations);
});

/**
 * POST /api/v1/career-stories/derivations/:derivationId/annotations
 * Create an annotation on a derivation.
 */
export const createDerivationAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { derivationId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = createAnnotationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const derivation = await prisma.storyDerivation.findFirst({
    where: { id: derivationId, userId },
    select: { id: true },
  });
  if (!derivation) {
    return void sendError(res, 'Derivation not found', 404);
  }

  const annotation = await storyAnnotationService.createDerivationAnnotation(derivationId, parseResult.data);
  sendSuccess(res, annotation, 'Annotation created', 201);
});

/**
 * PATCH /api/v1/career-stories/derivations/:derivationId/annotations/:annotationId
 * Update an annotation on a derivation.
 */
export const updateDerivationAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { derivationId, annotationId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = updateAnnotationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const derivation = await prisma.storyDerivation.findFirst({
    where: { id: derivationId, userId },
    select: { id: true },
  });
  if (!derivation) {
    return void sendError(res, 'Derivation not found', 404);
  }

  const isOwned = await storyAnnotationService.verifyDerivationOwnership(annotationId, derivationId);
  if (!isOwned) {
    return void sendError(res, 'Annotation not found', 404);
  }

  const annotation = await storyAnnotationService.updateDerivationAnnotation(annotationId, derivationId, parseResult.data);
  sendSuccess(res, annotation, 'Annotation updated');
});

/**
 * DELETE /api/v1/career-stories/derivations/:derivationId/annotations/:annotationId
 * Delete an annotation on a derivation.
 */
export const deleteDerivationAnnotation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { derivationId, annotationId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const derivation = await prisma.storyDerivation.findFirst({
    where: { id: derivationId, userId },
    select: { id: true },
  });
  if (!derivation) {
    return void sendError(res, 'Derivation not found', 404);
  }

  const isOwned = await storyAnnotationService.verifyDerivationOwnership(annotationId, derivationId);
  if (!isOwned) {
    return void sendError(res, 'Annotation not found', 404);
  }

  await storyAnnotationService.deleteDerivationAnnotation(annotationId, derivationId);
  sendSuccess(res, null, 'Annotation deleted');
});

// ============================================================================
// STORY DERIVATIONS
// ============================================================================

/**
 * POST /api/v1/career-stories/stories/:storyId/derive
 * Generate an ephemeral audience-specific derivation from a story.
 */
export const deriveStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = deriveStorySchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  // Credit gate
  const affordability = await WalletService.canAfford(userId, 'derive_story');
  if (!affordability.canAfford) {
    return void sendError(res, 'Insufficient credits', 402, { cost: affordability.cost, balance: affordability.balance });
  }

  const { derivation, tone, customPrompt } = parseResult.data;
  const isDemoMode = isDemoModeRequest(req);

  try {
    const result = await deriveStoryService(storyId, userId, derivation, isDemoMode, { tone, customPrompt });

    // Snapshot story metadata for durable display (survives story deletion)
    const storyService = createCareerStoryService(isDemoMode);
    const storyData = await storyService.getStoryById(storyId, userId);
    const storySnapshots = storyData
      ? await StoryDerivationService.buildSnapshots([storyData], isDemoMode)
      : [];

    // Consume credits + persist derivation
    await WalletService.consume(userId, 'derive_story');
    const saved = await StoryDerivationService.save({
      userId,
      kind: 'single',
      type: derivation,
      storyIds: [storyId],
      storySnapshots,
      text: result.text,
      charCount: result.charCount,
      wordCount: result.wordCount,
      speakingTimeSec: result.speakingTimeSec,
      tone,
      customPrompt,
      framework: result.metadata.framework,
      archetype: result.metadata.archetype || undefined,
      model: result.metadata.model,
      processingTimeMs: result.metadata.processingTimeMs,
      featureCode: 'derive_story',
      creditCost: affordability.cost,
    });

    sendSuccess(res, { ...result, derivationId: saved.id });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Story not found') {
      return void sendError(res, 'Story not found', 404);
    }
    if (message === 'LLM service not available') {
      return void sendError(res, 'LLM service not available', 503);
    }
    throw error;
  }
});

/**
 * POST /api/v1/career-stories/derive-packet
 * Generate a multi-story packet (promotion, annual review, skip-level, portfolio brief).
 */
export const derivePacket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = derivePacketSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  // Credit gate
  const affordability = await WalletService.canAfford(userId, 'derive_packet');
  if (!affordability.canAfford) {
    return void sendError(res, 'Insufficient credits', 402, { cost: affordability.cost, balance: affordability.balance });
  }

  const { storyIds, packetType, tone, customPrompt, dateRange } = parseResult.data;
  const isDemoMode = isDemoModeRequest(req);

  try {
    const result = await derivePacketService(userId, storyIds, isDemoMode, { packetType, tone, customPrompt, dateRange });

    // Snapshot story metadata for durable display (survives story deletion)
    const storyService = createCareerStoryService(isDemoMode);
    const packetStories = await Promise.all(storyIds.map(id => storyService.getStoryById(id, userId)));
    const storySnapshots = await StoryDerivationService.buildSnapshots(
      packetStories.filter(Boolean) as any[],
      isDemoMode,
    );

    // Consume credits + persist derivation
    await WalletService.consume(userId, 'derive_packet');
    const saved = await StoryDerivationService.save({
      userId,
      kind: 'packet',
      type: packetType || 'promotion',
      storyIds,
      storySnapshots,
      text: result.text,
      charCount: result.charCount,
      wordCount: result.wordCount,
      tone,
      customPrompt,
      model: result.metadata.model,
      processingTimeMs: result.metadata.processingTimeMs,
      featureCode: 'derive_packet',
      creditCost: affordability.cost,
    });

    sendSuccess(res, { ...result, derivationId: saved.id });
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith('Stories not found')) {
      return void sendError(res, message, 404);
    }
    if (message === 'LLM service not available') {
      return void sendError(res, 'LLM service not available', 503);
    }
    throw error;
  }
});

/**
 * GET /api/v1/career-stories/stories/:storyId/derivations
 * List saved derivations for a story.
 */
export const listStoryDerivations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const derivations = await StoryDerivationService.listForStory(storyId, userId);
  sendSuccess(res, derivations);
});

/**
 * GET /api/v1/career-stories/derivations?kind=packet
 * List derivations by kind (for packet list on career stories page).
 */
export const listDerivationsByKind = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const kind = req.query.kind as string;
  if (kind !== 'single' && kind !== 'packet') {
    return void sendError(res, 'kind must be "single" or "packet"', 400);
  }

  const derivations = await StoryDerivationService.listByKind(userId, kind);
  sendSuccess(res, derivations);
});

/**
 * DELETE /api/v1/career-stories/derivations/:id
 * Delete a saved derivation.
 */
export const deleteDerivation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const result = await StoryDerivationService.delete(id, userId);
  if (result.count === 0) {
    return void sendError(res, 'Derivation not found', 404);
  }

  sendSuccess(res, { deleted: true });
});

// ============================================================================
// PROFILE: PUBLISHED STORIES
// Demo/production routing based on isDemoModeRequest helper
// ============================================================================

/**
 * GET /api/v1/career-stories/users/:userId/published-stories
 * Get published stories for a user's profile.
 * Respects visibility based on viewer relationship.
 * Demo/production routing determined by x-demo-mode header or isDemoMode query param.
 */
export const getPublishedStories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const viewerId = req.user?.id || null;
  const { userId: profileUserId } = req.params;
  const isDemoMode = isDemoModeRequest(req);

  // Check if viewer is in same workspace (placeholder - implement based on actual workspace logic)
  const isWorkspaceMember = false; // TODO: Implement workspace membership check

  const service = createStoryPublishingService(isDemoMode);
  const result = await service.getPublishedStories(profileUserId, viewerId, isWorkspaceMember);

  // Enrich each story with sources (filtered for public view)
  const enrichedStories = await Promise.all(
    result.stories.map(async (story: any) => {
      const enriched = await enrichStoryWithSources(story);
      const publicSources = (enriched.sources || []).filter(
        (s: any) => !s.excludedAt && s.sourceType !== 'wizard_answer'
      );
      return { ...enriched, sources: publicSources };
    })
  );

  sendSuccess(res, {
    stories: enrichedStories,
    totalCount: result.totalCount,
    viewerAccess: result.viewerAccess,
  });
});

/**
 * GET /api/v1/career-stories/published/:storyId
 * Public permalink for a single published story.
 * Uses optionalAuth — works for anonymous visitors.
 */
export const getPublishedStoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { storyId } = req.params;
  const viewerId = req.user?.id || null;

  const story = await prisma.careerStory.findFirst({
    where: { id: storyId, isPublished: true },
  });

  if (!story) {
    sendError(res, 'Story not found', 404);
    return;
  }

  // Enforce visibility
  if (story.visibility === 'private' && story.userId !== viewerId) {
    sendError(res, 'Story not found', 404);
    return;
  }
  // TODO: workspace check for 'workspace' visibility

  // Enrich with sources (filtered for public view)
  const enriched = await enrichStoryWithSources(story as any);
  const publicSources = (enriched.sources || []).filter(
    (s: any) => !s.excludedAt && s.sourceType !== 'wizard_answer'
  );

  // Fetch author info
  const author = await prisma.user.findUnique({
    where: { id: story.userId },
    select: { id: true, name: true, title: true, company: true, avatar: true },
  });

  sendSuccess(res, {
    story: { ...enriched, sources: publicSources },
    author,
  });
});
