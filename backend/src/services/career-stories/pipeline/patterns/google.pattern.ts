/**
 * Google Workspace Patterns
 *
 * Extracts:
 * - Google Docs: docs.google.com/document/d/{id}
 * - Google Sheets: docs.google.com/spreadsheets/d/{id}
 * - Google Slides: docs.google.com/presentation/d/{id}
 * - Google Drive files: drive.google.com/file/d/{id}
 * - Google Drive folders: drive.google.com/drive/folders/{id}
 * - Google Calendar events: calendar.google.com/calendar/event?eid={id}
 * - Google Meet: meet.google.com/{code}
 *
 * Real-world sources:
 * - Jira descriptions: "Design doc: https://docs.google.com/document/d/..."
 * - Meeting notes: "Recording: https://drive.google.com/file/d/..."
 * - Calendar invites: "Join: https://meet.google.com/abc-defg-hij"
 */

import { RefPattern } from '../types';

/**
 * Google Docs Pattern
 * Matches: docs.google.com/document/d/{documentId}
 */
export const googleDocsPattern: RefPattern = {
  id: 'google-docs-v1',
  name: 'Google Docs',
  version: 1,
  description: 'Google Docs document IDs from URLs',
  regex: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]{25,})/g,
  toolType: 'google',
  confidence: 'high',

  normalizeMatch: (match) => `gdoc:${match[1]}`,

  examples: [
    // Standard doc URL
    {
      input: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      expectedRef: 'gdoc:1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    },

    // In Jira description
    {
      input: 'Design doc: https://docs.google.com/document/d/1AbC123_defGHI456-jklMNOpqrs/edit#heading=h.xyz',
      expectedRef: 'gdoc:1AbC123_defGHI456-jklMNOpqrs',
      source: 'jira',
    },

    // Preview URL
    {
      input: 'https://docs.google.com/document/d/1234567890abcdefghijklmnopq/preview',
      expectedRef: 'gdoc:1234567890abcdefghijklmnopq',
    },
  ],

  negativeExamples: [
    'https://docs.google.com/forms/d/123',  // Forms (different product)
    'https://docs.google.com/document/u/0/', // No document ID
  ],
};

/**
 * Google Sheets Pattern
 * Matches: docs.google.com/spreadsheets/d/{spreadsheetId}
 */
export const googleSheetsPattern: RefPattern = {
  id: 'google-sheets-v1',
  name: 'Google Sheets',
  version: 1,
  description: 'Google Sheets spreadsheet IDs from URLs',
  regex: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{25,})/g,
  toolType: 'google',
  confidence: 'high',

  normalizeMatch: (match) => `gsheet:${match[1]}`,

  examples: [
    // Standard sheet URL
    {
      input: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      expectedRef: 'gsheet:1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    },

    // With sheet tab (gid)
    {
      input: 'https://docs.google.com/spreadsheets/d/1AbC123_defGHI456-jklMNOpqrs/edit#gid=0',
      expectedRef: 'gsheet:1AbC123_defGHI456-jklMNOpqrs',
      source: 'jira',
    },
  ],

  negativeExamples: [
    'https://docs.google.com/spreadsheets/',  // No spreadsheet ID
  ],
};

/**
 * Google Slides Pattern
 * Matches: docs.google.com/presentation/d/{presentationId}
 */
export const googleSlidesPattern: RefPattern = {
  id: 'google-slides-v1',
  name: 'Google Slides',
  version: 1,
  description: 'Google Slides presentation IDs from URLs',
  regex: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]{25,})/g,
  toolType: 'google',
  confidence: 'high',

  normalizeMatch: (match) => `gslides:${match[1]}`,

  examples: [
    // Standard presentation URL
    {
      input: 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      expectedRef: 'gslides:1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    },

    // In meeting notes
    {
      input: 'Deck: https://docs.google.com/presentation/d/1AbC123_defGHI456-jklMNOpqrs/edit#slide=id.g123',
      expectedRef: 'gslides:1AbC123_defGHI456-jklMNOpqrs',
      source: 'outlook',
    },
  ],

  negativeExamples: [
    'https://docs.google.com/presentation/',  // No presentation ID
  ],
};

/**
 * Google Drive File Pattern
 * Matches: drive.google.com/file/d/{fileId}
 */
export const googleDriveFilePattern: RefPattern = {
  id: 'google-drive-file-v1',
  name: 'Google Drive File',
  version: 1,
  description: 'Google Drive file IDs from URLs',
  regex: /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{25,})/g,
  toolType: 'google',
  confidence: 'high',

  normalizeMatch: (match) => `gdrive:${match[1]}`,

  examples: [
    // Standard file URL
    {
      input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
      expectedRef: 'gdrive:1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    },

    // Recording link
    {
      input: 'Recording: https://drive.google.com/file/d/1AbC123_defGHI456-jklMNOpqrs/view?usp=sharing',
      expectedRef: 'gdrive:1AbC123_defGHI456-jklMNOpqrs',
      source: 'outlook',
    },
  ],

  negativeExamples: [
    'https://drive.google.com/drive/my-drive',  // Not a specific file
  ],
};

/**
 * Google Drive Folder Pattern
 * Matches: drive.google.com/drive/folders/{folderId}
 */
export const googleDriveFolderPattern: RefPattern = {
  id: 'google-drive-folder-v1',
  name: 'Google Drive Folder',
  version: 1,
  description: 'Google Drive folder IDs from URLs',
  regex: /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]{25,})/g,
  toolType: 'google',
  confidence: 'high',

  normalizeMatch: (match) => `gfolder:${match[1]}`,

  examples: [
    // Standard folder URL
    {
      input: 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      expectedRef: 'gfolder:1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    },

    // Project folder
    {
      input: 'Project files: https://drive.google.com/drive/folders/1AbC123_defGHI456-jklMNOpqrs?usp=drive_link',
      expectedRef: 'gfolder:1AbC123_defGHI456-jklMNOpqrs',
      source: 'confluence',
    },
  ],

  negativeExamples: [
    'https://drive.google.com/drive/my-drive',  // Not a specific folder
  ],
};

