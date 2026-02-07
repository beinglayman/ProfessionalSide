import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma';
import { StorySourceService } from './story-source.service';

describe('StorySourceService', () => {
  const service = new StorySourceService();
  const TEST_USER_ID = 'test-user-source-svc';
  let storyId: string;

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: 'source-svc@test.com', name: 'Source Test', password: 'test-password-hash' },
    });

    const story = await prisma.careerStory.create({
      data: {
        userId: TEST_USER_ID,
        sourceMode: 'demo',
        title: 'Source Test Story',
        activityIds: [],
        framework: 'STAR',
        sections: {
          situation: { summary: 'The API was significantly slow.' },
          task: { summary: 'I was responsible for optimization.' },
          action: { summary: 'I implemented caching.' },
          result: { summary: 'Response time improved by 60%.' },
        },
        generatedAt: new Date(),
        needsRegeneration: false,
        visibility: 'private',
        isPublished: false,
      },
    });
    storyId = story.id;
  });

  afterAll(async () => {
    await prisma.storySource.deleteMany({ where: { storyId } });
    await prisma.careerStory.delete({ where: { id: storyId } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
  });

  it('creates a user note', async () => {
    const note = await service.createUserNote(storyId, 'result', 'Load time dropped from 8s to 1.2s');
    expect(note.sourceType).toBe('user_note');
    expect(note.sectionKey).toBe('result');
    expect(note.content).toBe('Load time dropped from 8s to 1.2s');
    expect(note.label).toBe('Your note');
  });

  it('excludes and restores a source', async () => {
    const note = await service.createUserNote(storyId, 'action', 'Used Redis for caching');
    expect(note.excludedAt).toBeNull();

    const excluded = await service.updateExcludedAt(note.id, storyId, new Date());
    expect(excluded.excludedAt).not.toBeNull();

    const restored = await service.updateExcludedAt(note.id, storyId, null);
    expect(restored.excludedAt).toBeNull();
  });

  it('computes coverage with gap detection', async () => {
    const sources = await service.getSourcesForStory(storyId);
    const sections = {
      situation: { summary: 'The API was significantly slow.' },
      task: { summary: 'I was responsible for optimization.' },
      action: { summary: 'I implemented caching.' },
      result: { summary: 'Response time improved by 60%.' },
    };

    const coverage = service.computeCoverage(sources, sections, ['situation', 'task', 'action', 'result']);

    expect(coverage.total).toBe(4);
    // Only action and result have user notes from prior tests
    expect(coverage.gaps).toContain('situation');
    expect(coverage.gaps).toContain('task');
  });

  it('detects vague metrics', async () => {
    const sections = {
      result: { summary: 'The system significantly improved performance.' },
    };
    const coverage = service.computeCoverage([], sections, ['result']);

    expect(coverage.vagueMetrics.length).toBeGreaterThan(0);
    expect(coverage.vagueMetrics[0].sectionKey).toBe('result');
    expect(coverage.vagueMetrics[0].match).toContain('significantly improved');
  });

  it('verifies ownership correctly', async () => {
    const note = await service.createUserNote(storyId, 'situation', 'Team was short-staffed');
    expect(await service.verifyOwnership(note.id, storyId)).toBe(true);
    expect(await service.verifyOwnership(note.id, 'fake-story-id')).toBe(false);
  });

  it('updateExcludedAt rejects source from wrong story', async () => {
    const note = await service.createUserNote(storyId, 'task', 'Owned the optimization effort');
    // Attempt to exclude with a wrong storyId — should throw
    await expect(
      service.updateExcludedAt(note.id, 'wrong-story-id', new Date())
    ).rejects.toThrow(/not found for story/);
  });

  it('updateExcludedAt works with correct storyId', async () => {
    const note = await service.createUserNote(storyId, 'task', 'Correct ownership test');
    const excluded = await service.updateExcludedAt(note.id, storyId, new Date());
    expect(excluded.excludedAt).not.toBeNull();
  });

  it('creates user notes with incrementing sortOrder', async () => {
    const note1 = await service.createUserNote(storyId, 'learning', 'First note');
    const note2 = await service.createUserNote(storyId, 'learning', 'Second note');
    expect(note2.sortOrder).toBeGreaterThan(note1.sortOrder);
  });

  it('coverage reports sourced=0 and all sections as gaps when no sources exist', () => {
    const sections = {
      situation: { summary: 'Good situation.' },
      task: { summary: 'Clear task.' },
    };
    const coverage = service.computeCoverage([], sections, ['situation', 'task']);
    expect(coverage.sourced).toBe(0);
    expect(coverage.total).toBe(2);
    expect(coverage.gaps).toEqual(['situation', 'task']);
  });

  it('coverage excludes excluded sources from sourced count', () => {
    const sources = [
      { id: '1', storyId: 'x', sectionKey: 'situation', sourceType: 'activity', activityId: null, label: '', content: null, url: null, annotation: null, toolType: null, role: null, questionId: null, sortOrder: 0, excludedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];
    const coverage = service.computeCoverage(sources as any, { situation: { summary: 'text' } }, ['situation']);
    expect(coverage.sourced).toBe(0);
    expect(coverage.gaps).toContain('situation');
  });
});
