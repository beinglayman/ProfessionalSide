/**
 * Demo Sync Service
 *
 * Orchestrates the simulated sync process for demo mode.
 * Shows realistic progress while seeding demo data.
 */

import { SyncIntegration } from '../components/sync/SyncProgressModal';
import { setDemoSyncStatus } from './demo-mode.service';

/**
 * Integration metadata (without counts - those come from backend)
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
];

export interface DemoSyncCallbacks {
  onIntegrationUpdate: (integrations: SyncIntegration[]) => void;
  onComplete: (result: DemoSyncResult) => void;
  onError: (error: Error) => void;
}

export interface DemoSyncResult {
  activityCount: number;
  activitiesBySource: Record<string, number>;
  entryCount: number;
  temporalEntryCount: number;
  clusterEntryCount: number;
}

/**
 * Build integrations list with real counts from backend.
 */
function buildIntegrations(activitiesBySource: Record<string, number>): SyncIntegration[] {
  return INTEGRATION_META.map(meta => ({
    ...meta,
    itemCount: activitiesBySource[meta.id] ?? 0,
    status: 'pending' as const,
  })).filter(i => i.itemCount > 0); // Only show integrations with data
}

/**
 * Run the demo sync process with simulated progress.
 * Fetches real data first, then animates with actual counts.
 */
export async function runDemoSync(callbacks: DemoSyncCallbacks): Promise<void> {
  console.log('[DemoSync] runDemoSync started');

  try {
    // First, call backend to seed demo data and get real counts
    const result = await seedDemoDataOnBackend();

    // Build integrations with real counts
    const integrations = buildIntegrations(result.activitiesBySource);

    // If no integrations have data, skip animation
    if (integrations.length === 0) {
      console.log('[DemoSync] No activities seeded, skipping animation');
      setDemoSyncStatus({
        hasSynced: true,
        lastSyncAt: new Date().toISOString(),
        activityCount: result.activityCount,
        entryCount: result.entryCount,
        temporalEntryCount: result.temporalEntryCount,
        clusterEntryCount: result.clusterEntryCount,
      });
      callbacks.onComplete(result);
      return;
    }

    // Show all as pending initially
    callbacks.onIntegrationUpdate([...integrations]);

    // Animate through each integration with delays
    for (let i = 0; i < integrations.length; i++) {
      // Set current to syncing
      integrations[i].status = 'syncing';
      callbacks.onIntegrationUpdate([...integrations]);

      // Simulate API delay (300-800ms per integration)
      await delay(300 + Math.random() * 500);

      // Mark as done
      integrations[i].status = 'done';
      callbacks.onIntegrationUpdate([...integrations]);

      // Small gap between integrations
      if (i < integrations.length - 1) {
        await delay(150);
      }
    }

    // Update sync status in localStorage
    setDemoSyncStatus({
      hasSynced: true,
      lastSyncAt: new Date().toISOString(),
      activityCount: result.activityCount,
      entryCount: result.entryCount,
      temporalEntryCount: result.temporalEntryCount,
      clusterEntryCount: result.clusterEntryCount,
    });

    callbacks.onComplete(result);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Demo sync failed'));
  }
}

/**
 * Call backend to seed demo tables.
 */
async function seedDemoDataOnBackend(): Promise<DemoSyncResult> {
  try {
    console.log('[DemoSync] Calling POST /api/v1/demo/sync...');
    const token = localStorage.getItem('inchronicle_access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch('/api/v1/demo/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[DemoSync] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DemoSync] Backend error:', response.status, errorText);
      throw new Error(`Demo sync failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[DemoSync] Backend response:', data);

    // Backend returns explicit counts for temporal and cluster entries
    const responseData = data.data || data;

    return {
      activityCount: responseData.activityCount ?? 0,
      activitiesBySource: responseData.activitiesBySource ?? {},
      entryCount: responseData.entryCount ?? 0,
      temporalEntryCount: responseData.temporalEntryCount ?? 0,
      clusterEntryCount: responseData.clusterEntryCount ?? 0,
    };
  } catch (error) {
    // If backend not available, throw error - don't fake data
    console.error('[DemoSync] Backend sync failed:', error);
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clear all demo data.
 */
export async function clearDemoData(): Promise<void> {
  try {
    await fetch('/api/v1/demo/clear', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Backend demo clear not available');
  }

  // Clear local sync status
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
export async function resetDemoData(callbacks: DemoSyncCallbacks): Promise<void> {
  await clearDemoData();
  await runDemoSync(callbacks);
}
