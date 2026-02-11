import { describe, it, expect, vi, afterEach } from 'vitest';
import { computePresetRange, DATE_PRESETS, type DatePreset } from './PromotionPacketModal';

describe('DATE_PRESETS', () => {
  it('has 5 presets in expected order', () => {
    expect(DATE_PRESETS).toHaveLength(5);
    expect(DATE_PRESETS.map(p => p.key)).toEqual([
      'last-quarter', 'last-6m', 'last-year', 'ytd', 'custom',
    ]);
  });

  it('each preset has a non-empty label', () => {
    DATE_PRESETS.forEach(p => {
      expect(p.label).toBeTruthy();
    });
  });
});

describe('computePresetRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const freeze = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  it('returns YYYY-MM-DD format for all non-custom presets', () => {
    freeze('2026-02-11T12:00:00Z');
    const presets: DatePreset[] = ['last-quarter', 'last-6m', 'last-year', 'ytd'];
    presets.forEach(preset => {
      const { start, end } = computePresetRange(preset);
      expect(start).toMatch(ISO_DATE);
      expect(end).toMatch(ISO_DATE);
    });
  });

  it('last-quarter returns ~3 months back', () => {
    freeze('2026-06-15T12:00:00Z');
    const { start, end } = computePresetRange('last-quarter');
    expect(start).toBe('2026-03-15');
    expect(end).toBe('2026-06-15');
  });

  it('last-6m returns ~6 months back', () => {
    freeze('2026-06-15T12:00:00Z');
    const { start, end } = computePresetRange('last-6m');
    expect(start).toBe('2025-12-15');
    expect(end).toBe('2026-06-15');
  });

  it('last-year returns exactly 1 year back', () => {
    freeze('2026-06-15T12:00:00Z');
    const { start, end } = computePresetRange('last-year');
    expect(start).toBe('2025-06-15');
    expect(end).toBe('2026-06-15');
  });

  it('ytd returns Jan 1 of current year to today', () => {
    freeze('2026-06-15T12:00:00Z');
    const { start, end } = computePresetRange('ytd');
    expect(start).toBe('2026-01-01');
    expect(end).toBe('2026-06-15');
  });

  it('custom returns empty strings', () => {
    const { start, end } = computePresetRange('custom');
    expect(start).toBe('');
    expect(end).toBe('');
  });

  it('end is always today for non-custom presets', () => {
    freeze('2026-02-11T18:30:00Z');
    const presets: DatePreset[] = ['last-quarter', 'last-6m', 'last-year', 'ytd'];
    presets.forEach(preset => {
      const { end } = computePresetRange(preset);
      expect(end).toBe('2026-02-11');
    });
  });

  it('start is always before end', () => {
    freeze('2026-02-11T12:00:00Z');
    const presets: DatePreset[] = ['last-quarter', 'last-6m', 'last-year', 'ytd'];
    presets.forEach(preset => {
      const { start, end } = computePresetRange(preset);
      expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
    });
  });

  it('handles month boundary rollover (Jan - 3 months = Oct prior year)', () => {
    freeze('2026-01-15T12:00:00Z');
    const { start } = computePresetRange('last-quarter');
    expect(start).toBe('2025-10-15');
  });

  it('handles YTD on Jan 1 (start === end)', () => {
    freeze('2026-01-01T12:00:00Z');
    const { start, end } = computePresetRange('ytd');
    expect(start).toBe('2026-01-01');
    expect(end).toBe('2026-01-01');
  });
});
