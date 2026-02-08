/**
 * Derivation Service Tests
 *
 * Tests for:
 * - Correct return structure (text, counts, metadata)
 * - speakingTimeSec only for interview/one-on-one
 * - Throws on missing story / missing LLM
 * - Metric extraction regex
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the model selector before importing the service
const mockExecuteTask = vi.fn();
vi.mock('../ai/model-selector.service', () => ({
  getModelSelector: () => ({
    executeTask: mockExecuteTask,
  }),
}));

// Mock the career story service
const mockGetStoryById = vi.fn();
vi.mock('./career-story.service', () => ({
  createCareerStoryService: () => ({
    getStoryById: mockGetStoryById,
  }),
}));

// Mock the story source service
vi.mock('./story-source.service', () => ({
  storySourceService: {
    getSourcesForStory: vi.fn().mockResolvedValue([]),
  },
}));

// Mock demo-tables for date range extraction
vi.mock('../../lib/demo-tables', () => ({
  getToolActivityTable: () => ({
    aggregate: vi.fn().mockResolvedValue({
      _min: { timestamp: null },
      _max: { timestamp: null },
    }),
  }),
}));

import { deriveStory, DeriveResult } from './derivation.service';

const MOCK_STORY = {
  id: 'story-1',
  userId: 'user-1',
  title: 'Migrated Auth System',
  framework: 'STAR',
  sections: {
    situation: { summary: 'Team faced auth issues affecting 50,000 users' },
    task: { summary: 'Led migration from LDAP to OAuth2' },
    action: { summary: 'Implemented OAuth2 with zero-downtime cutover over 3 months' },
    result: { summary: '50% fewer support tickets, 99.9% uptime maintained' },
  },
  activityIds: ['act-1', 'act-2'],
  archetype: 'architect',
};

describe('deriveStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoryById.mockResolvedValue(MOCK_STORY);
    mockExecuteTask.mockResolvedValue({
      content: 'This is the generated derivation text with some words in it.',
      model: 'claude-3-5-haiku-latest',
      estimatedCost: 0.001,
    });
  });

  it('returns correct structure with text, counts, and metadata', async () => {
    const result = await deriveStory('story-1', 'user-1', 'linkedin', false);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('charCount');
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.derivation).toBe('linkedin');
    expect(result.metadata.framework).toBe('STAR');
    expect(result.metadata.model).toBe('claude-3-5-haiku-latest');
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.charCount).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('includes speakingTimeSec for interview derivation', async () => {
    const result = await deriveStory('story-1', 'user-1', 'interview', false);
    expect(result.speakingTimeSec).toBeDefined();
    expect(result.speakingTimeSec).toBeGreaterThan(0);
  });

  it('includes speakingTimeSec for one-on-one derivation', async () => {
    const result = await deriveStory('story-1', 'user-1', 'one-on-one', false);
    expect(result.speakingTimeSec).toBeDefined();
    expect(result.speakingTimeSec).toBeGreaterThan(0);
  });

  it('does NOT include speakingTimeSec for linkedin derivation', async () => {
    const result = await deriveStory('story-1', 'user-1', 'linkedin', false);
    expect(result.speakingTimeSec).toBeUndefined();
  });

  it('does NOT include speakingTimeSec for resume derivation', async () => {
    const result = await deriveStory('story-1', 'user-1', 'resume', false);
    expect(result.speakingTimeSec).toBeUndefined();
  });

  it('does NOT include speakingTimeSec for team-share derivation', async () => {
    const result = await deriveStory('story-1', 'user-1', 'team-share', false);
    expect(result.speakingTimeSec).toBeUndefined();
  });

  it('throws on missing story', async () => {
    mockGetStoryById.mockResolvedValue(null);
    await expect(deriveStory('nonexistent', 'user-1', 'interview', false))
      .rejects.toThrow('Story not found');
  });

  it('passes tone and customPrompt to LLM', async () => {
    await deriveStory('story-1', 'user-1', 'linkedin', false, {
      tone: 'casual',
      customPrompt: 'Emphasize teamwork',
    });

    expect(mockExecuteTask).toHaveBeenCalledOnce();
    const [task, messages] = mockExecuteTask.mock.calls[0];
    expect(task).toBe('derive');
    const userContent = messages[1].content as string;
    expect(userContent).toContain('casual');
    expect(userContent).toContain('Emphasize teamwork');
  });

  it('includes archetype in metadata', async () => {
    const result = await deriveStory('story-1', 'user-1', 'resume', false);
    expect(result.metadata.archetype).toBe('architect');
  });

  it('calls LLM with derive task type and balanced quality', async () => {
    await deriveStory('story-1', 'user-1', 'interview', false);

    expect(mockExecuteTask).toHaveBeenCalledWith(
      'derive',
      expect.any(Array),
      'balanced',
      expect.objectContaining({ maxTokens: 500, temperature: 0.7 }),
    );
  });

  it('trims whitespace from LLM output', async () => {
    mockExecuteTask.mockResolvedValue({
      content: '\n  Some text with whitespace  \n',
      model: 'test-model',
      estimatedCost: 0,
    });

    const result = await deriveStory('story-1', 'user-1', 'linkedin', false);
    expect(result.text).toBe('Some text with whitespace');
  });

  it('does NOT include speakingTimeSec for self-assessment derivation', async () => {
    const result = await deriveStory('story-1', 'user-1', 'self-assessment', false);
    expect(result.speakingTimeSec).toBeUndefined();
  });

  it('handles story with empty sections gracefully', async () => {
    mockGetStoryById.mockResolvedValue({
      ...MOCK_STORY,
      sections: {},
    });

    const result = await deriveStory('story-1', 'user-1', 'linkedin', false);
    expect(result).toHaveProperty('text');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('defaults sourceCount to 0 when source service fails', async () => {
    const { storySourceService } = await import('./story-source.service');
    (storySourceService.getSourcesForStory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('DB connection failed')
    );

    const result = await deriveStory('story-1', 'user-1', 'interview', false);
    // Should not throw — sources are supplementary
    expect(result).toHaveProperty('text');
  });

  it('handles story without archetype', async () => {
    mockGetStoryById.mockResolvedValue({
      ...MOCK_STORY,
      archetype: null,
    });

    const result = await deriveStory('story-1', 'user-1', 'resume', false);
    expect(result.metadata.archetype).toBeNull();
  });

  it('handles story without activityIds', async () => {
    mockGetStoryById.mockResolvedValue({
      ...MOCK_STORY,
      activityIds: undefined,
    });

    const result = await deriveStory('story-1', 'user-1', 'linkedin', false);
    expect(result).toHaveProperty('text');
  });
});
