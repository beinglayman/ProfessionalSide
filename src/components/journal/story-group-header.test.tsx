import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { highlightMetrics, METRIC_PATTERN } from './story-group-header';

describe('METRIC_PATTERN', () => {
  // Reset lastIndex before each match call since the pattern has the /g flag
  function findAll(text: string): string[] {
    METRIC_PATTERN.lastIndex = 0;
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = METRIC_PATTERN.exec(text)) !== null) {
      matches.push(m[0]);
    }
    return matches;
  }

  describe('percentages', () => {
    it('matches integer percentages', () => {
      expect(findAll('Reduced latency by 40%')).toEqual(['40%']);
    });

    it('matches decimal percentages', () => {
      expect(findAll('99.9% uptime')).toEqual(['99.9%']);
    });

    it('matches multiplier notation (x/X)', () => {
      expect(findAll('3x faster')).toEqual(['3x']);
      expect(findAll('10X improvement')).toEqual(['10X']);
    });
  });

  describe('dollar amounts', () => {
    it('matches simple dollar amounts', () => {
      expect(findAll('Saved $500')).toEqual(['$500']);
    });

    it('matches dollar amounts with comma separators', () => {
      expect(findAll('Revenue of $1,200,000')).toEqual(['$1,200,000']);
    });

    it('matches dollar amounts with suffixes', () => {
      expect(findAll('$2M ARR')).toEqual(['$2M']);
      expect(findAll('$1.5B valuation')).toEqual(['$1.5B']);
      expect(findAll('$500K savings')).toEqual(['$500K']);
    });

    it('matches dollar amounts with decimals', () => {
      expect(findAll('Cost of $3.50')).toEqual(['$3.50']);
    });
  });

  describe('durations and counts', () => {
    it('matches hour/day/week/month durations', () => {
      expect(findAll('Saved 20 hours per sprint')).toEqual(['20 hours']);
      expect(findAll('Shipped in 3 days')).toEqual(['3 days']);
      expect(findAll('Over 6 weeks')).toEqual(['6 weeks']);
      expect(findAll('Completed in 2 months')).toEqual(['2 months']);
    });

    it('matches singular units', () => {
      expect(findAll('In just 1 hour')).toEqual(['1 hour']);
      expect(findAll('1 day turnaround')).toEqual(['1 day']);
    });

    it('matches time units (minutes, seconds, ms)', () => {
      expect(findAll('Reduced to 200ms')).toEqual(['200ms']);
      expect(findAll('Down to 30 seconds')).toEqual(['30 seconds']);
      expect(findAll('Takes 5 minutes')).toEqual(['5 minutes']);
    });

    it('matches people counts', () => {
      expect(findAll('Team of 12 engineers')).toEqual(['12 engineers']);
      expect(findAll('Serving 1,000 users')).toEqual(['1,000 users']);
      expect(findAll('50 customers')).toEqual(['50 customers']);
    });

    it('matches team counts', () => {
      expect(findAll('Across 4 teams')).toEqual(['4 teams']);
      expect(findAll('Led 1 team')).toEqual(['1 team']);
    });
  });

  describe('multiple metrics in one string', () => {
    it('finds all metrics', () => {
      expect(findAll('Reduced latency by 40% saving 20 hours for 12 engineers'))
        .toEqual(['40%', '20 hours', '12 engineers']);
    });

    it('finds dollar + percentage', () => {
      expect(findAll('Saved $2M with 30% cost reduction'))
        .toEqual(['$2M', '30%']);
    });
  });

  describe('no matches', () => {
    it('returns empty for plain text', () => {
      expect(findAll('Led the authentication migration project')).toEqual([]);
    });

    it('does not match bare numbers without units', () => {
      expect(findAll('Version 2 of the API')).toEqual([]);
    });
  });
});

