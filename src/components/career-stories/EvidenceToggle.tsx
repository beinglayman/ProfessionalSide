/**
 * EvidenceToggle - the "Evidence on/off" pill button.
 *
 * Visible in the full-screen story views. Turns primary-tinted with a
 * colored dot when evidence mode is active. Design ref:
 * public/prototypes/evidence/proto-V6c-tufte-inline-badges.html
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface EvidenceToggleProps {
  on: boolean;
  onToggle: () => void;
  /** "md" for the page-level buttons, "sm" for dense fullscreen headers. */
  size?: 'sm' | 'md';
  className?: string;
}

export const EvidenceToggle: React.FC<EvidenceToggleProps> = ({
  on,
  onToggle,
  size = 'md',
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border font-medium transition-all',
        size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]',
        on
          ? 'border-primary-200 bg-primary-50 text-primary-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900',
        className,
      )}
      aria-pressed={on}
      aria-label="Toggle evidence view"
    >
      <span
        className={cn(
          'rounded-full transition-colors',
          size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5',
          on ? 'bg-primary-600' : 'bg-gray-300',
        )}
      />
      <span>Evidence {on ? 'on' : 'off'}</span>
    </button>
  );
};
