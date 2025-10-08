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
  TEAMS = 'teams'
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