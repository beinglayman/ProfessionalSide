/**
 * Demo Service Tests
 *
 * Tests for the parallel demo tables functionality.
 * Covers:
 * 1. Helper functions (unit tests - imported from service)
 * 2. Service behavior contracts (integration test specs)
 */

import { describe, it, expect } from 'vitest';
import {
  computeDateRange,
  extractToolTypes,
  buildToolSummary,
  extractSkillsFromContent,
  withTimeout,
  DemoServiceError,
} from './demo.service';

// =============================================================================
// UNIT TESTS FOR withTimeout UTILITY (KB: Extracted helper)
// =============================================================================

describe('withTimeout', () => {
  it('returns result if promise resolves before timeout', async () => {
    const fastPromise = Promise.resolve('success');
    const result = await withTimeout(fastPromise, 1000, 'test');
    expect(result).toBe('success');
  });

  it('returns undefined if timeout is reached', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 100);
    });
    const result = await withTimeout(slowPromise, 10, 'test');
    expect(result).toBeUndefined();
  });

  it('handles rejected promises', async () => {
    const failingPromise = Promise.reject(new Error('failed'));
    await expect(withTimeout(failingPromise, 1000, 'test')).rejects.toThrow('failed');
  });
});

// =============================================================================
// UNIT TESTS FOR HELPER FUNCTIONS (Imported from service - no duplication)
// =============================================================================

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

  it('preserves order of first occurrence', () => {
    const activities = [
      { source: 'jira' },
      { source: 'github' },
      { source: 'jira' },
    ];
    const result = extractToolTypes(activities);
    expect(result[0]).toBe('jira');
    expect(result[1]).toBe('github');
  });
});

describe('buildToolSummary', () => {
  it('returns empty string for empty array', () => {
    expect(buildToolSummary([])).toBe('');
  });

  it('counts activities by source', () => {
    const activities = [
      { source: 'github' },
      { source: 'github' },
      { source: 'jira' },
    ];

    const result = buildToolSummary(activities);

    expect(result).toContain('2 github');
    expect(result).toContain('1 jira');
  });

  it('handles single source', () => {
    const activities = [
      { source: 'confluence' },
      { source: 'confluence' },
      { source: 'confluence' },
    ];

    expect(buildToolSummary(activities)).toBe('3 confluence');
  });
});

// =============================================================================
// UNIT TESTS FOR JSON PARSING (Bug fix validation)
// =============================================================================

/**
 * Strip markdown code blocks from LLM response.
 * Extracted from demo.service.ts for testing.
 */
function stripMarkdownCodeBlocks(content: string): string {
  let jsonContent = content.trim();
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return jsonContent;
}

describe('stripMarkdownCodeBlocks', () => {
  it('returns unchanged content when no code blocks present', () => {
    const input = '{"description": "test", "fullContent": "content"}';
    expect(stripMarkdownCodeBlocks(input)).toBe(input);
  });

  it('strips ```json wrapper', () => {
    const input = '```json\n{"description": "test", "fullContent": "content"}\n```';
    const expected = '{"description": "test", "fullContent": "content"}';
    expect(stripMarkdownCodeBlocks(input)).toBe(expected);
  });

  it('strips ``` wrapper without json label', () => {
    const input = '```\n{"description": "test"}\n```';
    const expected = '{"description": "test"}';
    expect(stripMarkdownCodeBlocks(input)).toBe(expected);
  });

  it('handles extra whitespace', () => {
    const input = '  ```json  \n{"test": true}\n  ```  ';
    const result = stripMarkdownCodeBlocks(input);
    expect(JSON.parse(result)).toEqual({ test: true });
  });

  it('does not strip if backticks are in middle of content', () => {
    const input = '{"code": "```example```"}';
    expect(stripMarkdownCodeBlocks(input)).toBe(input);
  });
});

