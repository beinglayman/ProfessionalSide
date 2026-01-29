/**
 * ClusterHydrator Tests
 *
 * Tests for cluster hydration (enriching clusters with full activity data).
 */

import { describe, it, expect } from 'vitest';
import { ClusterHydrator, clusterHydrator, ActivityWithRefs } from './cluster-hydrator';
import { Cluster, WarningCodes } from './types';

describe('ClusterHydrator', () => {
  const createCluster = (
    id: string,
    activityIds: string[],
    sharedRefs: string[] = ['REF-1']
  ): Cluster => ({
    id,
    activityIds,
    sharedRefs,
    metrics: {
      activityCount: activityIds.length,
      refCount: sharedRefs.length,
      toolTypes: ['jira', 'github'],
    },
  });

  const createActivity = (
    id: string,
    source: string,
    timestamp: Date,
    refs: string[] = ['REF-1']
  ): ActivityWithRefs => ({
    id,
    source,
    sourceId: `${source}-${id}`,
    sourceUrl: `https://${source}.com/${id}`,
    title: `Activity ${id}`,
    description: `Description for ${id}`,
    timestamp,
    rawData: { assignee: 'test-user' },
    refs,
  });

  describe('hydrate', () => {
    it('hydrates cluster with all activities found', () => {
      const cluster = createCluster('cluster-1', ['a1', 'a2', 'a3']);
      const activities: ActivityWithRefs[] = [
        createActivity('a1', 'jira', new Date('2024-01-01')),
        createActivity('a2', 'github', new Date('2024-01-02')),
        createActivity('a3', 'confluence', new Date('2024-01-03')),
      ];
      const lookup = ClusterHydrator.buildLookup(activities);

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.activities).toHaveLength(3);
      expect(result.warnings).toHaveLength(0);
    });

    it('sorts activities by timestamp (earliest first)', () => {
      const cluster = createCluster('cluster-1', ['a1', 'a2', 'a3']);
      const activities: ActivityWithRefs[] = [
        createActivity('a3', 'confluence', new Date('2024-01-03')),
        createActivity('a1', 'jira', new Date('2024-01-01')),
        createActivity('a2', 'github', new Date('2024-01-02')),
      ];
      const lookup = ClusterHydrator.buildLookup(activities);

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.activities[0].id).toBe('a1');
      expect(result.cluster.activities[1].id).toBe('a2');
      expect(result.cluster.activities[2].id).toBe('a3');
    });

    it('returns warning when some activities not found', () => {
      const cluster = createCluster('cluster-1', ['a1', 'a2', 'missing-1', 'missing-2']);
      const activities: ActivityWithRefs[] = [
        createActivity('a1', 'jira', new Date('2024-01-01')),
        createActivity('a2', 'github', new Date('2024-01-02')),
      ];
      const lookup = ClusterHydrator.buildLookup(activities);

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.activities).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe(WarningCodes.ACTIVITIES_NOT_FOUND);
      expect(result.warnings[0].message).toContain('2 activities not found');
      expect(result.warnings[0].context?.missingIds).toContain('missing-1');
      expect(result.warnings[0].context?.missingIds).toContain('missing-2');
    });

    it('updates metrics to reflect actual hydrated count', () => {
      const cluster = createCluster('cluster-1', ['a1', 'a2', 'missing-1']);
      cluster.metrics.activityCount = 3; // Original count

      const activities: ActivityWithRefs[] = [
        createActivity('a1', 'jira', new Date('2024-01-01')),
        createActivity('a2', 'github', new Date('2024-01-02')),
      ];
      const lookup = ClusterHydrator.buildLookup(activities);

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.metrics.activityCount).toBe(2); // Updated to actual
    });

    it('preserves cluster properties', () => {
      const cluster = createCluster('cluster-1', ['a1']);
      cluster.sharedRefs = ['PROJ-123', 'PROJ-456'];
      cluster.metrics.dateRange = {
        earliest: new Date('2024-01-01'),
        latest: new Date('2024-01-31'),
      };

      const activities: ActivityWithRefs[] = [
        createActivity('a1', 'jira', new Date('2024-01-15')),
      ];
      const lookup = ClusterHydrator.buildLookup(activities);

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.id).toBe('cluster-1');
      expect(result.cluster.sharedRefs).toEqual(['PROJ-123', 'PROJ-456']);
      expect(result.cluster.metrics.dateRange).toBeDefined();
    });

    it('maps activity fields correctly', () => {
      const cluster = createCluster('cluster-1', ['a1']);
      const activity: ActivityWithRefs = {
        id: 'a1',
        source: 'jira',
        sourceId: 'PROJ-123',
        sourceUrl: 'https://jira.com/PROJ-123',
        title: 'Test Ticket',
        description: 'Test Description',
        timestamp: new Date('2024-01-15'),
        rawData: { assignee: 'honey.arora', priority: 'high' },
        refs: ['PROJ-123', 'PR-456'],
      };
      const lookup = ClusterHydrator.buildLookup([activity]);

      const result = clusterHydrator.hydrate(cluster, lookup);
      const hydrated = result.cluster.activities[0];

      expect(hydrated.id).toBe('a1');
      expect(hydrated.source).toBe('jira');
      expect(hydrated.title).toBe('Test Ticket');
      expect(hydrated.description).toBe('Test Description');
      expect(hydrated.sourceUrl).toBe('https://jira.com/PROJ-123');
      expect(hydrated.rawData).toEqual({ assignee: 'honey.arora', priority: 'high' });
      expect(hydrated.refs).toEqual(['PROJ-123', 'PR-456']);
    });

    it('handles empty cluster gracefully', () => {
      const cluster = createCluster('cluster-1', []);
      const lookup = new Map<string, ActivityWithRefs>();

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.activities).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.cluster.metrics.activityCount).toBe(0);
    });

    it('handles null/undefined rawData and description', () => {
      const cluster = createCluster('cluster-1', ['a1', 'a2']);
      const activities: ActivityWithRefs[] = [
        {
          id: 'a1',
          source: 'jira',
          sourceId: 'PROJ-1',
          title: 'Activity 1',
          description: null,
          timestamp: new Date('2024-01-01'),
          rawData: null,
          refs: ['REF-1'],
        },
        {
          id: 'a2',
          source: 'github',
          sourceId: 'PR-1',
          title: 'Activity 2',
          timestamp: new Date('2024-01-02'),
          rawData: undefined,
          refs: ['REF-1'],
        },
      ];
      const lookup = ClusterHydrator.buildLookup(activities);

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.cluster.activities).toHaveLength(2);
      expect(result.cluster.activities[0].description).toBeNull();
      expect(result.cluster.activities[0].rawData).toBeNull();
    });

    it('limits missingIds in warning context to 10', () => {
      const manyIds = Array.from({ length: 15 }, (_, i) => `missing-${i}`);
      const cluster = createCluster('cluster-1', manyIds);
      const lookup = new Map<string, ActivityWithRefs>();

      const result = clusterHydrator.hydrate(cluster, lookup);

      expect(result.warnings[0].context?.missingIds).toHaveLength(10);
    });
  });

  describe('buildLookup', () => {
    it('creates map from activity array', () => {
      const activities: ActivityWithRefs[] = [
        createActivity('a1', 'jira', new Date()),
        createActivity('a2', 'github', new Date()),
      ];

      const lookup = ClusterHydrator.buildLookup(activities);

      expect(lookup.size).toBe(2);
      expect(lookup.get('a1')?.source).toBe('jira');
      expect(lookup.get('a2')?.source).toBe('github');
    });

    it('handles empty array', () => {
      const lookup = ClusterHydrator.buildLookup([]);
      expect(lookup.size).toBe(0);
    });

    it('handles duplicate IDs (last wins)', () => {
      const activities: ActivityWithRefs[] = [
        createActivity('a1', 'jira', new Date()),
        createActivity('a1', 'github', new Date()), // Duplicate ID, different source
      ];

      const lookup = ClusterHydrator.buildLookup(activities);

      expect(lookup.size).toBe(1);
      expect(lookup.get('a1')?.source).toBe('github'); // Last one wins
    });
  });

  describe('singleton instance', () => {
    it('exports singleton clusterHydrator', () => {
      expect(clusterHydrator).toBeInstanceOf(ClusterHydrator);
    });
  });
});
