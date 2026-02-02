/**
 * Status Service
 *
 * Fetches activity/entry counts from APIs.
 * Respects current mode (demo vs live) via X-Demo-Mode header.
 */

import { isDemoMode } from './demo-mode.service';
import { API_BASE_URL } from '../lib/api';

export interface AppStatus {
  activityCount: number;
  entriesByGrouping: Record<string, number>;
  totalEntries: number;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('inchronicle_access_token');
}

/**
 * Build headers with optional demo mode flag
 */
function buildHeaders(token: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  if (isDemoMode()) {
    headers['X-Demo-Mode'] = 'true';
  }

  return headers;
}

/**
 * Fetch status by querying real APIs.
 * Automatically includes X-Demo-Mode header when in demo mode.
 */
export async function fetchStatus(): Promise<AppStatus> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = buildHeaders(token);

  // Fetch activity stats and journal entries in parallel
  const [activityStatsRes, journalEntriesRes] = await Promise.all([
    fetch(`${API_BASE_URL}/activity-stats?groupBy=source`, { headers }),
    fetch(`${API_BASE_URL}/journal/entries`, { headers }),
  ]);

  if (!activityStatsRes.ok) {
    throw new Error(`Failed to fetch activity stats: ${activityStatsRes.status}`);
  }
  if (!journalEntriesRes.ok) {
    throw new Error(`Failed to fetch journal entries: ${journalEntriesRes.status}`);
  }

  const [activityStats, journalData] = await Promise.all([
    activityStatsRes.json(),
    journalEntriesRes.json(),
  ]);

  // Activity stats returns { data: { data: [...], meta: { totalActivities, ... } } }
  const statsData = activityStats.data;
  const activityCount = statsData?.meta?.totalActivities || 0;

  // Journal entries returns { data: [...], pagination: {...} }
  const entries = journalData.data || [];
  const entriesByGrouping: Record<string, number> = {};
  for (const entry of entries) {
    const method = entry.groupingMethod || 'unknown';
    entriesByGrouping[method] = (entriesByGrouping[method] || 0) + 1;
  }

  // Use pagination.total for accurate count (handles pagination)
  const totalEntries = journalData.pagination?.total || entries.length;

  return {
    activityCount,
    entriesByGrouping,
    totalEntries,
  };
}

/**
 * Clear demo data by calling delete endpoint.
 * Only works when in demo mode.
 */
export async function clearDemoData(): Promise<{ deletedEntries: number; deletedActivities: number }> {
  if (!isDemoMode()) {
    throw new Error('clearDemoData can only be called in demo mode');
  }

  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = buildHeaders(token);

  const response = await fetch(`${API_BASE_URL}/journal/entries/bulk/all`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to clear demo data: ${response.status}`);
  }

  const data = await response.json();
  const result = data.data || { deletedEntries: 0, deletedActivities: 0 };

  // Notify listeners that data was cleared (for cache invalidation)
  window.dispatchEvent(new CustomEvent('journal-data-changed', { detail: result }));

  return result;
}