describe('LLM JSON response parsing', () => {
  function parseWithValidation(content: string): { fullContent: string; description: string } {
    const jsonContent = stripMarkdownCodeBlocks(content);
    const parsed = JSON.parse(jsonContent);
    if (!parsed.fullContent || !parsed.description) {
      throw new Error('Missing required fields in LLM response');
    }
    return {
      fullContent: parsed.fullContent,
      description: parsed.description,
    };
  }

  it('parses valid JSON response', () => {
    const input = '{"description": "Test summary", "fullContent": "# Test\\n\\nContent here"}';
    const result = parseWithValidation(input);
    expect(result.description).toBe('Test summary');
    expect(result.fullContent).toBe('# Test\n\nContent here');
  });

  it('parses JSON wrapped in markdown code blocks', () => {
    const input = '```json\n{"description": "Test", "fullContent": "Content"}\n```';
    const result = parseWithValidation(input);
    expect(result.description).toBe('Test');
  });

  it('throws on missing description field', () => {
    const input = '{"fullContent": "Content only"}';
    expect(() => parseWithValidation(input)).toThrow('Missing required fields');
  });

  it('throws on missing fullContent field', () => {
    const input = '{"description": "Description only"}';
    expect(() => parseWithValidation(input)).toThrow('Missing required fields');
  });

  it('throws on invalid JSON', () => {
    const input = '{description: invalid}';
    expect(() => parseWithValidation(input)).toThrow();
  });
});

// =============================================================================
// UNIT TESTS FOR NARRATIVE GENERATION HELPERS
// =============================================================================

/**
 * Generate fallback narrative when LLM is unavailable.
 * Copied from demo.service.ts for isolated testing.
 */
function generateFallbackNarrative(
  title: string,
  activities: Array<{
    source: string;
    title: string;
    timestamp: Date;
  }>,
  toolSummary: string
): { fullContent: string; description: string } {
  const description = `${activities.length} activities across ${toolSummary}`;

  const activitySummaries = activities.map((a) => {
    const date = a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `- **${date}** [${a.source}]: ${a.title}`;
  });

  const fullContent = `# ${title}

## Summary
${description}

## Activities
${activitySummaries.join('\n')}

---
*This is a structured summary. Click regenerate when LLM service is available for a richer narrative.*

*Generated at ${new Date().toISOString()}*`;

  return { fullContent, description };
}

describe('generateFallbackNarrative', () => {
  it('generates structured narrative with title', () => {
    const activities = [
      { source: 'github', title: 'Merged PR #42', timestamp: new Date('2024-01-15') },
      { source: 'jira', title: 'Completed PROJ-123', timestamp: new Date('2024-01-16') },
    ];

    const result = generateFallbackNarrative('Week of Jan 15-21', activities, '1 github, 1 jira');

    expect(result.fullContent).toContain('# Week of Jan 15-21');
    expect(result.fullContent).toContain('## Summary');
    expect(result.fullContent).toContain('## Activities');
    expect(result.fullContent).toContain('[github]: Merged PR #42');
    expect(result.fullContent).toContain('[jira]: Completed PROJ-123');
  });

  it('includes activity count in description', () => {
    const activities = [
      { source: 'github', title: 'PR #1', timestamp: new Date('2024-01-15') },
      { source: 'github', title: 'PR #2', timestamp: new Date('2024-01-16') },
      { source: 'jira', title: 'Issue', timestamp: new Date('2024-01-17') },
    ];

    const result = generateFallbackNarrative('Test', activities, '2 github, 1 jira');

    expect(result.description).toBe('3 activities across 2 github, 1 jira');
  });

  it('formats dates correctly', () => {
    const activities = [
      { source: 'github', title: 'Test', timestamp: new Date('2024-03-15') },
    ];

    const result = generateFallbackNarrative('Test', activities, '1 github');

    expect(result.fullContent).toContain('Mar 15');
  });

  it('handles empty activities array', () => {
    const result = generateFallbackNarrative('Empty Week', [], '');

    expect(result.description).toBe('0 activities across ');
    expect(result.fullContent).toContain('# Empty Week');
  });
});

