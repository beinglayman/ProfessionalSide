/**
 * SelectionPopover Component
 *
 * Fixed-position popover with 6 annotation style buttons.
 * Appears above the text selection when annotate mode is active.
 *
 * Uses brand-consistent styling: white bg, subtle border,
 * primary-tinted hover states to match DropdownMenu patterns.
 */

import React from 'react';
import {
  Highlighter,
  Underline,
  Square,
  Circle,
  Strikethrough,
  AlignLeft,
} from 'lucide-react';
import type { AnnotationStyle } from '../../types/career-stories';

interface SelectionPopoverProps {
  position: { x: number; y: number };
  onSelectStyle: (style: AnnotationStyle) => void;
  onClose: () => void;
}

const STYLES: { style: AnnotationStyle; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { style: 'highlight', label: 'Highlight', Icon: Highlighter },
  { style: 'underline', label: 'Underline', Icon: Underline },
  { style: 'box', label: 'Box', Icon: Square },
  { style: 'circle', label: 'Circle', Icon: Circle },
  { style: 'strike-through', label: 'Strike-through', Icon: Strikethrough },
  { style: 'bracket', label: 'Bracket', Icon: AlignLeft },
];

export const SelectionPopover: React.FC<SelectionPopoverProps> = ({
  position,
  onSelectStyle,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop to close on click-outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-md px-1.5 py-1"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
      >
        {STYLES.map(({ style, label, Icon }) => (
          <button
            key={style}
            onClick={() => onSelectStyle(style)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title={label}
            aria-label={`Mark as ${label}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </>
  );
};
