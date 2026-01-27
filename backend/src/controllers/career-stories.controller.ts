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

const activityService = new ActivityPersistenceService(prisma);
const clusteringService = new ClusteringService(prisma);

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

  const { startDate, endDate, minClusterSize = 2 } = req.body;

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
  const { name } = req.body;

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
  const { activityId } = req.body;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

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
 * POST /api/career-stories/clusters/merge
 * Merge multiple clusters into one
 */
export const mergeClusters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { targetClusterId, sourceClusterIds } = req.body;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!targetClusterId || !sourceClusterIds || !Array.isArray(sourceClusterIds)) {
    return void sendError(res, 'targetClusterId and sourceClusterIds[] required', 400);
  }

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
 * Run full pipeline: seed -> cluster -> return results
 * Convenience endpoint for testing
 */
export const runFullPipeline = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  // Check if running in development
  if (process.env.NODE_ENV === 'production') {
    return void sendError(res, 'Pipeline test not available in production', 403);
  }

  // Step 1: Clear existing data
  await prisma.careerStory.deleteMany({ where: { cluster: { userId } } });
  await prisma.storyCluster.deleteMany({ where: { userId } });
  await prisma.toolActivity.deleteMany({ where: { userId } });

  // Step 2: Seed mock data
  const mockActivities = generateMockActivities();
  const seededCount = await activityService.persistActivities(userId, mockActivities);

  // Step 3: Run clustering
  const clusters = await clusteringService.clusterActivities(userId, { minClusterSize: 2 });

  // Step 4: Get unclustered activities
  const unclustered = await activityService.getUnclusteredActivities(userId);

  sendSuccess(res, {
    pipeline: {
      step1_cleared: true,
      step2_seeded: seededCount,
      step3_clustered: clusters.length,
      step4_unclustered: unclustered.length,
    },
    clusters: clusters.map(c => ({
      id: c.cluster.id,
      activityCount: c.activityCount,
      activityIds: c.activityIds,
    })),
    unclusteredActivities: unclustered.map(a => ({
      id: a.id,
      source: a.source,
      title: a.title,
      refs: a.crossToolRefs,
    })),
    expected: getExpectedClusters(),
  }, 'Full pipeline executed');
});
