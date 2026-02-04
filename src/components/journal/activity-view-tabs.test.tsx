import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityViewTabs, ActivityViewType } from './activity-view-tabs';

describe('ActivityViewTabs', () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    mockOnViewChange.mockClear();
  });

  it('renders all three tabs with correct labels', () => {
    render(
      <ActivityViewTabs activeView="timeline" onViewChange={mockOnViewChange} />
    );

    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /source/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /drafts/i })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(
      <ActivityViewTabs activeView="source" onViewChange={mockOnViewChange} />
    );

    expect(screen.getByRole('tab', { name: /timeline/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /source/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /drafts/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onViewChange when a tab is clicked', () => {
    render(
      <ActivityViewTabs activeView="timeline" onViewChange={mockOnViewChange} />
    );

    fireEvent.click(screen.getByRole('tab', { name: /drafts/i }));
    expect(mockOnViewChange).toHaveBeenCalledWith('story');

    fireEvent.click(screen.getByRole('tab', { name: /source/i }));
    expect(mockOnViewChange).toHaveBeenCalledWith('source');
  });

  it('has correct accessibility attributes', () => {
    render(
      <ActivityViewTabs activeView="timeline" onViewChange={mockOnViewChange} />
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Activity view options');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ActivityViewTabs
        activeView="timeline"
        onViewChange={mockOnViewChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('tab labels follow nav-updates requirements', () => {
    it('displays "Source" without "By" prefix', () => {
      render(
        <ActivityViewTabs activeView="timeline" onViewChange={mockOnViewChange} />
      );

      // Should NOT have "By Source"
      expect(screen.queryByText('By Source')).not.toBeInTheDocument();
      // Should have "Source"
      expect(screen.getByText('Source')).toBeInTheDocument();
    });

    it('displays "Drafts" instead of "By Story"', () => {
      render(
        <ActivityViewTabs activeView="timeline" onViewChange={mockOnViewChange} />
      );

      // Should NOT have "By Story"
      expect(screen.queryByText('By Story')).not.toBeInTheDocument();
      // Should have "Drafts"
      expect(screen.getByText('Drafts')).toBeInTheDocument();
    });
  });
});
