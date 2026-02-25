import axios, { AxiosInstance } from 'axios';
import { MCPToolType, TeamsActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Microsoft Teams MCP Tool - Fetches user activity from Microsoft Teams
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class TeamsTool {
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
   * Fetch Teams activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<TeamsActivity>> {
    try {
      // Get access token (can use either TEAMS or OUTLOOK token as both use Microsoft Graph)
      let accessToken = await oauthService.getAccessToken(userId, MCPToolType.TEAMS);

      // Fallback to Outlook token if Teams not connected (same Microsoft account)
      if (!accessToken) {
        accessToken = await oauthService.getAccessToken(userId, MCPToolType.OUTLOOK);
      }

      if (!accessToken) {
        return {
          success: false,
          error: 'Microsoft Teams not connected. Please connect your Microsoft account first.'
        };
      }

      // Set authorization header
      this.graphApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 7 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch different types of activity
      const [joinedTeams, chats, userInfo] = await Promise.all([
        this.fetchJoinedTeams(),
        this.fetchChats(startDate, endDate),
        this.fetchUserInfo()
      ]);

      // Fetch channels for each team (limited to avoid rate limiting)
      const channels = await this.fetchChannelsForTeams(joinedTeams.slice(0, 5));

      // Fetch recent messages from chats (limit to 20 to avoid rate limiting)
      const chatMessages = await this.fetchChatMessages(chats.slice(0, 20), startDate, endDate);

      // Channel messages require ChannelMessage.Read.All (admin consent) — skip
      const channelMessages: any[] = [];
      console.log(`[Teams Tool] Skipping channel messages (requires admin consent). Found ${channels.length} channels.`);

      if (chatMessages.length === 0 && channelMessages.length === 0) {
        console.warn(`[Teams Tool] WARNING: Zero messages found across ${chats.length} chats and ${channels.length} channels. Possible permission issue or no recent activity in date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      }

      const activity = {
        teams: joinedTeams,
        channels,
        chats,
        chatMessages,
        channelMessages,
        _rawChatCount: chats.length,
        _chatTypes: chats.map((c: any) => c.type),
        _dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
      } as any as TeamsActivity;

      // Calculate total items
      const itemCount = joinedTeams.length + channels.length + chatMessages.length + channelMessages.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.TEAMS,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.TEAMS,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Teams Tool] Fetched ${itemCount} items for user ${userId}`);

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
      console.error('[Teams Tool] Error fetching activity:', error);

      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.TEAMS,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch Teams activity'
      };
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
      console.error('[Teams Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch user's joined teams
   */
  private async fetchJoinedTeams(): Promise<any[]> {
    try {
      const response = await this.graphApi.get('/me/joinedTeams', {
        params: {
          $select: 'id,displayName,description'
        }
      });

      return response.data.value.map((team: any) => ({
        id: team.id,
        name: team.displayName,
        description: team.description || ''
      }));
    } catch (error) {
      console.error('[Teams Tool] Error fetching joined teams:', error);
      return [];
    }
  }

  /**
   * Fetch channels for teams
   */
  private async fetchChannelsForTeams(teams: any[]): Promise<any[]> {
    const allChannels: any[] = [];

    for (const team of teams) {
      try {
        const response = await this.graphApi.get(`/teams/${team.id}/channels`, {
          params: {
            $select: 'id,displayName,description,membershipType'
          }
        });

        const channels = response.data.value.map((channel: any) => ({
          id: channel.id,
          name: channel.displayName,
          description: channel.description,
          teamId: team.id,
          teamName: team.name,
          membershipType: channel.membershipType
        }));

        allChannels.push(...channels);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Teams Tool] Error fetching channels for team ${team.id}:`, error);
        continue;
      }
    }

    return allChannels;
  }

  /**
   * Fetch user's chats
   */
  private async fetchChats(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log(`[Teams Tool] Fetching chats...`);

      const response = await this.graphApi.get('/chats', {
        params: {
          $top: 50
        }
      });

      const rawChats = response.data.value || [];
      console.log(`[Teams Tool] Raw chats from API: ${rawChats.length}, types: ${rawChats.map((c: any) => c.chatType).join(',')}`);

      // Don't filter chats by date — the message-level date filter in
      // fetchChatMessages handles recency. Filtering chats by lastUpdatedDateTime
      // was dropping 1:1 chats whose metadata timestamp didn't match the range.
      return rawChats.map((chat: any) => ({
        id: chat.id,
        topic: chat.topic || 'Untitled chat',
        type: chat.chatType,
        createdAt: chat.createdDateTime,
        lastUpdated: chat.lastUpdatedDateTime
      }));
    } catch (error: any) {
      const errDetail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`[Teams Tool] Error fetching chats: HTTP ${error.response?.status || 'N/A'} — ${errDetail}`);
      return [];
    }
  }

  /**
   * Fetch messages from chats
   */
  private async fetchChatMessages(chats: any[], startDate: Date, endDate: Date): Promise<any[]> {
    const allMessages: any[] = [];

    console.log(`[Teams Tool] Fetching messages from ${chats.length} chats (range: ${startDate.toISOString()} to ${endDate.toISOString()})`);

    for (const chat of chats) {
      try {
        // $select is NOT supported on /chats/{id}/messages (returns HTTP 400)
        // $orderby: 'createdDateTime desc' IS supported per Graph docs
        const response = await this.graphApi.get(`/chats/${chat.id}/messages`, {
          params: {
            $orderby: 'createdDateTime desc',
            $top: 20
          }
        });

        const rawMessages = response.data.value;
        const userMessages = rawMessages.filter((msg: any) => msg.messageType === 'message');
        const dateFiltered = userMessages.filter((msg: any) => {
          const created = new Date(msg.createdDateTime);
          return created >= startDate && created <= endDate;
        });

        console.log(`[Teams Tool] Chat "${chat.topic}" (${chat.type}): ${rawMessages.length} raw → ${userMessages.length} user msgs → ${dateFiltered.length} in range`);

        const messages = dateFiltered.map((msg: any) => ({
            id: msg.id,
            chatId: chat.id,
            chatTopic: chat.topic,
            createdAt: msg.createdDateTime,
            from: msg.from?.user?.displayName || 'Unknown',
            content: msg.body?.content ? this.extractTextFromHtml(msg.body.content) : '',
            importance: msg.importance || 'normal'
          }));

        allMessages.push(...messages);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        const status = error.response?.status;
        const errorBody = error.response?.data?.error?.message || error.response?.data?.message || error.message;
        console.error(`[Teams Tool] FAILED to fetch messages from chat "${chat.topic}" (${chat.id}): HTTP ${status || 'N/A'} — ${errorBody}`);
        continue;
      }
    }

    console.log(`[Teams Tool] Total chat messages found: ${allMessages.length}`);
    return allMessages;
  }

  /**
   * Fetch messages from channels
   */
  private async fetchChannelMessages(channels: any[], startDate: Date, endDate: Date): Promise<any[]> {
    const allMessages: any[] = [];

    console.log(`[Teams Tool] Fetching channel messages from ${channels.length} channels`);

    for (const channel of channels) {
      try {
        // Avoid $filter on channel messages — not reliably supported in Graph v1.0
        const response = await this.graphApi.get(`/teams/${channel.teamId}/channels/${channel.id}/messages`, {
          params: {
            $select: 'id,createdDateTime,from,body,importance,messageType,replies',
            $top: 25,
            $orderby: 'createdDateTime desc'
          }
        });

        const messages = response.data.value
          .filter((msg: any) => msg.messageType === 'message')
          .filter((msg: any) => {
            const created = new Date(msg.createdDateTime);
            return created >= startDate && created <= endDate;
          })
          .map((msg: any) => ({
            id: msg.id,
            channelId: channel.id,
            channelName: channel.name,
            teamName: channel.teamName,
            createdAt: msg.createdDateTime,
            from: msg.from?.user?.displayName || 'Unknown',
            content: msg.body?.content ? this.extractTextFromHtml(msg.body.content) : '',
            importance: msg.importance || 'normal',
            replyCount: msg.replies?.length || 0
          }));

        if (messages.length > 0) {
          console.log(`[Teams Tool] Found ${messages.length} messages in channel ${channel.name}`);
        }

        allMessages.push(...messages);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        // Some channels might not be accessible or ChannelMessage.Edit may restrict access
        console.log(`[Teams Tool] Could not fetch messages from channel ${channel.name}: ${error.message}`);
        continue;
      }
    }

    console.log(`[Teams Tool] Total user channel messages found: ${allMessages.length}`);
    return allMessages;
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextFromHtml(html: string): string {
    // Remove HTML tags and decode entities
    const text = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to 500 characters
    return text.length > 500 ? text.substring(0, 500) + '...' : text;
  }

  /**
   * Generate journal content from Teams activity
   */
  public generateJournalContent(activity: TeamsActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const teamCount = activity.teams.length;
    const channelCount = activity.channels.length;
    const chatMessageCount = activity.chatMessages.length;
    const channelMessageCount = activity.channelMessages.length;

    // Generate title
    let title = 'Microsoft Teams Activity';
    if (teamCount > 0) {
      title = `Active in ${teamCount} team${teamCount > 1 ? 's' : ''}`;
    }
    if (chatMessageCount > 0 || channelMessageCount > 0) {
      const totalMessages = chatMessageCount + channelMessageCount;
      title = `${totalMessages} Teams interactions across ${teamCount} team${teamCount > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (teamCount > 0) {
      const teamNames = activity.teams.slice(0, 3).map(t => t.name).join(', ');
      descriptionParts.push(
        `Member of ${teamCount} team${teamCount > 1 ? 's' : ''}: ${teamNames}${teamCount > 3 ? ', and more' : ''}.`
      );
    }

    if (channelCount > 0) {
      descriptionParts.push(
        `Participating in ${channelCount} channel${channelCount > 1 ? 's' : ''} across teams.`
      );
    }

    if (chatMessageCount > 0) {
      const uniqueChats = new Set(activity.chatMessages.map(m => m.chatId)).size;
      descriptionParts.push(
        `Engaged in ${uniqueChats} chat conversation${uniqueChats > 1 ? 's' : ''} with ${chatMessageCount} message${chatMessageCount > 1 ? 's' : ''}.`
      );
    }

    if (channelMessageCount > 0) {
      const uniqueChannels = new Set(activity.channelMessages.map(m => m.channelId)).size;
      descriptionParts.push(
        `Posted ${channelMessageCount} message${channelMessageCount > 1 ? 's' : ''} in ${uniqueChannels} channel${uniqueChannels > 1 ? 's' : ''}.`
      );
    }

    // Count messages with replies
    const messagesWithReplies = activity.channelMessages.filter(m => m.replyCount > 0);
    if (messagesWithReplies.length > 0) {
      const totalReplies = messagesWithReplies.reduce((sum, m) => sum + m.replyCount, 0);
      descriptionParts.push(
        `Generated ${totalReplies} replies in discussions.`
      );
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add important channel messages as artifacts
    activity.channelMessages
      .filter(msg => msg.importance === 'high' || msg.replyCount > 2)
      .slice(0, 3)
      .forEach(msg => {
        artifacts.push({
          type: 'message',
          title: `Message in ${msg.channelName}`,
          description: msg.content.substring(0, 150),
          metadata: {
            team: msg.teamName,
            from: msg.from,
            replies: msg.replyCount,
            date: msg.createdAt
          }
        });
      });

    // Add active chats as artifacts
    const chatsByTopic = new Map<string, any[]>();
    activity.chatMessages.forEach(msg => {
      if (!chatsByTopic.has(msg.chatTopic)) {
        chatsByTopic.set(msg.chatTopic, []);
      }
      chatsByTopic.get(msg.chatTopic)!.push(msg);
    });

    Array.from(chatsByTopic.entries())
      .slice(0, 2)
      .forEach(([topic, messages]) => {
        artifacts.push({
          type: 'chat',
          title: topic,
          description: `${messages.length} messages in chat`,
          metadata: {
            participants: new Set(messages.map(m => m.from)).size,
            lastMessage: messages[0]?.createdAt
          }
        });
      });

    // Add teams as artifacts
    activity.teams.slice(0, 2).forEach(team => {
      const teamChannels = activity.channels.filter(c => c.teamId === team.id);
      artifacts.push({
        type: 'team',
        title: team.name,
        description: team.description || `Team with ${teamChannels.length} channels`,
        metadata: {
          channels: teamChannels.length,
          channelNames: teamChannels.slice(0, 3).map(c => c.name)
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