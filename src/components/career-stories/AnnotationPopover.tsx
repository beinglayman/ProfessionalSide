/**
 * AnnotationPopover Component
 *
 * Fixed-position popover for editing an existing annotation.
 * Shows truncated annotated text, note textarea, Save/Remove buttons.
 * Enter to save, Escape to close.
 *
 * Brand-consistent: white bg, gray-200 border, primary accent on Save,
 * matches the style of DropdownMenu and other inline UI.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

interface AnnotationPopoverProps {
  position: { x: number; y: number };
  annotatedText: string;
  initialNote: string | null;
  onSave: (note: string | null) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const AnnotationPopover: React.FC<AnnotationPopoverProps> = ({
  position,
  annotatedText,
  initialNote,
  onSave,
  onRemove,
  onClose,
}) => {
  const [note, setNote] = useState(initialNote || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(note.trim() || null);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-md w-72 p-3"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, 8px)' }}
      >
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] text-gray-400 line-clamp-2 flex-1 pr-2 italic">
            &ldquo;{annotatedText.slice(0, 80)}{annotatedText.length > 80 ? '...' : ''}&rdquo;
          </p>
          <button
            onClick={onClose}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Note textarea */}
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a margin note..."
          className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 resize-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 placeholder:text-gray-400"
          rows={2}
          maxLength={2000}
        />

        {/* Actions */}
        <div className="flex items-center justify-between mt-2.5">
          <button
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Remove mark
          </button>

          <button
            onClick={() => onSave(note.trim() || null)}
            className="text-[11px] font-medium bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded transition-colors"
          >
            Save
          </button>
        </div>

        <p className="text-[10px] text-gray-300 mt-1.5">Enter to save &middot; Esc to close</p>
      </div>
    </>
  );
};
