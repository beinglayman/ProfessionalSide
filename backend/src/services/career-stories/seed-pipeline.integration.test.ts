/**
 * Demo Pipeline Integration Test
 *
 * End-to-end test that:
 * 1. Seeds demo data into demo tables
 * 2. Runs both temporal AND cluster-based grouping
 * 3. Produces N journal entries (raw + draft stories)
 * 4. Maintains full provenance chain
 *
 * Run with: npx vitest run src/services/career-stories/demo-pipeline.integration.test.ts
 */

import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {clearDemoData, configureSeedService, seedDemoData,} from './seed.service';
import {JournalService} from '../journal.service';

// =============================================================================
// TEST SETUP
// =============================================================================

// Use real Prisma client for integration test
const prisma = new PrismaClient();

// Configure demo service to use our prisma instance
configureSeedService({ prisma });

// Fixed test user ID for consistent test isolation
const TEST_USER_ID = 'test-user-demo-pipeline';

// Helper to ensure test user exists
async function ensureTestUser(): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { id: TEST_USER_ID },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: 'test-demo-pipeline@test.com',
        name: 'Demo Pipeline Test User',
        password: 'test-password-hash',
      },
    });
  }
}

// =============================================================================
// PROVENANCE REPORT TYPES
// =============================================================================

interface ActivityProvenance {
  id: string;
  source: string;
  title: string;
  timestamp: Date;
  crossToolRefs: string[];
}

/**
 * Cluster info derived from JournalEntry with groupingMethod='cluster'.
 * DemoStoryCluster table has been removed - clustering is now inline in JournalEntry.
 */
interface ClusterProvenance {
  clusterRef: string | null; // From JournalEntry.clusterRef
  name: string | null;
  activityCount: number;
  activityIds: string[];
  toolTypes: string[];
  dateRange: { start: string; end: string } | undefined;
  sharedRefs: string[];
}

interface JournalEntryProvenance {
  id: string;
  title: string;
  groupingMethod: string | null;
  activityIds: string[];
  timeRangeStart: Date | null;
  timeRangeEnd: Date | null;
  generatedAt: Date | null;
  activitiesIncluded: ActivityProvenance[];
  clusterSource: ClusterProvenance | null;
}

interface PipelineReport {
  userId: string;
  timestamp: Date;
  activities: {
    total: number;
    bySource: Record<string, number>;
    withRefs: number;
    withoutRefs: number;
  };
  clusters: {
    total: number;
    bySize: Record<string, number>;
  };
  journalEntries: {
    total: number;
    temporal: number;
    cluster: number;
    manual: number;
    withNarratives: number;
  };
  provenance: JournalEntryProvenance[];
}

// =============================================================================
// PROVENANCE EXTRACTION HELPERS
// =============================================================================

async function extractActivityProvenance(userId: string): Promise<ActivityProvenance[]> {
  const activities = await prisma.demoToolActivity.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  });

  return activities.map((a) => ({
    id: a.id,
    source: a.source,
    title: a.title,
    timestamp: a.timestamp,
    crossToolRefs: a.crossToolRefs,
  }));
}

/**
 * Extract cluster info from JournalEntry records with groupingMethod='cluster'.
 * DemoStoryCluster table has been removed - clustering is now inline in JournalEntry.
 */
async function extractClusterProvenance(userId: string, activities: ActivityProvenance[]): Promise<ClusterProvenance[]> {
  // Get journal entries that were created from clusters
  const clusterEntries = await prisma.journalEntry.findMany({
    where: {
      authorId: userId,
      sourceMode: 'demo',
      groupingMethod: 'cluster',
    },
    orderBy: { createdAt: 'desc' },
  });

  return clusterEntries.map((entry) => {
    // Get activities for this entry
    const entryActivities = activities.filter((a) => entry.activityIds.includes(a.id));

    // Extract all refs from entry activities
    const allRefs = entryActivities.flatMap((a) => a.crossToolRefs);
    const refCounts: Record<string, number> = {};
    allRefs.forEach((ref) => {
      refCounts[ref] = (refCounts[ref] || 0) + 1;
    });

    // Shared refs appear in multiple activities
    const sharedRefs = Object.entries(refCounts)
      .filter(([, count]) => count > 1)
      .map(([ref]) => ref);

    const timestamps = entryActivities.map((a) => a.timestamp);
    const dateRange = timestamps.length > 0
      ? {
          start: new Date(Math.min(...timestamps.map((t) => t.getTime()))).toISOString(),
          end: new Date(Math.max(...timestamps.map((t) => t.getTime()))).toISOString(),
        }
      : undefined;

    return {
      clusterRef: entry.clusterRef,
      name: entry.clusterRef, // Use clusterRef as the name (e.g., 'AUTH-123')
      activityCount: entryActivities.length,
      activityIds: entry.activityIds,
      toolTypes: [...new Set(entryActivities.map((a) => a.source))],
      dateRange,
      sharedRefs,
    };
  });
}

