# Quick Integration Plan: Story Coach + Archetypes

> Minimal changes to get this working in 1-2 iterations

---

## Current Flow (What Exists)

```
Frontend                           Backend
────────                           ───────
FrameworkPickerModal
    ↓
POST /stories/from-entry/:id
    { framework: 'STAR' }          → career-story.service.ts
                                      → buildCareerStoryMessages({ journalEntry, framework })
                                      → LLM generates
                                      → Save CareerStory
```

**Key file:** `backend/src/services/ai/prompts/career-story.prompt.ts`
- `buildCareerStoryMessages(params)` - builds the prompt
- `getCareerStorySystemPrompt()` - loads system template
- `getCareerStoryUserPrompt(params)` - builds user message with Handlebars

---

## Target Flow (What We Want)

```
Frontend                           Backend
────────                           ───────
StoryCoachModal (new)
    ↓
[Interactive Q&A - 3-5 questions]
    ↓
Extract context + Detect archetype
    ↓
POST /stories/from-entry/:id
    {
      framework: 'STAR',           → career-story.service.ts
      archetype: 'firefighter',       → buildCareerStoryMessages({
      extractedContext: {...}              journalEntry,
    }                                      framework,
                                          archetype,      // NEW
                                          extractedContext // NEW
                                        })
                                      → LLM generates with enhanced prompt
                                      → Save CareerStory
```

---

## Iteration 1: Backend-Only Enhancement (30 min)

**Goal:** Add archetype + extractedContext to prompt WITHOUT changing frontend flow.

### Step 1: Add types

```typescript
// backend/src/services/ai/prompts/career-story.prompt.ts

export type StoryArchetype =
  | 'firefighter'
  | 'architect'
  | 'diplomat'
  | 'multiplier'
  | 'detective'
  | 'pioneer'
  | 'turnaround'
  | 'preventer';

export interface ExtractedContext {
  realStory?: string;        // The buried lede
  obstacle?: string;         // What almost went wrong
  namedPeople?: string[];    // Specific individuals
  counterfactual?: string;   // What would have happened
  metric?: string;           // The quantified impact
  evidence?: string;         // Where it's documented
  impactType?: 'performance' | 'cost' | 'capability' | 'risk' | 'experience';
}

export interface CareerStoryPromptParams {
  journalEntry: JournalEntryContent;
  framework: FrameworkName;
  archetype?: StoryArchetype;        // NEW - optional
  extractedContext?: ExtractedContext; // NEW - optional
}
```

### Step 2: Add archetype prompt templates

Create: `backend/src/services/ai/prompts/templates/archetypes/`

```
archetypes/
├── firefighter.prompt.md
├── architect.prompt.md
├── diplomat.prompt.md
├── multiplier.prompt.md
├── detective.prompt.md
├── pioneer.prompt.md
├── turnaround.prompt.md
└── preventer.prompt.md
```

Each file contains the archetype-specific system prompt from `archetype-prompts.md`.

### Step 3: Modify buildCareerStoryMessages

