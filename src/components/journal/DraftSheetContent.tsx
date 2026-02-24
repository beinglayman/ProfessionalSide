import React from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { SidebarDraftCard } from './SidebarDraftCard';
import { ActivityGroup } from '../../types/activity';

interface DraftSheetContentProps {
  drafts: ActivityGroup[];
  onPromote: (id: string) => void;
  onRegenerate?: (id: string) => void;
  regeneratingId?: string | null;
  onClose: () => void;
}

export function DraftSheetContent({
  drafts,
  onPromote,
  onRegenerate,
  regeneratingId,
  onClose,
}: DraftSheetContentProps) {
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-sm font-semibold text-gray-700">Draft Stories</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close draft stories"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Draft cards — CTA always visible on mobile */}
      <div className="space-y-3">
        {drafts.map(draft => (
          <SidebarDraftCard
            key={draft.key}
            draft={draft}
            isSelected={false}
            isMuted={false}
            onSelect={() => {}}
            onPromote={() => onPromote(draft.storyMetadata!.id)}
            onRegenerate={onRegenerate ? () => onRegenerate(draft.storyMetadata!.id) : undefined}
            isRegenerateLoading={regeneratingId != null}
            showCTA={true}
          />
        ))}
      </div>
    </div>
  );
}
