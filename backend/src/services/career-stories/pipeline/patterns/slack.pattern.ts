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
