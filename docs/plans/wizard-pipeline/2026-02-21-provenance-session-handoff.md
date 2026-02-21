# Session Handoff: Wizard Pipeline — Provenance, Exaggeration Detection & DLG Fixes

## Date: 2026-02-21

<original_task>

**Two sequential tasks in this session:**

1. **Production outage recovery** — Frontend was down (503). User initially suspected PR #18 (wizard pipeline security hardening). After systematic debugging, root cause was an Azure App Service stuck VM, completely unrelated to PR #18. Fixed via VM reallocation (B1→B2→B1 scale). PR #18 was reverted then re-applied once proven innocent.

2. **Wizard pipeline improvements** — After recovery, user asked to:
   - Fix the wizard showing 5-6 questions instead of 3 (bug from static fallback path)
   - Run DLG (Diligent) review of story-wizard.service.ts for concrete improvements
   - Build exaggeration detection (investor/angel feedback: "highlight if something is an exaggeration")
   - Build sentence-level provenance ("track every sentence back to N activities — game changer")
   - Fix all 5 DLG-identified issues

</original_task>

<work_completed>

### 1. Production Outage Recovery (COMPLETE)

**Commits pushed to main:**
- `1976df3` — Revert PR #18 (unnecessary — backend only, not the cause)
- `6db32bc` — fix: bind frontend server to 0.0.0.0
- `8404eab` — ci: add server.mjs to frontend deploy trigger paths
- `b3e072d` through `0207e1a` — Multiple diagnostic CI iterations (temp, cleaned up)
- `16333f5` — ci: clean up frontend deploy workflow — replace temp diagnostics with health check
- `e05fdb7` — Reapply PR #18 (revert the revert — wizard pipeline security hardening restored)

**Root cause:** Azure App Service stuck worker VM. The `server.mjs` CMD change (from `vite preview` to `node server.mjs`) in commit `8dbd1d1` may have triggered the initial issue, but the persistent 503 was infrastructure. VM reallocation fixed it.

**Permanent fixes:**
- `server.mjs` now explicitly binds to `0.0.0.0` (good practice)
- `deploy-frontend.yml` includes `server.mjs` in trigger paths
- Temp diagnostic/scaling step replaced with lightweight health check (30s wait + curl + 5xx warning annotation)

### 2. Wizard Question Count Fix (COMPLETE — PUSHED)

**Commit:** `baab90f` — fix: limit wizard static fallback to 3 questions (1 per D-I-G phase)

**Bug:** Dynamic LLM path enforced 3 questions via `enforceQuestionCount()`, but the static fallback path (`transformQuestions()`) returned all 6 from `ARCHETYPE_QUESTIONS`.

**Fix in `story-wizard.service.ts` lines 474-481:**
```typescript
if (!questions) {
  const allStatic = transformQuestions(detection.primary.archetype);
  const byPhase = new Map<string, WizardQuestion>();
  for (const q of allStatic) {
    if (!byPhase.has(q.phase)) byPhase.set(q.phase, q);
  }
  questions = [...byPhase.values()].slice(0, 3);
}
```

### 3. DLG Review (COMPLETE — Analysis Only)

Identified 5 concrete issues in `story-wizard.service.ts`:

| # | Issue | Severity |
|---|-------|----------|
| 1 | `answersToContext` maps 6 IDs but only 3 questions asked — `namedPeople`, `metric`, `keyDecision`, `obstacle` never populated. Max score ceiling = 7.0 not 8.0. | Medium |
| 2 | `_sourceDebug` leaks internal data (table names, activity IDs, demo mode flags) to API response | Low |
| 3 | `create` + immediate `update` for `wizardAnswers` — 2 DB round-trips instead of 1 | Low |
| 4 | `archetype-detector.ts` uses raw `Handlebars.compile` — not `compileSafe` | Low |
| 5 | `archetype-detector.ts` uses CLI `callLLM` — bypasses `modelSelector` routing/cost tracking | Medium |

### 4. Plan: Provenance + Exaggeration Detection (COMPLETE — APPROVED)

