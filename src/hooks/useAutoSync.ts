import { useState, useEffect, useRef } from 'react';
import { isDemoMode } from '../services/demo-mode.service';
import {
  runLiveSync,
  getLastSyncAt,
  getConnectedToolTypes,
} from '../services/sync.service';
import { getErrorConsole } from '../contexts/ErrorConsoleContext';
import { queryClient } from '../lib/queryClient';

/** Minimum time between auto-syncs (1 hour) */
const AUTO_SYNC_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Triggers a silent background sync on dashboard mount when data is stale (>1 hour).
 * No modal, no toast — the caller renders a SyncStatusIndicator with the returned state.
 */
export function useAutoSync(): { isSyncing: boolean; lastSyncAt: string | null } {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncAt());
  const syncStartedRef = useRef(false);

  useEffect(() => {
    if (syncStartedRef.current) return; // StrictMode double-mount guard
    if (isDemoMode()) return;

    const token = localStorage.getItem('inchronicle_access_token');
    if (!token) return;

    // Check staleness
    const last = getLastSyncAt();
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      if (elapsed < AUTO_SYNC_THRESHOLD_MS) return; // Recent enough, skip
    }

    // Fire async sync
    syncStartedRef.current = true;

    (async () => {
      // Pre-check: any tools connected?
      const tools = await getConnectedToolTypes(token);
      if (tools.length === 0) return;

      setIsSyncing(true);

      await runLiveSync({
        onStateUpdate: () => {}, // no modal to update
        onComplete: () => {
          setIsSyncing(false);
          setLastSyncAt(getLastSyncAt());

          // Refresh dashboard-relevant queries
          queryClient.invalidateQueries({ queryKey: ['journal'] });
          queryClient.invalidateQueries({ queryKey: ['activities'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['mcp.integrations'] });
        },
        onError: (error) => {
          setIsSyncing(false);

          const { captureError } = getErrorConsole();
          if (captureError) {
            captureError({
              severity: 'warn',
              source: 'AutoSync',
              message: `Background sync failed: ${error.message}`,
              context: { phase: 'auto-sync' },
            });
          }
        },
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isSyncing, lastSyncAt };
}
