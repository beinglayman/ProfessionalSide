# Career Story Brainstorming Feature: Persona Debate & Invariants

> Design discussion before implementation. Four personas challenge the feature.

---

## The Reframe (Post-Debate Insight)

**Original Critique:** "Brainstorming asks users to repeat what they already wrote."

**The Insight:** Brainstorming extracts what users KNOW but DIDN'T write. The journal entry captures *what happened*. The user's head contains:
- Why this mattered to the business (not written)
- What almost went wrong (not written)
- Who they influenced by name (not written)
- The political context (definitely not written)
- The counterfactual - "if I hadn't done this..." (never written)

**This is evidence-based extraction, not redundant questioning.**

See: `brainstorming-beauty.md` for the full philosophy.
See: `persona-story-coach.md` for the Story Coach persona design.

---

## The Proposal

**Feature:** Add an interactive brainstorming phase before AI generates career stories.

**Current Flow:**
```
Journal Entry → Select Framework → AI generates story → User edits/regenerates
```

**Proposed Flow:**
```
Journal Entry → Story Coach (optional) → Enhanced Prompt → AI generates → Versions saved
                     ↓
            One question at a time
            Multiple choice where possible
            10-60 minute sessions (persisted)
            Extracts buried context
```

---

## Persona Debate Summary

### Russian Judge (RJ) - Score: 4/10

**Verdict:** *"This is not work. This is pretending to work."*

**What's Actually Valuable:**
- **Versioning only.** Current regeneration is destructive - previous version vanishes. Add a `storyVersions` table. One afternoon of work.

**What's Theater:**
- The brainstorming chat duplicates the journal entry. User already wrote what happened.
- Progressive questioning adds friction without surfacing new information.
- The prompt is already dynamic via Handlebars templates.

**The Real Problem Not Being Solved:**
- LLM fallback produces garbage: "Situation: Fixed login bug and 3 more activities"
- Fix the fallback, not the input.

**RJ's Prescription:**
1. Version history (simple table)
2. Better fallback when LLM fails
3. Inline section editing (this IS the brainstorming)
4. Show what's missing: "No impact metrics found. Add numbers."

---

### Principal Ghost (PG) - 18 Years Experience

**Verdict:** *"I've seen this pattern. Let me tell you how it ends."*

**Pattern Recognition:**
- Pedagogically correct, operationally expensive
- 60%+ abandonment in mandatory interview flows (HR tech, LinkedIn profile strength)
- Success cases are always **optional, not in critical path**

**Scale Concerns (100 users, 1000 stories):**
- Conversation state storage: dies on refresh, orphaned sessions accumulate
- Cost multiplier: 1 LLM call → 4-6 LLM calls per story
- Latency compounds: 5 questions × 2-4 seconds each = "slow"

**2 Years From Now:**
- Bimodal usage: 20% complete, 60% skip, 20% abandon
- Two code paths to maintain forever
- Bug reports require: "Were you in brainstorm mode?"

**Architectural Regrets:**
1. Conversation state layer (Redis? DB? LocalStorage?)
2. Version control schema (when to snapshot? how to diff?)
3. "Challenge and probe" encourages fabrication when users don't remember exact numbers

**PG's Prescription:**
- **Option A:** Pre-flight analysis shows optional enrichment fields (one LLM call, not four)
- **Option B:** If you must do brainstorming: optional, resumable, bounded (max 3 Qs), skippable, non-blocking

---

### Grumpy Staff Engineer (GSE)

**Verdict:** *"Just do X. Stop overthinking."*

**The ACTUAL Problem:**
- Not validated. Assuming users need interviewing.
- Real problem might be: journal form doesn't prompt right info, or AI prompt doesn't infer well.

**Cheapest Validation:**
1. Add toast after generation: "Want better stories? Add more detail. [Learn how]" - track clicks
2. Log regeneration rates. If <20%, users are happy enough.
3. Ask 5 users. If none say "interview me first," don't build it.

**What to Build:**

| Timeline | Build This |
|----------|------------|
| 2 days | Sparse content detector (<200 chars) → inline prompt for missing context |
| 2 weeks | Optional "3 targeted questions" before generation (static map, not dynamic) |
| Never | Progressive questioning state machine, a3-plugin integration, multi-turn conversation |

