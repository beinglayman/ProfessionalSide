/**
 * useListFilters<T> — Universal filter/view/collapse hook
 *
 * Manages view mode, chip filter selections, search, collapse state,
 * and "+N more" expansion for any entity type. Consumes a ListFilterConfig<T>
 * to stay domain-agnostic.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ListFilterConfig, GroupedSection, ViewMode } from '../types/list-filters';

interface UseListFiltersReturn<T> {
  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  // Temporal chips
  selectedTemporalKeys: Set<string>;
  toggleTemporalKey: (key: string) => void;
  clearTemporalKeys: () => void;
  // Typed chips
  selectedTypedKeys: Set<string>;
  toggleTypedKey: (key: string) => void;
  clearTypedKeys: () => void;
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Collapse
  collapsedGroups: Set<string>;
  toggleGroup: (key: string) => void;
  anyExpanded: boolean;
  toggleAll: () => void;
  // Show all ("+N more")
  showAllGroups: Set<string>;
  toggleShowAll: (key: string) => void;
  // Derived
  filteredItems: T[];
  groups: GroupedSection<T>[];
  activeFilterCount: number;
}

export function useListFilters<T>(
  config: ListFilterConfig<T>,
  items: T[],
): UseListFiltersReturn<T> {
  const [viewMode, setViewMode] = useState<ViewMode>('time');
  const [selectedTemporalKeys, setSelectedTemporalKeys] = useState<Set<string>>(new Set());
  const [selectedTypedKeys, setSelectedTypedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAllGroups, setShowAllGroups] = useState<Set<string>>(new Set());

  // ── Chip toggles ──────────────────────────────────────────────────────

  const toggleTemporalKey = useCallback((key: string) => {
    setSelectedTemporalKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const clearTemporalKeys = useCallback(() => setSelectedTemporalKeys(new Set()), []);

  const toggleTypedKey = useCallback((key: string) => {
    setSelectedTypedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const clearTypedKeys = useCallback(() => setSelectedTypedKeys(new Set()), []);

  // ── Filtering ─────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let result = items;

    // Temporal chip filter
    if (selectedTemporalKeys.size > 0) {
      result = result.filter(item => selectedTemporalKeys.has(config.getTemporalKey(item)));
    }

    // Typed chip filter
    if (selectedTypedKeys.size > 0) {
      result = result.filter(item => selectedTypedKeys.has(config.getTypedKey(item)));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => config.matchesSearch(item, q));
    }

    return result;
  }, [items, selectedTemporalKeys, selectedTypedKeys, searchQuery, config]);

  // ── Grouping ──────────────────────────────────────────────────────────

  const groups = useMemo(() => {
    return viewMode === 'time'
      ? config.groupByTime(filteredItems)
      : config.groupByType(filteredItems);
  }, [viewMode, filteredItems, config]);

  // ── Collapse init: all except first collapsed, resets when groups change structurally ──

  const groupFingerprint = groups.map(g => g.key).join(',');
  const lastFingerprint = useRef('');

  useEffect(() => {
    if (groups.length === 0) return;
    if (groupFingerprint === lastFingerprint.current) return;
    lastFingerprint.current = groupFingerprint;

    if (groups.length <= 1) {
      setCollapsedGroups(new Set());
    } else {
      setCollapsedGroups(new Set(groups.slice(1).map(g => g.key)));
    }
    setShowAllGroups(new Set());
  }, [groupFingerprint, groups]);

  // ── Collapse toggles ──────────────────────────────────────────────────

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const anyExpanded = useMemo(
    () => groups.length > 0 && groups.some(g => !collapsedGroups.has(g.key)),
    [groups, collapsedGroups],
  );

  const toggleAll = useCallback(() => {
    if (anyExpanded) {
      setCollapsedGroups(new Set(groups.map(g => g.key)));
    } else {
      setCollapsedGroups(new Set());
    }
  }, [anyExpanded, groups]);

  // ── Show all ("+N more") ──────────────────────────────────────────────

  const toggleShowAll = useCallback((key: string) => {
    setShowAllGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Active filter count ───────────────────────────────────────────────

  const activeFilterCount = selectedTemporalKeys.size + selectedTypedKeys.size + (searchQuery.trim() ? 1 : 0);

  return {
    viewMode,
    setViewMode,
    selectedTemporalKeys,
    toggleTemporalKey,
    clearTemporalKeys,
    selectedTypedKeys,
    toggleTypedKey,
    clearTypedKeys,
    searchQuery,
    setSearchQuery,
    collapsedGroups,
    toggleGroup,
    anyExpanded,
    toggleAll,
    showAllGroups,
    toggleShowAll,
    filteredItems,
    groups,
    activeFilterCount,
  };
}
