import React, { useState, useMemo, useCallback } from 'react';
import { Clock, Layers, BookOpen, AlertCircle, Loader2, ChevronDown, ChevronRight, Minus, Plus, Search, X } from 'lucide-react';
import { ActivityCard } from './activity-card';
import { StoryGroupHeader, UnassignedGroupHeader } from './story-group-header';
import { TemporalFilters, SourceFilters, StoryFilters, RoleFilters } from './activity-filters';
import { ActivityGroup, Activity, SUPPORTED_SOURCES, ActivitySource, TemporalBucket, TEMPORAL_BUCKETS, StoryGroupingMethod, StoryDominantRole, STORY_ROLE_LABELS, ActivityStoryEdge } from '../../types/activity';
import { cn } from '../../lib/utils';

interface ActivityStreamProps {
  groups: ActivityGroup[];
  groupBy: 'temporal' | 'source' | 'story';
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRegenerateNarrative?: (entryId: string) => void;
  regeneratingEntryId?: string | null;
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
  regeneratingEntryId
}: ActivityStreamProps) {
  // Filter state
  const [selectedTemporalBuckets, setSelectedTemporalBuckets] = useState<TemporalBucket[]>([]);
  const [selectedSources, setSelectedSources] = useState<ActivitySource[]>([]);
  const [selectedStoryMethods, setSelectedStoryMethods] = useState<StoryGroupingMethod[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<StoryDominantRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Global expand/collapse state - track which groups are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  // Expand/collapse all
  const allExpanded = collapsedGroups.size === 0;

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
      {/* Controls row: Search + Filters + Expand/Collapse */}
      {(showFilters || filteredGroups.length >= 1 || groups.length >= 1) && (
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={cn(
                "w-36 pl-8 pr-7 py-1.5 text-xs rounded-lg border transition-all",
                "bg-white border-gray-200 placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
                searchQuery && "border-primary-300 bg-primary-50/30"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters (scrollable) */}
          {showFilters && (
            <div className="flex-1 min-w-0 overflow-x-auto">
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
              {showRoleFilters && (
                <RoleFilters
                  availableRoles={availableRoles}
                  selectedRoles={selectedRoles}
                  onToggle={handleRoleToggle}
                  counts={roleCounts}
                />
              )}
            </div>
          )}

          {/* Spacer when no filters */}
          {!showFilters && <div className="flex-1" />}

          {/* Expand/Collapse All - always show if there are groups */}
          <button
            onClick={toggleAll}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0",
              allExpanded
                ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                : "text-primary-600 bg-primary-50 hover:bg-primary-100"
            )}
          >
            {allExpanded ? (
              <>
                <Minus className="w-3.5 h-3.5" />
                Collapse all
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Expand all
              </>
            )}
          </button>
        </div>
      )}

      {/* Groups */}
      <div className="space-y-4">
        {groupBy === 'story' ? (
          filteredGroups.map((group) => (
            <StoryGroupSection
              key={group.key}
              group={group}
              isCollapsed={collapsedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onRegenerateNarrative={onRegenerateNarrative}
              regeneratingEntryId={regeneratingEntryId}
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

function ActivityGroupSection({ group, groupBy, isCollapsed, onToggle }: ActivityGroupSectionProps) {
  // Get source color for source grouping
  const sourceInfo = groupBy === 'source' ? SUPPORTED_SOURCES[group.key as ActivitySource] : null;

  return (
    <section>
      {/* Minimal group header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-2 group w-full text-left"
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
          <span
            className="text-sm font-semibold"
            style={sourceInfo ? { color: sourceInfo.color } : undefined}
          >
            {group.label}
          </span>
          <span className="text-xs text-gray-400">
            {group.count}
          </span>
        </div>
        <div className="flex-1 h-px bg-gray-100" />
      </button>

      {/* Activities */}
      {!isCollapsed && (
        <div className="bg-white rounded-lg border border-gray-100">
          {group.activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              showStoryBadge={true}
            />
          ))}
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
}

function StoryGroupSection({ group, isCollapsed, onToggle, onRegenerateNarrative, regeneratingEntryId }: StoryGroupSectionProps) {
  const isUnassigned = group.key === 'unassigned';
  const isExpanded = !isCollapsed;

  return (
    <section className="space-y-2">
      {/* Story Header (collapsible) */}
      {isUnassigned ? (
        <UnassignedGroupHeader
          activityCount={group.count}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
      ) : group.storyMetadata ? (
        <StoryGroupHeader
          storyMetadata={group.storyMetadata}
          activityCount={group.count}
          isExpanded={isExpanded}
          onToggle={onToggle}
          onRegenerateNarrative={onRegenerateNarrative}
          isRegenerateLoading={regeneratingEntryId === group.storyMetadata.id}
        />
      ) : (
        // Fallback minimal header
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
      )}

      {/* Activities (collapsible) */}
      {isExpanded && (
        <div className="ml-4 pl-4 border-l-2 border-gray-100">
          {group.activities.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-100">
              {group.activities.map((activity) => {
                // Find the edge for this activity if available
                const edge = group.storyMetadata?.activityEdges?.find(
                  (e: ActivityStoryEdge) => e.activityId === activity.id
                );
                return (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    showStoryBadge={false}
                    edge={edge}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-4 px-3 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No activities loaded for this story
            </div>
          )}
        </div>
      )}
    </section>
  );
}
