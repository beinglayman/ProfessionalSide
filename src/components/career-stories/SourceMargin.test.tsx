import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SourceMargin } from './SourceMargin';
import { StorySource } from '../../types/career-stories';

const createSource = (overrides?: Partial<StorySource>): StorySource => ({
  id: `src-${Math.random().toString(36).slice(2, 7)}`,
  storyId: 'story-1',
  sectionKey: 'situation',
  sourceType: 'activity',
  activityId: 'act-1',
  label: 'Fix auth bug #42',
  content: null,
  url: 'https://github.com/org/repo/pull/42',
  annotation: null,
  toolType: 'github',
  role: 'author',
  questionId: null,
  sortOrder: 0,
  excludedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('SourceMargin', () => {
  const onExclude = vi.fn();
  const onUndoExclude = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders activity sources with tool icons and labels', () => {
      const sources = [
        createSource({ id: 'src-1', label: 'PR #42' }),
        createSource({ id: 'src-2', label: 'PR #43', toolType: 'jira' }),
      ];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      expect(screen.getByText('PR #42')).toBeInTheDocument();
      expect(screen.getByText('PR #43')).toBeInTheDocument();
    });

    it('renders links for sources with URLs', () => {
      const sources = [createSource({ label: 'PR #42', url: 'https://github.com/pr/42' })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      const link = screen.getByText('PR #42');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://github.com/pr/42');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders plain text for sources without URLs', () => {
      const sources = [createSource({ label: 'Manual note', url: null })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      const label = screen.getByText('Manual note');
      expect(label.tagName).toBe('SPAN');
    });
  });

  describe('Filtering', () => {
    it('returns null when no activity sources exist', () => {
      const { container } = render(
        <SourceMargin
          sources={[]}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('filters out excluded sources', () => {
      const sources = [
        createSource({ id: 'src-1', label: 'Active', excludedAt: null }),
        createSource({ id: 'src-2', label: 'Excluded', excludedAt: '2024-01-01T00:00:00Z' }),
      ];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.queryByText('Excluded')).not.toBeInTheDocument();
    });

    it('filters out non-activity sources (wizard_answer, user_note)', () => {
      const sources = [
        createSource({ id: 'src-1', label: 'Activity', sourceType: 'activity' }),
        createSource({ id: 'src-2', label: 'Wizard', sourceType: 'wizard_answer' }),
        createSource({ id: 'src-3', label: 'Note', sourceType: 'user_note' }),
      ];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
      expect(screen.queryByText('Note')).not.toBeInTheDocument();
    });
  });

  describe('Exclude/Undo Flow', () => {
    it('shows undo UI immediately when exclude is clicked', () => {
      const sources = [createSource({ id: 'src-1', label: 'PR #42' })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      fireEvent.click(screen.getByTitle('Exclude source'));

      expect(screen.getByText('Excluded.')).toBeInTheDocument();
      expect(screen.getByText('Undo')).toBeInTheDocument();
      // onExclude not called yet — waiting for timer
      expect(onExclude).not.toHaveBeenCalled();
    });

    it('calls onExclude after 5s timer expires', () => {
      const sources = [createSource({ id: 'src-1', label: 'PR #42' })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      fireEvent.click(screen.getByTitle('Exclude source'));

      act(() => { vi.advanceTimersByTime(5000); });

      expect(onExclude).toHaveBeenCalledWith('src-1');
    });

    it('cancels exclude and calls onUndoExclude when Undo is clicked', () => {
      const sources = [createSource({ id: 'src-1', label: 'PR #42' })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      fireEvent.click(screen.getByTitle('Exclude source'));
      fireEvent.click(screen.getByText('Undo'));

      // Timer cancelled — onExclude never fires
      act(() => { vi.advanceTimersByTime(5000); });
      expect(onExclude).not.toHaveBeenCalled();
      expect(onUndoExclude).toHaveBeenCalledWith('src-1');
    });

    it('clears timer on unmount to prevent memory leak', () => {
      const sources = [createSource({ id: 'src-1', label: 'PR #42' })];

      const { unmount } = render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      fireEvent.click(screen.getByTitle('Exclude source'));
      unmount();

      // Timer should be cleared — onExclude never fires
      act(() => { vi.advanceTimersByTime(5000); });
      expect(onExclude).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('stays visible with pending exclude even if all sources are filtered', () => {
      // When a source is pending exclude, the component should still render
      // the undo UI even though the source is visually replaced
      const sources = [createSource({ id: 'src-1', label: 'Only source' })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      fireEvent.click(screen.getByTitle('Exclude source'));

      // Component should still be rendered with undo UI
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('handles source with null toolType by falling back to generic', () => {
      const sources = [createSource({ id: 'src-1', label: 'Unknown tool', toolType: null })];

      render(
        <SourceMargin
          sources={sources}

          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      expect(screen.getByText('Unknown tool')).toBeInTheDocument();
    });
  });
});
