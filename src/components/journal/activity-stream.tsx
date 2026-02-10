import React, { useState, useMemo } from 'react';
import { Clock, AlertCircle, Loader2, ChevronDown, ChevronRight, Minus, Plus, Search, X, MoreHorizontal, SlidersHorizontal, ArrowUpRight, Star, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityCard } from './activity-card';
import { getSourceIcon } from './source-icons';
import { TemporalFilters, FilterSeparator } from './activity-filters';
import { ActivityGroup, Activity, SUPPORTED_SOURCES, ActivitySource, TemporalBucket, ActivityStoryEdgeType, ACTIVITY_EDGE_LABELS } from '../../types/activity';
import { cn } from '../../lib/utils';
import { useDropdown } from '../../hooks/useDropdown';
import { useActivityFilters, useExpansionState } from '../../hooks/useActivityStreamState';
import { INITIAL_ITEMS_LIMIT, MAX_SUMMARY_SOURCES } from './activity-card-utils';
import { highlightMetrics, ACTIVITIES_PER_EDGE_LIMIT } from './story-group-header';
import { BRAG_DOC_CATEGORIES } from '../career-stories/constants';
interface ActivityStreamProps {
  groups: ActivityGroup[];
  storyGroups?: ActivityGroup[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
  onDeleteEntry?: (entryId: string) => void;
  onPromoteToCareerStory?: (entryId: string) => void;
  isEnhancingNarratives?: boolean;
  pendingEnhancementIds?: Set<string>;
  /** Number of draft stories hidden because they were promoted to career stories */
  promotedCount?: number;
}

/**
 * Display grouped activities in a clean, modern stream layout.
 * Temporal grouping only — source/story views removed (header nav handles page switching).
 */
export function ActivityStream({
  groups,
  storyGroups = [],
  isLoading,
  error,
  emptyMessage = 'No activities found',
  onRegenerateNarrative,
  regeneratingEntryId,
  onDeleteEntry,
  onPromoteToCareerStory,
  isEnhancingNarratives,
  pendingEnhancementIds,
  promotedCount = 0
}: ActivityStreamProps) {
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);

  // Extracted hooks for filter state + expansion state
  const {
    searchQuery, setSearchQuery,
    selectedTemporalBuckets, selectedSources, selectedDraftCategories,
    mobileFiltersOpen, setMobileFiltersOpen,
    availableTemporalBuckets, temporalCounts, availableSources,
    filteredGroups, activeFilterCount,
    handleTemporalToggle, handleSourceToggle, handleDraftCategoryToggle,
  } = useActivityFilters({ groups });

  const {
    expandedDrafts, collapsedGroups, setCollapsedGroups,
    isGroupCollapsed, toggleGroup, anyExpanded, toggleAll, toggleDraft,
  } = useExpansionState({ groups, storyGroups, filteredGroups, showDraftsOnly });

  // Build a stable fingerprint of group keys to detect real data changes.
  // This avoids re-initializing from stale placeholder data (keepPreviousData).
  const groupFingerprint = groups.map(g => g.key).join(',');
  const lastFingerprintRef = React.useRef<string>('');

