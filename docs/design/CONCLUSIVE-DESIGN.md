# Conclusive Design: Story Coach + Archetypes

> Final decisions. No more open questions.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Persona vs simple questions | **Story Coach persona** - full voice, proven results |
| Archetype detection | **From journal entry content** - LLM analyzes draft, recommends 1-3 |
| Framework relationship | **Archetype AUGMENTS framework** - archetype shapes prompt, framework shapes structure |
| Session persistence | **StoryCoachSession table** - persisted per story, replayable |
| Skip behavior | **Always skippable** - but E2E tests always run full Q&A |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     STORY GENERATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ARCHETYPE DETECTION (from journal entry)                    │
│     POST /career-stories/detect-archetype/:entryId              │
│     → LLM reads journal content                                 │
│     → Returns: primary archetype + 2 alternatives               │
│                                                                 │
│  2. STORY COACH SESSION (optional but encouraged)               │
│     POST /career-stories/coach-session/start                    │
│     → Creates StoryCoachSession record                          │
│     → Returns first question based on archetype                 │
│                                                                 │
│     POST /career-stories/coach-session/:id/answer               │
│     → Stores answer, returns next question                      │
│     → Repeats until extraction complete                         │
│                                                                 │
│  3. FRAMEWORK SELECTION (user chooses)                          │
│     → Archetype recommends frameworks                           │
│     → User picks final framework                                │
│                                                                 │
│  4. STORY GENERATION (enhanced prompt)                          │
│     POST /career-stories/stories/from-entry/:id                 │
│     {                                                           │
│       framework: 'SOAR',                                        │
│       archetype: 'firefighter',                                 │
│       coachSessionId: 'session-123'  // pulls extractedContext  │
│     }                                                           │
│     → Loads archetype prompt + extractedContext                 │
│     → Generates story with enhanced understanding               │
│                                                                 │
│  5. STORY EVALUATION (Story Coach scores)                       │
│     POST /career-stories/stories/:id/evaluate                   │
│     → Story Coach rubric scoring                                │
│     → Returns score + improvement suggestions                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```prisma
// Add to schema.prisma

model StoryCoachSession {
  id              String   @id @default(cuid())
  userId          String
  journalEntryId  String
  careerStoryId   String?  // Linked after story creation

  // Detected archetype
  archetype       String   // 'firefighter', 'architect', etc.
  archetypeAlternatives String[] // Other options considered

  // Conversation
  exchanges       Json     // Array of { question, answer, timestamp, phase }
  currentPhase    String   @default("dig") // 'dig' | 'impact' | 'growth' | 'complete'
  questionsAsked  Int      @default(0)

  // Extracted context (accumulated)
  extractedContext Json    // ExtractedContext object

  // Status
  status          String   @default("in_progress") // 'in_progress' | 'completed' | 'skipped'

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  completedAt     DateTime?

  // Relations
  user            User     @relation(fields: [userId], references: [id])
  journalEntry    JournalEntry @relation(fields: [journalEntryId], references: [id])
  careerStory     CareerStory? @relation(fields: [careerStoryId], references: [id])

  @@index([userId])
  @@index([journalEntryId])
}

// Update CareerStory model
model CareerStory {
  // ... existing fields

  // New fields
  archetype         String?   // The archetype used for generation
  coachSessionId    String?   // Link to coaching session
  coachSession      StoryCoachSession?

  // Evaluation
  evaluationScore   Float?    // Story Coach rubric score (1-10)
  evaluationDetails Json?     // Breakdown by criterion
}
```

---

## Story Coach Rubric (for Evaluation)

Adapted from Russian Judge pattern:

| Criterion | Weight | What to assess |
|-----------|--------|----------------|
| **Specificity** | 25% | Names, numbers, dates vs vague claims |
| **Compelling Hook** | 20% | Does the opening grab attention? |
| **Evidence Quality** | 20% | Are claims backed by activities/proof? |
| **Archetype Fit** | 15% | Does the story follow its archetype arc? |
| **Actionable Impact** | 20% | Clear, quantified outcomes? |

### Scoring Scale

| Score | Meaning | Story Coach Comment |
|-------|---------|---------------------|
| 1-3 | Weak | "This is a summary, not a story. Where's the drama?" |
| 4-5 | Adequate | "I can see what happened. I don't feel why it matters." |
| 6 | Competent | "Good structure. Now make me care." |
| 7 | Good | "This has a hook. The numbers are there. Keep going." |
| 8 | Strong | "THAT'S a story. I'd remember this in an interview." |
| 9 | Excellent | "This would stand out. The details sell it." |
| 10 | Never given | "Perfect stories don't exist. But this is close." |

