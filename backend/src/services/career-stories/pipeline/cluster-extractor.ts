/**
 * ClusterExtractor - Pipeline Processor
 *
 * Groups activities into clusters based on shared cross-tool references.
 * Uses graphlib for connected components algorithm.
 *
 * Lifecycle:
 * 1. validate() - Ensure configuration is valid
 * 2. process(input, options) - Cluster activities with diagnostics
 *
 * Algorithm:
 * 1. Build ref → activityIds index
 * 2. Build undirected graph (activities sharing refs are connected)
 * 3. Find connected components using graphlib
 * 4. Filter by minimum cluster size
 */

import { Graph, alg } from 'graphlib';
import { ok, err } from 'neverthrow';
import {
  PipelineProcessor,
  ProcessorResult,
  ProcessorDiagnostics,
  ProcessorWarning,
  ProcessorError,
  ClusterExtractionInput,
  ClusterExtractionOutput,
  ClusterExtractionOptions,
  ClusterExtractionResult,
  ClusterExtractionError,
  ClusterableActivity,
  Cluster,
  WarningCodes,
} from './types';

export class ClusterExtractor
  implements
    PipelineProcessor<
      ClusterExtractionInput,
      ClusterExtractionOutput,
      ClusterExtractionOptions
    >
{
  readonly name = 'ClusterExtractor';
  readonly version = '3.0.0'; // v3: graphlib integration

  /**
   * Validate processor configuration
   */
  validate(): void {
    // ClusterExtractor has no external dependencies to validate
    // Configuration is validated at process time via options
  }

  /**
   * Process activities and produce clusters with diagnostics.
   * Returns Result type for explicit error handling.
   */
  safeProcess(
    input: ClusterExtractionInput,
    options: ClusterExtractionOptions = {}
  ): ClusterExtractionResult {
    try {
      const result = this.process(input, options);
      return ok(result);
    } catch (error) {
      return err({
        code: 'CLUSTERING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown clustering error',
        cause: error instanceof Error ? error : undefined,
        context: { activityCount: input.activities.length, options },
      });
    }
  }

  /**
   * Process activities and produce clusters with diagnostics.
   * @deprecated Use safeProcess() for Result-based error handling
   */
  process(
    input: ClusterExtractionInput,
    options: ClusterExtractionOptions = {}
  ): ProcessorResult<ClusterExtractionOutput> {
    const startTime = performance.now();
    const warnings: ProcessorWarning[] = [];
    const errors: ProcessorError[] = [];

    const minClusterSize = options.minClusterSize ?? 2;

    // Filter activities by date range if specified
    let activities = input.activities;
    if (options.dateRange) {
      activities = activities.filter((a) => {
        if (!a.timestamp) return true; // Include activities without timestamp
        return (
          a.timestamp >= options.dateRange!.start &&
          a.timestamp <= options.dateRange!.end
        );
      });

      if (activities.length < input.activities.length) {
        warnings.push({
          code: WarningCodes.DATE_FILTERED,
          message: `Filtered ${input.activities.length - activities.length} activities outside date range`,
          context: {
            original: input.activities.length,
            filtered: activities.length,
          },
        });
      }
    }

    if (activities.length === 0) {
      return this.emptyResult(startTime, input.activities.length, options);
    }

    // Handle null/undefined refs gracefully
    const sanitizedActivities = activities.map((a) => ({
      ...a,
      refs: a.refs || [],
    }));

    // Check for activities with no refs
    const noRefActivities = sanitizedActivities.filter(
      (a) => a.refs.length === 0
    );
    if (noRefActivities.length > 0) {
      warnings.push({
        code: WarningCodes.ACTIVITIES_WITHOUT_REFS,
        message: `${noRefActivities.length} activities have no refs and cannot cluster`,
        context: { activityIds: noRefActivities.slice(0, 5).map((a) => a.id) },
      });
    }

    // Build graph and find connected components using graphlib
    const { graph, refToActivityIds } = this.buildGraph(sanitizedActivities);
    const components = alg.components(graph);

    // Build clusters from components that meet minimum size
    const clusters: Cluster[] = [];
    const clusteredIds = new Set<string>();
    let clusterIndex = 0;

    for (const component of components) {
      if (component.length >= minClusterSize) {
        const cluster = this.buildCluster(
          component,
          sanitizedActivities,
          refToActivityIds,
          clusterIndex,
          options.idGenerator
        );
        clusters.push(cluster);
        component.forEach((id) => clusteredIds.add(id));
        clusterIndex++;
      }
    }

    // Find unclustered activities
    const unclustered = sanitizedActivities
      .filter((a) => !clusteredIds.has(a.id))
      .map((a) => a.id);

    const processingTimeMs = performance.now() - startTime;

    // Calculate metrics
    const totalActivities = sanitizedActivities.length;
    const clusteredActivities = clusteredIds.size;

    const diagnostics: ProcessorDiagnostics = {
      processor: this.name,
      processingTimeMs,
      inputMetrics: {
        totalActivities,
        activitiesWithRefs: sanitizedActivities.filter((a) => a.refs.length > 0)
          .length,
        totalRefs: sanitizedActivities.reduce(
          (sum, a) => sum + a.refs.length,
          0
        ),
        uniqueRefs: refToActivityIds.size,
      },
      outputMetrics: {
        clusterCount: clusters.length,
        clusteredActivities,
        unclusteredActivities: unclustered.length,
        avgClusterSize:
          clusters.length > 0 ? clusteredActivities / clusters.length : 0,
        largestCluster: Math.max(...clusters.map((c) => c.activityIds.length), 0),
      },
    };

    if (options.debug) {
      diagnostics.debug = {
        components: components.map((c) => ({
          size: c.length,
          meetsMinSize: c.length >= minClusterSize,
        })),
        refDistribution: this.getRefDistribution(refToActivityIds),
      };
    }

    return {
      data: {
        clusters,
        unclustered,
        metrics: {
          totalActivities,
          clusteredActivities,
          unclusteredActivities: unclustered.length,
          clusterCount: clusters.length,
          avgClusterSize:
            clusters.length > 0 ? clusteredActivities / clusters.length : 0,
        },
      },
      diagnostics,
      warnings,
      errors,
    };
  }

  // ===========================================================================
  // BACKWARD-COMPATIBLE API
  // ===========================================================================

  /**
   * Simple clustering - returns just activity ID groups
   */
  clusterByRefs(
    activities: ClusterableActivity[],
    minClusterSize = 2
  ): string[][] {
    const result = this.process({ activities }, { minClusterSize });
    return result.data.clusters.map((c) => c.activityIds);
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Build an undirected graph where activities are nodes and
   * shared refs create edges between activities.
   */
  private buildGraph(activities: ClusterableActivity[]): {
    graph: Graph;
    refToActivityIds: Map<string, Set<string>>;
  } {
    // Create undirected graph
    const graph = new Graph({ directed: false });

    // Add all activities as nodes
    for (const activity of activities) {
      graph.setNode(activity.id);
    }

    // Build ref → activityIds index
    const refToActivityIds = new Map<string, Set<string>>();
    for (const activity of activities) {
      for (const ref of activity.refs) {
        if (!refToActivityIds.has(ref)) {
          refToActivityIds.set(ref, new Set());
        }
        refToActivityIds.get(ref)!.add(activity.id);
      }
    }

    // Create edges between activities that share refs
    for (const [ref, activityIds] of refToActivityIds) {
      const ids = Array.from(activityIds);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          // setEdge is idempotent - won't create duplicates
          graph.setEdge(ids[i], ids[j], { ref });
        }
      }
    }

    return { graph, refToActivityIds };
  }

  private buildCluster(
    activityIds: string[],
    activities: ClusterableActivity[],
    refToActivityIds: Map<string, Set<string>>,
    clusterIndex: number,
    idGenerator?: (index: number) => string
  ): Cluster {
    const activitySet = new Set(activityIds);
    const activitiesInCluster = activities.filter((a) =>
      activitySet.has(a.id)
    );

    // Find shared refs (refs that appear in multiple activities in this cluster)
    const refCounts = new Map<string, number>();
    for (const activity of activitiesInCluster) {
      for (const ref of activity.refs) {
        refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
      }
    }
    const sharedRefs = Array.from(refCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([ref]) => ref);

    // Calculate date range
    const timestamps = activitiesInCluster
      .filter((a) => a.timestamp)
      .map((a) => a.timestamp!);

    const dateRange =
      timestamps.length > 0
        ? {
            earliest: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
            latest: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
          }
        : undefined;

    // Get unique tool types
    const toolTypes = [
      ...new Set(activitiesInCluster.map((a) => a.source).filter(Boolean)),
    ] as string[];

    // Use provided ID generator or default to timestamp-based ID
    const clusterId = idGenerator
      ? idGenerator(clusterIndex)
      : `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    return {
      id: clusterId,
      activityIds,
      sharedRefs,
      metrics: {
        activityCount: activityIds.length,
        refCount: sharedRefs.length,
        toolTypes,
        dateRange,
      },
    };
  }

  private getRefDistribution(
    refToActivityIds: Map<string, Set<string>>
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const [, activityIds] of refToActivityIds) {
      const count = activityIds.size;
      const bucket =
        count === 1 ? '1' : count <= 3 ? '2-3' : count <= 5 ? '4-5' : '6+';
      distribution[bucket] = (distribution[bucket] || 0) + 1;
    }

    return distribution;
  }

  private emptyResult(
    startTime: number,
    totalActivities: number,
    options: ClusterExtractionOptions
  ): ProcessorResult<ClusterExtractionOutput> {
    return {
      data: {
        clusters: [],
        unclustered: [],
        metrics: {
          totalActivities,
          clusteredActivities: 0,
          unclusteredActivities: 0,
          clusterCount: 0,
          avgClusterSize: 0,
        },
      },
      diagnostics: {
        processor: this.name,
        processingTimeMs: performance.now() - startTime,
        inputMetrics: { totalActivities: 0 },
        outputMetrics: { clusterCount: 0 },
        ...(options.debug && { debug: { reason: 'no-activities' } }),
      },
      warnings: [],
      errors: [],
    };
  }
}

// Singleton instance
export const clusterExtractor = new ClusterExtractor();