**Maintenance Burden:**
- Current: clean 4-step pipeline
- Proposed: 4 new failure points, conversation history, interrupted sessions, state sync
- "Who debugs brainstorming mode at 3am? You. And you'll hate yourself."

---

### Paul Graham Clarity (PGC)

**Verdict:** *"Would a smart person with no context understand this?"*

**One Sentence Version:**
> "Answer a few questions about what you did, and we'll write your interview story for you."

**Jargon Translation:**

| Jargon | Plain English |
|--------|---------------|
| "Interactive brainstorming session" | You answer questions |
| "Progressive questioning" | One question at a time |
| "Challenge and probe" | AI asks follow-ups |
| "Summarize and validate" | Shows what it understood before writing |
| "Version control" | You can save drafts |

**The Real "So What":**
> Tools know *what* happened. Only you know *why* it mattered.

**30-Second UX Pitch:**
> "Pick work you want to turn into a story. System shows what it found in tools. Asks questions like 'What was the hardest part?' One at a time. Shows summary: 'Here's what I understood - right?' You confirm. It writes a STAR story with evidence links."

---

## Consensus Points (Pre-Reframe)

Original persona debate concluded:

| Point | Original Consensus |
|-------|-----------|
| Versioning | YES - destructive regeneration is a real problem |
| Full brainstorming state machine | NO - over-engineering, 60% will skip |
| Optional enrichment | MAYBE - if it's lightweight and skippable |
| Better fallback output | YES - current fallback is garbage |
| Validate before building | YES - measure regeneration rates, ask users |

## Revised Consensus (Post-Reframe)

After recognizing brainstorming is EXTRACTION not REPETITION:

| Point | Revised Consensus |
|-------|-------------------|
| Versioning | YES - still needed |
| Story Coach persona | YES - extracts buried gold users don't write |
| Session persistence | YES - 10-60 min sessions need save/resume |
| Progressive questioning | YES - one question at a time is the key |
| Multiple choice where possible | YES - reduces friction, open-ended finds gold |
| Optional but valuable | YES - skip button always visible, but value is high |
| Better fallback output | YES - still needed |

**The key insight:** The personas were critiquing a REPETITION model ("ask what you already told us"). The superpowers brainstorming skill is an EXTRACTION model ("ask what you know but didn't write"). These are fundamentally different.

---

## Deterministic Invariants

### 1. Information Invariants

**What data is fundamentally required for a career story?**

| Data | Source | Required? |
|------|--------|-----------|
| What happened (activities) | Journal entry, tool data | YES |
| Why it mattered (impact) | User input or inference | YES |
| What was hard (obstacles) | User input | NO (nice to have) |
| What you learned | User input | NO (framework-dependent) |
| Quantified results | User input or tool data | NO (strengthens story) |

**INV-INFO-1:** A story MUST have activities. No activities = no story.
**INV-INFO-2:** A story SHOULD have impact. Missing impact = warning, not blocker.
**INV-INFO-3:** Obstacles, learnings, metrics are OPTIONAL enrichments.

### 2. Output Invariants

**What form must the final work product take?**

**INV-OUT-1:** Output MUST be valid JSON matching `CareerStory` schema.
**INV-OUT-2:** Output MUST have all sections required by selected framework.
**INV-OUT-3:** Each section MUST have `summary` (string) and `evidence` (array).
**INV-OUT-4:** If LLM fails, output MUST show user's original content with section headers, NOT "details pending."
**INV-OUT-5:** Title MUST be ≤60 characters.

### 3. Process Invariants

**What steps must always occur?**

```
MUST: Select activities → Select framework → Generate sections → Return story
MAY:  Enrichment questions (optional, skippable)
MAY:  Version snapshot before regeneration
MUST NOT: Block generation on incomplete enrichment
MUST NOT: Require multi-turn conversation
```

**INV-PROC-1:** Generation MUST be single-shot. User provides input, gets output. No mandatory back-and-forth.
**INV-PROC-2:** Any enrichment step MUST be skippable with "I don't know / Skip."
**INV-PROC-3:** Enrichment MUST be bounded: max 3 questions, hard limit.
**INV-PROC-4:** Page refresh MUST NOT lose in-progress enrichment (store in journal entry or localStorage).
**INV-PROC-5:** User MUST be able to generate immediately without enrichment.

