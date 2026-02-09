/**
 * Story Derivation Service Tests
 *
 * Tests for:
 * - save() creates with correct fields
 * - listForStory() returns derivations containing storyId
 * - listForStory() returns packet derivations containing storyId
 * - listForStory() excludes other users
 * - delete() removes own derivation
 * - delete() returns count=0 for other user
 * - countForStory() returns correct count
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockDeleteMany = vi.fn();
const mockCount = vi.fn();

vi.mock('../../lib/prisma', () => ({
  prisma: {
    storyDerivation: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { StoryDerivationService } from './story-derivation.service';

const SAMPLE_INPUT = {
  userId: 'user-1',
  kind: 'single' as const,
  type: 'interview',
  storyIds: ['story-1'],
  text: 'Generated interview answer text',
  charCount: 31,
  wordCount: 5,
  speakingTimeSec: 12,
  tone: 'professional',
  customPrompt: undefined,
  framework: 'STAR',
  archetype: 'architect',
  model: 'claude-3-5-haiku-latest',
  processingTimeMs: 1200,
  featureCode: 'derive_story',
  creditCost: 1,
};

const MOCK_DERIVATION = {
  id: 'deriv-1',
  ...SAMPLE_INPUT,
  createdAt: new Date('2026-02-09T10:00:00Z'),
};

const MOCK_PACKET_DERIVATION = {
  id: 'deriv-2',
  userId: 'user-1',
  kind: 'packet',
  type: 'promotion',
  storyIds: ['story-1', 'story-2'],
  text: 'Promotion packet text',
  charCount: 21,
  wordCount: 3,
  speakingTimeSec: null,
  tone: null,
  customPrompt: null,
  framework: null,
  archetype: null,
  model: 'claude-3-5-haiku-latest',
  processingTimeMs: 2500,
  featureCode: 'derive_packet',
  creditCost: 2,
  createdAt: new Date('2026-02-09T11:00:00Z'),
};

describe('StoryDerivationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('save()', () => {
    it('creates with correct fields', async () => {
      mockCreate.mockResolvedValue(MOCK_DERIVATION);

      const result = await StoryDerivationService.save(SAMPLE_INPUT);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          kind: 'single',
          type: 'interview',
          storyIds: ['story-1'],
          text: 'Generated interview answer text',
          charCount: 31,
          wordCount: 5,
          speakingTimeSec: 12,
          tone: 'professional',
          customPrompt: undefined,
          framework: 'STAR',
          archetype: 'architect',
          model: 'claude-3-5-haiku-latest',
          processingTimeMs: 1200,
          featureCode: 'derive_story',
          creditCost: 1,
        },
      });
      expect(result.id).toBe('deriv-1');
    });
  });

  describe('listForStory()', () => {
    it('returns derivations containing storyId', async () => {
      mockFindMany.mockResolvedValue([MOCK_DERIVATION]);

      const result = await StoryDerivationService.listForStory('story-1', 'user-1');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          storyIds: { has: 'story-1' },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deriv-1');
    });

    it('returns packet derivations containing storyId', async () => {
      mockFindMany.mockResolvedValue([MOCK_PACKET_DERIVATION]);

      const result = await StoryDerivationService.listForStory('story-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('packet');
      expect(result[0].storyIds).toContain('story-1');
    });

    it('excludes other users', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await StoryDerivationService.listForStory('story-1', 'user-2');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-2' }),
        })
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('delete()', () => {
    it('removes own derivation', async () => {
      mockDeleteMany.mockResolvedValue({ count: 1 });

      const result = await StoryDerivationService.delete('deriv-1', 'user-1');

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: 'deriv-1', userId: 'user-1' },
      });
      expect(result.count).toBe(1);
    });

    it('returns count=0 for other user', async () => {
      mockDeleteMany.mockResolvedValue({ count: 0 });

      const result = await StoryDerivationService.delete('deriv-1', 'user-other');

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: 'deriv-1', userId: 'user-other' },
      });
      expect(result.count).toBe(0);
    });
  });

  describe('countForStory()', () => {
    it('returns correct count', async () => {
      mockCount.mockResolvedValue(3);

      const result = await StoryDerivationService.countForStory('story-1', 'user-1');

      expect(mockCount).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          storyIds: { has: 'story-1' },
        },
      });
      expect(result).toBe(3);
    });
  });
});
