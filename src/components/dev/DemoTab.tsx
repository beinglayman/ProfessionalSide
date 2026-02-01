/**
 * DemoTab Component
 *
 * Demo mode controls within the unified dev console.
 * Allows toggling demo mode, syncing demo data, and resetting.
 */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Database,
  FileText,
  Clock,
  Link2,
  Play,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import {
  isDemoMode,
  toggleDemoMode,
  getDemoSyncStatus,
  setDemoSyncStatus,
  clearDemoSyncStatus,
  DemoSyncStatus,
} from '../../services/demo-mode.service';
import { runDemoSync, clearDemoData } from '../../services/demo-sync.service';
import { SyncIntegration } from '../sync/SyncProgressModal';

export const DemoTab: React.FC = () => {
  const [isDemo, setIsDemo] = useState(() => isDemoMode());
  const [syncStatus, setSyncStatus] = useState<DemoSyncStatus>(() => getDemoSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [syncIntegrations, setSyncIntegrations] = useState<SyncIntegration[]>([]);

  // Listen for demo mode changes
  useEffect(() => {
    const handleDemoModeChanged = (e: CustomEvent<{ isDemo: boolean }>) => {
      setIsDemo(e.detail.isDemo);
    };
    const handleSyncStatusChanged = (e: CustomEvent<DemoSyncStatus>) => {
      setSyncStatus(e.detail);
    };

    window.addEventListener('demo-mode-changed', handleDemoModeChanged as EventListener);
    window.addEventListener('demo-sync-status-changed', handleSyncStatusChanged as EventListener);

    return () => {
      window.removeEventListener('demo-mode-changed', handleDemoModeChanged as EventListener);
      window.removeEventListener('demo-sync-status-changed', handleSyncStatusChanged as EventListener);
    };
  }, []);

  const handleToggle = () => {
    const newValue = toggleDemoMode();
    setIsDemo(newValue);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncIntegrations([]);

    await runDemoSync({
      onIntegrationUpdate: setSyncIntegrations,
      onComplete: (result) => {
        setIsSyncing(false);
        setSyncIntegrations([]);
        // Reload to reflect new data
        window.location.reload();
      },
      onError: (error) => {
        console.error('Demo sync failed:', error);
        setIsSyncing(false);
        setSyncIntegrations([]);
      },
    });
  };

  const handleClear = async () => {
    setIsClearing(true);
    await clearDemoData();
    setIsClearing(false);
    window.location.reload();
  };

  return (
    <div className="p-4 space-y-6">
      {/* Mode Toggle */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">App Mode</h3>
        <div className="flex gap-3">
          {/* Live Mode */}
          <button
            onClick={() => isDemo && handleToggle()}
            className={`flex-1 p-3 rounded-lg border transition-all ${
              !isDemo
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${!isDemo ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className={`text-sm font-medium ${!isDemo ? 'text-green-400' : 'text-gray-400'}`}>
                Live Mode
              </span>
            </div>
            <p className="text-xs text-gray-500 text-left">
              Real integrations
            </p>
          </button>

          {/* Demo Mode */}
          <button
            onClick={() => !isDemo && handleToggle()}
            className={`flex-1 p-3 rounded-lg border transition-all ${
              isDemo
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${isDemo ? 'bg-amber-500' : 'bg-gray-500'}`} />
              <span className={`text-sm font-medium ${isDemo ? 'text-amber-400' : 'text-gray-400'}`}>
                Demo Mode
              </span>
            </div>
            <p className="text-xs text-gray-500 text-left">
              Sample data
            </p>
          </button>
        </div>
      </div>

      {/* Demo Data Status (only when in demo mode) */}
      {isDemo && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Demo Data Status</h3>

          {syncStatus.hasSynced ? (
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <Database className="h-4 w-4" />
                  Activities
                </span>
                <span className="font-mono text-gray-200">{syncStatus.activityCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <FileText className="h-4 w-4" />
                  Journal Entries
                </span>
                <span className="font-mono text-gray-200">{syncStatus.entryCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm pl-4 text-xs">
                <span className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-3 w-3" />
                  Temporal (bi-weekly)
                </span>
                <span className="font-mono text-gray-400">{syncStatus.temporalEntryCount || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm pl-4 text-xs">
                <span className="flex items-center gap-2 text-gray-500">
                  <Link2 className="h-3 w-3" />
                  Cluster-based (refs)
                </span>
                <span className="font-mono text-gray-400">{syncStatus.clusterEntryCount || 0}</span>
              </div>
              {syncStatus.lastSyncAt && (
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                  Last synced: {new Date(syncStatus.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">No demo data synced yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Click "Sync Demo Data" below or use the Sync button in Journal
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sync Progress (when syncing) */}
      {isSyncing && syncIntegrations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Syncing...</h3>
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            {syncIntegrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  {integration.status === 'pending' && <Circle className="h-3 w-3 text-gray-500" />}
                  {integration.status === 'syncing' && <Loader2 className="h-3 w-3 text-amber-500 animate-spin" />}
                  {integration.status === 'done' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {integration.name}
                </span>
                {integration.status === 'done' && integration.itemCount !== undefined && (
                  <span className="text-xs text-green-400">
                    {integration.itemCount} {integration.itemLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions (only when in demo mode) */}
      {isDemo && (
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing || isClearing}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:text-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Sync Demo Data
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            disabled={isSyncing || isClearing || !syncStatus.hasSynced}
            className="flex items-center justify-center gap-2 py-2 px-4 border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Demo mode uses sample data for the 60-90 day promo-prep scenario.</p>
        <p>Real integrations are not affected while in demo mode.</p>
      </div>
    </div>
  );
};
