# Sources: Show the Receipts

> Every claim in a career story should trace back to where it came from.
> Where there's no proof, the page is honest about it.

**Feature name:** Sources (not "citations" — that's academic theater)

**One-sentence pitch:** Below each story section, show the real work items that back it up; where there's nothing, say so.

**Phased delivery:**
- **v1: Read-only sources + two writes** (~4.25 days) — display sources, gap detection, add note, exclude with undo
- **v2: Source curation + manual authoring** — edit, reorder, annotate, reassign, restore, create stories from raw activities

---

## Reviewers Who Shaped This

| Reviewer | Key Contribution |
|---|---|
| **RJ** (Russian Judge) | Current credibility = 2/10. Differentiator: flag what's NOT sourced |
| **GSE** (Grumpy Staff Engineer) | 3-4 day scope. Refuse inline LLM markers. Section-level is honest |
| **DLG** (End User) | "Without sources, I rewrite from scratch. With them, I edit." Show my role |
| **ET** (Edward Tufte) | 119 typography rules = chartjunk. Invert the ratio: ink on evidence, plain prose |
| **PGC** (Paul Graham) | "Citation" is wrong word. Call them "sources" or "receipts" |
| **RH** (Rich Hickey) | Extract evidence from sections JSON. One structural simplification enables everything |

---

## The Structural Simplification (RH)

### Problem: Four Concerns in One JSON Blob

`CareerStory.sections` currently holds:

```
{
  "situation": {
    "summary": "Our API authentication...",     ← TEXT (changes on regeneration)
    "evidence": [{ "activityId": "act-1" }]     ← SOURCES (should survive regeneration)
  }
}
```

When user regenerates → entire blob is replaced → curated sources are destroyed.
When user wants to add a source → must parse, modify, re-serialize the entire blob.
When we query "how many sections have sources?" → must parse JSON in application code.

### Fix: Pull Sources Into Their Own Table

```
CareerStory.sections stays as { [key]: { summary } }     ← TEXT only
StorySource (new table) holds the relationships           ← SOURCES separate

Regeneration writes new text. Sources survive.
Coverage is a SQL query. No JSON parsing.
Three source types (activities, user notes, wizard answers) are just rows.
```

This is the one change that makes everything else simple.

---

## Data Model

### New: `StorySource` table

```prisma
model StorySource {
  id         String   @id @default(cuid())
  storyId    String
  sectionKey String                          // "situation", "action", etc.

  // What kind of source
  sourceType String                          // "activity" | "user_note" | "wizard_answer"

  // Pointer to the source (activity sources only)
  activityId String?                         // FK → ToolActivity (when sourceType = "activity")
  activity   ToolActivity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
  // ^ onDelete: SetNull — if activity is deleted (re-sync), source row survives
  //   with label/url/toolType intact as historical snapshot

  // Display content
  // NOTE: label is intentionally denormalized (snapshot from ToolActivity.title at attach time).
  // Activity titles may change on re-sync; the label preserves what the user saw when they curated.
  label      String                          // display title: "PR #247: feat(auth)..." or "Your note" or question text
  content    String?                         // the actual text (user's typed note, wizard answer text)
  url        String?                         // external link (GitHub PR URL, Jira ticket URL)
  annotation String?                         // user's note about WHY this source matters to the story

  // Metadata
  toolType   String?                         // "github" | "jira" | etc. (for icon display)
  role       String?                         // "authored" | "approved" | "reviewed" | "assigned" | "led" | "supported_by" | "mentioned"
  questionId String?                         // for wizard_answer: stable question ID (e.g., "dig-1", "impact-2")
  sortOrder  Int      @default(0)            // position within section (LLM evidence order on creation, user reorder later)
  excludedAt DateTime?                       // null = included, non-null = when user excluded this source

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  story      CareerStory @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@index([storyId])
  @@index([storyId, sectionKey])
  @@index([activityId])
  @@map("story_sources")
}
```

**Why one table for all three types:**

| Source Type | `sourceType` | `activityId` | `label` | `content` | `annotation` | `url` |
|---|---|---|---|---|---|---|
| GitHub PR | `"activity"` | `"act-1"` | `"PR #247: feat(auth): add Google OAuth2"` | null | `"First provider. Established the pattern."` | `"https://github.com/..."` |
| Jira ticket | `"activity"` | `"act-2"` | `"INFRA-789: Modernize auth stack"` | null | null | `"https://jira.com/..."` |
| Security audit | `"activity"` | `"act-3"` | `"PR #301: Security audit"` | null | `"Sarah did this audit, not me. Validates my arch."` | `"https://github.com/..."` |
| User note | `"user_note"` | null | `"Your note"` | `"I chose token refresh over sessions because..."` | null | null |
| Wizard answer | `"wizard_answer"` | null | `"What was the hardest decision?"` | `"Choosing OAuth2 over SAML for multi-tenant..."` | null | null |

All three are rows in one table. The UI renders them differently based on `sourceType` + `toolType`. The data model doesn't care.

**`annotation` vs `content`:** `content` is the source's own text (what the user typed, or the wizard answer). `annotation` is the user's editorial commentary on WHY this source matters to the story. For activity sources, `content` is null (the content lives in ToolActivity), but `annotation` lets the user explain "First provider implemented — established the pattern the other 3 followed."

### Change to `CareerStory.sections` JSON

**Before:** `{ summary: string, evidence: [{ activityId, description? }] }`
**After:** `{ summary: string }` — evidence moves to `StorySource` table

The `evidence` field stays readable for backward compatibility but is no longer the source of truth. New code reads from `StorySource`. Migration copies existing `evidence[]` entries into `StorySource` rows.

### New columns on `CareerStory`

```prisma
model CareerStory {
  // ... existing fields ...

  // Generation inputs (what produced the current text)
  lastGenerationPrompt  String?   // user's regeneration instructions (overwritten each time)
  wizardAnswers         Json?     // D-I-G answers from wizard — canonical raw storage for wizard re-hydration
                                  // StorySource rows of type "wizard_answer" are the per-section display projection

  // Relation
  sources               StorySource[]
}

// Also add reverse relation on ToolActivity:
model ToolActivity {
  // ... existing fields ...
  storySources          StorySource[]
}
```

**Why `lastGenerationPrompt` not `userPrompt`:** Makes it clear this is historical — the instructions that produced the current text, not a current property of the story. After the user edits text manually, this prompt no longer describes the content. The name says so.

**Why `wizardAnswers` not `wizardContext`:** The `ExtractedContext` is a derived/processed form. Store the raw answers (`Record<string, WizardAnswer>`) so they can be displayed as Q&A pairs in the UI. The label on each `StorySource` row of type `wizard_answer` carries the question text.

---

## What the User Sees

### Story Detail (Reading Mode)

```
AUTH-123: Oauth2 Work    ✓ Interview Ready   Architect
3 of 4 sections have sources · ~0:55
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Situation
Our API authentication system relied on outdated session-based
methods that posed scalability and security challenges. As part
of the AUTH-123 initiative, the goal was to modernize...

  🔀 INFRA-789  Modernize auth stack        Jira · Done · you led
  🐙 PR #201    Remove session middleware    GitHub · merged · Jan 12

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

Task
I was tasked with leading the implementation of an OAuth2
authentication flow...

  🔀 AUTH-123  OAuth2 Authentication epic    Jira · you assigned
  ✏️ "I led this because the senior engineer left mid-sprint"
                                              Your note

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

Action
I designed the architecture for token-based authentication,
implemented OAuth2 flows for Google, GitHub, and Microsoft...

  🐙 PR #247   feat(auth): add Google OAuth2   GitHub · merged · +180/-20 · you authored
  🐙 PR #251   feat(auth): add GitHub OAuth2   GitHub · merged · +95/-10 · you authored
  🐙 PR #263   feat(auth): add MSFT provider   GitHub · merged · +210/-30 · you authored
  🐙 PR #270   feat: token refresh support     GitHub · merged · +120/-15 · you authored
  💬 Q: "What tools or approaches did you use?"
     A: "passport.js + custom middleware for token rotation"
  ▸ 1 more

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

Result
The new OAuth2 authentication module significantly improved API
reliability and reduced latency.

  ⚠ No sources for this section.
    "Significantly improved" — consider adding specific metrics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Key UI Decisions

1. **Sources are visible by default** — not hidden behind a toggle. They ARE the feature.
2. **Show titles, not counts** — `PR #247: feat(auth)...` not `[4 sources]`. Data, not metadata.
3. **Gap = empty space + warning** — the Result section has no source rows where others do. The absence is the signal. Plus one quiet line: "No sources for this section."
4. **Vague metric detection** — simple string matching: if text contains "significantly"/"greatly"/"improved" with no numbers, suggest adding specifics. No LLM needed.
5. **Header shows coverage** — "3 of 4 sections have sources" replaces "30 activities."
6. **Source lines show role** — "you authored" / "you reviewed" / "you assigned." Crucial for promo docs.
7. **Max 5 inline, then "▸ N more"** — overflow expands in-place. No sidebar for v1.
8. **No sidebar for v1** — inline sources below each section. 2-5 sources per section fits inline. Sidebar adds complexity for marginal benefit. Revisit if sections regularly have 10+ sources.
9. **Typography decoration moves to Practice Mode** — the 119 regex rules (bold indigo verbs, amber metrics, dotted underline terms) are interview-practice tools. In reading/editing mode, prose is plain. Sources do the visual work.

### Practice Mode (separate UX — deferred)

When user enters Practice Mode, the UI shifts:
- Typography decoration activates (action verbs, emphasis, delivery cues)
- Coaching tips appear in left margin
- Practice timer appears
- Sources collapse (they're for verification, not speaking practice)
- Controls: play/pause, timer, emphasis toggle, delivery help

This is a mode switch, not simultaneous display. Reading mode = sources + plain text. Practice mode = coaching + decorated text. Never both.

---

## Source Population: Where Sources Come From

### On Story Creation (from journal entry promotion)

```
1. Fetch journal entry's activityIds
2. For each activity: create StorySource row
   - sourceType: "activity"
   - activityId: the activity's id
   - sectionKey: assigned by LLM evidence mapping (or "unassigned")
   - label: activity title
   - url: activity sourceUrl
   - toolType: activity source ("github", "jira", etc.)
   - role: detected from activity rawData (author/reviewer/assignee)
3. LLM returns sections with evidence[].activityId
   - Use LLM mapping to assign sectionKey on each StorySource row
   - Activities not mapped by LLM: sectionKey = "unassigned" (shown in overflow)
```

### On Story Creation via Wizard

```
Same as above, PLUS:
4. For each wizard answer: create StorySource row
   - sourceType: "wizard_answer"
   - label: the question text (from WizardQuestion.question)
   - content: combined answer (selected options + freeText)
   - sectionKey: mapped from question phase → section
     (dig → situation, impact → result, growth → learning/evaluation)
5. Store raw answers on CareerStory.wizardAnswers
```

### On Regeneration

```
1. Text changes: CareerStory.sections is overwritten (text only, no evidence in blob)
2. Sources survive: StorySource rows are NOT deleted
3. Re-mapping: LLM returns new evidence mapping
   - Update sectionKey on existing StorySource rows based on new LLM mapping
   - Sources not re-mapped by LLM: keep previous sectionKey (user's curation preserved)
4. Store prompt: CareerStory.lastGenerationPrompt = the user's instruction
```

**Section key migration on framework switch:**

When the user switches frameworks (e.g., STAR → SOAR), section keys change. Sources with old keys become orphaned. Fix: maintain a section key equivalence map and batch-update on framework switch.

```typescript
// Section key equivalence across frameworks
const SECTION_KEY_MAP: Record<string, Record<string, string>> = {
  // STAR → SOAR
  'task':       { 'SOAR': 'obstacles' },
  // SOAR → STAR
  'obstacles':  { 'STAR': 'task', 'STARL': 'task' },
  // SHARE sections
  'hindrances': { 'STAR': 'task', 'SOAR': 'obstacles' },
  'evaluation': { 'STAR': 'result', 'STARL': 'learning', 'CARL': 'learning' },
  // Common across all
  'situation':  {}, // universal — no mapping needed
  'action':     {}, // universal
  'result':     {}, // universal
};

// On regeneration with framework change:
// 1. For each source with old sectionKey not in new framework:
//    a. Look up equivalent key in SECTION_KEY_MAP
//    b. If found: update sectionKey to equivalent
//    c. If not found: set sectionKey = "unassigned"
// 2. Let LLM re-mapping override where it provides new evidence mapping
```

**Decision:** Sources that can't be mapped to the new framework get `sectionKey = "unassigned"` and appear in an "Unassigned sources" overflow section at the bottom. User can drag them to the right section.

**Concurrent edit safety:** Regeneration MUST NOT delete `user_note` or `wizard_answer` source rows. It may only update `sectionKey` on `activity` sources based on new LLM mapping. If user is adding a note while regeneration runs, the note persists — sources and text are separate tables with no shared lock.

**This is the key win from RH's simplification:** regeneration doesn't destroy sources because they live in a separate table. The user's manual curation (adding notes, removing irrelevant sources) survives framework switches.

### User Actions on Sources

**v1 actions (ship first):**

| Action | What happens |
|---|---|
| **Click source** | If `url` exists: open in new tab. Otherwise: expand content inline |
| **Exclude source** | Set `excludedAt = now()`. Brief "Undo" link appears for 5 seconds. After timeout, row disappears. |
| **Undo exclude** | Set `excludedAt = null` (via undo link, within 5-second window) |
| **Add note** | Create new StorySource row with `sourceType: "user_note"`, user types content |

**v2 actions (curation phase):**

| Action | What happens |
|---|---|
| **Edit note** | Update `content` on existing `user_note` StorySource row |
| **Add/edit annotation** | Update `annotation` on any StorySource row (the "WHY this matters" note) |
| **Reassign section** | Update `sectionKey` on the StorySource row |
| **Reorder sources** | Update `sortOrder` on StorySource rows within a section (drag-and-drop) |
| **View excluded** | Toggle to show all excluded sources (grayed out, with restore button) |
| **Restore excluded** | Set `excludedAt = null` from the excluded view (no time limit) |

---

## Gap Detection (the differentiator)

### Section-Level Gaps

For each section, query:
```sql
SELECT COUNT(*) FROM story_sources
WHERE story_id = ? AND section_key = ? AND excluded_at IS NULL
```

If count = 0: show "No sources for this section."

### Vague Metric Detection

Simple regex on section summary text. No LLM needed.

```typescript
const VAGUE_PATTERNS = [
  { pattern: /significantly\s+(improved|reduced|increased)/i, suggestion: 'Add specific numbers' },
  { pattern: /greatly\s+(improved|reduced|enhanced)/i, suggestion: 'Add specific numbers' },
  { pattern: /improved\s+\w+\s+(?!by\s+\d)/i, suggestion: 'Consider adding "by X%"' },
  { pattern: /reduced\s+\w+\s+(?!by\s+\d|from\s+\d)/i, suggestion: 'Consider adding "from X to Y"' },
];
```

Show below the empty-source warning: `"Significantly improved" — consider adding specific metrics.`

### Coverage Header

```
"3 of 4 sections have sources" — green text if 4/4, amber if <4, red if 0
```

Replaces the current "30 activities" stat which tells the user nothing about quality.

---

## Migration Plan

### Step 0: Prerequisite Bug Fixes

These are pre-existing bugs that must be fixed before source population can work correctly:

**Bug A: `createFromJournalEntry()` doesn't set `journalEntryId`**

`career-story.service.ts` `createFromJournalEntry()` does NOT include `journalEntryId` in the `prisma.careerStory.create()` data. The wizard path (`story-wizard.service.ts:509`) does set it. Fix: add `journalEntryId: entryId` to the create call.

**Bug B: `regenerate()` finds journal by activity overlap, not FK**

`career-story.service.ts` `regenerate()` uses `journalEntries.findFirst({ where: { activityIds: { hasSome: story.activityIds } } })` instead of using the `journalEntryId` FK. This is fragile — if activities change, the wrong journal entry can be found. Fix: use `story.journalEntryId` when set, fall back to overlap query.

**Bug C: `defaultEvidence` shotgun pattern**

When LLM returns no per-section evidence, the code does `defaultEvidence = activityIds.map(id => ({ activityId: id }))` — dumps ALL activities into EVERY section. **Decision: when LLM returns no evidence for a section, create StorySource rows with `sectionKey = "unassigned"` instead of duplicating them across all sections.** This gives the user a clear curation task ("12 unassigned sources") rather than false attribution.

### Step 1: Create `StorySource` table

```sql
CREATE TABLE story_sources (
  id           TEXT PRIMARY KEY,
  story_id     TEXT NOT NULL REFERENCES career_stories(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,
  source_type  TEXT NOT NULL,         -- 'activity' | 'user_note' | 'wizard_answer'
  activity_id  TEXT REFERENCES tool_activities(id) ON DELETE SET NULL,
  label        TEXT NOT NULL,
  content      TEXT,
  url          TEXT,
  annotation   TEXT,                  -- user's note about WHY this source matters
  tool_type    TEXT,
  role         TEXT,
  question_id  TEXT,                  -- for wizard_answer: stable question ID
  sort_order   INTEGER NOT NULL DEFAULT 0,
  excluded_at  TIMESTAMP,            -- null = included, non-null = when excluded
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_sources_story ON story_sources(story_id);
CREATE INDEX idx_story_sources_story_section ON story_sources(story_id, section_key);
CREATE INDEX idx_story_sources_activity ON story_sources(activity_id);
```

### Step 2: Backfill from existing `sections.evidence`

For each CareerStory, for each section, for each evidence entry:
- Create a `StorySource` row with `sourceType: "activity"`, hydrate `label`/`url`/`toolType` from the linked `ToolActivity`

**Backfill edge cases:**

| Edge Case | Handling |
|---|---|
| **`activityId` doesn't exist in `ToolActivity`** | Create row with `activityId = null`, `label = "Unknown activity [id]"`. LLM sometimes hallucinates IDs. |
| **Demo-mode stories** (`sourceMode = 'demo'`) | Backfill both demo and production. Demo sources reference demo `ToolActivity` rows. |
| **Duplicate evidence** (same activityId in multiple sections) | Create one `StorySource` row per section occurrence. Same activity can be relevant to multiple sections. Use `UPSERT` on `(storyId, sectionKey, activityId)` to prevent duplicates within a section. |
| **Empty `evidence[]` arrays** | Skip — no source rows created. Section will show gap warning. |
| **`evidence[].description` field** | Store as `annotation` on the StorySource row (this was the LLM's rationale for linking the activity). |

### Step 3: Add columns to `CareerStory`

```sql
ALTER TABLE career_stories ADD COLUMN last_generation_prompt TEXT;
ALTER TABLE career_stories ADD COLUMN wizard_answers JSONB;
```

### Step 4: Update `sections` JSON

Going forward, new sections written as `{ summary: string }` only. Old sections with `evidence[]` still readable (backward compat) but `StorySource` table is source of truth.

---

## API Changes

### v1 Endpoints

#### GET `/api/v1/career-stories/stories/:id`

Response adds `sources` array (all fields returned, frontend renders subset in v1):

```typescript
{
  // ... existing CareerStory fields ...
  sources: Array<{
    id: string;
    sectionKey: string;
    sourceType: 'activity' | 'user_note' | 'wizard_answer';
    activityId: string | null;
    label: string;
    content: string | null;
    url: string | null;
    annotation: string | null;     // populated but not rendered in v1 UI
    toolType: string | null;
    role: string | null;
    questionId: string | null;     // populated but not rendered in v1 UI
    sortOrder: number;             // used for ordering, not user-editable in v1
    excludedAt: string | null;     // ISO timestamp or null (null = included)
    createdAt: string;
    updatedAt: string;
  }>;
  sourceCoverage: {
    total: number;           // total sections
    sourced: number;         // sections with ≥1 non-excluded source
    gaps: string[];          // section keys with no sources
    vagueMetrics: Array<{    // sections with vague language
      sectionKey: string;
      match: string;         // the vague phrase
      suggestion: string;    // what to do about it
    }>;
  };
}
```

#### POST `/api/v1/career-stories/stories/:storyId/sources`

v1: user can only add notes (the one write that fills gaps):

```typescript
{
  sectionKey: string;
  sourceType: 'user_note';        // only type user can create in v1
  content: string;                 // the note text
}
```

Backend sets `label = "Your note"`, `toolType = null`, `role = null`, `sortOrder = next in section`.

#### PATCH `/api/v1/career-stories/stories/:storyId/sources/:sourceId`

v1: exclude/restore only (restore via brief undo link):

```typescript
{
  excludedAt: string | null;       // ISO timestamp to exclude, null to restore
}
```

#### DELETE — deferred to v2

No hard deletes in v1. Exclude (soft delete) is sufficient.

### v2 Endpoint Expansions

When curation ships, the same endpoints expand:

**POST** accepts all `sourceType` values + `annotation`, `questionId` fields.

**PATCH** accepts additional fields:
```typescript
{
  sectionKey?: string;       // reassign to different section
  excludedAt?: string | null;
  annotation?: string | null; // add/edit "WHY this matters" note
  content?: string;          // edit text (user_note only)
  sortOrder?: number;        // reorder within section
}
```

**DELETE** added for hard-deleting user notes.

---

## Frontend Components

### v1 Components

#### New: `SourceList.tsx` (~80 lines)

```typescript
interface SourceListProps {
  sources: StorySource[];
  sectionKey: string;
  onExclude: (sourceId: string) => void;
  onUndoExclude: (sourceId: string) => void;
  onAddNote: (sectionKey: string, content: string) => void;
  maxVisible?: number;       // default 5
}
```

5 props. Renders source rows below a section. Each row: tool icon + label + role + external link. User notes show content text. Wizard answers not rendered in v1 (exist in data, hidden from UI — internal coaching context).

After excluding, a brief "Undo" link appears on that row for 5 seconds. After timeout, row disappears. State managed locally with `useState` + `setTimeout` — no separate excluded view needed.

Handles expand/collapse for overflow ("▸ N more"). Shows `<SourceGapWarning>` when active sources count is 0.

#### New: `SourceGapWarning.tsx` (~40 lines)

```typescript
interface SourceGapWarningProps {
  sectionKey: string;
  vagueMetrics: Array<{ match: string; suggestion: string }>;
  onAddNote: (sectionKey: string) => void;
}
```

The "No sources for this section" message + vague metric suggestions + "Add a note" button.

#### New: `SourceCoverageHeader.tsx` (~30 lines)

```typescript
interface SourceCoverageHeaderProps {
  total: number;
  sourced: number;
}
```

Renders "3 of 4 sections have sources" in the story header, replacing "30 activities."

#### Modified: `NarrativeSection` (in `NarrativePreview.tsx`)

Changes:
- Remove `evidence` toggle and inline evidence list (lines 987-1035) — replaced by `SourceList`
- Remove `sourceIds` prop — sources come as separate prop
- Add `sources` prop: `StorySource[]` filtered for this section
- Render `<SourceList>` after section text (always visible, not toggled)
- Typography decoration stays as-is (no Practice Mode change in v1)

**Net change to NarrativePreview.tsx:** ~50 lines removed (old evidence), ~20 lines added (new source list rendering). File gets smaller, not bigger.

#### Modified: `NarrativePreview` (main component)

Changes:
- Accept `sources: StorySource[]` prop (from API response)
- Accept `sourceCoverage` prop
- Group sources by sectionKey for passing to `NarrativeSection`
- Filter out excluded sources (`excludedAt !== null`) before passing down
- Render `SourceCoverageHeader` in header area
- Pass source action handlers (exclude, undo exclude, add note)

#### Modified: `StoryCard.tsx`

Replace "30 activities" with "3/4 sourced" badge. Color coding: green = all sourced, amber = partial, no badge = zero (draft). Activity count moves to tooltip.

#### React Query Hooks

```typescript
// Sources are included in story response, no separate query needed
// v1 mutations (two only):
useAddStorySource()       // POST /stories/:id/sources (user_note only)
useUpdateStorySource()    // PATCH /stories/:id/sources/:sourceId (excludedAt only)
```

Invalidates `['career-stories', 'stories', storyId]` on mutation success.

### v2 Component Expansions

When curation ships, `SourceList` grows:
- `onEditAnnotation`, `onEditContent`, `onReorder` handlers
- `showExcluded` toggle prop (view grayed-out excluded sources with restore buttons)
- Drag-and-drop for `sortOrder` manipulation
- Annotation display below each source row
- Wizard answer rendering (Q&A format)

These are the same curation patterns reused for **manual story authoring** (see v2 Scope).

---

## What We Are NOT Building (ever)

| Excluded | Why |
|---|---|
| Inline citation markers in LLM prose (`[1]`, `[cite:id]`) | LLM can't reliably attribute claims to specific activities. Degrades narrative quality. |
| Per-claim confidence scoring | No clear definition. Would need second LLM pass. Fake precision. |
| LLM prompt changes for citation generation | The LLM synthesizes from journal content, not individual activities. The mapping is lossy by design. |
| Sidebar panel | Inline sources below sections is sufficient for 2-5 sources per section. Less complexity. |
| Per-word source linking | Section-level granularity is honest. Per-word is theater. |

---

## v1 Build Order

| # | Task | What | Est |
|---|---|---|---|
| **0** | **Prerequisite bug fixes** | Fix `journalEntryId` in `createFromJournalEntry()`, fix `regenerate()` to use FK, fix `defaultEvidence` → `"unassigned"` | 0.5d |
| **1** | **Schema + migration** | Create `story_sources` table (full schema incl dormant fields), add 2 columns to `career_stories`, backfill with edge case handling | 0.5d |
| **2** | **Backend: source read + two writes** | `StorySourceService`: read, create (user_note), exclude/restore. Include sources in story GET. Source coverage computation. | 0.5d |
| **3** | **Backend: generation wiring** | On story creation + wizard: populate StorySource rows. On regeneration: section key migration, preserve user sources, store `lastGenerationPrompt` + `wizardAnswers`. | 1d |
| **4** | **Frontend: display + two actions** | `SourceList`, `SourceGapWarning`, `SourceCoverageHeader`. Wire into NarrativePreview. Remove old evidence toggle. Update StoryCard. "Add note" + "Exclude with undo" only. | 1d |
| **5** | **Vague metric detection** | Regex detection of unsupported vague claims. Show in SourceGapWarning. | 0.25d |
| **6** | **Tests** | Update broken `unified-flow` test. New tests: source creation, survive regeneration, framework switch, exclude/restore, coverage. | 0.5d |

**v1 Total: ~4.25 days**

**Critical path:** 0 → 1 → 2 → 3 → 4 (sequential)
**Parallel after step 3:** Steps 5 and 6 can run alongside step 4.

---

## v2 Scope: Source Curation + Manual Authoring

**Prerequisite:** v1 schema is complete — no migration needed. v2 is frontend + PATCH endpoint expansion.

### v2a: Source Curation (on existing stories)

| Feature | What |
|---|---|
| Edit annotation | Add/edit "WHY this matters" note on any source |
| Edit note content | Modify text of `user_note` sources |
| Reorder sources | Drag-and-drop within section (`sortOrder` manipulation) |
| Reassign section | Move source to a different section |
| View excluded | Toggle to see grayed-out excluded sources with restore buttons |
| Wizard answer display | Render `wizard_answer` sources as Q&A pairs |

### v2b: Manual Story Authoring (from raw activities)

The curation patterns above become the foundation for a **third story creation path** (alongside journal promotion and wizard):

| Entry Point | Flow |
|---|---|
| **Activities tab → "Create story from selected"** | User multi-selects activities → lands in curation view with activities as unassigned sources → picks framework → assigns to sections → adds notes for context → generates narrative |
| **New Story → blank curation workspace** | User creates empty story → browses/searches activities to add as sources → assigns to sections → generates |

Both flows reuse the same `StorySource` CRUD, the same `SourceList` component, and the same assign/reorder/annotate interactions. The `StorySource` table is the shared primitive — whether you're curating sources on an existing story or building a new one from scratch.

### v2c: Practice Mode Separation

| Feature | What |
|---|---|
| Typography decoration toggle | Move 119 regex rules behind Practice Mode |
| Reading mode | Plain text + sources (no bold verbs, amber metrics, dotted underlines) |
| Practice mode | Coaching tips + decorated text + timer. Sources collapse. |

### v2d: Published View Sources

| Feature | What |
|---|---|
| Viewer sees sources | Activity labels + toolType (no external links — viewer may not have repo access) |
| Viewer sees user notes | Content text (read-only) |
| Hidden from viewer | Wizard answers, annotations, excluded sources |
| Coverage header | Same "3 of 4 sections have sources" — honesty is the feature |

---

## v1 Files That Change

| File | Change | Step |
|---|---|---|
| `backend/src/services/career-stories/career-story.service.ts` | **Bug fix:** set `journalEntryId` in `createFromJournalEntry()`, use FK in `regenerate()`, fix `defaultEvidence` → `"unassigned"` | 0 |
| `backend/prisma/schema.prisma` | New `StorySource` model, reverse relation on `ToolActivity`, 2 new columns on `CareerStory` | 1 |
| `backend/prisma/migrations/` | New migration: create table + backfill + alter + edge case handling | 1 |
| `backend/src/services/career-stories/story-source.service.ts` | **New.** Read, create (user_note), exclude/restore. Coverage computation. Section key migration. | 2 |
| `backend/src/controllers/career-stories.controller.ts` | Source endpoints (POST user_note, PATCH excludedAt), include sources in story GET | 2 |
| `backend/src/services/career-stories/career-story.service.ts` | Populate StorySource rows on create/regenerate, framework switch re-mapping | 3 |
| `backend/src/services/story-wizard.service.ts` | Store `wizardAnswers`, create `wizard_answer` source rows | 3 |
| `src/types/career-stories.ts` | `StorySource` type, `SourceCoverage` type, update `CareerStory` interface | 4 |
| `src/services/career-stories.service.ts` | API calls for add note + exclude source | 4 |
| `src/hooks/useCareerStories.ts` | Two mutation hooks: `useAddStorySource`, `useUpdateStorySource` | 4 |
| `src/components/career-stories/SourceList.tsx` | **New.** Source rows below each section (display + exclude with undo + add note) | 4 |
| `src/components/career-stories/SourceGapWarning.tsx` | **New.** Empty section + vague metric warning | 4/5 |
| `src/components/career-stories/SourceCoverageHeader.tsx` | **New.** "3 of 4 sections have sources" | 4 |
| `src/components/career-stories/NarrativePreview.tsx` | Remove old evidence toggle, add SourceList rendering, accept sources prop | 4 |
| `src/components/career-stories/StoryCard.tsx` | Replace "30 activities" with "3/4 sourced" badge | 4 |
| `backend/src/services/career-stories/unified-flow.integration.test.ts` | Update evidence assertions to use StorySource table | 6 |

**v2 additional files** (when curation ships):

| File | Change |
|---|---|
| `src/components/career-stories/SourceList.tsx` | Add annotation display, edit handlers, drag-and-drop reorder, excluded toggle |
| `src/components/career-stories/NarrativePreview.tsx` | Move typography decoration behind Practice Mode flag |
| `backend/src/controllers/career-stories.controller.ts` | Expand PATCH to accept `annotation`, `content`, `sectionKey`, `sortOrder`. Add DELETE. |
| `backend/src/services/career-stories/story-publishing.service.ts` | Include non-excluded sources in published story response, viewer-level filtering |
| `src/components/career-stories/ActivityBrowser.tsx` | **New.** Browse/search activities for manual story authoring |
| `src/components/career-stories/StoryAuthoringWorkspace.tsx` | **New.** Blank canvas: assign activities to sections, add notes, generate |

---

## Appendix: ExtractedContext → StorySource Mapping

The wizard's `answersToContext()` (story-wizard.service.ts:261) maps D-I-G answers to:

| Answer Field | D-I-G Phase | Maps to `sectionKey` |
|---|---|---|
| `realStory` | DIG (question 1) | `situation` |
| `keyDecision` | DIG (question 2) | `action` |
| `obstacle` | DIG (question 3) | `situation` or `obstacles`/`hindrances` |
| `counterfactual` | IMPACT (question 1) | `result` |
| `metric` | IMPACT (question 2) | `result` |
| `evidence` | IMPACT (question 3) | `result` |
| `learning` | GROWTH (question 1) | `learning`/`evaluation` (STARL/SHARE/CARL) |
| `namedPeople` | Extracted from DIG-2 | not a source, but metadata |

Each non-empty answer becomes a `StorySource` row with:
- `sourceType: "wizard_answer"`
- `label`: the question text
- `content`: the combined answer (selected + freeText)
- `sectionKey`: mapped from D-I-G phase to framework section

---

## Appendix: Role Detection from Activity rawData

```typescript
function detectRole(activity: ToolActivity, userId: string): string | null {
  const raw = activity.rawData as Record<string, unknown> | null;
  if (!raw) return null;

  // GitHub: check author, reviewer, approver
  if (raw.author === userId || raw.author === userGitHubUsername) return 'authored';
  if (raw.state === 'APPROVED' && (raw.reviewers as string[])?.includes(userId)) return 'approved';
  if ((raw.reviewers as string[])?.includes(userId)) return 'reviewed';
  if ((raw.requestedReviewers as string[])?.includes(userId)) return 'review requested';

  // Jira: check assignee/reporter
  if (raw.assignee === userId) return 'assigned';
  if (raw.reporter === userId) return 'reported';

  // Leadership signals (from activity title/description heuristics)
  // "led" and "supported_by" are set manually via annotation, not auto-detected

  // Default
  return 'mentioned';
}
```

**Full role values:** `authored` | `approved` | `reviewed` | `review requested` | `assigned` | `reported` | `led` | `supported_by` | `mentioned`

- `authored`, `approved`, `reviewed`, `assigned`, `reported` — auto-detected from rawData
- `led`, `supported_by` — set manually by user via annotation ("Sarah led this, I supported")

This runs once at source population time. The role is stored on the `StorySource` row and displayed in the UI. No re-computation needed.

---

## Appendix: Frontend `StorySource` Type

Add to `src/types/career-stories.ts`:

```typescript
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
  excludedAt: string | null;    // ISO timestamp or null
  createdAt: string;
  updatedAt: string;
}

export interface SourceCoverage {
  total: number;                // total sections in the framework
  sourced: number;              // sections with >= 1 non-excluded source
  gaps: string[];               // section keys with no sources
  vagueMetrics: Array<{
    sectionKey: string;
    match: string;              // the vague phrase found
    suggestion: string;         // what to do about it
  }>;
}

// Update CareerStory interface — add:
//   sources?: StorySource[];
//   sourceCoverage?: SourceCoverage;
//   lastGenerationPrompt?: string | null;
//   wizardAnswers?: Record<string, WizardAnswer> | null;
```

---

## Appendix: `verification` Column Decision

**Decision: Leave `CareerStory.verification Json?` dormant.** Do not repurpose or drop.

Rationale: The `verification` column was designed for per-claim fact-checking (`[{ claim, status, suggestion }]`). The sources feature operates at section level, not claim level. These are different abstractions. If we later add claim-level verification (e.g., LLM-powered fact-checking against source content), the column is already there. Dropping it in the sources migration adds risk for zero benefit. Repurposing it conflates two concerns.

**Action:** No schema change. Add a code comment: `// verification: reserved for future per-claim fact-checking. See sources-design.md.`

---

## Appendix: Test Plan

### Tests That Will Break

| Test File | What Breaks | Fix |
|---|---|---|
| `unified-flow.integration.test.ts:563-581` | Checks `section.evidence[].activityId` in sections JSON | Update to check `StorySource` rows via Prisma query instead of parsing sections JSON |

### v1 New Tests Required

| Test | What It Verifies | v1 Step |
|---|---|---|
| **Backfill migration** | Existing story with `sections.evidence` entries → StorySource rows created with correct data, edge cases handled | 1 |
| **Source read + coverage** | Story GET returns sources array + `sourceCoverage` with correct gap/sourced counts | 2 |
| **Add user note** | POST creates `user_note` StorySource row in correct section | 2 |
| **Exclude/restore source** | PATCH sets `excludedAt` timestamp, PATCH with `null` clears it | 2 |
| **Deleted activity graceful degradation** | Delete a `ToolActivity` → verify StorySource row survives with `activityId = null`, label/url intact | 2 |
| **Source creation on story create** | `createFromJournalEntry()` creates `StorySource` rows of type `activity` with correct sectionKey, label, url, toolType, role | 3 |
| **Source creation via wizard** | `generateStory()` creates both `activity` and `wizard_answer` StorySource rows; `wizardAnswers` JSON stored on CareerStory | 3 |
| **Sources survive regeneration** | Create story → add `user_note` source → regenerate → verify user_note row unchanged, activity rows re-mapped | 3 |
| **Framework switch re-maps sectionKeys** | Create STAR story → regenerate as SOAR → verify `task` sources moved to `obstacles` or `unassigned` | 3 |
| **`lastGenerationPrompt` persistence** | Regenerate with userPrompt → verify column updated, previous value overwritten | 3 |
| **Vague metric detection** | Section containing "significantly improved" returns vague metric warning in `sourceCoverage.vagueMetrics` | 5 |
