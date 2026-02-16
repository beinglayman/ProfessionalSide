import axios, { AxiosInstance } from 'axios';
import { MCPToolType, GitHubActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
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
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private githubApi: AxiosInstance;

  constructor() {
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
      const accessToken = await oauthService.getAccessToken(userId, MCPToolType.GITHUB);
      if (!accessToken) {
        return {
          success: false,
          error: 'GitHub not connected. Please connect your GitHub account first.'
        };
      }

      // Set authorization header
      this.githubApi.defaults.headers.common['Authorization'] = `token ${accessToken}`;

      // Calculate date range (default: last 24 hours)
      // Add buffer to end date to account for timezone differences
      // This ensures we capture activities from "today" regardless of server timezone
      const now = new Date();
      const endDate = dateRange?.end || new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day buffer
      const startDate = dateRange?.start || new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Stage 1: Fetch user info, repos, PRs, and issues in parallel
      // (commits depend on repos + userInfo, so they run in stage 2)
      const [userInfo, repos, pullRequests, issues] = await Promise.all([
        this.fetchUserInfo(),
        this.fetchRepositories(startDate, endDate),
        this.fetchPullRequests(startDate, endDate),
        this.fetchIssues(startDate, endDate)
      ]);

      // Stage 2: Fetch commits using repo list and authenticated user login
      const commits = await this.fetchCommits(startDate, endDate, repos, userInfo?.login);

      // Stage 3: Fetch supplementary data in parallel (non-blocking)
      const [releases, workflowRuns, deployments, reviewComments, starredRepos] = await Promise.all([
        this.fetchReleases(startDate, endDate, repos),
        this.fetchWorkflowRuns(startDate, endDate, repos),
        this.fetchDeployments(startDate, endDate, repos),
        this.fetchReviewComments(pullRequests),
        this.fetchStarredRepos()
      ]);

      // Compile activity data
      const activity: GitHubActivity = {
        commits,
        pullRequests,
        issues,
        repositories: repos,
        releases,
        workflowRuns,
        deployments,
        reviewComments,
        starredRepos
      };

      // Calculate total items
      const itemCount =
        commits.length +
        pullRequests.length +
        issues.length +
        repos.length +
        releases.length +
        workflowRuns.length +
        deployments.length +
        reviewComments.length +
        starredRepos.length;

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
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        currentUser: {
          id: userInfo?.id,
          login: userInfo?.login,
          displayName: userInfo?.name,
          email: userInfo?.email
        }
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
   * Fetch commits within date range using per-repo listing.
   * Uses /repos/{owner}/{repo}/commits with server-side since/until filtering
   * instead of /user/events which has a 100-event cap across all event types.
   * @param startDate Start date
   * @param endDate End date
   * @param activeRepos Repos with recent push activity (from fetchRepositories)
   * @param login Authenticated user's GitHub login (for author filtering)
   * @returns Array of commits
   */
  private async fetchCommits(
    startDate: Date,
    endDate: Date,
    activeRepos: any[],
    login?: string
  ): Promise<any[]> {
    if (!activeRepos.length || !login) {
      return [];
    }

    // Cap at 10 most-recently-pushed repos to avoid rate limit issues
    const reposToQuery = activeRepos.slice(0, 10);
    const allCommits: any[] = [];
    let detailFetchCount = 0;
    const MAX_DETAIL_FETCHES = 50;

    // Fetch commits from each repo in parallel
    const repoResults = await Promise.all(
      reposToQuery.map(async (repo) => {
        const [owner, repoName] = repo.name.split('/');
        try {
          const commitsResponse = await this.githubApi.get(`/repos/${owner}/${repoName}/commits`, {
            params: {
              since: startDate.toISOString(),
              until: endDate.toISOString(),
              author: login,
              per_page: 50
            }
          });

          return { owner, repoName, fullName: repo.name, commits: commitsResponse.data };
        } catch (error: any) {
          console.error(`[GitHub Tool] Error fetching commits for ${repo.name}:`, error.message);
          return { owner, repoName, fullName: repo.name, commits: [] };
        }
      })
    );

    // Collect commits and fetch details (capped at MAX_DETAIL_FETCHES total)
    for (const result of repoResults) {
      for (const commit of result.commits) {
        // Fetch commit details for stats (additions/deletions/files)
        let stats = null;
        if (detailFetchCount < MAX_DETAIL_FETCHES) {
          try {
            const commitDetails = await this.githubApi.get(
              `/repos/${result.owner}/${result.repoName}/commits/${commit.sha}`
            );
            stats = {
              additions: commitDetails.data.stats?.additions || 0,
              deletions: commitDetails.data.stats?.deletions || 0,
              total: commitDetails.data.stats?.total || 0,
              filesChanged: commitDetails.data.files?.length || 0
            };
            detailFetchCount++;
          } catch (error) {
            console.error(`[GitHub Tool] Error fetching commit details for ${commit.sha}:`, error);
          }
        }

        allCommits.push({
          sha: commit.sha,
          message: commit.commit?.message || '',
          author: commit.commit?.author?.name || commit.author?.login || login,
          timestamp: new Date(commit.commit?.author?.date || commit.commit?.committer?.date),
          url: commit.html_url || `https://github.com/${result.fullName}/commit/${commit.sha}`,
          repository: result.fullName,
          stats
        });
      }
    }

    const reposQueried = repoResults.filter(r => r.commits.length > 0).length;
    console.log(`[GitHub Tool] Fetched ${allCommits.length} commits from ${reposQueried} repos`);

    return allCommits;
  }

  /**
   * Fetch pull requests within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of pull requests
   */
  /**
   * Fetch detailed PR information including stats
   * @param owner Repository owner
   * @param repo Repository name
   * @param prNumber PR number
   * @returns PR details with stats or null
   */
  private async fetchPRDetails(owner: string, repo: string, prNumber: number): Promise<any> {
    try {
      // Fetch PR details and actual reviews in parallel
      const [prResponse, reviewsResponse] = await Promise.all([
        this.githubApi.get(`/repos/${owner}/${repo}/pulls/${prNumber}`),
        this.githubApi.get(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`).catch(() => ({ data: [] }))
      ]);

      // Get unique reviewers who actually submitted reviews (not pending)
      const actualReviewers = [...new Set(
        (reviewsResponse.data || [])
          .filter((r: any) => r.state !== 'PENDING' && r.user?.login)
          .map((r: any) => r.user.login)
      )];

      // Also include requested reviewers who haven't reviewed yet
      const requestedReviewers = prResponse.data.requested_reviewers?.map((r: any) => r.login) || [];

      // Combine both (actual reviewers take precedence)
      const allReviewers = [...new Set([...actualReviewers, ...requestedReviewers])];

      console.log(`[GitHub Tool] PR #${prNumber}: ${actualReviewers.length} actual reviewers, ${requestedReviewers.length} requested`);

      return {
        additions: prResponse.data.additions || 0,
        deletions: prResponse.data.deletions || 0,
        changed_files: prResponse.data.changed_files || 0,
        commits: prResponse.data.commits || 0,
        reviewers: allReviewers,
        // CRITICAL: Include body for cross-tool reference extraction (e.g., "Closes AUTH-123")
        body: prResponse.data.body || '',
        // Include head/base refs for context
        headRef: prResponse.data.head?.ref,
        baseRef: prResponse.data.base?.ref,
      };
    } catch (error) {
      console.error(`[GitHub Tool] Error fetching PR details for ${owner}/${repo}#${prNumber}:`, error);
      return null;
    }
  }

  private async fetchPullRequests(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // GitHub search uses UTC dates only (no time component)
      // endDate already has +1 day buffer to capture "today" in any timezone
      const dateRangeStr = `updated:${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}`;

      // Fetch both authored PRs and reviewed PRs in parallel
      const [authoredPRs, reviewedPRs] = await Promise.all([
        // Search for PRs created by the user
        this.githubApi.get('/search/issues', {
          params: {
            q: `is:pr author:@me ${dateRangeStr}`,
            sort: 'updated',
            order: 'desc',
            per_page: 50
          }
        }),
        // Search for PRs reviewed by the user
        this.githubApi.get('/search/issues', {
          params: {
            q: `is:pr reviewed-by:@me ${dateRangeStr}`,
            sort: 'updated',
            order: 'desc',
            per_page: 50
          }
        })
      ]);

      // Combine and deduplicate PRs
      const allPRs = [...authoredPRs.data.items, ...reviewedPRs.data.items];
      const uniquePRs = Array.from(
        new Map(allPRs.map(pr => [pr.id, pr])).values()
      );

      // Fetch detailed stats for each PR (limit to first 20 to avoid rate limits)
      const prsWithDetails = await Promise.all(
        uniquePRs.slice(0, 20).map(async (pr: any) => {
          const repoPath = pr.repository_url.split('/').slice(-2);
          const [owner, repo] = repoPath;
          const details = await this.fetchPRDetails(owner, repo, pr.number);

          return {
            id: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.user.login,
            createdAt: new Date(pr.created_at),
            updatedAt: new Date(pr.updated_at),
            url: pr.html_url,
            repository: repoPath.join('/'),
            labels: pr.labels.map((l: any) => l.name),
            isDraft: pr.draft || false,
            reviewStatus: pr.pull_request?.merged_at ? 'merged' : pr.state,
            commentsCount: pr.comments || 0,
            isReviewed: !authoredPRs.data.items.some((authored: any) => authored.id === pr.id),
            // Enhanced metadata for Format7
            additions: details?.additions || 0,
            deletions: details?.deletions || 0,
            filesChanged: details?.changed_files || 0,
            commits: details?.commits || 0,
            reviewers: details?.reviewers || [],
            // CRITICAL: Include body for cross-tool reference extraction
            // This is where "Closes AUTH-123", "Fixes PERF-456", etc. live
            body: details?.body || pr.body || '',
            headRef: details?.headRef,
            baseRef: details?.baseRef,
          };
        })
      );

      return prsWithDetails;
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
      // GitHub search uses UTC dates only - endDate has +1 day buffer for timezone coverage
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
        labels: issue.labels.map((l: any) => l.name),
        commentsCount: issue.comments || 0, // Number of comments on the issue
        // CRITICAL: Include body for cross-tool reference extraction
        // Issue descriptions may contain "Related to AUTH-123", "See PERF-456", etc.
        body: issue.body || '',
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
   * Fetch releases from active repos within date range
   */
  private async fetchReleases(startDate: Date, endDate: Date, repos: any[]): Promise<any[]> {
    if (!repos.length) return [];

    const allReleases: any[] = [];
    const reposToQuery = repos.slice(0, 10);

    await Promise.all(
      reposToQuery.map(async (repo) => {
        const [owner, repoName] = repo.name.split('/');
        try {
          const response = await this.githubApi.get(`/repos/${owner}/${repoName}/releases`, {
            params: { per_page: 5 }
          });

          for (const release of response.data) {
            const publishedAt = new Date(release.published_at || release.created_at);
            if (publishedAt >= startDate && publishedAt <= endDate) {
              allReleases.push({
                id: release.id,
                tagName: release.tag_name,
                name: release.name || release.tag_name,
                body: release.body || '',
                author: release.author?.login || '',
                publishedAt,
                url: release.html_url,
                repository: repo.name,
                isDraft: release.draft || false,
                isPrerelease: release.prerelease || false,
              });
            }
          }
        } catch (error: any) {
          console.error(`[GitHub Tool] Error fetching releases for ${repo.name}:`, error.message);
        }
      })
    );

    console.log(`[GitHub Tool] Fetched ${allReleases.length} releases`);
    return allReleases;
  }

  /**
   * Fetch GitHub Actions workflow runs from active repos within date range
   */
  private async fetchWorkflowRuns(startDate: Date, endDate: Date, repos: any[]): Promise<any[]> {
    if (!repos.length) return [];

    const allRuns: any[] = [];
    const reposToQuery = repos.slice(0, 10);

    await Promise.all(
      reposToQuery.map(async (repo) => {
        const [owner, repoName] = repo.name.split('/');
        try {
          const response = await this.githubApi.get(`/repos/${owner}/${repoName}/actions/runs`, {
            params: {
              created: `>=${startDate.toISOString().split('T')[0]}`,
              per_page: 10
            }
          });

          for (const run of (response.data.workflow_runs || [])) {
            allRuns.push({
              id: run.id,
              name: run.name,
              status: run.status,
              conclusion: run.conclusion,
              workflowName: run.name,
              event: run.event,
              branch: run.head_branch,
              runNumber: run.run_number,
              createdAt: new Date(run.created_at),
              updatedAt: new Date(run.updated_at),
              url: run.html_url,
              repository: repo.name,
            });
          }
        } catch (error: any) {
          // 404 = Actions not enabled on this repo — expected, not an error
          if (error.response?.status !== 404) {
            console.error(`[GitHub Tool] Error fetching workflow runs for ${repo.name}:`, error.message);
          }
        }
      })
    );

    // Cap at 30 total, most recent first
    allRuns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const capped = allRuns.slice(0, 30);
    console.log(`[GitHub Tool] Fetched ${capped.length} workflow runs`);
    return capped;
  }

  /**
   * Fetch deployments from active repos within date range
   */
  private async fetchDeployments(startDate: Date, endDate: Date, repos: any[]): Promise<any[]> {
    if (!repos.length) return [];

    const allDeployments: any[] = [];
    const reposToQuery = repos.slice(0, 5);

    await Promise.all(
      reposToQuery.map(async (repo) => {
        const [owner, repoName] = repo.name.split('/');
        try {
          const response = await this.githubApi.get(`/repos/${owner}/${repoName}/deployments`, {
            params: { per_page: 5 }
          });

          for (const deployment of response.data) {
            const createdAt = new Date(deployment.created_at);
            if (createdAt < startDate || createdAt > endDate) continue;

            // Fetch latest status for this deployment
            let status: string | undefined;
            let statusDescription: string | undefined;
            try {
              const statusResponse = await this.githubApi.get(
                `/repos/${owner}/${repoName}/deployments/${deployment.id}/statuses`,
                { params: { per_page: 1 } }
              );
              if (statusResponse.data.length > 0) {
                status = statusResponse.data[0].state;
                statusDescription = statusResponse.data[0].description;
              }
            } catch {
              // Status fetch is best-effort
            }

            allDeployments.push({
              id: deployment.id,
              environment: deployment.environment,
              description: deployment.description || '',
              creator: deployment.creator?.login || '',
              createdAt,
              updatedAt: new Date(deployment.updated_at),
              url: `https://github.com/${repo.name}/deployments/${deployment.environment}`,
              repository: repo.name,
              status,
              statusDescription,
            });
          }
        } catch (error: any) {
          console.error(`[GitHub Tool] Error fetching deployments for ${repo.name}:`, error.message);
        }
      })
    );

    console.log(`[GitHub Tool] Fetched ${allDeployments.length} deployments`);
    return allDeployments;
  }

  /**
   * Fetch review comments (inline code comments) on PRs
   */
  private async fetchReviewComments(pullRequests: any[]): Promise<any[]> {
    if (!pullRequests.length) return [];

    const allComments: any[] = [];
    // Only fetch for merged/reviewed PRs, limit to 10
    const prsToQuery = pullRequests
      .filter(pr => pr.reviewStatus === 'merged' || pr.isReviewed)
      .slice(0, 10);

    await Promise.all(
      prsToQuery.map(async (pr) => {
        const [owner, repoName] = (pr.repository || '').split('/');
        if (!owner || !repoName) return;

        try {
          const response = await this.githubApi.get(
            `/repos/${owner}/${repoName}/pulls/${pr.id}/comments`,
            { params: { per_page: 20 } }
          );

          for (const comment of response.data) {
            allComments.push({
              id: comment.id,
              prNumber: pr.id,
              prTitle: pr.title,
              body: comment.body || '',
              author: comment.user?.login || '',
              path: comment.path || '',
              createdAt: new Date(comment.created_at),
              url: comment.html_url,
              repository: pr.repository,
            });
          }
        } catch (error: any) {
          console.error(`[GitHub Tool] Error fetching review comments for PR #${pr.id}:`, error.message);
        }
      })
    );

    // Cap at 50 total
    const capped = allComments.slice(0, 50);
    console.log(`[GitHub Tool] Fetched ${capped.length} review comments`);
    return capped;
  }

  /**
   * Fetch recently starred repositories
   */
  private async fetchStarredRepos(): Promise<any[]> {
    try {
      const response = await this.githubApi.get('/user/starred', {
        params: { sort: 'created', direction: 'desc', per_page: 10 },
        headers: { Accept: 'application/vnd.github.v3.star+json' }
      });

      return response.data.map((item: any) => ({
        name: item.repo.full_name,
        description: item.repo.description || '',
        language: item.repo.language || '',
        stars: item.repo.stargazers_count || 0,
        url: item.repo.html_url,
        starredAt: item.starred_at ? new Date(item.starred_at) : undefined,
      }));
    } catch (error: any) {
      console.error('[GitHub Tool] Error fetching starred repos:', error.message);
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

    // Extract languages from starred repos
    activity.starredRepos?.forEach(repo => {
      if (repo.language) {
        skills.add(repo.language);
      }
    });

    // CI/CD signals from workflow runs and deployments
    if (activity.workflowRuns?.length) {
      skills.add('GitHub Actions');
      skills.add('CI/CD');
    }
    if (activity.deployments?.length) {
      skills.add('Deployment');
    }
    if (activity.releases?.length) {
      skills.add('Release Management');
    }

    // Extract skills from commit messages, PR titles, and workflow names
    const skillKeywords = [
      'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'TypeScript',
      'JavaScript', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'CI/CD', 'Testing', 'API', 'Database', 'MongoDB', 'PostgreSQL',
      'Redis', 'GraphQL', 'REST', 'Microservices', 'DevOps'
    ];

    const searchText = [
      ...activity.commits.map(c => c.message),
      ...activity.pullRequests.map(pr => pr.title),
      ...activity.issues.map(i => i.title),
      ...(activity.workflowRuns || []).map(r => r.workflowName),
      ...(activity.releases || []).map(r => r.name),
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

    // Add review comment authors
    activity.reviewComments?.forEach(comment => {
      if (comment.author) collaborators.add(comment.author);
    });

    // Add release authors and deployment creators
    activity.releases?.forEach(release => {
      if (release.author) collaborators.add(release.author);
    });
    activity.deployments?.forEach(deployment => {
      if (deployment.creator) collaborators.add(deployment.creator);
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

    if (activity.releases?.length) {
      const names = activity.releases.slice(0, 3).map(r => r.name || r.tagName).join(', ');
      descriptionParts.push(`Published ${activity.releases.length} release(s): ${names}.`);
    }

    if (activity.workflowRuns?.length) {
      const passed = activity.workflowRuns.filter(r => r.conclusion === 'success').length;
      const failed = activity.workflowRuns.filter(r => r.conclusion === 'failure').length;
      descriptionParts.push(`${activity.workflowRuns.length} CI/CD runs (${passed} passed, ${failed} failed).`);
    }

    if (activity.deployments?.length) {
      const environments = [...new Set(activity.deployments.map(d => d.environment))];
      descriptionParts.push(`Deployed to ${environments.join(', ')}.`);
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add releases as artifacts (highest value — shipping signal)
    activity.releases?.slice(0, 2).forEach(release => {
      artifacts.push({
        type: 'link',
        title: `${release.tagName}: ${release.name}`,
        url: release.url,
        description: `Release ${release.tagName}`
      });
    });

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

    // Add deployments as artifacts
    activity.deployments?.slice(0, 2).forEach(deployment => {
      artifacts.push({
        type: 'link',
        title: `Deploy to ${deployment.environment}`,
        url: deployment.url,
        description: `${deployment.status || 'deployed'} - ${deployment.repository}`
      });
    });

    return {
      title,
      description: descriptionParts.join(' '),
      artifacts
    };
  }
}