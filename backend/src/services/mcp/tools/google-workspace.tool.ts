import { google } from 'googleapis';
import { MCPToolType, GoogleWorkspaceActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Google Workspace MCP Tool - Fetches activity from Google Drive, Docs, Sheets, Slides, and Meet
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class GoogleWorkspaceTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();
  }

  /**
   * Fetch Google Workspace activity for a user
   * @param userId User ID
   * @param dateRange Date range to fetch activity for
   * @returns Google Workspace activity data (memory-only)
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<GoogleWorkspaceActivity>> {
    try {
      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.GOOGLE_WORKSPACE);
      if (!accessToken) {
        return {
          success: false,
          error: 'Google Workspace not connected. Please connect your Google account first.'
        };
      }

      // Set up OAuth2 client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      // Initialize Google APIs
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Calculate date range (default: last 7 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      console.log('[Google Workspace Tool] Starting fetch for user', userId, 'from', startDate.toISOString(), 'to', endDate.toISOString());

      // Fetch different types of activity in parallel
      const [driveFiles, meetRecordings, calendarEvents] = await Promise.all([
        this.fetchDriveFiles(drive, startDate, endDate),
        this.fetchMeetRecordings(drive, startDate, endDate),
        this.fetchCalendarEvents(calendar, startDate, endDate)
      ]);

      console.log('[Google Workspace Tool] Fetch results:', {
        driveFiles: driveFiles.length,
        meetRecordings: meetRecordings.length,
        calendarEvents: calendarEvents.length
      });

      // Separate files by type (Google Docs, Sheets, Slides)
      const docs = driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.document');
      const sheets = driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');
      const slides = driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.presentation');

      console.log('[Google Workspace Tool] Categorized files:', {
        docs: docs.length,
        sheets: sheets.length,
        slides: slides.length,
        otherFiles: driveFiles.length - docs.length - sheets.length - slides.length
      });

      // Map to expected format
      const activity: GoogleWorkspaceActivity = {
        driveFiles,
        docs: docs.map(doc => ({
          id: doc.id,
          title: doc.name,
          documentId: doc.id,
          webViewLink: doc.webViewLink,
          createdTime: doc.createdTime,
          modifiedTime: doc.modifiedTime,
          lastModifiedBy: doc.lastModifyingUser?.displayName || doc.lastModifyingUser?.emailAddress
        })),
        sheets: sheets.map(sheet => ({
          id: sheet.id,
          title: sheet.name,
          spreadsheetId: sheet.id,
          webViewLink: sheet.webViewLink,
          createdTime: sheet.createdTime,
          modifiedTime: sheet.modifiedTime,
          lastModifiedBy: sheet.lastModifyingUser?.displayName || sheet.lastModifyingUser?.emailAddress
        })),
        slides: slides.map(slide => ({
          id: slide.id,
          title: slide.name,
          presentationId: slide.id,
          webViewLink: slide.webViewLink,
          createdTime: slide.createdTime,
          modifiedTime: slide.modifiedTime,
          lastModifiedBy: slide.lastModifyingUser?.displayName || slide.lastModifyingUser?.emailAddress
        })),
        meetRecordings
      };

      // Calculate total items
      const itemCount =
        driveFiles.length +
        meetRecordings.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.GOOGLE_WORKSPACE,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.GOOGLE_WORKSPACE,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Google Workspace Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error: any) {
      console.error('[Google Workspace Tool] Error fetching activity:', error);

      // Log failed fetch
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.GOOGLE_WORKSPACE,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Failed to fetch Google Workspace activity'
      };
    }
  }

  /**
   * Fetch Drive files within date range
   * @param drive Google Drive API instance
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of Drive files
   */
  private async fetchDriveFiles(
    drive: any,
    startDate: Date,
    endDate: Date
  ): Promise<GoogleWorkspaceActivity['driveFiles']> {
    try {
      // Build query for files modified in date range
      const query = `modifiedTime >= '${startDate.toISOString()}' and modifiedTime <= '${endDate.toISOString()}' and trashed = false`;

      console.log('[Google Workspace Tool] Fetching Drive files with query:', query);
      console.log('[Google Workspace Tool] Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      const response = await drive.files.list({
        q: query,
        pageSize: 100,
        orderBy: 'modifiedTime desc',
        fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, createdTime, modifiedTime, size, starred, owners, lastModifyingUser, shared)'
      });

      const files = response.data.files || [];

      console.log('[Google Workspace Tool] Drive API returned', files.length, 'files');
      if (files.length > 0) {
        console.log('[Google Workspace Tool] Sample files:', files.slice(0, 3).map((f: any) => ({ name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime })));
      }

      return files.map((file: any) => ({
        id: file.id || '',
        name: file.name || 'Untitled',
        mimeType: file.mimeType || '',
        webViewLink: file.webViewLink || '',
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        createdTime: file.createdTime || '',
        modifiedTime: file.modifiedTime || '',
        size: file.size,
        starred: file.starred || false,
        owners: file.owners || [],
        lastModifyingUser: file.lastModifyingUser,
        shared: file.shared || false
      }));
    } catch (error: any) {
      console.error('[Google Workspace Tool] Error fetching Drive files:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch Google Meet recordings from Drive
   * @param drive Google Drive API instance
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of Meet recordings
   */
  private async fetchMeetRecordings(
    drive: any,
    startDate: Date,
    endDate: Date
  ): Promise<GoogleWorkspaceActivity['meetRecordings']> {
    try {
      // Query for Meet recordings (usually stored in specific folders with video MIME types)
      const query = `modifiedTime >= '${startDate.toISOString()}' and modifiedTime <= '${endDate.toISOString()}' and (mimeType contains 'video' or name contains 'Meet recording') and trashed = false`;

      const response = await drive.files.list({
        q: query,
        pageSize: 50,
        orderBy: 'modifiedTime desc',
        fields: 'files(id, name, mimeType, webViewLink, createdTime, size, videoMediaMetadata)'
      });

      const recordings = response.data.files || [];

      return recordings.map((recording: any) => ({
        id: recording.id || '',
        name: recording.name || 'Untitled Recording',
        mimeType: recording.mimeType || '',
        webViewLink: recording.webViewLink || '',
        createdTime: recording.createdTime || '',
        duration: recording.videoMediaMetadata?.durationMillis ?
          `${Math.floor(recording.videoMediaMetadata.durationMillis / 1000)}s` : undefined,
        size: recording.size
      }));
    } catch (error: any) {
      console.error('[Google Workspace Tool] Error fetching Meet recordings:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch Calendar events (for context about meetings)
   * @param calendar Google Calendar API instance
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of calendar events
   */
  private async fetchCalendarEvents(
    calendar: any,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error: any) {
      console.error('[Google Workspace Tool] Error fetching calendar events:', error);
      // Calendar events are optional, don't throw
      return [];
    }
  }
}
