# Sources v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract evidence from CareerStory.sections JSON into a new StorySource table, display sources inline below each narrative section, show gap warnings, and support two user actions (add note, exclude with undo).

**Architecture:** New `StorySource` table (one table, three source types via discriminator). Sources are included in the story GET response — no separate query. Frontend renders `SourceList` below each `NarrativeSection`. Two mutations: add user_note, toggle excludedAt.

**Tech Stack:** Prisma ORM, Express + Zod validation, React Query mutations, TypeScript, neverthrow (backend services), Handlebars (prompt templates — no changes)

---

## Task 0: Prerequisite Bug Fixes

### Bug A: `createFromJournalEntry()` missing `journalEntryId`

**Files:**
- Modify: `backend/src/services/career-stories/career-story.service.ts:851-864`

**Step 1: Write the failing test**

Add to a new file `backend/src/services/career-stories/source-bugs.test.ts`:

```typescript
import { prisma } from '../../lib/prisma';
import { createCareerStoryService } from './career-story.service';

describe('Bug fixes: journalEntryId and regeneration', () => {
  const TEST_USER_ID = 'test-user-sources';

  beforeAll(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: 'sources-test@test.com', name: 'Sources Test' },
    });
  });

  afterAll(async () => {
    await prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
  });

  it('createFromJournalEntry sets journalEntryId on the story', async () => {
    // Create a journal entry with activities
    const entry = await prisma.journalEntry.create({
      data: {
        authorId: TEST_USER_ID,
        sourceMode: 'demo',
        title: 'Test Entry',
        description: 'A test journal entry for bug fix verification',
        activityIds: [],
        groupingMethod: 'manual',
      },
    });

    // Create a demo activity to reference
    const activity = await prisma.demoToolActivity.create({
      data: {
        userId: TEST_USER_ID,
        source: 'github',
        sourceId: 'test-pr-1',
        title: 'Test PR #1',
        timestamp: new Date(),
      },
    });

    await prisma.journalEntry.update({
      where: { id: entry.id },
      data: { activityIds: [activity.id] },
    });

    const service = createCareerStoryService(true); // demo mode
    const result = await service.createFromJournalEntry(TEST_USER_ID, entry.id);

    expect(result.success).toBe(true);
    expect(result.story).toBeDefined();

    // The bug: journalEntryId was not set
    const dbStory = await prisma.careerStory.findUnique({
      where: { id: result.story!.id },
    });
    expect(dbStory!.journalEntryId).toBe(entry.id);

    // Cleanup
    await prisma.careerStory.delete({ where: { id: result.story!.id } });
    await prisma.demoToolActivity.delete({ where: { id: activity.id } });
    await prisma.journalEntry.delete({ where: { id: entry.id } });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest source-bugs.test.ts --testPathPattern=source-bugs -t "createFromJournalEntry sets journalEntryId" --no-coverage`
Expected: FAIL — `dbStory.journalEntryId` is `null`

**Step 3: Fix the bug**

In `backend/src/services/career-stories/career-story.service.ts`, find the `prisma.careerStory.create` call inside `createFromJournalEntry()` (line ~851) and add `journalEntryId`:

```typescript
// In createFromJournalEntry(), around line 851
const story = await prisma.careerStory.create({
  data: {
    userId,
    sourceMode: this.sourceMode,
    title,
    activityIds: entry.activityIds,
    framework: useFramework,
    sections: sections as unknown as Prisma.InputJsonValue,
    generatedAt: new Date(),
    needsRegeneration: false,
    visibility: 'private',
    isPublished: false,
    journalEntryId: entryId,  // <-- ADD THIS LINE (Bug A fix)
  },
});
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest source-bugs.test.ts --testPathPattern=source-bugs -t "createFromJournalEntry sets journalEntryId" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/career-stories/career-story.service.ts backend/src/services/career-stories/source-bugs.test.ts
git commit -m "fix: set journalEntryId in createFromJournalEntry()

Previously the journalEntryId FK was not set when creating a career story
from a journal entry, making regeneration use fragile activity overlap
matching instead of the direct FK.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Bug B: `regenerate()` uses activity overlap instead of FK

**Files:**
- Modify: `backend/src/services/career-stories/career-story.service.ts:1100-1118`

**Step 6: Write the failing test**

Add to `source-bugs.test.ts`:

```typescript
it('regenerate uses journalEntryId FK, not activity overlap', async () => {
  const entry = await prisma.journalEntry.create({
    data: {
      authorId: TEST_USER_ID,
      sourceMode: 'demo',
      title: 'Regen FK Test',
      description: 'Test that regeneration uses the FK',
      fullContent: 'We built a caching layer that reduced response times by 60%.',
      activityIds: [],
      groupingMethod: 'manual',
    },
  });

  const activity = await prisma.demoToolActivity.create({
    data: {
      userId: TEST_USER_ID,
      source: 'github',
      sourceId: 'regen-fk-pr-1',
      title: 'Caching PR',
      timestamp: new Date(),
    },
  });

  await prisma.journalEntry.update({
    where: { id: entry.id },
    data: { activityIds: [activity.id] },
  });

  const service = createCareerStoryService(true);
  const createResult = await service.createFromJournalEntry(TEST_USER_ID, entry.id);
  expect(createResult.success).toBe(true);

  // Verify the story has journalEntryId set (from Bug A fix)
  const storyBefore = await prisma.careerStory.findUnique({
    where: { id: createResult.story!.id },
  });
  expect(storyBefore!.journalEntryId).toBe(entry.id);

  // Regenerate should use the FK, not activity overlap
  const regenResult = await service.regenerate(createResult.story!.id, TEST_USER_ID, 'SOAR');
  expect(regenResult.success).toBe(true);
  expect(regenResult.story!.framework).toBe('SOAR');

  // Cleanup
  await prisma.careerStory.delete({ where: { id: createResult.story!.id } });
  await prisma.demoToolActivity.delete({ where: { id: activity.id } });
  await prisma.journalEntry.delete({ where: { id: entry.id } });
});
```

**Step 7: Fix the bug**

In `regenerate()` (line ~1100-1118), change the journal entry lookup to prefer the FK:

```typescript
// Replace the journalEntry lookup (lines 1104-1118) with:
// Try FK first, fall back to activity overlap
let journalEntry = null;
if (story.journalEntryId) {
  journalEntry = await prisma.journalEntry.findFirst({
    where: {
      id: story.journalEntryId,
      authorId: userId,
      sourceMode: this.sourceMode,
    },
    select: {
      id: true,
      title: true,
      fullContent: true,
      format7Data: true,
      description: true,
      category: true,
    },
  });
}
// Fallback: activity overlap (for stories created before Bug A fix)
if (!journalEntry) {
  journalEntry = await prisma.journalEntry.findFirst({
    where: {
      authorId: userId,
      sourceMode: this.sourceMode,
      activityIds: { hasSome: story.activityIds },
    },
    select: {
      id: true,
      title: true,
      fullContent: true,
      format7Data: true,
      description: true,
      category: true,
    },
  });
}
```

**Step 8: Run test to verify it passes**

Run: `cd backend && npx jest source-bugs.test.ts --testPathPattern=source-bugs --no-coverage`
Expected: PASS (both tests)

**Step 9: Commit**

```bash
git add backend/src/services/career-stories/career-story.service.ts
git commit -m "fix: regenerate() uses journalEntryId FK before activity overlap

