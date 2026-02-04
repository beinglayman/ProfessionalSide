# Story Coach CLI - Handoff Document

## Original Task

<original_task>
Add a brainstorming/coaching phase to career story generation that extracts tacit knowledge users have but didn't write down in their journal entries. The goal was to improve story quality by asking probing questions before AI generates the story, using patterns from the a3-plugin's superpowers brainstorming skill.

Key requirements:
- Dynamic, situational prompts based on user feedback
- Progressive questioning (one question at a time)
- Session persistence for 10-60 minute sessions
- Story archetypes that determine questioning approach
- CLI-first implementation to validate pipeline before frontend integration
</original_task>

## Work Completed

<work_completed>

### 1. Design Documents Created (in `docs/design/`)
- `persona-story-coach.md` - Story Coach persona with D-I-G protocol (Dig, Impact, Growth)
- `story-frameworks-redesign.md` - 8 story archetypes replacing simple frameworks
- `archetype-prompts.md` - Detailed prompts for each archetype
- `CONCLUSIVE-DESIGN.md` - Final design decisions
- `brainstorming-beauty.md` - Philosophy of extraction vs repetition
- `brainstorming-feature-debate.md` - RJ, PG, GSE, PGC debate on the feature

### 2. Story Coach CLI Built (`backend/src/cli/story-coach/`)

**Files created and committed (7 commits):**

| File | Purpose |
|------|---------|
| `types.ts` | StoryArchetype, CoachSessionFile, ExtractedContext, GeneratedStoryFile types |
| `questions.ts` | 48 coaching questions (6 per archetype × 8 archetypes) organized by D-I-G phases |
| `prompts/archetype-detection.prompt.md` | LLM prompt for classifying story type |
| `prompts/story-coach-system.prompt.md` | Story Coach persona prompt |
| `prompts/archetypes/firefighter.prompt.md` | Detailed firefighter archetype generation prompt |
| `services/llm-client.ts` | Azure OpenAI client with lazy loading, loads .env from backend root |
| `services/archetype-detector.ts` | LLM-based story type classification |
| `services/story-generator.ts` | Framework-aware story generation with archetype augmentation |
| `services/story-evaluator.ts` | Rule-based rubric scoring (specificity, hook, evidence, archetype fit, impact) |
| `services/interactive-coach.ts` | Interactive coaching with dynamic LLM follow-ups, semantic context extraction |
| `index.ts` | CLI with commands: detect, coach, generate, evaluate, compare, coach-generate, pipeline |
| `README.md` | Usage documentation |
| `test-data/migration-entry.json` | Rich test entry with 2am incident, named people |
| `test-data/simple-entry.json` | Minimal test entry for baseline comparison |

**CLI Commands:**
```bash
npx ts-node src/cli/story-coach/index.ts detect <entry.json>        # Detect archetype
npx ts-node src/cli/story-coach/index.ts coach <entry.json>         # Interactive coaching
npx ts-node src/cli/story-coach/index.ts generate <entry.json>      # Generate story
npx ts-node src/cli/story-coach/index.ts evaluate <story.json>      # Score story
npx ts-node src/cli/story-coach/index.ts compare <entry.json>       # With vs without coaching
npx ts-node src/cli/story-coach/index.ts coach-generate <entry.json> # Full flow
npx ts-node src/cli/story-coach/index.ts pipeline <entry.json>      # Automated pipeline
```

### 3. Test Results

| Entry | Auto-Extract Score | Notes |
|-------|-------------------|-------|
| Migration (rich) | 7.2/10 | Hook: 8, Evidence: 8, Specificity: 6 |
| Simple (thin) | 6.2/10 | Missing names, drama, business context |

### 4. Bugs Fixed
- **OpenAI → AzureOpenAI**: Updated llm-client.ts to use Azure OpenAI with backend's .env configuration
- **Named people extraction**: Fixed regex to properly extract "Sarah from platform" instead of random words
- **Context field misalignment**: Improved semantic extraction to handle follow-up questions

### 5. Git Commits (7 total, no Claude co-author mention per user request)
```
264b4ca test(story-coach): add test data for pipeline validation
55341f9 feat(story-coach): add CLI with full pipeline commands
babf3c8 feat(story-coach): add interactive coaching with dynamic follow-ups
eacf370 feat(story-coach): add story generator and evaluator
af2951c feat(story-coach): add LLM client and archetype detector
632464e feat(story-coach): add archetype detection and coaching prompts
2b0ffa2 feat(story-coach): add types and question banks for 8 archetypes
```

</work_completed>

## Work Remaining

<work_remaining>

### Critical: Validate Core Hypothesis
The core hypothesis was NOT proven in testing:
- Interactive coaching scored the SAME as auto-extract (6.8 vs 6.8)
- The rich test entry already contained all the details (2am, Sarah, Marcus, Dev)
- LLM reformatted existing content rather than extracting NEW information

**To prove value, need:**
1. Test with a REAL user on a THIN journal entry
2. User provides NEW details via coaching that weren't in original
3. Compare coached story vs auto-extracted story
4. Measure: Did coaching add information that improved the story?

### Missing Archetype Prompts
Only 1 of 8 archetype prompt templates exists:
- ✅ `firefighter.prompt.md` - Complete
- ❌ `architect.prompt.md` - Not created
- ❌ `diplomat.prompt.md` - Not created
- ❌ `multiplier.prompt.md` - Not created
- ❌ `detective.prompt.md` - Not created
- ❌ `pioneer.prompt.md` - Not created
- ❌ `turnaround.prompt.md` - Not created
- ❌ `preventer.prompt.md` - Not created

Currently all non-firefighter archetypes fall back to firefighter prompt.

