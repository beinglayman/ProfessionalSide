/**
 * List Filter Configs — Factory Functions
 *
 * One factory per entity type. Each builds temporalChips, typedChips,
 * groupBy functions, and matchesSearch from live data.
 */

import type { Activity, ActivityGroup, ActivitySource } from '../types/activity';
import { SUPPORTED_SOURCES } from '../types/activity';
import type { CareerStory, ToolActivity, StoryDerivation } from '../types/career-stories';
import type { ListFilterConfig, FilterChip } from '../types/list-filters';
import { getSourceIcon } from '../components/journal/source-icons';
import { getTimePeriod, computeStoryTimeRange } from './story-timeline';
import {
  DRAFT_STORY_CATEGORIES,
  DRAFT_UNCATEGORIZED_META,
  BRAG_DOC_CATEGORIES,
  DERIVATION_TYPE_META,
  PACKET_TYPE_META,
} from '../components/career-stories/constants';
import {
  adaptActivityTemporalGroups,
  adaptDraftCategoryGroups,
  adaptDraftTimeGroups,
  adaptStoryTimeGroups,
  adaptStoryCategoryGroups,
  adaptLibraryTypeGroups,
  adaptLibraryTimeGroups,
} from './grouped-section-adapters';
import { groupActivitiesBySource } from './activity-grouping';

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

/**
 * Build config for Activities mode.
 *
 * Activities come pre-grouped from the backend into ActivityGroup[].
 * We flatten them for individual filtering, then re-group client-side.
 *
 * temporalChips come from backend groups. typedChips = source tools.
 * A Map<activityId, temporalBucket> is built for getTemporalKey lookups.
 */
export function makeActivitiesFilterConfig(
  groups: ActivityGroup[],
): { config: ListFilterConfig<Activity>; allActivities: Activity[] } {
  // Build temporal lookup map: activityId → backend group key
  const temporalMap = new Map<string, string>();
  for (const g of groups) {
    for (const a of g.activities) {
      temporalMap.set(a.id, g.key);
    }
  }

  // Flatten all activities
  const allActivities = groups.flatMap(g => g.activities);

  // Build temporal chips from backend groups
  const temporalChips: FilterChip[] = groups.map(g => ({
    key: g.key,
    label: g.label,
    count: g.count,
  }));

  // Build source chips
  const sourceCounts = new Map<string, number>();
  for (const a of allActivities) {
    sourceCounts.set(a.source, (sourceCounts.get(a.source) || 0) + 1);
  }
  const typedChips: FilterChip[] = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => {
      const info = SUPPORTED_SOURCES[source as ActivitySource];
      return {
        key: source,
        label: info?.displayName || source,
        count,
        Icon: getSourceIcon(source),
        iconColor: info?.color,
      };
    });

  const config: ListFilterConfig<Activity> = {
    entityName: 'activities',
    viewLabels: ['By Time', 'By Source'],
    temporalChips,
    typedChips,
    groupByTime: (items) => {
      // Re-create temporal groups from filtered items using the original group structure
      const byBucket = new Map<string, Activity[]>();
      for (const item of items) {
        const bucket = temporalMap.get(item.id) ?? 'other';
        if (!byBucket.has(bucket)) byBucket.set(bucket, []);
        byBucket.get(bucket)!.push(item);
      }
      // Maintain original group order
      return groups
        .filter(g => byBucket.has(g.key))
        .map(g => ({
          key: g.key,
          label: g.label,
          count: byBucket.get(g.key)!.length,
          items: byBucket.get(g.key)!,
        }));
    },
    groupByType: (items) => groupActivitiesBySource(items),
    matchesSearch: (item, query) => {
      return (
        item.title.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false) ||
        item.sourceId.toLowerCase().includes(query) ||
        item.crossToolRefs.some(ref => ref.toLowerCase().includes(query))
      );
    },
    getTemporalKey: (item) => temporalMap.get(item.id) ?? '',
    getTypedKey: (item) => item.source,
  };

  return { config, allActivities };
}

// ---------------------------------------------------------------------------
// Draft Stories
// ---------------------------------------------------------------------------

/**
 * Build config for Draft Stories mode.
 * Item type is ActivityGroup (with storyMetadata).
 */
