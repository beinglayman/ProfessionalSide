/**
 * CareerStoryService Tests
 *
 * Tests for:
 * - Story creation from activities
 * - Story creation from journal entries
 * - Story regeneration
 * - Story deletion
 * - Section validation
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createCareerStoryService } from './career-story.service';

const prisma = new PrismaClient();

const TEST_USER_ID = 'test-user-career-story-service';

async function ensureTestUser(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: 'test-career-story-service@test.com',
        name: 'Career Story Service Test',
        password: 'test-password-hash',
      },
    });
  }
}

async function cleanupTestData(): Promise<void> {
  await prisma.$transaction([
    prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } }),
    prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } }),
    prisma.demoToolActivity.deleteMany({ where: { userId: TEST_USER_ID } }),
  ]);
}

async function createTestActivity(overrides: Partial<{
  title: string;
  description: string;
  source: string;
}> = {}) {
  return prisma.demoToolActivity.create({
    data: {
      userId: TEST_USER_ID,
      source: overrides.source || 'github',
      sourceId: `demo-activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sourceUrl: null,
      title: overrides.title || 'Test Activity',
      description: overrides.description || 'Test description',
      timestamp: new Date(),
      crossToolRefs: [],
    },
  });
}

async function createTestJournalEntry(activityIds: string[], overrides: Partial<{
  title: string;
}> = {}) {
  return prisma.journalEntry.create({
    data: {
      authorId: TEST_USER_ID,
      workspaceId: 'test-workspace',
      sourceMode: 'demo',
      title: overrides.title || 'Test Journal Entry',
      description: 'Test description for journal entry',
      fullContent: 'Test full content for journal entry',
      activityIds,
      skills: ['TypeScript', 'Testing'],
      visibility: 'workspace',
      groupingMethod: 'temporal',
    },
  });
}

describe('CareerStoryService', () => {
  beforeAll(async () => {
    await ensureTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('createStory', () => {
    it('creates a story with auto-generated sections when none provided', async () => {
      const activity = await createTestActivity({ title: 'Fix build pipeline' });
      const service = createCareerStoryService(true);

      const result = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'STAR',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.framework).toBe('STAR');
      expect(result.story?.sections).toHaveProperty('situation');
      expect(result.story?.sections).toHaveProperty('task');
      expect(result.story?.sections).toHaveProperty('action');
      expect(result.story?.sections).toHaveProperty('result');
    });

    it('rejects invalid narrative sections', async () => {
      const activity = await createTestActivity();
      const service = createCareerStoryService(true);

      const result = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'STAR',
        sections: {
          situation: { summary: '' },
        },
      });

      expect(result.success).toBe(false);
      expect(result.missingFields).toContain('sections.situation.summary');
      expect(result.missingFields).toContain('sections.task');
    });

    it('fails when no activities found', async () => {
      const service = createCareerStoryService(true);

      const result = await service.createStory(TEST_USER_ID, {
        activityIds: ['non-existent-id'],
        framework: 'STAR',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('activities');
    });
  });

  describe('createFromJournalEntry', () => {
    // Note: Full integration tests for createFromJournalEntry require
    // workspace/entry setup. See unified-flow.integration.test.ts.
    // Here we test the error paths that don't require full setup.

    it('fails when journal entry not found', async () => {
      const service = createCareerStoryService(true);

      const result = await service.createFromJournalEntry(TEST_USER_ID, 'non-existent-entry');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteStory', () => {
    it('deletes an existing story', async () => {
      const activity = await createTestActivity();
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
      });
      expect(createResult.success).toBe(true);
      const storyId = createResult.story!.id;

      const deleteResult = await service.deleteStory(storyId, TEST_USER_ID);

      expect(deleteResult.success).toBe(true);

      // Verify story is deleted
      const story = await prisma.careerStory.findUnique({ where: { id: storyId } });
      expect(story).toBeNull();
    });

    it('fails when story not found', async () => {
      const service = createCareerStoryService(true);

      const result = await service.deleteStory('non-existent-story', TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('fails when user does not own the story', async () => {
      const activity = await createTestActivity();
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
      });
      const storyId = createResult.story!.id;

      const result = await service.deleteStory(storyId, 'other-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('regenerate', () => {
    it('regenerates story sections', async () => {
      const activity = await createTestActivity({ title: 'Original task' });
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'STAR',
      });
      const storyId = createResult.story!.id;

      const regenerateResult = await service.regenerate(storyId, TEST_USER_ID);

      expect(regenerateResult.success).toBe(true);
      expect(regenerateResult.story?.needsRegeneration).toBe(false);
      expect(regenerateResult.story?.generatedAt).toBeDefined();
    });

    it('allows framework change during regeneration', async () => {
      const activity = await createTestActivity();
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'STAR',
      });
      const storyId = createResult.story!.id;

      const regenerateResult = await service.regenerate(storyId, TEST_USER_ID, 'CAR');

      expect(regenerateResult.success).toBe(true);
      expect(regenerateResult.story?.framework).toBe('CAR');
      // CAR has: challenge, action, result
      expect(regenerateResult.story?.sections).toHaveProperty('challenge');
      expect(regenerateResult.story?.sections).toHaveProperty('action');
      expect(regenerateResult.story?.sections).toHaveProperty('result');
    });

    it('regenerates STAR to SHARE with correct section keys', async () => {
      const activity = await createTestActivity({ title: 'Cross-team API standardization' });
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'STAR',
      });
      const storyId = createResult.story!.id;

      // Regenerate with SHARE framework
      const regenerateResult = await service.regenerate(storyId, TEST_USER_ID, 'SHARE');

      expect(regenerateResult.success).toBe(true);
      expect(regenerateResult.story?.framework).toBe('SHARE');
      // SHARE has: situation, hindrances, actions, results, evaluation
      const sections = regenerateResult.story?.sections;
      expect(sections).toHaveProperty('situation');
      expect(sections).toHaveProperty('hindrances');
      expect(sections).toHaveProperty('actions');
      expect(sections).toHaveProperty('results');
      expect(sections).toHaveProperty('evaluation');
      // Should NOT have STAR-only keys
      expect(sections).not.toHaveProperty('task');
    });

    it('regenerates STAR to STARL with learning section', async () => {
      const activity = await createTestActivity({ title: 'Q4 Reliability Initiative' });
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'STAR',
      });
      const storyId = createResult.story!.id;

      // Regenerate with STARL framework
      const regenerateResult = await service.regenerate(storyId, TEST_USER_ID, 'STARL');

      expect(regenerateResult.success).toBe(true);
      expect(regenerateResult.story?.framework).toBe('STARL');
      // STARL has: situation, task, action, result, learning
      const sections = regenerateResult.story?.sections;
      expect(sections).toHaveProperty('situation');
      expect(sections).toHaveProperty('task');
      expect(sections).toHaveProperty('action');
      expect(sections).toHaveProperty('result');
      expect(sections).toHaveProperty('learning');
    });

    it('regenerates SHARE to SOAR with obstacles section', async () => {
      const activity = await createTestActivity();
      const service = createCareerStoryService(true);

      const createResult = await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        framework: 'SHARE',
      });
      const storyId = createResult.story!.id;

      // Regenerate with SOAR framework
      const regenerateResult = await service.regenerate(storyId, TEST_USER_ID, 'SOAR');

      expect(regenerateResult.success).toBe(true);
      expect(regenerateResult.story?.framework).toBe('SOAR');
      // SOAR has: situation, obstacles, actions, results
      const sections = regenerateResult.story?.sections;
      expect(sections).toHaveProperty('situation');
      expect(sections).toHaveProperty('obstacles');
      expect(sections).toHaveProperty('actions');
      expect(sections).toHaveProperty('results');
      // Should NOT have SHARE-only keys
      expect(sections).not.toHaveProperty('hindrances');
      expect(sections).not.toHaveProperty('evaluation');
    });

    it('fails when story has no activities', async () => {
      // Directly create story with empty activityIds for this test
      const story = await prisma.careerStory.create({
        data: {
          userId: TEST_USER_ID,
          sourceMode: 'demo',
          title: 'Empty Story',
          activityIds: [],
          framework: 'STAR',
          sections: { situation: { summary: 'Test' } },
          needsRegeneration: true,
        },
      });
      const service = createCareerStoryService(true);

      const result = await service.regenerate(story.id, TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('activities');
    });
  });

  describe('listStories', () => {
    it('returns all stories for user in correct sourceMode', async () => {
      const activity = await createTestActivity();
      const service = createCareerStoryService(true);

      await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        title: 'Story 1',
      });
      await service.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        title: 'Story 2',
      });

      const result = await service.listStories(TEST_USER_ID);

      expect(result.stories).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('isolates demo mode stories from production', async () => {
      const activity = await createTestActivity();
      const demoService = createCareerStoryService(true);
      const prodService = createCareerStoryService(false);

      await demoService.createStory(TEST_USER_ID, {
        activityIds: [activity.id],
        title: 'Demo Story',
      });

      const demoResult = await demoService.listStories(TEST_USER_ID);
      const prodResult = await prodService.listStories(TEST_USER_ID);

      expect(demoResult.stories).toHaveLength(1);
      expect(prodResult.stories).toHaveLength(0);
    });
  });
});
