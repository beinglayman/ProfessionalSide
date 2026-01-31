# Dual-Path Draft Generation - Implementation Plan v2

**Revised after RJ (5.8/10) and GSE review**

---

## Critical Reality Check

### The Actual Blocker (GSE's Point)

```typescript
// journal-auto-generator.service.ts line 193-208
private async fetchMCPToolActivity(...): Promise<any[]> {
  // TODO: Integrate with actual MCP service
  return [];  // <-- THIS IS THE ONLY REAL BLOCKER
}
```

The cluster path **already works**. The narrative frameworks **already exist**. We're building abstractions on top of working code while ignoring the one thing that doesn't work.

### What Already Works (Don't Rewrite)

| Component | File | Status |
|-----------|------|--------|
| ClusterExtractor | `pipeline/cluster-extractor.ts` | Complete - graphlib, diagnostics |
| 8 Narrative Frameworks | `pipeline/narrative-frameworks.ts` | Complete - STAR, CAR, PAR, etc. |
| In-memory clustering | `clustering.service.ts:346-416` | Complete - `clusterActivitiesInMemory()` |
| LLM Polisher | `llm-polisher.service.ts` | Complete - Azure OpenAI |
| RefExtractor | `pipeline/ref-extractor.ts` | Complete - pattern-based |
| DemoJournalEntry | Prisma schema | Has `activityIds[]`, `groupingMethod`, `timeRangeStart/End` |

---

## Revised Approach: Minimal Changes, Maximum Impact

### Phase 0: Fix the Actual Problem (Day 1)

**The only mandatory change to unblock everything.**

#### Step 0.1: Wire Activity Fetch to Database

**File:** `/backend/src/services/journal-auto-generator.service.ts`

Replace placeholder:

```typescript
// BEFORE (broken)
private async fetchMCPToolActivity(
  userId: string,
  toolType: string,
  lookbackStart: Date
): Promise<any[]> {
  return [];
}

// AFTER (working)
private async fetchMCPToolActivity(
  userId: string,
  toolType: string,
  lookbackStart: Date
): Promise<ToolActivity[]> {
  return this.prisma.toolActivity.findMany({
    where: {
      userId,
      source: toolType,
      timestamp: { gte: lookbackStart }
    },
    orderBy: { timestamp: 'desc' }
  });
}
```

**Acceptance Criteria:**
- [ ] Returns actual `ToolActivity` records from database
- [ ] Existing auto-generator flow works with real data
- [ ] No new files created

---

### Phase 1: Add Cadence Support (Day 1-2)

**Extend existing subscription, don't create new abstractions.**

#### Step 1.1: Add Cadence to Types

**File:** `/backend/src/types/journal-subscription.types.ts`

```typescript
// BEFORE
export const LOOKBACK_DAYS = 1;

// AFTER
export type Cadence = 'daily' | 'weekly' | 'sprint';

export const LOOKBACK_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  sprint: 14  // 2-week sprint default
};

// Add to subscription schema
export const journalSubscriptionSchema = z.object({
  // ... existing fields
  cadence: z.enum(['daily', 'weekly', 'sprint']).default('daily'),
  preferredFramework: z.enum(['STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL']).optional()
});
```

#### Step 1.2: Update Prisma Schema

**File:** `/backend/prisma/schema.prisma`

Add to `WorkspaceJournalSubscription`:

```prisma
model WorkspaceJournalSubscription {
  // ... existing fields
  cadence           String   @default("daily")  // daily, weekly, sprint
  preferredFramework String?                     // STAR, CAR, etc.
}
```

**Acceptance Criteria:**
- [ ] Migration runs: `npx prisma migrate dev --name add_cadence`
- [ ] Subscription can store cadence preference
- [ ] Lookback calculated from cadence

---

### Phase 2: Add Cluster-Based Grouping Option (Day 2-3)

**Use existing `clusterActivitiesInMemory()`, don't create new service.**

#### Step 2.1: Add Grouping Method to Subscription

**File:** `/backend/src/types/journal-subscription.types.ts`

```typescript
export type GroupingMethod = 'temporal' | 'cluster';

// Add to schema
groupingMethod: z.enum(['temporal', 'cluster']).default('temporal')
```

#### Step 2.2: Integrate Clustering in Auto-Generator

**File:** `/backend/src/services/journal-auto-generator.service.ts`

