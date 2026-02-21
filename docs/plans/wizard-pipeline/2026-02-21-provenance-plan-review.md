# Plan Review: Sentence-Level Provenance, Exaggeration Detection & DLG Fixes

**Plan:** `docs/plans/wizard-pipeline/2026-02-21-provenance-exaggeration-detection.md`
**Date:** 2026-02-21
**Reviewers:** Russian Judge (RJ), Grumpy Staff Engineer (GSE), Diligent (DLG)

---

## Combined Verdict

**Phase 0 (DLG Fixes): Ship immediately.** All three reviewers agree — zero-risk, high-value, independently shippable.

**Phases 1-3 (Provenance + Exaggeration): Needs redesign.** The core bet — asking the LLM to produce sentence-level provenance at generation time — is unreliable. All three reviewers converge on the same conclusion from different angles:

- **RJ (4.5/10):** "Happy path architecture. 20-40% LLM non-compliance rate means the feature silently disappears."
- **GSE:** "The investor wanted a yellow highlighter. The founder is building a citation graph. The citation graph doesn't work reliably."
- **DLG:** "Provenance works for wizard-generated stories but disappears on first regeneration. Feature that works once and then vanishes."

---

## Critical Findings (All Reviewers Agree)

### 1. Regeneration path silently drops `sentences` (RJ, GSE, DLG)

`career-story.service.ts` lines 516-539 explicitly construct section objects with only `summary` and `evidence`. The parsed `sentences` array is discarded. Provenance survives wizard generation but vanishes on first regeneration — the most common user flow for iterating on stories.

**Impact:** Feature works once, then disappears without warning.

**Fix:** Add `sentences: parsedSection.sentences` to the regen path's section builder.

### 2. LLM sentence concatenation is unreliable (RJ, GSE, DLG)

The plan requires `sentences[].text` to concatenate exactly to `summary`. LLMs routinely drop trailing periods, normalize whitespace, rephrase slightly, or split sentences differently. Estimated compliance: 60-80%.

- **RJ:** "20-40% of stories ship without provenance. Is that acceptable? Not discussed."
- **GSE:** "LLMs cannot reliably produce structured sentence-level output that maintains exact textual correspondence with their own prose."
- **DLG:** "No test plan for the most likely failure mode. No logging to track compliance rate."

**Impact:** Silent feature degradation with no visibility into failure rate.

**Fix:** Log validation failures. Define concrete comparison rules (not "whitespace-tolerant"). Consider looser validation (90% character coverage via substring matching).

### 3. `_sourceDebug` leak fix is incomplete (RJ, DLG)

Phase 0A strips `_sourceDebug` from wizard controller, but `career-stories.controller.ts` line 1104 also exposes it in the regenerate endpoint. Same security issue, different code path.

**Impact:** Internal debugging data (table names, activity IDs, demo mode flags) continues leaking to clients.

**Fix:** Strip `_sourceDebug` from both controllers. Consider removing it from `GenerateResult` interface entirely.

### 4. `maxTokens` bump is underestimated (RJ, DLG)

The plan estimates "~300 extra tokens" for `sentences`. Actual overhead: 600-900 tokens (40-60 tokens per sentence x 10-15 sentences). SHARE framework stories with 5 sections could exceed 3500 tokens, causing JSON truncation and total parse failure.

**Impact:** Complex stories lose ALL content (not just provenance) on truncation.

**Fix:** Set `maxTokens: 4000`. Monitor actual completion token usage.

### 5. Frontend `ProvenanceHighlight` + `AnnotatedText` composition is undefined (RJ, DLG)

`AnnotatedText` uses offset-based segmentation with `rough-notation` SVG overlays. `ProvenanceHighlight` uses `String.indexOf()` text matching. These systems will conflict when both operate on the same text — `<mark>` tags shift character offsets, breaking annotation positioning.

**Impact:** User annotations break when provenance warnings exist on the same section.

**Fix (DLG recommends Option B):** Extend the existing annotation model. Convert provenance warnings into `startOffset`/`endOffset` pairs and pass as a second annotation layer through `splitTextByAnnotations`. Don't layer a new highlighting system on top.

### 6. `String.indexOf()` highlights wrong sentences (RJ, DLG)

`indexOf()` returns the first occurrence. If a sentence fragment appears twice in the summary, the wrong text gets highlighted.

**Impact:** Yellow highlight on the wrong sentence — worse than no highlight.

**Fix:** Use cumulative character offsets from the ordered `sentences[]` array instead of text search.

---

## GSE's Alternative Architecture (Strongest Dissent)

GSE proposes cutting the entire `sentences[]` data model and doing exaggeration detection deterministically from existing data:

```typescript
function flagUngroundedSections(
  sections: Record<string, CareerStorySection>,
  sources: StorySourceRow[]
): SectionWarning[] {
  const activeBySection = groupBy(sources.filter(s => !s.excludedAt), 'sectionKey');
  const warnings = [];
  for (const [key, section] of Object.entries(sections)) {
    const sectionSources = activeBySection[key] || [];
    if (sectionSources.length === 0)
      warnings.push({ sectionKey: key, reason: 'no_sources' });
    // Check numeric claims without numeric source evidence
    const claimNumbers = section.summary.match(/\d+(?:\.\d+)?[%xX]|\$[\d,]+/g) || [];
    const sourceText = sectionSources.map(s => s.label + ' ' + (s.annotation || '')).join(' ');
    for (const num of claimNumbers) {
      if (!sourceText.includes(num.replace(/[,$]/g, '')))
        warnings.push({ sectionKey: key, reason: 'unverified_metric', text: num });
    }
  }
  return warnings;
}
```

