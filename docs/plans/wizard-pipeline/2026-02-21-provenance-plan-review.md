# Plan Review: Sentence-Level Provenance, Exaggeration Detection & DLG Fixes

**Plan:** `docs/plans/wizard-pipeline/2026-02-21-provenance-exaggeration-detection.md`
**Date:** 2026-02-21
**Reviewers:** Russian Judge (RJ), Grumpy Staff Engineer (GSE), Diligent (DLG)

---

## Combined Verdict

**Phase 0 (DLG Fixes): Ship immediately.** All three reviewers agree — zero-risk, high-value, independently shippable. Fix 0A to cover both controllers.

**Phases 1-3 (Provenance + Exaggeration): Needs redesign.** The core bet — asking the LLM to produce sentence-level provenance at generation time — is unreliable. All three reviewers converge on the same conclusion from different angles:

- **RJ (4.5/10):** "Happy path architecture. 20-40% LLM non-compliance rate means the feature silently disappears."
- **GSE:** "The investor wanted a yellow highlighter. The founder is building a citation graph. The citation graph doesn't work reliably."
- **DLG (17 findings):** "Provenance works for wizard-generated stories but disappears on first regeneration. Feature that works once and then vanishes."

---

## Critical Findings (All Reviewers Agree)

### 1. Regeneration path silently drops `sentences` (RJ, GSE, DLG)

`career-story.service.ts` lines 516-539 explicitly construct section objects with only `summary` and `evidence`. The parsed `sentences` array is discarded. Provenance survives wizard generation but vanishes on first regeneration — the most common user flow for iterating on stories.

**Impact:** Feature works once, then disappears without warning.

**Fix:** Add `sentences: parsedSection.sentences` to the regen path's section builder. GSE notes: the wizard path at `story-wizard.service.ts` line 894-899 has the same pattern — both need updating.

### 2. LLM sentence concatenation is unreliable (RJ, GSE, DLG)

The plan requires `sentences[].text` to concatenate exactly to `summary`. LLMs routinely drop trailing periods, normalize whitespace, rephrase slightly, or split sentences differently. Estimated compliance: 60-80%.

- **RJ:** "20-40% of stories ship without provenance. Is that acceptable? Not discussed."
- **GSE:** "You build a `validateSentences()` function that returns `undefined` 30% of the time, so 30% of stories silently degrade to zero provenance. If you're already designing around the feature not working, the feature is not ready."
- **DLG:** "No test plan for the most likely failure mode. No logging to track compliance rate."

**Impact:** Silent feature degradation with no visibility into failure rate.

**Fix:** Log validation failures. Define concrete comparison rules (not "whitespace-tolerant"). Consider looser validation (90% character coverage via substring matching). GSE: "If you must have it, do it as a post-processing step with a cheap model."

### 3. `_sourceDebug` leak fix is incomplete (RJ, GSE, DLG)

Phase 0A strips `_sourceDebug` from wizard controller, but `career-stories.controller.ts` line 1104 also exposes it in the regenerate endpoint:
```typescript
sendSuccess(res, { ...enriched, _sourceDebug: result._sourceDebug }, 'Story regenerated');
```
Same security issue, different code path.

**Impact:** Internal debugging data (table names, activity IDs, demo mode flags) continues leaking to clients.

**Fix:** Strip `_sourceDebug` from both controllers. Add to Phase 0A scope.

### 4. `maxTokens` bump is underestimated (RJ, GSE, DLG)

The plan estimates "~300 extra tokens" for `sentences`. Actual overhead: 600-960 tokens (40-60 tokens per sentence x 10-16 sentences across 4 sections). SHARE framework stories with 5 sections could exceed 3500 tokens, causing JSON truncation and total parse failure.

- **GSE:** "I counted the tokens. A ProvenanceSentence with text (the full sentence repeated back), activityIds (array of UUIDs — 36 chars each), confidence, and groundedIn is 40-60 tokens per sentence. 4 sections x 4 sentences = 640-960 extra tokens. The plan says 300. That's wrong."
- **GSE also notes latency:** "That's roughly 40% more output. Wizard generation already takes 8-12 seconds. Adding 3-5 seconds of latency for a feature you're going to `?.` away half the time."

**Impact:** Complex stories lose ALL content (not just provenance) on truncation.

**Fix:** Set `maxTokens: 4000` minimum. Monitor actual completion token usage.

### 5. Frontend `ProvenanceHighlight` + `AnnotatedText` — two conflicting highlighting systems (RJ, GSE, DLG)

