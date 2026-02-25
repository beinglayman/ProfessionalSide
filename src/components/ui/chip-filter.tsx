/**
 * ChipFilter — Domain-agnostic filter chip row
 *
 * Renders an "All" button + visible chips + overflow dropdown.
 * Replaces: TemporalFilters, SourceFilterChips, inline draft category chips.
 */

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDropdown } from '../../hooks/useDropdown';
import type { FilterChip } from '../../types/list-filters';

interface ChipFilterProps {
  chips: FilterChip[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  /** Show "All" button that clears selection. Default true. */
  showAllButton?: boolean;
  /** Max visible chips before overflow. 0 = show all. Default 0. */
  maxVisible?: number;
  /** Active chip className override. Default: bg-primary-500 text-white */
  activeClassName?: string;
  /** When true, show only the "All" button, hiding individual chips and overflow. */
  shrunk?: boolean;
}

export function ChipFilter({
  chips,
  selectedKeys,
  onToggle,
  showAllButton = true,
  maxVisible = 0,
  activeClassName = 'bg-primary-500 text-white shadow-sm',
  shrunk = false,
}: ChipFilterProps) {
  const { isOpen, toggle, close, containerRef } = useDropdown();

  const allSelected = selectedKeys.size === 0;
  const visible = maxVisible > 0 ? chips.slice(0, maxVisible) : chips;
  const overflow = maxVisible > 0 ? chips.slice(maxVisible) : [];
  const overflowSelectedCount = overflow.filter(c => selectedKeys.has(c.key)).length;

  // When shrunk, hide individual chips and overflow — show only "All" button
  const visibleToRender = shrunk ? [] : visible;
  const overflowToRender = shrunk ? [] : overflow;

  const handleClearAll = () => {
    // Deselect all by toggling each selected key off
    selectedKeys.forEach(key => onToggle(key));
  };

  return (
    <div className="flex items-center gap-1">
      {showAllButton && (
        <button
          onClick={handleClearAll}
          className={cn(
            'px-2 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap transition-all',
            allSelected
              ? activeClassName
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          )}
        >
          All
        </button>
      )}

      {visibleToRender.map(chip => {
        const isSelected = selectedKeys.has(chip.key);
        const isDisabled = chip.disabled === true;
        return (
          <button
            key={chip.key}
            onClick={isDisabled ? undefined : () => onToggle(chip.key)}
            aria-pressed={isDisabled ? undefined : isSelected}
            aria-disabled={isDisabled || undefined}
            title={chip.count !== undefined ? `${chip.label} (${chip.count})` : chip.label}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
              isDisabled
                ? 'text-gray-300 cursor-default'
                : isSelected
                  ? activeClassName
                  : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50',
            )}
          >
            {chip.Icon && (
              <chip.Icon
                className={cn('w-3.5 h-3.5 flex-shrink-0', isDisabled && 'opacity-40')}
                style={isSelected || isDisabled ? undefined : (chip.iconColor ? { color: chip.iconColor } : undefined)}
              />
            )}
            <span>{chip.label}</span>
            {chip.count !== undefined && chip.count > 0 && (
              <span className={cn(
                'text-[10px] tabular-nums',
                isSelected ? 'opacity-60' : 'text-gray-400',
              )}>
                {chip.count}
              </span>
            )}
          </button>
        );
      })}

      {/* Overflow dropdown */}
      {overflowToRender.length > 0 && (
        <div className="relative" ref={containerRef}>
          <button
            onClick={toggle}
            className={cn(
              'flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
              overflowSelectedCount > 0
                ? activeClassName
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span className="text-[10px]">+{overflow.length}</span>
          </button>

          {isOpen && (
            <div
              className="absolute top-full mt-1 left-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[180px]"
              role="listbox"
              aria-label="More filters"
            >
              {overflow.map(chip => {
                const isSelected = selectedKeys.has(chip.key);
                const isDisabled = chip.disabled === true;
                return (
                  <button
                    key={chip.key}
                    onClick={isDisabled ? undefined : () => onToggle(chip.key)}
                    aria-disabled={isDisabled || undefined}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors',
                      isDisabled
                        ? 'text-gray-300 cursor-default'
                        : isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50',
                    )}
                    role="option"
                    aria-selected={isDisabled ? undefined : isSelected}
                  >
                    {chip.Icon && (
                      <chip.Icon
                        className={cn('w-3.5 h-3.5 flex-shrink-0', isDisabled && 'opacity-40')}
                        style={isSelected || isDisabled ? undefined : (chip.iconColor ? { color: chip.iconColor } : undefined)}
                      />
                    )}
                    <span className="flex-1 text-left font-medium">{chip.label}</span>
                    {chip.count !== undefined && (
                      <span className="text-[10px] tabular-nums text-gray-400">{chip.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
