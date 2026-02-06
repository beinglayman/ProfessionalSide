/**
 * FormatChip Component
 *
 * Small interactive chip showing the current narrative framework.
 * Clicking opens a dropdown to select framework + writing style,
 * then fires onFormatChange to trigger the FormatSwitchModal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NarrativeFramework, WritingStyle } from '../../types/career-stories';
import { NARRATIVE_FRAMEWORKS, FRAMEWORK_GROUPS, FrameworkGroup } from './constants';
import { useDropdown } from '../../hooks/useDropdown';

interface FormatChipProps {
  currentFramework: NarrativeFramework;
  currentStyle: WritingStyle;
  onFormatChange: (framework: NarrativeFramework, style: WritingStyle) => void;
  disabled?: boolean;
}

const WRITING_STYLES: { value: WritingStyle; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'storytelling', label: 'Storytelling' },
];

const GROUP_DESCRIPTIONS: Record<string, string> = {
  popular: 'Most common',
  concise: 'Quick & focused',
  detailed: 'Full context',
};

export function FormatChip({
  currentFramework,
  currentStyle,
  onFormatChange,
  disabled = false,
}: FormatChipProps) {
  const { isOpen, toggle, close, containerRef } = useDropdown();
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle>(currentStyle);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Sync selectedStyle when prop changes
  useEffect(() => {
    setSelectedStyle(currentStyle);
  }, [currentStyle]);

  // Calculate dropdown position for portal
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.left - 100), // offset left a bit so dropdown isn't cut off
    });
  }, [isOpen, containerRef]);

  const handleSelect = useCallback(
    (framework: NarrativeFramework) => {
      if (framework === currentFramework && selectedStyle === currentStyle) {
        close();
        return;
      }
      onFormatChange(framework, selectedStyle);
      close();
    },
    [currentFramework, currentStyle, selectedStyle, onFormatChange, close]
  );

  const handleStyleClick = useCallback(
    (e: React.MouseEvent, style: WritingStyle) => {
      e.stopPropagation();
      setSelectedStyle(style);
    },
    []
  );

  const handleChipClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) toggle();
    },
    [disabled, toggle]
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger chip */}
      <button
        type="button"
        onClick={handleChipClick}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors',
          'hover:bg-primary-100 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="format-chip"
      >
        <span>{currentFramework}</span>
        <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Portal dropdown */}
      {isOpen &&
        dropdownPos &&
        createPortal(
          <div
            role="listbox"
            aria-label="Select narrative format and writing style"
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-[100]"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Framework columns */}
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
                      {group.frameworks.map((framework) => {
                        const meta = NARRATIVE_FRAMEWORKS[framework];
                        const isSelected = framework === currentFramework;
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
                                <span
                                  className={cn(
                                    'text-xs font-semibold',
                                    isSelected ? 'text-primary-700' : 'text-gray-800'
                                  )}
                                >
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

            {/* Writing style pills */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Writing Style
              </div>
              <div className="flex gap-1.5">
                {WRITING_STYLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={(e) => handleStyleClick(e, value)}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors',
                      selectedStyle === value
                        ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