```typescript
import { ClusteringService } from './career-stories/clustering.service';

// In generateJournalEntry method:
private async generateJournalEntry(
  activityData: ToolActivityData[],
  groupingMethod: GroupingMethod,
  // ... other params
) {
  const activities = this.flattenActivities(activityData);

  if (groupingMethod === 'cluster') {
    // Use EXISTING clustering service
    const clusteringService = new ClusteringService(this.prisma);
    const clusters = clusteringService.clusterActivitiesInMemory(
      activities.map(a => ({
        id: a.id,
        refs: a.crossToolRefs || [],
        timestamp: a.timestamp,
        source: a.source
      }))
    );

    // Generate one entry per cluster
    return this.generateClusteredEntries(clusters, activities);
  }

  // Existing temporal logic
  return this.generateTemporalEntry(activities);
}
```

**Acceptance Criteria:**
- [ ] `groupingMethod: 'cluster'` uses existing ClusteringService
- [ ] No new clustering code written
- [ ] Clusters become separate journal entries or sections

---

### Phase 3: Add Framework Selection to Enrichment (Day 3-4)

**Use existing `NARRATIVE_FRAMEWORKS`, don't create duplicate registry.**

#### Step 3.1: Pass Framework to LLM Polisher

**File:** `/backend/src/services/journal-auto-generator.service.ts`

```typescript
import { NARRATIVE_FRAMEWORKS, getFramework } from './career-stories/pipeline/narrative-frameworks';
import { LLMPolisherService } from './career-stories/llm-polisher.service';

// When generating content:
if (subscription.preferredFramework) {
  const framework = getFramework(subscription.preferredFramework);
  const polisher = new LLMPolisherService();

  // Use existing polisher with framework context
  const polished = await polisher.polishSTAR(draftContent, {
    framework: subscription.preferredFramework,
    components: framework.componentDefinitions
  });
}
```

**Acceptance Criteria:**
- [ ] User can select framework in subscription settings
- [ ] LLM polisher applies selected framework structure
- [ ] No new template registry created

---

### Phase 4: Extend Existing Frameworks (Day 4-5)

**Add new frameworks to existing `NARRATIVE_FRAMEWORKS`, not a parallel system.**

#### Step 4.1: Add New Frameworks to Existing Registry

**File:** `/backend/src/services/career-stories/pipeline/narrative-frameworks.ts`

Add after existing frameworks:

```typescript
export const NARRATIVE_FRAMEWORKS: Record<NarrativeFrameworkType, NarrativeFramework> = {
  // ... existing STAR, STARL, CAR, PAR, SAR, SOAR, SHARE, CARL

  ONE_ON_ONE: {
    type: 'ONE_ON_ONE',
    name: '1:1 Meeting Notes',
    tagline: 'Manager sync format',
    description: 'Structured format for manager 1:1 meetings',
    icon: 'users',
    components: ['wins', 'challenges', 'focus', 'asks', 'feedback'],
    componentDefinitions: {
      wins: { name: 'wins', label: 'Wins', description: 'What went well', examples: [] },
      challenges: { name: 'challenges', label: 'Challenges', description: 'Current blockers', examples: [] },
      focus: { name: 'focus', label: 'Focus Areas', description: 'Current priorities', examples: [] },
      asks: { name: 'asks', label: 'Asks', description: 'Support needed', examples: [] },
      feedback: { name: 'feedback', label: 'Feedback', description: 'For manager', examples: [] }
    },
    recommendWhen: ['Weekly 1:1s', 'Status updates'],
    notIdealFor: ['Performance reviews']
  },

  SKILL_GAP: {
    type: 'SKILL_GAP',
    name: 'Skill Gap Analysis',
    tagline: 'Growth focus',
    description: 'Identify learning opportunities',
    icon: 'trending-up',
    components: ['demonstrated', 'learned', 'gaps', 'plan'],
    componentDefinitions: {
      demonstrated: { name: 'demonstrated', label: 'Skills Used', description: 'Applied skills', examples: [] },
      learned: { name: 'learned', label: 'New Learnings', description: 'What you picked up', examples: [] },
      gaps: { name: 'gaps', label: 'Gaps', description: 'Missing skills', examples: [] },
      plan: { name: 'plan', label: 'Development Plan', description: 'How to grow', examples: [] }
    },
    recommendWhen: ['Career development', 'Learning reflection'],
    notIdealFor: ['Interview prep']
  },

  PROJECT_IMPACT: {
    type: 'PROJECT_IMPACT',
    name: 'Project Impact',
    tagline: 'Contribution summary',
    description: 'Document contributions and outcomes',
    icon: 'file-text',
    components: ['project', 'contribution', 'impact', 'collaboration'],
    componentDefinitions: {
      project: { name: 'project', label: 'Project Context', description: 'Project overview', examples: [] },
      contribution: { name: 'contribution', label: 'Your Contribution', description: 'What you did', examples: [] },
      impact: { name: 'impact', label: 'Business Impact', description: 'Measurable outcomes', examples: [] },
      collaboration: { name: 'collaboration', label: 'Collaboration', description: 'Team interactions', examples: [] }
    },
    recommendWhen: ['Performance reviews', 'Promotion packets'],
    notIdealFor: ['Quick updates']
  }
};

// Update type
export type NarrativeFrameworkType =
  | 'STAR' | 'STARL' | 'CAR' | 'PAR' | 'SAR' | 'SOAR' | 'SHARE' | 'CARL'
  | 'ONE_ON_ONE' | 'SKILL_GAP' | 'PROJECT_IMPACT';
```

