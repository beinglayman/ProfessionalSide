/**
 * ContextPanel - left rail of the Story Wizard modal.
 *
 * Persistent across all 3 steps of the wizard (Checklist / Questions / Generate).
 * Carries the draft identity, short description, and metadata KVs so the user
 * never loses sight of what they're working on.
 *
 * Archetype and format are rendered here as clickable KVs; clicking opens
 * the embedded selectors inline. The Learning toggle (STAR <-> STARL) is
 * rendered at the bottom of the KV block.
 *
 * Design reference: docs/prototypes/story-wizard-overlays.html, prototype 09.
 */

import React, { useState } from 'react';
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

/**
 * Short ID badge. Uses the last 6 chars of a cuid-like id,
 * uppercased, prefixed with JE- for "Journal Entry".
 */
function shortId(id: string): string {
  const tail = id.slice(-6).toUpperCase();
  return `JE-${tail}`;
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
    journalEntry.dominantRole === 'Led' ? 'text-green-400'
    : journalEntry.dominantRole === 'Contributed' ? 'text-blue-400'
    : 'text-gray-400';

  return (
    <aside className="bg-[#0f0f10] text-gray-200 px-5 py-5 flex flex-col gap-4 overflow-y-auto">
      {/* Eyebrow + title */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-400">
          Draft · {shortId(journalEntry.id)}
        </div>
        <h3 className="text-base font-bold text-white mt-1 mb-1 leading-snug">
          {journalEntry.title}
        </h3>
        {journalEntry.description && (
          <p className="text-xs text-gray-400 leading-relaxed m-0">
            {journalEntry.description}
          </p>
        )}
      </div>

      {/* Metadata KVs */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 text-xs">
          <span className="text-gray-500">archetype</span>
          <button
            type="button"
            onClick={() => setArchExpanded((v) => !v)}
            className="text-white font-medium capitalize hover:text-purple-300 transition-colors cursor-pointer"
          >
            {selectedArchetype}
            <span className="text-gray-500 ml-1.5 text-[10px]">change</span>
          </button>
        </div>
        {archExpanded && (
          <div className="py-2 px-1">
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
        <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 text-xs">
          <span className="text-gray-500">format</span>
          <span className="text-white font-medium">{selectedFramework}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 text-xs">
          <span className="text-gray-500">activities</span>
          <span className="text-white font-medium">{journalEntry.activityCount}</span>
        </div>
        {journalEntry.dominantRole && (
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 text-xs">
            <span className="text-gray-500">role</span>
            <span className={`font-medium ${roleColor}`}>{journalEntry.dominantRole}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 text-xs">
          <span className="text-gray-500">covered</span>
          <span className="text-white font-medium tabular-nums">
            {coveredCount} / {totalRows}
          </span>
        </div>
      </div>

      {/* Learning-section toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300 mt-auto pt-3 border-t border-zinc-800">
        <input
          type="checkbox"
          checked={selectedFramework === 'STARL'}
          onChange={(e) => onFrameworkChange(e.target.checked ? 'STARL' : 'STAR')}
          className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 focus:ring-1"
        />
        <span>Add Learning section</span>
      </label>
    </aside>
  );
};
