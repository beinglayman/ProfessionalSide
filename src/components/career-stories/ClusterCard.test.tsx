import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClusterCard, ClusterStatus } from './ClusterCard';
import { Cluster } from '../../types/career-stories';

// Factory for creating test clusters
const createCluster = (overrides?: Partial<Cluster>): Cluster => ({
  id: 'test-cluster-123',
  userId: 'user-1',
  name: 'Auth Migration',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-22T00:00:00Z',
  activityCount: 6,
  activityIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
  metrics: {
    activityCount: 6,
    refCount: 3,
    toolTypes: ['github', 'jira'],
    dateRange: {
      earliest: '2024-01-15T00:00:00Z',
      latest: '2024-01-22T00:00:00Z',
    },
  },
  ...overrides,
});

describe('ClusterCard', () => {
  const defaultProps = {
    cluster: createCluster(),
    isSelected: false,
    status: 'idle' as ClusterStatus,
    onSelect: vi.fn(),
    onGenerateStar: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders cluster name', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByText('Auth Migration')).toBeInTheDocument();
    });

    it('renders fallback name when cluster has no name', () => {
      const cluster = createCluster({ name: null, id: 'abc123xyz' });
      render(<ClusterCard {...defaultProps} cluster={cluster} />);
      // Takes last 6 characters: 'abc123xyz'.slice(-6) = '123xyz'
      expect(screen.getByText('Cluster 123xyz')).toBeInTheDocument();
    });

    it('renders activity count', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByText('6 activities')).toBeInTheDocument();
    });

    it('renders date range', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByText('Jan 15 - Jan 22')).toBeInTheDocument();
    });

    it('renders "No dates" when date range is missing', () => {
      const cluster = createCluster({ metrics: { activityCount: 3, refCount: 1, toolTypes: ['github'] } });
      render(<ClusterCard {...defaultProps} cluster={cluster} />);
      expect(screen.getByText('No dates')).toBeInTheDocument();
    });

    it('renders tool icons', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
      expect(screen.getByLabelText('Jira')).toBeInTheDocument();
    });

    it('truncates tool icons beyond limit and shows count', () => {
      const cluster = createCluster({
        metrics: {
          activityCount: 10,
          refCount: 5,
          toolTypes: ['github', 'jira', 'confluence', 'slack', 'figma'],
        },
      });
      render(<ClusterCard {...defaultProps} cluster={cluster} />);
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows generating status with spinner', () => {
      render(<ClusterCard {...defaultProps} status="generating" />);
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('shows ready status with checkmark', () => {
      render(<ClusterCard {...defaultProps} status="ready" />);
      expect(screen.getByText('Story ready')).toBeInTheDocument();
    });

    it('shows error status with warning', () => {
      render(<ClusterCard {...defaultProps} status="error" errorMessage="Not enough activities" />);
      expect(screen.getByText('Not enough data')).toBeInTheDocument();
    });

    it('shows no status indicator when idle', () => {
      render(<ClusterCard {...defaultProps} status="idle" />);
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
      expect(screen.queryByText('Story ready')).not.toBeInTheDocument();
      expect(screen.queryByText('Not enough data')).not.toBeInTheDocument();
    });
  });

  describe('Generate Button', () => {
    it('shows generate button when idle', () => {
      render(<ClusterCard {...defaultProps} status="idle" />);
      expect(screen.getByRole('button', { name: 'Generate STAR' })).toBeInTheDocument();
    });

    it('hides generate button when generating', () => {
      render(<ClusterCard {...defaultProps} status="generating" />);
      expect(screen.queryByRole('button', { name: 'Generate STAR' })).not.toBeInTheDocument();
    });

    it('hides generate button when ready', () => {
      render(<ClusterCard {...defaultProps} status="ready" />);
      expect(screen.queryByRole('button', { name: 'Generate STAR' })).not.toBeInTheDocument();
    });

    it('shows disabled generate button when error', () => {
      render(<ClusterCard {...defaultProps} status="error" />);
      const button = screen.getByRole('button', { name: 'Generate STAR' });
      expect(button).toBeDisabled();
    });

    it('calls onGenerateStar when button clicked', () => {
      const onGenerateStar = vi.fn();
      render(<ClusterCard {...defaultProps} onGenerateStar={onGenerateStar} />);

      fireEvent.click(screen.getByRole('button', { name: 'Generate STAR' }));
      expect(onGenerateStar).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onSelect when generate button clicked', () => {
      const onSelect = vi.fn();
      const onGenerateStar = vi.fn();
      render(<ClusterCard {...defaultProps} onSelect={onSelect} onGenerateStar={onGenerateStar} />);

      fireEvent.click(screen.getByRole('button', { name: 'Generate STAR' }));
      expect(onGenerateStar).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Selection', () => {
    it('applies selected styles when isSelected is true', () => {
      const { container } = render(<ClusterCard {...defaultProps} isSelected={true} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-blue-500');
    });

    it('calls onSelect when card is clicked', () => {
      const onSelect = vi.fn();
      render(<ClusterCard {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole('option'));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('calls onSelect when Enter is pressed', () => {
      const onSelect = vi.fn();
      render(<ClusterCard {...defaultProps} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onSelect when Space is pressed', () => {
      const onSelect = vi.fn();
      render(<ClusterCard {...defaultProps} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByRole('option'), { key: ' ' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('does not call onSelect for other keys', () => {
      const onSelect = vi.fn();
      render(<ClusterCard {...defaultProps} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByRole('option'), { key: 'Tab' });
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has role="option" for listbox pattern', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('has aria-selected attribute', () => {
      render(<ClusterCard {...defaultProps} isSelected={true} />);
      expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
    });

    it('is focusable with tabIndex', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByRole('option')).toHaveAttribute('tabIndex', '0');
    });

    it('has data-testid for E2E testing', () => {
      render(<ClusterCard {...defaultProps} />);
      expect(screen.getByTestId('cluster-card-test-cluster-123')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles cluster with no metrics', () => {
      const cluster = createCluster({ metrics: undefined });
      render(<ClusterCard {...defaultProps} cluster={cluster} />);
      expect(screen.getByText('No dates')).toBeInTheDocument();
    });

    it('handles cluster with empty tool types', () => {
      const cluster = createCluster({ metrics: { activityCount: 2, refCount: 1, toolTypes: [] } });
      const { container } = render(<ClusterCard {...defaultProps} cluster={cluster} />);
      // Should not render any tool icons
      expect(container.querySelectorAll('[aria-label]').length).toBe(0);
    });
  });
});
