/**
 * Global Demo Mode Service
 *
 * Manages app-wide demo mode state. Used for YC pitch demos.
 * Hidden from users - toggle via Cmd/Ctrl+E.
 */

const DEMO_MODE_KEY = 'app-demo-mode';
const DEMO_SYNC_STATUS_KEY = 'app-demo-sync-status';
const DEMO_DATASET_KEY = 'app-demo-dataset';

/** SSR guard - returns true if running in Node/SSR environment */
function isServerSide(): boolean {
  return typeof window === 'undefined';
}

/** Default sync status for new users or SSR */
const DEFAULT_SYNC_STATUS: DemoSyncStatus = {
  hasSynced: false,
  lastSyncAt: null,
  activityCount: 0,
  entryCount: 0,
  temporalEntryCount: 0,
  clusterEntryCount: 0,
};

/**
 * Check if demo mode is enabled globally.
 * Demo mode is off by default. Toggle via Cmd+E.
 */
export function isDemoMode(): boolean {
  if (isServerSide()) {
    return false;
  }
  const value = localStorage.getItem(DEMO_MODE_KEY);
  return value === 'true';
}

export function enableDemoMode(): void {
  if (!isServerSide()) {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    window.dispatchEvent(new CustomEvent('demo-mode-changed', { detail: { isDemo: true } }));
  }
}

export function disableDemoMode(): void {
  if (!isServerSide()) {
    localStorage.setItem(DEMO_MODE_KEY, 'false');
    window.dispatchEvent(new CustomEvent('demo-mode-changed', { detail: { isDemo: false } }));
  }
}

export function toggleDemoMode(): boolean {
  const newValue = !isDemoMode();
  if (newValue) {
    enableDemoMode();
  } else {
    disableDemoMode();
  }
  return newValue;
}

/**
 * Demo sync status tracking
 */
export interface DemoSyncStatus {
  hasSynced: boolean;
  lastSyncAt: string | null;
  activityCount: number;
  /** Total journal entries */
  entryCount: number;
  /** Journal entries grouped by time window (bi-weekly) */
  temporalEntryCount: number;
  /** Journal entries grouped by cross-tool refs (e.g., AUTH-123) */
  clusterEntryCount: number;
}

export function getDemoSyncStatus(): DemoSyncStatus {
  if (isServerSide()) {
    return DEFAULT_SYNC_STATUS;
  }
  const stored = localStorage.getItem(DEMO_SYNC_STATUS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_SYNC_STATUS;
    }
  }
  return DEFAULT_SYNC_STATUS;
}

export function setDemoSyncStatus(status: DemoSyncStatus): void {
  if (!isServerSide()) {
    localStorage.setItem(DEMO_SYNC_STATUS_KEY, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent('demo-sync-status-changed', { detail: status }));
  }
}

export function clearDemoSyncStatus(): void {
  if (!isServerSide()) {
    localStorage.removeItem(DEMO_SYNC_STATUS_KEY);
    window.dispatchEvent(new CustomEvent('demo-sync-status-changed', { detail: DEFAULT_SYNC_STATUS }));
  }
}

// ============================================================================
// Dataset Selection
// ============================================================================

export type DemoDataset = 'v1' | 'v2';

export function getDemoDataset(): DemoDataset {
  if (isServerSide()) return 'v2';
  const value = localStorage.getItem(DEMO_DATASET_KEY);
  return value === 'v1' ? 'v1' : 'v2';
}

export function setDemoDataset(dataset: DemoDataset): void {
  if (!isServerSide()) {
    localStorage.setItem(DEMO_DATASET_KEY, dataset);
    window.dispatchEvent(new CustomEvent('demo-dataset-changed', { detail: { dataset } }));
  }
}
