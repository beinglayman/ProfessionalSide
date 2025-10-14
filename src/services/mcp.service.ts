import { api } from '../lib/api';

/**
 * MCP Service - Frontend API client for MCP operations
 *
 * PRIVACY-FIRST:
 * - No data caching in localStorage
 * - Session-based temporary data only
 * - Clear privacy messaging at every step
 */

export enum MCPToolType {
  GITHUB = 'github',
  JIRA = 'jira',
  FIGMA = 'figma',
  OUTLOOK = 'outlook',
  CONFLUENCE = 'confluence',
  SLACK = 'slack',
  TEAMS = 'teams'
}

export interface MCPTool {
  toolType: MCPToolType;
  isAvailable: boolean;
  isConnected: boolean;
  privacyNotice: string;
}

export interface MCPIntegration {
  toolType: string;
  isActive: boolean;
  lastUsedAt: string | null;
  scope: string | null;
  createdAt: string;
  privacyNote: string;
}

export interface MCPFetchResult {
  toolType: MCPToolType;
  success: boolean;
  data?: any;
  sessionId?: string;
  expiresAt?: string;
  error?: string;
}

export interface MCPPrivacyStatus {
  dataRetention: 'none';
  sessionDuration: number;
  consentRequired: boolean;
  encryptionEnabled: boolean;
  auditLoggingEnabled: boolean;
}

export interface MCPAuditEntry {
  id: string;
  action: string;
  toolType: string;
  consentGiven: boolean;
  itemCount?: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

class MCPService {
  /**
   * Get available MCP tools and their connection status
   */
  async getAvailableTools(): Promise<{
    tools: MCPTool[];
    privacyStatus: MCPPrivacyStatus;
  }> {
    const response = await api.get('/mcp/tools');
    return response.data;
  }

  /**
   * Get user's integration status
   */
  async getIntegrationStatus(): Promise<{
    integrations: MCPIntegration[];
  }> {
    const response = await api.get('/mcp/integrations');
    return response.data.data; // Unwrap the data property from backend response
  }

  /**
   * Initiate OAuth flow for a tool
   */
  async initiateOAuth(toolType: MCPToolType): Promise<{
    authUrl: string;
    state: string;
    privacyNotice: string;
  }> {
    const response = await api.post('/mcp/oauth/initiate', { toolType });
    return response.data.data; // Backend wraps in { success: true, data: {...} }
  }

  /**
   * Initiate OAuth flow for a group of tools (connects multiple tools at once)
   */
  async initiateGroupOAuth(groupType: 'atlassian' | 'microsoft'): Promise<{
    authUrl: string;
    state: string;
    groupType: string;
    tools: MCPToolType[];
    privacyNotice: string;
  }> {
    const response = await api.post('/mcp/oauth/initiate-group', { groupType });
    return response.data.data; // Backend wraps in { success: true, data: {...} }
  }

