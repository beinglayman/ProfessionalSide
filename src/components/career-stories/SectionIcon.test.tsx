import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SectionIcon } from './SectionIcon';

const ALL_SECTION_KEYS = [
  'situation', 'task', 'problem', 'action', 'actions',
  'result', 'results', 'learning', 'learnings',
  'challenge', 'obstacles', 'hindrances',
  'evaluation', 'reflection', 'context', 'impact',
  'approach', 'outcome',
];

describe('SectionIcon', () => {
  it.each(ALL_SECTION_KEYS)('renders an SVG for "%s"', (key) => {
    const { container } = render(<SectionIcon sectionKey={key} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 20 20');
  });

  it('renders default icon for unknown section key', () => {
    const { container } = render(<SectionIcon sectionKey="unknown_section" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // Default is a document icon with rect + 3 lines
    expect(container.querySelectorAll('rect')).toHaveLength(1);
    expect(container.querySelectorAll('line')).toHaveLength(3);
  });

  it('is case-insensitive', () => {
    const { container: lower } = render(<SectionIcon sectionKey="situation" />);
    const { container: upper } = render(<SectionIcon sectionKey="SITUATION" />);
    expect(lower.innerHTML).toBe(upper.innerHTML);
  });

  it('applies custom className', () => {
    const { container } = render(<SectionIcon sectionKey="action" className="w-8 h-8 text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toContain('text-red-500');
  });

  it('uses currentColor for stroke inheritance', () => {
    const { container } = render(<SectionIcon sectionKey="results" />);
    const stroked = container.querySelectorAll('[stroke="currentColor"]');
    expect(stroked.length).toBeGreaterThan(0);
  });
});
