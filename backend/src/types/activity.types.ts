import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported activity sources with display metadata
 */
export const SUPPORTED_SOURCES = {
  github: {
    displayName: 'GitHub',
    color: '#24292e',
    icon: 'github'
  },
  jira: {
    displayName: 'Jira',
    color: '#0052CC',
    icon: 'jira'
  },
  confluence: {
    displayName: 'Confluence',
    color: '#172B4D',
    icon: 'confluence'
  },
  teams: {
    displayName: 'Microsoft Teams',
    color: '#6264a7',
    icon: 'teams'
  },
  outlook: {
    displayName: 'Outlook',
    color: '#0078d4',
    icon: 'outlook'
  },
  slack: {
    displayName: 'Slack',
    color: '#4A154B',
    icon: 'slack'
  },
  figma: {
    displayName: 'Figma',
    color: '#F24E1E',
    icon: 'figma'
  },
  'google-calendar': {
    displayName: 'Google Calendar',
    color: '#4285F4',
    icon: 'google-calendar'
  }
} as const;

export type ActivitySource = keyof typeof SUPPORTED_SOURCES;

/**
 * Temporal bucket identifiers (mutually exclusive)
 */
export const TEMPORAL_BUCKETS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'older'
] as const;

export type TemporalBucket = typeof TEMPORAL_BUCKETS[number];

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for GET /journal-entries/:id/activities query params
 */
export const getJournalEntryActivitiesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  source: z.string().optional()
}).strict();

export type GetJournalEntryActivitiesInput = z.infer<typeof getJournalEntryActivitiesSchema>;

/**
 * Schema for GET /activity-stats query params
 */
export const getActivityStatsSchema = z.object({
  groupBy: z.enum(['source', 'temporal']),
  timezone: z.string().default('UTC')
}).strict();

export type GetActivityStatsInput = z.infer<typeof getActivityStatsSchema>;

/**
 * Path param validation
 */
export const journalEntryIdSchema = z.string().min(1, 'Journal entry ID is required');

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Single activity response
 */
export interface ActivityResponse {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: string; // ISO 8601
  crossToolRefs: string[];
}

/**
 * Paginated activities response
 */
export interface JournalEntryActivitiesResponse {
  data: ActivityResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    journalEntryId: string;
    sourceMode: 'demo' | 'production';
  };
}

/**
 * Source group in stats response
 */
export interface SourceGroupResponse {
  source: string;
  displayName: string;
  color: string;
  icon: string;
  activityCount: number;
  journalEntryCount: number;
}

/**
 * Stats response for groupBy=source
 */
export interface SourceStatsResponse {
  data: SourceGroupResponse[];
  meta: {
    groupBy: 'source';
    totalActivities: number;
    totalJournalEntries: number;
    sourceCount: number;
    maxSources: number;
  };
}

/**
 * Temporal bucket in stats response
 */
export interface TemporalGroupResponse {
  bucket: TemporalBucket;
  displayName: string;
  dateRange: {
    start: string | null; // ISO 8601
    end: string | null;   // ISO 8601
  };
  activityCount: number;
  journalEntryCount: number;
}

/**
 * Stats response for groupBy=temporal
 */
export interface TemporalStatsResponse {
  data: TemporalGroupResponse[];
  meta: {
    groupBy: 'temporal';
    timezone: string;
    totalActivities: number;
    totalJournalEntries: number;
  };
}

/**
 * Union type for stats response
 */
export type ActivityStatsResponse = SourceStatsResponse | TemporalStatsResponse;

// ============================================================================
// ACTIVITY METADATA (for enriching journal entries)
// ============================================================================

/**
 * Activity metadata attached to journal entries
 */
export interface ActivityMeta {
  totalCount: number;
  sources: Array<{
    source: string;
    count: number;
  }>;
  dateRange: {
    earliest: string | null; // ISO 8601
    latest: string | null;   // ISO 8601
  };
}

// ============================================================================
// INTERNAL TYPES (for service layer)
// ============================================================================

/**
 * Temporal bucket boundaries (used internally)
 */
export interface TemporalBucketRange {
  displayName: string;
  start: Date | null;
  end: Date | null;
}

export type TemporalBuckets = Record<TemporalBucket, TemporalBucketRange>;
