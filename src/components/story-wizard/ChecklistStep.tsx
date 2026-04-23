/**
 * ChecklistStep — Story Wizard step 1.
 *
 * Shows a fixed-shape checklist of what a strong STAR(L) story needs, with
 * per-draft ✓ (derived from Activities) or ✗ (question needed) state.
 *
 * Design: `docs/2026-04-22-story-creation-simplification-design.md`, Ship 3.
 */

import React from 'react';
import { CheckCircle2, Circle, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  AnalyzeChecklistRow,
  ChecklistRowId,
  NarrativeFramework,
} from '../../types/career-stories';

interface ChecklistStepProps {
  checklist: AnalyzeChecklistRow[];
  framework: NarrativeFramework;
  /** Called when user clicks a ✗ row to jump straight to that question. */
  onJumpToAskRow?: (row: ChecklistRowId) => void;
}

/** Display labels + short "how this maps to STAR" hint, per row. */
const ROW_META: Record<ChecklistRowId, { label: string; hint: string }> = {
  situation: { label: 'What happened and when', hint: 'Situation' },
  role:      { label: 'What you did (your role)', hint: 'Task' },
  action:    { label: 'The specific actions taken', hint: 'Action' },
  result:    { label: 'Measurable result', hint: 'Result' },
  stakes:    { label: 'Why it mattered — the stakes', hint: 'Situation / hook' },
  hardest:   { label: 'The hardest or least obvious part', hint: 'Action depth' },
  learning:  { label: 'What you took away', hint: 'Learning (STARL)' },
};

/** If STARL is selected, append a synthetic learning row (always 'ask'). */
function withLearningRow(
  base: AnalyzeChecklistRow[],
  framework: NarrativeFramework,
): AnalyzeChecklistRow[] {
  if (framework !== 'STARL') return base;
  if (base.some((r) => r.row === 'learning')) return base;
  return [...base, { row: 'learning', state: 'ask' }];
}

export const ChecklistStep: React.FC<ChecklistStepProps> = ({
  checklist,
  framework,
  onJumpToAskRow,
}) => {
  const rows = withLearningRow(checklist, framework);
  const askCount = rows.filter((r) => r.state === 'ask').length;
  const isThin = askCount >= 4;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          What makes a strong {framework} story
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          We already know most of your story from your Activities. Here's what's left.
        </p>
      </div>

      <ul className="space-y-1.5" role="list">
        {rows.map((row) => {
          const meta = ROW_META[row.row];
          const isDerived = row.state === 'derived';
          const clickable = !isDerived && Boolean(onJumpToAskRow);
          return (
            <li
              key={row.row}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5',
                isDerived ? 'bg-gray-50/60' : 'bg-white',
                clickable && 'cursor-pointer hover:border-primary-200 hover:bg-primary-50/30 transition-colors',
              )}
              onClick={clickable ? () => onJumpToAskRow!(row.row) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onJumpToAskRow!(row.row);
                }
              }}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDerived
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <Circle className="h-4 w-4 text-gray-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{meta.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">{meta.hint}</span>
                </div>
                {isDerived && row.summary && (
                  <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                    {row.summary}
                  </p>
                )}
                {!isDerived && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {clickable ? 'ask you (1 question)' : 'ask you'}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {isDerived ? (
                  <span className="text-[10px] text-gray-400">from Activities</span>
                ) : clickable ? (
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {isThin && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800">
            This draft leans more on your answers than on your Activities. Link more activities
            for a richer story, or proceed — you'll get {askCount} questions.
          </p>
        </div>
      )}
    </div>
  );
};

/** Number of ✗ rows — used by the modal to decide the primary button label. */
export function countAskRows(
  checklist: AnalyzeChecklistRow[],
  framework: NarrativeFramework,
): number {
  return withLearningRow(checklist, framework).filter((r) => r.state === 'ask').length;
}
