/**
 * ContextPanel - left rail of the Story Wizard modal.
 *
 * Persistent across all 3 steps of the wizard (Checklist / Questions / Generate).
 * Carries the draft identity, short description, and metadata KVs so the user
 * never loses sight of what they're working on.
 *
 * Uses the app's brand primary (#5D259F) as a rich purple gradient, with
 * white typography and primary-200 accents. This lets the rail act as a
 * branded anchor inside the modal without feeling like foreign UI chrome.
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

  // Role color mapped to tones that read well on the purple gradient.
  const roleColor =
    journalEntry.dominantRole === 'Led' ? 'text-emerald-300'
    : journalEntry.dominantRole === 'Contributed' ? 'text-sky-300'
    : 'text-primary-200';

  return (
    <aside
      className={cn(
        'flex flex-col gap-4 overflow-y-auto px-5 py-5',
        'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700',
        'text-white'
      )}
    >
      {/* Eyebrow */}
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-200">
        <Sparkles className="h-3 w-3" />
        <span>Your draft</span>
      </div>

      {/* Title + description */}
      <div>
        <h3 className="text-[15px] font-bold leading-snug text-white mb-1">
          {journalEntry.title}
        </h3>
        {journalEntry.description && (
          <p className="text-xs leading-relaxed text-primary-100/90 m-0">
            {journalEntry.description}
          </p>
        )}
      </div>

      {/* Metadata KVs */}
      <div className="flex flex-col rounded-lg border border-white/15 bg-white/5 backdrop-blur-sm px-3 py-1">
        <div className="flex items-center justify-between py-2 text-xs border-b border-white/10">
          <span className="text-primary-200">Archetype</span>
          <button
            type="button"
            onClick={() => setArchExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-semibold capitalize text-white hover:text-primary-100 transition-colors"
          >
            {selectedArchetype}
            <span className="text-[10px] text-primary-200 font-normal">change</span>
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
        <div className="flex items-center justify-between py-2 text-xs border-b border-white/10">
          <span className="text-primary-200">Format</span>
          <span className="font-semibold text-white">{selectedFramework}</span>
        </div>
        <div className="flex items-center justify-between py-2 text-xs border-b border-white/10">
          <span className="text-primary-200">Activities</span>
          <span className="font-semibold text-white tabular-nums">{journalEntry.activityCount}</span>
        </div>
        {journalEntry.dominantRole && (
          <div className="flex items-center justify-between py-2 text-xs border-b border-white/10">
            <span className="text-primary-200">Role</span>
            <span className={cn('font-semibold', roleColor)}>{journalEntry.dominantRole}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-2 text-xs">
          <span className="text-primary-200">Covered</span>
          <span className="font-semibold text-white tabular-nums">
            {coveredCount} <span className="text-primary-200 font-normal">/ {totalRows}</span>
          </span>
        </div>
      </div>

      {/* Learning-section toggle */}
      <label className="mt-auto flex items-center gap-2 cursor-pointer select-none rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 text-xs text-white transition-colors">
        <input
          type="checkbox"
          checked={selectedFramework === 'STARL'}
          onChange={(e) => onFrameworkChange(e.target.checked ? 'STARL' : 'STAR')}
          className="h-3.5 w-3.5 rounded border-white/30 bg-white/10 text-primary-300 focus:ring-primary-300 focus:ring-offset-0 focus:ring-1"
        />
        <span className="font-medium">Add a Learning section</span>
      </label>
    </aside>
  );
};
