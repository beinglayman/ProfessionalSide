/**
 * Sync Service
 *
 * Handles sync operations with real backend calls.
 * Shows progressive loading state as sync phases complete.
 *
 * Sync Flow:
 * 1. Fetching - Call backend API to sync activities
 * 2. Activities Synced - Show imported activity counts by source
 * 3. Generating Stories - Show draft story titles being created
 * 4. Complete - All done, narratives generating in background
 *
 * After sync completes, narrative generation continues in background.
 * The frontend polls for updates until narratives are ready (~10-30s).
 */

import { setDemoSyncStatus } from './demo-mode.service';
import { API_BASE_URL } from '../lib/api';

// ============================================================================
// Constants
// ============================================================================

/** Minimum time to show fetching spinner so user sees progress */
export const SYNC_PHASE_DELAY_FETCHING_MS = 800;

/** Time to show activity counts before moving to stories phase */
export const SYNC_PHASE_DELAY_ACTIVITIES_MS = 1200;

/** Time to show story titles before completing (demo mode) */
export const SYNC_PHASE_DELAY_STORIES_MS = 1500;

/** Brief delay for live sync story phase */
export const SYNC_PHASE_DELAY_STORIES_LIVE_MS = 500;

/** Interval for polling backend for narrative completion (increased to reduce API load) */
export const NARRATIVE_POLL_INTERVAL_MS = 10000; // 10 seconds (was 5s)

/** Maximum time to poll before giving up (narratives typically complete in 10-30s) */
export const NARRATIVE_POLL_TIMEOUT_MS = 60000; // 60 seconds (was 45s)

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

export type SyncPhase = 'fetching' | 'activities-synced' | 'generating-stories' | 'complete';

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
  /** True if narrative generation is happening in background */
  narrativesGeneratingInBackground?: boolean;
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
 * Run sync - calls backend with progressive updates.
 * Phase 1: Fetch activities → refresh Timeline/Source tabs immediately
 * Phase 2: Generate draft stories → update Drafts tab when complete
 */
export async function runDemoSync(callbacks: SyncCallbacks): Promise<void> {
  try {
    // Phase 1: Fetching
    callbacks.onStateUpdate({
      phase: 'fetching',
      integrations: [],
      entries: [],
      totalActivities: 0,
      totalEntries: 0,
    });

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

    // Ensure minimum time for fetching phase so user sees the spinner
    await new Promise(resolve => setTimeout(resolve, SYNC_PHASE_DELAY_FETCHING_MS));

    // Build integrations from result
    const integrations = buildIntegrations(result.activitiesBySource);

    // Phase 2: Activities synced - show what was imported
    callbacks.onStateUpdate({
      phase: 'activities-synced',
      integrations,
      entries: [],
      totalActivities: result.activityCount,
      totalEntries: 0,
    });

    // Let user see the activity counts for a moment
    await new Promise(resolve => setTimeout(resolve, SYNC_PHASE_DELAY_ACTIVITIES_MS));

    // Notify journal to refresh activities
    window.dispatchEvent(new CustomEvent('journal-data-changed'));

    // Phase 3: Show generating stories (entries are already created by backend)
    const entries: EntryPreview[] = (result.entryPreviews || []).map((e: EntryPreview) => ({
      ...e,
      status: 'generating' as const,
    }));

    callbacks.onStateUpdate({
      phase: 'generating-stories',
      integrations,
      entries,
      totalActivities: result.activityCount,
      totalEntries: result.entryCount,
    });

    // Let user see the story titles appearing
    await new Promise(resolve => setTimeout(resolve, SYNC_PHASE_DELAY_STORIES_MS));

    // Phase 4: Complete
    const completedEntries = entries.map(e => ({ ...e, status: 'done' as const }));
    callbacks.onStateUpdate({
      phase: 'complete',
      integrations,
      entries: completedEntries,
      totalActivities: result.activityCount,
      totalEntries: result.entryCount,
    });

    // Notify again for stories
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
      narrativesGeneratingInBackground: result.narrativesGeneratingInBackground ?? false,
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
 * Uses progressive updates to show results as they become available.
 */
export async function runLiveSync(callbacks: SyncCallbacks): Promise<void> {
  try {
    // Phase 1: Fetching
    callbacks.onStateUpdate({
      phase: 'fetching',
      integrations: [],
      entries: [],
      totalActivities: 0,
      totalEntries: 0,
    });

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

    // Build integrations from result
    const integrations = buildIntegrations(result.activitiesBySource || {});

    // Phase 2: Activities synced - refresh Timeline/Source tabs immediately
    callbacks.onStateUpdate({
      phase: 'activities-synced',
      integrations,
      entries: [],
      totalActivities: result.activityCount || 0,
      totalEntries: 0,
    });

    // Notify journal to refresh activities immediately
    window.dispatchEvent(new CustomEvent('journal-data-changed'));

    // Phase 3: Show generating stories
    const entries: EntryPreview[] = (result.entryPreviews || []).map((e: EntryPreview) => ({
      ...e,
      status: 'generating' as const,
    }));

    callbacks.onStateUpdate({
      phase: 'generating-stories',
      integrations,
      entries,
      totalActivities: result.activityCount || 0,
      totalEntries: result.entryCount || 0,
    });

    // Brief delay to show the generating state
    await new Promise(resolve => setTimeout(resolve, SYNC_PHASE_DELAY_STORIES_LIVE_MS));

    // Phase 4: Complete
    const completedEntries = entries.map(e => ({ ...e, status: 'done' as const }));
    callbacks.onStateUpdate({
      phase: 'complete',
      integrations,
      entries: completedEntries,
      totalActivities: result.activityCount || 0,
      totalEntries: result.entryCount || 0,
    });

    // Notify again for stories
    window.dispatchEvent(new CustomEvent('journal-data-changed'));

    callbacks.onComplete({
      activityCount: result.activityCount || 0,
      activitiesBySource: result.activitiesBySource || {},
      entryCount: result.entryCount || 0,
      temporalEntryCount: result.temporalEntryCount || 0,
      clusterEntryCount: result.clusterEntryCount || 0,
      narrativesGeneratingInBackground: result.narrativesGeneratingInBackground ?? false,
    });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Live sync failed'));
  }
}
