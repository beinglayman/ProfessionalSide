# Story Creation Flow — Simplification Design

**Status:** Design complete, ready for pickup.
**Alignment:** Executes the roadmap's Q2 Proof-Layer prerequisite cuts (`docs/2026-04-19-inchronicle-roadmap-recalibrated.md` → *"7 narrative frameworks → 2. Story archetypes → hidden from users."*). Ships before Structured Co-sign so co-sign isn't compounded on top of an over-built story page.

---

## Context

Today's Story engine is over-built. The exploration found:

- **7 frameworks** with heavy structural overlap (STAR, STARL, CAR, PAR, SAR, SOAR, SHARE, CARL) — CAR/PAR/SAR all collapse to STAR-minus; SOAR/SHARE/CARL are mostly naming variants.
- **3-step wizard** (Analyze → Questions → Generate) with a redundant LLM call in Analyze to detect an archetype that the draft-generation LLM already has the context to produce.
- **48 hand-maintained question variants** (8 archetypes × 6 questions), but all answers fold into the same 7 `ExtractedContext` fields. The variants are archetype-themed, not archetype-needed.
- **Questions don't explain themselves.** The user is asked things like "What's the number that proves you succeeded?" with no visible reason why the answer matters or how it'll be used.
- **No transparency** about which fields the product already knows from Activities vs. which it needs the user to fill.

This design consolidates three cuts that together make the flow shorter, smarter, and more honest.

---

## The three cuts

### 1. Pre-generate archetype at draft time

Archetype (and its 2 alternatives) is added to the existing `generateDraftStoryLLM()` pass in `backend/src/services/journal.service.ts` — one extra field in the prompt, no new LLM call. Persist on the `DraftStoryGenerationOutput` alongside topics/skills/phases/dominantRole.

**Effect:** Wizard's Analyze step is deleted. The wizard opens with archetype pre-filled (user can override in a collapsed "Change archetype" affordance). Archetype is never shown on the Timeline sidebar (`SidebarDraftCard.tsx`) — it remains internal classification per the roadmap directive.

**Wizard shape:** 3 steps → 2 steps (Checklist → Generate), with Questions slotting between when gaps exist.

### 2. Keep only STAR + STARL

Drop CAR, PAR, SAR, SOAR, SHARE, CARL. Reason: the two remaining frameworks serve two audiences.

- **STAR** — outward-facing contexts (resumes, recruiter packets, promo packets, interview prep). HR standard, no one has to learn it.
- **STARL** — STAR + one Learning section for inward-facing contexts (performance reviews, retros, 1:1 growth narratives).

Framework picker becomes a single toggle: *"Add a Learning section?"* Under the hood the framework field still stores `STAR` or `STARL`, but the UI doesn't surface 7 options.

**Migration:** Existing stories in dropped frameworks keep their stored structure — nothing mutates. The picker only limits *new* story creation. Framework constants in `src/components/career-stories/constants.ts` get the 6 dropped entries removed; any code branching on those frameworks is reduced to the STAR/STARL pair.

### 3. The Story Checklist + smart questions

Replace the current first-question-of-6 screen with a **Story Checklist** — a single compact view showing exactly what a STAR(L) story needs and the state of each row *for this specific draft*.

```
What makes a strong STAR story                           Status
─────────────────────────────────────────────────────────────────
✓  What happened and when                               from Activities
✓  What you did (role: Led)                             from Activities
✗  Measurable result                                    ask you
✗  Why it mattered — the stakes                         ask you
✗  The hardest or least obvious part                    ask you
──  What you took away       (STARL only, else hidden)
```

**Fixed shape** (5 rows for STAR, 6 for STARL) — user learns STAR across every story. **Dynamic status** per row — ✓ when derivable from this draft's Activities, ✗ when a question is needed. Click a ✓ → shows which activities/metrics populated it (editable). Click a ✗ → jumps straight to that question.

Below the checklist, one button: *"Start questions (N)"* where N = count of ✗ rows. If N=0 → *"Generate now."*

**Question count, honestly:**

| Scenario | Draft shape | Questions (STAR) |
|---|---|---|
| Best case | metric-rich bug-fix / launch | 2 |
| Typical | feature / project | 3–4 |
| Thin | early-stage design, mostly docs/discussion | 5 (with warning) |

Add +1 for STARL. Thin-draft warning ("This draft leans on your answers more than your Activities — link more activities or proceed") surfaces at ≥4 gaps.

---

## Question design

**5 universal intents, not 48 variants.** The 48-variant question bank in `backend/src/cli/story-coach/questions.ts` is deleted. Replaced with **5 intent seeds**, one per STAR(L) checklist row that the user can be asked about:

