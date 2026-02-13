import React from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';
import { stripMarkdown, truncate, getItemMeta, getTitle } from './derivation-helpers';
import type { StoryDerivation } from '../../types/career-stories';

// =============================================================================
// COMPONENT
// =============================================================================

interface LibraryCardProps {
  item: StoryDerivation;
  isSelected: boolean;
  onClick: () => void;
}

export function LibraryCard({ item, isSelected, onClick }: LibraryCardProps) {
  const { label, Icon } = getItemMeta(item);
  const title = getTitle(item, label);
  const stripped = stripMarkdown(item.text);
  const preview = stripped ? truncate(stripped, 140) : null;
  const annotationCount = item._count?.annotations ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}, ${item.wordCount} words, ${formatRelativeTime(item.createdAt)}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'w-full text-left p-4 sm:p-5 transition-all duration-150 group cursor-pointer rounded-2xl border overflow-hidden',
        'focus:outline-none focus:ring-2 focus:ring-purple-500',
        isSelected
          ? 'bg-purple-50/50 border-purple-300 shadow-md ring-1 ring-purple-100'
          : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-md'
      )}
    >
      {/* Row 1: type icon + date | chevron */}
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <ChevronRight className={cn(
          'w-4 h-4 flex-shrink-0 transition-transform text-gray-400 group-hover:text-gray-600',
          'group-hover:translate-x-0.5'
        )} />
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-base sm:text-lg font-bold leading-snug mb-1.5 break-words',
        isSelected ? 'text-purple-900' : 'text-gray-900'
      )}>
        {title}
      </h3>

      {/* Preview text */}
      {preview ? (
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">{preview}</p>
      ) : (
        <p className="text-sm text-gray-400 italic line-clamp-2 leading-relaxed mb-3">No content</p>
      )}

      {/* Footer: word count + annotations */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap min-w-0 overflow-hidden">
        <span>{item.wordCount} words</span>
        {annotationCount > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600">
              <Pencil className="w-3 h-3" />
              {annotationCount}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
