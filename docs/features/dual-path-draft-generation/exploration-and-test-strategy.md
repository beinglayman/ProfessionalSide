# Dual-Path Draft Generation: Exploration & Test Strategy

## UI Demo Analysis

The demo at `__docs/plans/2026-01-24-journal-settings-ux-analysis/journal-page/demo-v2/` reveals the full vision:

### Three Filter Dimensions (Already in Demo)

1. **Temporal** (`index.html` lines 181-222)
   - Today, Yesterday, This Week, Last 15 Days
   - Each shows count of entries in that period

2. **By Source** (`index.html` lines 224-287)
   - GitHub, Outlook, Teams, Figma, Jira, Confluence, Slack
   - Filter raw entries by tool type

3. **By Story** (`index.html` lines 289-355)
   - Complete stories (green check)
   - In-Progress stories (clock icon, with % complete)
   - AI Detected/Draft stories (sparkles, dashed lines)
   - Unassigned entries (no story yet)

### Story Flow Visualization (`story-flow.html`)

- Uses React Flow + ELK.js for graph layout
- STAR phases as columns (S → T → A → R)
- Entries as nodes with source icons and phase badges
- Gap nodes for missing STAR components
- Animated edges for phase transitions
- Detail panel on node click

### Stories Page (`stories.html`)

- STAR progress bars (100%, 75%, 60%, 25%)
- Timeline of entries per story
- "What's Missing" sections for incomplete stories
- Export section with STAR format for interviews

### AI Reviewer Concept (User's Vision)

You described wanting:
- **Hiring Manager perspective** - Does this story demonstrate leadership?
- **L7/L8 Engineer perspective** - Are the technical claims credible?
- **Gap Finder** - What holes exist in the narrative?
- **Verifier** - Can the raw facts support these claims?

---

## Current Backend State

### Activity Fetch - THE BLOCKER

```typescript
// journal-auto-generator.service.ts line 141-208
private async fetchToolActivityData(
  userId: string,
  selectedTools: string[],
  lookbackStart: Date
): Promise<{ activityData: ToolActivityData[]; missingTools: string[] }> {
  // Currently queries MCPIntegration table for connected tools
  // Then calls fetchMCPToolActivity which returns []
  // THE FIX: Query ToolActivity table directly
}
```

### What Works

| Component | Location | Status |
|-----------|----------|--------|
| `ToolActivity` model | `prisma/schema.prisma` | Has all needed fields |
| `ClusterExtractor` | `pipeline/cluster-extractor.ts` | Graph-based clustering |
| `NARRATIVE_FRAMEWORKS` | `pipeline/narrative-frameworks.ts` | 8 frameworks |
| `LLMPolisherService` | `llm-polisher.service.ts` | Azure OpenAI |
| `DemoJournalEntry` | Prisma schema | Has `groupingMethod`, `activityIds[]` |

---

## Refactoring Plan - Level 1

### Phase 1: Fix Activity Fetch (1 day)

**File:** `backend/src/services/journal-auto-generator.service.ts`

```typescript
// CHANGE 1: Replace placeholder with real query
private async fetchMCPToolActivity(
  userId: string,
  toolType: string,
  lookbackStart: Date
): Promise<ToolActivity[]> {
  return prisma.toolActivity.findMany({
    where: {
      userId,
      source: toolType,
      timestamp: { gte: lookbackStart }
    },
    orderBy: { timestamp: 'desc' }
  });
}
```

**Test Strategy:**
```typescript
// __tests__/journal-auto-generator.service.test.ts

describe('fetchToolActivityData', () => {
  beforeEach(async () => {
    // Seed ToolActivity records
    await prisma.toolActivity.createMany({
      data: [
        { userId: 'test-user', source: 'github', title: 'PR #123', timestamp: new Date() },
        { userId: 'test-user', source: 'jira', title: 'PROJ-456', timestamp: new Date() }
      ]
    });
  });

  it('returns activities for connected tools', async () => {
    const result = await service.fetchToolActivityData(
      'test-user',
      ['github', 'jira'],
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    expect(result.activityData).toHaveLength(2);
    expect(result.activityData[0].hasData).toBe(true);
  });

  it('reports missing tools that have no data', async () => {
    const result = await service.fetchToolActivityData(
      'test-user',
      ['github', 'slack'], // slack has no data
      new Date()
    );

    expect(result.missingTools).toContain('slack');
  });
});
```

---

### Phase 2: Add Cadence Support (0.5 day)

**File:** `backend/src/types/journal-subscription.types.ts`

```typescript
// CHANGE 2: Dynamic lookback based on cadence
export type Cadence = 'daily' | 'weekly' | 'sprint';

export const LOOKBACK_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  sprint: 14
};
```

**File:** `backend/prisma/schema.prisma`

```prisma
model WorkspaceJournalSubscription {
  // ... existing
  cadence String @default("daily") // daily, weekly, sprint
}
```

