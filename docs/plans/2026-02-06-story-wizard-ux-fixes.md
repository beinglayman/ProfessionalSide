# Story Wizard UX Fixes

**Branch:** `fix/story-wizard-ux`
**Date:** 2026-02-06

## Problem

The Story Wizard modal (Analyze → Questions → Generate) has several UX issues:
- Loading states are generic spinners with no engagement
- Archetype and framework selection grids cause analysis paralysis
- Questions step has duplicate navigation buttons (inner + footer)
- Modal height jumps between questions with/without chips
- Hint text is disconnected from the input area
- Typography and spacing inconsistent with the rest of the app

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Loading facts source | Pass `journalMeta` from parent (built from `StoryMetadata`) | Parent page has `activitiesData.groups` with metadata. Lookup by entry ID. No API change. |
| Navigation pattern | Unified single footer row | Eliminates dual-nav confusion. Footer is the only nav. |
| Modal height stability | Fixed `min-h-[400px]` on content area | Simple, no animation library needed. |
| Question layout | Side-by-side: chips (40%) + textarea (60%), stacked on mobile | Treats both as equal citizens. `flex-col sm:flex-row` for responsive. |
| Hint text placement | Textarea placeholder + `?` icon (click-to-toggle, not hover) | Zero-chrome default. Works on touch and desktop. |
| Archetype/Framework selection | Multi-column grouped dropdowns | Matches existing `FrameworkSelector` pattern. Reduces analysis paralysis. |
| Quote carousel | Facts auto-rotate + quotes with manual `< >` nav + keyboard arrows | Separate zones: facts show progress, quotes add depth. |
| Quotes after loading | Disappear with loading state | Clean transition. No lingering chrome on results. |
| Typography | Match existing primary palette, tighten spacing | UX fix branch, not design system overhaul. Do last, only if it looks off. |

## Review Fixes (RJ + GSE)

Issues found during Russian Judge / Grumpy Staff Engineer review and their resolutions:

### Fix 1: `journalMeta` lookup (was missing)

The parent page (`list.tsx`) only stores `storyWizardEntryId` (a string). The journal entry metadata must be looked up from `activitiesData.groups`:

```typescript
// In list.tsx
const wizardEntryMeta = useMemo(() => {
  if (!storyWizardEntryId || !activitiesData) return undefined;
  const group = activitiesData.groups.find(
    g => g.storyMetadata?.id === storyWizardEntryId
  );
  if (!group?.storyMetadata) return undefined;
  const meta = group.storyMetadata;
  return {
    title: meta.title,
    dateRange: meta.timeRangeStart && meta.timeRangeEnd
      ? `${formatDate(meta.timeRangeStart)} - ${formatDate(meta.timeRangeEnd)}`
      : undefined,
    activityCount: group.count,
    tools: [...new Set(group.activities.map(a => a.source))],
    topics: meta.topics,
    impactHighlights: meta.impactHighlights,
    skills: meta.skills,
  };
}, [storyWizardEntryId, activitiesData]);
```

Pass as `<StoryWizardModal journalEntryMeta={wizardEntryMeta} ... />`.

`JournalEntryMeta` updated to include optional fields from `StoryMetadata`:

```typescript
interface JournalEntryMeta {
  title: string;
  dateRange?: string;
  activityCount?: number;
  tools?: string[];
  topics?: string[];
  impactHighlights?: string[];
  skills?: string[];
}
```

### Fix 2: Mobile responsive layout

Side-by-side layout uses `flex-col sm:flex-row`. Below `sm:` breakpoint, chips stack above textarea. One Tailwind class change.

### Fix 3: "Back" from Generate result

"Back" on Generate result goes to last question: `setCurrentQuestionIndex(questions.length - 1)`. Always the last question, regardless of what was skipped.

Updated R4 table:

| Step | Left | Right |
|------|------|-------|
| Analyze | `Cancel` | `Next >` |
| Questions (Q1) | `< Back` (→ Analyze) | `Skip` (text link) + `Next >` |
| Questions (Q2+) | `< Back` (→ prev question) | `Skip` (text link) + `Next >` |
| Questions (last Q) | `< Back` | `Skip` + `Generate >` (purple gradient) |
| Generate loading | Hidden | Hidden |
| Generate result | `< Back` (→ last question) | `Done` (green) |

