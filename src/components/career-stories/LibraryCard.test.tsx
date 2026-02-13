import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryCard } from './LibraryCard';
import { stripMarkdown, getItemMeta, getTitle } from './derivation-helpers';
import type { StoryDerivation } from '../../types/career-stories';

// =============================================================================
// FACTORIES
// =============================================================================

const makeSingle = (overrides: Partial<StoryDerivation> = {}): StoryDerivation => ({
  id: 'd-single-1',
  kind: 'single',
  type: 'interview',
  storyIds: ['s-1'],
  text: 'When asked about distributed systems, I led a migration from monolith to microservices that improved deploy frequency by 10x.',
  charCount: 120,
  wordCount: 22,
  creditCost: 1,
  createdAt: '2026-02-10T12:00:00Z',
  ...overrides,
});

const makePacket = (overrides: Partial<StoryDerivation> = {}): StoryDerivation => ({
  id: 'd-packet-1',
  kind: 'packet',
  type: 'promotion',
  storyIds: ['s-1', 's-2', 's-3'],
  storySnapshots: [
    { storyId: 's-1', title: 'BILL-550 Double-debit Work', generatedAt: '2026-01-01T00:00:00Z' },
    { storyId: 's-2', title: 'Auth Migration', generatedAt: '2026-01-15T00:00:00Z' },
    { storyId: 's-3', title: 'Perf Sprint', generatedAt: '2026-02-01T00:00:00Z' },
  ],
  text: '## Promotion Case\n\nOver the past quarter, I led three major initiatives...',
  charCount: 300,
  wordCount: 142,
  creditCost: 3,
  createdAt: '2026-02-10T14:00:00Z',
  ...overrides,
});

// =============================================================================
// UNIT: stripMarkdown
// =============================================================================

describe('stripMarkdown', () => {
  it('strips headers', () => {
    expect(stripMarkdown('## My Header')).toBe('My Header');
  });

  it('strips bold and italic', () => {
    expect(stripMarkdown('**bold** and *italic*')).toBe('bold and italic');
  });

  it('strips bold+italic combined', () => {
    expect(stripMarkdown('***bold italic***')).toBe('bold italic');
  });

  it('strips links, keeping text', () => {
    expect(stripMarkdown('[click here](https://example.com)')).toBe('click here');
  });

  it('strips bullets', () => {
    expect(stripMarkdown('- item one\n- item two')).toBe('item one item two');
  });

  it('strips numbered lists', () => {
    expect(stripMarkdown('1. first\n2. second')).toBe('first second');
  });

  it('strips blockquotes', () => {
    expect(stripMarkdown('> quoted text')).toBe('quoted text');
  });

  it('strips fenced code blocks', () => {
    expect(stripMarkdown('before\n```\ncode\n```\nafter')).toBe('before after');
  });

  it('strips inline code', () => {
    expect(stripMarkdown('use `npm install`')).toBe('use npm install');
  });

  it('collapses whitespace', () => {
    expect(stripMarkdown('  spaced   out  ')).toBe('spaced out');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });
});

// =============================================================================
// UNIT: getItemMeta
// =============================================================================

describe('getItemMeta', () => {
  it('returns correct meta for single interview derivation', () => {
    const meta = getItemMeta(makeSingle({ type: 'interview' }));
    expect(meta.label).toBe('Interview Answer');
  });

  it('returns correct meta for single linkedin derivation', () => {
    const meta = getItemMeta(makeSingle({ type: 'linkedin' }));
    expect(meta.label).toBe('Professional Post');
  });

  it('returns correct meta for packet promotion', () => {
    const meta = getItemMeta(makePacket({ type: 'promotion' }));
    expect(meta.label).toBe('Promotion');
  });

  it('returns fallback for unknown single type', () => {
    const meta = getItemMeta(makeSingle({ type: 'unknown-type' as any }));
    expect(meta.label).toBe('unknown-type');
    expect(meta.color).toBe('gray');
  });

  it('returns fallback for unknown packet type', () => {
    const meta = getItemMeta(makePacket({ type: 'unknown-packet' as any }));
    expect(meta.label).toBe('unknown-packet');
    expect(meta.color).toBe('gray');
  });
});

// =============================================================================
// UNIT: getTitle
// =============================================================================

describe('getTitle', () => {
  it('returns just label when no snapshots', () => {
    expect(getTitle(makeSingle(), 'Interview Answer')).toBe('Interview Answer');
  });

  it('returns label + story name for single snapshot', () => {
    const item = makeSingle({
      storySnapshots: [{ storyId: 's-1', title: 'Auth Migration', generatedAt: null }],
    });
    expect(getTitle(item, 'Interview Answer')).toBe('Interview Answer — Auth Migration');
  });

  it('returns label + first name + count for multiple snapshots', () => {
    expect(getTitle(makePacket(), 'Promotion')).toBe('Promotion — BILL-550 Double-debit Work + 2 more');
  });

  it('returns just label when snapshot title is empty', () => {
    const item = makeSingle({
      storySnapshots: [{ storyId: 's-1', title: '', generatedAt: null }],
    });
    expect(getTitle(item, 'Interview Answer')).toBe('Interview Answer');
  });

  it('returns just label when snapshot title is whitespace', () => {
    const item = makeSingle({
      storySnapshots: [{ storyId: 's-1', title: '   ', generatedAt: null }],
    });
    expect(getTitle(item, 'Interview Answer')).toBe('Interview Answer');
  });

  it('returns just label when storySnapshots is empty array', () => {
    const item = makeSingle({ storySnapshots: [] });
    expect(getTitle(item, 'Interview Answer')).toBe('Interview Answer');
  });

  it('handles exactly 2 snapshots with correct count', () => {
    const item = makeSingle({
      storySnapshots: [
        { storyId: 's-1', title: 'Story A', generatedAt: null },
        { storyId: 's-2', title: 'Story B', generatedAt: null },
      ],
    });
    expect(getTitle(item, 'Resume Bullet')).toBe('Resume Bullet — Story A + 1 more');
  });
});

