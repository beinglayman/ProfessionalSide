import React, { useState, useMemo, useCallback } from 'react';
import { Clock, AlertCircle, Loader2, ChevronDown, ChevronRight, Minus, Plus, Search, X, Sparkles, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { ActivityCard } from './activity-card';
import { StoryGroupHeader } from './story-group-header';
import { getSourceIcon } from './source-icons';
import { TemporalFilters, FilterSeparator } from './activity-filters';
import { ActivityGroup, Activity, SUPPORTED_SOURCES, ActivitySource, TemporalBucket } from '../../types/activity';
import { cn } from '../../lib/utils';
import { useDropdown } from '../../hooks/useDropdown';
import { INITIAL_ITEMS_LIMIT, MAX_SUMMARY_SOURCES } from './activity-card-utils';

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
  pendingEnhancementIds
}: ActivityStreamProps) {
  // Filter state
  const [selectedTemporalBuckets, setSelectedTemporalBuckets] = useState<TemporalBucket[]>([]);
  const [selectedSources, setSelectedSources] = useState<ActivitySource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Global expand/collapse state - track which groups are collapsed.
  // Starts null (= treat everything as collapsed) so nothing flashes expanded
  // before the initialization effect sets the correct state.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | null>(null);

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
  }, [groupFingerprint, groups]);

  // Compute available filters from groups
  const availableTemporalBuckets = useMemo(() => {
    return groups.map(g => g.key as TemporalBucket);
  }, [groups]);

  // Compute counts for filters
  const temporalCounts = useMemo(() => {
    return groups.reduce((acc, g) => {
      acc[g.key as TemporalBucket] = g.count;
      return acc;
    }, {} as Record<TemporalBucket, number>);
  }, [groups]);

  // Compute available sources from all temporal groups' activities
  const availableSources = useMemo(() => {
    const sourceCounts = new Map<string, number>();
    for (const g of groups) {
      for (const a of g.activities) {
        sourceCounts.set(a.source, (sourceCounts.get(a.source) || 0) + 1);
      }
    }
    return Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source: source as ActivitySource, count }));
  }, [groups]);

  // Helper to check if text matches search query
  const matchesSearch = useCallback((text: string | null | undefined): boolean => {
    if (!searchQuery.trim()) return true;
    if (!text) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  // Helper to check if an activity matches search
  const activityMatchesSearch = useCallback((activity: Activity): boolean => {
    if (!searchQuery.trim()) return true;
    return (
      matchesSearch(activity.title) ||
      matchesSearch(activity.description) ||
      matchesSearch(activity.sourceId) ||
      activity.crossToolRefs.some(ref => matchesSearch(ref))
    );
  }, [searchQuery, matchesSearch]);

  // Filter groups based on selection AND search
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Apply temporal bucket filter
    if (selectedTemporalBuckets.length > 0) {
      result = result.filter(g => selectedTemporalBuckets.includes(g.key as TemporalBucket));
    }

    // Apply source filter within temporal groups
    if (selectedSources.length > 0) {
      result = result.map(group => {
        const filtered = group.activities.filter(a =>
          selectedSources.includes(a.source as ActivitySource)
        );
        if (filtered.length === 0) return null;
        return { ...group, activities: filtered, count: filtered.length };
      }).filter((g): g is ActivityGroup => g !== null);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.map(group => {
        // Check if group label/title matches
        const groupMatches = matchesSearch(group.label);

        // Filter activities within the group
        const matchingActivities = group.activities.filter(activityMatchesSearch);

        // Include group if it matches OR has matching activities
        if (groupMatches || matchingActivities.length > 0) {
          return {
            ...group,
            activities: groupMatches ? group.activities : matchingActivities,
            count: groupMatches ? group.count : matchingActivities.length
          };
        }
        return null;
      }).filter((g): g is ActivityGroup => g !== null);
    }

    return result;
  }, [groups, selectedTemporalBuckets, selectedSources, searchQuery, matchesSearch, activityMatchesSearch]);

  // Toggle handlers for filters
  const handleTemporalToggle = (bucket: TemporalBucket) => {
    setSelectedTemporalBuckets(prev => {
      if (prev.includes(bucket)) {
        return prev.filter(b => b !== bucket);
      }
      return [...prev, bucket];
    });
  };

  const handleSourceToggle = (source: ActivitySource) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source);
      }
      return [...prev, source];
    });
  };

  // Helper: check if a group is collapsed (null state = all collapsed)
  const isGroupCollapsed = useCallback((key: string) => {
    return collapsedGroups === null || collapsedGroups.has(key);
  }, [collapsedGroups]);

  // Toggle single group
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev ?? []);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Expand/collapse all - check against filtered groups
  // "any expanded" = at least one group is NOT collapsed
  const anyExpanded = filteredGroups.length > 0 && filteredGroups.some(g => !isGroupCollapsed(g.key));

  const toggleAll = useCallback(() => {
    if (anyExpanded) {
      // Collapse all (if any are expanded)
      setCollapsedGroups(new Set(filteredGroups.map(g => g.key)));
    } else {
      // Expand all (if all are collapsed)
      setCollapsedGroups(new Set());
    }
  }, [anyExpanded, filteredGroups]);

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
  const activeFilterCount = selectedTemporalBuckets.length + selectedSources.length;

  return (
    <div className="space-y-3">
      {/* Controls: Search + Filters + Expand/Collapse */}
      {(showFilters || filteredGroups.length >= 1 || groups.length >= 1) && (
        <div className="bg-white rounded-lg border border-gray-200/80">
          {/* Top row: search + filter toggle (mobile) / inline filters (desktop) + expand/collapse */}
          <div className="flex items-center gap-2 py-2 px-3">
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

            {/* Desktop: inline filters */}
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

            {/* Spacer */}
            <div className="flex-1 min-w-0 hidden sm:block" />

            {/* Expand/Collapse All button */}
            <button
              onClick={toggleAll}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0",
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

          {/* Mobile: expanded filter drawer */}
          {mobileFiltersOpen && (
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

      {/* Drafts banner */}
      <DraftsBanner
        storyGroups={storyGroups}
        showDraftsOnly={showDraftsOnly}
        onToggle={() => setShowDraftsOnly(prev => !prev)}
      />

      {/* Groups - min-height ensures bottom items can scroll to top */}
      <div className="min-h-[calc(100vh-12rem)]">
        {/* Activities view — raw activities only, no inline drafts */}
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

        {/* Spacer to allow bottom items to scroll to top position */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Inline draft story card — renders StoryGroupHeader directly.
 * Expands to show two-column layout with narrative and activities.
 */
interface InlineDraftCardProps {
  group: ActivityGroup;
  onPromoteToCareerStory?: (entryId: string) => void;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
  onDeleteEntry?: (entryId: string) => void;
  isEnhancingNarratives?: boolean;
  pendingEnhancementIds?: Set<string>;
}

function InlineDraftCard({
  group,
  onPromoteToCareerStory,
  onRegenerateNarrative,
  regeneratingEntryId,
  onDeleteEntry,
  isEnhancingNarratives,
  pendingEnhancementIds
}: InlineDraftCardProps) {
  const meta = group.storyMetadata;
  if (!meta) return null;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StoryGroupHeader
      variant="draft"
      storyMetadata={meta}
      activityCount={group.count}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(prev => !prev)}
      onRegenerateNarrative={onRegenerateNarrative}
      isRegenerateLoading={regeneratingEntryId === meta.id}
      onDeleteEntry={onDeleteEntry}
      onPromoteToCareerStory={onPromoteToCareerStory}
      activities={group.activities}
      isEnhancingNarratives={isEnhancingNarratives}
      isPendingEnhancement={
        pendingEnhancementIds && pendingEnhancementIds.size > 0
          ? pendingEnhancementIds.has(meta.id)
          : undefined
      }
    />
  );
}

interface DraftsBannerProps {
  storyGroups: ActivityGroup[];
  showDraftsOnly: boolean;
  onToggle: () => void;
}

function DraftsBanner({ storyGroups, showDraftsOnly, onToggle }: DraftsBannerProps) {
  if (storyGroups.length === 0) return null;

  // Compute unique activity count across all drafts (activities can appear in multiple stories)
  const uniqueActivityIds = new Set<string>();
  for (const g of storyGroups) {
    for (const a of g.activities) uniqueActivityIds.add(a.id);
  }
  const totalActivities = uniqueActivityIds.size;

  // Compute overall time span across all drafts
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const g of storyGroups) {
    const meta = g.storyMetadata;
    if (!meta) continue;
    if (meta.timeRangeStart) {
      const t = new Date(meta.timeRangeStart).getTime();
      if (t < minTime) minTime = t;
    }
    if (meta.timeRangeEnd) {
      const t = new Date(meta.timeRangeEnd).getTime();
      if (t > maxTime) maxTime = t;
    }
  }
  // Format as "Jan 4 – Feb 5" or just "Feb 5" if same day
  let timeSpan = '';
  if (minTime !== Infinity && maxTime !== -Infinity) {
    const startDate = new Date(minTime);
    const endDate = new Date(maxTime);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (startDate.toDateString() === endDate.toDateString()) {
      timeSpan = fmt(endDate);
    } else {
      timeSpan = `${fmt(startDate)} – ${fmt(endDate)}`;
    }
  }

  // Collect top topics/skills across all drafts (deduplicated, max 3)
  const topicSet = new Set<string>();
  for (const g of storyGroups) {
    const meta = g.storyMetadata;
    if (!meta) continue;
    for (const t of (meta.topics || [])) topicSet.add(t);
    if (topicSet.size >= 3) break;
    for (const s of (meta.skills || [])) topicSet.add(s);
    if (topicSet.size >= 3) break;
  }
  const topTopics = Array.from(topicSet).slice(0, 3);

  const draftCount = storyGroups.length;

  return (
    <div className={cn(
      'flex items-center justify-between px-5 py-3.5 rounded-xl transition-colors',
      showDraftsOnly
        ? 'bg-purple-600 border border-purple-700'
        : 'bg-gray-100 border border-gray-200'
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <Sparkles className={cn(
          'w-5 h-5 flex-shrink-0',
          showDraftsOnly ? 'text-purple-200' : 'text-gray-500'
        )} aria-hidden="true" />
        <div className="min-w-0">
          <div>
            <span className={cn(
              'text-base font-semibold',
              showDraftsOnly ? 'text-white' : 'text-gray-900'
            )}>
              {draftCount} draft {draftCount === 1 ? 'story' : 'stories'}
            </span>
            <span className={cn(
              'text-sm',
              showDraftsOnly ? 'text-purple-200' : 'text-gray-600'
            )}>
              {' '}covering {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'}
              {timeSpan && (
                <>
                  <span className={showDraftsOnly ? 'text-purple-300 mx-1' : 'text-gray-400 mx-1'}>&middot;</span>
                  {timeSpan}
                </>
              )}
            </span>
          </div>
          {topTopics.length > 0 && (
            <div className={cn(
              'text-xs mt-0.5',
              showDraftsOnly ? 'text-purple-200' : 'text-gray-500'
            )}>
              {topTopics.join(', ')}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex-shrink-0',
          showDraftsOnly
            ? 'text-purple-600 bg-white hover:bg-purple-50'
            : 'text-white bg-purple-600 hover:bg-purple-700'
        )}
        aria-pressed={showDraftsOnly}
      >
        {showDraftsOnly ? 'Show all' : 'Review drafts'}
      </button>
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

  // Generate summary for collapsed state
  const collapsedSummary = useMemo(() => {
    if (!isCollapsed) return '';
    return generateTemporalSummary(group.activities);
  }, [isCollapsed, group.activities]);

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
            isCollapsed ? 'bg-gray-300' : 'bg-primary-500'
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
              className="text-sm font-semibold"
              style={{ color: labelColor }}
            >
              {group.label}
            </span>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {group.count}
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
            {/* Inline draft cards — above activity rows */}
            {inlineDrafts && inlineDrafts.length > 0 && (
              <div className="space-y-2 mb-2">
                {inlineDrafts.map(draft => (
                  <InlineDraftCard
                    key={draft.key}
                    group={draft}
                    onPromoteToCareerStory={onPromoteToCareerStory}
                    onRegenerateNarrative={onRegenerateNarrative}
                    regeneratingEntryId={regeneratingEntryId}
                    onDeleteEntry={onDeleteEntry}
                    isEnhancingNarratives={isEnhancingNarratives}
                    pendingEnhancementIds={pendingEnhancementIds}
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