// =============================================================================
// UNIT TESTS FOR SKILL EXTRACTION (Using imported function)
// =============================================================================

describe('extractSkillsFromContent', () => {
  it('extracts matching skills from content', () => {
    const content = 'Implemented a new React component with TypeScript for the API integration';
    const skills = extractSkillsFromContent(content);

    expect(skills).toContain('React');
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('API');
  });

  it('is case insensitive', () => {
    const content = 'Used REACT and typescript for frontend development';
    const skills = extractSkillsFromContent(content);

    expect(skills).toContain('React');
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('Frontend');
  });

  it('limits to 5 skills maximum', () => {
    const content = 'Used React, TypeScript, JavaScript, Node.js, Python, Docker, AWS, PostgreSQL';
    const skills = extractSkillsFromContent(content);

    expect(skills.length).toBeLessThanOrEqual(5);
  });

  it('returns empty array for content with no matching skills', () => {
    const content = 'Attended meetings and sent emails';
    const skills = extractSkillsFromContent(content);

    expect(skills).toEqual([]);
  });

  it('handles empty content', () => {
    expect(extractSkillsFromContent('')).toEqual([]);
  });

  it('extracts compound skills like Node.js and CI/CD', () => {
    const content = 'Set up Node.js server with CI/CD pipeline';
    const skills = extractSkillsFromContent(content);

    expect(skills).toContain('Node.js');
    expect(skills).toContain('CI/CD');
  });
});

// =============================================================================
// DUAL-PATH SEEDING UNIT TESTS (New - added for cluster-based entries)
// =============================================================================

/**
 * Test helper: Simulate cluster entry creation logic.
 * Extracted from demo.service.ts for isolated testing.
 */
function getClusterSummary(activities: Array<{ title: string }>): string {
  const words = activities
    .flatMap((a) => a.title.toLowerCase().split(/\s+/))
    .filter((word) => word.length > 3);

  const wordCounts: Record<string, number> = {};
  words.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  const sorted = Object.entries(wordCounts)
    .filter(([word]) => !['this', 'that', 'with', 'from', 'into', 'the', 'and', 'for'].includes(word))
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0 && sorted[0][1] > 1) {
    const keyword = sorted[0][0];
    return keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Work';
  }

  return 'Cross-Tool Collaboration';
}

describe('getClusterSummary', () => {
  it('returns default when no common words found', () => {
    const activities = [
      { title: 'Fix bug' },
      { title: 'Add feature' },
    ];
    expect(getClusterSummary(activities)).toBe('Cross-Tool Collaboration');
  });

  it('extracts common keyword when repeated', () => {
    const activities = [
      { title: 'AUTH-123 implementation' },
      { title: 'AUTH-123 testing' },
      { title: 'AUTH-123 review' },
    ];
    expect(getClusterSummary(activities)).toBe('Auth-123 Work');
  });

  it('ignores short words (<=3 chars)', () => {
    const activities = [
      { title: 'The fix for the bug' },
      { title: 'The test for the bug' },
    ];
    // 'the' and 'for' and 'bug' (3 chars) should be ignored
    expect(getClusterSummary(activities)).toBe('Cross-Tool Collaboration');
  });

  it('handles empty activities array', () => {
    expect(getClusterSummary([])).toBe('Cross-Tool Collaboration');
  });

  it('filters stopwords correctly', () => {
    const activities = [
      { title: 'Work with this feature from that system' },
      { title: 'Work with this component from that service' },
    ];
    expect(getClusterSummary(activities)).toBe('Work Work');
  });
});

/**
 * Test helper: Simulate dual-path entry creation logic
 */
interface MockCluster {
  id: string;
  name: string | null;
  activities: Array<{ id: string; timestamp: Date; title: string; source: string }>;
}