```typescript
export function buildCareerStoryMessages(
  params: CareerStoryPromptParams
): ChatCompletionMessageParam[] {
  const { archetype, extractedContext } = params;

  // Base system prompt
  let systemContent = getCareerStorySystemPrompt();

  // If archetype provided, prepend archetype guidance
  if (archetype) {
    const archetypePrompt = loadArchetypePrompt(archetype);
    systemContent = archetypePrompt + '\n\n---\n\n' + systemContent;
  }

  // Build user prompt
  let userContent = getCareerStoryUserPrompt(params);

  // If extractedContext provided, append it
  if (extractedContext && Object.keys(extractedContext).length > 0) {
    userContent += '\n\n## Extracted Context from Story Coach\n\n';
    userContent += formatExtractedContext(extractedContext);
  }

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}

function loadArchetypePrompt(archetype: StoryArchetype): string {
  try {
    return readFileSync(
      join(TEMPLATES_DIR, 'archetypes', `${archetype}.prompt.md`),
      'utf-8'
    );
  } catch {
    console.warn(`Archetype prompt not found: ${archetype}`);
    return '';
  }
}

function formatExtractedContext(ctx: ExtractedContext): string {
  const lines: string[] = [];

  if (ctx.realStory) {
    lines.push(`### The Real Story\n${ctx.realStory}`);
  }
  if (ctx.obstacle) {
    lines.push(`### What Almost Went Wrong\n${ctx.obstacle}`);
  }
  if (ctx.namedPeople?.length) {
    lines.push(`### Key People\n${ctx.namedPeople.map(p => `- ${p}`).join('\n')}`);
  }
  if (ctx.counterfactual) {
    lines.push(`### What Would Have Happened\n${ctx.counterfactual}`);
  }
  if (ctx.metric) {
    lines.push(`### Quantified Impact\n${ctx.metric}`);
  }

  return lines.join('\n\n');
}
```

### Step 4: Test via API

```bash
# Test without archetype (existing flow - should still work)
curl -X POST /api/v1/career-stories/stories/from-entry/123 \
  -d '{"framework": "STAR"}'

# Test WITH archetype + extracted context (new flow)
curl -X POST /api/v1/career-stories/stories/from-entry/123 \
  -d '{
    "framework": "SOAR",
    "archetype": "firefighter",
    "extractedContext": {
      "realStory": "Two weeks before launch, at 2am, discovered race condition",
      "obstacle": "72-hour debugging sprint with cross-functional team",
      "namedPeople": ["Sarah from platform", "Marcus from orders", "Dev the contractor"],
      "counterfactual": "Millions in refunds, PR disaster",
      "metric": "Deployment frequency improved 50-100x"
    }
  }'
```

**Result:** Backend now accepts archetype + extractedContext and generates enhanced stories.

---

## Iteration 2: Simple Frontend Integration (1 hour)

**Goal:** Add a minimal Story Coach UI that extracts context before generation.

### Option A: Pre-Generation Modal (Simplest)

Add a step between "Promote to Career Story" and framework selection:

```tsx
// StoryCoachModal.tsx - Minimal version

const COACH_QUESTIONS = [
  {
    id: 'obstacle',
    question: "What almost went wrong?",
    placeholder: "The moment when things could have failed...",
  },
  {
    id: 'counterfactual',
    question: "What would have happened if you hadn't acted?",
    placeholder: "The outcome you prevented...",
  },
  {
    id: 'metric',
    question: "What's the one number that proves this worked?",
    placeholder: "e.g., 50% faster, $100K saved, 12 teams adopted...",
  },
];

function StoryCoachModal({ journalEntry, onComplete, onSkip }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [COACH_QUESTIONS[currentQ].id]: answer
    }));

    if (currentQ < COACH_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Detect archetype from answers
      const archetype = detectArchetype(answers, journalEntry);
      onComplete({ extractedContext: answers, archetype });
    }
  };

  return (
    <Modal>
      <div className="story-coach">
        <p className="coach-question">
          {COACH_QUESTIONS[currentQ].question}
        </p>

        <textarea
          placeholder={COACH_QUESTIONS[currentQ].placeholder}
          onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleAnswer(e.target.value)}
        />

        <div className="actions">
          <Button variant="ghost" onClick={onSkip}>
            Skip Story Coach
          </Button>
          <Button onClick={() => handleAnswer(/* current value */)}>
            Next
          </Button>
        </div>

        <Progress value={(currentQ + 1) / COACH_QUESTIONS.length * 100} />
      </div>
    </Modal>
  );
}
```

### Option B: Inline Questions (Slightly More Work)

Add questions directly in the FrameworkPickerModal:

```tsx
// FrameworkPickerModal.tsx - Enhanced

