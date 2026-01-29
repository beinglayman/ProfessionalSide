/**
 * RefExtractorService Tests
 *
 * Kent Beck style: Test behavior, not implementation.
 * Each test answers: "Given this input, what refs should I find?"
 */

import { describe, it, expect } from 'vitest';
import { RefExtractorService } from './ref-extractor.service';

describe('RefExtractorService', () => {
  const extractor = new RefExtractorService();

  // ===========================================================================
  // JIRA TICKETS
  // ===========================================================================

  describe('Jira ticket extraction', () => {
    it('finds standard Jira tickets (PROJ-123)', () => {
      const refs = extractor.extractRefs('Fixed bug in AUTH-123');
      expect(refs).toContain('AUTH-123');
    });

    it('finds multiple Jira tickets in one string', () => {
      const refs = extractor.extractRefs('This PR addresses AUTH-123 and AUTH-124');
      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('AUTH-124');
    });

    it('finds Jira tickets with various project prefixes', () => {
      const refs = extractor.extractRefs('PERF-456, DOC-1, BACKEND-9999');
      expect(refs).toContain('PERF-456');
      expect(refs).toContain('DOC-1');
      expect(refs).toContain('BACKEND-9999');
    });

    it('ignores lowercase that looks like tickets', () => {
      const refs = extractor.extractRefs('Not a ticket: auth-123');
      expect(refs).not.toContain('auth-123');
    });

    it('ignores single-letter prefixes (not valid Jira format)', () => {
      const refs = extractor.extractRefs('X-123 is too short');
      expect(refs).not.toContain('X-123');
    });
  });

  // ===========================================================================
  // GITHUB PULL REQUESTS
  // ===========================================================================

  describe('GitHub PR extraction', () => {
    it('finds org/repo#number format', () => {
      const refs = extractor.extractRefs('See acme/backend#42 for implementation');
      expect(refs).toContain('acme/backend#42');
    });

    it('finds bare #number format as local repo ref', () => {
      const refs = extractor.extractRefs('Fixed in #42');
      expect(refs).toContain('local#42');
    });

    it('finds full GitHub PR URLs', () => {
      const refs = extractor.extractRefs(
        'Details at https://github.com/acme/backend/pull/42'
      );
      expect(refs).toContain('acme/backend#42');
    });

    it('finds GitHub issue URLs (same format)', () => {
      const refs = extractor.extractRefs(
        'Related to https://github.com/acme/api/issues/99'
      );
      expect(refs).toContain('acme/api#99');
    });

    it('handles repos with hyphens and underscores', () => {
      const refs = extractor.extractRefs('In my-org/my_repo#123');
      expect(refs).toContain('my-org/my_repo#123');
    });
  });

  // ===========================================================================
  // CONFLUENCE PAGES
  // ===========================================================================

  describe('Confluence page extraction', () => {
    it('finds Confluence page IDs from URLs', () => {
      const refs = extractor.extractRefs(
        'Design doc: https://acme.atlassian.net/wiki/spaces/ENG/pages/987654/Design'
      );
      expect(refs).toContain('confluence:987654');
    });

    it('finds page IDs with various URL structures', () => {
      const refs = extractor.extractRefs(
        'See https://company.atlassian.net/wiki/display/TEAM/pages/123456'
      );
      expect(refs).toContain('confluence:123456');
    });
  });

  // ===========================================================================
  // FIGMA FILES
  // ===========================================================================

  describe('Figma file extraction', () => {
    it('finds Figma file keys from URLs', () => {
      const refs = extractor.extractRefs(
        'Designs: https://www.figma.com/file/Abc123XYZ/My-Design'
      );
      expect(refs).toContain('figma:Abc123XYZ');
    });

    it('finds Figma design URLs (new format)', () => {
      const refs = extractor.extractRefs(
        'https://www.figma.com/design/XYZ789abc/Project'
      );
      expect(refs).toContain('figma:XYZ789abc');
    });
  });

  // ===========================================================================
  // EDGE CASES & BEHAVIOR
  // ===========================================================================

  describe('edge cases', () => {
    it('returns empty array for null/undefined input', () => {
      expect(extractor.extractRefs('')).toEqual([]);
      expect(extractor.extractRefs(null as any)).toEqual([]);
      expect(extractor.extractRefs(undefined as any)).toEqual([]);
    });

    it('deduplicates refs found multiple times', () => {
      const refs = extractor.extractRefs(
        'AUTH-123 was fixed. Again: AUTH-123 is done.'
      );
      expect(refs.filter((r) => r === 'AUTH-123')).toHaveLength(1);
    });

    it('finds refs across mixed content', () => {
      const text = `
        Implements AUTH-123.
        Backend changes in acme/backend#42.
        See design: https://acme.atlassian.net/wiki/spaces/ENG/pages/987654
        Frontend in https://github.com/acme/frontend/pull/22
      `;
      const refs = extractor.extractRefs(text);

      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('acme/backend#42');
      expect(refs).toContain('confluence:987654');
      expect(refs).toContain('acme/frontend#22');
    });
  });

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  describe('extractRefsFromMultiple', () => {
    it('combines refs from multiple text sources', () => {
      const refs = extractor.extractRefsFromMultiple([
        'AUTH-123 in title',
        'See acme/backend#42',
        null,
        undefined,
      ]);

      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('acme/backend#42');
    });

    it('deduplicates across sources', () => {
      const refs = extractor.extractRefsFromMultiple([
        'AUTH-123',
        'Also AUTH-123',
      ]);
      expect(refs.filter((r) => r === 'AUTH-123')).toHaveLength(1);
    });
  });

  describe('extractRefsFromObject', () => {
    it('finds refs in nested object properties', () => {
      const obj = {
        title: 'Fix AUTH-123',
        metadata: {
          pr: 'acme/backend#42',
          nested: {
            doc: 'https://acme.atlassian.net/wiki/spaces/X/pages/555',
          },
        },
      };

      const refs = extractor.extractRefsFromObject(obj);

      expect(refs).toContain('AUTH-123');
      expect(refs).toContain('acme/backend#42');
      expect(refs).toContain('confluence:555');
    });
  });
});
