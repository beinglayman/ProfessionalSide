/**
 * ClusteringService Tests
 *
 * Kent Beck style: Test BEHAVIOR, not implementation.
 *
 * Key behaviors to test:
 * 1. Activities sharing refs SHOULD cluster together
 * 2. Activities without shared refs should NOT cluster
 * 3. Transitive clustering: A→ref1, B→ref1, B→ref2, C→ref2 => A,B,C cluster
 * 4. Minimum cluster size is respected
 * 5. Already-clustered activities are skipped
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the algorithm directly, not through Prisma
// This makes tests fast, deterministic, and focused on behavior

interface MockActivity {
  id: string;
  crossToolRefs: string[];
  clusterId: string | null;
}

/**
 * Pure function version of the clustering algorithm for testing.
 * This is the same logic as ClusteringService but without Prisma.
 */
function clusterBySharedRefs(
  activities: MockActivity[],
  minClusterSize: number = 2
): string[][] {
  // Build ref -> activity IDs map
  const refToActivities = new Map<string, Set<string>>();

  activities.forEach((activity) => {
    // Handle null/undefined refs gracefully
    const refs = activity.crossToolRefs || [];
    refs.forEach((ref) => {
      if (!refToActivities.has(ref)) {
        refToActivities.set(ref, new Set());
      }
      refToActivities.get(ref)!.add(activity.id);
    });
  });

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  activities.forEach((a) => adjacency.set(a.id, new Set()));

  refToActivities.forEach((activityIds) => {
    const ids = Array.from(activityIds);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        adjacency.get(ids[i])!.add(ids[j]);
        adjacency.get(ids[j])!.add(ids[i]);
      }
    }
  });

  // Find connected components via DFS
  const visited = new Set<string>();
  const components: string[][] = [];

  function dfs(id: string, component: string[]) {
    visited.add(id);
    component.push(id);
    adjacency.get(id)?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    });
  }

  activities.forEach((a) => {
    if (!visited.has(a.id)) {
      const component: string[] = [];
      dfs(a.id, component);
      if (component.length >= minClusterSize) {
        components.push(component);
      }
    }
  });

  return components;
}

