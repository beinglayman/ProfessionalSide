/**
 * UnifiedAnnotationPopover Unit Tests
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedAnnotationPopover } from './UnifiedAnnotationPopover';
import type { StoryAnnotation } from '../../types/career-stories';

const mockAnnotation: StoryAnnotation = {
  id: 'ann-1',
  storyId: 'story-1',
  derivationId: null,
  sectionKey: 'situation',
  startOffset: 0,
  endOffset: 10,
  annotatedText: 'lead the m',
  style: 'underline',
  color: 'rose',
  note: '<p>Important note</p>',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const defaultPosition = { x: 200, y: 100 };

describe('UnifiedAnnotationPopover', () => {
  it('renders in create mode with Apply button', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('renders in edit mode with Save and Remove buttons', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="edit"
        annotation={mockAnnotation}
        onSave={vi.fn()}
        onRemove={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
  });

  it('shows truncated annotated text in edit mode', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="edit"
        annotation={mockAnnotation}
        onSave={vi.fn()}
        onRemove={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // The annotated text should be displayed in the header
    expect(screen.getByText(/lead the m/)).toBeInTheDocument();
  });

  it('renders 6 style buttons', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Mark as Highlight')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as Underline')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as Box')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as Circle')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as Strike-through')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as Bracket')).toBeInTheDocument();
  });

  it('renders 7 color buttons', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Color: amber')).toBeInTheDocument();
    expect(screen.getByLabelText('Color: rose')).toBeInTheDocument();
    expect(screen.getByLabelText('Color: blue')).toBeInTheDocument();
    expect(screen.getByLabelText('Color: emerald')).toBeInTheDocument();
    expect(screen.getByLabelText('Color: violet')).toBeInTheDocument();
    expect(screen.getByLabelText('Color: orange')).toBeInTheDocument();
    expect(screen.getByLabelText('Color: cyan')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={vi.fn()}
        onClose={onClose}
      />
    );

    // The backdrop is the first fixed inset-0 element
    const backdrop = document.querySelector('.fixed.inset-0.z-40');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove when Remove button is clicked in edit mode', () => {
    const onRemove = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="edit"
        annotation={mockAnnotation}
        onSave={vi.fn()}
        onRemove={onRemove}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders 3 formatting toolbar buttons (Bold, Italic, Bullet list)', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
  });

  it('pre-selects style and color from annotation in edit mode', () => {
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="edit"
        annotation={mockAnnotation}
        onSave={vi.fn()}
        onRemove={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // The underline button should have the active style (check mark child)
    const underlineBtn = screen.getByLabelText('Mark as Underline');
    const checkInStyle = underlineBtn.querySelector('svg:last-child');
    expect(checkInStyle).toBeTruthy();

    // The rose color button should have the active ring
    const roseBtn = screen.getByLabelText('Color: rose');
    expect(roseBtn.className).toContain('ring-2');
  });

  it('calls onApply with default style/color and null note when Apply is clicked with empty editor', () => {
    const onApply = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={onApply}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('highlight', 'amber', null);
  });

  it('calls onApply with selected style and color after user changes them', () => {
    const onApply = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={onApply}
        onClose={vi.fn()}
      />
    );

    // Select underline style
    fireEvent.click(screen.getByLabelText('Mark as Underline'));
    // Select blue color
    fireEvent.click(screen.getByLabelText('Color: blue'));
    // Click Apply
    fireEvent.click(screen.getByText('Apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('underline', 'blue', null);
  });

  it('calls onSave with pre-selected style/color from annotation in edit mode', () => {
    const onSave = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="edit"
        annotation={mockAnnotation}
        onSave={onSave}
        onRemove={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Click Save without changing anything
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedUpdates = onSave.mock.calls[0][0];
    expect(savedUpdates.style).toBe('underline');
    expect(savedUpdates.color).toBe('rose');
    // Note should be the annotation's existing HTML note
    expect(savedUpdates.note).toContain('Important note');
  });

  it('calls onSave with updated style/color when user changes them in edit mode', () => {
    const onSave = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="edit"
        annotation={mockAnnotation}
        onSave={onSave}
        onRemove={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Change style to box
    fireEvent.click(screen.getByLabelText('Mark as Box'));
    // Change color to emerald
    fireEvent.click(screen.getByLabelText('Color: emerald'));
    // Click Save
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedUpdates = onSave.mock.calls[0][0];
    expect(savedUpdates.style).toBe('box');
    expect(savedUpdates.color).toBe('emerald');
  });

  it('does not call onSave or onApply when close button is clicked', () => {
    const onApply = vi.fn();
    render(
      <UnifiedAnnotationPopover
        position={defaultPosition}
        mode="create"
        onApply={onApply}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onApply).not.toHaveBeenCalled();
  });
});
