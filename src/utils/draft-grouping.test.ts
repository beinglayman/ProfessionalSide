import { describe, it, expect } from 'vitest';
import { groupDraftsByCategory, groupDraftsByTimePeriod } from './draft-grouping';
import type { ActivityGroup } from '../types/activity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDraft(overrides: {
  category?: string | null;
  createdAt?: string;
  timeRangeStart?: string | null;
  timeRangeEnd?: string | null;
}): ActivityGroup {
  const id = `draft-${Math.random().toString(36).slice(2, 8)}`;
  return {
    key: id,
    label: `Draft ${id}`,
    count: 2,
    activities: [],
    storyMetadata: {
      id,
      title: `Draft Story ${id}`,
      description: null,
      timeRangeStart: overrides.timeRangeStart ?? null,
      timeRangeEnd: overrides.timeRangeEnd ?? null,
      category: overrides.category ?? null,
      skills: [],
      createdAt: overrides.createdAt ?? new Date().toISOString(),
      isPublished: false,
      type: 'journal_entry',
    },
  };
}

// ---------------------------------------------------------------------------
// groupDraftsByCategory
// ---------------------------------------------------------------------------

describe('groupDraftsByCategory', () => {
  it('returns empty array for empty input', () => {
    expect(groupDraftsByCategory([])).toEqual([]);
  });

  it('groups drafts by category with correct labels', () => {
    const drafts = [
      makeDraft({ category: 'feature' }),
      makeDraft({ category: 'feature' }),
      makeDraft({ category: 'bug-fix' }),
    ];
    const groups = groupDraftsByCategory(drafts);
    expect(groups).toHaveLength(2);
    expect(groups[0].category).toBe('feature');
    expect(groups[0].label).toBe('Features');
    expect(groups[0].drafts).toHaveLength(2);
    expect(groups[1].category).toBe('bug-fix');
    expect(groups[1].label).toBe('Bug Fixes');
    expect(groups[1].drafts).toHaveLength(1);
  });

  it('follows fixed display order from DRAFT_STORY_CATEGORIES', () => {
    const drafts = [
      makeDraft({ category: 'achievement' }),
      makeDraft({ category: 'feature' }),
      makeDraft({ category: 'optimization' }),
    ];
    const groups = groupDraftsByCategory(drafts);
    expect(groups.map(g => g.category)).toEqual(['feature', 'optimization', 'achievement']);
  });

  it('places uncategorized drafts at the end', () => {
    const drafts = [
      makeDraft({ category: null }),
      makeDraft({ category: 'feature' }),
    ];
    const groups = groupDraftsByCategory(drafts);
    expect(groups).toHaveLength(2);
    expect(groups[0].category).toBe('feature');
    expect(groups[1].category).toBe('uncategorized');
    expect(groups[1].label).toBe('Uncategorized');
  });

  it('handles all drafts being uncategorized', () => {
    const drafts = [
      makeDraft({ category: null }),
      makeDraft({ category: null }),
    ];
    const groups = groupDraftsByCategory(drafts);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('uncategorized');
    expect(groups[0].drafts).toHaveLength(2);
  });

  it('sorts drafts within group newest-first by createdAt', () => {
    const drafts = [
      makeDraft({ category: 'feature', createdAt: '2026-01-01T00:00:00Z' }),
      makeDraft({ category: 'feature', createdAt: '2026-02-01T00:00:00Z' }),
    ];
    const groups = groupDraftsByCategory(drafts);
    expect(groups[0].drafts[0].storyMetadata!.createdAt).toBe('2026-02-01T00:00:00Z');
    expect(groups[0].drafts[1].storyMetadata!.createdAt).toBe('2026-01-01T00:00:00Z');
  });

  it('populates Icon and color for each group', () => {
    const drafts = [makeDraft({ category: 'bug-fix' })];
    const groups = groupDraftsByCategory(drafts);
    expect(groups[0].Icon).toBeDefined();
    expect(groups[0].color).toBe('rose');
  });

  it('omits empty categories', () => {
    const drafts = [makeDraft({ category: 'feature' })];
    const groups = groupDraftsByCategory(drafts);
    // Only 1 group, not 8+ (all possible categories)
    expect(groups).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// groupDraftsByTimePeriod
// ---------------------------------------------------------------------------

describe('groupDraftsByTimePeriod', () => {
  it('returns empty array for empty input', () => {
    expect(groupDraftsByTimePeriod([])).toEqual([]);
  });

  it('groups drafts into correct time period buckets', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const old = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // ~3 months ago

    const drafts = [
      makeDraft({ timeRangeEnd: recent.toISOString() }),
      makeDraft({ timeRangeEnd: old.toISOString() }),
    ];
    const groups = groupDraftsByTimePeriod(drafts);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    // First group = most recent (highest sortKey)
    expect(groups[0].sortKey).toBeGreaterThan(groups[1].sortKey);
  });

  it('sorts groups reverse-chronologically', () => {
    const drafts = [
      makeDraft({ timeRangeEnd: '2025-03-15T00:00:00Z' }), // Q1 2025
      makeDraft({ timeRangeEnd: '2025-10-15T00:00:00Z' }), // Q4 2025
    ];
    const groups = groupDraftsByTimePeriod(drafts);
    expect(groups[0].label).toBe('Q4 2025');
    expect(groups[1].label).toBe('Q1 2025');
  });

  it('uses timeRangeEnd as primary date, falls back to timeRangeStart then createdAt', () => {
    const drafts = [
      makeDraft({ timeRangeEnd: null, timeRangeStart: '2025-06-15T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }),
    ];
    const groups = groupDraftsByTimePeriod(drafts);
    // Should use timeRangeStart (Q2 2025), not createdAt
    expect(groups[0].label).toBe('Q2 2025');
  });

  it('falls back to createdAt when no time range', () => {
    const drafts = [
      makeDraft({ timeRangeEnd: null, timeRangeStart: null, createdAt: '2025-04-15T00:00:00Z' }),
    ];
    const groups = groupDraftsByTimePeriod(drafts);
    expect(groups[0].label).toBe('Q2 2025');
  });

  it('populates categories set with draft categories', () => {
    const drafts = [
      makeDraft({ category: 'feature', timeRangeEnd: '2025-10-05T00:00:00Z' }),
      makeDraft({ category: 'bug-fix', timeRangeEnd: '2025-10-15T00:00:00Z' }),
    ];
    const groups = groupDraftsByTimePeriod(drafts);
    // Both in Q4 2025
    expect(groups[0].categories.has('feature')).toBe(true);
    expect(groups[0].categories.has('bug-fix')).toBe(true);
  });

  it('sorts drafts within group newest-first', () => {
    const drafts = [
      makeDraft({ timeRangeEnd: '2025-10-05T00:00:00Z' }),
      makeDraft({ timeRangeEnd: '2025-10-20T00:00:00Z' }),
    ];
    const groups = groupDraftsByTimePeriod(drafts);
    expect(groups[0].drafts[0].storyMetadata!.timeRangeEnd).toBe('2025-10-20T00:00:00Z');
    expect(groups[0].drafts[1].storyMetadata!.timeRangeEnd).toBe('2025-10-05T00:00:00Z');
  });

  it('handles drafts without storyMetadata gracefully', () => {
    const draft: ActivityGroup = {
      key: 'no-meta',
      label: 'No Meta',
      count: 0,
      activities: [],
      // no storyMetadata
    };
    const groups = groupDraftsByTimePeriod([draft]);
    // Should still produce a group (falls back to current date)
    expect(groups).toHaveLength(1);
    expect(groups[0].drafts).toHaveLength(1);
  });
});