### 4. Error Invariants

**What failures must be handled gracefully?**

**INV-ERR-1:** LLM timeout → Show structured fallback with user's content, not error.
**INV-ERR-2:** LLM rate limit → Queue and notify, don't fail silently.
**INV-ERR-3:** Sparse input (<100 chars) → Show inline suggestion, don't block.
**INV-ERR-4:** Invalid framework → Default to STAR with warning.
**INV-ERR-5:** Interrupted enrichment session → Recoverable from localStorage or draft field.

### 5. Version Control Invariants

**When and how to preserve history?**

**INV-VER-1:** Regeneration MUST archive current version before overwriting.
**INV-VER-2:** Version = full snapshot of `{framework, sections, generatedAt}`.
**INV-VER-3:** Versions are immutable. Edit creates new version, not mutation.
**INV-VER-4:** Max 10 versions per story. Oldest auto-deleted on overflow.
**INV-VER-5:** User MUST be able to view previous versions.
**INV-VER-6:** User MUST be able to restore any previous version (creates new version from old).

### 6. Story Coach Session Invariants

**Constraints on the brainstorming/extraction feature:**

**INV-SC-1:** One question at a time. Never batch questions.
**INV-SC-2:** Multiple choice preferred when options are clear. Open-ended for extraction.
**INV-SC-3:** Session state MUST persist across page refresh (backend storage).
**INV-SC-4:** Session MUST be resumable within 24 hours.
**INV-SC-5:** "Skip" and "Generate Now" buttons MUST always be visible.
**INV-SC-6:** Partial extraction is valid - generate story with whatever was gathered.
**INV-SC-7:** Never invent details - only extract what user provides.
**INV-SC-8:** Auto-save after every exchange.
**INV-SC-9:** Max 5 questions per phase (DIG/IMPACT/GROWTH), 15 total max.
**INV-SC-10:** Session timeout at 24 hours - auto-complete with partial extraction.

### 7. Story Coach Question Invariants

**What questions MUST be asked:**

**INV-Q-1:** "What almost went wrong?" - surfaces the buried lede.
**INV-Q-2:** "What's the number that proves this?" - forces quantification.
**INV-Q-3:** "Who specifically?" - when user says "the team" or "stakeholders".

**What questions MAY be asked (based on detected gaps):**

**INV-Q-4:** "What would have happened if you hadn't done this?" - counterfactual.
**INV-Q-5:** "What do you know now that you didn't before?" - for STARL/CARL frameworks.
**INV-Q-6:** "What was the hardest decision?" - for leadership stories.

**Question constraints:**

**INV-Q-7:** If user says "I don't know" twice on same topic, move on with "[gap flagged]".
**INV-Q-8:** Celebrate specificity: "THAT'S the story. Say more."
**INV-Q-9:** Challenge vagueness: "Significant is not a number. What's the number?"

### 7. CLI-First Invariants (For Testing)

**If building CLI to validate behaviors:**

**Command Structure:**
```bash
career-story generate <entry-id> --framework STAR [--enrich]
career-story versions <story-id>
career-story restore <story-id> --version <version-num>
career-story analyze <entry-id>  # Shows detected gaps, suggested questions
```

**INV-CLI-1:** `generate` without `--enrich` MUST produce story in single call.
**INV-CLI-2:** `generate --enrich` MUST prompt max 3 questions interactively.
**INV-CLI-3:** `analyze` MUST be read-only, no side effects.
**INV-CLI-4:** All commands MUST output JSON when `--json` flag provided.
**INV-CLI-5:** All commands MUST be idempotent (same input = same output).

### 8. Testing Invariants

**What test cases must pass?**

| Test Case | Invariant Validated |
|-----------|---------------------|
| Generate from minimal entry (title only) | INV-ERR-3, INV-OUT-4 |
| Generate with LLM timeout | INV-ERR-1 |
| Regenerate preserves version | INV-VER-1 |
| Skip all enrichment questions | INV-ENR-5, INV-PROC-5 |
| Restore old version | INV-VER-6 |
| 11th regeneration deletes oldest version | INV-VER-4 |
| Framework with missing section in content | INV-OUT-2 |

