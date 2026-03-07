import { describe, it, expect } from 'vitest';
import { extractMetricSpans } from './view';

describe('extractMetricSpans', () => {
  it('returns empty array for text without metrics', () => {
    expect(extractMetricSpans('No metrics here')).toEqual([]);
  });

  it('extracts multiplier values (x/X)', () => {
    const spans = extractMetricSpans('Achieved 3x improvement');
    expect(spans).toEqual([
      { text: '3x', start: 9, end: 11 },
    ]);
    const upper = extractMetricSpans('Achieved 3X improvement');
    expect(upper[0].text).toBe('3X');
  });

  it('extracts duration values', () => {
    expect(extractMetricSpans('Finished in 3 days')[0].text).toBe('3 days');
    expect(extractMetricSpans('Took 2 weeks')[0].text).toBe('2 weeks');
    expect(extractMetricSpans('Over 6 months')[0].text).toBe('6 months');
    expect(extractMetricSpans('Saved 4 hours')[0].text).toBe('4 hours');
  });

  it('extracts people/entity counts', () => {
    expect(extractMetricSpans('Served 500 users')[0].text).toBe('500 users');
    expect(extractMetricSpans('Onboarded 12 customers')[0].text).toBe('12 customers');
    expect(extractMetricSpans('Led 5 teams')[0].text).toBe('5 teams');
  });

  it('extracts multiple metrics from the same text', () => {
    const spans = extractMetricSpans('Built 3x faster pipeline for 200 users in 2 weeks');
    expect(spans).toHaveLength(3);
    expect(spans.map(s => s.text)).toEqual(['3x', '200 users', '2 weeks']);
  });

  it('returns correct start and end positions', () => {
    const text = 'abc 3x def';
    const spans = extractMetricSpans(text);
    expect(spans[0].start).toBe(4);
    expect(spans[0].end).toBe(6);
    expect(text.slice(spans[0].start, spans[0].end)).toBe('3x');
  });

  it('handles singular units', () => {
    expect(extractMetricSpans('Done in 1 day')[0].text).toBe('1 day');
    expect(extractMetricSpans('Took 1 hour')[0].text).toBe('1 hour');
    expect(extractMetricSpans('Only 1 week')[0].text).toBe('1 week');
    expect(extractMetricSpans('For 1 user')[0].text).toBe('1 user');
  });

  it('does not share state across calls (no global regex bug)', () => {
    const text = 'Built 3x faster';
    const first = extractMetricSpans(text);
    const second = extractMetricSpans(text);
    expect(first).toEqual(second);
  });

  // Known limitation: \b word boundary doesn't match % or $ since they aren't word chars.
  // These tests document the current behavior. Percentages and dollar amounts are NOT matched.
  it('does not match percentages due to word boundary limitation', () => {
    expect(extractMetricSpans('Improved by 40%')).toEqual([]);
  });

  it('does not match dollar amounts due to word boundary limitation', () => {
    expect(extractMetricSpans('Saved $1,200')).toEqual([]);
    expect(extractMetricSpans('Revenue hit $5M')).toEqual([]);
  });
});
