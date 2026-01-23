import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterSelect } from './filter-select';

describe('FilterSelect', () => {
  const defaultProps = {
    id: 'test-filter',
    label: 'Test Label',
    value: 'All',
    options: ['All', 'Option 1', 'Option 2'],
    onChange: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders with label', () => {
      render(<FilterSelect {...defaultProps} />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('renders select with correct id', () => {
      render(<FilterSelect {...defaultProps} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'test-filter');
    });

    it('renders all options', () => {
      render(<FilterSelect {...defaultProps} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('All');
      expect(options[1]).toHaveTextContent('Option 1');
      expect(options[2]).toHaveTextContent('Option 2');
    });

    it('displays current value as selected', () => {
      render(<FilterSelect {...defaultProps} value="Option 1" />);
      expect(screen.getByRole('combobox')).toHaveValue('Option 1');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label derived from label', () => {
      render(<FilterSelect {...defaultProps} />);
      expect(screen.getByRole('combobox')).toHaveAttribute(
        'aria-label',
        'Filter by test label'
      );
    });

    it('uses custom aria-label when provided', () => {
      render(<FilterSelect {...defaultProps} ariaLabel="Custom aria label" />);
      expect(screen.getByRole('combobox')).toHaveAttribute(
        'aria-label',
        'Custom aria label'
      );
    });

    it('label is associated with select via htmlFor', () => {
      render(<FilterSelect {...defaultProps} />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveAttribute('for', 'test-filter');
    });
  });

  describe('Interaction', () => {
    it('calls onChange when selection changes', () => {
      const onChange = vi.fn();
      render(<FilterSelect {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'Option 2' },
      });

      expect(onChange).toHaveBeenCalledWith('Option 2');
    });

    it('calls onChange with correct value for each option', () => {
      const onChange = vi.fn();
      render(<FilterSelect {...defaultProps} onChange={onChange} />);

      // Change to Option 1
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'Option 1' },
      });
      expect(onChange).toHaveBeenLastCalledWith('Option 1');

      // Change back to All
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'All' },
      });
      expect(onChange).toHaveBeenLastCalledWith('All');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty options array', () => {
      render(<FilterSelect {...defaultProps} options={[]} />);
      const options = screen.queryAllByRole('option');
      expect(options).toHaveLength(0);
    });

    it('handles single option', () => {
      render(<FilterSelect {...defaultProps} options={['Only Option']} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
    });

    it('handles options with special characters', () => {
      render(
        <FilterSelect
          {...defaultProps}
          options={['All', 'Option & More', 'Option <script>']}
        />
      );
      expect(screen.getByText('Option & More')).toBeInTheDocument();
    });
  });
});