function FrameworkPickerModal({ entryId, onSelect }) {
  const [step, setStep] = useState<'coach' | 'framework'>('coach');
  const [extractedContext, setExtractedContext] = useState({});
  const [archetype, setArchetype] = useState<string | null>(null);

  if (step === 'coach') {
    return (
      <StoryCoachQuestions
        onComplete={(ctx, arch) => {
          setExtractedContext(ctx);
          setArchetype(arch);
          setStep('framework');
        }}
        onSkip={() => setStep('framework')}
      />
    );
  }

  return (
    <FrameworkSelection
      recommendedArchetype={archetype}
      onSelect={(framework) => {
        onSelect({ framework, archetype, extractedContext });
      }}
    />
  );
}
```

### Archetype Detection (Simple Heuristic)

```typescript
function detectArchetype(
  answers: Record<string, string>,
  journalEntry: JournalEntry
): StoryArchetype {
  const text = Object.values(answers).join(' ').toLowerCase();
  const entryText = (journalEntry.fullContent || '').toLowerCase();

  // Simple keyword matching (can be enhanced later)
  if (text.includes('2am') || text.includes('incident') || text.includes('emergency')) {
    return 'firefighter';
  }
  if (text.includes('designed') || text.includes('architected') || entryText.includes('system')) {
    return 'architect';
  }
  if (text.includes('stakeholder') || text.includes('buy-in') || text.includes('alignment')) {
    return 'diplomat';
  }
  if (text.includes('team adopted') || text.includes('still use') || text.includes('trained')) {
    return 'multiplier';
  }
  if (text.includes('couldn\'t figure') || text.includes('traced') || text.includes('root cause')) {
    return 'detective';
  }
  if (text.includes('no playbook') || text.includes('first time') || text.includes('figured out')) {
    return 'pioneer';
  }
  if (text.includes('inherited') || text.includes('failing') || text.includes('took over')) {
    return 'turnaround';
  }
  if (text.includes('would have') || text.includes('prevented') || text.includes('caught before')) {
    return 'preventer';
  }

  return 'firefighter'; // Default
}
```

---

## File Changes Summary

### Iteration 1 (Backend)

| File | Change |
|------|--------|
| `career-story.prompt.ts` | Add types, modify `buildCareerStoryMessages` |
| `templates/archetypes/*.prompt.md` | NEW - 8 archetype prompt files |
| `career-stories.schemas.ts` | Add `archetype` and `extractedContext` to request schema |
| `career-story.service.ts` | Pass new params through |

### Iteration 2 (Frontend)

| File | Change |
|------|--------|
| `StoryCoachModal.tsx` | NEW - 3-question extraction UI |
| `FrameworkPickerModal.tsx` | Integrate Story Coach step |
| `useCareerStories.ts` | Add `extractedContext` to mutation |
| `career-stories.service.ts` | Add new params to API call |

---

## Test Plan

### Test 1: Backend Isolation
```bash
# Without archetype - should work exactly as before
POST /stories/from-entry/123 { "framework": "STAR" }

# With archetype - should produce enhanced story
POST /stories/from-entry/123 {
  "framework": "SOAR",
  "archetype": "firefighter",
  "extractedContext": { ... }
}
```

### Test 2: Compare Output Quality
1. Generate story WITHOUT Story Coach
2. Generate story WITH Story Coach (same entry)
3. Compare: Does the enhanced version have the buried lede?

### Test 3: Frontend Flow
1. Click "Promote to Career Story"
2. See Story Coach questions (3 questions)
3. Answer or skip
4. Select framework (with archetype recommendation)
5. Story generates with enhanced prompt

---

## What We're NOT Doing (Yet)

- ❌ Session persistence (localStorage only for now)
- ❌ Resume interrupted sessions
- ❌ LLM-generated questions
- ❌ Version control
- ❌ Full persona voice ("What REALLY happened?")

These come later. First: does the enhanced prompt produce better stories?

---

## Quick Wins to Validate

1. **Create one archetype prompt** (firefighter.prompt.md)
2. **Hardcode test** - manually pass `archetype: 'firefighter'` in API call
3. **Compare output** - is the story better?

If yes → build out the other 7 archetypes + frontend
If no → refine the prompt before building UI
