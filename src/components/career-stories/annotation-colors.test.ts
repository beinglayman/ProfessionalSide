/**
 * annotation-colors Unit Tests
 */

import { describe, expect, it } from 'vitest';
import { ANNOTATION_COLORS, getColorById, hoverRingShadow, DEFAULT_COLOR_ID } from './annotation-colors';

describe('ANNOTATION_COLORS', () => {
  it('has 7 colors', () => {
    expect(ANNOTATION_COLORS).toHaveLength(7);
  });

  it('all colors have required properties', () => {
    for (const color of ANNOTATION_COLORS) {
      expect(color).toHaveProperty('id');
      expect(color).toHaveProperty('dot');
      expect(color).toHaveProperty('fill');
      expect(color).toHaveProperty('stroke');
    }
  });
});

describe('getColorById', () => {
  it('returns the correct color for a valid ID', () => {
    const rose = getColorById('rose');
    expect(rose.id).toBe('rose');
    expect(rose.dot).toBe('#fb7185');
  });

  it('returns amber for null', () => {
    const result = getColorById(null);
    expect(result.id).toBe('amber');
  });

  it('returns amber for undefined', () => {
    const result = getColorById(undefined);
    expect(result.id).toBe('amber');
  });

  it('returns amber for unknown ID', () => {
    const result = getColorById('nonexistent');
    expect(result.id).toBe('amber');
  });
});

describe('DEFAULT_COLOR_ID', () => {
  it('is amber', () => {
    expect(DEFAULT_COLOR_ID).toBe('amber');
  });
});

describe('hoverRingShadow', () => {
  it('returns box-shadow string with stroke color and alpha', () => {
    const shadow = hoverRingShadow('rose');
    expect(shadow).toBe('0 0 0 2px #e11d4873');
  });

  it('uses amber stroke for null color', () => {
    const shadow = hoverRingShadow(null);
    expect(shadow).toBe('0 0 0 2px #d9770673');
  });

  it('uses amber stroke for undefined color', () => {
    const shadow = hoverRingShadow(undefined);
    expect(shadow).toBe('0 0 0 2px #d9770673');
  });
});