### Auto-Scoring Rules

```typescript
function scoreStory(story: CareerStory, context: ExtractedContext): StoryEvaluation {
  let score = 5.0; // Start at adequate

  // Specificity (+/- 2)
  if (story.sections.some(s => s.summary.match(/\d+%|\$\d+|\d+ (hours|days|teams|users)/))) {
    score += 1.0; // Has numbers
  }
  if (context.namedPeople?.length >= 2) {
    score += 0.5; // Has named people
  }
  if (story.sections.some(s => s.summary.includes('various') || s.summary.includes('significant'))) {
    score -= 1.0; // Vague language
  }

  // Compelling Hook (+/- 1.5)
  const firstSection = Object.values(story.sections)[0];
  if (firstSection?.summary.match(/^(At \d|When I|Two weeks|The moment)/)) {
    score += 1.0; // Starts with hook
  }
  if (firstSection?.summary.match(/^(In my role|I was responsible|The project)/)) {
    score -= 0.5; // Boring opening
  }

  // Evidence Quality (+/- 1)
  const evidenceCount = Object.values(story.sections)
    .reduce((sum, s) => sum + (s.evidence?.length || 0), 0);
  if (evidenceCount >= 3) score += 0.5;
  if (evidenceCount === 0) score -= 1.0;

  // Archetype Fit (+/- 1)
  if (matchesArchetypePattern(story, story.archetype)) {
    score += 0.5;
  }

  // Counterfactual present (+1)
  if (context.counterfactual && story.sections.some(s =>
    s.summary.includes('would have') || s.summary.includes('prevented'))) {
    score += 1.0;
  }

  return {
    score: Math.min(9.5, Math.max(1.0, score)),
    breakdown: { specificity, hook, evidence, archetypeFit, impact },
    suggestions: generateSuggestions(score, breakdown),
  };
}
```

---

## Archetype Detection Prompt

```markdown
# Archetype Detection

Analyze this journal entry and determine which story archetype best fits.

## Journal Entry
Title: {{title}}
Content: {{fullContent}}
Category: {{category}}

## Available Archetypes

1. **FIREFIGHTER** - Crisis emerged → Responded under pressure → Disaster averted
   Signals: incidents, emergencies, "almost", time pressure, recovery

2. **ARCHITECT** - Saw big picture → Designed solution → Built to last
   Signals: designed, architected, system, multi-month, "still in use"

3. **DIPLOMAT** - Competing interests → Bridged divides → Alignment achieved
   Signals: stakeholders, buy-in, resistance, cross-team, politics

4. **MULTIPLIER** - Created something → Others adopted → Impact scaled
   Signals: team adopted, trained, framework, "N teams now use"

5. **DETECTIVE** - Mystery problem → Investigated → Found root cause
   Signals: couldn't figure out, traced, intermittent, investigation

6. **PIONEER** - Uncharted territory → Explored → Created trail for others
   Signals: first time, no documentation, figured out, no playbook

7. **TURNAROUND** - Failing state → Diagnosed → Recovered
   Signals: inherited, failing, took over, before/after metrics

8. **PREVENTER** - Saw risk → Raised alarm → Prevented disaster
   Signals: would have, caught before, proactive, prevented

## Output

Return JSON:
{
  "primary": {
    "archetype": "firefighter",
    "confidence": 0.85,
    "reasoning": "Entry mentions 2am incident, race condition discovery, potential customer impact"
  },
  "alternatives": [
    {
      "archetype": "detective",
      "confidence": 0.60,
      "reasoning": "Investigation element present but crisis response is stronger"
    }
  ],
  "signals": {
    "hasCrisis": true,
    "hasArchitecture": false,
    "hasStakeholders": false,
    ...
  }
}
```

---

## Story Coach Question Flow

Based on detected archetype:

### FIREFIGHTER Questions

```typescript
const FIREFIGHTER_QUESTIONS = [
  {
    phase: 'dig',
    question: "What was the moment you realized something was wrong?",
    followUp: "What time was it? Where were you?",
  },
  {
    phase: 'dig',
    question: "Who did you call first? What did you say?",
    followUp: "Give me their name and role.",
  },
  {
    phase: 'impact',
    question: "What would have happened if you hadn't caught this?",
    followUp: "Be specific - customers affected, money lost, reputation damage?",
  },
  {
    phase: 'impact',
    question: "What's the number that proves you succeeded?",
    followUp: "Time saved? Incidents prevented? Money saved?",
  },
  {
    phase: 'growth',
    question: "What changed because of this? Runbook? Process? Alert?",
    followUp: "Is it still in use today?",
  },
];
```

