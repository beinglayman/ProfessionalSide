import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ExternalLink, X, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StorySource, ToolType } from '../../types/career-stories';
import { ToolIcon } from './ToolIcon';
import { SourceGapWarning } from './SourceGapWarning';

interface SourceListProps {
  sources: StorySource[];
  sectionKey: string;
  vagueMetrics: Array<{ match: string; suggestion: string }>;
  onExclude: (sourceId: string) => void;
  onUndoExclude: (sourceId: string) => void;
  onAddNote: (sectionKey: string, content: string) => void;
  onRequestAddNote?: () => void;
  maxVisible?: number;
}

export function SourceList({
  sources,
  sectionKey,
  vagueMetrics,
  onExclude,
  onUndoExclude,
  onAddNote,
  onRequestAddNote,
  maxVisible = 5,
}: SourceListProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pendingExclude, setPendingExclude] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Only activity sources — notes are rendered separately in NotesPillBar
  const activitySources = sources.filter(
    (s) => !s.excludedAt && s.sourceType === 'activity'
  );

  const sourceCount = activitySources.length;
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

  // No activity sources — show gap warning
  if (sourceCount === 0 && pendingExclude === null) {
    return (
      <SourceGapWarning
        sectionKey={sectionKey}
        vagueMetrics={vagueMetrics}
        onAddNote={() => onAddNote(sectionKey, '')}
      />
    );
  }

  return (
    <div>
      {/* Toggle bar */}
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex-1 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors',
            isOpen ? 'bg-gray-50/80' : 'hover:bg-gray-50/40',
            !isOpen && 'rounded-b',
          )}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>
            {sourceCount} source{sourceCount !== 1 ? 's' : ''}
          </span>
          {vagueMetrics.length > 0 && (
            <span className="text-amber-500">· gaps</span>
          )}
        </button>
        {onRequestAddNote && (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestAddNote(); }}
            className="px-2 py-1 mr-1 text-[10px] text-gray-400 hover:text-primary-600 transition-colors"
            title="Add note"
          >
            + Note
          </button>
        )}
      </div>

      {/* Expanded source list */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 space-y-0 bg-gray-50/50 rounded-b">
          {visibleSources.map((source) => {
            if (source.id === pendingExclude) {
              return (
                <div key={source.id} className="flex items-center gap-2 py-0.5 px-2 bg-gray-50 rounded text-xs text-gray-500">
                  <span>Excluded.</span>
                  <button
                    onClick={handleUndo}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Undo
                  </button>
                </div>
              );
            }

            // Build tooltip with role + annotation details
            const tooltipParts: string[] = [];
            if (source.role) tooltipParts.push(source.role);
            if (source.annotation && source.annotation !== source.label) tooltipParts.push(source.annotation);
            const tooltip = tooltipParts.join(' · ') || undefined;

            return (
              <div
                key={source.id}
                className="group flex items-center gap-1.5 py-0.5 text-[11px] text-gray-500 leading-tight"
                title={tooltip}
              >
                <div className="flex-shrink-0">
                  <ToolIcon tool={(source.toolType || 'generic') as ToolType} className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate block text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      {source.label}
                      <ExternalLink className="w-2.5 h-2.5 inline ml-0.5 -mt-0.5 opacity-0 group-hover:opacity-60" />
                    </a>
                  ) : (
                    <span className="truncate block">{source.label}</span>
                  )}
                </div>

                <button
                  onClick={() => handleExclude(source.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity flex-shrink-0"
                  title="Exclude source"
                >
                  <X className="w-2.5 h-2.5 text-gray-400" />
                </button>
              </div>
            );
          })}

          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[10px] text-gray-400 hover:text-primary-600 flex items-center gap-0.5 py-0.5 ml-5"
            >
              <ChevronDown className="w-2.5 h-2.5" />
              {hiddenCount} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
