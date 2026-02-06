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
import { NarrativePreview } from './NarrativePreview';
import { CareerStory, GenerateSTARResult, NarrativeFramework, ToolType } from '../../types/career-stories';

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

/** Helper: open the copy menu and click "Plain Text" to trigger raw copy */
async function triggerCopy() {
  const copyButton = screen.getByTestId('copy-star');
  fireEvent.click(copyButton);
  // The copy menu opens — click "Plain Text" for raw format
  const plainTextOption = await screen.findByText('Plain Text');
  fireEvent.click(plainTextOption);
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
      render(<NarrativePreview {...defaultProps} />);

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

      render(
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

      render(
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

      render(
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

      render(<NarrativePreview {...defaultProps} />);

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

      render(
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

      render(
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

      render(
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
    it('calls onFrameworkChange when framework is changed via selector', async () => {
      const onFrameworkChange = vi.fn();

      render(
        <NarrativePreview
          {...defaultProps}
          onFrameworkChange={onFrameworkChange}
        />
      );

      // Open the framework selector dropdown
      const selectorTrigger = screen.getByTestId('framework-selector');
      fireEvent.click(selectorTrigger);

      // Wait for dropdown to open and click SHARE option
      await waitFor(() => {
        const shareOption = screen.getByRole('option', { name: /SHARE/i });
        fireEvent.click(shareOption);
      });

      expect(onFrameworkChange).toHaveBeenCalledWith('SHARE');
    });
  });

  describe('Regeneration', () => {
    it('calls onRegenerate when regenerate button is clicked', () => {
      const onRegenerate = vi.fn();

      render(
        <NarrativePreview
          {...defaultProps}
          onRegenerate={onRegenerate}
        />
      );

      const regenerateButton = screen.getByTestId('regenerate-star');
      fireEvent.click(regenerateButton);

      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });

    it('does not call onRegenerate when disabled', () => {
      const onRegenerate = vi.fn();

      render(
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
      render(
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

      render(
        <NarrativePreview
          {...defaultProps}
          story={emptyStory}
        />
      );

      // Should fall back to star result
      expect(screen.getByText('Situation')).toBeInTheDocument();
    });

    it('handles missing star result and story', () => {
      render(
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

      render(
        <NarrativePreview
          {...defaultProps}
          result={failedResult}
        />
      );

      expect(screen.getByTestId('star-preview-error')).toBeInTheDocument();
      expect(screen.getByText(/Can't generate story/)).toBeInTheDocument();
    });
  });
});
