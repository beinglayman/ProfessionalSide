/**
 * Multi-Story Derivation Service Tests
 *
 * Tests for:
 * - Correct return structure (text, counts, metadata)
 * - Throws on missing stories
 * - Throws on missing LLM
 * - Passes tone and customPrompt through
 * - Packet type routing (promotion, annual-review, skip-level, portfolio-brief)
 * - Date range filtering for annual-review
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

// Mock demo-tables — controllable per test
const mockAggregate = vi.fn().mockResolvedValue({
  _min: { timestamp: null },
  _max: { timestamp: null },
});
const mockCount = vi.fn().mockResolvedValue(0);
vi.mock('../../lib/demo-tables', () => ({
  getToolActivityTable: () => ({
    aggregate: mockAggregate,
    count: mockCount,
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

const MOCK_STORY_3 = {
  id: 'story-3',
  userId: 'user-1',
  title: 'Mentored Junior Engineers',
  framework: 'STAR',
  sections: {
    situation: { summary: 'Team had 3 new hires' },
    task: { summary: 'Designed onboarding program' },
    action: { summary: 'Created weekly pairing sessions and review templates' },
    result: { summary: 'All 3 engineers promoted within 18 months' },
  },
  activityIds: ['act-4', 'act-5'],
  archetype: 'multiplier',
};

describe('derivePacket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoryById.mockImplementation((id: string) => {
      if (id === 'story-1') return Promise.resolve(MOCK_STORY_1);
      if (id === 'story-2') return Promise.resolve(MOCK_STORY_2);
      if (id === 'story-3') return Promise.resolve(MOCK_STORY_3);
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

  it('defaults to promotion template when no packetType specified', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false);

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('promotion packet');
  });

  it('uses annual-review template when packetType is annual-review', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      packetType: 'annual-review',
    });

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('annual review');
  });

  it('uses skip-level template when packetType is skip-level', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      packetType: 'skip-level',
    });

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('skip-level');
  });

  it('uses portfolio-brief template when packetType is portfolio-brief', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      packetType: 'portfolio-brief',
    });

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('portfolio brief');
  });

  it('passes packetType along with tone and customPrompt', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      packetType: 'skip-level',
      tone: 'technical',
      customPrompt: 'Emphasize cross-team impact',
    });

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('skip-level');
    expect(userContent).toContain('technical');
    expect(userContent).toContain('Emphasize cross-team impact');
  });

  it('uses self-assessment template when packetType is self-assessment', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      packetType: 'self-assessment',
    });

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('self-assessment');
  });

  it('uses one-on-one template when packetType is one-on-one', async () => {
    await derivePacket('user-1', ['story-1', 'story-2'], false, {
      packetType: 'one-on-one',
    });

    const [, messages] = mockExecuteTask.mock.calls[0];
    const userContent = messages[1].content as string;
    expect(userContent).toContain('1:1');
  });

  // ===========================================================================
  // DATE RANGE FILTERING (annual-review)
  // ===========================================================================

  describe('annual-review dateRange filtering', () => {
    it('filters stories to only those with activities in the date range', async () => {
      // story-1 has activities in range, story-2 does not, story-3 has activities in range
      mockCount.mockImplementation(({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in;
        if (ids.includes('act-1')) return Promise.resolve(2); // story-1 in range
        if (ids.includes('act-3')) return Promise.resolve(0); // story-2 not in range
        if (ids.includes('act-4')) return Promise.resolve(1); // story-3 in range
        return Promise.resolve(0);
      });

      const result = await derivePacket('user-1', ['story-1', 'story-2', 'story-3'], false, {
        packetType: 'annual-review',
        dateRange: { startDate: '2025-01', endDate: '2025-12' },
      });

      // Should include only story-1 and story-3 (2 stories matched)
      expect(result.metadata.storyCount).toBe(2);
      const [, messages] = mockExecuteTask.mock.calls[0];
      const userContent = messages[1].content as string;
      expect(userContent).toContain('Migrated Auth System');
      expect(userContent).toContain('Mentored Junior Engineers');
      expect(userContent).not.toContain('Built CI/CD Pipeline');
    });

    it('uses all stories when fewer than 2 match the date range', async () => {
      // Only story-1 has activities in range
      mockCount.mockImplementation(({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in;
        if (ids.includes('act-1')) return Promise.resolve(1); // story-1 in range
        return Promise.resolve(0); // everything else out of range
      });

      const result = await derivePacket('user-1', ['story-1', 'story-2'], false, {
        packetType: 'annual-review',
        dateRange: { startDate: '2025-01', endDate: '2025-06' },
      });

      // Falls back to all stories since only 1 matched
      expect(result.metadata.storyCount).toBe(2);
      const [, messages] = mockExecuteTask.mock.calls[0];
      const userContent = messages[1].content as string;
      expect(userContent).toContain('Migrated Auth System');
      expect(userContent).toContain('Built CI/CD Pipeline');
    });

    it('includes story on count error (graceful fallback)', async () => {
      mockCount.mockRejectedValue(new Error('DB connection lost'));

      const result = await derivePacket('user-1', ['story-1', 'story-2'], false, {
        packetType: 'annual-review',
        dateRange: { startDate: '2025-01', endDate: '2025-12' },
      });

      // Both stories included because catch block includes them
      expect(result.metadata.storyCount).toBe(2);
    });

    it('does not filter when packetType is not annual-review', async () => {
      mockCount.mockResolvedValue(0); // All would fail filter

      const result = await derivePacket('user-1', ['story-1', 'story-2'], false, {
        packetType: 'promotion',
        dateRange: { startDate: '2025-01', endDate: '2025-12' },
      });

      // dateRange ignored for non-annual-review types
      expect(result.metadata.storyCount).toBe(2);
      expect(mockCount).not.toHaveBeenCalled();
    });

    it('does not filter when dateRange is not provided', async () => {
      const result = await derivePacket('user-1', ['story-1', 'story-2'], false, {
        packetType: 'annual-review',
      });

      // No dateRange = no filtering
      expect(result.metadata.storyCount).toBe(2);
      expect(mockCount).not.toHaveBeenCalled();
    });
  });
});