**Test Strategy:**
```typescript
describe('LOOKBACK_DAYS', () => {
  it('returns correct days for each cadence', () => {
    expect(LOOKBACK_DAYS.daily).toBe(1);
    expect(LOOKBACK_DAYS.weekly).toBe(7);
    expect(LOOKBACK_DAYS.sprint).toBe(14);
  });
});

describe('processSubscription with cadence', () => {
  it('uses weekly lookback when cadence is weekly', async () => {
    const subscription = await createSubscription({ cadence: 'weekly' });
    // ... test that lookbackStart is 7 days ago
  });
});
```

---

### Phase 3: Add Grouping Method (0.5 day)

**File:** `backend/src/types/journal-subscription.types.ts`

```typescript
export type GroupingMethod = 'temporal' | 'cluster';
```

**File:** `backend/src/services/journal-auto-generator.service.ts`

```typescript
// CHANGE 3: Use cluster grouping when requested
private async generateJournalEntry(
  activityData: ToolActivityData[],
  groupingMethod: GroupingMethod,
  // ...
) {
  const activities = this.flattenActivities(activityData);

  if (groupingMethod === 'cluster') {
    const clusteringService = new ClusteringService(prisma);
    const clusters = clusteringService.clusterActivitiesInMemory(
      activities.map(a => ({
        id: a.id,
        refs: a.crossToolRefs || [],
        timestamp: a.timestamp,
        source: a.source
      }))
    );
    return this.generateFromClusters(clusters, activities);
  }

  return this.generateFromTemporal(activities);
}
```

**Test Strategy:**
```typescript
describe('groupingMethod: cluster', () => {
  it('groups activities by shared references', async () => {
    // Seed activities with shared refs
    await seedActivities([
      { title: 'PR for PROJ-123', crossToolRefs: ['PROJ-123'] },
      { title: 'Ticket PROJ-123', crossToolRefs: ['PROJ-123'] },
      { title: 'Unrelated PR', crossToolRefs: ['PROJ-999'] }
    ]);

    const result = await service.generateJournalEntry(
      activityData,
      'cluster',
      // ...
    );

    // Should produce 2 clusters, not 1 daily entry
    expect(result.clusters).toHaveLength(2);
  });

  it('falls back to temporal when no refs found', async () => {
    await seedActivities([
      { title: 'Activity 1', crossToolRefs: [] },
      { title: 'Activity 2', crossToolRefs: [] }
    ]);

    const result = await service.generateJournalEntry(
      activityData,
      'cluster',
      // ...
    );

    // Should fallback to single temporal entry
    expect(result.type).toBe('temporal');
  });
});
```

---

### Phase 4: Add Framework Selection (0.5 day)

**File:** `backend/prisma/schema.prisma`

```prisma
model WorkspaceJournalSubscription {
  // ... existing
  preferredFramework String? // STAR, ONE_ON_ONE, etc.
}
```

**File:** `backend/src/services/journal-auto-generator.service.ts`

```typescript
import { NARRATIVE_FRAMEWORKS, getFramework } from './career-stories/pipeline/narrative-frameworks';

// In generateJournalEntry:
if (preferredFramework) {
  const framework = getFramework(preferredFramework);
  const polisher = new LLMPolisherService();

  return polisher.polishWithFramework(rawContent, framework);
}
```

**Test Strategy:**
```typescript
describe('preferredFramework', () => {
  it('applies STAR framework structure', async () => {
    const result = await service.generateWithFramework(
      activities,
      'STAR'
    );

    expect(result.sections).toContainEqual(
      expect.objectContaining({ name: 'situation' })
    );
    expect(result.sections).toContainEqual(
      expect.objectContaining({ name: 'result' })
    );
  });

  it('applies ONE_ON_ONE framework structure', async () => {
    const result = await service.generateWithFramework(
      activities,
      'ONE_ON_ONE'
    );

    expect(result.sections).toContainEqual(
      expect.objectContaining({ name: 'wins' })
    );
    expect(result.sections).toContainEqual(
      expect.objectContaining({ name: 'asks' })
    );
  });
});
```

---

### Phase 5: Add New Frameworks (0.5 day)

**File:** `backend/src/services/career-stories/pipeline/narrative-frameworks.ts`

Add to existing `NARRATIVE_FRAMEWORKS`:

```typescript
ONE_ON_ONE: {
  type: 'ONE_ON_ONE',
  name: '1:1 Meeting Notes',
  components: ['wins', 'challenges', 'focus', 'asks', 'feedback'],
  // ...
},

SKILL_GAP: {
  type: 'SKILL_GAP',
  name: 'Skill Gap Analysis',
  components: ['demonstrated', 'learned', 'gaps', 'plan'],
  // ...
},

PROJECT_IMPACT: {
  type: 'PROJECT_IMPACT',
  name: 'Project Impact',
  components: ['project', 'contribution', 'impact', 'collaboration'],
  // ...
}
```