`AnnotatedText` uses offset-based segmentation via `splitTextByAnnotations()` with `rough-notation` SVG overlays. `ProvenanceHighlight` uses `String.indexOf()` text matching and `<mark>` tags. These two systems will fight over the same DOM.

- **GSE:** "Now you have two highlighting systems that need to coexist in the same `<p>` element. What happens when a user annotation overlaps with a provenance warning? This is a DOM collision waiting to happen."
- **DLG:** "Option B — extend the existing annotation model. Convert provenance warnings into `startOffset`/`endOffset` pairs and pass as a second annotation layer through `splitTextByAnnotations`."

**Impact:** User annotations break when provenance warnings exist on the same section.

**Fix:** Do NOT create a second highlighting system. Extend `AnnotatedText` to accept system-generated warning segments alongside user annotations. Use the same offset pipeline with different visual treatment (amber instead of user-selected colors).

### 6. `String.indexOf()` highlights wrong sentences (RJ, DLG)

`indexOf()` returns the first occurrence. If a sentence fragment appears twice in the summary, the wrong text gets highlighted.

**Impact:** Yellow highlight on the wrong sentence — worse than no highlight.

**Fix:** Use cumulative character offsets from the ordered `sentences[]` array instead of text search.

---

## Full RJ Review

### Score: 4.5/10

*"You built a citation graph that the LLM will refuse to fill out correctly 30% of the time, then planned a UI that can't render it. Phase 0 is clean. Everything after it is a hope dressed as a plan."*

### What's Good (the 4.5 points)

**Phase 0 is excellent.** Five concrete fixes, precise file:line references, zero prompt changes, independently shippable. The `_sourceDebug` strip, the create+update merge, the `compileSafe` migration, the `modelSelector` migration, the name/metric extraction from all answers — all clean, verifiable, low-risk.

**Design decisions table is clear.** Four questions, four decisions, four rationales. Each rationale cites evidence.

**Ship order is correct.** Three PRs, backend-only first, frontend-only last. Deploy triggers match scope.

### What's Bad (the missing 5.5 points)

**1. The core bet is unvalidated. (Critical)**

The entire plan hinges on: "The LLM will reliably produce a `sentences[]` array where text fields concatenate exactly to `summary`." Zero evidence for this claim.

- No prototype results. No sample outputs. No compliance rate from even 5 test runs.
- The capture project's `[turn N: "quote"]` citations are a *different format* — inline markers, not structured JSON arrays with exact text matching. Citing it as evidence is misleading.
- "Whitespace-tolerant" validation is undefined.
- When validation fails, provenance silently drops (`return undefined`). No logging, no metrics, no visibility.

**2. No cost analysis. (Medium)**

- 40% token increase across all generations. No monthly cost delta estimate.
- No mention of model selection impact — has anyone tested Sonnet 4.5 compliance with this format?
- Token bump applies to ALL generations, even for users who never look at provenance.

**3. No rollback strategy. (Medium)**

- No feature flag for provenance.
- No prompt versioning.
- No A/B testing plan.
- If provenance rules degrade story quality (shorter, more formulaic text), how do you roll back?

**4. Metric regex false positives. (Medium)**

Phase 0E's regex matches "2 months ago" → `metric = "2 months"`, "3 users reported" → `metric = "3 users"`. First match wins, so a false positive blocks real metrics.

**5. No test for failure modes. (Medium)**

Verification section is happy-path only. No test for malformed sentences, missing sections, pre-provenance stories, or LLM non-compliance.

### Scoring Breakdown

| Criterion | Score | Notes |
|-----------|-------|-------|
| Clarity | 6/10 | File:line references specific. But "whitespace-tolerant" undefined, ProvenanceHighlight composition hand-waved, JSON schema example for 1C missing. |
| Completeness | 4/10 | Regen path gap, second `_sourceDebug` leak, no cost analysis, no rollback, no failure mode testing. |
| Technical Soundness | 4/10 | Core bet on LLM concatenation compliance is a gamble. `indexOf` highlighting conflicts with existing annotation system. Token estimate wrong. |
| Risk Awareness | 3/10 | No risk section. No cost estimate. No rollback strategy. No handling of LLM non-compliance. |
| Testability | 5/10 | Phase 0 testable. Phases 1-3 verification is happy-path. No automated E2E. No compliance rate tracking. |
| **Overall** | **4.5/10** | **"Ship Phase 0 now. Go back to design on Phases 1-3."** |

---

## Full GSE Review

### The Ask vs The Plan

**What the investor said:** "Highlight if something is an exaggeration."

That is a 5-word feature request. It means: "When the LLM writes 'reduced latency by 80%' and there's no PR or metric backing it up, put a yellow squiggly on it."

