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
  // Legacy: generic 'google' source (for existing data, maps to Google Workspace styling)
  google: { displayName: 'Google', color: '#4285F4', icon: 'google' },
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
  // GitHub PR/Issue
  number?: number;
  state?: 'merged' | 'open' | 'closed';
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  reviews?: number;
  commits?: number;
  requestedReviewers?: string[];
  author?: string;
  labels?: string[];
  isDraft?: boolean;
  isReviewed?: boolean;
  reviewers?: string[];
  body?: string;
  headRef?: string;
  baseRef?: string;
  commentsCount?: number;
  // GitHub Commit
  sha?: string;
  repository?: string;
  message?: string;

  // Jira (labels shared with GitHub above)
  key?: string;
  status?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  assignee?: string;
  reporter?: string;
  storyPoints?: number;
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
 * Dominant role in work - detected from activity patterns
 */
export type StoryDominantRole = 'Led' | 'Contributed' | 'Participated';

/**
 * Valid edge types for activity-story relationships
 */
export const ACTIVITY_EDGE_TYPES = ['primary', 'supporting', 'contextual', 'outcome'] as const;

/**
 * Edge type for activity-story relationship.
 * Classifies how an activity contributes to a story narrative.
 */
export type ActivityStoryEdgeType = typeof ACTIVITY_EDGE_TYPES[number];

/**
 * Edge relationship between an activity and a story.
 * Each edge has a type and an LLM-generated explanation.
 */
export interface ActivityStoryEdge {
  /** ID of the activity this edge connects to */
  activityId: string;
  /** Classification of the activity's role in the story */
  type: ActivityStoryEdgeType;
  /** 5-15 word explanation of why this activity matters to the story */
  message: string;
}

/**
 * Display metadata for edge types
 */
export const ACTIVITY_EDGE_LABELS: Record<ActivityStoryEdgeType, { label: string; color: string; bgColor: string }> = {
  primary: { label: 'Primary', color: '#7C3AED', bgColor: '#EDE9FE' },      // Purple
  supporting: { label: 'Supporting', color: '#1D4ED8', bgColor: '#DBEAFE' }, // Blue
  contextual: { label: 'Context', color: '#4B5563', bgColor: '#F3F4F6' },    // Gray
  outcome: { label: 'Outcome', color: '#059669', bgColor: '#D1FAE5' },       // Green
};

/**
 * Role labels and colors for display
 */
export const STORY_ROLE_LABELS: Record<StoryDominantRole, { label: string; color: string; bgColor: string }> = {
  Led: { label: 'Led', color: '#B45309', bgColor: '#FEF3C7' }, // Amber
  Contributed: { label: 'Contributed', color: '#1D4ED8', bgColor: '#DBEAFE' }, // Blue
  Participated: { label: 'Participated', color: '#4B5563', bgColor: '#F3F4F6' }, // Gray
};

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
  groupingMethod?: StoryGroupingMethod;

  // Enhanced fields from LLM generation
  topics?: string[];
  impactHighlights?: string[];
  phases?: StoryPhase[];
  dominantRole?: StoryDominantRole | null;

  // Activity relationship edges with type and explanation
  activityEdges?: ActivityStoryEdge[];
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