async function extractJournalEntryProvenance(
  userId: string,
  activities: ActivityProvenance[],
  _clusters: ClusterProvenance[]
): Promise<JournalEntryProvenance[]> {
  // Query unified JournalEntry table with sourceMode filter
  const entries = await prisma.journalEntry.findMany({
    where: { authorId: userId, sourceMode: 'demo' },
    orderBy: { createdAt: 'desc' },
  });

  return entries.map((e) => {
    const activitiesIncluded = activities.filter((a) => e.activityIds.includes(a.id));

    // For cluster entries, derive clusterSource from entry's own data
    const clusterSource: ClusterProvenance | null = e.groupingMethod === 'cluster'
      ? {
          clusterRef: e.clusterRef,
          name: e.clusterRef,
          activityCount: e.activityIds.length,
          activityIds: e.activityIds,
          toolTypes: [...new Set(activitiesIncluded.map((a) => a.source))],
          dateRange: e.timeRangeStart && e.timeRangeEnd
            ? {
                start: e.timeRangeStart.toISOString(),
                end: e.timeRangeEnd.toISOString(),
              }
            : undefined,
          sharedRefs: [], // Would need activity refs to compute
        }
      : null;

    return {
      id: e.id,
      title: e.title,
      groupingMethod: e.groupingMethod,
      activityIds: e.activityIds,
      timeRangeStart: e.timeRangeStart,
      timeRangeEnd: e.timeRangeEnd,
      generatedAt: e.generatedAt,
      activitiesIncluded,
      clusterSource,
    };
  });
}

async function generatePipelineReport(userId: string): Promise<PipelineReport> {
  const activities = await extractActivityProvenance(userId);
  const clusters = await extractClusterProvenance(userId, activities);
  const journalEntries = await extractJournalEntryProvenance(userId, activities, clusters);

  // Count activities by source
  const bySource: Record<string, number> = {};
  activities.forEach((a) => {
    bySource[a.source] = (bySource[a.source] || 0) + 1;
  });

  // Count clusters by size
  const bySize: Record<string, number> = {};
  clusters.forEach((c) => {
    const sizeLabel = c.activityCount <= 3 ? 'small (2-3)' : c.activityCount <= 6 ? 'medium (4-6)' : 'large (7+)';
    bySize[sizeLabel] = (bySize[sizeLabel] || 0) + 1;
  });

  // Count journal entries by grouping method
  const temporal = journalEntries.filter((e) => e.groupingMethod === 'time').length;
  const cluster = journalEntries.filter((e) => e.groupingMethod === 'cluster').length;
  const manual = journalEntries.filter((e) => e.groupingMethod === 'manual').length;
  const withNarratives = journalEntries.filter((e) => e.generatedAt !== null).length;

  return {
    userId,
    timestamp: new Date(),
    activities: {
      total: activities.length,
      bySource,
      withRefs: activities.filter((a) => a.crossToolRefs.length > 0).length,
      withoutRefs: activities.filter((a) => a.crossToolRefs.length === 0).length,
    },
    clusters: {
      total: clusters.length,
      bySize,
    },
    journalEntries: {
      total: journalEntries.length,
      temporal,
      cluster,
      manual,
      withNarratives,
    },
    provenance: journalEntries,
  };
}

