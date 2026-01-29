/**
 * RefExtractor Tests
 *
 * Tests for the reference extraction pipeline processor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RefExtractor } from './ref-extractor';
import { PatternRegistry } from './pattern-registry';

describe('RefExtractor', () => {
  let extractor: RefExtractor;

  beforeEach(() => {
    extractor = new RefExtractor();
  });

  describe('validation', () => {
    it('validates successfully with default patterns', () => {
      expect(() => extractor.validate()).not.toThrow();
    });

    it('throws if no patterns registered', () => {
      const emptyRegistry = new PatternRegistry(false);
      const emptyExtractor = new RefExtractor(emptyRegistry);
      expect(() => emptyExtractor.validate()).toThrow('no registered patterns');
    });
  });

  describe('extractRefs (simple API)', () => {
    it('extracts Jira ticket from text', () => {
      const refs = extractor.extractRefs('Fixed bug in AUTH-123');
      expect(refs).toContain('AUTH-123');
    });

    it('extracts multiple tickets from text', () => {
      const refs = extractor.extractRefs('AUTH-123 depends on CORE-456');
      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('CORE-456');
    });

    it('extracts GitHub PR reference', () => {
      const refs = extractor.extractRefs('See acme/backend#42 for details');
      expect(refs).toContain('acme/backend#42');
    });

    it('extracts Confluence page from URL', () => {
      const refs = extractor.extractRefs(
        'Design: https://acme.atlassian.net/wiki/spaces/ENG/pages/987654/Design'
      );
      expect(refs).toContain('confluence:987654');
    });

    it('extracts Google Meet code', () => {
      const refs = extractor.extractRefs('Join: https://meet.google.com/abc-defg-hij');
      expect(refs).toContain('gmeet:abc-defg-hij');
    });

    it('returns empty array for no matches', () => {
      const refs = extractor.extractRefs('No references here');
      expect(refs).toHaveLength(0);
    });

    it('handles null and undefined gracefully', () => {
      expect(extractor.extractRefs('')).toHaveLength(0);
    });
  });

  describe('extractRefsFromMultiple', () => {
    it('combines refs from multiple texts', () => {
      const refs = extractor.extractRefsFromMultiple([
        'AUTH-123 is ready',
        'See acme/backend#42',
        null,
        undefined,
      ]);
      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('acme/backend#42');
    });

    it('deduplicates refs across texts', () => {
      const refs = extractor.extractRefsFromMultiple([
        'AUTH-123 in title',
        'AUTH-123 in description',
        'AUTH-123 in body',
      ]);
      expect(refs.filter((r) => r === 'AUTH-123')).toHaveLength(1);
    });
  });

  describe('extractRefsFromObject', () => {
    it('extracts from JSON-stringified object', () => {
      const refs = extractor.extractRefsFromObject({
        key: 'AUTH-123',
        related: ['CORE-456'],
        nested: { ref: 'https://github.com/acme/repo/pull/99' },
      });
      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('CORE-456');
      expect(refs).toContain('acme/repo#99');
    });

    it('handles null object', () => {
      expect(extractor.extractRefsFromObject(null)).toHaveLength(0);
    });
  });

  describe('extractFromActivity', () => {
    it('extracts from all activity fields', () => {
      const result = extractor.extractFromActivity({
        title: 'AUTH-123: Implement OAuth',
        description: 'Design doc: https://acme.atlassian.net/wiki/spaces/ENG/pages/111222/Design',
        sourceUrl: 'https://github.com/acme/backend/pull/42',
        rawData: {
          key: 'AUTH-123',
          related: 'CORE-456',
        },
      });

      expect(result.data.refs).toContain('AUTH-123');
      expect(result.data.refs).toContain('confluence:111222');
      expect(result.data.refs).toContain('acme/backend#42');
      expect(result.data.refs).toContain('CORE-456');
    });

    it('includes sourceUrl by default', () => {
      const result = extractor.extractFromActivity({
        title: 'Test',
        sourceUrl: 'https://www.figma.com/file/ABC123XYZ/Design',
      });

      expect(result.data.refs).toContain('figma:ABC123XYZ');
    });

    it('can exclude sourceUrl', () => {
      const result = extractor.extractFromActivity(
        {
          title: 'AUTH-123 only',
          sourceUrl: 'https://www.figma.com/file/ABC123XYZ/Design',
        },
        { includeSourceUrl: false }
      );

      expect(result.data.refs).toContain('AUTH-123');
      expect(result.data.refs).not.toContain('figma:ABC123XYZ');
    });

    it('extracts rawData document IDs via patterns', () => {
      const result = extractor.extractFromActivity({
        title: 'Meeting notes',
        rawData: {
          documentId: '1AbC123XYZ456_defGHI789jkl_99999',
          meetCode: 'abc-defg-hij',
          channelId: 'C0ENGINEERING',
          pageId: '123456789',
        },
      });

      expect(result.data.refs).toContain('gdoc:1AbC123XYZ456_defGHI789jkl_99999');
      expect(result.data.refs).toContain('gmeet:abc-defg-hij');
      expect(result.data.refs).toContain('slack:C0ENGINEERING');
      expect(result.data.refs).toContain('confluence:123456789');
    });
  });

  describe('process (full API with diagnostics)', () => {
    it('returns diagnostics with metrics', () => {
      const result = extractor.process({
        texts: ['AUTH-123 is linked to CORE-456'],
      });

      expect(result.diagnostics.processor).toBe('RefExtractor');
      expect(result.diagnostics.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics.outputMetrics.refCount).toBe(2);
      expect(result.diagnostics.outputMetrics.matchCount).toBe(2);
    });

    it('returns pattern matches with location', () => {
      const result = extractor.process({
        texts: ['Fixed AUTH-123 today'],
      });

      expect(result.data.matches).toHaveLength(1);
      const match = result.data.matches[0];
      expect(match.ref).toBe('AUTH-123');
      expect(match.patternId).toBe('jira-ticket-v2');
      expect(match.confidence).toBe('high');
      expect(match.location.start).toBeGreaterThanOrEqual(0);
    });

    it('provides debug info when requested', () => {
      const result = extractor.process(
        { texts: ['Some text without refs'] },
        { debug: true }
      );

      expect(result.diagnostics.debug).toBeDefined();
      expect(result.diagnostics.debug?.patternAnalysis).toBeDefined();
    });
  });

  describe('filtering options', () => {
    it('filters by pattern IDs', () => {
      const result = extractor.process(
        { texts: ['AUTH-123 and https://github.com/acme/repo/pull/42'] },
        { patternIds: ['jira-ticket-v2'] }
      );

      expect(result.data.refs).toContain('AUTH-123');
      expect(result.data.refs).not.toContain('acme/repo#42');
    });

    it('filters by tool types', () => {
      const result = extractor.process(
        {
          texts: [
            'AUTH-123 and https://github.com/acme/repo/pull/42 and https://meet.google.com/abc-defg-hij',
          ],
        },
        { toolTypes: ['jira', 'github'] }
      );

      expect(result.data.refs).toContain('AUTH-123');
      expect(result.data.refs).toContain('acme/repo#42');
      expect(result.data.refs).not.toContain('gmeet:abc-defg-hij');
    });

    it('filters by minimum confidence', () => {
      const result = extractor.process(
        {
          texts: [
            'AUTH-123 and {"documentId": "1AbC123XYZ456_defGHI789jkl_99999"}',
          ],
        },
        { minConfidence: 'high' }
      );

      // jira-ticket-v2 is high confidence
      expect(result.data.refs).toContain('AUTH-123');
      // google-docs-rawdata-v1 is medium confidence
      expect(result.data.refs).not.toContain('gdoc:1AbC123XYZ456_defGHI789jkl_99999');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = extractor.process({ texts: [] });
      expect(result.data.refs).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('handles all null/undefined texts', () => {
      const result = extractor.process({ texts: [null, undefined, null] });
      expect(result.data.refs).toHaveLength(0);
    });

    it('handles very long text efficiently', () => {
      const longText = 'AUTH-' + '123 '.repeat(10000) + 'CORE-456';
      const start = performance.now();
      const result = extractor.process({ texts: [longText] });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.data.refs).toContain('AUTH-123');
      expect(result.data.refs).toContain('CORE-456');
    });

    it('does not extract from version numbers', () => {
      const refs = extractor.extractRefs('Version V2.0.0-beta released');
      expect(refs).not.toContain('V2');
    });

    it('handles unicode content', () => {
      const refs = extractor.extractRefs('AUTH-123 日本語 CORE-456 中文');
      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('CORE-456');
    });

    it('handles empty string', () => {
      const refs = extractor.extractRefs('');
      expect(refs).toHaveLength(0);
    });

    it('handles whitespace-only input', () => {
      const refs = extractor.extractRefs('   \n\t\n   ');
      expect(refs).toHaveLength(0);
    });

    it('handles special characters in text', () => {
      const refs = extractor.extractRefs('AUTH-123 @#$%^&*() CORE-456');
      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('CORE-456');
    });
  });

  describe('regression tests', () => {
    // Regression: Ensure rawData JSON stringification extracts refs correctly
    it('extracts Jira key from nested rawData.key field', () => {
      const result = extractor.extractFromActivity({
        title: 'Some title',
        rawData: {
          key: 'BUG-999',
          nested: { value: 'test' },
        },
      });
      expect(result.data.refs).toContain('BUG-999');
    });

    // Regression: Multiple refs of same type should all be extracted
    it('extracts multiple Jira tickets from single text', () => {
      const refs = extractor.extractRefs('AUTH-1, AUTH-2, AUTH-3, and AUTH-4 are all related');
      expect(refs).toContain('AUTH-1');
      expect(refs).toContain('AUTH-2');
      expect(refs).toContain('AUTH-3');
      expect(refs).toContain('AUTH-4');
      expect(refs).toHaveLength(4);
    });

    // Regression: Same ref appearing multiple times should be deduplicated
    it('deduplicates refs appearing in multiple places', () => {
      const result = extractor.extractFromActivity({
        title: 'AUTH-123 feature',
        description: 'Implements AUTH-123',
        rawData: { key: 'AUTH-123' },
      });
      expect(result.data.refs.filter((r) => r === 'AUTH-123')).toHaveLength(1);
    });

    // Regression: URLs should be extracted from sourceUrl when enabled
    it('extracts refs from sourceUrl when includeSourceUrl is true', () => {
      const result = extractor.extractFromActivity(
        {
          title: 'PR Review',
          sourceUrl: 'https://github.com/acme/repo/pull/99',
        },
        { includeSourceUrl: true }
      );
      expect(result.data.refs).toContain('acme/repo#99');
    });

    // Regression: Confluence page ID extraction from both URL and rawData
    it('extracts confluence refs from both URL and rawData', () => {
      const result = extractor.extractFromActivity({
        title: 'Design doc',
        description: 'See https://acme.atlassian.net/wiki/spaces/ENG/pages/123456/doc',
        rawData: { pageId: '789012' },
      });
      expect(result.data.refs).toContain('confluence:123456');
      expect(result.data.refs).toContain('confluence:789012');
    });
  });

  describe('boundary conditions', () => {
    it('handles minimum valid Jira ticket (2 char project)', () => {
      const refs = extractor.extractRefs('AB-1 is valid');
      expect(refs).toContain('AB-1');
    });

    it('handles maximum typical Jira ticket (10 char project)', () => {
      const refs = extractor.extractRefs('ABCDEFGHIJ-12345 is valid');
      expect(refs).toContain('ABCDEFGHIJ-12345');
    });

    it('rejects single letter project code', () => {
      const refs = extractor.extractRefs('X-123 should not match');
      expect(refs).not.toContain('X-123');
    });

    it('handles Google doc ID at minimum length (25 chars)', () => {
      const refs = extractor.extractRefs(
        'https://docs.google.com/document/d/1234567890abcdefghijklmno/edit'
      );
      expect(refs).toContain('gdoc:1234567890abcdefghijklmno');
    });

    it('handles Slack channel ID at minimum length', () => {
      const refs = extractor.extractRefs('https://acme.slack.com/archives/C12345678');
      expect(refs).toContain('slack:C12345678');
    });
  });

  describe('safeProcess (Result-based API)', () => {
    it('returns ok Result on successful extraction', () => {
      const result = extractor.safeProcess({ texts: ['AUTH-123'] });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data.refs).toContain('AUTH-123');
      }
    });

    it('returns ok Result with empty refs for no matches', () => {
      const result = extractor.safeProcess({ texts: ['no refs here'] });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data.refs).toHaveLength(0);
      }
    });

    it('returns ok Result with diagnostics', () => {
      const result = extractor.safeProcess({ texts: ['AUTH-123 and CORE-456'] });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.diagnostics.processor).toBe('RefExtractor');
        expect(result.value.diagnostics.processingTimeMs).toBeGreaterThan(0);
      }
    });

    it('can be chained with map', () => {
      const result = extractor
        .safeProcess({ texts: ['AUTH-123'] })
        .map((r) => r.data.refs.length);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(1);
      }
    });

    it('can be chained with andThen', () => {
      const result = extractor
        .safeProcess({ texts: ['AUTH-123'] })
        .andThen((r) => {
          if (r.data.refs.length === 0) {
            return { isOk: () => false, isErr: () => true, error: 'no refs' } as any;
          }
          return { isOk: () => true, isErr: () => false, value: r.data.refs[0] } as any;
        });

      expect(result.isOk()).toBe(true);
    });

    it('preserves warnings in Result', () => {
      const result = extractor.safeProcess(
        { texts: ['AUTH-123'] },
        { patternIds: ['nonexistent'] }
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.warnings.length).toBeGreaterThan(0);
      }
    });
  });
});