  /**
   * Disconnect a tool integration
   */
  async disconnectIntegration(toolType: MCPToolType): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/mcp/integrations/${toolType}`);
    return response.data;
  }

  /**
   * Fetch data from connected tools (memory-only)
   */
  async fetchData(
    toolTypes: MCPToolType[],
    dateRange?: { start?: string; end?: string },
    consentGiven: boolean = false
  ): Promise<{
    success: boolean;
    results: MCPFetchResult[];
    privacyNotice: string;
  }> {
    const response = await api.post('/mcp/fetch', {
      toolTypes,
      dateRange,
      consentGiven
    });
    return response.data;
  }

  /**
   * Fetch and organize data from multiple tools using AI (unified results)
   */
  async fetchMultiSource(
    toolTypes: MCPToolType[],
    dateRange?: { start?: string; end?: string },
    consentGiven: boolean = false
  ): Promise<{
    sessionId: string;
    sources: MCPToolType[];
    organized: any; // Will be OrganizedActivity type
    expiresAt: string;
    privacyNotice: string;
    message: string;
  }> {
    const response = await api.post('/mcp/fetch-multi-source', {
      toolTypes,
      dateRange,
      consentGiven
    });
    return response.data.data; // Unwrap data property from backend response
  }

  /**
   * Get session data (temporary)
   */
  async getSession(sessionId: string): Promise<{
    session: {
      sessionId: string;
      toolType: MCPToolType;
      fetchedAt: string;
      expiresAt: string;
      data: any;
    };
    privacyNotice: string;
  }> {
    const response = await api.get(`/mcp/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Clear a session
   */
  async clearSession(sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/mcp/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Clear all user sessions
   */
  async clearAllSessions(): Promise<{
    success: boolean;
    message: string;
    clearedCount: number;
  }> {
    const response = await api.delete('/mcp/sessions');
    return response.data;
  }

  /**
   * Get privacy status
   */
  async getPrivacyStatus(): Promise<{
    status: MCPPrivacyStatus;
    message: string;
  }> {
    const response = await api.get('/mcp/privacy/status');
    return response.data;
  }

  /**
   * Get audit history
   */
  async getAuditHistory(
    limit: number = 50,
    toolType?: MCPToolType
  ): Promise<{
    history: MCPAuditEntry[];
    privacyNotice: string;
  }> {
    const params: any = { limit };
    if (toolType) params.toolType = toolType;

    const response = await api.get('/mcp/audit', { params });
    return response.data;
  }

  /**
   * Delete all MCP data (GDPR compliance)
   */
  async deleteAllMCPData(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete('/mcp/data');
    return response.data;
  }

  /**
   * Process GitHub activity for journal entry
   */
  processGitHubActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { commits = [], pullRequests = [], issues = [], repositories = [] } = data;

    // Generate summary
    const parts = [];
    if (commits.length > 0) {
      parts.push(`${commits.length} commits`);
    }
    if (pullRequests.length > 0) {
      const merged = pullRequests.filter((pr: any) => pr.reviewStatus === 'merged').length;
      parts.push(`${pullRequests.length} PRs (${merged} merged)`);
    }
    if (issues.length > 0) {
      parts.push(`${issues.length} issues`);
    }

    const summary = parts.length > 0
      ? `GitHub Activity: ${parts.join(', ')}`
      : 'No recent GitHub activity';

    // Extract highlights
    const highlights: string[] = [];

    // Add top commits
    commits.slice(0, 3).forEach((commit: any) => {
      highlights.push(`Commit: ${commit.message.split('\n')[0]}`);
    });

    // Add top PRs
    pullRequests.slice(0, 2).forEach((pr: any) => {
      highlights.push(`PR #${pr.id}: ${pr.title}`);
    });

    // Extract skills from repository languages
    const skills = new Set<string>();
    repositories.forEach((repo: any) => {
      if (repo.language) {
        skills.add(repo.language);
      }
    });

    // Create artifacts
    const artifacts: any[] = [];

    pullRequests.slice(0, 3).forEach((pr: any) => {
      artifacts.push({
        type: 'link',
        title: pr.title,
        url: pr.url,
        description: `Pull Request #${pr.id}`
      });
    });

    commits.slice(0, 2).forEach((commit: any) => {
      artifacts.push({
        type: 'code',
        title: commit.message.split('\n')[0],
        url: commit.url,
        description: `Commit in ${commit.repository}`
      });
    });

    return {
      summary,
      highlights,
      skills: Array.from(skills),
      artifacts
    };
  }

  /**
   * Process Jira activity for journal entry
   */
  processJiraActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { issues = [], projects = [], sprints = [] } = data;

    // Generate summary
    const completedIssues = issues.filter((i: any) =>
      i.status === 'Done' || i.statusCategory === 'Done'
    ).length;

    const summary = issues.length > 0
      ? `Jira: ${issues.length} issues (${completedIssues} completed)`
      : 'No recent Jira activity';

    // Extract highlights
    const highlights: string[] = [];
    issues.slice(0, 5).forEach((issue: any) => {
      highlights.push(`${issue.key}: ${issue.summary} (${issue.status})`);
    });

    // Extract skills
    const skills = new Set<string>();
    issues.forEach((issue: any) => {
      if (issue.issueType === 'Bug') skills.add('Debugging');
      if (issue.issueType === 'Story') skills.add('Feature Development');
      if (issue.status === 'Code Review') skills.add('Code Review');
    });
    if (sprints.length > 0) skills.add('Agile Development');

