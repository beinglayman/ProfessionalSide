import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotesPillBar } from './NotesPillBar';
import { StorySource } from '../../types/career-stories';

function makeNote(overrides: Partial<StorySource> = {}): StorySource {
  return {
    id: 'note-1',
    storyId: 'story-1',
    sectionKey: 'situation',
    sourceType: 'user_note',
    activityId: null,
    label: 'Test note',
    content: 'Some note content',
    url: null,
    annotation: null,
    toolType: null,
    role: null,
    questionId: null,
    sortOrder: 0,
    excludedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('NotesPillBar', () => {
  const defaultProps = {
    sectionKey: 'situation',
    onAddNote: vi.fn(),
    onExclude: vi.fn(),
    onUndoExclude: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders nothing when no notes and input is closed', () => {
      const { container } = render(<NotesPillBar {...defaultProps} notes={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders note pills for active notes', () => {
      const notes = [
        makeNote({ id: 'n1', content: 'First note' }),
        makeNote({ id: 'n2', content: 'Second note' }),
      ];
      render(<NotesPillBar {...defaultProps} notes={notes} />);
      expect(screen.getByText('First note')).toBeInTheDocument();
      expect(screen.getByText('Second note')).toBeInTheDocument();
    });

    it('excludes notes with excludedAt from display', () => {
      const notes = [
        makeNote({ id: 'n1', content: 'Visible' }),
        makeNote({ id: 'n2', content: 'Hidden', excludedAt: '2026-01-01T00:00:00Z' }),
      ];
      render(<NotesPillBar {...defaultProps} notes={notes} />);
      expect(screen.getByText('Visible')).toBeInTheDocument();
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });

  describe('Add note flow', () => {
    it('shows input when + button is clicked', () => {
      const notes = [makeNote()];
      render(<NotesPillBar {...defaultProps} notes={notes} />);
      fireEvent.click(screen.getByRole('button', { name: '' })); // Plus icon button
      expect(screen.getByPlaceholderText('Your note...')).toBeInTheDocument();
    });

    it('submits note on Enter and clears input', () => {
      const onAddNote = vi.fn();
      const notes = [makeNote()];
      render(<NotesPillBar {...defaultProps} notes={notes} onAddNote={onAddNote} />);

      // Open input
      fireEvent.click(screen.getByRole('button', { name: '' }));
      const input = screen.getByPlaceholderText('Your note...');
      fireEvent.change(input, { target: { value: 'New note' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onAddNote).toHaveBeenCalledWith('situation', 'New note');
    });

    it('closes input on Escape', () => {
      const notes = [makeNote()];
      render(<NotesPillBar {...defaultProps} notes={notes} />);

      fireEvent.click(screen.getByRole('button', { name: '' }));
      const input = screen.getByPlaceholderText('Your note...');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByPlaceholderText('Your note...')).not.toBeInTheDocument();
    });

    it('does not submit empty or whitespace-only notes', () => {
      const onAddNote = vi.fn();
      const notes = [makeNote()];
      render(<NotesPillBar {...defaultProps} notes={notes} onAddNote={onAddNote} />);

      fireEvent.click(screen.getByRole('button', { name: '' }));
      const input = screen.getByPlaceholderText('Your note...');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onAddNote).not.toHaveBeenCalled();
    });
  });

  describe('Exclude with undo', () => {
    it('shows "Removed" with Undo button when excluding a note', () => {
      const notes = [makeNote({ id: 'n1', content: 'To remove' })];
      render(<NotesPillBar {...defaultProps} notes={notes} />);

      // Click the X button on the pill
      const removeBtn = screen.getByTitle('Remove note');
      fireEvent.click(removeBtn);

      expect(screen.getByText('Removed')).toBeInTheDocument();
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('calls onExclude after 5s timeout', () => {
      const onExclude = vi.fn();
      const notes = [makeNote({ id: 'n1', content: 'To remove' })];
      render(<NotesPillBar {...defaultProps} notes={notes} onExclude={onExclude} />);

      fireEvent.click(screen.getByTitle('Remove note'));
      expect(onExclude).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onExclude).toHaveBeenCalledWith('n1');
    });

    it('cancels exclusion on Undo click', () => {
      const onExclude = vi.fn();
      const onUndoExclude = vi.fn();
      const notes = [makeNote({ id: 'n1', content: 'To remove' })];
      render(
        <NotesPillBar
          {...defaultProps}
          notes={notes}
          onExclude={onExclude}
          onUndoExclude={onUndoExclude}
        />
      );

      fireEvent.click(screen.getByTitle('Remove note'));
      fireEvent.click(screen.getByText('Undo'));

      // Fast-forward past the timeout — onExclude should NOT fire
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(onExclude).not.toHaveBeenCalled();
      expect(onUndoExclude).toHaveBeenCalledWith('n1');
    });
  });

  describe('forceShowInput (controlled mode)', () => {
    it('opens input when forceShowInput becomes true', () => {
      const notes = [makeNote()];
      const { rerender } = render(
        <NotesPillBar {...defaultProps} notes={notes} forceShowInput={false} />
      );
      expect(screen.queryByPlaceholderText('Your note...')).not.toBeInTheDocument();

      rerender(
        <NotesPillBar {...defaultProps} notes={notes} forceShowInput={true} />
      );
      expect(screen.getByPlaceholderText('Your note...')).toBeInTheDocument();
    });

    it('closes input when forceShowInput resets to false', () => {
      const notes = [makeNote()];
      const { rerender } = render(
        <NotesPillBar {...defaultProps} notes={notes} forceShowInput={true} />
      );
      expect(screen.getByPlaceholderText('Your note...')).toBeInTheDocument();

      rerender(
        <NotesPillBar {...defaultProps} notes={notes} forceShowInput={false} />
      );
      expect(screen.queryByPlaceholderText('Your note...')).not.toBeInTheDocument();
    });

    it('calls onInputClosed when input is closed via Escape', () => {
      const onInputClosed = vi.fn();
      const notes = [makeNote()];
      render(
        <NotesPillBar
          {...defaultProps}
          notes={notes}
          forceShowInput={true}
          onInputClosed={onInputClosed}
        />
      );

      fireEvent.keyDown(screen.getByPlaceholderText('Your note...'), { key: 'Escape' });
      expect(onInputClosed).toHaveBeenCalled();
    });

    it('calls onInputClosed after successful submit', () => {
      const onInputClosed = vi.fn();
      const onAddNote = vi.fn();
      const notes = [makeNote()];
      render(
        <NotesPillBar
          {...defaultProps}
          notes={notes}
          onAddNote={onAddNote}
          forceShowInput={true}
          onInputClosed={onInputClosed}
        />
      );

      const input = screen.getByPlaceholderText('Your note...');
      fireEvent.change(input, { target: { value: 'New note' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onInputClosed).toHaveBeenCalled();
    });
  });
});