**What the founder heard:** "Sentence-level provenance — track every sentence back to N activities. Game changer."

**What the plan builds:** A new structured output format (`ProvenanceSentence[]`) embedded in every LLM generation, a new type system, a new warning computation layer, a new frontend highlighting component, prompt changes to every generation path, and a maxTokens bump across the whole system.

The investor wants a **trust indicator**. The founder is building a **citation engine**. These are different products. The citation engine is ~10x the complexity for maybe 1.2x the user value.

### Where I've Seen This Fail

**1. "The LLM will faithfully self-report its own confidence" — no it won't.**

You ask the LLM to generate text AND simultaneously rate its own confidence per sentence AND map each sentence to source IDs. What actually happens:
- The LLM says "high confidence" on everything because it's a people-pleaser.
- It hallucinates activity IDs that look plausible but don't exist.
- The `sentences[].text` concatenation drifts from `summary`.
- `validateSentences()` returns `undefined` 30% of the time. Users see inconsistent behavior and lose trust.

The plan even acknowledges this by making `sentences` optional with `?.` fallback everywhere. **That's the tell.** If you're already designing around the feature not working, the feature is not ready.

**2. "~300 extra tokens" — you undercounted by 2x.**

Each `ProvenanceSentence` is 40-60 tokens. 4 sections x 4 sentences = 16 sentences = 640-960 extra tokens. You need `maxTokens: 4000` minimum. But the real cost isn't tokens — it's **latency**. ~40% more output = 3-5 more seconds on a user-facing wizard flow that already takes 8-12 seconds.

**3. The "promote path gets provenance for free" claim is false.**

`career-story.service.ts` lines 516-539 reconstructs sections with ONLY `summary` and `evidence`. No `sentences` field is copied. The wizard path at line 894-899 has the same pattern. Both paths need updating. The plan doesn't mention this.

**4. `parseCareerStoryResponse` does zero section-shape validation.**

It checks `parsed.sections` exists as an object, then returns it directly. No validation of `summary`, `evidence`, or `sentences`. You're adding sentence validation on top of a parser that doesn't even validate the basics. Building a penthouse on quicksand.

**5. Phase 0D is a yak-shave.**

`archetype-detector.ts` is a CLI tool. It uses `callLLM` because it's designed to run standalone. Replacing it with `getModelSelector()` means the CLI tool now depends on the app's runtime config. Defer it.

### What I'd Actually Build

**Step 1: Extend `vagueMetrics` detection (0.5 day)**

You already have 6 regex patterns in `story-source.service.ts`. Add patterns for ungrounded claims:

```typescript
{ pattern: /\d+[%xX]\s+(improvement|reduction|increase|faster|better)/i,
  suggestion: 'Verify this number against your activity data' },
{ pattern: /led\s+a\s+team\s+of\s+\d+/i,
  suggestion: 'Name specific collaborators to ground this' },
{ pattern: /saved\s+\$[\d,]+/i,
  suggestion: 'Link to the data source for this cost saving' },
{ pattern: /first\s+(ever|time|to)/i,
  suggestion: 'Verify this "first" claim against project history' },
```

Then cross-reference: if a section's `evidence[]` is empty or only has default evidence AND the summary matches a metric pattern, flag it. Zero LLM changes. Zero prompt changes.

**Step 2: Show warnings in existing UI (0.5 day)**

`vagueMetrics` already exists in `SourceCoverage`. In `NarrativeSectionHeader`, show an amber badge: "1 unverified claim." On hover, show the match and suggestion. Use the existing `AnnotatedText` system — compute an offset from the regex match position, create a synthetic annotation segment. Do NOT create a second highlighting system.

**Step 3: Stop.** Ship it. See if users care. If they want more, THEN consider sentence-level provenance as v2 — as a post-processing step with a cheap model (Haiku), not bloating the generation prompt.

**Total: ~1 day. Not 5.75 days.**

### If You Insist On The Current Plan

Minimum changes to not embarrass ourselves:

1. Fix `_sourceDebug` in BOTH controllers.
2. Fix BOTH section reconstruction paths to pass through `sentences`.
3. Do NOT create `ProvenanceHighlight`. Extend `AnnotatedText` to accept system-generated segments.
4. Bump `maxTokens` to 4000, not 3500.
5. Add basic section validation to `parseCareerStoryResponse` before adding sentence validation.
6. Do NOT trust LLM self-reported confidence. Compute it deterministically: `high` = activityIds non-empty AND exist in story's set, `medium` = activityIds exist but not in set, `low` = empty activityIds.
7. Defer 0C/0D — archetype-detector changes are yak-shaving a CLI tool.