**Acceptance Criteria:**
- [ ] New frameworks added to existing registry
- [ ] Type updated to include new frameworks
- [ ] No duplicate template system

---

### Phase 5: Fix Known Bugs (Day 5)

**Address RJ's specific critiques.**

#### Step 5.1: Fix Timezone in Date Grouping

**File:** `/backend/src/services/journal-auto-generator.service.ts`

```typescript
// Use subscription timezone for grouping
private groupByDate(
  activities: ToolActivity[],
  timezone: string = 'UTC'
): Map<string, ToolActivity[]> {
  const map = new Map<string, ToolActivity[]>();

  activities.forEach(a => {
    // Convert to user timezone before extracting date
    const userDate = new Date(a.timestamp.toLocaleString('en-US', { timeZone: timezone }));
    const key = userDate.toISOString().split('T')[0];

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  });

  return map;
}
```

#### Step 5.2: Add Constants for Magic Numbers

**File:** `/backend/src/services/journal-auto-generator.service.ts`

```typescript
// Configuration constants
const CONFIG = {
  MIN_ACTIVITIES_DAILY: 2,
  MIN_ACTIVITIES_WEEKLY: 5,
  MIN_ACTIVITIES_CLUSTER: 2,
  DEFAULT_CLUSTER_CONFIDENCE: 0.7
} as const;
```

**Acceptance Criteria:**
- [ ] Timezone-aware date grouping
- [ ] No magic numbers in code
- [ ] Constants documented

---

## Updated File Summary

### Files to Modify (5 total)

| File | Changes |
|------|---------|
| `journal-auto-generator.service.ts` | Wire DB fetch, add grouping, timezone fix |
| `journal-subscription.types.ts` | Add cadence, groupingMethod, preferredFramework |
| `prisma/schema.prisma` | Add cadence fields to subscription |
| `narrative-frameworks.ts` | Add ONE_ON_ONE, SKILL_GAP, PROJECT_IMPACT |
| `clustering.service.ts` | No changes - already works |

### Files NOT Created (from original plan)

| Removed | Reason |
|---------|--------|
| `draft.types.ts` | Use existing JournalEntry |
| `Draft` Prisma model | Use existing DemoJournalEntry pattern |
| `temporal-pattern-detector.service.ts` | Simple groupBy, not a service |
| `draft-generator.service.ts` | Wrapper of wrapper |
| `template-registry.ts` | NARRATIVE_FRAMEWORKS exists |
| `enrichment.service.ts` | LLMPolisher exists |
| `drafts.routes.ts` | Use existing journal routes |

---

## Execution Checklist

### Day 1
- [ ] Fix `fetchMCPToolActivity` to query database
- [ ] Test with actual ToolActivity records
- [ ] Add cadence type and lookback mapping

### Day 2
- [ ] Run Prisma migration for cadence fields
- [ ] Add groupingMethod to subscription
- [ ] Integrate existing ClusteringService

### Day 3
- [ ] Wire preferredFramework to LLMPolisher
- [ ] Test framework selection in generation

### Day 4
- [ ] Add ONE_ON_ONE framework to registry
- [ ] Add SKILL_GAP framework to registry
- [ ] Add PROJECT_IMPACT framework to registry

### Day 5
- [ ] Fix timezone bug in date grouping
- [ ] Extract magic numbers to constants
- [ ] Manual testing of full flow

---

## What We're NOT Doing (Deferred)

| Feature | Reason | When to Add |
|---------|--------|-------------|
| New Draft model | Unnecessary complexity | When clear need emerges |
| Sprint detection | Requires Jira API | When Jira integration complete |
| Smart Views | UI feature | When frontend ready |
| Separate /drafts API | Use existing /journal | When drafts need distinct behavior |

---

## Acceptance Criteria (MVP)

1. **Activity fetch works** - `fetchMCPToolActivity` returns real data
2. **Cadence selection** - User can choose daily/weekly/sprint
3. **Cluster grouping** - User can choose cluster-based instead of temporal
4. **Framework selection** - User can pick narrative framework
5. **New frameworks** - ONE_ON_ONE, SKILL_GAP, PROJECT_IMPACT available
6. **Timezone correct** - Date grouping uses user timezone

**Total: 5 days, 5 files modified, 0 new abstractions.**
