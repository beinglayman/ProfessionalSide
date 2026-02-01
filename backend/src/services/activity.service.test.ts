/**
 * Activity Service Tests
 *
 * Tests for the ActivityService that handles activity retrieval and stats.
 * Covers both demo and production modes, edge cases, and error conditions.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  ActivityService,
  isValidSource,
  isValidTimezone,
  ActivityNotFoundError,
  ActivityAccessDeniedError
} from './activity.service';
import { SUPPORTED_SOURCES, TEMPORAL_BUCKETS } from '../types/activity.types';

// =============================================================================
// TEST SETUP
// =============================================================================

const prisma = new PrismaClient();

let TEST_USER_ID: string;
let OTHER_USER_ID: string;
let TEST_JOURNAL_ENTRY_ID: string;
let TEST_ACTIVITY_IDS: string[] = [];

async function getOrCreateTestUsers(): Promise<{ mainUserId: string; otherUserId: string }> {
  // Try to find at least 2 existing users (avoid creating test users)
  const existingUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2
  });

  if (existingUsers.length >= 2) {
    return {
      mainUserId: existingUsers[0].id,
      otherUserId: existingUsers[1].id
    };
  }

  // Create test users as needed
  const timestamp = Date.now();

  let mainUserId: string;
  if (existingUsers.length >= 1) {
    mainUserId = existingUsers[0].id;
  } else {
    const mainUser = await prisma.user.create({
      data: {
        id: `test-user-activity-main-${timestamp}`,
        email: `test-activity-main-${timestamp}@example.com`,
        name: 'Activity Test User Main',
        password: 'test-password-hash',
        passwordHash: 'test-hash'
      }
    });
    mainUserId = mainUser.id;
  }

  // Always create second user if we don't have 2
  const otherUser = await prisma.user.create({
    data: {
      id: `test-user-activity-other-${timestamp}`,
      email: `test-activity-other-${timestamp}@example.com`,
      name: 'Activity Test User Other',
      password: 'test-password-hash',
      passwordHash: 'test-hash'
    }
  });

  return {
    mainUserId,
    otherUserId: otherUser.id
  };
}

async function createTestActivities(userId: string): Promise<string[]> {
  // Create demo activities for testing
  const activities = await prisma.demoToolActivity.createMany({
    data: [
      {
        id: `test-activity-1-${Date.now()}`,
        userId,
        source: 'github',
        sourceId: 'pr-123',
        title: 'Test PR 1',
        description: 'Test description',
        timestamp: new Date()
      },
      {
        id: `test-activity-2-${Date.now()}`,
        userId,
        source: 'jira',
        sourceId: 'PROJ-456',
        title: 'Test Ticket',
        description: 'Another test',
        timestamp: new Date(Date.now() - 86400000) // Yesterday
      },
      {
        id: `test-activity-3-${Date.now()}`,
        userId,
        source: 'github',
        sourceId: 'pr-789',
        title: 'Test PR 2',
        description: 'More tests',
        timestamp: new Date(Date.now() - 172800000) // 2 days ago
      }
    ]
  });

  // Fetch back the IDs
  const created = await prisma.demoToolActivity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  return created.map(a => a.id);
}

async function createTestJournalEntry(
  userId: string,
  activityIds: string[]
): Promise<string> {
  // Get or create a workspace first
  let workspace = await prisma.workspace.findFirst({
    where: { name: 'Test Workspace' }
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        id: `test-workspace-${Date.now()}`,
        name: 'Test Workspace'
      }
    });
  }

  // Ensure user is a workspace member
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: workspace.id
      }
    },
    update: { isActive: true },
    create: {
      userId,
      workspaceId: workspace.id,
      role: 'member',
      isActive: true
    }
  });

  const entry = await prisma.journalEntry.create({
    data: {
      id: `test-entry-${Date.now()}`,
      title: 'Test Journal Entry',
      description: 'Test entry for activity tests',
      fullContent: 'Full content here',
      authorId: userId,
      workspaceId: workspace.id,
      sourceMode: 'demo',
      activityIds
    }
  });

  return entry.id;
}

beforeAll(async () => {
  // Create test users (ensures two distinct users)
  const users = await getOrCreateTestUsers();
  TEST_USER_ID = users.mainUserId;
  OTHER_USER_ID = users.otherUserId;

  // Verify we have distinct users
  if (TEST_USER_ID === OTHER_USER_ID) {
    throw new Error('Test setup failed: TEST_USER_ID and OTHER_USER_ID must be different');
  }

  // Create test activities
  TEST_ACTIVITY_IDS = await createTestActivities(TEST_USER_ID);

  // Create test journal entry with activities
  TEST_JOURNAL_ENTRY_ID = await createTestJournalEntry(TEST_USER_ID, TEST_ACTIVITY_IDS);

  console.log('\nTest setup complete:');
  console.log('  TEST_USER_ID:', TEST_USER_ID);
  console.log('  OTHER_USER_ID:', OTHER_USER_ID);
  console.log('  TEST_JOURNAL_ENTRY_ID:', TEST_JOURNAL_ENTRY_ID);
  console.log('  TEST_ACTIVITY_IDS:', TEST_ACTIVITY_IDS);
});

afterAll(async () => {
  // Cleanup test data
  await prisma.journalEntry.deleteMany({
    where: { id: TEST_JOURNAL_ENTRY_ID }
  });
  await prisma.demoToolActivity.deleteMany({
    where: { id: { in: TEST_ACTIVITY_IDS } }
  });
  await prisma.$disconnect();
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('Helper Functions', () => {
  describe('isValidSource', () => {
    it('returns true for known sources', () => {
      expect(isValidSource('github')).toBe(true);
      expect(isValidSource('jira')).toBe(true);
      expect(isValidSource('slack')).toBe(true);
      expect(isValidSource('figma')).toBe(true);
    });

    it('returns false for unknown sources', () => {
      expect(isValidSource('unknown')).toBe(false);
      expect(isValidSource('')).toBe(false);
      expect(isValidSource('GITHUB')).toBe(false); // Case sensitive
    });
  });

  describe('isValidTimezone', () => {
    it('returns true for valid timezones', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    it('returns false for invalid timezones', () => {
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('invalid')).toBe(false);
      expect(isValidTimezone('America')).toBe(false);
      // @ts-expect-error - testing invalid input
      expect(isValidTimezone(null)).toBe(false);
      // @ts-expect-error - testing invalid input
      expect(isValidTimezone(undefined)).toBe(false);
    });
  });
});

// =============================================================================
// ACTIVITY SERVICE TESTS
// =============================================================================

describe('ActivityService', () => {
  describe('constructor', () => {
    it('defaults to production mode', () => {
      const service = new ActivityService();
      // Service should work without errors
      expect(service).toBeDefined();
    });

    it('accepts demo mode flag', () => {
      const demoService = new ActivityService(true);
      const prodService = new ActivityService(false);
      expect(demoService).toBeDefined();
      expect(prodService).toBeDefined();
    });
  });

  describe('getActivitiesForJournalEntry', () => {
    it('returns activities for a valid journal entry', async () => {
      const service = new ActivityService(true); // Demo mode
      const result = await service.getActivitiesForJournalEntry(
        TEST_JOURNAL_ENTRY_ID,
        TEST_USER_ID,
        { page: 1, limit: 20 }
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('meta');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta.journalEntryId).toBe(TEST_JOURNAL_ENTRY_ID);
      expect(result.meta.sourceMode).toBe('demo');
    });

    it('paginates correctly', async () => {
      const service = new ActivityService(true);

      // Get first page with limit 1
      const page1 = await service.getActivitiesForJournalEntry(
        TEST_JOURNAL_ENTRY_ID,
        TEST_USER_ID,
        { page: 1, limit: 1 }
      );

      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.limit).toBe(1);
      expect(page1.data.length).toBeLessThanOrEqual(1);

      if (page1.pagination.total > 1) {
        expect(page1.pagination.hasMore).toBe(true);
        expect(page1.pagination.totalPages).toBeGreaterThan(1);
      }
    });

    it('filters by source', async () => {
      const service = new ActivityService(true);
      const result = await service.getActivitiesForJournalEntry(
        TEST_JOURNAL_ENTRY_ID,
        TEST_USER_ID,
        { page: 1, limit: 20, source: 'github' }
      );

      // All returned activities should be from GitHub
      for (const activity of result.data) {
        expect(activity.source).toBe('github');
      }
    });

    it('throws ActivityNotFoundError for non-existent entry', async () => {
      const service = new ActivityService(true);

      await expect(
        service.getActivitiesForJournalEntry(
          'non-existent-id',
          TEST_USER_ID,
          { page: 1, limit: 20 }
        )
      ).rejects.toThrow(ActivityNotFoundError);
    });

    it('throws ActivityAccessDeniedError for other users entry', async () => {
      const service = new ActivityService(true);

      await expect(
        service.getActivitiesForJournalEntry(
          TEST_JOURNAL_ENTRY_ID,
          OTHER_USER_ID, // Different user
          { page: 1, limit: 20 }
        )
      ).rejects.toThrow(ActivityAccessDeniedError);
    });

    it('returns empty array for entry with no activities', async () => {
      // Create an entry with no activities
      const workspace = await prisma.workspace.findFirst();
      const emptyEntry = await prisma.journalEntry.create({
        data: {
          id: `test-empty-entry-${Date.now()}`,
          title: 'Empty Entry',
          description: 'No activities',
          fullContent: 'Content',
          authorId: TEST_USER_ID,
          workspaceId: workspace!.id,
          sourceMode: 'demo',
          activityIds: []
        }
      });

      const service = new ActivityService(true);
      const result = await service.getActivitiesForJournalEntry(
        emptyEntry.id,
        TEST_USER_ID,
        { page: 1, limit: 20 }
      );

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);

      // Cleanup
      await prisma.journalEntry.delete({ where: { id: emptyEntry.id } });
    });

    it('returns correct activity response shape', async () => {
      // Create fresh test data for this test to avoid interference from other tests
      const workspace = await prisma.workspace.findFirst();
      const activityId = `test-activity-shape-${Date.now()}`;
      await prisma.demoToolActivity.create({
        data: {
          id: activityId,
          userId: TEST_USER_ID,
          source: 'github',
          sourceId: 'pr-shape-test',
          title: 'Shape Test PR',
          description: 'Test for response shape',
          timestamp: new Date()
        }
      });

      const entryId = `test-entry-shape-${Date.now()}`;
      await prisma.journalEntry.create({
        data: {
          id: entryId,
          title: 'Shape Test Entry',
          description: 'For shape test',
          fullContent: 'Content',
          authorId: TEST_USER_ID,
          workspaceId: workspace!.id,
          sourceMode: 'demo',
          activityIds: [activityId]
        }
      });

      const service = new ActivityService(true);
      const result = await service.getActivitiesForJournalEntry(
        entryId,
        TEST_USER_ID,
        { page: 1, limit: 20 }
      );

      expect(result.data.length).toBeGreaterThan(0);
      const activity = result.data[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('source');
      expect(activity).toHaveProperty('sourceId');
      expect(activity).toHaveProperty('title');
      expect(activity).toHaveProperty('timestamp');
      expect(activity).toHaveProperty('crossToolRefs');
      // Timestamp should be ISO 8601
      expect(typeof activity.timestamp).toBe('string');
      expect(new Date(activity.timestamp).toISOString()).toBe(activity.timestamp);

      // Cleanup
      await prisma.journalEntry.delete({ where: { id: entryId } });
      await prisma.demoToolActivity.delete({ where: { id: activityId } });
    });
  });

  describe('getActivityStats', () => {
    describe('groupBy=source', () => {
      it('returns source groupings', async () => {
        const service = new ActivityService(true);
        const result = await service.getActivityStats(TEST_USER_ID, 'source');

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('meta');
        expect(result.meta.groupBy).toBe('source');
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('includes display metadata for known sources', async () => {
        const service = new ActivityService(true);
        const result = await service.getActivityStats(TEST_USER_ID, 'source');

        for (const group of result.data) {
          expect(group).toHaveProperty('source');
          expect(group).toHaveProperty('displayName');
          expect(group).toHaveProperty('color');
          expect(group).toHaveProperty('icon');
          expect(group).toHaveProperty('activityCount');
          expect(group).toHaveProperty('journalEntryCount');

          // Known sources should have proper metadata
          if (group.source in SUPPORTED_SOURCES) {
            const expected = SUPPORTED_SOURCES[group.source as keyof typeof SUPPORTED_SOURCES];
            expect(group.displayName).toBe(expected.displayName);
            expect(group.color).toBe(expected.color);
          }
        }
      });

      it('limits to MAX_SOURCES', async () => {
        const service = new ActivityService(true);
        const result = await service.getActivityStats(TEST_USER_ID, 'source');

        // Meta should include maxSources
        expect(result.meta).toHaveProperty('maxSources');
        expect(result.data.length).toBeLessThanOrEqual(result.meta.maxSources);
      });
    });

    describe('groupBy=temporal', () => {
      it('returns temporal bucket groupings', async () => {
        const service = new ActivityService(true);
        const result = await service.getActivityStats(TEST_USER_ID, 'temporal', 'UTC');

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('meta');
        expect(result.meta.groupBy).toBe('temporal');
        expect(result.meta.timezone).toBe('UTC');
      });

      it('includes all temporal buckets', async () => {
        const service = new ActivityService(true);
        const result = await service.getActivityStats(TEST_USER_ID, 'temporal', 'UTC');

        const returnedBuckets = result.data.map(d => d.bucket);
        for (const bucket of TEMPORAL_BUCKETS) {
          expect(returnedBuckets).toContain(bucket);
        }
      });

      it('buckets have correct shape', async () => {
        const service = new ActivityService(true);
        const result = await service.getActivityStats(TEST_USER_ID, 'temporal', 'UTC');

        for (const bucket of result.data) {
          expect(bucket).toHaveProperty('bucket');
          expect(bucket).toHaveProperty('displayName');
          expect(bucket).toHaveProperty('dateRange');
          expect(bucket.dateRange).toHaveProperty('start');
          expect(bucket.dateRange).toHaveProperty('end');
          expect(bucket).toHaveProperty('activityCount');
          expect(bucket).toHaveProperty('journalEntryCount');
        }
      });

      it('respects timezone parameter', async () => {
        const service = new ActivityService(true);
        const utcResult = await service.getActivityStats(TEST_USER_ID, 'temporal', 'UTC');
        const nyResult = await service.getActivityStats(TEST_USER_ID, 'temporal', 'America/New_York');

        expect(utcResult.meta.timezone).toBe('UTC');
        expect(nyResult.meta.timezone).toBe('America/New_York');
      });

      it('falls back gracefully for invalid timezone', async () => {
        const service = new ActivityService(true);
        // Should not throw, just log a warning
        const result = await service.getActivityStats(TEST_USER_ID, 'temporal', 'Invalid/Timezone');

        expect(result).toHaveProperty('data');
        expect(result.meta.groupBy).toBe('temporal');
      });
    });
  });

  describe('getActivityMetaForEntries', () => {
    it('returns metadata for valid entries', async () => {
      // Create fresh test data for this test
      const workspace = await prisma.workspace.findFirst();
      const activityId = `test-activity-meta-${Date.now()}`;
      await prisma.demoToolActivity.create({
        data: {
          id: activityId,
          userId: TEST_USER_ID,
          source: 'github',
          sourceId: 'pr-meta-test',
          title: 'Meta Test PR',
          description: 'Test for meta retrieval',
          timestamp: new Date()
        }
      });

      const entryId = `test-entry-meta-${Date.now()}`;
      await prisma.journalEntry.create({
        data: {
          id: entryId,
          title: 'Meta Test Entry',
          description: 'For meta test',
          fullContent: 'Content',
          authorId: TEST_USER_ID,
          workspaceId: workspace!.id,
          sourceMode: 'demo',
          activityIds: [activityId]
        }
      });

      const service = new ActivityService(true);
      const result = await service.getActivityMetaForEntries(
        TEST_USER_ID,
        [entryId]
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.has(entryId)).toBe(true);

      const meta = result.get(entryId)!;
      expect(meta).toHaveProperty('totalCount');
      expect(meta).toHaveProperty('sources');
      expect(meta).toHaveProperty('dateRange');
      expect(meta.totalCount).toBeGreaterThan(0);

      // Cleanup
      await prisma.journalEntry.delete({ where: { id: entryId } });
      await prisma.demoToolActivity.delete({ where: { id: activityId } });
    });

    it('returns empty meta for entries with no activities', async () => {
      const service = new ActivityService(true);
      const result = await service.getActivityMetaForEntries(
        TEST_USER_ID,
        ['non-existent-entry']
      );

      // Should not throw, but return empty map
      expect(result).toBeInstanceOf(Map);
    });

    it('batch processes multiple entries efficiently', async () => {
      // Create fresh test data for this test
      const workspace = await prisma.workspace.findFirst();
      const activityId = `test-activity-batch-${Date.now()}`;
      await prisma.demoToolActivity.create({
        data: {
          id: activityId,
          userId: TEST_USER_ID,
          source: 'jira',
          sourceId: 'ticket-batch-test',
          title: 'Batch Test Ticket',
          description: 'Test for batch processing',
          timestamp: new Date()
        }
      });

      const entryId = `test-entry-batch-${Date.now()}`;
      await prisma.journalEntry.create({
        data: {
          id: entryId,
          title: 'Batch Test Entry',
          description: 'For batch test',
          fullContent: 'Content',
          authorId: TEST_USER_ID,
          workspaceId: workspace!.id,
          sourceMode: 'demo',
          activityIds: [activityId]
        }
      });

      const service = new ActivityService(true);
      const result = await service.getActivityMetaForEntries(
        TEST_USER_ID,
        [entryId, 'fake-id-1', 'fake-id-2']
      );

      expect(result).toBeInstanceOf(Map);
      // Should have entry for the valid one
      expect(result.has(entryId)).toBe(true);

      // Cleanup
      await prisma.journalEntry.delete({ where: { id: entryId } });
      await prisma.demoToolActivity.delete({ where: { id: activityId } });
    });
  });
});

// =============================================================================
// MODE-SPECIFIC TESTS
// =============================================================================

describe('Demo vs Production Mode', () => {
  it('demo mode queries demo table', async () => {
    const demoService = new ActivityService(true);
    const result = await demoService.getActivityStats(TEST_USER_ID, 'source');

    // Should complete without error
    expect(result).toHaveProperty('data');
  });

  it('production mode queries production table', async () => {
    const prodService = new ActivityService(false);
    const result = await prodService.getActivityStats(TEST_USER_ID, 'source');

    // Should complete without error (may have 0 results)
    expect(result).toHaveProperty('data');
  });

  it('both modes return same response shape', async () => {
    const demoService = new ActivityService(true);
    const prodService = new ActivityService(false);

    const demoResult = await demoService.getActivityStats(TEST_USER_ID, 'source');
    const prodResult = await prodService.getActivityStats(TEST_USER_ID, 'source');

    expect(Object.keys(demoResult)).toEqual(Object.keys(prodResult));
    expect(Object.keys(demoResult.meta)).toEqual(Object.keys(prodResult.meta));
  });
});
