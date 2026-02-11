/**
 * MarginColumn Component
 *
 * Left margin column for Tufte-style margin notes and asides.
 * Always visible on desktop (hidden on mobile):
 * - Narrow (32px) when empty — just shows a subtle "+" affordance
 * - Full width (180px) when notes/asides exist
 */

import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StoryAnnotation } from '../../types/career-stories';

interface MarginColumnProps {
  annotations: StoryAnnotation[];
  sectionKey: string;
  annotateMode: boolean;
  hasNotes?: boolean;
  onCreateAside?: (sectionKey: string, note: string) => void;
  onHoverAnnotation?: (annotationId: string | null) => void;
  hoveredAnnotationId?: string | null;
}

export const MarginColumn: React.FC<MarginColumnProps> = ({
  annotations,
  sectionKey,
  annotateMode,
  hasNotes = false,
  onCreateAside,
  onHoverAnnotation,
  hoveredAnnotationId,
}) => {
  const [asideInput, setAsideInput] = useState('');
  const [showAsideInput, setShowAsideInput] = useState(false);

  // Notes to display: annotations with notes (for this section) + asides
  const notesAndAsides = annotations.filter(
    (a) => a.sectionKey === sectionKey && (a.note || a.style === 'aside')
  );

  // Expand to full width if this section has notes, or any section does (hasNotes)
  const isExpanded = notesAndAsides.length > 0 || hasNotes || showAsideInput;

  const handleAsideSave = useCallback(() => {
    const trimmed = asideInput.trim();
    if (trimmed && onCreateAside) {
      onCreateAside(sectionKey, trimmed);
      setAsideInput('');
      setShowAsideInput(false);
    }
  }, [asideInput, sectionKey, onCreateAside]);

  const handleAsideKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsideSave();
    }
    if (e.key === 'Escape') {
      setShowAsideInput(false);
      setAsideInput('');
    }
  };

  return (
    <div
      className={cn(
        'hidden lg:block flex-shrink-0 pt-1 transition-all duration-200',
        isExpanded ? 'w-[180px] pr-3' : 'w-8 pr-1'
      )}
    >
      {/* Margin notes from annotations */}
      {notesAndAsides.map((ann) => {
        const isHovered = hoveredAnnotationId === ann.id;
        return (
        <div
          key={ann.id}
          className={cn(
            'mb-3 group/margin-note rounded-sm transition-all duration-150',
            isHovered && ann.style !== 'aside' && 'bg-amber-50'
          )}
          data-margin-annotation-id={ann.id}
          onMouseEnter={() => onHoverAnnotation?.(ann.id)}
          onMouseLeave={() => onHoverAnnotation?.(null)}
        >
          {ann.style === 'aside' ? (
            <p className="text-[11px] leading-relaxed text-gray-400 italic border-l-2 border-gray-200 pl-2">
              {ann.note}
            </p>
          ) : (
            <div className={cn(
              'border-l-2 pl-2 transition-colors',
              isHovered ? 'border-amber-500/80' : 'border-amber-400/40 group-hover/margin-note:border-amber-500/60'
            )}>
              <p className="text-[11px] leading-relaxed text-gray-500">
                {ann.note}
              </p>
            </div>
          )}
        </div>
      );
      })}

      {/* Add aside — always available */}
      {!showAsideInput && (
        <button
          onClick={() => setShowAsideInput(true)}
          className={cn(
            'flex items-center gap-1 text-gray-300 hover:text-gray-500 transition-colors mt-0.5',
            isExpanded ? 'text-[10px]' : 'text-[10px] justify-center w-full'
          )}
          title="Add aside note"
        >
          <Plus className="w-3 h-3" />
          {isExpanded && <span>Add aside</span>}
        </button>
      )}

      {/* Aside input */}
      {showAsideInput && (
        <div className="mt-1">
          <textarea
            value={asideInput}
            onChange={(e) => setAsideInput(e.target.value)}
            onKeyDown={handleAsideKeyDown}
            placeholder="Aside note..."
            className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 resize-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
            rows={2}
            autoFocus
          />
          <div className="flex items-center justify-end gap-1 mt-1">
            <button
              onClick={() => { setShowAsideInput(false); setAsideInput(''); }}
              className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5"
            >
              Cancel
            </button>
            <button
              onClick={handleAsideSave}
              disabled={!asideInput.trim()}
              className="text-[10px] font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 px-2 py-0.5 rounded disabled:opacity-40 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
