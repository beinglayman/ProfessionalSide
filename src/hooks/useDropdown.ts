/**
 * useDropdown Hook
 *
 * Shared dropdown behavior: open/close state, click-outside, and Escape key.
 * Used by ArchetypeSelector and FrameworkSelector.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseDropdownOptions {
  /** Called when the dropdown closes */
  onClose?: () => void;
}

interface UseDropdownReturn {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useDropdown({ onClose }: UseDropdownOptions = {}): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) onClose?.();
      return !prev;
    });
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return { isOpen, toggle, close, containerRef };
}