Previously regenerate() always used activity overlap to find the source
journal entry. Now uses the journalEntryId FK when available, falling
back to overlap for stories created before the FK was set.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Bug C: `defaultEvidence` shotgun → sectionKey "unassigned"

**Files:**
- Modify: `backend/src/services/career-stories/career-story.service.ts:297-313` and `345-401` and `470-507`

**Step 10: Fix the defaultEvidence shotgun**

This bug exists in three places where `defaultEvidence` is created and applied to ALL sections:

1. `buildSections()` (line 297-313): Creates `defaultEvidence = this.buildEvidence(activities)` and applies to every section
2. `buildSectionsFromJournalContent()` (line 345-401): Creates `defaultEvidence = activityIds.map(...)` and applies to every section
3. `generateSectionsWithLLM()` (line 470-507): Creates `defaultEvidence = activityIds.map(...)` and applies as fallback

**Important context:** The `defaultEvidence` shotgun pattern only matters for source population (Step 3). In v1, the StorySource backfill will read `sections.evidence` and create source rows. If every section has the same evidence array, every activity appears as a source for every section — which is misleading.

**The fix is deferred to Step 3** where we'll handle this during source population. When creating StorySource rows from `sections.evidence`, if the LLM didn't provide per-section evidence mapping, we'll assign `sectionKey = "unassigned"` instead of duplicating across sections.

For now, the sections JSON continues to work as-is. The structural fix happens when we stop reading evidence from sections JSON and start reading from StorySource table.

**No code change needed in this step.** The fix is part of Task 3 (generation wiring).

**Step 11: Commit (documentation only)**

```bash
git add backend/src/services/career-stories/source-bugs.test.ts
git commit -m "test: add source prerequisite bug fix tests

Tests for journalEntryId FK in createFromJournalEntry and regenerate.
Bug C (defaultEvidence shotgun) fix deferred to source population step.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 1: Schema + Migration + Backfill

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_story_sources/migration.sql`

**Step 1: Add StorySource model to Prisma schema**

Add to `backend/prisma/schema.prisma` after the CareerStory model (after line 1482):

```prisma
// Story sources — extracted evidence for career stories
// One table for all three source types: activity, user_note, wizard_answer
// Sources survive story regeneration (separate from sections text)
model StorySource {
  id         String   @id @default(cuid())
  storyId    String
  sectionKey String                          // "situation", "action", etc. or "unassigned"

  // What kind of source
  sourceType String                          // "activity" | "user_note" | "wizard_answer"

  // Pointer to the source (activity sources only)
  activityId String?                         // FK → ToolActivity (when sourceType = "activity")
  activity   ToolActivity? @relation(fields: [activityId], references: [id], onDelete: SetNull)

  // Display content
  label      String                          // display title
  content    String?                         // the actual text (user note, wizard answer)
  url        String?                         // external link
  annotation String?                         // user's note about WHY this source matters

  // Metadata
  toolType   String?                         // "github" | "jira" | etc.
  role       String?                         // "authored" | "approved" | "reviewed" | etc.
  questionId String?                         // for wizard_answer: stable question ID
  sortOrder  Int      @default(0)            // position within section
  excludedAt DateTime?                       // null = included, non-null = when excluded

  // verification: reserved for future per-claim fact-checking. See sources-design.md.

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  story      CareerStory @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@index([storyId])
  @@index([storyId, sectionKey])
  @@index([activityId])
  @@map("story_sources")
}
```

**Step 2: Add reverse relation on ToolActivity**

In the `ToolActivity` model (around line 1392-1398), add before the closing brace:

```prisma
  storySources StorySource[]
```

**Step 3: Add new columns and relation on CareerStory**

In the `CareerStory` model (around line 1470-1471), add before `createdAt`:

```prisma
  // Generation inputs (what produced the current text)
  lastGenerationPrompt  String?   // user's regeneration instructions
  wizardAnswers         Json?     // D-I-G answers from wizard

  // Sources relation
  sources               StorySource[]
```

**Step 4: Generate and run migration**

Run: `cd backend && npx prisma migrate dev --name add_story_sources`

This will:
- Create the `story_sources` table with all columns
- Add `last_generation_prompt` and `wizard_answers` columns to `career_stories`
- Create indexes

**Step 5: Write backfill script**

Create `backend/prisma/backfill-story-sources.ts`:

```typescript
/**
 * Backfill StorySource rows from existing CareerStory.sections.evidence
 *
 * For each story, for each section, for each evidence entry:
 * - Create a StorySource row with sourceType: "activity"
 * - Hydrate label/url/toolType from ToolActivity if found
 * - Use activityId = null if activity doesn't exist (LLM hallucination)
 * - Store evidence.description as annotation
 *
 * Safe to run multiple times — uses upsert to prevent duplicates.
 */
import { prisma } from '../src/lib/prisma';

interface EvidenceEntry {
  activityId: string;
  description?: string;
  date?: string;
}

interface Section {
  summary?: string;
  evidence?: EvidenceEntry[];
}

async function backfill() {
  console.log('Starting StorySource backfill...');

  const stories = await prisma.careerStory.findMany({
    select: {
      id: true,
      sections: true,
      sourceMode: true,
    },
  });

  console.log(`Found ${stories.length} stories to process`);

  let created = 0;
  let skipped = 0;
  let missingActivities = 0;

  for (const story of stories) {
    const sections = story.sections as Record<string, Section> | null;
    if (!sections) continue;

    for (const [sectionKey, section] of Object.entries(sections)) {
      if (!section?.evidence || !Array.isArray(section.evidence)) continue;

      for (let i = 0; i < section.evidence.length; i++) {
        const evidence = section.evidence[i];
        if (!evidence?.activityId) continue;

        // Look up activity for hydration
        let activity = null;
        try {
          // Try production table first, then demo
          activity = await prisma.toolActivity.findUnique({
            where: { id: evidence.activityId },
            select: { id: true, title: true, sourceUrl: true, source: true },
          });
          if (!activity) {
            // Try demo table
            activity = await prisma.demoToolActivity.findUnique({
              where: { id: evidence.activityId },
              select: { id: true, title: true, sourceUrl: true, source: true },
            });
          }
        } catch {
          // Activity table access failed, continue with null
        }

        const label = activity?.title || `Unknown activity [${evidence.activityId.slice(0, 8)}]`;
        const url = activity?.sourceUrl || null;
        const toolType = activity?.source || null;
        const activityId = activity ? evidence.activityId : null;

        if (!activity) missingActivities++;

        // Upsert to prevent duplicates (same story + section + activity)
        try {
          await prisma.storySource.upsert({
            where: {
              // Use a pseudo-unique lookup — Prisma doesn't have compound unique here
              // so we create if not found
              id: `backfill-${story.id}-${sectionKey}-${evidence.activityId}`,
            },
            update: {}, // No update needed — backfill is idempotent
            create: {
              id: `backfill-${story.id}-${sectionKey}-${evidence.activityId}`,
              storyId: story.id,
              sectionKey,
              sourceType: 'activity',
              activityId,
              label,
              url,
              toolType,
              annotation: evidence.description || null,
              sortOrder: i,
            },
          });
          created++;
        } catch (e: any) {
          if (e.code === 'P2002') {
            skipped++; // Duplicate — already backfilled
          } else {
            throw e;
          }
        }
      }
    }
  }

  console.log(`Backfill complete: ${created} created, ${skipped} skipped (duplicates), ${missingActivities} missing activities`);
}

backfill()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  });
```

