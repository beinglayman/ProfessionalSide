// MCP Tool Types
export type MCPToolType =
  | 'github'
  | 'jira'
  | 'figma'
  | 'outlook'
  | 'confluence'
  | 'slack'
  | 'teams';

// Integration status for a single tool
export interface MCPIntegrationStatus {
  tool: MCPToolType;
  isConnected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  error?: string;
}

// Tool availability
export interface MCPTool {
  type: MCPToolType;
  name: string;
  available: boolean;
  requiredEnvVars: string[];
  missingEnvVars: string[];
}

// OAuth initiation response
export interface MCPOAuthResponse {
  authUrl: string;
  state: string;
}

// Data fetch response
export interface MCPFetchResponse {
  sessionId: string;
  toolType: MCPToolType;
  dataCount: number;
  fetchedAt: string;
  expiresAt: string;
}

// Daily summary data structure for journal entry generation
export interface MCPDailySummaryData {
  date: string;
  activities: {
    github?: GitHubActivity;
    jira?: JiraActivity;
    figma?: FigmaActivity;
    outlook?: OutlookActivity;
    confluence?: ConfluenceActivity;
    slack?: SlackActivity;
    teams?: TeamsActivity;
  };
  summary: string;
  highlights: string[];
  skills: string[];
  artifacts: {
    type: 'code' | 'design' | 'document' | 'task';
    name: string;
    url?: string;
  }[];
}

// Tool-specific activity types
export interface GitHubActivity {
  commits: number;
  pullRequests: {
    opened: number;
    merged: number;
    reviewed: number;
  };
  issues: {
    created: number;
    closed: number;
  };
  repositories: string[];
  highlights: string[];
}

export interface JiraActivity {
  tasksCompleted: number;
  storyPoints: number;
  epicsWorked: string[];
  sprints: string[];
  highlights: string[];
}

export interface FigmaActivity {
  filesEdited: number;
  componentsCreated: number;
  commentsAdded: number;
  projects: string[];
  highlights: string[];
}

export interface OutlookActivity {
  meetingsAttended: number;
  emailsSent: number;
  calendarEvents: string[];
  highlights: string[];
}

export interface ConfluenceActivity {
  pagesCreated: number;
  pagesUpdated: number;
  spaces: string[];
  highlights: string[];
}

export interface SlackActivity {
  messagesPosted: number;
  threadsParticipated: number;
  channels: string[];
  highlights: string[];
}

export interface TeamsActivity {
  meetingsAttended: number;
  messagesPosted: number;
  channelsActive: string[];
  highlights: string[];
}