import axios, { AxiosInstance } from 'axios';
import { MCPToolType, GitHubActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * GitHub MCP Tool - Fetches user activity from GitHub
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class GitHubTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private githubApi: AxiosInstance;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();

    // Initialize GitHub API client
    this.githubApi = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });
  }

  /**
   * Fetch GitHub activity for a user
   * @param userId User ID
   * @param dateRange Date range to fetch activity for
   * @returns GitHub activity data (memory-only)
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<GitHubActivity>> {
    try {
      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.GITHUB);
      if (!accessToken) {
        return {
          success: false,
          error: 'GitHub not connected. Please connect your GitHub account first.'
        };
      }

      // Set authorization header
      this.githubApi.defaults.headers.common['Authorization'] = `token ${accessToken}`;

      // Calculate date range (default: last 24 hours)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      // Fetch different types of activity in parallel
      const [userInfo, commits, pullRequests, issues, repos] = await Promise.all([
        this.fetchUserInfo(),
        this.fetchCommits(startDate, endDate),
        this.fetchPullRequests(startDate, endDate),
        this.fetchIssues(startDate, endDate),
        this.fetchRepositories(startDate, endDate)
      ]);

      // Compile activity data
      const activity: GitHubActivity = {
        commits,
        pullRequests,
        issues,
        repositories: repos
      };

      // Calculate total items
      const itemCount =
        commits.length +
        pullRequests.length +
        issues.length +
        repos.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.GITHUB,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.GITHUB,
        itemCount,
        sessionId,
        true
      );

      console.log(`[GitHub Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error: any) {
      console.error('[GitHub Tool] Error fetching activity:', error);

      // Log failed fetch
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.GITHUB,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch GitHub activity'
      };
    }
  }

  /**
   * Fetch user information
   * @returns User information
   */
  private async fetchUserInfo(): Promise<any> {
    try {
      const response = await this.githubApi.get('/user');
      return response.data;
    } catch (error) {
      console.error('[GitHub Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch commits within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of commits
   */
  private async fetchCommits(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Get user's recent events
      const eventsResponse = await this.githubApi.get('/user/events', {
        params: {
          per_page: 100
        }
      });

      // Filter push events within date range
      const pushEvents = eventsResponse.data.filter((event: any) => {
        if (event.type !== 'PushEvent') return false;
        const eventDate = new Date(event.created_at);
        return eventDate >= startDate && eventDate <= endDate;
      });

      // Extract commits from push events
      const commits: any[] = [];
      for (const event of pushEvents) {
        if (event.payload?.commits) {
          for (const commit of event.payload.commits) {
            commits.push({
              sha: commit.sha,
              message: commit.message,
              author: commit.author?.name || event.actor?.login,
              timestamp: new Date(event.created_at),
              url: `https://github.com/${event.repo.name}/commit/${commit.sha}`,
              repository: event.repo.name
            });
          }
        }
      }

      return commits;
    } catch (error) {
      console.error('[GitHub Tool] Error fetching commits:', error);
      return [];
    }
  }

  /**
   * Fetch pull requests within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of pull requests
   */
  private async fetchPullRequests(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Search for PRs created or updated by the user
      const searchResponse = await this.githubApi.get('/search/issues', {
        params: {
          q: `is:pr author:@me updated:${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}`,
          sort: 'updated',
          order: 'desc',
          per_page: 50
        }
      });

      return searchResponse.data.items.map((pr: any) => ({
        id: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        url: pr.html_url,
        repository: pr.repository_url.split('/').slice(-2).join('/'),
        labels: pr.labels.map((l: any) => l.name),
        isDraft: pr.draft || false,
        reviewStatus: pr.pull_request?.merged_at ? 'merged' : pr.state
      }));
    } catch (error) {
      console.error('[GitHub Tool] Error fetching pull requests:', error);
      return [];
    }
  }

  /**
   * Fetch issues within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of issues
   */
  private async fetchIssues(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Search for issues created or updated by/for the user
      const searchResponse = await this.githubApi.get('/search/issues', {
        params: {
          q: `is:issue involves:@me updated:${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}`,
          sort: 'updated',
          order: 'desc',
          per_page: 50
        }
      });

      return searchResponse.data.items.map((issue: any) => ({
        id: issue.number,
        title: issue.title,
        state: issue.state,
        assignee: issue.assignee?.login,
        author: issue.user.login,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        url: issue.html_url,
        repository: issue.repository_url.split('/').slice(-2).join('/'),
        labels: issue.labels.map((l: any) => l.name)
      }));
    } catch (error) {
      console.error('[GitHub Tool] Error fetching issues:', error);
      return [];
    }
  }

  /**
   * Fetch recently active repositories
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of repositories
   */
  private async fetchRepositories(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Get user's repositories
      const reposResponse = await this.githubApi.get('/user/repos', {
        params: {
          sort: 'pushed',
          direction: 'desc',
          per_page: 20
        }
      });

      // Filter repos with activity in date range
      return reposResponse.data
        .filter((repo: any) => {
          const pushedAt = new Date(repo.pushed_at);
          return pushedAt >= startDate && pushedAt <= endDate;
        })
        .map((repo: any) => ({
          name: repo.full_name,
          language: repo.language,
          lastActivity: new Date(repo.pushed_at),
          description: repo.description,
          url: repo.html_url,
          isPrivate: repo.private,
          stars: repo.stargazers_count,
          forks: repo.forks_count
        }));
    } catch (error) {
      console.error('[GitHub Tool] Error fetching repositories:', error);
      return [];
    }
  }

  /**
   * Extract skills from GitHub activity
   * @param activity GitHub activity data
   * @returns Array of detected skills
   */
  public extractSkills(activity: GitHubActivity): string[] {
    const skills = new Set<string>();

    // Extract languages from repositories
    activity.repositories.forEach(repo => {
      if (repo.language) {
        skills.add(repo.language);
      }
    });

    // Extract skills from commit messages and PR titles
    const skillKeywords = [
      'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'TypeScript',
      'JavaScript', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'CI/CD', 'Testing', 'API', 'Database', 'MongoDB', 'PostgreSQL',
      'Redis', 'GraphQL', 'REST', 'Microservices', 'DevOps'
    ];

    const searchText = [
      ...activity.commits.map(c => c.message),
      ...activity.pullRequests.map(pr => pr.title),
      ...activity.issues.map(i => i.title)
    ].join(' ').toLowerCase();

    skillKeywords.forEach(skill => {
      if (searchText.includes(skill.toLowerCase())) {
        skills.add(skill);
      }
    });

    return Array.from(skills);
  }

  /**
   * Extract collaborators from GitHub activity
   * @param activity GitHub activity data
   * @returns Array of collaborator names
   */
  public extractCollaborators(activity: GitHubActivity): string[] {
    const collaborators = new Set<string>();

    // Add PR reviewers and issue participants
    activity.pullRequests.forEach(pr => {
      if (pr.author) collaborators.add(pr.author);
    });

    activity.issues.forEach(issue => {
      if (issue.assignee) collaborators.add(issue.assignee);
      if (issue.author) collaborators.add(issue.author);
    });

    return Array.from(collaborators);
  }

  /**
   * Generate journal entry content from GitHub activity
   * @param activity GitHub activity data
   * @returns Suggested journal content
   */
  public generateJournalContent(activity: GitHubActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const totalItems =
      activity.commits.length +
      activity.pullRequests.length +
      activity.issues.length;

    // Generate title
    let title = 'GitHub Activity Summary';
    if (activity.commits.length > 0) {
      title = `Pushed ${activity.commits.length} commits`;
    } else if (activity.pullRequests.length > 0) {
      title = `Worked on ${activity.pullRequests.length} pull requests`;
    } else if (activity.issues.length > 0) {
      title = `Engaged with ${activity.issues.length} issues`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (activity.commits.length > 0) {
      descriptionParts.push(`Made ${activity.commits.length} commits across ${new Set(activity.commits.map(c => c.repository)).size} repositories.`);
    }

    if (activity.pullRequests.length > 0) {
      const merged = activity.pullRequests.filter(pr => pr.reviewStatus === 'merged').length;
      const open = activity.pullRequests.filter(pr => pr.state === 'open').length;
      descriptionParts.push(`Worked on ${activity.pullRequests.length} pull requests (${merged} merged, ${open} open).`);
    }

    if (activity.issues.length > 0) {
      const closed = activity.issues.filter(i => i.state === 'closed').length;
      descriptionParts.push(`Engaged with ${activity.issues.length} issues (${closed} resolved).`);
    }

    if (activity.repositories.length > 0) {
      const languages = new Set(activity.repositories.map(r => r.language).filter(Boolean));
      descriptionParts.push(`Active in ${activity.repositories.length} repositories using ${Array.from(languages).join(', ')}.`);
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add significant PRs as artifacts
    activity.pullRequests.slice(0, 3).forEach(pr => {
      artifacts.push({
        type: 'link',
        title: pr.title,
        url: pr.url,
        description: `Pull Request #${pr.id} - ${pr.state}`
      });
    });

    // Add significant commits as artifacts
    activity.commits.slice(0, 3).forEach(commit => {
      artifacts.push({
        type: 'code',
        title: commit.message.split('\n')[0],
        url: commit.url,
        description: `Commit ${commit.sha.substring(0, 7)}`
      });
    });

    return {
      title,
      description: descriptionParts.join(' '),
      artifacts
    };
  }
}