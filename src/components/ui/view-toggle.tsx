/**
 * ViewToggle — Two-button pill toggle with configurable labels
 *
 * Replaces: SubTabToggle, inline draft view toggle.
 */

import React from 'react';
import { Clock, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ViewMode } from '../../types/list-filters';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  /** [timeLabel, typedLabel] — e.g. ['By Time', 'By Source'] */
  labels: [string, string];
  /** [timeIcon, typedIcon] — default: [Clock, LayoutGrid] */
  icons?: [React.FC<{ className?: string }>, React.FC<{ className?: string }>];
}

export function ViewToggle({
  mode,
  onModeChange,
  labels,
  icons,
}: ViewToggleProps) {
  const TimeIcon = icons?.[0] ?? Clock;
  const TypedIcon = icons?.[1] ?? LayoutGrid;

  return (
    <div className="flex items-center rounded-md bg-gray-100 p-0.5 flex-shrink-0">
      <button
        onClick={() => onModeChange('time')}
        title={labels[0]}
        className={cn(
          'flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded transition-all',
          mode === 'time'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        <TimeIcon className="h-3 w-3" />
      </button>
      <button
        onClick={() => onModeChange('typed')}
        title={labels[1]}
        className={cn(
          'flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded transition-all',
          mode === 'typed'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        <TypedIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
