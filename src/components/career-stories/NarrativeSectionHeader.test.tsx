import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NarrativeSectionHeader } from './NarrativeSectionHeader';

const defaultProps = {
  sectionKey: 'situation',
  label: 'Situation',
  confidence: 0.9,
  isCollapsed: false,
  onToggle: vi.fn(),
};

describe('NarrativeSectionHeader', () => {
  describe('Basic Rendering', () => {
    it('renders label and timeline dot', () => {
      render(<NarrativeSectionHeader {...defaultProps} />);

      expect(screen.getByText('Situation')).toBeInTheDocument();
    });

    it('renders children when expanded', () => {
      render(
        <NarrativeSectionHeader {...defaultProps} isCollapsed={false}>
          <p>Section content</p>
        </NarrativeSectionHeader>
      );

      expect(screen.getByText('Section content')).toBeInTheDocument();
    });

    it('hides children when collapsed', () => {
      render(
        <NarrativeSectionHeader {...defaultProps} isCollapsed={true}>
          <p>Section content</p>
        </NarrativeSectionHeader>
      );

      expect(screen.queryByText('Section content')).not.toBeInTheDocument();
    });

    it('shows collapsed preview when collapsed', () => {
      render(
        <NarrativeSectionHeader
          {...defaultProps}
          isCollapsed={true}
          collapsedPreview="The team faced..."
        />
      );

      expect(screen.getByText('The team faced...')).toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked', () => {
      const onToggle = vi.fn();
      render(<NarrativeSectionHeader {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('Situation'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Source Count', () => {
    it('shows source count when expanded with sources', () => {
      render(
        <NarrativeSectionHeader {...defaultProps} sourceCount={3} />
      );

      expect(screen.getByText('3 sources')).toBeInTheDocument();
    });

    it('uses singular "source" for count of 1', () => {
      render(
        <NarrativeSectionHeader {...defaultProps} sourceCount={1} />
      );

      expect(screen.getByText('1 source')).toBeInTheDocument();
    });

    it('hides source count when count is 0', () => {
      render(
        <NarrativeSectionHeader {...defaultProps} sourceCount={0} />
      );

      expect(screen.queryByText(/source/)).not.toBeInTheDocument();
    });

    it('hides source count when undefined', () => {
      render(
        <NarrativeSectionHeader {...defaultProps} />
      );

      expect(screen.queryByText(/source/)).not.toBeInTheDocument();
    });

    it('shows source count inline when collapsed', () => {
      render(
        <NarrativeSectionHeader
          {...defaultProps}
          isCollapsed={true}
          sourceCount={2}
        />
      );

      expect(screen.getByText(/2 sources/)).toBeInTheDocument();
    });
  });

  describe('Right Margin', () => {
    it('renders rightMarginContent when provided', () => {
      render(
        <NarrativeSectionHeader
          {...defaultProps}
          rightMarginContent={<div data-testid="right-margin">Sources here</div>}
        />
      );

      expect(screen.getByTestId('right-margin')).toBeInTheDocument();
    });

    it('does not render right margin when not provided', () => {
      render(<NarrativeSectionHeader {...defaultProps} />);

      expect(screen.queryByTestId('right-margin')).not.toBeInTheDocument();
    });

    it('renders both left and right margins simultaneously', () => {
      render(
        <NarrativeSectionHeader
          {...defaultProps}
          showMargin={true}
          marginContent={<div data-testid="left-margin">Notes</div>}
          rightMarginContent={<div data-testid="right-margin">Sources</div>}
        />
      );

      expect(screen.getByTestId('left-margin')).toBeInTheDocument();
      expect(screen.getByTestId('right-margin')).toBeInTheDocument();
    });
  });

  describe('showSourceMargin styling', () => {
    it('applies slate-500 to source count when showSourceMargin is true (expanded)', () => {
      const { container } = render(
        <NarrativeSectionHeader
          {...defaultProps}
          sourceCount={3}
          showSourceMargin={true}
        />
      );

      const sourceCount = screen.getByText('3 sources');
      expect(sourceCount.className).toContain('text-slate-500');
      expect(sourceCount.className).toContain('font-medium');
    });

    it('applies gray-400 to source count when showSourceMargin is false', () => {
      render(
        <NarrativeSectionHeader
          {...defaultProps}
          sourceCount={3}
          showSourceMargin={false}
        />
      );

      const sourceCount = screen.getByText('3 sources');
      expect(sourceCount.className).toContain('text-gray-400');
      expect(sourceCount.className).not.toContain('font-medium');
    });

    it('applies slate-500 to collapsed source count when showSourceMargin is true', () => {
      render(
        <NarrativeSectionHeader
          {...defaultProps}
          isCollapsed={true}
          sourceCount={2}
          showSourceMargin={true}
        />
      );

      const sourceCount = screen.getByText(/2 sources/);
      expect(sourceCount.className).toContain('text-slate-500');
    });
  });

  describe('Timeline Spine', () => {
    it('hides vertical line when last section is collapsed', () => {
      const { container } = render(
        <NarrativeSectionHeader
          {...defaultProps}
          isCollapsed={true}
          isLast={true}
        />
      );

      // The vertical line div should not be present
      const spineColumn = container.querySelector('.w-5');
      const verticalLine = spineColumn?.querySelector('.w-px');
      expect(verticalLine).toBeNull();
    });

    it('shows vertical line when not last section', () => {
      const { container } = render(
        <NarrativeSectionHeader
          {...defaultProps}
          isCollapsed={false}
          isLast={false}
        />
      );

      const spineColumn = container.querySelector('.flex-col');
      const verticalLine = spineColumn?.querySelector('.w-px');
      expect(verticalLine).toBeInTheDocument();
    });
  });
});
