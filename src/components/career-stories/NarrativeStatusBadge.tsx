import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import type { SourceCoverage } from '../../types/career-stories';
import { StoryStatus, STATUS_DESCRIPTIONS, formatTime } from './constants';

interface NarrativeStatusBadgeProps {
  status: StoryStatus;
  confidence?: number;
  suggestedEdits?: string[];
  sourceCoverage?: SourceCoverage | null;
  estimatedTime?: number;
}

export const NarrativeStatusBadge: React.FC<NarrativeStatusBadgeProps> = ({ status, confidence, suggestedEdits = [], sourceCoverage, estimatedTime }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = {
    complete: {
      label: 'Ready',
      dotColor: 'bg-emerald-500',
      pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-500',
    },
    'in-progress': {
      label: 'Polish',
      dotColor: 'bg-amber-500',
      pillClass: 'bg-amber-50/80 text-amber-700 border-amber-200/80',
      barColor: 'bg-amber-500',
    },
    draft: {
      label: 'Draft',
      dotColor: 'bg-gray-400',
      pillClass: 'bg-gray-50 text-gray-500 border-gray-200',
      barColor: 'bg-gray-400',
    },
  };

  const { label, dotColor, pillClass, barColor } = config[status];
  const pct = confidence !== undefined ? Math.round(confidence * 100) : 0;
  const statusInfo = STATUS_DESCRIPTIONS[status];

  return (
    <span
      className="relative inline-flex items-center gap-2.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status pill — just the label, details on hover */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] rounded border cursor-help',
        pillClass,
      )}>
        <span className={cn('w-[6px] h-[6px] rounded-full', dotColor)} />
        {label}
      </span>

      {/* Tooltip — always shows context-rich information */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1.5 z-30 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={cn(
            'px-4 py-2.5 border-b',
            status === 'complete' ? 'bg-emerald-50 border-emerald-100' :
            status === 'in-progress' ? 'bg-amber-50 border-amber-100' :
            'bg-gray-50 border-gray-100'
          )}>
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', dotColor)} />
              <span className="text-sm font-semibold text-gray-900">{label}</span>
              {confidence !== undefined && (
                <span className="text-xs text-gray-500 ml-auto">{pct}% confidence</span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{statusInfo.summary}</p>
            {confidence !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <span className="flex-1 h-[5px] rounded-full bg-gray-200 overflow-hidden">
                  <span className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
                </span>
                <span className="text-xs font-semibold tabular-nums text-gray-600">{pct}%</span>
              </div>
            )}
          </div>

          {/* Stats row: sources + speaking time */}
          {(sourceCoverage || estimatedTime) && (
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3 text-xs text-gray-500">
              {sourceCoverage && sourceCoverage.total > 0 && (
                <span>{sourceCoverage.sourced} of {sourceCoverage.total} sections sourced</span>
              )}
              {sourceCoverage && estimatedTime && <span>&middot;</span>}
              {estimatedTime !== undefined && (
                <span>~{formatTime(estimatedTime)} speaking</span>
              )}
            </div>
          )}

          {/* Detail */}
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 leading-relaxed">{statusInfo.detail}</p>

            {/* Suggested improvements */}
            {suggestedEdits.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-1.5">
                  How to improve
                </span>
                <ul className="space-y-1">
                  {suggestedEdits.map((edit, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                      <span className="text-amber-500 flex-shrink-0">&rarr;</span>
                      <span>{edit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
        </div>
      )}
    </span>
  );
};
