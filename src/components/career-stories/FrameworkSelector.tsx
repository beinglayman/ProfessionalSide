/**
 * FrameworkSelector Component
 *
 * Dropdown selector for narrative frameworks (STAR, CAR, SOAR, etc.).
 * Groups frameworks by category with descriptions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NarrativeFramework } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS, FRAMEWORK_GROUPS, FrameworkGroup } from './constants';

interface FrameworkSelectorProps {
  value: NarrativeFramework;
  onChange: (framework: NarrativeFramework) => void;
  disabled?: boolean;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (framework: NarrativeFramework) => {
    onChange(framework);
    setIsOpen(false);
  };

  const currentFramework = NARRATIVE_FRAMEWORKS[value];

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-sm rounded-md border transition-colors',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="framework-selector"
      >
        <span className="font-medium text-gray-700">Format:</span>
        <span className="font-semibold text-gray-900">{value}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select narrative format"
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
        >
          {(Object.keys(FRAMEWORK_GROUPS) as FrameworkGroup[]).map((groupKey, groupIdx) => {
            const group = FRAMEWORK_GROUPS[groupKey];
            return (
              <div key={groupKey}>
                {groupIdx > 0 && <div className="border-t border-gray-100 my-1" />}
                <div className="px-3 py-1">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
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
                        'w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                        isSelected && 'bg-blue-50'
                      )}
                    >
                      <div className="w-5 flex-shrink-0 pt-0.5">
                        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{meta.label}</div>
                        <div className="text-xs text-gray-500 truncate">{meta.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
