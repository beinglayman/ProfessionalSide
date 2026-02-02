/**
 * Journal Service Tests
 *
 * Tests for the unified JournalService that handles both demo and production modes.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  JournalService,
  validateEdgeType,
  validateEdgeMessage,
  validateActivityEdges,
} from './journal.service';

// =============================================================================
// TEST SETUP
// =============================================================================

const prisma = new PrismaClient();
const journalService = new JournalService();

let TEST_USER_ID: string;

async function getOrCreateTestUser(): Promise<string> {
  const existingUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (existingUser) {
    return existingUser.id;
  }

  const testUser = await prisma.user.create({
    data: {
      id: 'test-user-journal-' + Date.now(),
      email: `test-journal-${Date.now()}@example.com`,
      name: 'Journal Test User',
      passwordHash: 'test-hash',
    },
  });

  return testUser.id;
}

beforeAll(async () => {
  TEST_USER_ID = await getOrCreateTestUser();
  console.log('\nUsing test user:', TEST_USER_ID);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// =============================================================================
// UNIFIED SERVICE TESTS
// =============================================================================

describe('JournalService Unified Mode', () => {
  describe('getJournalEntries', () => {
    it('returns entries from production tables when isDemoMode=false', async () => {
      // Create production service instance
      const prodService = new JournalService(false);
      const result = await prodService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.entries)).toBe(true);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);
    });

    it('returns entries from demo tables when isDemoMode=true', async () => {
      // Create demo service instance
      const demoService = new JournalService(true);
      const result = await demoService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('returns same response shape for both modes', async () => {
      const prodService = new JournalService(false);
      const demoService = new JournalService(true);

      const productionResult = await prodService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      const demoResult = await demoService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      // Both should have same structure
      expect(Object.keys(productionResult)).toEqual(Object.keys(demoResult));
      expect(Object.keys(productionResult.pagination)).toEqual(Object.keys(demoResult.pagination));
    });
  });

  describe('getUserFeed', () => {
    it('delegates to getJournalEntries with isDemoMode', async () => {
      // Demo mode is now set via constructor
      const demoService = new JournalService(true);
      const result = await demoService.getUserFeed(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
    });

    it('defaults to production mode when isDemoMode not specified', async () => {
      const result = await journalService.getUserFeed(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
    });
  });
});

// =============================================================================
// RESPONSE SHAPE TESTS
// Uses isolated test user to avoid polluting other tests
// =============================================================================

describe('JournalEntryResponse Shape', () => {
  const SHAPE_TEST_USER_ID = 'test-user-response-shape';
  const SHAPE_TEST_WORKSPACE_ID = 'test-workspace-response-shape';

  // Setup: Create isolated test user and workspace
  beforeAll(async () => {
    // Ensure test user exists
    const existingUser = await prisma.user.findUnique({ where: { id: SHAPE_TEST_USER_ID } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: SHAPE_TEST_USER_ID,
          email: 'test-shape@example.com',
          name: 'Shape Test User',
          password: 'test-hash',
        },
      });
    }

    // Ensure test workspace exists
    const existingWorkspace = await prisma.workspace.findUnique({ where: { id: SHAPE_TEST_WORKSPACE_ID } });
    if (!existingWorkspace) {
      await prisma.workspace.create({
        data: {
          id: SHAPE_TEST_WORKSPACE_ID,
          name: 'Shape Test Workspace',
          isPersonal: true,
          members: {
            create: { userId: SHAPE_TEST_USER_ID, role: 'owner', permissions: {} },
          },
        },
      });
    }
  });

  // Cleanup after all shape tests to avoid polluting other test suites
  afterAll(async () => {
    await prisma.$transaction([
      prisma.careerStory.deleteMany({ where: { userId: SHAPE_TEST_USER_ID } }),
      prisma.journalEntry.deleteMany({ where: { authorId: SHAPE_TEST_USER_ID } }),
      prisma.demoToolActivity.deleteMany({ where: { userId: SHAPE_TEST_USER_ID } }),
    ]);
  });

  it('demo entries have all required fields', async () => {
    // Check if demo data already exists
    const existingEntries = await prisma.journalEntry.findMany({
      where: { authorId: SHAPE_TEST_USER_ID, sourceMode: 'demo' },
      take: 1,
    });

    // Only seed if no data exists
    if (existingEntries.length === 0) {
      const { seedDemoData, configureSeedService } = await import('./career-stories/seed.service');
      configureSeedService({ prisma });

      await seedDemoData(SHAPE_TEST_USER_ID, 'vscode', {
        name: 'Test User',
        currentRole: 'Engineer',
        skills: ['TypeScript'],
        goals: ['ship features'],
      });
    }

    const demoService = new JournalService(true);
    const result = await demoService.getJournalEntries(
      SHAPE_TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    if (result.entries.length > 0) {
      const entry = result.entries[0];

      // Core fields
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('fullContent');
      expect(entry).toHaveProperty('workspaceId');
      expect(entry).toHaveProperty('workspaceName');

      // Author
      expect(entry).toHaveProperty('author');
      expect(entry.author).toHaveProperty('id');
      expect(entry.author).toHaveProperty('name');

      // Arrays
      expect(entry).toHaveProperty('collaborators');
      expect(entry).toHaveProperty('reviewers');
      expect(entry).toHaveProperty('artifacts');
      expect(entry).toHaveProperty('outcomes');
      expect(entry).toHaveProperty('skills');
      expect(entry).toHaveProperty('tags');

      // Counts
      expect(entry).toHaveProperty('likes');
      expect(entry).toHaveProperty('comments');
      expect(entry).toHaveProperty('appreciates');
      expect(entry).toHaveProperty('rechronicles');

      // Interaction status
      expect(entry).toHaveProperty('hasLiked');
      expect(entry).toHaveProperty('hasAppreciated');
      expect(entry).toHaveProperty('hasRechronicled');

      // Analytics
      expect(entry).toHaveProperty('analytics');
      expect(entry.analytics).toHaveProperty('viewCount');
      expect(entry.analytics).toHaveProperty('engagementTrend');

      // Dual-path fields
      expect(entry).toHaveProperty('activityIds');
      expect(entry).toHaveProperty('groupingMethod');
      expect(entry).toHaveProperty('timeRangeStart');
      expect(entry).toHaveProperty('timeRangeEnd');
      expect(entry).toHaveProperty('generatedAt');
    }
  }, 60000); // 60 second timeout for seeding
});

// =============================================================================
// REGRESSION TESTS
// These tests would have caught the original bug where demo and production
// returned different response shapes
// =============================================================================

describe('Regression: Response Shape Consistency', () => {
  it('demo entries have same keys as production entries would have', async () => {
    const demoService = new JournalService(true);
    const demoResult = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    // These are the required fields that caused the original bug
    // (DemoJournalEntryFormatted was missing some of these)
    const requiredFields = [
      'id', 'title', 'description', 'fullContent', 'abstractContent',
      'workspaceId', 'workspaceName', 'organizationName',
      'author', 'collaborators', 'reviewers', 'artifacts', 'outcomes',
      'skills', 'tags', 'category', 'visibility', 'isPublished', 'publishedAt',
      'createdAt', 'updatedAt', 'lastModified',
      'likes', 'comments', 'appreciates', 'rechronicles',
      'hasLiked', 'hasAppreciated', 'hasRechronicled',
      'discussCount', 'discussions', 'analytics',
      'achievementType', 'achievementTitle', 'achievementDescription',
      'linkedGoals', 'format7Data', 'format7DataNetwork', 'generateNetworkEntry',
      'networkContent', 'networkTitle',
      'activityIds', 'groupingMethod', 'timeRangeStart', 'timeRangeEnd', 'generatedAt'
    ];

    if (demoResult.entries.length > 0) {
      const entry = demoResult.entries[0];
      for (const field of requiredFields) {
        expect(entry).toHaveProperty(field);
      }
    }
  });

  it('author object has required shape in demo mode', async () => {
    const demoService = new JournalService(true);
    const result = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    if (result.entries.length > 0) {
      const author = result.entries[0].author;
      expect(author).toHaveProperty('id');
      expect(author).toHaveProperty('name');
      expect(author).toHaveProperty('avatar');
      expect(author).toHaveProperty('position');
      // All should be strings or null, not undefined
      expect(typeof author.id).toBe('string');
      expect(typeof author.name).toBe('string');
    }
  });

  it('analytics object has required shape in demo mode', async () => {
    const demoService = new JournalService(true);
    const result = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    if (result.entries.length > 0) {
      const analytics = result.entries[0].analytics;
      expect(analytics).toHaveProperty('viewCount');
      expect(analytics).toHaveProperty('averageReadTime');
      expect(analytics).toHaveProperty('engagementTrend');
      expect(analytics).toHaveProperty('trendPercentage');
      expect(typeof analytics.viewCount).toBe('number');
      expect(['up', 'down', 'stable']).toContain(analytics.engagementTrend);
    }
  });
});

// =============================================================================
// EDGE CASES AND BOUNDARY CONDITIONS
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty result set gracefully in demo mode', async () => {
    const demoService = new JournalService(true);
    // Use a non-existent user ID
    const result = await demoService.getJournalEntries(
      'non-existent-user-id-12345',
      { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    expect(result.entries).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('handles pagination boundary - page beyond total', async () => {
    const demoService = new JournalService(true);
    const result = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 999, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    // Should return empty entries but valid pagination
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.pagination).toHaveProperty('page', 999);
    expect(result.pagination).toHaveProperty('limit', 10);
  });

  it('handles sortBy fallback for unsupported fields in demo mode', async () => {
    const demoService = new JournalService(true);
    // 'likes', 'comments', 'views' should fall back to 'createdAt'
    const result = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 10, sortBy: 'likes', sortOrder: 'desc' }
    );

    // Should not throw, should return valid result
    expect(result).toHaveProperty('entries');
    expect(result).toHaveProperty('pagination');
  });

  it('handles search filter in demo mode', async () => {
    const demoService = new JournalService(true);
    const result = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', search: 'test-search-term' }
    );

    // Should not throw, should return valid result (possibly empty)
    expect(result).toHaveProperty('entries');
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it('handles limit=0 gracefully', async () => {
    const demoService = new JournalService(true);
    const result = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 0, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    // Should return empty entries with valid pagination
    expect(result.entries).toEqual([]);
    expect(result.pagination.limit).toBe(0);
  });
});

// =============================================================================
// DATA ISOLATION TESTS
// =============================================================================

describe('Unified Data Access', () => {
  it('demo mode and production mode return same entries (unified table)', async () => {
    const demoService = new JournalService(true);
    const prodService = new JournalService(false);

    // Get entries via demo service
    const demoResult = await demoService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    // Get entries via production service
    const prodResult = await prodService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    // Both should return the same entries (no sourceMode filtering)
    const demoIds = demoResult.entries.map(e => e.id).sort();
    const prodIds = prodResult.entries.map(e => e.id).sort();

    expect(demoIds).toEqual(prodIds);
    expect(demoResult.entries.length).toBe(prodResult.entries.length);
  });
});

// =============================================================================
// DELETE JOURNAL ENTRY TESTS
// =============================================================================

describe('deleteJournalEntry', () => {
  describe('demo mode', () => {
    const demoService = new JournalService(true);

    it('deletes entry from unified JournalEntry table when isDemoMode=true', async () => {
      // First ensure we have a workspace for the test user
      let workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId: TEST_USER_ID } } },
      });

      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: 'Test Workspace',
            members: {
              create: {
                userId: TEST_USER_ID,
                role: 'owner',
              },
            },
          },
        });
      }

      // Create a demo entry to delete using unified JournalEntry table with sourceMode: 'demo'
      const demoEntry = await prisma.journalEntry.create({
        data: {
          authorId: TEST_USER_ID,
          workspaceId: workspace.id,
          title: 'Test Entry to Delete',
          description: 'This entry will be deleted',
          fullContent: 'Full content here',
          sourceMode: 'demo',
        },
      });

      // Delete it
      await demoService.deleteJournalEntry(demoEntry.id, TEST_USER_ID);

      // Verify it's gone
      const deletedEntry = await prisma.journalEntry.findUnique({
        where: { id: demoEntry.id },
      });
      expect(deletedEntry).toBeNull();
    });

    it('throws "Journal entry not found" for non-existent entry', async () => {
      await expect(
        demoService.deleteJournalEntry('non-existent-id-12345', TEST_USER_ID)
      ).rejects.toThrow('Journal entry not found');
    });

    it('throws "Access denied" when user does not own the entry', async () => {
      // First ensure we have a workspace for the test user
      let workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId: TEST_USER_ID } } },
      });

      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: 'Test Workspace',
            members: {
              create: {
                userId: TEST_USER_ID,
                role: 'owner',
              },
            },
          },
        });
      }

      // Create entry owned by test user using unified JournalEntry table
      const demoEntry = await prisma.journalEntry.create({
        data: {
          authorId: TEST_USER_ID,
          workspaceId: workspace.id,
          title: 'Entry owned by test user',
          description: 'Another user will try to delete this',
          fullContent: 'Content',
          sourceMode: 'demo',
        },
      });

      // Try to delete as different user
      await expect(
        demoService.deleteJournalEntry(demoEntry.id, 'different-user-id')
      ).rejects.toThrow('Access denied: You can only delete your own entries');

      // Cleanup
      await prisma.journalEntry.delete({ where: { id: demoEntry.id } });
    });
  });

  describe('production mode', () => {
    const prodService = new JournalService(false);

    it('throws "Journal entry not found" for non-existent entry', async () => {
      await expect(
        prodService.deleteJournalEntry('non-existent-prod-id', TEST_USER_ID)
      ).rejects.toThrow('Journal entry not found');
    });
  });
});

// =============================================================================
// GET JOURNAL ENTRY BY ID TESTS
// =============================================================================

describe('getJournalEntryById', () => {
  describe('demo mode', () => {
    const demoService = new JournalService(true);

    it('fetches entry from unified JournalEntry table when isDemoMode=true', async () => {
      // First ensure there's a demo entry in the unified table
      const existingEntries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'demo' },
        take: 1,
      });

      if (existingEntries.length > 0) {
        const entry = await demoService.getJournalEntryById(
          existingEntries[0].id,
          TEST_USER_ID
        );

        expect(entry).toHaveProperty('id', existingEntries[0].id);
        expect(entry).toHaveProperty('title');
        expect(entry).toHaveProperty('author');
      }
    });

    it('throws "Journal entry not found" for non-existent demo entry', async () => {
      await expect(
        demoService.getJournalEntryById('non-existent-demo-id', TEST_USER_ID)
      ).rejects.toThrow('Journal entry not found');
    });

    it('transforms demo entry to response format with all required fields', async () => {
      // First ensure we have a workspace for the test user
      let workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId: TEST_USER_ID } } },
      });

      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: 'Test Workspace',
            members: {
              create: {
                userId: TEST_USER_ID,
                role: 'owner',
              },
            },
          },
        });
      }

      // Create a demo entry using unified JournalEntry table
      const demoEntry = await prisma.journalEntry.create({
        data: {
          authorId: TEST_USER_ID,
          workspaceId: workspace.id,
          title: 'Test Entry for getById',
          description: 'Testing getJournalEntryById',
          fullContent: 'Full content for testing',
          groupingMethod: 'time',
          sourceMode: 'demo',
        },
      });

      try {
        const entry = await demoService.getJournalEntryById(demoEntry.id, TEST_USER_ID);

        // Verify response shape
        expect(entry).toHaveProperty('id', demoEntry.id);
        expect(entry).toHaveProperty('title', demoEntry.title);
        expect(entry).toHaveProperty('description', demoEntry.description);
        expect(entry).toHaveProperty('author');
        expect(entry.author).toHaveProperty('id');
        expect(entry.author).toHaveProperty('name');
        expect(entry).toHaveProperty('groupingMethod', 'time');
      } finally {
        // Cleanup
        await prisma.journalEntry.delete({ where: { id: demoEntry.id } });
      }
    });
  });

  describe('production mode', () => {
    const prodService = new JournalService(false);

    it('throws "Journal entry not found" for non-existent production entry', async () => {
      await expect(
        prodService.getJournalEntryById('non-existent-prod-id', TEST_USER_ID)
      ).rejects.toThrow('Journal entry not found');
    });
  });
});

// =============================================================================
// GET ENTRY COMMENTS TESTS
// =============================================================================

describe('getEntryComments', () => {
  describe('demo mode', () => {
    const demoService = new JournalService(true);

    it('returns empty array in demo mode', async () => {
      const comments = await demoService.getEntryComments('any-entry-id');
      expect(comments).toEqual([]);
    });

    it('does not throw for any entry ID in demo mode', async () => {
      // In demo mode, we don't validate entry existence for comments
      // Just return empty array
      await expect(
        demoService.getEntryComments('completely-fake-id')
      ).resolves.toEqual([]);
    });
  });

  describe('production mode', () => {
    const prodService = new JournalService(false);

    it('throws "Journal entry not found" for non-existent entry', async () => {
      await expect(
        prodService.getEntryComments('non-existent-prod-entry')
      ).rejects.toThrow('Journal entry not found');
    });
  });
});

// =============================================================================
// ACTIVITY EDGE VALIDATION TESTS
// =============================================================================

describe('validateEdgeType', () => {
  it('returns valid edge types unchanged', () => {
    expect(validateEdgeType('primary')).toBe('primary');
    expect(validateEdgeType('supporting')).toBe('supporting');
    expect(validateEdgeType('contextual')).toBe('contextual');
    expect(validateEdgeType('outcome')).toBe('outcome');
  });

  it('defaults to primary for invalid types', () => {
    expect(validateEdgeType('invalid')).toBe('primary');
    expect(validateEdgeType('')).toBe('primary');
    expect(validateEdgeType(null)).toBe('primary');
    expect(validateEdgeType(undefined)).toBe('primary');
    expect(validateEdgeType(123)).toBe('primary');
    expect(validateEdgeType({})).toBe('primary');
  });
});

describe('validateEdgeMessage', () => {
  it('returns valid messages unchanged', () => {
    expect(validateEdgeMessage('Core implementation work')).toBe('Core implementation work');
    expect(validateEdgeMessage('A')).toBe('A');
  });

  it('truncates messages over 200 characters', () => {
    const longMessage = 'x'.repeat(250);
    const result = validateEdgeMessage(longMessage);
    expect(result.length).toBe(200);
  });

  it('returns default message for invalid inputs', () => {
    expect(validateEdgeMessage('')).toBe('Activity included in this story');
    expect(validateEdgeMessage('   ')).toBe('Activity included in this story');
    expect(validateEdgeMessage(null)).toBe('Activity included in this story');
    expect(validateEdgeMessage(undefined)).toBe('Activity included in this story');
    expect(validateEdgeMessage(123)).toBe('Activity included in this story');
  });
});

describe('validateActivityEdges', () => {
  const activityIds = ['act-1', 'act-2', 'act-3'];

  it('returns default edges for empty array', () => {
    const result = validateActivityEdges([], activityIds);
    expect(result).toHaveLength(3);
    expect(result.every(e => e.type === 'primary')).toBe(true);
    expect(result.every(e => e.message === 'Activity included in this story')).toBe(true);
  });

  it('returns default edges for null/undefined', () => {
    expect(validateActivityEdges(null, activityIds)).toHaveLength(3);
    expect(validateActivityEdges(undefined, activityIds)).toHaveLength(3);
  });

  it('validates and returns well-formed edges', () => {
    const edges = [
      { activityId: 'act-1', type: 'primary', message: 'Core work' },
      { activityId: 'act-2', type: 'supporting', message: 'Review work' },
    ];
    const result = validateActivityEdges(edges, activityIds);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ activityId: 'act-1', type: 'primary', message: 'Core work' });
    expect(result[1]).toEqual({ activityId: 'act-2', type: 'supporting', message: 'Review work' });
  });

  it('filters out edges with invalid activity IDs', () => {
    const edges = [
      { activityId: 'act-1', type: 'primary', message: 'Valid' },
      { activityId: 'invalid-id', type: 'primary', message: 'Invalid' },
    ];
    const result = validateActivityEdges(edges, activityIds);

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('act-1');
  });

  it('defaults invalid edge types to primary', () => {
    const edges = [
      { activityId: 'act-1', type: 'invalid-type', message: 'Test' },
    ];
    const result = validateActivityEdges(edges, activityIds);

    expect(result[0].type).toBe('primary');
  });

  it('defaults missing messages', () => {
    const edges = [
      { activityId: 'act-1', type: 'primary' },
    ];
    const result = validateActivityEdges(edges, activityIds);

    expect(result[0].message).toBe('Activity included in this story');
  });

  it('filters out malformed edge objects', () => {
    const edges = [
      { activityId: 'act-1', type: 'primary', message: 'Valid' },
      null,
      'not an object',
      123,
      { noActivityId: true },
    ];
    const result = validateActivityEdges(edges, activityIds);

    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe('act-1');
  });
});

// =============================================================================
// CLEAR ALL BY SOURCE MODE TESTS (Transactional Deletion)
// =============================================================================

describe('clearAllBySourceMode', () => {
  const CLEAR_TEST_USER_ID = 'test-user-clear-demo-data';
  let testWorkspaceId: string;

  // Helper to create minimal journal entry data
  const makeEntry = (title: string, sourceMode: 'demo' | 'production') => ({
    authorId: CLEAR_TEST_USER_ID,
    workspaceId: testWorkspaceId,
    title,
    description: 'Test entry',
    fullContent: 'Test content',
    sourceMode,
  });

  // Helper to create minimal activity data
  const makeActivity = (source: string, sourceId: string, title: string) => ({
    userId: CLEAR_TEST_USER_ID,
    source,
    sourceId,
    title,
    timestamp: new Date(),
  });

  // Setup: Create isolated test user and workspace
  beforeAll(async () => {
    const existingUser = await prisma.user.findUnique({
      where: { id: CLEAR_TEST_USER_ID },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: CLEAR_TEST_USER_ID,
          email: 'test-clear-demo@example.com',
          name: 'Clear Demo Test User',
          password: 'test-hash',
        },
      });
    }

    // Create or find workspace
    let workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId: CLEAR_TEST_USER_ID } } },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Clear Test Workspace',
          members: {
            create: { userId: CLEAR_TEST_USER_ID, role: 'owner' },
          },
        },
      });
    }
    testWorkspaceId = workspace.id;
  });

  // Cleanup after each test
  afterEach(async () => {
    await prisma.$transaction([
      prisma.journalEntry.deleteMany({ where: { authorId: CLEAR_TEST_USER_ID } }),
      prisma.demoToolActivity.deleteMany({ where: { userId: CLEAR_TEST_USER_ID } }),
    ]);
  });

  describe('demo mode', () => {
    const demoService = new JournalService(true);

    it('deletes journal entries and activities in a single transaction', async () => {
      // Create demo entries
      await prisma.journalEntry.createMany({
        data: [
          makeEntry('Entry 1', 'demo'),
          makeEntry('Entry 2', 'demo'),
        ],
      });

      // Create demo activities
      await prisma.demoToolActivity.createMany({
        data: [
          makeActivity('github', 'gh-1', 'PR #1'),
          makeActivity('jira', 'jira-1', 'TASK-1'),
          makeActivity('slack', 'slack-1', 'Message'),
        ],
      });

      // Verify data exists
      const entriesBefore = await prisma.journalEntry.count({ where: { authorId: CLEAR_TEST_USER_ID, sourceMode: 'demo' } });
      const activitiesBefore = await prisma.demoToolActivity.count({ where: { userId: CLEAR_TEST_USER_ID } });
      expect(entriesBefore).toBe(2);
      expect(activitiesBefore).toBe(3);

      // Clear demo data
      const result = await demoService.clearAllBySourceMode(CLEAR_TEST_USER_ID);

      // Verify counts returned
      expect(result.deletedEntries).toBe(2);
      expect(result.deletedActivities).toBe(3);

      // Verify data is gone
      const entriesAfter = await prisma.journalEntry.count({ where: { authorId: CLEAR_TEST_USER_ID, sourceMode: 'demo' } });
      const activitiesAfter = await prisma.demoToolActivity.count({ where: { userId: CLEAR_TEST_USER_ID } });
      expect(entriesAfter).toBe(0);
      expect(activitiesAfter).toBe(0);
    });

    it('returns zero counts when no data exists', async () => {
      const result = await demoService.clearAllBySourceMode(CLEAR_TEST_USER_ID);

      expect(result.deletedEntries).toBe(0);
      expect(result.deletedActivities).toBe(0);
    });

    it('only deletes demo entries, not production entries', async () => {
      // Create both demo and production entries
      await prisma.journalEntry.createMany({
        data: [
          makeEntry('Demo Entry', 'demo'),
          makeEntry('Prod Entry', 'production'),
        ],
      });

      // Clear demo data
      const result = await demoService.clearAllBySourceMode(CLEAR_TEST_USER_ID);

      expect(result.deletedEntries).toBe(1);

      // Production entry should still exist
      const prodEntry = await prisma.journalEntry.findFirst({
        where: { authorId: CLEAR_TEST_USER_ID, sourceMode: 'production' },
      });
      expect(prodEntry).not.toBeNull();
      expect(prodEntry?.title).toBe('Prod Entry');
    });

    it('only deletes data for the specified user', async () => {
      const OTHER_USER_ID = 'test-user-clear-other';

      // Ensure other user exists
      const existingOther = await prisma.user.findUnique({ where: { id: OTHER_USER_ID } });
      if (!existingOther) {
        await prisma.user.create({
          data: {
            id: OTHER_USER_ID,
            email: 'other-user@example.com',
            name: 'Other User',
            password: 'hash',
          },
        });
      }

      // Create activities for both users
      await prisma.demoToolActivity.createMany({
        data: [
          makeActivity('github', 'gh-1', 'User 1 PR'),
          { userId: OTHER_USER_ID, source: 'github', sourceId: 'gh-2', title: 'User 2 PR', timestamp: new Date() },
        ],
      });

      // Clear only CLEAR_TEST_USER_ID's data
      const result = await demoService.clearAllBySourceMode(CLEAR_TEST_USER_ID);

      expect(result.deletedActivities).toBe(1);

      // Other user's data should still exist
      const otherActivities = await prisma.demoToolActivity.count({ where: { userId: OTHER_USER_ID } });
      expect(otherActivities).toBe(1);

      // Cleanup
      await prisma.demoToolActivity.deleteMany({ where: { userId: OTHER_USER_ID } });
    });
  });

  describe('production mode', () => {
    const prodService = new JournalService(false);

    it('throws error when called in production mode', async () => {
      await expect(
        prodService.clearAllBySourceMode(CLEAR_TEST_USER_ID)
      ).rejects.toThrow('clearAllBySourceMode can only be called in demo mode');
    });
  });
});
