/**
 * ArchetypeSelector Component
 *
 * Dropdown selector for story archetypes (Firefighter, Architect, etc.).
 * Shows detected + alternatives by default, with a "Show all" toggle
 * that reveals a grouped 3-column view of all archetypes.
 */

import React, { useState } from 'react';
import {
  Flame,
  Building2,
  Users,
  Zap,
  Search,
  Compass,
  RefreshCw,
  Shield,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { StoryArchetype } from '../../types/career-stories';
import { ARCHETYPE_METADATA, ARCHETYPE_GROUPS, ArchetypeGroup } from '../career-stories/constants';
import { useDropdown } from '../../hooks/useDropdown';

export const ARCHETYPE_CONFIG: Record<StoryArchetype, { icon: React.ElementType; color: string; label: string }> = {
  firefighter: { icon: Flame, color: 'text-red-500', label: 'Firefighter' },
  architect: { icon: Building2, color: 'text-blue-500', label: 'Architect' },
  diplomat: { icon: Users, color: 'text-green-500', label: 'Diplomat' },
  multiplier: { icon: Zap, color: 'text-yellow-500', label: 'Multiplier' },
  detective: { icon: Search, color: 'text-purple-500', label: 'Detective' },
  pioneer: { icon: Compass, color: 'text-orange-500', label: 'Pioneer' },
  turnaround: { icon: RefreshCw, color: 'text-cyan-500', label: 'Turnaround' },
  preventer: { icon: Shield, color: 'text-emerald-500', label: 'Preventer' },
};

interface ArchetypeSelectorProps {
  value: StoryArchetype;
  onChange: (archetype: StoryArchetype) => void;
  detected: StoryArchetype;
  alternatives: Array<{ archetype: StoryArchetype; confidence: number }>;
  disabled?: boolean;
  /** Dropdown alignment relative to trigger (default: 'left') */
  align?: 'left' | 'right';
}

export const ArchetypeSelector: React.FC<ArchetypeSelectorProps> = ({
  value,
  onChange,
  detected,
  alternatives,
  disabled = false,
  align = 'left',
}) => {
  const [showAll, setShowAll] = useState(false);
  const { isOpen, toggle, close, containerRef } = useDropdown({
    onClose: () => setShowAll(false),
  });

  const handleSelect = (archetype: StoryArchetype) => {
    onChange(archetype);
    close();
  };

  const currentConfig = ARCHETYPE_CONFIG[value];

  // Build the default list: detected + alternatives (deduplicated)
  const defaultArchetypes: StoryArchetype[] = [detected];
  for (const alt of alternatives) {
    if (!defaultArchetypes.includes(alt.archetype)) {
      defaultArchetypes.push(alt.archetype);
    }
  }

  const renderOption = (archetype: StoryArchetype) => {
    const config = ARCHETYPE_CONFIG[archetype];
    const meta = ARCHETYPE_METADATA[archetype];
    const isSelected = archetype === value;
    const Icon = config.icon;

    return (
      <button
        key={archetype}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => handleSelect(archetype)}
        className={cn(
          'w-full flex items-start gap-1.5 px-1.5 py-1.5 rounded text-left transition-colors',
          'hover:bg-gray-100',
          isSelected && 'bg-primary-50'
        )}
      >
        <Icon className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'text-xs font-semibold',
                isSelected ? 'text-primary-700' : 'text-gray-800'
              )}
            >
              {config.label}
            </span>
            {isSelected && <Check className="h-3 w-3 text-primary-600" />}
          </div>
          {meta && (
            <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
              {meta.description}
            </div>
          )}
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
        data-testid="archetype-selector"
        title="Change story archetype"
      >
        <span>{currentConfig.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select story archetype"
          className={cn(
            'absolute top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {showAll ? (
            /* Grouped 3-column view */
            <div className="flex gap-4">
              {(Object.keys(ARCHETYPE_GROUPS) as ArchetypeGroup[]).map((groupKey) => {
                const group = ARCHETYPE_GROUPS[groupKey];
                return (
                  <div key={groupKey} className="min-w-[130px]">
                    {/* Column header */}
                    <div className="pb-1.5 mb-1.5 border-b border-gray-100">
                      <div className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">
                        {group.label}
                      </div>
                      <div className="text-[9px] text-gray-400">
                        {group.description}
                      </div>
                    </div>
                    {/* Options */}
                    <div className="space-y-0.5">
                      {group.archetypes.map((archetype) =>
                        renderOption(archetype as StoryArchetype)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Default view: detected + alternatives */
            <div className="min-w-[160px]">
              <div className="space-y-0.5">
                {defaultArchetypes.map((archetype) => renderOption(archetype))}
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
              {showAll ? 'Show suggested' : 'Show all archetypes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
