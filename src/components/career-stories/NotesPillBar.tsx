import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { StorySource } from '../../types/career-stories';

interface NotesPillBarProps {
  notes: StorySource[];
  sectionKey: string;
  onAddNote: (sectionKey: string, content: string) => void;
  onExclude: (sourceId: string) => void;
  onUndoExclude: (sourceId: string) => void;
  /** Controlled: parent can force the input open (e.g., from SourceList "+ Note" button) */
  forceShowInput?: boolean;
  onInputClosed?: () => void;
}

export function NotesPillBar({
  notes,
  sectionKey,
  onAddNote,
  onExclude,
  onUndoExclude,
  forceShowInput,
  onInputClosed,
}: NotesPillBarProps) {
  const [showInput, setShowInput] = useState(false);

  // Sync with parent's controlled state (open when parent says open, close when parent resets)
  useEffect(() => {
    if (forceShowInput !== undefined) setShowInput(forceShowInput);
  }, [forceShowInput]);
  const [noteText, setNoteText] = useState('');
  const [pendingExclude, setPendingExclude] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const closeInput = useCallback(() => {
    setShowInput(false);
    setNoteText('');
    onInputClosed?.();
  }, [onInputClosed]);

  const handleSubmit = useCallback(() => {
    if (noteText.trim()) {
      onAddNote(sectionKey, noteText.trim());
      setNoteText('');
      setShowInput(false);
      onInputClosed?.();
    }
  }, [noteText, sectionKey, onAddNote, onInputClosed]);

  const handleExclude = useCallback((sourceId: string) => {
    setPendingExclude(sourceId);
    undoTimerRef.current = setTimeout(() => {
      onExclude(sourceId);
      setPendingExclude(null);
    }, 5000);
  }, [onExclude]);

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (pendingExclude) {
      onUndoExclude(pendingExclude);
    }
    setPendingExclude(null);
  }, [pendingExclude, onUndoExclude]);

  const activeNotes = notes.filter((n) => !n.excludedAt);

  // Nothing to show and not adding — render nothing (Add Note button is in SourceList header)
  if (activeNotes.length === 0 && !showInput && !pendingExclude) {
    return null;
  }

  return (
    <div className="mt-3 pt-2 border-t border-gray-100">
      <div className="flex flex-wrap items-center gap-1.5">
        {activeNotes.map((note) => {
          if (note.id === pendingExclude) {
            return (
              <span
                key={note.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-gray-100 text-gray-400 rounded-full"
              >
                Removed
                <button
                  onClick={handleUndo}
                  className="text-primary-600 hover:text-primary-700 font-medium ml-0.5"
                >
                  Undo
                </button>
              </span>
            );
          }

          return (
            <span
              key={note.id}
              className="group inline-flex items-center gap-1 max-w-[240px] px-2.5 py-1 text-[11px] bg-amber-50 text-amber-800 rounded-full border border-amber-200/60"
              title={note.content}
            >
              <span className="truncate">{note.content}</span>
              <button
                onClick={() => handleExclude(note.id)}
                className="flex-shrink-0 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-amber-200/60 transition-opacity"
                title="Remove note"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}

        {/* Inline input or + button */}
        {showInput ? (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
                if (e.key === 'Escape') closeInput();
              }}
              placeholder="Your note..."
              className="w-40 text-[11px] px-2 py-0.5 border border-gray-200 rounded-full focus:ring-1 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!noteText.trim()}
              className="text-[11px] px-2 py-0.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={closeInput}
              className="text-[11px] px-1.5 py-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] text-gray-400 hover:text-primary-600 border border-dashed border-gray-300 hover:border-primary-400 rounded-full transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
