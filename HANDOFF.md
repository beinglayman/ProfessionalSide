# Wizard Pipeline Quality Fix — Handoff

> **Branch:** `worktree-wizard-pipeline-fix`
> **Plan:** `docs/plans/wizard-pipeline/2026-02-12-wizard-pipeline-implementation.md`
> **Session date:** 2026-02-20

## What This Branch Does

Fixes the career story generation pipeline so it produces interview-ready stories with real evidence, not vague summaries of summaries. The root cause: the LLM gets `fullContent` (a 3rd-order derivative) and never sees raw activity data from GitHub PRs, Jira tickets, Slack threads, etc.

## What's Done (Tasks 1-3 + CM Review)

### Commits (4, in order)

1. **`8c4f702` — Handlebars template injection protection**
   - Created `handlebars-safe.ts` with `compileSafe()` (prototype access blocking) and `escapeHandlebarsInput()` (brace escaping for user strings)
   - Exported `SafeTemplate` type alias
   - Replaced `Handlebars.compile()` in all 5 prompt files: career-story, derivation, journal-narrative, wizard-questions, cluster-assign
   - 12 tests

2. **`354b1c9` — Secret scanner**
   - Created `secret-scanner.ts` with `scanAndStrip()` — strips AWS keys, GitHub/npm tokens, JWT, connection strings, passwords, emails, IPv4
   - Plain `RegExp[]` array (no unused metadata)
   - Password-env regex tightened: requires `=` + 8+ char value (won't false-positive on prose like "set TOKEN to authenticate")
   - Email redaction kept (stories can be published)
   - 17 tests

3. **`a8a7e88` — Unified buildLLMInput()**
   - Created `llm-input.builder.ts` — single source of truth for `JournalEntryContent` building
   - Wizard path now fetches `format7Data` (was missing from Prisma select)
   - Wired into wizard path (`story-wizard.service.ts`) and promote path (`career-story.service.ts`)
   - Extracts phases, skills, dominantRole, impactHighlights from format7Data with fallback chains
   - 10 tests

4. **`02bbdda` — Code Masters review fixes (C-1 through C-7)**
   - All 7 findings from KB, Fowler, Sandi, Uncle Bob, DHH applied in one commit

### Test Status

**138 tests pass** across 7 test files, zero regressions:
```
handlebars-safe.test.ts          12 tests
secret-scanner.test.ts           17 tests
llm-input.builder.test.ts        10 tests
career-story.prompt.test.ts      31 tests
derivation.prompt.test.ts        32 tests
wizard-questions.prompt.test.ts  27 tests
cluster-assign.prompt.test.ts     9 tests
```

### Files Created (6)

| File | Purpose |
|------|---------|
| `backend/src/services/ai/prompts/handlebars-safe.ts` | `compileSafe()`, `escapeHandlebarsInput()`, `SafeTemplate` type |
| `backend/src/services/ai/prompts/handlebars-safe.test.ts` | 12 tests |
| `backend/src/services/career-stories/secret-scanner.ts` | `scanAndStrip()` — credential/PII stripping |
| `backend/src/services/career-stories/secret-scanner.test.ts` | 17 tests |
| `backend/src/services/career-stories/llm-input.builder.ts` | `buildLLMInput()` — unified JournalEntryContent builder |
| `backend/src/services/career-stories/llm-input.builder.test.ts` | 10 tests |

### Files Modified (7)

| File | Change |
|------|--------|
| `career-story.prompt.ts` | `compileSafe` + `SafeTemplate` import, replace `Handlebars.compile` |
| `derivation.prompt.ts` | Same pattern, removed unused `Handlebars` import |
| `journal-narrative.prompt.ts` | Same pattern |
| `wizard-questions.prompt.ts` | Same pattern |
| `cluster-assign.prompt.ts` | Same pattern (keeps `Handlebars` import for `registerHelper`) |
| `story-wizard.service.ts` | Added `format7Data: true` to select, replaced manual builder with `buildLLMInput()` |
| `career-story.service.ts` | Replaced 15-line manual builder with `buildLLMInput()` |

---

## What's Remaining (Tasks 4-7)

### Task 4: ActivityContext Adapter + Ranker (1.0d) — THE CORE FIX

**Create:** `backend/src/services/career-stories/activity-context.adapter.ts` + test

Two exported functions:
- `toActivityContext(activity, selfIdentifier)` — normalizes rawData from any tool into uniform `ActivityContext` shape
- `rankActivities(activities, format7Data, selfIdentifier, maxCount=20)` — scores by 9 heuristic signals, returns top N

**ActivityContext interface:**
```typescript
interface ActivityContext {
  title: string; date: string; source: string; sourceSubtype?: string;
  people: string[]; userRole: string; body?: string; labels?: string[];
  scope?: string; container?: string; state?: string;
  linkedItems?: string[]; sentiment?: string; isRoutine?: boolean;
}
```

**7 dedicated extractors + 1 default:**
- GitHub (PR vs commit detection via `raw.number`), Jira, Slack, Outlook, Google Calendar, Google Docs, Google Sheets
- Default: Confluence, Google Drive, Google Meet, Figma, OneDrive — title+date+people only (RJ-4: no body, minimal signals)

**Key architecture rules (from RJ/RH review):**
- Adapter calls `scanAndStrip()` on body (security) — NOT `escapeHandlebarsInput()` (RH-1: adapter doesn't know about templates)
- Ranker reads ONLY from `ActivityContext` fields, never bypasses to rawData (RH-4)
- `cleanBody()` truncates to 500 chars after scanning

**9 ranking signals:**
1. Activity edge type from format7Data (primary=3, outcome=2.5, supporting=1.5, contextual=0.5)
2. Rich body content (>50 chars = +2)
3. Code scope (>200 lines = +1.5)
4. People involved (>=3 = +1.5)
5. High-signal labels (security, breaking, critical = +1)
6. Completion state (merged/Done = +0.5)
7. Reactions total (>=10 = +1.0)
8. Linked items (>0 = +0.5)
9. Routine meeting penalty (isRoutine = -1.0)

**Full test code and implementation are in the plan file**, lines 757-1575.

### Task 5: Wire ActivityContext Into LLM Pipeline (0.5d)

**Activities are a PEER of `journalEntry`, not a child (RH-3).** This is the key architecture decision.

Changes:
1. Add `activities?: ActivityContext[]` to `CareerStoryPromptParams` in `career-story.prompt.ts`
2. Pass `activities` to Handlebars template in `getCareerStoryUserPrompt()`
3. Add `## Source Activities (Raw Evidence)` section to `career-story-user.prompt.md` template (before `## Target Framework`)
4. In wizard/promote/regenerate paths: fetch activities → `rankActivities()` → pass `.map(r => r.context)` as peer param
5. **`buildLLMInput()` does NOT touch activities** — caller composes separately (RH-2)
6. Add `escapeHandlebarsInput()` call in prompt layer when passing activity bodies to template
7. Bump `maxTokens` from 2000 to 2500
8. Add token usage logging: `console.log` with input/output tokens, `console.warn` if input > 15K (RJ-7)
9. Add tests for activities section in prompt output

**Full instructions in plan**, lines 1578-1806.

### Task 6: Fast D-I-G — 3 Questions Not 6 (0.5d)

Changes:
1. Update `wizard-questions.prompt.md` template: add `## What the System Already Knows` section, change from 6 to 3 questions
2. Create `KnownContext` interface with primitives only (dateRange, collaborators, codeStats, tools, labels) — NOT `ActivityContext[]` (RH-5)
3. CALLER extracts primitives from ranked activities in `story-wizard.service.ts`
4. Pass `knownContext` to `buildWizardQuestionMessages()`
5. Enforce 3-question limit: `slice(0, 3)` + fallback padding with hardcoded questions (RJ-6)
6. Export `enforceQuestionCount()` function for testability
7. 3 targeted questions: obstacle (always), counterfactual (always), gap (one of: metric, people, decision, learning)

**Full instructions in plan**, lines 1809-2009.

### Task 7: Integration Smoke Test (0.25d)

- End-to-end test: mock activities → secret scanning → adapter → ranker → buildLLMInput → verify output
- Verify: API key stripped from PR body, PR ranked above routine 1:1, format7Data extracted correctly
- Run full backend test suite

**Full instructions in plan**, lines 2012-2108.

---

## How to Continue

```bash
# 1. Navigate to worktree
cd /Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/.claude/worktrees/wizard-pipeline-fix

# 2. Verify state
git log --oneline -5   # Should show 4 wizard commits + profile commit
cd backend && npx vitest run src/services/ai/prompts/ src/services/career-stories/  # 138 tests pass

# 3. Follow the plan
# Plan file: docs/plans/wizard-pipeline/2026-02-12-wizard-pipeline-implementation.md
# Tasks 4-7 have full code listings with exact file paths, test code, and implementation
```

**Execution order:** Task 4 → Task 5 (blocked by 4) → Task 6 (blocked by 5) → Task 7 (blocked by 6)

**Run CM review after Task 4+5** (the highest-risk code — adapter touches rawData from 13 tools).

---

## Key Architecture Rules (Don't Violate)

1. **Activities are PEER of journalEntry** in `buildCareerStoryMessages()`, not nested inside `JournalEntryContent` (RH-3)
2. **`buildLLMInput()` handles journal data only** — activity ranking is a separate composable step (RH-2)
3. **Adapter is a pure data normalizer** — `cleanBody()` calls `scanAndStrip()`, NOT `escapeHandlebarsInput()` (RH-1)
4. **Ranker reads only ActivityContext fields** — never bypasses adapter to access rawData directly (RH-4)
5. **`buildKnownContext()` takes primitives** — `{ dateRange?, collaborators?, codeStats? }`, not `ActivityContext[]` (RH-5)
6. **Question count enforced** — `slice(0, 3)` + fallback padding, not trusted from LLM output (RJ-6)
7. **`escapeHandlebarsInput()` called in PROMPT LAYER** — when building template data that includes user-authored content