**Test Strategy:**
```typescript
describe('NARRATIVE_FRAMEWORKS', () => {
  it('includes all required frameworks', () => {
    expect(NARRATIVE_FRAMEWORKS).toHaveProperty('STAR');
    expect(NARRATIVE_FRAMEWORKS).toHaveProperty('ONE_ON_ONE');
    expect(NARRATIVE_FRAMEWORKS).toHaveProperty('SKILL_GAP');
    expect(NARRATIVE_FRAMEWORKS).toHaveProperty('PROJECT_IMPACT');
  });

  it('ONE_ON_ONE has correct components', () => {
    const framework = NARRATIVE_FRAMEWORKS.ONE_ON_ONE;
    expect(framework.components).toEqual([
      'wins', 'challenges', 'focus', 'asks', 'feedback'
    ]);
  });
});
```

---

## Integration Test Strategy

### End-to-End Flow Test

```typescript
describe('Dual-Path Draft Generation E2E', () => {
  beforeAll(async () => {
    // Seed user, workspace, subscription, activities
  });

  describe('Temporal Path', () => {
    it('generates daily summary from activities', async () => {
      const subscription = await createSubscription({
        cadence: 'daily',
        groupingMethod: 'temporal'
      });

      await service.processSubscription(subscription);

      const entries = await prisma.journalEntry.findMany({
        where: { authorId: user.id }
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].tags).toContain('auto-generated');
    });

    it('generates weekly summary with more activities', async () => {
      // Seed 7 days of activities
      const subscription = await createSubscription({
        cadence: 'weekly',
        groupingMethod: 'temporal'
      });

      await service.processSubscription(subscription);

      const entry = await prisma.journalEntry.findFirst({
        where: { authorId: user.id }
      });

      // Weekly should aggregate more
      expect(entry.fullContent).toContain('Summary');
    });
  });

  describe('Cluster Path', () => {
    it('generates separate entries for each cluster', async () => {
      // Seed activities with 2 distinct reference groups
      await seedActivities([
        { crossToolRefs: ['PROJ-A'] },
        { crossToolRefs: ['PROJ-A'] },
        { crossToolRefs: ['PROJ-B'] },
        { crossToolRefs: ['PROJ-B'] },
      ]);

      const subscription = await createSubscription({
        groupingMethod: 'cluster'
      });

      await service.processSubscription(subscription);

      const entries = await prisma.journalEntry.findMany({
        where: { authorId: user.id }
      });

      // Should create 2 entries, one per cluster
      expect(entries).toHaveLength(2);
    });
  });

  describe('Framework Application', () => {
    it('applies STAR structure when selected', async () => {
      const subscription = await createSubscription({
        preferredFramework: 'STAR'
      });

      await service.processSubscription(subscription);

      const entry = await prisma.journalEntry.findFirst({
        where: { authorId: user.id }
      });

      // Check format7Data has STAR sections
      expect(entry.format7Data.sections).toBeDefined();
      expect(entry.format7Data.sections.map(s => s.name)).toEqual(
        expect.arrayContaining(['situation', 'task', 'action', 'result'])
      );
    });
  });
});
```

---

## Future: AI Reviewer Integration

Based on your vision for multi-perspective review:

```typescript
// Future: backend/src/services/narrative-reviewer.service.ts

interface ReviewPerspective {
  role: 'hiring_manager' | 'staff_engineer' | 'gap_finder' | 'verifier';
  prompt: string;
}

const REVIEW_PERSPECTIVES: ReviewPerspective[] = [
  {
    role: 'hiring_manager',
    prompt: `Review this story from a hiring manager's perspective.
             Does it demonstrate leadership? Impact? Growth?`
  },
  {
    role: 'staff_engineer',
    prompt: `Review this technical narrative as an L7/L8 engineer.
             Are the technical claims credible? What's missing?`
  },
  {
    role: 'gap_finder',
    prompt: `Identify gaps in this STAR narrative.
             What evidence is weak? What claims need support?`
  },
  {
    role: 'verifier',
    prompt: `Given these raw activities, verify each claim in the narrative.
             Which claims are well-supported? Which need more evidence?`
  }
];

class NarrativeReviewerService {
  async reviewNarrative(
    narrative: string,
    activities: ToolActivity[],
    perspectives: ReviewPerspective[]
  ): Promise<ReviewResult[]> {
    // Call LLM for each perspective
    // Return structured feedback
  }
}
```

---

## Files Modified Summary

| File | Change | Test File |
|------|--------|-----------|
| `journal-auto-generator.service.ts` | Fix activity fetch, add grouping | `__tests__/journal-auto-generator.service.test.ts` |
| `journal-subscription.types.ts` | Add Cadence, GroupingMethod | `__tests__/types/journal-subscription.types.test.ts` |
| `prisma/schema.prisma` | Add cadence, preferredFramework | Migration test |
| `narrative-frameworks.ts` | Add 3 new frameworks | `__tests__/narrative-frameworks.test.ts` |

---

## Acceptance Criteria

1. [ ] `fetchMCPToolActivity` returns real `ToolActivity` records
2. [ ] Subscription can specify `cadence`: daily/weekly/sprint
3. [ ] Subscription can specify `groupingMethod`: temporal/cluster
4. [ ] Subscription can specify `preferredFramework`
5. [ ] ONE_ON_ONE, SKILL_GAP, PROJECT_IMPACT frameworks exist
6. [ ] All tests pass
7. [ ] Demo UI patterns align with backend data structures
