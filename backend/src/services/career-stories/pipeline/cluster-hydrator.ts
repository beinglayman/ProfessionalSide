/**
 * ClusterHydrator - Enriches clusters with full activity data
 *
 * Takes a Cluster (which only has activity IDs) and returns a HydratedCluster
 * with full activity objects sorted by timestamp.
 *
 * This is a simple data transformation, not a full PipelineProcessor.
 */

import { Cluster, HydratedCluster, HydratedActivity, ToolType, ProcessorWarning, WarningCodes } from './types';

/**
 * Raw activity from data source (before ref extraction).
 */
export interface RawActivity {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl?: string | null;
  title: string;
  description?: string | null;
  timestamp: Date;
  rawData?: Record<string, unknown> | null;
}

/**
 * Activity with extracted refs (from RefExtractor).
 */
export interface ActivityWithRefs extends RawActivity {
  refs: string[];
}

export class ClusterHydrator {
  /**
   * Hydrate a cluster with full activity data.
   *
   * @param cluster - Cluster with activity IDs
   * @param activityLookup - Map of activity ID to full activity data
   * @returns Object with HydratedCluster and any warnings
   */
  hydrate(
    cluster: Cluster,
    activityLookup: Map<string, ActivityWithRefs>
  ): { cluster: HydratedCluster; warnings: ProcessorWarning[] } {
    const activities: HydratedActivity[] = [];
    const missingIds: string[] = [];
    const warnings: ProcessorWarning[] = [];

    for (const id of cluster.activityIds) {
      const activity = activityLookup.get(id);
      if (activity) {
        activities.push({
          id: activity.id,
          source: activity.source as ToolType,
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp,
          sourceUrl: activity.sourceUrl,
          rawData: activity.rawData,
          refs: activity.refs,
        });
      } else {
        missingIds.push(id);
      }
    }

    // Sort by timestamp (earliest first)
    activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Add warning if activities are missing (but don't fail)
    if (missingIds.length > 0) {
      warnings.push({
        code: WarningCodes.ACTIVITIES_NOT_FOUND,
        message: `${missingIds.length} activities not found for cluster ${cluster.id}`,
        context: { missingIds: missingIds.slice(0, 10) },
      });
    }

    return {
      cluster: {
        ...cluster,
        activities,
        // Update metrics to reflect actual hydrated count
        metrics: {
          ...cluster.metrics,
          activityCount: activities.length,
        },
      },
      warnings,
    };
  }

  /**
   * Build activity lookup map from array.
   */
  static buildLookup(activities: ActivityWithRefs[]): Map<string, ActivityWithRefs> {
    return new Map(activities.map((a) => [a.id, a]));
  }
}

// Singleton instance
export const clusterHydrator = new ClusterHydrator();
