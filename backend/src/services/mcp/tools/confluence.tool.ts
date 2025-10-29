import axios, { AxiosInstance } from 'axios';
import { MCPToolType, ConfluenceActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Confluence MCP Tool - Fetches user activity from Confluence
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class ConfluenceTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private confluenceApi: AxiosInstance | null = null;
  private cloudId: string | null = null;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();
  }

  /**
   * Initialize Confluence API client with user's cloud instance
   */
  private async initializeConfluenceClient(accessToken: string): Promise<void> {
    // First, get the accessible resources (Confluence sites)
    const resourcesResponse = await axios.get(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    console.log('[Confluence Tool] Accessible resources:', JSON.stringify(resourcesResponse.data, null, 2));
    console.log(`[Confluence Tool] Found ${resourcesResponse.data.length} accessible resource(s)`);

    if (resourcesResponse.data.length === 0) {
      throw new Error('No Confluence sites accessible with this token');
    }

    // Find resource with Confluence scopes (Atlassian may return separate resources for Jira and Confluence)
    const confluenceResource = resourcesResponse.data.find((resource: any) =>
      resource.scopes && resource.scopes.some((scope: string) => scope.includes('confluence'))
    );

    if (!confluenceResource) {
      console.error('[Confluence Tool] No resource with Confluence scopes found!');
      console.error('[Confluence Tool] Available resources:', resourcesResponse.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        scopes: r.scopes
      })));
      throw new Error('No Confluence-enabled resource found. Please ensure Confluence scopes are granted during OAuth.');
    }

    // Use the Confluence-enabled resource
    this.cloudId = confluenceResource.id;
    const siteUrl = confluenceResource.url;
    const siteName = confluenceResource.name;
    const baseUrl = `https://api.atlassian.com/ex/confluence/${this.cloudId}`;

    console.log('[Confluence Tool] Using Confluence site:', {
      cloudId: this.cloudId,
      siteName,
      siteUrl,
      baseUrl,
      scopes: confluenceResource.scopes || 'not provided'
    });

    // Initialize Confluence API client
    this.confluenceApi = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });
  }

  /**
   * Fetch Confluence activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<ConfluenceActivity>> {
    try {
      console.log(`[Confluence Tool] Starting fetch for user ${userId}`);

      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.CONFLUENCE);
      if (!accessToken) {
        console.log('[Confluence Tool] No access token found');
        return {
          success: false,
          error: 'Confluence not connected. Please connect your Confluence account first.'
        };
      }

      console.log('[Confluence Tool] Access token retrieved successfully');

      // Initialize Confluence client
      await this.initializeConfluenceClient(accessToken);

      if (!this.confluenceApi) {
        console.error('[Confluence Tool] Failed to initialize client');
        return {
          success: false,
          error: 'Failed to initialize Confluence client'
        };
      }

      console.log(`[Confluence Tool] Initialized with cloud ID: ${this.cloudId}`);

      // Calculate date range (default: last 30 days for better coverage)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log('[Confluence Tool] ========== DATE RANGE ==========');
      console.log(`[Confluence Tool] Start: ${startDate.toISOString()}`);
      console.log(`[Confluence Tool] End: ${endDate.toISOString()}`);
      console.log(`[Confluence Tool] Duration: ${daysDifference} days`);
      console.log('[Confluence Tool] ====================================');

      // Fetch current user first (needed for filtering in v2 API)
      const currentUser = await this.fetchCurrentUser();

      if (!currentUser || !currentUser.accountId) {
        console.error('[Confluence Tool] Failed to fetch current user - cannot filter by user');
        return {
          success: false,
          error: 'Failed to fetch current user information'
        };
      }

      const currentUserAccountId = currentUser.accountId;
      console.log(`[Confluence Tool] Using accountId for filtering: ${currentUserAccountId}`);

      // Fetch different types of activity
      const [spaces, recentPages, blogPosts] = await Promise.all([
        this.fetchSpaces(),
        this.fetchRecentPages(startDate, endDate, currentUserAccountId),
        this.fetchBlogPosts(startDate, endDate, currentUserAccountId)
      ]);

      console.log(`[Confluence Tool] Fetched data:
        - Current user: ${currentUser ? 'Yes' : 'No'}
        - Spaces: ${spaces.length}
        - Pages: ${recentPages.length}
        - Blog posts: ${blogPosts.length}`);

      // Fetch comments on pages
      const comments = await this.fetchRecentComments(recentPages, startDate, endDate);

      console.log(`[Confluence Tool] Fetched ${comments.length} comments`);

      // Compile activity data
      const activity: ConfluenceActivity = {
        pages: recentPages,
        blogPosts,
        comments,
        spaces
      };

      // Calculate total items
      const itemCount = recentPages.length + blogPosts.length + comments.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.CONFLUENCE,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.CONFLUENCE,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Confluence Tool] Successfully fetched ${itemCount} total items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error: any) {
      console.error('[Confluence Tool] Error fetching activity:', error);
      console.error('[Confluence Tool] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.CONFLUENCE,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch Confluence activity'
      };
    }
  }

  /**
   * Fetch current user information
   */
  private async fetchCurrentUser(): Promise<any> {
    try {
      const response = await this.confluenceApi!.get('/wiki/rest/api/user/current');
      console.log('[Confluence Tool] ========== CURRENT USER INFO ==========');
      console.log('[Confluence Tool] Full user response:', JSON.stringify(response.data, null, 2));
      console.log('[Confluence Tool] Current user summary:', {
        accountId: response.data.accountId,
        accountType: response.data.accountType,
        displayName: response.data.displayName,
        email: response.data.email,
        publicName: response.data.publicName
      });
      console.log('[Confluence Tool] ====================================');
      return response.data;
    } catch (error: any) {
      console.error('[Confluence Tool] Error fetching user info:', error);
      console.error('[Confluence Tool] User error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return null;
    }
  }

  /**
   * Fetch user's spaces
   */
  private async fetchSpaces(): Promise<any[]> {
    try {
      // Use v2 API - v1 /wiki/rest/api/space was deprecated and removed (410 Gone)
      // Reference: https://developer.atlassian.com/cloud/confluence/changelog/#CHANGE-864
      const response = await this.confluenceApi!.get('/wiki/api/v2/spaces', {
        params: {
          limit: 25
        }
      });

      console.log(`[Confluence Tool] Fetched ${response.data.results?.length || 0} spaces from v2 API`);

      return (response.data.results || []).map((space: any) => ({
        key: space.key,
        name: space.name,
        type: space.type,
        description: space.description?.plain?.value || '',
        homepageId: space.homepage?.id,
        url: `https://${this.cloudId}.atlassian.net/wiki/spaces/${space.key}`
      }));
    } catch (error: any) {
      console.error('[Confluence Tool] Error fetching spaces:', error);
      console.error('[Confluence Tool] Spaces error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    }
  }

  /**
   * Fetch recent pages using v2 API (v1 CQL deprecated for OAuth 2.0)
   */
  private async fetchRecentPages(startDate: Date, endDate: Date, currentUserAccountId: string): Promise<any[]> {
    try {
      console.log('[Confluence Tool] ========== FETCHING PAGES (v2 API) ==========');
      console.log(`[Confluence Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[Confluence Tool] Filtering by accountId: ${currentUserAccountId}`);

      // Use v2 Pages API - works with OAuth 2.0 classic scopes
      // Reference: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/
      const response = await this.confluenceApi!.get('/wiki/api/v2/pages', {
        params: {
          limit: 100,  // Fetch more since we'll filter client-side
          sort: '-modified-date',  // Sort by most recently modified
          status: 'current'  // Only current versions
        }
      });

      console.log(`[Confluence Tool] Pages API v2 response status: ${response.status}`);
      console.log(`[Confluence Tool] Pages API v2 fetched: ${response.data.results?.length || 0} total pages`);

      // Filter pages by date range and user (client-side filtering)
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      const filteredPages = (response.data.results || []).filter((page: any) => {
        // Check if page was created or modified in date range
        const createdTime = page.createdAt ? new Date(page.createdAt).getTime() : 0;
        const modifiedTime = page.version?.createdAt ? new Date(page.version.createdAt).getTime() : 0;

        const inDateRange =
          (createdTime >= startTime && createdTime <= endTime) ||
          (modifiedTime >= startTime && modifiedTime <= endTime);

        if (!inDateRange) return false;

        // Check if current user created or modified the page
        const createdByUser = page.authorId === currentUserAccountId;
        const modifiedByUser = page.version?.authorId === currentUserAccountId;

        return createdByUser || modifiedByUser;
      });

      console.log(`[Confluence Tool] Filtered to ${filteredPages.length} pages for current user in date range`);

      if (filteredPages.length > 0) {
        console.log('[Confluence Tool] First filtered page:', {
          id: filteredPages[0].id,
          title: filteredPages[0].title,
          created: filteredPages[0].createdAt,
          modified: filteredPages[0].version?.createdAt,
          authorId: filteredPages[0].authorId,
          versionAuthorId: filteredPages[0].version?.authorId
        });
      }

      console.log('[Confluence Tool] ====================================');

      // Map v2 API response to our expected format
      return filteredPages.map((page: any) => ({
        id: page.id,
        title: page.title,
        space: {
          key: page.spaceId || '',  // v2 uses spaceId
          name: page.spaceId || ''   // We'll enrich with space name if needed
        },
        version: page.version?.number || 1,
        created: page.createdAt,
        lastModified: page.version?.createdAt || page.createdAt,
        lastModifiedBy: page.version?.authorId || page.authorId || 'Unknown',
        url: page._links?.webui ? `https://${this.cloudId}.atlassian.net${page._links.webui}` : '',
        excerpt: page.body?.storage?.value ? this.extractExcerpt(page.body.storage.value) : ''
      }));
    } catch (error: any) {
      console.error('[Confluence Tool] Error fetching pages:', error);
      console.error('[Confluence Tool] Pages error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      });
      // Log specific 401 error details
      if (error.response?.status === 401) {
        console.error('[Confluence Tool] 401 Unauthorized - Token may have wrong scopes or be invalid');
        console.error('[Confluence Tool] Response headers:', error.response.headers);
      }
      return [];
    }
  }

  /**
   * Fetch blog posts using v2 API (v1 CQL deprecated for OAuth 2.0)
   */
  private async fetchBlogPosts(startDate: Date, endDate: Date, currentUserAccountId: string): Promise<any[]> {
    try {
      console.log('[Confluence Tool] ========== FETCHING BLOG POSTS (v2 API) ==========');
      console.log(`[Confluence Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[Confluence Tool] Filtering by accountId: ${currentUserAccountId}`);

      // Use v2 Blogposts API - works with OAuth 2.0 classic scopes
      // Reference: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blogpost/
      const response = await this.confluenceApi!.get('/wiki/api/v2/blogposts', {
        params: {
          limit: 50,  // Fetch more since we'll filter client-side
          sort: '-modified-date',  // Sort by most recently modified
          status: 'current'  // Only current versions
        }
      });

      console.log(`[Confluence Tool] Blogposts API v2 response status: ${response.status}`);
      console.log(`[Confluence Tool] Blogposts API v2 fetched: ${response.data.results?.length || 0} total posts`);

      // Filter blog posts by date range and user (client-side filtering)
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      const filteredPosts = (response.data.results || []).filter((post: any) => {
        // Check if blog post was created or modified in date range
        const createdTime = post.createdAt ? new Date(post.createdAt).getTime() : 0;
        const modifiedTime = post.version?.createdAt ? new Date(post.version.createdAt).getTime() : 0;

        const inDateRange =
          (createdTime >= startTime && createdTime <= endTime) ||
          (modifiedTime >= startTime && modifiedTime <= endTime);

        if (!inDateRange) return false;

        // Check if current user created or modified the blog post
        const createdByUser = post.authorId === currentUserAccountId;
        const modifiedByUser = post.version?.authorId === currentUserAccountId;

        return createdByUser || modifiedByUser;
      });

      console.log(`[Confluence Tool] Filtered to ${filteredPosts.length} blog posts for current user in date range`);
      console.log('[Confluence Tool] ====================================');

      // Map v2 API response to our expected format
      return filteredPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        space: {
          key: post.spaceId || '',
          name: post.spaceId || ''
        },
        version: post.version?.number || 1,
        created: post.createdAt,
        publishedDate: post.version?.createdAt || post.createdAt,
        author: post.version?.authorId || post.authorId || 'Unknown',
        url: post._links?.webui ? `https://${this.cloudId}.atlassian.net${post._links.webui}` : '',
        excerpt: post.body?.storage?.value ? this.extractExcerpt(post.body.storage.value) : ''
      }));
    } catch (error: any) {
      console.error('[Confluence Tool] Error fetching blog posts:', error);
      console.error('[Confluence Tool] Blog posts error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    }
  }

  /**
   * Fetch recent comments
   */
  private async fetchRecentComments(pages: any[], startDate: Date, endDate: Date): Promise<any[]> {
    const allComments: any[] = [];

    // Limit to first 10 pages to avoid rate limiting
    for (const page of pages.slice(0, 10)) {
      try {
        const response = await this.confluenceApi!.get(`/wiki/rest/api/content/${page.id}/child/comment`, {
          params: {
            expand: 'version,body.view',
            limit: 10
          }
        });

        const comments = response.data.results || [];

        comments.forEach((comment: any) => {
          const commentDate = new Date(comment.version.when);
          if (commentDate >= startDate && commentDate <= endDate) {
            allComments.push({
              id: comment.id,
              pageId: page.id,
              pageTitle: page.title,
              author: comment.version.by?.displayName || 'Unknown',
              createdAt: comment.version.when,
              content: this.extractExcerpt(comment.body?.view?.value)
            });
          }
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Comments might not be available for all pages
        continue;
      }
    }

    return allComments;
  }

  /**
   * Extract text excerpt from HTML content
   */
  private extractExcerpt(html?: string): string {
    if (!html) return '';

    // Remove HTML tags and get first 200 characters
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }

  /**
   * Generate journal content from Confluence activity
   */
  public generateJournalContent(activity: ConfluenceActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const pageCount = activity.pages.length;
    const blogCount = activity.blogPosts.length;
    const commentCount = activity.comments.length;

    // Generate title
    let title = 'Confluence Documentation Activity';
    if (pageCount > 0 && blogCount > 0) {
      title = `Created ${pageCount} pages and ${blogCount} blog posts`;
    } else if (pageCount > 0) {
      title = `Updated ${pageCount} Confluence page${pageCount > 1 ? 's' : ''}`;
    } else if (blogCount > 0) {
      title = `Published ${blogCount} blog post${blogCount > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (pageCount > 0) {
      const spaces = new Set(activity.pages.map(p => p.space.name));
      descriptionParts.push(
        `Worked on ${pageCount} documentation page${pageCount > 1 ? 's' : ''} across ${spaces.size} space${spaces.size > 1 ? 's' : ''}.`
      );
    }

    if (blogCount > 0) {
      descriptionParts.push(
        `Published ${blogCount} blog post${blogCount > 1 ? 's' : ''} sharing knowledge and insights.`
      );
    }

    if (commentCount > 0) {
      descriptionParts.push(
        `Engaged in ${commentCount} discussion${commentCount > 1 ? 's' : ''} through comments and feedback.`
      );
    }

    // List spaces involved
    const allSpaces = new Set([
      ...activity.pages.map(p => p.space.name),
      ...activity.blogPosts.map(b => b.space.name)
    ]);
    if (allSpaces.size > 0) {
      descriptionParts.push(`Spaces: ${Array.from(allSpaces).join(', ')}.`);
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add pages as artifacts
    activity.pages.slice(0, 5).forEach(page => {
      artifacts.push({
        type: 'documentation',
        title: page.title,
        url: page.url,
        description: page.excerpt || `Documentation in ${page.space.name}`,
        metadata: {
          space: page.space.key,
          version: page.version,
          lastModified: page.lastModified
        }
      });
    });

    // Add blog posts as artifacts
    activity.blogPosts.slice(0, 3).forEach(post => {
      artifacts.push({
        type: 'blog',
        title: post.title,
        url: post.url,
        description: post.excerpt || `Blog post in ${post.space.name}`,
        metadata: {
          author: post.author,
          publishedDate: post.publishedDate
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