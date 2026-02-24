/**
 * Teams Activity Transformer
 *
 * Transforms Teams MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * Handles two activity types:
 * - Channel messages — where decisions happen, cross-tool refs are frequent
 * - Chat messages — 1:1 and group coordination context
 *
 * Teams/channels/chats metadata are NOT transformed (no actionable timestamps).
 * Only messages become activities — they carry the content that RefExtractor needs.
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform Teams activity data into ActivityInput array
 */
export function transformTeamsActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform channel messages (highest story value)
  if (data.channelMessages?.length) {
    for (const msg of data.channelMessages) {
      const channelName = msg.channelName || 'unknown-channel';
      const teamName = msg.teamName || 'unknown-team';

      activities.push({
        source: 'teams',
        sourceId: `channel-msg:${msg.channelId || 'unknown'}:${msg.id}`,
        sourceUrl: null,
        title: `Teams message in #${channelName} (${teamName})`,
        description: msg.content || '',
        timestamp: new Date(msg.createdAt || msg.createdDateTime || new Date()),
        rawData: {
          type: 'channel_message',
          channelName,
          teamName,
          from: msg.from,
          importance: msg.importance,
          replyCount: msg.replyCount || 0,
        },
      });
    }
  }

  // Transform chat messages (medium story value)
  if (data.chatMessages?.length) {
    for (const msg of data.chatMessages) {
      const topicSuffix = msg.chatTopic ? `: ${msg.chatTopic}` : '';

      activities.push({
        source: 'teams',
        sourceId: `chat-msg:${msg.chatId || 'unknown'}:${msg.id}`,
        sourceUrl: null,
        title: `Teams chat${topicSuffix}`,
        description: msg.content || '',
        timestamp: new Date(msg.createdAt || msg.createdDateTime || new Date()),
        rawData: {
          type: 'chat_message',
          chatTopic: msg.chatTopic,
          from: msg.from,
          importance: msg.importance,
        },
      });
    }
  }

  return activities;
}
