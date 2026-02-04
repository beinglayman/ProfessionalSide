import { useEffect } from 'react';

/**
 * Sets the document title with consistent suffix.
 * Reverts to default title on unmount.
 *
 * @param title - Page title (e.g., "Activity")
 * @param suffix - Optional suffix, defaults to "inChronicle"
 */
export function useDocumentTitle(title: string, suffix = 'inChronicle') {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | ${suffix}`;

    return () => {
      document.title = previousTitle;
    };
  }, [title, suffix]);
}
