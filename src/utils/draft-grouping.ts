/**
 * Draft Story Grouping Utilities
 *
 * Group ActivityGroup[] (draft stories) by category or by time period
 * for the Timeline tab's Draft Stories view. Follows the same patterns
 * as library-grouping.ts and story-timeline.ts.
 */

import type { ActivityGroup } from '../types/activity';
import { getTimePeriod } from './story-timeline';
import { DRAFT_STORY_CATEGORIES, DRAFT_UNCATEGORIZED_META } from '../components/career-stories/constants';
import type React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftCategoryGroup {
  category: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  color: string;
  drafts: ActivityGroup[];
}

export interface DraftTimeGroup {
  label: string;
  sortKey: number;
  drafts: ActivityGroup[];
  /** Draft category values present in this time group */
  categories: Set<string>;
}

// ---------------------------------------------------------------------------
// groupDraftsByCategory
// ---------------------------------------------------------------------------

/**
 * Group draft stories by their storyMetadata.category.
 *
 * - Walks DRAFT_STORY_CATEGORIES in fixed display order, emitting non-empty groups.
 * - Appends an 'uncategorized' group if any drafts lack a recognized category.
 * - Sorts drafts within each group newest-first by storyMetadata.createdAt.
 */
export function groupDraftsByCategory(drafts: ActivityGroup[]): DraftCategoryGroup[] {
  if (drafts.length === 0) return [];

  // Bucket by category
  const buckets = new Map<string, ActivityGroup[]>();
  for (const draft of drafts) {
    const cat = draft.storyMetadata?.category ?? 'uncategorized';
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(draft);
  }

  // Sort within each bucket: newest first
  const sortNewestFirst = (a: ActivityGroup, b: ActivityGroup) => {
    const aTime = a.storyMetadata?.createdAt ? new Date(a.storyMetadata.createdAt).getTime() : 0;
    const bTime = b.storyMetadata?.createdAt ? new Date(b.storyMetadata.createdAt).getTime() : 0;
    return bTime - aTime;
  };
  for (const bucket of buckets.values()) {
    bucket.sort(sortNewestFirst);
  }

  // Build ordered result following DRAFT_STORY_CATEGORIES display order
  const groups: DraftCategoryGroup[] = [];

  for (const cat of DRAFT_STORY_CATEGORIES) {
    const bucket = buckets.get(cat.value);
    if (!bucket || bucket.length === 0) continue;
    groups.push({
      category: cat.value,
      label: cat.label,
      Icon: cat.Icon,
      color: cat.color,
      drafts: bucket,
    });
  }

  // Append uncategorized if present
  const uncategorized = buckets.get('uncategorized');
  if (uncategorized && uncategorized.length > 0) {
    groups.push({
      category: 'uncategorized',
      label: DRAFT_UNCATEGORIZED_META.label,
      Icon: DRAFT_UNCATEGORIZED_META.Icon,
      color: DRAFT_UNCATEGORIZED_META.color,
      drafts: uncategorized,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// groupDraftsByTimePeriod
// ---------------------------------------------------------------------------

/**
 * Group draft stories by time period (This Week / Last Week / quarter).
 *
 * - Uses storyMetadata.timeRangeEnd ?? timeRangeStart ?? createdAt as the reference date.
 * - Calls getTimePeriod(date) for consistent bucketing with other tabs.
 * - Tracks categories Set per group for category chips.
 * - Sorts groups reverse-chronologically, drafts newest-first within each group.
 */
export function groupDraftsByTimePeriod(drafts: ActivityGroup[]): DraftTimeGroup[] {
  if (drafts.length === 0) return [];

  const map = new Map<string, DraftTimeGroup>();

  for (const draft of drafts) {
    const meta = draft.storyMetadata;
    const dateStr = meta?.timeRangeEnd ?? meta?.timeRangeStart ?? meta?.createdAt;
    const date = dateStr ? new Date(dateStr) : new Date();
    const { label, sortKey } = getTimePeriod(date);

    if (!map.has(label)) {
      map.set(label, { label, sortKey, drafts: [], categories: new Set() });
    }
    const group = map.get(label)!;
    group.drafts.push(draft);
    if (meta?.category) group.categories.add(meta.category);
  }

  const groups = Array.from(map.values());

  // Reverse-chrono sort
  groups.sort((a, b) => b.sortKey - a.sortKey);

  // Newest-first within each group
  const sortNewestFirst = (a: ActivityGroup, b: ActivityGroup) => {
    const aDate = a.storyMetadata?.timeRangeEnd ?? a.storyMetadata?.timeRangeStart ?? a.storyMetadata?.createdAt;
    const bDate = b.storyMetadata?.timeRangeEnd ?? b.storyMetadata?.timeRangeStart ?? b.storyMetadata?.createdAt;
    const aTime = aDate ? new Date(aDate).getTime() : 0;
    const bTime = bDate ? new Date(bDate).getTime() : 0;
    return bTime - aTime;
  };
  for (const g of groups) {
    g.drafts.sort(sortNewestFirst);
  }

  return groups;
}
