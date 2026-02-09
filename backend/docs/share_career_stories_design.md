# "Share As..." — Story Derivations Feature

> Handover document for implementation planning.
> Created: 2026-02-07 | Status: DESIGNED — ready for implementation plan

## One-Sentence Summary

**"Share As..." transforms a career story into audience-specific text (interview answer, LinkedIn post, resume bullet, 1:1 talking points, self-assessment, team share) via LLM generation with live preview in a context-appropriate frame.**

---

## What Exists Today

### Current Copy Feature (client-side string assembly, no LLM)

**Entry point**: Copy button in NarrativePreview toolbar
- **File**: `src/components/career-stories/NarrativePreview.tsx`
- **CopyFormat type**: Line ~696 — `type CopyFormat = 'interview' | 'linkedin' | 'resume' | 'raw'`
- **CopyMenu component**: Lines ~704-779 — inline dropdown with 4 format options
- **handleCopy function**: Lines ~1571-1658 — builds text per format using hardcoded templates
- **Copy button render**: Lines ~1835-1846 — `data-testid="copy-star"`, toggles `showCopyMenu`
- **Click-outside handler**: Lines ~1524-1533

**Current format assembly** (all client-side, no LLM):
| Format | Logic | Output |
|--------|-------|--------|
| `raw` (Plain Text) | Section headers + content joined | `Situation:\ntext\n\nTask:\ntext...` |
| `interview` | Markdown headers + key metrics footer | `# Title\n## Situation\ntext...` |
| `linkedin` | Emoji hooks + casual framing + hashtags | `🎯 Title\n\nThe challenge: ...` |
| `resume` | Action verb + impact + metrics in parens | `• Implemented X, resulting in Y (Z%)` |

**Problem**: These are dumb string templates. No real rewriting, no tone adaptation, no audience awareness, no archetype influence. A LinkedIn post shouldn't use the same words as an interview answer.

---

## What We're Building

### Concept: Derivations = same story, different audience

A **derivation** is the story rewritten by LLM for a specific audience and medium. It's ephemeral — generated, previewed, copied to clipboard. Not stored in DB.

### 6 Derivation Types

| ID | Label | Audience | Medium | Tone | Length Target |
|----|-------|----------|--------|------|---------------|
| `interview` | Interview Answer | Hiring panel | Spoken | Confident, specific | ~200 words (60-90 sec) |
| `linkedin` | LinkedIn Post | Professional network | Written, social | Engaging, humble-brag | ≤1300 chars |
| `resume` | Resume Bullet | Recruiter/ATS | Written, formal | Terse, impact-first | 1-2 lines |
| `one-on-one` | 1:1 Talking Points | Your manager | Spoken, informal | Conversational, direct | 3-5 bullets |
| `self-assessment` | Self-Assessment | Perf review panel | Written, formal | Evidence-backed claims | 1 paragraph |
| `team-share` | Team Share | Teammates | Spoken/Slack | Collaborative, we > I | 2-3 sentences |

**Plus**: Plain text copy stays as instant (no LLM, no modal) — just clipboard.

---

## Architecture

### Backend: One new endpoint + 6 prompt templates

**Endpoint**: `POST /api/v1/career-stories/stories/:storyId/derive`

```typescript
// Request
{
  derivation: 'interview' | 'linkedin' | 'resume' | 'one-on-one' | 'self-assessment' | 'team-share',
  tone?: WritingStyle,        // override story's default tone
  customPrompt?: string,      // user tweak instructions
}

// Response
{
  text: string,               // the derived text
  charCount: number,
  wordCount: number,
  speakingTimeSec?: number,   // for interview/1:1 (words / 150 * 60)
  metadata: {
    derivation: string,
    framework: string,
    archetype: string | null,
    model: string,            // which LLM model was used
    processingTimeMs: number,
  }
}
```

**LLM task type**: Add `'derive'` to `TaskType` in model-selector → maps to `quick` model (Haiku/4o-mini). Derivations produce short outputs; fast model is sufficient.

**Template structure** (6 new files):
```
backend/src/services/ai/prompts/templates/
  derivation-interview.prompt.md
  derivation-linkedin.prompt.md
  derivation-resume.prompt.md
  derivation-one-on-one.prompt.md
  derivation-self-assessment.prompt.md
  derivation-team-share.prompt.md
```

Each template receives via Handlebars:
- `{{title}}` — story title
- `{{framework}}` — STAR, SHARE, CAR, etc.
- `{{#each sections}}` — section key + summary pairs
- `{{archetype}}` — firefighter, architect, etc. (optional)
- `{{#if tone}}` — writing style override
- `{{#if customPrompt}}` — user's tweak instructions
- `{{#if sources}}` — source evidence for credibility
- `{{metrics}}` — extracted metrics from sections

