/**
 * ClusterHydrator - Enriches clusters with full activity data
 *
 * Takes a Cluster (which only has activity IDs) and returns a HydratedCluster
 * with full activity objects sorted by timestamp.
 *
 * This is a simple data transformation, not a full PipelineProcessor.
 */

import { ok, err } from 'neverthrow';
import {
  Cluster,
  HydratedCluster,
  HydratedActivity,
  ToolType,
  ProcessorWarning,
  WarningCodes,
  HydrationResult,
  HydrationError,
} from './types';

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
   * Returns Result type for explicit error handling.
   */
  safeHydrate(
    cluster: Cluster,
    activityLookup: Map<string, ActivityWithRefs>
  ): HydrationResult {
    try {
      const result = this.hydrate(cluster, activityLookup);

      // If ALL activities are missing, return an error
      if (result.cluster.activities.length === 0 && cluster.activityIds.length > 0) {
        return err({
          code: 'NO_ACTIVITIES_FOUND',
          message: `No activities found for cluster ${cluster.id}`,
          missingActivityIds: cluster.activityIds,
        });
      }

      return ok(result);
    } catch (error) {
      return err({
        code: 'ACTIVITY_LOOKUP_FAILED',
        message: error instanceof Error ? error.message : 'Unknown hydration error',
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Hydrate a cluster with full activity data.
   *
   * @param cluster - Cluster with activity IDs
   * @param activityLookup - Map of activity ID to full activity data
   * @returns Object with HydratedCluster and any warnings
   * @deprecated Use safeHydrate() for Result-based error handling
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
