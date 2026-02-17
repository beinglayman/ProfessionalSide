import axios, { AxiosInstance } from 'axios';
import { MCPToolType, OutlookActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Outlook MCP Tool - Fetches user activity from Microsoft Outlook/Office 365
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class OutlookTool {
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
   * Fetch Outlook activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<OutlookActivity>> {
    try {
      // Get access token
      const accessToken = await oauthService.getAccessToken(userId, MCPToolType.OUTLOOK);
      if (!accessToken) {
        return {
          success: false,
          error: 'Outlook not connected. Please connect your Outlook account first.'
        };
      }

      // Set authorization header
      this.graphApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 7 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch meetings, emails, and user info
      const [meetings, emails, userInfo] = await Promise.all([
        this.fetchMeetings(startDate, endDate),
        this.fetchEmails(startDate, endDate),
        this.fetchUserInfo()
      ]);

      // Compile activity data
      const activity: OutlookActivity = {
        meetings,
        emails
      };

      // Calculate total items
      const itemCount = meetings.length + emails.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.OUTLOOK,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.OUTLOOK,
        itemCount,
        sessionId,
        true
      );

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        currentUser: {
          id: userInfo?.id,
          displayName: userInfo?.displayName,
          email: userInfo?.mail,
          userPrincipalName: userInfo?.userPrincipalName
        }
      };
    } catch (error: any) {
      console.error('[Outlook Tool] Error fetching activity:', error);
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.OUTLOOK,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch Outlook activity'
      };
    }
  }

  /**
   * Fetch calendar meetings
   */
  private async fetchMeetings(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const response = await this.graphApi.get('/me/calendarview', {
        params: {
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          $select: 'subject,start,end,attendees,isOrganizer,importance,body',
          $orderby: 'start/dateTime',
          $top: 50
        }
      });

      return response.data.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        startTime: event.start.dateTime,
        endTime: event.end.dateTime,
        attendees: event.attendees?.map((a: any) => a.emailAddress.name) || [],
        isOrganizer: event.isOrganizer,
        importance: event.importance,
        bodyPreview: event.bodyPreview
      }));
    } catch (error) {
      console.error('[Outlook Tool] Error fetching meetings:', error);
      return [];
    }
  }

  /**
   * Fetch recent emails
   */
  private async fetchEmails(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const filter = `receivedDateTime ge ${startDate.toISOString()} and receivedDateTime le ${endDate.toISOString()}`;

      const response = await this.graphApi.get('/me/messages', {
        params: {
          $filter: filter,
          $select: 'subject,sender,receivedDateTime,hasAttachments,importance,bodyPreview',
          $orderby: 'receivedDateTime desc',
          $top: 30
        }
      });

      return response.data.value.map((email: any) => ({
        id: email.id,
        subject: email.subject,
        sender: email.sender?.emailAddress?.name || 'Unknown',
        receivedAt: email.receivedDateTime,
        hasAttachments: email.hasAttachments,
        importance: email.importance,
        preview: email.bodyPreview?.substring(0, 200)
      }));
    } catch (error) {
      console.error('[Outlook Tool] Error fetching emails:', error);
      return [];
    }
  }

  /**
   * Fetch user information
   */
  private async fetchUserInfo(): Promise<any> {
    try {
      const response = await this.graphApi.get('/me');
      return response.data;
    } catch (error) {
      console.error('[Outlook Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Generate journal content from Outlook activity
   */
  public generateJournalContent(activity: OutlookActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const meetingCount = activity.meetings.length;
    const emailCount = activity.emails.length;

    let title = 'Communication & Meetings Summary';
    if (meetingCount > 0) {
      title = `Attended ${meetingCount} meeting${meetingCount > 1 ? 's' : ''}`;
    }

    const descriptionParts: string[] = [];

    if (meetingCount > 0) {
      const totalMeetingTime = activity.meetings.reduce((sum, meeting) => {
        const duration = (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);
      descriptionParts.push(`Participated in ${meetingCount} meetings (${totalMeetingTime.toFixed(1)} hours total).`);
    }

    if (emailCount > 0) {
      const importantEmails = activity.emails.filter(e => e.importance === 'high').length;
      descriptionParts.push(`Received ${emailCount} emails${importantEmails > 0 ? ` (${importantEmails} high priority)` : ''}.`);
    }

    const artifacts = activity.meetings.slice(0, 5).map(meeting => ({
      type: 'meeting',
      title: meeting.subject,
      description: `${new Date(meeting.startTime).toLocaleString()} - ${meeting.attendees.length} attendees`,
      metadata: {
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        attendees: meeting.attendees
      }
    }));

    return {
      title,
      description: descriptionParts.join(' '),
      artifacts
    };
  }
}