**System prompt**: One shared `derivation-system.prompt.md` with derivation-type-specific guidance (similar to how archetype guidance is prepended to career-story-system.prompt.md).

### Frontend: DerivationModal + "Share As..." button

**New component**: `src/components/career-stories/DerivationModal.tsx`

Pattern: Follows FormatSwitchModal (Radix Dialog, two-phase).

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Share As...                                        [X] │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│  ○ Interview Answer  │  [Preview Frame]                 │
│  ● LinkedIn Post     │                                  │
│  ○ Resume Bullet     │  Context-appropriate rendering   │
│  ○ 1:1 Talking Pts   │  of the derived text             │
│  ○ Self-Assessment   │                                  │
│  ○ Team Share        │                                  │
│                      │                                  │
│  ─────────────────── │                                  │
│  Tone: [casual ▼]    │                                  │
│  ─────────────────── │  847 / 1300 chars                │
│  [Custom tweak...]   │                                  │
│                      │  [Copy]  [Regenerate]            │
└──────────────────────┴──────────────────────────────────┘
```

**Preview frames** (right panel varies by derivation):
- **LinkedIn** → mock LinkedIn post card (avatar, name, reactions bar)
- **Resume** → clean serif bullet in a minimal resume section
- **Interview** → markdown sections with speaking time badge + delivery cues
- **1:1** → bullet list with conversation markers
- **Self-assessment** → paragraph block with evidence highlights
- **Team share** → Slack-style message bubble

**State management**:
- Modal opened from NarrativePreview toolbar (replaces copy dropdown)
- `derivationModalStoryId` state in CareerStoriesPage (same pattern as `formatSwitchStoryId`)
- Modal owns: selectedDerivation, tone, customPrompt, generatedText, isGenerating
- No persistence — close modal = text gone

### Integration with existing copy

The current "Copy" button (`data-testid="copy-star"`) becomes **two** actions:
1. **Quick copy** (plain text): Single click → clipboard (no modal, instant). Keep existing behavior.
2. **"Share As..."** button: Opens DerivationModal for LLM-powered derivations.

**Implementation**: Replace CopyMenu dropdown with two separate buttons:
```tsx
{/* Quick plain text copy */}
<button onClick={() => handleCopy('raw')} title="Copy plain text">
  <Copy />
</button>
{/* Share As... modal trigger */}
<button onClick={() => setShowDerivationModal(true)} title="Share As...">
  <Share2 />