### Fix 4: `?` hint icon — click-to-toggle, not hover

Hover doesn't work on touch devices. Use click-to-toggle: a conditional `div` below the question that shows/hides hint text. No Radix tooltip needed.

```
[?] clicked → hint div appears below question
[?] clicked again or user starts typing → hint div hides
```

### Fix 5: Quote carousel keyboard accessibility

- Left/Right arrow keys navigate quotes when carousel is focused
- `aria-live="polite"` on the auto-rotating facts zone
- `aria-label` on quote navigation buttons
- Tab-focusable `< >` buttons

### Fix 6: Error handling in loading state

If analysis/generation fails during `WizardLoadingState`:
- Facts and quotes stop cycling
- Error message replaces the loading content (existing error pattern)
- Footer reappears with `< Back` to retry or go back

### Fix 7: Archetype dropdown — show AI recommendation + alternatives, not all 8

The backend returns `detected` + `alternatives` (typically 2-3). The dropdown should:
- Show AI recommendation + returned alternatives as primary options
- "Show all archetypes" toggle at bottom to reveal remaining archetypes
- This prevents a sparse 3-column grid when the AI only suggests 3 options

Archetype groupings (Proactive/Reactive/People) only apply when "Show all" is expanded.

## Changes

### R1: Rotating Loading Facts (Analyze)

**New component:** `WizardLoadingState`

```typescript
interface WizardLoadingStateProps {
  journalMeta?: JournalEntryMeta;
  mode: 'analyze' | 'generate';
}
```

- Auto-cycles facts every 2s with fade transition
- `aria-live="polite"` on facts container for screen readers
- Entry-specific facts built from `journalMeta`:
  - "Reviewing {activityCount} activities..." (if activityCount)
  - "Spanning {dateRange}..." (if dateRange)
  - "Found work across {tools.join(', ')}..." (if tools)
  - "Topics: {topics.join(', ')}..." (if topics)
  - "Key impacts: {impactHighlights[0]}..." (if impactHighlights)
- Generic facts for analyze mode:
  - "Stories with specific metrics score 40% higher"
  - "The best career stories show impact, not just effort"
  - "Great stories follow a narrative arc: challenge → action → result"
- Generic facts for generate mode:
  - "Crafting your opening hook..."
  - "Structuring the narrative arc..."
  - "Connecting evidence to impact..."
  - "Scoring story strength..."
- If analysis/generation fails: facts stop, error replaces loading content, footer reappears

### R2: Archetype Dropdown

**New component:** `ArchetypeSelector`

Matches `FrameworkSelector` multi-column grouped layout:
- Default view: AI recommendation (highlighted) + alternatives from API response
- "Show all" toggle: expands to full 3-column grouped view
  - **Proactive**: Architect (designs solutions), Pioneer (explores new territory), Preventer (stops problems before they happen)
  - **Reactive**: Firefighter (crisis response), Detective (root cause analysis), Turnaround (reverses decline)
  - **People**: Diplomat (cross-team alignment), Multiplier (force multiplier for team)
- Each option: icon + name (bold) + short description
- Selected item: purple highlight + checkmark
- Compact trigger: `[Architect v]` with purple border when open

### R3: Framework Dropdown

Reuse `FrameworkSelector` pattern directly in the wizard.
- Label: "Story format" (not "Narrative Framework")
- Same 3-column layout: Popular / Concise / Detailed

### R4: Merge Navigation

Single footer row across all steps:

| Step | Left | Right |
|------|------|-------|
| Analyze | `Cancel` | `Next >` |
| Questions (Q1) | `< Back` (→ Analyze) | `Skip` (text link) + `Next >` |
| Questions (Q2+) | `< Back` (→ prev question) | `Skip` (text link) + `Next >` |
| Questions (last Q) | `< Back` | `Skip` + `Generate >` (purple gradient) |
| Generate loading | Hidden | Hidden |
| Generate result | `< Back` (→ last question, index = questions.length - 1) | `Done` (green) |

**Removed:** Inner Previous/Skip/Next nav row from QuestionsStep.

### R5: Strip Chrome

**Removed from Questions step:**
- `1/6 Context 0 answered` header
- Phase badge (Context / Impact / Growth)
- "Add your own context" label

