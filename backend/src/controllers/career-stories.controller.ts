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
} from '../services/career-stories';
import * as demoService from '../services/career-stories/demo.service';
import { DEFAULT_DEMO_PERSONA, DemoServiceError } from '../services/career-stories/demo.service';
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
  formatZodErrors,
} from './career-stories.schemas';

const activityService = new ActivityPersistenceService(prisma);
const clusteringService = new ClusteringService(prisma);

// =============================================================================
// ERROR HANDLING (RC: Reusable error handler for demo endpoints)
// =============================================================================

/**
 * Handle DemoServiceError and return appropriate HTTP status.
 * Returns true if error was handled, false if it should be re-thrown.
 */
function handleDemoServiceError(error: unknown, res: Response): boolean {
  if (error instanceof DemoServiceError) {
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
      where: { cluster: { userId } },
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
    where: { cluster: { userId } },
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
  const result = await demoService.seedDemoData(userId);

  sendSuccess(res, {
    pipeline: {
      activitiesSeeded: result.activitiesSeeded,
      clustersCreated: result.clustersCreated,
    },
    clusters: result.clusters,
  }, 'Demo stories created successfully');
});

/**
 * GET /api/career-stories/demo/clusters
 * Get all demo clusters for the user.
 */
export const getDemoClusters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const clusters = await demoService.getDemoClusters(userId);
  sendSuccess(res, clusters);
});

/**
 * GET /api/career-stories/demo/clusters/:id
 * Get a single demo cluster with activities.
 */
export const getDemoClusterById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const cluster = await demoService.getDemoClusterById(userId, id);
  if (!cluster) {
    return void sendError(res, 'Demo cluster not found', 404);
  }

  sendSuccess(res, cluster);
});

/**
 * POST /api/career-stories/demo/clusters/:id/generate-star
 * Generate STAR narrative for a demo cluster.
 * Uses the same pipeline but reads from demo tables.
 */
export const generateDemoStar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id: clusterId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Validate request body
  const parseResult = generateStarSchema.safeParse(req.body || {});
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return void sendError(res, errors, 400);
  }

  const { options } = parseResult.data;

  // Get demo cluster with activities
  const cluster = await demoService.getDemoClusterById(userId, clusterId);
  if (!cluster) {
    return void sendError(res, 'Demo cluster not found', 404);
  }

  // Build persona from user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const persona = user ? buildPersonaFromUser({
    id: user.id,
    email: user.email,
    name: user.name,
  }) : DEFAULT_DEMO_PERSONA;

  // Convert demo activities to the format expected by STAR generation
  const activities: ActivityWithRefs[] = (cluster.activities || []).map((a) => ({
    id: a.id,
    source: a.source,
    sourceId: a.sourceId,
    sourceUrl: a.sourceUrl,
    title: a.title,
    description: a.description,
    timestamp: a.timestamp,
    crossToolRefs: a.crossToolRefs,
    refs: a.crossToolRefs, // ActivityWithRefs requires refs field
    rawData: null,
    clusterId: cluster.id,
    userId,
    createdAt: new Date(),
  }));

  // Compute shared refs from activities
  const refCounts = new Map<string, number>();
  activities.forEach((a) => {
    a.refs.forEach((ref) => {
      refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
    });
  });
  const sharedRefs = Array.from(refCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([ref]) => ref);

  // Build cluster object for STAR generation
  const clusterForGeneration: Cluster = {
    id: cluster.id,
    activityIds: activities.map((a) => a.id),
    sharedRefs,
    metrics: {
      activityCount: activities.length,
      refCount: sharedRefs.length,
      toolTypes: [...new Set(activities.map((a) => a.source))],
      dateRange: cluster.metrics?.dateRange
        ? {
            earliest: new Date(cluster.metrics.dateRange.start),
            latest: new Date(cluster.metrics.dateRange.end),
          }
        : undefined,
    },
  };

  // Generate STAR using the pipeline
  const starOptions: STARGenerationOptions = {
    polish: options?.polish ?? true,
    framework: options?.framework ?? 'STAR',
  };

  const result = await starGenerationService.generate(
    clusterForGeneration,
    activities,
    persona,
    starOptions
  );

  if (result.isErr()) {
    return void sendError(res, result.error.message, 500);
  }

  sendSuccess(res, result.value);
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

  await demoService.clearDemoData(userId);
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

  const result = await demoService.seedDemoData(userId);
  sendSuccess(res, {
    activityCount: result.activitiesSeeded,
    clusterCount: result.clustersCreated,
    entryCount: result.entriesCreated,
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
    const result = await demoService.updateDemoJournalEntryActivities(userId, id, activityIds);
    sendSuccess(res, result, 'Journal entry activities updated');
  } catch (error) {
    if (!handleDemoServiceError(error, res)) throw error;
  }
});

/**
 * PATCH /api/v1/demo/clusters/:id/activities
 * Update activity assignments for a demo cluster.
 */
export const updateDemoClusterActivities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    const result = await demoService.updateDemoClusterActivities(userId, id, activityIds);
    sendSuccess(res, result, 'Cluster activities updated');
  } catch (error) {
    if (!handleDemoServiceError(error, res)) throw error;
  }
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
    const result = await demoService.regenerateDemoJournalNarrative(userId, id, options);
    sendSuccess(res, result, 'Journal narrative regenerated');
  } catch (error) {
    if (!handleDemoServiceError(error, res)) throw error;
  }
});
