/**
 * Grouped Section Adapters
 *
 * Thin wrappers around existing grouping functions that produce GroupedSection<T>.
 * This avoids rewriting grouping logic while making all outputs compatible
 * with CollapsibleGroup and useListFilters.
 */

import type { Activity, ActivityGroup } from '../types/activity';
import type { CareerStory, ToolActivity, StoryDerivation } from '../types/career-stories';
import type { GroupedSection } from '../types/list-filters';

import { groupDraftsByCategory, groupDraftsByTimePeriod } from './draft-grouping';
import {
  groupStoriesByTimePeriod,
  groupStoriesByCategory,
  formatTimeSpan,
} from './story-timeline';
import { groupLibraryByType, groupLibraryByTimePeriod } from './library-grouping';
import { BRAG_DOC_CATEGORIES, DRAFT_STORY_CATEGORIES, DERIVATION_TYPE_META, PACKET_TYPE_META } from '../components/career-stories/constants';

// ---------------------------------------------------------------------------
// Activities: adapt backend ActivityGroup[] → GroupedSection<Activity>
// ---------------------------------------------------------------------------

/**
 * Wrap backend temporal ActivityGroup[] into GroupedSection<Activity>[].
 * Each backend group becomes a section; items are the group's activities.
 */
export function adaptActivityTemporalGroups(groups: ActivityGroup[]): GroupedSection<Activity>[] {
  return groups.map(g => ({
    key: g.key,
    label: g.label,
    count: g.count,
    items: g.activities,
    collapsedSummary: generateSourceSummary(g.activities),
  }));
}

/** Concise source breakdown for collapsed summary. */
function generateSourceSummary(activities: Activity[]): string {
  if (activities.length === 0) return '';
  const counts: Record<string, number> = {};
  for (const a of activities) {
    counts[a.source] = (counts[a.source] || 0) + 1;
  }
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const parts = sorted.map(([source, count]) => `${count} ${source}`);
  const remaining = Object.keys(counts).length - 3;
  if (remaining > 0) parts.push(`+${remaining} more`);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Draft Stories: adapt DraftCategoryGroup/DraftTimeGroup → GroupedSection<ActivityGroup>
// ---------------------------------------------------------------------------

export function adaptDraftCategoryGroups(drafts: ActivityGroup[]): GroupedSection<ActivityGroup>[] {
  return groupDraftsByCategory(drafts).map(g => ({
    key: g.category,
    label: g.label,
    count: g.drafts.length,
    items: g.drafts,
    Icon: g.Icon,
    color: g.color,
    collapsedSummary: g.drafts.slice(0, 2).map(d => d.storyMetadata?.title ?? d.label).join(', ')
      + (g.drafts.length > 2 ? ` +${g.drafts.length - 2}` : ''),
  }));
}

export function adaptDraftTimeGroups(drafts: ActivityGroup[]): GroupedSection<ActivityGroup>[] {
  return groupDraftsByTimePeriod(drafts).map(g => ({
    key: g.label,
    label: g.label,
    count: g.drafts.length,
    items: g.drafts,
    collapsedTags: Array.from(g.categories)
      .map(cat => {
        const found = DRAFT_STORY_CATEGORIES.find(c => c.value === cat);
        return found?.label ?? cat;
      }),
  }));
}

// ---------------------------------------------------------------------------
// Career Stories: adapt TimeGroup/Map → GroupedSection<CareerStory>
// ---------------------------------------------------------------------------

export function adaptStoryTimeGroups(
  stories: CareerStory[],
  activityMap: Map<string, ToolActivity>,
): GroupedSection<CareerStory>[] {
  return groupStoriesByTimePeriod(stories, activityMap).map(g => ({
    key: g.label,
    label: g.label,
    count: g.stories.length,
    items: g.stories.map(s => s.story),
    collapsedTags: g.categories.size > 0
      ? BRAG_DOC_CATEGORIES.filter(c => g.categories.has(c.value)).map(c => c.label)
      : undefined,
  }));
}

export function adaptStoryCategoryGroups(stories: CareerStory[]): GroupedSection<CareerStory>[] {
  const byCategory = groupStoriesByCategory(stories);
  const groups: GroupedSection<CareerStory>[] = [];

  for (const cat of BRAG_DOC_CATEGORIES) {
    const catStories = byCategory.get(cat.value) ?? [];
    groups.push({
      key: cat.value,
      label: cat.label,
      count: catStories.length,
      items: catStories,
      description: cat.description,
      collapsedSummary: catStories.length > 0
        ? catStories.slice(0, 2).map(s => s.title).join(', ') + (catStories.length > 2 ? ` +${catStories.length - 2}` : '')
        : undefined,
    });
  }

  // Append "Other" if present
  const otherStories = byCategory.get('other');
  if (otherStories && otherStories.length > 0) {
    groups.push({
      key: 'other',
      label: 'Other',
      count: otherStories.length,
      items: otherStories,
      description: 'Uncategorized stories',
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Library (Playbook): adapt LibraryTypeGroup/LibraryTimeGroup → GroupedSection<StoryDerivation>
// ---------------------------------------------------------------------------

export function adaptLibraryTypeGroups(items: StoryDerivation[]): GroupedSection<StoryDerivation>[] {
  return groupLibraryByType(items).map(g => ({
    key: g.typeKey,
    label: g.label,
    count: g.items.length,
    items: g.items,
    Icon: g.Icon,
    color: g.color,
    collapsedSummary: g.items.length > 0
      ? `newest: ${new Date(g.items[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : undefined,
  }));
}

export function adaptLibraryTimeGroups(items: StoryDerivation[]): GroupedSection<StoryDerivation>[] {
  return groupLibraryByTimePeriod(items).map(g => ({
    key: g.label,
    label: g.label,
    count: g.items.length,
    items: g.items,
    collapsedTags: g.types.size > 0
      ? Array.from(g.types).map(tk => {
          const [kind, type] = tk.split(':');
          const meta = kind === 'single'
            ? DERIVATION_TYPE_META[type as keyof typeof DERIVATION_TYPE_META]
            : PACKET_TYPE_META[type as keyof typeof PACKET_TYPE_META];
          return meta?.label ?? type;
        })
      : undefined,
  }));
}