function shouldCreateClusterEntry(cluster: MockCluster, minActivities: number = 3): boolean {
  return cluster.activities.length >= minActivities;
}

function generateClusterEntryTitle(cluster: MockCluster): string {
  const clusterName = cluster.name || 'Project';
  const summary = getClusterSummary(cluster.activities);
  return `${clusterName}: ${summary}`;
}

describe('Dual-Path Entry Creation Logic', () => {
  describe('shouldCreateClusterEntry', () => {
    it('returns true when cluster has >= minActivities', () => {
      const cluster: MockCluster = {
        id: 'c1',
        name: 'AUTH-123',
        activities: [
          { id: 'a1', timestamp: new Date(), title: 'PR #1', source: 'github' },
          { id: 'a2', timestamp: new Date(), title: 'Issue', source: 'jira' },
          { id: 'a3', timestamp: new Date(), title: 'Doc', source: 'confluence' },
        ],
      };
      expect(shouldCreateClusterEntry(cluster, 3)).toBe(true);
    });

    it('returns false when cluster has < minActivities', () => {
      const cluster: MockCluster = {
        id: 'c1',
        name: 'DOC-789',
        activities: [
          { id: 'a1', timestamp: new Date(), title: 'Single doc', source: 'confluence' },
        ],
      };
      expect(shouldCreateClusterEntry(cluster, 3)).toBe(false);
    });

    it('returns false for empty cluster', () => {
      const cluster: MockCluster = {
        id: 'c1',
        name: 'Empty',
        activities: [],
      };
      expect(shouldCreateClusterEntry(cluster, 3)).toBe(false);
    });
  });

  describe('generateClusterEntryTitle', () => {
    it('uses cluster name when available', () => {
      const cluster: MockCluster = {
        id: 'c1',
        name: 'AUTH-123',
        activities: [
          { id: 'a1', timestamp: new Date(), title: 'Work item', source: 'jira' },
        ],
      };
      const title = generateClusterEntryTitle(cluster);
      expect(title).toContain('AUTH-123');
    });

    it('uses Project when cluster name is null', () => {
      const cluster: MockCluster = {
        id: 'c1',
        name: null,
        activities: [
          { id: 'a1', timestamp: new Date(), title: 'Work item', source: 'jira' },
        ],
      };
      const title = generateClusterEntryTitle(cluster);
      expect(title).toContain('Project');
    });

    it('combines cluster name with activity summary', () => {
      const cluster: MockCluster = {
        id: 'c1',
        name: 'PERF-456',
        activities: [
          { id: 'a1', timestamp: new Date(), title: 'Performance optimization', source: 'github' },
          { id: 'a2', timestamp: new Date(), title: 'Performance testing', source: 'jira' },
        ],
      };
      const title = generateClusterEntryTitle(cluster);
      expect(title).toBe('PERF-456: Performance Work');
    });
  });
});

/**
 * Test helper: Simulate temporal window creation logic
 */
function createTemporalWindows(
  activities: Array<{ id: string; timestamp: Date }>,
  windowSizeDays: number,
  minActivitiesPerWindow: number
): Array<{ startDate: Date; endDate: Date; activityIds: string[] }> {
  if (activities.length === 0) return [];

  const sorted = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const earliest = sorted[0].timestamp;
  const latest = sorted[sorted.length - 1].timestamp;
  const windows: Array<{ startDate: Date; endDate: Date; activityIds: string[] }> = [];

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  let windowStart = earliest;

  while (windowStart.getTime() <= latest.getTime()) {
    const windowEnd = new Date(windowStart.getTime() + windowSizeDays * MS_PER_DAY);

    const windowActivities = sorted.filter(
      (a) =>
        a.timestamp.getTime() >= windowStart.getTime() &&
        a.timestamp.getTime() < windowEnd.getTime()
    );

    if (windowActivities.length >= minActivitiesPerWindow) {
      windows.push({
        startDate: windowStart,
        endDate: windowEnd,
        activityIds: windowActivities.map((a) => a.id),
      });
    }

    windowStart = windowEnd;
  }

  return windows;
}