1. Confirm the situation (only when activity summary looks thin)
2. Clarify role/task (only when `dominantRole` is ambiguous)
3. Result — metric or outcome (when no metric derived)
4. Stakes — why it mattered (never derivable)
5. Hardest or least obvious part (rarely derivable)
6. Learning — STARL only (never derivable)

**Per-draft LLM rephrasing.** Each intent seed becomes a draft-specific question at wizard time. Example for "stakes" on a payments bug-fix draft:
> Generic: *"What would have gone wrong?"*
> Rephrased: *"The `payments-api` outage ran 42 minutes before rollback — if you hadn't caught it by Friday, what was the worst-case you were racing to prevent?"*

Same underlying intent, draft-specific phrasing. Archetype no longer picks questions — it only shapes *tone* in the final generation prompt.

**Activity-derived chips.** Options below each question are generated from Activities for that draft, not static per archetype. For "stakes" on a bug-fix: `[Revenue at risk]` `[Customer trust]` `[SLA breach]` `[Data integrity]`, derived from Jira severity + Slack escalation channel + issue labels. User taps 0–N chips and optionally free-texts. This replaces the hand-maintained option arrays.

**"Why we're asking" line.** Above each question, two short lines make the product's need visible:
- *Why we need this:* "Your Activities show *what* happened but not *why* it mattered."
- *How your answer helps:* "Becomes the story's hook and the first-line summary recruiters scan in <5 seconds."

Turns form-filling into a collaborative drafting moment.

**Skip is free.** Every question has a Skip button. Skipped gaps surface in the post-generate feedback: *"Skipped stakes — hook reads as routine rather than urgent. Add now?"* with one-click back into the question. The evaluation score factors in what was skipped.

---

## Flow: before vs after

```
BEFORE
Click draft
  → Analyze step (LLM call: detect archetype)
  → Pick archetype + Pick framework (7 options)
  → Question 1/6 → 2/6 → 3/6 → 4/6 → 5/6 → 6/6  (fixed, archetype-themed)
  → Generate
  → Review + save

AFTER
Click draft  (archetype already computed, hidden from Timeline)
  → Story Checklist  (2 sec — see what's ✓ / ✗ for this draft)
  → Questions (N, typically 2–4, LLM-rephrased, Activity-derived chips, "why we're asking")
  → Generate
  → Review + save
```

3 steps → 2 (or 3 when questions exist). 6 questions → 2–5 typical. 48 variants → 5 intents. 7 frameworks → 2.

---

## Data model changes

**`DraftStoryGenerationOutput`** (add):
- `archetype: StoryArchetype`
- `archetypeAlternatives: StoryArchetype[]` (top 2, same prompt pass)
- `archetypeConfidence: number` (0–1)
- `checklistState: { row: ChecklistRowId; state: 'derived' | 'ask'; evidence?: ActivityRef[] }[]`

**New enum** `ChecklistRowId` = `'situation' | 'role' | 'action' | 'result' | 'stakes' | 'hardest' | 'learning'` (the last only used in STARL).

**Remove / deprecate:**
- `NARRATIVE_FRAMEWORKS` entries: CAR, PAR, SAR, SOAR, SHARE, CARL.
- `questions.ts` 48-variant bank → replaced by 5 intent seeds + LLM rephrasing helper.
- `WizardAnalyzeResponse` step and its service method → deleted (archetype now arrives on the draft).

---

## Build order (4 atomic ships)

| # | Ship | What lands | Est. |
|---|------|------------|------|
| 1 | **Archetype on draft** | Add archetype + alternatives + confidence to `generateDraftStoryLLM()`. Persist on draft. Wizard reads from draft, skips Analyze step. Existing Analyze UI deleted. | 3–5 days |
| 2 | **Framework cut to STAR/STARL** | Remove 6 framework constants. Replace framework picker with a single "Add Learning section?" toggle in the wizard. Migration: no-op for existing stories. | 2–3 days |
| 3 | **Story Checklist step** | New first step in wizard. Compute `checklistState` at draft time. Render fixed-shape checklist with per-draft ✓/✗. "Start questions (N)" / "Generate now" buttons. Jump-to-question affordances. | 1–1.5 wk |
| 4 | **Smart questions — intents, rephrasing, chips, why-we-ask** | Delete 48-variant bank. Implement 5 intent seeds. LLM rephraser per draft. Activity-derived chip generator. Inline "why we're asking" lines. Skip + post-generate gap feedback. | 1.5–2 wk |

**Total:** ~4–5 weeks. Ships 1–2 are cuts and can run in parallel; ships 3–4 build the new checklist+question UX and should sequence.

