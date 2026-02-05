/**
 * Hook for polling backend during background narrative generation.
 *
 * After sync completes, narratives are generated in the background (~10-30s).
 * This hook:
 * 1. Starts polling when `isGenerating` becomes true
 * 2. Invalidates React Query cache every interval to fetch fresh data
 * 3. Stops after timeout or when `isGenerating` becomes false
 * 4. Cleans up intervals on unmount to prevent memory leaks
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  NARRATIVE_POLL_INTERVAL_MS,
  NARRATIVE_POLL_TIMEOUT_MS,
} from '../services/sync.service';

/** Default query keys to invalidate during polling */
const DEFAULT_QUERY_KEYS: string[][] = [['journal'], ['activities']];

interface UseNarrativePollingOptions {
  /** Whether narrative generation is in progress */
  isGenerating: boolean;
  /** Called when polling stops (either timeout or manual stop) */
  onPollingComplete?: () => void;
  /** Query keys to invalidate on each poll (default: journal, activities) */
  queryKeys?: string[][];
}

/**
 * Polls for narrative completion by invalidating React Query cache.
 *
 * @example
 * ```tsx
 * const { stopPolling } = useNarrativePolling({
 *   isGenerating: narrativesGenerating,
 *   onPollingComplete: () => setNarrativesGenerating(false),
 * });
 * ```
 */
export function useNarrativePolling({
  isGenerating,
  onPollingComplete,
  queryKeys = DEFAULT_QUERY_KEYS,
}: UseNarrativePollingOptions) {
  const queryClient = useQueryClient();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid effect re-runs when they change
  const onPollingCompleteRef = useRef(onPollingComplete);
  onPollingCompleteRef.current = onPollingComplete;

  // Cleanup function to clear all timers
  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start/stop polling based on isGenerating
  // Only re-run when isGenerating changes, not on every render
  useEffect(() => {
    if (!isGenerating) {
      console.log('[NarrativePolling] Stopped - isGenerating is false');
      cleanup();
      return;
    }

    console.log('[NarrativePolling] Started - polling every', NARRATIVE_POLL_INTERVAL_MS, 'ms for max', NARRATIVE_POLL_TIMEOUT_MS, 'ms');

    // Start polling - invalidate queries every interval
    pollIntervalRef.current = setInterval(() => {
      console.log('[NarrativePolling] Polling tick - invalidating queries');
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }, NARRATIVE_POLL_INTERVAL_MS);

    // Set timeout to stop polling after max duration
    timeoutRef.current = setTimeout(() => {
      console.log('[NarrativePolling] Timeout reached - stopping polling');
      cleanup();
      // Final refresh
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      onPollingCompleteRef.current?.();
    }, NARRATIVE_POLL_TIMEOUT_MS);

    // Cleanup on unmount or when isGenerating changes
    return cleanup;
  }, [isGenerating, queryClient, queryKeys, cleanup]);

  // Manual stop function
  const stopPolling = useCallback(() => {
    cleanup();
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
    onPollingCompleteRef.current?.();
  }, [cleanup, queryClient, queryKeys]);

  return { stopPolling };
}
