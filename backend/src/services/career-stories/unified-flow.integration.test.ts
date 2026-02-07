/**
 * Unified Flow Integration Tests
 *
 * Tests the COMPLETE flow using unified models:
 *   DemoToolActivity → JournalEntry (sourceMode='demo') → CareerStory (sourceMode='demo')
 *
 * Verifies:
 * 1. Activities are created in DemoToolActivity table
 * 2. Clustering groups activities by shared refs
 * 3. JournalEntries are created in unified table with sourceMode='demo'
 * 4. CareerStories are created from journal entries with framework support
 * 5. Demo/production isolation works correctly
 *
 * Run with: npx vitest run src/services/career-stories/unified-flow.integration.test.ts
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { JournalService } from '../journal.service';
import {
  CareerStoryService,
  createCareerStoryService,
  NARRATIVE_FRAMEWORKS,
} from './career-story.service';
import { clearDemoData, configureSeedService, seedDemoData } from './seed.service';

// =============================================================================
// TEST SETUP - Isolated test user to avoid polluting real data
// =============================================================================

const prisma = new PrismaClient();
configureSeedService({ prisma });

const TEST_USER_ID = 'test-user-unified-flow';
const TEST_WORKSPACE_ID = 'test-workspace-unified-flow';

/**
 * Create test user and workspace if they don't exist.
 * Uses unique IDs to isolate from real users.
 */
async function ensureTestUser(): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { id: TEST_USER_ID },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: 'test-unified-flow@test.com',
        name: 'Unified Flow Test User',
        password: 'test-password-hash',
      },
    });
  }

  const existingWorkspace = await prisma.workspace.findUnique({
    where: { id: TEST_WORKSPACE_ID },
  });

  if (!existingWorkspace) {
    await prisma.workspace.create({
      data: {
        id: TEST_WORKSPACE_ID,
        name: 'Test Workspace',
        isPersonal: true,
        members: {
          create: {
            userId: TEST_USER_ID,
            role: 'owner',
            permissions: {},
          },
        },
      },
    });
  }
}

/**
 * Clean up ALL test data for this test user.
 * Called before AND after tests to ensure isolation.
 * Uses transaction for atomicity.
 */