### GSE Verdict

| Phase | Verdict | Reasoning |
|-------|---------|-----------|
| Phase 0: DLG Fixes | **Ship** (with fix) | Ship 0A/0B/0E. Fix 0A to cover BOTH controllers. Defer 0C/0D. |
| Phase 1: Sentence-Level Provenance | **Redesign** | Core idea of LLM self-reporting provenance during generation is unreliable and expensive. If you must have it, post-process with a cheap model. |
| Phase 2: Exaggeration Detection Backend | **Ship** (simplified) | Extend existing `vagueMetrics` pattern with cross-referencing against `evidence[]`. Zero LLM changes. This is the feature the investor asked for. |
| Phase 3: Exaggeration Detection Frontend | **Redesign** | Do NOT create a second highlighting system. Extend `AnnotatedText`. |
| Phase 4: Polish & Backward Compat | **Kill** | Exists to paper over the complexity of Phases 1-3. Simplify earlier phases and this disappears. |

---

## Full DLG Review

### Finding 1 — Critical: `_sourceDebug` leak fix is incomplete (0A)

**File:** `career-stories.controller.ts` line 1104, `story-wizard.controller.ts` line 108-109

The plan fixes the wizard controller but `career-stories.controller.ts` explicitly leaks `_sourceDebug` in the regenerate endpoint. `_sourceDebug` includes `table`, `isDemoMode`, `entryActivityIdSample`, `activityRowIdSample` — all internal debugging data. Both `career-story.service.ts` lines 921 and 1281 also return `_sourceDebug` in their result objects, so the strip must happen at the controller layer in both places.

**Fix:** Strip `_sourceDebug` from the regen response too. Add to Phase 0A scope.

### Finding 2 — High: `sentences` text concatenation validation is brittle (1D)

**Severity: High**

The plan says: "Verify `text` fields concatenate to `summary` (whitespace-tolerant)." This will fail frequently because:
1. LLMs routinely normalize whitespace, add/remove trailing periods, or slightly rephrase.
2. "Whitespace-tolerant" is ambiguous.
3. Summary may contain markdown formatting that sentences won't preserve.
4. Validation failure silently drops provenance with no logging.

**Fix:** Define concrete comparison: `text.replace(/\s+/g, ' ').trim()`. Log failures with story ID and diff length. Consider looser validation: if sentences cover >= 90% of summary characters via substring matching, accept it.

### Finding 3 — High: `maxTokens` bump underestimated (1E)

Each `ProvenanceSentence` is 40-60 tokens. 10 sentences = 400-600 tokens + duplicated text (200-300 tokens). Total overhead: 600-900 tokens. Combined with existing 2500 that already sometimes truncates for SHARE framework, 3500 is tight.

**Fix:** Set `maxTokens: 4000`. Monitor completion token usage.

### Finding 4 — High: Regeneration path drops `sentences` (1F claim is wrong)

`career-story.service.ts` lines 516-539 explicitly reconstructs sections with only `summary` and `evidence`. `sentences` is stripped. The plan says "Promote path gets provenance for free" — partially true for prompt construction, completely false for section reconstruction.

**Fix:** Add `sentences: parsedSection.sentences` to both the regen path and the wizard path's section builder.

### Finding 5 — High: `String.indexOf()` for highlight positioning is unreliable (3A)

Will fail when: same text appears multiple times, LLM sentence text doesn't exactly match summary, user edits change summary.

**Fix:** Use `sentenceIndex` to compute cumulative character offsets from the `sentences[]` array. If summary has been edited since generation, skip highlighting.

### Finding 6 — High: `computeProvenanceWarnings` activity ID source is ambiguous (2A)

Which `activityIds`? `careerStory.activityIds` (journal entry originals), `evidence[].activityId` (LLM-assigned, possibly fabricated), or `StorySource` rows (resolved)? The `useFakeIds` path generates placeholder IDs — if provenance uses those, every sentence gets flagged.

**Fix:** Pass resolved `StorySource` activity IDs, not raw `careerStory.activityIds`.

### Finding 7 — Medium: Phase 0B single create is safe but no transaction (0B)

The create + source population (lines 570-767) are not atomic. If create succeeds but source population fails, you get an orphaned story with no sources.

**Fix:** Follow-up: wrap in `prisma.$transaction()`.

### Finding 8 — Medium: Phase 0D incomplete error handling

`detectArchetype` has try-catch around JSON parsing but not around the LLM call itself. Network errors or rate limits will throw unhandled.

**Fix:** Add try-catch around `executeTask`, return default firefighter on failure.

