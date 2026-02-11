import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime } from './utils';

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const freeze = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  it('returns "just now" for times less than 1 minute ago', () => {
    freeze('2026-02-11T12:00:30Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('just now');
  });

  it('returns minutes for times < 60 minutes ago', () => {
    freeze('2026-02-11T12:05:00Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('5m ago');
  });

  it('returns hours for times < 24 hours ago', () => {
    freeze('2026-02-11T15:00:00Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('3h ago');
  });

  it('returns days for times < 30 days ago', () => {
    freeze('2026-02-11T12:00:00Z');
    expect(formatRelativeTime('2026-02-04T12:00:00Z')).toBe('7d ago');
  });

  it('returns formatted date for times >= 30 days ago', () => {
    freeze('2026-02-11T12:00:00Z');
    const result = formatRelativeTime('2026-01-01T12:00:00Z');
    // toLocaleDateString varies by env, just check it's not "Xd ago"
    expect(result).not.toContain('d ago');
    expect(result).toContain('Jan');
  });

  it('returns "just now" for exactly 0ms difference', () => {
    freeze('2026-02-11T12:00:00Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('just now');
  });

  it('returns "59m ago" at the minute/hour boundary', () => {
    freeze('2026-02-11T12:59:00Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('59m ago');
  });

  it('returns "23h ago" at the hour/day boundary', () => {
    freeze('2026-02-12T11:00:00Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('23h ago');
  });

  it('returns "29d ago" at the day/date boundary', () => {
    freeze('2026-03-12T12:00:00Z');
    expect(formatRelativeTime('2026-02-11T12:00:00Z')).toBe('29d ago');
  });

  it('passes through invalid date strings unchanged', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
    expect(formatRelativeTime('')).toBe('');
  });

  it('handles future dates (negative diff) as "just now"', () => {
    freeze('2026-02-11T12:00:00Z');
    // Future date — diffMin is negative, which is < 1
    expect(formatRelativeTime('2026-02-11T13:00:00Z')).toBe('just now');
  });
});
