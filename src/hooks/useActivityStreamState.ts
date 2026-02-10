import { useState, useMemo, useCallback } from 'react';
import { Activity, ActivitySource, TemporalBucket, ActivityGroup } from '../types/activity';

// ─── useActivityFilters ─────────────────────────────────────────────────────

interface UseActivityFiltersOptions {
  groups: ActivityGroup[];
}

export function useActivityFilters({ groups }: UseActivityFiltersOptions) {
  const [selectedTemporalBuckets, setSelectedTemporalBuckets] = useState<TemporalBucket[]>([]);
  const [selectedSources, setSelectedSources] = useState<ActivitySource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDraftCategories, setSelectedDraftCategories] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const availableTemporalBuckets = useMemo(() => {
    return groups.map(g => g.key as TemporalBucket);
  }, [groups]);

  const temporalCounts = useMemo(() => {
    return groups.reduce((acc, g) => {
      acc[g.key as TemporalBucket] = g.count;
      return acc;
    }, {} as Record<TemporalBucket, number>);
  }, [groups]);

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

  const matchesSearch = useCallback((text: string | null | undefined): boolean => {
    if (!searchQuery.trim()) return true;
    if (!text) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  const activityMatchesSearch = useCallback((activity: Activity): boolean => {
    if (!searchQuery.trim()) return true;
    return (
      matchesSearch(activity.title) ||
      matchesSearch(activity.description) ||
      matchesSearch(activity.sourceId) ||
      activity.crossToolRefs.some(ref => matchesSearch(ref))
    );
  }, [searchQuery, matchesSearch]);

  const filteredGroups = useMemo(() => {
    let result = groups;

    if (selectedTemporalBuckets.length > 0) {
      result = result.filter(g => selectedTemporalBuckets.includes(g.key as TemporalBucket));
    }

    if (selectedSources.length > 0) {
      result = result.map(group => {
        const filtered = group.activities.filter(a =>
          selectedSources.includes(a.source as ActivitySource)
        );
        if (filtered.length === 0) return null;
        return { ...group, activities: filtered, count: filtered.length };
      }).filter((g): g is ActivityGroup => g !== null);
    }

    if (searchQuery.trim()) {
      result = result.map(group => {
        const groupMatches = matchesSearch(group.label);
        const matchingActivities = group.activities.filter(activityMatchesSearch);

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

  const handleTemporalToggle = useCallback((bucket: TemporalBucket) => {
    setSelectedTemporalBuckets(prev =>
      prev.includes(bucket) ? prev.filter(b => b !== bucket) : [...prev, bucket]
    );
  }, []);

  const handleSourceToggle = useCallback((source: ActivitySource) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  }, []);

  const handleDraftCategoryToggle = useCallback((category: string) => {
    setSelectedDraftCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }, []);

  const activeFilterCount = selectedTemporalBuckets.length + selectedSources.length;

  return {
    searchQuery,
    setSearchQuery,
    selectedTemporalBuckets,
    selectedSources,
    selectedDraftCategories,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    availableTemporalBuckets,
    temporalCounts,
    availableSources,
    filteredGroups,
    activeFilterCount,
    handleTemporalToggle,
    handleSourceToggle,
    handleDraftCategoryToggle,
  };
}

// ─── useExpansionState ──────────────────────────────────────────────────────

interface UseExpansionStateOptions {
  groups: ActivityGroup[];
  storyGroups: ActivityGroup[];
  filteredGroups: ActivityGroup[];
  showDraftsOnly: boolean;
}

/**
 * Manages expand/collapse state for both Activities and Draft Stories tabs.
 *
 * Activities mode: tracks which temporal groups are collapsed (inverted — collapsed set).
 * Draft Stories mode: tracks which draft cards are expanded (expanded set).
 *
 * The toolbar Expand/Collapse button uses `anyExpanded` and `toggleAll` which
 * automatically operate on whichever tab is active.
 */
export function useExpansionState({ groups, storyGroups, filteredGroups, showDraftsOnly }: UseExpansionStateOptions) {
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | null>(null);

  const isGroupCollapsed = useCallback((key: string) => {
    return collapsedGroups === null || collapsedGroups.has(key);
  }, [collapsedGroups]);

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

  const anyExpanded = showDraftsOnly
    ? expandedDrafts.size > 0
    : filteredGroups.length > 0 && filteredGroups.some(g => !isGroupCollapsed(g.key));

  const toggleAll = useCallback(() => {
    if (showDraftsOnly) {
      if (expandedDrafts.size > 0) {
        setExpandedDrafts(new Set());
      } else {
        setExpandedDrafts(new Set(storyGroups.map(g => g.key)));
      }
    } else {
      if (anyExpanded) {
        setCollapsedGroups(new Set(filteredGroups.map(g => g.key)));
      } else {
        setCollapsedGroups(new Set());
      }
    }
  }, [showDraftsOnly, anyExpanded, filteredGroups, expandedDrafts, storyGroups]);

  const toggleDraft = useCallback((key: string) => {
    setExpandedDrafts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  return {
    expandedDrafts,
    collapsedGroups,
    setCollapsedGroups,
    isGroupCollapsed,
    toggleGroup,
    anyExpanded,
    toggleAll,
    toggleDraft,
  };
}
