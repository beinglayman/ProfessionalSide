/**
 * CollapsibleGroup<T> — Universal collapsible section for grouped lists
 *
 * Renders a timeline spine (dot + connecting line), collapsible header with
 * chevron/icon/label/count/collapsed-tags, expanded content via renderItem,
 * and a "+N more" progressive disclosure button.
 *
 * Replaces 6 duplicated patterns across activity-stream.tsx and CareerStoriesPage.tsx.
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GroupedSection } from '../../types/list-filters';
import { DERIVATION_COLOR_CLASSES } from '../career-stories/constants';

interface CollapsibleGroupProps<T> {
  section: GroupedSection<T>;
  isCollapsed: boolean;
  onToggle: () => void;
  isLast: boolean;
  /** Show timeline spine (dot + connecting line). Default true. */
  showSpine?: boolean;
  /** Items shown before "+N more" button. 0 = show all. */
  previewLimit?: number;
  /** Whether "+N more" is toggled on for this group */
  showAll: boolean;
  onToggleShowAll: () => void;
  /** Render a single item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optional footer rendered inside expanded content (e.g. category tags, empty CTA) */
  renderFooter?: (section: GroupedSection<T>) => React.ReactNode;
  /** Override dot color (CSS color string). Default: primary-500 / gray-300 */
  dotColor?: string;
}

export function CollapsibleGroup<T>({
  section,
  isCollapsed,
  onToggle,
  isLast,
  showSpine = true,
  previewLimit = 0,
  showAll,
  onToggleShowAll,
  renderItem,
  renderFooter,
  dotColor,
}: CollapsibleGroupProps<T>) {
  const colorClasses = section.color
    ? DERIVATION_COLOR_CLASSES[section.color] || DERIVATION_COLOR_CLASSES.gray
    : null;

  const visibleItems = previewLimit > 0 && !showAll
    ? section.items.slice(0, previewLimit)
    : section.items;
  const hiddenCount = previewLimit > 0 ? section.items.length - previewLimit : 0;

  // Reset showAll when section collapses
  const [prevCollapsed, setPrevCollapsed] = useState(isCollapsed);
  useEffect(() => {
    if (isCollapsed && !prevCollapsed && showAll) {
      onToggleShowAll();
    }
    setPrevCollapsed(isCollapsed);
  }, [isCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('relative', showSpine && 'flex gap-4')}>
      {/* Timeline spine */}
      {showSpine && (
        <div className="flex flex-col items-center flex-shrink-0 w-5">
          <div
            className={cn(
              'w-3 h-3 rounded-full mt-4 flex-shrink-0 ring-4 ring-white z-10',
              dotColor ? '' : (isCollapsed ? 'bg-gray-300' : 'bg-primary-500'),
            )}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
          {!(isLast && isCollapsed) && <div className="w-px flex-1 bg-gray-200" />}
        </div>
      )}

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {/* Collapsible header */}
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-2 w-full text-left transition-all rounded-lg',
            isCollapsed ? 'py-1 hover:bg-gray-50 mb-1' : 'mb-2 group',
          )}
        >
          <div className="flex-shrink-0">
            {isCollapsed
              ? <ChevronRight className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
          {section.Icon && colorClasses && (
            <section.Icon className={cn('h-4 w-4', colorClasses.iconText)} />
          )}
          <span className="text-sm font-semibold text-gray-700">{section.label}</span>
          {section.count > 0 && (
            <span className="text-[11px] tabular-nums text-gray-400">{section.count}</span>
          )}
          {isCollapsed && section.count === 0 && (
            <span className="text-[11px] text-gray-400">empty</span>
          )}
          {isCollapsed && section.collapsedTags && section.collapsedTags.length > 0 && (
            <span className="text-[11px] text-gray-500 truncate">
              <span className="text-gray-300 mx-1">&middot;</span>
              {section.collapsedTags.join(', ')}
            </span>
          )}
          {isCollapsed && section.collapsedSummary && (
            <span className="text-[11px] text-gray-500 truncate">
              <span className="text-gray-300 mx-1">&middot;</span>
              {section.collapsedSummary}
            </span>
          )}
          {!isCollapsed && <div className="flex-1 h-px bg-gray-100" />}
        </button>

        {/* Expanded content */}
        {!isCollapsed && (
          <>
            {section.description && (
              <p className="text-xs text-gray-500 mb-2">{section.description}</p>
            )}

            {section.items.length === 0 && renderFooter ? (
              renderFooter(section)
            ) : (
              <div className="space-y-2 mb-3">
                {visibleItems.map((item, i) => renderItem(item, i))}
                {!showAll && hiddenCount > 0 && (
                  <button
                    onClick={onToggleShowAll}
                    className="w-full py-2 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-colors border border-gray-100 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Show {hiddenCount} more
                  </button>
                )}
              </div>
            )}

            {section.items.length > 0 && renderFooter && renderFooter(section)}
          </>
        )}
      </div>
    </div>
  );
}