**Advantages:**
- No LLM reliability risk. Works 100% of the time.
- No token cost increase. No prompt changes. No parse failure risk.
- Works retroactively on every existing story.
- Ships in ~1.5 days (Phase 0 + deterministic detection) vs 5.75 days.
- Delivers exactly what the investor asked for: "highlight if something is an exaggeration."

**Trade-off:** No sentence-level granularity. Warnings are section-level, not inline. Leaves the door open for proper sentence-level provenance in v2 (via separate Haiku call, not polluting the generation prompt).

---

## Medium-Severity Findings

| # | Finding | Reviewer | Fix |
|---|---------|----------|-----|
| 7 | Phase 0B: create + source population should be wrapped in `prisma.$transaction()` to prevent orphaned stories | DLG | Follow-up, not blocking |
| 8 | Phase 0D: `executeTask` can throw (network/rate limit) — no try-catch in `detectArchetype` | DLG | Add try-catch around `executeTask`, return default firefighter |
| 9 | Phase 0E: metric regex matches false positives ("2 months ago", "3 users reported") and misses "$2M" | RJ | Improve regex or accept as best-effort heuristic |
| 10 | Phase 0E: `context.metric` from `impact-2` stores full answer text, not extracted metric | DLG | Apply metric regex to `impact-2` answers too |
| 11 | Phase 2A: `computeProvenanceWarnings` needs resolved `StorySource` IDs, not raw `careerStory.activityIds` | DLG | Pass `StorySource` activity IDs |
| 12 | Backend `SourceCoverage` interface needs `provenanceWarnings?` field (plan only mentions frontend) | DLG | Update `story-source.service.ts` interface |
| 13 | No backward compatibility test for stories without `sentences` | DLG | Add regression test: pre-provenance story renders with zero warnings |
| 14 | Prisma `Json` column returns untyped — `sentences` needs runtime validation or Zod schema | DLG | Add defensive validation on DB read |
| 15 | No cost analysis for 40% token increase across all generations | RJ | Estimate impact at current usage volume |
| 16 | No rollback mechanism for prompt changes | RJ | Feature flag or prompt version toggle |
| 17 | No A/B testing — provenance rules may degrade story quality (shorter, more formulaic text) | RJ | Shadow test with 10 stories before full rollout |
| 18 | No user dismiss/acknowledge flow for false-positive warnings | RJ | Deferred to v2, but note the trust erosion risk |
| 19 | Timeline optimistic — budget +1.5d for prompt iteration + annotation integration | DLG | 7.25d total if keeping current architecture |

---

## Recommended Path Forward

### Option A: Ship Phase 0 + Deterministic Detection (GSE's approach)
- **Scope:** Phase 0 (0.75d) + deterministic `flagUngroundedSections()` + section-level amber badge (0.75d)
- **Total:** ~1.5 days, 1 PR
- **Risk:** Low. No LLM changes, no prompt changes, no parse risk.
- **Delivers:** Investor-requested exaggeration highlighting. Works on all stories.
- **Defers:** Sentence-level provenance to v2 (separate Haiku call architecture).

### Option B: Ship Phase 0 + Redesigned Provenance (address all findings)
- **Scope:** Phase 0 (0.75d) + Phase 1-4 with fixes for all critical findings (~7.25d)
- **Total:** ~8 days, 3 PRs
- **Additional work:** Regen path fix, validation logging, maxTokens 4000, annotation system integration, indexOf replacement, `_sourceDebug` in both controllers
- **Risk:** Medium. LLM compliance rate is the unknown — need shadow testing.

### Option C: Hybrid — Phase 0 + Deterministic v1 now, LLM Provenance v2 later
- **Scope:** Phase 0 + deterministic detection now (1.5d). LLM provenance as a separate workstream later (5-6d).
- **Total:** 1.5d now + 5-6d later
- **Delivers:** Investor demo in 1.5 days. Proper sentence-level system after validation.

---

## RJ Detailed Scores

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Clarity | 6/10 | File paths specific, but prompt insertion point ambiguous, JSON schema example missing, 2B file mapping inconsistent |
| Completeness | 4/10 | Regeneration path not addressed, no fallback behavior for LLM non-compliance, no cost analysis, `_sourceDebug` leak incomplete |
| Technical Soundness | 5/10 | Core bet on generation-time provenance is a gamble. Concatenation invariant will fail 20-40% of the time. |
| Risk Awareness | 3/10 | No risk section. No cost estimate. No rollback strategy. No handling of LLM non-compliance. |
| Testability | 5/10 | Phase 0 testable. Phases 1-3 verification is happy-path only. No automated E2E. |
| **Overall** | **4.5/10** | "Ship Phase 0 now. Go back to design on Phases 1-3." |
