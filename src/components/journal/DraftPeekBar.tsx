import React from 'react';
import { ChevronUp, Star } from 'lucide-react';

interface DraftPeekBarProps {
  count: number;
  isLoading: boolean;
  onTap: () => void;
  isOpen: boolean;
}

export function DraftPeekBar({ count, isLoading, onTap, isOpen }: DraftPeekBarProps) {
  if (count === 0 && !isLoading) return null;

  return (
    <button
      onClick={onTap}
      role="button"
      aria-label={`Open draft stories. ${count} drafts available.`}
      aria-expanded={isOpen}
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-purple-200 shadow-lg px-4 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-purple-600" />
        {isLoading ? (
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        ) : (
          <span className="text-sm font-semibold text-purple-700">
            {count} Draft {count === 1 ? 'Story' : 'Stories'}
          </span>
        )}
      </div>
      <ChevronUp className="w-4 h-4 text-purple-400" />
    </button>
  );
}
