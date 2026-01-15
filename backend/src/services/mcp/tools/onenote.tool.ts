import axios, { AxiosInstance } from 'axios';
import { MCPToolType, OneNoteActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * OneNote MCP Tool - Fetches user activity from OneNote
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class OneNoteTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private graphApi: AxiosInstance;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();

    // Initialize Microsoft Graph API client
    this.graphApi = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Accept: 'application/json'
      }
    });
  }

  /**
   * Fetch OneNote activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<OneNoteActivity>> {
    try {
      console.log(`[OneNote Tool] Starting fetch for user ${userId}`);

      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.ONENOTE);
      if (!accessToken) {
        console.log('[OneNote Tool] No access token found');
        return {
          success: false,
          error: 'OneNote not connected. Please connect your OneNote account first.'
        };
      }

      console.log('[OneNote Tool] Access token retrieved successfully');

      // Set authorization header
      this.graphApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 30 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      console.log(`[OneNote Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch different types of OneNote activity
      const [notebooks, sections, pages] = await Promise.all([
        this.fetchNotebooks(),
        this.fetchSections(startDate, endDate),
        this.fetchRecentPages(startDate, endDate)
      ]);

      console.log(`[OneNote Tool] Fetched data:
        - Notebooks: ${notebooks.length}
        - Sections: ${sections.length}
        - Pages: ${pages.length}`);

      // Compile activity data
      const activity: OneNoteActivity = {
        notebooks,
        sections,
        pages
      };

      // Calculate total items
      const itemCount = notebooks.length + sections.length + pages.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.ONENOTE,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.ONENOTE,
        itemCount,
        sessionId,
        true
      );

      console.log(`[OneNote Tool] Successfully fetched ${itemCount} total items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error: any) {
      console.error('[OneNote Tool] Error fetching activity:', error);
      console.error('[OneNote Tool] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.ONENOTE,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch OneNote activity'
      };
    }
  }

  /**
   * Fetch user's OneNote notebooks
   */
  private async fetchNotebooks(): Promise<any[]> {
    try {
      console.log('[OneNote Tool] Fetching notebooks...');

      const response = await this.graphApi.get('/me/onenote/notebooks', {
        params: {
          $select: 'id,displayName,createdDateTime,lastModifiedDateTime,isDefault,links',
          $top: 25,
          $orderby: 'lastModifiedDateTime desc'
        }
      });

      const notebooks = response.data.value || [];
      console.log(`[OneNote Tool] Fetched ${notebooks.length} notebooks`);

      return notebooks.map((notebook: any) => ({
        id: notebook.id,
        displayName: notebook.displayName,
        webUrl: notebook.links?.oneNoteWebUrl?.href ||
                notebook.links?.oneNoteClientUrl?.href ||
                `https://onedrive.live.com/view.aspx?resid=${notebook.id}`,
        createdDateTime: notebook.createdDateTime,
        lastModifiedDateTime: notebook.lastModifiedDateTime,
        isDefault: notebook.isDefault || false,
        sectionCount: 0 // Will be populated if we fetch sections
      }));
    } catch (error: any) {
      console.error('[OneNote Tool] Error fetching notebooks:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch recently modified sections
   */
  private async fetchSections(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[OneNote Tool] Fetching sections...');

      const response = await this.graphApi.get('/me/onenote/sections', {
        params: {
          $select: 'id,displayName,createdDateTime,lastModifiedDateTime,links,parentNotebook',
          $expand: 'parentNotebook($select=displayName)',
          $top: 50,
          $orderby: 'lastModifiedDateTime desc'
        }
      });

      const sections = response.data.value || [];
      console.log(`[OneNote Tool] Fetched ${sections.length} sections from API`);

      // Filter sections by date range
      const filteredSections = sections
        .filter((section: any) => {
          const modifiedDate = new Date(section.lastModifiedDateTime);
          return modifiedDate >= startDate && modifiedDate <= endDate;
        })
        .map((section: any) => ({
          id: section.id,
          displayName: section.displayName,
          webUrl: section.links?.oneNoteWebUrl?.href ||
                  section.links?.oneNoteClientUrl?.href ||
                  `https://onedrive.live.com/view.aspx?resid=${section.id}`,
          notebookName: section.parentNotebook?.displayName || 'Unknown',
          createdDateTime: section.createdDateTime,
          lastModifiedDateTime: section.lastModifiedDateTime,
          pageCount: 0 // Graph API doesn't expose page count easily
        }));

      console.log(`[OneNote Tool] Filtered to ${filteredSections.length} sections in date range`);
      return filteredSections;
    } catch (error: any) {
      console.error('[OneNote Tool] Error fetching sections:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch recently created/modified pages
   */
  private async fetchRecentPages(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[OneNote Tool] Fetching recent pages...');

      const response = await this.graphApi.get('/me/onenote/pages', {
        params: {
          $select: 'id,title,createdDateTime,lastModifiedDateTime,links,contentUrl,parentSection,parentNotebook',
          $expand: 'parentSection($select=displayName),parentNotebook($select=displayName)',
          $top: 100,
          $orderby: 'lastModifiedDateTime desc'
        }
      });

      const pages = response.data.value || [];
      console.log(`[OneNote Tool] Fetched ${pages.length} pages from API`);

      // Filter pages by date range
      const filteredPages = pages
        .filter((page: any) => {
          const modifiedDate = new Date(page.lastModifiedDateTime);
          const createdDate = new Date(page.createdDateTime);
          return (modifiedDate >= startDate && modifiedDate <= endDate) ||
                 (createdDate >= startDate && createdDate <= endDate);
        });

      console.log(`[OneNote Tool] Filtered to ${filteredPages.length} pages in date range`);

      // Fetch content preview for top pages (limit to 10 to avoid rate limits)
      const pagesWithContent = await Promise.all(
        filteredPages.slice(0, 10).map(async (page: any) => {
          let contentPreview = '';

          try {
            // Fetch page content
            const contentResponse = await this.graphApi.get(`/me/onenote/pages/${page.id}/content`, {
              headers: {
                Accept: 'text/html'
              }
            });

            // Extract text preview from HTML (first 200 chars)
            const htmlContent = contentResponse.data || '';
            contentPreview = this.extractTextFromHtml(htmlContent).substring(0, 200);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`[OneNote Tool] Could not fetch content for page ${page.id}`);
          }

          return {
            id: page.id,
            title: page.title,
            webUrl: page.links?.oneNoteWebUrl?.href ||
                    page.links?.oneNoteClientUrl?.href ||
                    `https://onedrive.live.com/view.aspx?resid=${page.id}`,
            createdDateTime: page.createdDateTime,
            lastModifiedDateTime: page.lastModifiedDateTime,
            sectionName: page.parentSection?.displayName || 'Unknown',
            notebookName: page.parentNotebook?.displayName || 'Unknown',
            contentPreview
          };
        })
      );

      // Add remaining pages without content preview
      const remainingPages = filteredPages.slice(10).map((page: any) => ({
        id: page.id,
        title: page.title,
        webUrl: page.links?.oneNoteWebUrl?.href ||
                page.links?.oneNoteClientUrl?.href ||
                `https://onedrive.live.com/view.aspx?resid=${page.id}`,
        createdDateTime: page.createdDateTime,
        lastModifiedDateTime: page.lastModifiedDateTime,
        sectionName: page.parentSection?.displayName || 'Unknown',
        notebookName: page.parentNotebook?.displayName || 'Unknown',
        contentPreview: ''
      }));

      const allPages = [...pagesWithContent, ...remainingPages];
      console.log(`[OneNote Tool] Returning ${allPages.length} pages (${pagesWithContent.length} with content preview)`);

      return allPages;
    } catch (error: any) {
      console.error('[OneNote Tool] Error fetching pages:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextFromHtml(html: string): string {
    // Remove HTML tags and extract text
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return text;
  }

  /**
   * Generate journal content from OneNote activity
   */
  public generateJournalContent(activity: OneNoteActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const notebookCount = activity.notebooks.length;
    const sectionCount = activity.sections.length;
    const pageCount = activity.pages.length;

    // Generate title
    let title = 'OneNote Knowledge Management Activity';
    if (pageCount > 0) {
      title = `Created ${pageCount} OneNote page${pageCount > 1 ? 's' : ''}`;
    } else if (sectionCount > 0) {
      title = `Organized ${sectionCount} OneNote section${sectionCount > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (pageCount > 0) {
      const notebooks = new Set(activity.pages.map(p => p.notebookName));
      descriptionParts.push(
        `Created or updated ${pageCount} page${pageCount > 1 ? 's' : ''} across ${notebooks.size} notebook${notebooks.size > 1 ? 's' : ''}.`
      );
    }

    if (sectionCount > 0) {
      descriptionParts.push(
        `Organized content in ${sectionCount} section${sectionCount > 1 ? 's' : ''}.`
      );
    }

    if (notebookCount > 0) {
      descriptionParts.push(
        `Active in ${notebookCount} notebook${notebookCount > 1 ? 's' : ''}: ${activity.notebooks.slice(0, 3).map(n => n.displayName).join(', ')}.`
      );
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add pages as artifacts
    activity.pages.slice(0, 5).forEach(page => {
      artifacts.push({
        type: 'note',
        title: page.title,
        url: page.webUrl,
        description: page.contentPreview || `Note in ${page.sectionName}`,
        metadata: {
          notebook: page.notebookName,
          section: page.sectionName,
          created: page.createdDateTime,
          modified: page.lastModifiedDateTime
        }
      });
    });

    // Add sections as artifacts
    activity.sections.slice(0, 3).forEach(section => {
      artifacts.push({
        type: 'section',
        title: section.displayName,
        url: section.webUrl,
        description: `OneNote section in ${section.notebookName}`,
        metadata: {
          notebook: section.notebookName,
          modified: section.lastModifiedDateTime
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
