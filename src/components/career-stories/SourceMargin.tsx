import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StorySource, ToolType } from '../../types/career-stories';
import { ToolIcon } from './ToolIcon';

interface SourceMarginProps {
  sources: StorySource[];
  sectionKey: string;
  onExclude: (sourceId: string) => void;
  onUndoExclude: (sourceId: string) => void;
}

export const SourceMargin: React.FC<SourceMarginProps> = ({
  sources,
  sectionKey,
  onExclude,
  onUndoExclude,
}) => {
  const [pendingExclude, setPendingExclude] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const activitySources = sources.filter(
    (s) => !s.excludedAt && s.sourceType === 'activity'
  );

  if (activitySources.length === 0 && !pendingExclude) return null;

  return (
    <div className="flex flex-col gap-1.5 border-l border-slate-200 pl-2">
      {activitySources.map((source) => {
        if (source.id === pendingExclude) {
          return (
            <span key={source.id} className="text-[11px] text-gray-400">
              Excluded.{' '}
              <button onClick={handleUndo} className="text-primary-600 hover:text-primary-700 font-medium">
                Undo
              </button>
            </span>
          );
        }

        return (
          <span
            key={source.id}
            className="group/source inline-flex items-center gap-1 text-[11px] text-gray-400 leading-snug"
          >
            <ToolIcon tool={(source.toolType || 'generic') as ToolType} className="w-3.5 h-3.5 flex-shrink-0" />
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-blue-600 transition-colors"
              >
                {source.label}
              </a>
            ) : (
              <span className="truncate">{source.label}</span>
            )}
            <button
              onClick={() => handleExclude(source.id)}
              className="p-0.5 rounded opacity-0 group-hover/source:opacity-100 hover:bg-gray-200 transition-opacity flex-shrink-0"
              title="Exclude source"
            >
              <X className="w-2.5 h-2.5 text-gray-400" />
            </button>
          </span>
        );
      })}
    </div>
  );
};
