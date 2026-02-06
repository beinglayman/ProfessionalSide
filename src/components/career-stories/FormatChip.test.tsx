/**
 * FormatChip Tests
 *
 * Tests for:
 * - Chip renders current framework label
 * - Accessibility attributes (aria-haspopup, aria-expanded)
 * - Disabled state prevents interaction
 * - Dropdown opens on click (via DOM interaction)
 * - Framework selection fires onFormatChange
 * - Writing style pill changes take effect
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormatChip } from './FormatChip';
import { NarrativeFramework, WritingStyle } from '../../types/career-stories';

// Mock createPortal to render inline — avoids DOM portal issues in jsdom
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

const defaultProps = {
  currentFramework: 'STAR' as NarrativeFramework,
  currentStyle: 'professional' as WritingStyle,
  onFormatChange: vi.fn(),
};

describe('FormatChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders chip with current framework label', () => {
      render(<FormatChip {...defaultProps} />);
      expect(screen.getByTestId('format-chip')).toHaveTextContent('STAR');
    });

    it('shows different framework labels', () => {
      render(<FormatChip {...defaultProps} currentFramework="SOAR" />);
      expect(screen.getByTestId('format-chip')).toHaveTextContent('SOAR');
    });
  });

  describe('Accessibility', () => {
    it('has aria-haspopup="listbox"', () => {
      render(<FormatChip {...defaultProps} />);
      expect(screen.getByTestId('format-chip')).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has aria-expanded=false when closed', () => {
      render(<FormatChip {...defaultProps} />);
      expect(screen.getByTestId('format-chip')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<FormatChip {...defaultProps} disabled />);
      expect(screen.getByTestId('format-chip')).toBeDisabled();
    });

    it('does not open dropdown when disabled', () => {
      render(<FormatChip {...defaultProps} disabled />);
      fireEvent.click(screen.getByTestId('format-chip'));
      // Listbox should not appear
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown interaction', () => {
    it('opens dropdown on click showing frameworks', () => {
      render(<FormatChip {...defaultProps} />);
      fireEvent.click(screen.getByTestId('format-chip'));
      // Dropdown should now be visible with framework groups
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Popular')).toBeInTheDocument();
      expect(screen.getByText('Concise')).toBeInTheDocument();
      expect(screen.getByText('Detailed')).toBeInTheDocument();
    });

    it('shows writing style pills in dropdown', () => {
      render(<FormatChip {...defaultProps} />);
      fireEvent.click(screen.getByTestId('format-chip'));
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('Casual')).toBeInTheDocument();
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Storytelling')).toBeInTheDocument();
    });

    it('marks current framework as selected', () => {
      render(<FormatChip {...defaultProps} />);
      fireEvent.click(screen.getByTestId('format-chip'));
      const options = screen.getAllByRole('option');
      const starOption = options.find((opt) => opt.textContent?.includes('STAR'));
      expect(starOption).toHaveAttribute('aria-selected', 'true');
    });

    it('does NOT call onFormatChange when selecting same framework and same style', () => {
      render(<FormatChip {...defaultProps} />);
      fireEvent.click(screen.getByTestId('format-chip'));

      // Click the already-selected STAR
      const options = screen.getAllByRole('option');
      const starOption = options.find((opt) => opt.textContent?.includes('STAR'));
      fireEvent.click(starOption!);

      expect(defaultProps.onFormatChange).not.toHaveBeenCalled();
    });

    it('calls onFormatChange with new framework', () => {
      render(<FormatChip {...defaultProps} />);
      fireEvent.click(screen.getByTestId('format-chip'));

      // Click SOAR
      const options = screen.getAllByRole('option');
      const soarOption = options.find((opt) => opt.textContent?.includes('SOAR'));
      fireEvent.click(soarOption!);

      expect(defaultProps.onFormatChange).toHaveBeenCalledWith('SOAR', 'professional');
    });

    it('uses selected style when choosing framework', () => {
      render(<FormatChip {...defaultProps} />);
      fireEvent.click(screen.getByTestId('format-chip'));

      // Change style to casual first
      fireEvent.click(screen.getByText('Casual'));

      // Then click CAR
      const options = screen.getAllByRole('option');
      const carOption = options.find((opt) => opt.textContent?.includes('CAR'));
      fireEvent.click(carOption!);

      expect(defaultProps.onFormatChange).toHaveBeenCalledWith('CAR', 'casual');
    });

    it('chip click stopPropagates (does not trigger parent click)', () => {
      const parentClick = vi.fn();
      render(
        <div onClick={parentClick}>
          <FormatChip {...defaultProps} />
        </div>
      );
      fireEvent.click(screen.getByTestId('format-chip'));
      expect(parentClick).not.toHaveBeenCalled();
    });
  });
});
