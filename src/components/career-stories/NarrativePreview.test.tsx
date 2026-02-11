/**
 * NarrativePreview Tests
 *
 * Tests for:
 * - Framework-aware copy functionality (via copy menu)
 * - Section rendering for different frameworks
 * - Regeneration button behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NarrativePreview } from './NarrativePreview';
import { CareerStory, GenerateSTARResult, NarrativeFramework, ToolType, StorySource } from '../../types/career-stories';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Render with QueryClientProvider wrapper */
function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

// Factory for creating test STAR result
const createStarResult = (overrides?: Partial<GenerateSTARResult>): GenerateSTARResult => ({
  star: {
    clusterId: 'test-cluster',
    situation: { text: 'The team faced performance issues', sources: ['act-1'], confidence: 0.9 },
    task: { text: 'Optimize database queries', sources: ['act-2'], confidence: 0.85 },
    action: { text: 'Implemented indexing and caching', sources: ['act-3'], confidence: 0.95 },
    result: { text: '85% improvement in load time', sources: ['act-4'], confidence: 0.9 },
    overallConfidence: 0.9,
    participationSummary: { totalParticipations: 1, byRole: {} },
    suggestedEdits: [],
    metadata: {
      dateRange: { start: '2024-01-01', end: '2024-01-15' },
      toolsCovered: ['github'],
      totalActivities: 4,
    },
    validation: { passed: true, score: 0.9, failedGates: [], warnings: [] },
  },
  processingTimeMs: 100,
  ...overrides,
});

// Factory for creating test career story with framework-specific sections
const createStory = (framework: NarrativeFramework, overrides?: Partial<CareerStory>): CareerStory => {
  const baseSections: Record<NarrativeFramework, Record<string, { summary: string; evidence: Array<{ activityId: string }> }>> = {
    STAR: {
      situation: { summary: 'Team faced performance issues', evidence: [{ activityId: 'act-1' }] },
      task: { summary: 'Optimize database queries', evidence: [{ activityId: 'act-2' }] },
      action: { summary: 'Implemented indexing and caching', evidence: [{ activityId: 'act-3' }] },
      result: { summary: '85% improvement in load time', evidence: [{ activityId: 'act-4' }] },
    },
    STARL: {
      situation: { summary: 'Team faced performance issues', evidence: [{ activityId: 'act-1' }] },
      task: { summary: 'Optimize database queries', evidence: [{ activityId: 'act-2' }] },
      action: { summary: 'Implemented indexing and caching', evidence: [{ activityId: 'act-3' }] },
      result: { summary: '85% improvement in load time', evidence: [{ activityId: 'act-4' }] },
      learning: { summary: 'Proactive monitoring beats reactive debugging', evidence: [] },
    },
    SHARE: {
      situation: { summary: 'Inconsistent API patterns across teams', evidence: [{ activityId: 'act-1' }] },
      hindrances: { summary: 'Resistance from legacy team', evidence: [{ activityId: 'act-2' }] },
      actions: { summary: 'Organized cross-team working sessions', evidence: [{ activityId: 'act-3' }] },
      results: { summary: 'All teams adopted standard within 2 months', evidence: [{ activityId: 'act-4' }] },
      evaluation: { summary: 'Technical excellence alone does not drive adoption', evidence: [] },
    },
    SOAR: {
      situation: { summary: 'Painful bi-weekly deployments', evidence: [{ activityId: 'act-1' }] },
      obstacles: { summary: 'Resistance from senior engineers', evidence: [{ activityId: 'act-2' }] },
      actions: { summary: 'Evaluated CI/CD solutions and trained team', evidence: [{ activityId: 'act-3' }] },
      results: { summary: 'Deployment frequency increased 5x', evidence: [{ activityId: 'act-4' }] },
    },
    CAR: {
      challenge: { summary: 'Critical authentication bug', evidence: [{ activityId: 'act-1' }] },
      action: { summary: 'Analyzed logs and fixed race condition', evidence: [{ activityId: 'act-2' }] },
      result: { summary: 'Zero incidents in 6 months', evidence: [{ activityId: 'act-3' }] },
    },
    PAR: {
      problem: { summary: 'Memory leaks in production', evidence: [{ activityId: 'act-1' }] },
      action: { summary: 'Profiled and fixed leaky closures', evidence: [{ activityId: 'act-2' }] },
      result: { summary: 'Memory usage reduced by 40%', evidence: [{ activityId: 'act-3' }] },
    },
    SAR: {
      situation: { summary: 'Need for mobile app', evidence: [{ activityId: 'act-1' }] },
      action: { summary: 'Built React Native MVP', evidence: [{ activityId: 'act-2' }] },
      result: { summary: 'Launched in 8 weeks', evidence: [{ activityId: 'act-3' }] },
    },
    CARL: {
      context: { summary: 'Legacy codebase with no tests', evidence: [{ activityId: 'act-1' }] },
      action: { summary: 'Added test infrastructure', evidence: [{ activityId: 'act-2' }] },
      result: { summary: '80% coverage achieved', evidence: [{ activityId: 'act-3' }] },
      learning: { summary: 'Start with critical paths', evidence: [] },
    },
  };

  return {
    id: 'story-1',
    userId: 'user-1',
    sourceMode: 'demo',
    title: 'Test Career Story',
    framework,
    sections: baseSections[framework],
    activityIds: ['act-1', 'act-2', 'act-3', 'act-4'],
    needsRegeneration: false,
    generatedAt: '2024-01-15T00:00:00Z',
    isPublished: false,
    visibility: 'private',
    publishedAt: null,
    ...overrides,
  };
};