### Frontend Integration
Not started. Would need:
1. API endpoints for detect, coach, generate, evaluate
2. Session persistence in database (StoryCoachSession model)
3. UI for progressive questioning
4. Integration with existing career stories flow

### RJ/PGC Recommendations to Consider
Both personas recommended simplifying:
- Cut 6 of 8 archetypes (keep "crisis" and "builder")
- Cut LLM story generation (let users write with extracted context)
- Reduce 48 questions to 3-4 universal ones:
  1. "What almost went wrong?"
  2. "Who specifically helped you?"
  3. "What's the number that proves it worked?"

</work_remaining>

## Attempted Approaches

<attempted_approaches>

### 1. Simulated Interactive Coaching (Failed)
- Ran subagents to simulate user answering coaching questions
- Result: Scores didn't improve over auto-extract
- Problem: Scripted answers didn't align with dynamic follow-up questions
- Named people extraction was broken (extracted random words)

### 2. Dynamic Follow-Up Questions (Partially Working)
- LLM generates follow-up questions based on vague answers
- Works technically but causes "context misalignment"
- Answer to follow-up gets mapped to wrong context field
- Fixed by using semantic extraction instead of positional

### 3. Rule-Based Scoring (Working)
- Evaluator uses regex patterns to score stories
- Checks for: percentages, dollar amounts, named people, time references
- Caps score at 9.5 ("Never give 10" philosophy)
- Simple, fast, no hallucination risk

### 4. Comparison Testing (Inconclusive)
- Compared basic story vs enhanced story
- Enhanced scored higher (7.1 vs 6.2)
- BUT: The improvement came from LLM extracting details already in the input
- Did NOT prove coaching extracts NEW information

</attempted_approaches>

## Critical Context

<critical_context>

### The Core Insight (from RJ/PGC debate)
> "They built a story-writing machine when they needed an interview machine."

The value should be in EXTRACTION, not GENERATION:
- Show users what they forgot to write
- Let THEM incorporate it into their story
- Don't have LLM write the story for them

### 8 Story Archetypes
| Archetype | Pattern | Signal Keywords |
|-----------|---------|-----------------|
| firefighter | Crisis response, time pressure | "incident", "2am", "emergency" |
| architect | System design, lasting impact | "designed", "architected", "foundation" |
| diplomat | Stakeholder alignment, conflict resolution | "stakeholders", "alignment", "consensus" |
| multiplier | Force multiplication, scaling impact | "teams adopted", "trained", "spread" |
| detective | Investigation, root cause analysis | "traced", "discovered", "root cause" |
| pioneer | New territory, no documentation | "first", "no docs", "figured out" |
| turnaround | Inherited mess, systematic fix | "inherited", "turned around", "was broken" |
| preventer | Risk identification, disaster averted | "noticed", "prevented", "would have" |

### D-I-G Protocol (Coaching Phases)
- **Dig**: Find the buried lede (3 questions)
- **Impact**: Quantify the counterfactual (2 questions)
- **Growth**: Extract the learning (1 question)

### Azure OpenAI Configuration
The CLI uses backend's `.env` file:
```
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://inchronicle-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-10-21
```

### Test Output Location
All test outputs saved to: `backend/src/cli/story-coach/test-output/`
- `fixed-extraction/` - Latest pipeline run with fixed extraction
- `coach-generate-migration/` - Auto-extract test
- `coach-generate-simple/` - Simple entry test
- `interactive-migration-v2/` - Attempted interactive session

</critical_context>

## Current State

<current_state>

### What's Complete
- ✅ CLI fully functional with all commands
- ✅ 7 commits pushed to main branch
- ✅ Azure OpenAI integration working
- ✅ Rule-based evaluator working
- ✅ 48 questions defined for all 8 archetypes
- ✅ Test data created

### What's In Progress
- ⏸️ Hypothesis validation (parked - needs real user testing)
- ⏸️ 7 missing archetype prompts (parked)

### What's NOT Started
- ❌ Frontend integration
- ❌ Database persistence for sessions
- ❌ API endpoints

### Key Decision Point
Before continuing, need to decide:

**Option A: Simplify per RJ/PGC**
- Cut to 3 questions, 2 archetypes
- Remove LLM story generation
- Let users write with extracted context
- Much simpler, but different product

**Option B: Complete Current Design**
- Add 7 missing archetype prompts
- Validate with real users
- Integrate with frontend
- Full coaching experience

**Option C: Pivot to Interview-Only**
- Keep questions, remove generation
- Show users their extracted details
- They edit their own story
- Tests the "extraction > generation" hypothesis

### Open Questions
1. Does coaching extract NEW information or just reformat existing?
2. Would users prefer to write their own story with prompts, or have AI generate?
3. Is 8 archetypes necessary or is 2-3 sufficient?
4. Should we test with real users before building more?

</current_state>

---

## Quick Start for Next Session

```bash
cd /Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend

# Run pipeline on test entry
npx ts-node src/cli/story-coach/index.ts pipeline src/cli/story-coach/test-data/migration-entry.json

# Run interactive coaching (requires terminal input)
npx ts-node src/cli/story-coach/index.ts coach-generate src/cli/story-coach/test-data/simple-entry.json

# Run auto-extract mode (no input needed)
npx ts-node src/cli/story-coach/index.ts coach-generate src/cli/story-coach/test-data/simple-entry.json --auto-extract
```

## Files to Read First
1. `src/cli/story-coach/README.md` - Overview
2. `src/cli/story-coach/questions.ts` - The 48 questions (key asset)
3. `src/cli/story-coach/prompts/archetypes/firefighter.prompt.md` - Best prompt template
4. `docs/design/CONCLUSIVE-DESIGN.md` - Design decisions