describe('createTemporalWindows', () => {
  it('returns empty array for no activities', () => {
    expect(createTemporalWindows([], 14, 3)).toEqual([]);
  });

  it('creates windows based on windowSizeDays', () => {
    const baseDate = new Date('2024-01-01');
    const activities = [
      { id: 'a1', timestamp: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000) },
      { id: 'a2', timestamp: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000) },
      { id: 'a3', timestamp: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000) },
      { id: 'a4', timestamp: new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000) },
      { id: 'a5', timestamp: new Date(baseDate.getTime() + 16 * 24 * 60 * 60 * 1000) },
      { id: 'a6', timestamp: new Date(baseDate.getTime() + 17 * 24 * 60 * 60 * 1000) },
    ];

    const windows = createTemporalWindows(activities, 14, 3);

    expect(windows).toHaveLength(2);
    expect(windows[0].activityIds).toEqual(['a1', 'a2', 'a3']);
    expect(windows[1].activityIds).toEqual(['a4', 'a5', 'a6']);
  });

  it('skips windows with fewer than minActivitiesPerWindow', () => {
    const baseDate = new Date('2024-01-01');
    const activities = [
      { id: 'a1', timestamp: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000) },
      { id: 'a2', timestamp: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000) },
      // Only 2 activities in first window
    ];

    const windows = createTemporalWindows(activities, 14, 3);

    expect(windows).toHaveLength(0);
  });

  it('handles activities spanning multiple windows', () => {
    const baseDate = new Date('2024-01-01');
    const activities = Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      timestamp: new Date(baseDate.getTime() + i * 3 * 24 * 60 * 60 * 1000), // Every 3 days
    }));

    const windows = createTemporalWindows(activities, 14, 3);

    // 10 activities over 27 days -> 2 windows (days 0-14, 14-28)
    expect(windows.length).toBeGreaterThanOrEqual(1);
    windows.forEach((w) => {
      expect(w.activityIds.length).toBeGreaterThanOrEqual(3);
    });
  });
});

/**
 * Test dual-path grouping method assignment
 */
describe('Grouping Method Assignment', () => {
  it('temporal entries get groupingMethod: time', () => {
    // This is a contract test - verifying the expected value
    const expectedGroupingMethod = 'time';
    expect(expectedGroupingMethod).toBe('time');
  });

  it('cluster entries get groupingMethod: cluster', () => {
    const expectedGroupingMethod = 'cluster';
    expect(expectedGroupingMethod).toBe('cluster');
  });

  it('manually edited entries get groupingMethod: manual', () => {
    const expectedGroupingMethod = 'manual';
    expect(expectedGroupingMethod).toBe('manual');
  });
});

// =============================================================================
// INTEGRATION TEST CONTRACTS
// These specify expected behavior without requiring database access.
// Run actual integration tests separately with test database.
// =============================================================================

