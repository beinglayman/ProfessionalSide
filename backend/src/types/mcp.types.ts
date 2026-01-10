import { z } from 'zod';

// ============================================================================
// MCP (Model Context Protocol) Types - Privacy-First Design
// ============================================================================

// Supported MCP tool types
export enum MCPToolType {
  GITHUB = 'github',
  JIRA = 'jira',
  FIGMA = 'figma',
  OUTLOOK = 'outlook',
  CONFLUENCE = 'confluence',
  SLACK = 'slack',
  TEAMS = 'teams',
  SHAREPOINT = 'sharepoint',
  ONEDRIVE = 'onedrive',
  ONENOTE = 'onenote',
  ZOOM = 'zoom',
  GOOGLE_WORKSPACE = 'google_workspace'
}

// MCP action types for audit logging
export enum MCPAction {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  FETCH_REQUESTED = 'fetch_requested',
  FETCH_COMPLETED = 'fetch_completed',
  DATA_CLEARED = 'data_cleared',
  CONSENT_GIVEN = 'consent_given',
  TOKEN_REFRESHED = 'token_refreshed'
}

// ============================================================================
// Session Types - Memory-Only, No Persistence
// ============================================================================

export interface MCPSession {
  sessionId: string;
  userId: string;
  toolType: MCPToolType;
  tempData: any; // Memory-only, cleared after use
  fetchedAt: Date;
  expiresAt: Date; // Auto-clear after 30 minutes
  consentGiven: boolean;
}

// ============================================================================
// OAuth Types
// ============================================================================

export interface MCPOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
}

export interface MCPOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

// ============================================================================
// Tool-Specific Data Types (Memory-Only)
// ============================================================================

// GitHub types
export interface GitHubActivity {
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    timestamp: Date;
    url: string;
  }>;
  pullRequests: Array<{
    id: number;
    title: string;
    state: string;
    author: string;
    createdAt: Date;
    url: string;
  }>;
  issues: Array<{
    id: number;
    title: string;
    state: string;
    assignee?: string;
    createdAt: Date;
    url: string;
  }>;
  repositories: Array<{
    name: string;
    language: string;
    lastActivity: Date;
  }>;
}

// Jira types
export interface JiraActivity {
  issues: Array<{
    key: string;
    summary: string;
    status: string;
    assignee?: string;
    updated: Date;
    timeSpent?: number;
    url: string;
  }>;
  projects: Array<{
    key: string;
    name: string;
    lead?: string;
  }>;
  sprints: Array<{
    id: number;
    name: string;
    state: string;
    startDate?: Date;
    endDate?: Date;
  }>;
}

// Figma types
export interface FigmaActivity {
  files: Array<{
    key: string;
    name: string;
    lastModified: Date;
    thumbnailUrl?: string;
    url: string;
  }>;
  components: Array<{
    key: string;
    name: string;
    description?: string;
  }>;
  comments: Array<{
    id: string;
    message: string;
    fileKey: string;
    createdAt: Date;
  }>;
}

// Outlook types
export interface OutlookActivity {
  meetings: Array<{
    id: string;
    subject: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    isOrganizer: boolean;
  }>;
  emails: Array<{
    id: string;
    subject: string;
    sender: string;
    receivedAt: Date;
    hasAttachments: boolean;
  }>;
}

// Confluence types
export interface ConfluenceActivity {
  pages: Array<{
    id: string;
    title: string;
    space: {
      key: string;
      name: string;
    };
    version: number;
    lastModified: string;
    lastModifiedBy: string;
    url: string;
    excerpt?: string;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    space: {
      key: string;
      name: string;
    };
    version: number;
    publishedDate: string;
    author: string;
    url: string;
    excerpt?: string;
  }>;
  comments: Array<{
    id: string;
    pageId: string;
    pageTitle: string;
    author: string;
    createdAt: string;
    content: string;
  }>;
  spaces: Array<{
    key: string;
    name: string;
    type: string;
    description?: string;
    url: string;
  }>;
}

