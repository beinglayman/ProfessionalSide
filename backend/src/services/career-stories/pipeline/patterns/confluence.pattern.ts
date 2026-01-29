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

// =============================================================================
// RAW DATA PATTERNS
// These match structured IDs in JSON rawData from API responses.
//
// Why rawData patterns?
// When activities are fetched from APIs (e.g., Confluence API), the response
// includes structured fields like `pageId` that aren't in URLs. We JSON.stringify
// the rawData and match these fields as text patterns.
//
// Trade-off: Parsing JSON as text is less precise than proper parsing, but it's
// simpler and handles nested structures automatically. Marked as "medium" confidence.
// =============================================================================

/**
 * Confluence pageId from JSON rawData
 * Matches pageId field in API responses
 */
export const confluenceRawDataPattern: RefPattern = {
  id: 'confluence-rawdata-v1',
  name: 'Confluence Raw Data ID',
  version: 1,
  description: 'Confluence pageId from JSON rawData',
  regex: /"pageId"\s*:\s*"(\d{5,})"/g,
  toolType: 'confluence',
  confidence: 'medium',  // Medium: parsing JSON as text

  normalizeMatch: (match) => `confluence:${match[1]}`,

  examples: [
    {
      input: '{"pageId": "987654", "spaceKey": "ENG"}',
      expectedRef: 'confluence:987654',
      source: 'confluence-rawdata',
    },
    {
      input: '{"pageId":"123456789","version":5}',
      expectedRef: 'confluence:123456789',
      source: 'confluence-rawdata',
    },
  ],

  negativeExamples: [
    '{"pageId": "123"}',  // Too short (< 5 digits)
  ],
};