describe('highlightMetrics', () => {
  describe('no metrics — returns plain string', () => {
    it('returns the original string when no metrics are found', () => {
      const result = highlightMetrics('Led the auth migration');
      expect(result).toBe('Led the auth migration');
    });

    it('returns the original string for empty input', () => {
      const result = highlightMetrics('');
      expect(result).toBe('');
    });
  });

  describe('single metric — wraps in <mark>', () => {
    it('highlights a percentage', () => {
      const { container } = render(<>{highlightMetrics('Reduced errors by 40%')}</>);
      const mark = container.querySelector('mark');
      expect(mark).not.toBeNull();
      expect(mark!.textContent).toBe('40%');
      expect(mark!.className).toContain('bg-amber-100');
      expect(mark!.className).toContain('text-amber-900');
      expect(mark!.className).toContain('font-semibold');
    });

    it('highlights a dollar amount', () => {
      const { container } = render(<>{highlightMetrics('Generated $1.5M in revenue')}</>);
      const mark = container.querySelector('mark');
      expect(mark!.textContent).toBe('$1.5M');
    });

    it('highlights a duration', () => {
      const { container } = render(<>{highlightMetrics('Saved 20 hours weekly')}</>);
      const mark = container.querySelector('mark');
      expect(mark!.textContent).toBe('20 hours');
    });

    it('preserves surrounding text', () => {
      const { container } = render(<>{highlightMetrics('Achieved 99.9% uptime')}</>);
      expect(container.textContent).toBe('Achieved 99.9% uptime');
    });
  });

  describe('multiple metrics — wraps each independently', () => {
    it('highlights all metrics in a sentence', () => {
      const { container } = render(
        <>{highlightMetrics('Reduced latency by 40% saving $2M for 12 engineers')}</>
      );
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(3);
      expect(marks[0].textContent).toBe('40%');
      expect(marks[1].textContent).toBe('$2M');
      expect(marks[2].textContent).toBe('12 engineers');
    });

    it('preserves all non-metric text between highlights', () => {
      const { container } = render(
        <>{highlightMetrics('Cut 30% of costs and saved 5 hours per week')}</>
      );
      expect(container.textContent).toBe('Cut 30% of costs and saved 5 hours per week');
    });
  });

  describe('global regex lastIndex safety — regression test', () => {
    it('correctly highlights metrics on consecutive calls (no stale lastIndex)', () => {
      // This is the regression test for the bug where using .test() with a /g regex
      // caused alternating true/false results due to stateful lastIndex.
      const texts = [
        'Reduced by 40%',
        'Saved $2M',
        'Led 12 engineers',
        'Achieved 99.9% uptime',
        'Over 6 weeks',
      ];

      for (const text of texts) {
        const { container, unmount } = render(<>{highlightMetrics(text)}</>);
        const marks = container.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThanOrEqual(1);
        unmount();
      }
    });

    it('alternating metric/no-metric calls work correctly', () => {
      // Plain → metric → plain → metric should all work
      expect(highlightMetrics('No metrics here')).toBe('No metrics here');

      const { container: c1, unmount: u1 } = render(<>{highlightMetrics('Cut 50%')}</>);
      expect(c1.querySelectorAll('mark')).toHaveLength(1);
      u1();

      expect(highlightMetrics('Still no metrics')).toBe('Still no metrics');

      const { container: c2, unmount: u2 } = render(<>{highlightMetrics('Saved 10 hours')}</>);
      expect(c2.querySelectorAll('mark')).toHaveLength(1);
      u2();
    });
  });

  describe('edge cases', () => {
    it('handles metric at start of string', () => {
      const { container } = render(<>{highlightMetrics('40% reduction in errors')}</>);
      const mark = container.querySelector('mark');
      expect(mark!.textContent).toBe('40%');
    });

    it('handles metric at end of string', () => {
      const { container } = render(<>{highlightMetrics('Team grew to 50 engineers')}</>);
      const mark = container.querySelector('mark');
      expect(mark!.textContent).toBe('50 engineers');
    });

    it('handles back-to-back metrics', () => {
      // "40% 20 hours" — 40% and 20 hours are adjacent
      const { container } = render(<>{highlightMetrics('Improved 40% saving 20 hours')}</>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(2);
    });

    it('handles large comma-separated numbers', () => {
      const { container } = render(<>{highlightMetrics('Served 1,000,000 users')}</>);
      const mark = container.querySelector('mark');
      expect(mark!.textContent).toBe('1,000,000 users');
    });

    it('handles decimal multipliers', () => {
      const { container } = render(<>{highlightMetrics('Made it 2.5x faster')}</>);
      const mark = container.querySelector('mark');
      expect(mark!.textContent).toBe('2.5x');
    });
  });
});
