# Wizard Pipeline Quality Fix — Handoff

> **Branch:** `worktree-wizard-pipeline-fix`
> **Plan:** `docs/plans/wizard-pipeline/2026-02-12-wizard-pipeline-implementation.md`
> **Last updated:** 2026-02-20
> **Status:** All 7 tasks COMPLETE

## What This Branch Does

Fixes the career story generation pipeline so it produces interview-ready stories with real evidence, not vague summaries of summaries. The root cause: the LLM gets `fullContent` (a 3rd-order derivative) and never sees raw activity data from GitHub PRs, Jira tickets, Slack threads, etc.

## All Tasks Complete (1-7)

### Commits (5, in order)

1. **`0f20aac` — Handlebars injection protection + secret scanner (Tasks 1-2)**
   - `handlebars-safe.ts`: `compileSafe()` (prototype blocking) + `escapeHandlebarsInput()` (brace escaping)
   - `secret-scanner.ts`: `scanAndStrip()` — strips AWS keys, GitHub/npm tokens, JWT, connection strings, passwords, emails, IPv4
   - Replaced `Handlebars.compile()` in all 5 prompt files
   - 29 tests

2. **`99e80a0` — Unified buildLLMInput() (Task 3)**
   - `llm-input.builder.ts` — single source of truth for `JournalEntryContent` building
   - Wizard path now fetches `format7Data` (was missing from Prisma select)
   - 10 tests

3. **`4e47bd0` — Handoff document**

4. **`ed55239` — ActivityContext adapter + wire into LLM + D-I-G 3Q + smoke test (Tasks 4-7)**
   - `activity-context.adapter.ts`: `toActivityContext()` + `rankActivities()` with 9-signal heuristic scoring
   - Activities wired as peer of journalEntry into career story prompts (RH-3)
   - D-I-G questions reduced from 6 to 3 gap-targeted with `knownContext`
   - `enforceQuestionCount()` guarantees exactly 3 via slice+fallback (RJ-6)
   - Token usage logging extracted to shared `logTokenUsage()` helper
   - Handlebars injection protection for activity bodies (B-3)
   - Integration smoke test validates full pipeline
   - 203 tests across 7 test files

### Test Status

**203 unit + integration tests pass** (zero regressions):
```
activity-context.adapter.test.ts         31 tests
activity-pipeline.integration.test.ts     8 tests
wizard-questions.prompt.test.ts          39 tests
career-story.prompt.test.ts              33 tests
pipeline/integration.test.ts             30 tests
derivation.service.test.ts               27 tests
clustering.service.test.ts               35 tests
```

Note: Database-dependent tests (story-wizard.service, career-story.service, etc.) require `DATABASE_URL` and are skipped in CI-less environments. This is pre-existing behavior.

### Files Created (9)

| File | Purpose |
|------|---------|
| `backend/src/services/ai/prompts/handlebars-safe.ts` | `compileSafe()`, `escapeHandlebarsInput()`, `SafeTemplate` type |
| `backend/src/services/ai/prompts/handlebars-safe.test.ts` | 12 tests |
| `backend/src/services/career-stories/secret-scanner.ts` | `scanAndStrip()` — credential/PII stripping |
| `backend/src/services/career-stories/secret-scanner.test.ts` | 17 tests |
| `backend/src/services/career-stories/llm-input.builder.ts` | `buildLLMInput()` — unified JournalEntryContent builder |
| `backend/src/services/career-stories/llm-input.builder.test.ts` | 10 tests |
| `backend/src/services/career-stories/activity-context.adapter.ts` | `toActivityContext()`, `rankActivities()` — 7 tool extractors + ranker |
| `backend/src/services/career-stories/activity-context.adapter.test.ts` | 31 tests (GitHub, Jira, Slack, Calendar, Outlook, Default, Ranking, Edge cases) |
| `backend/src/services/career-stories/activity-pipeline.integration.test.ts` | 8 integration smoke tests |

### Files Modified (9)

| File | Change |
|------|--------|
| `career-story.prompt.ts` | `compileSafe` import, `activities?: ActivityContext[]` in params, `escapeHandlebarsInput` for bodies, `logTokenUsage()` helper |
| `career-story.prompt.test.ts` | +2 tests for activities section rendering |
| `career-story-user.prompt.md` | Added `## Source Activities (Raw Evidence)` template section |
| `wizard-questions.prompt.ts` | `KnownContext` interface, `enforceQuestionCount()`, 3-question parser, knownContext in messages |
| `wizard-questions.prompt.test.ts` | Rewritten: 39 tests (3Q format, enforceQuestionCount, knownContext rendering) |
| `wizard-questions.prompt.md` | Rewritten: 3 targeted questions, knownContext "DO NOT ask" section |
| `story-wizard.service.ts` | Activity fetch+rank in `analyzeEntry()` + `generateStory()`, knownContext extraction, enforceQuestionCount, logTokenUsage |
| `career-story.service.ts` | `rankActivities()` in `generateSectionsWithLLM()`, activities as peer, logTokenUsage |
| `cluster-assign.prompt.ts` | `compileSafe` import |

---

## Architecture Rules Applied

1. **Activities are PEER of journalEntry** in `buildCareerStoryMessages()`, not nested inside `JournalEntryContent` (RH-3)
2. **`buildLLMInput()` handles journal data only** — activity ranking is a separate composable step (RH-2)
3. **Adapter is a pure data normalizer** — `cleanBody()` calls `scanAndStrip()`, NOT `escapeHandlebarsInput()` (RH-1)
4. **Ranker reads only ActivityContext fields** — never bypasses adapter to access rawData directly (RH-4)
5. **KnownContext takes primitives** — `{ dateRange?, collaborators?, codeStats? }`, not `ActivityContext[]` (RH-5)
6. **Question count enforced** — `slice(0, 3)` + fallback padding, not trusted from LLM output (RJ-6)
7. **`escapeHandlebarsInput()` called in PROMPT LAYER** — when building template data that includes user-authored content

## Code Masters Review Findings (All Resolved)

| ID | Finding | Fix |
|----|---------|-----|
| KB-2 | Placeholder test in adapter | Replaced with 3 real edge case tests |
| KB-3 | Missing empty-input edge case | Added `rankActivities([], null, 'me')` test |
| KB-4 | Missing null rawData edge case | Added `{ rawData: null }` and `{ rawData: undefined }` tests |
| F-2 | EDGE_SCORES recreated per activity | Hoisted to module-level constant |
| F-3 | Empty selfIdentifier intent unclear | Added comment explaining intent |
| B-2 | Token logging duplicated in 2 services | Extracted `logTokenUsage()` helper |
| B-3 | Activity bodies not escaped for Handlebars | Added `escapeHandlebarsInput()` in prompt layer |

---

## Next Steps (Post-Merge)

1. **Manual QA with real data** — Run wizard on a real journal entry with GitHub/Jira activities and verify the story contains specific PR numbers, reviewer names, and metrics
2. **Token budget monitoring** — Watch for `logTokenUsage` warnings if input exceeds 15K tokens (indicates too many activities or long bodies)
3. **Consider adding extractors** for currently-default tools (Confluence, Google Drive, Figma) if they gain richer rawData
4. **Profile permalink integration** — The career story output can feed into the Career Chronicle shareable profile (commit `8dbd1d1`)