### Finding 9 — Medium: `answersToContext` metric extraction inconsistency (0E)

The plan's post-loop code uses `if (!context.metric)` — only triggers if `impact-2` wasn't answered. But when `impact-2` IS answered, `context.metric` contains the full answer text, not a regex-extracted metric.

**Fix:** Apply the metric regex to `impact-2` answers as well.

### Finding 10 — Medium: No test plan for `sentences` concatenation invariant

No test for: text that doesn't match summary, fabricated activity IDs, missing `sentences` field, invalid confidence/groundedIn values.

**Fix:** Add explicit unit tests for `validateSentences()` covering all failure modes.

### Finding 11 — Medium: ProvenanceHighlight and AnnotatedText interaction undefined (3A/3B)

`AnnotatedText` uses `splitTextByAnnotations` + `rough-notation` SVG. `ProvenanceHighlight` uses `String.indexOf()` + `<mark>`. Two independent systems on the same text = DOM collision.

**Fix:** Extend the existing annotation model (Option B). Add provenance warnings as a second annotation layer through `splitTextByAnnotations`.

### Finding 12 — Medium: Backend `SourceCoverage` interface not updated

Plan mentions frontend `SourceCoverage` update (2C) but not the backend interface in `story-source.service.ts` line 23-32.

**Fix:** Add `provenanceWarnings?: ProvenanceWarning[]` to backend `SourceCoverage`.

### Finding 13 — Medium: `enrichStoryWithSources` regen path source repopulation

The regenerate endpoint's `_sourceDebug` issue is listed under Phase 2B in Critical Files but not Phase 0A. Anyone implementing this plan would miss the second leak.

**Fix:** List `career-stories.controller.ts` under Phase 0A scope.

### Finding 14 — Low: Import path for 0C is correct (verified)

`../../../services/ai/prompts/handlebars-safe` resolves correctly from `archetype-detector.ts`.

### Finding 15 — Low: No backward compatibility test

Plan says "optional chaining" but no explicit test for pre-provenance stories rendering with zero warnings.

**Fix:** Add regression test: load a pre-provenance story, verify zero warnings, no errors.

### Finding 16 — Low: Prisma `Json` column returns untyped

Reading `sections` from Prisma returns `Prisma.JsonValue`. `sentences` needs runtime validation or defensive optional chaining. A Zod schema would be ideal.

**Fix:** Add runtime validation on DB read.

### Finding 17 — Low: Timeline optimistic

Phase 1 (2.0d) includes prompt engineering + parser updates + LLM compliance iteration. Phase 3 (1.5d) includes annotation system integration (Finding 11). Budget +1.5d.

**Fix:** 7.25d total if keeping current architecture.

### DLG Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 1 | `_sourceDebug` leak in regen endpoint not addressed |
| High | 5 | Regen path drops `sentences`; `maxTokens` underestimated; sentence validation brittle; highlight positioning unreliable; warning activityId source ambiguous |
| Medium | 6 | Transaction atomicity; archetype error handling; metric inconsistency; missing tests; annotation system conflict; backend SourceCoverage type |
| Low | 4 | Import path OK; backward compat test missing; Prisma type safety; timeline optimistic |

---

## Recommended Path Forward

### Option A: Ship Phase 0 + Deterministic Detection (GSE's approach)
- **Scope:** Phase 0 (0.75d) + deterministic `vagueMetrics` extension + section-level amber badge (0.75d)
- **Total:** ~1.5 days, 1 PR
- **Risk:** Low. No LLM changes, no prompt changes, no parse risk.
- **Delivers:** Investor-requested exaggeration highlighting. Works retroactively on all stories.
- **Defers:** Sentence-level provenance to v2 (separate Haiku call, not inline generation).

### Option B: Ship Phase 0 + Redesigned Provenance (address all findings)
- **Scope:** Phase 0 (0.75d) + Phase 1-4 with fixes for all critical findings (~7.25d)
- **Total:** ~8 days, 3 PRs
- **Additional work:** Regen path fix, validation logging, maxTokens 4000, annotation system integration, indexOf replacement, `_sourceDebug` in both controllers, parser hardening
- **Risk:** Medium. LLM compliance rate is the unknown — need shadow testing first.

### Option C: Hybrid — Phase 0 + Deterministic v1 now, LLM Provenance v2 later
- **Scope:** Phase 0 + deterministic detection now (1.5d). LLM provenance as a separate workstream later (5-6d).
- **Total:** 1.5d now + 5-6d later
- **Delivers:** Investor demo in 1.5 days. Proper sentence-level system after prototype validation.
