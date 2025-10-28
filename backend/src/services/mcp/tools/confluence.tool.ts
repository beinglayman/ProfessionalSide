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
    console.log(`[Confluence Tool] Found ${resourcesResponse.data.length} accessible Confluence site(s)`);

    if (resourcesResponse.data.length === 0) {
      throw new Error('No Confluence sites accessible with this token');
    }

    // Use the first accessible site
    this.cloudId = resourcesResponse.data[0].id;
    const siteUrl = resourcesResponse.data[0].url;
    const siteName = resourcesResponse.data[0].name;
    const baseUrl = `https://api.atlassian.com/ex/confluence/${this.cloudId}`;

    console.log('[Confluence Tool] Using Confluence site:', {
      cloudId: this.cloudId,
      siteName,
      siteUrl,
      baseUrl,
      scopes: resourcesResponse.data[0].scopes || 'not provided'
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

      // Fetch different types of activity
      const [currentUser, spaces, recentPages, blogPosts] = await Promise.all([
        this.fetchCurrentUser(),
        this.fetchSpaces(),
        this.fetchRecentPages(startDate, endDate),
        this.fetchBlogPosts(startDate, endDate)
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
   * Fetch recent pages
   */
  private async fetchRecentPages(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // CQL query for pages created OR modified in date range BY CURRENT USER
      // Using creator = currentUser() OR contributor = currentUser() to filter by user's activity
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const cql = `((created >= "${startDateStr}" AND created <= "${endDateStr}") OR (lastmodified >= "${startDateStr}" AND lastmodified <= "${endDateStr}")) AND type = page AND (creator = currentUser() OR contributor = currentUser()) ORDER BY lastmodified DESC`;

      console.log('[Confluence Tool] ========== FETCHING PAGES ==========');
      console.log(`[Confluence Tool] Date range: ${startDateStr} to ${endDateStr}`);
      console.log(`[Confluence Tool] Pages CQL query: ${cql}`);

      const response = await this.confluenceApi!.get('/wiki/rest/api/content/search', {
        params: {
          cql,
          limit: 50,  // Increased limit
          expand: 'space,version,body.view,history'
        }
      });

      console.log(`[Confluence Tool] Pages API response status: ${response.status}`);
      console.log(`[Confluence Tool] Pages API response: ${response.data.results.length} pages found`);

      if (response.data.results.length > 0) {
        console.log('[Confluence Tool] First page sample:', {
          id: response.data.results[0].id,
          title: response.data.results[0].title,
          space: response.data.results[0].space?.name,
          created: response.data.results[0].history?.createdDate,
          modified: response.data.results[0].version?.when,
          createdBy: response.data.results[0].history?.createdBy?.displayName,
          modifiedBy: response.data.results[0].version?.by?.displayName
        });
      } else {
        // Try fallback query without user filter to diagnose issue
        console.log('[Confluence Tool] ⚠️  No pages found with user filter. Trying fallback query without user filter...');

        const fallbackCql = `((created >= "${startDateStr}" AND created <= "${endDateStr}") OR (lastmodified >= "${startDateStr}" AND lastmodified <= "${endDateStr}")) AND type = page ORDER BY lastmodified DESC`;
        console.log(`[Confluence Tool] Fallback CQL query: ${fallbackCql}`);

        const fallbackResponse = await this.confluenceApi!.get('/wiki/rest/api/content/search', {
          params: {
            cql: fallbackCql,
            limit: 10,
            expand: 'space,version,history'
          }
        });

        console.log(`[Confluence Tool] Fallback query result: ${fallbackResponse.data.results.length} pages found`);

        if (fallbackResponse.data.results.length > 0) {
          console.log('[Confluence Tool] First fallback page:', {
            title: fallbackResponse.data.results[0].title,
            createdBy: fallbackResponse.data.results[0].history?.createdBy?.displayName,
            createdByAccountId: fallbackResponse.data.results[0].history?.createdBy?.accountId,
            modifiedBy: fallbackResponse.data.results[0].version?.by?.displayName,
            modifiedByAccountId: fallbackResponse.data.results[0].version?.by?.accountId
          });
          console.log('[Confluence Tool] 🔍 This shows pages exist but currentUser() filter excludes them!');
        } else {
          console.log('[Confluence Tool] No pages found even without user filter - no activity in date range');
        }
      }
      console.log('[Confluence Tool] ====================================');

      return response.data.results.map((page: any) => ({
        id: page.id,
        title: page.title,
        space: {
          key: page.space.key,
          name: page.space.name
        },
        version: page.version.number,
        created: page.history?.createdDate,
        lastModified: page.version.when,
        lastModifiedBy: page.version.by?.displayName || 'Unknown',
        url: `https://${this.cloudId}.atlassian.net/wiki${page._links.webui}`,
        excerpt: this.extractExcerpt(page.body?.view?.value)
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
   * Fetch blog posts
   */
  private async fetchBlogPosts(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // CQL query for blog posts created OR modified in date range BY CURRENT USER
      // Using creator = currentUser() OR contributor = currentUser() to filter by user's activity
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const cql = `((created >= "${startDateStr}" AND created <= "${endDateStr}") OR (lastmodified >= "${startDateStr}" AND lastmodified <= "${endDateStr}")) AND type = blogpost AND (creator = currentUser() OR contributor = currentUser()) ORDER BY lastmodified DESC`;

      console.log('[Confluence Tool] ========== FETCHING BLOG POSTS ==========');
      console.log(`[Confluence Tool] Date range: ${startDateStr} to ${endDateStr}`);
      console.log(`[Confluence Tool] Blog posts CQL query: ${cql}`);

      const response = await this.confluenceApi!.get('/wiki/rest/api/content/search', {
        params: {
          cql,
          limit: 20,
          expand: 'space,version,body.view,history'
        }
      });

      console.log(`[Confluence Tool] Blog posts API response status: ${response.status}`);
      console.log(`[Confluence Tool] Blog posts API response: ${response.data.results.length} posts found`);
      console.log('[Confluence Tool] ====================================');

      return response.data.results.map((post: any) => ({
        id: post.id,
        title: post.title,
        space: {
          key: post.space.key,
          name: post.space.name
        },
        version: post.version.number,
        created: post.history?.createdDate,
        publishedDate: post.version.when,
        author: post.version.by?.displayName || 'Unknown',
        url: `https://${this.cloudId}.atlassian.net/wiki${post._links.webui}`,
        excerpt: this.extractExcerpt(post.body?.view?.value)
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