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

// Default instances - can be overridden via DI for testing
let prisma = new PrismaClient();
let clusteringService = new ClusteringService(prisma);
let refExtractor = new RefExtractorService();

/**
 * Configure service dependencies (primarily for testing)
 */
export function configureDemoService(deps: {
  prisma?: PrismaClient;
  clusteringService?: ClusteringService;
  refExtractor?: RefExtractorService;
}): void {
  if (deps.prisma) {
    prisma = deps.prisma;
    // Re-create clustering service with new prisma instance
    clusteringService = deps.clusteringService || new ClusteringService(deps.prisma);
  }
  if (deps.clusteringService) clusteringService = deps.clusteringService;
  if (deps.refExtractor) refExtractor = deps.refExtractor;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compute date range from timestamps.
 * Returns undefined if timestamps array is empty.
 */
function computeDateRange(timestamps: Date[]): { start: string; end: string } | undefined {
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
function extractToolTypes(activities: Array<{ source: string }>): string[] {
  return [...new Set(activities.map((a) => a.source))];
}

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

/**
 * Seed demo data for a user.
 * Creates mock activities in the demo tables and clusters them.
 */
export async function seedDemoData(userId: string): Promise<{
  activitiesSeeded: number;
  clustersCreated: number;
  clusters: DemoCluster[];
}> {
  // Step 1: Clear existing demo data for this user
  await prisma.demoCareerStory.deleteMany({
    where: { cluster: { userId } },
  });
  await prisma.demoStoryCluster.deleteMany({
    where: { userId },
  });
  await prisma.demoToolActivity.deleteMany({
    where: { userId },
  });

  // Step 2: Generate and insert mock activities
  const mockActivities = generateMockActivities();
  const activitiesToCreate = mockActivities.map((activity) => {
    // Extract cross-tool refs using the ref extractor
    // Combine all text fields for ref extraction
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

  await prisma.demoToolActivity.createMany({
    data: activitiesToCreate,
    skipDuplicates: true,
  });

  // Step 3: Fetch all demo activities for clustering
  const activities = await prisma.demoToolActivity.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  });

  // Step 4: Run clustering algorithm (reuse from ClusteringService logic)
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
    { minClusterSize: 2 }
  );

  // Step 5: Create demo clusters and assign activities
  const clusters: DemoCluster[] = [];

  for (const result of clusterResults) {
    const cluster = await prisma.demoStoryCluster.create({
      data: {
        userId,
        name: result.name,
      },
    });

    // Assign activities to cluster
    await prisma.demoToolActivity.updateMany({
      where: {
        id: { in: result.activityIds },
      },
      data: {
        clusterId: cluster.id,
      },
    });

    // Compute metrics
    const clusterActivities = activities.filter((a) =>
      result.activityIds.includes(a.id)
    );

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

  return {
    activitiesSeeded: activities.length,
    clustersCreated: clusters.length,
    clusters,
  };
}

/**
 * Get all demo clusters for a user.
 */
export async function getDemoClusters(userId: string): Promise<DemoCluster[]> {
  const clusters = await prisma.demoStoryCluster.findMany({
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
  const cluster = await prisma.demoStoryCluster.findFirst({
    where: { id: clusterId, userId },
    include: {
      activities: {
        orderBy: { timestamp: 'desc' },
      },
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
  const activities = await prisma.demoToolActivity.findMany({
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
  const count = await prisma.demoStoryCluster.count({
    where: { id: clusterId },
  });
  return count > 0;
}

/**
 * Clear all demo data for a user.
 */
export async function clearDemoData(userId: string): Promise<void> {
  await prisma.demoCareerStory.deleteMany({
    where: { cluster: { userId } },
  });
  await prisma.demoStoryCluster.deleteMany({
    where: { userId },
  });
  await prisma.demoToolActivity.deleteMany({
    where: { userId },
  });
}
