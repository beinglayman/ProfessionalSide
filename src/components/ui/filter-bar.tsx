/**
 * FilterBar — Responsive filter container
 *
 * Desktop: inline flex row with optional FilterSeparator between groups.
 * Mobile: filter toggle button + collapsible drawer.
 *
 * Children are rendered as slot groups. pillToggle and expandCollapseButton
 * are positioned at the edges.
 */

import React, { useState } from 'react';
import { SlidersHorizontal, Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Pipe separator between filter groups */
export function FilterSeparator() {
  return <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />;
}

interface FilterBarProps {
  /** Left-side pill toggle (e.g. Activities/Drafts or Stories/Playbook) */
  pillToggle?: React.ReactNode;
  /** Filter content rendered inline on desktop, in drawer on mobile */
  children: React.ReactNode;
  /** View mode toggle (e.g. By Time / By Category), positioned right before expand/collapse */
  viewToggle?: React.ReactNode;
  /** Expand/Collapse All button, positioned at the right edge */
  expandCollapseButton?: React.ReactNode;
  /** Number of active filters (shown on mobile toggle badge) */
  activeFilterCount?: number;
}

export function FilterBar({
  pillToggle,
  children,
  viewToggle,
  expandCollapseButton,
  activeFilterCount = 0,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm">
      {/* Top row */}
      <div className="flex items-center gap-2 py-2 px-3">
        {pillToggle}

        {/* Desktop: inline filters */}
        <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0">
          {children}
        </div>

        {/* Mobile: filter toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            'sm:hidden flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0',
            mobileOpen || activeFilterCount > 0
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 text-[10px] font-bold rounded-full bg-primary-500 text-white flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {viewToggle}
        {expandCollapseButton}
      </div>

      {/* Mobile: expanded filter drawer */}
      {mobileOpen && (
        <div className="sm:hidden px-3 pb-2.5 pt-0.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

/** Pre-built expand/collapse button for FilterBar */
export function ExpandCollapseButton({
  anyExpanded,
  onToggle,
}: {
  anyExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors flex-shrink-0',
        anyExpanded
          ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          : 'text-primary-600 bg-primary-50 hover:bg-primary-100',
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
  );
}