**Plan file:** `docs/plans/wizard-pipeline/2026-02-21-provenance-exaggeration-detection.md`
**Also at:** `/Users/ketankhairnar/.claude/plans/delightful-skipping-tarjan.md`

Plan is fully approved by user. 4 phases, 5.75 days, 3 PRs:
- Phase 0: DLG Fixes (0.75d)
- Phase 1: Sentence-Level Provenance — prompt + parser + types (2.0d)
- Phase 2: Exaggeration Detection Backend (1.0d)
- Phase 3: Exaggeration Detection Frontend (1.5d)
- Phase 4: Polish & Backward Compat (0.5d)

### 5. Reference Architecture Exploration (COMPLETE — Research Only)

Explored `/Users/ketankhairnar/_work/code/sample-project/capture/pkg/intelligence/prompts` and `.../testdata/eval`:
- 5-stage intelligence pipeline with evidence-first prompts
- Every `why` field requires `[turn N: "quote"]` or `[artifact: file path]` citations
- `confidence: high|medium|low` on claims
- Gaps field for legitimate unknowns (not hallucinated fill)
- 4-perspective evaluation rubric (RJ/GSE/DLG) with anti-pattern scoring (-2.5 for hallucinations)

Key takeaway applied to plan: evidence is mandatory by architecture, not optional.

</work_completed>

<work_remaining>

### Phase 0: DLG Fixes — NOT STARTED

Execute exactly as specified in the approved plan. All 5 fixes:

**0A. Strip `_sourceDebug` from API response**
- File: `backend/src/controllers/story-wizard.controller.ts` line 108
- Destructure `_sourceDebug` out before `sendSuccess(res, clientResult)`

**0B. Merge create + update into single create**
- File: `backend/src/services/story-wizard.service.ts` lines 570-592
- Add `wizardAnswers: answers as any` to `prisma.careerStory.create()` data
- Delete the separate `prisma.careerStory.update()` at lines 589-592

**0C. archetype-detector: replace `Handlebars.compile` with `compileSafe`**
- File: `backend/src/cli/story-coach/services/archetype-detector.ts`
- Change import: `import { compileSafe } from '../../../services/ai/prompts/handlebars-safe'`
- Change line 20: `compileSafe(detectionTemplateRaw)` instead of `Handlebars.compile()`

**0D. archetype-detector: replace `callLLM` with `modelSelector`**
- File: `backend/src/cli/story-coach/services/archetype-detector.ts`
- Import `getModelSelector` from `../../services/ai/model-selector.service`
- Replace `callLLM()` with `getModelSelector()?.executeTask('analyze', messages, 'quick', ...)`
- Fallback: if null, return default firefighter archetype (existing pattern at line 61-78)

**0E. answersToContext: extract names + metrics from ALL answers**
- File: `backend/src/services/story-wizard.service.ts` after line 296
- After the for-loop in `answersToContext()`, scan all combined text for named people and metrics
- This unblocks the scoring ceiling (max was 7.0, should be 8.0+)

**Tests needed for Phase 0:**
- Unit test `answersToContext` with dynamic question IDs (not matching static patterns) — verify `namedPeople` and `metric` still extracted
- Verify `_sourceDebug` not in API response
- Run `npx vitest run` in backend/ to confirm no regressions

### Phase 1: Sentence-Level Provenance — NOT STARTED

Full details in plan file. Key tasks:
- 1A: Define `ProvenanceSentence`, `GroundingSource`, `ConfidenceLevel` types (backend + frontend)
- 1B: Update `career-story-system.prompt.md` with Provenance Rules section
- 1C: Update `career-story-user.prompt.md` JSON schema to include `sentences` array
- 1D: Add `validateSentences()` helper, update `parseCareerStoryResponse()`
- 1E: Bump `maxTokens` 2500→3500 in wizard + career-story services
- 1F: No migration needed — `sections` is Json column

### Phase 2: Exaggeration Detection Backend — NOT STARTED

