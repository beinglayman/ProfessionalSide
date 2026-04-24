/**
 * ContextPanel - left rail of the Story Wizard modal.
 *
 * Persistent across all 3 steps of the wizard (Checklist / Questions / Generate).
 * Carries the draft identity, short description, and metadata KVs so the user
 * never loses sight of what they're working on.
 *
 * Styled in the app's existing warm-light register (soft primary tint, quiet
 * dividers, values in the brand color where appropriate) rather than the
 * dark slab of the first iteration.
 *
 * Design reference: docs/prototypes/story-wizard-overlays.html, prototype 09.
 */

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  StoryArchetype,
  NarrativeFramework,
  WizardAnalyzeResponse,
} from '../../types/career-stories';
import { ArchetypeSelector } from './ArchetypeSelector';

interface ContextPanelProps {
  journalEntry: WizardAnalyzeResponse['journalEntry'];
  detectedArchetype: StoryArchetype;
  alternatives: WizardAnalyzeResponse['archetype']['alternatives'];
  selectedArchetype: StoryArchetype;
  onArchetypeChange: (archetype: StoryArchetype) => void;
  selectedFramework: NarrativeFramework;
  onFrameworkChange: (framework: NarrativeFramework) => void;
  /** Count of checklist rows in 'derived' state (out of total). */
  coveredCount: number;
  totalRows: number;
}

/** Short badge form of the draft id: JE-XXXXXX (uppercase tail). */
function shortId(id: string): string {
  return `JE-${id.slice(-6).toUpperCase()}`;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  journalEntry,
  detectedArchetype,
  alternatives,
  selectedArchetype,
  onArchetypeChange,
  selectedFramework,
  onFrameworkChange,
  coveredCount,
  totalRows,
}) => {
  const [archExpanded, setArchExpanded] = useState(false);

  const roleColor =
    journalEntry.dominantRole === 'Led' ? 'text-emerald-700'
    : journalEntry.dominantRole === 'Contributed' ? 'text-blue-700'
    : 'text-gray-600';

  return (
    <aside
      className={cn(
        'flex flex-col gap-4 overflow-y-auto px-5 py-5',
        'bg-gradient-to-b from-primary-50/60 via-white to-primary-50/20',
        'border-r border-primary-100'
      )}
    >
      {/* Eyebrow */}
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-700">
        <Sparkles className="h-3 w-3" />
        <span>Draft &middot; {shortId(journalEntry.id)}</span>
      </div>

      {/* Title + description */}
      <div>
        <h3 className="text-[15px] font-bold leading-snug text-gray-900 mb-1">
          {journalEntry.title}
        </h3>
        {journalEntry.description && (
          <p className="text-xs leading-relaxed text-gray-600 m-0">
            {journalEntry.description}
          </p>
        )}
      </div>

      {/* Metadata KVs */}
      <div className="flex flex-col rounded-lg border border-primary-100 bg-white/70 px-3 py-1">
        <div className="flex items-center justify-between py-2 text-xs border-b border-primary-100/70">
          <span className="text-gray-500">archetype</span>
          <button
            type="button"
            onClick={() => setArchExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-semibold capitalize text-primary-700 hover:text-primary-800 transition-colors"
          >
            {selectedArchetype}
            <span className="text-[10px] text-gray-400 font-normal">change</span>
          </button>
        </div>
        {archExpanded && (
          <div className="py-2">
            <ArchetypeSelector
              value={selectedArchetype}
              onChange={(a) => {
                onArchetypeChange(a);
                setArchExpanded(false);
              }}
              detected={detectedArchetype}
              alternatives={alternatives}
            />
          </div>
        )}
        <div className="flex items-center justify-between py-2 text-xs border-b border-primary-100/70">
          <span className="text-gray-500">format</span>
          <span className="font-semibold text-gray-900">{selectedFramework}</span>
        </div>
        <div className="flex items-center justify-between py-2 text-xs border-b border-primary-100/70">
          <span className="text-gray-500">activities</span>
          <span className="font-semibold text-gray-900 tabular-nums">{journalEntry.activityCount}</span>
        </div>
        {journalEntry.dominantRole && (
          <div className="flex items-center justify-between py-2 text-xs border-b border-primary-100/70">
            <span className="text-gray-500">role</span>
            <span className={cn('font-semibold', roleColor)}>{journalEntry.dominantRole}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-2 text-xs">
          <span className="text-gray-500">covered</span>
          <span className="font-semibold text-gray-900 tabular-nums">
            {coveredCount} <span className="text-gray-400 font-normal">/ {totalRows}</span>
          </span>
        </div>
      </div>

      {/* Learning-section toggle */}
      <label className="mt-auto flex items-center gap-2 cursor-pointer select-none rounded-md bg-white/60 border border-primary-100 px-3 py-2 text-xs text-gray-700 hover:bg-white transition-colors">
        <input
          type="checkbox"
          checked={selectedFramework === 'STARL'}
          onChange={(e) => onFrameworkChange(e.target.checked ? 'STARL' : 'STAR')}
          className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
        />
        <span className="font-medium">Add a Learning section</span>
      </label>
    </aside>
  );
};