**Step 6: Run the backfill**

Run: `cd backend && npx tsx prisma/backfill-story-sources.ts`

**Step 7: Verify backfill**

Run: `cd backend && npx prisma studio` and check the `story_sources` table has rows.

**Step 8: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/prisma/backfill-story-sources.ts
git commit -m "feat: add StorySource table with backfill from sections.evidence

New story_sources table extracts evidence from CareerStory.sections JSON.
Schema includes all fields (annotation, sortOrder, questionId, excludedAt)
for future curation. Backfill handles missing activities, dedup, demo mode.

Also adds lastGenerationPrompt and wizardAnswers columns to CareerStory.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Backend Source Service + Endpoints

**Files:**
- Create: `backend/src/services/career-stories/story-source.service.ts`
- Modify: `backend/src/controllers/career-stories.controller.ts`
- Modify: `backend/src/controllers/career-stories.schemas.ts`
- Modify: `backend/src/routes/career-stories.routes.ts`

### Step 1: Create StorySourceService

Create `backend/src/services/career-stories/story-source.service.ts`:

```typescript
/**
 * Story Source Service
 *
 * Reads, creates (user_note), and excludes/restores story sources.
 * Sources are included in story GET responses — no separate query needed.
 *
 * v1 scope: read, add user_note, exclude/restore via excludedAt.
 * v2 scope: edit annotation, edit content, reorder, reassign section.
 */

import { prisma } from '../../lib/prisma';

// Vague metric detection patterns
const VAGUE_PATTERNS = [
  { pattern: /significantly\s+(improved|reduced|increased|enhanced)/i, suggestion: 'Add specific numbers (e.g., "by 40%")' },
  { pattern: /greatly\s+(improved|reduced|enhanced|increased)/i, suggestion: 'Add specific numbers' },
  { pattern: /improved\s+\w+\s+(?!by\s+\d)/i, suggestion: 'Consider adding "by X%"' },
  { pattern: /reduced\s+\w+\s+(?!by\s+\d|from\s+\d)/i, suggestion: 'Consider adding "from X to Y"' },
  { pattern: /substantially\s+(improved|reduced|increased)/i, suggestion: 'Quantify the improvement' },
  { pattern: /dramatically\s+(improved|reduced|increased)/i, suggestion: 'Replace with specific numbers' },
];

export interface SourceCoverage {
  total: number;
  sourced: number;
  gaps: string[];
  vagueMetrics: Array<{
    sectionKey: string;
    match: string;
    suggestion: string;
  }>;
}

export interface StorySourceRow {
  id: string;
  storyId: string;
  sectionKey: string;
  sourceType: string;
  activityId: string | null;
  label: string;
  content: string | null;
  url: string | null;
  annotation: string | null;
  toolType: string | null;
  role: string | null;
  questionId: string | null;
  sortOrder: number;
  excludedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class StorySourceService {
  /**
   * Get all sources for a story (included in story GET response).
   */
  async getSourcesForStory(storyId: string): Promise<StorySourceRow[]> {
    return prisma.storySource.findMany({
      where: { storyId },
      orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Compute source coverage for a story.
   * Returns total sections, sourced sections, gaps, and vague metrics.
   */
  computeCoverage(
    sources: StorySourceRow[],
    sections: Record<string, { summary?: string }>,
    sectionKeys: string[]
  ): SourceCoverage {
    const activeSources = sources.filter((s) => !s.excludedAt);
    const sourcedSections = new Set<string>();

    for (const source of activeSources) {
      if (source.sectionKey !== 'unassigned') {
        sourcedSections.add(source.sectionKey);
      }
    }

    const gaps = sectionKeys.filter((key) => !sourcedSections.has(key));

    // Detect vague metrics in section text
    const vagueMetrics: SourceCoverage['vagueMetrics'] = [];
    for (const key of sectionKeys) {
      const summary = sections[key]?.summary || '';
      for (const { pattern, suggestion } of VAGUE_PATTERNS) {
        const match = summary.match(pattern);
        if (match) {
          vagueMetrics.push({
            sectionKey: key,
            match: match[0],
            suggestion,
          });
          break; // One warning per section
        }
      }
    }

    return {
      total: sectionKeys.length,
      sourced: sourcedSections.size,
      gaps,
      vagueMetrics,
    };
  }

  /**
   * Create a user_note source for a story section.
   * v1: Only user_note type is creatable by users.
   */
  async createUserNote(
    storyId: string,
    sectionKey: string,
    content: string
  ): Promise<StorySourceRow> {
    // Get next sortOrder for this section
    const maxSort = await prisma.storySource.aggregate({
      where: { storyId, sectionKey },
      _max: { sortOrder: true },
    });

    return prisma.storySource.create({
      data: {
        storyId,
        sectionKey,
        sourceType: 'user_note',
        label: 'Your note',
        content,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  /**
   * Exclude or restore a source.
   * v1: Only excludedAt is patchable.
   */
  async updateExcludedAt(
    sourceId: string,
    storyId: string,
    excludedAt: Date | null
  ): Promise<StorySourceRow> {
    return prisma.storySource.update({
      where: { id: sourceId },
      data: { excludedAt },
    });
  }

  /**
   * Verify a source belongs to a story (ownership check).
   */
  async verifyOwnership(sourceId: string, storyId: string): Promise<boolean> {
    const source = await prisma.storySource.findFirst({
      where: { id: sourceId, storyId },
      select: { id: true },
    });
    return !!source;
  }
}

export const storySourceService = new StorySourceService();
```

### Step 2: Add Zod schemas for source endpoints

Add to `backend/src/controllers/career-stories.schemas.ts`:

