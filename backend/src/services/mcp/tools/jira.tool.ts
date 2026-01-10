import axios, { AxiosInstance } from 'axios';
import { MCPToolType, JiraActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Jira MCP Tool - Fetches user activity from Jira
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class JiraTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private jiraApi: AxiosInstance | null = null;
  private cloudId: string | null = null;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();
  }

  /**
   * Initialize Jira API client with user's cloud instance
   */
  private async initializeJiraClient(accessToken: string): Promise<void> {
    // First, get the accessible resources (Jira sites)
    const resourcesResponse = await axios.get(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    if (resourcesResponse.data.length === 0) {
      throw new Error('No Jira sites accessible with this token');
    }

    // Use the first accessible site
    this.cloudId = resourcesResponse.data[0].id;
    const baseUrl = `https://api.atlassian.com/ex/jira/${this.cloudId}`;

    // Initialize Jira API client
    this.jiraApi = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });
  }

  /**
   * Fetch Jira activity for a user
   * @param userId User ID
   * @param dateRange Date range to fetch activity for
   * @returns Jira activity data (memory-only)
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<JiraActivity>> {
    try {
      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.JIRA);
      if (!accessToken) {
        return {
          success: false,
          error: 'Jira not connected. Please connect your Jira account first.'
        };
      }

      // Initialize Jira client
      await this.initializeJiraClient(accessToken);

      if (!this.jiraApi) {
        return {
          success: false,
          error: 'Failed to initialize Jira client'
        };
      }

      // Calculate date range (default: last 7 days for Jira due to larger datasets)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      console.log(`[Jira Tool] === Starting Jira fetch for user ${userId} ===`);
      console.log(`[Jira Tool] Cloud ID: ${this.cloudId}`);
      console.log(`[Jira Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch different types of activity in parallel
      const [currentUser, issues, projects, sprints] = await Promise.all([
        this.fetchCurrentUser(),
        this.fetchRecentIssues(startDate, endDate),
        this.fetchProjects(),
        this.fetchActiveSprints()
      ]);

      console.log(`[Jira Tool] Fetched ${issues.length} issues, ${projects.length} projects, ${sprints.length} sprints`);

      // Compile activity data
      const activity: JiraActivity = {
        issues,
        projects,
        sprints
      };

      // Calculate total items
      const itemCount = issues.length + projects.length + sprints.length;

      console.log(`[Jira Tool] === Summary ===`);
      console.log(`[Jira Tool] Issues: ${issues.length}`);
      console.log(`[Jira Tool] Projects: ${projects.length}`);
      console.log(`[Jira Tool] Sprints: ${sprints.length}`);
      console.log(`[Jira Tool] Total items: ${itemCount}`);

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.JIRA,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.JIRA,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Jira Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        currentUser: {
          accountId: currentUser?.accountId,
          displayName: currentUser?.displayName,
          email: currentUser?.emailAddress
        }
      };
    } catch (error: any) {
      console.error('[Jira Tool] Error fetching activity:', error);

      // Log failed fetch
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.JIRA,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch Jira activity'
      };
    }
  }

  /**
   * Fetch current user information
   */
  private async fetchCurrentUser(): Promise<any> {
    try {
      const response = await this.jiraApi!.get('/rest/api/3/myself');
      return response.data;
    } catch (error) {
      console.error('[Jira Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch recent issues (created or updated)
   */
  private async fetchRecentIssues(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // JQL query for issues updated in date range
      const jql = `updated >= "${startDate.toISOString().split('T')[0]}" AND updated <= "${endDate.toISOString().split('T')[0]}" ORDER BY updated DESC`;

      console.log(`[Jira Tool] Fetching issues with JQL: ${jql}`);

      // Updated to use /search/jql endpoint (old /search endpoint deprecated as of Oct 2024)
      // Migration guide: https://developer.atlassian.com/changelog/#CHANGE-2046
      const response = await this.jiraApi!.post('/rest/api/3/search/jql', {
        jql,
        maxResults: 50,
        fields: ['summary', 'status', 'assignee', 'reporter', 'priority', 'project', 'issuetype', 'created', 'updated', 'timespent', 'timeestimate', 'description', 'comment']
      });

      console.log(`[Jira Tool] Found ${response.data.issues?.length || 0} issues`);

      return response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        statusCategory: issue.fields.status?.statusCategory?.name,
        assignee: issue.fields.assignee?.displayName,
        reporter: issue.fields.reporter?.displayName,
        priority: issue.fields.priority?.name,
        issueType: issue.fields.issuetype?.name,
        project: {
          key: issue.fields.project?.key,
          name: issue.fields.project?.name
        },
        created: issue.fields.created,
        updated: issue.fields.updated,
        timeSpent: issue.fields.timespent,
        timeEstimate: issue.fields.timeestimate,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        commentCount: issue.fields.comment?.total || 0,
        url: `https://${this.cloudId}.atlassian.net/browse/${issue.key}`
      }));
    } catch (error: any) {
      console.error('[Jira Tool] Error fetching issues:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        endpoint: '/rest/api/3/search'
      });
      return [];
    }
  }

  /**
   * Fetch user's projects
   */
  private async fetchProjects(): Promise<any[]> {
    try {
      console.log(`[Jira Tool] Fetching projects...`);

      const response = await this.jiraApi!.get('/rest/api/3/project/search', {
        params: {
          maxResults: 20,
          orderBy: 'lastIssueUpdatedTime'
        }
      });

      console.log(`[Jira Tool] Found ${response.data.values?.length || 0} projects`);

      return response.data.values.map((project: any) => ({
        key: project.key,
        name: project.name,
        projectType: project.projectTypeKey,
        lead: project.lead?.displayName,
        url: `https://${this.cloudId}.atlassian.net/browse/${project.key}`
      }));
    } catch (error: any) {
      console.error('[Jira Tool] Error fetching projects:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        endpoint: '/rest/api/3/project/search'
      });
      return [];
    }
  }

  /**
   * Fetch active sprints
   */
  private async fetchActiveSprints(): Promise<any[]> {
    try {
      console.log(`[Jira Tool] Fetching boards...`);

      // First get boards
      const boardsResponse = await this.jiraApi!.get('/rest/agile/1.0/board', {
        params: {
          maxResults: 10,
          type: 'scrum'
        }
      });

      console.log(`[Jira Tool] Found ${boardsResponse.data.values?.length || 0} boards`);

      const sprints: any[] = [];

      // For each board, get active sprints
      for (const board of boardsResponse.data.values.slice(0, 5)) { // Limit to 5 boards
        try {
          console.log(`[Jira Tool] Fetching sprints for board: ${board.name} (${board.id})`);
          const sprintsResponse = await this.jiraApi!.get(`/rest/agile/1.0/board/${board.id}/sprint`, {
            params: {
              state: 'active,future',
              maxResults: 3
            }
          });

          console.log(`[Jira Tool] Found ${sprintsResponse.data.values?.length || 0} sprints in board ${board.name}`);

          for (const sprint of sprintsResponse.data.values) {
            sprints.push({
              id: sprint.id,
              name: sprint.name,
              state: sprint.state,
              boardName: board.name,
              startDate: sprint.startDate,
              endDate: sprint.endDate,
              goal: sprint.goal
            });
          }
        } catch (error: any) {
          console.error(`[Jira Tool] Error fetching sprints for board ${board.id}:`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            endpoint: `/rest/agile/1.0/board/${board.id}/sprint`
          });
          // Some boards might not have sprints
          continue;
        }
      }

      console.log(`[Jira Tool] Total sprints found: ${sprints.length}`);
      return sprints;
    } catch (error: any) {
      console.error('[Jira Tool] Error fetching sprints:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        endpoint: '/rest/agile/1.0/board'
      });
      return [];
    }
  }

  /**
   * Extract skills from Jira activity
   */
  public extractSkills(activity: JiraActivity): string[] {
    const skills = new Set<string>();

    // Extract from issue types
    activity.issues.forEach(issue => {
      if (issue.issueType) {
        // Map issue types to skills
        const issueTypeSkills: Record<string, string[]> = {
          'Bug': ['Debugging', 'Problem Solving', 'Testing'],
          'Story': ['Feature Development', 'User Stories', 'Agile'],
          'Task': ['Task Management', 'Execution'],
          'Epic': ['Project Planning', 'Strategic Planning'],
          'Sub-task': ['Detail-Oriented', 'Task Breakdown']
        };

        const mappedSkills = issueTypeSkills[issue.issueType] || [];
        mappedSkills.forEach(skill => skills.add(skill));
      }

      // Extract from status transitions
      if (issue.status === 'Done' || issue.status === 'Closed') {
        skills.add('Delivery');
        skills.add('Completion');
      }

      if (issue.status === 'In Review' || issue.status === 'Code Review') {
        skills.add('Code Review');
        skills.add('Quality Assurance');
      }
    });

    // Extract from sprints
    if (activity.sprints.length > 0) {
      skills.add('Sprint Planning');
      skills.add('Agile Development');
      skills.add('Scrum');
    }

    // Extract from projects
    activity.projects.forEach(project => {
      if (project.projectType === 'software') {
        skills.add('Software Development');
      } else if (project.projectType === 'business') {
        skills.add('Business Analysis');
      }
    });

    return Array.from(skills);
  }

  /**
   * Extract collaborators from Jira activity
   */
  public extractCollaborators(activity: JiraActivity): string[] {
    const collaborators = new Set<string>();

    activity.issues.forEach(issue => {
      if (issue.assignee) collaborators.add(issue.assignee);
      if (issue.reporter && issue.reporter !== issue.assignee) {
        collaborators.add(issue.reporter);
      }
    });

    activity.projects.forEach(project => {
      if (project.lead) collaborators.add(project.lead);
    });

    return Array.from(collaborators);
  }

  /**
   * Generate journal entry content from Jira activity
   */
  public generateJournalContent(activity: JiraActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const totalIssues = activity.issues.length;
    const completedIssues = activity.issues.filter(i =>
      i.status === 'Done' || i.status === 'Closed' || i.statusCategory === 'Done'
    ).length;
    const inProgressIssues = activity.issues.filter(i =>
      i.status === 'In Progress' || i.statusCategory === 'In Progress'
    ).length;

    // Generate title
    let title = 'Jira Activity Summary';
    if (completedIssues > 0) {
      title = `Completed ${completedIssues} issues`;
    } else if (inProgressIssues > 0) {
      title = `Working on ${inProgressIssues} issues`;
    } else if (totalIssues > 0) {
      title = `Updated ${totalIssues} issues`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (totalIssues > 0) {
      descriptionParts.push(
        `Worked on ${totalIssues} issues (${completedIssues} completed, ${inProgressIssues} in progress).`
      );
    }

    // Issue type breakdown
    const issueTypes = new Map<string, number>();
    activity.issues.forEach(issue => {
      const type = issue.issueType || 'Other';
      issueTypes.set(type, (issueTypes.get(type) || 0) + 1);
    });

    if (issueTypes.size > 0) {
      const typeBreakdown = Array.from(issueTypes.entries())
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
      descriptionParts.push(`Issue types: ${typeBreakdown}.`);
    }

    // Project involvement
    const projectNames = new Set(activity.issues.map(i => i.project?.name).filter(Boolean));
    if (projectNames.size > 0) {
      descriptionParts.push(`Projects involved: ${Array.from(projectNames).join(', ')}.`);
    }

    // Sprint information
    const activeSprints = activity.sprints.filter(s => s.state === 'active');
    if (activeSprints.length > 0) {
      descriptionParts.push(`Active in ${activeSprints.length} sprint(s): ${activeSprints.map(s => s.name).join(', ')}.`);
    }

    // Time tracking
    const totalTimeSpent = activity.issues.reduce((sum, issue) => sum + (issue.timeSpent || 0), 0);
    if (totalTimeSpent > 0) {
      const hours = Math.floor(totalTimeSpent / 3600);
      const minutes = Math.floor((totalTimeSpent % 3600) / 60);
      descriptionParts.push(`Total time logged: ${hours}h ${minutes}m.`);
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add significant issues as artifacts
    activity.issues.slice(0, 5).forEach(issue => {
      artifacts.push({
        type: 'link',
        title: `${issue.key}: ${issue.summary}`,
        url: issue.url,
        description: `${issue.issueType} - ${issue.status}`
      });
    });

    // Add active sprints as artifacts
    activeSprints.forEach(sprint => {
      artifacts.push({
        type: 'document',
        title: sprint.name,
        description: sprint.goal || `Sprint in ${sprint.boardName}`,
        metadata: {
          startDate: sprint.startDate,
          endDate: sprint.endDate
        }
      });
    });

    return {
      title,
      description: descriptionParts.join(' '),
      artifacts
    };
  }
}