export function makeDraftsFilterConfig(
  drafts: ActivityGroup[],
): ListFilterConfig<ActivityGroup> {
  // Build temporal chips using getTimePeriod
  const timeBuckets = new Map<string, number>();
  const draftTemporalMap = new Map<string, string>();
  for (const d of drafts) {
    const meta = d.storyMetadata;
    const dateStr = meta?.timeRangeEnd ?? meta?.timeRangeStart ?? meta?.createdAt;
    const date = dateStr ? new Date(dateStr) : new Date();
    const { label } = getTimePeriod(date);
    timeBuckets.set(label, (timeBuckets.get(label) || 0) + 1);
    draftTemporalMap.set(d.key, label);
  }
  const temporalChips: FilterChip[] = Array.from(timeBuckets.entries())
    .map(([label, count]) => ({ key: label, label, count }));

  // Build category chips
  const catCounts = new Map<string, number>();
  for (const d of drafts) {
    const cat = d.storyMetadata?.category ?? 'uncategorized';
    catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
  }
  const typedChips: FilterChip[] = DRAFT_STORY_CATEGORIES.map(cat => {
    const count = catCounts.get(cat.value) ?? 0;
    return {
      key: cat.value,
      label: cat.label,
      count,
      Icon: cat.Icon,
      color: cat.color,
      disabled: count === 0,
    };
  });
  const uncatCount = catCounts.get('uncategorized') ?? 0;
  typedChips.push({
    key: 'uncategorized',
    label: DRAFT_UNCATEGORIZED_META.label,
    count: uncatCount,
    Icon: DRAFT_UNCATEGORIZED_META.Icon,
    color: DRAFT_UNCATEGORIZED_META.color,
    disabled: uncatCount === 0,
  });

  return {
    entityName: 'draft stories',
    viewLabels: ['By Time', 'By Type'],
    temporalChips,
    typedChips,
    groupByTime: (items) => adaptDraftTimeGroups(items),
    groupByType: (items) => adaptDraftCategoryGroups(items),
    matchesSearch: (item, query) => {
      const meta = item.storyMetadata;
      return (
        (meta?.title?.toLowerCase().includes(query) ?? false) ||
        (meta?.description?.toLowerCase().includes(query) ?? false) ||
        (meta?.topics?.some(t => t.toLowerCase().includes(query)) ?? false) ||
        item.label.toLowerCase().includes(query)
      );
    },
    getTemporalKey: (item) => draftTemporalMap.get(item.key) ?? '',
    getTypedKey: (item) => item.storyMetadata?.category ?? 'uncategorized',
  };
}

// ---------------------------------------------------------------------------
// Career Stories
// ---------------------------------------------------------------------------

/**
 * Build config for Career Stories tab.
 */
export function makeStoriesFilterConfig(
  stories: CareerStory[],
  activityMap: Map<string, ToolActivity>,
): ListFilterConfig<CareerStory> {
  // Build temporal chips
  const timeBuckets = new Map<string, number>();
  const storyTemporalMap = new Map<string, string>();
  for (const s of stories) {
    const timeRange = computeStoryTimeRange(s, activityMap);
    const { label } = getTimePeriod(timeRange.midpoint);
    timeBuckets.set(label, (timeBuckets.get(label) || 0) + 1);
    storyTemporalMap.set(s.id, label);
  }
  const temporalChips: FilterChip[] = Array.from(timeBuckets.entries())
    .map(([label, count]) => ({ key: label, label, count }));

  // Build category chips
  const catCounts = new Map<string, number>();
  for (const s of stories) {
    const cat = s.category ?? 'other';
    catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
  }
  const typedChips: FilterChip[] = BRAG_DOC_CATEGORIES.map(cat => {
    const count = catCounts.get(cat.value) ?? 0;
    return { key: cat.value, label: cat.label, count, disabled: count === 0 };
  });
  const otherCount = catCounts.get('other') ?? 0;
  typedChips.push({ key: 'other', label: 'Other', count: otherCount, disabled: otherCount === 0 });

  return {
    entityName: 'career stories',
    viewLabels: ['By Time', 'By Category'],
    temporalChips,
    typedChips,
    groupByTime: (items) => adaptStoryTimeGroups(items, activityMap),
    groupByType: (items) => adaptStoryCategoryGroups(items),
    matchesSearch: (item, query) => {
      return (
        item.title.toLowerCase().includes(query) ||
        Object.values(item.sections).some(sec => sec.summary?.toLowerCase().includes(query))
      );
    },
    getTemporalKey: (item) => storyTemporalMap.get(item.id) ?? '',
    getTypedKey: (item) => item.category ?? 'other',
  };
}

// ---------------------------------------------------------------------------
// Playbook (Library)
// ---------------------------------------------------------------------------

/**
 * Build config for Playbook tab (renamed from Library).
 */
export function makePlaybookFilterConfig(
  items: StoryDerivation[],
): ListFilterConfig<StoryDerivation> {
  // Build temporal chips
  const timeBuckets = new Map<string, number>();
  const itemTemporalMap = new Map<string, string>();
  for (const item of items) {
    const { label } = getTimePeriod(new Date(item.createdAt));
    timeBuckets.set(label, (timeBuckets.get(label) || 0) + 1);
    itemTemporalMap.set(item.id, label);
  }
  const temporalChips: FilterChip[] = Array.from(timeBuckets.entries())
    .map(([label, count]) => ({ key: label, label, count }));

  // Build type chips
  const typeCounts = new Map<string, number>();
  for (const item of items) {
    const key = `${item.kind}:${item.type}`;
    typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
  }
  const typedChips: FilterChip[] = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([typeKey, count]) => {
      const [kind, type] = typeKey.split(':');
      const meta = kind === 'single'
        ? DERIVATION_TYPE_META[type as keyof typeof DERIVATION_TYPE_META]
        : PACKET_TYPE_META[type as keyof typeof PACKET_TYPE_META];
      return {
        key: typeKey,
        label: meta?.label ?? type,
        count,
        Icon: meta?.Icon,
        color: meta?.color,
      };
    });

  return {
    entityName: 'playbook items',
    viewLabels: ['By Time', 'By Type'],
    temporalChips,
    typedChips,
    groupByTime: (items) => adaptLibraryTimeGroups(items),
    groupByType: (items) => adaptLibraryTypeGroups(items),
    matchesSearch: (item, query) => {
      return item.text.toLowerCase().includes(query);
    },
    getTemporalKey: (item) => itemTemporalMap.get(item.id) ?? '',
    getTypedKey: (item) => `${item.kind}:${item.type}`,
  };
}
