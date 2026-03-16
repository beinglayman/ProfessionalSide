/**
 * Google Workspace Activity Transformer
 *
 * Transforms Google Workspace MCP tool responses into ActivityInput format
 * for persistence to ToolActivity table.
 *
 * Splits the unified GoogleWorkspaceActivity into granular source types:
 *   docs       → google-docs
 *   sheets     → google-sheets
 *   slides     → google-drive (presentation)
 *   driveFiles → google-drive (excluding docs/sheets/slides)
 *   meetRec.   → google-meet
 *   calendarEvents → google-calendar
 */

import { ActivityInput } from '../../career-stories/activity-persistence.service';

const GOOGLE_APP_MIMETYPES = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
]);

/**
 * Transform Google Workspace activity data into ActivityInput array
 */
export function transformGoogleWorkspaceActivity(data: any): ActivityInput[] {
  const activities: ActivityInput[] = [];

  // Transform Google Docs
  if (data.docs?.length) {
    for (const doc of data.docs) {
      activities.push({
        source: 'google-docs',
        sourceId: `doc:${doc.documentId || doc.id}`,
        sourceUrl: doc.webViewLink || null,
        title: `Edited doc: ${doc.title || 'Untitled'}`,
        description: doc.lastModifiedBy ? `Last edited by ${doc.lastModifiedBy}` : null,
        timestamp: new Date(doc.modifiedTime || doc.createdTime || new Date()),
        rawData: {
          type: 'document',
          id: doc.id,
          documentId: doc.documentId,
          title: doc.title,
          lastModifiedBy: doc.lastModifiedBy,
        },
      });
    }
  }

  // Transform Google Sheets
  if (data.sheets?.length) {
    for (const sheet of data.sheets) {
      activities.push({
        source: 'google-sheets',
        sourceId: `sheet:${sheet.spreadsheetId || sheet.id}`,
        sourceUrl: sheet.webViewLink || null,
        title: `Edited spreadsheet: ${sheet.title || 'Untitled'}`,
        description: sheet.lastModifiedBy ? `Last edited by ${sheet.lastModifiedBy}` : null,
        timestamp: new Date(sheet.modifiedTime || sheet.createdTime || new Date()),
        rawData: {
          type: 'spreadsheet',
          id: sheet.id,
          spreadsheetId: sheet.spreadsheetId,
          title: sheet.title,
          sheetCount: sheet.sheetCount,
          lastModifiedBy: sheet.lastModifiedBy,
        },
      });
    }
  }

  // Transform Google Slides (stored as google-drive with presentation type)
  if (data.slides?.length) {
    for (const slide of data.slides) {
      activities.push({
        source: 'google-drive',
        sourceId: `presentation:${slide.presentationId || slide.id}`,
        sourceUrl: slide.webViewLink || null,
        title: `Edited presentation: ${slide.title || 'Untitled'}`,
        description: slide.lastModifiedBy ? `Last edited by ${slide.lastModifiedBy}` : null,
        timestamp: new Date(slide.modifiedTime || slide.createdTime || new Date()),
        rawData: {
          type: 'presentation',
          id: slide.id,
          presentationId: slide.presentationId,
          title: slide.title,
          slideCount: slide.slideCount,
          lastModifiedBy: slide.lastModifiedBy,
        },
      });
    }
  }

  // Transform Drive files (excluding docs/sheets/slides already handled above)
  if (data.driveFiles?.length) {
    for (const file of data.driveFiles) {
      if (GOOGLE_APP_MIMETYPES.has(file.mimeType)) continue;

      activities.push({
        source: 'google-drive',
        sourceId: `file:${file.id}`,
        sourceUrl: file.webViewLink || null,
        title: `Modified file: ${file.name || 'Untitled'}`,
        description: file.shared ? 'Shared file' : null,
        timestamp: new Date(file.modifiedTime || file.createdTime || new Date()),
        rawData: {
          type: 'drive_file',
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          starred: file.starred,
          shared: file.shared,
        },
      });
    }
  }

  // Transform Meet recordings
  if (data.meetRecordings?.length) {
    for (const recording of data.meetRecordings) {
      // Skip non-video files (e.g. docs/spreadsheets returned by Drive API)
      if (recording.mimeType && !recording.mimeType.startsWith('video/')) {
        continue;
      }
      activities.push({
        source: 'google-meet',
        sourceId: `recording:${recording.id}`,
        sourceUrl: recording.webViewLink || null,
        title: `Meeting recording: ${recording.name || 'Untitled Recording'}`,
        description: recording.duration ? `Duration: ${recording.duration}` : null,
        timestamp: new Date(recording.createdTime || new Date()),
        rawData: {
          type: 'meeting_recording',
          id: recording.id,
          name: recording.name,
          mimeType: recording.mimeType,
          duration: recording.duration,
          size: recording.size,
        },
      });
    }
  }

  // Transform Calendar events
  if (data.calendarEvents?.length) {
    for (const event of data.calendarEvents) {
      activities.push({
        source: 'google-calendar',
        sourceId: `event:${event.id}`,
        sourceUrl: event.htmlLink || null,
        title: event.summary || 'Untitled Event',
        description: event.attendees
          ? `${event.attendees} attendee${event.attendees !== 1 ? 's' : ''}`
          : null,
        timestamp: new Date(event.start || new Date()),
        rawData: {
          type: 'calendar_event',
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
          organizer: event.organizer,
          status: event.status,
          attendees: event.attendees,
        },
      });
    }
  }

  return activities;
}
