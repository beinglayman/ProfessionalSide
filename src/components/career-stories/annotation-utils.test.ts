/**
 * annotation-utils Unit Tests
 *
 * Tests for splitTextByAnnotations and getTextOffsetFromSelection.
 */

import { describe, expect, it } from 'vitest';
import { splitTextByAnnotations } from './annotation-utils';
import type { StoryAnnotation } from '../../types/career-stories';

// Helper to create a mock annotation
function mockAnnotation(overrides: Partial<StoryAnnotation> = {}): StoryAnnotation {
  return {
    id: 'ann-1',
    storyId: 'story-1',
    derivationId: null,
    sectionKey: 'situation',
    startOffset: 0,
    endOffset: 5,
    annotatedText: 'Hello',
    style: 'highlight',
    color: null,
    note: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// splitTextByAnnotations
// =============================================================================

describe('splitTextByAnnotations', () => {
  it('returns single segment when no annotations', () => {
    const result = splitTextByAnnotations('Hello world', []);
    expect(result).toEqual([{ text: 'Hello world' }]);
  });

  it('splits text around a single annotation', () => {
    const ann = mockAnnotation({ startOffset: 6, endOffset: 11, annotatedText: 'world' });
    const result = splitTextByAnnotations('Hello world', [ann]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ text: 'Hello ' });
    expect(result[1]).toEqual({
      text: 'world',
      annotationId: 'ann-1',
      annotation: ann,
    });
  });

  it('handles annotation at the start of text', () => {
    const ann = mockAnnotation({ startOffset: 0, endOffset: 5, annotatedText: 'Hello' });
    const result = splitTextByAnnotations('Hello world', [ann]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      text: 'Hello',
      annotationId: 'ann-1',
      annotation: ann,
    });
    expect(result[1]).toEqual({ text: ' world' });
  });

  it('handles annotation at the end of text', () => {
    const ann = mockAnnotation({ startOffset: 6, endOffset: 11, annotatedText: 'world' });
    const result = splitTextByAnnotations('Hello world', [ann]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ text: 'Hello ' });
    expect(result[1]).toEqual({
      text: 'world',
      annotationId: 'ann-1',
      annotation: ann,
    });
  });

  it('handles multiple non-overlapping annotations', () => {
    const ann1 = mockAnnotation({ id: 'a1', startOffset: 0, endOffset: 5, annotatedText: 'Hello' });
    const ann2 = mockAnnotation({ id: 'a2', startOffset: 6, endOffset: 11, annotatedText: 'world' });
    const result = splitTextByAnnotations('Hello world', [ann1, ann2]);

    expect(result).toHaveLength(3);
    expect(result[0].annotationId).toBe('a1');
    expect(result[1].text).toBe(' ');
    expect(result[2].annotationId).toBe('a2');
  });

  it('skips stale annotations (text mismatch)', () => {
    const stale = mockAnnotation({ startOffset: 0, endOffset: 5, annotatedText: 'WRONG' });
    const result = splitTextByAnnotations('Hello world', [stale]);

    expect(result).toEqual([{ text: 'Hello world' }]);
  });

  it('skips aside annotations (startOffset === -1)', () => {
    const aside = mockAnnotation({
      startOffset: -1,
      endOffset: -1,
      annotatedText: '',
      style: 'aside',
      note: 'Some note',
    });
    const result = splitTextByAnnotations('Hello world', [aside]);

    expect(result).toEqual([{ text: 'Hello world' }]);
  });

  it('handles overlapping annotations (first one wins)', () => {
    const ann1 = mockAnnotation({ id: 'a1', startOffset: 0, endOffset: 8, annotatedText: 'Hello wo' });
    const ann2 = mockAnnotation({ id: 'a2', startOffset: 5, endOffset: 11, annotatedText: ' world' });
    const result = splitTextByAnnotations('Hello world', [ann1, ann2]);

    // ann2 overlaps with ann1, so it's skipped
    expect(result).toHaveLength(2);
    expect(result[0].annotationId).toBe('a1');
    expect(result[1].text).toBe('rld');
  });

  it('sorts annotations by startOffset regardless of input order', () => {
    const ann1 = mockAnnotation({ id: 'a1', startOffset: 6, endOffset: 11, annotatedText: 'world' });
    const ann2 = mockAnnotation({ id: 'a2', startOffset: 0, endOffset: 5, annotatedText: 'Hello' });
    const result = splitTextByAnnotations('Hello world', [ann1, ann2]);

    expect(result).toHaveLength(3);
    expect(result[0].annotationId).toBe('a2'); // Earlier offset first
    expect(result[2].annotationId).toBe('a1');
  });

  it('handles annotation covering entire text', () => {
    const ann = mockAnnotation({ startOffset: 0, endOffset: 11, annotatedText: 'Hello world' });
    const result = splitTextByAnnotations('Hello world', [ann]);

    expect(result).toHaveLength(1);
    expect(result[0].annotationId).toBe('ann-1');
    expect(result[0].text).toBe('Hello world');
  });

  it('handles empty text', () => {
    const result = splitTextByAnnotations('', []);
    expect(result).toEqual([{ text: '' }]);
  });
});
