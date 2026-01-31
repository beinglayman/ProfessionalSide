/**
 * Journal Service Tests
 *
 * Tests for the unified JournalService that handles both demo and production modes.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { JournalService } from './journal.service';

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
      const result = await journalService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        false // production mode
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.entries)).toBe(true);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);
    });

    it('returns entries from demo tables when isDemoMode=true', async () => {
      const result = await journalService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        true // demo mode
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('returns same response shape for both modes', async () => {
      const productionResult = await journalService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        false
      );

      const demoResult = await journalService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        true
      );

      // Both should have same structure
      expect(Object.keys(productionResult)).toEqual(Object.keys(demoResult));
      expect(Object.keys(productionResult.pagination)).toEqual(Object.keys(demoResult.pagination));
    });
  });

  describe('getUserFeed', () => {
    it('delegates to getJournalEntries with isDemoMode', async () => {
      const result = await journalService.getUserFeed(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        true // demo mode
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
    });

    it('defaults to production mode when isDemoMode not specified', async () => {
      const result = await journalService.getUserFeed(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
        // no isDemoMode param - should default to false
      );

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('pagination');
    });
  });
});

// =============================================================================
// RESPONSE SHAPE TESTS
// =============================================================================

describe('JournalEntryResponse Shape', () => {
  it('demo entries have all required fields', async () => {
    // Check if demo data already exists (from previous test runs)
    const existingEntries = await prisma.demoJournalEntry.findMany({
      where: { userId: TEST_USER_ID },
      take: 1,
    });

    // Only seed if no data exists
    if (existingEntries.length === 0) {
      const { seedDemoData, configureDemoService } = await import('./career-stories/demo.service');
      configureDemoService({ prisma });

      await seedDemoData(TEST_USER_ID, 'vscode', {
        name: 'Test User',
        currentRole: 'Engineer',
        skills: ['TypeScript'],
        goals: ['ship features'],
      });
    }

    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' },
      true
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
    const demoResult = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' },
      true
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
    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' },
      true
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
    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' },
      true
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
    // Use a non-existent user ID
    const result = await journalService.getJournalEntries(
      'non-existent-user-id-12345',
      { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      true
    );

    expect(result.entries).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('handles pagination boundary - page beyond total', async () => {
    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 999, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      true
    );

    // Should return empty entries but valid pagination
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.pagination).toHaveProperty('page', 999);
    expect(result.pagination).toHaveProperty('limit', 10);
  });

  it('handles sortBy fallback for unsupported fields in demo mode', async () => {
    // 'likes', 'comments', 'views' should fall back to 'createdAt'
    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 10, sortBy: 'likes', sortOrder: 'desc' },
      true
    );

    // Should not throw, should return valid result
    expect(result).toHaveProperty('entries');
    expect(result).toHaveProperty('pagination');
  });

  it('handles search filter in demo mode', async () => {
    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', search: 'test-search-term' },
      true
    );

    // Should not throw, should return valid result (possibly empty)
    expect(result).toHaveProperty('entries');
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it('handles limit=0 gracefully', async () => {
    const result = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 0, sortBy: 'createdAt', sortOrder: 'desc' },
      true
    );

    // Should return empty entries with valid pagination
    expect(result.entries).toEqual([]);
    expect(result.pagination.limit).toBe(0);
  });
});

// =============================================================================
// DATA ISOLATION TESTS
// =============================================================================

describe('Data Isolation', () => {
  it('demo mode does not return production entries', async () => {
    // Get demo entries
    const demoResult = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      true
    );

    // Get production entries
    const prodResult = await journalService.getJournalEntries(
      TEST_USER_ID,
      { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      false
    );

    // Entry IDs should not overlap
    const demoIds = new Set(demoResult.entries.map(e => e.id));
    const prodIds = new Set(prodResult.entries.map(e => e.id));

    const overlap = [...demoIds].filter(id => prodIds.has(id));
    expect(overlap).toHaveLength(0);
  });
});
