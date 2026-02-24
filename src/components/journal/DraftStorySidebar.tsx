import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { SidebarDraftCard } from './SidebarDraftCard';
import { ActivityGroup } from '../../types/activity';
import { cn } from '../../lib/utils';

interface DraftStorySidebarProps {
  drafts: ActivityGroup[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string | null) => void;
  onPromote: (id: string) => void;
  onRegenerate: (id: string) => void;
  regeneratingId?: string | null;
  /** Match count for the selected draft filter */
  filterMatchCount?: number;
  filterTotalCount?: number;
}

const BATCH_SIZE = 10;
export function DraftStorySidebar({
  drafts,
  selectedId,
  isLoading,
  onSelect,
  onPromote,
  onRegenerate,
  regeneratingId,
  filterMatchCount,
  filterTotalCount,
}: DraftStorySidebarProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [hintHidden, setHintHidden] = useState(false);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="sticky top-6 self-start">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Draft Stories</span>
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="h-[80px] bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Zero drafts
  if (drafts.length === 0) {
    return (
      <div className="sticky top-6 self-start">
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Draft Stories</span>
        </div>
        <div className="bg-purple-50/40 border border-dashed border-purple-200 rounded-xl p-4">
          <p className="text-gray-500 text-sm">
            Stories form automatically as your activities sync. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  const visibleDrafts = drafts.slice(0, visibleCount);
  const remainingCount = drafts.length - visibleCount;

  return (
    <div className="sticky top-6 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Header + count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Draft Stories</span>
        </div>
        <span className="text-[10px] tabular-nums bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-bold">
          {drafts.length}
        </span>
      </div>

      {/* Draft cards */}
      <div className="space-y-3">
        {visibleDrafts.map(draft => (
          <SidebarDraftCard
            key={draft.key}
            draft={draft}
            isSelected={selectedId === draft.key}
            isMuted={selectedId !== null && selectedId !== draft.key}
            onSelect={() => onSelect(draft.key)}
            onPromote={() => onPromote(draft.storyMetadata!.id)}
            onRegenerate={() => onRegenerate(draft.storyMetadata!.id)}
            isRegenerateLoading={regeneratingId != null}
            filterMatchCount={selectedId === draft.key ? filterMatchCount : undefined}
            filterTotalCount={selectedId === draft.key ? filterTotalCount : undefined}
          />
        ))}
      </div>

      {/* Show more button */}
      {remainingCount > 0 && (
        <button
          onClick={() => setVisibleCount(prev => prev + BATCH_SIZE)}
          className="w-full mt-2 py-2 text-[11px] font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50/50 transition-colors border border-gray-100 rounded-lg text-center"
        >
          + Show {Math.min(remainingCount, BATCH_SIZE)} more
        </button>
      )}

      {/* Footer hint — hidden after first selection */}
      {!hintHidden && !selectedId && (
        <p className="text-[11px] text-gray-300 text-center leading-relaxed mt-4">
          Click a story to see which<br />activities built it
        </p>
      )}
    </div>
  );
}