---

## Critical files & reuse

**Frontend:**
- `src/components/story-wizard/StoryWizardModal.tsx` — 3-step shell → 2-step shell.
- `src/components/story-wizard/AnalyzeStep` (inside modal, lines ~413–483) — **delete.**
- `src/components/story-wizard/QuestionsStep` (~485–613) — rewritten to consume `checklistState` + 5 intents.
- `src/components/story-wizard/ArchetypeSelector.tsx` — retained but demoted to a collapsed "Change archetype" affordance.
- `src/components/career-stories/FrameworkSelector.tsx` — replaced with a single toggle.
- `src/components/career-stories/constants.ts` (lines 371–429) — `NARRATIVE_FRAMEWORKS` pruned to STAR + STARL.
- `src/components/journal/SidebarDraftCard.tsx` — **no archetype display** (explicit).
- **New:** `src/components/story-wizard/ChecklistStep.tsx`.

**Backend:**
- `backend/src/services/journal.service.ts` → `generateDraftStoryLLM()` — add archetype + checklistState fields to the output schema + prompt.
- `backend/src/services/ai/prompts/journal-narrative.prompt.ts` — extend prompt for archetype + checklist derivation.
- `backend/src/cli/story-coach/services/archetype-detector.ts` — **delete** (inlined into draft pass).
- `backend/src/cli/story-coach/questions.ts` — **delete** the 48-variant bank, replace with a 5-intent seed module + rephraser.
- `backend/src/services/story-wizard.service.ts` → `analyzeEntry()` removed; `generateStory()` stays.

**Prompt-caching hint:** The 5 intent-seed rephraser prompt is a strong cache-reuse candidate (system prompt stable, draft context as the user message). Apply Anthropic SDK prompt caching per the project's existing pattern.

---

## Verification (when built)

1. **Draft archetype:** sync activities → draft story generated → inspect API response → `archetype`, `archetypeAlternatives`, `archetypeConfidence`, `checklistState` all populated. Timeline sidebar (`SidebarDraftCard`) shows **no** archetype.
2. **Framework cut:** open wizard on any draft → no framework dropdown, only a "Add Learning section?" toggle → unpublished stories with dropped frameworks still render from their stored structure (migration no-op).
3. **Checklist:** open wizard → Story Checklist renders with fixed 5 rows (STAR) / 6 rows (STARL) → ✓ rows show "from Activities" and expand to show source activities → ✗ rows show "ask you" and route to the question when clicked.
4. **Metric-rich draft:** for a bug-fix draft with Jira severity + perf metrics → checklist shows ≥3 ✓ → "Start questions (2)" button → 2 questions appear.
5. **Thin draft:** for a draft with only Confluence/Slack discussion → checklist shows ≤1 ✓ → thin-draft warning renders → proceed leads to 4–5 questions.
6. **No-gap draft:** if Activities happen to cover everything → "Generate now" button shown, Questions step skipped entirely.
7. **Rephrased question:** the same intent seed renders different wording on two different drafts (inspect the prompt / logs).
8. **Chips:** chips for "stakes" on a Jira-severity-P1 draft differ from chips for a Figma-design draft.
9. **"Why we're asking":** every question shows the two-line explainer above it.
10. **Skip flow:** skip a question → generate → post-generate feedback surfaces the gap and its narrative cost, with a one-click return to the question.
11. **48-variant bank deletion:** `grep -r 'DIG-1\|IMPACT-1\|GROWTH-1'` across backend returns 0 results.

---

## Non-goals (explicit, so scope doesn't creep)

- **No changes to the Activity → Draft Story clustering logic** — that's upstream and working.
- **No changes to the Story *publish* or evaluation scoring paths** — only creation flow changes.
- **No new frameworks added "just in case"** — if a user requests SOAR later, the answer is "not in MVP."
- **No display of archetype in the Timeline sidebar.** Internal classification only.
- **No auto-generation of the skipped-question content in the final story** — if skipped, the section is shorter/weaker, honestly.
- **No changes to co-sign, Narratives, or Profile** — those are separate Q2 builds with their own docs.

---

## Open items to resolve at pickup time

- **Chip count cap per question** (4? 6?) — depends on visual density in the redesigned QuestionStep.
- **How to render STARL toggle** — a checkbox in the header of the checklist step, or a framework-picker mini? Lean: checkbox.
- **Evidence preview on ✓ rows** — inline expand vs side panel? Lean: inline.
- **Archetype confidence threshold** — below what confidence do we surface the "Change archetype" affordance by default expanded? Lean: <0.6.
