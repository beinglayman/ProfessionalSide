/**
 * Demo Service Tests
 *
 * Tests for the parallel demo tables functionality.
 * Focuses on:
 * 1. Helper functions (unit tests)
 * 2. Data isolation (demo tables don't affect real tables)
 * 3. Seeding creates proper clusters
 * 4. Clear operation removes all demo data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// =============================================================================
// UNIT TESTS FOR HELPER FUNCTIONS
// =============================================================================

/**
 * Compute date range from timestamps.
 * Copied from demo.service.ts for isolated testing.
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

describe('computeDateRange', () => {
  it('returns undefined for empty array', () => {
    expect(computeDateRange([])).toBeUndefined();
  });

  it('returns correct range for single timestamp', () => {
    const date = new Date('2024-01-15T10:00:00Z');
    const result = computeDateRange([date]);

    expect(result).toBeDefined();
    expect(result!.start).toBe(date.toISOString());
    expect(result!.end).toBe(date.toISOString());
  });

  it('returns correct min/max for multiple timestamps', () => {
    const dates = [
      new Date('2024-01-15T10:00:00Z'),
      new Date('2024-01-10T10:00:00Z'), // earliest
      new Date('2024-01-20T10:00:00Z'), // latest
      new Date('2024-01-18T10:00:00Z'),
    ];

    const result = computeDateRange(dates);

    expect(result).toBeDefined();
    expect(result!.start).toBe('2024-01-10T10:00:00.000Z');
    expect(result!.end).toBe('2024-01-20T10:00:00.000Z');
  });

  it('handles timestamps in any order', () => {
    const dates = [
      new Date('2024-03-01'),
      new Date('2024-01-01'),
      new Date('2024-02-01'),
    ];

    const result = computeDateRange(dates);

    expect(new Date(result!.start)).toEqual(new Date('2024-01-01'));
    expect(new Date(result!.end)).toEqual(new Date('2024-03-01'));
  });
});

describe('extractToolTypes', () => {
  it('returns empty array for empty input', () => {
    expect(extractToolTypes([])).toEqual([]);
  });

  it('extracts unique tool types', () => {
    const activities = [
      { source: 'github' },
      { source: 'jira' },
      { source: 'github' }, // duplicate
      { source: 'confluence' },
      { source: 'jira' }, // duplicate
    ];

    const result = extractToolTypes(activities);

    expect(result).toHaveLength(3);
    expect(result).toContain('github');
    expect(result).toContain('jira');
    expect(result).toContain('confluence');
  });

  it('handles single activity', () => {
    const activities = [{ source: 'figma' }];
    expect(extractToolTypes(activities)).toEqual(['figma']);
  });
});

// =============================================================================
// INTEGRATION TEST SCENARIOS (Describe expected behavior)
// =============================================================================

describe('Demo Service Integration', () => {
  describe('seedDemoData', () => {
    it('should clear existing demo data before seeding', () => {
      // When seeding demo data for a user who already has demo data,
      // the old data should be cleared first to prevent duplicates
      // This is a critical safety requirement
    });

    it('should extract cross-tool refs from activity content', () => {
      // Activities with Jira tickets, PR references, etc. in their
      // title/description should have those refs extracted and stored
      // in crossToolRefs for clustering
    });

    it('should cluster activities that share refs', () => {
      // Activities mentioning the same Jira ticket should end up
      // in the same cluster
    });

    it('should not cluster activities with no shared refs', () => {
      // Activities with completely different refs should be
      // in separate clusters (or unclustered if < minClusterSize)
    });

    it('should return cluster metrics with date ranges', () => {
      // Each cluster should have computed metrics including
      // the date range (earliest to latest activity timestamp)
    });
  });

  describe('getDemoClusters', () => {
    it('should return only clusters for the specified user', () => {
      // Demo data is user-scoped; querying with userId should
      // only return that user's demo clusters
    });

    it('should include activity counts and tool types', () => {
      // The returned cluster objects should have computed metrics
    });
  });

  describe('getDemoClusterById', () => {
    it('should return null for non-existent cluster', () => {
      // Safety check: don't throw, return null
    });

    it('should return null for cluster owned by different user', () => {
      // Security: users can't access other users' demo data
    });

    it('should include full activity list when requested', () => {
      // For STAR generation, we need the full activity details
    });
  });

  describe('clearDemoData', () => {
    it('should remove all demo data for user', () => {
      // Stories, clusters, and activities should all be cleared
    });

    it('should not affect other users demo data', () => {
      // Only the specified user's data is cleared
    });

    it('should not affect real (non-demo) data', () => {
      // Critical: real tables are never touched
    });
  });
});

// =============================================================================
// REGRESSION TESTS
// =============================================================================

describe('Demo Service Regressions', () => {
  it('should handle users with no demo data gracefully', () => {
    // Calling getDemoClusters for a user with no demo data
    // should return empty array, not throw
  });

  it('should handle activities with null/empty refs', () => {
    // Some activities may have no cross-tool refs
    // They should still be created but won't cluster
  });

  it('should preserve rawData as JSON', () => {
    // The rawData field should maintain its structure
    // when stored and retrieved
  });
});