  // Initialize / re-initialize collapsed state whenever the actual group data changes
  React.useEffect(() => {
    if (groups.length === 0) return;
    if (groupFingerprint === lastFingerprintRef.current) return;

    lastFingerprintRef.current = groupFingerprint;

    // Collapse all except first
    const initialCollapsed = new Set(groups.slice(1).map(g => g.key));
    setCollapsedGroups(initialCollapsed);

    // Scroll to top on first load or tab change.
    // Fire immediately AND after the card expand transition (300ms).
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 350);
  }, [groupFingerprint, groups, setCollapsedGroups]);

  // Map each draft story to the temporal group whose date range contains it.
  // Uses each temporal group's activity timestamps to derive bucket boundaries.
  const draftsByBucket = useMemo(() => {
    const map = new Map<string, ActivityGroup[]>();
    if (storyGroups.length === 0 || groups.length === 0) return map;

    // Build date ranges from each temporal group's activities
    const bucketRanges = groups.map(g => {
      let min = Infinity;
      let max = -Infinity;
      for (const a of g.activities) {
        const t = new Date(a.timestamp).getTime();
        if (t < min) min = t;
        if (t > max) max = t;
      }
      return { key: g.key, min, max };
    });

    for (const draft of storyGroups) {
      const endStr = draft.storyMetadata?.timeRangeEnd ?? draft.storyMetadata?.timeRangeStart;
      if (!endStr) {
        // No time info — place in first bucket
        const first = groups[0].key;
        map.set(first, [...(map.get(first) || []), draft]);
        continue;
      }
      const draftTime = new Date(endStr).getTime();

      // Find the bucket whose range contains this draft's end time
      let matched = false;
      for (const range of bucketRanges) {
        if (range.min <= draftTime && draftTime <= range.max) {
          map.set(range.key, [...(map.get(range.key) || []), draft]);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Fallback: find the closest bucket by distance
        let closest = bucketRanges[0];
        let closestDist = Infinity;
        for (const range of bucketRanges) {
          const dist = Math.min(Math.abs(draftTime - range.min), Math.abs(draftTime - range.max));
          if (dist < closestDist) {
            closestDist = dist;
            closest = range;
          }
        }
        map.set(closest.key, [...(map.get(closest.key) || []), draft]);
      }
    }
    return map;
  }, [storyGroups, groups]);

  // Group drafts by brag doc category for the drafts toggle view
  const draftsByCategory = useMemo(() => {
    const map = new Map<string, ActivityGroup[]>();
    for (const draft of storyGroups) {
      const cat = draft.storyMetadata?.category || 'uncategorized';
      map.set(cat, [...(map.get(cat) || []), draft]);
    }
    return map;
  }, [storyGroups]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Check if we should show filters (multiple options available)
  const showTemporalFilters = availableTemporalBuckets.length > 1;
  const showFilters = showTemporalFilters;

  return (
    <div className="space-y-3">
      {/* Controls: Search + Filters + Expand/Collapse */}
      {(showFilters || filteredGroups.length >= 1 || groups.length >= 1) && (
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm">
          {/* Top row: toggle + context-specific filters + expand/collapse */}
          <div className="flex items-center gap-2 py-2 px-3">
            {/* Activities / Draft Stories toggle — always visible */}
            {storyGroups.length > 0 && (
              <div className="flex items-center rounded-md bg-gray-100 p-0.5 flex-shrink-0">
                <button
                  onClick={() => setShowDraftsOnly(false)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded transition-all',
                    !showDraftsOnly
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  Activities
                </button>
                <button
                  onClick={() => setShowDraftsOnly(true)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded transition-all',
                    showDraftsOnly
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-purple-600 hover:text-purple-700'
                  )}
                >
                  Draft Stories
                  <span className={cn(
                    'text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center font-bold',
                    showDraftsOnly ? 'bg-purple-100 text-purple-700' : 'bg-purple-100/60 text-purple-600'
                  )}>
                    {storyGroups.length}
                  </span>
                </button>
              </div>
            )}

            {/* Activities mode: search + filters */}
            {!showDraftsOnly && (
              <>
                {/* Search input */}
                <div className="relative flex-1 sm:flex-initial sm:w-44">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search activities..."
                    className={cn(
                      "w-full pl-8 pr-7 py-1.5 text-xs rounded-md border transition-all",
                      "bg-gray-50 border-gray-200 placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white",
                      searchQuery && "border-primary-300 bg-white"
                    )}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Mobile: filter toggle button */}
                {(showFilters || availableSources.length > 1) && (
                  <button
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className={cn(
                      "sm:hidden flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0",
                      mobileFiltersOpen || activeFilterCount > 0
                        ? "bg-primary-50 text-primary-600"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 text-[10px] font-bold rounded-full bg-primary-500 text-white flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Desktop: inline temporal filters */}
                {showFilters && (
                  <div className="hidden sm:flex items-center gap-1">
                    <FilterSeparator />
                    {showTemporalFilters && (
                      <TemporalFilters
                        availableBuckets={availableTemporalBuckets}
                        selectedBuckets={selectedTemporalBuckets}
                        onToggle={handleTemporalToggle}
                        counts={temporalCounts}
                      />
                    )}
                  </div>
                )}

                {/* Desktop: source filter chips */}
                {availableSources.length > 1 && (
                  <div className="hidden sm:flex items-center">
                    <SourceFilterChips
                      availableSources={availableSources}
                      selectedSources={selectedSources}
                      onToggle={handleSourceToggle}
                    />
                  </div>
                )}
              </>
            )}

            {/* Drafts mode: category filter chips */}
            {showDraftsOnly && (
              <div className="flex items-center gap-1 overflow-x-auto min-w-0">
                {BRAG_DOC_CATEGORIES.map((cat) => {
                  const count = (draftsByCategory.get(cat.value) ?? []).length;
                  if (count === 0) return null;
                  const isActive = selectedDraftCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => handleDraftCategoryToggle(cat.value)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
                        isActive
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                      )}
                    >
                      {cat.label}
                      <span className={cn(
                        'text-[10px] tabular-nums',
                        isActive ? 'text-purple-200' : 'text-gray-400'
                      )}>{count}</span>
                    </button>
                  );
                })}
                {(draftsByCategory.get('uncategorized') ?? []).length > 0 && (() => {
                  const isActive = selectedDraftCategories.includes('uncategorized');
                  return (
                    <button
                      onClick={() => handleDraftCategoryToggle('uncategorized')}
                      aria-pressed={isActive}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
                        isActive
                          ? 'bg-gray-700 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      Uncategorized
                      <span className={cn(
                        'text-[10px] tabular-nums',
                        isActive ? 'text-gray-300' : 'text-gray-400'
                      )}>{(draftsByCategory.get('uncategorized') ?? []).length}</span>
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-w-0 hidden sm:block" />

            {/* Expand/Collapse All button — always visible */}
            <button
              onClick={toggleAll}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors flex-shrink-0",
                anyExpanded
                  ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  : "text-primary-600 bg-primary-50 hover:bg-primary-100"
              )}
            >
              {anyExpanded ? (
                <>
                  <Minus className="w-3 h-3" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile: expanded filter drawer — activities mode only */}
          {!showDraftsOnly && mobileFiltersOpen && (
            <div className="sm:hidden px-3 pb-2.5 pt-0.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
              {showTemporalFilters && (
                <TemporalFilters
                  availableBuckets={availableTemporalBuckets}
                  selectedBuckets={selectedTemporalBuckets}
                  onToggle={handleTemporalToggle}
                  counts={temporalCounts}
                />
              )}
              {availableSources.length > 1 && (
                <SourceFilterChips
                  availableSources={availableSources}
                  selectedSources={selectedSources}
                  onToggle={handleSourceToggle}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Groups - min-height ensures bottom items can scroll to top */}
      <div className="min-h-[calc(100vh-12rem)]">
        {showDraftsOnly ? (
          <>
            {/* Drafts view */}
            {storyGroups.length === 0 && promotedCount > 0 && (
              <div className="px-4 py-3 rounded-lg bg-primary-50 border border-primary-200">
                <p className="text-sm text-primary-700">
                  {promotedCount} {promotedCount === 1 ? 'story' : 'stories'} promoted to Career Stories.
                </p>
                <a href="/stories" className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary-600 hover:text-primary-700">
                  View in Career Stories
                </a>
              </div>
            )}
            {storyGroups.length === 0 && promotedCount === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No draft stories yet</p>
                <p className="text-xs text-gray-400 mt-1">Drafts are created automatically as your activities sync.</p>
              </div>
            )}
            {storyGroups.length > 0 && (
              <div className="space-y-3 pt-2">
                {storyGroups.map(draft => (
                  <InlineDraftCard
                    key={draft.key}
                    group={draft}
                    isExpanded={expandedDrafts.has(draft.key)}
                    onToggleExpand={() => toggleDraft(draft.key)}
                    onPromoteToCareerStory={onPromoteToCareerStory}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Activities view: temporal groups only (no inline drafts) */}
            {filteredGroups.map((group, idx) => (
              <ActivityGroupSection
                key={group.key}
                group={group}
                isCollapsed={isGroupCollapsed(group.key)}
                onToggle={() => toggleGroup(group.key)}
                onPromoteToCareerStory={onPromoteToCareerStory}
                onRegenerateNarrative={onRegenerateNarrative}
                regeneratingEntryId={regeneratingEntryId}
                onDeleteEntry={onDeleteEntry}
                isEnhancingNarratives={isEnhancingNarratives}
                pendingEnhancementIds={pendingEnhancementIds}
                showDraftsOnly={false}
                isLast={idx === filteredGroups.length - 1}
              />
            ))}
          </>
        )}

        {/* Spacer to allow bottom items to scroll to top position */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Inline draft story card — self-contained hero card with source icon stack,
 * title, description, topic chips, and "Create Story" CTA.
 *
 * Supports both controlled (parent manages expand state via isExpanded/onToggleExpand)
 * and uncontrolled (internal useState) modes. The Draft Stories tab uses controlled
 * mode so the toolbar Expand/Collapse button can toggle all cards at once.
 *
 * Split into Outer (null check) + Inner (guaranteed non-null meta) to avoid
 * calling hooks before the early return that guards against missing storyMetadata.
 */
interface InlineDraftCardProps {
  group: ActivityGroup;
  /** Controlled expanded state. Falls back to internal state if not provided. */
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onPromoteToCareerStory?: (entryId: string) => void;
}

// TODO: Also duplicated in story-group-header.tsx — move to types/activity.ts alongside ACTIVITY_EDGE_LABELS
const EDGE_TYPE_ORDER: ActivityStoryEdgeType[] = ['primary', 'outcome', 'supporting', 'contextual'];

function InlineDraftCard({ group, ...rest }: InlineDraftCardProps) {
  if (!group.storyMetadata) return null;
  return <InlineDraftCardInner group={group} meta={group.storyMetadata} {...rest} />;
}

/** Inner component — `meta` is guaranteed non-null. All hooks are safe to call. */
function InlineDraftCardInner({
  group,
  meta,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggle,
  onPromoteToCareerStory,
}: InlineDraftCardProps & { meta: NonNullable<ActivityGroup['storyMetadata']> }) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const onToggleExpand = controlledToggle ?? (() => setInternalExpanded(prev => !prev));

  // Collect unique source icons from this draft's activities, sorted by frequency
  const uniqueSources = useMemo(() => {
    const sourceMap = new Map<string, number>();
    for (const a of group.activities) {
      sourceMap.set(a.source, (sourceMap.get(a.source) || 0) + 1);
    }
    return Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source]) => source);
  }, [group.activities]);

  // Format date range
  const dateLabel = useMemo(() => {
    if (!meta.timeRangeStart && !meta.timeRangeEnd) return null;
    const start = meta.timeRangeStart ? format(new Date(meta.timeRangeStart), 'MMM d') : '';
    const end = meta.timeRangeEnd ? format(new Date(meta.timeRangeEnd), 'MMM d') : '';
    if (start && end && start !== end) return `${start} – ${end}`;
    return end || start;
  }, [meta.timeRangeStart, meta.timeRangeEnd]);

  // Group activities by edge type for expanded view
  const { groupedActivities, edgeMap } = useMemo(() => {
    const edges = meta.activityEdges ?? [];
    const edgeMap = new Map(edges.map(e => [e.activityId, e]));
    const buckets: Record<ActivityStoryEdgeType, Activity[]> = {
      primary: [], outcome: [], supporting: [], contextual: []
    };
    for (const activity of group.activities) {
      const edge = edgeMap.get(activity.id);
      const type = edge?.type ?? 'primary';
      buckets[type].push(activity);
    }
    return { groupedActivities: buckets, edgeMap };
  }, [group.activities, meta.activityEdges]);

  const useCompactCards = group.activities.length >= 4;

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-dashed transition-all',
        'bg-gradient-to-br from-purple-50/60 via-white to-white',
        isExpanded
          ? 'border-purple-400 shadow-md ring-1 ring-purple-100'
          : 'border-purple-300 shadow-sm hover:shadow-md hover:border-purple-400 cursor-pointer'
      )}
    >

      {/* Clickable header area */}
      <div
        className="p-4 sm:p-5"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        {/* Top row: source icon stack + date + status + chevron (mirrors StoryCard) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {uniqueSources.length > 0 && (
              <div className="flex items-center -space-x-1.5">
                {uniqueSources.slice(0, 4).map((source, i) => {
                  const Icon = getSourceIcon(source);
                  const info = SUPPORTED_SOURCES[source as ActivitySource];
                  return (
                    <span
                      key={source}
                      title={info?.displayName || source}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-white shadow-sm ring-1 ring-gray-200/80"
                      style={{ zIndex: uniqueSources.length - i }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: info?.color }} />
                    </span>
                  );
                })}
                {uniqueSources.length > 4 && (
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow-sm ring-1 ring-gray-200/80 text-[10px] font-bold text-gray-500"
                    style={{ zIndex: 0 }}
                  >
                    +{uniqueSources.length - 4}
                  </span>
                )}
              </div>
            )}
            {dateLabel && (
              <span className="text-[11px] text-gray-400 whitespace-nowrap">{dateLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full">
              <Clock className="w-3 h-3" />
              Draft · {group.count} activities
            </span>
            <ChevronRight className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform text-gray-400',
              isExpanded && 'rotate-90'
            )} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-1.5">
          {meta.title}
        </h3>

        {/* Description — always clipped in header */}
        {meta.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
            {meta.description}
          </p>
        )}

        {/* Bottom row: topic chips + CTA (mirrors StoryCard bottom row) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap min-w-0">
            {meta.topics?.slice(0, isExpanded ? 5 : 2).map((topic, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-md font-medium text-[11px] bg-purple-50 text-purple-700">
                {topic}
              </span>
            ))}
            {!isExpanded && (meta.topics?.length ?? 0) > 2 && (
              <span className="text-[10px] text-gray-400">+{(meta.topics?.length ?? 0) - 2}</span>
            )}
            {meta.dominantRole === 'Led' && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                  <Star className="w-3 h-3" />
                  Led
                </span>
              </>
            )}
          </div>
          {onPromoteToCareerStory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromoteToCareerStory(meta.id);
              }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Create Story
            </button>
          )}
        </div>
      </div>

      {/* Expanded content — full description + impact highlights + activities */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5" onClick={(e) => e.stopPropagation()}>
          <div className="border-t border-dashed border-purple-200 pt-4" />

          <div className={cn(
            'grid gap-4',
            group.activities.length > 0 ? 'lg:grid-cols-[3fr,2fr]' : 'grid-cols-1'
          )}>
            {/* Left: full description + impact highlights */}
            <div className={cn(
              'space-y-3',
              group.activities.length > 0 && 'lg:border-r lg:border-dashed lg:border-purple-200 lg:pr-4'
            )}>
              {/* Full description */}
              {meta.description && (
                <p className="text-[15px] text-gray-800 leading-[1.7]">
                  {highlightMetrics(meta.description)}
                </p>
              )}

              {/* Impact highlights */}
              {meta.impactHighlights && meta.impactHighlights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    Key Impact
                  </div>
                  <ul className="space-y-1.5">
                    {meta.impactHighlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{highlightMetrics(highlight)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty left column fallback */}
              {!meta.description && (!meta.impactHighlights || meta.impactHighlights.length === 0) && (
                <p className="text-xs text-gray-400 italic">No summary generated yet.</p>
              )}
            </div>

            {/* Right: activities by edge type */}
            {group.activities.length > 0 && (
              <div className="space-y-1">
                {EDGE_TYPE_ORDER.map(type => {
                  const items = groupedActivities[type];
                  if (items.length === 0) return null;
                  const edgeMeta = ACTIVITY_EDGE_LABELS[type];
                  return (
                    <DraftEdgeSection
                      key={type}
                      label={edgeMeta.label}
                      color={edgeMeta.color}
                      bgColor={edgeMeta.bgColor}
                      activities={items}
                      edgeMap={edgeMap}
                      defaultOpen={type === 'primary'}
                      compact={useCompactCards}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty right column fallback */}
            {group.activities.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">No activities linked to this draft yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// TODO: DraftEdgeSection is near-identical to EdgeTypeAccordion in story-group-header.tsx.
// Consolidate into one shared component once edgeMap type alignment is resolved
// (ActivityStoryEdge vs { activityId, type } subset).

/** Edge-type accordion section for expanded draft card */
function DraftEdgeSection({
  label, color, bgColor, activities, edgeMap, defaultOpen, compact
}: {
  label: string;
  color: string;
  bgColor: string;
  activities: Activity[];
  edgeMap: Map<string, { activityId: string; type: ActivityStoryEdgeType }>;
  defaultOpen: boolean;
  compact: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const visibleActivities = showAll ? activities : activities.slice(0, ACTIVITIES_PER_EDGE_LIMIT);
  const hiddenCount = activities.length - ACTIVITIES_PER_EDGE_LIMIT;

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center gap-2 py-1 text-[11px] hover:bg-gray-50 rounded transition-colors"
      >
        <ChevronRight className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-200', isOpen && 'rotate-90')} />
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ color, backgroundColor: bgColor }}>
          {label}
        </span>
        <span className="text-gray-400">{activities.length}</span>
      </button>
      {isOpen && (
        <div className="space-y-1.5 pl-5 mt-1">
          {visibleActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              showStoryBadge={false}
              compact={compact}
              edge={edgeMap.get(activity.id)}
              className="bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-colors"
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(!showAll);
              }}
              className="text-[11px] text-gray-400 hover:text-gray-600 pl-1 py-0.5 transition-colors"
            >
              {showAll ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const MAX_VISIBLE_SOURCES = 4;

interface SourceFilterChipsProps {
  availableSources: { source: ActivitySource; count: number }[];
  selectedSources: ActivitySource[];
  onToggle: (source: ActivitySource) => void;
}

function SourceFilterChips({ availableSources, selectedSources, onToggle }: SourceFilterChipsProps) {
  const { isOpen, toggle, close, containerRef } = useDropdown();

  // Sources already sorted by count desc from parent. Split into visible + overflow.
  const visible = availableSources.slice(0, MAX_VISIBLE_SOURCES);
  const overflow = availableSources.slice(MAX_VISIBLE_SOURCES);
  const overflowSelectedCount = overflow.filter(s => selectedSources.includes(s.source)).length;

  return (
    <div className="flex items-center gap-1">
      {/* Visible source chips — icon + short name */}
      {visible.map(({ source, count }) => {
        const sourceInfo = SUPPORTED_SOURCES[source];
        const isSelected = selectedSources.includes(source);
        const Icon = getSourceIcon(source);

        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            aria-pressed={isSelected}
            title={`${sourceInfo?.displayName || source} (${count})`}
            className={cn(
              'flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
              isSelected
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
            )}
          >
            <Icon
              className="w-3.5 h-3.5 flex-shrink-0"
              style={isSelected ? undefined : { color: sourceInfo?.color }}
            />
            {count > 0 && (
              <span className={cn(
                'text-[10px] tabular-nums',
                isSelected ? 'text-primary-200' : 'text-gray-400'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}

      {/* Overflow dropdown for remaining sources */}
      {overflow.length > 0 && (
        <div className="relative" ref={containerRef}>
          <button
            onClick={toggle}
            className={cn(
              'flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
              overflowSelectedCount > 0
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span className="text-[10px]">+{overflow.length}</span>
          </button>

          {isOpen && (
            <div
              className="absolute top-full mt-1 left-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[180px]"
              role="listbox"
              aria-label="More sources"
            >
              {overflow.map(({ source, count }) => {
                const sourceInfo = SUPPORTED_SOURCES[source];
                const isSelected = selectedSources.includes(source);
                const Icon = getSourceIcon(source);
                return (
                  <button
                    key={source}
                    onClick={() => onToggle(source)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors',
                      isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <Icon
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={isSelected ? undefined : { color: sourceInfo?.color }}
                    />
                    <span className="flex-1 text-left font-medium">{sourceInfo?.displayName || source}</span>
                    <span className="text-[10px] tabular-nums text-gray-400">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityGroupSectionProps {
  group: ActivityGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  inlineDrafts?: ActivityGroup[];
  onPromoteToCareerStory?: (entryId: string) => void;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
  onDeleteEntry?: (entryId: string) => void;
  isEnhancingNarratives?: boolean;
  pendingEnhancementIds?: Set<string>;
  showDraftsOnly?: boolean;
  /** Last group in the list — timeline line stops here */
  isLast?: boolean;
}

/**
 * Generate a concise summary for temporal groups.
 * Shows source breakdown (e.g., "3 GitHub, 2 Jira, 1 Slack")
 */
function generateTemporalSummary(activities: Activity[]): string {
  if (activities.length === 0) return '';

  // Count activities by source
  const sourceCounts: Record<string, number> = {};
  activities.forEach(a => {
    sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  });

  // Sort by count descending and take top sources
  const sorted = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SUMMARY_SOURCES);

  const parts = sorted.map(([source, count]) => {
    const info = SUPPORTED_SOURCES[source as ActivitySource];
    return `${count} ${info?.displayName || source}`;
  });

  const remaining = Object.keys(sourceCounts).length - MAX_SUMMARY_SOURCES;
  if (remaining > 0) {
    parts.push(`+${remaining} more`);
  }

  return parts.join(', ');
}

function ActivityGroupSection({ group, isCollapsed, onToggle, inlineDrafts, onPromoteToCareerStory, onRegenerateNarrative, regeneratingEntryId, onDeleteEntry, isEnhancingNarratives, pendingEnhancementIds, showDraftsOnly, isLast }: ActivityGroupSectionProps) {
  // Progressive disclosure - track how many items to show
  const [showAll, setShowAll] = useState(false);

  const labelColor = '#5D259F'; // Primary brand color for temporal groups
  const draftCount = inlineDrafts?.length ?? 0;

  // Generate summary for collapsed state
  const collapsedSummary = useMemo(() => {
    if (!isCollapsed) return '';
    if (showDraftsOnly) {
      return draftCount === 0 ? 'no draft stories' : `${draftCount} draft ${draftCount === 1 ? 'story' : 'stories'}`;
    }
    return generateTemporalSummary(group.activities);
  }, [isCollapsed, group.activities, showDraftsOnly, draftCount]);

  // Progressive disclosure: show limited items initially
  const visibleActivities = showAll
    ? group.activities
    : group.activities.slice(0, INITIAL_ITEMS_LIMIT);
  const hiddenCount = Math.max(0, group.activities.length - INITIAL_ITEMS_LIMIT);
  const hasMore = hiddenCount > 0 && !showAll;

  // Reset showAll when group collapses
  React.useEffect(() => {
    if (isCollapsed) {
      setShowAll(false);
    }
  }, [isCollapsed]);

  return (
    <section className="relative flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        {/* Dot marker at the group header */}
        <div
          className={cn(
            'w-3 h-3 rounded-full mt-2 flex-shrink-0 ring-4 ring-white z-10',
            showDraftsOnly && draftCount === 0
              ? 'bg-gray-200'
              : isCollapsed ? 'bg-gray-300' : 'bg-primary-500'
          )}
        />
        {/* Vertical line extending down — hidden on last group when collapsed */}
        {!(isLast && isCollapsed) && (
          <div className="w-px flex-1 bg-gray-200" />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 pb-6">
        {/* Group header */}
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-2 w-full text-left transition-all rounded-lg',
            isCollapsed
              ? 'py-1 hover:bg-gray-50 mb-1'
              : 'mb-2 group'
          )}
        >
          {/* Chevron */}
          <div className="flex-shrink-0">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* Label and count */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={cn(
                'text-sm font-semibold',
                showDraftsOnly && draftCount === 0 && 'opacity-40'
              )}
              style={{ color: labelColor }}
            >
              {group.label}
            </span>
            <span className={cn(
              'text-[11px] tabular-nums',
              showDraftsOnly && draftCount === 0 ? 'text-gray-300' : 'text-gray-400'
            )}>
              {showDraftsOnly ? draftCount : group.count}
            </span>
          </div>

          {/* Summary when collapsed */}
          {isCollapsed && collapsedSummary && (
            <span className="text-[11px] text-gray-500 truncate">
              <span className="text-gray-300 mx-1.5">&middot;</span>
              {collapsedSummary}
            </span>
          )}

          {/* Spacer for expanded state */}
          {!isCollapsed && (
            <div className="flex-1 h-px bg-gray-100" />
          )}
        </button>

        {/* Content when expanded */}
        {!isCollapsed && (
          <>
            {/* Inline draft cards — above activity rows, visually prominent */}
            {inlineDrafts && inlineDrafts.length > 0 && (
              <div className="space-y-3 mb-4">
                {inlineDrafts.map(draft => (
                  <InlineDraftCard
                    key={draft.key}
                    group={draft}
                    onPromoteToCareerStory={onPromoteToCareerStory}
                  />
                ))}
              </div>
            )}

            {/* Activity rows — hidden in drafts-only mode */}
            {!showDraftsOnly && (
              <div className="bg-white rounded-lg border border-gray-100">
                {visibleActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    showStoryBadge={true}
                    showSourceIcon={true}
                  />
                ))}

                {/* Show more button */}
                {hasMore && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full py-2.5 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Show {hiddenCount} more
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
