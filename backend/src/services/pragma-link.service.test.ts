/**
 * Pragma Link Service — Unit Tests
 *
 * Pure function tests (no DB, no server required).
 */

import { describe, it, expect } from 'vitest';
import { generateShortCode, generateToken, truncateSections, filterByTier } from './pragma-link.service';
import { filterSources } from '../utils/source-filter';

// ============================================================================
// generateShortCode
// ============================================================================

describe('generateShortCode', () => {
  it('returns an 8-character string', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(8);
  });

  it('uses only allowed characters (no 0/O/1/l/I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode();
      expect(code).toMatch(/^[a-hjkmnp-z2-9]{8}$/);
    }
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateShortCode());
    }
    expect(codes.size).toBe(100);
  });
});

// ============================================================================
// generateToken
// ============================================================================

describe('generateToken', () => {
  it('returns a 32-character base64url string', () => {
    const token = generateToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(100);
  });
});

// ============================================================================
// truncateSections
// ============================================================================

describe('truncateSections', () => {
  it('passes through short text unchanged', () => {
    const sections = { intro: { summary: 'Hello world' } };
    const result = truncateSections(sections, 200);
    expect(result.intro.summary).toBe('Hello world');
  });

  it('truncates long text at word boundary with ellipsis', () => {
    const longText = 'word '.repeat(80); // 400 chars
    const sections = { body: { summary: longText } };
    const result = truncateSections(sections, 200);

    expect(result.body.summary.length).toBeLessThanOrEqual(205);
    expect(result.body.summary.endsWith('...')).toBe(true);
    // Should not cut mid-word
    expect(result.body.summary.slice(0, -3).endsWith(' wor')).toBe(false);
  });

  it('handles empty sections', () => {
    const sections = { empty: { summary: '' } };
    const result = truncateSections(sections, 200);
    expect(result.empty.summary).toBe('');
  });

  it('handles null/undefined sections input', () => {
    expect(truncateSections(null as any, 200)).toEqual({});
    expect(truncateSections(undefined as any, 200)).toEqual({});
  });

  it('handles section with undefined summary', () => {
    const sections = { missing: {} as any };
    const result = truncateSections(sections, 200);
    expect(result.missing.summary).toBe('');
  });

  it('preserves multiple sections', () => {
    const sections = {
      situation: { summary: 'Short' },
      action: { summary: 'Also short' },
      result: { summary: 'x '.repeat(200) },
    };
    const result = truncateSections(sections, 200);
    expect(result.situation.summary).toBe('Short');
    expect(result.action.summary).toBe('Also short');
    expect(result.result.summary.length).toBeLessThanOrEqual(205);
  });

  it('uses word boundary for truncation, not exact char count', () => {
    // Text with a word that ends right before maxChars
    const text = 'a'.repeat(195) + ' longword';
    const sections = { test: { summary: text } };
    const result = truncateSections(sections, 200);
    // Should truncate at the space before "longword"
    expect(result.test.summary).toBe('a'.repeat(195) + '...');
  });
});

// ============================================================================
// filterSources (shared util)
// ============================================================================

describe('filterSources', () => {
  it('removes excluded sources', () => {
    const sources = [
      { sourceType: 'activity', excludedAt: null },
      { sourceType: 'activity', excludedAt: new Date() },
      { sourceType: 'user_note', excludedAt: null },
    ];
    const result = filterSources(sources);
    expect(result).toHaveLength(2);
  });

  it('removes wizard_answer sources', () => {
    const sources = [
      { sourceType: 'activity', excludedAt: null },
      { sourceType: 'wizard_answer', excludedAt: null },
      { sourceType: 'user_note', excludedAt: null },
    ];
    const result = filterSources(sources);
    expect(result).toHaveLength(2);
    expect(result.every(s => s.sourceType !== 'wizard_answer')).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(filterSources([])).toEqual([]);
  });
});

// ============================================================================
// filterByTier
// ============================================================================

describe('filterByTier', () => {
  const mockStory = {
    id: 'story-1',
    title: 'Test Story',
    framework: 'star',
    archetype: null,
    category: null,
    publishedAt: new Date(),
    sections: {
      situation: { summary: 'Long situation text that exceeds two hundred characters easily because we need to test truncation behavior. '.repeat(3) },
      task: { summary: 'Short task' },
    },
  };

  const mockSources = [
    { sourceType: 'activity', excludedAt: null, label: 'PR #123' },
    { sourceType: 'wizard_answer', excludedAt: null, label: 'Q1 Answer' },
    { sourceType: 'activity', excludedAt: new Date(), label: 'Excluded PR' },
  ];

  const mockAnnotations = [
    { id: 'ann-1', content: 'Good job on this section' },
  ];

  it('public tier: truncated sections, no sources, no annotations', () => {
    const result = filterByTier(mockStory, mockSources, mockAnnotations, 'public');

    expect(result.title).toBe('Test Story');
    expect(result.sources).toEqual([]);
    expect(result.annotations).toEqual([]);
    // Situation should be truncated
    expect(result.sections.situation.summary.length).toBeLessThanOrEqual(205);
    // Task is short — not truncated
    expect(result.sections.task.summary).toBe('Short task');
  });

  it('recruiter tier: full sections, filtered sources, no annotations', () => {
    const result = filterByTier(mockStory, mockSources, mockAnnotations, 'recruiter');

    expect(result.sections).toEqual(mockStory.sections);
    expect(result.annotations).toEqual([]);
    // Sources: only non-excluded, non-wizard_answer
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].label).toBe('PR #123');
  });

  it('mentor tier: full sections, filtered sources, with annotations', () => {
    const result = filterByTier(mockStory, mockSources, mockAnnotations, 'mentor');

    expect(result.sections).toEqual(mockStory.sections);
    expect(result.sources).toHaveLength(1);
    expect(result.annotations).toEqual(mockAnnotations);
  });

  it('includes story metadata in all tiers', () => {
    for (const tier of ['public', 'recruiter', 'mentor'] as const) {
      const result = filterByTier(mockStory, mockSources, mockAnnotations, tier);
      expect(result.id).toBe('story-1');
      expect(result.title).toBe('Test Story');
      expect(result.framework).toBe('star');
    }
  });
});
