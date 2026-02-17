import axios, { AxiosInstance } from 'axios';
import { MCPToolType, ZoomActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Zoom MCP Tool - Fetches meeting and recording activity from Zoom
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class ZoomTool {
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private zoomApi: AxiosInstance;

  constructor() {
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();

    // Initialize Zoom API client
    this.zoomApi = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch Zoom activity for a user
   * @param userId User ID
   * @param dateRange Date range to fetch activity for
   * @returns Zoom activity data (memory-only)
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<ZoomActivity>> {
    try {
      // Get access token
      const accessToken = await oauthService.getAccessToken(userId, MCPToolType.ZOOM);
      if (!accessToken) {
        return {
          success: false,
          error: 'Zoom not connected. Please connect your Zoom account first.'
        };
      }

      // Set authorization header
      this.zoomApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 7 days for meetings, 30 days for recordings)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch different types of activity in parallel
      const [userInfo, pastMeetings, upcomingMeetings, recordings] = await Promise.all([
        this.fetchUserInfo(),
        this.fetchPastMeetings(startDate, endDate),
        this.fetchUpcomingMeetings(),
        this.fetchRecordings(startDate, endDate)
      ]);

      // Compile activity data
      const activity: ZoomActivity = {
        meetings: pastMeetings,
        upcomingMeetings,
        recordings
      };

      // Calculate total items
      const itemCount =
        pastMeetings.length +
        upcomingMeetings.length +
        recordings.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.ZOOM,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.ZOOM,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Zoom Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error: any) {
      console.error('[Zoom Tool] Error fetching activity:', error);

      // Log failed fetch
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.ZOOM,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch Zoom activity'
      };
    }
  }

  /**
   * Fetch user information
   * @returns User information
   */
  private async fetchUserInfo(): Promise<any> {
    try {
      const response = await this.zoomApi.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('[Zoom Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch past meetings within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of past meetings
   */
  private async fetchPastMeetings(startDate: Date, endDate: Date): Promise<ZoomActivity['meetings']> {
    try {
      const response = await this.zoomApi.get('/users/me/meetings', {
        params: {
          type: 'previous_meetings',
          page_size: 100,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      });

      const meetings = response.data.meetings || [];

      return meetings.map((meeting: any) => ({
        id: meeting.id?.toString() || '',
        uuid: meeting.uuid || '',
        topic: meeting.topic || 'Untitled Meeting',
        type: meeting.type || 2,
        startTime: meeting.start_time || '',
        duration: meeting.duration || 0,
        timezone: meeting.timezone,
        hostId: meeting.host_id,
        hostEmail: meeting.host_email,
        participantsCount: meeting.participants_count,
        joinUrl: meeting.join_url
      }));
    } catch (error: any) {
      console.error('[Zoom Tool] Error fetching past meetings:', error);
      if (error.response?.status === 404) {
        // No meetings found is not an error
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch upcoming meetings
   * @returns Array of upcoming meetings
   */
  private async fetchUpcomingMeetings(): Promise<ZoomActivity['upcomingMeetings']> {
    try {
      const response = await this.zoomApi.get('/users/me/meetings', {
        params: {
          type: 'upcoming',
          page_size: 100
        }
      });

      const meetings = response.data.meetings || [];

      return meetings.map((meeting: any) => ({
        id: meeting.id?.toString() || '',
        uuid: meeting.uuid || '',
        topic: meeting.topic || 'Untitled Meeting',
        type: meeting.type || 2,
        startTime: meeting.start_time || '',
        duration: meeting.duration || 0,
        timezone: meeting.timezone,
        joinUrl: meeting.join_url,
        agenda: meeting.agenda
      }));
    } catch (error: any) {
      console.error('[Zoom Tool] Error fetching upcoming meetings:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch cloud recordings within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of recordings
   */
  private async fetchRecordings(startDate: Date, endDate: Date): Promise<ZoomActivity['recordings']> {
    try {
      const response = await this.zoomApi.get('/users/me/recordings', {
        params: {
          page_size: 100,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      });

      const meetings = response.data.meetings || [];

      return meetings.map((meeting: any) => ({
        id: meeting.id?.toString() || '',
        meetingId: meeting.id?.toString() || '',
        recordingStart: meeting.recording_start || meeting.start_time || '',
        recordingEnd: meeting.recording_end || '',
        duration: meeting.duration || 0,
        totalSize: meeting.total_size || 0,
        recordingCount: meeting.recording_count || 0,
        shareUrl: meeting.share_url,
        topic: meeting.topic || 'Untitled Meeting',
        recordingFiles: (meeting.recording_files || []).map((file: any) => ({
          id: file.id || '',
          recordingType: file.recording_type || '',
          fileType: file.file_type || '',
          fileSize: file.file_size || 0,
          downloadUrl: file.download_url,
          playUrl: file.play_url
        }))
        // Note: Transcript fetching requires additional API call per recording
        // Implement on-demand if needed to avoid rate limiting
      }));
    } catch (error: any) {
      console.error('[Zoom Tool] Error fetching recordings:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch transcript for a specific recording (optional, on-demand)
   * @param meetingId Meeting ID
   * @returns Transcript data
   */
  private async fetchTranscript(meetingId: string): Promise<ZoomActivity['recordings'][0]['transcript'] | undefined> {
    try {
      const response = await this.zoomApi.get(`/meetings/${meetingId}/recordings/transcript`);

      return {
        id: response.data.id || '',
        meetingId: meetingId,
        transcript: response.data.transcript || '',
        vttUrl: response.data.vtt_url
      };
    } catch (error: any) {
      console.error(`[Zoom Tool] Error fetching transcript for meeting ${meetingId}:`, error);
      return undefined;
    }
  }
}
