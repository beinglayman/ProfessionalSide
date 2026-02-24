import React, { useMemo } from 'react';
import { ArrowUpRight, Loader2, Sparkles, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { getSourceIcon } from './source-icons';
import { highlightMetrics } from './story-group-header';
import { ActivityGroup, ActivitySource, SUPPORTED_SOURCES } from '../../types/activity';
import { cn } from '../../lib/utils';

interface SidebarDraftCardProps {
  draft: ActivityGroup;
  isSelected: boolean;
  isMuted: boolean;
  onSelect: () => void;
  onPromote: () => void;
  onRegenerate?: () => void;
  isRegenerateLoading?: boolean;
  /** Show CTA button regardless of selection state (mobile) */
  showCTA?: boolean;
  /** Show "Showing N of M activities" instead of "N activities" */
  filterMatchCount?: number;
  filterTotalCount?: number;
}

export function SidebarDraftCard({
  draft,
  isSelected,
  isMuted,
  onSelect,
  onPromote,
  onRegenerate,
  isRegenerateLoading,
  showCTA = false,
  filterMatchCount,
  filterTotalCount,
}: SidebarDraftCardProps) {
  const meta = draft.storyMetadata;
  if (!meta) return null;

  const uniqueSources = useMemo(() => {
    const sourceMap = new Map<string, number>();
    for (const a of draft.activities) {
      sourceMap.set(a.source, (sourceMap.get(a.source) || 0) + 1);
    }
    return Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source]) => source);
  }, [draft.activities]);

  const dateLabel = useMemo(() => {
    if (!meta.timeRangeStart && !meta.timeRangeEnd) return null;
    const start = meta.timeRangeStart ? format(new Date(meta.timeRangeStart), 'MMM d') : '';
    const end = meta.timeRangeEnd ? format(new Date(meta.timeRangeEnd), 'MMM d') : '';
    if (start && end && start !== end) return `${start} – ${end}`;
    return end || start;
  }, [meta.timeRangeStart, meta.timeRangeEnd]);

  const hasLoadedActivities = draft.activities.length > 0;
  const showReEnhance = isSelected && meta.description && !meta.isPublished && onRegenerate;
  const showCreateCTA = isSelected || showCTA;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-expanded={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'relative rounded-xl transition-all cursor-pointer',
        isSelected
          ? 'border-2 border-purple-500 bg-purple-50 shadow-lg'
          : isMuted
            ? 'border border-gray-200 bg-gray-50'
            : hasLoadedActivities
              ? 'border border-gray-200 bg-white ring-1 ring-purple-100 shadow-sm hover:shadow-md hover:ring-purple-300'
              : 'border border-dashed border-gray-200 bg-gray-50/50'
      )}
    >
      <div className="p-3">
        {/* Title + clear button */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className={cn(
            'text-sm font-semibold leading-snug',
            !hasLoadedActivities && !isSelected ? 'text-gray-400' : isMuted ? 'text-gray-500' : 'text-gray-900'
          )}>
            {meta.title}
          </h4>
          {isSelected && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5 flex-shrink-0 mt-0.5"
              aria-label="Clear selection"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Source icons + date + activity count */}
        <div className={cn(
          'flex items-center gap-2 text-[11px] mb-2',
          isMuted || !hasLoadedActivities ? 'text-gray-400' : 'text-gray-400'
        )}>
          {uniqueSources.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {uniqueSources.slice(0, 4).map((source, i) => {
                const Icon = getSourceIcon(source);
                const info = SUPPORTED_SOURCES[source as ActivitySource];
                return (
                  <span
                    key={source}
                    title={info?.displayName || source}
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-gray-200"
                    style={{ zIndex: uniqueSources.length - i }}
                  >
                    <Icon className="w-3 h-3" style={{ color: info?.color }} />
                  </span>
                );
              })}
              {uniqueSources.length > 4 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-[9px] font-bold text-gray-500">
                  +{uniqueSources.length - 4}
                </span>
              )}
            </div>
          )}
          {isSelected && filterMatchCount !== undefined && (filterMatchCount > 0 || (filterTotalCount ?? 0) > 0) ? (
            <span className="tabular-nums whitespace-nowrap">
              Showing {filterMatchCount} of {filterTotalCount} activities
            </span>
          ) : (
            <>
              {dateLabel && <span className="whitespace-nowrap">{dateLabel}</span>}
              <span className="tabular-nums whitespace-nowrap">
                {draft.count} {draft.count === 1 ? 'activity' : 'activities'}
                {!hasLoadedActivities && draft.count > 0 && (
                  <span className="text-gray-300"> · not in range</span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Topic chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {(isSelected ? meta.topics : meta.topics?.slice(0, 2))?.map((topic, i) => (
            <span
              key={i}
              className={cn(
                'px-1.5 py-0.5 rounded-md font-medium text-[10px]',
                isMuted || !hasLoadedActivities ? 'bg-gray-100 text-gray-500' : 'bg-purple-50 text-purple-700'
              )}
            >
              {topic}
            </span>
          ))}
          {!isSelected && (meta.topics?.length ?? 0) > 2 && (
            <span className="text-[10px] text-gray-400">+{(meta.topics?.length ?? 0) - 2}</span>
          )}
        </div>

        {/* Selected: expanded content */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-purple-200" onClick={(e) => e.stopPropagation()}>
            {meta.description ? (
              <p className="text-sm text-gray-800 leading-relaxed mb-2">
                {highlightMetrics(meta.description)}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic mb-2">No summary generated yet.</p>
            )}

            {meta.impactHighlights && meta.impactHighlights.length > 0 && (
              <div className="mb-3 p-2 rounded-lg bg-white border border-gray-100">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  Key Impact
                </div>
                <ul className="space-y-1">
                  {meta.impactHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                      <span>{highlightMetrics(h)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTAs */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onPromote(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Create Story
              </button>
              {showReEnhance && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRegenerate!(); }}
                  disabled={isRegenerateLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRegenerateLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Re-enhance
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile: CTA always visible in resting state */}
        {showCTA && !isSelected && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onPromote(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Create Story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
