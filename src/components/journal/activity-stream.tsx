import React, { useMemo } from 'react';
import { Clock, AlertCircle, Loader2 } from 'lucide-react';
import { ActivityCard } from './activity-card';
import { Activity } from '../../types/activity';
import { useListFilters } from '../../hooks/useListFilters';
import { makeActivitiesFilterConfig } from '../../utils/list-filter-configs';
import { CollapsibleGroup } from '../ui/collapsible-group';
import { ChipFilter } from '../ui/chip-filter';
import { ViewToggle } from '../ui/view-toggle';
import { FilterBar, FilterSeparator, ExpandCollapseButton } from '../ui/filter-bar';
import type { FilteredActivityGroup } from '../../hooks/useDraftTimelineInteraction';

interface ActivityStreamProps {
  groups: FilteredActivityGroup[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  /** When true, hide the filter bar (draft filter is active, filters are suspended) */
  hideFilters?: boolean;
  /** Set of activity IDs belonging to the currently hovered draft story */
  hoveredDraftActivityIds?: Set<string>;
  /** Whether any draft story card is currently being hovered */
  isAnyDraftHovered?: boolean;
}

/**
 * Display grouped activities in a clean, modern stream layout.
 * Pure renderer — receives pre-filtered groups from JournalListPage.
 * Draft story display moved to DraftStorySidebar (desktop) / DraftSheetContent (mobile).
 */
export function ActivityStream({
  groups,
  isLoading,
  error,
  emptyMessage = 'No activities found',
  hideFilters = false,
  hoveredDraftActivityIds,
  isAnyDraftHovered = false,
}: ActivityStreamProps) {
  // Activities: useListFilters with flat Activity[] for filtering + grouping
  const { config: activitiesFilterConfig, allActivities } = useMemo(
    () => makeActivitiesFilterConfig(groups),
    [groups],
  );
  const activities = useListFilters(activitiesFilterConfig, allActivities);

  // Build a map of group key → original count for "N of M" display
  const originalCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of groups) {
      if (g._originalCount != null) {
        map.set(g.key, g._originalCount);
      }
    }
    return map;
  }, [groups]);

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

  return (
    <div className="space-y-2">
      {/* Controls: FilterBar — hidden when draft filter is active */}
      {!hideFilters && (
        <FilterBar
          viewToggle={
            <ViewToggle
              mode={activities.viewMode}
              onModeChange={activities.setViewMode}
              labels={activitiesFilterConfig.viewLabels}
            />
          }
          expandCollapseButton={
            <ExpandCollapseButton anyExpanded={activities.anyExpanded} onToggle={activities.toggleAll} />
          }
          activeFilterCount={activities.activeFilterCount}
        >
          {activitiesFilterConfig.temporalChips.length > 0 && (
            <ChipFilter
              mode="dropdown"
              label="When"
              chips={activitiesFilterConfig.temporalChips}
              selectedKeys={activities.selectedTemporalKeys}
              onToggle={activities.toggleTemporalKey}
            />
          )}
          {activitiesFilterConfig.typedChips.length > 0 && (
            <>
              <FilterSeparator />
              <ChipFilter
                mode="dropdown"
                label="Source"
                chips={activitiesFilterConfig.typedChips}
                selectedKeys={activities.selectedTypedKeys}
                onToggle={activities.toggleTypedKey}
              />
            </>
          )}
        </FilterBar>
      )}

      {/* Groups - min-height ensures bottom items can scroll to top */}
      <div className="min-h-[calc(100vh-12rem)]">
        {activities.groups.map((group, idx) => (
          <CollapsibleGroup<Activity>
            key={group.key}
            section={group}
            isCollapsed={activities.collapsedGroups.has(group.key)}
            onToggle={() => activities.toggleGroup(group.key)}
            isLast={idx === activities.groups.length - 1}
            showSpine={true}
            previewLimit={15}
            showAll={activities.showAllGroups.has(group.key)}
            onToggleShowAll={() => activities.toggleShowAll(group.key)}
            originalCount={originalCountMap.get(group.key)}
            renderItem={(activity) => {
              const isHighlighted = hoveredDraftActivityIds?.has(activity.id) ?? false;
              const isDimmed = isAnyDraftHovered && !isHighlighted;
              return (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  showStoryBadge={false}
                  showSourceIcon={true}
                  isHighlighted={isHighlighted}
                  isDimmed={isDimmed}
                />
              );
            }}
          />
        ))}

        {/* Spacer to allow bottom items to scroll to top position */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  );
}
