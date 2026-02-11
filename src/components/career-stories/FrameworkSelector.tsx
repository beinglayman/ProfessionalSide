/**
 * FrameworkSelector Component
 *
 * Cascading dropdown selector for narrative frameworks (STAR, CAR, SOAR, etc.).
 * Default view shows Popular frameworks (compact). "Show all" reveals
 * the full 3-column grouped layout (Popular / Concise / Detailed).
 * Mirrors the ArchetypeSelector cascading pattern.
 */

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NarrativeFramework } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS, FRAMEWORK_GROUPS, FrameworkGroup } from './constants';
import { useDropdown } from '../../hooks/useDropdown';

interface FrameworkSelectorProps {
  value: NarrativeFramework;
  onChange: (framework: NarrativeFramework) => void;
  disabled?: boolean;
  /** Dropdown alignment relative to trigger (default: 'right') */
  align?: 'left' | 'right';
}

const GROUP_DESCRIPTIONS: Record<string, string> = {
  popular: 'Most common',
  concise: 'Quick & focused',
  detailed: 'Full context',
};

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  align = 'right',
}) => {
  const [showAll, setShowAll] = useState(false);
  const { isOpen, toggle, close, containerRef } = useDropdown({
    onClose: () => setShowAll(false),
  });

  const handleSelect = (framework: NarrativeFramework) => {
    onChange(framework);
    close();
  };

  const renderOption = (framework: NarrativeFramework) => {
    const meta = NARRATIVE_FRAMEWORKS[framework];
    const isSelected = framework === value;
    return (
      <button
        key={framework}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => handleSelect(framework)}
        className={cn(
          'w-full flex items-start gap-1.5 px-1.5 py-1.5 rounded text-left transition-colors',
          'hover:bg-gray-100',
          isSelected && 'bg-primary-50'
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={cn(
              'text-xs font-semibold',
              isSelected ? 'text-primary-700' : 'text-gray-800'
            )}>
              {framework}
            </span>
            {isSelected && <Check className="h-3 w-3 text-primary-600" />}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
            {meta.description}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button - compact */}
      <button
        type="button"
        onClick={() => !disabled && toggle()}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="framework-selector"
        title="Change narrative format"
      >
        <span>{value}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select narrative format"
          className={cn(
            'absolute top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {showAll ? (
            /* Grouped 3-column view */
            <div className="flex gap-4">
              {(Object.keys(FRAMEWORK_GROUPS) as FrameworkGroup[]).map((groupKey) => {
                const group = FRAMEWORK_GROUPS[groupKey];
                return (
                  <div key={groupKey} className="min-w-[120px]">
                    <div className="pb-1.5 mb-1.5 border-b border-gray-100">
                      <div className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">
                        {group.label}
                      </div>
                      <div className="text-[9px] text-gray-400">
                        {GROUP_DESCRIPTIONS[groupKey]}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {group.frameworks.map((fw) => renderOption(fw))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Default view: Popular frameworks only */
            <div className="min-w-[160px]">
              <div className="space-y-0.5">
                {FRAMEWORK_GROUPS.popular.frameworks.map((fw) => renderOption(fw))}
              </div>
            </div>
          )}

          {/* Toggle button */}
          <div className="mt-1.5 pt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full text-[10px] text-gray-500 hover:text-gray-700 py-0.5 transition-colors"
            >
              {showAll ? 'Show popular' : 'Show all frameworks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
