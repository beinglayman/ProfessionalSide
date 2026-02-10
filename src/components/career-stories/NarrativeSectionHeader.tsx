import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getSectionColor,
  SECTION_COACHING,
  SECTION_FIX,
  SECTION_RATING_INFO,
} from './constants';

interface NarrativeSectionHeaderProps {
  sectionKey: string;
  label: string;
  confidence: number;
  showCoaching?: boolean;
  sourceCount?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  isLast?: boolean;
  children?: React.ReactNode;
}

export const NarrativeSectionHeader: React.FC<NarrativeSectionHeaderProps> = ({
  sectionKey,
  label,
  confidence,
  sourceCount,
  isCollapsed,
  onToggle,
  isLast = false,
  children,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = getSectionColor(sectionKey);
  const dotColor = color.bg;
  const labelColor = color.text;
  const lineColor = color.bg;
  const ratingLabel = confidence >= 0.75 ? 'Strong' : confidence >= 0.5 ? 'Fair' : confidence >= 0.3 ? 'Weak' : 'Missing';
  const ratingClass = confidence >= 0.75 ? 'bg-emerald-50 text-emerald-700' : confidence >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
  const ratingInfo = SECTION_RATING_INFO[ratingLabel];
  const coaching = SECTION_COACHING[sectionKey.toLowerCase()];
  const fix = SECTION_FIX[sectionKey.toLowerCase()];
  const pct = Math.round(confidence * 100);

  return (
    <section className="relative flex gap-4">
      {/* Timeline spine — dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div
          className={cn(
            'w-3 h-3 rounded-full mt-2 flex-shrink-0 ring-4 ring-gray-50 z-10',
            isCollapsed ? 'bg-gray-300' : dotColor,
          )}
        />
        {!(isLast && isCollapsed) && (
          <div className="w-px flex-1 bg-gray-200" />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 pb-4">
        {/* Group header row */}
        <div className={cn(
          'flex items-center gap-2 w-full transition-all rounded-lg',
          isCollapsed ? 'py-1 mb-1' : 'mb-2',
        )}>
          {/* Clickable area: chevron + label (toggle collapse) */}
          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-1 py-0.5 -ml-1 transition-colors"
          >
            <div className="flex-shrink-0">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <span className={cn('text-sm font-semibold uppercase tracking-[0.5px]', labelColor)}>
              {label}
            </span>
          </button>

          {/* Collapsed summary: rating + source count */}
          {isCollapsed && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
              <span className="text-gray-300">&middot;</span>
              <span className={cn('font-medium px-1.5 py-0.5 rounded', ratingClass)}>{ratingLabel}</span>
              {sourceCount !== undefined && sourceCount > 0 && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </span>
          )}

          {/* Expanded: colored line + rating badge with tooltip */}
          {!isCollapsed && (
            <>
              <div className={cn('flex-1 h-px', lineColor)} />
              <span
                className="relative flex-shrink-0"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded cursor-help', ratingClass)}>
                  {ratingLabel}
                </span>

                {/* Rich tooltip */}
                {showTooltip && (
                  <div className="absolute top-full right-0 mt-1.5 z-30 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                    <div className={cn(
                      'px-3 py-2 border-b',
                      ratingLabel === 'Strong' ? 'bg-emerald-50 border-emerald-100' :
                      ratingLabel === 'Fair' ? 'bg-amber-50 border-amber-100' :
                      'bg-red-50 border-red-100'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">{ratingLabel}</span>
                        <span className="text-[10px] text-gray-500">{pct}%</span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{ratingInfo.summary}</p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[11px] text-gray-500 leading-relaxed">{ratingInfo.detail}</p>
                      {coaching && confidence < 0.75 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 block mb-1">Interview tip</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{coaching.interviewNote}</p>
                        </div>
                      )}
                      {fix && confidence < 0.75 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 block mb-1">How to fix</span>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{fix}</p>
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
                  </div>
                )}
              </span>
            </>
          )}
        </div>

        {/* Content when expanded */}
        {!isCollapsed && children}
      </div>
    </section>
  );
};
