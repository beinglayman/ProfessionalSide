/**
 * FrameworkSelector Component
 *
 * Dropdown selector for narrative frameworks (STAR, CAR, SOAR, etc.).
 * Groups frameworks by category with descriptions.
 */

import React from 'react';
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

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  align = 'right',
}) => {
  const { isOpen, toggle, close, containerRef } = useDropdown();

  const handleSelect = (framework: NarrativeFramework) => {
    onChange(framework);
    close();
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

      {/* Dropdown - multi-column with descriptions */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select narrative format"
          className={cn(
            'absolute top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          <div className="flex gap-4">
            {(Object.keys(FRAMEWORK_GROUPS) as FrameworkGroup[]).map((groupKey) => {
              const group = FRAMEWORK_GROUPS[groupKey];
              const groupDescriptions: Record<string, string> = {
                popular: 'Most common',
                concise: 'Quick & focused',
                detailed: 'Full context',
              };
              return (
                <div key={groupKey} className="min-w-[120px]">
                  {/* Column header */}
                  <div className="pb-1.5 mb-1.5 border-b border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">
                      {group.label}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {groupDescriptions[groupKey]}
                    </div>
                  </div>
                  {/* Options */}
                  <div className="space-y-0.5">
                    {group.frameworks.map((framework) => {
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
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