// =============================================================================
// COMPONENT: LibraryCard
// =============================================================================

describe('LibraryCard', () => {
  it('renders single derivation metadata', () => {
    render(<LibraryCard item={makeSingle()} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Interview Answer')).toBeInTheDocument();
    expect(screen.getByText('22 words')).toBeInTheDocument();
  });

  it('renders packet with combined title', () => {
    render(<LibraryCard item={makePacket()} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Promotion — BILL-550 Double-debit Work + 2 more')).toBeInTheDocument();
    expect(screen.getByText('142 words')).toBeInTheDocument();
  });

  it('truncates preview at ~140 chars', () => {
    const longText = 'A'.repeat(200);
    render(<LibraryCard item={makeSingle({ text: longText })} isSelected={false} onClick={vi.fn()} />);
    // The preview should end with ellipsis
    const preview = screen.getByText(/A+…$/);
    expect(preview.textContent!.length).toBeLessThanOrEqual(141); // 140 chars + ellipsis
  });

  it('strips markdown from preview', () => {
    const item = makeSingle({ text: '**Bold intro** and *italic* text for the preview area.' });
    render(<LibraryCard item={item} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText(/Bold intro and italic text/)).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('shows selected state classes', () => {
    const { container } = render(<LibraryCard item={makeSingle()} isSelected={true} onClick={vi.fn()} />);
    const card = container.firstElementChild!;
    expect(card.className).toContain('bg-purple-50/50');
    expect(card.className).toContain('border-purple-300');
    expect(card.className).toContain('shadow-md');
    expect(card.className).toContain('ring-1');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<LibraryCard item={makeSingle()} isSelected={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows fallback for unknown type', () => {
    render(<LibraryCard item={makeSingle({ type: 'mystery' as any })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });

  it('triggers onClick on Enter key', () => {
    const onClick = vi.fn();
    render(<LibraryCard item={makeSingle()} isSelected={false} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('triggers onClick on Space key', () => {
    const onClick = vi.fn();
    render(<LibraryCard item={makeSingle()} isSelected={false} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows "No content" for empty text', () => {
    render(<LibraryCard item={makeSingle({ text: '' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('has aria-label with type, word count, and date', () => {
    render(<LibraryCard item={makeSingle()} isSelected={false} onClick={vi.fn()} />);
    const card = screen.getByRole('button');
    expect(card.getAttribute('aria-label')).toMatch(/Interview Answer/);
    expect(card.getAttribute('aria-label')).toMatch(/22 words/);
  });

  it('shows annotation count badge when annotations > 0', () => {
    render(<LibraryCard item={makeSingle({ _count: { annotations: 3 } })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides annotation badge when count is 0', () => {
    render(<LibraryCard item={makeSingle({ _count: { annotations: 0 } })} isSelected={false} onClick={vi.fn()} />);
    // Word count "22" is present but no standalone "0" annotation badge
    const footer = screen.getByText('22 words').parentElement!;
    expect(footer.textContent).not.toMatch(/\b0\b.*Pencil/);
  });

  it('hides annotation badge when _count is absent', () => {
    render(<LibraryCard item={makeSingle()} isSelected={false} onClick={vi.fn()} />);
    const footer = screen.getByText('22 words').parentElement!;
    // Only word count in footer, no annotation count
    expect(footer.querySelectorAll('.text-amber-600')).toHaveLength(0);
  });

  it('renders combined title for single with snapshot', () => {
    const item = makeSingle({
      storySnapshots: [{ storyId: 's-1', title: 'Auth Migration', generatedAt: null }],
    });
    render(<LibraryCard item={item} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Interview Answer — Auth Migration')).toBeInTheDocument();
  });

  it('renders responsive padding classes', () => {
    const { container } = render(<LibraryCard item={makeSingle()} isSelected={false} onClick={vi.fn()} />);
    const card = container.firstElementChild!;
    expect(card.className).toContain('p-4');
    expect(card.className).toContain('sm:p-5');
  });

  it('renders ChevronRight icon for navigation hint', () => {
    const { container } = render(<LibraryCard item={makeSingle()} isSelected={false} onClick={vi.fn()} />);
    // ChevronRight renders as an SVG inside the card
    const svgs = container.querySelectorAll('svg');
    // At least 2 SVGs: type icon + chevron
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render source label in footer (moved to title)', () => {
    render(<LibraryCard item={makePacket()} isSelected={false} onClick={vi.fn()} />);
    // "from BILL-550..." should NOT appear as a separate footer element
    expect(screen.queryByText(/^from /)).not.toBeInTheDocument();
  });

  it('renders unselected state without shadow-md', () => {
    const { container } = render(<LibraryCard item={makeSingle()} isSelected={false} onClick={vi.fn()} />);
    const card = container.firstElementChild!;
    // shadow-md is only in hover: prefix, not in base classes when unselected
    expect(card.className).not.toMatch(/(?<!hover:)shadow-md/);
  });
});
