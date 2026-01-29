/**
 * Pipeline Integration Tests
 *
 * End-to-end tests using realistic mock data.
 * Validates the full flow: Activities → RefExtraction → Clustering
 */

import { describe, it, expect } from 'vitest';
import { RefExtractor } from './ref-extractor';
import { ClusterExtractor } from './cluster-extractor';
import {
  generateMockActivities,
  getExpectedClusters,
  getExpectedUnclustered,
} from '../mock-data.service';
import { ClusterableActivity } from './types';

describe('Pipeline Integration', () => {
  const refExtractor = new RefExtractor();
  const clusterExtractor = new ClusterExtractor();

  // Convert mock activities to clusterable activities
  function prepareActivities(): ClusterableActivity[] {
    const rawActivities = generateMockActivities();
    return rawActivities.map((a) => {
      const result = refExtractor.extractFromActivity(a);
      return {
        id: a.sourceId,
        refs: result.data.refs,
        timestamp: a.timestamp,
        source: a.source,
      };
    });
  }

  describe('ref extraction coverage', () => {
    it('extracts refs from all activity sources', () => {
      const rawActivities = generateMockActivities();
      const sourcesWithRefs = new Map<string, number>();

      for (const activity of rawActivities) {
        const result = refExtractor.extractFromActivity(activity);
        const source = activity.source;
        sourcesWithRefs.set(
          source,
          (sourcesWithRefs.get(source) || 0) + (result.data.refs.length > 0 ? 1 : 0)
        );
      }

      // All sources should have activities with refs
      expect(sourcesWithRefs.get('jira')).toBeGreaterThan(0);
      expect(sourcesWithRefs.get('github')).toBeGreaterThan(0);
      expect(sourcesWithRefs.get('confluence')).toBeGreaterThan(0);
      expect(sourcesWithRefs.get('slack')).toBeGreaterThan(0);
      expect(sourcesWithRefs.get('outlook')).toBeGreaterThan(0);
      expect(sourcesWithRefs.get('google')).toBeGreaterThan(0);
      expect(sourcesWithRefs.get('figma')).toBeGreaterThan(0);
    });

    it('achieves high ref extraction coverage (>85%)', () => {
      const rawActivities = generateMockActivities();
      let activitiesWithRefs = 0;

      for (const activity of rawActivities) {
        const result = refExtractor.extractFromActivity(activity);
        if (result.data.refs.length > 0) {
          activitiesWithRefs++;
        }
      }

      const coverage = (activitiesWithRefs / rawActivities.length) * 100;
      expect(coverage).toBeGreaterThanOrEqual(85);
    });

    it('extracts cross-tool references', () => {
      const rawActivities = generateMockActivities();
      let crossToolRefs = 0;

      for (const activity of rawActivities) {
        const result = refExtractor.extractFromActivity(activity);
        // Check if refs include patterns from other tools
        const hasJiraRef = result.data.refs.some((r) => /^[A-Z]+-\d+$/.test(r));
        const hasGithubRef = result.data.refs.some((r) => r.includes('#'));
        const hasConfluenceRef = result.data.refs.some((r) => r.startsWith('confluence:'));
        const hasGoogleRef = result.data.refs.some((r) =>
          ['gdoc:', 'gsheet:', 'gslides:', 'gmeet:', 'gcal:'].some((p) => r.startsWith(p))
        );

        // Count activities that have refs from multiple ref types
        const refTypes = [hasJiraRef, hasGithubRef, hasConfluenceRef, hasGoogleRef].filter(
          Boolean
        ).length;
        if (refTypes > 1) {
          crossToolRefs++;
        }
      }

      // At least 30% of activities should have cross-tool refs
      const crossToolCoverage = (crossToolRefs / rawActivities.length) * 100;
      expect(crossToolCoverage).toBeGreaterThanOrEqual(30);
    });

    it('extracts refs from rawData via JSON stringify', () => {
      const rawActivities = generateMockActivities();
      let extractedFromRawData = 0;

      for (const activity of rawActivities) {
        if (!activity.rawData) continue;

        const result = refExtractor.extractFromActivity(activity);

        // The rawData gets JSON stringified and patterns match against it
        // Check if we got any refs from activities with rawData
        if (result.data.refs.length > 0) {
          extractedFromRawData++;
        }
      }

      // Most activities with rawData should yield refs
      expect(extractedFromRawData).toBeGreaterThan(20);

      // Test specific rawData extraction by checking if Jira keys from rawData.key are extracted
      const jiraActivity = rawActivities.find(
        (a) => a.source === 'jira' && a.rawData?.key
      );
      if (jiraActivity) {
        const result = refExtractor.extractFromActivity(jiraActivity);
        expect(result.data.refs).toContain(jiraActivity.rawData!.key);
      }

      // Test Meet code extraction from rawData
      const meetActivity = rawActivities.find(
        (a) => a.source === 'google' && a.rawData?.meetCode
      );
      if (meetActivity) {
        const result = refExtractor.extractFromActivity(meetActivity);
        const meetCode = meetActivity.rawData!.meetCode as string;
        expect(result.data.refs).toContain(`gmeet:${meetCode}`);
      }
    });
  });

  describe('clustering accuracy', () => {
    it('produces expected number of clusters', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      const expectedClusters = getExpectedClusters();
      expect(result.data.clusters.length).toBe(expectedClusters.length);
    });

    it('matches expected cluster sizes', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      const expectedClusters = getExpectedClusters();

      for (const expected of expectedClusters) {
        const actual = result.data.clusters.find((c) =>
          expected.activityIds.every((id) => c.activityIds.includes(id))
        );

        expect(actual).toBeDefined();
        expect(actual?.activityIds.length).toBe(expected.activityIds.length);
      }
    });

    it('correctly identifies unclustered activities', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      const expectedUnclustered = getExpectedUnclustered();

      expect(result.data.unclustered.length).toBe(expectedUnclustered.length);
      for (const id of expectedUnclustered) {
        expect(result.data.unclustered).toContain(id);
      }
    });

    it('clusters participant entries with initiator entries', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      // SEC-100 (participant - mentioned in auth context) should cluster with AUTH-123
      const authCluster = result.data.clusters.find((c) =>
        c.activityIds.includes('AUTH-123')
      );

      expect(authCluster).toBeDefined();
      expect(authCluster?.activityIds).toContain('SEC-100');
      expect(authCluster?.activityIds).toContain('acme/backend#70');
      expect(authCluster?.activityIds).toContain('DesignFile999XYZ');
    });

    it('clusters Google entries via shared refs', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      // Google Calendar, Sheets, Slides should cluster based on their refs
      const perfCluster = result.data.clusters.find((c) =>
        c.activityIds.includes('PERF-456')
      );

      expect(perfCluster).toBeDefined();
      // These Google entries mention PERF-456 or acme/backend#55
      expect(perfCluster?.activityIds).toContain('gcal-perf-standup');
      expect(perfCluster?.activityIds).toContain('gsheet-perf-metrics');
      expect(perfCluster?.activityIds).toContain('meet-xyz-uvwx-stu');
    });

    it('achieves high clustering accuracy (>85%)', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      const expectedClusters = getExpectedClusters();
      const expectedUnclustered = getExpectedUnclustered();

      let correctPlacements = 0;
      const totalActivities = activities.length;

      // Check clustered activities
      for (const expected of expectedClusters) {
        const actual = result.data.clusters.find((c) =>
          expected.activityIds.some((id) => c.activityIds.includes(id))
        );

        if (actual) {
          for (const id of expected.activityIds) {
            if (actual.activityIds.includes(id)) {
              correctPlacements++;
            }
          }
        }
      }

      // Check unclustered activities
      for (const id of expectedUnclustered) {
        if (result.data.unclustered.includes(id)) {
          correctPlacements++;
        }
      }

      const accuracy = (correctPlacements / totalActivities) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(85);
    });
  });

  describe('cluster quality', () => {
    it('clusters span multiple tool types', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      for (const cluster of result.data.clusters) {
        // Each cluster should have activities from at least 3 different tools
        expect(cluster.metrics.toolTypes.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('clusters have meaningful shared refs', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      for (const cluster of result.data.clusters) {
        // Each cluster should have at least 2 shared refs
        expect(cluster.sharedRefs.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('provides useful diagnostics', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      expect(result.diagnostics.processor).toBe('ClusterExtractor');
      expect(result.diagnostics.inputMetrics.totalActivities).toBe(activities.length);
      expect(result.diagnostics.outputMetrics.clusterCount).toBe(
        result.data.clusters.length
      );
      expect(result.diagnostics.outputMetrics.unclusteredActivities).toBe(
        result.data.unclustered.length
      );
    });
  });

  describe('performance', () => {
    it('processes all mock activities efficiently', () => {
      const activities = prepareActivities();

      const start = performance.now();
      const result = clusterExtractor.process({ activities });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.data.clusters.length).toBeGreaterThan(0);
    });

    it('ref extraction is efficient for all activities', () => {
      const rawActivities = generateMockActivities();

      const start = performance.now();
      for (const activity of rawActivities) {
        refExtractor.extractFromActivity(activity);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('negative tests', () => {
    it('handles activity with no extractable refs gracefully', () => {
      const activities: ClusterableActivity[] = [
        { id: 'no-refs-1', refs: [], source: 'jira' },
        { id: 'no-refs-2', refs: [], source: 'github' },
      ];

      const result = clusterExtractor.process({ activities });

      expect(result.data.clusters).toHaveLength(0);
      expect(result.data.unclustered).toHaveLength(2);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles malformed rawData gracefully', () => {
      // This shouldn't throw - just extract what we can
      const result = refExtractor.extractFromActivity({
        title: 'Test',
        rawData: {
          circular: undefined, // Edge case
          deeply: { nested: { value: 'AUTH-123' } },
        },
      });

      // Should still extract AUTH-123 from deeply nested
      expect(result.data.refs).toContain('AUTH-123');
      expect(result.errors).toHaveLength(0);
    });

    it('handles empty activity object', () => {
      const result = refExtractor.extractFromActivity({});
      expect(result.data.refs).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('isolates pattern errors without crashing entire extraction', () => {
      // Even if one pattern fails, others should still work
      const result = refExtractor.extractFromActivity({
        title: 'AUTH-123 and some text',
        description: 'More text with CORE-456',
      });

      // Should extract both tickets
      expect(result.data.refs).toContain('AUTH-123');
      expect(result.data.refs).toContain('CORE-456');
    });
  });

  describe('data integrity', () => {
    it('preserves activity IDs through clustering', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      // All original IDs should be accounted for
      const allIds = [
        ...result.data.clusters.flatMap((c) => c.activityIds),
        ...result.data.unclustered,
      ];

      expect(allIds.length).toBe(activities.length);
      expect(new Set(allIds).size).toBe(activities.length); // No duplicates
    });

    it('cluster sharedRefs are actually shared by multiple activities', () => {
      const activities = prepareActivities();
      const result = clusterExtractor.process({ activities });

      for (const cluster of result.data.clusters) {
        for (const sharedRef of cluster.sharedRefs) {
          // Count how many activities have this ref
          const count = activities.filter(
            (a) => cluster.activityIds.includes(a.id) && a.refs.includes(sharedRef)
          ).length;

          expect(count).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });
});