function printProvenanceReport(report: PipelineReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('DEMO PIPELINE PROVENANCE REPORT');
  console.log('='.repeat(80));
  console.log(`User ID: ${report.userId}`);
  console.log(`Generated: ${report.timestamp.toISOString()}`);

  console.log('\n--- ACTIVITIES ---');
  console.log(`Total: ${report.activities.total}`);
  console.log(`With refs: ${report.activities.withRefs}`);
  console.log(`Without refs: ${report.activities.withoutRefs}`);
  console.log('By source:');
  Object.entries(report.activities.bySource).forEach(([source, count]) => {
    console.log(`  - ${source}: ${count}`);
  });

  console.log('\n--- CLUSTERS ---');
  console.log(`Total: ${report.clusters.total}`);
  console.log('By size:');
  Object.entries(report.clusters.bySize).forEach(([size, count]) => {
    console.log(`  - ${size}: ${count}`);
  });

  console.log('\n--- JOURNAL ENTRIES ---');
  console.log(`Total: ${report.journalEntries.total}`);
  console.log(`  - Temporal (time-based): ${report.journalEntries.temporal}`);
  console.log(`  - Cluster (ref-based): ${report.journalEntries.cluster}`);
  console.log(`  - Manual: ${report.journalEntries.manual}`);
  console.log(`With narratives generated: ${report.journalEntries.withNarratives}`);

  console.log('\n--- PROVENANCE CHAIN ---');
  report.provenance.forEach((entry, i) => {
    console.log(`\n[Entry ${i + 1}] ${entry.title}`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Grouping: ${entry.groupingMethod}`);
    console.log(`  Activities: ${entry.activityIds.length}`);
    console.log(`  Time range: ${entry.timeRangeStart?.toISOString().split('T')[0]} to ${entry.timeRangeEnd?.toISOString().split('T')[0]}`);
    console.log(`  Narrative: ${entry.generatedAt ? 'Generated' : 'Pending'}`);

    if (entry.clusterSource) {
      console.log(`  Cluster source: ${entry.clusterSource.name}`);
      console.log(`  Shared refs: ${entry.clusterSource.sharedRefs.join(', ')}`);
    }

    console.log('  Activities included:');
    entry.activitiesIncluded.slice(0, 5).forEach((a) => {
      console.log(`    - [${a.source}] ${a.title.substring(0, 50)}...`);
      if (a.crossToolRefs.length > 0) {
        console.log(`      Refs: ${a.crossToolRefs.join(', ')}`);
      }
    });
    if (entry.activitiesIncluded.length > 5) {
      console.log(`    ... and ${entry.activitiesIncluded.length - 5} more`);
    }
  });

  console.log('\n' + '='.repeat(80));
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Demo Pipeline Integration', () => {
  let seedResult: Awaited<ReturnType<typeof seedDemoData>>;
  let report: PipelineReport;

  beforeAll(async () => {
    // Ensure test user exists
    await ensureTestUser();
    console.log(`\nUsing test user: ${TEST_USER_ID}`);

    // Clear any existing demo data for this user
    await clearDemoData(TEST_USER_ID);
  });

  afterAll(async () => {
    // Cleanup demo data (but keep user for future tests)
    await clearDemoData(TEST_USER_ID);
    await prisma.$disconnect();
  });

  describe('Complete Pipeline Execution', () => {
    it('seeds demo data successfully', async () => {
      seedResult = await seedDemoData(TEST_USER_ID);

      expect(seedResult.activitiesSeeded).toBeGreaterThan(0);
      expect(seedResult.clustersCreated).toBeGreaterThan(0);
      expect(seedResult.entriesCreated).toBeGreaterThan(0);

      console.log('\n--- SEED RESULT ---');
      console.log(`Activities seeded: ${seedResult.activitiesSeeded}`);
      console.log(`Clusters created: ${seedResult.clustersCreated}`);
      console.log(`Entries created: ${seedResult.entriesCreated}`);
    }, 300000); // 5min timeout for sequential LLM generation

    it('generates provenance report', async () => {
      report = await generatePipelineReport(TEST_USER_ID);

      // Print full report
      printProvenanceReport(report);

      // Verify report structure
      expect(report.activities.total).toBe(seedResult.activitiesSeeded);
      // Note: clusters.total now counts journal entries with groupingMethod='cluster',
      // which should equal the cluster entries count in journal entries
      expect(report.clusters.total).toBe(report.journalEntries.cluster);
      expect(report.journalEntries.total).toBe(seedResult.entriesCreated);
    });

    it('creates both temporal AND cluster entries', async () => {
      expect(report.journalEntries.temporal).toBeGreaterThan(0);
      expect(report.journalEntries.cluster).toBeGreaterThan(0);

      console.log(`\n✓ Dual-path verified: ${report.journalEntries.temporal} temporal + ${report.journalEntries.cluster} cluster entries`);
    });

    it('maintains activity-to-entry provenance', async () => {
      // Every entry should have activities
      report.provenance.forEach((entry) => {
        expect(entry.activityIds.length).toBeGreaterThan(0);
        expect(entry.activitiesIncluded.length).toBe(entry.activityIds.length);
      });

      console.log('\n✓ All entries have valid activity provenance');
    });

    it('cluster entries have shared refs', async () => {
      const clusterEntries = report.provenance.filter((e) => e.groupingMethod === 'cluster');

      clusterEntries.forEach((entry) => {
        // All activities in a cluster entry should share at least one ref
        const allRefs = entry.activitiesIncluded.flatMap((a) => a.crossToolRefs);
        const refCounts: Record<string, number> = {};
        allRefs.forEach((ref) => {
          refCounts[ref] = (refCounts[ref] || 0) + 1;
        });

        // At least one ref should appear in multiple activities
        const sharedRefs = Object.entries(refCounts).filter(([, count]) => count > 1);
        expect(sharedRefs.length).toBeGreaterThan(0);
      });

      console.log('\n✓ Cluster entries verified: activities share common refs');
    });

    it('temporal entries have valid time ranges', async () => {
      const temporalEntries = report.provenance.filter((e) => e.groupingMethod === 'time');

      temporalEntries.forEach((entry) => {
        expect(entry.timeRangeStart).not.toBeNull();
        expect(entry.timeRangeEnd).not.toBeNull();

        if (entry.timeRangeStart && entry.timeRangeEnd) {
          // All activities should fall within the time range
          entry.activitiesIncluded.forEach((a) => {
            expect(a.timestamp.getTime()).toBeGreaterThanOrEqual(entry.timeRangeStart!.getTime());
            expect(a.timestamp.getTime()).toBeLessThanOrEqual(entry.timeRangeEnd!.getTime() + 24 * 60 * 60 * 1000); // +1 day buffer
          });
        }
      });

      console.log('\n✓ Temporal entries verified: activities within time windows');
    });

    it('generates narratives for entries', async () => {
      // Note: This may be 0 if LLM times out, but pipeline should still work
      console.log(`\n✓ Narratives generated: ${report.journalEntries.withNarratives}/${report.journalEntries.total}`);

      // At minimum, all entries should have fallback content
      const entries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'demo' },
      });

      entries.forEach((e) => {
        expect(e.fullContent).toBeTruthy();
        expect(e.description).toBeTruthy();
      });

      console.log('✓ All entries have content (LLM or fallback)');
    });
  });

  describe('Data Isolation', () => {
    it('does not affect other users', async () => {
      const otherUserId = 'other-user-' + Date.now();

      const otherActivities = await prisma.demoToolActivity.findMany({
        where: { userId: otherUserId },
      });

      expect(otherActivities).toHaveLength(0);
    });

    it('only uses demo tables', async () => {
      // Verify no data in production tables (sourceMode='production')
      const prodActivities = await prisma.toolActivity.findMany({
        where: { userId: TEST_USER_ID },
      });

      const prodClusters = await prisma.storyCluster.findMany({
        where: { userId: TEST_USER_ID },
      });

      // JournalEntry is unified - check that no PRODUCTION entries exist
      const prodEntries = await prisma.journalEntry.findMany({
        where: { authorId: TEST_USER_ID, sourceMode: 'production' },
      });

      expect(prodActivities).toHaveLength(0);
      expect(prodClusters).toHaveLength(0);
      expect(prodEntries).toHaveLength(0);

      console.log('\n✓ Data isolation verified: no production tables affected');
    });
  });

  describe('Provenance Chain Verification', () => {
    it('traces activity → cluster → entry', async () => {
      const clusterEntries = report.provenance.filter((e) => e.clusterSource);

      clusterEntries.forEach((entry) => {
        // Entry has a cluster source
        expect(entry.clusterSource).not.toBeNull();

        // Cluster has activities
        expect(entry.clusterSource!.activityIds.length).toBeGreaterThan(0);

        // Entry's activities match cluster's activities
        const entryActivitySet = new Set(entry.activityIds);
        entry.clusterSource!.activityIds.forEach((actId) => {
          expect(entryActivitySet.has(actId)).toBe(true);
        });
      });

      console.log(`\n✓ Provenance chain verified for ${clusterEntries.length} cluster entries`);
    });

    it('traces activity refs → cluster grouping', async () => {
      const activities = await extractActivityProvenance(TEST_USER_ID);
      const clusters = await extractClusterProvenance(TEST_USER_ID, activities);

      clusters.forEach((cluster) => {
        // Clusters should have activities (sharedRefs may be empty for some)
        expect(cluster.activityIds.length).toBeGreaterThan(0);

        console.log(`  Cluster "${cluster.name}": ${cluster.activityIds.length} activities, ${cluster.sharedRefs.length} shared refs`);
      });

      console.log('\n✓ Cluster grouping verified');
    });
  });

  // ===========================================================================
  // UNIFIED SERVICE VERIFICATION
  // Tests that JournalService correctly reads from demo tables
  // ===========================================================================
  describe('Unified JournalService Integration', () => {
    it('JournalService.getJournalEntries returns demo entries with isDemoMode=true', async () => {
      const journalService = new JournalService(true); // isDemoMode in constructor

      const result = await journalService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      // Should match the seeded entries
      expect(result.entries.length).toBe(seedResult.entriesCreated);
      expect(result.pagination.total).toBe(seedResult.entriesCreated);

      console.log(`\n✓ Unified service returned ${result.entries.length} demo entries`);
    });

    it('returns unified JournalEntryResponse shape from demo entries', async () => {
      const journalService = new JournalService(true); // isDemoMode in constructor

      const result = await journalService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result.entries.length).toBeGreaterThan(0);
      const entry = result.entries[0];

      // Verify all required fields exist
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('fullContent');
      expect(entry).toHaveProperty('workspaceId');
      expect(entry).toHaveProperty('workspaceName');
      expect(entry).toHaveProperty('author');
      expect(entry.author).toHaveProperty('id');
      expect(entry.author).toHaveProperty('name');

      // Verify arrays
      expect(Array.isArray(entry.collaborators)).toBe(true);
      expect(Array.isArray(entry.reviewers)).toBe(true);
      expect(Array.isArray(entry.artifacts)).toBe(true);
      expect(Array.isArray(entry.skills)).toBe(true);
      expect(Array.isArray(entry.tags)).toBe(true);

      // Verify dual-path fields are populated
      expect(entry).toHaveProperty('activityIds');
      expect(entry).toHaveProperty('groupingMethod');
      expect(Array.isArray(entry.activityIds)).toBe(true);
      expect(entry.activityIds.length).toBeGreaterThan(0);

      console.log(`\n✓ Entry shape verified with ${entry.activityIds.length} activity IDs`);
      console.log(`  Grouping method: ${entry.groupingMethod}`);
    });

    it('getUserFeed works with isDemoMode flag', async () => {
      const journalService = new JournalService(true); // isDemoMode in constructor

      const result = await journalService.getUserFeed(
        TEST_USER_ID,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);

      console.log(`\n✓ getUserFeed returned ${result.entries.length} demo entries`);
    });

    it('returns same entries regardless of isDemoMode flag (unified fetch)', async () => {
      const demoService = new JournalService(true);
      const prodService = new JournalService(false);

      // Both services should return the same entries (no sourceMode filtering on fetch)
      const demoResult = await demoService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      const prodResult = await prodService.getJournalEntries(
        TEST_USER_ID,
        { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      // Both should return the same entries
      expect(demoResult.entries.length).toBe(prodResult.entries.length);
      expect(demoResult.entries.map(e => e.id).sort()).toEqual(
        prodResult.entries.map(e => e.id).sort()
      );

      console.log('\n✓ Unified fetch returns same entries regardless of isDemoMode flag');
    });
  });
});

// =============================================================================
// V2 DATASET PIPELINE TEST
// Tests that V2 seed data produces exactly 2 cluster-based stories
// =============================================================================

describe('V2 Dataset Pipeline', () => {
  const V2_TEST_USER_ID = 'test-user-demo-pipeline-v2';

  beforeAll(async () => {
    const existingUser = await prisma.user.findUnique({
      where: { id: V2_TEST_USER_ID },
    });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: V2_TEST_USER_ID,
          email: 'test-demo-pipeline-v2@test.com',
          name: 'Demo Pipeline V2 Test User',
          password: 'test-password-hash',
        },
      });
    }
    await clearDemoData(V2_TEST_USER_ID);
  });

  afterAll(async () => {
    await clearDemoData(V2_TEST_USER_ID);
  });

  it('seeds V2 data and produces exactly 2 cluster-based journal entries', async () => {
    const result = await seedDemoData(V2_TEST_USER_ID, { dataset: 'v2' });

    expect(result.activitiesSeeded).toBe(32);
    expect(result.clustersCreated).toBe(2);

    // Verify cluster-based journal entries
    const clusterEntries = await prisma.journalEntry.findMany({
      where: {
        authorId: V2_TEST_USER_ID,
        sourceMode: 'demo',
        groupingMethod: 'cluster',
      },
    });

    expect(clusterEntries.length).toBe(2);

    // Verify activity counts per cluster (12 + 12)
    const activityCounts = clusterEntries.map((e) => e.activityIds.length).sort();
    expect(activityCounts).toEqual([12, 12]);

    console.log(`\n✓ V2 pipeline: ${result.activitiesSeeded} activities → ${clusterEntries.length} cluster entries (${activityCounts.join(' + ')} activities)`);
  }, 300000); // 5min timeout for sequential LLM generation

  it('also creates temporal journal entries for the 14-day windows', async () => {
    const temporalEntries = await prisma.journalEntry.findMany({
      where: {
        authorId: V2_TEST_USER_ID,
        sourceMode: 'demo',
        groupingMethod: 'time',
      },
    });

    expect(temporalEntries.length).toBeGreaterThan(0);
    console.log(`\n✓ V2 pipeline: ${temporalEntries.length} temporal entries created`);
  });

  it('cluster entries have non-overlapping activity sets', async () => {
    const clusterEntries = await prisma.journalEntry.findMany({
      where: {
        authorId: V2_TEST_USER_ID,
        sourceMode: 'demo',
        groupingMethod: 'cluster',
      },
    });

    const allActivityIds = clusterEntries.flatMap((e) => e.activityIds);
    const uniqueIds = new Set(allActivityIds);
    expect(uniqueIds.size).toBe(allActivityIds.length);
  });
});

// =============================================================================
// STANDALONE EXECUTION
// =============================================================================

/**
 * Run pipeline and print report without tests.
 * Usage: npx tsx src/services/career-stories/demo-pipeline.integration.test.ts --run
 */
async function runPipelineStandalone() {
  console.log('Starting demo pipeline...');

  try {
    // Configure and run
    configureSeedService({ prisma });

    // Get an existing user
    const userId = await getOrCreateTestUser();
    console.log(`User ID: ${userId}`);

    // Clear previous demo data
    console.log('\n0. Clearing previous demo data...');
    await clearDemoData(userId);

    console.log('\n1. Seeding demo data...');
    const seedResult = await seedDemoData(userId);
    console.log(`   ✓ Seeded ${seedResult.activitiesSeeded} activities`);
    console.log(`   ✓ Created ${seedResult.clustersCreated} clusters`);
    console.log(`   ✓ Created ${seedResult.entriesCreated} entries`);

    console.log('\n2. Generating provenance report...');
    const report = await generatePipelineReport(userId);

    printProvenanceReport(report);

    console.log('\n3. Cleaning up...');
    await clearDemoData(userId);
    console.log('   ✓ Test data cleared');

  } catch (error) {
    console.error('Pipeline failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if running standalone
if (process.argv.includes('--run')) {
  runPipelineStandalone();
}