    // Create artifacts
    const artifacts: any[] = [];
    issues.slice(0, 3).forEach((issue: any) => {
      artifacts.push({
        type: 'link',
        title: `${issue.key}: ${issue.summary}`,
        url: issue.url,
        description: `${issue.issueType} - ${issue.status}`
      });
    });

    return {
      summary,
      highlights,
      skills: Array.from(skills),
      artifacts
    };
  }

  /**
   * Process Figma activity for journal entry
   */
  processFigmaActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { files = [], components = [], comments = [] } = data;

    // Generate summary
    const summary = files.length > 0
      ? `Figma: ${files.length} files, ${components.length} components`
      : 'No recent Figma activity';

    // Extract highlights
    const highlights: string[] = [];
    files.slice(0, 3).forEach((file: any) => {
      highlights.push(`Design: ${file.name}`);
    });
    if (components.length > 0) {
      highlights.push(`Created ${components.length} design components`);
    }

    // Extract skills
    const skills = ['UI Design', 'UX Design', 'Figma'];
    if (components.length > 0) skills.push('Design Systems');
    if (comments.length > 0) skills.push('Design Collaboration');

    // Create artifacts
    const artifacts: any[] = [];
    files.slice(0, 3).forEach((file: any) => {
      artifacts.push({
        type: 'design',
        title: file.name,
        url: file.url,
        description: `Design file`,
        thumbnailUrl: file.thumbnailUrl
      });
    });

