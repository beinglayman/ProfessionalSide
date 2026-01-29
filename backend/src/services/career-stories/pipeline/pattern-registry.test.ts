/**
 * PatternRegistry Tests
 *
 * Tests for the self-validating pattern registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternRegistry } from './pattern-registry';
import { RefPattern } from './types';

describe('PatternRegistry', () => {
  describe('default registration', () => {
    it('registers all 18 default patterns', () => {
      const registry = new PatternRegistry();
      expect(registry.getPatternIds().length).toBe(18);
    });

    it('has zero validation errors for default patterns', () => {
      const registry = new PatternRegistry();
      expect(registry.getValidationErrors()).toHaveLength(0);
    });

    it('includes expected pattern IDs', () => {
      const registry = new PatternRegistry();
      const ids = registry.getPatternIds();

      // Core patterns
      expect(ids).toContain('jira-ticket-v2');
      expect(ids).toContain('github-ref-v1');
      expect(ids).toContain('github-url-v1');
      expect(ids).toContain('confluence-page-v1');
      expect(ids).toContain('figma-url-v1');
      expect(ids).toContain('slack-channel-url-v1');

      // Google patterns
      expect(ids).toContain('google-docs-v1');
      expect(ids).toContain('google-sheets-v1');
      expect(ids).toContain('google-slides-v1');
      expect(ids).toContain('google-meet-v1');

      // Raw data patterns
      expect(ids).toContain('confluence-rawdata-v1');
      expect(ids).toContain('slack-rawdata-v1');
      expect(ids).toContain('google-docs-rawdata-v1');
      expect(ids).toContain('google-meet-rawdata-v1');
    });
  });

  describe('pattern validation', () => {
    let registry: PatternRegistry;

    beforeEach(() => {
      registry = new PatternRegistry(false); // Don't auto-register
    });

    it('rejects pattern without global flag', () => {
      const badPattern: RefPattern = {
        id: 'test-no-global',
        name: 'Test Pattern',
        version: 1,
        description: 'Missing global flag',
        regex: /TEST-\d+/, // Missing 'g' flag
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [{ input: 'TEST-123', expectedRef: 'TEST-123' }],
        negativeExamples: [],
      };

      expect(() => registry.register(badPattern)).toThrow('global flag');
    });

    it('rejects pattern with failing positive example', () => {
      const badPattern: RefPattern = {
        id: 'test-bad-example',
        name: 'Test Pattern',
        version: 1,
        description: 'Example does not match',
        regex: /ABC-\d+/g,
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [
          { input: 'ABC-123', expectedRef: 'ABC-123' }, // Good
          { input: 'XYZ-456', expectedRef: 'XYZ-456' }, // Bad - won't match ABC pattern
        ],
        negativeExamples: [],
      };

      expect(() => registry.register(badPattern)).toThrow('Example failed');
    });

    it('rejects pattern where negative example matches', () => {
      const badPattern: RefPattern = {
        id: 'test-bad-negative',
        name: 'Test Pattern',
        version: 1,
        description: 'Negative example matches',
        regex: /[A-Z]+-\d+/g, // Very broad pattern
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [{ input: 'TEST-123', expectedRef: 'TEST-123' }],
        negativeExamples: ['ABC-999'], // This WILL match the broad pattern
      };

      expect(() => registry.register(badPattern)).toThrow('Negative example matched');
    });

    it('registers valid pattern successfully', () => {
      const goodPattern: RefPattern = {
        id: 'test-good',
        name: 'Test Pattern',
        version: 1,
        description: 'Valid pattern',
        regex: /GOOD-\d+/g,
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [{ input: 'Found GOOD-123 in text', expectedRef: 'GOOD-123' }],
        negativeExamples: ['BAD-123', 'good-123'], // Won't match GOOD pattern
      };

      expect(() => registry.register(goodPattern)).not.toThrow();
      expect(registry.getPattern('test-good')).toBeDefined();
    });
  });

  describe('supersedes handling', () => {
    let registry: PatternRegistry;

    beforeEach(() => {
      registry = new PatternRegistry(false);
    });

    it('excludes superseded patterns from active list', () => {
      const v1: RefPattern = {
        id: 'test-v1',
        name: 'Test V1',
        version: 1,
        description: 'Old version',
        regex: /OLD-\d+/g,
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [{ input: 'OLD-123', expectedRef: 'OLD-123' }],
        negativeExamples: [],
      };

      const v2: RefPattern = {
        id: 'test-v2',
        name: 'Test V2',
        version: 2,
        description: 'New version',
        regex: /(?:OLD|NEW)-\d+/g,
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [
          { input: 'OLD-123', expectedRef: 'OLD-123' },
          { input: 'NEW-456', expectedRef: 'NEW-456' },
        ],
        negativeExamples: [],
        supersedes: 'test-v1',
      };

      registry.register(v1);
      registry.register(v2);

      const active = registry.getActivePatterns();
      expect(active.map((p) => p.id)).not.toContain('test-v1');
      expect(active.map((p) => p.id)).toContain('test-v2');
    });

    it('prevents duplicate registration', () => {
      const pattern: RefPattern = {
        id: 'unique-pattern',
        name: 'Test',
        version: 1,
        description: 'Test',
        regex: /UNIQ-\d+/g,
        toolType: 'jira',
        confidence: 'high',
        normalizeMatch: (m) => m[0],
        examples: [{ input: 'UNIQ-1', expectedRef: 'UNIQ-1' }],
        negativeExamples: [],
      };

      registry.register(pattern);
      expect(() => registry.register(pattern)).toThrow('already registered');
    });
  });

  describe('getPatternsByTool', () => {
    it('returns patterns filtered by tool type', () => {
      const registry = new PatternRegistry();

      const jiraPatterns = registry.getPatternsByTool('jira');
      expect(jiraPatterns.length).toBeGreaterThan(0);
      expect(jiraPatterns.every((p) => p.toolType === 'jira')).toBe(true);

      const googlePatterns = registry.getPatternsByTool('google');
      expect(googlePatterns.length).toBeGreaterThan(0);
      expect(googlePatterns.every((p) => p.toolType === 'google')).toBe(true);
    });

    it('returns empty array for unknown tool type', () => {
      const registry = new PatternRegistry();
      const patterns = registry.getPatternsByTool('unknown' as any);
      expect(patterns).toHaveLength(0);
    });
  });
});