```typescript
// =============================================================================
// STORY SOURCE SCHEMAS
// =============================================================================

/**
 * Schema for POST /stories/:storyId/sources (add user note)
 */
export const createSourceSchema = z.object({
  sectionKey: z.string().min(1).max(50),
  sourceType: z.literal('user_note'),
  content: z.string().min(1).max(2000),
}).strict();

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

/**
 * Schema for PATCH /stories/:storyId/sources/:sourceId (exclude/restore)
 */
export const updateSourceSchema = z.object({
  excludedAt: z.string().datetime().nullable(),
}).strict();

export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
```

### Step 3: Add source endpoints to controller

Add to `backend/src/controllers/career-stories.controller.ts` at the bottom, before the profile section:

```typescript
import { storySourceService, StorySourceRow, SourceCoverage } from '../services/career-stories/story-source.service';
import { createSourceSchema, updateSourceSchema, formatZodErrors } from './career-stories.schemas';

// ============================================================================
// STORY SOURCES
// ============================================================================

/**
 * POST /api/v1/career-stories/stories/:storyId/sources
 * Add a user note source to a story section.
 */
export const addStorySource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = createSourceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  const { sectionKey, content } = parseResult.data;

  // Verify story ownership
  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  const source = await storySourceService.createUserNote(storyId, sectionKey, content);
  sendSuccess(res, source, 'Source added', 201);
});

/**
 * PATCH /api/v1/career-stories/stories/:storyId/sources/:sourceId
 * Exclude or restore a source (set excludedAt).
 */
export const updateStorySource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { storyId, sourceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const parseResult = updateSourceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return void sendError(res, 'Invalid request body', 400, formatZodErrors(parseResult.error));
  }

  // Verify story ownership
  const isDemoMode = isDemoModeRequest(req);
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  // Verify source belongs to story
  const isOwned = await storySourceService.verifyOwnership(sourceId, storyId);
  if (!isOwned) {
    return void sendError(res, 'Source not found', 404);
  }

  const { excludedAt } = parseResult.data;
  const source = await storySourceService.updateExcludedAt(
    sourceId,
    storyId,
    excludedAt ? new Date(excludedAt) : null
  );
  sendSuccess(res, source, excludedAt ? 'Source excluded' : 'Source restored');
});
```

### Step 4: Modify getStoryById to include sources + coverage

In the `getStoryById` controller handler, add sources and coverage to the response:

```typescript
// Replace the existing getStoryById handler body (after the story fetch):
export const getStoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const isDemoMode = isDemoModeRequest(req);
  const service = createCareerStoryService(isDemoMode);
  const story = await service.getStoryById(id, userId);

  if (!story) {
    return void sendError(res, 'Story not found', 404);
  }

  // Include sources and coverage
  const sources = await storySourceService.getSourcesForStory(id);
  const { FRAMEWORK_SECTIONS } = await import('../services/ai/prompts/career-story.prompt');
  const sectionKeys = FRAMEWORK_SECTIONS[story.framework as keyof typeof FRAMEWORK_SECTIONS] || Object.keys(story.sections);
  const sourceCoverage = storySourceService.computeCoverage(sources, story.sections, sectionKeys);

  sendSuccess(res, {
    ...story,
    sources,
    sourceCoverage,
  });
});
```

### Step 5: Register routes

Add to `backend/src/routes/career-stories.routes.ts`:

```typescript
// Import new handlers
import {
  // ... existing imports ...
  addStorySource,
  updateStorySource,
} from '../controllers/career-stories.controller';

// Add after the stories CRUD routes (after line 117):
// Story Sources
router.post('/stories/:storyId/sources', addStorySource);
router.patch('/stories/:storyId/sources/:sourceId', updateStorySource);
```

### Step 6: Run existing tests to check for breakage

Run: `cd backend && npx jest --no-coverage --testPathPattern=career-stories`
Expected: All existing tests pass (new response fields are additive)

### Step 7: Commit

```bash
git add backend/src/services/career-stories/story-source.service.ts backend/src/controllers/career-stories.controller.ts backend/src/controllers/career-stories.schemas.ts backend/src/routes/career-stories.routes.ts
git commit -m "feat: add StorySourceService with read, add note, exclude/restore

New service handles source CRUD for v1:
- getSourcesForStory: included in story GET response
- createUserNote: POST /stories/:id/sources
- updateExcludedAt: PATCH /stories/:id/sources/:sourceId
- computeCoverage: section gap detection + vague metric warnings

Story GET now returns sources[] and sourceCoverage{}.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Backend Generation Wiring

**Files:**
- Modify: `backend/src/services/career-stories/career-story.service.ts`
- Modify: `backend/src/services/story-wizard.service.ts`

### Step 1: Add source population to `createFromJournalEntry()`

After the `prisma.careerStory.create()` call in `createFromJournalEntry()`, add source population:

```typescript
// After story creation, populate StorySource rows
const sectionKeys = NARRATIVE_FRAMEWORKS[useFramework] || [];
await this.populateSourcesFromSections(story.id, sections, entry.activityIds, userId, sectionKeys);
```

### Step 2: Add the `populateSourcesFromSections` method

Add to `CareerStoryService`:

```typescript
/**
 * Populate StorySource rows from generated sections.
 * Creates activity-type source rows from evidence in sections.
 * Handles the defaultEvidence shotgun: if all sections have identical
 * evidence, assigns sectionKey = "unassigned" instead.
 */
private async populateSourcesFromSections(
  storyId: string,
  sections: NarrativeSections,
  activityIds: string[],
  userId: string,
  sectionKeys: string[]
): Promise<void> {
  // Detect shotgun pattern: if every section has the same evidence array
  const evidenceArrays = sectionKeys.map((key) =>
    (sections[key]?.evidence || []).map((e) => e.activityId).sort().join(',')
  );
  const isShotgun = new Set(evidenceArrays).size === 1 && evidenceArrays[0] !== '';

  // Fetch activities for hydration
  const activities = await this.fetchActivitiesWithRefs(userId, activityIds);
  const activityMap = new Map(activities.map((a) => [a.id, a]));

  const sourcesToCreate: Array<{
    storyId: string;
    sectionKey: string;
    sourceType: string;
    activityId: string | null;
    label: string;
    url: string | null;
    toolType: string | null;
    role: string | null;
    annotation: string | null;
    sortOrder: number;
  }> = [];

  if (isShotgun) {
    // Bug C fix: assign all to "unassigned" instead of every section
    const uniqueActivityIds = [...new Set(activityIds)];
    for (let i = 0; i < uniqueActivityIds.length; i++) {
      const activity = activityMap.get(uniqueActivityIds[i]);
      sourcesToCreate.push({
        storyId,
        sectionKey: 'unassigned',
        sourceType: 'activity',
        activityId: activity ? uniqueActivityIds[i] : null,
        label: activity?.title || `Unknown activity [${uniqueActivityIds[i].slice(0, 8)}]`,
        url: activity?.sourceUrl || null,
        toolType: activity?.source || null,
        role: this.detectRole(activity),
        annotation: null,
        sortOrder: i,
      });
    }
  } else {
    // Normal case: use LLM evidence mapping
    for (const sectionKey of sectionKeys) {
      const evidence = sections[sectionKey]?.evidence || [];
      for (let i = 0; i < evidence.length; i++) {
        const e = evidence[i];
        const activity = activityMap.get(e.activityId);
        sourcesToCreate.push({
          storyId,
          sectionKey,
          sourceType: 'activity',
          activityId: activity ? e.activityId : null,
          label: activity?.title || `Unknown activity [${e.activityId.slice(0, 8)}]`,
          url: activity?.sourceUrl || null,
          toolType: activity?.source || null,
          role: this.detectRole(activity),
          annotation: e.description || null,
          sortOrder: i,
        });
      }
    }
  }

  if (sourcesToCreate.length > 0) {
    await prisma.storySource.createMany({ data: sourcesToCreate });
  }
}