    return {
      summary,
      highlights,
      skills,
      artifacts
    };
  }

  /**
   * Process Outlook activity for journal entry
   */
  processOutlookActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { meetings = [], emails = [] } = data;

    // Calculate total meeting time
    const totalMeetingHours = meetings.reduce((sum: number, meeting: any) => {
      const duration = (new Date(meeting.endTime).getTime() -
                       new Date(meeting.startTime).getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    // Generate summary
    const summary = meetings.length > 0 || emails.length > 0
      ? `Outlook: ${meetings.length} meetings (${totalMeetingHours.toFixed(1)}h), ${emails.length} emails`
      : 'No recent Outlook activity';

    // Extract highlights
    const highlights: string[] = [];
    meetings.slice(0, 3).forEach((meeting: any) => {
      highlights.push(`Meeting: ${meeting.subject}`);
    });

    const importantEmails = emails.filter((e: any) => e.importance === 'high');
    if (importantEmails.length > 0) {
      highlights.push(`${importantEmails.length} high-priority emails`);
    }

    // Extract skills
    const skills = ['Communication', 'Collaboration'];
    if (meetings.some((m: any) => m.isOrganizer)) {
      skills.push('Meeting Leadership');
    }

    // Create artifacts
    const artifacts: any[] = [];
    meetings.slice(0, 3).forEach((meeting: any) => {
      artifacts.push({
        type: 'meeting',
        title: meeting.subject,
        description: `${new Date(meeting.startTime).toLocaleString()} - ${meeting.attendees.length} attendees`
      });
    });

    return {
      summary,
      highlights,
      skills,
      artifacts
    };
  }

  /**
   * Process Confluence activity for journal entry
   */
  processConfluenceActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { pages = [], blogPosts = [], comments = [] } = data;

    // Generate summary
    const summary = pages.length > 0 || blogPosts.length > 0
      ? `Confluence: ${pages.length} pages, ${blogPosts.length} blog posts`
      : 'No recent Confluence activity';

    // Extract highlights
    const highlights: string[] = [];
    pages.slice(0, 3).forEach((page: any) => {
      highlights.push(`Page: ${page.title} in ${page.space.name}`);
    });
    blogPosts.slice(0, 2).forEach((post: any) => {
      highlights.push(`Blog: ${post.title}`);
    });

    // Extract skills
    const skills = ['Documentation', 'Technical Writing'];
    if (blogPosts.length > 0) skills.push('Knowledge Sharing');
    if (comments.length > 0) skills.push('Collaboration');

    // Create artifacts
    const artifacts: any[] = [];
    pages.slice(0, 3).forEach((page: any) => {
      artifacts.push({
        type: 'documentation',
        title: page.title,
        url: page.url,
        description: `Documentation in ${page.space.name}`
      });
    });
    blogPosts.slice(0, 2).forEach((post: any) => {
      artifacts.push({
        type: 'blog',
        title: post.title,
        url: post.url,
        description: `Blog post by ${post.author}`
      });
    });

    return {
      summary,
      highlights,
      skills,
      artifacts
    };
  }

  /**
   * Process Slack activity for journal entry
   */
  processSlackActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { messages = [], threads = [], channels = [] } = data;

    // Count active channels
    const activeChannels = new Set([
      ...messages.map((m: any) => m.channel),
      ...threads.map((t: any) => t.channelName)
    ]);

    // Generate summary
    const summary = messages.length > 0 || threads.length > 0
      ? `Slack: ${messages.length} messages in ${activeChannels.size} channels, ${threads.length} threads`
      : 'No recent Slack activity';

    // Extract highlights
    const highlights: string[] = [];
    if (activeChannels.size > 0) {
      highlights.push(`Active in: ${Array.from(activeChannels).slice(0, 3).join(', ')}`);
    }
    threads.slice(0, 2).forEach((thread: any) => {
      highlights.push(`Thread in #${thread.channelName} (${thread.replyCount} replies)`);
    });

    // Extract skills
    const skills = ['Team Communication', 'Collaboration'];
    if (threads.length > 0) skills.push('Discussion Leadership');

    // Create artifacts
    const artifacts: any[] = [];
    messages.slice(0, 2).forEach((message: any) => {
      artifacts.push({
        type: 'message',
        title: `Message in #${message.channel}`,
        description: message.text.substring(0, 100),
        url: message.permalink
      });
    });
    threads.slice(0, 2).forEach((thread: any) => {
      artifacts.push({
        type: 'thread',
        title: `Thread in #${thread.channelName}`,
        description: `${thread.replyCount} replies with ${thread.participants} participants`
      });
    });

    return {
      summary,
      highlights,
      skills,
      artifacts
    };
  }

  /**
   * Process Teams activity for journal entry
   */
  processTeamsActivity(data: any): {
    summary: string;
    highlights: string[];
    skills: string[];
    artifacts: any[];
  } {
    if (!data) return { summary: '', highlights: [], skills: [], artifacts: [] };

    const { teams = [], channels = [], chatMessages = [], channelMessages = [] } = data;

    // Generate summary
    const totalMessages = chatMessages.length + channelMessages.length;
    const summary = teams.length > 0 || totalMessages > 0
      ? `Teams: ${teams.length} teams, ${totalMessages} messages`
      : 'No recent Teams activity';

    // Extract highlights
    const highlights: string[] = [];
    teams.slice(0, 3).forEach((team: any) => {
      highlights.push(`Team: ${team.name}`);
    });
    if (channelMessages.length > 0) {
      const channelsWithActivity = new Set(channelMessages.map((m: any) => m.channelName));
      highlights.push(`Active in ${channelsWithActivity.size} channels`);
    }
    if (chatMessages.length > 0) {
      const chatsWithActivity = new Set(chatMessages.map((m: any) => m.chatTopic));
      highlights.push(`${chatMessages.length} messages in ${chatsWithActivity.size} chats`);
    }

    // Extract skills
    const skills = ['Team Collaboration', 'Microsoft Teams'];
    if (channelMessages.some((m: any) => m.replyCount > 0)) {
      skills.push('Discussion Leadership');
    }
    if (chatMessages.length > 0) {
      skills.push('Direct Communication');
    }

    // Create artifacts
    const artifacts: any[] = [];

    // Add significant channel messages
    channelMessages
      .filter((msg: any) => msg.importance === 'high' || msg.replyCount > 2)
      .slice(0, 2)
      .forEach((msg: any) => {
        artifacts.push({
          type: 'message',
          title: `Message in ${msg.channelName}`,
          description: msg.content.substring(0, 150),
          metadata: {
            team: msg.teamName,
            replies: msg.replyCount
          }
        });
      });

    // Add teams as artifacts
    teams.slice(0, 2).forEach((team: any) => {
      const teamChannels = channels.filter((c: any) => c.teamId === team.id);
      artifacts.push({
        type: 'team',
        title: team.name,
        description: team.description || `Team with ${teamChannels.length} channels`
      });
    });

    return {
      summary,
      highlights,
      skills,
      artifacts
    };
  }

  /**
   * Process all tool data into journal content
   */
  processAllToolData(results: MCPFetchResult[]): {
    title: string;
    content: string;
    skills: string[];
    artifacts: any[];
  } {
    const summaries: string[] = [];
    const allHighlights: string[] = [];
    const allSkills = new Set<string>();
    const allArtifacts: any[] = [];

    results.forEach(result => {
      if (!result.success || !result.data) return;

      let processed;
      switch (result.toolType) {
        case MCPToolType.GITHUB:
          processed = this.processGitHubActivity(result.data);
          break;
        case MCPToolType.JIRA:
          processed = this.processJiraActivity(result.data);
          break;
        case MCPToolType.FIGMA:
          processed = this.processFigmaActivity(result.data);
          break;
        case MCPToolType.OUTLOOK:
          processed = this.processOutlookActivity(result.data);
          break;
        case MCPToolType.CONFLUENCE:
          processed = this.processConfluenceActivity(result.data);
          break;
        case MCPToolType.SLACK:
          processed = this.processSlackActivity(result.data);
          break;
        case MCPToolType.TEAMS:
          processed = this.processTeamsActivity(result.data);
          break;
        default:
          return;
      }

      if (processed.summary) summaries.push(processed.summary);
      allHighlights.push(...processed.highlights);
      processed.skills.forEach(skill => allSkills.add(skill));
      allArtifacts.push(...processed.artifacts);
    });

    // Generate title
    const title = summaries.length > 0
      ? 'Weekly Activity Summary'
      : 'No recent activity';

    // Generate content
    const content = [
      '## Activity Overview',
      summaries.join('\n\n'),
      '',
      '## Key Highlights',
      allHighlights.map(h => `- ${h}`).join('\n'),
      '',
      '## Skills Demonstrated',
      Array.from(allSkills).map(s => `- ${s}`).join('\n')
    ].join('\n');

    return {
      title,
      content,
      skills: Array.from(allSkills),
      artifacts: allArtifacts.slice(0, 10) // Limit to 10 artifacts
    };
  }

  /**
   * Format tool display name
   */
  getToolDisplayName(toolType: MCPToolType): string {
    const names: Record<MCPToolType, string> = {
      [MCPToolType.GITHUB]: 'GitHub',
      [MCPToolType.JIRA]: 'Jira',
      [MCPToolType.FIGMA]: 'Figma',
      [MCPToolType.OUTLOOK]: 'Outlook',
      [MCPToolType.CONFLUENCE]: 'Confluence',
      [MCPToolType.SLACK]: 'Slack',
      [MCPToolType.TEAMS]: 'Microsoft Teams'
    };
    return names[toolType] || toolType;
  }

  /**
   * Get tool icon name for UI
   */
  getToolIcon(toolType: MCPToolType): string {
    const icons: Record<MCPToolType, string> = {
      [MCPToolType.GITHUB]: 'Github',
      [MCPToolType.JIRA]: 'Database',
      [MCPToolType.FIGMA]: 'Figma',
      [MCPToolType.OUTLOOK]: 'Mail',
      [MCPToolType.CONFLUENCE]: 'FileText',
      [MCPToolType.SLACK]: 'MessageSquare',
      [MCPToolType.TEAMS]: 'Users'
    };
    return icons[toolType] || 'Tool';
  }

  /**
   * Get tool privacy message
   */
  getToolPrivacyMessage(toolType: MCPToolType): string {
    return `InChronicle will only access your ${this.getToolDisplayName(toolType)} data when you explicitly request it. No data from ${this.getToolDisplayName(toolType)} is saved without your approval. Only the final journal entry you create will be stored.`;
  }
}

export const mcpService = new MCPService();