### ARCHITECT Questions

```typescript
const ARCHITECT_QUESTIONS = [
  {
    phase: 'dig',
    question: "What did you see that others didn't?",
    followUp: "Why was NOW the right time to act?",
  },
  {
    phase: 'dig',
    question: "What was the hardest trade-off you had to make?",
    followUp: "What did you give up? What did you get?",
  },
  {
    phase: 'impact',
    question: "Who uses this today? How many teams?",
    followUp: "Is it still the foundation?",
  },
  // ... etc
];
```

### Question Selection Logic

```typescript
function getNextQuestion(session: StoryCoachSession): CoachQuestion | null {
  const archetype = session.archetype;
  const questions = ARCHETYPE_QUESTIONS[archetype];
  const asked = session.questionsAsked;

  // Phase-based selection
  const phaseQuestions = questions.filter(q => q.phase === session.currentPhase);
  const phaseAsked = session.exchanges.filter(e => e.phase === session.currentPhase).length;

  if (phaseAsked < phaseQuestions.length) {
    return phaseQuestions[phaseAsked];
  }

  // Move to next phase
  const phases = ['dig', 'impact', 'growth'];
  const currentIdx = phases.indexOf(session.currentPhase);
  if (currentIdx < phases.length - 1) {
    session.currentPhase = phases[currentIdx + 1];
    return getNextQuestion(session);
  }

  return null; // Session complete
}
```

---

## API Endpoints

### 1. Detect Archetype

```typescript
// POST /api/v1/career-stories/detect-archetype/:entryId
interface DetectArchetypeResponse {
  primary: {
    archetype: StoryArchetype;
    confidence: number;
    reasoning: string;
  };
  alternatives: Array<{
    archetype: StoryArchetype;
    confidence: number;
    reasoning: string;
  }>;
  signals: ArchetypeSignals;
}
```

### 2. Start Coach Session

```typescript
// POST /api/v1/career-stories/coach-session/start
interface StartSessionRequest {
  journalEntryId: string;
  archetype: StoryArchetype;
}

interface StartSessionResponse {
  sessionId: string;
  firstQuestion: {
    question: string;
    phase: 'dig' | 'impact' | 'growth';
    hint?: string;
  };
  archetype: StoryArchetype;
}
```

### 3. Answer Question

```typescript
// POST /api/v1/career-stories/coach-session/:id/answer
interface AnswerRequest {
  answer: string;
}

interface AnswerResponse {
  nextQuestion: {
    question: string;
    phase: string;
    hint?: string;
  } | null; // null = session complete
  extractedContext: ExtractedContext; // Accumulated so far
  progress: {
    questionsAsked: number;
    currentPhase: string;
    isComplete: boolean;
  };
}
```

### 4. Skip Session

```typescript
// POST /api/v1/career-stories/coach-session/:id/skip
// Marks session as skipped, still usable for generation without extractedContext
```

### 5. Generate Story (Enhanced)

```typescript
// POST /api/v1/career-stories/stories/from-entry/:entryId
interface CreateStoryRequest {
  framework: FrameworkName;
  archetype?: StoryArchetype;
  coachSessionId?: string; // If provided, loads extractedContext from session
}
```

### 6. Evaluate Story

```typescript
// POST /api/v1/career-stories/stories/:id/evaluate
interface EvaluateResponse {
  score: number; // 1-10
  breakdown: {
    specificity: number;
    compellingHook: number;
    evidenceQuality: number;
    archetypeFit: number;
    actionableImpact: number;
  };
  suggestions: string[];
  coachComment: string; // Story Coach voice
}
```

---

## Test Plan

### Test 1: Prompt Enhancement Isolation

**Goal:** Prove enhanced prompts produce better stories.

```typescript
// test/career-stories/prompt-enhancement.test.ts

describe('Prompt Enhancement', () => {
  const journalEntry = fixtures.journalEntry.migrationProject;

  it('produces better story WITH archetype + extractedContext', async () => {
    // Generate WITHOUT enhancement
    const basicStory = await generateStory({
      journalEntry,
      framework: 'STAR',
    });

    // Generate WITH enhancement
    const enhancedStory = await generateStory({
      journalEntry,
      framework: 'STAR',
      archetype: 'firefighter',
      extractedContext: {
        obstacle: 'Race condition discovered at 2am, 2 weeks before launch',
        counterfactual: 'Millions in refunds, PR disaster',
        namedPeople: ['Sarah from platform', 'Marcus from orders'],
        metric: '50-100x deployment frequency improvement',
      },
    });

    // Evaluate both with Story Coach rubric
    const basicScore = await evaluateStory(basicStory);
    const enhancedScore = await evaluateStory(enhancedStory);

    // Enhanced should score higher
    expect(enhancedScore.score).toBeGreaterThan(basicScore.score);

    // Enhanced should have specifics
    expect(enhancedStory.sections.situation.summary).toMatch(/2am|race condition/);
    expect(enhancedStory.sections.result.summary).toMatch(/\d+x|\d+%/);
  });
});
```