### 9. Performance Invariants

**INV-PERF-1:** Generation MUST complete in <10 seconds (p95).
**INV-PERF-2:** Version list MUST load in <500ms.
**INV-PERF-3:** Enrichment questions MUST appear in <2 seconds (static, no LLM).
**INV-PERF-4:** No more than 2 LLM calls per story generation (main + optional polish).

### 10. Security Invariants

**INV-SEC-1:** User can only access their own stories and versions.
**INV-SEC-2:** Enrichment answers are sanitized before prompt injection.
**INV-SEC-3:** Version restore MUST verify ownership.
**INV-SEC-4:** Rate limit: max 20 generations per user per hour.

---

## Recommended Implementation Order

Based on persona debate, reframe, and invariant analysis:

### Phase 1: Foundation (Do First)
1. **Version control** - INV-VER-1 through INV-VER-6
2. **Better fallback** - INV-ERR-1, INV-OUT-4
3. **Story Coach session schema** - INV-SC-1 through INV-SC-10

### Phase 2: Story Coach MVP
1. **DIG phase only** - 3-5 questions to find buried lede
2. **Session persistence** - save/resume across sessions
3. **Skip button prominent** - always optional
4. **Extracted context → enhanced prompt**

### Phase 3: Full Story Coach
1. **IMPACT phase** - quantification questions
2. **GROWTH phase** - for STARL/CARL frameworks (conditional)
3. **Multiple choice templates** - reduce friction
4. **Progress indicators** - show phase/time elapsed

### Phase 4: Polish
1. **Resume UX** - "Welcome back, you were telling me about..."
2. **Partial completion** - generate with whatever was gathered
3. **Analytics** - track extraction quality vs story ratings

### Removed from Scope
1. ~~Dynamic LLM-generated questions~~ → Static question bank (INV-SC-2)
2. ~~Mandatory interview flow~~ → Always optional (INV-SC-5)
3. ~~a3-plugin integration~~ → Standalone Story Coach persona

---

## Decision Record

| Decision | Rationale |
|----------|-----------|
| Build versioning first | Real problem, clear solution, one afternoon |
| Skip brainstorming state machine | 60% will skip, maintenance nightmare |
| Enrichment must be optional | Mandatory = abandonment |
| Static questions, not LLM | Performance, cost, predictability |
| Max 3 questions | Bounded complexity, user patience |
| Store in journal entry | No new tables, no state sync |

---

## Appendix: The One-Liner

If someone asks "what is this feature?":

> **"Answer a few optional questions, get a better interview story, keep your old versions."**

That's the feature. Everything else is implementation detail.

---

## Appendix: The Extraction Difference

### Before (Without Story Coach)

```
Journal: "Led migration from monolith to microservices. 6 months."

Generated Story:
SITUATION: Led migration from monolith to microservices over 6 months.
RESULT: Successfully completed migration and improved deployments.
```

Generic. Forgettable. Could be anyone.

### After (With Story Coach)

```
Journal: "Led migration from monolith to microservices. 6 months."

Story Coach extracts:
- 2am race condition discovery, 2 weeks before launch
- 72-hour cross-functional debugging sprint
- Names: Sarah (platform), Marcus (orders), Dev (legacy)
- Counterfactual: millions in refunds, PR disaster
- Metric: bi-weekly → 5-10x daily (50-100x improvement)
- Artifact: runbook still in use

Generated Story:
SITUATION: Two weeks before a major launch, I discovered a critical
race condition at 2am that would have caused customer double-charges.

ACTION: I assembled a cross-functional team (Sarah from platform,
Marcus from orders, Dev the legacy contractor) and led a 72-hour
debugging sprint. I identified the root cause and wrote the fix.

RESULT: Prevented what could have been millions in refunds. Deployment
frequency improved from bi-weekly to 5-10x daily (50-100x improvement).
The runbook I wrote is still used by the team today.
```

Specific. Memorable. Unmistakably YOUR story.

**The difference is extraction, not invention.**

---

## Related Documents

- `brainstorming-beauty.md` - The philosophy of one-question-at-a-time
- `persona-story-coach.md` - Full Story Coach persona specification
