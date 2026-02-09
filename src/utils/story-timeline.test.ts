import { describe, it, expect } from 'vitest';
import {
  collectActivityIds,
  computeStoryTimeRange,
  getQuarter,
  getTimePeriod,
  formatTimeSpan,
  groupStoriesByTimePeriod,
  groupStoriesByCategory,
} from './story-timeline';
import type { CareerStory, ToolActivity } from '../types/career-stories';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeActivity(id: string, timestamp: string): ToolActivity {
  return {
    id,
    userId: 'user-1',
    source: 'github',
    sourceId: `src-${id}`,
    sourceUrl: null,
    title: `Activity ${id}`,
    description: null,
    timestamp,
    clusterId: null,
    crossToolRefs: [],
    rawData: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeStory(overrides: Partial<CareerStory> = {}): CareerStory {
  return {
    id: 'story-1',
    userId: 'user-1',
    sourceMode: 'production',
    title: 'Test Story',
    framework: 'STAR',
    sections: {},
    activityIds: [],
    needsRegeneration: false,
    generatedAt: '2026-01-15T12:00:00Z',
    isPublished: true,
    visibility: 'network',
    publishedAt: '2026-01-20T12:00:00Z',
    ...overrides,
  };
}

function buildActivityMap(activities: ToolActivity[]): Map<string, ToolActivity> {
  const map = new Map<string, ToolActivity>();
  for (const a of activities) map.set(a.id, a);
  return map;
}

// ---------------------------------------------------------------------------
// collectActivityIds
// ---------------------------------------------------------------------------

describe('collectActivityIds', () => {
  it('returns empty set for empty stories array', () => {
    const ids = collectActivityIds([]);
    expect(ids.size).toBe(0);
  });

  it('collects from activityIds', () => {
    const story = makeStory({ activityIds: ['a1', 'a2'] });
    const ids = collectActivityIds([story]);
    expect(ids).toEqual(new Set(['a1', 'a2']));
  });

  it('collects from section evidence', () => {
    const story = makeStory({
      activityIds: [],
      sections: {
        situation: {
          summary: 'test',
          evidence: [{ activityId: 'e1' }, { activityId: 'e2' }],
        },
      },
    });
    const ids = collectActivityIds([story]);
    expect(ids).toEqual(new Set(['e1', 'e2']));
  });

  it('deduplicates across activityIds and evidence', () => {
    const story = makeStory({
      activityIds: ['a1', 'a2'],
      sections: {
        situation: {
          summary: 'test',
          evidence: [{ activityId: 'a1' }, { activityId: 'a3' }],
        },
      },
    });
    const ids = collectActivityIds([story]);
    expect(ids).toEqual(new Set(['a1', 'a2', 'a3']));
  });

  it('collects across multiple stories', () => {
    const stories = [
      makeStory({ id: 's1', activityIds: ['a1'] }),
      makeStory({ id: 's2', activityIds: ['a2'] }),
    ];
    const ids = collectActivityIds(stories);
    expect(ids).toEqual(new Set(['a1', 'a2']));
  });

  it('handles stories with no activityIds and no evidence', () => {
    const story = makeStory({ activityIds: [], sections: { result: { summary: 'done' } } });
    const ids = collectActivityIds([story]);
    expect(ids.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeStoryTimeRange
// ---------------------------------------------------------------------------

describe('computeStoryTimeRange', () => {
  it('computes range from activity timestamps', () => {
    const a1 = makeActivity('a1', '2025-11-15T10:00:00Z');
    const a2 = makeActivity('a2', '2026-01-10T10:00:00Z');
    const story = makeStory({ activityIds: ['a1', 'a2'] });
    const map = buildActivityMap([a1, a2]);

    const range = computeStoryTimeRange(story, map);
    expect(range.earliest.toISOString()).toBe('2025-11-15T10:00:00.000Z');
    expect(range.latest.toISOString()).toBe('2026-01-10T10:00:00.000Z');
    // Midpoint: halfway between Nov 15 and Jan 10
    expect(range.midpoint.getTime()).toBe(
      new Date('2025-11-15T10:00:00Z').getTime() +
        (new Date('2026-01-10T10:00:00Z').getTime() - new Date('2025-11-15T10:00:00Z').getTime()) / 2,
    );
  });

  it('includes evidence activity timestamps', () => {
    const a1 = makeActivity('a1', '2026-02-01T10:00:00Z');
    const a2 = makeActivity('a2', '2026-03-01T10:00:00Z');
    const story = makeStory({
      activityIds: ['a1'],
      sections: {
        action: { summary: 'built it', evidence: [{ activityId: 'a2' }] },
      },
    });
    const map = buildActivityMap([a1, a2]);

    const range = computeStoryTimeRange(story, map);
    expect(range.earliest.toISOString()).toBe('2026-02-01T10:00:00.000Z');
    expect(range.latest.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  it('falls back to generatedAt when no activities in map', () => {
    const story = makeStory({
      activityIds: ['a1'],
      generatedAt: '2026-01-15T12:00:00Z',
    });
    const emptyMap = new Map<string, ToolActivity>();

    const range = computeStoryTimeRange(story, emptyMap);
    expect(range.earliest.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    expect(range.latest.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    expect(range.midpoint.toISOString()).toBe('2026-01-15T12:00:00.000Z');
  });

  it('falls back to Date.now when no activities and no generatedAt', () => {
    const story = makeStory({ activityIds: [], generatedAt: '' });
    const emptyMap = new Map<string, ToolActivity>();
    const before = Date.now();
    const range = computeStoryTimeRange(story, emptyMap);
    const after = Date.now();

    expect(range.earliest.getTime()).toBeGreaterThanOrEqual(before);
    expect(range.earliest.getTime()).toBeLessThanOrEqual(after);
  });

  it('handles single activity (earliest === latest)', () => {
    const a1 = makeActivity('a1', '2026-02-05T10:00:00Z');
    const story = makeStory({ activityIds: ['a1'] });
    const map = buildActivityMap([a1]);

    const range = computeStoryTimeRange(story, map);
    expect(range.earliest.toISOString()).toBe('2026-02-05T10:00:00.000Z');
    expect(range.latest.toISOString()).toBe('2026-02-05T10:00:00.000Z');
    expect(range.midpoint.toISOString()).toBe('2026-02-05T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// getQuarter
// ---------------------------------------------------------------------------

describe('getQuarter', () => {
  it.each([
    ['2026-01-15', 'Q1 2026', 202601],
    ['2026-02-28', 'Q1 2026', 202601],
    ['2026-03-31', 'Q1 2026', 202601],
    ['2026-04-01', 'Q2 2026', 202602],
    ['2026-06-30', 'Q2 2026', 202602],
    ['2026-07-01', 'Q3 2026', 202603],
    ['2026-10-01', 'Q4 2026', 202604],
    ['2025-12-15', 'Q4 2025', 202504],
  ])('getQuarter(%s) → %s (sortKey %i)', (dateStr, expectedLabel, expectedSortKey) => {
    const { label, sortKey } = getQuarter(new Date(dateStr));
    expect(label).toBe(expectedLabel);
    expect(sortKey).toBe(expectedSortKey);
  });
});

// ---------------------------------------------------------------------------
// getTimePeriod
// ---------------------------------------------------------------------------

describe('getTimePeriod', () => {
  it('returns "This Week" for a date in the current week', () => {
    const now = new Date();
    const { label, sortKey } = getTimePeriod(now);
    expect(label).toBe('This Week');
    expect(sortKey).toBe(999999);
  });

  it('returns "Last Week" for a date 7 days ago', () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const { label, sortKey } = getTimePeriod(lastWeek);
    expect(label).toBe('Last Week');
    expect(sortKey).toBe(999998);
  });

  it('returns quarter label for older dates', () => {
    const oldDate = new Date('2025-06-15T10:00:00Z');
    const { label, sortKey } = getTimePeriod(oldDate);
    expect(label).toBe('Q2 2025');
    expect(sortKey).toBe(202502);
  });

  it('sorts This Week before Last Week before quarters', () => {
    const thisWeek = getTimePeriod(new Date());
    const lastWeek = getTimePeriod(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const oldQ = getTimePeriod(new Date('2025-06-15T10:00:00Z'));
    expect(thisWeek.sortKey).toBeGreaterThan(lastWeek.sortKey);
    expect(lastWeek.sortKey).toBeGreaterThan(oldQ.sortKey);
  });
});

// ---------------------------------------------------------------------------
// formatTimeSpan
// ---------------------------------------------------------------------------

describe('formatTimeSpan', () => {
  it('same day → short format (no year)', () => {
    const d = new Date('2026-02-05T10:00:00Z');
    const result = formatTimeSpan(d, d);
    expect(result).toMatch(/Feb\s+5/);
  });

  it('same year → short range', () => {
    const start = new Date('2026-01-04T10:00:00Z');
    const end = new Date('2026-02-12T10:00:00Z');
    const result = formatTimeSpan(start, end);
    expect(result).toMatch(/Jan\s+4/);
    expect(result).toContain('–');
    expect(result).toMatch(/Feb\s+12/);
    // Should not contain year when same year
    expect(result).not.toContain('2026');
  });

  it('cross-year → includes years on both dates', () => {
    const start = new Date('2025-11-15T10:00:00Z');
    const end = new Date('2026-01-04T10:00:00Z');
    const result = formatTimeSpan(start, end);
    expect(result).toContain('2025');
    expect(result).toContain('2026');
    expect(result).toContain('–');
  });
});

// ---------------------------------------------------------------------------
// groupStoriesByTimePeriod
// ---------------------------------------------------------------------------

describe('groupStoriesByTimePeriod', () => {
  it('returns empty array for empty stories', () => {
    const groups = groupStoriesByTimePeriod([], new Map());
    expect(groups).toEqual([]);
  });

  it('groups a single story into one quarter', () => {
    const a1 = makeActivity('a1', '2026-01-15T10:00:00Z');
    const story = makeStory({ activityIds: ['a1'], category: 'projects-impact' });
    const map = buildActivityMap([a1]);

    const groups = groupStoriesByTimePeriod([story], map);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Q1 2026');
    expect(groups[0].stories).toHaveLength(1);
    expect(groups[0].categories.has('projects-impact')).toBe(true);
  });

  it('groups stories into different quarters', () => {
    const a1 = makeActivity('a1', '2025-10-15T10:00:00Z');
    const a2 = makeActivity('a2', '2026-01-15T10:00:00Z');
    const s1 = makeStory({ id: 's1', activityIds: ['a1'] });
    const s2 = makeStory({ id: 's2', activityIds: ['a2'] });
    const map = buildActivityMap([a1, a2]);

    const groups = groupStoriesByTimePeriod([s1, s2], map);
    expect(groups).toHaveLength(2);
    // Reverse chronological
    expect(groups[0].label).toBe('Q1 2026');
    expect(groups[1].label).toBe('Q4 2025');
  });

  it('sorts groups reverse-chronologically', () => {
    const activities = [
      makeActivity('a1', '2025-04-01T10:00:00Z'), // Q2 2025
      makeActivity('a2', '2025-10-01T10:00:00Z'), // Q4 2025
      makeActivity('a3', '2026-01-01T10:00:00Z'), // Q1 2026
    ];
    const stories = [
      makeStory({ id: 's1', activityIds: ['a1'] }),
      makeStory({ id: 's2', activityIds: ['a2'] }),
      makeStory({ id: 's3', activityIds: ['a3'] }),
    ];
    const map = buildActivityMap(activities);

    const groups = groupStoriesByTimePeriod(stories, map);
    expect(groups.map((g) => g.label)).toEqual(['Q1 2026', 'Q4 2025', 'Q2 2025']);
  });

  it('sorts stories within group by newest midpoint first', () => {
    // Use dates old enough to always be in quarter grouping
    const a1 = makeActivity('a1', '2025-04-05T10:00:00Z');
    const a2 = makeActivity('a2', '2025-05-20T10:00:00Z');
    const s1 = makeStory({ id: 's1', activityIds: ['a1'] });
    const s2 = makeStory({ id: 's2', activityIds: ['a2'] });
    const map = buildActivityMap([a1, a2]);

    const groups = groupStoriesByTimePeriod([s1, s2], map);
    expect(groups).toHaveLength(1);
    expect(groups[0].stories[0].story.id).toBe('s2'); // newer first
    expect(groups[0].stories[1].story.id).toBe('s1');
  });

  it('assigns cross-quarter story to midpoint quarter', () => {
    // Nov 15, 2025 – Jan 15, 2026 → midpoint ≈ Dec 15, 2025 → Q4 2025
    const a1 = makeActivity('a1', '2025-11-15T10:00:00Z');
    const a2 = makeActivity('a2', '2026-01-15T10:00:00Z');
    const story = makeStory({ activityIds: ['a1', 'a2'] });
    const map = buildActivityMap([a1, a2]);

    const groups = groupStoriesByTimePeriod([story], map);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Q4 2025');
  });

  it('assigns story with midpoint in April to Q2', () => {
    // Mar 15 – May 15, 2025 → midpoint = April 15 → Q2 2025 (old enough to be quarter)
    const a1 = makeActivity('a1', '2025-03-15T00:00:00Z');
    const a2 = makeActivity('a2', '2025-05-15T00:00:00Z');
    const story = makeStory({ activityIds: ['a1', 'a2'] });
    const map = buildActivityMap([a1, a2]);

    const groups = groupStoriesByTimePeriod([story], map);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Q2 2025');
  });

  it('tracks categories in each group', () => {
    // Use dates old enough to always be in the same quarter
    const a1 = makeActivity('a1', '2025-04-10T10:00:00Z');
    const a2 = makeActivity('a2', '2025-05-10T10:00:00Z');
    const s1 = makeStory({ id: 's1', activityIds: ['a1'], category: 'projects-impact' });
    const s2 = makeStory({ id: 's2', activityIds: ['a2'], category: 'leadership' });
    const map = buildActivityMap([a1, a2]);

    const groups = groupStoriesByTimePeriod([s1, s2], map);
    expect(groups[0].categories).toEqual(new Set(['projects-impact', 'leadership']));
  });

  it('handles stories with no category', () => {
    const a1 = makeActivity('a1', '2025-04-10T10:00:00Z');
    const story = makeStory({ activityIds: ['a1'], category: null });
    const map = buildActivityMap([a1]);

    const groups = groupStoriesByTimePeriod([story], map);
    expect(groups[0].categories.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// groupStoriesByCategory
// ---------------------------------------------------------------------------

describe('groupStoriesByCategory', () => {
  it('returns empty map for empty stories', () => {
    const result = groupStoriesByCategory([]);
    expect(result.size).toBe(0);
  });

  it('groups stories by category', () => {
    const stories = [
      makeStory({ id: 's1', category: 'projects-impact' }),
      makeStory({ id: 's2', category: 'projects-impact' }),
      makeStory({ id: 's3', category: 'leadership' }),
    ];
    const result = groupStoriesByCategory(stories);
    expect(result.get('projects-impact')).toHaveLength(2);
    expect(result.get('leadership')).toHaveLength(1);
  });

  it('puts uncategorized stories under "other"', () => {
    const stories = [
      makeStory({ id: 's1', category: null }),
      makeStory({ id: 's2', category: undefined }),
    ];
    const result = groupStoriesByCategory(stories);
    expect(result.get('other')).toHaveLength(2);
  });

  it('mixes categorized and uncategorized', () => {
    const stories = [
      makeStory({ id: 's1', category: 'growth' }),
      makeStory({ id: 's2', category: null }),
    ];
    const result = groupStoriesByCategory(stories);
    expect(result.get('growth')).toHaveLength(1);
    expect(result.get('other')).toHaveLength(1);
  });
});