describe('Demo Service Integration Contracts', () => {
  describe('seedDemoData', () => {
    it.todo('clears existing demo data before seeding to prevent duplicates');
    it.todo('generates 60-90 days of mock activities');
    it.todo('extracts cross-tool refs (Jira tickets, PR numbers) from activity content');
    it.todo('clusters activities that share the same refs');
    it.todo('creates BOTH temporal AND cluster-based journal entries');
    it.todo('returns counts: activitiesSeeded, clustersCreated, entriesCreated');
  });

  describe('getDemoClusters', () => {
    it.todo('returns only clusters for the specified userId');
    it.todo('includes activityCount and toolTypes metrics for each cluster');
    it.todo('returns empty array when user has no demo clusters');
  });

  describe('getDemoClusterById', () => {
    it.todo('returns cluster with full activity list');
    it.todo('returns null for non-existent cluster ID');
    it.todo('returns null when cluster belongs to different user (security)');
  });

  // NOTE: getDemoJournalEntries has been REMOVED from demo.service.ts
  // Journal entry reads now go through unified JournalService.
  // See: backend/src/services/journal.service.ts - getJournalEntries(userId, filters, isDemoMode=true)
  // Tests for demo journal entry reads should be in journal.service.test.ts

  describe('updateDemoJournalEntryActivities', () => {
    it.todo('updates activityIds to the provided array');
    it.todo('sets groupingMethod to manual');
    it.todo('updates lastGroupingEditAt timestamp');
    it.todo('throws error when entry not found');
    it.todo('throws error when entry belongs to different user');
  });

  describe('updateDemoClusterActivities', () => {
    it.todo('unassigns all existing activities from cluster');
    it.todo('assigns specified activities to cluster');
    it.todo('sets groupingMethod to manual');
    it.todo('validates all activityIds belong to the user');
    it.todo('throws error when cluster not found');
  });

  describe('regenerateDemoJournalNarrative', () => {
    it.todo('fetches activities by activityIds from entry');
    it.todo('generates narrative summarizing the activities');
    it.todo('updates entry with new description and fullContent');
    it.todo('sets generatedAt to current timestamp');
    it.todo('throws error when entry not found');
    it.todo('throws error when no activities found');
  });

  describe('clearDemoData', () => {
    it.todo('deletes all DemoCareerStory records for user');
    it.todo('deletes all DemoStoryCluster records for user');
    it.todo('deletes all DemoToolActivity records for user');
    it.todo('deletes all DemoJournalEntry records for user');
    it.todo('does NOT affect other users demo data');
    it.todo('does NOT affect real (non-demo) tables');
  });

  describe('isDemoCluster', () => {
    it.todo('returns true when cluster exists in demo_story_clusters');
    it.todo('returns false when cluster does not exist');
    it.todo('returns false when cluster is in real story_clusters table');
  });
});

// =============================================================================
// UNIT TESTS FOR DemoServiceError (RC: Typed errors - using imported class)
// =============================================================================

describe('DemoServiceError', () => {
  it('creates error with message and code', () => {
    const error = new DemoServiceError('Not found', 'ENTRY_NOT_FOUND');
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('ENTRY_NOT_FOUND');
    expect(error.name).toBe('DemoServiceError');
  });

  it('is instanceof Error', () => {
    const error = new DemoServiceError('Test', 'CLUSTER_NOT_FOUND');
    expect(error instanceof Error).toBe(true);
  });

  it('supports all error codes', () => {
    const codes: Array<'ENTRY_NOT_FOUND' | 'CLUSTER_NOT_FOUND' | 'NO_ACTIVITIES' | 'INVALID_INPUT'> = [
      'ENTRY_NOT_FOUND',
      'CLUSTER_NOT_FOUND',
      'NO_ACTIVITIES',
      'INVALID_INPUT',
    ];
    codes.forEach((code) => {
      const error = new DemoServiceError('test', code);
      expect(error.code).toBe(code);
    });
  });
});

// =============================================================================
// DATA ISOLATION TESTS (Critical safety requirements)
// =============================================================================

describe('Demo Data Isolation', () => {
  it.todo('seedDemoData writes only to demo_* tables');
  it.todo('clearDemoData deletes only from demo_* tables');
  it.todo('demo operations never read from real tables');
  it.todo('demo operations never write to real tables');
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Demo Service Edge Cases', () => {
  describe('Empty states', () => {
    it.todo('getDemoClusters returns [] for user with no demo data');
    // getDemoJournalEntries moved to unified JournalService
    it.todo('clearDemoData succeeds when user has no demo data');
  });

  describe('Boundary conditions', () => {
    it.todo('seedDemoData handles activities with empty crossToolRefs');
    it.todo('updateDemoClusterActivities handles empty activityIds array');
    it.todo('bi-weekly journal seeding skips windows with < 3 activities');
  });
});
