import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NarrativeSectionHeaderProps {
  sectionKey: string;
  label: string;
  confidence: number;
  showCoaching?: boolean;
  sourceCount?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  isLast?: boolean;
  collapsedPreview?: string;
  children?: React.ReactNode;
  marginContent?: React.ReactNode;
  showMargin?: boolean;
  rightMarginContent?: React.ReactNode;
  showSourceMargin?: boolean;
}

export const NarrativeSectionHeader: React.FC<NarrativeSectionHeaderProps> = ({
  sectionKey,
  label,
  confidence,
  sourceCount,
  isCollapsed,
  onToggle,
  isLast = false,
  collapsedPreview,
  children,
  marginContent,
  showMargin = false,
  rightMarginContent,
  showSourceMargin = false,
}) => {
  // Neutral palette — no per-section color coding
  const dotColor = 'bg-gray-400';
  const labelColor = 'text-gray-500';

  return (
    <section className="relative flex gap-4">
      {/* Optional margin column */}
      {showMargin && marginContent}

      {/* Timeline spine — dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div
          className={cn(
            'w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ring-4 ring-white z-10',
            isCollapsed ? 'bg-gray-300' : dotColor,
          )}
        />
        {!(isLast && isCollapsed) && (
          <div className="w-px flex-1 bg-gray-200" />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 pb-6">
        {/* Section label row */}
        <div className={cn(
          'flex items-center gap-2 w-full transition-all',
          isCollapsed ? 'mb-0' : 'mb-2',
        )}>
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 hover:bg-gray-50 rounded-lg px-1 py-0.5 -ml-1 transition-colors"
          >
            <div className="flex-shrink-0">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <span className={cn('text-[11px] font-bold uppercase tracking-[0.08em]', labelColor)}>
              {label}
            </span>
          </button>

          {/* Expanded: thin colored rule + source count */}
          {!isCollapsed && (
            <>
              <div className="flex-1 h-px bg-gray-200" />
              {sourceCount !== undefined && sourceCount > 0 && (
                <span className={cn(
                  'text-[10px] flex-shrink-0',
                  showSourceMargin ? 'text-slate-500 font-medium' : 'text-gray-400'
                )}>
                  {sourceCount} source{sourceCount !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}

          {/* Collapsed: source count inline */}
          {isCollapsed && sourceCount !== undefined && sourceCount > 0 && (
            <span className={cn(
              'text-[10px]',
              showSourceMargin ? 'text-slate-500 font-medium' : 'text-gray-400'
            )}>
              <span className="text-gray-300">&middot;</span> {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Collapsed: one-line text preview */}
        {isCollapsed && collapsedPreview && (
          <p className="text-sm text-gray-400 line-clamp-1">{collapsedPreview}</p>
        )}

        {/* Content when expanded */}
        {!isCollapsed && children}
      </div>

      {/* Right margin — source provenance (system voice) */}
      {rightMarginContent}
    </section>
  );
};