// Slack types
export interface SlackActivity {
  messages: Array<{
    id: string;
    text: string;
    channel: string;
    channelId: string;
    timestamp: string;
    date: string;
    permalink?: string;
    reactions: number;
  }>;
  threads: Array<{
    id: string;
    channelId: string;
    channelName: string;
    originalMessage: string;
    replyCount: number;
    participants: number;
    lastReply: string;
    timestamp: string;
  }>;
  channels: Array<{
    id: string;
    name: string;
    isPrivate: boolean;
    isMember: boolean;
    topic?: string;
    purpose?: string;
    memberCount: number;
  }>;
}

// Microsoft Teams types
export interface TeamsActivity {
  teams: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  channels: Array<{
    id: string;
    name: string;
    description: string;
    teamId: string;
    teamName: string;
    membershipType: string;
  }>;
  chats: Array<{
    id: string;
    topic: string;
    type: string;
    createdAt: string;
    lastUpdated: string;
  }>;
  chatMessages: Array<{
    id: string;
    chatId: string;
    chatTopic: string;
    createdAt: string;
    from: string;
    content: string;
    importance: string;
  }>;
  channelMessages: Array<{
    id: string;
    channelId: string;
    channelName: string;
    teamName: string;
    createdAt: string;
    from: string;
    content: string;
    importance: string;
    replyCount: number;
  }>;
}

// SharePoint types
export interface SharePointActivity {
  sites: Array<{
    id: string;
    name: string;
    displayName: string;
    webUrl: string;
    description?: string;
    createdDateTime: string;
    lastModifiedDateTime: string;
  }>;
  recentFiles: Array<{
    id: string;
    name: string;
    webUrl: string;
    fileType: string;
    size: number;
    createdDateTime: string;
    lastModifiedDateTime: string;
    lastModifiedBy: string;
    siteName: string;
    siteId: string;
  }>;
  lists: Array<{
    id: string;
    name: string;
    displayName: string;
    description?: string;
    webUrl: string;
    listType: string;
    itemCount: number;
    siteName: string;
  }>;
}

// OneDrive types
export interface OneDriveActivity {
  recentFiles: Array<{
    id: string;
    name: string;
    webUrl: string;
    fileType: string;
    size: number;
    createdDateTime: string;
    lastModifiedDateTime: string;
    lastModifiedBy: string;
    parentPath: string;
  }>;
  sharedFiles: Array<{
    id: string;
    name: string;
    webUrl: string;
    fileType: string;
    sharedDateTime: string;
    sharedWith: string[];
    permissions: string;
  }>;
  folders: Array<{
    id: string;
    name: string;
    webUrl: string;
    itemCount: number;
    lastModifiedDateTime: string;
  }>;
}

// OneNote types
export interface OneNoteActivity {
  notebooks: Array<{
    id: string;
    displayName: string;
    webUrl: string;
    createdDateTime: string;
    lastModifiedDateTime: string;
    isDefault: boolean;
    sectionCount: number;
  }>;
  sections: Array<{
    id: string;
    displayName: string;
    webUrl: string;
    notebookName: string;
    createdDateTime: string;
    lastModifiedDateTime: string;
    pageCount: number;
  }>;
  pages: Array<{
    id: string;
    title: string;
    webUrl: string;
    createdDateTime: string;
    lastModifiedDateTime: string;
    sectionName: string;
    notebookName: string;
    contentPreview?: string;
  }>;
}

// Zoom types
export interface ZoomActivity {
  meetings: Array<{
    id: string;
    uuid: string;
    topic: string;
    type: number;
    startTime: string;
    duration: number;
    timezone?: string;
    hostId?: string;
    hostEmail?: string;
    participantsCount?: number;
    joinUrl?: string;
  }>;
  upcomingMeetings: Array<{
    id: string;
    uuid: string;
    topic: string;
    type: number;
    startTime: string;
    duration: number;
    timezone?: string;
    joinUrl?: string;
    agenda?: string;
  }>;
  recordings: Array<{
    id: string;
    meetingId: string;
    recordingStart: string;
    recordingEnd: string;
    duration: number;
    totalSize: number;
    recordingCount: number;
    shareUrl?: string;
    topic: string;
    recordingFiles: Array<{
      id: string;
      recordingType: string;
      fileType: string;
      fileSize: number;
      downloadUrl?: string;
      playUrl?: string;
    }>;
    transcript?: {
      id: string;
      meetingId: string;
      transcript: string;
      vttUrl?: string;
    };
  }>;
}