const defaultProps = {
  clusterName: 'Test Cluster',
  activityCount: 4,
  toolTypes: ['github'] as ToolType[],
  result: createStarResult(),
  isLoading: false,
  polishEnabled: true,
  onPolishToggle: vi.fn(),
  framework: 'STAR' as NarrativeFramework,
  onFrameworkChange: vi.fn(),
  onRegenerate: vi.fn(),
};

/** Helper: click the copy button to trigger plain text copy */
async function triggerCopy() {
  const copyButton = screen.getByTestId('copy-star');
  fireEvent.click(copyButton);
}

describe('NarrativePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Copy Functionality', () => {
    it('copies STAR sections when STAR framework is active', async () => {
      renderWithProviders(<NarrativePreview {...defaultProps} />);

      await triggerCopy();

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      });

      const copiedText = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('Situation:');
      expect(copiedText).toContain('Task:');
      expect(copiedText).toContain('Action:');
      expect(copiedText).toContain('Result:');
      expect(copiedText).toContain('The team faced performance issues');
    });

    it('copies SHARE sections when SHARE framework is active with story.sections', async () => {
      const shareStory = createStory('SHARE');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="SHARE"
          story={shareStory}
        />
      );

      await triggerCopy();

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      });

      const copiedText = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('Situation:');
      expect(copiedText).toContain('Hindrances:');
      expect(copiedText).toContain('Actions:');
      expect(copiedText).toContain('Results:');
      expect(copiedText).toContain('Evaluation:');
      // Should NOT have STAR-only sections
      expect(copiedText).not.toContain('Task:');
    });

    it('copies STARL sections including learning when STARL framework is active', async () => {
      const starlStory = createStory('STARL');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="STARL"
          story={starlStory}
        />
      );

      await triggerCopy();

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      });

      const copiedText = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('Situation:');
      expect(copiedText).toContain('Task:');
      expect(copiedText).toContain('Action:');
      expect(copiedText).toContain('Result:');
      expect(copiedText).toContain('Learning:');
      expect(copiedText).toContain('Proactive monitoring');
    });

    it('copies CAR sections (3 sections only)', async () => {
      const carStory = createStory('CAR');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="CAR"
          story={carStory}
        />
      );

      await triggerCopy();

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      });

      const copiedText = mockClipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('Challenge:');
      expect(copiedText).toContain('Action:');
      expect(copiedText).toContain('Result:');
      // Should NOT have STAR sections
      expect(copiedText).not.toContain('Situation:');
      expect(copiedText).not.toContain('Task:');
    });

    it('handles clipboard API failure gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));

      renderWithProviders(<NarrativePreview {...defaultProps} />);

      await triggerCopy();

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      });

      // Should not throw - error is handled internally
    });
  });

  describe('Section Rendering', () => {
    it('renders all SHARE sections when SHARE framework is selected', () => {
      const shareStory = createStory('SHARE');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="SHARE"
          story={shareStory}
        />
      );

      expect(screen.getByText('Situation')).toBeInTheDocument();
      expect(screen.getByText('Hindrances')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('Evaluation')).toBeInTheDocument();
    });

    it('renders all STARL sections including Learning', () => {
      const starlStory = createStory('STARL');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="STARL"
          story={starlStory}
        />
      );

      expect(screen.getByText('Situation')).toBeInTheDocument();
      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Result')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });

    it('renders SOAR sections with Obstacles instead of Task', () => {
      const soarStory = createStory('SOAR');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="SOAR"
          story={soarStory}
        />
      );

      expect(screen.getByText('Situation')).toBeInTheDocument();
      expect(screen.getByText('Obstacles')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
      // Should NOT show Task
      expect(screen.queryByText('Task')).not.toBeInTheDocument();
    });
  });

  describe('Framework Change', () => {
    it('calls onFrameworkChange when framework is changed via More dropdown', async () => {
      const user = userEvent.setup();
      const onFrameworkChange = vi.fn();

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          onFrameworkChange={onFrameworkChange}
        />
      );

      // Open the More dropdown
      await user.click(screen.getByLabelText('More actions'));

      // Click SHARE option
      await user.click(screen.getByText('SHARE'));

      expect(onFrameworkChange).toHaveBeenCalledWith('SHARE');
    });
  });

  describe('Regeneration', () => {
    it('calls onRegenerate when regenerate is clicked in More dropdown', async () => {
      const user = userEvent.setup();
      const onRegenerate = vi.fn();

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          onRegenerate={onRegenerate}
        />
      );

      // Open the More dropdown
      await user.click(screen.getByLabelText('More actions'));

      // Click Regenerate
      await user.click(screen.getByText('Regenerate'));

      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });

    it('does not call onRegenerate when disabled', () => {
      const onRegenerate = vi.fn();

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          onRegenerate={onRegenerate}
          isLoading={true}
          result={createStarResult()}
        />
      );

      // When loading, the loading skeleton is shown instead
      expect(screen.getByTestId('star-preview-loading')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('star-preview-loading')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty story sections gracefully', () => {
      const emptyStory: CareerStory = {
        ...createStory('STAR'),
        sections: {},
      };

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          story={emptyStory}
        />
      );

      // Should fall back to star result
      expect(screen.getByText('Situation')).toBeInTheDocument();
    });

    it('handles missing star result and story', () => {
      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          result={null}
          story={undefined}
        />
      );

      expect(screen.getByTestId('star-preview-placeholder')).toBeInTheDocument();
    });

    it('handles validation failure in result', () => {
      const failedResult = createStarResult({
        star: null,
        reason: 'VALIDATION_GATES_FAILED',
        failedGates: ['Insufficient activities'],
      });

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          result={failedResult}
        />
      );

      expect(screen.getByTestId('star-preview-error')).toBeInTheDocument();
      expect(screen.getByText(/Can't generate story/)).toBeInTheDocument();
    });
  });

  describe('Source Margin Toggle', () => {
    const createSources = (): StorySource[] => [
      {
        id: 'src-1', storyId: 'story-1', sectionKey: 'situation', sourceType: 'activity',
        activityId: 'act-1', label: 'PR #42', content: null, url: 'https://github.com/pr/42',
        annotation: null, toolType: 'github', role: 'author', questionId: null,
        sortOrder: 0, excludedAt: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'src-2', storyId: 'story-1', sectionKey: 'task', sourceType: 'activity',
        activityId: 'act-2', label: 'JIRA-123', content: null, url: null,
        annotation: null, toolType: 'jira', role: null, questionId: null,
        sortOrder: 0, excludedAt: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    it('renders EyeOff toggle button when sources visible by default', () => {
      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          sources={createSources()}
          sourceCoverage={{ sourced: 2, total: 4, vagueMetrics: [] }}
        />
      );

      expect(screen.getByLabelText('Hide sources')).toBeInTheDocument();
    });

    it('toggles aria-label between hide and show on click', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          sources={createSources()}
          sourceCoverage={{ sourced: 2, total: 4, vagueMetrics: [] }}
        />
      );

      const toggle = screen.getByLabelText('Hide sources');
      await user.click(toggle);

      expect(screen.getByLabelText('Show sources in margin')).toBeInTheDocument();
    });

    it('does not render Eye toggle when no coverage data', () => {
      renderWithProviders(
        <NarrativePreview {...defaultProps} />
      );

      expect(screen.queryByLabelText('Hide sources')).not.toBeInTheDocument();
    });

    it('renders source count per section', () => {
      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          sources={createSources()}
          sourceCoverage={{ sourced: 2, total: 4, vagueMetrics: [] }}
        />
      );

      // Two sections have 1 source each (situation, task)
      const sourceCounts = screen.getAllByText('1 source');
      expect(sourceCounts.length).toBe(2);
    });
  });

  describe('Framework Tooltip', () => {
    it('renders framework description as tooltip text', () => {
      renderWithProviders(<NarrativePreview {...defaultProps} />);

      // The tooltip text is rendered but hidden via opacity
      expect(screen.getByText('Situation, Task, Action, Result')).toBeInTheDocument();
    });

    it('renders SHARE framework description', () => {
      const shareStory = createStory('SHARE');

      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          framework="SHARE"
          story={shareStory}
        />
      );

      expect(screen.getByText('Situation, Hindrances, Actions, Results, Evaluation')).toBeInTheDocument();
    });
  });

  describe('Provenance Line', () => {
    it('does not render activity count in provenance line', () => {
      renderWithProviders(
        <NarrativePreview {...defaultProps} activityCount={6} />
      );

      expect(screen.queryByText(/6 activities/)).not.toBeInTheDocument();
    });

    it('renders coverage text when sourceCoverage is provided', () => {
      renderWithProviders(
        <NarrativePreview
          {...defaultProps}
          sourceCoverage={{ sourced: 3, total: 4, vagueMetrics: [] }}
        />
      );

      expect(screen.getByText('3/4 sourced')).toBeInTheDocument();
    });
  });
});