</button>
```

---

## Key Files to Modify/Create

### Backend (new)

| File | Action | Purpose |
|------|--------|---------|
| `backend/src/services/ai/prompts/templates/derivation-system.prompt.md` | CREATE | Shared system prompt for all derivations |
| `backend/src/services/ai/prompts/templates/derivation-interview.prompt.md` | CREATE | Interview answer template |
| `backend/src/services/ai/prompts/templates/derivation-linkedin.prompt.md` | CREATE | LinkedIn post template |
| `backend/src/services/ai/prompts/templates/derivation-resume.prompt.md` | CREATE | Resume bullet template |
| `backend/src/services/ai/prompts/templates/derivation-one-on-one.prompt.md` | CREATE | 1:1 talking points template |
| `backend/src/services/ai/prompts/templates/derivation-self-assessment.prompt.md` | CREATE | Self-assessment paragraph template |
| `backend/src/services/ai/prompts/templates/derivation-team-share.prompt.md` | CREATE | Team share template |
| `backend/src/services/ai/prompts/derivation.prompt.ts` | CREATE | Template compiler + message builder (like career-story.prompt.ts) |
| `backend/src/services/career-stories/derivation.service.ts` | CREATE | Derivation service (fetch story, build prompt, call LLM, return text) |

### Backend (modify)

| File | Action | What changes |
|------|--------|-------------|
| `backend/src/services/ai/model-selector.service.ts:6` | MODIFY | Add `'derive'` to `TaskType` union |
| `backend/src/services/ai/model-selector.service.ts:50` | MODIFY | Add `derive: 'quick'` to `taskModelMap` |
| `backend/src/controllers/career-stories.controller.ts` | MODIFY | Add `deriveStory` handler |
| `backend/src/controllers/career-stories.schemas.ts` | MODIFY | Add `deriveStorySchema` Zod validation |
| `backend/src/routes/career-stories.routes.ts` | MODIFY | Add `POST /stories/:storyId/derive` route |

### Frontend (new)

| File | Action | Purpose |
|------|--------|---------|
| `src/components/career-stories/DerivationModal.tsx` | CREATE | Main modal component (Radix Dialog, two-phase) |
| `src/components/career-stories/DerivationPreview.tsx` | CREATE | Context-appropriate preview frames per derivation type |

### Frontend (modify)

| File | Action | What changes |
|------|--------|-------------|
| `src/components/career-stories/NarrativePreview.tsx:696-779` | MODIFY | Remove CopyMenu, add "Share As..." button trigger |
| `src/components/career-stories/NarrativePreview.tsx:1571-1658` | MODIFY | Keep `handleCopy('raw')` for quick copy, remove format-specific assembly |
| `src/components/career-stories/NarrativePreview.tsx:1835-1846` | MODIFY | Split into Copy + Share As buttons |
| `src/components/career-stories/CareerStoriesPage.tsx` | MODIFY | Add `derivationModalStoryId` state, render DerivationModal |
| `src/services/career-stories.service.ts` | MODIFY | Add `deriveStory()` API method |
| `src/hooks/useCareerStories.ts` | MODIFY | Add `useDeriveStory` mutation hook |
| `src/types/career-stories.ts` | MODIFY | Add `DerivationType`, `DeriveStoryRequest`, `DeriveStoryResponse` types |

---

## Patterns to Follow

### 1. FormatSwitchModal Pattern (two-phase modal)
- **File**: `src/components/career-stories/FormatSwitchModal.tsx` (534 lines)
- **Phase 1**: Selection UI (left: controls, right: preview)
- **Phase 2**: Generating state (spinner + rotating facts + quotes)
- **Props**: `isOpen`, `onClose`, `story`, `onRegenerate`, `isRegenerating`
- **State**: selection state owned by modal, parent receives callback

### 2. Handlebars Template Pattern
- **File**: `backend/src/services/ai/prompts/career-story.prompt.ts`
- **Compile once at startup**: `Handlebars.compile(templateRaw)` at module level
- **Conditionals**: `{{#if tone}}`, `{{#if customPrompt}}`
- **Archetype prepend**: Guidance text prepended to system prompt
- **Builder function**: `buildDerivationMessages(params)` → `[{ role: 'system', content }, { role: 'user', content }]`

### 3. Archetype Guidance Pattern
- **File**: `backend/src/services/ai/prompts/career-story.prompt.ts:132`
- **8 archetypes** each with LLM-specific framing instructions
- Prepended to system prompt: `## Story Archetype: FIREFIGHTER\n\n${guidance}\n\n---\n\n${baseSystemPrompt}`

### 4. Model Selection Pattern
- **File**: `backend/src/services/ai/model-selector.service.ts:50`
- `derive: 'quick'` → Haiku/4o-mini (short outputs, fast)
- Call: `modelSelector.executeTask('derive', messages, 'balanced', { maxTokens: 500, temperature: 0.7 })`

### 5. Endpoint + Mutation Pattern
- **Controller**: asyncHandler + Zod validation + service call + sendSuccess
- **Route**: `router.post('/stories/:storyId/derive', deriveStory)`
- **Frontend service**: `static async deriveStory(storyId, params)` in CareerStoriesService
- **Hook**: `useDeriveStory()` with `useMutation` + no cache invalidation (read-only)

---

## Design Decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Derivations are ephemeral | No DB storage | A derivation is a function, not state. User copies and pastes. |
| All derivations use LLM | No client-side fallback (except plain text) | Real rewriting > string templates. Quality matters. |
| Quick model tier | `derive: 'quick'` | Short outputs (≤300 words). Fast model is sufficient. |
| 6 derivation types | interview, linkedin, resume, one-on-one, self-assessment, team-share | Named consumers from INTEGRATE gate. |
| One endpoint, many templates | POST `/derive` with `derivation` body param | Same pattern as framework selection in regenerate. |
| Button split | Copy (plain text, instant) + Share As... (modal) | Plain text copy must stay instant. LLM derivations need preview. |
| No derivation editing | User tweaks source story or custom prompt | Editing derived text creates state management complexity for no gain. |
| Preview frames per type | LinkedIn card, resume bullet, etc. | Typegrow inspiration: show text in its actual context. |
| Rename from "Copy" | "Share As..." for the modal trigger | "Copy" implies clipboard. "Share As..." implies transformation. |

---

## What's NOT in scope

- No derivation history/persistence
- No per-derivation settings page
- No derivation-specific editing
- No premium model for any derivation
- No A/B testing of derived text
- No social media posting integration
- No resume PDF export

---

## Dependencies

- Story must exist with sections (non-empty)
- LLM API key must be configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)
- Existing Handlebars + model-selector infrastructure handles the rest

## Estimated Scope

| Layer | Effort |
|-------|--------|
| Backend: templates (6) + system prompt | 0.5d |
| Backend: derivation.prompt.ts compiler | 0.25d |
| Backend: derivation.service.ts | 0.25d |
| Backend: controller + schema + route | 0.25d |
| Frontend: DerivationModal + state | 1d |
| Frontend: DerivationPreview (6 frames) | 1d |
| Frontend: NarrativePreview integration | 0.25d |
| Frontend: API service + hook + types | 0.25d |
| Testing | 0.5d |
| **Total** | **~4d** |
