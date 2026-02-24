import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { ActivityGroup } from '../types/activity';

export interface FilteredActivityGroup extends ActivityGroup {
  /** Original activity count before draft filtering (for "3 of 5" display) */
  _originalCount?: number;
}

export function useDraftTimelineInteraction(
  storyGroups: ActivityGroup[],
  activityGroups: ActivityGroup[]
) {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => storyGroups.find(g => g.key === selectedDraftId) ?? null,
    [selectedDraftId, storyGroups]
  );

  const filteredActivityIds = useMemo(() => {
    if (!selectedDraft?.storyMetadata?.activityEdges) return null;
    return new Set(selectedDraft.storyMetadata.activityEdges.map(e => e.activityId));
  }, [selectedDraft]);

  // Pre-filtered groups for ActivityStream — filtering lives HERE, not in ActivityStream
  // Returns null when no draft is selected OR when 0 activities match (to keep timeline visible)
  const filteredGroups = useMemo((): FilteredActivityGroup[] | null => {
    if (!filteredActivityIds) return null; // null = no draft selected, use original groups
    const filtered = activityGroups
      .map(g => ({
        ...g,
        activities: g.activities.filter(a => filteredActivityIds.has(a.id)),
        _originalCount: g.activities.length,
      }))
      .filter(g => g.activities.length > 0);
    // If 0 matches, return null to keep timeline visible (banner explains activities are outside range)
    if (filtered.length === 0) return null;
    return filtered;
  }, [activityGroups, filteredActivityIds]);

  // Count of matching activities in the loaded timeline range
  const matchCount = useMemo(() => {
    if (!filteredGroups) return 0;
    return filteredGroups.reduce((sum, g) => sum + g.activities.length, 0);
  }, [filteredGroups]);

  // Total activities claimed by the draft (may exceed loaded range)
  // Fall back to draft.count (backend grouping count) when activityEdges is empty/undefined
  const totalDraftActivityCount =
    selectedDraft?.storyMetadata?.activityEdges?.length || selectedDraft?.count || 0;
  const missingCount = Math.max(0, totalDraftActivityCount - matchCount);

  // Handle draft disappearing after SSE refresh
  useEffect(() => {
    if (selectedDraftId && !storyGroups.some(g => g.key === selectedDraftId)) {
      setSelectedDraftId(null);
    }
  }, [selectedDraftId, storyGroups]);

  const selectDraft = useCallback((id: string | null) => {
    setSelectedDraftId(prev => prev === id ? null : id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDraftId(null);
  }, []);

  return {
    selectedDraftId,
    selectedDraft,
    filteredActivityIds,
    filteredGroups,
    matchCount,
    totalDraftActivityCount,
    missingCount,
    selectDraft,
    clearSelection,
  };
}
