/**
 * GitHub Patterns
 *
 * Extracts:
 * - PR/Issue refs: org/repo#42, #42
 * - PR/Issue URLs: github.com/org/repo/pull/42
 *
 * Real-world sources:
 * - Jira descriptions: "PR: https://github.com/acme/backend/pull/42"
 * - Commit messages: "Part of #42 and relates to acme/frontend#18"
 * - Confluence docs: "Implementation in acme/backend#42"
 */

import { RefPattern } from '../types';

/**
 * GitHub PR/Issue Reference Pattern
 * Matches: org/repo#42, #42 (local)
 */
export const githubRefPattern: RefPattern = {
  id: 'github-ref-v1',
  name: 'GitHub PR/Issue Reference',
  version: 1,
  description: 'GitHub PR/Issue refs: org/repo#42 or #42',
  regex: /(?:([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+))?#(\d+)/g,
  toolType: 'github',
  confidence: 'high',

  normalizeMatch: (match) => {
    const repo = match[1] || 'local';
    return `${repo}#${match[2]}`;
  },

  examples: [
    // Standard org/repo#number
    { input: 'See acme/backend#42 for implementation', expectedRef: 'acme/backend#42' },
    { input: 'In my-org/my_repo#123', expectedRef: 'my-org/my_repo#123' },

    // Bare #number (local repo)
    { input: 'Fixed in #42', expectedRef: 'local#42' },
    { input: 'Part of #42', expectedRef: 'local#42' },

    // Multiple refs
    { input: 'Part of #42 and relates to acme/frontend#18', expectedRef: 'local#42' },
    { input: 'Part of #42 and relates to acme/frontend#18', expectedRef: 'acme/frontend#18' },

    // Repos with dots
    { input: 'Check org.name/repo.name#99', expectedRef: 'org.name/repo.name#99' },

    // From Jira descriptions
    { input: 'Backend changes: acme/backend#123', expectedRef: 'acme/backend#123', source: 'jira' },
  ],

  negativeExamples: [
    // These would match but transform correctly, so not really negative
  ],
};

/**
 * GitHub URL Pattern
 * Matches: github.com/org/repo/pull/42, github.com/org/repo/issues/99
 */
export const githubUrlPattern: RefPattern = {
  id: 'github-url-v1',
  name: 'GitHub URL',
  version: 1,
  description: 'GitHub PR/Issue URLs',
  regex: /github\.com\/([^\/]+)\/([^\/]+)\/(?:pull|issues)\/(\d+)/g,
  toolType: 'github',
  confidence: 'high',

  normalizeMatch: (match) => `${match[1]}/${match[2]}#${match[3]}`,

  examples: [
    // PR URLs
    { input: 'https://github.com/acme/backend/pull/42', expectedRef: 'acme/backend#42' },
    { input: 'PR: https://github.com/my-org/my_repo/pull/1', expectedRef: 'my-org/my_repo#1' },

    // Issue URLs
    { input: 'https://github.com/acme/api/issues/99', expectedRef: 'acme/api#99' },

    // In markdown
    { input: 'See [PR](https://github.com/acme/backend/pull/200)', expectedRef: 'acme/backend#200' },

    // From Jira custom fields
    { input: 'Implementation: https://github.com/acme/frontend/pull/456', expectedRef: 'acme/frontend#456', source: 'jira' },
  ],

  negativeExamples: [
    'https://github.com/acme/backend/tree/main',         // Not a PR/issue
    'https://github.com/acme/backend/commit/abc123',     // Commit
    'https://github.com/acme/backend/blob/main/file.ts', // File
  ],
};
