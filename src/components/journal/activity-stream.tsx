import React, { useState, useMemo, useCallback } from 'react';
import { Clock, Layers, BookOpen, AlertCircle, Loader2, ChevronDown, ChevronRight, Minus, Plus, Search, X, Sparkles, FileText, MessageSquare } from 'lucide-react';
import { ActivityCard } from './activity-card';
import { StoryGroupHeader, UnassignedGroupHeader } from './story-group-header';
import { TemporalFilters, SourceFilters, StoryFilters, RoleFilters, FilterSeparator } from './activity-filters';
import { SourceIcons } from './source-icons';
import { ActivityGroup, Activity, SUPPORTED_SOURCES, ActivitySource, TemporalBucket, TEMPORAL_BUCKETS, StoryGroupingMethod, StoryDominantRole, STORY_ROLE_LABELS } from '../../types/activity';
import { cn } from '../../lib/utils';
import { INITIAL_ITEMS_LIMIT, MAX_SUMMARY_SOURCES, truncateText, TITLE_TRUNCATE_LENGTH, SHORT_TITLE_TRUNCATE_LENGTH } from './activity-card-utils';

interface ActivityStreamProps {
  groups: ActivityGroup[];
  groupBy: 'temporal' | 'source' | 'story';
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
  onDeleteEntry?: (entryId: string) => void;
  onPromoteToCareerStory?: (entryId: string) => void;
  /** True when narratives are being generated in background after sync */
  isEnhancingNarratives?: boolean;
}

/**
 * Display grouped activities in a clean, modern stream layout
 * Supports temporal, source, and story grouping modes with smart filters
 */
