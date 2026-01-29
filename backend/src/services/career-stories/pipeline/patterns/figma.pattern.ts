/**
 * Figma Patterns
 *
 * Extracts:
 * - File URLs: figma.com/file/{key} or figma.com/design/{key}
 * - File keys from rawData.file_key
 *
 * Real-world sources:
 * - Activity sourceUrl: "https://www.figma.com/file/Abc123XYZ/Design"
 * - Jira descriptions: "Designs: https://figma.com/file/..."
 * - Figma API rawData: { file_key: "XYZ789" }
 */

import { RefPattern } from '../types';

/**
 * Figma File URL Pattern
 * Matches: figma.com/file/{key} or figma.com/design/{key}
 */
export const figmaUrlPattern: RefPattern = {
  id: 'figma-url-v1',
  name: 'Figma File URL',
  version: 1,
  description: 'Figma file keys from URLs',
  regex: /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/g,
  toolType: 'figma',
  confidence: 'high',

  normalizeMatch: (match) => `figma:${match[1]}`,

  examples: [
    // Standard file URLs
    {
      input: 'https://www.figma.com/file/Abc123XYZ/My-Design',
      expectedRef: 'figma:Abc123XYZ',
    },

    // New design URLs
    {
      input: 'https://www.figma.com/design/XYZ789abc/Project',
      expectedRef: 'figma:XYZ789abc',
    },

    // In Jira tickets
    {
      input: 'Designs: https://www.figma.com/file/FigmaFileKey123/AUTH-500-Login',
      expectedRef: 'figma:FigmaFileKey123',
      source: 'jira',
    },

    // With node-id parameter
    {
      input: 'https://www.figma.com/file/ABC123/Design?node-id=1234',
      expectedRef: 'figma:ABC123',
    },
  ],

  negativeExamples: [
    'https://www.figma.com/community/file/123',  // Community file (different format)
    'https://www.figma.com/proto/ABC123',        // Prototype (could add later)
  ],
};

/**
 * Figma file_key from JSON rawData
 * This handles Figma API responses where file_key is in the data
 */
export const figmaRawDataPattern: RefPattern = {
  id: 'figma-rawdata-v1',
  name: 'Figma Raw Data Key',
  version: 1,
  description: 'Figma file_key from JSON rawData',
  regex: /"(?:file_key|key)"\s*:\s*"([a-zA-Z0-9]{10,})"/g,
  toolType: 'figma',
  confidence: 'medium',  // Medium: parsing JSON as text is less precise

  normalizeMatch: (match) => `figma:${match[1]}`,

  examples: [
    // file_key in rawData
    {
      input: '{"file_key": "XYZ789abcdef", "message": "test"}',
      expectedRef: 'figma:XYZ789abcdef',
      source: 'figma-rawdata',
    },

    // key in rawData
    {
      input: '{"key": "FigmaFileKey123", "name": "Design"}',
      expectedRef: 'figma:FigmaFileKey123',
      source: 'figma-rawdata',
    },
  ],

  negativeExamples: [
    '{"key": "short"}',  // Too short (< 10 chars) - probably not a Figma key
    '{"api_key": "secret123456"}',  // api_key, not file key
  ],
};