### Test 2: E2E Story Coach Flow

```typescript
// e2e/story-coach-flow.spec.ts

test('full story coach flow produces high-quality story', async () => {
  // 1. Create journal entry
  const entry = await createJournalEntry(testData.migrationProject);

  // 2. Detect archetype
  const archetype = await detectArchetype(entry.id);
  expect(archetype.primary.archetype).toBe('firefighter');

  // 3. Start coach session
  const session = await startCoachSession({
    journalEntryId: entry.id,
    archetype: archetype.primary.archetype,
  });

  // 4. Answer all questions
  let nextQuestion = session.firstQuestion;
  const answers = testData.firefighterAnswers;

  while (nextQuestion) {
    const response = await answerQuestion(session.sessionId, {
      answer: answers[nextQuestion.phase],
    });
    nextQuestion = response.nextQuestion;
  }

  // 5. Generate story
  const story = await createStoryFromEntry(entry.id, {
    framework: 'SOAR',
    archetype: 'firefighter',
    coachSessionId: session.sessionId,
  });

  // 6. Evaluate
  const evaluation = await evaluateStory(story.id);

  // Should score 7+ with full coaching
  expect(evaluation.score).toBeGreaterThanOrEqual(7);

  // Should have extracted details
  expect(story.sections.obstacles.summary).toContain('2am');
  expect(story.sections.results.summary).toMatch(/\d+/);
});
```

### Test 3: Skip Flow Still Works

```typescript
test('skipping coach still generates story', async () => {
  const entry = await createJournalEntry(testData.simpleProject);

  // Skip directly to generation
  const story = await createStoryFromEntry(entry.id, {
    framework: 'STAR',
    // No archetype, no coachSessionId
  });

  // Should still work
  expect(story).toBeDefined();
  expect(story.sections).toHaveProperty('situation');

  // Score will be lower but acceptable
  const evaluation = await evaluateStory(story.id);
  expect(evaluation.score).toBeGreaterThanOrEqual(4);
});
```

---

## Implementation Order

### Phase 1: Backend Foundation (2-3 hours)

1. Add `StoryCoachSession` to Prisma schema
2. Add archetype types to `career-story.prompt.ts`
3. Create archetype prompt templates (start with firefighter)
4. Modify `buildCareerStoryMessages` to accept archetype + extractedContext
5. Add `/detect-archetype` endpoint
6. **Test:** API call with hardcoded archetype + context

### Phase 2: Coach Session API (2-3 hours)

1. Implement `/coach-session/start`
2. Implement `/coach-session/:id/answer`
3. Implement `/coach-session/:id/skip`
4. Add archetype-specific question banks
5. **Test:** Full Q&A flow via API

### Phase 3: Story Evaluation (1-2 hours)

1. Implement `/stories/:id/evaluate`
2. Add rubric scoring logic
3. Add Story Coach comment generation
4. **Test:** Compare scores for basic vs enhanced stories

### Phase 4: Frontend Integration (2-3 hours)

1. Add `StoryCoachModal` component
2. Integrate with `FrameworkPickerModal`
3. Show archetype recommendations
4. Display evaluation score after generation
5. **Test:** E2E flow in browser

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Enhanced story score | ≥7.0 average (vs ≤5.5 for basic) |
| Specificity presence | 80%+ stories have numbers |
| Named people | 70%+ stories have ≥1 name |
| Compelling hook | 60%+ stories start with hook pattern |
| E2E test pass rate | 100% |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add StoryCoachSession model |
| `career-story.prompt.ts` | Add types, modify buildMessages |
| `templates/archetypes/*.prompt.md` | NEW - 8 archetype prompts |
| `templates/archetype-detection.prompt.md` | NEW - detection prompt |
| `story-coach.service.ts` | NEW - session management |
| `story-evaluation.service.ts` | NEW - rubric scoring |
| `career-stories.controller.ts` | Add new endpoints |
| `career-stories.routes.ts` | Add new routes |
| `career-stories.schemas.ts` | Add new request schemas |
| `src/components/career-stories/StoryCoachModal.tsx` | NEW - frontend |
| `src/hooks/useStoryCoach.ts` | NEW - frontend hooks |

---

This is conclusive. Ready to implement?
