/**
 * Pattern Constants
 *
 * Centralized constants for pattern matching to avoid magic numbers.
 * These values are based on actual ID formats from each service's API.
 */

/**
 * Google document/file IDs are base64url-encoded and typically 25-44 characters.
 * We use 25 as minimum to avoid false positives from short strings.
 *
 * @see https://developers.google.com/drive/api/guides/about-files
 */
export const GOOGLE_ID_MIN_LENGTH = 25;

/**
 * Confluence page IDs are numeric and typically 5+ digits.
 * Shorter numbers are more likely to be false positives (e.g., "page 123").
 */
export const CONFLUENCE_PAGE_ID_MIN_LENGTH = 5;

/**
 * Slack channel IDs start with 'C' followed by alphanumeric characters.
 * Minimum 8 characters after the prefix to avoid false positives.
 *
 * @see https://api.slack.com/types/channel
 */
export const SLACK_CHANNEL_ID_MIN_LENGTH = 8;

/**
 * Figma file keys are alphanumeric strings, typically 10+ characters.
 *
 * @see https://www.figma.com/developers/api
 */
export const FIGMA_FILE_KEY_MIN_LENGTH = 10;

/**
 * Ref prefixes for normalized references.
 * Using prefixes ensures refs are unique across tools.
 */
export const REF_PREFIXES = {
  // Jira tickets don't need a prefix - they're already unique (e.g., AUTH-123)

  // Google Workspace
  GOOGLE_DOC: 'gdoc:',
  GOOGLE_SHEET: 'gsheet:',
  GOOGLE_SLIDES: 'gslides:',
  GOOGLE_DRIVE: 'gdrive:',
  GOOGLE_FOLDER: 'gfolder:',
  GOOGLE_MEET: 'gmeet:',
  GOOGLE_CALENDAR: 'gcal:',

  // Atlassian
  CONFLUENCE: 'confluence:',

  // Communication
  SLACK: 'slack:',

  // Design
  FIGMA: 'figma:',

  // GitHub refs use the format "org/repo#123" or "local#123"
} as const;

/**
 * Type for ref prefixes
 */
export type RefPrefix = (typeof REF_PREFIXES)[keyof typeof REF_PREFIXES];
