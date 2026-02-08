import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolIcon } from './ToolIcon';
import { TOOL_ICONS, ToolType } from '../../types/career-stories';

describe('ToolIcon', () => {
  describe('Rendering', () => {
    it.each(Object.keys(TOOL_ICONS) as ToolType[])('renders %s tool icon', (tool) => {
      render(<ToolIcon tool={tool} />);
      const icon = screen.getByLabelText(TOOL_ICONS[tool].name);
      expect(icon).toBeInTheDocument();
    });

    it('displays SVG icon for github', () => {
      const { container } = render(<ToolIcon tool="github" />);
      // GitHub has SVG icon
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays letter fallback for tools without SVG', () => {
      // 'generic' has no SVG — falls back to first letter of name ("Other" → "O")
      render(<ToolIcon tool="generic" />);
      expect(screen.getByText('O')).toBeInTheDocument();
    });

    it('applies tool-specific background color', () => {
      const { container } = render(<ToolIcon tool="jira" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ backgroundColor: TOOL_ICONS.jira.color });
    });

    it('provides tooltip with tool name', () => {
      const { container } = render(<ToolIcon tool="confluence" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveAttribute('title', 'Confluence');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label for screen readers', () => {
      render(<ToolIcon tool="slack" />);
      expect(screen.getByLabelText('Slack')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<ToolIcon tool="github" className="custom-class" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveClass('custom-class');
    });

    it('maintains base styling classes', () => {
      const { container } = render(<ToolIcon tool="github" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveClass('rounded-full');
      expect(icon).toHaveClass('text-white');
      // font-bold only on fallback letters, not SVG icons
    });
  });

  describe('Unknown Tool Fallback', () => {
    it('renders fallback for unknown tool type', () => {
      // @ts-expect-error - Testing unknown tool type
      render(<ToolIcon tool="unknown-tool" />);
      const icon = screen.getByLabelText('Unknown tool');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('?');
    });
  });
});
