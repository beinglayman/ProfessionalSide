/**
 * useDropdown Hook
 *
 * Shared dropdown behavior: open/close state, click-outside, Escape key,
 * and arrow key navigation for role="option" elements.
 * Used by ArchetypeSelector, FrameworkSelector, and SourceFilterDropdown.
 *
 * Mutual exclusion: opening any useDropdown instance dispatches a custom
 * 'useDropdown:open' event. All other instances listen and close themselves.
 * This prevents sibling dropdowns from being open simultaneously.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

const DROPDOWN_OPEN_EVENT = 'useDropdown:open';

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
  // Stable identity so the event listener can distinguish "self" from "other"
  const instanceId = useRef(Symbol());

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        onClose?.();
      } else {
        // Broadcast: "I'm opening — everyone else close"
        document.dispatchEvent(
          new CustomEvent(DROPDOWN_OPEN_EVENT, { detail: instanceId.current })
        );
      }
      return !prev;
    });
  }, [onClose]);

  // Listen for other dropdowns opening and close self
  useEffect(() => {
    const handleOtherOpen = (e: Event) => {
      const ce = e as CustomEvent<symbol>;
      if (ce.detail !== instanceId.current) {
        setIsOpen(false);
        onClose?.();
      }
    };
    document.addEventListener(DROPDOWN_OPEN_EVENT, handleOtherOpen);
    return () => document.removeEventListener(DROPDOWN_OPEN_EVENT, handleOtherOpen);
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

  // Keyboard: Escape to close, ArrowUp/ArrowDown to navigate options, Enter to activate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        // Return focus to trigger button
        const trigger = containerRef.current?.querySelector<HTMLElement>('[aria-haspopup]');
        trigger?.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;

        const options = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
        if (options.length === 0) return;

        const currentIndex = options.findIndex(opt => opt === document.activeElement);
        let nextIndex: number;

        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }

        options[nextIndex].focus();
      }

      if (e.key === 'Enter' && document.activeElement?.getAttribute('role') === 'option') {
        e.preventDefault();
        (document.activeElement as HTMLElement).click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return { isOpen, toggle, close, containerRef };
}