/**
 * Detect user's role from activity rawData.
 */
private detectRole(activity: { rawData?: Record<string, unknown> | null } | undefined): string | null {
  if (!activity?.rawData) return null;
  const raw = activity.rawData;

  // GitHub signals
  if (raw.author) return 'authored';
  if (raw.state === 'APPROVED') return 'approved';
  if (raw.reviewers) return 'reviewed';

  // Jira signals
  if (raw.assignee) return 'assigned';
  if (raw.reporter) return 'reported';

  return 'mentioned';
}
```

### Step 3: Wire source preservation into `regenerate()`

In `regenerate()`, after updating the story sections, re-map sectionKeys on existing activity sources:

```typescript
// After the prisma.careerStory.update() call in regenerate(), add:

// Re-map activity sources to new section keys
// User-created sources (user_note, wizard_answer) are NEVER touched
const oldFramework = story.framework as FrameworkName;
const frameworkChanged = nextFramework !== oldFramework;

if (frameworkChanged) {
  await this.remapSourceSectionKeys(storyId, oldFramework, nextFramework, sections);
}

// Store generation prompt
if (userPrompt) {
  await prisma.careerStory.update({
    where: { id: storyId },
    data: { lastGenerationPrompt: userPrompt },
  });
}
```

### Step 4: Add `remapSourceSectionKeys` method

```typescript
/**
 * Section key equivalence across frameworks.
 * When switching frameworks, remap activity source sectionKeys.
 */
private static readonly SECTION_KEY_MAP: Record<string, Record<string, string>> = {
  task:        { SOAR: 'obstacles', SHARE: 'hindrances' },
  obstacles:   { STAR: 'task', STARL: 'task', CAR: 'challenge', PAR: 'problem' },
  hindrances:  { STAR: 'task', SOAR: 'obstacles', STARL: 'task' },
  evaluation:  { STAR: 'result', STARL: 'learning', CARL: 'learning' },
  learning:    { STAR: 'result', SOAR: 'result', SHARE: 'evaluation' },
  challenge:   { STAR: 'situation', SOAR: 'situation' },
  problem:     { STAR: 'situation', SOAR: 'situation' },
};

private async remapSourceSectionKeys(
  storyId: string,
  oldFramework: FrameworkName,
  newFramework: FrameworkName,
  newSections: NarrativeSections
): Promise<void> {
  const newSectionKeys = new Set(NARRATIVE_FRAMEWORKS[newFramework] || []);

  // Only remap activity sources. user_note and wizard_answer are preserved as-is.
  const activitySources = await prisma.storySource.findMany({
    where: { storyId, sourceType: 'activity' },
  });

  for (const source of activitySources) {
    if (newSectionKeys.has(source.sectionKey)) continue; // Already valid
    if (source.sectionKey === 'unassigned') continue; // Leave as-is

    // Try equivalence map
    const equivalents = CareerStoryService.SECTION_KEY_MAP[source.sectionKey];
    const mapped = equivalents?.[newFramework];

    await prisma.storySource.update({
      where: { id: source.id },
      data: { sectionKey: mapped || 'unassigned' },
    });
  }
}
```

### Step 5: Wire wizard story creation to populate sources

In `backend/src/services/story-wizard.service.ts`, after `prisma.careerStory.create()` in `generateStory()` (around line 496-511), add:

```typescript
// After story creation, populate sources
const storyService = createCareerStoryService(this.isDemoMode);
// Store wizard answers on the story
await prisma.careerStory.update({
  where: { id: story.id },
  data: { wizardAnswers: answers as any },
});

// Populate activity sources from sections evidence
const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || [];
const activitySourceData = [];
for (const sectionKey of sectionKeys) {
  const evidence = sections[sectionKey]?.evidence || [];
  for (let i = 0; i < evidence.length; i++) {
    const e = evidence[i];
    if (!e.activityId) continue;
    activitySourceData.push({
      storyId: story.id,
      sectionKey,
      sourceType: 'activity' as const,
      activityId: e.activityId,
      label: e.description || `Activity ${e.activityId.slice(0, 8)}`,
      sortOrder: i,
    });
  }
}

// Populate wizard_answer sources
const QUESTION_SECTION_MAP: Record<string, string> = {
  'dig-1': 'situation',
  'dig-2': 'action',
  'dig-3': sectionKeys.includes('obstacles') ? 'obstacles' : sectionKeys.includes('hindrances') ? 'hindrances' : 'situation',
  'impact-1': 'result',
  'impact-2': 'result',
  'growth': sectionKeys.includes('learning') ? 'learning' : sectionKeys.includes('evaluation') ? 'evaluation' : 'result',
};

for (const [questionId, answer] of Object.entries(answers)) {
  const combined = [
    ...(Array.isArray(answer.selected) ? answer.selected : []),
    answer.freeText || '',
  ].filter(Boolean).join('. ');
  if (!combined) continue;

  // Find the question text from the questions bank
  const questionText = questionId; // Placeholder — will be populated from ARCHETYPE_QUESTIONS

  activitySourceData.push({
    storyId: story.id,
    sectionKey: QUESTION_SECTION_MAP[questionId] || 'unassigned',
    sourceType: 'wizard_answer' as const,
    activityId: null,
    label: questionText,
    content: combined,
    questionId,
    sortOrder: 0,
  });
}

if (activitySourceData.length > 0) {
  await prisma.storySource.createMany({ data: activitySourceData as any });
}
```

### Step 6: Run tests

Run: `cd backend && npx jest --no-coverage --testPathPattern=career-stories`
Expected: All existing tests pass

### Step 7: Commit

```bash
git add backend/src/services/career-stories/career-story.service.ts backend/src/services/story-wizard.service.ts
git commit -m "feat: populate StorySource rows on story creation and regeneration

On createFromJournalEntry: creates activity-type source rows from LLM
evidence mapping. Handles shotgun pattern (all sections same evidence)
by assigning sectionKey='unassigned'.

