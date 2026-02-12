import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryCard, stripMarkdown, getItemMeta, getSourceLabel } from './LibraryCard';
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
// UNIT: getSourceLabel
// =============================================================================

describe('getSourceLabel', () => {
  it('returns null when no snapshots', () => {
    expect(getSourceLabel(makeSingle())).toBeNull();
  });

  it('returns single story name', () => {
    const item = makeSingle({
      storySnapshots: [{ storyId: 's-1', title: 'My Story', generatedAt: null }],
    });
    expect(getSourceLabel(item)).toBe('from My Story');
  });

  it('returns first name + count for multiple', () => {
    expect(getSourceLabel(makePacket())).toBe('from BILL-550 Double-debit Work + 2 more');
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

  it('renders packet with source count', () => {
    render(<LibraryCard item={makePacket()} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Promotion')).toBeInTheDocument();
    expect(screen.getByText('from BILL-550 Double-debit Work + 2 more')).toBeInTheDocument();
    expect(screen.getByText('142 words')).toBeInTheDocument();
  });

  it('truncates preview at ~100 chars', () => {
    const longText = 'A'.repeat(200);
    render(<LibraryCard item={makeSingle({ text: longText })} isSelected={false} onClick={vi.fn()} />);
    // The preview should end with ellipsis
    const preview = screen.getByText(/A+…$/);
    expect(preview.textContent!.length).toBeLessThanOrEqual(101); // 100 chars + ellipsis
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
});
