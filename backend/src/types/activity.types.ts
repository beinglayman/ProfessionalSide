import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported activity sources with display metadata
 */
export const SUPPORTED_SOURCES = {
  // Dev tools
  github: {
    displayName: 'GitHub',
    color: '#24292e',
    icon: 'github'
  },
  // Atlassian
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
  // Microsoft 365
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
  onedrive: {
    displayName: 'OneDrive',
    color: '#0078d4',
    icon: 'onedrive'
  },
  sharepoint: {
    displayName: 'SharePoint',
    color: '#036C70',
    icon: 'sharepoint'
  },
  // Communication
  slack: {
    displayName: 'Slack',
    color: '#4A154B',
    icon: 'slack'
  },
  // Design
  figma: {
    displayName: 'Figma',
    color: '#F24E1E',
    icon: 'figma'
  },
  // Google Workspace
  'google-calendar': {
    displayName: 'Google Calendar',
    color: '#4285F4',
    icon: 'google-calendar'
  },
  'google-docs': {
    displayName: 'Google Docs',
    color: '#4285F4',
    icon: 'google-docs'
  },
  'google-sheets': {
    displayName: 'Google Sheets',
    color: '#0F9D58',
    icon: 'google-sheets'
  },
  'google-drive': {
    displayName: 'Google Drive',
    color: '#4285F4',
    icon: 'google-drive'
  },
  'google-meet': {
    displayName: 'Google Meet',
    color: '#00897B',
    icon: 'google-meet'
  },
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
 * Schema for GET /activities query params
 * Fetches all activities with optional grouping for journal tab views
 */
export const getAllActivitiesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  groupBy: z.enum(['temporal', 'source', 'story']).optional(),
  source: z.string().optional(),
  storyId: z.string().optional(),
  timezone: z.string().default('UTC')
}).strict();

export type GetAllActivitiesInput = z.infer<typeof getAllActivitiesSchema>;

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
/**
 * Raw data structure varies by source - typed for UI display
 */
export interface ActivityRawData {
  // GitHub
  number?: number;
  state?: 'merged' | 'open' | 'closed';
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  reviews?: number;
  commits?: number;
  requestedReviewers?: string[];
  author?: string;

  // Jira
  key?: string;
  status?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  assignee?: string;
  reporter?: string;
  storyPoints?: number;
  labels?: string[];
  issueType?: string;

  // Confluence
  pageId?: string;
  spaceKey?: string;
  version?: number;
  createdBy?: string;
  lastModifiedBy?: string;

  // Slack
  channelId?: string;
  channelName?: string;
  reactions?: Array<{ name: string; count: number }>;
  isThreadReply?: boolean;

  // Outlook/Teams/Google Calendar
  meetingId?: string;
  eventId?: string;
  duration?: number;
  attendees?: string[] | number;
  organizer?: string;
  userRole?: 'organizer' | 'attendee' | 'watcher' | 'reviewer' | 'assignee';

  // Figma
  fileKey?: string;
  fileName?: string;
  commenters?: string[];

  // Google Workspace
  documentId?: string;
  spreadsheetId?: string;
  presentationId?: string;
  slideCount?: number;
  sheets?: string[];

  // Common
  mentions?: string[];
  watchers?: string[];
  comments?: Array<{ author: string; body: string }>;
}

export interface ActivityResponse {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: string; // ISO 8601
  crossToolRefs: string[];
  rawData?: ActivityRawData | null;
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

/**
 * Activity with story assignment (for grouped responses)
 */
export interface ActivityWithStory extends ActivityResponse {
  storyId: string | null;
  storyTitle: string | null;
}

/**
 * Phase within a story - logical grouping of activities
 */
export interface StoryPhase {
  name: string;
  activityIds: string[];
  summary: string;
}

/**
 * Story metadata for story-grouped responses
 */
export interface StoryMetadata {
  id: string;
  title: string;
  description: string | null;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  category: string | null;
  skills: string[];
  createdAt: string;
  isPublished: boolean;
  type: 'journal_entry' | 'career_story';
  groupingMethod?: 'time' | 'cluster' | 'manual' | 'ai';

  // Enhanced fields from LLM generation
  topics?: string[];
  impactHighlights?: string[];
  phases?: StoryPhase[];
  dominantRole?: 'Led' | 'Contributed' | 'Participated' | null;
  activityEdges?: Array<{
    activityId: string;
    type: 'primary' | 'supporting' | 'contextual' | 'outcome';
    message: string;
  }>;
}

/**
 * Activity group (base)
 */
export interface ActivityGroupBase {
  key: string;
  label: string;
  count: number;
  activities: ActivityWithStory[];
}

/**
 * Activity group with optional story metadata (for story grouping)
 */
export interface ActivityGroup extends ActivityGroupBase {
  storyMetadata?: StoryMetadata;
}

/**
 * Grouped activities response (for journal tab views)
 */
export interface GroupedActivitiesResponse {
  groups: ActivityGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    groupBy: 'temporal' | 'source' | 'story' | null;
    sourceMode: 'demo' | 'production';
    timezone?: string;
    /** Number of draft stories hidden because they were promoted to career stories */
    promotedCount?: number;
  };
}

/**
 * Flat activities response (when no grouping)
 */
export interface FlatActivitiesResponse {
  data: ActivityWithStory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    groupBy: null;
    sourceMode: 'demo' | 'production';
  };
}

/**
 * All activities response (union of grouped and flat)
 */
export type AllActivitiesResponse = GroupedActivitiesResponse | FlatActivitiesResponse;

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
