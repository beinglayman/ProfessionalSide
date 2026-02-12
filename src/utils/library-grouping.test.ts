import { describe, it, expect } from 'vitest';
import { groupLibraryByType, groupLibraryByTimePeriod } from './library-grouping';
import type { StoryDerivation } from '../types/career-stories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<StoryDerivation> & { kind: 'single' | 'packet'; type: string }): StoryDerivation {
  return {
    id: `id-${Math.random().toString(36).slice(2, 8)}`,
    storyIds: ['story-1'],
    text: 'sample text',
    charCount: 100,
    wordCount: 20,
    creditCost: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// groupLibraryByType
// ---------------------------------------------------------------------------

describe('groupLibraryByType', () => {
  it('returns empty array for empty input', () => {
    expect(groupLibraryByType([])).toEqual([]);
  });

  it('groups items by kind:type composite key', () => {
    const items = [
      makeItem({ kind: 'single', type: 'interview' }),
      makeItem({ kind: 'single', type: 'interview' }),
      makeItem({ kind: 'single', type: 'resume' }),
    ];
    const groups = groupLibraryByType(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].typeKey).toBe('single:interview');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].typeKey).toBe('single:resume');
    expect(groups[1].items).toHaveLength(1);
  });

  it('singles come before packets in fixed display order', () => {
    const items = [
      makeItem({ kind: 'packet', type: 'promotion' }),
      makeItem({ kind: 'single', type: 'resume' }),
      makeItem({ kind: 'single', type: 'interview' }),
    ];
    const groups = groupLibraryByType(items);
    expect(groups.map(g => g.typeKey)).toEqual([
      'single:interview',
      'single:resume',
      'packet:promotion',
    ]);
  });

  it('maintains fixed single order: interview → linkedin → resume → ...', () => {
    const items = [
      makeItem({ kind: 'single', type: 'team-share' }),
      makeItem({ kind: 'single', type: 'interview' }),
      makeItem({ kind: 'single', type: 'linkedin' }),
      makeItem({ kind: 'single', type: 'resume' }),
    ];
    const groups = groupLibraryByType(items);
    expect(groups.map(g => g.typeKey)).toEqual([
      'single:interview',
      'single:linkedin',
      'single:resume',
      'single:team-share',
    ]);
  });

  it('separates overlapping type keys by kind (self-assessment in both)', () => {
    const items = [
      makeItem({ kind: 'single', type: 'self-assessment' }),
      makeItem({ kind: 'packet', type: 'self-assessment' }),
    ];
    const groups = groupLibraryByType(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].typeKey).toBe('single:self-assessment');
    expect(groups[1].typeKey).toBe('packet:self-assessment');
  });

  it('sorts items within group newest-first', () => {
    const older = makeItem({ kind: 'single', type: 'interview', createdAt: '2026-01-01T00:00:00Z' });
    const newer = makeItem({ kind: 'single', type: 'interview', createdAt: '2026-02-01T00:00:00Z' });
    const groups = groupLibraryByType([older, newer]);
    expect(groups[0].items[0].createdAt).toBe('2026-02-01T00:00:00Z');
    expect(groups[0].items[1].createdAt).toBe('2026-01-01T00:00:00Z');
  });

  it('omits empty groups', () => {
    const items = [makeItem({ kind: 'single', type: 'interview' })];
    const groups = groupLibraryByType(items);
    // Only 1 group, not 12 (all possible types)
    expect(groups).toHaveLength(1);
  });

  it('populates label, Icon, and color from metadata', () => {
    const items = [makeItem({ kind: 'single', type: 'interview' })];
    const groups = groupLibraryByType(items);
    expect(groups[0].label).toBe('Interview Answer');
    expect(groups[0].color).toBe('indigo');
    expect(groups[0].Icon).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// groupLibraryByTimePeriod
// ---------------------------------------------------------------------------

describe('groupLibraryByTimePeriod', () => {
  it('returns empty array for empty input', () => {
    expect(groupLibraryByTimePeriod([])).toEqual([]);
  });

  it('groups items into correct time period buckets', () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const items = [
      makeItem({ kind: 'single', type: 'interview', createdAt: oneWeekAgo.toISOString() }),
      makeItem({ kind: 'single', type: 'resume', createdAt: threeMonthsAgo.toISOString() }),
    ];
    const groups = groupLibraryByTimePeriod(items);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    // First group should be most recent (highest sortKey)
    expect(groups[0].sortKey).toBeGreaterThan(groups[1].sortKey);
  });

  it('sorts groups reverse-chronologically', () => {
    const items = [
      makeItem({ kind: 'single', type: 'interview', createdAt: '2025-03-15T00:00:00Z' }), // Q1 2025
      makeItem({ kind: 'single', type: 'resume', createdAt: '2025-10-15T00:00:00Z' }),   // Q4 2025
    ];
    const groups = groupLibraryByTimePeriod(items);
    expect(groups[0].label).toBe('Q4 2025');
    expect(groups[1].label).toBe('Q1 2025');
  });

  it('sorts items within group newest-first', () => {
    const items = [
      makeItem({ kind: 'single', type: 'interview', createdAt: '2025-10-05T00:00:00Z' }),
      makeItem({ kind: 'single', type: 'resume', createdAt: '2025-10-20T00:00:00Z' }),
    ];
    const groups = groupLibraryByTimePeriod(items);
    expect(groups[0].items[0].createdAt).toBe('2025-10-20T00:00:00Z');
    expect(groups[0].items[1].createdAt).toBe('2025-10-05T00:00:00Z');
  });

  it('populates types set with kind:type entries', () => {
    const items = [
      makeItem({ kind: 'single', type: 'interview', createdAt: '2025-10-05T00:00:00Z' }),
      makeItem({ kind: 'packet', type: 'promotion', createdAt: '2025-10-15T00:00:00Z' }),
    ];
    const groups = groupLibraryByTimePeriod(items);
    // Both are in Q4 2025
    expect(groups[0].types.has('single:interview')).toBe(true);
    expect(groups[0].types.has('packet:promotion')).toBe(true);
  });

  it('items with same createdAt go into same group', () => {
    const items = [
      makeItem({ kind: 'single', type: 'interview', createdAt: '2025-10-15T00:00:00Z' }),
      makeItem({ kind: 'single', type: 'resume', createdAt: '2025-10-15T00:00:00Z' }),
    ];
    const groups = groupLibraryByTimePeriod(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });
});
