/**
 * ClusteringService
 *
 * Groups tool activities into story clusters using connected components.
 * Activities sharing cross-tool references (Jira tickets, PRs, etc.) are
 * connected in a graph, then clustered using DFS.
 *
 * Algorithm:
 * 1. Build adjacency list: activities sharing refs are connected
 * 2. Run DFS to find connected components
 * 3. Each component becomes a StoryCluster
 */

import { PrismaClient, ToolActivity, StoryCluster } from '@prisma/client';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ClusterResult {
  cluster: StoryCluster;
  activityIds: string[];
  activityCount: number;
}

export class ClusteringService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Cluster activities for a user based on shared cross-tool references
   *
   * @param userId - User ID
   * @param options - Clustering options
   * @returns Array of cluster results
   */
  async clusterActivities(
    userId: string,
    options?: {
      dateRange?: DateRange;
      minClusterSize?: number;
    }
  ): Promise<ClusterResult[]> {
    const minSize = options?.minClusterSize ?? 2;

    // 1. Get all activities (optionally filtered by date)
    const activities = await this.prisma.toolActivity.findMany({
      where: {
        userId,
        clusterId: null, // Only unclustered activities
        ...(options?.dateRange && {
          timestamp: {
            gte: options.dateRange.start,
            lte: options.dateRange.end,
          },
        }),
      },
    });

    if (activities.length === 0) {
      return [];
    }

    // 2. Build adjacency list: activity -> activities sharing refs
    const adjacency = this.buildAdjacencyList(activities);

    // 3. Find connected components
    const components = this.findConnectedComponents(activities, adjacency);

    // 4. Filter by minimum size
    const validComponents = components.filter((c) => c.length >= minSize);

    // 5. Create/update cluster records
    return this.persistClusters(userId, validComponents);
  }

  /**
   * Build adjacency list connecting activities that share references
   */
  private buildAdjacencyList(
    activities: ToolActivity[]
  ): Map<string, Set<string>> {
    // Map: ref -> set of activity IDs that have this ref
    const refToActivities = new Map<string, Set<string>>();

    activities.forEach((activity) => {
      const refs = activity.crossToolRefs || [];
      refs.forEach((ref) => {
        if (!refToActivities.has(ref)) {
          refToActivities.set(ref, new Set());
        }
        refToActivities.get(ref)!.add(activity.id);
      });
    });

    // Map: activityId -> set of connected activity IDs
    const adjacency = new Map<string, Set<string>>();

    activities.forEach((activity) => {
      adjacency.set(activity.id, new Set());
    });

    // Activities sharing a ref are connected
    refToActivities.forEach((activityIds) => {
      const ids = Array.from(activityIds);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          adjacency.get(ids[i])!.add(ids[j]);
          adjacency.get(ids[j])!.add(ids[i]);
        }
      }
    });

    return adjacency;
  }

  /**
   * Find connected components using DFS
   */
  private findConnectedComponents(
    activities: ToolActivity[],
    adjacency: Map<string, Set<string>>
  ): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    activities.forEach((activity) => {
      if (!visited.has(activity.id)) {
        const component: string[] = [];
        this.dfs(activity.id, adjacency, visited, component);
        if (component.length > 0) {
          components.push(component);
        }
      }
    });

    return components;
  }

  /**
   * Depth-first search to find all connected activities
   */
  private dfs(
    activityId: string,
    adjacency: Map<string, Set<string>>,
    visited: Set<string>,
    component: string[]
  ): void {
    visited.add(activityId);
    component.push(activityId);

    adjacency.get(activityId)?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, adjacency, visited, component);
      }
    });
  }

  /**
   * Persist clusters to database and update activity references
   */
  private async persistClusters(
    userId: string,
    components: string[][]
  ): Promise<ClusterResult[]> {
    const results: ClusterResult[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const activityIds of components) {
        // Create cluster
        const cluster = await tx.storyCluster.create({
          data: {
            userId,
            name: null, // User can rename later
          },
        });

        // Update activities to point to cluster
        await tx.toolActivity.updateMany({
          where: {
            id: { in: activityIds },
          },
          data: {
            clusterId: cluster.id,
          },
        });

        results.push({
          cluster,
          activityIds,
          activityCount: activityIds.length,
        });
      }
    });

    return results;
  }

  /**
   * Get clusters for a user
   *
   * @param userId - User ID
   * @returns Array of clusters with activity counts
   */
  async getClusters(userId: string): Promise<
    (StoryCluster & {
      _count: { activities: number };
    })[]
  > {
    return this.prisma.storyCluster.findMany({
      where: { userId },
      include: {
        _count: {
          select: { activities: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single cluster with its activities
   *
   * @param clusterId - Cluster ID
   * @returns Cluster with activities
   */
  async getClusterWithActivities(clusterId: string) {
    return this.prisma.storyCluster.findUnique({
      where: { id: clusterId },
      include: {
        activities: {
          orderBy: { timestamp: 'desc' },
        },
        story: true,
      },
    });
  }

  /**
   * Rename a cluster
   *
   * @param clusterId - Cluster ID
   * @param name - New name
   * @returns Updated cluster
   */
  async renameCluster(clusterId: string, name: string): Promise<StoryCluster> {
    return this.prisma.storyCluster.update({
      where: { id: clusterId },
      data: { name },
    });
  }

  /**
   * Add an activity to a cluster
   *
   * @param clusterId - Cluster ID
   * @param activityId - Activity ID
   * @returns Updated activity
   */
  async addActivityToCluster(
    clusterId: string,
    activityId: string
  ): Promise<ToolActivity> {
    return this.prisma.toolActivity.update({
      where: { id: activityId },
      data: { clusterId },
    });
  }

  /**
   * Remove an activity from a cluster
   *
   * @param activityId - Activity ID
   * @returns Updated activity
   */
  async removeActivityFromCluster(activityId: string): Promise<ToolActivity> {
    return this.prisma.toolActivity.update({
      where: { id: activityId },
      data: { clusterId: null },
    });
  }

  /**
   * Delete a cluster (activities become unclustered)
   *
   * @param clusterId - Cluster ID
   */
  async deleteCluster(clusterId: string): Promise<void> {
    await this.prisma.$transaction([
      // Unlink activities first
      this.prisma.toolActivity.updateMany({
        where: { clusterId },
        data: { clusterId: null },
      }),
      // Delete cluster
      this.prisma.storyCluster.delete({
        where: { id: clusterId },
      }),
    ]);
  }

  /**
   * Merge multiple clusters into one
   *
   * @param targetClusterId - Cluster to merge into
   * @param sourceClusterIds - Clusters to merge from
   * @returns Updated target cluster
   */
  async mergeClusters(
    targetClusterId: string,
    sourceClusterIds: string[]
  ): Promise<StoryCluster> {
    await this.prisma.$transaction([
      // Move activities from source clusters to target
      this.prisma.toolActivity.updateMany({
        where: {
          clusterId: { in: sourceClusterIds },
        },
        data: { clusterId: targetClusterId },
      }),
      // Delete source clusters
      this.prisma.storyCluster.deleteMany({
        where: {
          id: { in: sourceClusterIds },
        },
      }),
    ]);

    return this.prisma.storyCluster.findUniqueOrThrow({
      where: { id: targetClusterId },
    });
  }
}
