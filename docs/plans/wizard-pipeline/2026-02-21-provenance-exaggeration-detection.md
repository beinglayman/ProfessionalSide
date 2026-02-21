# Wizard Pipeline: Sentence-Level Provenance, Exaggeration Detection & DLG Fixes

## Context

Investor feedback: "highlight if something is an exaggeration." Founder expanded: "We need sentence-level provenance — track every sentence back to N activities. Game changer."

Currently, career story sections have section-level evidence (`activityId` arrays) but no sentence-level tracing. The LLM can fabricate claims or inflate metrics with no way to verify. This plan adds:

1. **Sentence-level provenance** — every sentence in a generated story maps to 0-N activities with confidence
2. **Exaggeration detection** — inline yellow highlights for ungrounded claims
3. **5 DLG bug fixes** — scoring ceiling, info leak, perf, security, consistency

Reference architecture: `capture` project's evidence-first prompts (`[turn N: "quote"]` citations, confidence levels, gaps over hallucinations).

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| LLM at generation time vs post-processing? | **Generation time** (same prompt) | Second call doubles cost/latency. LLM already has full context. Capture project proves evidence-first works in-line. ~300 extra tokens, bump maxTokens 2500→3500. |
| How to store provenance? | **Extend sections JSON** (`sentences[]` alongside `evidence[]`) | Provenance is a generation artifact, not user-curated. Regeneration replaces it. No migration needed — `sections` is a Json column. Backward-compatible (existing stories have no `sentences`). |
| answersToContext 6→3 mapping? | **Extract names/metrics from ALL answer text** | Dynamic questions produce open-ended answers. Apply `extractNamedPeople()` to all 3 answers, add metric regex extraction. Fills `namedPeople` + `metric` without more questions. |
| Exaggeration UI? | **New computed warnings via `SourceCoverage`** | `StoryAnnotation` is user-created + persisted. Exaggeration warnings are system-generated + ephemeral (recomputed from `sentences` data). Extend existing `vagueMetrics` pattern. |

---

## Phase 0: DLG Fixes (0.75d)

Ship independently. Zero prompt changes, zero risk.

### 0A. Strip `_sourceDebug` from API response

**File:** `backend/src/controllers/story-wizard.controller.ts` (line 108)

```typescript
const result = await wizardService.generateStory(validation.data, userId);
const { _sourceDebug, ...clientResult } = result;
sendSuccess(res, clientResult);
```

### 0B. Merge create + update into single create

**File:** `backend/src/services/story-wizard.service.ts` (lines 570-592)

Add `wizardAnswers: answers as any` to the `prisma.careerStory.create()` data block. Delete the separate `prisma.careerStory.update()` call.

### 0C. archetype-detector: `compileSafe`

**File:** `backend/src/cli/story-coach/services/archetype-detector.ts`

Replace `import Handlebars` with `import { compileSafe }` from `../../../services/ai/prompts/handlebars-safe`. Replace `Handlebars.compile()` with `compileSafe()`.

### 0D. archetype-detector: `modelSelector`

**File:** `backend/src/cli/story-coach/services/archetype-detector.ts`

Replace `callLLM()` with `getModelSelector().executeTask('analyze', messages, 'quick', ...)`. Fallback: if `getModelSelector()` returns null, return default firefighter archetype.

### 0E. answersToContext: extract names + metrics from ALL answers

**File:** `backend/src/services/story-wizard.service.ts` (after line 296)

After the for-loop, scan all combined answer text:
```typescript
const allAnswerText = Object.values(answers)
  .map(a => combineAnswerParts(a)).filter(Boolean).join(' ');
if (!context.namedPeople) {
  context.namedPeople = extractNamedPeople(allAnswerText);
}
if (!context.metric) {
  const metricMatch = allAnswerText.match(
    /\d+(?:\.\d+)?[%xX]|\$[\d,]+|\d+\s*(hours?|days?|weeks?|months?|teams?|users?)/i
  );
  if (metricMatch) context.metric = metricMatch[0];
}
```

---

## Phase 1: Sentence-Level Provenance (2.0d)

Backend-only. Prompt changes + parser + types.

### 1A. Define provenance types

**File:** `backend/src/services/ai/prompts/career-story.prompt.ts`

```typescript
export type GroundingSource = 'activity' | 'wizard_answer' | 'inferred';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ProvenanceSentence {
  text: string;
  activityIds: string[];
  confidence: ConfidenceLevel;
  groundedIn: GroundingSource;
}
```

Extend `CareerStorySection`:
```typescript
export interface CareerStorySection {
  summary: string;
  evidence: Array<{ activityId: string; description?: string }>;
  sentences?: ProvenanceSentence[];
}
```

**File:** `src/types/career-stories.ts` — mirror types on frontend.

### 1B. Update system prompt

**File:** `backend/src/services/ai/prompts/templates/career-story-system.prompt.md`

Add after "Writing Guidelines":

```markdown
## Provenance Rules (CRITICAL)

Every sentence must trace back to a source. For each section, return a `sentences` array:
- `text`: the exact sentence from `summary`
- `activityIds`: IDs from the activities list that support this claim ([] if none)
- `confidence`: "high" (directly stated), "medium" (reasonable inference), "low" (extrapolated/no evidence)
- `groundedIn`: "activity" | "wizard_answer" | "inferred"

The concatenation of all `text` fields MUST equal the `summary`. NEVER fabricate activity IDs.
```

### 1C. Update user prompt template

**File:** `backend/src/services/ai/prompts/templates/career-story-user.prompt.md`

Update JSON schema example to include `sentences` array alongside `evidence`.

