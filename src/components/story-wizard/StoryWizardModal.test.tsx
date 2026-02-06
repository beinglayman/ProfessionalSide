import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryWizardModal } from './StoryWizardModal';
import { CareerStoriesService } from '../../services/career-stories.service';

// Mock the career stories service
vi.mock('../../services/career-stories.service', () => ({
  CareerStoriesService: {
    wizardAnalyze: vi.fn(),
    wizardGenerate: vi.fn(),
  },
}));

const mockAnalyzeResponse = {
  success: true,
  data: {
    archetype: {
      detected: 'architect' as const,
      confidence: 0.85,
      reasoning: 'You designed a lasting solution',
      alternatives: [
        { archetype: 'pioneer' as const, confidence: 0.6 },
        { archetype: 'detective' as const, confidence: 0.4 },
      ],
    },
    questions: [
      {
        id: 'q1',
        question: 'What was the trigger?',
        phase: 'dig' as const,
        hint: 'Think about what started this',
        options: [
          { label: 'Got paged', value: 'paged' },
          { label: 'Customer report', value: 'customer' },
        ],
        allowFreeText: true,
      },
      {
        id: 'q2',
        question: 'What was the impact?',
        phase: 'impact' as const,
        options: [],
        allowFreeText: true,
      },
    ],
    journalEntry: { id: 'entry-1', title: 'Week of Feb 1' },
  },
};

const mockGenerateResponse = {
  success: true,
  data: {
    story: {
      id: 'story-1',
      title: 'Built the Auth System',
      hook: 'When the team needed a solution...',
      framework: 'STAR' as const,
      archetype: 'architect' as const,
      sections: {
        situation: { summary: 'The team had no auth', evidence: [] },
        action: { summary: 'I designed OAuth2', evidence: [] },
        result: { summary: '50% faster logins', evidence: [] },
      },
    },
    evaluation: {
      score: 8.5,
      suggestions: ['Add more metrics'],
      coachComment: 'Strong story!',
    },
  },
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  journalEntryId: 'entry-1',
  journalEntryTitle: 'Week of Feb 1',
};

