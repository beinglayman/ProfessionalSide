import React from 'react';
import { Sun, Calendar, Clock, History } from 'lucide-react';
import { TemporalBucket } from '../../types/activity';
import { cn } from '../../lib/utils';

// Temporal filter labels
const TEMPORAL_LABELS: Record<TemporalBucket, { label: string; icon: React.FC<{ className?: string }> }> = {
  today: { label: 'Today', icon: Sun },
  yesterday: { label: 'Yesterday', icon: Calendar },
  this_week: { label: 'This Week', icon: Calendar },
  last_week: { label: 'Last Week', icon: Calendar },
  this_month: { label: 'This Month', icon: Clock },
  older: { label: 'Older', icon: History },
};

/**
 * Pipe separator component for filter groups
 */
export function FilterSeparator() {
  return (
    <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
  );
}

interface TemporalFiltersProps {
  availableBuckets: TemporalBucket[];
  selectedBuckets: TemporalBucket[];
  onToggle: (bucket: TemporalBucket) => void;
  counts?: Record<TemporalBucket, number>;
}

/**
 * Compact filter chips for temporal grouping
 */
export function TemporalFilters({
  availableBuckets,
  selectedBuckets,
  onToggle,
  counts
}: TemporalFiltersProps) {
  const allSelected = selectedBuckets.length === 0;

  const handleClearAll = () => {
    selectedBuckets.forEach(b => onToggle(b));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleClearAll}
        className={cn(
          'px-2 py-1 text-[11px] font-semibold rounded-md whitespace-nowrap transition-all',
          allSelected
            ? 'bg-primary-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        )}
      >
        All
      </button>

      {availableBuckets.map(bucket => {
        const { label } = TEMPORAL_LABELS[bucket];
        const isSelected = selectedBuckets.includes(bucket);
        const count = counts?.[bucket];

        return (
          <button
            key={bucket}
            onClick={() => onToggle(bucket)}
            aria-pressed={isSelected}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all',
              isSelected
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                'text-[10px] tabular-nums',
                isSelected ? 'text-primary-200' : 'text-gray-400'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