export function ActivityStream({
  groups,
  groupBy,
  isLoading,
  error,
  emptyMessage = 'No activities found',
  onRegenerateNarrative,
  regeneratingEntryId,
  onDeleteEntry,
  onPromoteToCareerStory,
  isEnhancingNarratives
}: ActivityStreamProps) {
  // Filter state
  const [selectedTemporalBuckets, setSelectedTemporalBuckets] = useState<TemporalBucket[]>([]);
  const [selectedSources, setSelectedSources] = useState<ActivitySource[]>([]);
  const [selectedStoryMethods, setSelectedStoryMethods] = useState<StoryGroupingMethod[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<StoryDominantRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Global expand/collapse state - track which groups are collapsed
  // Sources tab: all collapsed by default
  // Other tabs: all collapsed except first
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [lastGroupBy, setLastGroupBy] = useState(groupBy);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize collapsed state when groups load or tab changes
  React.useEffect(() => {
    const tabChanged = groupBy !== lastGroupBy;

    // Only initialize on first load or tab change
    if (groups.length > 0 && (tabChanged || !isInitialized)) {
      // Sources tab: collapse ALL groups
      // Other tabs: collapse all except first
      const initialCollapsed = groupBy === 'source'
        ? new Set(groups.map(g => g.key))
        : new Set(groups.slice(1).map(g => g.key));
      setCollapsedGroups(initialCollapsed);
      setIsInitialized(true);
      if (tabChanged) {
        setLastGroupBy(groupBy);
      }
    }
  }, [groups, groupBy, lastGroupBy, isInitialized]);

  // Compute available filters from groups
  const availableTemporalBuckets = useMemo(() => {
    if (groupBy !== 'temporal') return [];
    return groups.map(g => g.key as TemporalBucket);
  }, [groups, groupBy]);

  const availableSources = useMemo(() => {
    if (groupBy !== 'source') return [];
    return groups.map(g => g.key as ActivitySource);
  }, [groups, groupBy]);

  // Compute counts for filters
  const temporalCounts = useMemo(() => {
    if (groupBy !== 'temporal') return {};
    return groups.reduce((acc, g) => {
      acc[g.key as TemporalBucket] = g.count;
      return acc;
    }, {} as Record<TemporalBucket, number>);
  }, [groups, groupBy]);

  const sourceCounts = useMemo(() => {
    if (groupBy !== 'source') return {};
    return groups.reduce((acc, g) => {
      acc[g.key as ActivitySource] = g.count;
      return acc;
    }, {} as Record<ActivitySource, number>);
  }, [groups, groupBy]);

  // Compute available story methods and counts
  const availableStoryMethods = useMemo(() => {
    if (groupBy !== 'story') return [];
    const methods = new Set<StoryGroupingMethod>();
    groups.forEach(g => {
      if (g.storyMetadata?.groupingMethod) {
        methods.add(g.storyMetadata.groupingMethod);
      }
    });
    return Array.from(methods);
  }, [groups, groupBy]);

  const storyMethodCounts = useMemo(() => {
    if (groupBy !== 'story') return {};
    return groups.reduce((acc, g) => {
      const method = g.storyMetadata?.groupingMethod;
      if (method) {
        acc[method] = (acc[method] || 0) + 1;
      }
      return acc;
    }, {} as Record<StoryGroupingMethod, number>);
  }, [groups, groupBy]);

  // Compute available roles and counts (for story view)
  const availableRoles = useMemo(() => {
    if (groupBy !== 'story') return [];
    const roles = new Set<StoryDominantRole>();
    groups.forEach(g => {
      if (g.storyMetadata?.dominantRole) {
        roles.add(g.storyMetadata.dominantRole);
      }
    });
    // Sort by importance: Led > Contributed > Participated
    const roleOrder: StoryDominantRole[] = ['Led', 'Contributed', 'Participated'];
    return roleOrder.filter(r => roles.has(r));
  }, [groups, groupBy]);

  const roleCounts = useMemo(() => {
    if (groupBy !== 'story') return {};
    return groups.reduce((acc, g) => {
      const role = g.storyMetadata?.dominantRole;
      if (role) {
        acc[role] = (acc[role] || 0) + 1;
      }
      return acc;
    }, {} as Record<StoryDominantRole, number>);
  }, [groups, groupBy]);

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

    // Apply chip filters first
    if (groupBy === 'temporal' && selectedTemporalBuckets.length > 0) {
      result = result.filter(g => selectedTemporalBuckets.includes(g.key as TemporalBucket));
    }
    if (groupBy === 'source' && selectedSources.length > 0) {
      result = result.filter(g => selectedSources.includes(g.key as ActivitySource));
    }
    if (groupBy === 'story' && selectedStoryMethods.length > 0) {
      result = result.filter(g => {
        if (g.key === 'unassigned') return true;
        return g.storyMetadata?.groupingMethod && selectedStoryMethods.includes(g.storyMetadata.groupingMethod);
      });
    }
    if (groupBy === 'story' && selectedRoles.length > 0) {
      result = result.filter(g => {
        if (g.key === 'unassigned') return true; // Always show unassigned
        return g.storyMetadata?.dominantRole && selectedRoles.includes(g.storyMetadata.dominantRole);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.map(group => {
        // Check if group label/title matches
        const groupMatches = matchesSearch(group.label) ||
          (groupBy === 'story' && matchesSearch(group.storyMetadata?.description));

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
  }, [groups, groupBy, selectedTemporalBuckets, selectedSources, selectedStoryMethods, selectedRoles, searchQuery, matchesSearch, activityMatchesSearch]);

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

  const handleStoryMethodToggle = (method: StoryGroupingMethod) => {
    setSelectedStoryMethods(prev => {
      if (prev.includes(method)) {
        return prev.filter(m => m !== method);
      }
      return [...prev, method];
    });
  };

  const handleRoleToggle = (role: StoryDominantRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  // Toggle single group
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Expand/collapse all - check against filtered groups
  const allCollapsed = filteredGroups.length > 0 && filteredGroups.every(g => collapsedGroups.has(g.key));
  const allExpanded = filteredGroups.length > 0 && filteredGroups.every(g => !collapsedGroups.has(g.key));

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      // Collapse all
      setCollapsedGroups(new Set(filteredGroups.map(g => g.key)));
    } else {
      // Expand all
      setCollapsedGroups(new Set());
    }
  }, [allExpanded, filteredGroups]);

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
          {groupBy === 'temporal' && <Clock className="w-5 h-5 text-gray-400" />}
          {groupBy === 'source' && <Layers className="w-5 h-5 text-gray-400" />}
          {groupBy === 'story' && <BookOpen className="w-5 h-5 text-gray-400" />}
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Check if we should show filters (multiple options available)
  const showTemporalFilters = groupBy === 'temporal' && availableTemporalBuckets.length > 1;
  const showSourceFilters = groupBy === 'source' && availableSources.length > 1;
  const showStoryFilters = groupBy === 'story' && availableStoryMethods.length > 1;
  const showRoleFilters = groupBy === 'story' && availableRoles.length > 1;
  const showFilters = showTemporalFilters || showSourceFilters || showStoryFilters || showRoleFilters;

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
              {showSourceFilters && (
                <SourceFilters
                  availableSources={availableSources}
                  selectedSources={selectedSources}
                  onToggle={handleSourceToggle}
                  counts={sourceCounts}
                />
              )}
              {showStoryFilters && (
                <StoryFilters
                  availableMethods={availableStoryMethods}
                  selectedMethods={selectedStoryMethods}
                  onToggle={handleStoryMethodToggle}
                  counts={storyMethodCounts}
                />
              )}
              {/* Separator between story types and roles */}
              {showStoryFilters && showRoleFilters && <FilterSeparator />}
              {showRoleFilters && (
                <RoleFilters
                  availableRoles={availableRoles}
                  selectedRoles={selectedRoles}
                  onToggle={handleRoleToggle}
                  counts={roleCounts}
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
              allExpanded
                ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                : "text-primary-600 bg-primary-50 hover:bg-primary-100"
            )}
          >
            {allExpanded ? (
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

      {/* Story Drafts explanation banner - sticky below header */}
      {groupBy === 'story' && filteredGroups.length > 0 && (
        <div className="sticky top-16 z-10 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3 sm:p-4 mb-3 shadow-sm">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-1">
                Story Drafts
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed hidden sm:block">
                We spotted achievements in your recent work and turned them into draft stories.
                Review each one, add your perspective, then promote the best to polished career stories.
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed sm:hidden">
                Draft stories from your work — review and promote the best ones.
              </p>
              <div className="hidden sm:flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Tap to preview
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Promote to refine and save
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups - min-height ensures bottom items can scroll to top */}
      <div className={cn(
        'space-y-4',
        groupBy === 'story' && 'space-y-3',
        'min-h-[calc(100vh-12rem)]' // Ensures enough scroll space for bottom items
      )}>
        {groupBy === 'story' ? (
          filteredGroups.map((group) => (
            <StoryGroupSection
              key={group.key}
              group={group}
              isCollapsed={collapsedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onRegenerateNarrative={onRegenerateNarrative}
              regeneratingEntryId={regeneratingEntryId}
              onDeleteEntry={onDeleteEntry}
              onPromoteToCareerStory={onPromoteToCareerStory}
              isEnhancingNarratives={isEnhancingNarratives}
            />
          ))
        ) : (
          filteredGroups.map((group) => (
            <ActivityGroupSection
              key={group.key}
              group={group}
              groupBy={groupBy}
              isCollapsed={collapsedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
            />
          ))
        )}

        {/* Spacer to allow bottom items to scroll to top position */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  );
}

interface ActivityGroupSectionProps {
  group: ActivityGroup;
  groupBy: 'temporal' | 'source';
  isCollapsed: boolean;
  onToggle: () => void;
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

/**
 * Generate a concise summary of activities in a source group.
 * Shows key themes/topics based on source type.
 */
function generateSourceSummary(activities: Activity[], source: string): string {
  if (activities.length === 0) return '';

  const titles = activities.map(a => a.title);

  switch (source) {
    case 'jira': {
      // Extract issue types or statuses
      const types = new Set<string>();
      activities.forEach(a => {
        if (a.rawData?.issueType) types.add(a.rawData.issueType);
        if (a.rawData?.status) types.add(a.rawData.status);
      });
      if (types.size > 0) {
        return Array.from(types).slice(0, MAX_SUMMARY_SOURCES).join(', ');
      }
      // Fallback to title snippets
      return titles.slice(0, 2).map(t => truncateText(t, TITLE_TRUNCATE_LENGTH)).join('; ') +
             (titles.length > 2 ? '...' : '');
    }

    case 'github': {
      // Count PRs by state
      const states: Record<string, number> = {};
      activities.forEach(a => {
        const state = a.rawData?.state || 'open';
        states[state] = (states[state] || 0) + 1;
      });
      const parts: string[] = [];
      if (states.merged) parts.push(`${states.merged} merged`);
      if (states.open) parts.push(`${states.open} open`);
      if (states.closed) parts.push(`${states.closed} closed`);
      return parts.length > 0
        ? parts.join(', ')
        : titles.slice(0, 2).map(t => truncateText(t, TITLE_TRUNCATE_LENGTH)).join('; ');
    }

    case 'slack': {
      // Show channel names
      const channels = new Set<string>();
      activities.forEach(a => {
        if (a.rawData?.channelName) channels.add(a.rawData.channelName);
      });
      if (channels.size > 0) {
        return 'in ' + Array.from(channels).slice(0, MAX_SUMMARY_SOURCES).join(', ');
      }
      return `${activities.length} messages`;
    }

    case 'confluence':
      return `${activities.length} page${activities.length > 1 ? 's' : ''} updated`;

    case 'outlook':
    case 'teams':
    case 'google-calendar':
    case 'google-meet': {
      // Show meeting count and duration
      let totalDuration = 0;
      activities.forEach(a => {
        if (a.rawData?.duration) totalDuration += a.rawData.duration;
      });
      const hours = Math.round(totalDuration / 60);
      return hours > 0
        ? `${activities.length} meetings, ~${hours}h`
        : `${activities.length} meeting${activities.length > 1 ? 's' : ''}`;
    }

    default: {
      // Generic: show first few title snippets
      if (titles.length <= 2) {
        return titles.map(t => truncateText(t, 40)).join('; ');
      }
      return titles.slice(0, 2).map(t => truncateText(t, SHORT_TITLE_TRUNCATE_LENGTH)).join('; ') +
             ` +${titles.length - 2} more`;
    }
  }
}

function ActivityGroupSection({ group, groupBy, isCollapsed, onToggle }: ActivityGroupSectionProps) {
  // Progressive disclosure - track how many items to show
  const [showAll, setShowAll] = useState(false);

  // Get color and icon based on groupBy type
  const sourceInfo = groupBy === 'source' ? SUPPORTED_SOURCES[group.key as ActivitySource] : null;
  const SourceIcon = groupBy === 'source' ? SourceIcons[group.key] : null;
  // Use source color for source tab, primary purple for timeline tab
  const labelColor = groupBy === 'source'
    ? (sourceInfo?.color || '#6B7280')
    : '#5D259F'; // Primary brand color for temporal groups

  // Generate summary for collapsed state
  const collapsedSummary = useMemo(() => {
    if (!isCollapsed) return '';
    if (groupBy === 'source') {
      return generateSourceSummary(group.activities, group.key);
    }
    if (groupBy === 'temporal') {
      return generateTemporalSummary(group.activities);
    }
    return '';
  }, [groupBy, isCollapsed, group.activities, group.key]);

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

        {/* Source icon for Sources tab */}
        {groupBy === 'source' && SourceIcon && (
          <div
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-white"
            style={{ backgroundColor: labelColor }}
          >
            <SourceIcon className="w-3.5 h-3.5" />
          </div>
        )}

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
            <span className="text-gray-300 mx-1.5">·</span>
            {collapsedSummary}
          </span>
        )}

        {/* Spacer for expanded state */}
        {!isCollapsed && (
          <div className="flex-1 h-px bg-gray-100" />
        )}
      </button>

      {/* Activities - progressive disclosure with "Show more" */}
      {!isCollapsed && (
        <div className="bg-white rounded-lg border border-gray-100">
          {visibleActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              showStoryBadge={true}
              showSourceIcon={groupBy !== 'source'}
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
    </section>
  );
}

/**
 * Story group section with collapsible header showing story card
 */
interface StoryGroupSectionProps {
  group: ActivityGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
  onDeleteEntry?: (entryId: string) => void;
  onPromoteToCareerStory?: (entryId: string) => void;
  isEnhancingNarratives?: boolean;
}

function StoryGroupSection({ group, isCollapsed, onToggle, onRegenerateNarrative, regeneratingEntryId, onDeleteEntry, onPromoteToCareerStory, isEnhancingNarratives }: StoryGroupSectionProps) {
  const isUnassigned = group.key === 'unassigned';
  const isExpanded = !isCollapsed;

  // Progressive disclosure for unassigned activities
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);
  const visibleUnassignedActivities = showAllUnassigned
    ? group.activities
    : group.activities.slice(0, INITIAL_ITEMS_LIMIT);
  const hiddenUnassignedCount = Math.max(0, group.activities.length - INITIAL_ITEMS_LIMIT);
  const hasMoreUnassigned = hiddenUnassignedCount > 0 && !showAllUnassigned;

  // Reset when collapsed
  React.useEffect(() => {
    if (isCollapsed) {
      setShowAllUnassigned(false);
    }
  }, [isCollapsed]);

  return (
    <section>
      {/* Story Header with integrated activities */}
      {isUnassigned ? (
        <>
          <UnassignedGroupHeader
            activityCount={group.count}
            isExpanded={isExpanded}
            onToggle={onToggle}
          />
          {/* Unassigned activities with progressive disclosure */}
          {isExpanded && group.activities.length > 0 && (
            <div className="mt-2 bg-white rounded-lg border border-gray-100">
              {visibleUnassignedActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  showStoryBadge={false}
                />
              ))}
              {/* Show more button */}
              {hasMoreUnassigned && (
                <button
                  onClick={() => setShowAllUnassigned(true)}
                  className="w-full py-2.5 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Show {hiddenUnassignedCount} more
                </button>
              )}
            </div>
          )}
        </>
      ) : group.storyMetadata ? (
        <StoryGroupHeader
          storyMetadata={group.storyMetadata}
          activityCount={group.count}
          isExpanded={isExpanded}
          onToggle={onToggle}
          onRegenerateNarrative={onRegenerateNarrative}
          isRegenerateLoading={regeneratingEntryId === group.storyMetadata.id}
          onDeleteEntry={onDeleteEntry}
          onPromoteToCareerStory={onPromoteToCareerStory}
          activities={group.activities}
          isEnhancingNarratives={isEnhancingNarratives}
        />
      ) : (
        // Fallback minimal header with progressive disclosure
        <>
          <button
            onClick={onToggle}
            className="flex items-center gap-2 w-full text-left"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-semibold text-purple-600">{group.label}</span>
            <span className="text-xs text-gray-400">{group.count}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </button>
          {isExpanded && group.activities.length > 0 && (
            <div className="mt-2 bg-white rounded-lg border border-gray-100">
              {visibleUnassignedActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  showStoryBadge={false}
                />
              ))}
              {/* Show more button */}
              {hasMoreUnassigned && (
                <button
                  onClick={() => setShowAllUnassigned(true)}
                  className="w-full py-2.5 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Show {hiddenUnassignedCount} more
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

