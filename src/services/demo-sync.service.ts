/**
 * Demo Sync Service
 *
 * Orchestrates the simulated sync process for demo mode.
 * Shows realistic progress while seeding demo data.
 */

import { SyncIntegration } from '../components/sync/SyncProgressModal';
import { setDemoSyncStatus } from './demo-mode.service';

// Simulated integrations for demo
const DEMO_INTEGRATIONS: Omit<SyncIntegration, 'status'>[] = [
  { id: 'github', name: 'GitHub', icon: 'github', itemCount: 18, itemLabel: 'commits & PRs' },
  { id: 'jira', name: 'Jira', icon: 'jira', itemCount: 14, itemLabel: 'tickets' },
  { id: 'confluence', name: 'Confluence', icon: 'confluence', itemCount: 6, itemLabel: 'docs' },
  { id: 'slack', name: 'Slack', icon: 'slack', itemCount: 8, itemLabel: 'threads' },
  { id: 'figma', name: 'Figma', icon: 'figma', itemCount: 3, itemLabel: 'designs' },
  { id: 'google', name: 'Google Workspace', icon: 'google', itemCount: 5, itemLabel: 'meetings' },
];

export interface DemoSyncCallbacks {
  onIntegrationUpdate: (integrations: SyncIntegration[]) => void;
  onComplete: (result: DemoSyncResult) => void;
  onError: (error: Error) => void;
}

export interface DemoSyncResult {
  activityCount: number;
  entryCount: number;
  clusterCount: number;
}

/**
 * Run the demo sync process with simulated progress.
 * Each integration "syncs" with realistic delays.
 */
export async function runDemoSync(callbacks: DemoSyncCallbacks): Promise<void> {
  console.log('[DemoSync] runDemoSync started');

  // Initialize integrations as pending
  const integrations: SyncIntegration[] = DEMO_INTEGRATIONS.map(i => ({
    ...i,
    status: 'pending' as const,
  }));

  callbacks.onIntegrationUpdate([...integrations]);

  try {
    // Process each integration with delays
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

    // Call backend to seed demo data
    const result = await seedDemoDataOnBackend();

    // Update sync status in localStorage
    setDemoSyncStatus({
      hasSynced: true,
      lastSyncAt: new Date().toISOString(),
      activityCount: result.activityCount,
      entryCount: result.entryCount,
      clusterCount: result.clusterCount,
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

    return {
      activityCount: data.data?.activityCount || data.activityCount || 45,
      entryCount: data.data?.entryCount || data.entryCount || 8,
      clusterCount: data.data?.clusterCount || data.clusterCount || 0,
    };
  } catch (error) {
    // If backend not available, return mock result for frontend-only testing
    console.error('[DemoSync] Backend sync failed:', error);
    console.warn('[DemoSync] Using mock result for frontend-only testing');
    return {
      activityCount: 45,
      entryCount: 8,
      clusterCount: 0,
    };
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
    clusterCount: 0,
  });
}

/**
 * Reset demo data (clear + reseed).
 */
export async function resetDemoData(callbacks: DemoSyncCallbacks): Promise<void> {
  await clearDemoData();
  await runDemoSync(callbacks);
}
