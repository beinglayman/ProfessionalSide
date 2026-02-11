/**
 * MarginColumn Component
 *
 * Left margin column for Tufte-style margin notes and asides.
 * Always visible on desktop (hidden on mobile):
 * - Narrow (20px) when empty — hover reveals "+" affordance
 * - Full width (150px) when notes/asides exist
 *
 * Notes stack vertically as discrete cards. When there are many,
 * each collapses to a single truncated line. Hovering expands one
 * fully with a lifted card treatment.
 */

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
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
  /** Clear the note text from a text-anchored mark (keeps the mark) */
  onClearNote?: (annotationId: string) => void;
  /** Delete an aside entirely */
  onDeleteAside?: (annotationId: string) => void;
}

export const MarginColumn: React.FC<MarginColumnProps> = ({
  annotations,
  sectionKey,
  annotateMode,
  hasNotes = false,
  onCreateAside,
  onHoverAnnotation,
  hoveredAnnotationId,
  onClearNote,
  onDeleteAside,
}) => {
  const [asideInput, setAsideInput] = useState('');
  const [showAsideInput, setShowAsideInput] = useState(false);

  // Notes to display: annotations with notes (for this section) + asides
  const notesAndAsides = annotations.filter(
    (a) => a.sectionKey === sectionKey && (a.note || a.style === 'aside')
  );

  const isExpanded = notesAndAsides.length > 0 || hasNotes || showAsideInput;
  const isCrowded = notesAndAsides.length > 3;

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
        'hidden lg:block flex-shrink-0 pt-1 transition-all duration-200 group/margin',
        isExpanded ? 'w-[150px]' : 'w-5'
      )}
    >
      {/* Note cards — vertical stack with clear boundaries */}
      <div className={cn('flex flex-col', isCrowded ? 'gap-1' : 'gap-2')}>
        {notesAndAsides.map((ann) => {
          const isHovered = hoveredAnnotationId === ann.id;
          const isAside = ann.style === 'aside';

          return (
            <div
              key={ann.id}
              className={cn(
                'relative rounded transition-all duration-150',
                // Hovered: lifted card with shadow + full text
                isHovered
                  ? 'z-20 bg-white shadow-md ring-1 ring-gray-200'
                  : 'z-0 bg-gray-50/80 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-100',
              )}
              data-margin-annotation-id={ann.id}
              onMouseEnter={() => onHoverAnnotation?.(ann.id)}
              onMouseLeave={() => onHoverAnnotation?.(null)}
            >
              {/* Delete button — visible on hover */}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAside) {
                      onDeleteAside?.(ann.id);
                    } else {
                      onClearNote?.(ann.id);
                    }
                  }}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                  title={isAside ? 'Delete aside' : 'Remove note'}
                  aria-label={isAside ? 'Delete aside' : 'Remove note'}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}

              {isAside ? (
                <p className={cn(
                  'text-[11px] leading-relaxed text-gray-400 italic border-l-2 border-gray-200 pl-2 py-1',
                  isCrowded && !isHovered && 'line-clamp-1',
                )}>
                  {ann.note}
                </p>
              ) : (
                <div className={cn(
                  'border-l-2 pl-2 py-1 transition-colors',
                  isHovered ? 'border-amber-500' : 'border-amber-300',
                )}>
                  <p className={cn(
                    'text-[11px] leading-relaxed text-gray-500',
                    isCrowded && !isHovered && 'line-clamp-1',
                  )}>
                    {ann.note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add aside button — visible on hover of margin area */}
      {!showAsideInput && (
        <button
          onClick={() => setShowAsideInput(true)}
          className={cn(
            'flex items-center gap-1 text-gray-300 hover:text-gray-500 transition-all mt-1',
            isExpanded
              ? 'text-[10px] opacity-0 group-hover/margin:opacity-100'
              : 'text-[10px] justify-center w-full opacity-0 group-hover/margin:opacity-100'
          )}
          title="Add aside note"
        >
          <Plus className="w-3 h-3" />
          {isExpanded && <span>Add aside</span>}
        </button>
      )}

      {/* Aside input */}
      {showAsideInput && (
        <div className="mt-2">
          <textarea
            value={asideInput}
            onChange={(e) => setAsideInput(e.target.value)}
            onKeyDown={handleAsideKeyDown}
            placeholder="Aside note..."
            className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 resize-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 bg-white"
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