// Google Workspace types
export interface GoogleWorkspaceActivity {
  driveFiles: Array<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    iconLink?: string;
    thumbnailLink?: string;
    createdTime: string;
    modifiedTime: string;
    size?: string;
    starred: boolean;
    owners?: Array<{
      displayName: string;
      emailAddress: string;
    }>;
    lastModifyingUser?: {
      displayName: string;
      emailAddress: string;
    };
    shared: boolean;
  }>;
  docs: Array<{
    id: string;
    title: string;
    documentId: string;
    revisionId?: string;
    webViewLink: string;
    createdTime: string;
    modifiedTime: string;
    lastModifiedBy?: string;
  }>;
  sheets: Array<{
    id: string;
    title: string;
    spreadsheetId: string;
    webViewLink: string;
    sheetCount?: number;
    createdTime: string;
    modifiedTime: string;
    lastModifiedBy?: string;
  }>;
  slides: Array<{
    id: string;
    title: string;
    presentationId: string;
    webViewLink: string;
    slideCount?: number;
    createdTime: string;
    modifiedTime: string;
    lastModifiedBy?: string;
  }>;
  meetRecordings: Array<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    createdTime: string;
    duration?: string;
    size?: string;
  }>;
}

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// OAuth initiation
export const MCPOAuthInitiateSchema = z.object({
  toolType: z.nativeEnum(MCPToolType),
  redirectUri: z.string().url().optional()
});

// OAuth callback
export const MCPOAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string()
});

// Fetch data request
export const MCPFetchDataSchema = z.object({
  toolTypes: z.array(z.nativeEnum(MCPToolType)),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  consentGiven: z.boolean()
});

// Integration status response
export const MCPIntegrationStatusSchema = z.object({
  toolType: z.nativeEnum(MCPToolType),
  isConnected: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  scope: z.string().nullable()
});

// Privacy consent
export const MCPPrivacyConsentSchema = z.object({
  toolType: z.nativeEnum(MCPToolType),
  action: z.enum(['fetch', 'connect', 'disconnect']),
  consentGiven: z.boolean(),
  timestamp: z.string().datetime()
});

// ============================================================================
// Service Response Types
// ============================================================================

export interface MCPServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  sessionId?: string;
  expiresAt?: Date;
  currentUser?: {
    id?: string | number;
    login?: string;          // GitHub username
    displayName?: string;    // Display name
    email?: string;          // Email
    accountId?: string;      // Jira/Confluence account ID
    userPrincipalName?: string; // Microsoft UPN
    mail?: string;           // Microsoft mail
  };
}

export interface MCPFetchResponse {
  sessionId: string;
  toolType: MCPToolType;
  itemCount: number;
  data: any; // Tool-specific data, memory-only
  fetchedAt: Date;
  expiresAt: Date;
}

export interface MCPPrivacyStatus {
  dataRetention: 'none'; // Always 'none' - we don't store data
  sessionDuration: number; // Minutes
  consentRequired: boolean;
  encryptionEnabled: boolean;
  auditLoggingEnabled: boolean;
}

// ============================================================================
// Daily Summary Types
// ============================================================================

export interface MCPDailySummaryData {
  date: Date;
  userId: string;
  activities: {
    github?: GitHubActivity;
    jira?: JiraActivity;
    figma?: FigmaActivity;
    outlook?: OutlookActivity;
    confluence?: ConfluenceActivity;
    slack?: SlackActivity;
    teams?: TeamsActivity;
    sharepoint?: SharePointActivity;
    onedrive?: OneDriveActivity;
    onenote?: OneNoteActivity;
    zoom?: ZoomActivity;
    google_workspace?: GoogleWorkspaceActivity;
  };
  suggestedContent?: {
    title: string;
    description: string;
    fullContent: string;
    skills: string[];
    collaborators: string[];
  };
  status: 'draft' | 'reviewed' | 'posted';
}

// ============================================================================
// Type Guards
// ============================================================================

export function isMCPToolType(value: string): value is MCPToolType {
  return Object.values(MCPToolType).includes(value as MCPToolType);
}

export function isMCPAction(value: string): value is MCPAction {
  return Object.values(MCPAction).includes(value as MCPAction);
}