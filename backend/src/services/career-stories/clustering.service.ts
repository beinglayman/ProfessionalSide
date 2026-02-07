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
        // Note: story relation removed - CareerStory now uses activityIds directly
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

  /**
   * Cluster activities in memory (no database persistence).
   * Useful for demo/sandbox mode where we don't want to touch real tables.
   *
   * Uses multi-signal adjacency:
   * 1. Explicit ref edges (existing — shared crossToolRefs)
   * 2. Container edges (same feature branch / thread ID / epic)
   * 3. Collaborator edges (>=2 shared people within 30-day window)
   * 4. Temporal split post-process (>14d gap breaks components)
   *
   * @param activities - Activities to cluster (with optional signal fields)
   * @param options - Clustering options
   * @returns Array of cluster results with activity IDs and suggested names
   */
  clusterActivitiesInMemory(
    activities: Array<{
      id: string;
      source: string;
      sourceId: string;
      title: string;
      description: string | null;
      timestamp: Date;
      crossToolRefs: string[];
      collaborators?: string[];
      container?: string | null;
    }>,
    options?: { minClusterSize?: number }
  ): Array<{ activityIds: string[]; name: string | null }> {
    const minSize = options?.minClusterSize ?? 2;

    if (activities.length === 0) {
      return [];
    }

    const activityMap = new Map(activities.map(a => [a.id, a]));

    // Build multi-signal adjacency list
    const adjacency = this.buildMultiSignalAdjacency(activities);

    // Find connected components
    const visited = new Set<string>();
    const rawComponents: string[][] = [];

    activities.forEach((activity) => {
      if (!visited.has(activity.id)) {
        const component: string[] = [];
        this.dfs(activity.id, adjacency, visited, component);
        if (component.length > 0) {
          rawComponents.push(component);
        }
      }
    });

    // Temporal split: break components with >14d gaps
    const splitComponents = this.splitByTemporalGap(rawComponents, activityMap, 14);

    // Filter by min size and generate names
    return splitComponents
      .filter((c) => c.length >= minSize)
      .map((activityIds) => {
        // Generate a name based on common refs
        const commonRefs = this.findCommonRefs(activityIds, activities);
        return {
          activityIds,
          name: commonRefs.length > 0 ? commonRefs[0] : null,
        };
      });
  }

  /**
   * Build multi-signal adjacency list: ref edges + container edges + collaborator edges.
   */
  private buildMultiSignalAdjacency(
    activities: Array<{
      id: string;
      crossToolRefs: string[];
      timestamp: Date;
      collaborators?: string[];
      container?: string | null;
    }>
  ): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();
    activities.forEach((a) => adjacency.set(a.id, new Set()));

    // --- 1. Explicit ref edges (existing logic) ---
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

    refToActivities.forEach((activityIds) => {
      const ids = Array.from(activityIds);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          adjacency.get(ids[i])!.add(ids[j]);
          adjacency.get(ids[j])!.add(ids[i]);
        }
      }
    });

    // --- 2. Container edges (same non-null container) ---
    const containerToActivities = new Map<string, string[]>();
    activities.forEach((a) => {
      if (a.container) {
        const group = containerToActivities.get(a.container) || [];
        group.push(a.id);
        containerToActivities.set(a.container, group);
      }
    });

    containerToActivities.forEach((ids) => {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          adjacency.get(ids[i])!.add(ids[j]);
          adjacency.get(ids[j])!.add(ids[i]);
        }
      }
    });

    // --- 3. Collaborator edges (>=2 shared people + <30d window) ---
    const COLLAB_THRESHOLD = 2;
    const COLLAB_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];
      if (!a.collaborators || a.collaborators.length === 0) continue;

      const aCollabs = new Set(a.collaborators);

      for (let j = i + 1; j < activities.length; j++) {
        const b = activities[j];
        if (!b.collaborators || b.collaborators.length === 0) continue;

        // Time gate: within 30-day window
        const timeDiff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
        if (timeDiff > COLLAB_WINDOW_MS) continue;

        // Count shared collaborators
        let shared = 0;
        for (const collab of b.collaborators) {
          if (aCollabs.has(collab)) {
            shared++;
            if (shared >= COLLAB_THRESHOLD) break;
          }
        }

        if (shared >= COLLAB_THRESHOLD) {
          adjacency.get(a.id)!.add(b.id);
          adjacency.get(b.id)!.add(a.id);
        }
      }
    }

    return adjacency;
  }

  /**
   * Split connected components by temporal gaps >maxGapDays.
   * For each component, sort by timestamp, walk sequentially,
   * and split where the gap exceeds the threshold.
   */
  private splitByTemporalGap(
    components: string[][],
    activityMap: Map<string, { timestamp: Date }>,
    maxGapDays: number,
  ): string[][] {
    const maxGapMs = maxGapDays * 24 * 60 * 60 * 1000;
    const result: string[][] = [];

    for (const component of components) {
      // Sort by timestamp
      const sorted = [...component].sort((a, b) => {
        const aTime = activityMap.get(a)?.timestamp.getTime() ?? 0;
        const bTime = activityMap.get(b)?.timestamp.getTime() ?? 0;
        return aTime - bTime;
      });

      let currentGroup: string[] = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const prevTime = activityMap.get(sorted[i - 1])?.timestamp.getTime() ?? 0;
        const currTime = activityMap.get(sorted[i])?.timestamp.getTime() ?? 0;

        if (currTime - prevTime > maxGapMs) {
          result.push(currentGroup);
          currentGroup = [sorted[i]];
        } else {
          currentGroup.push(sorted[i]);
        }
      }

      result.push(currentGroup);
    }

    return result;
  }

  /**
   * Find common references for a set of activities
   */
  private findCommonRefs(
    activityIds: string[],
    activities: Array<{ id: string; crossToolRefs: string[] }>
  ): string[] {
    const activityMap = new Map(activities.map((a) => [a.id, a]));
    const refCounts = new Map<string, number>();

    activityIds.forEach((id) => {
      const activity = activityMap.get(id);
      if (activity) {
        activity.crossToolRefs.forEach((ref) => {
          refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
        });
      }
    });

    // Return refs that appear in at least 2 activities, sorted by count
    return Array.from(refCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([ref]) => ref);
  }
}