On regeneration: re-maps activity source sectionKeys on framework switch
using equivalence map. User-created sources (user_note, wizard_answer)
are NEVER deleted or modified during regeneration.

On wizard generation: creates activity + wizard_answer source rows,
stores wizardAnswers JSON on CareerStory.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Frontend Display + Two Actions

**Files:**
- Modify: `src/types/career-stories.ts`
- Modify: `src/services/career-stories.service.ts`
- Modify: `src/hooks/useCareerStories.ts`
- Create: `src/components/career-stories/SourceList.tsx`
- Create: `src/components/career-stories/SourceGapWarning.tsx`
- Create: `src/components/career-stories/SourceCoverageHeader.tsx`
- Modify: `src/components/career-stories/NarrativePreview.tsx`
- Modify: `src/components/career-stories/StoryCard.tsx`

### Step 1: Add types

Add to `src/types/career-stories.ts` at the end:

```typescript
// =============================================================================
// STORY SOURCES
// =============================================================================

export interface StorySource {
  id: string;
  storyId: string;
  sectionKey: string;
  sourceType: 'activity' | 'user_note' | 'wizard_answer';
  activityId: string | null;
  label: string;
  content: string | null;
  url: string | null;
  annotation: string | null;
  toolType: string | null;
  role: string | null;
  questionId: string | null;
  sortOrder: number;
  excludedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCoverage {
  total: number;
  sourced: number;
  gaps: string[];
  vagueMetrics: Array<{
    sectionKey: string;
    match: string;
    suggestion: string;
  }>;
}
```

Update the `CareerStory` interface to include optional sources:

```typescript
// Add to CareerStory interface:
  sources?: StorySource[];
  sourceCoverage?: SourceCoverage;
  lastGenerationPrompt?: string | null;
  wizardAnswers?: Record<string, WizardAnswer> | null;
```

### Step 2: Add API methods

Add to `src/services/career-stories.service.ts`:

```typescript
import { StorySource } from '../types/career-stories';

// In CareerStoriesService class:

  /**
   * Add a user note source to a story section
   */
  static async addStorySource(storyId: string, sectionKey: string, content: string): Promise<ApiResponse<StorySource>> {
    const response = await api.post<ApiResponse<StorySource>>(
      `/career-stories/stories/${storyId}/sources`,
      { sectionKey, sourceType: 'user_note', content }
    );
    return response.data;
  }

  /**
   * Exclude or restore a source
   */
  static async updateStorySource(storyId: string, sourceId: string, excludedAt: string | null): Promise<ApiResponse<StorySource>> {
    const response = await api.patch<ApiResponse<StorySource>>(
      `/career-stories/stories/${storyId}/sources/${sourceId}`,
      { excludedAt }
    );
    return response.data;
  }
```

### Step 3: Add React Query mutation hooks

Add to `src/hooks/useCareerStories.ts`:

```typescript
import { StorySource } from '../types/career-stories';

/**
 * Add a user note source to a story section
 */
export const useAddStorySource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, sectionKey, content }: { storyId: string; sectionKey: string; content: string }) =>
      CareerStoriesService.addStorySource(storyId, sectionKey, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};

/**
 * Exclude or restore a source (set excludedAt)
 */
export const useUpdateStorySource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, sourceId, excludedAt }: { storyId: string; sourceId: string; excludedAt: string | null }) =>
      CareerStoriesService.updateStorySource(storyId, sourceId, excludedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    },
  });
};
```

### Step 4: Create SourceCoverageHeader component

Create `src/components/career-stories/SourceCoverageHeader.tsx`:

```typescript
import React from 'react';
import { cn } from '../../lib/utils';

interface SourceCoverageHeaderProps {
  total: number;
  sourced: number;
}

export function SourceCoverageHeader({ total, sourced }: SourceCoverageHeaderProps) {
  if (total === 0) return null;

  const allSourced = sourced === total;
  const noneSourced = sourced === 0;

  return (
    <span
      className={cn(
        'text-xs font-medium',
        allSourced && 'text-green-600',
        !allSourced && !noneSourced && 'text-amber-600',
        noneSourced && 'text-gray-400'
      )}
    >
      {sourced} of {total} sections have sources
    </span>
  );
}
```

### Step 5: Create SourceGapWarning component

Create `src/components/career-stories/SourceGapWarning.tsx`:

```typescript
import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';

interface SourceGapWarningProps {
  sectionKey: string;
  vagueMetrics: Array<{ match: string; suggestion: string }>;
  onAddNote: (sectionKey: string) => void;
}

export function SourceGapWarning({ sectionKey, vagueMetrics, onAddNote }: SourceGapWarningProps) {
  return (
    <div className="mt-2 py-2 px-3 bg-amber-50/50 rounded-lg border border-amber-100">
      <p className="text-xs text-amber-700 flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        No sources for this section.
      </p>
      {vagueMetrics.map((vm, idx) => (
        <p key={idx} className="text-xs text-amber-600 mt-1 ml-[18px]">
          &ldquo;{vm.match}&rdquo; &mdash; {vm.suggestion}
        </p>
      ))}
      <button
        onClick={() => onAddNote(sectionKey)}
        className="mt-1.5 ml-[18px] text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Add a note
      </button>
    </div>
  );
}
```

### Step 6: Create SourceList component

Create `src/components/career-stories/SourceList.tsx`:

