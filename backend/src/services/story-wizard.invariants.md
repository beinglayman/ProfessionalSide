# Story Wizard Invariants

> Invariants that must hold before, during, and after story promotion.

---

## 1. Information Invariants (What Data is Required)

### Input: Journal Entry (Draft Story)

| Field | Required | Invariant |
|-------|----------|-----------|
| `id` | ✅ | Must exist in JournalEntry table |
| `title` | ✅ | Non-empty string |
| `fullContent` OR `description` | ✅ | At least one must have content (>50 chars for meaningful analysis) |
| `authorId` | ✅ | Must match requesting userId |
| `sourceMode` | ✅ | Must match request mode (demo/production) |
| `activityIds` | ❌ | Optional - used for evidence linking |

### Archetypes (Fixed Set)

```typescript
type StoryArchetype =
  | 'firefighter'   // Crisis response
  | 'architect'     // System design
  | 'diplomat'      // Stakeholder alignment
  | 'multiplier'    // Force multiplication
  | 'detective'     // Investigation
  | 'pioneer'       // New territory
  | 'turnaround'    // Inherited mess
  | 'preventer';    // Risk prevention
```

**Invariant:** Exactly one archetype must be selected. System detects with confidence, user can override.

### Narrative Frameworks (Fixed Set)

```typescript
type FrameworkName =
  | 'STAR'   // Situation, Task, Action, Result
  | 'STARL'  // + Learning
  | 'CAR'    // Challenge, Action, Result
  | 'PAR'    // Problem, Action, Result
  | 'SAR'    // Situation, Action, Result
  | 'SOAR'   // Situation, Obstacles, Actions, Results
  | 'SHARE'  // Situation, Hindrances, Actions, Results, Evaluation
  | 'CARL';  // Context, Action, Result, Learning
```

**Invariant:** Framework determines output sections. Each framework has fixed section keys.

### Story Coach Prompt (D-I-G Protocol)

| Phase | Purpose | Min Questions | Invariant |
|-------|---------|---------------|-----------|
| **D**ig | Find buried lede | 2-3 | Must probe for: moment of realization, key decision, obstacle |
| **I**mpact | Quantify | 1-2 | Must extract: counterfactual OR metric |
| **G**rowth | Learning | 0-1 | Optional, required for STARL/CARL/SHARE |

**Invariant:** Questions are archetype-specific. 6 questions per archetype (3 dig, 2 impact, 1 growth).

---

## 2. Output Invariants (What Must Be Produced)

### Output: Career Story

| Field | Required | Invariant |
|-------|----------|-----------|
| `id` | ✅ | UUID, unique |
| `title` | ✅ | Non-empty, max 100 chars |
| `hook` | ✅ | Opening line, max 200 chars |
| `framework` | ✅ | One of FrameworkName |
| `archetype` | ✅ | One of StoryArchetype |
| `sections` | ✅ | Keys match framework sections |
| `sections[key].summary` | ✅ | Non-empty string per section |
| `sections[key].evidence` | ❌ | Array of activity references |

**Section Invariant:** Number of sections matches framework:
- STAR: 4 sections
- STARL: 5 sections
- CAR/PAR/SAR: 3 sections
- SOAR: 4 sections
- SHARE: 5 sections
- CARL: 4 sections

### Output: Evaluation

| Field | Required | Invariant |
|-------|----------|-----------|
| `score` | ✅ | Number 1.0-9.5 (never 10) |
| `breakdown` | ✅ | 5 sub-scores, each 1-10 |
| `suggestions` | ✅ | Array, 0-3 items |
| `coachComment` | ✅ | Non-empty string, Story Coach voice |

---

## 3. Process Invariants (What Steps Must Occur)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: ANALYZE                                                        │
│  Input: journalEntryId                                                  │
│                                                                         │
│  MUST:                                                                  │
│  1. Validate entry exists and belongs to user                          │
│  2. Validate entry has sufficient content (fullContent OR description) │
│  3. Detect archetype via LLM                                           │
│  4. Return archetype + questions for that archetype                    │
│                                                                         │
│  Output: { archetype, questions[] }                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: GENERATE                                                       │
│  Input: journalEntryId, answers, archetype, framework                  │
│                                                                         │
│  MUST:                                                                  │
│  1. Validate entry still exists                                        │
│  2. Validate archetype is valid                                        │
│  3. Validate framework is valid                                        │
│  4. Transform answers → ExtractedContext                               │
│  5. Generate story with archetype prompt + context                     │
│  6. Evaluate generated story                                           │
│  7. Save to CareerStory table                                          │
│                                                                         │
│  Output: { story, evaluation }                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Ordering Invariant:** Analyze MUST complete before Generate (frontend holds state).