- 2A: `ProvenanceWarning` type + `computeProvenanceWarnings()` in `story-source.service.ts`
- 2B: Integrate into `enrichStoryWithSources()` in `career-stories.controller.ts`
- 2C: Mirror types on frontend `src/types/career-stories.ts`

### Phase 3: Exaggeration Detection Frontend — NOT STARTED

- 3A: New `ProvenanceHighlight.tsx` component (yellow inline marks + tooltip)
- 3B: Integrate into `NarrativeSection.tsx`
- 3C: Wire through `NarrativePreview.tsx`
- 3D: Section header warning badge in `NarrativeSectionHeader.tsx`
- 3E: Story header summary ("3 unverified claims")

### Phase 4: Polish — NOT STARTED

- Backward compat (optional chaining on all `sentences` access)
- Promote path gets provenance for free
- E2E manual test

</work_remaining>

<attempted_approaches>

### Production Outage Debugging

1. **Reverted PR #18** — Wrong hypothesis. PR #18 was backend-only, outage was frontend. Revert was unnecessary but was the safe first response. Later re-applied via revert-the-revert.

2. **TypeScript compilation check** — Investigated whether TS errors from PR #18 caused crashes. Found 3 type-only errors (`usage` property, `JsonValue` narrowing) but confirmed production uses `npx tsx` which runs TS directly — type errors don't crash.

3. **Local Docker test** — Built and ran Docker image locally. Worked perfectly (200 OK). Proved the code was fine, issue was infrastructure.

4. **0.0.0.0 binding hypothesis** — Initially thought `app.listen(PORT)` without host was the cause. Verified via `/proc/*/net/tcp6` that the container was already binding to `::` (all interfaces). The fix is good practice but wasn't the root cause.

5. **Azure CLI diagnostics** — Multiple attempts to get container logs failed:
   - `az webapp log download` → 504 Gateway Timeout (SCM site was stuck too)
   - `az webapp log tail --timeout 15` → `--timeout` flag doesn't exist
   - User's personal Azure account couldn't access the subscription (`5b208464-...`)
   - Workaround: used GitHub Actions workflow as Azure CLI proxy

6. **Delete + recreate App Service** — User chose "try something else first" when this was suggested.

7. **VM reallocation via plan scaling** — B1→B2→B1 forced Azure to allocate a fresh VM. This fixed it. After the scale, site returned HTTP 200.

### Wizard Question Count

- Investigated frontend vs backend — confirmed frontend is fully dynamic (zero hardcoded questions), the issue was backend static fallback returning 6 instead of 3.

### DLG Review: answersToContext

- Considered two approaches for the 6→3 mapping:
  - (a) Remap the 3 questions to cover all context fields
  - (b) Extract names/metrics from free text of all 3 answers
  - Chose (b) because dynamic questions are open-ended — users type paragraphs with names and metrics naturally embedded.

</attempted_approaches>

<critical_context>

### Architecture

- **Career Stories pipeline**: Journal entry → Wizard (analyze + questions + generate) → CareerStory record with sections JSON + StorySource rows
- **Three generation paths** share the same prompt layer: wizard, promote (from journal), regenerate
- **`sections` is a Prisma `Json` column** — no migration needed to add `sentences` array inside section objects
- **`StorySource` table** stores user-curated sources (survive regeneration). Provenance is different — it's a generation artifact stored inside `sections` JSON.
- **Frontend rendering pipeline**: `NarrativePreview` → `NarrativeSection` → `AnnotatedText` → `renderEmphasisContent()` (emphasis-renderer.tsx)
- Existing `SourceCoverage.vagueMetrics` already detects 6 vague patterns regex-style — the `ProvenanceWarning` system extends this pattern

### Key Design Decisions (for this plan)

1. **Provenance at generation time** (same LLM call, not post-processing) — avoids doubling cost/latency
2. **Store in sections JSON** (not new DB table) — provenance is tied to generated text, replaced on regeneration
3. **`sentences[]` alongside `evidence[]`** — backward-compatible, existing stories render normally with `sentences: undefined`
4. **Exaggeration warnings are ephemeral** (computed from `sentences` data, not persisted) — unlike `StoryAnnotation` which is user-created and stored
5. **Bump maxTokens 2500→3500** — ~300 extra tokens for sentence-level provenance data

