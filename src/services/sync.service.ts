/**
 * Sync Service
 *
 * Handles sync operations with real backend calls.
 * Shows honest loading state while sync is in progress.
 */

import { setDemoSyncStatus } from './demo-mode.service';
import { API_BASE_URL } from '../lib/api';

/**
 * Integration metadata
 */
interface IntegrationMeta {
  id: string;
  name: string;
  icon: string;
  itemLabel: string;
}

const INTEGRATION_META: IntegrationMeta[] = [
  { id: 'github', name: 'GitHub', icon: 'github', itemLabel: 'commits & PRs' },
  { id: 'jira', name: 'Jira', icon: 'jira', itemLabel: 'tickets' },
  { id: 'confluence', name: 'Confluence', icon: 'confluence', itemLabel: 'docs' },
  { id: 'slack', name: 'Slack', icon: 'slack', itemLabel: 'threads' },
  { id: 'figma', name: 'Figma', icon: 'figma', itemLabel: 'designs' },
  { id: 'google', name: 'Google Workspace', icon: 'google', itemLabel: 'meetings' },
  { id: 'outlook', name: 'Outlook', icon: 'outlook', itemLabel: 'emails' },
];

export interface SyncIntegration {
  id: string;
  name: string;
  icon: string;
  status: 'pending' | 'syncing' | 'done' | 'error';
  itemCount?: number;
  itemLabel?: string;
}

export interface EntryPreview {
  id: string;
  title: string;
  groupingMethod: 'time' | 'cluster';
  activityCount: number;
  status: 'pending' | 'generating' | 'done';
}

export type SyncPhase = 'syncing' | 'complete';

export interface SyncState {
  phase: SyncPhase;
  integrations: SyncIntegration[];
  entries: EntryPreview[];
  totalActivities: number;
  totalEntries: number;
}

export interface SyncCallbacks {
  onStateUpdate: (state: SyncState) => void;
  onComplete: (result: SyncResult) => void;
  onError: (error: Error) => void;
}

export interface SyncResult {
  activityCount: number;
  activitiesBySource: Record<string, number>;
  entryCount: number;
  temporalEntryCount: number;
  clusterEntryCount: number;
}

/**
 * Build integrations list from backend response
 */
function buildIntegrations(activitiesBySource: Record<string, number>): SyncIntegration[] {
  return INTEGRATION_META
    .filter(meta => (activitiesBySource[meta.id] ?? 0) > 0)
    .map(meta => ({
      ...meta,
      itemCount: activitiesBySource[meta.id],
      status: 'done' as const,
    }));
}

/**
 * Run sync - calls backend and waits for completion.
 * Shows honest "syncing" state, then results when done.
 */
export async function runDemoSync(callbacks: SyncCallbacks): Promise<void> {
  try {
    // Show syncing state
    callbacks.onStateUpdate({
      phase: 'syncing',
      integrations: [],
      entries: [],
      totalActivities: 0,
      totalEntries: 0,
    });

    // Call backend
    const token = localStorage.getItem('inchronicle_access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${API_BASE_URL}/demo/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.data || data;

    // Build final state
    const integrations = buildIntegrations(result.activitiesBySource);
    const entries: EntryPreview[] = (result.entryPreviews || []).map((e: EntryPreview) => ({
      ...e,
      status: 'done' as const,
    }));

    // Show complete state
    callbacks.onStateUpdate({
      phase: 'complete',
      integrations,
      entries,
      totalActivities: result.activityCount,
      totalEntries: result.entryCount,
    });

    // Notify journal to refresh
    window.dispatchEvent(new CustomEvent('journal-data-changed'));

    // Update local sync status
    setDemoSyncStatus({
      hasSynced: true,
      lastSyncAt: new Date().toISOString(),
      activityCount: result.activityCount,
      entryCount: result.entryCount,
      temporalEntryCount: result.temporalEntryCount,
      clusterEntryCount: result.clusterEntryCount,
    });

    callbacks.onComplete({
      activityCount: result.activityCount,
      activitiesBySource: result.activitiesBySource,
      entryCount: result.entryCount,
      temporalEntryCount: result.temporalEntryCount,
      clusterEntryCount: result.clusterEntryCount,
    });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Sync failed'));
  }
}

/**
 * Clear all demo data.
 */
export async function clearDemoData(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/demo/clear`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Backend demo clear not available');
  }

  setDemoSyncStatus({
    hasSynced: false,
    lastSyncAt: null,
    activityCount: 0,
    entryCount: 0,
    temporalEntryCount: 0,
    clusterEntryCount: 0,
  });
}

/**
 * Reset demo data (clear + reseed).
 */
export async function resetDemoData(callbacks: SyncCallbacks): Promise<void> {
  await clearDemoData();
  await runDemoSync(callbacks);
}

/**
 * Run live sync - fetches real data from connected tools (GitHub, OneDrive)
 * and persists to ToolActivity table, creates journal entries with narratives.
 * This is the production equivalent of runDemoSync - flow matches exactly.
 */
export async function runLiveSync(callbacks: SyncCallbacks): Promise<void> {
  try {
    // Show syncing state
    callbacks.onStateUpdate({
      phase: 'syncing',
      integrations: [],
      entries: [],
      totalActivities: 0,
      totalEntries: 0,
    });

    // Call backend
    const token = localStorage.getItem('inchronicle_access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${API_BASE_URL}/mcp/sync-and-persist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        toolTypes: ['github', 'onedrive'],
        consentGiven: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.data || data;

    // Build final state (matches demo sync response format)
    const integrations = buildIntegrations(result.activitiesBySource || {});
    const entries: EntryPreview[] = (result.entryPreviews || []).map((e: EntryPreview) => ({
      ...e,
      status: 'done' as const,
    }));

    // Show complete state
    callbacks.onStateUpdate({
      phase: 'complete',
      integrations,
      entries,
      totalActivities: result.activityCount || 0,
      totalEntries: result.entryCount || 0,
    });

    // Notify journal to refresh
    window.dispatchEvent(new CustomEvent('journal-data-changed'));

    callbacks.onComplete({
      activityCount: result.activityCount || 0,
      activitiesBySource: result.activitiesBySource || {},
      entryCount: result.entryCount || 0,
      temporalEntryCount: result.temporalEntryCount || 0,
      clusterEntryCount: result.clusterEntryCount || 0,
    });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Live sync failed'));
  }
}