**Kept:** Thin progress bar only.

### R6: Hint as Placeholder + `?` Icon (click-to-toggle)

- Hint text (e.g., "Why was NOW the right time to act?") becomes the textarea placeholder
- Small `?` icon (top-right of question) — **click-to-toggle** (not hover, works on touch)
- Click shows a hint `div` below the question text; click again or start typing hides it
- `?` icon only appears if question has hint content

### R7: Fixed Modal Size + Responsive

- `min-h-[400px]` on the content area div
- Questions without chips: textarea goes full-width
- Questions with chips: side-by-side layout `flex-col sm:flex-row` (40/60 on desktop, stacked on mobile)
- No layout shift between questions

### R8: Generate Loading

- When user clicks `Generate >` on last question, `step = 'generate'` and `isLoading = true`
- Content area shows `WizardLoadingState` with `mode='generate'`
- Stale question is replaced immediately
- Footer hidden during loading
- On API return: loading fades out, `GenerateStep` result fades in
- On API error: loading stops, error shown, footer reappears with Back

### R9: Typography/Brand

- Chips: `text-xs` pills
- Body text: `text-sm`
- Question text: `text-base font-semibold`
- Interactive elements: `primary-500/600` purple
- Tighter padding where it looks off
- Apply last — polish pass, not blocking

### R10: Quote Carousel During Loading

Part of `WizardLoadingState` component:
- Top zone: auto-rotating facts (2s cycle) with `aria-live="polite"`
- Bottom zone: curated quote card with `< >` manual navigation
  - `< >` buttons are tab-focusable with `aria-label`
  - Left/Right arrow keys navigate when focused
- Pool of 25+ quotes (hardcoded in `constants.ts`) about:
  - Career storytelling and narrative craft
  - Perception building and personal branding
  - Publishing original thought and sharing work
  - Professional growth and coaching wisdom
- Quote format: `"Quote text" — Attribution`
- Randomly selected starting quote, sequential navigation from there
- Disappears when loading completes

### Questions Step Layout

```
Desktop (sm: and above):
┌──────────────────────────────────────────────┐
│  ━━━━━━━━━░░░░░░░░░░░░░░░░░░░  (progress bar)│
│                                              │
│  What did you see that others didn't?    [?] │
│                                              │
│  ┌─ chips (40%) ─┐  ┌─ textarea (60%) ─────┐│
│  │ ○ Got paged    │  │ Why was NOW the right ││
│  │ ○ Customer rpt │  │ time to act?          ││
│  │ ○ Found in test│  │                       ││
│  │ ○ Noticed off  │  │                       ││
│  │ ○ Code review  │  │                       ││
│  └────────────────┘  └──────────────────────┘│
│                                              │
├──────────────────────────────────────────────┤
│  < Back              Skip      [  Next >  ]  │
└──────────────────────────────────────────────┘

Mobile (below sm:):
┌────────────────────────┐
│  ━━━━━━━░░░░░░░░░░░░░  │
│                        │
│  Question text     [?] │
│                        │
│  ○ Got paged           │
│  ○ Customer reported   │
│  ○ Found in testing    │
│  ○ Noticed off         │
│  ○ Code review         │
│                        │
│  ┌─ textarea ────────┐ │
│  │ Hint as placeholder│ │
│  │                    │ │
│  └────────────────────┘ │
│                        │
├────────────────────────┤
│ < Back    Skip [Next >]│
└────────────────────────┘
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/story-wizard/WizardLoadingState.tsx` | **New.** Shared loading component (facts + quotes + error handling). |
| `src/components/story-wizard/ArchetypeSelector.tsx` | **New.** Multi-column dropdown matching FrameworkSelector. AI picks + "Show all" toggle. |
| `src/components/story-wizard/StoryWizardModal.tsx` | Main refactor: new loading states, dropdowns, merged nav, question layout, responsive, error states. |
| `src/components/career-stories/constants.ts` | Archetype groupings + descriptions, 25+ quote pool. |
| `src/types/career-stories.ts` | `JournalEntryMeta` interface (with topics, impactHighlights, skills). |
| `src/pages/journal/list.tsx` | Build `wizardEntryMeta` from `activitiesData.groups` lookup, pass to wizard. |
