/**
 * Journal Auto Generator Service Tests
 *
 * TDD cycle: Write failing test → Write code → Pass test
 *
 * Integration tests use demo tables (run with TEST_USER_ID env var)
 * Unit tests run without DB
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// UNIT TESTS - Pure logic, no DB required
// =============================================================================

describe('Unit: LOOKBACK_DAYS mapping', () => {
  const LOOKBACK_DAYS: Record<string, number> = {
    daily: 1,
    weekly: 7,
    sprint: 14,
  };

  it('daily = 1', () => expect(LOOKBACK_DAYS.daily).toBe(1));
  it('weekly = 7', () => expect(LOOKBACK_DAYS.weekly).toBe(7));
  it('sprint = 14', () => expect(LOOKBACK_DAYS.sprint).toBe(14));

  it('calculates lookback date for daily', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS.daily * 24 * 60 * 60 * 1000);
    expect(lookbackStart.toISOString()).toBe('2024-01-14T10:00:00.000Z');
  });

  it('calculates lookback date for weekly', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS.weekly * 24 * 60 * 60 * 1000);
    expect(lookbackStart.toISOString()).toBe('2024-01-08T10:00:00.000Z');
  });

  it('calculates lookback date for sprint', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS.sprint * 24 * 60 * 60 * 1000);
    expect(lookbackStart.toISOString()).toBe('2024-01-01T10:00:00.000Z');
  });
});

// =============================================================================
// HARDENING: Utility Functions Tests
// =============================================================================

describe('Unit: validateCadence', () => {
  it('returns daily for valid "daily" input', async () => {
    const { validateCadence } = await import('../types/journal-subscription.types');
    expect(validateCadence('daily')).toBe('daily');
  });

  it('returns weekly for valid "weekly" input', async () => {
    const { validateCadence } = await import('../types/journal-subscription.types');
    expect(validateCadence('weekly')).toBe('weekly');
  });

  it('returns sprint for valid "sprint" input', async () => {
    const { validateCadence } = await import('../types/journal-subscription.types');
    expect(validateCadence('sprint')).toBe('sprint');
  });

  it('returns default "daily" for null input', async () => {
    const { validateCadence } = await import('../types/journal-subscription.types');
    expect(validateCadence(null)).toBe('daily');
  });

  it('returns default "daily" for undefined input', async () => {
    const { validateCadence } = await import('../types/journal-subscription.types');
    expect(validateCadence(undefined)).toBe('daily');
  });

  it('returns default "daily" for invalid string input', async () => {
    const { validateCadence } = await import('../types/journal-subscription.types');
    expect(validateCadence('invalid')).toBe('daily');
    expect(validateCadence('monthly')).toBe('daily');
    expect(validateCadence('')).toBe('daily');
  });
});

describe('Unit: calculateLookbackStart', () => {
  it('calculates correct lookback for daily cadence', async () => {
    const { calculateLookbackStart } = await import('../types/journal-subscription.types');
    const fromDate = new Date('2024-01-15T10:00:00Z');
    const result = calculateLookbackStart('daily', fromDate);
    expect(result.toISOString()).toBe('2024-01-14T10:00:00.000Z');
  });

  it('calculates correct lookback for weekly cadence', async () => {
    const { calculateLookbackStart } = await import('../types/journal-subscription.types');
    const fromDate = new Date('2024-01-15T10:00:00Z');
    const result = calculateLookbackStart('weekly', fromDate);
    expect(result.toISOString()).toBe('2024-01-08T10:00:00.000Z');
  });

  it('calculates correct lookback for sprint cadence', async () => {
    const { calculateLookbackStart } = await import('../types/journal-subscription.types');
    const fromDate = new Date('2024-01-15T10:00:00Z');
    const result = calculateLookbackStart('sprint', fromDate);
    expect(result.toISOString()).toBe('2024-01-01T10:00:00.000Z');
  });

  it('uses current date when fromDate not provided', async () => {
    const { calculateLookbackStart, MS_PER_DAY } = await import('../types/journal-subscription.types');
    const before = Date.now();
    const result = calculateLookbackStart('daily');
    const after = Date.now();

    // Result should be approximately 1 day ago
    expect(result.getTime()).toBeGreaterThanOrEqual(before - MS_PER_DAY);
    expect(result.getTime()).toBeLessThanOrEqual(after - MS_PER_DAY);
  });
});

describe('Unit: MS_PER_DAY constant', () => {
  it('equals 86400000 milliseconds', async () => {
    const { MS_PER_DAY } = await import('../types/journal-subscription.types');
    expect(MS_PER_DAY).toBe(86400000);
    expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
  });
});

describe('Unit: Temporal Grouping', () => {
  interface Activity {
    id: string;
    timestamp: Date;
  }

  function groupByDate(activities: Activity[]): Map<string, Activity[]> {
    const grouped = new Map<string, Activity[]>();
    activities.forEach((a) => {
      const key = a.timestamp.toISOString().split('T')[0];
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    });
    return grouped;
  }

  it('groups activities by date', () => {
    const activities = [
      { id: '1', timestamp: new Date('2024-01-15T10:00:00Z') },
      { id: '2', timestamp: new Date('2024-01-15T14:00:00Z') },
      { id: '3', timestamp: new Date('2024-01-16T09:00:00Z') },
    ];

    const grouped = groupByDate(activities);
    expect(grouped.size).toBe(2);
    expect(grouped.get('2024-01-15')?.length).toBe(2);
    expect(grouped.get('2024-01-16')?.length).toBe(1);
  });

  it('returns empty map for empty input', () => {
    expect(groupByDate([]).size).toBe(0);
  });
});

describe('Unit: Cluster Ref Indexing', () => {
  interface Activity {
    id: string;
    crossToolRefs: string[];
  }

  function buildRefIndex(activities: Activity[]): Map<string, string[]> {
    const refToIds = new Map<string, string[]>();
    activities.forEach((a) => {
      a.crossToolRefs.forEach((ref) => {
        if (!refToIds.has(ref)) refToIds.set(ref, []);
        refToIds.get(ref)!.push(a.id);
      });
    });
    return refToIds;
  }

  it('indexes activities by shared refs', () => {
    const activities: Activity[] = [
      { id: '1', crossToolRefs: ['PROJ-123'] },
      { id: '2', crossToolRefs: ['PROJ-123', 'PROJ-456'] },
      { id: '3', crossToolRefs: ['PROJ-456'] },
    ];

    const refIndex = buildRefIndex(activities);
    expect(refIndex.get('PROJ-123')).toEqual(['1', '2']);
    expect(refIndex.get('PROJ-456')).toEqual(['2', '3']);
  });

  it('identifies unclustered (no refs)', () => {
    const activities: Activity[] = [
      { id: '1', crossToolRefs: ['PROJ-123'] },
      { id: '2', crossToolRefs: [] },
      { id: '3', crossToolRefs: [] },
    ];

    const unclustered = activities.filter((a) => a.crossToolRefs.length === 0);
    expect(unclustered.length).toBe(2);
  });
});

describe('Unit: Framework Components', () => {
  it('ONE_ON_ONE has 5 components', () => {
    const components = ['wins', 'challenges', 'focus', 'asks', 'feedback'];
    expect(components).toHaveLength(5);
    expect(components[0]).toBe('wins');
    expect(components).toContain('asks');
  });

  it('SKILL_GAP has 4 components', () => {
    const components = ['demonstrated', 'learned', 'gaps', 'plan'];
    expect(components).toHaveLength(4);
    expect(components).toContain('gaps');
    expect(components[3]).toBe('plan');
  });

  it('PROJECT_IMPACT has 4 components', () => {
    const components = ['project', 'contribution', 'impact', 'collaboration'];
    expect(components).toHaveLength(4);
    expect(components[0]).toBe('project');
    expect(components).toContain('impact');
  });
});

describe('Unit: Missing Tools Detection', () => {
  it('identifies tools not connected', () => {
    const selected = ['github', 'jira', 'slack'];
    const connected = ['github', 'jira'];
    const missing = selected.filter((t) => !connected.includes(t));
    expect(missing).toEqual(['slack']);
  });

  it('returns empty when all connected', () => {
    const selected = ['github'];
    const connected = ['github', 'jira'];
    const missing = selected.filter((t) => !connected.includes(t));
    expect(missing).toEqual([]);
  });
});

describe('Unit: Activity Data Structure', () => {
  interface ToolActivityData {
    toolType: string;
    activities: { id: string }[];
    hasData: boolean;
  }

  it('sets hasData true when activities exist', () => {
    const data: ToolActivityData = {
      toolType: 'github',
      activities: [{ id: '1' }],
      hasData: true,
    };
    expect(data.hasData).toBe(true);
  });

  it('sets hasData false when empty', () => {
    const data: ToolActivityData = {
      toolType: 'slack',
      activities: [],
      hasData: false,
    };
    expect(data.hasData).toBe(false);
  });

  it('aggregates multiple tools', () => {
    const activityData: ToolActivityData[] = [
      { toolType: 'github', activities: [{ id: '1' }, { id: '2' }], hasData: true },
      { toolType: 'jira', activities: [{ id: '3' }], hasData: true },
      { toolType: 'slack', activities: [], hasData: false },
    ];

    const hasAnyData = activityData.some((d) => d.hasData);
    const totalActivities = activityData.reduce((sum, d) => sum + d.activities.length, 0);
    const toolsWithData = activityData.filter((d) => d.hasData).map((d) => d.toolType);

    expect(hasAnyData).toBe(true);
    expect(totalActivities).toBe(3);
    expect(toolsWithData).toEqual(['github', 'jira']);
  });
});

// =============================================================================
// PHASE 1: CADENCE FIELD - RED TEST (will fail until schema updated)
// =============================================================================

describe('Phase 1: Cadence Schema Field', () => {
  it('subscription has cadence field', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workspace_journal_subscriptions'
      AND column_name = 'cadence'
    `;

    await prisma.$disconnect();

    expect(result.length).toBe(1);
    expect(result[0].column_name).toBe('cadence');
  });
});

// =============================================================================
// PHASE 2: GROUPING METHOD FIELD - RED TEST
// =============================================================================

describe('Phase 2: GroupingMethod Schema Field', () => {
  it('subscription has groupingMethod field', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workspace_journal_subscriptions'
      AND column_name = 'groupingMethod'
    `;

    await prisma.$disconnect();

    expect(result.length).toBe(1);
    expect(result[0].column_name).toBe('groupingMethod');
  });
});

// =============================================================================
// PHASE 3: PREFERRED FRAMEWORK FIELD - RED TEST
// =============================================================================

describe('Phase 3: PreferredFramework Schema Field', () => {
  it('subscription has preferredFramework field', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workspace_journal_subscriptions'
      AND column_name = 'preferredFramework'
    `;

    await prisma.$disconnect();

    expect(result.length).toBe(1);
    expect(result[0].column_name).toBe('preferredFramework');
  });
});

// =============================================================================
// PHASE 1-3: TYPE DEFINITIONS - RED TEST
// =============================================================================

describe('Type Definitions', () => {
  it('LOOKBACK_DAYS is a Record mapping cadence to days', async () => {
    const { LOOKBACK_DAYS } = await import('../types/journal-subscription.types');

    // Should be a record, not a constant
    expect(typeof LOOKBACK_DAYS).toBe('object');
    expect(LOOKBACK_DAYS.daily).toBe(1);
    expect(LOOKBACK_DAYS.weekly).toBe(7);
    expect(LOOKBACK_DAYS.sprint).toBe(14);
  });
});

// =============================================================================
// PHASE 2 SERVICE: GROUPING METHOD INTEGRATION - RED TEST
// =============================================================================

describe('GroupingMethod Service Integration', () => {
  it('service has groupActivities method', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    // Service should have a method to group activities
    expect(typeof (service as any).groupActivities).toBe('function');
  });

  it('groupActivities with temporal returns date-grouped activities', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activities = [
      { id: '1', timestamp: new Date('2024-01-15T10:00:00Z'), crossToolRefs: [] },
      { id: '2', timestamp: new Date('2024-01-15T14:00:00Z'), crossToolRefs: [] },
      { id: '3', timestamp: new Date('2024-01-16T09:00:00Z'), crossToolRefs: [] },
    ];

    const result = (service as any).groupActivities(activities, 'temporal');

    expect(result.method).toBe('temporal');
    expect(result.groups.length).toBe(2); // 2 dates
  });

  it('groupActivities with cluster uses ClusteringService', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activities = [
      { id: '1', timestamp: new Date(), crossToolRefs: ['PROJ-123'], source: 'github' },
      { id: '2', timestamp: new Date(), crossToolRefs: ['PROJ-123'], source: 'jira' },
      { id: '3', timestamp: new Date(), crossToolRefs: ['PROJ-456'], source: 'github' },
    ];

    const result = (service as any).groupActivities(activities, 'cluster');

    expect(result.method).toBe('cluster');
    // Activities 1 & 2 share PROJ-123, activity 3 is separate
    expect(result.groups.length).toBeGreaterThanOrEqual(1);
  });

  // Edge case tests
  it('groupActivities with temporal handles empty array', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const result = (service as any).groupActivities([], 'temporal');

    expect(result.method).toBe('temporal');
    expect(result.groups).toEqual([]);
  });

  it('groupActivities with cluster handles empty array', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const result = (service as any).groupActivities([], 'cluster');

    expect(result.method).toBe('cluster');
    expect(result.groups).toEqual([]);
  });

  it('groupActivities with temporal handles single activity', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activities = [
      { id: '1', timestamp: new Date('2024-01-15T10:00:00Z'), crossToolRefs: [] },
    ];

    const result = (service as any).groupActivities(activities, 'temporal');

    expect(result.method).toBe('temporal');
    expect(result.groups.length).toBe(1);
    expect(result.groups[0].activityIds).toEqual(['1']);
  });

  it('groupActivities with cluster adds unclustered activities', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activities = [
      { id: '1', timestamp: new Date(), crossToolRefs: [], source: 'github' },
      { id: '2', timestamp: new Date(), crossToolRefs: [], source: 'jira' },
    ];

    const result = (service as any).groupActivities(activities, 'cluster');

    expect(result.method).toBe('cluster');
    // All activities without refs should be in unclustered group
    const unclusteredGroup = result.groups.find((g: any) => g.key === 'unclustered');
    expect(unclusteredGroup).toBeDefined();
    expect(unclusteredGroup?.activityIds.length).toBe(2);
  });

  it('groupActivities defaults to temporal for invalid method', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activities = [
      { id: '1', timestamp: new Date('2024-01-15T10:00:00Z'), crossToolRefs: [] },
    ];

    // Invalid method should fall through to temporal (default)
    const result = (service as any).groupActivities(activities, 'invalid' as any);

    expect(result.method).toBe('temporal');
  });
});

// =============================================================================
// PHASE 3: FRAMEWORK INTEGRATION - RED TESTS
// =============================================================================

describe('Phase 3: Framework Integration', () => {
  it('service has getFrameworkComponents method', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    expect(typeof (service as any).getFrameworkComponents).toBe('function');
  });

  it('getFrameworkComponents returns STAR components for STAR framework', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('STAR');

    expect(components).toHaveLength(4);
    expect(components.map((c: any) => c.name)).toEqual(['situation', 'task', 'action', 'result']);
  });

  it('getFrameworkComponents returns ONE_ON_ONE components', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('ONE_ON_ONE');

    expect(components).toHaveLength(5);
    expect(components.map((c: any) => c.name)).toEqual(['wins', 'challenges', 'focus', 'asks', 'feedback']);
  });

  it('getFrameworkComponents returns SKILL_GAP components', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('SKILL_GAP');

    expect(components).toHaveLength(4);
    expect(components.map((c: any) => c.name)).toEqual(['demonstrated', 'learned', 'gaps', 'plan']);
  });

  it('getFrameworkComponents returns PROJECT_IMPACT components', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('PROJECT_IMPACT');

    expect(components).toHaveLength(4);
    expect(components.map((c: any) => c.name)).toEqual(['project', 'contribution', 'impact', 'collaboration']);
  });

  it('getFrameworkComponents returns null for unknown framework', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('UNKNOWN');

    expect(components).toBeNull();
  });

  it('getFrameworkComponents returns null when no framework specified', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents(null);

    expect(components).toBeNull();
  });

  it('getFrameworkComponents returns null for undefined', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents(undefined);

    expect(components).toBeNull();
  });

  it('getFrameworkComponents returns null for empty string', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('');

    expect(components).toBeNull();
  });

  it('getFrameworkComponents returns all career-story frameworks', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const careerFrameworks = ['STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL'];

    for (const framework of careerFrameworks) {
      const components = (service as any).getFrameworkComponents(framework);
      expect(components).not.toBeNull();
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
    }
  });

  it('framework components have required properties', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const components = (service as any).getFrameworkComponents('ONE_ON_ONE');

    components.forEach((component: any) => {
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('label');
      expect(component).toHaveProperty('description');
      expect(component).toHaveProperty('prompt');
      expect(typeof component.name).toBe('string');
      expect(typeof component.label).toBe('string');
      expect(typeof component.description).toBe('string');
      expect(typeof component.prompt).toBe('string');
    });
  });
});

describe('Phase 3: PreferredFramework Type', () => {
  it('PreferredFramework type includes journal-specific frameworks', async () => {
    const types = await import('../types/journal-subscription.types');

    // Type should exist and include both career-story frameworks and journal frameworks
    expect(types.JOURNAL_FRAMEWORKS).toBeDefined();
    expect(types.JOURNAL_FRAMEWORKS).toContain('ONE_ON_ONE');
    expect(types.JOURNAL_FRAMEWORKS).toContain('SKILL_GAP');
    expect(types.JOURNAL_FRAMEWORKS).toContain('PROJECT_IMPACT');
  });
});

// =============================================================================
// PHASE 4: FRAMEWORK APPLICATION IN GENERATION - RED TESTS
// =============================================================================

describe('Phase 4: Framework Application in Generation', () => {
  it('generateJournalEntry accepts preferredFramework parameter', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    // Method should accept framework as 6th parameter
    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    // Should not throw when called with framework
    const result = await (service as any).generateJournalEntry(
      activityData,
      null, // customPrompt
      null, // defaultCategory
      [], // defaultTags
      'workspace-123',
      'ONE_ON_ONE' // preferredFramework
    );

    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
  });

  it('generateJournalEntry includes framework in format7Data when provided', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [
          { id: '1', title: 'PR merged', timestamp: new Date() },
        ],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      'STAR'
    );

    expect(result.format7Data.framework).toBe('STAR');
    expect(result.format7Data.frameworkComponents).toBeDefined();
    expect(Array.isArray(result.format7Data.frameworkComponents)).toBe(true);
  });

  it('generateJournalEntry structures content by framework components for ONE_ON_ONE', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [{ id: '1', title: 'Feature completed', timestamp: new Date() }],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      'ONE_ON_ONE'
    );

    // Should have framework-specific content structure
    expect(result.format7Data.framework).toBe('ONE_ON_ONE');
    expect(result.format7Data.frameworkComponents).toHaveLength(5);

    const componentNames = result.format7Data.frameworkComponents.map((c: any) => c.name);
    expect(componentNames).toContain('wins');
    expect(componentNames).toContain('challenges');
    expect(componentNames).toContain('focus');
    expect(componentNames).toContain('asks');
    expect(componentNames).toContain('feedback');
  });

  it('generateJournalEntry structures content by framework components for SKILL_GAP', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'jira',
        activities: [{ id: '1', title: 'Learning task', timestamp: new Date() }],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      'SKILL_GAP'
    );

    expect(result.format7Data.framework).toBe('SKILL_GAP');
    expect(result.format7Data.frameworkComponents).toHaveLength(4);

    const componentNames = result.format7Data.frameworkComponents.map((c: any) => c.name);
    expect(componentNames).toEqual(['demonstrated', 'learned', 'gaps', 'plan']);
  });

  it('generateJournalEntry works without framework (null)', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null // no framework
    );

    expect(result.format7Data.framework).toBeUndefined();
    expect(result.format7Data.frameworkComponents).toBeUndefined();
  });

  it('generateJournalEntry works without framework parameter (backward compatible)', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    // Call without the framework parameter (5 args instead of 6)
    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123'
    );

    expect(result).toBeDefined();
    expect(result.format7Data.framework).toBeUndefined();
  });

  it('generateJournalEntry includes framework in fullContent when provided', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [{ id: '1', title: 'PR merged', timestamp: new Date() }],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      'ONE_ON_ONE'
    );

    // fullContent should mention the framework sections
    expect(result.fullContent).toContain('Wins');
    expect(result.fullContent).toContain('Challenges');
    expect(result.fullContent).toContain('Focus');
  });

  it('generateJournalEntry title reflects framework when provided', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      'ONE_ON_ONE'
    );

    // Title should indicate the framework type
    expect(result.title).toContain('1:1');
  });

  it('generateJournalEntry handles invalid framework gracefully', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    // Invalid framework should fall back to default behavior
    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      'INVALID_FRAMEWORK'
    );

    expect(result).toBeDefined();
    expect(result.title).toContain('Work Summary');
    expect(result.format7Data.framework).toBeUndefined();
    expect(result.format7Data.frameworkComponents).toBeUndefined();
  });

  it('generateJournalEntry handles empty activities array', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const result = await (service as any).generateJournalEntry(
      [], // empty array
      null,
      null,
      [],
      'workspace-123',
      'STAR'
    );

    expect(result).toBeDefined();
    expect(result.format7Data.context.total_activities).toBe(0);
    expect(result.format7Data.activities).toEqual([]);
  });

  it('generateJournalEntry preserves customPrompt in output', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    const customPrompt = 'Focus on code reviews';

    const result = await (service as any).generateJournalEntry(
      activityData,
      customPrompt,
      null,
      [],
      'workspace-123',
      'ONE_ON_ONE'
    );

    expect(result.fullContent).toContain(customPrompt);
    expect(result.format7Data.customPrompt).toBe(customPrompt);
    expect(result.format7Data.context.primary_focus).toBe(customPrompt);
  });

  it('generateJournalEntry title varies by framework type', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [{ toolType: 'github', activities: [], hasData: false }];

    const frameworkTitles = [
      { framework: 'STAR', expectedContains: 'Achievement' },
      { framework: 'SKILL_GAP', expectedContains: 'Skill' },
      { framework: 'PROJECT_IMPACT', expectedContains: 'Project' },
      { framework: 'CAR', expectedContains: 'Challenge' },
    ];

    for (const { framework, expectedContains } of frameworkTitles) {
      const result = await (service as any).generateJournalEntry(
        activityData,
        null,
        null,
        [],
        'workspace-123',
        framework
      );
      expect(result.title).toContain(expectedContains);
    }
  });
});

describe('Phase 4: Helper Methods', () => {
  it('generateTitle returns framework-specific title', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const today = 'January 15, 2024';

    expect((service as any).generateTitle(today, 'ONE_ON_ONE')).toContain('1:1');
    expect((service as any).generateTitle(today, 'STAR')).toContain('Achievement');
    expect((service as any).generateTitle(today, null)).toContain('Work Summary');
    expect((service as any).generateTitle(today, undefined)).toContain('Work Summary');
    expect((service as any).generateTitle(today, 'INVALID')).toContain('Work Summary');
  });

  it('generateDescription returns framework-specific description', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const toolsUsed = ['github', 'jira'];

    expect((service as any).generateDescription(toolsUsed, 'ONE_ON_ONE')).toContain('1:1');
    expect((service as any).generateDescription(toolsUsed, 'STAR')).toContain('Achievement');
    expect((service as any).generateDescription(toolsUsed, null)).toContain('Auto-generated');
    expect((service as any).generateDescription([], null)).toContain('connected tools');
  });

  it('generateFullContent handles empty framework components', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [{ toolType: 'github', activities: [], hasData: false }];

    // Empty array should behave like null
    const result = (service as any).generateFullContent(activityData, 'Jan 15', null, []);

    expect(result).toContain('Daily Work Summary');
    expect(result).not.toContain('undefined');
  });

  it('generateFullContent handles malformed framework components', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [{ toolType: 'github', activities: [], hasData: false }];

    // Components with missing label should be skipped
    const malformedComponents = [
      { name: 'test', label: '', description: 'desc', prompt: 'prompt' },
      { name: 'valid', label: 'Valid', description: 'desc', prompt: 'prompt' },
    ];

    const result = (service as any).generateFullContent(activityData, 'Jan 15', null, malformedComponents);

    expect(result).toContain('Valid');
    expect(result).not.toContain('undefined');
  });

  it('generateActivitySummaryContent handles no activities', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const result = (service as any).generateActivitySummaryContent([]);
    expect(result).toContain('No activities recorded');
  });

  it('generateActivitySummaryContent capitalizes tool names', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [{ id: '1' }], hasData: true },
      { toolType: 'jira', activities: [{ id: '2' }], hasData: true },
    ];

    const result = (service as any).generateActivitySummaryContent(activityData);
    expect(result).toContain('Github');
    expect(result).toContain('Jira');
  });
});

// =============================================================================
// PHASE 5: GROUPING METHOD INTEGRATION - RED TESTS
// =============================================================================

describe('Phase 5: validateGroupingMethod utility', () => {
  it('returns temporal for valid "temporal" input', async () => {
    const { validateGroupingMethod } = await import('../types/journal-subscription.types');
    expect(validateGroupingMethod('temporal')).toBe('temporal');
  });

  it('returns cluster for valid "cluster" input', async () => {
    const { validateGroupingMethod } = await import('../types/journal-subscription.types');
    expect(validateGroupingMethod('cluster')).toBe('cluster');
  });

  it('returns default "temporal" for null input', async () => {
    const { validateGroupingMethod } = await import('../types/journal-subscription.types');
    expect(validateGroupingMethod(null)).toBe('temporal');
  });

  it('returns default "temporal" for undefined input', async () => {
    const { validateGroupingMethod } = await import('../types/journal-subscription.types');
    expect(validateGroupingMethod(undefined)).toBe('temporal');
  });

  it('returns default "temporal" for invalid string input', async () => {
    const { validateGroupingMethod } = await import('../types/journal-subscription.types');
    expect(validateGroupingMethod('invalid')).toBe('temporal');
    expect(validateGroupingMethod('')).toBe('temporal');
  });
});

describe('Phase 5: Grouping Method in Generation', () => {
  it('generateJournalEntry accepts groupingMethod parameter', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [
          { id: '1', title: 'PR merged', timestamp: new Date('2024-01-15T10:00:00Z'), crossToolRefs: [] },
        ],
        hasData: true,
      },
    ];

    // Should accept groupingMethod as 7th parameter
    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null, // preferredFramework
      'temporal' // groupingMethod
    );

    expect(result).toBeDefined();
    expect(result.format7Data.grouping).toBeDefined();
    expect(result.format7Data.grouping.method).toBe('temporal');
  });

  it('generateJournalEntry includes grouped activities in format7Data', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [
          { id: '1', title: 'PR 1', timestamp: new Date('2024-01-15T10:00:00Z'), crossToolRefs: [] },
          { id: '2', title: 'PR 2', timestamp: new Date('2024-01-15T14:00:00Z'), crossToolRefs: [] },
          { id: '3', title: 'PR 3', timestamp: new Date('2024-01-16T09:00:00Z'), crossToolRefs: [] },
        ],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null,
      'temporal'
    );

    expect(result.format7Data.grouping.groups).toBeDefined();
    expect(Array.isArray(result.format7Data.grouping.groups)).toBe(true);
    // Should have 2 groups (2 different dates)
    expect(result.format7Data.grouping.groups.length).toBe(2);
  });

  it('generateJournalEntry uses cluster grouping when specified', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [
          { id: '1', title: 'PR for PROJ-123', timestamp: new Date(), crossToolRefs: ['PROJ-123'], source: 'github' },
          { id: '2', title: 'Commit for PROJ-123', timestamp: new Date(), crossToolRefs: ['PROJ-123'], source: 'github' },
        ],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null,
      'cluster'
    );

    expect(result.format7Data.grouping.method).toBe('cluster');
  });

  it('generateJournalEntry defaults to temporal when groupingMethod not provided', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    // Call without groupingMethod parameter (backward compatible)
    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null
    );

    // Should default to temporal or have no grouping
    expect(result).toBeDefined();
  });

  it('generateJournalEntry handles empty activities with grouping', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      { toolType: 'github', activities: [], hasData: false },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null,
      'temporal'
    );

    expect(result.format7Data.grouping.groups).toEqual([]);
  });

  it('fullContent includes grouping info when groupingMethod provided', async () => {
    const { JournalAutoGeneratorService } = await import('./journal-auto-generator.service');
    const service = new JournalAutoGeneratorService();

    const activityData = [
      {
        toolType: 'github',
        activities: [
          { id: '1', title: 'PR 1', timestamp: new Date('2024-01-15T10:00:00Z'), crossToolRefs: [] },
          { id: '2', title: 'PR 2', timestamp: new Date('2024-01-16T09:00:00Z'), crossToolRefs: [] },
        ],
        hasData: true,
      },
    ];

    const result = await (service as any).generateJournalEntry(
      activityData,
      null,
      null,
      [],
      'workspace-123',
      null,
      'temporal'
    );

    // fullContent should show grouped activities by date
    expect(result.fullContent).toContain('2024-01-15');
    expect(result.fullContent).toContain('2024-01-16');
  });
});

// =============================================================================
// INTEGRATION TESTS - Require demo tables
// Run with: TEST_USER_ID=<user-id> npm test
// =============================================================================

const TEST_USER_ID = process.env.TEST_USER_ID;

describe.skipIf(!TEST_USER_ID)('Integration: DemoToolActivity queries', () => {
  // These tests run only when TEST_USER_ID is provided
  // They use real demo tables seeded by demo.service

  it('fetches activities by userId', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const activities = await prisma.demoToolActivity.findMany({
      where: { userId: TEST_USER_ID },
    });

    expect(activities.length).toBeGreaterThan(0);
    await prisma.$disconnect();
  });

  it('filters by source', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const githubActivities = await prisma.demoToolActivity.findMany({
      where: { userId: TEST_USER_ID, source: 'github' },
    });

    githubActivities.forEach((a) => expect(a.source).toBe('github'));
    await prisma.$disconnect();
  });

  it('filters by timestamp', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recent = await prisma.demoToolActivity.findMany({
      where: { userId: TEST_USER_ID, timestamp: { gte: thirtyDaysAgo } },
    });

    recent.forEach((a) => {
      expect(a.timestamp.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
    });
    await prisma.$disconnect();
  });

  it('has activities with crossToolRefs', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const withRefs = await prisma.demoToolActivity.findMany({
      where: { userId: TEST_USER_ID, crossToolRefs: { isEmpty: false } },
    });

    expect(withRefs.length).toBeGreaterThan(0);
    await prisma.$disconnect();
  });
});
