import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { formatRelativeTime } from '../../lib/format';

interface SyncStatusIndicatorProps {
  isSyncing: boolean;
  lastSyncAt: string | null;
}

export function SyncStatusIndicator({ isSyncing, lastSyncAt }: SyncStatusIndicatorProps) {
  // Bump a counter every 60s to keep the relative time fresh
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isSyncing || !lastSyncAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [isSyncing, lastSyncAt]);

  if (isSyncing) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing...
      </span>
    );
  }

  if (!lastSyncAt) return null;

  return (
    <span className="text-xs text-gray-400">
      Synced {formatRelativeTime(lastSyncAt)}
    </span>
  );
}
