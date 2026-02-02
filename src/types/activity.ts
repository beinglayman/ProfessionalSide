// Types for raw tool activities displayed in journal tab views

/**
 * Supported activity sources with display metadata
 */
export const SUPPORTED_SOURCES = {
  // Dev tools
  github: { displayName: 'GitHub', color: '#24292e', icon: 'github' },
  // Atlassian
  jira: { displayName: 'Jira', color: '#0052CC', icon: 'jira' },
  confluence: { displayName: 'Confluence', color: '#172B4D', icon: 'confluence' },
  // Microsoft 365
  teams: { displayName: 'Microsoft Teams', color: '#6264a7', icon: 'teams' },
  outlook: { displayName: 'Outlook', color: '#0078d4', icon: 'outlook' },
  onedrive: { displayName: 'OneDrive', color: '#0078d4', icon: 'onedrive' },
  sharepoint: { displayName: 'SharePoint', color: '#036C70', icon: 'sharepoint' },
  // Communication
  slack: { displayName: 'Slack', color: '#4A154B', icon: 'slack' },
  // Design
  figma: { displayName: 'Figma', color: '#F24E1E', icon: 'figma' },
  // Google Workspace
  'google-calendar': { displayName: 'Google Calendar', color: '#4285F4', icon: 'google-calendar' },
  'google-docs': { displayName: 'Google Docs', color: '#4285F4', icon: 'google-docs' },
  'google-sheets': { displayName: 'Google Sheets', color: '#0F9D58', icon: 'google-sheets' },
  'google-drive': { displayName: 'Google Drive', color: '#4285F4', icon: 'google-drive' },
  'google-meet': { displayName: 'Google Meet', color: '#00897B', icon: 'google-meet' },
} as const;

export type ActivitySource = keyof typeof SUPPORTED_SOURCES;

/**
 * Temporal bucket identifiers
 */
export const TEMPORAL_BUCKETS = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'older'] as const;
export type TemporalBucket = typeof TEMPORAL_BUCKETS[number];

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

/**
 * Single raw activity from tool integration
 */
export interface Activity {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: string; // ISO 8601
  crossToolRefs: string[];
  rawData?: ActivityRawData | null;
  storyId: string | null;
  storyTitle: string | null;
}

/**
 * Grouping method for stories
 */
export type StoryGroupingMethod = 'time' | 'cluster' | 'manual' | 'ai';

export const STORY_GROUPING_METHODS = ['cluster', 'time'] as const;

export const STORY_GROUPING_LABELS: Record<StoryGroupingMethod, { label: string; description: string }> = {
  cluster: { label: 'Projects', description: 'Cross-tool collaborations' },
  time: { label: 'Time-based', description: 'Bi-weekly summaries' },
  manual: { label: 'Manual', description: 'Manually created' },
  ai: { label: 'AI', description: 'AI-generated' }
};

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
  groupingMethod?: StoryGroupingMethod;
}

/**
 * Group of activities (temporal, source, or story)
 */
export interface ActivityGroup {
  key: string;
  label: string;
  count: number;
  activities: Activity[];
  storyMetadata?: StoryMetadata;
}

/**
 * Grouped activities response
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
    groupBy: 'temporal' | 'source' | 'story';
    sourceMode: 'demo' | 'production';
    timezone?: string;
  };
}

/**
 * Flat activities response (no grouping)
 */
export interface FlatActivitiesResponse {
  data: Activity[];
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
 * Get activities query params
 */
export interface GetActivitiesParams {
  page?: number;
  limit?: number;
  groupBy?: 'temporal' | 'source' | 'story';
  source?: string;
  storyId?: string;
  timezone?: string;
}
