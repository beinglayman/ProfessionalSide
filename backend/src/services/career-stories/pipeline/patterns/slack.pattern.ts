/**
 * Slack Pattern
 *
 * Extracts:
 * - Channel URLs: slack.com/archives/{channelId}
 *
 * Real-world sources:
 * - Meeting notes: "Discussion in slack channel"
 * - Jira comments: "See thread at slack.com/archives/..."
 *
 * Note: Channel names (#channel) are NOT extracted due to high
 * false positive rate (# is used in many other contexts).
 */

import { RefPattern } from '../types';

/**
 * Slack Channel URL Pattern
 * Matches: slack.com/archives/{channelId} or slack.com/client/{team}/{channel}
 */
export const slackChannelUrlPattern: RefPattern = {
  id: 'slack-channel-url-v1',
  name: 'Slack Channel URL',
  version: 1,
  description: 'Slack channel IDs from URLs',
  regex: /slack\.com\/(?:archives|client\/[^\/]+)\/([A-Z0-9]+)/gi,
  toolType: 'slack',
  confidence: 'high',

  normalizeMatch: (match) => `slack:${match[1].toUpperCase()}`,

  examples: [
    // Archives URL
    {
      input: 'https://acme.slack.com/archives/C01234ABCDE',
      expectedRef: 'slack:C01234ABCDE',
    },

    // Client URL
    {
      input: 'https://app.slack.com/client/T12345/C01234ABCDE',
      expectedRef: 'slack:C01234ABCDE',
    },

    // In meeting notes
    {
      input: 'See thread: https://acme.slack.com/archives/C0PLATFORM/p1234567890',
      expectedRef: 'slack:C0PLATFORM',
      source: 'outlook',
    },
  ],

  negativeExamples: [
    'https://slack.com/features',  // Marketing page
    '#general',                     // Channel name (too many false positives)
  ],
};

// =============================================================================
// RAW DATA PATTERNS
// These match structured IDs in JSON rawData from API responses.
//
// Why rawData patterns?
// When activities are fetched from Slack APIs, the response includes structured
// fields like `channelId` that aren't in URLs. We JSON.stringify the rawData
// and match these fields as text patterns.
//
// Trade-off: Parsing JSON as text is less precise than proper parsing, but it's
// simpler and handles nested structures automatically. Marked as "medium" confidence.
// =============================================================================

/**
 * Slack channelId from JSON rawData
 * Matches channelId field in API responses (C-prefixed IDs)
 */
export const slackRawDataPattern: RefPattern = {
  id: 'slack-rawdata-v1',
  name: 'Slack Raw Data ID',
  version: 1,
  description: 'Slack channelId from JSON rawData',
  regex: /"channelId"\s*:\s*"(C[A-Z0-9]{8,})"/g,
  toolType: 'slack',
  confidence: 'medium',  // Medium: parsing JSON as text

  normalizeMatch: (match) => `slack:${match[1]}`,

  examples: [
    {
      input: '{"channelId": "C0ENGINEERING", "channelName": "engineering"}',
      expectedRef: 'slack:C0ENGINEERING',
      source: 'slack-rawdata',
    },
    {
      input: '{"channelId":"C01234ABCDE","messageTs":"123456"}',
      expectedRef: 'slack:C01234ABCDE',
      source: 'slack-rawdata',
    },
  ],

  negativeExamples: [
    '{"channelId": "general"}',  // Not a channel ID format (no C prefix)
    '{"channelId": "C123"}',     // Too short
  ],
};
