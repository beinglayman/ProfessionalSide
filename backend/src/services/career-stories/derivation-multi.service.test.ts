/**
 * Multi-Story Derivation Service Tests
 *
 * Tests for:
 * - Correct return structure (text, counts, metadata)
 * - Throws on missing stories
 * - Throws on missing LLM
 * - Passes tone and customPrompt through
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the model selector
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

// Mock demo-tables
vi.mock('../../lib/demo-tables', () => ({
  getToolActivityTable: () => ({
    aggregate: vi.fn().mockResolvedValue({
      _min: { timestamp: null },
      _max: { timestamp: null },
    }),
  }),
}));

import { derivePacket } from './derivation-multi.service';

const MOCK_STORY_1 = {
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

const MOCK_STORY_2 = {
  id: 'story-2',
  userId: 'user-1',
  title: 'Built CI/CD Pipeline',
  framework: 'CAR',
  sections: {
    challenge: { summary: 'Deployments took 4 hours and failed 30% of the time' },
    action: { summary: 'Designed automated pipeline with canary deployments' },
    result: { summary: 'Deploy time reduced to 15 minutes, failure rate dropped to 2%' },
  },
  activityIds: ['act-3'],
  archetype: 'pioneer',
};

describe('derivePacket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoryById.mockImplementation((id: string) => {
      if (id === 'story-1') return Promise.resolve(MOCK_STORY_1);
      if (id === 'story-2') return Promise.resolve(MOCK_STORY_2);
      return Promise.resolve(null);
    });
    mockExecuteTask.mockResolvedValue({
      content: 'Generated promotion packet text with metrics and achievements.',
      model: 'claude-3-5-haiku-latest',
      estimatedCost: 0.003,
    });
  });

  it('returns correct structure with text, counts, and metadata', async () => {
    const result = await derivePacket('user-1', ['story-1', 'story-2'], false);

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('charCount');
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.storyCount).toBe(2);
    expect(result.metadata.model).toBe('claude-3-5-haiku-latest');
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.charCount).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('throws when any story is not found', async () => {
    await expect(
      derivePacket('user-1', ['story-1', 'nonexistent'], false)
    ).rejects.toThrow('Stories not found: nonexistent');
  });

  it('throws when all stories are missing', async () => {
    await expect(
      derivePacket('user-1', ['missing-1', 'missing-2'], false)
    ).rejects.toThrow('Stories not found');
  });

  it('passes tone and customPrompt to LLM', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      tone: 'professional',
      customPrompt: 'Focus on leadership growth',
    });

    expect(mockExecuteTask).toHaveBeenCalledOnce();
    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('professional');
    expect(userContent).toContain('Focus on leadership growth');
  });

  it('calls LLM with larger token budget (1500)', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false);

    expect(mockExecuteTask).toHaveBeenCalledWith(
      'derive',
      expect.any(Array),
      'balanced',
      expect.objectContaining({ maxTokens: 1500, temperature: 0.7 }),
    );
  });

  it('trims whitespace from LLM output', async () => {
    mockExecuteTask.mockResolvedValue({
      content: '\n  Packet text with whitespace  \n',
      model: 'test-model',
      estimatedCost: 0,
    });

    const result = await derivePacket('user-1', ['story-1', 'story-2'], false);
    expect(result.text).toBe('Packet text with whitespace');
  });

  it('includes both story titles in LLM prompt', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false);

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('Migrated Auth System');
    expect(userContent).toContain('Built CI/CD Pipeline');
  });
});
