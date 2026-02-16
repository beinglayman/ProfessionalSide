import axios, { AxiosInstance } from 'axios';
import { MCPToolType, SharePointActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * SharePoint MCP Tool - Fetches user activity from SharePoint
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class SharePointTool {
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private graphApi: AxiosInstance;

  constructor() {
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
   * Fetch SharePoint activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<SharePointActivity>> {
    try {
      console.log(`[SharePoint Tool] Starting fetch for user ${userId}`);

      // Get access token
      const accessToken = await oauthService.getAccessToken(userId, MCPToolType.SHAREPOINT);
      if (!accessToken) {
        console.log('[SharePoint Tool] No access token found');
        return {
          success: false,
          error: 'SharePoint not connected. Please connect your SharePoint account first.'
        };
      }

      console.log('[SharePoint Tool] Access token retrieved successfully');

      // Set authorization header
      this.graphApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 30 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      console.log(`[SharePoint Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch different types of SharePoint activity
      const [sites, recentFiles, lists] = await Promise.all([
        this.fetchFollowedSites(),
        this.fetchRecentFiles(startDate, endDate),
        this.fetchRecentLists(startDate, endDate)
      ]);

      console.log(`[SharePoint Tool] Fetched data:
        - Sites: ${sites.length}
        - Recent files: ${recentFiles.length}
        - Lists: ${lists.length}`);

      // Compile activity data
      const activity: SharePointActivity = {
        sites,
        recentFiles,
        lists
      };

      // Calculate total items
      const itemCount = sites.length + recentFiles.length + lists.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.SHAREPOINT,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.SHAREPOINT,
        itemCount,
        sessionId,
        true
      );

      console.log(`[SharePoint Tool] Successfully fetched ${itemCount} total items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error: any) {
      console.error('[SharePoint Tool] Error fetching activity:', error);
      console.error('[SharePoint Tool] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.SHAREPOINT,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch SharePoint activity'
      };
    }
  }

  /**
   * Fetch sites followed by the user
   */
  private async fetchFollowedSites(): Promise<any[]> {
    try {
      console.log('[SharePoint Tool] Fetching followed sites...');

      const response = await this.graphApi.get('/me/followedSites', {
        params: {
          $select: 'id,name,displayName,webUrl,description,createdDateTime,lastModifiedDateTime',
          $top: 25
        }
      });

      const sites = response.data.value || [];
      console.log(`[SharePoint Tool] Fetched ${sites.length} followed sites`);

      return sites.map((site: any) => ({
        id: site.id,
        name: site.name || site.displayName,
        displayName: site.displayName,
        webUrl: site.webUrl,
        description: site.description || '',
        createdDateTime: site.createdDateTime,
        lastModifiedDateTime: site.lastModifiedDateTime
      }));
    } catch (error: any) {
      console.error('[SharePoint Tool] Error fetching followed sites:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch recent files from SharePoint sites
   */
  private async fetchRecentFiles(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[SharePoint Tool] Fetching recent files...');

      // Get sites first
      const sitesResponse = await this.graphApi.get('/me/followedSites', {
        params: { $top: 10 }
      });

      const sites = sitesResponse.data.value || [];
      console.log(`[SharePoint Tool] Checking recent files in ${sites.length} sites`);

      const allFiles: any[] = [];

      // Fetch recent files from each site (limit to first 5 sites to avoid rate limits)
      for (const site of sites.slice(0, 5)) {
        try {
          const filesResponse = await this.graphApi.get(`/sites/${site.id}/drive/recent`, {
            params: {
              $top: 20
            }
          });

          const files = filesResponse.data.value || [];
          console.log(`[SharePoint Tool] Found ${files.length} recent files in site: ${site.displayName}`);

          // Filter files by date range
          const filteredFiles = files.filter((file: any) => {
            const modifiedDate = new Date(file.lastModifiedDateTime);
            return modifiedDate >= startDate && modifiedDate <= endDate;
          });

          filteredFiles.forEach((file: any) => {
            allFiles.push({
              id: file.id,
              name: file.name,
              webUrl: file.webUrl,
              fileType: file.name.split('.').pop() || 'unknown',
              size: file.size,
              createdDateTime: file.createdDateTime,
              lastModifiedDateTime: file.lastModifiedDateTime,
              lastModifiedBy: file.lastModifiedBy?.user?.displayName || 'Unknown',
              siteName: site.displayName,
              siteId: site.id
            });
          });

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(`[SharePoint Tool] Error fetching files from site ${site.displayName}:`, error.message);
          continue;
        }
      }

      console.log(`[SharePoint Tool] Total recent files: ${allFiles.length}`);
      return allFiles;
    } catch (error: any) {
      console.error('[SharePoint Tool] Error fetching recent files:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch recently updated SharePoint lists
   */
  private async fetchRecentLists(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[SharePoint Tool] Fetching recent lists...');

      // Get sites first
      const sitesResponse = await this.graphApi.get('/me/followedSites', {
        params: { $top: 5 }
      });

      const sites = sitesResponse.data.value || [];
      console.log(`[SharePoint Tool] Checking lists in ${sites.length} sites`);

      const allLists: any[] = [];

      // Fetch lists from each site (limit to first 3 sites to avoid rate limits)
      for (const site of sites.slice(0, 3)) {
        try {
          const listsResponse = await this.graphApi.get(`/sites/${site.id}/lists`, {
            params: {
              $select: 'id,name,displayName,description,webUrl,list,createdDateTime,lastModifiedDateTime',
              $expand: 'list($select=template)',
              $top: 10
            }
          });

          const lists = listsResponse.data.value || [];
          console.log(`[SharePoint Tool] Found ${lists.length} lists in site: ${site.displayName}`);

          // Filter lists by date range (by last modified date)
          const filteredLists = lists.filter((list: any) => {
            const modifiedDate = new Date(list.lastModifiedDateTime);
            return modifiedDate >= startDate && modifiedDate <= endDate;
          });

          filteredLists.forEach((list: any) => {
            allLists.push({
              id: list.id,
              name: list.name,
              displayName: list.displayName,
              description: list.description || '',
              webUrl: list.webUrl,
              listType: list.list?.template || 'genericList',
              itemCount: 0, // Graph API doesn't expose item count easily
              siteName: site.displayName
            });
          });

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(`[SharePoint Tool] Error fetching lists from site ${site.displayName}:`, error.message);
          continue;
        }
      }

      console.log(`[SharePoint Tool] Total lists: ${allLists.length}`);
      return allLists;
    } catch (error: any) {
      console.error('[SharePoint Tool] Error fetching lists:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Generate journal content from SharePoint activity
   */
  public generateJournalContent(activity: SharePointActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const siteCount = activity.sites.length;
    const fileCount = activity.recentFiles.length;
    const listCount = activity.lists.length;

    // Generate title
    let title = 'SharePoint Collaboration Activity';
    if (fileCount > 0) {
      title = `Worked on ${fileCount} SharePoint file${fileCount > 1 ? 's' : ''}`;
    } else if (siteCount > 0) {
      title = `Collaborated across ${siteCount} SharePoint site${siteCount > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (fileCount > 0) {
      const fileTypes = new Set(activity.recentFiles.map(f => f.fileType));
      descriptionParts.push(
        `Edited ${fileCount} document${fileCount > 1 ? 's' : ''} (${Array.from(fileTypes).join(', ')}) across SharePoint sites.`
      );
    }

    if (listCount > 0) {
      descriptionParts.push(
        `Updated ${listCount} SharePoint list${listCount > 1 ? 's' : ''} for team collaboration.`
      );
    }

    if (siteCount > 0) {
      descriptionParts.push(
        `Active in ${siteCount} SharePoint site${siteCount > 1 ? 's' : ''}: ${activity.sites.slice(0, 3).map(s => s.displayName).join(', ')}.`
      );
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add files as artifacts
    activity.recentFiles.slice(0, 5).forEach(file => {
      artifacts.push({
        type: 'document',
        title: file.name,
        url: file.webUrl,
        description: `Modified in ${file.siteName}`,
        metadata: {
          fileType: file.fileType,
          size: file.size,
          lastModified: file.lastModifiedDateTime,
          site: file.siteName
        }
      });
    });

    // Add lists as artifacts
    activity.lists.slice(0, 3).forEach(list => {
      artifacts.push({
        type: 'list',
        title: list.displayName,
        url: list.webUrl,
        description: list.description || `SharePoint list in ${list.siteName}`,
        metadata: {
          listType: list.listType,
          site: list.siteName
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
