/**
 * DemoTab Component
 *
 * Demo mode controls within the unified dev console.
 * Read-only status display + clear functionality.
 *
 * Writing (sync) happens via Journal page - this is just for viewing/clearing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Database,
  FileText,
  Clock,
  Link2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  isDemoMode,
  toggleDemoMode,
  getDemoDataset,
  setDemoDataset,
  DemoDataset,
} from '../../services/demo-mode.service';
import { fetchStatus, clearDemoData, devClearAllData, AppStatus } from '../../services/status.service';

export const DemoTab: React.FC = () => {
  const [isDemo, setIsDemo] = useState(() => isDemoMode());
  const [dataset, setDataset] = useState<DemoDataset>(() => getDemoDataset());
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status from real APIs
  const refreshStatus = useCallback(async () => {
    if (!isDemo) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  }, [isDemo]);

  // Fetch on mount and when demo mode changes
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Listen for demo mode changes
  useEffect(() => {
    const handleDemoModeChanged = (e: CustomEvent<{ isDemo: boolean }>) => {
      setIsDemo(e.detail.isDemo);
    };

    window.addEventListener('demo-mode-changed', handleDemoModeChanged as EventListener);
    return () => {
      window.removeEventListener('demo-mode-changed', handleDemoModeChanged as EventListener);
    };
  }, []);

  const handleToggle = () => {
    const newValue = toggleDemoMode();
    setIsDemo(newValue);
    if (newValue) {
      // Fetch status when switching to demo mode
      refreshStatus();
    } else {
      setStatus(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all demo data? This will delete demo activities and journal entries.')) {
      return;
    }

    setIsClearing(true);
    setError(null);
    try {
      await clearDemoData();
      // Refresh from backend to confirm deletion
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleDatasetSwitch = async (newDataset: DemoDataset) => {
    if (newDataset === dataset) return;

    // If there's existing data, offer to clear it first
    if (hasData) {
      const shouldClear = confirm('Clear existing demo data before switching? (Cancel to keep it — next Sync will replace it anyway.)');
      if (shouldClear) {
        setIsClearing(true);
        setError(null);
        try {
          await clearDemoData();
          await refreshStatus();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to clear data');
          setIsClearing(false);
          return;
        }
        setIsClearing(false);
      }
    }

    setDemoDataset(newDataset);
    setDataset(newDataset);
  };

  const hasData = status && (status.activityCount > 0 || status.totalEntries > 0);

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

      {/* Dataset Selector (only when in demo mode) */}
      {isDemo && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Dataset</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleDatasetSwitch('v1')}
              disabled={isClearing}
              className={`flex-1 p-2.5 rounded-lg border transition-all text-left ${
                dataset === 'v1'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-gray-600 hover:border-gray-500 opacity-60'
              }`}
            >
              <span className={`text-sm font-medium ${dataset === 'v1' ? 'text-amber-400' : 'text-gray-400'}`}>
                V1 — Auth/Perf
              </span>
              <p className="text-xs text-gray-500 mt-0.5">35 activities, 3 stories</p>
            </button>
            <button
              onClick={() => handleDatasetSwitch('v2')}
              disabled={isClearing}
              className={`flex-1 p-2.5 rounded-lg border transition-all text-left ${
                dataset === 'v2'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-gray-600 hover:border-gray-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-medium ${dataset === 'v2' ? 'text-amber-400' : 'text-gray-400'}`}>
                  V2 — Collab/Incident
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded px-1 py-0.5">
                  default
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">49 activities, 4 stories</p>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Next Sync on Journal page will use the selected dataset.
          </p>
        </div>
      )}

      {/* Demo Data Status (only when in demo mode) */}
      {isDemo && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Demo Data Status</h3>
            <button
              onClick={refreshStatus}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {isLoading && !status ? (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : status && hasData ? (
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <Database className="h-4 w-4" />
                  Activities
                </span>
                <span className="font-mono text-gray-200">{status.activityCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <FileText className="h-4 w-4" />
                  Journal Entries
                </span>
                <span className="font-mono text-gray-200">{status.totalEntries}</span>
              </div>
              <div className="flex items-center justify-between text-sm pl-4 text-xs">
                <span className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-3 w-3" />
                  Temporal (bi-weekly)
                </span>
                <span className="font-mono text-gray-400">{status.entriesByGrouping.time || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm pl-4 text-xs">
                <span className="flex items-center gap-2 text-gray-500">
                  <Link2 className="h-3 w-3" />
                  Cluster-based (refs)
                </span>
                <span className="font-mono text-gray-400">{status.entriesByGrouping.cluster || 0}</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">No demo data</p>
              <p className="text-xs text-gray-500 mt-1">
                Use the Sync button on the Journal page to seed demo data
              </p>
            </div>
          )}
        </div>
      )}

      {/* Clear Button (only when in demo mode and has data) */}
      {isDemo && hasData && (
        <div>
          <button
            onClick={handleClear}
            disabled={isClearing}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-800 hover:bg-red-900/30 disabled:opacity-50 text-red-400 text-sm font-medium rounded-lg transition-colors"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Clear Demo Data
              </>
            )}
          </button>
        </div>
      )}

      {/* DEV: Clear Live Data (only when in live mode) */}
      {!isDemo && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Dev Tools (Live Mode)</h3>
          <button
            onClick={async () => {
              if (!confirm('DELETE all live journal entries, activities, and career stories? This cannot be undone.')) return;
              setIsClearing(true);
              setError(null);
              try {
                const result = await devClearAllData();
                setError(null);
                alert(`Cleared ${result.deletedEntries} entries, ${result.deletedActivities} activities, ${result.deletedStories} stories`);
                window.dispatchEvent(new CustomEvent('journal-data-changed'));
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to clear data');
              } finally {
                setIsClearing(false);
              }
            }}
            disabled={isClearing}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-800 hover:bg-red-900/30 disabled:opacity-50 text-red-400 text-sm font-medium rounded-lg transition-colors"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Clear Live Data (entries + activities + stories)
              </>
            )}
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
