import axios, { AxiosInstance } from 'axios';
import { MCPToolType, OneDriveActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * OneDrive MCP Tool - Fetches user activity from OneDrive
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class OneDriveTool {
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
   * Fetch OneDrive activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<OneDriveActivity>> {
    try {
      console.log(`[OneDrive Tool] Starting fetch for user ${userId}`);

      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.ONEDRIVE);
      if (!accessToken) {
        console.log('[OneDrive Tool] No access token found');
        return {
          success: false,
          error: 'OneDrive not connected. Please connect your OneDrive account first.'
        };
      }

      console.log('[OneDrive Tool] Access token retrieved successfully');

      // Set authorization header
      this.graphApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 30 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      console.log(`[OneDrive Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch different types of OneDrive activity
      const [recentFiles, sharedFiles, folders] = await Promise.all([
        this.fetchRecentFiles(startDate, endDate),
        this.fetchSharedFiles(startDate, endDate),
        this.fetchActiveFolders(startDate, endDate)
      ]);

      console.log(`[OneDrive Tool] Fetched data:
        - Recent files: ${recentFiles.length}
        - Shared files: ${sharedFiles.length}
        - Active folders: ${folders.length}`);

      // Compile activity data
      const activity: OneDriveActivity = {
        recentFiles,
        sharedFiles,
        folders
      };

      // Calculate total items
      const itemCount = recentFiles.length + sharedFiles.length + folders.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.ONEDRIVE,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.ONEDRIVE,
        itemCount,
        sessionId,
        true
      );

      console.log(`[OneDrive Tool] Successfully fetched ${itemCount} total items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error: any) {
      console.error('[OneDrive Tool] Error fetching activity:', error);
      console.error('[OneDrive Tool] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.ONEDRIVE,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch OneDrive activity'
      };
    }
  }

  /**
   * Fetch recent files from OneDrive
   */
  private async fetchRecentFiles(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[OneDrive Tool] Fetching recent files...');

      const response = await this.graphApi.get('/me/drive/recent', {
        params: {
          $top: 50
        }
      });

      const files = response.data.value || [];
      console.log(`[OneDrive Tool] Fetched ${files.length} recent files from API`);

      // Filter files by date range and exclude folders
      const filteredFiles = files
        .filter((file: any) => {
          // Exclude folders
          if (file.folder) return false;

          const modifiedDate = new Date(file.lastModifiedDateTime);
          return modifiedDate >= startDate && modifiedDate <= endDate;
        })
        .map((file: any) => ({
          id: file.id,
          name: file.name,
          webUrl: file.webUrl,
          fileType: file.name.split('.').pop() || 'unknown',
          size: file.size,
          createdDateTime: file.createdDateTime,
          lastModifiedDateTime: file.lastModifiedDateTime,
          lastModifiedBy: file.lastModifiedBy?.user?.displayName || 'Unknown',
          parentPath: file.parentReference?.path || '/'
        }));

      console.log(`[OneDrive Tool] Filtered to ${filteredFiles.length} files in date range`);
      return filteredFiles;
    } catch (error: any) {
      console.error('[OneDrive Tool] Error fetching recent files:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch shared files from OneDrive
   */
  private async fetchSharedFiles(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[OneDrive Tool] Fetching shared files...');

      const response = await this.graphApi.get('/me/drive/sharedWithMe', {
        params: {
          $top: 30
        }
      });

      const files = response.data.value || [];
      console.log(`[OneDrive Tool] Fetched ${files.length} shared files from API`);

      // Filter shared files by date range (using lastModifiedDateTime as proxy for when it was shared)
      const filteredFiles = files
        .filter((file: any) => {
          // Exclude folders
          if (file.folder) return false;

          const modifiedDate = new Date(file.lastModifiedDateTime);
          return modifiedDate >= startDate && modifiedDate <= endDate;
        })
        .map((file: any) => {
          // Get sharing information
          const sharedBy = file.remoteItem?.shared?.sharedBy?.user?.displayName ||
                          file.shared?.sharedBy?.user?.displayName ||
                          'Unknown';

          return {
            id: file.id,
            name: file.name,
            webUrl: file.webUrl,
            fileType: file.name.split('.').pop() || 'unknown',
            sharedDateTime: file.lastModifiedDateTime, // Approximation
            sharedWith: [sharedBy],
            permissions: file.shared?.scope || 'unknown'
          };
        });

      console.log(`[OneDrive Tool] Filtered to ${filteredFiles.length} shared files in date range`);
      return filteredFiles;
    } catch (error: any) {
      console.error('[OneDrive Tool] Error fetching shared files:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch folders with recent activity
   */
  private async fetchActiveFolders(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('[OneDrive Tool] Fetching active folders...');

      // Get root folder children
      const response = await this.graphApi.get('/me/drive/root/children', {
        params: {
          $top: 50,
          $filter: 'folder ne null', // Only folders
          $orderby: 'lastModifiedDateTime desc'
        }
      });

      const folders = response.data.value || [];
      console.log(`[OneDrive Tool] Fetched ${folders.length} folders from API`);

      // Filter folders by date range
      const filteredFolders = folders
        .filter((folder: any) => {
          const modifiedDate = new Date(folder.lastModifiedDateTime);
          return modifiedDate >= startDate && modifiedDate <= endDate;
        })
        .map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          webUrl: folder.webUrl,
          itemCount: folder.folder?.childCount || 0,
          lastModifiedDateTime: folder.lastModifiedDateTime
        }));

      console.log(`[OneDrive Tool] Filtered to ${filteredFolders.length} active folders in date range`);
      return filteredFolders;
    } catch (error: any) {
      console.error('[OneDrive Tool] Error fetching active folders:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Generate journal content from OneDrive activity
   */
  public generateJournalContent(activity: OneDriveActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const fileCount = activity.recentFiles.length;
    const sharedCount = activity.sharedFiles.length;
    const folderCount = activity.folders.length;

    // Generate title
    let title = 'OneDrive File Management Activity';
    if (fileCount > 0) {
      title = `Worked on ${fileCount} OneDrive file${fileCount > 1 ? 's' : ''}`;
    } else if (sharedCount > 0) {
      title = `Collaborated on ${sharedCount} shared document${sharedCount > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (fileCount > 0) {
      const fileTypes = new Set(activity.recentFiles.map(f => f.fileType));
      descriptionParts.push(
        `Modified ${fileCount} file${fileCount > 1 ? 's' : ''} (${Array.from(fileTypes).slice(0, 3).join(', ')}) in OneDrive.`
      );
    }

    if (sharedCount > 0) {
      descriptionParts.push(
        `Collaborated on ${sharedCount} shared document${sharedCount > 1 ? 's' : ''} with team members.`
      );
    }

    if (folderCount > 0) {
      descriptionParts.push(
        `Organized ${folderCount} folder${folderCount > 1 ? 's' : ''}: ${activity.folders.slice(0, 3).map(f => f.name).join(', ')}.`
      );
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add recent files as artifacts
    activity.recentFiles.slice(0, 5).forEach(file => {
      artifacts.push({
        type: 'document',
        title: file.name,
        url: file.webUrl,
        description: `Modified in OneDrive`,
        metadata: {
          fileType: file.fileType,
          size: file.size,
          lastModified: file.lastModifiedDateTime,
          path: file.parentPath
        }
      });
    });

    // Add shared files as artifacts
    activity.sharedFiles.slice(0, 3).forEach(file => {
      artifacts.push({
        type: 'shared-document',
        title: file.name,
        url: file.webUrl,
        description: `Shared collaboration`,
        metadata: {
          fileType: file.fileType,
          sharedWith: file.sharedWith.join(', '),
          permissions: file.permissions
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