/**
 * Google Meet Pattern
 * Matches: meet.google.com/{meeting-code}
 *
 * Meet codes are 3 groups of 3-4 letters separated by hyphens
 */
export const googleMeetPattern: RefPattern = {
  id: 'google-meet-v1',
  name: 'Google Meet',
  version: 1,
  description: 'Google Meet meeting codes from URLs',
  regex: /meet\.google\.com\/([a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4})/gi,
  toolType: 'google',
  confidence: 'high',

  normalizeMatch: (match) => `gmeet:${match[1].toLowerCase()}`,

  examples: [
    // Standard meet URL
    {
      input: 'https://meet.google.com/abc-defg-hij',
      expectedRef: 'gmeet:abc-defg-hij',
    },

    // In calendar invite
    {
      input: 'Join: https://meet.google.com/xyz-uvwx-stu',
      expectedRef: 'gmeet:xyz-uvwx-stu',
      source: 'outlook',
    },

    // Four-letter segments
    {
      input: 'https://meet.google.com/abcd-efgh-ijkl',
      expectedRef: 'gmeet:abcd-efgh-ijkl',
    },
  ],

  negativeExamples: [
    'https://meet.google.com/',  // No meeting code
    'https://meet.google.com/lookup/abc',  // Lookup URL
  ],
};

/**
 * Google Calendar Event Pattern
 * Matches: calendar.google.com/calendar/event?eid={eventId}
 *
 * Note: Calendar event IDs are base64-encoded and can be quite long.
 * Also matches calendar/r/eventedit/{eventId} pattern.
 */
export const googleCalendarPattern: RefPattern = {
  id: 'google-calendar-v1',
  name: 'Google Calendar Event',
  version: 1,
  description: 'Google Calendar event IDs from URLs',
  regex: /calendar\.google\.com\/calendar\/(?:event\?eid=|r\/eventedit\/)([a-zA-Z0-9_=-]+)/g,
  toolType: 'google',
  confidence: 'medium',  // Medium: event IDs are opaque and may not be stable

  normalizeMatch: (match) => `gcal:${match[1]}`,

  examples: [
    // Event URL with eid
    {
      input: 'https://calendar.google.com/calendar/event?eid=NXJqbG1vNnRuYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM',
      expectedRef: 'gcal:NXJqbG1vNnRuYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM',
    },

    // Event edit URL
    {
      input: 'https://calendar.google.com/calendar/r/eventedit/abc123def456ghi789',
      expectedRef: 'gcal:abc123def456ghi789',
    },
  ],

  negativeExamples: [
    'https://calendar.google.com/calendar/',  // No event ID
    'https://calendar.google.com/calendar/r/month',  // View URL, not event
  ],
};

// =============================================================================
// RAW DATA PATTERNS
// These match structured IDs in JSON rawData from API responses.
//
// Why rawData patterns?
// When activities are fetched from APIs (e.g., Google Drive API), the response
// includes structured fields like `documentId` that aren't in URLs. We JSON.stringify
// the rawData and match these fields as text patterns.
//
// Trade-off: Parsing JSON as text is less precise than proper parsing, but it's
// simpler and handles nested structures automatically. Marked as "medium" confidence.
// =============================================================================

/**
 * Google Docs documentId from JSON rawData
 * Matches documentId field in API responses
 *
 * Example rawData: { "documentId": "1AbC123...", "title": "My Doc" }
 */
export const googleDocsRawDataPattern: RefPattern = {
  id: 'google-docs-rawdata-v1',
  name: 'Google Docs Raw Data ID',
  version: 1,
  description: 'Google Docs documentId from JSON rawData',
  regex: /"documentId"\s*:\s*"([a-zA-Z0-9_-]{25,})"/g,
  toolType: 'google',
  confidence: 'medium',  // Medium: parsing JSON as text

  normalizeMatch: (match) => `gdoc:${match[1]}`,

  examples: [
    {
      input: '{"documentId": "1AbC123XYZ456_defGHI789jkl", "title": "Doc"}',
      expectedRef: 'gdoc:1AbC123XYZ456_defGHI789jkl',
      source: 'google-rawdata',
    },
    {
      input: '{"documentId":"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"}',
      expectedRef: 'gdoc:1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      source: 'google-rawdata',
    },
  ],

  negativeExamples: [
    '{"documentId": "short"}',  // Too short
  ],
};

/**
 * Google Meet meetCode from JSON rawData
 * Matches meetCode field in API responses
 */
export const googleMeetRawDataPattern: RefPattern = {
  id: 'google-meet-rawdata-v1',
  name: 'Google Meet Raw Data Code',
  version: 1,
  description: 'Google Meet meetCode from JSON rawData',
  regex: /"meetCode"\s*:\s*"([a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4})"/gi,
  toolType: 'google',
  confidence: 'medium',  // Medium: parsing JSON as text

  normalizeMatch: (match) => `gmeet:${match[1].toLowerCase()}`,

  examples: [
    {
      input: '{"meetCode": "abc-defg-hij", "duration": 45}',
      expectedRef: 'gmeet:abc-defg-hij',
      source: 'google-rawdata',
    },
    {
      input: '{"meetCode":"xyz-uvwx-stu"}',
      expectedRef: 'gmeet:xyz-uvwx-stu',
      source: 'google-rawdata',
    },
  ],

  negativeExamples: [
    '{"meetCode": "invalid"}',  // Wrong format
  ],
};
