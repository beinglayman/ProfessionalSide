# Gap Analysis: Wizard + Career Story Generation Pipeline

> **Date**: 2026-02-12
> **Status**: ANALYSIS COMPLETE
> **Reviewers**: RJ (5/10), GSE (Hard Pass on pre-detection), DLG (end-user audit)
> **Verdict**: Fix input quality, not wizard speed

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture (Current)](#2-system-architecture-current)
3. [Data Flow Trace](#3-data-flow-trace)
4. [Gap #1: Input Starvation](#4-gap-1-input-starvation)
5. [Gap #2: D-I-G Question Overload](#5-gap-2-d-i-g-question-overload)
6. [Gap #3: Format7Data Nulled in Wizard](#6-gap-3-format7data-nulled-in-wizard)
7. [Gap #4: Evaluation is Surface-Level](#7-gap-4-evaluation-is-surface-level)
8. [Gap #5: Coaching is Abstract](#8-gap-5-coaching-is-abstract)
9. [Gap #6: Hook Generation is Static](#9-gap-6-hook-generation-is-static)
10. [Gap #7: ExtractedContext Directive is Weak](#10-gap-7-extractedcontext-directive-is-weak)
11. [Gap #8: No Post-Generation Fact-Check](#11-gap-8-no-post-generation-fact-check)
12. [Pre-Detection Proposal (Deferred)](#12-pre-detection-proposal-deferred)
13. [Priority Stack](#13-priority-stack)
14. [Assumptions & Failure Modes (RJ Audit)](#14-assumptions--failure-modes-rj-audit)
15. [Model Selection Analysis](#15-model-selection-analysis)
16. [Cross-Tool Intelligence](#16-cross-tool-intelligence)
17. [Activity Ranking & Capping](#17-activity-ranking--capping)
18. [Refactoring Opportunities (GSE+DLG Pass)](#18-refactoring-opportunities-gsedlg-pass)
19. [File Reference Index](#19-file-reference-index)

---

## 1. Executive Summary

### The One-Sentence Diagnosis

> The wizard asks users to type what the system already knows, then feeds that to an LLM
> that doesn't have access to the actual evidence, producing stories too generic for real interviews.

### What Users Experience

```
User opens wizard
    |
    v
Step 1: "Analyzing..." (2-5s) --> Archetype revealed (cool but unhelpful)
    |
    v
Step 2: 6 generic questions --> User types from memory (system has the data!)
    |
    v
Step 3: "Generating..." (8-15s) --> LLM writes from summaries of summaries
    |
    v
Output: "I improved system performance" --> Too vague for any real interview
    |
    v
User: Tries "Regenerate" --> Same inputs = same vague output
    |
    v
User: Gives up, copies to Google Docs, edits manually
```

### Reviewer Consensus

| Reviewer | Pre-Detection Score | Priority #1 | Priority #2 | Priority #3 |
|----------|-------------------|-------------|-------------|-------------|
| **RJ**   | 5/10              | Input starvation | Remove Step 1 UI | Pre-fill D-I-G from data |
| **GSE**  | Hard Pass          | Input starvation (1-2d) | Fast D-I-G: 3 not 6 (0.5d) | Pass Format7Data (0.25d) |
| **DLG**  | Dead Last          | Input starvation | Gap-targeted questions | Actionable coaching |

---

## 2. System Architecture (Current)

```
                              THE PIPELINE
  ============================================================================

  INGESTION                CLUSTERING              JOURNAL                WIZARD                 CAREER STORY
  ─────────                ──────────              ───────                ──────                 ────────────

  GitHub API ─┐                                    ┌─────────────┐       ┌──────────────┐       ┌──────────────┐
  Jira API ──┤  ┌──────────┐  ┌───────────┐       │ JournalEntry│       │ StoryWizard  │       │ CareerStory  │
  Slack API ─┼─>│ToolActiv.│─>│ Clustering │──────>│             │──────>│   Modal      │──────>│              │
  Conflu. ───┤  │          │  │ (2-layer)  │       │ fullContent │       │              │       │ sections{}   │
  Figma ─────┘  │ rawData{}│  │            │       │ format7Data│       │ 3 steps:     │       │ sources[]    │
                │ title    │  │ L1:heurist.│       │ activityIds│       │  analyze     │       │ wizardAns{}  │
                │ desc.    │  │ L2:Haiku   │       │ skills[]   │       │  questions   │       │ archetype    │
                │ crossRefs│  └───────────┘       │ category   │       │  generate    │       │ framework    │
                └──────────┘                       └─────────────┘       └──────────────┘       └──────────────┘
                     │                                    │                      │                      │
                     │                                    │                      │                      │
                     v                                    v                      v                      v
               ┌──────────┐                        ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
               │ rawData: │                        │ Journal LLM  │       │ Career Story │       │ StorySource  │
               │  body    │                        │ SEES:        │       │ LLM SEES:    │       │ table:       │
               │  labels  │                        │  ✅ rawData  │       │  ✅ fullCont.│       │  activity    │
               │  reviews │                        │  ✅ titles   │       │  ✅ desc.    │       │  user_note   │
               │  commits │                        │  ✅ desc.    │       │  ✅ category │       │  wizard_ans  │
               │  author  │                        │  ✅ crossRef │       │  ❌ rawData  │       └──────────────┘
               │  headRef │                        │  ✅ context  │       │  ❌ phases   │
               │  changes │                        │              │       │  ❌ skills   │
               └──────────┘                        │ PRODUCES:    │       │  ❌ role     │
                                                   │  fullContent │       │  ❌ impacts  │
                                                   │  format7Data │       │              │
                                                   └──────────────┘       │ ALSO GETS:   │
                                                                          │  ✅ archetype│
                                                                          │  ✅ D-I-G ans│
                                                                          └──────────────┘


  THE PROBLEM: Career Story LLM writes from fullContent (a summary)
               instead of rawData (the actual evidence).
               It's writing a story about a story about the work.
```

### Three Generation Paths

```
PATH 1: WIZARD (story-wizard.service.ts)
  JournalEntry → analyzeEntry() → D-I-G questions → generateStory()
  ⚠️ DOES NOT query format7Data
  ⚠️ Sets phases=null, skills=null, dominantRole=null
  ⚠️ Never fetches raw activity data

PATH 2: PROMOTE (career-story.service.ts:createFromJournalEntry)
  JournalEntry → generateSectionsWithLLM()
  ✅ Queries format7Data
  ✅ Extracts phases, impactHighlights, skills conditionally
  ⚠️ Still no raw activity data to LLM

PATH 3: REGENERATE (career-story.service.ts:regenerate)
  CareerStory → find JournalEntry → generateSectionsWithLLM()
  ✅ Same as PATH 2, plus style + userPrompt
  ⚠️ Same input starvation
```

---

## 3. Data Flow Trace

### What ToolActivity.rawData Contains (GitHub PR Example)

```typescript
// FILE: backend/src/services/mcp/transformers/github.transformer.ts (lines 77-108)
rawData: {
  number: 42,                                          // PR number
  state: 'merged',                                     // PR state
  additions: 450,                                      // ✅ Sent (as "+450")
  deletions: 120,                                      // ✅ Sent (as "/-120")
  changedFiles: 15,                                    // ✅ Sent (as "15 files")
  reviews: 3,                                          // ✅ Sent (as "3 reviews")
  commits: 8,                                          // ✅ Sent (as "8 commits")
  author: 'honey.arora',                               // ✅ Sent (as "author: honey.arora")
  reviewers: ['bob.chen', 'sarah.kim'],                // ✅ Sent (as "reviewers: bob.chen, sarah.kim")
  body: '## Summary\nImplement OAuth2 auth flow...',   // ❌ NEVER SENT — THE BIG ONE
  labels: ['security', 'breaking-change'],             // ❌ NEVER SENT
  isDraft: false,                                      // ❌ NEVER SENT
  headRef: 'feature/oauth2-auth',                      // ❌ NEVER SENT
  baseRef: 'main',                                     // ❌ NEVER SENT
}
```

> **Note**: This is the GitHub PR shape only. For all 13 tool subtypes' rawData fields (including 6 with body-equivalent content), see [Section 16: Cross-Tool Intelligence](#16-cross-tool-intelligence).

### What the Journal LLM Receives Per Activity

```
// FILE: backend/src/services/ai/prompts/journal-narrative.prompt.ts (lines 123-156)
// Function: formatEnhancedActivitiesForPrompt()

- [May 15] GITHUB: feat(auth): implement OAuth2 authentication flow
  Description: Closes AUTH-123. Implements the design from...
  Context: author: honey.arora, merged, +450/-120, 15 files, 3 reviews, 8 commits,
           reviewers: bob.chen, sarah.kim
  Related: AUTH-123, acme/backend#42
  [id: abc123]
```

**What's extracted from rawData** (function `extractRawDataContext`, lines 168-188):

| Field | Extracted? | Format |
|-------|-----------|--------|
| `author` | ✅ | `author: honey.arora` |
| `state` | ✅ | `merged` |
| `additions/deletions` | ✅ | `+450/-120` |
| `changedFiles` | ✅ | `15 files` |
| `reviews` | ✅ | `3 reviews` |
| `commits` | ✅ | `8 commits` |
| `reviewers` | ✅ | `reviewers: bob.chen, sarah.kim` |
| **`body`** | ❌ | **NEVER EXTRACTED** |
| **`labels`** | ❌ | **NEVER EXTRACTED** |
| **`headRef`** | ❌ | **NEVER EXTRACTED** |
| **`baseRef`** | ❌ | **NEVER EXTRACTED** |
| **`isDraft`** | ❌ | **NEVER EXTRACTED** |

### What the Career Story LLM Receives (Wizard Path)

```typescript
// FILE: backend/src/services/story-wizard.service.ts (lines 493-503)

const journalEntryContent: JournalEntryContent = {
  title: entry.title || 'Untitled',        // ✅
  description: entry.description,           // ✅
  fullContent: entry.fullContent,           // ✅ (but this is already an LLM summary)
  category: entry.category,                 // ✅
  dominantRole: null,                       // ❌ NULLED — format7Data has this
  phases: null,                             // ❌ NULLED — format7Data has this
  impactHighlights: extractedContext.metric  // ⚠️ Only from wizard answer, not format7Data
    ? [extractedContext.metric]
    : null,
  skills: null,                             // ❌ NULLED — format7Data has this
  activityIds: entry.activityIds,           // ✅ (but just IDs, not data)
};
```

### What the Career Story LLM Receives (Promote/Regenerate Path)

```typescript
// FILE: backend/src/services/career-stories/career-story.service.ts (lines 436-457)

const f7 = content.format7Data || {};
const journalEntry: JournalEntryContent = {
  title,
  description: content.description,                                   // ✅
  fullContent: content.fullContent,                                   // ✅
  category: content.category,                                         // ✅
  dominantRole: f7.dominantRole || f7.context?.primary_focus || null, // ✅ conditional
  phases: f7.phases?.map(...) || f7.frameworkComponents?.map(...),    // ✅ conditional
  impactHighlights: f7.impactHighlights || f7.summary?.skills_demonstrated, // ✅ conditional
  skills: f7.summary?.technologies_used || null,                      // ✅ conditional
  activityIds,                                                        // ✅ (just IDs)
};
```

### Side-by-Side: What Each LLM Path Gets

```
                    Journal LLM          Wizard Path        Promote/Regen Path
                    ───────────          ───────────        ──────────────────
  Raw activities    ✅ full details      ❌ nothing         ❌ nothing
  Activity body     ❌ NOT extracted     ❌ nothing         ❌ nothing
  fullContent       N/A (generates it)  ✅ passed          ✅ passed
  description       ✅ passed           ✅ passed          ✅ passed
  phases            N/A                 ❌ NULLED          ✅ conditional
  skills            N/A                 ❌ NULLED          ✅ conditional
  dominantRole      N/A                 ❌ NULLED          ✅ conditional
  impactHighlights  N/A                 ⚠️ only wizard     ✅ conditional
  archetype         N/A                 ✅ passed          ❌ not passed
  extractedContext  N/A                 ✅ passed          ❌ not available
  style             N/A                 ❌ not available   ✅ regen only
  userPrompt        N/A                 ❌ not available   ✅ regen only
```

---

## 4. Gap #1: Input Starvation

### Severity: CRITICAL
### Impact: Stories are too generic for real interviews
### Effort: 2.5 days (includes per-tool adapter, secret scanner, activity cap — see §16-17)

### The Problem

The Career Story LLM receives `fullContent` — which is itself an LLM-generated summary
of raw activities. The career story is a **third-order derivative**:

```
Raw Activity Data (PR body, Jira details, commit messages)
    ↓ Journal LLM processes
Journal fullContent (narrative summary)
    ↓ Career Story LLM processes
Career Story Sections (framework-formatted)
    ↓ User reads
"I implemented a solution that improved performance"  ← USELESS
```

### What's Lost at Each Stage

**Stage 1: ToolActivity.rawData → Journal LLM input**

Lost fields (never extracted by `extractRawDataContext()`):
- `body`: Full PR description with summary, technical approach, test plan, breaking changes
- `labels`: ["security", "breaking-change", "needs-qa"]
- `headRef`: Feature branch name (e.g., "feature/oauth2-auth")
- Jira: `description`, `acceptanceCriteria`, `comments`
- Slack: `message text`, `thread context`
- Confluence: `full page content`, `comments`

**Stage 2: Journal fullContent → Career Story LLM input**

Lost fields (wizard path nulls them):
- `phases`: Work phases with summaries and activity mappings
- `skills`: Technologies demonstrated
- `dominantRole`: Led / Contributed / Participated
- `impactHighlights`: Specific measurable outcomes
- `activityEdges`: Primary vs supporting vs contextual classification

### Concrete Example

**What's in rawData.body (available but never used):**
```markdown
## Summary
Implements OAuth2 authentication flow as designed in AUTH-123.
Replaces the legacy session-based auth that was causing 15% of
users to get logged out during peak hours.

## Changes
- Add OAuth2 provider configuration (Google, GitHub)
- Implement token refresh with mutex lock (fixes race condition)
- Add session management with 30-day sliding window
- Migrate 12,000 existing sessions

## Test Plan
- [x] Unit tests for token validation (42 tests added)
- [x] Integration tests for auth flow
- [x] Load test: 5000 concurrent token refreshes
- [ ] Manual QA on staging
```

**What the Career Story LLM actually receives:**
```
Description: Closes AUTH-123
Full Narrative: [300-word LLM summary that says "improved authentication"]
Context: author: honey.arora, merged, +450/-120, 15 files, 3 reviews
```

**What the Career Story LLM writes:**
> "I improved the authentication system, working with the team to implement a more robust solution."

**What it SHOULD write (with raw data):**
> "I replaced the legacy session-based auth that was logging out 15% of users during peak hours.
> Built OAuth2 with mutex-locked token refresh, migrated 12,000 sessions, and validated with
> 5,000 concurrent load tests. Zero auth incidents since deployment."

### Code Paths to Fix

```
1. backend/src/services/story-wizard.service.ts
   Line 476-483: Add format7Data to select clause
   Line 493-503: Read phases/skills/role from format7Data instead of null

2. backend/src/services/ai/prompts/career-story.prompt.ts
   Line 21-35: Add `activities?: ActivityContext[]` to JournalEntryContent (see §16 for interface)
   Line 183-210: Pass activities to template

3. backend/src/services/ai/prompts/templates/career-story-user.prompt.md
   Add new section:
   {{#if activities}}
   ### Source Activities
   {{#each activities}}
   - [{{date}}] {{source}}: {{title}}
     {{#if body}}Details: {{body}}{{/if}}
     {{#if labels}}Labels: {{labels}}{{/if}}
   {{/each}}
   {{/if}}

4. backend/src/services/story-wizard.service.ts
   Line 548-555: Activity fetch already exists for source creation
   Reuse allActivityRows to build ActivitySummary[] for LLM prompt
```

---

## 5. Gap #2: D-I-G Question Overload

### Severity: HIGH
### Impact: Users skip questions, answer poorly, or abandon wizard
### Effort: 0.5 days

### The Problem

6 questions is too many. By question 4, users are writing one-word answers or skipping.
Worse: the system already has data that would answer many of these questions.

### Current Question Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│  QUESTION   │  PHASE   │  WHAT IT ASKS        │  SYSTEM KNOWS? │
├─────────────┼──────────┼──────────────────────┼────────────────┤
│  dig-1      │  dig     │  How it started      │  ✅ timestamps │
│  dig-2      │  dig     │  Key person/decision │  ✅ reviewers  │
│  dig-3      │  dig     │  Hardest part        │  ❌ user only  │
│  impact-1   │  impact  │  Counterfactual      │  ❌ user only  │
│  impact-2   │  impact  │  Before/after metric │  ⚠️ partial   │
│  growth-1   │  growth  │  What changed        │  ❌ user only  │
└─────────────────────────────────────────────────────────────────┘
```

### What the System Already Knows

| Data Point | Source | Example |
|-----------|--------|---------|
| Timeline | `activity.timestamp` | "Started Mar 3, final PR merged Mar 17 (14 days)" |
| People involved | `rawData.reviewers`, `rawData.author` | "bob.chen reviewed, sarah.kim approved" |
| Code scope | `rawData.additions/deletions/changedFiles` | "450 lines added across 15 files" |
| Tools used | `activity.source` | "GitHub (8 PRs), Jira (3 tickets)" |
| Branch/epic | `rawData.headRef`, Jira `rawData.epic` | "feature/oauth2-auth on the auth-migration epic" |
| Labels | `rawData.labels` | "security, breaking-change" |

### Proposed: 3 Gap-Targeted Questions

Instead of 6 generic questions, show 3 questions that target what the system can't infer:

```
IF system has metrics (additions/deletions/reviews):
  SKIP "What's the number that proves you succeeded?"
  ASK  "Your PR added 450 lines across 15 files. What was the hardest technical decision?"

IF system has people (reviewers/collaborators):
  SKIP "Who did you call first?"
  ASK  "bob.chen and sarah.kim reviewed this. Who pushed back and why?"

IF system has timeline (timestamps span >7 days):
  SKIP "What was the timeline?"
  ASK  "This work spanned Mar 3-17. What was the turning point?"
```

The three questions should always be:
1. **The obstacle** — "What almost went wrong?" (can never be inferred)
2. **The counterfactual** — "What would have happened without you?" (can never be inferred)
3. **The gap** — Whatever the data is missing (metric, person, decision, or learning)

### Code Paths to Fix

```
1. backend/src/services/ai/prompts/wizard-questions.prompt.ts
   - Add activities summary to template input
   - Add "SYSTEM ALREADY KNOWS" section to prompt
   - Change instruction from "Generate 6 questions" to "Generate 3 questions"

2. backend/src/services/ai/prompts/templates/wizard-questions.prompt.md
   - Add: "The system already has this data. DO NOT ask about it:
     - Timeline: {{dateRange}}
     - People: {{collaborators}}
     - Scope: {{codeStats}}"
   - Change: "Generate exactly 3 questions" (was 6)
   - Keep: 1 dig (obstacle), 1 impact (counterfactual), 1 gap-fill

3. backend/src/services/story-wizard.service.ts
   Line 424-436: Pass activity summary to generateDynamicQuestions()

4. src/components/story-wizard/StoryWizardModal.tsx
   - Show "We already know:" panel above questions
   - Display activity timeline, people, tools as pre-filled context
```

---

## 6. Gap #3: Format7Data Nulled in Wizard

### Severity: HIGH
### Impact: LLM loses structured data that exists on the journal entry
### Effort: 0.25 days (smallest, highest-ratio fix)

### The Problem

The wizard path explicitly nulls out fields that the promote/regenerate paths extract:

```typescript
// FILE: backend/src/services/story-wizard.service.ts (lines 493-503)

const journalEntryContent: JournalEntryContent = {
  // ...
  dominantRole: null,       // ❌ format7Data.dominantRole exists!
  phases: null,             // ❌ format7Data.phases exists!
  impactHighlights:         // ⚠️ Only from wizard answer, not format7Data
    extractedContext.metric
      ? [extractedContext.metric]
      : null,
  skills: null,             // ❌ format7Data.summary.technologies_used exists!
  // ...
};
```

### What Format7Data Contains

```typescript
// FILE: backend/src/services/career-stories/career-story.service.ts (lines 36-56)
interface Format7Data {
  phases?: Array<{
    name: string;           // e.g., "Initial Investigation"
    summary: string;        // e.g., "Analyzed N+1 query patterns in user dashboard"
    activityIds: string[];  // Which activities belong to this phase
  }>;
  impactHighlights?: string[];  // e.g., ["Reduced load time from 8s to 1.2s"]
  dominantRole?: string;        // e.g., "Led"
  activityEdges?: Array<{       // Activity classification
    activityId: string;
    role: 'primary' | 'supporting' | 'contextual' | 'outcome';
  }>;
  frameworkComponents?: Array<{  // Legacy format
    name: string;
    label: string;
    content: string;
  }>;
  summary?: {
    skills_demonstrated?: string[];   // e.g., ["Database optimization", "Profiling"]
    technologies_used?: string[];     // e.g., ["PostgreSQL", "Redis", "Datadog"]
    key_achievements?: string[];      // e.g., ["85% performance improvement"]
  };
  context?: {
    primary_focus?: string;           // e.g., "Performance optimization"
    challenges?: string[];            // e.g., ["Complex N+1 query patterns"]
  };
}
```

### The Fix (4 Lines)

```typescript
// In story-wizard.service.ts, line 476-483:
// ADD format7Data to select clause:
select: {
  id: true, title: true, description: true, fullContent: true,
  category: true, activityIds: true,
  format7Data: true,  // <-- ADD THIS
}

// In story-wizard.service.ts, lines 493-503:
// REPLACE nulls with format7Data extraction:
const f7 = (entry.format7Data as any) || {};
const journalEntryContent: JournalEntryContent = {
  title: entry.title || 'Untitled',
  description: entry.description,
  fullContent: entry.fullContent,
  category: entry.category,
  dominantRole: f7.dominantRole || f7.context?.primary_focus || null,
  phases: f7.phases?.map((p: any) => ({
    name: p.name, summary: p.summary, activityIds: p.activityIds || [],
  })) || null,
  impactHighlights: f7.impactHighlights
    || (extractedContext.metric ? [extractedContext.metric] : null),
  skills: f7.summary?.technologies_used || null,
  activityIds: entry.activityIds,
};
```

---

## 7. Gap #4: Evaluation is Surface-Level

### Severity: MODERATE
### Impact: Users don't know how to improve their stories
### Effort: 1 day

### Current Scoring: 4 Signals Only

```typescript
// FILE: backend/src/services/story-wizard.service.ts (lines 308-365)

Base Score: 5.0
┌──────────────────────────────────┬────────┬───────────────────────────┐
│ Signal                           │ Bonus  │ What It Checks            │
├──────────────────────────────────┼────────┼───────────────────────────┤
│ Specificity (numbers in text)    │ +1.0   │ /\d+%|\$[\d,]+|\d+\s*    │
│                                  │        │ (hours|days|teams|users)/ │
│ Named People (in wizard answer)  │ +0.5   │ /\b[A-Z][a-z]+\b/ minus  │
│                                  │        │ common words              │
│ Counterfactual (impact-1 answer) │ +1.0   │ context.counterfactual    │
│                                  │        │ exists                    │
│ Metric (impact-2 answer)         │ +0.5   │ context.metric exists     │
└──────────────────────────────────┴────────┴───────────────────────────┘
Max Score: 5.0 + 1.0 + 0.5 + 1.0 + 0.5 = 8.0
(Can reach 9.5 theoretically but never in practice)
```

### What's NOT Checked

| Signal | Available? | Why It Matters |
|--------|-----------|----------------|
| Archetype fit | ✅ ARCHETYPE_GUIDANCE exists | Firefighter without time marker should score lower |
| Hook quality | ✅ Hook is generated | Generic hooks = boring stories |
| Section balance | ✅ Sections exist | One 5-sentence section + three 1-sentence = bad |
| Vague language | ✅ VAGUE_PATTERNS exists | "Significantly improved" should flag |
| Source coverage | ✅ StorySource exists | Unsourced sections = unverifiable claims |
| Activity alignment | ✅ Evidence arrays exist | LLM evidence IDs don't match real activities |
| Framework compliance | ✅ FRAMEWORK_SECTIONS exists | Missing required sections = incomplete |

### CLI Evaluator is Better (But Unused in Wizard)

```typescript
// FILE: backend/src/cli/story-coach/services/story-evaluator.ts (lines 14-120)
// 5-dimension weighted scoring:

Specificity:      0.25 weight  (numbers, names, vague word penalties)
Compelling Hook:  0.20 weight  (time markers, narrative openings, boring penalties)
Evidence Quality: 0.20 weight  (source count, counterfactual, lasting impact)
Archetype Fit:    0.15 weight  (archetype-specific keyword checks)
Actionable Impact:0.20 weight  (reduction/improvement metrics, before/after)
```

This evaluator exists but is only used in the CLI story-coach, NOT in the wizard.

### Proposed: Merge CLI Evaluator Into Wizard

```
1. backend/src/services/story-wizard.service.ts
   - Import scoreStoryRuleBased() from story-evaluator.ts
   - Replace simple evaluateStory() with 5-dimension scoring
   - Return breakdown to frontend (not just total score)

2. src/components/story-wizard/StoryWizardModal.tsx
   - Show radar chart or bar breakdown of 5 dimensions
   - Highlight weakest dimension with specific suggestion
```

---

## 8. Gap #5: Coaching is Abstract

### Severity: MODERATE
### Impact: Users see "Add specific numbers" but don't know WHERE or WHAT numbers
### Effort: 1 day

### Current Coaching Flow

```
                        WHAT USERS SEE
  ──────────────────────────────────────────────────────────

  ┌─ Story Generated ─────────────────────────────────────┐
  │                                                        │
  │  [Ready ●]  ← hover to see tooltip                    │
  │                                                        │
  │  Situation:                                            │
  │    "Our team managed the API serving high traffic..."  │
  │                                                        │
  │  Result:                                               │
  │    "The solution significantly improved performance."  │
  │         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           │
  │         VAGUE — but no inline flag!                    │
  │                                                        │
  └────────────────────────────────────────────────────────┘

  ┌─ Tooltip (on hover only) ─────────────────────────────┐
  │  74% confidence                                        │
  │  3 of 4 sections sourced                               │
  │                                                        │
  │  Suggested improvements:                               │
  │  • Add specific numbers to quantify impact             │
  │  • Mention specific people by name                     │
  └────────────────────────────────────────────────────────┘
```

### What Coaching SHOULD Look Like

```
  ┌─ Story with Inline Coaching ──────────────────────────┐
  │                                                        │
  │  Result:                                               │
  │    "The solution significantly improved performance."  │
  │                   ~~~~~~~~~~~~~~~~~~~~~~               │
  │                   ⚠️ Vague. Your PR #2341 mentions     │
  │                   "40% latency reduction" — add that.  │
  │                                                        │
  │  ┌─ Sources ──────────────────────────────────┐       │
  │  │  🔧 PR #2341: "Reduce p99 from 800ms..."  │       │
  │  │  🎫 PERF-891: "API optimization sprint"    │       │
  │  │  ⚠️ No source for Situation section         │       │
  │  └────────────────────────────────────────────┘       │
  └────────────────────────────────────────────────────────┘
```

### Available But Unused

| Data | Location | What It Could Power |
|------|----------|-------------------|
| VAGUE_PATTERNS | story-source.service.ts:14-21 | Inline vague phrase highlighting |
| Activity rawData.body | ToolActivity table | "Your PR says X — add that" |
| Source gaps | sourceCoverage.gaps[] | "Situation section has no evidence" |
| Activity timestamps | ToolActivity.timestamp | "This work started May 3 — add timeline" |
| Reviewer names | rawData.reviewers | "bob.chen reviewed — mention collaboration" |

### Code Paths to Fix

```
1. backend/src/services/story-wizard.service.ts
   - In evaluateStory(): run VAGUE_PATTERNS on generated sections
   - Return vagueMatches[] with section key + matched text + suggestion
   - Cross-reference with activity rawData for specific replacements

2. src/components/career-stories/NarrativePreview.tsx
   - Show suggestedEdits inline (not just tooltip)
   - Highlight vague phrases with amber underline
   - Show "Your PR mentions X" tooltips on hover

3. src/components/career-stories/NarrativeStatusBadge.tsx
   - Show top 1 suggestion permanently (not tooltip-only)
   - Add "View all suggestions" expandable
```

---

## 9. Gap #6: Hook Generation is Static

### Severity: LOW
### Impact: Opening lines are generic or truncated
### Effort: 0.5 days

### Current Hook Logic

```typescript
// FILE: backend/src/services/story-wizard.service.ts (lines 509-511)

const hook = extractedContext.realStory?.slice(0, 200)      // User's dig-1 answer, truncated
  || extractedContext.obstacle?.slice(0, 200)                // User's dig-3 answer, truncated
  || this.getDefaultHook(archetype);                         // Static string per archetype
```

### Default Hooks (Static Strings)

```typescript
// FILE: story-wizard.service.ts (lines 168-177)

ARCHETYPE_HOOKS = {
  firefighter: 'When the alert came in, everything changed.',
  architect:   'I saw what needed to be built, and I built it to last.',
  diplomat:    'Two teams, opposing views, one path forward.',
  multiplier:  'What started as my solution became everyone\'s solution.',
  detective:   'No one could figure out why. Until I traced it back.',
  pioneer:     'No documentation. No playbook. Just a problem that needed solving.',
  turnaround:  'I inherited a mess. Here\'s how I turned it around.',
  preventer:   'I noticed something others missed. It saved us.',
};
```

### The Fix

Add `hook` to the Career Story LLM output schema:

```json
{
  "sections": { ... },
  "title": "...",
  "hook": "One sentence that makes the interviewer lean in. Use a specific fact.",
  "reasoning": "...",
  "category": "..."
}
```

---

## 10. Gap #7: ExtractedContext Directive is Weak

### Severity: MODERATE
### Impact: LLM often ignores or rewords user-provided details
### Effort: 0.5 days

### Current Implementation

```typescript
// FILE: backend/src/services/ai/prompts/career-story.prompt.ts (lines 251-278)

function formatExtractedContext(ctx: ExtractedContext): string {
  const sections: string[] = ['\n\n## User-Provided Context\n'];
  sections.push(
    'Weave these facts into the story. Do not pad or editorialize around them — use them directly.\n'
  );

  if (ctx.realStory)    sections.push(`- **Real story:** ${ctx.realStory}`);
  if (ctx.obstacle)     sections.push(`- **Obstacle:** ${ctx.obstacle}`);
  if (ctx.keyDecision)  sections.push(`- **Key decision:** ${ctx.keyDecision}`);
  if (ctx.namedPeople)  sections.push(`- **People:** ${ctx.namedPeople.join(', ')}`);
  if (ctx.counterfactual) sections.push(`- **Counterfactual:** ${ctx.counterfactual}`);
  if (ctx.metric)       sections.push(`- **Metric:** ${ctx.metric}`);
  if (ctx.learning)     sections.push(`- **Learning:** ${ctx.learning}`);

  return sections.join('\n');
}
```

### The Problem

"Weave these facts into the story" is a **weak directive**. LLMs routinely:
- Paraphrase "reduced from 800ms to 200ms" → "significantly improved"
- Ignore named people entirely
- Rephrase counterfactual into generic "prevented issues"

### Proposed: Section-Level Placement

```markdown
## User-Provided Context — MANDATORY INCLUSION

These facts MUST appear verbatim in the specified sections. Do not paraphrase.

- **Situation section MUST include:** "{{realStory}}"
- **Action section MUST include:** "{{keyDecision}}"
- **Action section MUST name:** {{namedPeople}}
- **Result section MUST include this exact metric:** "{{metric}}"
- **Result section MUST include this counterfactual:** "{{counterfactual}}"
{{#if learning}}
- **Learning/Evaluation section MUST include:** "{{learning}}"
{{/if}}

VERIFICATION: After generating, check that each fact above appears in its assigned section.
If any fact is missing, add it.
```

---

## 11. Gap #8: No Post-Generation Fact-Check

### Severity: LOW (if input quality improves) / HIGH (if it doesn't)
### Impact: Key user-provided facts get lost in generation
### Effort: 1 day

### The Problem

User provides "reduced latency from 800ms to 200ms" in impact-2 answer.
LLM writes "significantly improved performance" in the Result section.
No verification that the specific fact survived.

### Proposed Check

```typescript
// After LLM generates sections:
function verifyFactInclusion(
  sections: Record<string, { summary: string }>,
  context: ExtractedContext
): string[] {
  const missing: string[] = [];

  if (context.metric) {
    const allText = Object.values(sections).map(s => s.summary).join(' ');
    // Extract numbers from metric
    const numbers = context.metric.match(/\d+[\d.,]*/g) || [];
    const missingNumbers = numbers.filter(n => !allText.includes(n));
    if (missingNumbers.length > 0) {
      missing.push(`Metric numbers missing: ${missingNumbers.join(', ')}`);
    }
  }

  if (context.namedPeople?.length) {
    const allText = Object.values(sections).map(s => s.summary).join(' ');
    const missingPeople = context.namedPeople.filter(p => !allText.includes(p));
    if (missingPeople.length > 0) {
      missing.push(`People not mentioned: ${missingPeople.join(', ')}`);
    }
  }

  return missing;
}
```

---

## 12. Pre-Detection Proposal (Deferred)

### RJ Score: 5/10 | GSE: Hard Pass | DLG: Dead Last

### Why Not Now

| Argument | Counter |
|----------|---------|
| "Saves 2-3 seconds" | Wizard takes 3+ minutes total; 2s is noise |
| "Better UX" | The loading screen has rotating facts; users are fine |
| "Archetype powers other features" | True, but build those features first |
| "Cheap ($0.001/entry)" | 10x cost (detect all entries vs on-demand for promoted only) |

### When It Makes Sense (Later)

Pre-detection becomes valuable when:
1. Archetype is used as a **clustering signal** (clustering redesign)
2. Archetype badges appear on **draft story cards** (before wizard)
3. Quick Generate **skips wizard** for high-confidence entries
4. Published profiles **group by archetype** (brag doc categories)

### If You Do It Later

```
Store: JournalEntry.detectedArchetype = {
  archetype: 'firefighter',
  confidence: 0.85,
  reasoning: '...',
  alternatives: [...],
  detectorVersion: '1.0',
  detectedAt: '2026-02-12T...',
}

Invalidate: if entry.updatedAt > detectedArchetype.detectedAt
Fallback: wizard detects live if field is null
```

---

## 13. Priority Stack

```
  PRIORITY    EFFORT    IMPACT    DESCRIPTION
  ════════    ══════    ══════    ═══════════

  #1          2.5 days  10x       INPUT STARVATION
  ───────────────────────────────────────────────────────────
  Pass raw activity data via per-tool ActivityContext adapter
  to Career Story LLM. Includes secret scanner, activity cap
  (ranked top 20), and per-tool normalization. The difference
  between "improved performance" and "reduced p99 from 800ms
  to 120ms."

  #2          0.5 days  5x        FAST D-I-G (3 NOT 6)
  ───────────────────────────────────────────────────────────
  Show user what system already knows. Ask 3 gap-targeted
  questions instead of 6 generic ones. Users finish faster,
  answer better.

  #3          0.25 days 3x        FORMAT7DATA PASSTHROUGH
  ───────────────────────────────────────────────────────────
  Stop nulling phases, skills, dominantRole in wizard path.
  4 lines of code. Immediate quality improvement.

  #4          1 day     2x        ACTIONABLE COACHING
  ───────────────────────────────────────────────────────────
  Inline vague phrase detection. "Your PR mentions X —
  add that." Connect suggestions to actual source data.

  #5          0.5 days  2x        STRONGER CONTEXT DIRECTIVE
  ───────────────────────────────────────────────────────────
  Section-level fact placement. "Result MUST include:
  800ms → 200ms." Verification step after generation.

  #6          0.5 days  1.5x      LLM-GENERATED HOOKS
  ───────────────────────────────────────────────────────────
  Add "hook" to LLM output schema. Stop truncating user
  text or using static strings.

  #7          1 day     1.5x      5-DIMENSION EVALUATION
  ───────────────────────────────────────────────────────────
  Merge CLI evaluator into wizard. Show breakdown, not
  just a number. Archetype-specific scoring.

  #8          1 day     1x        POST-GENERATION FACT-CHECK
  ───────────────────────────────────────────────────────────
  Verify user-provided facts survived generation. Flag
  missing numbers, names, metrics.

  ──────────────────────────────────────────────────────────
  DEFERRED                        PRE-DETECTION
  ──────────────────────────────────────────────────────────
  Move archetype detection to clustering time. Only when
  archetype powers clustering, badges, or Quick Generate.
```

### Ship Order (Dependency-Aware)

```
1st: R4  (Handlebars safety)   0.25 days   Security gate — blocks rawData in templates
2nd: Fix #3 (Format7Data)      0.25 days   Low risk, independent, defensive coding
3rd: R1  (Single buildLLMInput) 0.5 days   Unifies 3 generation paths — prevents 3x fix duplication
4th: Fix #1 (Input Starvation)  2.5 days   Highest value, needs per-tool adapter +
                                            secret scanner + ranked activity cap
5th: Fix #2 (Fast D-I-G)       0.5 days   Depends on Fix #1's rawData for "system knows" panel
```

---

## 14. Assumptions & Failure Modes (RJ Audit)

### Hidden Assumptions

#### Fix #1: Input Starvation

| # | Assumption | If Wrong | Risk |
|---|-----------|----------|------|
| A1 | 500-char body truncation is sufficient and safe | Cuts mid-credential. Secret key in chars 0-499, "DO NOT COMMIT" warning at char 510 | **RISKY** |
| A2 | Token math is ~5K→~8K | 50 activities × ~300 tokens = ~15K extra. Total becomes ~20K. Cost 3x estimate | **DANGEROUS** |
| A3 | All activities have rawData accessible | Some activities deleted/archived, some tools don't populate rawData.body | **RISKY** |
| A4 | rawData schema consistent across tools | `labels`, `reviewers`, `body` are GitHub concepts. Slack has no labels. Confluence has no reviewers. Figma has no body. **Confirmed by mock data — see §16 Schema Inconsistencies.** | **DANGEROUS** |
| A5 | LLM uses rawData to improve, not contradict | fullContent says "I led this", rawData shows user was only a reviewer. Conflicting signals. | **RISKY** |
| A6 | PR body content is safe to pass to LLM | PR bodies contain API keys, connection strings, customer names, internal hostnames | **DANGEROUS** |
| A7 | maxTokens bump 2,000→2,500 is enough | Richer input → LLM tries to write more → output truncation → broken JSON | **SAFE** |
| A8 | Fetching rawData for N activities is fast | 50 activities with JSON deserialization + unindexed query. Probably <200ms. | **SAFE** |
| A9 | Demo mode rawData mirrors production | DemoToolActivity may have hand-crafted/simplified rawData. Fix works in prod, degrades in demo | **RISKY** |

#### Fix #2: Fast D-I-G

| # | Assumption | If Wrong | Risk |
|---|-----------|----------|------|
| A10 | Obstacle + counterfactual can't be inferred | Safe today, might change with better activity analysis | **SAFE** |
| A11 | Users will actually answer 3 questions | Drop-off might be at "questions exist" not "too many questions". No data to validate. | **RISKY** |
| A12 | "System already knows" panel won't alarm users | Users may find it creepy or see errors in inferred data → lose trust | **RISKY** |
| A13 | LLM reliably produces exactly 3 questions | LLMs are unreliable at strict count constraints. Returns 2 or 5. | **RISKY** |
| A14 | Removing 3 questions doesn't degrade quality | If inferred answers are wrong (clustering is broken), no user correction opportunity | **RISKY** |

#### Fix #3: Format7Data Passthrough

| # | Assumption | If Wrong | Risk |
|---|-----------|----------|------|
| A15 | format7Data always has phases/skills populated | "schema varies, some entries have it, some don't" — directly contradicts assumption | **DANGEROUS** |
| A16 | format7Data is recent enough to be accurate | Generated at sync time. Activities may have changed since. Stale data → wrong story. | **RISKY** |
| A17 | Wizard and promote paths share format7Data safely | Wizard-created stories may never have gone through format7 analysis pipeline | **DANGEROUS** |
| A18 | Nested path `format7Data.summary.technologies_used` is stable | Schema may differ across pipeline versions. Silent undefined propagation. | **RISKY** |

### Failure Modes

#### WILL BREAK (Fix Before Shipping)

| # | Failure | Probability | Blast | Mitigation |
|---|---------|-------------|-------|------------|
| F1 | **Secret/credential leakage in PR bodies** — API keys, DB connection strings, tokens in rawData.body get laundered into career stories | **LIKELY** | **HIGH** | Secret-scanning regex on rawData.body before LLM. Strip AWS keys, connection strings, tokens, passwords. **Non-optional.** |
| F5 | **format7Data is undefined → crash** — `format7Data.phases` throws TypeError for stories without format7 analysis | **LIKELY** | **HIGH** | Defensive reads: `f7?.phases ?? null`. Unit test every permutation of missing fields. |
| F3 | **Token budget explosion with 50 activities** — Input hits 20-25K tokens, cost 3x estimate | **POSSIBLE** | **MEDIUM** | Hard cap at 20 activities passed to LLM. Select 20 with richest rawData. Add per-story cost tracking. |

#### SHOULD FIX (Before or Shortly After Shipping)

| # | Failure | Probability | Blast | Mitigation |
|---|---------|-------------|-------|------------|
| F2 | **PII exposure from Jira/Slack** — Customer names, emails in ticket descriptions surface in stories | **LIKELY** | **MEDIUM** | PII scrub layer: strip emails, phone numbers via regex. |
| F4 | **Conflicting signals fullContent vs rawData** — Journal says "I led this", PR data shows user was reviewer | **LIKELY** | **MEDIUM** | Prompt instruction: "Use raw data to add specificity. Do not contradict user's narrative framing." |
| F6 | **Demo mode regression** — DemoToolActivity rawData differs from ToolActivity | **POSSIBLE** | **HIGH** | Integration test: generate career story in demo mode with rawData. |
| F12 | **"System already knows" panel shows wrong data** — built on broken clustering | **LIKELY** | **MEDIUM** | Ship Fix #2 after clustering redesign. Or: add disclaimer + inline edit. |
| F15 | **Markdown in rawData corrupts prompt** — PR bodies with backticks, code blocks, tables | **LIKELY** | **LOW** | Strip markdown formatting, or wrap activity data in `<activity>` XML tags. |
| F17 | **Partial deployment creates inconsistent state** — Fix #1 ships without Fix #3 | **POSSIBLE** | **LOW** | Ship in order: #3 → #1 → #2. Document dependency. |
| F18 | **Handlebars template injection via rawData** — PR title contains `{{constructor}}` | **UNLIKELY** | **HIGH** | Use escaped `{{double}}` interpolation, not raw `{{{triple}}}`. Or: build prompt as plain string, not Handlebars template. |

#### MONITOR (Low Urgency)

| # | Failure | Probability | Blast | Mitigation |
|---|---------|-------------|-------|------------|
| F7 | Non-English rawData → garbled output | **POSSIBLE** | **LOW** | Prompt: "Translate foreign-language evidence. Generate in English." |
| F8 | Stale format7Data after re-clustering | **POSSIBLE** | **MEDIUM** | Invalidate format7Data when activityIds change. Staleness check. |
| F9 | Output truncation at 2,500 tokens → broken JSON | **POSSIBLE** | **MEDIUM** | JSON repair library. Dynamic maxTokens based on activity count. |
| F10 | Wizard path lacks format7Data entirely | **LIKELY** | **LOW** | Scope Fix #3 to promote/regenerate path. Wizard degrades gracefully. |
| F11 | Latency increase compounds in wizard flow | **POSSIBLE** | **LOW** | Parallelize rawData fetch with archetype detection. |
| F13 | Backward compat: existing stories regenerate differently | **POSSIBLE** | **MEDIUM** | Snapshot narrative before regeneration. "Previous version" toggle. |
| F14 | Cost spike from regeneration loops | **POSSIBLE** | **LOW** | Rate limit: max 5 regenerations per story per hour. |
| F16 | Frontend/backend question count mismatch | **POSSIBLE** | **MEDIUM** | Frontend: dynamic `questions.map()`. Backend: strict parse + retry. |

---

## 15. Model Selection Analysis

### Current Model Configuration

```
TASK                    MODEL TIER     MODEL                        maxTokens   COST/CALL
────────────────────────────────────────────────────────────────────────────────────────
Archetype detection     quick          claude-3-5-haiku / gpt-4o-mini  1,200    ~$0.001
Wizard questions (D-I-G) quick         claude-3-5-haiku / gpt-4o-mini  1,200    ~$0.001
Story generation        premium        claude-sonnet-4 / gpt-4o        2,000    ~$0.045
Journal narrative       premium        claude-sonnet-4 / gpt-4o        4,000    ~$0.060
Derivations             quick          claude-3-5-haiku / gpt-4o-mini    500    ~$0.001
LLM polish              premium        claude-sonnet-4 / gpt-4o          500    ~$0.010
Cluster assignment      quick          claude-3-5-haiku / gpt-4o-mini  1,000    ~$0.001
```

### Should Story Generation Use a Better Model?

With Fix #1 (richer input), the LLM receives substantially more context:
- Raw PR descriptions, labels, reviewers
- Format7Data phases, skills, impact highlights
- Wizard D-I-G answers with extractedContext

**The argument for Sonnet (current):**
- Career stories are structured JSON output (sections + evidence arrays)
- The task is primarily formatting/restructuring, not deep reasoning
- Sonnet handles this well at $0.045/call
- Users regenerate frequently — cost sensitivity matters

**The argument for upgrading (Sonnet 4.5 or Opus):**
- With richer input, the LLM needs to resolve conflicting signals (A5, F4)
- Section-level fact placement (Gap #7) requires careful instruction following
- Archetype voice shaping requires nuance ("write like a firefighter story")
- The anti-verbosity rules are sophisticated — cheaper models tend to ignore them
- This is the HIGHEST-VALUE LLM call in the product — the story IS the product

**Cost comparison with richer input (~8K input tokens):**

```
MODEL                    INPUT COST         OUTPUT COST        TOTAL/STORY
                         (~8K tokens)       (~2.5K tokens)
──────────────────────────────────────────────────────────────────────────
Haiku 3.5                $0.002             $0.003             $0.005
Sonnet 4 (current)       $0.024             $0.038             $0.062
Sonnet 4.5               $0.024             $0.038             $0.062
Opus 4.6                 TBD                TBD                TBD
GPT-4o                   $0.020             $0.025             $0.045
GPT-4o-mini              $0.001             $0.002             $0.003
```

### Recommendation: Tiered Approach

```
SCENARIO                          MODEL           RATIONALE
─────────────────────────────────────────────────────────────────
First generation (wizard)         Sonnet 4.5      Highest quality for first impression.
                                                  User sees this once. Worth $0.06.

Regeneration (same framework)     Sonnet 4        Incremental improvement, not fresh gen.
                                                  User may regenerate 3-5x. Cost-sensitive.

Quick Generate (skip wizard)      Sonnet 4.5      No wizard answers to compensate.
                                                  LLM needs to infer more from raw data.

Derivations (Share As...)         Haiku (current) Reformatting, not generation.
                                                  Already works well at $0.001.
```

### Changes Needed for Model Upgrade

```
1. backend/src/services/ai/model-selector.service.ts
   - Add 'premium-high' tier → claude-sonnet-4-5 / gpt-4o
   - Map 'generate' task to 'premium-high' for first generation

2. backend/src/services/story-wizard.service.ts (line 829)
   - Change quality from 'balanced' to 'premium-high' (or new tier)

3. backend/src/services/career-stories/career-story.service.ts (line 467)
   - Keep 'balanced' for regeneration (cost-sensitive path)
```

---

## 16. Cross-Tool Intelligence

### What Exists vs What's Needed

You have a 3-layer cross-tool intelligence stack. It's solid for the original 5 tools but has zero coverage for the newer integrations.

```
LAYER 1: EXPLICIT REFERENCES (RefExtractor)
═══════════════════════════════════════════════════════════════

  PR body: "Closes AUTH-123"  ───────────────> Jira ticket AUTH-123
  PR body: "Design: figma.com/file/XYZ" ────> Figma file XYZ
  Jira desc: "See acme/backend#42" ─────────> GitHub PR #42
  Confluence: "meet.google.com/abc" ────────> Google Meet abc

  SUPPORTED:  GitHub ✅  Jira ✅  Confluence ✅  Slack ✅  Figma ✅  Google ✅
  MISSING:    OneDrive ❌  Outlook ❌


LAYER 2: PEOPLE OVERLAP (SignalExtractor → ClusteringService)
═══════════════════════════════════════════════════════════════

  PR reviewers: [alice, bob]  ─┐
                               ├── ≥2 shared people + <30d → EDGE
  Jira watchers: [bob, alice] ─┘

  SUPPORTED:  GitHub ✅  Jira ✅  Slack ✅  Confluence ✅  Figma ✅
  MISSING:    OneDrive ❌  Outlook ❌  Google ❌  (data EXISTS but not extracted)


LAYER 3: CONTAINER GROUPING (SignalExtractor)
═══════════════════════════════════════════════════════════════

  GitHub: headRef "feature/oauth2-auth" groups PRs on same branch
  Jira:   epic "PLAT-1000" groups tickets in same epic
  Slack:  threadTs groups messages in same thread
  Conflu: spaceKey "ENG" groups pages in same space
  Figma:  fileKey groups comments on same design file

  SUPPORTED:  GitHub ✅  Jira ✅  Slack ✅  Confluence ✅  Figma ✅
  MISSING:    OneDrive ❌  Outlook ❌  Google ❌
```

### The Per-Tool Gap Map

```
TOOL          REFS    SIGNALS    IDENTITY    rawData→LLM    STATUS
              (L1)    (L2+L3)    MATCH       EXTRACTION
═══════════════════════════════════════════════════════════════════
GitHub        ✅      ✅         ✅          partial         FULL
Jira          ✅      ✅         ✅          partial         FULL
Slack         ✅      ✅         ✅          partial         FULL
Confluence    ✅      ✅         ✅          partial         FULL
Figma         ✅      ✅         ✅          minimal         FULL
─────────────────────────────────────────────────────────────────
OneDrive      ❌      ❌         ❌          minimal         ZERO
Outlook       ❌      ❌         ✅          partial         PARTIAL
Google Meet   ✅      ❌         ✅          minimal         PARTIAL
Google Docs   ✅      ❌         ❌          minimal         PARTIAL
Google Cal    ✅      ❌         ❌          minimal         PARTIAL
Google Sheets ✅      ❌         ❌          minimal         PARTIAL
```

### What Fix #1 Needs Per Tool (Grounded in Mock Data)

> **Data source**: `mock-data.service.ts` (893 lines, ~70 activities, 13 tool subtypes)
> and `mock-data-v2.service.ts` (682 lines, 32 activities, 2 stories + 8 unclustered).
> Every field below exists in actual rawData — not guessed.

RJ was right about A4 — you can't design the rawData→LLM interface around GitHub's model.
**The PAUSE gate was wrong**: mock data proves **6 of 13 tool subtypes have body-equivalent
rich text content**, not just GitHub. The adapter pattern is justified.

```
TOOL              body/content               people                       scope             meta
                  (what happened?)           (who was involved?)          (how big?)        (labels, state, etc)
══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

GitHub PR         body ✅ (rich)             author, reviewers[],         +/-/files         labels[], state,
                  comments[].body ✅         requestedReviewers[],                          headRef, baseRef
                                             mentions[], comment authors

GitHub Commit     message ✅ (medium)        author                       +/-/files         sha, repository

Jira              comments[].body ✅ (NEW!)  assignee, reporter,          storyPoints       labels[], status,
                                             watchers[], mentions[],                        priority, key,
                                             comment authors                                linkedIssues[]

Confluence        — (no body)               createdBy, lastModifiedBy,   version           spaceKey, pageId
                                             mentions[], watchers[]

Slack             — (title IS content)      mentions[], parentAuthor,    reactions[].count  channelName, threadTs,
                                             replyAuthor                                    reactions[].name

Outlook           subject ✅ (mini body)    from, to[], cc[]             duration           messageId, userRole

Google Calendar   — (no body)               organizer, attendees[]       duration           recurring,
                                                                                            conferenceLink

Google Docs       comments[].body ✅ (NEW!) owner, lastModifiedBy,       —                  documentId
                                             contributors[],
                                             suggestedEditors[],
                                             comment authors

Google Sheets     comments[].body ✅ (NEW!) owner, lastModifiedBy,       sheets[] (count)   spreadsheetId
                                             mentions[], comment authors

Google Drive      — (no body)               owner, lastModifiedBy        slideCount         presentationId

Google Meet       — (no body)               organizer, participants[]    duration           meetCode

Figma             — (no body)               owner, commenters[]          —                  fileKey

OneDrive          — (no body)               lastModifiedBy,              size               fileType,
                                             sharedWith[]                                    parentPath
```

### 6 Tools Have Body-Equivalent Content — Not Just GitHub

**Mock data evidence** (previously assumed only GitHub had "body"):

| Tool | Field | Example from Mock Data |
|------|-------|----------------------|
| GitHub PR | `body` | `"## Summary\nImplements OAuth2 auth flow as designed in AUTH-123.\n## Changes\n- Add OAuth2 provider config..."` (v1 line 72) |
| GitHub Commit | `message` | `"feat(auth): add OAuth2 provider configuration\n\nAdds config for Google, GitHub, and Microsoft OAuth providers."` (v1 line 91) |
| Jira | `comments[].body` | `"@honey.arora can you walk us through the token storage?"` (v1 SEC-100, line 332) |
| Outlook | `subject` | `"Fwd: Urgent — Duplicate credit deductions reported"` (v2 line 285) |
| Google Docs | `comments[].body` | `"@honey.arora what do you think about the auth service boundaries?"` (v1 line 523) |
| Google Sheets | `comments[].body` | `"@honey.arora please update auth team estimates for rate limiting work"` (v1 line 592) |

### 3 Signals PAUSE Missed (Found in Mock Data)

**1. Slack reactions as sentiment signal**
```typescript
// v2 line 227: launch celebration
reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }]

// v2 line 322: incident triage urgency
reactions: [{ name: 'eyes', count: 6 }]

// v2 line 454: knowledge sharing appreciation
reactions: [{ name: 'memo', count: 4 }, { name: '+1', count: 9 }]
```
Reaction name + count = team sentiment. `rocket:12` = celebration. `eyes:6` = triage. The LLM can use this.

**2. Jira `linkedIssues[]` — structural data never surfaced**
```typescript
// v1 line 816: Epic connecting auth and perf work
linkedIssues: ['AUTH-123', 'PERF-456']
```
Cross-project connections that exist in rawData but are invisible to the Career Story LLM.

**3. Google Calendar `recurring: true` — routine vs one-off**
```typescript
// v2 line 508: weekly 1:1 (routine — lower story value)
recurring: true

// v2 line 128: design review (one-off — higher story value)
// no recurring field = one-off event
```
Routine meetings should score lower in the activity ranker.

### Schema Inconsistencies Found in Mock Data (Confirms A4)

| Field | v1 Shape | v2 Shape | Risk |
|-------|----------|----------|------|
| Outlook `attendees` | `attendees: 5` (number) | `to: ['ketan2@...', 'arjun@...']` (string[]) | Must handle both |
| Outlook people | `organizer` + `attendees` (count) | `from` + `to[]` + `cc[]` | Two different people models |
| Figma `fileKey` | `fileKey: 'Abc123XYZ'` | `fileKey: 'FigMobileNotif'` | Consistent |
| Jira `comments` | Present on some (SEC-100) | Absent on most | Optional, not guaranteed |
| GitHub `body` | Present on PR #42 | Absent on PR #55 | Optional, not guaranteed |

### Revised ActivityContext Interface

Based on real mock data, the adapter needs more fields than originally designed:

```typescript
// NEW FILE: backend/src/services/career-stories/activity-context.adapter.ts

interface ActivityContext {
  // Universal (every tool — always present)
  title: string;
  date: string;
  source: string;           // "github" | "jira" | "slack" | ...
  sourceSubtype?: string;   // "pr" | "commit" | "issue" | "meeting" | "email" | "thread"
  people: string[];         // Normalized collaborators (tool-specific extraction)
  userRole: string;         // "authored" | "reviewed" | "attended" | "mentioned" | "watched"

  // Rich content (6 of 13 subtypes have this — see table above)
  body?: string;            // PR body, commit message, comment thread, email subject
                            // Truncated to 500 chars, secret-scanned

  // Metadata (tool-specific, all optional)
  labels?: string[];        // GitHub, Jira
  scope?: string;           // "+450/-120, 15 files" | "8 story points" | "60 min meeting"
  container?: string;       // Branch name | Epic key | Thread | Space | File
  state?: string;           // "merged" | "Done" | "In Progress" | "open"
  linkedItems?: string[];   // Jira linkedIssues, GitHub cross-refs
  sentiment?: string;       // Slack reactions summary: "rocket:12, tada:8"
  isRoutine?: boolean;      // Google Calendar recurring=true → lower story value
}
```

**Changes from original design:**
- Added `sourceSubtype` — needed for ranker (PR > commit > thread)
- Added `state` — "merged" vs "open" affects story-worthiness
- Added `linkedItems` — Jira linkedIssues, structural connections
- Added `sentiment` — Slack reactions as team signal
- Added `isRoutine` — recurring meetings score lower
- `body` expanded from "GitHub, some Jira" to "6 of 13 subtypes"

### Per-Tool Adapter Implementation Map

```typescript
// What each adapter function extracts (grounded in mock data fields)

extractGitHubPR(raw):
  people:      [raw.author, ...raw.reviewers, ...raw.requestedReviewers, ...raw.mentions]
  body:        raw.body + raw.comments?.map(c => c.body).join('\n')  // truncate+scan
  labels:      raw.labels
  scope:       `+${raw.additions}/-${raw.deletions}, ${raw.changedFiles} files`
  container:   raw.headRef (exclude main/master/develop)
  state:       raw.state
  userRole:    raw.author === user ? 'authored' : raw.reviewers.includes(user) ? 'reviewed' : 'mentioned'

extractGitHubCommit(raw):
  people:      [raw.author]
  body:        raw.message (multi-line commit message)
  scope:       `+${raw.additions}/-${raw.deletions}, ${raw.filesChanged} files`
  container:   raw.repository
  userRole:    'authored'

extractJira(raw):
  people:      [raw.assignee, raw.reporter, ...raw.watchers, ...raw.mentions, ...commentAuthors]
  body:        raw.comments?.map(c => `${c.author}: ${c.body}`).join('\n')  // comment thread
  labels:      raw.labels
  scope:       `${raw.storyPoints} story points`
  state:       raw.status
  linkedItems: raw.linkedIssues
  userRole:    raw.assignee === user ? 'authored' : raw.mentions?.includes(user) ? 'mentioned' : 'watched'

extractConfluence(raw):
  people:      [raw.createdBy, raw.lastModifiedBy, ...raw.mentions, ...raw.watchers]
  scope:       `v${raw.version}` (revision count = effort signal)
  container:   raw.spaceKey
  userRole:    raw.lastModifiedBy === user ? 'authored' : raw.watchers?.includes(user) ? 'watched' : 'mentioned'

extractSlack(raw):
  people:      [raw.parentAuthor, raw.replyAuthor, ...raw.mentions]
  container:   raw.threadTs (thread grouping)
  sentiment:   raw.reactions?.map(r => `${r.name}:${r.count}`).join(', ')
  userRole:    raw.parentAuthor === user ? 'authored' : 'mentioned'

extractOutlook(raw):
  people:      [raw.from, ...toArray(raw.to), ...toArray(raw.cc), raw.organizer,
                ...toArray(raw.attendees)]  // handle both number and string[]
  body:        raw.subject  // email subject as mini-body
  scope:       raw.duration ? `${raw.duration} min` : undefined
  userRole:    raw.from === user || raw.organizer === user ? 'authored' : 'attended'

extractGoogleCalendar(raw):
  people:      [raw.organizer, ...raw.attendees]
  scope:       `${raw.duration} min`
  isRoutine:   raw.recurring === true
  userRole:    raw.organizer === user ? 'authored' : 'attended'

extractGoogleDocs(raw):
  people:      [raw.owner, raw.lastModifiedBy, ...raw.contributors,
                ...raw.suggestedEditors, ...commentAuthors]
  body:        raw.comments?.map(c => `${c.author}: ${c.body}`).join('\n')  // comment thread
  userRole:    raw.owner === user ? 'authored' : raw.contributors?.includes(user) ? 'contributed' : 'mentioned'

extractGoogleSheets(raw):
  people:      [raw.owner, raw.lastModifiedBy, ...raw.mentions, ...commentAuthors]
  body:        raw.comments?.map(c => `${c.author}: ${c.body}`).join('\n')
  scope:       `${raw.sheets?.length} sheets: ${raw.sheets?.join(', ')}`
  userRole:    raw.owner === user ? 'authored' : 'mentioned'

extractGoogleDrive(raw):
  people:      [raw.owner, raw.lastModifiedBy]
  scope:       raw.slideCount ? `${raw.slideCount} slides` : undefined
  userRole:    raw.owner === user ? 'authored' : 'mentioned'

extractGoogleMeet(raw):
  people:      [raw.organizer, ...raw.participants]
  scope:       `${raw.duration} min`
  userRole:    raw.organizer === user ? 'authored' : 'attended'

extractFigma(raw):
  people:      [raw.owner, ...raw.commenters]
  container:   raw.fileKey
  userRole:    raw.owner === user ? 'authored' : 'commented'

extractOneDrive(raw):
  people:      [raw.lastModifiedBy, ...raw.sharedWith]
  scope:       raw.size ? `${(raw.size / 1024).toFixed(0)} KB` : undefined
  container:   raw.parentPath
  userRole:    raw.lastModifiedBy === user ? 'authored' : 'shared'
```

### What Needs to Be Built

```
COMPONENT                          EXISTS?    EFFORT     NOTES
══════════════════════════════════════════════════════════════════

Per-tool ActivityContext adapter    ❌ NEW     1.25 day   13 subtypes, each with per-field
                                                          extraction (see map above)
  github PR  → body+comments, labels,         0.5h       Richest — body, comments, labels,
               reviewers, scope, headRef                  reviewers, scope, state
  github commit → message, author, scope      0.25h      Multi-line message = medium body
  jira       → comments[].body, labels,       0.5h       comments are body-equivalent (NEW!)
               assignee/reporter/watchers,                linkedIssues = structural data
               storyPoints, linkedIssues
  slack      → mentions, parentAuthor,        0.25h      Title IS content. reactions = sentiment.
               reactions (sentiment)
  confluence → createdBy, watchers,           0.25h      version = effort signal, spaceKey =
               mentions, version                          container
  outlook    → from/to/cc, subject, duration  0.5h       Handle BOTH attendees shapes (number
                                                          AND string[]). subject = mini body.
  google-cal → organizer, attendees,          0.25h      recurring=true → isRoutine flag
               duration, recurring
  google-docs→ comments[].body, contributors, 0.5h       comments are body-equivalent (NEW!).
               suggestedEditors                           contributors = collaboration signal.
  google-sheets→ comments[].body, sheets[],   0.25h      sheets names = topic signal.
                  mentions                                comments = body-equivalent (NEW!).
  google-drive→ owner, slideCount             0.25h      Minimal but slideCount = scope.
  google-meet→ participants, duration         0.25h      Minimal.
  figma      → owner, commenters              0.25h      Minimal.
  onedrive   → sharedWith, size, parentPath   0.25h      Data exists, just not extracted.

Secret scanner for body field       ❌ NEW     0.5 day    Now scans 6 tool subtypes, not just
                                                          GitHub. Regex for API keys, conn
                                                          strings, passwords, tokens, emails.
                                                          Strip from: PR body, commit message,
                                                          Jira comments, email subject,
                                                          Google Docs/Sheets comments.

Activity ranking + cap (max 20)     ❌ NEW     0.5 day    Heuristic scoring using existing
                                                          signals (see Section 17).
                                                          NEW signals from mock data:
                                                          - isRoutine=true → score penalty
                                                          - sentiment reactions → score bonus
                                                          - linkedItems count → score bonus

OneDrive signal extraction          ❌ NEW     0.5 day    Add to signal-extractor.ts
                                                          sharedWith → collaborators
                                                          parentPath → container

Outlook/Google signal extraction    ❌ NEW     0.5 day    Add to signal-extractor.ts
                                                          from/to/cc → collaborators (Outlook)
                                                          attendees/participants → collaborators
                                                          (Google Cal/Meet/Docs/Sheets)
```

### Code Paths

```
1. NEW: backend/src/services/career-stories/activity-context.adapter.ts
   - ActivityContext interface (11 fields: 5 universal + 6 optional)
   - toActivityContext(activity: ToolActivity, userEmail: string): ActivityContext
   - 13 per-subtype extractors (see implementation map above)
   - Source data: mock-data.service.ts (v1, 893 lines) + mock-data-v2.service.ts (682 lines)

2. NEW: backend/src/services/career-stories/secret-scanner.ts
   - scanAndStrip(text: string): string
   - Patterns: AWS keys, connection strings, tokens, passwords, emails, IPs
   - Applied to body field from ALL 6 body-source tools (not just GitHub)

3. MODIFY: backend/src/services/career-stories/signal-extractor.ts
   - Add extractOneDriveSignals(), extractOutlookSignals(), extractGoogleSignals()
   - Outlook: from/to/cc → collaborators (handle both number and string[] attendees)
   - Google: organizer/attendees/participants/contributors → collaborators
   - OneDrive: sharedWith → collaborators, parentPath → container

4. MODIFY: backend/src/services/ai/prompts/career-story.prompt.ts
   - Add `activities?: ActivityContext[]` to JournalEntryContent interface
   - Pass activities to Handlebars template

5. MODIFY: backend/src/services/ai/prompts/templates/career-story-user.prompt.md
   - Add {{#if activities}} section with per-activity rendering:
     {{#each activities}}
     - [{{date}}] {{source}}{{#if sourceSubtype}}/{{sourceSubtype}}{{/if}}: {{title}}
       {{#if body}}Details: {{body}}{{/if}}
       {{#if people}}People: {{people}}{{/if}}
       {{#if labels}}Labels: {{labels}}{{/if}}
       {{#if scope}}Scope: {{scope}}{{/if}}
       {{#if sentiment}}Team response: {{sentiment}}{{/if}}
       {{#if linkedItems}}Connected to: {{linkedItems}}{{/if}}
     {{/each}}
```

### Updated Architecture After All Fixes

```
                       AFTER FIXES
  ═══════════════════════════════════════════════════════════

  ToolActivity ──┬── rawData (per-tool JSON)
                 │
                 ├── RefExtractor (cross-tool refs → clustering edges)
                 │       ✅ GitHub, Jira, Confluence, Slack, Figma, Google
                 │       ❌ OneDrive, Outlook (deferred)
                 │
                 ├── SignalExtractor (people + container → clustering edges)
                 │       ✅ GitHub, Jira, Slack, Confluence, Figma
                 │       🆕 OneDrive, Outlook, Google (add signal extraction)
                 │
                 ├── IdentityMatcher (user's role per activity)
                 │       ✅ All tools
                 │
                 └── ActivityContextAdapter (NEW — per-tool normalization)
                         │
                         ├── SecretScanner (strip credentials from body)
                         ├── ActivityRanker (score + select top 20)
                         └── Normalized ActivityContext[]
                                │
                                v
                    ┌─────────────────────────┐
                    │  Career Story LLM       │
                    │  RECEIVES:              │
                    │   ✅ fullContent         │
                    │   ✅ format7Data         │  ← Fix #3
                    │   ✅ extractedContext    │
                    │   ✅ archetype           │
                    │   🆕 activities[]       │  ← Fix #1
                    │      (normalized,        │
                    │       secret-scanned,    │
                    │       ranked top 20)     │
                    └─────────────────────────┘
```

---

## 17. Activity Ranking & Capping

### The Problem

A journal entry can have 50+ activities. Passing all 50 to the Career Story LLM:
- **Blows the token budget** (50 × ~300 tokens = 15K extra → F3 failure mode)
- **Dilutes signal** — contextual meetings drown out the core PRs
- **Wastes money** — most activities add no story value

But not all activities are equal. A merged PR with 450 additions and 3 reviewers is far more story-worthy than a Slack message with 2 reactions.

### Existing Ranking Signals (Already Computed, Currently Unused for Capping)

```
SIGNAL               SOURCE                              COMPUTED AT         STORAGE
══════════════════════════════════════════════════════════════════════════════════════
activityEdges        LLM (journal narrative prompt)       Journal creation    format7Data.activityEdges
  → primary            "Core work that delivers outcome"
  → supporting         "Enables or validates primary work"
  → contextual         "Background context (meetings)"
  → outcome            "Results that prove impact"

importance           LLM (analyzer-agent, MCP pipeline)   Activity sync       Format7Activity.importance
  → high/medium/low

businessImpact       LLM (analyzer-agent)                 Activity sync       AnalyzedActivity.businessImpact
  → high/medium/low

technicalComplexity  LLM (analyzer-agent)                 Activity sync       AnalyzedActivity.technicalComplexity
  → 1-5 scale

dominantRole ratio   Heuristic (ownership field matching)  Journal creation    format7Data.dominantRole
  → Led (≥50%), Contributed (≥20%), Participated (<20%)

timeInvestment       LLM (analyzer-agent)                 Activity sync       AnalyzedActivity.timeInvestment
  → estimated minutes

CODE LOCATIONS:
  activityEdges:       journal.service.ts:2021-2025 (fallback), draft-story-user.prompt.md:58-63 (LLM)
  importance:          analyzer-agent.ts:269, generator-agent.ts:278-281 (sort logic)
  businessImpact:      analyzer-agent.ts:18
  technicalComplexity: analyzer-agent.ts:17
  dominantRole:        journal.service.ts:2121-2141 (heuristic ratio)
  timeInvestment:      analyzer-agent.ts:20
```

### Proposed: Heuristic Ranking (No Extra LLM Call)

These signals already exist on most activities. Use them to score and rank **without** another LLM call:

```typescript
// In activity-context.adapter.ts

interface RankedActivity {
  activity: ToolActivity;
  score: number;           // 0-10 composite score
  signals: string[];       // Human-readable reasons for ranking
}

function rankActivities(
  activities: ToolActivity[],
  format7Data: Format7Data | null,
  maxCount: number = 20
): RankedActivity[] {

  const scored = activities.map(activity => {
    let score = 0;
    const signals: string[] = [];
    const raw = activity.rawData as any;
    const edge = format7Data?.activityEdges?.find(e => e.activityId === activity.id);

    // Signal 1: Activity edge type (from journal LLM analysis)
    // primary=3, outcome=2.5, supporting=1.5, contextual=0.5
    const EDGE_SCORES = { primary: 3, outcome: 2.5, supporting: 1.5, contextual: 0.5 };
    if (edge?.type) {
      score += EDGE_SCORES[edge.type] || 1;
      signals.push(`edge:${edge.type}`);
    } else {
      score += 1;  // No edge data = assume medium
    }

    // Signal 2: Has rich content (body/comments — 6 of 13 subtypes)
    const bodyContent = raw?.body || raw?.message                    // GitHub PR/commit
      || raw?.comments?.map((c: any) => c.body).join(' ')           // Jira, Google Docs/Sheets
      || raw?.subject                                                // Outlook
      || '';
    if (bodyContent.length > 50) {
      score += 2;
      signals.push(`has-body:${bodyContent.length}chars`);
    }

    // Signal 3: Code scope (additions + deletions)
    const codeSize = (raw?.additions || 0) + (raw?.deletions || 0);
    if (codeSize > 200) { score += 1.5; signals.push(`code:${codeSize}`); }
    else if (codeSize > 50) { score += 0.5; signals.push(`code:${codeSize}`); }

    // Signal 4: People involved (reviews = collaboration = story-worthy)
    // Handle ALL people fields discovered in mock data
    const peopleCount = (raw?.reviewers?.length || 0) + (raw?.watchers?.length || 0)
      + (raw?.mentions?.length || 0) + (raw?.commenters?.length || 0)
      + (raw?.contributors?.length || 0) + (raw?.suggestedEditors?.length || 0)
      + (Array.isArray(raw?.attendees) ? raw.attendees.length : 0)
      + (Array.isArray(raw?.to) ? raw.to.length : 0)
      + (Array.isArray(raw?.cc) ? raw.cc.length : 0)
      + (raw?.sharedWith?.length || 0) + (raw?.participants?.length || 0);
    if (peopleCount >= 3) { score += 1.5; signals.push(`people:${peopleCount}`); }
    else if (peopleCount >= 1) { score += 0.5; signals.push(`people:${peopleCount}`); }

    // Signal 5: Labels indicate importance
    const labels = raw?.labels || [];
    const highSignalLabels = labels.filter((l: string) =>
      /security|breaking|critical|urgent|p0|p1|hotfix|incident/i.test(l)
    );
    if (highSignalLabels.length > 0) {
      score += 1;
      signals.push(`labels:${highSignalLabels.join(',')}`);
    }

    // Signal 6: Is a merge/completion event (not draft/WIP)
    if (raw?.state === 'merged' || raw?.status === 'Done' || raw?.status === 'Resolved') {
      score += 0.5;
      signals.push('completed');
    }

    // Signal 7 (NEW from mock data): Slack reactions = team sentiment
    const totalReactions = raw?.reactions?.reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    if (totalReactions >= 10) { score += 1.0; signals.push(`reactions:${totalReactions}`); }
    else if (totalReactions >= 3) { score += 0.5; signals.push(`reactions:${totalReactions}`); }

    // Signal 8 (NEW from mock data): Structural connections
    const linkedCount = (raw?.linkedIssues?.length || 0) + (raw?.requestedReviewers?.length || 0);
    if (linkedCount > 0) {
      score += 0.5;
      signals.push(`linked:${linkedCount}`);
    }

    // Signal 9 (NEW from mock data): Routine meeting penalty
    if (raw?.recurring === true) {
      score -= 1.0;
      signals.push('routine:-1');
    }

    return { activity, score, signals };
  });

  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount);
}
```

### Scoring Breakdown

```
SIGNAL                   MAX POINTS    SOURCE                     LLM CALL?
═══════════════════════════════════════════════════════════════════════════════
Activity edge type       3.0           format7Data                No (already computed)
Has rich body/comments   2.0           rawData (6 tool subtypes)  No (field check)
Code scope (LOC)         1.5           rawData                    No (field check)
People involved          1.5           rawData (13 people fields) No (field check)
High-signal labels       1.0           rawData.labels             No (regex)
Slack reactions          1.0           rawData.reactions          No (sum check)
Structural connections   0.5           rawData.linkedIssues       No (field check)
Completion state         0.5           rawData.state              No (field check)
Routine meeting penalty  -1.0          rawData.recurring          No (boolean check)
─────────────────────────────────────────────────────────────────────────────────
MAX TOTAL                11.0          All heuristic              Zero LLM calls
MIN (routine meeting)    -1.0          Calendar recurring         Zero LLM calls
```

### Concrete Scoring Examples (from mock data)

```
ACTIVITY (v1)                              SIGNAL SCORES                           TOTAL
═══════════════════════════════════════════════════════════════════════════════════════════
GitHub PR #42 (OAuth2 auth)                edge:primary(3) + body:340chars(2)      9.5
  merged, +450/-120, 15 files, 3 reviewers + code:570(1.5) + people:3(1.5)
  labels: [security, auth], body: rich     + labels:security(1) + completed(0.5)

Jira BILL-550 (P1 incident)               edge:primary(3) + people:2(0.5)         6.0
  Done, Critical, 8 story points           + labels:incident,P1(1) + completed(0.5)
  labels: [incident, P1, billing]          + linked:0(0) + (no body in this one)
                                           + (assume edge=primary if unknown: +1)

Slack launch announcement (v2)             edge:contextual(0.5) + reactions:20(1)  3.0
  reactions: rocket:12 + tada:8            + people:1(0.5) + completed(0.5)

Google Calendar 1:1 with EM (v2)           edge:contextual(0.5) + people:2(0.5)   0.0
  recurring=true, 30min, 2 attendees       + routine:-1.0

Google Calendar design review (v2)         edge:supporting(1.5) + people:4(1.5)   3.5
  one-off, 60min, 4 attendees              + completed(0.5)
```

**Result**: PR #42 (9.5) ranks first. Recurring 1:1 (0.0) ranks last. This matches intuition.

### Why NOT an LLM Call for Ranking

| Factor | Heuristic | LLM Call |
|--------|-----------|----------|
| Latency | ~5ms | ~500ms (Haiku) |
| Cost | $0 | ~$0.001/call |
| Reliability | Deterministic | May vary per call |
| Existing data | Uses signals already computed | Redundant with analyzer-agent |
| Failure mode | Graceful — worst case sends all 20 | Failure blocks generation |

The analyzer-agent **already** assigns importance/businessImpact/complexity via LLM during activity sync. The heuristic ranker reuses those judgments. A second LLM call would be paying to re-decide what was already decided.

### When to Consider LLM Ranking (Later)

LLM ranking makes sense when:
1. **Activities span multiple stories** — deciding which story an activity belongs to (clustering redesign)
2. **User has explicit goal** — "I want to focus on the auth work" (could filter by semantic relevance)
3. **Cross-entry ranking** — comparing activities from different journal entries

### Edge Cases

```
CASE                          HANDLING
══════════════════════════════════════════════════════════════
< 20 activities               Pass all (no ranking needed)
All activities score 0        Pass first 20 chronologically
format7Data.activityEdges null Score without edge signal (+1 base)
rawData is empty/null         Score 0, deprioritized (correct behavior)
Duplicate activities          Dedupe by ID before ranking
Demo mode activities          Same ranking logic (rawData shape matches)
```

### Code Paths

```
1. NEW: backend/src/services/career-stories/activity-context.adapter.ts
   - rankActivities() function
   - Uses format7Data.activityEdges (already on JournalEntry)
   - Uses rawData fields (already on ToolActivity)
   - Returns top 20 with scores for debugging

2. MODIFY: backend/src/services/story-wizard.service.ts
   - After fetching activities (line 548-555), call rankActivities()
   - Pass ranked subset to ActivityContext adapter
   - Log: "Ranked ${total} activities, selected top ${selected}"

3. MODIFY: backend/src/services/career-stories/career-story.service.ts
   - Same ranking in promote/regenerate paths
   - Consistent cap across all 3 generation paths
```

---

## 18. Refactoring Opportunities (GSE+DLG Pass)

> **Status**: IDENTIFIED — needs GSE (architecture) + DLG (execution) review once full context is established.
> These are patterns that emerged from the gap analysis that indicate deeper structural issues.

### R1: Three Generation Paths, One Should Exist

```
CURRENT:
  Wizard path   → story-wizard.service.ts     → builds JournalEntryContent (BROKEN)
  Promote path  → career-story.service.ts     → builds JournalEntryContent (PARTIAL)
  Regenerate    → career-story.service.ts     → builds JournalEntryContent (PARTIAL)

Each path independently:
  - Fetches the journal entry
  - Extracts format7Data fields (or doesn't)
  - Builds JournalEntryContent
  - Calls buildCareerStoryMessages()

PROBLEM: Three places to build the same input. Wizard path forgot format7Data.
         Promote path doesn't pass archetype. Regenerate path doesn't pass extractedContext.
         Every gap fix must be applied in 3 places.
```

**Proposed**: Single `buildLLMInput()` function that all three paths call.

```typescript
// NEW: backend/src/services/career-stories/llm-input.builder.ts

function buildLLMInput(params: {
  journalEntry: JournalEntry;          // with format7Data
  activities: ToolActivity[];           // raw activities
  archetype?: StoryArchetype;
  extractedContext?: ExtractedContext;
  style?: WritingStyle;
  userPrompt?: string;
}): JournalEntryContent & { activities: ActivityContext[] }
```

**Files affected**:
- `story-wizard.service.ts` lines 476-511 → replace with `buildLLMInput()`
- `career-story.service.ts` lines 421-467 → replace with `buildLLMInput()`
- `career-story.service.ts` lines 1115-1180 (regenerate) → replace with `buildLLMInput()`

### R2: Signal Extraction Duplicated Across Layers

```
CURRENT:
  signal-extractor.ts     → extracts people + container (for clustering)
  journal-narrative.prompt.ts → extracts rawData context (for journal LLM)
  activity-context.adapter.ts (NEW) → extracts people + body + labels (for career story LLM)

Three extractors, each reading the same rawData with different per-tool switch statements.
```

**Proposed**: Single per-tool `rawDataExtractor` that returns ALL signals, consumed by different layers.
The ActivityContext interface (Section 16) already defines the unified shape. Make the adapter
the single source of truth, and have SignalExtractor + journal prompt consume from it.

```typescript
// Refactored: backend/src/services/career-stories/raw-data-extractor.ts

interface RawDataSignals {
  // For clustering (Layer 2+3)
  collaborators: string[];
  container: string | null;
  // For LLM input (Layer 4 — new)
  body?: string;            // 6 of 13 subtypes (see Section 16 mock data evidence)
  labels?: string[];
  scope?: string;
  people: string[];
  userRole: string;
  // For ranking (Section 17 — new)
  sentiment?: string;       // Slack reactions
  linkedItems?: string[];   // Jira linkedIssues
  isRoutine?: boolean;      // Google Calendar recurring
}

function extractSignals(activity: ToolActivity, userEmail?: string): RawDataSignals
```

**Impact**: Eliminates 3 separate per-tool switch statements → 1 source of truth.
Mock data files (`mock-data.service.ts`, `mock-data-v2.service.ts`) serve as the field
reference for each tool's rawData shape — 13 subtypes fully documented.

### R3: evaluateStory() — Wizard vs CLI Evaluator Split

```
CURRENT:
  story-wizard.service.ts:308-365  → evaluateStory() — 4 signals, base 5.0
  story-evaluator.ts:14-120        → scoreStoryRuleBased() — 5 dimensions, weighted

Same concept, different implementations, different locations, one unused in the wizard.
```

**Proposed**: Delete wizard `evaluateStory()`, import CLI `scoreStoryRuleBased()`, expose breakdown to frontend.

### R4: Handlebars Template Injection Risk (F18)

```
CURRENT:
  career-story-user.prompt.md uses {{variable}} for user-controlled data
  If rawData.body contains "{{constructor}}" or "{{toString}}" → Handlebars prototype pollution

  This is not hypothetical — PR titles and bodies are user-authored text.
```

**Options (GSE to decide)**:
1. **Escape all rawData inputs** before passing to Handlebars (safe, low effort)
2. **Build activity section as plain string**, only use Handlebars for framework structure (safer, medium effort)
3. **Switch to tagged template literals** and drop Handlebars for user-facing data (safest, high effort)

### R5: Static Archetype Hooks vs LLM-Generated

```
CURRENT:
  story-wizard.service.ts:168-177  → 8 static hook strings
  story-wizard.service.ts:509-511  → truncate(userAnswer, 200) || staticHook

Both are bad:
  - Static hooks are generic ("When the alert came in, everything changed")
  - Truncated answers lose context ("We had been struggling with perfor...")
```

**Proposed**: Move hook to LLM output schema (Gap #6). Delete static hooks entirely. No fallback — if the LLM can't write a hook, the story itself is probably bad.

### R6: ARCHETYPE_GUIDANCE Lives in Prompt File, Not Shared

```
CURRENT:
  career-story.prompt.ts:133-142   → ARCHETYPE_GUIDANCE (used in career story generation)
  archetype-detector.ts            → Separate archetype definitions
  story-evaluator.ts               → Separate archetype keyword checks
  questions.ts:8-318               → Separate archetype question banks

Four files, each with their own view of what an archetype means.
```

**Proposed**: Single `archetypes.ts` constants file with:
- Name, display label, description
- Guidance text (for LLM prompts)
- Evaluation keywords (for scoring)
- Question templates (for D-I-G)
- Static hooks (until LLM hooks ship)

### Summary: Refactoring Priority

```
REF    DESCRIPTION                    BLOCKS FIX    EFFORT    URGENCY
═══════════════════════════════════════════════════════════════════════
R1     Single buildLLMInput()          #1, #3        0.5d      HIGH — without this, Fix #1
                                                               must be applied in 3 places
R2     Unified rawDataExtractor        #1            0.5d      MEDIUM — cleanup, not blocking
R3     Merge evaluator into wizard     #4            0.25d     LOW — works without it
R4     Handlebars injection safety     #1            0.25d     HIGH — security, blocks rawData
R5     LLM hooks (kill static)         #6            0d        FREE — just schema change
R6     Unified archetype constants     none          0.5d      LOW — cleanup
```

**Recommended order**: R4 (security) → R1 (unblocks Fix #1) → R5 (free) → R2 → R3 → R6

---

## 19. File Reference Index

### Backend — Core Services

| File | Lines | What |
|------|-------|------|
| `backend/src/services/story-wizard.service.ts` | 1-895 | Wizard 2-step flow (analyze + generate) |
| `backend/src/services/career-stories/career-story.service.ts` | 1-1541 | Career story CRUD, promote, regenerate |
| `backend/src/services/career-stories/production-sync.service.ts` | 1-900 | Activity ingestion + clustering + journal creation |
| `backend/src/services/career-stories/clustering.service.ts` | — | 2-layer clustering (heuristic + LLM) |
| `backend/src/services/career-stories/story-source.service.ts` | 14-21 | VAGUE_PATTERNS regex; 68-107 source coverage |
| `backend/src/services/career-stories/signal-extractor.ts` | — | Clustering signals from rawData (L2+L3) |
| `backend/src/services/career-stories/pipeline/ref-extractor.ts` | — | Cross-tool explicit references (L1) |
| `backend/src/services/activity.service.ts` | 1050-1065 | Activity → story attachment priority |

### Backend — Mock Data (rawData Field Reference)

| File | Lines | What |
|------|-------|------|
| `backend/src/services/career-stories/mock-data.service.ts` | 1-893 | V1: ~70 activities, 13 tool subtypes, 3 projects. rawData shapes for ALL tools. |
| `backend/src/services/career-stories/mock-data-v2.service.ts` | 1-682 | V2: 32 activities, 2 stories + 8 unclustered. Outlook email schema (from/to/cc). |
| `backend/src/services/career-stories/seed.service.ts` | 1-972 | Demo data seeding orchestrator |

### Backend — Activity Analysis & Ranking

| File | Lines | What |
|------|-------|------|
| `backend/src/services/mcp/agents/analyzer-agent.ts` | 17-22, 237-241, 269 | LLM activity analysis (importance, complexity, impact) |
| `backend/src/services/mcp/agents/generator-agent.ts` | 278-281 | Activity sort by importance |
| `backend/src/services/journal.service.ts` | 2021-2025 | activityEdges fallback (all primary) |
| " | 2121-2141 | dominantRole heuristic (ownership ratio) |
| `backend/src/services/mcp/transformers/format7-transformer.service.ts` | 181 | Format7Activity.importance passthrough |
| `src/types/activity.ts` | 152-181 | ActivityStoryEdge types + display labels |

### Backend — Prompts & Templates

| File | Lines | What |
|------|-------|------|
| `backend/src/services/ai/prompts/career-story.prompt.ts` | 21-35 | JournalEntryContent type (what LLM gets) |
| " | 183-210 | getCareerStoryUserPrompt() template data |
| " | 216-246 | buildCareerStoryMessages() system+user |
| " | 251-278 | formatExtractedContext() — the weak directive |
| `backend/src/services/ai/prompts/templates/career-story-system.prompt.md` | 1-240 | Laszlo Bock voice + anti-verbosity rules |
| `backend/src/services/ai/prompts/templates/career-story-user.prompt.md` | 1-106 | User prompt Handlebars template |
| `backend/src/services/ai/prompts/templates/wizard-questions.prompt.md` | 1-100 | D-I-G question generation rules |
| `backend/src/services/ai/prompts/wizard-questions.prompt.ts` | 94-129 | buildWizardQuestionMessages() |
| `backend/src/services/ai/prompts/journal-narrative.prompt.ts` | 123-156 | formatEnhancedActivitiesForPrompt() |
| " | 168-188 | extractRawDataContext() — where body is lost |

### Backend — Archetype & Questions

| File | Lines | What |
|------|-------|------|
| `backend/src/cli/story-coach/services/archetype-detector.ts` | — | Haiku LLM archetype detection |
| `backend/src/cli/story-coach/questions.ts` | 8-318 | Static question bank (8 archetypes × 6 questions) |
| `backend/src/cli/story-coach/services/story-evaluator.ts` | 14-120 | 5-dimension scoring (unused in wizard) |

### Backend — Data Models

| File | Lines | What |
|------|-------|------|
| `backend/prisma/schema.prisma` | 419-499 | JournalEntry model (format7Data field) |
| " | 1370-1404 | ToolActivity model (rawData field) |
| " | 1426-1498 | CareerStory model |
| `backend/src/services/mcp/transformers/github.transformer.ts` | 77-108 | GitHub PR rawData shape |
| `backend/src/services/mcp/transformers/onedrive.transformer.ts` | — | OneDrive rawData (sharedWith[], lastModifiedBy) |
| `backend/src/services/journal-subscription.types.ts` | 245 | DEFAULT_IMPORTANCE = 'medium' |

### Frontend — Wizard & Display

| File | Lines | What |
|------|-------|------|
| `src/components/story-wizard/StoryWizardModal.tsx` | 55-673 | 3-step wizard UI |
| `src/components/story-wizard/WizardLoadingState.tsx` | — | Loading screen with rotating facts |
| `src/components/story-wizard/ArchetypeSelector.tsx` | — | Archetype dropdown |
| `src/components/career-stories/NarrativePreview.tsx` | 88-1072 | Generated story display |
| `src/components/career-stories/NarrativeStatusBadge.tsx` | 6-119 | Quality badge (Ready/Polish/Draft) |
| `src/components/career-stories/FormatSwitchModal.tsx` | — | Framework/style regeneration |
| `src/components/career-stories/constants.ts` | 36-41 | Confidence thresholds (0.8/0.5) |
| `src/pages/journal/list.tsx` | 412-423 | "Promote to Story" trigger |

---

*End of gap analysis. Ship order: R4 (security) → Fix #3 (0.25d) → R1 (0.5d) → Fix #1 (2.5d) → Fix #2 (0.5d). GSE+DLG review refactoring opportunities before implementation.*
