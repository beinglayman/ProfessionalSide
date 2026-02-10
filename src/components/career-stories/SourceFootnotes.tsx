import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ExternalLink, X, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StorySource, ToolType } from '../../types/career-stories';
import { ToolIcon } from './ToolIcon';
import { NotesPillBar } from './NotesPillBar';

interface SourceFootnotesProps {
  sources: StorySource[];
  sectionKey: string;
  vagueMetrics: Array<{ match: string; suggestion: string }>;
  onExclude: (sourceId: string) => void;
  onUndoExclude: (sourceId: string) => void;
  onAddNote: (sectionKey: string, content: string) => void;
  forceShowNoteInput: boolean;
  onNoteInputClosed: () => void;
  onRequestAddNote: () => void;
  isEditing: boolean;
  maxVisible?: number;
}

export function SourceFootnotes({
  sources,
  sectionKey,
  vagueMetrics,
  onExclude,
  onUndoExclude,
  onAddNote,
  forceShowNoteInput,
  onNoteInputClosed,
  onRequestAddNote,
  isEditing,
  maxVisible = 5,
}: SourceFootnotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [pendingExclude, setPendingExclude] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activitySources = sources.filter(
    (s) => !s.excludedAt && s.sourceType === 'activity'
  );
  const noteSources = sources.filter((s) => s.sourceType === 'user_note');
  const visibleSources = expanded ? activitySources : activitySources.slice(0, maxVisible);
  const hiddenCount = activitySources.length - maxVisible;

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

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

  if (isEditing) return null;

  const hasContent = activitySources.length > 0 || noteSources.length > 0 || forceShowNoteInput;

  return (
    <div className="mt-3">
      {/* Thin separator */}
      {(hasContent || activitySources.length === 0) && (
        <div className="border-t border-gray-100 pt-2.5" />
      )}

      {/* Activity sources — compact horizontal flow */}
      {activitySources.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {visibleSources.map((source) => {
            if (source.id === pendingExclude) {
              return (
                <span key={source.id} className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span>Excluded.</span>
                  <button onClick={handleUndo} className="text-primary-600 hover:text-primary-700 font-medium">
                    Undo
                  </button>
                </span>
              );
            }

            const tooltipParts: string[] = [];
            if (source.role) tooltipParts.push(source.role);
            if (source.annotation && source.annotation !== source.label) tooltipParts.push(source.annotation);

            return (
              <span
                key={source.id}
                className="group inline-flex items-center gap-1 text-[11px] text-gray-400 leading-relaxed"
                title={tooltipParts.join(' · ') || undefined}
              >
                <ToolIcon tool={(source.toolType || 'generic') as ToolType} className="w-3 h-3 flex-shrink-0 opacity-60" />
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate max-w-[200px] hover:text-blue-600 transition-colors"
                  >
                    {source.label}
                  </a>
                ) : (
                  <span className="truncate max-w-[200px]">{source.label}</span>
                )}
                {source.url && (
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 flex-shrink-0" />
                )}
                <button
                  onClick={() => handleExclude(source.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity flex-shrink-0"
                  title="Exclude source"
                >
                  <X className="w-2.5 h-2.5 text-gray-400" />
                </button>
              </span>
            );
          })}
          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-blue-600"
            >
              <ChevronDown className="w-2.5 h-2.5" />
              +{hiddenCount} more
            </button>
          )}
        </div>
      )}

      {/* No sources state — subtle, not alarming */}
      {activitySources.length === 0 && pendingExclude === null && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>No sources</span>
          <span className="text-gray-300">&middot;</span>
          <button
            onClick={onRequestAddNote}
            className="text-gray-500 hover:text-blue-600 font-medium transition-colors"
          >
            Add note
          </button>
        </div>
      )}

      {/* Notes pills */}
      <NotesPillBar
        notes={noteSources}
        sectionKey={sectionKey}
        onAddNote={onAddNote}
        onExclude={onExclude}
        onUndoExclude={onUndoExclude}
        forceShowInput={forceShowNoteInput}
        onInputClosed={onNoteInputClosed}
      />
    </div>
  );
}
