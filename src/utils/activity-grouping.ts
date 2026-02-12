/**
 * Activity Grouping Utilities
 *
 * Groups flat Activity[] by source tool (GitHub, Jira, etc.) for the
 * "By Source" view in the Activities filter bar.
 */

import type { Activity, ActivitySource } from '../types/activity';
import { SUPPORTED_SOURCES } from '../types/activity';
import { getSourceIcon } from '../components/journal/source-icons';
import type { GroupedSection } from '../types/list-filters';

/**
 * Group flat activities by source tool.
 *
 * - Groups are sorted by count descending.
 * - Items within each group are sorted newest-first.
 * - Uses SUPPORTED_SOURCES for display names and source icons.
 */
export function groupActivitiesBySource(activities: Activity[]): GroupedSection<Activity>[] {
  if (activities.length === 0) return [];

  // Bucket by source
  const buckets = new Map<string, Activity[]>();
  for (const a of activities) {
    if (!buckets.has(a.source)) buckets.set(a.source, []);
    buckets.get(a.source)!.push(a);
  }

  // Sort within each bucket: newest first
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Build groups sorted by count descending
  const groups: GroupedSection<Activity>[] = Array.from(buckets.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([source, items]) => {
      const info = SUPPORTED_SOURCES[source as ActivitySource];
      return {
        key: source,
        label: info?.displayName || source,
        count: items.length,
        items,
        Icon: getSourceIcon(source),
        iconColor: info?.color,
      };
    });

  return groups;
}
