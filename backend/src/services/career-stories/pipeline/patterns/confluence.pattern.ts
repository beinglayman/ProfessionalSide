/**
 * Confluence Pattern
 *
 * Matches: atlassian.net/wiki/.../pages/{pageId}
 *
 * Real-world sources:
 * - Jira descriptions: "Design doc: https://acme.atlassian.net/wiki/spaces/ENG/pages/987654"
 * - GitHub PR bodies: "Implements design from confluence page"
 * - Meeting agendas: "Review doc at confluence link"
 */

import { RefPattern } from '../types';

export const confluencePagePattern: RefPattern = {
  id: 'confluence-page-v1',
  name: 'Confluence Page',
  version: 1,
  description: 'Confluence page IDs from URLs',
  regex: /atlassian\.net\/wiki\/.*\/pages\/(\d+)/g,
  toolType: 'confluence',
  confidence: 'high',

  normalizeMatch: (match) => `confluence:${match[1]}`,

  examples: [
    // Standard Confluence URLs
    {
      input: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/987654/Design',
      expectedRef: 'confluence:987654',
    },
    {
      input: 'https://company.atlassian.net/wiki/display/TEAM/pages/123456',
      expectedRef: 'confluence:123456',
    },

    // In Jira descriptions
    {
      input: 'Design doc: https://acme.atlassian.net/wiki/spaces/ARCH/pages/123456789/Caching-RFC',
      expectedRef: 'confluence:123456789',
      source: 'jira',
    },

    // In GitHub PR bodies
    {
      input: 'Implements https://acme.atlassian.net/wiki/spaces/ENG/pages/987654/OAuth-Design',
      expectedRef: 'confluence:987654',
      source: 'github',
    },

    // In meeting descriptions
    {
      input: 'Review doc: https://acme.atlassian.net/wiki/spaces/ARCH/pages/999888777/Review',
      expectedRef: 'confluence:999888777',
      source: 'outlook',
    },
  ],

  negativeExamples: [
    'https://acme.atlassian.net/browse/PROJ-123',           // Jira, not Confluence
    'https://acme.atlassian.net/wiki/spaces/ENG/overview',  // Space overview, no page ID
  ],
};
