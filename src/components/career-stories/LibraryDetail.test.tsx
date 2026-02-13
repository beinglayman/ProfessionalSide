import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryDetail } from './LibraryDetail';
import type { StoryDerivation, CareerStory } from '../../types/career-stories';

// Mock clipboard
const mockClipboard = { writeText: vi.fn() };
Object.assign(navigator, { clipboard: mockClipboard });

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// =============================================================================
// FACTORIES
// =============================================================================

const makeSingle = (overrides: Partial<StoryDerivation> = {}): StoryDerivation => ({
  id: 'd-single-1',
  kind: 'single',
  type: 'interview',
  storyIds: ['s-1'],
  storySnapshots: [
    { storyId: 's-1', title: 'Auth Migration Story', generatedAt: '2026-01-01T00:00:00Z' },
  ],
  text: 'When asked about distributed systems, I led a migration.',
  charCount: 56,
  wordCount: 10,
  creditCost: 1,
  createdAt: '2026-02-10T12:00:00Z',
  ...overrides,
});

const makePacket = (overrides: Partial<StoryDerivation> = {}): StoryDerivation => ({
  id: 'd-packet-1',
  kind: 'packet',
  type: 'promotion',
  storyIds: ['s-1', 's-2'],
  storySnapshots: [
    { storyId: 's-1', title: 'Auth Migration', generatedAt: '2026-01-01T00:00:00Z' },
    { storyId: 's-2', title: 'Perf Sprint', generatedAt: '2026-02-01T00:00:00Z' },
  ],
  text: '## Promotion Case\n\nOver the past quarter...',
  charCount: 300,
  wordCount: 142,
  creditCost: 3,
  createdAt: '2026-02-10T14:00:00Z',
  ...overrides,
});

const makeStory = (overrides: Partial<CareerStory> = {}): CareerStory => ({
  id: 's-1',
  userId: 'u-1',
  sourceMode: 'production',
  title: 'Auth Migration Story',
  framework: 'STAR',
  sections: {},
  activityIds: ['a-1'],
  needsRegeneration: false,
  generatedAt: '2026-01-01T00:00:00Z',
  isPublished: false,
  visibility: 'private',
  publishedAt: null,
  ...overrides,
} as CareerStory);

const defaultProps = {
  allStories: [makeStory({ id: 's-1' }), makeStory({ id: 's-2', title: 'Perf Sprint' })],
  onBack: vi.fn(),
  onDelete: vi.fn(),
  onRegenerate: vi.fn(),
  onNavigateToStory: vi.fn(),
};

function renderDetail(item: StoryDerivation, overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <LibraryDetail item={item} {...props} />,
    { wrapper: createWrapper() },
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe('LibraryDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  it('renders content for single-kind derivation', () => {
    renderDetail(makeSingle());
    // The derivation text is rendered via AnnotatedText which may split text with emphasis <strong> tags
    expect(screen.getByTestId('derivation-detail')).toHaveTextContent(/led.*migration/);
  });

  it('renders content for packet-kind derivation', () => {
    renderDetail(makePacket());
    // Packet text should be rendered
    expect(screen.getByText(/past quarter/)).toBeInTheDocument();
  });

  it('shows source story names from snapshots', () => {
    renderDetail(makePacket());
    expect(screen.getByText('Auth Migration')).toBeInTheDocument();
    expect(screen.getByText('Perf Sprint')).toBeInTheDocument();
  });

  it('copies text to clipboard', async () => {
    renderDetail(makeSingle());
    await userEvent.click(screen.getByLabelText('Copy to clipboard'));
    expect(mockClipboard.writeText).toHaveBeenCalledWith(makeSingle().text);
    await waitFor(() => {
      expect(screen.getByLabelText('Copied to clipboard')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation dialog on Delete click', async () => {
    renderDetail(makeSingle());
    // Open dropdown
    await userEvent.click(screen.getByLabelText('More actions'));
    // Click delete
    await userEvent.click(screen.getByText('Delete'));
    // Confirmation dialog should appear
    expect(screen.getByText('Delete from Library')).toBeInTheDocument();
    expect(screen.getByText(/This can't be undone/)).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', async () => {
    const onDelete = vi.fn();
    renderDetail(makeSingle(), { onDelete });
    // Open dropdown → Delete → Confirm
    await userEvent.click(screen.getByLabelText('More actions'));
    await userEvent.click(screen.getByText('Delete'));
    // Click the confirm button in the dialog
    const confirmButtons = screen.getAllByRole('button', { name: /delete/i });
    const confirmButton = confirmButtons[confirmButtons.length - 1]; // Last one is in dialog
    await userEvent.click(confirmButton);
    expect(onDelete).toHaveBeenCalledWith('d-single-1');
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    renderDetail(makeSingle(), { onBack });
    await userEvent.click(screen.getByLabelText('Back to library'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows metadata with type badge and word count', () => {
    renderDetail(makeSingle());
    // Word count appears in provenance line and footer — at least one exists
    expect(screen.getAllByText(/10\s*words/).length).toBeGreaterThanOrEqual(1);
    // Type badge (span) should be present alongside the combined title
    expect(screen.getByText('Interview Answer', { selector: 'span' })).toBeInTheDocument();
  });

  it('calls onRegenerate when Regenerate is clicked', async () => {
    const onRegenerate = vi.fn();
    const item = makeSingle();
    renderDetail(item, { onRegenerate });
    await userEvent.click(screen.getByLabelText('More actions'));
    await userEvent.click(screen.getByText('Regenerate'));
    expect(onRegenerate).toHaveBeenCalledWith(item);
  });

  it('navigates to source story on click', async () => {
    const onNavigateToStory = vi.fn();
    renderDetail(makeSingle(), { onNavigateToStory });
    await userEvent.click(screen.getByText('Auth Migration Story'));
    expect(onNavigateToStory).toHaveBeenCalledWith('s-1');
  });

  // =========================================================================
  // TITLE CONSISTENCY: LibraryCard ↔ LibraryDetail must show same title
  // =========================================================================

  it('shows combined title matching LibraryCard format for single', () => {
    renderDetail(makeSingle());
    // getTitle(item, label) → "Interview Answer — Auth Migration Story"
    expect(screen.getByText('Interview Answer — Auth Migration Story')).toBeInTheDocument();
  });

  it('shows combined title matching LibraryCard format for packet', () => {
    renderDetail(makePacket());
    // getTitle(item, label) → "Promotion — Auth Migration + 1 more"
    expect(screen.getByText('Promotion — Auth Migration + 1 more')).toBeInTheDocument();
  });

  it('falls back to type label when no snapshots', () => {
    const item = makeSingle({ storySnapshots: undefined });
    renderDetail(item);
    // No snapshots → title = just the label, rendered in the h2
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Interview Answer');
  });
});
