/**
 * Jira Ticket Pattern
 *
 * Matches: PROJ-123, AUTH-456, BACKEND-9999
 * Format: 2-10 uppercase letters, hyphen, 1+ digits
 *
 * Real-world sources:
 * - PR titles: "[AUTH-123] Implement feature"
 * - PR bodies: "Closes AUTH-123"
 * - Branch names: "feature/AUTH-123-description"
 * - Confluence pages: "See AUTH-123 for details"
 * - Meeting agendas: "Discuss AUTH-123 blockers"
 */

import { RefPattern } from '../types';

export const jiraTicketPattern: RefPattern = {
  id: 'jira-ticket-v2',
  name: 'Jira Ticket',
  version: 2,
  description: 'Jira ticket keys: 2-10 uppercase letters, hyphen, digits',
  regex: /\b([A-Z]{2,10}-\d+)\b/g,
  toolType: 'jira',
  confidence: 'high',

  normalizeMatch: (match) => match[1],

  examples: [
    // Standard patterns
    { input: 'Fixed bug in AUTH-123', expectedRef: 'AUTH-123' },
    { input: 'Implements PERF-456', expectedRef: 'PERF-456' },
    { input: 'BACKEND-9999 is done', expectedRef: 'BACKEND-9999' },

    // GitHub PR title patterns
    { input: '[AUTH-456] Implement OAuth2 refresh token flow', expectedRef: 'AUTH-456', source: 'github-pr-title' },
    { input: 'feat(auth): AUTH-100 add login', expectedRef: 'AUTH-100', source: 'github-pr-title' },

    // GitHub branch names (uppercase ticket in branch)
    { input: 'feature/AUTH-456-refresh-tokens', expectedRef: 'AUTH-456', source: 'github-branch' },
    { input: 'bugfix/CORE-999-pagination-fix', expectedRef: 'CORE-999', source: 'github-branch' },

    // Jira description with links
    { input: 'Parent epic: PLAT-1000. Blocked by PLAT-1233.', expectedRef: 'PLAT-1000' },
    { input: 'Parent epic: PLAT-1000. Blocked by PLAT-1233.', expectedRef: 'PLAT-1233' },

    // In markdown links
    { input: 'See [AUTH-100](https://jira.com/AUTH-100)', expectedRef: 'AUTH-100', source: 'confluence' },

    // In code blocks
    { input: '```\n# Config for FEAT-123\nkey: value\n```', expectedRef: 'FEAT-123' },

    // With unicode context
    { input: 'Add AUTH-200 support for 日本語 locale', expectedRef: 'AUTH-200' },

    // Multiple tickets
    { input: 'This PR addresses AUTH-123 and AUTH-124', expectedRef: 'AUTH-123' },
    { input: 'This PR addresses AUTH-123 and AUTH-124', expectedRef: 'AUTH-124' },

    // Meeting subjects
    { input: '[AUTH-500] Sprint Planning - Authentication Epic', expectedRef: 'AUTH-500', source: 'outlook' },
  ],

  negativeExamples: [
    'X-123 is too short',           // Single letter prefix (not valid Jira)
    'auth-123 lowercase',           // Must be uppercase
    'Bump version to 2.0.0',        // Version numbers
    'V2.0.0-beta',                  // Version with prefix
    // Note: SHA-256 WILL match (3 uppercase + hyphen + digits) - this is acceptable false positive
    // Note: US-ASCII would match too - these are tradeoffs for high recall
  ],

  supersedes: 'jira-ticket-v1',
};
