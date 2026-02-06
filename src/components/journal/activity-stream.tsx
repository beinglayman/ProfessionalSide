import React, { useState, useMemo, useCallback } from 'react';
import { Clock, Layers, AlertCircle, Loader2, ChevronDown, ChevronRight, Minus, Plus, Search, X, Sparkles } from 'lucide-react';
import { ActivityCard } from './activity-card';
import { TemporalFilters, FilterSeparator } from './activity-filters';
import { ActivityGroup, Activity, SUPPORTED_SOURCES, ActivitySource, TemporalBucket, TEMPORAL_BUCKETS, STORY_ROLE_LABELS } from '../../types/activity';
import { cn } from '../../lib/utils';
import { INITIAL_ITEMS_LIMIT, MAX_SUMMARY_SOURCES, truncateText, TITLE_TRUNCATE_LENGTH, SHORT_TITLE_TRUNCATE_LENGTH } from './activity-card-utils';

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

  // Determine which group is first (non-collapsed) to place drafts there
  const firstExpandedKey = filteredGroups.find(g => !isGroupCollapsed(g.key))?.key
    ?? filteredGroups[0]?.key;

  return (
    <div className="space-y-3">
      {/* Controls: Search + Filters + Expand/Collapse - wraps on small screens */}
      {(showFilters || filteredGroups.length >= 1 || groups.length >= 1) && (
        <div className="flex items-center gap-2 flex-wrap pb-1">
          {/* Search input */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={cn(
                "w-24 sm:w-28 pl-7 pr-6 py-1 text-[11px] rounded-md border transition-all",
                "bg-white border-gray-200 placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
                searchQuery && "border-primary-300 bg-primary-50/30"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filters with pipe separators */}
          {showFilters && (
            <>
              <FilterSeparator />

              {showTemporalFilters && (
                <TemporalFilters
                  availableBuckets={availableTemporalBuckets}
                  selectedBuckets={selectedTemporalBuckets}
                  onToggle={handleTemporalToggle}
                  counts={temporalCounts}
                />
              )}
            </>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-2" />

          {/* Expand/Collapse All button - right aligned */}
          <button
            onClick={toggleAll}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors flex-shrink-0",
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
      )}

      {/* Drafts banner */}
      <DraftsBanner
        draftCount={storyGroups.length}
        showDraftsOnly={showDraftsOnly}
        onToggle={() => setShowDraftsOnly(prev => !prev)}
      />

      {/* Groups - min-height ensures bottom items can scroll to top */}
      <div className={cn(
        'space-y-4',
        'min-h-[calc(100vh-12rem)]' // Ensures enough scroll space for bottom items
      )}>
        {filteredGroups.map((group) => {
          // Show all drafts in the first expanded group
          const drafts = group.key === firstExpandedKey ? storyGroups : undefined;
          // In drafts-only mode, skip groups that aren't the drafts host
          if (showDraftsOnly && group.key !== firstExpandedKey) return null;

          return (
            <ActivityGroupSection
              key={group.key}
              group={group}
              isCollapsed={isGroupCollapsed(group.key)}
              onToggle={() => toggleGroup(group.key)}
              inlineDrafts={drafts}
              onPromoteToCareerStory={onPromoteToCareerStory}
              showDraftsOnly={showDraftsOnly}
            />
          );
        })}

        {/* Spacer to allow bottom items to scroll to top position */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Inline draft story card — purple left border, sparkle icon, CTA.
 */
interface InlineDraftCardProps {
  group: ActivityGroup;
  onPromoteToCareerStory?: (entryId: string) => void;
}

function InlineDraftCard({ group, onPromoteToCareerStory }: InlineDraftCardProps) {
  const meta = group.storyMetadata;
  if (!meta) return null;

  const sources = [...new Set(group.activities.map(a => a.source))];
  const sourceNames = sources
    .map(s => SUPPORTED_SOURCES[s as ActivitySource]?.displayName || s)
    .slice(0, 3);
  const roleLabel = meta.dominantRole
    ? STORY_ROLE_LABELS[meta.dominantRole]?.label
    : null;

  return (
    <article
      className="border-l-4 border-purple-400 bg-gradient-to-r from-purple-50/40 to-transparent rounded-r-lg p-4 hover:shadow-sm transition-shadow"
      aria-label={`Draft story: ${meta.title} — ${group.count} activities, create career story available`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {meta.title}
            </h3>
            {roleLabel && (
              <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0">
                {roleLabel}
              </span>
            )}
          </div>
          {meta.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {meta.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{group.count} activities</span>
            <span className="text-gray-300">&middot;</span>
            <span>{sourceNames.join(', ')}</span>
          </div>
        </div>
        <button
          onClick={() => meta.id && onPromoteToCareerStory?.(meta.id)}
          className="flex-shrink-0 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
        >
          Create Career Story &rarr;
        </button>
      </div>
    </article>
  );
}

interface DraftsBannerProps {
  draftCount: number;
  showDraftsOnly: boolean;
  onToggle: () => void;
}

function DraftsBanner({ draftCount, showDraftsOnly, onToggle }: DraftsBannerProps) {
  if (draftCount === 0) return null;

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors',
      showDraftsOnly
        ? 'bg-purple-100 border border-purple-200'
        : 'bg-purple-50/60 border border-purple-100'
    )}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" aria-hidden="true" />
        <span className="text-sm font-medium text-gray-800">
          {draftCount} draft {draftCount === 1 ? 'story' : 'stories'} ready for review
        </span>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
          showDraftsOnly
            ? 'text-purple-700 bg-purple-200 hover:bg-purple-300'
            : 'text-purple-600 hover:bg-purple-100'
        )}
        aria-pressed={showDraftsOnly}
      >
        {showDraftsOnly ? 'Show all' : 'Review drafts'}
      </button>
    </div>
  );
}

interface ActivityGroupSectionProps {
  group: ActivityGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  inlineDrafts?: ActivityGroup[];
  onPromoteToCareerStory?: (entryId: string) => void;
  showDraftsOnly?: boolean;
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

function ActivityGroupSection({ group, isCollapsed, onToggle, inlineDrafts, onPromoteToCareerStory, showDraftsOnly }: ActivityGroupSectionProps) {
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
    <section>
      {/* Group header with summary when collapsed */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2.5 w-full text-left transition-all rounded-lg',
          isCollapsed
            ? 'bg-white border border-gray-100 px-3 py-2.5 hover:border-gray-200 hover:shadow-sm mb-2'
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

        {/* Summary when collapsed - LEFT aligned after count */}
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
    </section>
  );
}
