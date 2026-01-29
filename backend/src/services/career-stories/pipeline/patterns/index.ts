/**
 * Pattern Index
 *
 * All extraction patterns exported from here.
 * Add new patterns by:
 * 1. Create pattern file in this directory
 * 2. Export from this index
 * 3. Register in PatternRegistry
 */

// Constants
export * from './constants';

// Patterns
export { jiraTicketPattern } from './jira.pattern';
export { githubRefPattern, githubUrlPattern } from './github.pattern';
export { confluencePagePattern, confluenceRawDataPattern } from './confluence.pattern';
export { figmaUrlPattern, figmaRawDataPattern } from './figma.pattern';
export { slackChannelUrlPattern, slackRawDataPattern } from './slack.pattern';
export {
  googleDocsPattern,
  googleSheetsPattern,
  googleSlidesPattern,
  googleDriveFilePattern,
  googleDriveFolderPattern,
  googleMeetPattern,
  googleCalendarPattern,
  // Raw data patterns
  googleDocsRawDataPattern,
  googleMeetRawDataPattern,
} from './google.pattern';
