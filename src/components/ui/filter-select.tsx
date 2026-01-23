import * as React from 'react';
import { cn } from '../../lib/utils';

export interface FilterSelectProps {
  /** Unique identifier for the select element */
  id: string;
  /** Label displayed above the select */
  label: string;
  /** Current selected value */
  value: string;
  /** Array of options to display */
  options: string[];
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Optional className for the container */
  className?: string;
  /** Optional aria-label override (defaults to "Filter by {label}") */
  ariaLabel?: string;
}

/**
 * FilterSelect - A labeled select component for filtering lists
 *
 * Provides consistent styling and accessibility for filter dropdowns.
 * Includes visible label and aria-label for screen readers.
 *
 * @example
 * <FilterSelect
 *   id="filter-type"
 *   label="Type"
 *   value={filters.type}
 *   options={['All', 'Personal', 'Organization']}
 *   onChange={(value) => setFilters({ ...filters, type: value })}
 * />
 */
const FilterSelect = React.forwardRef<HTMLSelectElement, FilterSelectProps>(
  ({ id, label, value, options, onChange, className, ariaLabel }, ref) => {
    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          {label}
        </label>
        <select
          id={id}
          ref={ref}
          aria-label={ariaLabel || `Filter by ${label.toLowerCase()}`}
          className={cn(
            'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
            'focus:border-primary-500 focus:ring-primary-500 focus:outline-none',
            'bg-white cursor-pointer'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

FilterSelect.displayName = 'FilterSelect';

export { FilterSelect };