### 1D. Update response parser

**File:** `backend/src/services/ai/prompts/career-story.prompt.ts`

Add `validateSentences(sentences, summary)` helper:
- Verify `text` fields concatenate to `summary` (whitespace-tolerant)
- Validate `confidence` enum, `groundedIn` enum
- Return `undefined` if malformed (backward-compat)

Update `parseCareerStoryResponse()` to extract `sentences` per section.

### 1E. Bump maxTokens

**Files:** `story-wizard.service.ts` line 882, `career-story.service.ts` line 492

`maxTokens: 2500` → `3500`

### 1F. Storage

No migration. `sections` is a `Json` column — `sentences` is automatically persisted.

---

## Phase 2: Exaggeration Detection Backend (1.0d)

### 2A. ProvenanceWarning type + computation

**File:** `backend/src/services/career-stories/story-source.service.ts`

```typescript
export interface ProvenanceWarning {
  sectionKey: string;
  sentenceIndex: number;
  text: string;
  reason: 'low_confidence' | 'inferred' | 'ungrounded_metric' | 'no_activity_match';
  suggestion: string;
}
```

`computeProvenanceWarnings(sections, sectionKeys, activityIds)`:
- Flag `confidence: "low"` sentences
- Flag `groundedIn: "inferred"` with non-high confidence
- Flag sentences with metrics but empty `activityIds`
- Flag activity IDs not in the story's activity set

### 2B. Integrate into `enrichStoryWithSources()`

**File:** `backend/src/controllers/career-stories.controller.ts`

Compute warnings, add to `sourceCoverage.provenanceWarnings`.

### 2C. Frontend types

**File:** `src/types/career-stories.ts`

Add `ProvenanceWarning` interface and optional `provenanceWarnings` to `SourceCoverage`.

---

## Phase 3: Exaggeration Detection Frontend (1.5d)

### 3A. `ProvenanceHighlight` component

**New file:** `src/components/career-stories/ProvenanceHighlight.tsx`

- Find warning text in section summary via `String.indexOf()` for character offsets
- Render as yellow `<mark>` with tooltip (`bg-amber-100/60 border-b border-amber-400`)
- Layer below user annotations (user highlights take visual priority)

### 3B. Integrate into `NarrativeSection`

**File:** `src/components/career-stories/NarrativeSection.tsx`

Add `provenanceWarnings` + `sentences` props. When warnings exist, wrap content with `ProvenanceHighlight` instead of plain `AnnotatedText`.

### 3C. Wire through `NarrativePreview`

**File:** `src/components/career-stories/NarrativePreview.tsx`

Filter `sourceCoverage.provenanceWarnings` by `sectionKey`, extract `sections[key].sentences`, pass to `NarrativeSection`.

### 3D. Section header warning badge

**File:** `src/components/career-stories/NarrativeSectionHeader.tsx`

Amber badge: `"2 unverified"` next to confidence badge when warnings > 0.

### 3E. Story header summary

**File:** `src/components/career-stories/NarrativePreview.tsx` (header area)

Add `"3 unverified claims"` in amber next to coverage text.

---

## Phase 4: Polish & Backward Compat (0.5d)

- All `sentences` access uses optional chaining
- Existing stories (no `sentences`) render normally, zero warnings
- Regeneration replaces `sections` entirely (correct — new text = new provenance)
- Promote path gets provenance for free (shares `buildCareerStoryMessages` + `parseCareerStoryResponse`)

---

## Ship Order

| PR | Scope | Deploy Trigger | Depends On |
|----|-------|----------------|------------|
| PR A: DLG Fixes | Phase 0 | Backend only | None |
| PR B: Provenance + Detection Backend | Phases 1-2 | Backend only | PR A |
| PR C: Detection Frontend | Phases 3-4 | Frontend only | PR B |

---

## Verification

1. **Phase 0**: Run `npx vitest run` — all existing tests pass. Manually verify score ceiling fix via wizard.
2. **Phase 1**: Mock LLM returns `sentences` → `parseCareerStoryResponse` extracts them → stored in DB → returned via API.
3. **Phase 2**: `computeProvenanceWarnings` unit tests with various sentence configs. Verify warnings in API response.
4. **Phase 3**: Visual — create a story, see yellow inline highlights on low-confidence sentences with tooltips.
5. **E2E**: Wizard → generate → verify `_sourceDebug` absent, `sentences` present, `provenanceWarnings` computed, UI highlights visible.

---

## Critical Files

| File | Changes |
|------|---------|
| `backend/src/services/story-wizard.service.ts` | 0B, 0E, 1E |
| `backend/src/services/ai/prompts/career-story.prompt.ts` | 1A, 1D |
| `backend/src/services/ai/prompts/templates/career-story-system.prompt.md` | 1B |
| `backend/src/services/ai/prompts/templates/career-story-user.prompt.md` | 1C |
| `backend/src/services/career-stories/story-source.service.ts` | 2A |
| `backend/src/controllers/story-wizard.controller.ts` | 0A, 2B |
| `backend/src/controllers/career-stories.controller.ts` | 2B |
| `backend/src/cli/story-coach/services/archetype-detector.ts` | 0C, 0D |
| `src/types/career-stories.ts` | 1A, 2C |
| `src/components/career-stories/ProvenanceHighlight.tsx` | 3A (new) |
| `src/components/career-stories/NarrativeSection.tsx` | 3B |
| `src/components/career-stories/NarrativePreview.tsx` | 3C, 3E |
| `src/components/career-stories/NarrativeSectionHeader.tsx` | 3D |

**Total: ~5.75 days across 3 PRs**
