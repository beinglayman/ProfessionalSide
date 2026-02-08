/**
 * FormatSwitchModal Tests
 *
 * Tests for:
 * - Phase 1 (Compare): side-by-side panels, framework/style controls, user prompt textarea
 * - Phase 2 (Generating): loading state with story-specific facts and career quotes
 * - Error handling: displays error on regeneration failure, retries work
 * - Modal behavior: cannot close during regeneration, resets state on open
 * - User prompt: textarea accepts input, shows character count, respects maxLength
 * - Edge cases: empty sections, same framework transition, missing frameworkMeta
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormatSwitchModal } from './FormatSwitchModal';
import { CareerStory, NarrativeFramework, WritingStyle } from '../../types/career-stories';

// Mock Radix Dialog to avoid portal complexity
vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

// Mock FrameworkSelector since it has its own tests
vi.mock('./FrameworkSelector', () => ({
  FrameworkSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
      data-testid="framework-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="STAR">STAR</option>
      <option value="SOAR">SOAR</option>
      <option value="SHARE">SHARE</option>
      <option value="CAR">CAR</option>
    </select>
  ),
}));

// Factory for test career story
const createTestStory = (overrides?: Partial<CareerStory>): CareerStory => ({
  id: 'story-1',
  userId: 'user-1',
  title: 'Migrated Auth to OAuth2',
  framework: 'STAR' as NarrativeFramework,
  activityIds: ['act-1', 'act-2', 'act-3'],
  sections: {
    situation: { summary: 'Legacy auth was unreliable', evidence: [{ activityId: 'act-1' }] },
    task: { summary: 'Migrate 50K users to OAuth2', evidence: [{ activityId: 'act-2' }] },
    action: { summary: 'Built SSO with zero downtime', evidence: [{ activityId: 'act-3' }] },
    result: { summary: '99.9% uptime, 50% fewer support tickets', evidence: [{ activityId: 'act-3' }] },
  },
  isPublished: false,
  needsRegeneration: false,
  generatedAt: '2025-01-15T00:00:00Z',
  sourceMode: 'production',
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  story: createTestStory(),
  initialFramework: 'SOAR' as NarrativeFramework,
  initialStyle: 'professional' as WritingStyle,
  onRegenerate: vi.fn().mockResolvedValue(undefined),
  isRegenerating: false,
};

describe('FormatSwitchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Phase 1: Compare view', () => {
    it('renders with "Switch Format" title when not regenerating', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Switch Format')).toBeInTheDocument();
    });

    it('shows current narrative panel with story framework badge', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Current Narrative')).toBeInTheDocument();
      // STAR badge on the current panel (use getAllByText since mock FrameworkSelector also renders 'STAR')
      const starElements = screen.getAllByText('STAR');
      expect(starElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('shows current story section summaries', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Legacy auth was unreliable')).toBeInTheDocument();
      expect(screen.getByText('Migrate 50K users to OAuth2')).toBeInTheDocument();
    });

    it('shows activity count in current panel', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Based on 3 activities')).toBeInTheDocument();
    });

    it('shows new format preview panel with target framework badge', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('New Format')).toBeInTheDocument();
      // SOAR badge (use getAllByText since mock FrameworkSelector also renders 'SOAR')
      const soarElements = screen.getAllByText('SOAR');
      expect(soarElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('shows selected style badge in new format panel', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('professional')).toBeInTheDocument();
    });

    it('shows "What changes" callout when sections differ', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      // STAR → SOAR: adds "obstacles", removes "task"
      expect(screen.getByText(/What changes/)).toBeInTheDocument();
    });

    it('shows framework selector in controls area', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByTestId('framework-selector')).toBeInTheDocument();
    });

    it('shows writing style pills', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('Casual')).toBeInTheDocument();
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Storytelling')).toBeInTheDocument();
    });

    it('shows Cancel and Regenerate buttons', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });
  });

  describe('User prompt textarea', () => {
    it('renders textarea with placeholder', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Emphasize the leadership/);
      expect(textarea).toBeInTheDocument();
    });

    it('shows "Additional instructions" label', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.getByText('Additional instructions (optional)')).toBeInTheDocument();
    });

    it('shows character count after typing', async () => {
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Emphasize the leadership/);
      await user.type(textarea, 'Focus on metrics');
      expect(screen.getByText('16/500')).toBeInTheDocument();
    });

    it('does NOT show character count when prompt is empty', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      expect(screen.queryByText(/\/500/)).not.toBeInTheDocument();
    });

    it('has maxLength attribute on textarea', () => {
      render(<FormatSwitchModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Emphasize the leadership/);
      expect(textarea).toHaveAttribute('maxlength', '500');
    });
  });

  describe('Writing style selection', () => {
    it('clicking a style pill updates the preview panel', async () => {
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} />);
      // Initially 'professional' is shown in the preview panel
      expect(screen.getByText('professional')).toBeInTheDocument();
      // Click Technical style pill
      await user.click(screen.getByText('Technical'));
      // Preview panel should now show 'technical'
      expect(screen.getByText('technical')).toBeInTheDocument();
    });

    it('highlights the initially selected style', () => {
      render(<FormatSwitchModal {...defaultProps} initialStyle="casual" />);
      const casualBtn = screen.getByText('Casual');
      expect(casualBtn.className).toContain('bg-primary-100');
    });
  });

  describe('Regeneration', () => {
    it('calls onRegenerate with framework, style, and prompt when clicking Regenerate', async () => {
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} />);
      await user.click(screen.getByText('Regenerate'));
      expect(defaultProps.onRegenerate).toHaveBeenCalledWith(
        'SOAR',        // initialFramework
        'professional', // initialStyle
        undefined,      // empty prompt → undefined
        undefined,      // archetype (not set in this test)
      );
    });

    it('passes user prompt to onRegenerate', async () => {
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Emphasize the leadership/);
      await user.type(textarea, 'Add more metrics');
      await user.click(screen.getByText('Regenerate'));
      expect(defaultProps.onRegenerate).toHaveBeenCalledWith(
        'SOAR',
        'professional',
        'Add more metrics',
        undefined,      // archetype
      );
    });

    it('passes selected style to onRegenerate after changing it', async () => {
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} />);
      await user.click(screen.getByText('Technical'));
      await user.click(screen.getByText('Regenerate'));
      expect(defaultProps.onRegenerate).toHaveBeenCalledWith(
        'SOAR',
        'technical',
        undefined,
        undefined,      // archetype
      );
    });

    it('calls onClose when clicking Cancel', async () => {
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} />);
      await user.click(screen.getByText('Cancel'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Phase 2: Generating state', () => {
    it('shows "Regenerating Story..." title when regenerating', () => {
      render(<FormatSwitchModal {...defaultProps} isRegenerating />);
      expect(screen.getByText('Regenerating Story...')).toBeInTheDocument();
    });

    it('shows spinner during regeneration', () => {
      render(<FormatSwitchModal {...defaultProps} isRegenerating />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows story-specific generating facts', () => {
      render(<FormatSwitchModal {...defaultProps} isRegenerating />);
      // Should show fact about 3 activities
      expect(screen.getByText('Analyzing 3 activities from your journal...')).toBeInTheDocument();
    });

    it('shows career quote during regeneration', () => {
      render(<FormatSwitchModal {...defaultProps} isRegenerating />);
      // Quote navigation should be present
      expect(screen.getByLabelText('Previous quote')).toBeInTheDocument();
      expect(screen.getByLabelText('Next quote')).toBeInTheDocument();
    });

    it('hides compare panels and controls during regeneration', () => {
      render(<FormatSwitchModal {...defaultProps} isRegenerating />);
      expect(screen.queryByText('Current Narrative')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('framework-selector')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows error message when regeneration fails', async () => {
      const failingRegenerate = vi.fn().mockRejectedValue(new Error('LLM quota exceeded'));
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} onRegenerate={failingRegenerate} />);

      await user.click(screen.getByText('Regenerate'));

      await waitFor(() => {
        expect(screen.getByText('LLM quota exceeded')).toBeInTheDocument();
      });
    });

    it('shows fallback error message when error has no message', async () => {
      const failingRegenerate = vi.fn().mockRejectedValue(new Error(''));
      const user = userEvent.setup();
      render(<FormatSwitchModal {...defaultProps} onRegenerate={failingRegenerate} />);

      await user.click(screen.getByText('Regenerate'));

      await waitFor(() => {
        expect(screen.getByText('Regeneration failed. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('renders "No content yet" for empty sections', () => {
      const emptySectionStory = createTestStory({
        sections: {
          situation: { summary: '', evidence: [] },
          task: { summary: '', evidence: [] },
          action: { summary: '', evidence: [] },
          result: { summary: '', evidence: [] },
        },
      });
      render(<FormatSwitchModal {...defaultProps} story={emptySectionStory} />);
      const noCopies = screen.getAllByText('No content yet');
      expect(noCopies.length).toBeGreaterThanOrEqual(1);
    });

    it('handles same framework transition (STAR → STAR)', () => {
      render(
        <FormatSwitchModal
          {...defaultProps}
          initialFramework="STAR"
        />
      );
      // No "What changes" callout since sections are the same
      expect(screen.queryByText(/What changes/)).not.toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<FormatSwitchModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Switch Format')).not.toBeInTheDocument();
    });

    it('singular activity text for 1 activity', () => {
      const singleActivity = createTestStory({ activityIds: ['act-1'] });
      render(<FormatSwitchModal {...defaultProps} story={singleActivity} />);
      expect(screen.getByText('Based on 1 activity')).toBeInTheDocument();
    });
  });
});
