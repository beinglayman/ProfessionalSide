import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './empty-state';
import { Plus, Search } from 'lucide-react';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders title', () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(
        <EmptyState
          title="No items found"
          description="Try adjusting your search"
        />
      );
      expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      render(<EmptyState title="No items found" />);
      // Only title should be present
      const paragraphs = screen.queryAllByRole('paragraph');
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe('Variants', () => {
    it('renders no-results variant with AlertCircle icon', () => {
      const { container } = render(
        <EmptyState variant="no-results" title="No results" />
      );
      // AlertCircle icon should be present (check for SVG)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders no-workspaces variant with Building2 icon', () => {
      const { container } = render(
        <EmptyState variant="no-workspaces" title="No workspaces" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('allows custom icon to override variant default', () => {
      const { container } = render(
        <EmptyState
          variant="no-results"
          icon={Search}
          title="Search results"
        />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('renders primary action button', () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          action={{ label: 'Create Item', onClick }}
        />
      );
      expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
    });

    it('calls onClick when primary action clicked', () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          action={{ label: 'Create Item', onClick }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Create Item' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders action with icon', () => {
      const onClick = vi.fn();
      const { container } = render(
        <EmptyState
          title="No items"
          action={{ label: 'Add Item', onClick, icon: Plus }}
        />
      );

      const button = screen.getByRole('button', { name: /Add Item/i });
      expect(button).toBeInTheDocument();
      // Should have icon inside button
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders secondary action button', () => {
      const primaryClick = vi.fn();
      const secondaryClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          action={{ label: 'Primary', onClick: primaryClick }}
          secondaryAction={{ label: 'Secondary', onClick: secondaryClick }}
        />
      );

      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
    });

    it('calls secondary action onClick', () => {
      const secondaryClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          secondaryAction={{ label: 'Cancel', onClick: secondaryClick }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(secondaryClick).toHaveBeenCalledTimes(1);
    });

    it('does not render action buttons when not provided', () => {
      render(<EmptyState title="No items" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <EmptyState title="Test" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('maintains base styling classes', () => {
      const { container } = render(<EmptyState title="Test" />);
      expect(container.firstChild).toHaveClass('border-dashed');
      expect(container.firstChild).toHaveClass('text-center');
    });
  });

  describe('Real-world Scenarios', () => {
    it('renders workspace empty state correctly', () => {
      const onCreate = vi.fn();
      render(
        <EmptyState
          variant="no-workspaces"
          title="Create your first workspace"
          description="Workspaces help you organize your journal entries."
          action={{ label: 'Create Workspace', onClick: onCreate, icon: Plus }}
        />
      );

      expect(screen.getByText('Create your first workspace')).toBeInTheDocument();
      expect(screen.getByText('Workspaces help you organize your journal entries.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Workspace/i })).toBeInTheDocument();
    });

    it('renders filter no-results state correctly', () => {
      const onClear = vi.fn();
      render(
        <EmptyState
          variant="no-results"
          title="No workspaces found"
          description="No active workspaces match your filters"
          action={{ label: 'Clear all filters', onClick: onClear }}
        />
      );

      expect(screen.getByText('No workspaces found')).toBeInTheDocument();
      expect(screen.getByText('No active workspaces match your filters')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
      expect(onClear).toHaveBeenCalled();
    });
  });
});
