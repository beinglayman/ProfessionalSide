// MCP Tool Types
export type MCPToolType =
  | 'github'
  | 'jira'
  | 'figma'
  | 'outlook'
  | 'confluence'
  | 'slack'
  | 'teams';

// Integration Group Types
export type MCPIntegrationGroupType = 'atlassian' | 'microsoft';

export interface MCPIntegrationGroup {
  id: MCPIntegrationGroupType;
  name: string;
  description: string;
  tools: MCPToolType[];
  providerName: string; // "Atlassian" or "Microsoft"
}

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

// Multi-source organized activity types (AI-powered)
export interface CrossToolCorrelation {
  id: string;
  type: 'pr_to_jira' | 'meeting_to_code' | 'design_to_code' | 'discussion_to_doc' | 'general';
  source1: {
    tool: MCPToolType;
    id: string;
    title: string;
    url?: string;
  };
  source2: {
    tool: MCPToolType;
    id: string;
    title: string;
    url?: string;
  };
  confidence: number; // 0-1
  reasoning: string;
}

export interface OrganizedActivityItem {
  id: string;
  source: MCPToolType;
  type: string; // 'pr', 'issue', 'commit', 'meeting', 'file', etc.
  title: string;
  description: string;
  url: string;
  importance: 'high' | 'medium' | 'low';
  selected: boolean;
  metadata?: any;
}

export interface OrganizedActivityCategory {
  type: 'achievement' | 'learning' | 'collaboration' | 'documentation' | 'problem_solving';
  label: string;
  summary: string;
  suggestedEntryType: 'achievement' | 'learning' | 'reflection' | 'challenge';
  items: OrganizedActivityItem[];
}

export interface OrganizedActivityArtifact {
  type: string;
  source: MCPToolType;
  title: string;
  url: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface OrganizedActivity {
  // AI-suggested entry metadata
  suggestedEntryType: 'achievement' | 'learning' | 'reflection' | 'challenge';
  suggestedTitle: string;
  contextSummary: string;
  extractedSkills: string[];

  // Cross-tool correlations detected by AI
  correlations: CrossToolCorrelation[];

  // Unified categories across all sources
  categories: OrganizedActivityCategory[];

  // Top artifacts from each source for journal entry
  artifacts: OrganizedActivityArtifact[];
}

export interface MultiSourceFetchResponse {
  sessionId: string;
  sources: MCPToolType[];
  organized: OrganizedActivity;
  expiresAt: string;
  privacyNotice: string;
  message: string;
}