**Idempotency:** Generate is NOT idempotent. Each call creates new CareerStory record.

---

## 4. Error Invariants (What Failures Must Be Handled)

| Error | Response | Recovery |
|-------|----------|----------|
| Entry not found | 404 | User selects different entry |
| Entry not owned by user | 403 | None - security boundary |
| Entry has no content | 400 + message | User adds content first |
| Invalid archetype | 400 + valid list | User selects from list |
| Invalid framework | 400 + valid list | User selects from list |
| LLM timeout | 504 | Retry button |
| LLM unparseable response | 500 | Fallback to basic generation |
| Story save fails | Return story anyway | Story displayed but not persisted |

**Graceful Degradation:** If LLM archetype detection fails, default to 'firefighter' (most common).

---

## 5. CLI Interface Invariants (For Testing)

### Commands

```bash
# Analyze entry - outputs archetype + questions
story-wizard analyze <entry-id>

# Generate story - takes answers as JSON file
story-wizard generate <entry-id> \
  --archetype firefighter \
  --framework SOAR \
  --answers answers.json

# Full flow (for testing)
story-wizard promote <entry-id> --auto
```

### Output Format

- JSON for machine consumption (default)
- `--pretty` flag for human-readable
- Exit code 0 on success, non-zero on failure

### State Management

- **Stateless** - no persistence between commands
- Answers passed as JSON file or stdin
- Entry ID is the only reference needed

---

## 6. Testing Invariants

### Must-Pass Test Cases

| Test | Invariant Verified |
|------|-------------------|
| Analyze returns valid archetype | Archetype detection works |
| Analyze returns 6 questions | Question bank complete |
| Generate with empty answers works | Graceful handling |
| Generate produces all framework sections | Section completeness |
| Evaluation score is 1.0-9.5 | Scoring bounds |
| Wrong user gets 403 | Authorization |
| Non-existent entry gets 404 | Validation |

### Performance Boundaries

| Operation | Max Time | Invariant |
|-----------|----------|-----------|
| Analyze | 10s | LLM archetype detection timeout |
| Generate | 30s | LLM story generation timeout |
| Total flow | 60s | User patience boundary |

### Security Constraints

- User can only access their own entries
- Demo mode isolated from production data
- No PII in logs
- LLM prompts don't leak other users' data

---

## 7. Type Relationships

```
JournalEntry (input)
    │
    ├── detectArchetype() → ArchetypeDetection
    │                           │
    │                           └── StoryArchetype (one of 8)
    │                                    │
    │                                    └── ARCHETYPE_QUESTIONS[archetype] → CoachQuestion[]
    │
    └── User answers questions
            │
            └── ExtractedContext
                    │
                    ├── archetype (confirmed)
                    ├── framework (selected)
                    │
                    └── generateEnhancedStory() → GeneratedStoryFile
                                                        │
                                                        ├── evaluateStory() → StoryEvaluationFile
                                                        │
                                                        └── save() → CareerStory (DB record)
```

---

## Summary

| Category | Count | Key Invariant |
|----------|-------|---------------|
| Archetypes | 8 | Exactly one per story |
| Frameworks | 8 | Determines sections |
| Questions | 6 per archetype | D-I-G phases |
| Sections | 3-5 per framework | Must all be populated |
| Score | 1.0-9.5 | Never 10 |

---

## Implementation Notes (Added During Hardening)

### Error Codes
- `ENTRY_NOT_FOUND` (404) - Journal entry doesn't exist or user mismatch
- `INSUFFICIENT_CONTENT` (400) - Entry has <50 chars combined content
- `INVALID_ARCHETYPE` (400) - Archetype not in valid set
- `GENERATION_FAILED` (500) - LLM generation error (falls back to basic sections)

### Scoring Formula
```
base = 5.0
+ 1.0 if specificity (numbers/metrics in text)
+ 0.5 if named people extracted
+ 1.0 if counterfactual provided
+ 0.5 if metric in answers
= clamped to [1.0, 9.5]
```

### Test Coverage
- 18 unit/integration tests in `story-wizard.service.test.ts`
- Covers: happy path, error cases, edge cases, scoring behavior
- Mocks: archetype-detector, model-selector (uses fallback sections)