describe('StoryWizardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (CareerStoriesService.wizardAnalyze as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnalyzeResponse);
    (CareerStoriesService.wizardGenerate as ReturnType<typeof vi.fn>).mockResolvedValue(mockGenerateResponse);
  });

  describe('Analyze Step', () => {
    it('auto-analyzes on open and shows loading state', async () => {
      render(<StoryWizardModal {...defaultProps} />);
      // Loading state should show spinner (from WizardLoadingState)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      expect(CareerStoriesService.wizardAnalyze).toHaveBeenCalledWith('entry-1');
    });

    it('shows detected archetype after analysis', async () => {
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText('85% match')).toBeInTheDocument();
      expect(screen.getByText('You designed a lasting solution')).toBeInTheDocument();
    });

    it('shows archetype and framework dropdowns after analysis', async () => {
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId('archetype-selector')).toBeInTheDocument();
      });
      expect(screen.getByTestId('framework-selector')).toBeInTheDocument();
    });

    it('shows error state when analysis fails', async () => {
      (CareerStoriesService.wizardAnalyze as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Analysis failed',
      });
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Analysis failed')).toBeInTheDocument();
      });
    });

    it('shows error state when analysis throws', async () => {
      (CareerStoriesService.wizardAnalyze as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Failed to analyze entry')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('shows Cancel button on analyze step', async () => {
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows Next button (not Continue) on analyze step', async () => {
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    });

    it('navigates to questions step on Next click', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      // Should now show the first question
      expect(screen.getByText('What was the trigger?')).toBeInTheDocument();
    });

    it('shows Back button on questions step', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows Skip and Next on non-last question', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('Skip')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('shows Generate button on last question', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      // Go to questions
      await user.click(screen.getByText('Next'));
      // Go to second (last) question
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('Cancel closes the modal', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} onClose={onClose} />);
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
    });

    it('Back from Q1 goes to analyze step', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('What was the trigger?')).toBeInTheDocument();
      await user.click(screen.getByText('Back'));
      // Should be back on analyze step
      await waitFor(() => {
        expect(screen.getByText('85% match')).toBeInTheDocument();
      });
    });

    it('Skip advances to next question', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('What was the trigger?')).toBeInTheDocument();
      await user.click(screen.getByText('Skip'));
      expect(screen.getByText('What was the impact?')).toBeInTheDocument();
    });
  });

  describe('Questions Step', () => {
    it('shows progress bar', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      // Progress bar exists (h-1 with gradient)
      const progressBars = document.querySelectorAll('.bg-gradient-to-r.from-primary-400');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows hint toggle button for questions with hints', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(screen.getByLabelText('Show hint')).toBeInTheDocument();
    });

    it('toggles hint on click', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      // Hint not shown initially
      expect(screen.queryByText('Think about what started this')).not.toBeInTheDocument();
      // Click hint button
      await user.click(screen.getByLabelText('Show hint'));
      expect(screen.getByText('Think about what started this')).toBeInTheDocument();
      // Click again to hide
      await user.click(screen.getByLabelText('Show hint'));
      expect(screen.queryByText('Think about what started this')).not.toBeInTheDocument();
    });

    it('uses hint text as textarea placeholder', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      const textarea = screen.getByPlaceholderText('Think about what started this');
      expect(textarea).toBeInTheDocument();
    });

    it('renders chip options', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('Got paged')).toBeInTheDocument();
      expect(screen.getByText('Customer report')).toBeInTheDocument();
    });

    it('no inner navigation buttons (unified footer handles it)', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      // Should NOT have "Previous" (old inner nav)
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });
  });

  describe('Generate Step', () => {
    it('shows loading state during generation', async () => {
      // Make generate hang
      (CareerStoriesService.wizardGenerate as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      // Go to questions
      await user.click(screen.getByText('Next'));
      // Skip to last question
      await user.click(screen.getByText('Skip'));
      // Click Generate
      await user.click(screen.getByText('Generate'));
      // Should show loading state (spinner from WizardLoadingState)
      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      });
      // Footer should be hidden during loading
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('shows Done button after generation completes', async () => {
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Skip'));
      await user.click(screen.getByText('Generate'));
      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
      expect(screen.getByText('Story Created!')).toBeInTheDocument();
    });

    it('calls onStoryCreated with story ID', async () => {
      const onStoryCreated = vi.fn();
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} onStoryCreated={onStoryCreated} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Skip'));
      await user.click(screen.getByText('Generate'));
      await waitFor(() => {
        expect(onStoryCreated).toHaveBeenCalledWith('story-1');
      });
    });

    it('shows error when generation fails', async () => {
      (CareerStoriesService.wizardGenerate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Generation failed',
      });
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Skip'));
      await user.click(screen.getByText('Generate'));
      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });
    });

    it('Done closes the modal', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<StoryWizardModal {...defaultProps} onClose={onClose} />);
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Skip'));
      await user.click(screen.getByText('Generate'));
      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('resets state when closed and reopened', async () => {
      const { rerender } = render(<StoryWizardModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(1);
      });
      // Close
      rerender(<StoryWizardModal {...defaultProps} isOpen={false} />);
      // Reopen
      rerender(<StoryWizardModal {...defaultProps} isOpen={true} />);
      // Should be loading again (reset to analyze step)
      expect(CareerStoriesService.wizardAnalyze).toHaveBeenCalledTimes(2);
    });

    it('passes journalEntryMeta to loading state', async () => {
      const meta = { title: 'Test', activityCount: 5, tools: ['github'] };
      render(<StoryWizardModal {...defaultProps} journalEntryMeta={meta} />);
      // Should render the loading state with facts
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('handles missing journalEntryTitle gracefully', async () => {
      render(
        <StoryWizardModal
          isOpen={true}
          onClose={vi.fn()}
          journalEntryId="entry-1"
        />
      );
      await waitFor(() => {
        expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(1);
      });
      // Should use the title from analyzeResult
      expect(screen.getByText(/Week of Feb 1/)).toBeInTheDocument();
    });
  });
});