async function cleanupTestData(): Promise<void> {
  await prisma.$transaction([
    prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } }),
    prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } }),
    prisma.demoToolActivity.deleteMany({ where: { userId: TEST_USER_ID } }),
  ]);
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Unified Flow Integration', () => {
  let seedResult: Awaited<ReturnType<typeof seedDemoData>>;

  // Clean before ALL tests to handle interrupted previous runs
  beforeAll(async () => {
    await ensureTestUser();
    await cleanupTestData();

    // Seed demo data - creates activities, clusters, and journal entries
    seedResult = await seedDemoData(TEST_USER_ID);
    console.log(`\nSeeded: ${seedResult.activitiesSeeded} activities, ${seedResult.clustersCreated} clusters, ${seedResult.entriesCreated} entries`);
  }, 120000);

  // Clean after ALL tests to leave no trace
  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // PHASE 1: Activity Seeding Verification
  // ===========================================================================

  describe('Phase 1: Activity Seeding', () => {
    it('creates activities in DemoToolActivity table', async () => {
      const activities = await prisma.demoToolActivity.findMany({
        where: { userId: TEST_USER_ID },
      });

      expect(activities.length).toBe(seedResult.activitiesSeeded);
      expect(activities.length).toBeGreaterThan(0);

      // Verify activity structure
      const activity = activities[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('source');
      expect(activity).toHaveProperty('title');
      expect(activity).toHaveProperty('timestamp');
      expect(activity).toHaveProperty('crossToolRefs');
    });

    it('activities have cross-tool references for clustering', async () => {
      const activities = await prisma.demoToolActivity.findMany({
        where: { userId: TEST_USER_ID },
      });

      const withRefs = activities.filter((a) => a.crossToolRefs.length > 0);
      expect(withRefs.length).toBeGreaterThan(0);

      console.log(`  ${withRefs.length}/${activities.length} activities have cross-tool refs`);
    });

    it('does NOT create production activities', async () => {
      const prodActivities = await prisma.toolActivity.findMany({
        where: { userId: TEST_USER_ID },
      });

      expect(prodActivities).toHaveLength(0);
    });
  });

  // ===========================================================================
  // PHASE 2: Journal Entry Creation (Unified Model)
  // ===========================================================================

  describe('Phase 2: Journal Entry Creation (Unified Model)', () => {
    it('creates journal entries in unified JournalEntry table with sourceMode=demo', async () => {
      const entries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'demo' },
      });

      expect(entries.length).toBe(seedResult.entriesCreated);
      expect(entries.length).toBeGreaterThan(0);

      // Verify all entries have correct sourceMode
      entries.forEach((entry) => {
        expect(entry.sourceMode).toBe('demo');
      });
    });

    it('journal entries have linked activityIds', async () => {
      const entries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'demo' },
      });

      const withActivities = entries.filter((e) => e.activityIds.length > 0);
      expect(withActivities.length).toBeGreaterThan(0);

      // Every activity ID should exist in DemoToolActivity
      for (const entry of withActivities) {
        const activities = await prisma.demoToolActivity.findMany({
          where: { id: { in: entry.activityIds } },
        });
        expect(activities.length).toBe(entry.activityIds.length);
      }
    });

    it('creates both temporal and cluster-based entries', async () => {
      const entries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'demo' },
      });

      const temporal = entries.filter((e) => e.groupingMethod === 'time');
      const cluster = entries.filter((e) => e.groupingMethod === 'cluster');

      expect(temporal.length).toBeGreaterThan(0);
      expect(cluster.length).toBeGreaterThan(0);

      console.log(`  Temporal: ${temporal.length}, Cluster: ${cluster.length}`);
    });

    it('does NOT create production journal entries', async () => {
      const prodEntries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'production' },
      });

      expect(prodEntries).toHaveLength(0);
    });
  });

  // ===========================================================================
  // PHASE 3: JournalService Unified Access
  // ===========================================================================

  describe('Phase 3: JournalService Unified Access', () => {
    it('demo mode service returns demo entries', async () => {
      const demoService = new JournalService(true);

      const result = await demoService.getJournalEntries(TEST_USER_ID, {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.entries.length).toBe(seedResult.entriesCreated);
      expect(result.pagination.total).toBe(seedResult.entriesCreated);
    });

    it('both demo and production services return same entries (unified fetch)', async () => {
      const demoService = new JournalService(true);
      const prodService = new JournalService(false);

      const demoResult = await demoService.getJournalEntries(TEST_USER_ID, {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const prodResult = await prodService.getJournalEntries(TEST_USER_ID, {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Unified fetch - both return same entries regardless of sourceMode
      expect(demoResult.entries.length).toBe(prodResult.entries.length);
    });

    it('entries have full JournalEntryResponse shape', async () => {
      const demoService = new JournalService(true);

      const result = await demoService.getJournalEntries(TEST_USER_ID, {
        page: 1,
        limit: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.entries.length).toBeGreaterThan(0);
      const entry = result.entries[0];

      // Required fields
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('fullContent');
      expect(entry).toHaveProperty('author');
      expect(entry.author).toHaveProperty('id');
      expect(entry.author).toHaveProperty('name');

      // Activity provenance
      expect(entry).toHaveProperty('activityIds');
      expect(entry).toHaveProperty('groupingMethod');
      expect(Array.isArray(entry.activityIds)).toBe(true);
    });
  });

  // ===========================================================================
  // PHASE 4: CareerStory Creation from JournalEntry
  // ===========================================================================

  describe('Phase 4: CareerStory Creation', () => {
    let testEntryId: string;
    let testActivityIds: string[];

    beforeAll(async () => {
      // Get a journal entry with activities
      const entry = await prisma.journalEntry.findFirst({
        where: {
          authorId: TEST_USER_ID,
          sourceMode: 'demo',
          activityIds: { isEmpty: false },
        },
      });

      if (entry) {
        testEntryId = entry.id;
        testActivityIds = entry.activityIds;
      }
    });

    it('creates story from journal entry activities', async () => {
      const storyService = createCareerStoryService(true);

      const result = await storyService.createStory(TEST_USER_ID, {
        activityIds: testActivityIds,
        framework: 'STAR',
        title: 'Test Story from Unified Flow',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.sourceMode).toBe('demo');
      expect(result.story!.framework).toBe('STAR');
      expect(result.story!.activityIds).toEqual(testActivityIds);
    });

    it('creates story with different frameworks', async () => {
      const storyService = createCareerStoryService(true);

      // Test CAR framework
      const carResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: testActivityIds,
        framework: 'CAR',
        title: 'CAR Framework Story',
      });

      expect(carResult.success).toBe(true);
      expect(carResult.story!.framework).toBe('CAR');
      expect(Object.keys(carResult.story!.sections)).toContain('challenge');
      expect(Object.keys(carResult.story!.sections)).toContain('action');
      expect(Object.keys(carResult.story!.sections)).toContain('result');

      // Test PAR framework
      const parResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: testActivityIds,
        framework: 'PAR',
        title: 'PAR Framework Story',
      });

      expect(parResult.success).toBe(true);
      expect(parResult.story!.framework).toBe('PAR');
      expect(Object.keys(parResult.story!.sections)).toContain('problem');
    });

    it('creates story directly from journal entry', async () => {
      const storyService = createCareerStoryService(true);

      const result = await storyService.createFromJournalEntry(
        TEST_USER_ID,
        testEntryId,
        'SOAR'
      );

      expect(result.success).toBe(true);
      expect(result.story!.framework).toBe('SOAR');
      expect(result.story!.activityIds.length).toBeGreaterThan(0);
    }, 120_000);

    it('story shows needsRegeneration after activity edit', async () => {
      const storyService = createCareerStoryService(true);

      // Create a story
      const createResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: testActivityIds,
        title: 'Story for Edit Test',
      });

      expect(createResult.story!.needsRegeneration).toBe(false);

      // Edit activities
      const editResult = await storyService.editActivities(
        createResult.story!.id,
        TEST_USER_ID,
        { activityIds: testActivityIds }
      );

      expect(editResult.story!.needsRegeneration).toBe(true);
    });

    it('regeneration clears needsRegeneration flag', async () => {
      const storyService = createCareerStoryService(true);

      // Create and edit
      const createResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: testActivityIds,
        title: 'Story for Regeneration Test',
      });

      await storyService.editActivities(createResult.story!.id, TEST_USER_ID, {
        activityIds: testActivityIds,
      });

      // Regenerate
      const regenResult = await storyService.regenerate(
        createResult.story!.id,
        TEST_USER_ID
      );

      expect(regenResult.story!.needsRegeneration).toBe(false);
    }, 120_000);

    it('stories are isolated by sourceMode', async () => {
      const demoService = createCareerStoryService(true);
      const prodService = createCareerStoryService(false);

      const demoStories = await demoService.listStories(TEST_USER_ID);
      const prodStories = await prodService.listStories(TEST_USER_ID);

      expect(demoStories.stories.length).toBeGreaterThan(0);
      expect(prodStories.stories).toHaveLength(0);

      // All demo stories should have sourceMode='demo'
      demoStories.stories.forEach((story) => {
        expect(story!.sourceMode).toBe('demo');
      });
    });
  });

  // ===========================================================================
  // PHASE 5: Publishing Flow
  // ===========================================================================

  describe('Phase 5: Publishing Flow', () => {
    let storyId: string;

    beforeAll(async () => {
      const storyService = createCareerStoryService(true);

      // Get activities
      const entry = await prisma.journalEntry.findFirst({
        where: {
          authorId: TEST_USER_ID,
          sourceMode: 'demo',
          activityIds: { isEmpty: false },
        },
      });

      if (entry) {
        const result = await storyService.createStory(TEST_USER_ID, {
          activityIds: entry.activityIds,
          title: 'Story for Publishing Test',
        });

        if (result.story) {
          storyId = result.story.id;
        }
      }
    });

    it('publishes story with visibility', async () => {
      const storyService = createCareerStoryService(true);

      const result = await storyService.publish(storyId, TEST_USER_ID, 'network');

      expect(result.success).toBe(true);
      expect(result.story!.isPublished).toBe(true);
      expect(result.story!.visibility).toBe('network');
      expect(result.story!.publishedAt).not.toBeNull();
    });

    it('cannot publish story that needs regeneration', async () => {
      const storyService = createCareerStoryService(true);

      // Get activities
      const entry = await prisma.journalEntry.findFirst({
        where: {
          authorId: TEST_USER_ID,
          sourceMode: 'demo',
          activityIds: { isEmpty: false },
        },
      });

      // Create and mark as needing regeneration
      const createResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: entry!.activityIds,
        title: 'Story Needing Regeneration',
      });

      await storyService.editActivities(createResult.story!.id, TEST_USER_ID, {
        activityIds: entry!.activityIds,
      });

      // Try to publish
      const publishResult = await storyService.publish(
        createResult.story!.id,
        TEST_USER_ID
      );

      expect(publishResult.success).toBe(false);
      expect(publishResult.error).toContain('needs regeneration');
    });

    it('unpublishes story', async () => {
      const storyService = createCareerStoryService(true);

      const result = await storyService.unpublish(storyId, TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.story!.isPublished).toBe(false);
    });
  });

  // ===========================================================================
  // PHASE 6: Full Provenance Chain
  // ===========================================================================

  describe('Phase 6: Full Provenance Chain', () => {
    it('traces: Activity → JournalEntry → CareerStory', async () => {
      // Get a cluster-based journal entry
      const journalEntry = await prisma.journalEntry.findFirst({
        where: {
          authorId: TEST_USER_ID,
          sourceMode: 'demo',
          groupingMethod: 'cluster',
          activityIds: { isEmpty: false },
        },
      });

      expect(journalEntry).not.toBeNull();

      // Verify activities exist
      const activities = await prisma.demoToolActivity.findMany({
        where: { id: { in: journalEntry!.activityIds } },
      });

      expect(activities.length).toBe(journalEntry!.activityIds.length);

      // Create a story from these activities
      const storyService = createCareerStoryService(true);
      const storyResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: journalEntry!.activityIds,
        title: 'Provenance Test Story',
      });

      expect(storyResult.success).toBe(true);

      // Verify the provenance chain
      // Story.activityIds → JournalEntry.activityIds → DemoToolActivity.id
      expect(storyResult.story!.activityIds).toEqual(journalEntry!.activityIds);

      // Activities should share common refs (cluster basis)
      const allRefs = activities.flatMap((a) => a.crossToolRefs);
      const uniqueRefs = [...new Set(allRefs)];
      const sharedRefs = uniqueRefs.filter(
        (ref) => allRefs.filter((r) => r === ref).length > 1
      );

      if (activities.length > 1) {
        expect(sharedRefs.length).toBeGreaterThan(0);
        console.log(`  Cluster based on shared refs: ${sharedRefs.join(', ')}`);
      }
    });

    it('story has StorySource rows for activity evidence', async () => {
      const storyService = createCareerStoryService(true);
      const stories = await storyService.listStories(TEST_USER_ID);
      const story = stories.stories.find((s) => s!.activityIds.length > 0);
      expect(story).toBeDefined();

      // Sources should exist in StorySource table
      const sources = await prisma.storySource.findMany({
        where: { storyId: story!.id },
      });

      // At minimum, some sources should exist (either mapped or unassigned)
      expect(sources.length).toBeGreaterThan(0);

      // All activity sources should reference valid activity IDs or be null (missing activity)
      const activitySources = sources.filter((s) => s.sourceType === 'activity');
      for (const source of activitySources) {
        if (source.activityId) {
          expect(story!.activityIds).toContain(source.activityId);
        }
        expect(source.label).toBeTruthy();
      }
    });
  });

  // ===========================================================================
  // PHASE 7: Framework Validation
  // ===========================================================================

  describe('Phase 7: Narrative Framework Support', () => {
    it('supports all defined frameworks', async () => {
      const storyService = createCareerStoryService(true);

      const entry = await prisma.journalEntry.findFirst({
        where: {
          authorId: TEST_USER_ID,
          sourceMode: 'demo',
          activityIds: { isEmpty: false },
        },
      });

      for (const [frameworkName, sections] of Object.entries(NARRATIVE_FRAMEWORKS)) {
        const result = await storyService.createStory(TEST_USER_ID, {
          activityIds: entry!.activityIds,
          framework: frameworkName,
          title: `${frameworkName} Framework Test`,
        });

        expect(result.success).toBe(true);
        expect(result.story!.framework).toBe(frameworkName);

        // Verify all framework sections are present
        const storySections = Object.keys(result.story!.sections);
        sections.forEach((expectedSection) => {
          expect(storySections).toContain(expectedSection);
        });

        console.log(`  ✓ ${frameworkName}: ${sections.join(', ')}`);
      }
    });

    it('framework can be changed during regeneration', async () => {
      const storyService = createCareerStoryService(true);

      const entry = await prisma.journalEntry.findFirst({
        where: {
          authorId: TEST_USER_ID,
          sourceMode: 'demo',
          activityIds: { isEmpty: false },
        },
      });

      // Create with STAR
      const createResult = await storyService.createStory(TEST_USER_ID, {
        activityIds: entry!.activityIds,
        framework: 'STAR',
        title: 'Framework Change Test',
      });

      expect(createResult.story!.framework).toBe('STAR');
      expect(Object.keys(createResult.story!.sections)).toContain('situation');

      // Regenerate with CAR
      const regenResult = await storyService.regenerate(
        createResult.story!.id,
        TEST_USER_ID,
        'CAR'
      );

      expect(regenResult.story!.framework).toBe('CAR');
      expect(Object.keys(regenResult.story!.sections)).toContain('challenge');
      expect(Object.keys(regenResult.story!.sections)).not.toContain('situation');
    }, 120_000);
  });
});