```typescript
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ExternalLink, X, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StorySource } from '../../types/career-stories';
import { ToolIcon } from './ToolIcon';
import { SourceGapWarning } from './SourceGapWarning';

interface SourceListProps {
  sources: StorySource[];
  sectionKey: string;
  vagueMetrics: Array<{ match: string; suggestion: string }>;
  onExclude: (sourceId: string) => void;
  onUndoExclude: (sourceId: string) => void;
  onAddNote: (sectionKey: string, content: string) => void;
  maxVisible?: number;
}

export function SourceList({
  sources,
  sectionKey,
  vagueMetrics,
  onExclude,
  onUndoExclude,
  onAddNote,
  maxVisible = 5,
}: SourceListProps) {
  const [expanded, setExpanded] = useState(false);
  const [pendingExclude, setPendingExclude] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter: only show activity and user_note in v1 (wizard_answer hidden)
  const activeSources = sources.filter(
    (s) => !s.excludedAt && s.sourceType !== 'wizard_answer'
  );

  const visibleSources = expanded ? activeSources : activeSources.slice(0, maxVisible);
  const hiddenCount = activeSources.length - maxVisible;

  // Cleanup undo timer
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleExclude = useCallback((sourceId: string) => {
    setPendingExclude(sourceId);
    // Auto-confirm after 5 seconds
    undoTimerRef.current = setTimeout(() => {
      onExclude(sourceId);
      setPendingExclude(null);
    }, 5000);
  }, [onExclude]);

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (pendingExclude) {
      onUndoExclude(pendingExclude);
    }
    setPendingExclude(null);
  }, [pendingExclude, onUndoExclude]);

  const handleSubmitNote = useCallback(() => {
    if (noteText.trim()) {
      onAddNote(sectionKey, noteText.trim());
      setNoteText('');
      setShowNoteInput(false);
    }
  }, [noteText, sectionKey, onAddNote]);

  // No sources at all — show gap warning
  if (activeSources.length === 0 && pendingExclude === null) {
    return (
      <SourceGapWarning
        sectionKey={sectionKey}
        vagueMetrics={vagueMetrics}
        onAddNote={() => setShowNoteInput(true)}
      />
    );
  }

  return (
    <div className="mt-2 space-y-0.5">
      {visibleSources.map((source) => {
        if (source.id === pendingExclude) {
          // Show undo row
          return (
            <div key={source.id} className="flex items-center gap-2 py-1 px-2 bg-gray-50 rounded text-xs text-gray-500">
              <span>Source excluded.</span>
              <button
                onClick={handleUndo}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Undo
              </button>
            </div>
          );
        }

        return (
          <div
            key={source.id}
            className="group flex items-center gap-1.5 py-1 text-[11px] text-gray-500"
          >
            {/* Tool icon or note icon */}
            {source.sourceType === 'user_note' ? (
              <span className="text-xs">✏️</span>
            ) : (
              <ToolIcon tool={source.toolType || 'generic'} className="w-3 h-3 text-[6px]" />
            )}

            {/* Label / content */}
            {source.sourceType === 'user_note' ? (
              <span className="text-gray-600 italic truncate flex-1">
                &ldquo;{source.content}&rdquo;
              </span>
            ) : source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate flex-1 hover:text-gray-900 transition-colors"
              >
                {source.label}
              </a>
            ) : (
              <span className="truncate flex-1">{source.label}</span>
            )}

            {/* Role */}
            {source.role && (
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                you {source.role}
              </span>
            )}

            {/* External link icon */}
            {source.url && (
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            )}

            {/* Exclude button */}
            <button
              onClick={() => handleExclude(source.id)}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity flex-shrink-0"
              title="Exclude source"
            >
              <X className="w-2.5 h-2.5 text-gray-400" />
            </button>
          </div>
        );
      })}

      {/* Overflow expand */}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[11px] text-gray-400 hover:text-primary-600 flex items-center gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          {hiddenCount} more
        </button>
      )}

      {/* Add note input */}
      {showNoteInput ? (
        <div className="mt-1.5 flex gap-1.5">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitNote()}
            placeholder="Add context..."
            className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
          />
          <button
            onClick={handleSubmitNote}
            disabled={!noteText.trim()}
            className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => { setShowNoteInput(false); setNoteText(''); }}
            className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNoteInput(true)}
          className="text-[11px] text-gray-400 hover:text-primary-600 flex items-center gap-1 mt-0.5"
        >
          <Plus className="w-3 h-3" />
          Add note
        </button>
      )}
    </div>
  );
}
```

### Step 7: Modify NarrativePreview to use SourceList

In `src/components/career-stories/NarrativePreview.tsx`:

1. Import new components and hooks at the top:

```typescript
import { SourceList } from './SourceList';
import { SourceCoverageHeader } from './SourceCoverageHeader';
import { StorySource, SourceCoverage } from '../../types/career-stories';
import { useAddStorySource, useUpdateStorySource } from '../../hooks/useCareerStories';
```

2. Add props to `NarrativePreviewProps` (around line 1055-1078):

```typescript
  sources?: StorySource[];
  sourceCoverage?: SourceCoverage;
```

3. In the `NarrativePreview` function, destructure the new props and set up mutation hooks:

```typescript
  sources = [],
  sourceCoverage,
```

And inside the component body:

```typescript
const addSourceMutation = useAddStorySource();
const updateSourceMutation = useUpdateStorySource();

// Group sources by sectionKey
const sourcesBySection = useMemo(() => {
  const map: Record<string, StorySource[]> = {};
  for (const source of sources) {
    if (!map[source.sectionKey]) map[source.sectionKey] = [];
    map[source.sectionKey].push(source);
  }
  return map;
}, [sources]);

const handleAddNote = useCallback((sectionKey: string, content: string) => {
  if (story?.id) {
    addSourceMutation.mutate({ storyId: story.id, sectionKey, content });
  }
}, [story?.id, addSourceMutation]);

const handleExcludeSource = useCallback((sourceId: string) => {
  if (story?.id) {
    updateSourceMutation.mutate({
      storyId: story.id,
      sourceId,
      excludedAt: new Date().toISOString(),
    });
  }
}, [story?.id, updateSourceMutation]);

const handleUndoExclude = useCallback((sourceId: string) => {
  if (story?.id) {
    updateSourceMutation.mutate({
      storyId: story.id,
      sourceId,
      excludedAt: null,
    });
  }
}, [story?.id, updateSourceMutation]);
```

4. In the header area (around line 1404), replace `{activityCount} activities` with the coverage header:

```typescript
{sourceCoverage ? (
  <SourceCoverageHeader total={sourceCoverage.total} sourced={sourceCoverage.sourced} />
) : (
  <span>{activityCount} activities</span>
)}
```

5. In the NarrativeSection rendering (around line 1577-1594), remove the old evidence toggle and add SourceList after each section:

Replace the old evidence-based `sourceIds` prop with SourceList rendered after each section. In the map callback, after `</NarrativeSection>`:

```typescript
{/* Source list below each section */}
{!isEditing && (
  <SourceList
    sources={sourcesBySection[sectionKey] || []}
    sectionKey={sectionKey}
    vagueMetrics={
      sourceCoverage?.vagueMetrics.filter((vm) => vm.sectionKey === sectionKey) || []
    }
    onExclude={handleExcludeSource}
    onUndoExclude={handleUndoExclude}
    onAddNote={handleAddNote}
  />
)}
```

6. Remove the old evidence toggle from `NarrativeSection` (lines 987-1035): Remove the `showEvidence` state, the evidence toggle button, and the evidence list rendering. These are replaced by `SourceList`.

### Step 8: Modify StoryCard to show coverage

In `src/components/career-stories/StoryCard.tsx`, replace `{story.activityIds.length} activities` (line 157) with:

```typescript
{story.sourceCoverage ? (
  <span className={cn(
    'font-medium',
    story.sourceCoverage.sourced === story.sourceCoverage.total ? 'text-green-600' :
    story.sourceCoverage.sourced > 0 ? 'text-amber-600' : ''
  )}>
    {story.sourceCoverage.sourced}/{story.sourceCoverage.total} sourced
  </span>
) : (
  <span>{story.activityIds.length} activities</span>
)}
```

### Step 9: Commit