### Environment

- Production: Azure App Service (B1 plan, ACR-hosted Docker containers)
- Backend: `npx tsx src/app.ts` (runs TypeScript directly, TS errors don't crash)
- Frontend: `node server.mjs` (Express SSR for Career Chronicle meta tags, SPA fallback)
- Backend deploy: triggers on `backend/**` path changes
- Frontend deploy: triggers on `src/**`, `public/**`, `package.json`, `Dockerfile`, `server.mjs`, `.github/workflows/deploy-frontend.yml`
- Tests: `npx vitest run` in backend/ — 10 test files fail due to no local Postgres (pre-existing, expected)

### Reference Architecture

The `capture` project at `/Users/ketankhairnar/_work/code/sample-project/capture` has:
- Evidence-first prompts in `pkg/intelligence/prompts/` (especially `stage_a_narrate.txt`, `stage_c_reason.txt`)
- Evaluation rubrics in `pkg/intelligence/testdata/eval/`
- ProvenanceChain system in `desktop/pkg/provenance/` (artifact lineage tracking)
- Key principle: **every claim must cite a source or be omitted** — gaps over hallucinations

### Gotchas

- `archetype-detector.ts` lives in `backend/src/cli/story-coach/services/` — importing from `backend/src/services/ai/` creates a cross-layer dependency. This is acceptable since the wizard service already imports from both layers.
- The `enforceQuestionCount()` function returns `ParsedWizardQuestion[]` (not `WizardQuestion[]`). Can't use it directly on `transformQuestions()` output — that's why the static fallback uses the Map-based approach instead.
- `logTokenUsage(result.usage, ...)` handles `undefined` gracefully (`if (!usage) return`) — the TS error about `usage` not existing on the result type is type-only, not runtime.
- `wizardAnswers` is typed as `Json?` in Prisma schema — requires `as any` cast when passing `Record<string, WizardAnswer>`.

</critical_context>

<current_state>

### Git State

- **Branch:** `main`
- **Remote:** Up to date with `origin/main`
- **Latest commit:** `baab90f` — fix: limit wizard static fallback to 3 questions (1 per D-I-G phase)
- **Uncommitted:** 1 untracked file: `docs/plans/wizard-pipeline/2026-02-21-provenance-exaggeration-detection.md` (the plan)
- **Stash:** `stash@{0}` from an older `feature/career-stories` branch (unrelated)
- **Working tree:** Clean (except the untracked plan file)

### Deliverable Status

| Deliverable | Status |
|-------------|--------|
| Production outage fix | COMPLETE + deployed |
| PR #18 re-applied | COMPLETE + deployed |
| Wizard 3-question fix | COMPLETE + deployed |
| Deploy workflow cleanup | COMPLETE + deployed |
| Plan document | COMPLETE + approved (untracked file, needs commit) |
| Phase 0: DLG Fixes | NOT STARTED |
| Phase 1: Sentence-Level Provenance | NOT STARTED |
| Phase 2: Exaggeration Detection Backend | NOT STARTED |
| Phase 3: Exaggeration Detection Frontend | NOT STARTED |
| Phase 4: Polish | NOT STARTED |

### Next Action

1. Commit the plan file: `docs/plans/wizard-pipeline/2026-02-21-provenance-exaggeration-detection.md`
2. Start Phase 0: DLG Fixes (5 concrete bug fixes, ~0.75 days)
3. Ship Phase 0 as its own PR before touching prompts

### Open Questions

None — plan is fully approved with all design decisions made.

</current_state>

---

## Quick Start for Next Session

```
Read the approved plan:
  docs/plans/wizard-pipeline/2026-02-21-provenance-exaggeration-detection.md

Start with Phase 0 (DLG Fixes). Execute tasks 0A through 0E in order.
All changes are in backend/ only. Run tests with: cd backend && npx vitest run

Commit the plan file first, then the DLG fixes as a single commit.
```
