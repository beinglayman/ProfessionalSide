/**
 * Library Grouping Utilities
 *
 * Group StoryDerivation items by type (category view) or by time period
 * (timeline view) for the Library tab. Reuses getTimePeriod() from
 * story-timeline.ts for consistent time bucketing.
 */

import type { StoryDerivation, DerivationType, PacketType } from '../types/career-stories';
import { getTimePeriod } from './story-timeline';
import { DERIVATION_TYPE_META, PACKET_TYPE_META } from '../components/career-stories/constants';
import type React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LibraryTypeGroup {
  /** Composite key: `${kind}:${type}`, e.g. 'single:interview', 'packet:promotion' */
  typeKey: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  color: string;
  items: StoryDerivation[];
}

export interface LibraryTimeGroup {
  /** e.g. "This Week", "Last Week", "Q1 2026" */
  label: string;
  /** Numeric sort key for reverse-chrono ordering */
  sortKey: number;
  items: StoryDerivation[];
  /** Derivation types present in this group (for type chips) */
  types: Set<string>;
}

// ---------------------------------------------------------------------------
// Fixed display order
// ---------------------------------------------------------------------------

const SINGLE_TYPE_ORDER: DerivationType[] = [
  'interview', 'linkedin', 'resume', 'one-on-one', 'self-assessment', 'team-share',
];

const PACKET_TYPE_ORDER: PacketType[] = [
  'promotion', 'annual-review', 'skip-level', 'portfolio-brief', 'self-assessment', 'one-on-one',
];

// ---------------------------------------------------------------------------
// groupLibraryByType
// ---------------------------------------------------------------------------

/**
 * Group library items by `${kind}:${type}`. Singles first, then packets,
 * each in fixed display order. Only non-empty groups are returned.
 * Within each group, items are sorted newest-first.
 */
export function groupLibraryByType(items: StoryDerivation[]): LibraryTypeGroup[] {
  // Bucket items by composite key
  const buckets = new Map<string, StoryDerivation[]>();
  for (const item of items) {
    const key = `${item.kind}:${item.type}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  // Sort within each bucket: newest first
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Build ordered result: singles first, then packets
  const groups: LibraryTypeGroup[] = [];

  for (const type of SINGLE_TYPE_ORDER) {
    const key = `single:${type}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.length === 0) continue;
    const meta = DERIVATION_TYPE_META[type];
    groups.push({
      typeKey: key,
      label: meta?.label ?? type,
      Icon: meta?.Icon,
      color: meta?.color ?? 'gray',
      items: bucket,
    });
  }

  for (const type of PACKET_TYPE_ORDER) {
    const key = `packet:${type}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.length === 0) continue;
    const meta = PACKET_TYPE_META[type];
    groups.push({
      typeKey: key,
      label: meta?.label ?? type,
      Icon: meta?.Icon,
      color: meta?.color ?? 'gray',
      items: bucket,
    });
  }

  // Catch any unknown types not in the fixed order
  for (const [key, bucket] of buckets) {
    if (groups.some(g => g.typeKey === key)) continue;
    const [kind, type] = key.split(':');
    const meta = kind === 'single'
      ? DERIVATION_TYPE_META[type as DerivationType]
      : PACKET_TYPE_META[type as PacketType];
    groups.push({
      typeKey: key,
      label: meta?.label ?? type,
      Icon: meta?.Icon,
      color: meta?.color ?? 'gray',
      items: bucket,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// groupLibraryByTimePeriod
// ---------------------------------------------------------------------------

/**
 * Group library items by time period (This Week / Last Week / quarter).
 * Returns groups sorted reverse-chronologically. Within each group, items
 * are sorted newest-first. Collects type set per group for type chips.
 */
export function groupLibraryByTimePeriod(items: StoryDerivation[]): LibraryTimeGroup[] {
  const map = new Map<string, LibraryTimeGroup>();

  for (const item of items) {
    const { label, sortKey } = getTimePeriod(new Date(item.createdAt));

    if (!map.has(label)) {
      map.set(label, { label, sortKey, items: [], types: new Set() });
    }
    const group = map.get(label)!;
    group.items.push(item);
    group.types.add(`${item.kind}:${item.type}`);
  }

  const groups = Array.from(map.values());
  // Reverse-chrono
  groups.sort((a, b) => b.sortKey - a.sortKey);
  // Newest-first within each group
  for (const g of groups) {
    g.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return groups;
}
