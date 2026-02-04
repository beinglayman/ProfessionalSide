import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnhancingIndicator } from './enhancing-indicator';

describe('EnhancingIndicator', () => {
  describe('inline variant (default)', () => {
    it('renders with default text', () => {
      render(<EnhancingIndicator />);
      expect(screen.getByText('Enhancing...')).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      render(<EnhancingIndicator text="Processing data..." />);
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <EnhancingIndicator className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders sparkle icon', () => {
      const { container } = render(<EnhancingIndicator />);
      // Lucide icons render as SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders animated dots', () => {
      const { container } = render(<EnhancingIndicator />);
      // Should have 3 dots
      const dots = container.querySelectorAll('span.rounded-full');
      expect(dots.length).toBe(3);
    });
  });

  describe('banner variant', () => {
    it('renders with default banner text', () => {
      render(<EnhancingIndicator variant="banner" />);
      expect(
        screen.getByText('Generating story narrative...')
      ).toBeInTheDocument();
    });

    it('renders with custom text in banner', () => {
      render(
        <EnhancingIndicator variant="banner" text="Creating summary..." />
      );
      expect(screen.getByText('Creating summary...')).toBeInTheDocument();
    });

    it('has shimmer overlay', () => {
      const { container } = render(<EnhancingIndicator variant="banner" />);
      const shimmer = container.querySelector('.animate-shimmer');
      expect(shimmer).toBeInTheDocument();
    });

    it('applies custom className to banner', () => {
      const { container } = render(
        <EnhancingIndicator variant="banner" className="my-banner" />
      );
      expect(container.firstChild).toHaveClass('my-banner');
    });
  });

  describe('accessibility', () => {
    it('inline variant has visible text', () => {
      render(<EnhancingIndicator />);
      // Text should be visible (not just for screen readers)
      const text = screen.getByText('Enhancing...');
      expect(text).toBeVisible();
    });

    it('banner variant has visible text', () => {
      render(<EnhancingIndicator variant="banner" />);
      const text = screen.getByText('Generating story narrative...');
      expect(text).toBeVisible();
    });
  });
});
