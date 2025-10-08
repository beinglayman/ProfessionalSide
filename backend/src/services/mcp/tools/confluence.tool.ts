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

    if (resourcesResponse.data.length === 0) {
      throw new Error('No Confluence sites accessible with this token');
    }

    // Use the first accessible site
    this.cloudId = resourcesResponse.data[0].id;
    const baseUrl = `https://api.atlassian.com/ex/confluence/${this.cloudId}`;

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
      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.CONFLUENCE);
      if (!accessToken) {
        return {
          success: false,
          error: 'Confluence not connected. Please connect your Confluence account first.'
        };
      }

      // Initialize Confluence client
      await this.initializeConfluenceClient(accessToken);

      if (!this.confluenceApi) {
        return {
          success: false,
          error: 'Failed to initialize Confluence client'
        };
      }

      // Calculate date range (default: last 7 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch different types of activity
      const [currentUser, spaces, recentPages, blogPosts] = await Promise.all([
        this.fetchCurrentUser(),
        this.fetchSpaces(),
        this.fetchRecentPages(startDate, endDate),
        this.fetchBlogPosts(startDate, endDate)
      ]);

      // Fetch comments on pages
      const comments = await this.fetchRecentComments(recentPages, startDate, endDate);

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

      console.log(`[Confluence Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error: any) {
      console.error('[Confluence Tool] Error fetching activity:', error);

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
      return response.data;
    } catch (error) {
      console.error('[Confluence Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch user's spaces
   */
  private async fetchSpaces(): Promise<any[]> {
    try {
      const response = await this.confluenceApi!.get('/wiki/rest/api/space', {
        params: {
          limit: 25,
          expand: 'description.plain,homepage'
        }
      });

      return response.data.results.map((space: any) => ({
        key: space.key,
        name: space.name,
        type: space.type,
        description: space.description?.plain || '',
        homepageId: space.homepage?.id,
        url: `https://${this.cloudId}.atlassian.net/wiki/spaces/${space.key}`
      }));
    } catch (error) {
      console.error('[Confluence Tool] Error fetching spaces:', error);
      return [];
    }
  }

  /**
   * Fetch recent pages
   */
  private async fetchRecentPages(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // CQL query for pages updated in date range
      const cql = `lastmodified >= "${startDate.toISOString().split('T')[0]}" AND lastmodified <= "${endDate.toISOString().split('T')[0]}" AND type = page ORDER BY lastmodified DESC`;

      const response = await this.confluenceApi!.get('/wiki/rest/api/content/search', {
        params: {
          cql,
          limit: 30,
          expand: 'space,version,body.view'
        }
      });

      return response.data.results.map((page: any) => ({
        id: page.id,
        title: page.title,
        space: {
          key: page.space.key,
          name: page.space.name
        },
        version: page.version.number,
        lastModified: page.version.when,
        lastModifiedBy: page.version.by?.displayName || 'Unknown',
        url: `https://${this.cloudId}.atlassian.net/wiki${page._links.webui}`,
        excerpt: this.extractExcerpt(page.body?.view?.value)
      }));
    } catch (error) {
      console.error('[Confluence Tool] Error fetching pages:', error);
      return [];
    }
  }

  /**
   * Fetch blog posts
   */
  private async fetchBlogPosts(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // CQL query for blog posts updated in date range
      const cql = `lastmodified >= "${startDate.toISOString().split('T')[0]}" AND lastmodified <= "${endDate.toISOString().split('T')[0]}" AND type = blogpost ORDER BY lastmodified DESC`;

      const response = await this.confluenceApi!.get('/wiki/rest/api/content/search', {
        params: {
          cql,
          limit: 20,
          expand: 'space,version,body.view'
        }
      });

      return response.data.results.map((post: any) => ({
        id: post.id,
        title: post.title,
        space: {
          key: post.space.key,
          name: post.space.name
        },
        version: post.version.number,
        publishedDate: post.version.when,
        author: post.version.by?.displayName || 'Unknown',
        url: `https://${this.cloudId}.atlassian.net/wiki${post._links.webui}`,
        excerpt: this.extractExcerpt(post.body?.view?.value)
      }));
    } catch (error) {
      console.error('[Confluence Tool] Error fetching blog posts:', error);
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