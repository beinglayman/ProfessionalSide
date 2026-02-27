/**
 * Outlook Activity Transformer
 *
 * Transforms Outlook MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * Handles two activity types:
 * - Meetings (calendar events) — subjects often contain Jira keys, project refs
 * - Emails — bodyPreview may contain cross-tool refs (PR links, ticket keys)
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

/**
 * Transform Outlook activity data into ActivityInput array
 */
export function transformOutlookActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform calendar meetings
  if (data.meetings?.length) {
    for (const meeting of data.meetings) {
      const attendeeCount = meeting.attendees?.length || 0;
      const subject = meeting.subject || 'Untitled Meeting';

      activities.push({
        source: 'outlook',
        sourceId: `meeting:${meeting.id}`,
        sourceUrl: null,
        title: `Meeting: ${subject}`,
        description: [
          `${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}`,
          meeting.isOrganizer ? 'you organized' : null,
        ]
          .filter(Boolean)
          .join(', '),
        timestamp: new Date(meeting.startTime || meeting.start?.dateTime || new Date()),
        rawData: {
          type: 'meeting',
          subject,
          startTime: meeting.startTime || meeting.start?.dateTime,
          endTime: meeting.endTime || meeting.end?.dateTime,
          attendeeCount,
          isOrganizer: meeting.isOrganizer || false,
          importance: meeting.importance,
        },
      });
    }
  }

  // Transform emails
  if (data.emails?.length) {
    for (const email of data.emails) {
      const subject = email.subject || 'No Subject';
      const sender = email.sender?.emailAddress?.name || email.sender || 'Unknown';

      activities.push({
        source: 'outlook',
        sourceId: `email:${email.id}`,
        sourceUrl: null,
        title: `Email: ${subject}`,
        description: email.bodyPreview || '',
        timestamp: new Date(email.receivedAt || email.receivedDateTime || new Date()),
        rawData: {
          type: 'email',
          subject,
          sender,
          hasAttachments: email.hasAttachments || false,
          importance: email.importance,
        },
      });
    }
  }

  return activities;
}
