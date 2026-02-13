/**
 * Story Derivation Service Tests
 *
 * Tests for:
 * - save() creates with correct fields (including sections)
 * - getById() fetches with sources + annotations
 * - snapshotSources() creates derivation-owned source copies
 * - listForStory() / delete() / countForStory()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockDeleteMany = vi.fn();
const mockCount = vi.fn();
const mockSourceFindMany = vi.fn();
const mockSourceCreateMany = vi.fn();

vi.mock('../../lib/prisma', () => ({
  prisma: {
    storyDerivation: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    storySource: {
      findMany: (...args: unknown[]) => mockSourceFindMany(...args),
      createMany: (...args: unknown[]) => mockSourceCreateMany(...args),
    },
  },
}));

// Mock demo-tables (unused in this test file, but imported by service)
vi.mock('../../lib/demo-tables', () => ({
  getToolActivityTable: () => ({}),
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
    it('creates with correct fields including sectionOrder', async () => {
      mockCreate.mockResolvedValue(MOCK_DERIVATION);

      const result = await StoryDerivationService.save(SAMPLE_INPUT);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          kind: 'single',
          type: 'interview',
          storyIds: ['story-1'],
          text: 'Generated interview answer text',
          sectionOrder: [],
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
        include: { _count: { select: { annotations: true } } },
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

  describe('listByKind()', () => {
    it('includes annotation count in response', async () => {
      mockFindMany.mockResolvedValue([MOCK_DERIVATION]);

      const result = await StoryDerivationService.listByKind('user-1', 'single');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', kind: 'single' },
        include: { _count: { select: { annotations: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      expect(result).toHaveLength(1);
    });

    it('respects custom take parameter', async () => {
      mockFindMany.mockResolvedValue([]);

      await StoryDerivationService.listByKind('user-1', 'packet', 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it('filters by packet kind', async () => {
      mockFindMany.mockResolvedValue([MOCK_PACKET_DERIVATION]);

      const result = await StoryDerivationService.listByKind('user-1', 'packet');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', kind: 'packet' },
        })
      );
      expect(result[0].kind).toBe('packet');
    });
  });

  describe('save() with sections', () => {
    it('passes sectionOrder when provided', async () => {
      mockCreate.mockResolvedValue({ id: 'deriv-6', ...SAMPLE_INPUT, sectionOrder: ['hook', 'body'] });

      await StoryDerivationService.save({ ...SAMPLE_INPUT, sectionOrder: ['hook', 'body'] });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.sectionOrder).toEqual(['hook', 'body']);
    });

    it('passes sections as serialized JSON when provided', async () => {
      const sections = { hook: { summary: 'Opening.' }, body: { summary: 'Main content.' } };
      mockCreate.mockResolvedValue({ id: 'deriv-3', ...SAMPLE_INPUT, sections });

      await StoryDerivationService.save({ ...SAMPLE_INPUT, sections });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.sections).toEqual(sections);
    });

    it('omits sections when not provided', async () => {
      mockCreate.mockResolvedValue({ id: 'deriv-4', ...SAMPLE_INPUT });

      await StoryDerivationService.save(SAMPLE_INPUT);

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.sections).toBeUndefined();
    });

    it('omits sections when explicitly null', async () => {
      mockCreate.mockResolvedValue({ id: 'deriv-5', ...SAMPLE_INPUT, sections: null });

      await StoryDerivationService.save({ ...SAMPLE_INPUT, sections: null });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.sections).toBeUndefined();
    });
  });

  describe('getById()', () => {
    it('fetches derivation with sources and annotations', async () => {
      const mockResult = { id: 'deriv-1', userId: 'user-1', sources: [], annotations: [] };
      mockFindFirst.mockResolvedValue(mockResult);

      const result = await StoryDerivationService.getById('deriv-1', 'user-1');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'deriv-1', userId: 'user-1' },
        include: { sources: true, annotations: true },
      });
      expect(result).toEqual(mockResult);
    });

    it('returns null for non-existent derivation', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await StoryDerivationService.getById('nonexistent', 'user-1');
      expect(result).toBeNull();
    });

    it('returns null for wrong user', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await StoryDerivationService.getById('deriv-1', 'wrong-user');
      expect(result).toBeNull();
    });
  });

  describe('snapshotSources()', () => {
    it('creates derivation-owned copies of story activity sources', async () => {
      mockSourceFindMany.mockResolvedValue([
        { activityId: 'act-1', label: 'PR #42', url: 'https://github.com/pr/42', toolType: 'github', role: 'author', sectionKey: 'situation', sortOrder: 0 },
        { activityId: 'act-2', label: 'JIRA-123', url: null, toolType: 'jira', role: null, sectionKey: 'action', sortOrder: 1 },
      ]);
      mockSourceCreateMany.mockResolvedValue({ count: 2 });

      await StoryDerivationService.snapshotSources('deriv-1', ['story-1'], 'single');

      expect(mockSourceCreateMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            derivationId: 'deriv-1',
            sectionKey: 'content',
            activityId: 'act-1',
            label: 'PR #42',
            toolType: 'github',
          }),
          expect.objectContaining({
            derivationId: 'deriv-1',
            sectionKey: 'content',
            activityId: 'act-2',
            label: 'JIRA-123',
          }),
        ],
      });
    });

    it('uses "unassigned" sectionKey for packet kind', async () => {
      mockSourceFindMany.mockResolvedValue([
        { activityId: 'act-1', label: 'PR #42', url: null, toolType: 'github', role: null, sectionKey: 'result', sortOrder: 0 },
      ]);
      mockSourceCreateMany.mockResolvedValue({ count: 1 });

      await StoryDerivationService.snapshotSources('deriv-2', ['story-1'], 'packet');

      const data = mockSourceCreateMany.mock.calls[0][0].data;
      expect(data[0].sectionKey).toBe('unassigned');
    });

    it('deduplicates by activityId across multiple stories', async () => {
      // Both stories have the same activityId
      mockSourceFindMany
        .mockResolvedValueOnce([
          { activityId: 'act-shared', label: 'Shared PR', url: null, toolType: 'github', role: null, sectionKey: 'a', sortOrder: 0 },
        ])
        .mockResolvedValueOnce([
          { activityId: 'act-shared', label: 'Shared PR (dupe)', url: null, toolType: 'github', role: null, sectionKey: 'b', sortOrder: 0 },
          { activityId: 'act-unique', label: 'Unique', url: null, toolType: 'jira', role: null, sectionKey: 'b', sortOrder: 1 },
        ]);
      mockSourceCreateMany.mockResolvedValue({ count: 2 });

      await StoryDerivationService.snapshotSources('deriv-3', ['story-1', 'story-2'], 'packet');

      const data = mockSourceCreateMany.mock.calls[0][0].data;
      expect(data).toHaveLength(2);
      expect(data.map((d: any) => d.activityId)).toEqual(['act-shared', 'act-unique']);
    });

    it('does not call createMany when no sources found', async () => {
      mockSourceFindMany.mockResolvedValue([]);

      await StoryDerivationService.snapshotSources('deriv-4', ['story-1'], 'single');

      expect(mockSourceCreateMany).not.toHaveBeenCalled();
    });

    it('skips sources with null activityId', async () => {
      mockSourceFindMany.mockResolvedValue([
        { activityId: null, label: 'User note', url: null, toolType: null, role: null, sectionKey: 'a', sortOrder: 0 },
        { activityId: 'act-1', label: 'Real source', url: null, toolType: 'github', role: null, sectionKey: 'a', sortOrder: 1 },
      ]);
      mockSourceCreateMany.mockResolvedValue({ count: 1 });

      await StoryDerivationService.snapshotSources('deriv-5', ['story-1'], 'single');

      const data = mockSourceCreateMany.mock.calls[0][0].data;
      expect(data).toHaveLength(1);
      expect(data[0].activityId).toBe('act-1');
    });
  });
});
