import React from 'react';
import { X } from 'lucide-react';

interface DraftFilterBannerProps {
  draftTitle: string;
  matchCount: number;
  totalCount: number;
  missingCount: number;
  onClear: () => void;
}

export const DraftFilterBanner = React.forwardRef<HTMLDivElement, DraftFilterBannerProps>(
  function DraftFilterBanner({ draftTitle, matchCount, totalCount, missingCount, onClear }, ref) {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {matchCount === 0 ? (
              <>
                <p className="text-sm text-purple-800 font-medium truncate">
                  No activities found for: {draftTitle}
                </p>
                <p className="text-[11px] text-purple-500 mt-0.5">
                  Activities may be outside the loaded time range, or not yet synced.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-purple-800 font-medium truncate">
                  Showing {matchCount} activities for: {draftTitle}
                  {missingCount > 0 && (
                    <span className="text-purple-500 font-normal">
                      {' '}({missingCount} outside current time range)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-purple-500 mt-0.5">
                  Source and time filters paused while viewing story.
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-purple-500 hover:text-purple-700 font-medium flex-shrink-0 transition-colors"
            aria-label="Clear draft filter"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>
    );
  }
);
