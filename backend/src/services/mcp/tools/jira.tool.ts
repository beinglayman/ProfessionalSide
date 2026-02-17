import axios, { AxiosInstance } from 'axios';
import { MCPToolType, JiraActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
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
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private jiraApi: AxiosInstance | null = null;
  private cloudId: string | null = null;
  private siteUrl: string | null = null;  // Actual domain for browse URLs

  constructor() {
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
    this.siteUrl = resourcesResponse.data[0].url;  // e.g., "https://your-company.atlassian.net"
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
      const accessToken = await oauthService.getAccessToken(userId, MCPToolType.JIRA);
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

      // Stage 2: Fetch supplementary data (depends on issues/projects from Stage 1)
      const [changelogs, worklogs, versions] = await Promise.all([
        this.fetchChangelogs(issues),
        this.fetchWorklogs(issues, startDate, endDate),
        this.fetchVersions(projects)
      ]);

      console.log(`[Jira Tool] Fetched ${changelogs.length} changelogs, ${worklogs.length} worklogs, ${versions.length} versions`);

      // Compile activity data
      const activity: JiraActivity = {
        issues,
        projects,
        sprints,
        changelogs,
        worklogs,
        versions
      };

      // Calculate total items
      const itemCount = issues.length + projects.length + sprints.length +
        changelogs.length + worklogs.length + versions.length;

      console.log(`[Jira Tool] === Summary ===`);
      console.log(`[Jira Tool] Issues: ${issues.length}`);
      console.log(`[Jira Tool] Projects: ${projects.length}`);
      console.log(`[Jira Tool] Sprints: ${sprints.length}`);
      console.log(`[Jira Tool] Total items: ${itemCount}`);

      if (itemCount === 0) {
        console.warn(`[Jira Tool] ⚠ ZERO records fetched — possible causes: wrong cloud ID, insufficient scopes, or no activity in date range`);
        console.warn(`[Jira Tool] Cloud ID: ${this.cloudId}, Site: ${this.siteUrl}, Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      }

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

      // /rest/api/3/search/jql is a GET endpoint (POST /search deprecated Oct 2024, returns 410 Gone)
      // Migration guide: https://developer.atlassian.com/changelog/#CHANGE-2046
      const fields = 'summary,status,assignee,reporter,priority,project,issuetype,created,updated,timespent,timeestimate,description,comment,labels,issuelinks';
      const response = await this.jiraApi!.get('/rest/api/3/search/jql', {
        params: {
          jql,
          maxResults: 50,
          fields,
        }
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
        url: `${this.siteUrl}/browse/${issue.key}`,
        labels: issue.fields.labels || [],
        issueLinks: (issue.fields.issuelinks || []).map((link: any) => {
          const linkedIssue = link.outwardIssue || link.inwardIssue;
          return {
            type: link.outwardIssue ? link.type?.outward : link.type?.inward,
            linkedIssueKey: linkedIssue?.key || '',
            linkedIssueSummary: linkedIssue?.fields?.summary || '',
            linkedIssueStatus: linkedIssue?.fields?.status?.name || '',
          };
        }).filter((l: any) => l.linkedIssueKey),
      }));
    } catch (error: any) {
      console.error('[Jira Tool] Error fetching issues:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        endpoint: '/rest/api/3/search/jql'
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
        url: `${this.siteUrl}/browse/${project.key}`
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
   * Fetch issue changelogs (status transitions, assignee changes, priority changes)
   * Only extracts meaningful field changes — skips noisy changes like description edits.
   */
  private async fetchChangelogs(issues: any[]): Promise<any[]> {
    if (!issues.length) return [];

    const allChangelogs: any[] = [];
    const MEANINGFUL_FIELDS = ['status', 'assignee', 'priority', 'Sprint', 'Fix Version'];
    const issuesToQuery = issues.slice(0, 15);

    for (const issue of issuesToQuery) {
      try {
        const response = await this.jiraApi!.get(`/rest/api/3/issue/${issue.key}/changelog`, {
          params: { maxResults: 20 }
        });

        for (const history of (response.data.values || [])) {
          for (const item of (history.items || [])) {
            if (!MEANINGFUL_FIELDS.includes(item.field)) continue;

            allChangelogs.push({
              issueKey: issue.key,
              issueSummary: issue.summary,
              field: item.field,
              fromValue: item.fromString || item.from,
              toValue: item.toString || item.to,
              author: history.author?.displayName || '',
              timestamp: new Date(history.created),
            });
          }
        }
      } catch (error: any) {
        console.error(`[Jira Tool] Error fetching changelog for ${issue.key}:`, error.message);
      }
    }

    // Cap at 100 entries, most recent first
    allChangelogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const capped = allChangelogs.slice(0, 100);
    console.log(`[Jira Tool] Fetched ${capped.length} changelog entries`);
    return capped;
  }

  /**
   * Fetch detailed worklogs for issues with time tracking
   */
  private async fetchWorklogs(issues: any[], startDate: Date, endDate: Date): Promise<any[]> {
    if (!issues.length) return [];

    const allWorklogs: any[] = [];
    // Only fetch for issues that have time logged
    const issuesWithTime = issues.filter(i => i.timeSpent && i.timeSpent > 0);

    for (const issue of issuesWithTime.slice(0, 15)) {
      try {
        const response = await this.jiraApi!.get(`/rest/api/3/issue/${issue.key}/worklog`, {
          params: { maxResults: 20 }
        });

        for (const worklog of (response.data.worklogs || [])) {
          const started = new Date(worklog.started);
          // Filter to date range
          if (started < startDate || started > endDate) continue;

          // Extract comment text from ADF (Atlassian Document Format) if present
          let comment = '';
          if (worklog.comment?.content) {
            comment = worklog.comment.content
              .map((block: any) => block.content?.map((c: any) => c.text).join('') || '')
              .join(' ')
              .trim();
          }

          allWorklogs.push({
            issueKey: issue.key,
            issueSummary: issue.summary,
            author: worklog.author?.displayName || '',
            timeSpentSeconds: worklog.timeSpentSeconds || 0,
            comment,
            started,
            url: `${this.siteUrl}/browse/${issue.key}?focusedWorklogId=${worklog.id}`,
          });
        }
      } catch (error: any) {
        console.error(`[Jira Tool] Error fetching worklogs for ${issue.key}:`, error.message);
      }
    }

    const capped = allWorklogs.slice(0, 50);
    console.log(`[Jira Tool] Fetched ${capped.length} worklogs`);
    return capped;
  }

  /**
   * Fetch project versions (releases)
   */
  private async fetchVersions(projects: any[]): Promise<any[]> {
    if (!projects.length) return [];

    const allVersions: any[] = [];

    for (const project of projects.slice(0, 10)) {
      try {
        const response = await this.jiraApi!.get(`/rest/api/3/project/${project.key}/versions`, {
          params: { maxResults: 10, orderBy: '-releaseDate' }
        });

        for (const version of (response.data || [])) {
          allVersions.push({
            id: String(version.id),
            name: version.name,
            description: version.description || '',
            projectKey: project.key,
            released: version.released || false,
            releaseDate: version.releaseDate || '',
            url: `${this.siteUrl}/projects/${project.key}/versions/${version.id}`,
          });
        }
      } catch (error: any) {
        console.error(`[Jira Tool] Error fetching versions for ${project.key}:`, error.message);
      }
    }

    console.log(`[Jira Tool] Fetched ${allVersions.length} versions`);
    return allVersions;
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

    // Extract from labels — skill signals like "security", "performance", "api"
    const labelSkillMap: Record<string, string> = {
      'security': 'Security',
      'performance': 'Performance Optimization',
      'api': 'API Development',
      'frontend': 'Frontend Development',
      'backend': 'Backend Development',
      'infrastructure': 'Infrastructure',
      'devops': 'DevOps',
      'testing': 'Testing',
      'documentation': 'Documentation',
      'ux': 'UX Design',
      'data': 'Data Engineering',
      'mobile': 'Mobile Development',
    };

    activity.issues.forEach(issue => {
      issue.labels?.forEach(label => {
        const mapped = labelSkillMap[label.toLowerCase()];
        if (mapped) skills.add(mapped);
      });
    });

    // Signals from new data
    if (activity.versions?.some(v => v.released)) {
      skills.add('Release Management');
    }
    if (activity.worklogs?.length) {
      skills.add('Time Management');
    }

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

    // Add changelog authors (who transitioned issues)
    activity.changelogs?.forEach(entry => {
      if (entry.author) collaborators.add(entry.author);
    });

    // Add worklog authors (who logged time)
    activity.worklogs?.forEach(entry => {
      if (entry.author) collaborators.add(entry.author);
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

    // Time tracking (from worklogs if available, otherwise aggregate)
    if (activity.worklogs?.length) {
      const totalWorklogSeconds = activity.worklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);
      const hours = Math.floor(totalWorklogSeconds / 3600);
      const minutes = Math.floor((totalWorklogSeconds % 3600) / 60);
      const uniqueIssues = new Set(activity.worklogs.map(w => w.issueKey)).size;
      descriptionParts.push(`Logged ${hours}h ${minutes}m across ${uniqueIssues} tasks.`);
    } else {
      const totalTimeSpent = activity.issues.reduce((sum, issue) => sum + (issue.timeSpent || 0), 0);
      if (totalTimeSpent > 0) {
        const hours = Math.floor(totalTimeSpent / 3600);
        const minutes = Math.floor((totalTimeSpent % 3600) / 60);
        descriptionParts.push(`Total time logged: ${hours}h ${minutes}m.`);
      }
    }

    // Status transitions
    if (activity.changelogs?.length) {
      const doneTransitions = activity.changelogs.filter(c =>
        c.field === 'status' && (c.toValue === 'Done' || c.toValue === 'Closed')
      ).length;
      if (doneTransitions > 0) {
        descriptionParts.push(`Moved ${doneTransitions} issue(s) to Done.`);
      }
    }

    // Release context
    if (activity.versions?.length) {
      const released = activity.versions.filter(v => v.released);
      if (released.length > 0) {
        descriptionParts.push(`Contributing to release(s): ${released.map(v => v.name).join(', ')}.`);
      }
    }

    // Issue link context
    const allLinks = activity.issues.flatMap(i => i.issueLinks || []);
    if (allLinks.length > 0) {
      const blocking = allLinks.filter(l => l.type === 'blocks').length;
      const blockedBy = allLinks.filter(l => l.type === 'is blocked by').length;
      if (blocking > 0 || blockedBy > 0) {
        const parts = [];
        if (blocking > 0) parts.push(`blocking ${blocking}`);
        if (blockedBy > 0) parts.push(`blocked by ${blockedBy}`);
        descriptionParts.push(`Dependencies: ${parts.join(', ')}.`);
      }
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add released versions as artifacts (shipping signal)
    activity.versions?.filter(v => v.released).slice(0, 2).forEach(version => {
      artifacts.push({
        type: 'link',
        title: `Release: ${version.name}`,
        url: version.url,
        description: `${version.projectKey} release`
      });
    });

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