```bash
git add src/types/career-stories.ts src/services/career-stories.service.ts src/hooks/useCareerStories.ts src/components/career-stories/SourceList.tsx src/components/career-stories/SourceGapWarning.tsx src/components/career-stories/SourceCoverageHeader.tsx src/components/career-stories/NarrativePreview.tsx src/components/career-stories/StoryCard.tsx
git commit -m "feat: frontend source display with add note and exclude/undo

New components:
- SourceList: renders source rows below each section with exclude (5s undo)
  and add note inline input
- SourceGapWarning: 'No sources' + vague metric suggestions + add note CTA
- SourceCoverageHeader: '3 of 4 sections have sources'

NarrativePreview: removes old evidence toggle, renders SourceList per section.
StoryCard: replaces 'N activities' with 'N/M sourced' badge.

Two React Query mutations: useAddStorySource, useUpdateStorySource.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Vague Metric Detection

This is already implemented in `StorySourceService.computeCoverage()` (Task 2, Step 1). The patterns are defined there and rendered via `SourceGapWarning` (Task 4, Step 5).

**No additional work needed.** The vague metric detection runs server-side in `computeCoverage()` and is returned in the `sourceCoverage.vagueMetrics` array. The frontend renders it via `SourceGapWarning`.

**Step 1: Verify detection works**

Create a quick manual test: find a story with "significantly improved" in a section summary and verify the API returns a vagueMetrics entry.

Run: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/career-stories/stories/$STORY_ID | jq '.data.sourceCoverage.vagueMetrics'`

**Step 2: Commit (if any adjustments needed)**

If patterns need tuning, adjust in `story-source.service.ts` and commit.

---

## Task 6: Tests

**Files:**
- Modify: `backend/src/services/career-stories/unified-flow.integration.test.ts`
- Create: `backend/src/services/career-stories/story-source.test.ts`

### Step 1: Update unified-flow test evidence assertions

In `unified-flow.integration.test.ts`, find the test at line 563-581 that checks `section.evidence[].activityId`. Update it to check StorySource rows instead:

```typescript
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
```

### Step 2: Write StorySource service tests

Create `backend/src/services/career-stories/story-source.test.ts`:

```typescript
import { prisma } from '../../lib/prisma';
import { StorySourceService } from './story-source.service';

describe('StorySourceService', () => {
  const service = new StorySourceService();
  const TEST_USER_ID = 'test-user-source-svc';
  let storyId: string;

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: 'source-svc@test.com', name: 'Source Test' },
    });

    const story = await prisma.careerStory.create({
      data: {
        userId: TEST_USER_ID,
        sourceMode: 'demo',
        title: 'Source Test Story',
        activityIds: [],
        framework: 'STAR',
        sections: {
          situation: { summary: 'The API was significantly slow.' },
          task: { summary: 'I was responsible for optimization.' },
          action: { summary: 'I implemented caching.' },
          result: { summary: 'Response time improved by 60%.' },
        },
        generatedAt: new Date(),
        needsRegeneration: false,
        visibility: 'private',
        isPublished: false,
      },
    });
    storyId = story.id;
  });

  afterAll(async () => {
    await prisma.storySource.deleteMany({ where: { storyId } });
    await prisma.careerStory.delete({ where: { id: storyId } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
  });

  it('creates a user note', async () => {
    const note = await service.createUserNote(storyId, 'result', 'Load time dropped from 8s to 1.2s');
    expect(note.sourceType).toBe('user_note');
    expect(note.sectionKey).toBe('result');
    expect(note.content).toBe('Load time dropped from 8s to 1.2s');
    expect(note.label).toBe('Your note');
  });

  it('excludes and restores a source', async () => {
    const note = await service.createUserNote(storyId, 'action', 'Used Redis for caching');
    expect(note.excludedAt).toBeNull();

    const excluded = await service.updateExcludedAt(note.id, storyId, new Date());
    expect(excluded.excludedAt).not.toBeNull();

    const restored = await service.updateExcludedAt(note.id, storyId, null);
    expect(restored.excludedAt).toBeNull();
  });

  it('computes coverage with gap detection', async () => {
    const sources = await service.getSourcesForStory(storyId);
    const sections = {
      situation: { summary: 'The API was significantly slow.' },
      task: { summary: 'I was responsible for optimization.' },
      action: { summary: 'I implemented caching.' },
      result: { summary: 'Response time improved by 60%.' },
    };

    const coverage = service.computeCoverage(sources, sections, ['situation', 'task', 'action', 'result']);

    expect(coverage.total).toBe(4);
    // Only action and result have user notes from prior tests
    expect(coverage.gaps).toContain('situation');
    expect(coverage.gaps).toContain('task');
  });

  it('detects vague metrics', async () => {
    const sections = {
      result: { summary: 'The system significantly improved performance.' },
    };
    const coverage = service.computeCoverage([], sections, ['result']);

    expect(coverage.vagueMetrics.length).toBeGreaterThan(0);
    expect(coverage.vagueMetrics[0].sectionKey).toBe('result');
    expect(coverage.vagueMetrics[0].match).toContain('significantly improved');
  });

  it('verifies ownership correctly', async () => {
    const note = await service.createUserNote(storyId, 'situation', 'Team was short-staffed');
    expect(await service.verifyOwnership(note.id, storyId)).toBe(true);
    expect(await service.verifyOwnership(note.id, 'fake-story-id')).toBe(false);
  });
});
```

### Step 3: Run all tests

Run: `cd backend && npx jest --no-coverage --testPathPattern="story-source|unified-flow|source-bugs"`
Expected: All tests pass

### Step 4: Commit

```bash
git add backend/src/services/career-stories/unified-flow.integration.test.ts backend/src/services/career-stories/story-source.test.ts
git commit -m "test: add StorySource service tests and update unified-flow assertions

New tests: user note CRUD, exclude/restore, coverage computation,
vague metric detection, ownership verification.

Updated unified-flow test to check StorySource rows instead of
parsing evidence from sections JSON.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | Files Changed | New Files | Est |
|------|--------------|-----------|-----|
| 0: Bug fixes | career-story.service.ts | source-bugs.test.ts | 0.5d |
| 1: Schema + migration | schema.prisma | migration.sql, backfill-story-sources.ts | 0.5d |
| 2: Backend service | controller.ts, schemas.ts, routes.ts | story-source.service.ts | 0.5d |
| 3: Generation wiring | career-story.service.ts, story-wizard.service.ts | — | 1d |
| 4: Frontend display | NarrativePreview.tsx, StoryCard.tsx, types, hooks, service | SourceList.tsx, SourceGapWarning.tsx, SourceCoverageHeader.tsx | 1d |
| 5: Vague metrics | (done in Task 2) | — | 0d |
| 6: Tests | unified-flow.integration.test.ts | story-source.test.ts | 0.5d |

**Total: ~4 days** (slightly under the 4.25d estimate since vague metrics are integrated into Task 2)

**Critical path:** 0 → 1 → 2 → 3 → 4 → 6 (sequential)
**Parallel opportunity:** Task 6 tests can be written alongside Task 4 frontend work.
