import { useState, useCallback, useRef, useEffect } from 'react';
import { TIMING } from '../components/career-stories/constants';

/**
 * Manages the "exclude with undo" state machine for source exclusion.
 *
 * Flow: click exclude → show undo UI → wait 5s → commit exclusion.
 * If user clicks Undo within the grace period, the exclusion is cancelled.
 * Timer is cleaned up on unmount to prevent memory leaks.
 */
export function useExcludeWithUndo(
  onExclude: (sourceId: string) => void,
  onUndoExclude: (sourceId: string) => void,
) {
  const [pendingExclude, setPendingExclude] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleExclude = useCallback((sourceId: string) => {
    setPendingExclude(sourceId);
    undoTimerRef.current = setTimeout(() => {
      onExclude(sourceId);
      setPendingExclude(null);
    }, TIMING.EXCLUDE_UNDO_MS);
  }, [onExclude]);

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (pendingExclude) {
      onUndoExclude(pendingExclude);
    }
    setPendingExclude(null);
  }, [pendingExclude, onUndoExclude]);

  return { pendingExclude, handleExclude, handleUndo };
}
