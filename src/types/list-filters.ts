/**
 * Universal Filter/View Types
 *
 * Shared contracts for the list filter system used across all 4 entity types:
 * Activities, Draft Stories, Career Stories, and Playbook.
 */

import type React from 'react';

// ---------------------------------------------------------------------------
// FilterChip — domain-agnostic chip definition
// ---------------------------------------------------------------------------

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
  Icon?: React.FC<{ className?: string }>;
  /** Tailwind color prefix, e.g. 'indigo' */
  color?: string;
  /** Explicit icon color (CSS), used when Icon has brand color */
  iconColor?: string;
  /** When true, chip is shown but non-interactive (zero items) */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// GroupedSection<T> — universal grouped output
// ---------------------------------------------------------------------------

export interface GroupedSection<T> {
  key: string;
  label: string;
  count: number;
  items: T[];
  Icon?: React.FC<{ className?: string }>;
  /** Tailwind color prefix for the group header icon */
  color?: string;
  /** Short tags shown when collapsed (e.g. category names) */
  collapsedTags?: string[];
  /** Summary text shown when collapsed (e.g. "3 GitHub, 2 Jira") */
  collapsedSummary?: string;
  /** Description shown when expanded (e.g. category description) */
  description?: string;
}

// ---------------------------------------------------------------------------
// ViewMode
// ---------------------------------------------------------------------------

export type ViewMode = 'time' | 'typed';

// ---------------------------------------------------------------------------
// ListFilterConfig<T> — wires an entity type to the useListFilters hook
// ---------------------------------------------------------------------------

export interface ListFilterConfig<T> {
  /** Entity display name (for aria labels) */
  entityName: string;
  /** Labels for the view toggle: [timeLabel, typedLabel] */
  viewLabels: [string, string];
  /** Chip definitions for the temporal filter row */
  temporalChips: FilterChip[];
  /** Chip definitions for the typed filter row */
  typedChips: FilterChip[];
  /** Group items by time — called when viewMode is 'time' */
  groupByTime: (items: T[]) => GroupedSection<T>[];
  /** Group items by type/category — called when viewMode is 'typed' */
  groupByType: (items: T[]) => GroupedSection<T>[];
  /** Return true if the item matches the search query */
  matchesSearch: (item: T, query: string) => boolean;
  /** Extract temporal key for chip filtering */
  getTemporalKey: (item: T) => string;
  /** Extract typed key for chip filtering */
  getTypedKey: (item: T) => string;
}
