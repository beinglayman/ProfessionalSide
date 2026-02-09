/**
 * Story Timeline Utilities
 *
 * Shared helpers for grouping career stories by quarter (timeline view)
 * and by brag doc category (category view).
 *
 * Key principle: time = when the work happened, derived from
 * ToolActivity.timestamp, NOT story.publishedAt or story.createdAt.
 * Falls back to story.generatedAt only when no activity timestamps exist.
 */

import type { CareerStory, ToolActivity, BragDocCategory } from '../types/career-stories';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoryTimeRange {
  earliest: Date;
  latest: Date;
  midpoint: Date;
}

export interface QuarterGroup {
  /** e.g. "Q1 2026" */
  label: string;
  /** Numeric sort key — year * 100 + quarter (e.g. 202601) */
  sortKey: number;
  stories: Array<{ story: CareerStory; timeRange: StoryTimeRange }>;
  /** Set of BragDocCategory values present in this quarter */
  categories: Set<string>;
}

// ---------------------------------------------------------------------------
// Activity ID collection
// ---------------------------------------------------------------------------

/** Collect all unique activity IDs referenced by a set of stories. */
export function collectActivityIds(stories: CareerStory[]): Set<string> {
  const ids = new Set<string>();
  for (const story of stories) {
    for (const id of story.activityIds ?? []) ids.add(id);
    for (const section of Object.values(story.sections)) {
      for (const ev of section.evidence ?? []) {
        if (ev.activityId) ids.add(ev.activityId);
      }
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Time range computation
// ---------------------------------------------------------------------------

/**
 * Compute the time range for a story based on its linked activity timestamps.
 *
 * Priority: activity timestamps > story.generatedAt > Date.now()
 */
export function computeStoryTimeRange(
  story: CareerStory,
  activityMap: Map<string, ToolActivity>,
): StoryTimeRange {
  let earliest = Infinity;
  let latest = -Infinity;

  // Collect from top-level activityIds
  for (const id of story.activityIds ?? []) {
    const a = activityMap.get(id);
    if (a?.timestamp) {
      const t = new Date(a.timestamp).getTime();
      if (t < earliest) earliest = t;
      if (t > latest) latest = t;
    }
  }

  // Collect from section evidence
  for (const section of Object.values(story.sections)) {
    for (const ev of section.evidence ?? []) {
      if (ev.activityId) {
        const a = activityMap.get(ev.activityId);
        if (a?.timestamp) {
          const t = new Date(a.timestamp).getTime();
          if (t < earliest) earliest = t;
          if (t > latest) latest = t;
        }
      }
    }
  }

  // Fallback to generatedAt
  if (earliest === Infinity && story.generatedAt) {
    const t = new Date(story.generatedAt).getTime();
    earliest = t;
    latest = t;
  }

  // Ultimate fallback
  if (earliest === Infinity) {
    const now = Date.now();
    return { earliest: new Date(now), latest: new Date(now), midpoint: new Date(now) };
  }

  const midpoint = earliest + (latest - earliest) / 2;

  return {
    earliest: new Date(earliest),
    latest: new Date(latest),
    midpoint: new Date(midpoint),
  };
}

// ---------------------------------------------------------------------------
// Quarter helpers
// ---------------------------------------------------------------------------

/** Return quarter label and numeric sort key for a date. */
export function getQuarter(date: Date): { label: string; sortKey: number } {
  const month = date.getMonth();
  const year = date.getFullYear();
  const q = Math.floor(month / 3) + 1;
  return { label: `Q${q} ${year}`, sortKey: year * 100 + q };
}

// ---------------------------------------------------------------------------
// Time span formatting
// ---------------------------------------------------------------------------

/**
 * Format a date range as a human-readable span.
 *
 * - Same day → "Feb 5"
 * - Same year → "Jan 4 – Feb 12"
 * - Cross-year → "Nov 15, 2025 – Jan 4, 2026"
 *
 * Note: the same-day format omits the year — callers should ensure context
 * (e.g. a quarter header) makes the year clear.
 */
export function formatTimeSpan(start: Date, end: Date): string {
  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatFullDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (start.toDateString() === end.toDateString()) {
    return formatShortDate(end);
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }
  return `${formatFullDate(start)} – ${formatFullDate(end)}`;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group stories by the quarter of their activity midpoint.
 * Returns groups sorted reverse-chronologically, stories within each
 * group sorted newest-first.
 */
export function groupStoriesByQuarter(
  stories: CareerStory[],
  activityMap: Map<string, ToolActivity>,
): QuarterGroup[] {
  const map = new Map<string, QuarterGroup>();

  for (const story of stories) {
    const timeRange = computeStoryTimeRange(story, activityMap);
    const { label, sortKey } = getQuarter(timeRange.midpoint);

    if (!map.has(label)) {
      map.set(label, { label, sortKey, stories: [], categories: new Set() });
    }
    const group = map.get(label)!;
    group.stories.push({ story, timeRange });
    if (story.category) group.categories.add(story.category);
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => b.sortKey - a.sortKey);
  for (const g of groups) {
    g.stories.sort(
      (a, b) => b.timeRange.midpoint.getTime() - a.timeRange.midpoint.getTime(),
    );
  }

  return groups;
}

/** Group stories by brag doc category. Uncategorized stories go under 'other'.
 *  Within each category, stories are sorted newest-first by createdAt. */
export function groupStoriesByCategory(
  stories: CareerStory[],
): Map<BragDocCategory | 'other', CareerStory[]> {
  const map = new Map<BragDocCategory | 'other', CareerStory[]>();
  for (const story of stories) {
    const key = story.category ?? 'other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(story);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return map;
}
