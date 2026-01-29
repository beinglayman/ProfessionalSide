/**
 * ClusterExtractor Tests
 *
 * Tests for the activity clustering pipeline processor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterExtractor } from './cluster-extractor';
import { ClusterableActivity } from './types';

describe('ClusterExtractor', () => {
  let extractor: ClusterExtractor;

  beforeEach(() => {
    extractor = new ClusterExtractor();
  });

  describe('validation', () => {
    it('validates successfully', () => {
      expect(() => extractor.validate()).not.toThrow();
    });
  });

  describe('basic clustering', () => {
    it('clusters activities with shared ref', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['AUTH-123'] },
        { id: 'a2', refs: ['AUTH-123'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toContain('a1');
      expect(result.data.clusters[0].activityIds).toContain('a2');
      expect(result.data.clusters[0].sharedRefs).toContain('AUTH-123');
    });

    it('returns unclustered activities without shared refs', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['AUTH-123'] },
        { id: 'a2', refs: ['CORE-456'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(0);
      expect(result.data.unclustered).toContain('a1');
      expect(result.data.unclustered).toContain('a2');
    });

    it('handles transitive clustering (A→B, B→C means A,B,C cluster)', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF-A'] },
        { id: 'a2', refs: ['REF-A', 'REF-B'] }, // Bridge
        { id: 'a3', refs: ['REF-B'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toHaveLength(3);
      expect(result.data.clusters[0].activityIds).toContain('a1');
      expect(result.data.clusters[0].activityIds).toContain('a2');
      expect(result.data.clusters[0].activityIds).toContain('a3');
    });

    it('creates separate clusters for unrelated activities', () => {
      const activities: ClusterableActivity[] = [
        { id: 'auth1', refs: ['AUTH-123'] },
        { id: 'auth2', refs: ['AUTH-123'] },
        { id: 'perf1', refs: ['PERF-456'] },
        { id: 'perf2', refs: ['PERF-456'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(2);

      const authCluster = result.data.clusters.find((c) =>
        c.activityIds.includes('auth1')
      );
      const perfCluster = result.data.clusters.find((c) =>
        c.activityIds.includes('perf1')
      );

      expect(authCluster?.activityIds).toContain('auth1');
      expect(authCluster?.activityIds).toContain('auth2');
      expect(authCluster?.activityIds).not.toContain('perf1');

      expect(perfCluster?.activityIds).toContain('perf1');
      expect(perfCluster?.activityIds).toContain('perf2');
      expect(perfCluster?.activityIds).not.toContain('auth1');
    });
  });

  describe('cluster metrics', () => {
    it('calculates activity count', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF'] },
        { id: 'a2', refs: ['REF'] },
        { id: 'a3', refs: ['REF'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters[0].metrics.activityCount).toBe(3);
    });

    it('calculates shared ref count', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF-A', 'REF-B'] },
        { id: 'a2', refs: ['REF-B', 'REF-C'] },
      ];

      const result = extractor.process({ activities });

      // Only REF-B is shared between activities
      expect(result.data.clusters[0].metrics.refCount).toBe(1);
      expect(result.data.clusters[0].sharedRefs).toContain('REF-B');
    });

    it('tracks tool types in cluster', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF'], source: 'jira' },
        { id: 'a2', refs: ['REF'], source: 'github' },
        { id: 'a3', refs: ['REF'], source: 'confluence' },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters[0].metrics.toolTypes).toContain('jira');
      expect(result.data.clusters[0].metrics.toolTypes).toContain('github');
      expect(result.data.clusters[0].metrics.toolTypes).toContain('confluence');
    });

    it('calculates date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF'], timestamp: lastWeek },
        { id: 'a2', refs: ['REF'], timestamp: yesterday },
        { id: 'a3', refs: ['REF'], timestamp: now },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters[0].metrics.dateRange?.earliest).toEqual(lastWeek);
      expect(result.data.clusters[0].metrics.dateRange?.latest).toEqual(now);
    });
  });

  describe('options', () => {
    it('respects minClusterSize option', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF-A'] },
        { id: 'a2', refs: ['REF-A'] }, // 2 activities share REF-A
        { id: 'a3', refs: ['REF-B'] },
        { id: 'a4', refs: ['REF-B'] },
        { id: 'a5', refs: ['REF-B'] }, // 3 activities share REF-B
      ];

      const result = extractor.process({ activities }, { minClusterSize: 3 });

      // Only REF-B cluster should pass (3 activities)
      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toContain('a3');
      expect(result.data.clusters[0].activityIds).toContain('a4');
      expect(result.data.clusters[0].activityIds).toContain('a5');

      // a1 and a2 should be unclustered (cluster too small)
      expect(result.data.unclustered).toContain('a1');
      expect(result.data.unclustered).toContain('a2');
    });

    it('filters by date range', () => {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const activities: ClusterableActivity[] = [
        { id: 'recent1', refs: ['REF'], timestamp: now },
        { id: 'recent2', refs: ['REF'], timestamp: lastMonth },
        { id: 'old1', refs: ['REF'], timestamp: lastYear },
      ];

      const result = extractor.process(
        { activities },
        {
          dateRange: {
            start: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
            end: now,
          },
        }
      );

      // Only recent activities should cluster
      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toContain('recent1');
      expect(result.data.clusters[0].activityIds).toContain('recent2');
      expect(result.data.clusters[0].activityIds).not.toContain('old1');

      // Should have warning about filtered activities
      expect(result.warnings.some((w) => w.code === 'DATE_FILTERED')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = extractor.process({ activities: [] });

      expect(result.data.clusters).toHaveLength(0);
      expect(result.data.unclustered).toHaveLength(0);
    });

    it('handles activities with empty refs', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: [] },
        { id: 'a2', refs: ['REF'] },
        { id: 'a3', refs: ['REF'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toHaveLength(2);
      expect(result.data.unclustered).toContain('a1');

      // Should have warning about no-ref activities
      expect(result.warnings.some((w) => w.code === 'ACTIVITIES_WITHOUT_REFS')).toBe(true);
    });

    it('handles activities with null/undefined refs', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: null as any },
        { id: 'a2', refs: undefined as any },
        { id: 'a3', refs: ['REF'] },
        { id: 'a4', refs: ['REF'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.unclustered).toContain('a1');
      expect(result.data.unclustered).toContain('a2');
    });

    it('handles single activity (no clustering possible)', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(0);
      expect(result.data.unclustered).toContain('a1');
    });

    it('handles large number of activities efficiently', () => {
      const activities: ClusterableActivity[] = [];

      // 100 activities across 10 clusters
      for (let cluster = 0; cluster < 10; cluster++) {
        for (let i = 0; i < 10; i++) {
          activities.push({
            id: `cluster${cluster}-activity${i}`,
            refs: [`CLUSTER${cluster}-REF`],
          });
        }
      }

      const start = performance.now();
      const result = extractor.process({ activities });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.data.clusters).toHaveLength(10);
    });
  });

  describe('diagnostics', () => {
    it('provides processing metrics', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF'] },
        { id: 'a2', refs: ['REF'] },
      ];

      const result = extractor.process({ activities });

      expect(result.diagnostics.processor).toBe('ClusterExtractor');
      expect(result.diagnostics.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics.inputMetrics.totalActivities).toBe(2);
      expect(result.diagnostics.outputMetrics.clusterCount).toBe(1);
    });
  });

  describe('regression tests', () => {
    // Regression: Activities with many shared refs should cluster correctly
    it('clusters activities with multiple overlapping refs', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF-A', 'REF-B', 'REF-C'] },
        { id: 'a2', refs: ['REF-B', 'REF-C', 'REF-D'] },
        { id: 'a3', refs: ['REF-C', 'REF-D', 'REF-E'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toHaveLength(3);
    });

    // Regression: Two activities with same single ref should cluster
    it('clusters two activities sharing exactly one ref', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['SHARED', 'UNIQUE-1'] },
        { id: 'a2', refs: ['SHARED', 'UNIQUE-2'] },
      ];

      const result = extractor.process({ activities });

      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].sharedRefs).toContain('SHARED');
    });

    // Regression: Activity with refs matching different clusters stays in one
    it('merges clusters when activity bridges them', () => {
      const activities: ClusterableActivity[] = [
        { id: 'cluster1-a', refs: ['REF-1'] },
        { id: 'cluster1-b', refs: ['REF-1'] },
        { id: 'cluster2-a', refs: ['REF-2'] },
        { id: 'cluster2-b', refs: ['REF-2'] },
        { id: 'bridge', refs: ['REF-1', 'REF-2'] }, // Bridges both clusters
      ];

      const result = extractor.process({ activities });

      // Should be one cluster because bridge connects them
      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].activityIds).toHaveLength(5);
    });
  });

  describe('boundary conditions', () => {
    it('respects exact minClusterSize boundary', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['REF'] },
        { id: 'a2', refs: ['REF'] },
      ];

      // minClusterSize = 2 should include this cluster
      const result2 = extractor.process({ activities }, { minClusterSize: 2 });
      expect(result2.data.clusters).toHaveLength(1);

      // minClusterSize = 3 should exclude this cluster
      const result3 = extractor.process({ activities }, { minClusterSize: 3 });
      expect(result3.data.clusters).toHaveLength(0);
    });

    it('handles activities with exactly one ref', () => {
      const activities: ClusterableActivity[] = [
        { id: 'a1', refs: ['SINGLE'] },
        { id: 'a2', refs: ['SINGLE'] },
      ];

      const result = extractor.process({ activities });
      expect(result.data.clusters).toHaveLength(1);
      expect(result.data.clusters[0].sharedRefs).toEqual(['SINGLE']);
    });

    it('handles date range boundary (inclusive)', () => {
      const jan1 = new Date('2026-01-01T00:00:00Z');
      const jan31 = new Date('2026-01-31T23:59:59Z');

      const activities: ClusterableActivity[] = [
        { id: 'start', refs: ['REF'], timestamp: jan1 },
        { id: 'end', refs: ['REF'], timestamp: jan31 },
      ];

      const result = extractor.process(
        { activities },
        { dateRange: { start: jan1, end: jan31 } }
      );

      expect(result.data.clusters[0].activityIds).toContain('start');
      expect(result.data.clusters[0].activityIds).toContain('end');
    });
  });
});
