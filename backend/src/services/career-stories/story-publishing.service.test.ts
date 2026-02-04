/**
 * StoryPublishingService Tests
 *
 * Focused unit-ish tests for publishing logic, visibility filtering,
 * and profile privacy gates.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createStoryPublishingService, Visibility } from './story-publishing.service';

const prisma = new PrismaClient();

const TEST_USER_ID = 'test-user-story-publishing';
const OTHER_USER_ID = 'test-user-story-publishing-other';

async function ensureTestUsers(): Promise<void> {
  const users = [TEST_USER_ID, OTHER_USER_ID];
  for (const id of users) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id,
          email: `${id}@test.com`,
          name: id,
          password: 'test-password-hash',
        },
      });
    }
  }
}

async function cleanupStories(): Promise<void> {
  await prisma.careerStory.deleteMany({
    where: { userId: { in: [TEST_USER_ID, OTHER_USER_ID] } },
  });
}

async function cleanupProfiles(): Promise<void> {
  await prisma.userProfile.deleteMany({
    where: { userId: { in: [TEST_USER_ID, OTHER_USER_ID] } },
  });
}

async function createStory(options: {
  userId: string;
  sourceMode?: 'demo' | 'production';
  title?: string;
  framework?: string;
  sections?: Record<string, unknown>;
  activityIds?: string[];
  isPublished?: boolean;
  visibility?: Visibility;
  needsRegeneration?: boolean;
  publishedAt?: Date | null;
}) {
  const {
    userId,
    sourceMode = 'demo',
    title = 'Test Story',
    framework = 'STAR',
    sections = {
      situation: { summary: 'Context' },
      task: { summary: 'Task' },
      action: { summary: 'Action' },
      result: { summary: 'Result' },
    },
    activityIds = ['act-1'],
    isPublished = false,
    visibility = 'private',
    needsRegeneration = false,
    publishedAt = null,
  } = options;

  return prisma.careerStory.create({
    data: {
      userId,
      sourceMode,
      title,
      framework,
      sections,
      activityIds,
      isPublished,
      visibility,
      needsRegeneration,
      publishedAt,
    },
  });
}

describe('StoryPublishingService', () => {
  beforeAll(async () => {
    await ensureTestUsers();
  });

  afterEach(async () => {
    await cleanupStories();
    await cleanupProfiles();
  });

  afterAll(async () => {
    await cleanupStories();
    await cleanupProfiles();
    await prisma.$disconnect();
  });

  it('publishes a valid story and sets visibility', async () => {
    const story = await createStory({ userId: TEST_USER_ID });
    const service = createStoryPublishingService(true);

    const result = await service.publish(story.id, TEST_USER_ID, 'network');

    expect(result.success).toBe(true);
    expect(result.story?.isPublished).toBe(true);
    expect(result.story?.visibility).toBe('network');
    expect(result.story?.publishedAt).not.toBeNull();
  });

  it('rejects publish when story needs regeneration', async () => {
    const story = await createStory({
      userId: TEST_USER_ID,
      needsRegeneration: true,
    });
    const service = createStoryPublishingService(true);

    const result = await service.publish(story.id, TEST_USER_ID, 'network');

    expect(result.success).toBe(false);
    expect(result.error).toContain('needs regeneration');
  });

  it('rejects publish when required fields are missing', async () => {
    const story = await createStory({
      userId: TEST_USER_ID,
      sections: {},
      activityIds: [],
    });
    const service = createStoryPublishingService(true);

    const result = await service.publish(story.id, TEST_USER_ID, 'network');

    expect(result.success).toBe(false);
    expect(result.missingFields).toContain('sections');
    expect(result.missingFields).toContain('activityIds');
  });

  it('unpublishes a story and clears publishedAt', async () => {
    const story = await createStory({
      userId: TEST_USER_ID,
      isPublished: true,
      visibility: 'network',
      publishedAt: new Date(),
    });
    const service = createStoryPublishingService(true);

    const result = await service.unpublish(story.id, TEST_USER_ID);

    expect(result.success).toBe(true);
    expect(result.story?.isPublished).toBe(false);
    expect(result.story?.publishedAt).toBeNull();
  });

  it('rejects visibility change for non-owners', async () => {
    const story = await createStory({ userId: OTHER_USER_ID });
    const service = createStoryPublishingService(true);

    const result = await service.setVisibility(story.id, TEST_USER_ID, 'network');

    expect(result.success).toBe(false);
    expect(result.error).toContain('own');
  });

  it('rejects invalid visibility values', async () => {
    const story = await createStory({ userId: TEST_USER_ID });
    const service = createStoryPublishingService(true);

    const publishResult = await service.publish(
      story.id,
      TEST_USER_ID,
      'invalid' as Visibility
    );
    expect(publishResult.success).toBe(false);
    expect(publishResult.error).toContain('Invalid visibility');

    const visibilityResult = await service.setVisibility(
      story.id,
      TEST_USER_ID,
      'invalid' as Visibility
    );
    expect(visibilityResult.success).toBe(false);
    expect(visibilityResult.error).toContain('Invalid visibility');
  });

  it('filters published stories based on viewer access and profile privacy', async () => {
    await createStory({
      userId: TEST_USER_ID,
      isPublished: true,
      visibility: 'workspace',
    });
    await createStory({
      userId: TEST_USER_ID,
      isPublished: true,
      visibility: 'network',
    });

    const service = createStoryPublishingService(true);

    const networkView = await service.getPublishedStories(TEST_USER_ID, OTHER_USER_ID, false);
    expect(networkView.stories).toHaveLength(1);
    expect(networkView.stories[0].visibility).toBe('network');

    const workspaceView = await service.getPublishedStories(TEST_USER_ID, OTHER_USER_ID, true);
    expect(workspaceView.stories).toHaveLength(2);

    // Default profile visibility is "network" - public viewers should see nothing
    const publicView = await service.getPublishedStories(TEST_USER_ID, null, false);
    expect(publicView.stories).toHaveLength(0);
    expect(publicView.viewerAccess).toBe('none');
  });

  it('returns public profile when profileVisibility is public', async () => {
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      create: { userId: TEST_USER_ID, profileVisibility: 'public' },
      update: { profileVisibility: 'public' },
    });

    await createStory({
      userId: TEST_USER_ID,
      isPublished: true,
      visibility: 'network',
    });

    const service = createStoryPublishingService(true);
    const profile = await service.getPublicProfile(TEST_USER_ID);

    expect(profile).not.toBeNull();
    expect(profile?.stories).toHaveLength(1);
    expect((profile?.profile as { id: string }).id).toBe(TEST_USER_ID);
  });

  it('enforces sourceMode isolation', async () => {
    const story = await createStory({
      userId: TEST_USER_ID,
      sourceMode: 'production',
    });
    const service = createStoryPublishingService(true); // demo mode

    const result = await service.getStory(story.id, TEST_USER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Story not found');
  });
});