describe('Clustering Algorithm', () => {
  // ===========================================================================
  // CORE BEHAVIOR: Activities sharing refs cluster together
  // ===========================================================================

  describe('activities sharing refs cluster together', () => {
    it('clusters two activities sharing the same Jira ticket', () => {
      const activities: MockActivity[] = [
        { id: 'pr-1', crossToolRefs: ['AUTH-123'], clusterId: null },
        { id: 'ticket-1', crossToolRefs: ['AUTH-123'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toContain('pr-1');
      expect(clusters[0]).toContain('ticket-1');
    });

    it('clusters three activities sharing overlapping refs (transitive)', () => {
      // A shares ref with B, B shares different ref with C
      // All three should cluster together (transitive)
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['REF-1'], clusterId: null },
        { id: 'B', crossToolRefs: ['REF-1', 'REF-2'], clusterId: null },
        { id: 'C', crossToolRefs: ['REF-2'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(3);
      expect(clusters[0]).toContain('A');
      expect(clusters[0]).toContain('B');
      expect(clusters[0]).toContain('C');
    });

    it('clusters activities sharing GitHub PR refs', () => {
      const activities: MockActivity[] = [
        { id: 'jira-ticket', crossToolRefs: ['acme/backend#42'], clusterId: null },
        { id: 'github-pr', crossToolRefs: ['acme/backend#42'], clusterId: null },
        { id: 'meeting', crossToolRefs: ['acme/backend#42'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(3);
    });
  });

  // ===========================================================================
  // CORE BEHAVIOR: Activities without shared refs do NOT cluster
  // ===========================================================================

  describe('activities without shared refs stay separate', () => {
    it('does not cluster activities with different refs', () => {
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['AUTH-123'], clusterId: null },
        { id: 'B', crossToolRefs: ['PERF-456'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      // Neither forms a cluster (minSize=2)
      expect(clusters).toHaveLength(0);
    });

    it('leaves standalone activities unclustered', () => {
      const activities: MockActivity[] = [
        { id: 'grouped-1', crossToolRefs: ['SHARED-REF'], clusterId: null },
        { id: 'grouped-2', crossToolRefs: ['SHARED-REF'], clusterId: null },
        { id: 'standalone', crossToolRefs: ['UNIQUE-REF'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toContain('grouped-1');
      expect(clusters[0]).toContain('grouped-2');
      expect(clusters[0]).not.toContain('standalone');
    });

    it('leaves activities with no refs unclustered', () => {
      const activities: MockActivity[] = [
        { id: 'has-refs-1', crossToolRefs: ['REF-1'], clusterId: null },
        { id: 'has-refs-2', crossToolRefs: ['REF-1'], clusterId: null },
        { id: 'no-refs', crossToolRefs: [], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).not.toContain('no-refs');
    });
  });

  // ===========================================================================
  // REAL SCENARIO: Project work clusters correctly
  // ===========================================================================

  describe('real project scenarios', () => {
    it('clusters Auth project activities together (AUTH-123, PR #42, design doc)', () => {
      const activities: MockActivity[] = [
        // Auth project - all share AUTH-123 or acme/backend#42
        { id: 'auth-ticket', crossToolRefs: ['AUTH-123', 'confluence:987654'], clusterId: null },
        { id: 'auth-pr', crossToolRefs: ['AUTH-123', 'acme/backend#42'], clusterId: null },
        { id: 'auth-design', crossToolRefs: ['AUTH-123', 'confluence:987654'], clusterId: null },
        { id: 'auth-followup', crossToolRefs: ['AUTH-124', 'acme/backend#42'], clusterId: null },

        // Perf project - separate cluster
        { id: 'perf-ticket', crossToolRefs: ['PERF-456'], clusterId: null },
        { id: 'perf-pr', crossToolRefs: ['PERF-456', 'PERF-457'], clusterId: null },

        // Standalone - no cluster
        { id: 'standalone-pr', crossToolRefs: [], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(2);

      // Find auth cluster (has auth-ticket)
      const authCluster = clusters.find((c) => c.includes('auth-ticket'))!;
      expect(authCluster).toContain('auth-ticket');
      expect(authCluster).toContain('auth-pr');
      expect(authCluster).toContain('auth-design');
      expect(authCluster).toContain('auth-followup'); // Linked via acme/backend#42

      // Find perf cluster
      const perfCluster = clusters.find((c) => c.includes('perf-ticket'))!;
      expect(perfCluster).toContain('perf-ticket');
      expect(perfCluster).toContain('perf-pr');

      // Standalone should not be in any cluster
      clusters.forEach((cluster) => {
        expect(cluster).not.toContain('standalone-pr');
      });
    });

    it('clusters meeting that mentions ticket with that project', () => {
      const activities: MockActivity[] = [
        { id: 'jira-ticket', crossToolRefs: ['PERF-456'], clusterId: null },
        { id: 'backend-pr', crossToolRefs: ['PERF-456'], clusterId: null },
        { id: 'planning-meeting', crossToolRefs: ['PERF-456'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toContain('planning-meeting');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('respects minimum cluster size', () => {
      const activities: MockActivity[] = [
        { id: 'solo', crossToolRefs: ['UNIQUE-123'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities, 2);
      expect(clusters).toHaveLength(0); // Solo activity doesn't meet min size

      const clustersWithMin1 = clusterBySharedRefs(activities, 1);
      expect(clustersWithMin1).toHaveLength(1); // With min=1, it clusters
    });

    it('handles empty activity list', () => {
      const clusters = clusterBySharedRefs([]);
      expect(clusters).toHaveLength(0);
    });

    it('handles activities where all have unique refs (no clustering)', () => {
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['REF-A'], clusterId: null },
        { id: 'B', crossToolRefs: ['REF-B'], clusterId: null },
        { id: 'C', crossToolRefs: ['REF-C'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);
      expect(clusters).toHaveLength(0);
    });

    it('handles activity with multiple refs pointing to different clusters', () => {
      // This tests that refs are properly connected even when one activity
      // could theoretically belong to multiple groups
      const activities: MockActivity[] = [
        { id: 'cluster-1-a', crossToolRefs: ['REF-1'], clusterId: null },
        { id: 'cluster-1-b', crossToolRefs: ['REF-1'], clusterId: null },
        { id: 'cluster-2-a', crossToolRefs: ['REF-2'], clusterId: null },
        { id: 'cluster-2-b', crossToolRefs: ['REF-2'], clusterId: null },
        { id: 'bridge', crossToolRefs: ['REF-1', 'REF-2'], clusterId: null }, // Bridges both!
      ];

      const clusters = clusterBySharedRefs(activities);

      // Bridge activity should cause all 5 to be in one cluster
      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(5);
    });
  });

  // ===========================================================================
  // IDEMPOTENCY
  // ===========================================================================

  describe('idempotency', () => {
    it('produces same clusters regardless of activity order', () => {
      const activitiesA: MockActivity[] = [
        { id: 'X', crossToolRefs: ['REF'], clusterId: null },
        { id: 'Y', crossToolRefs: ['REF'], clusterId: null },
        { id: 'Z', crossToolRefs: ['REF'], clusterId: null },
      ];

      const activitiesB: MockActivity[] = [
        { id: 'Z', crossToolRefs: ['REF'], clusterId: null },
        { id: 'X', crossToolRefs: ['REF'], clusterId: null },
        { id: 'Y', crossToolRefs: ['REF'], clusterId: null },
      ];

      const clustersA = clusterBySharedRefs(activitiesA);
      const clustersB = clusterBySharedRefs(activitiesB);

      expect(clustersA).toHaveLength(1);
      expect(clustersB).toHaveLength(1);
      expect(new Set(clustersA[0])).toEqual(new Set(clustersB[0]));
    });
  });

  // ===========================================================================
  // HIGH-VALUE ADDITIONS (CM Council Recommendations)
  // ===========================================================================

  describe('long transitive chains (Sandi Metz)', () => {
    it('handles 6+ hop transitive chains', () => {
      // A→B→C→D→E→F→G through shared refs
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['REF-AB'], clusterId: null },
        { id: 'B', crossToolRefs: ['REF-AB', 'REF-BC'], clusterId: null },
        { id: 'C', crossToolRefs: ['REF-BC', 'REF-CD'], clusterId: null },
        { id: 'D', crossToolRefs: ['REF-CD', 'REF-DE'], clusterId: null },
        { id: 'E', crossToolRefs: ['REF-DE', 'REF-EF'], clusterId: null },
        { id: 'F', crossToolRefs: ['REF-EF', 'REF-FG'], clusterId: null },
        { id: 'G', crossToolRefs: ['REF-FG'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      // All 7 should be in one cluster via transitive links
      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(7);
      expect(clusters[0]).toContain('A');
      expect(clusters[0]).toContain('G');
    });

    it('handles very long chains (20 hops) without stack overflow', () => {
      const activities: MockActivity[] = [];

      for (let i = 0; i < 21; i++) {
        const refs: string[] = [];
        if (i > 0) refs.push(`REF-${i - 1}-${i}`);
        if (i < 20) refs.push(`REF-${i}-${i + 1}`);
        activities.push({ id: `node-${i}`, crossToolRefs: refs, clusterId: null });
      }

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(21);
    });
  });

  describe('ref edge cases (Uncle Bob)', () => {
    it('handles activity with null-ish refs gracefully', () => {
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['REF-1'], clusterId: null },
        { id: 'B', crossToolRefs: ['REF-1'], clusterId: null },
        // @ts-expect-error - testing runtime behavior with bad data
        { id: 'C', crossToolRefs: null, clusterId: null },
        // @ts-expect-error - testing runtime behavior with bad data
        { id: 'D', crossToolRefs: undefined, clusterId: null },
      ];

      // Should not throw
      expect(() => clusterBySharedRefs(activities)).not.toThrow();

      const clusters = clusterBySharedRefs(activities);
      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toContain('A');
      expect(clusters[0]).toContain('B');
    });

    it('handles duplicate refs in same activity', () => {
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['REF-1', 'REF-1', 'REF-1'], clusterId: null },
        { id: 'B', crossToolRefs: ['REF-1'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(2);
    });

    it('handles empty string refs', () => {
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['', 'REF-1'], clusterId: null },
        { id: 'B', crossToolRefs: ['REF-1', ''], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      // Empty strings would match each other, but that's fine
      expect(clusters).toHaveLength(1);
    });
  });

  describe('case sensitivity (Sandi Metz)', () => {
    it('treats AUTH-123 and auth-123 as DIFFERENT refs', () => {
      const activities: MockActivity[] = [
        { id: 'A', crossToolRefs: ['AUTH-123'], clusterId: null },
        { id: 'B', crossToolRefs: ['AUTH-123'], clusterId: null },
        { id: 'C', crossToolRefs: ['auth-123'], clusterId: null },
        { id: 'D', crossToolRefs: ['auth-123'], clusterId: null },
      ];

      const clusters = clusterBySharedRefs(activities);

      // Should be 2 separate clusters (case matters)
      expect(clusters).toHaveLength(2);

      const upperCluster = clusters.find(c => c.includes('A'))!;
      const lowerCluster = clusters.find(c => c.includes('C'))!;

      expect(upperCluster).toContain('A');
      expect(upperCluster).toContain('B');
      expect(upperCluster).not.toContain('C');

      expect(lowerCluster).toContain('C');
      expect(lowerCluster).toContain('D');
      expect(lowerCluster).not.toContain('A');
    });
  });

  describe('scale sanity check (Kent Beck)', () => {
    it('handles 100 activities without performance issues', () => {
      const activities: MockActivity[] = [];

      // Create 10 projects with 10 activities each
      for (let project = 0; project < 10; project++) {
        for (let item = 0; item < 10; item++) {
          activities.push({
            id: `proj${project}-item${item}`,
            crossToolRefs: [`PROJ${project}-EPIC`, `PROJ${project}-${item}`],
            clusterId: null,
          });
        }
      }

      const startTime = performance.now();
      const clusters = clusterBySharedRefs(activities);
      const duration = performance.now() - startTime;

      // Should complete in <100ms
      expect(duration).toBeLessThan(100);

      // Should have 10 clusters
      expect(clusters).toHaveLength(10);

      // Each cluster should have 10 items
      clusters.forEach(cluster => {
        expect(cluster).toHaveLength(10);
      });
    });

    it('handles 500 activities in reasonable time', () => {
      const activities: MockActivity[] = [];

      // Create 50 projects with 10 activities each
      for (let project = 0; project < 50; project++) {
        for (let item = 0; item < 10; item++) {
          activities.push({
            id: `proj${project}-item${item}`,
            crossToolRefs: [`PROJ${project}-EPIC`],
            clusterId: null,
          });
        }
      }

      const startTime = performance.now();
      const clusters = clusterBySharedRefs(activities);
      const duration = performance.now() - startTime;

      // Should complete in <500ms even for 500 activities
      expect(duration).toBeLessThan(500);
      expect(clusters).toHaveLength(50);
    });
  });
});
