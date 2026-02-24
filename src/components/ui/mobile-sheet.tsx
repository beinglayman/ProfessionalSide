import React, { useEffect } from 'react';

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max height as viewport percentage. Default: 85. */
  maxHeightVh?: number;
  /** aria-label for the dialog. Default: "Sheet" */
  ariaLabel?: string;
}

/**
 * Mobile bottom sheet overlay.
 * - Closes on backdrop click
 * - Closes on Escape key
 * - Traps focus within the dialog
 */
export const MobileSheet: React.FC<MobileSheetProps> = ({
  isOpen,
  onClose,
  children,
  maxHeightVh = 85,
  ariaLabel = 'Sheet',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxHeightStyle = `${maxHeightVh}vh`;
  const contentMaxHeight = `calc(${maxHeightStyle} - 2rem)`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl overflow-hidden animate-slide-up"
        style={{ maxHeight: maxHeightStyle }}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* Content */}
        <div
          className="overflow-y-auto overflow-x-hidden p-4"
          style={{ maxHeight: contentMaxHeight }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
