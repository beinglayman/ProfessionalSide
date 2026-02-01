/**
 * Demo Status Service
 *
 * Fetches demo data counts from real APIs with X-Demo-Mode header.
 * Read-only - no write operations. Writing happens via Journal page sync.
 */

const API_BASE = '/api/v1';

export interface DemoStatus {
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
 * Fetch demo status by querying real APIs with X-Demo-Mode header.
 */
export async function fetchDemoStatus(): Promise<DemoStatus> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Demo-Mode': 'true',
  };

  // Fetch activity stats and journal entries in parallel
  const [activityStatsRes, journalEntriesRes] = await Promise.all([
    fetch(`${API_BASE}/activity-stats?groupBy=source`, { headers }),
    fetch(`${API_BASE}/journal/entries`, { headers }),
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
 * Clear demo data by calling delete endpoint with X-Demo-Mode header.
 * Deletes both demo journal entries and demo activities.
 */
export async function clearDemoData(): Promise<{ deletedEntries: number; deletedActivities: number }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Demo-Mode': 'true',
  };

  const response = await fetch(`${API_BASE}/journal/entries/bulk/demo`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to clear demo data: ${response.status}`);
  }

  const data = await response.json();
  return data.data || { deletedEntries: 0, deletedActivities: 0 };
}
