import axios, { AxiosInstance } from 'axios';
import { MCPToolType, SlackActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Slack MCP Tool - Fetches user activity from Slack
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class SlackTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private slackApi: AxiosInstance;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();

    // Initialize Slack API client
    this.slackApi = axios.create({
      baseURL: 'https://slack.com/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch Slack activity for a user
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<SlackActivity>> {
    try {
      // Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.SLACK);
      if (!accessToken) {
        return {
          success: false,
          error: 'Slack not connected. Please connect your Slack account first.'
        };
      }

      // Set authorization header
      this.slackApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Calculate date range (default: last 7 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Convert dates to Unix timestamps for Slack API
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      // Fetch different types of activity
      const [userInfo, channels, messages, threads] = await Promise.all([
        this.fetchUserInfo(),
        this.fetchChannels(),
        this.fetchRecentMessages(startTimestamp, endTimestamp),
        this.fetchActiveThreads(startTimestamp, endTimestamp)
      ]);

      // Compile activity data
      const activity: SlackActivity = {
        messages,
        threads,
        channels
      };

      // Calculate total items
      const itemCount = messages.length + threads.length;

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.SLACK,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.SLACK,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Slack Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error: any) {
      console.error('[Slack Tool] Error fetching activity:', error);

      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.SLACK,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch Slack activity'
      };
    }
  }

  /**
   * Fetch user information
   */
  private async fetchUserInfo(): Promise<any> {
    try {
      const response = await this.slackApi.get('/users.identity');
      if (response.data.ok) {
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error('[Slack Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch channels user is a member of
   */
  private async fetchChannels(): Promise<any[]> {
    try {
      const response = await this.slackApi.get('/conversations.list', {
        params: {
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 100
        }
      });

      if (!response.data.ok) {
        return [];
      }

      return response.data.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        isMember: channel.is_member,
        topic: channel.topic?.value || '',
        purpose: channel.purpose?.value || '',
        memberCount: channel.num_members
      }));
    } catch (error) {
      console.error('[Slack Tool] Error fetching channels:', error);
      return [];
    }
  }

  /**
   * Fetch recent messages sent by the user
   */
  private async fetchRecentMessages(startTimestamp: number, endTimestamp: number): Promise<any[]> {
    try {
      // Get user's ID first
      const userResponse = await this.slackApi.get('/auth.test');
      if (!userResponse.data.ok) {
        return [];
      }
      const currentUserId = userResponse.data.user_id;

      // Search for messages from the user
      const response = await this.slackApi.get('/search.messages', {
        params: {
          query: `from:${currentUserId}`,
          sort: 'timestamp',
          sort_dir: 'desc',
          count: 50
        }
      });

      if (!response.data.ok || !response.data.messages) {
        return [];
      }

      // Filter messages by date range and format
      return response.data.messages.matches
        .filter((msg: any) => {
          const timestamp = parseFloat(msg.ts);
          return timestamp >= startTimestamp && timestamp <= endTimestamp;
        })
        .map((msg: any) => ({
          id: msg.ts,
          text: msg.text,
          channel: msg.channel?.name || 'Unknown',
          channelId: msg.channel?.id,
          timestamp: msg.ts,
          date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          permalink: msg.permalink,
          reactions: msg.reactions?.length || 0
        }));
    } catch (error) {
      console.error('[Slack Tool] Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Fetch active threads the user is participating in
   */
  private async fetchActiveThreads(startTimestamp: number, endTimestamp: number): Promise<any[]> {
    try {
      // Get channels first
      const channelsResponse = await this.slackApi.get('/conversations.list', {
        params: {
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 20
        }
      });

      if (!channelsResponse.data.ok) {
        return [];
      }

      const threads: any[] = [];

      // For each channel, get recent threads
      for (const channel of channelsResponse.data.channels.slice(0, 10)) {
        try {
          const historyResponse = await this.slackApi.get('/conversations.history', {
            params: {
              channel: channel.id,
              oldest: startTimestamp,
              latest: endTimestamp,
              limit: 10
            }
          });

          if (historyResponse.data.ok && historyResponse.data.messages) {
            // Filter for messages with threads
            const threadMessages = historyResponse.data.messages.filter((msg: any) => msg.thread_ts && msg.reply_count > 0);

            for (const thread of threadMessages.slice(0, 3)) {
              // Get thread replies
              const repliesResponse = await this.slackApi.get('/conversations.replies', {
                params: {
                  channel: channel.id,
                  ts: thread.thread_ts
                }
              });

              if (repliesResponse.data.ok) {
                threads.push({
                  id: thread.thread_ts,
                  channelId: channel.id,
                  channelName: channel.name,
                  originalMessage: thread.text,
                  replyCount: thread.reply_count || 0,
                  participants: thread.reply_users_count || 0,
                  lastReply: thread.latest_reply,
                  timestamp: thread.ts
                });
              }
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          // Continue with next channel if one fails
          continue;
        }
      }

      return threads;
    } catch (error) {
      console.error('[Slack Tool] Error fetching threads:', error);
      return [];
    }
  }

  /**
   * Generate journal content from Slack activity
   */
  public generateJournalContent(activity: SlackActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const messageCount = activity.messages.length;
    const threadCount = activity.threads.length;
    const activeChannels = new Set([
      ...activity.messages.map(m => m.channel),
      ...activity.threads.map(t => t.channelName)
    ]);

    // Generate title
    let title = 'Slack Communication Activity';
    if (messageCount > 0 && threadCount > 0) {
      title = `Active in ${activeChannels.size} Slack channels`;
    } else if (messageCount > 0) {
      title = `Sent ${messageCount} message${messageCount > 1 ? 's' : ''} in Slack`;
    } else if (threadCount > 0) {
      title = `Participated in ${threadCount} Slack thread${threadCount > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (messageCount > 0) {
      descriptionParts.push(
        `Sent ${messageCount} message${messageCount > 1 ? 's' : ''} across ${activeChannels.size} channel${activeChannels.size > 1 ? 's' : ''}.`
      );
    }

    if (threadCount > 0) {
      const totalReplies = activity.threads.reduce((sum, thread) => sum + thread.replyCount, 0);
      descriptionParts.push(
        `Engaged in ${threadCount} discussion thread${threadCount > 1 ? 's' : ''} with ${totalReplies} total replies.`
      );
    }

    // List active channels
    if (activeChannels.size > 0) {
      descriptionParts.push(`Active channels: ${Array.from(activeChannels).slice(0, 5).join(', ')}${activeChannels.size > 5 ? ', and more' : ''}.`);
    }

    // Mention reactions if any
    const totalReactions = activity.messages.reduce((sum, msg) => sum + msg.reactions, 0);
    if (totalReactions > 0) {
      descriptionParts.push(`Received ${totalReactions} reaction${totalReactions > 1 ? 's' : ''} on messages.`);
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add significant messages as artifacts
    activity.messages.slice(0, 3).forEach(message => {
      artifacts.push({
        type: 'message',
        title: `Message in #${message.channel}`,
        description: message.text.substring(0, 100) + (message.text.length > 100 ? '...' : ''),
        url: message.permalink,
        metadata: {
          channel: message.channel,
          timestamp: message.date,
          reactions: message.reactions
        }
      });
    });

    // Add active threads as artifacts
    activity.threads.slice(0, 2).forEach(thread => {
      artifacts.push({
        type: 'thread',
        title: `Thread in #${thread.channelName}`,
        description: `${thread.replyCount} replies with ${thread.participants} participants`,
        metadata: {
          originalMessage: thread.originalMessage?.substring(0, 100),
          replyCount: thread.replyCount,
          lastReply: thread.lastReply
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