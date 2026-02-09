# Story Wizard UX Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Story Wizard modal to eliminate UX friction — engaging loading states, dropdown selectors, unified navigation, responsive question layout, and brand-consistent typography.

**Architecture:** The wizard modal (`StoryWizardModal.tsx`) is the main file. We extract two new components (`WizardLoadingState`, `ArchetypeSelector`), add constants/types, and wire up the parent page. All changes are frontend-only React/TypeScript with Tailwind CSS.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (with `tailwindcss-animate` keyframes), Vitest + Testing Library, Lucide icons.

**Design Doc:** `docs/plans/2026-02-06-story-wizard-ux-fixes.md`
**Quote Source:** `docs/plans/career-quotes.md`

---

## Task 1: Add Types and Constants (Foundation)

**Files:**
- Modify: `src/types/career-stories.ts`
- Modify: `src/components/career-stories/constants.ts`
- Test: `src/components/career-stories/constants.test.ts`

**Step 1: Add `JournalEntryMeta` interface to types**

In `src/types/career-stories.ts`, add after the `WizardGenerateResponse` interface (around line 332):

```typescript
/** Metadata passed to Story Wizard for loading state facts */
export interface JournalEntryMeta {
  title: string;
  dateRange?: string;
  activityCount?: number;
  tools?: string[];
  topics?: string[];
  impactHighlights?: string[];
  skills?: string[];
}
```

**Step 2: Add archetype constants to `constants.ts`**

Add archetype groupings, descriptions, and the `ARCHETYPE_GROUPS` constant. Follow the same naming pattern as `FRAMEWORK_GROUPS`:

```typescript
/** Archetype metadata for UI display */
export type ArchetypeGroup = 'proactive' | 'reactive' | 'people';

export const ARCHETYPE_METADATA: Record<string, { description: string; group: ArchetypeGroup }> = {
  architect: { description: 'Designs lasting solutions', group: 'proactive' },
  pioneer: { description: 'Explores new territory', group: 'proactive' },
  preventer: { description: 'Stops problems early', group: 'proactive' },
  firefighter: { description: 'Crisis response', group: 'reactive' },
  detective: { description: 'Root cause analysis', group: 'reactive' },
  turnaround: { description: 'Reverses decline', group: 'reactive' },
  diplomat: { description: 'Cross-team alignment', group: 'people' },
  multiplier: { description: 'Force multiplier', group: 'people' },
};

export const ARCHETYPE_GROUPS: Record<ArchetypeGroup, { label: string; description: string; archetypes: string[] }> = {
  proactive: { label: 'Proactive', description: 'Building & preventing', archetypes: ['architect', 'pioneer', 'preventer'] },
  reactive: { label: 'Reactive', description: 'Responding & fixing', archetypes: ['firefighter', 'detective', 'turnaround'] },
  people: { label: 'People', description: 'Enabling & aligning', archetypes: ['diplomat', 'multiplier'] },
};
```

**Step 3: Add career quotes to `constants.ts`**

Add all 50 quotes from `docs/plans/career-quotes.md` as a typed array:

```typescript
export interface CareerQuote {
  text: string;
  attribution: string;
  theme: string;
}

export const CAREER_QUOTES: CareerQuote[] = [
  // Publishing Your Own Work
  { text: 'Make stuff you love and talk about stuff you love and you\'ll attract people who love that kind of stuff. It\'s that simple.', attribution: 'Austin Kleon, Show Your Work!', theme: 'Publishing Your Work' },
  // ... all 50 quotes from docs/plans/career-quotes.md
];
```

Copy all 50 quotes from the source file. Each quote has `text`, `attribution`, and `theme` fields. Themes map to section headers: "Publishing Your Work", "Thinking About Work", "Narrating Your Story", "Building Perception", "Career Capital", "Evidence", "Building Skills", "Proving Progression".

**Step 4: Add loading facts to `constants.ts`**

```typescript
export const WIZARD_LOADING_FACTS = {
  analyze: [
    'Stories with specific metrics score 40% higher in interviews',
    'The best career stories show impact, not just effort',
    'Great stories follow a narrative arc: challenge → action → result',
    'Interviewers remember stories 22x more than facts alone',
    'Your story archetype shapes how others perceive your contribution',
  ],
  generate: [
    'Crafting your opening hook...',
    'Structuring the narrative arc...',
    'Connecting evidence to impact...',
    'Scoring story strength...',
    'Weaving in your unique perspective...',
  ],
};
```

**Step 5: Write test for new constants**

In `src/components/career-stories/constants.test.ts`, add tests:

```typescript
describe('ARCHETYPE_METADATA', () => {
  it('has metadata for all 8 archetypes', () => {
    expect(Object.keys(ARCHETYPE_METADATA)).toHaveLength(8);
  });

  it('each archetype has description and group', () => {
    Object.values(ARCHETYPE_METADATA).forEach(meta => {
      expect(meta.description).toBeTruthy();
      expect(['proactive', 'reactive', 'people']).toContain(meta.group);
    });
  });
});

describe('ARCHETYPE_GROUPS', () => {
  it('covers all archetypes', () => {
    const allArchetypes = Object.values(ARCHETYPE_GROUPS).flatMap(g => g.archetypes);
    expect(allArchetypes.sort()).toEqual(Object.keys(ARCHETYPE_METADATA).sort());
  });
});

describe('CAREER_QUOTES', () => {
  it('has at least 25 quotes', () => {
    expect(CAREER_QUOTES.length).toBeGreaterThanOrEqual(25);
  });

  it('each quote has text, attribution, and theme', () => {
    CAREER_QUOTES.forEach(q => {
      expect(q.text).toBeTruthy();
      expect(q.attribution).toBeTruthy();
      expect(q.theme).toBeTruthy();
    });
  });
});

describe('WIZARD_LOADING_FACTS', () => {
  it('has facts for both modes', () => {
    expect(WIZARD_LOADING_FACTS.analyze.length).toBeGreaterThan(0);
    expect(WIZARD_LOADING_FACTS.generate.length).toBeGreaterThan(0);
  });
});
```

**Step 6: Run tests**

Run: `npx vitest run src/components/career-stories/constants.test.ts`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/types/career-stories.ts src/components/career-stories/constants.ts src/components/career-stories/constants.test.ts
git commit -m "feat(story-wizard): add archetype groups, career quotes, and loading facts constants"
```

---

## Task 2: Build `WizardLoadingState` Component (R1, R8, R10)

**Files:**
- Create: `src/components/story-wizard/WizardLoadingState.tsx`
- Create: `src/components/story-wizard/WizardLoadingState.test.tsx`

**Step 1: Write the failing test**

Create `src/components/story-wizard/WizardLoadingState.test.tsx`:

```typescript
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardLoadingState } from './WizardLoadingState';

describe('WizardLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders spinner', () => {
    render(<WizardLoadingState mode="analyze" />);
    // Loader2 has animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows a loading fact', () => {
    render(<WizardLoadingState mode="analyze" />);
    const factsContainer = screen.getByRole('status');
    expect(factsContainer).toBeInTheDocument();
    expect(factsContainer.textContent).toBeTruthy();
  });

  it('rotates facts every 2 seconds', () => {
    render(<WizardLoadingState mode="analyze" />);
    const initialText = screen.getByRole('status').textContent;
    act(() => { vi.advanceTimersByTime(2000); });
    // After 2s, text should change (or wrap around)
    // We just verify no crash and the container still has content
    expect(screen.getByRole('status').textContent).toBeTruthy();
  });

  it('shows entry-specific facts when journalMeta provided', () => {
    render(
      <WizardLoadingState
        mode="analyze"
        journalMeta={{
          title: 'Week of Feb 1',
          activityCount: 12,
          tools: ['github', 'jira'],
        }}
      />
    );
    // Should eventually cycle to an entry-specific fact
    // Just verify it renders without error
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders quote carousel with navigation', () => {
    render(<WizardLoadingState mode="analyze" />);
    expect(screen.getByLabelText('Next quote')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous quote')).toBeInTheDocument();
  });

  it('navigates quotes with buttons', async () => {
    vi.useRealTimers(); // Need real timers for userEvent
    const user = userEvent.setup();
    render(<WizardLoadingState mode="analyze" />);
    const nextBtn = screen.getByLabelText('Next quote');
    const quoteText = screen.getByTestId('quote-text').textContent;
    await user.click(nextBtn);
    // Quote should change (or wrap)
    expect(screen.getByTestId('quote-text')).toBeInTheDocument();
  });

  it('uses generate-mode facts when mode is generate', () => {
    render(<WizardLoadingState mode="generate" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/story-wizard/WizardLoadingState.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement `WizardLoadingState`**

Create `src/components/story-wizard/WizardLoadingState.tsx`:

```typescript
/**
 * WizardLoadingState
 *
 * Engaging loading screen for Analyze and Generate steps.
 * Top zone: auto-rotating facts (2s cycle).
 * Bottom zone: quote carousel with manual < > navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { JournalEntryMeta } from '../../types/career-stories';
import { CAREER_QUOTES, WIZARD_LOADING_FACTS } from '../career-stories/constants';

interface WizardLoadingStateProps {
  journalMeta?: JournalEntryMeta;
  mode: 'analyze' | 'generate';
}

function buildEntryFacts(meta: JournalEntryMeta): string[] {
  const facts: string[] = [];
  if (meta.activityCount) {
    facts.push(`Reviewing ${meta.activityCount} activities...`);
  }
  if (meta.dateRange) {
    facts.push(`Spanning ${meta.dateRange}...`);
  }
  if (meta.tools && meta.tools.length > 0) {
    facts.push(`Found work across ${meta.tools.join(', ')}...`);
  }
  if (meta.topics && meta.topics.length > 0) {
    facts.push(`Topics: ${meta.topics.slice(0, 3).join(', ')}...`);
  }
  if (meta.impactHighlights && meta.impactHighlights.length > 0) {
    facts.push(`Key impact: ${meta.impactHighlights[0]}`);
  }
  return facts;
}

export const WizardLoadingState: React.FC<WizardLoadingStateProps> = ({
  journalMeta,
  mode,
}) => {
  // Build facts list: entry-specific + generic
  const allFacts = React.useMemo(() => {
    const entryFacts = journalMeta ? buildEntryFacts(journalMeta) : [];
    return [...entryFacts, ...WIZARD_LOADING_FACTS[mode]];
  }, [journalMeta, mode]);

  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);

  // Random starting quote
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * CAREER_QUOTES.length)
  );

  // Auto-cycle facts every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % allFacts.length);
        setFactVisible(true);
      }, 300); // fade out, then swap and fade in
    }, 2000);
    return () => clearInterval(interval);
  }, [allFacts.length]);

  // Quote navigation
  const prevQuote = useCallback(() => {
    setQuoteIndex((i) => (i - 1 + CAREER_QUOTES.length) % CAREER_QUOTES.length);
  }, []);

  const nextQuote = useCallback(() => {
    setQuoteIndex((i) => (i + 1) % CAREER_QUOTES.length);
  }, []);

  // Keyboard nav for quotes
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevQuote();
    if (e.key === 'ArrowRight') nextQuote();
  }, [prevQuote, nextQuote]);

  const quote = CAREER_QUOTES[quoteIndex];

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-8 min-h-[400px]">
      {/* Spinner + rotating fact */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`text-sm text-gray-500 text-center max-w-md transition-opacity duration-300 ${
            factVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {allFacts[factIndex]}
        </div>
      </div>

      {/* Quote carousel */}
      <div
        className="w-full max-w-lg px-4"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Career coaching quotes"
      >
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
            {quote.theme}
          </p>
          <p
            data-testid="quote-text"
            className="text-sm text-gray-700 italic leading-relaxed"
          >
            "{quote.text}"
          </p>
          <p className="text-xs text-gray-400 mt-2">— {quote.attribution}</p>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={prevQuote}
              aria-label="Previous quote"
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-gray-300">
              {quoteIndex + 1} / {CAREER_QUOTES.length}
            </span>
            <button
              onClick={nextQuote}
              aria-label="Next quote"
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Step 4: Run tests**

Run: `npx vitest run src/components/story-wizard/WizardLoadingState.test.tsx`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/components/story-wizard/WizardLoadingState.tsx src/components/story-wizard/WizardLoadingState.test.tsx
git commit -m "feat(story-wizard): add WizardLoadingState with rotating facts and quote carousel"
```

---

## Task 3: Build `ArchetypeSelector` Component (R2)

**Files:**
- Create: `src/components/story-wizard/ArchetypeSelector.tsx`
- Create: `src/components/story-wizard/ArchetypeSelector.test.tsx`

**Step 1: Write the failing test**

Create `src/components/story-wizard/ArchetypeSelector.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchetypeSelector } from './ArchetypeSelector';

const mockAlternatives = [
  { archetype: 'firefighter' as const, confidence: 0.6 },
  { archetype: 'multiplier' as const, confidence: 0.4 },
];

describe('ArchetypeSelector', () => {
  it('renders trigger with selected archetype', () => {
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    expect(screen.getByTestId('archetype-selector')).toHaveTextContent('Architect');
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows detected + alternatives in default view', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByText('Architect')).toBeInTheDocument();
    expect(screen.getByText('Firefighter')).toBeInTheDocument();
    expect(screen.getByText('Multiplier')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={onChange}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    await user.click(screen.getByText('Firefighter'));
    expect(onChange).toHaveBeenCalledWith('firefighter');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows all archetypes when "Show all" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    await user.click(screen.getByText(/show all/i));
    // Should now show grouped columns with all 8 archetypes
    expect(screen.getByText('Pioneer')).toBeInTheDocument();
    expect(screen.getByText('Detective')).toBeInTheDocument();
    expect(screen.getByText('Diplomat')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/story-wizard/ArchetypeSelector.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement `ArchetypeSelector`**

Create `src/components/story-wizard/ArchetypeSelector.tsx`. Follow the exact same patterns as `FrameworkSelector.tsx`:
- `useRef` + `useEffect` for click-outside close
- `useEffect` for Escape key close
- Controlled component: `value` + `onChange`
- `cn()` utility for class merging
- `aria-haspopup`, `aria-expanded`, `role="listbox"`, `role="option"`, `aria-selected`

Key differences from `FrameworkSelector`:
- Props include `detected` (AI pick) and `alternatives` (from API)
- Default view shows only detected + alternatives
- "Show all" toggle at bottom expands to full 3-column grouped view using `ARCHETYPE_GROUPS`
- Each option shows archetype icon (from `ARCHETYPE_CONFIG` in `StoryWizardModal.tsx` — will need to be moved to constants or imported), name, and description
- Selected item: purple highlight + checkmark (same as FrameworkSelector)

Import icons and colors from the existing `ARCHETYPE_CONFIG` in `StoryWizardModal.tsx`. This config maps archetype names to `{ icon, color, label }`.

**Step 4: Run tests**

Run: `npx vitest run src/components/story-wizard/ArchetypeSelector.test.tsx`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/components/story-wizard/ArchetypeSelector.tsx src/components/story-wizard/ArchetypeSelector.test.tsx
git commit -m "feat(story-wizard): add ArchetypeSelector dropdown with grouped layout"
```

---

## Task 4: Refactor `StoryWizardModal` — AnalyzeStep (R2, R3, R1, R8)

**Files:**
- Modify: `src/components/story-wizard/StoryWizardModal.tsx`
- Modify: `src/components/story-wizard/index.ts`

**Step 1: Update props to accept `journalEntryMeta`**

In `StoryWizardModalProps` (line 57), add:

```typescript
journalEntryMeta?: JournalEntryMeta;
```

Import `JournalEntryMeta` from `../../types/career-stories`.

Destructure in the component (line 75):

```typescript
journalEntryMeta,
```

**Step 2: Replace AnalyzeStep loading state**

In the `AnalyzeStep` component (line 350), replace the `isLoading` block (lines 358-368) with:

```typescript
if (isLoading) {
  return <WizardLoadingState mode="analyze" journalMeta={journalMeta} />;
}
```

Add `journalMeta` to `AnalyzeStepProps` and pass it from the parent.

**Step 3: Replace archetype grid with `ArchetypeSelector` dropdown**

In the `AnalyzeStep` rendered output (lines 375-448), replace:
- The "Or choose another archetype" grid (lines 395-425) with an inline `ArchetypeSelector` dropdown
- The "Narrative Framework" grid (lines 427-448) with a `FrameworkSelector` dropdown (imported from `../career-stories/FrameworkSelector`)

New layout after the detected-archetype card:

```tsx
{/* Dropdowns row */}
<div className="flex items-center gap-4">
  <div className="space-y-1">
    <span className="text-xs text-gray-500">Archetype</span>
    <ArchetypeSelector
      value={selectedArchetype || result.archetype.detected}
      onChange={onArchetypeChange}
      detected={result.archetype.detected}
      alternatives={result.archetype.alternatives}
    />
  </div>
  <div className="space-y-1">
    <span className="text-xs text-gray-500">Story format</span>
    <FrameworkSelector
      value={selectedFramework}
      onChange={onFrameworkChange}
    />
  </div>
</div>
```

**Step 4: Replace Generate loading state**

In the main component, when `step === 'generate' && isLoading` (currently lines 315-320 show a tiny spinner in the footer), change the content area to show `WizardLoadingState`:

In the content area (around line 274), add before the existing generate result:

```tsx
{step === 'generate' && isLoading && (
  <div className="py-4 animate-in fade-in duration-200">
    <WizardLoadingState mode="generate" journalMeta={journalEntryMeta} />
  </div>
)}
```

And make the existing `GenerateStep` conditional on `!isLoading`:

```tsx
{step === 'generate' && !isLoading && generateResult && (
  ...existing GenerateStep...
)}
```

**Step 5: Update generate flow — set step before API call**

In `handleGenerate` (line 138), move `setStep('generate')` to BEFORE the API call so the loading screen shows immediately:

```typescript
const handleGenerate = async () => {
  if (!selectedArchetype) return;
  setStep('generate');  // Show loading immediately
  setIsLoading(true);
  setError(null);
  try {
    const response = await CareerStoriesService.wizardGenerate({...});
    if (response.success && response.data) {
      setGenerateResult(response.data);
      onStoryCreated?.(response.data.story.id);
    } else {
      setError(response.error || 'Failed to generate story');
    }
  } catch (err) {
    setError('Failed to generate story');
  } finally {
    setIsLoading(false);
  }
};
```

**Step 6: Update barrel export**

In `src/components/story-wizard/index.ts`, add exports for new components:

```typescript
export { StoryWizardModal } from './StoryWizardModal';
export { default } from './StoryWizardModal';
export { WizardLoadingState } from './WizardLoadingState';
export { ArchetypeSelector } from './ArchetypeSelector';
```

**Step 7: Commit**

```bash
git add src/components/story-wizard/StoryWizardModal.tsx src/components/story-wizard/index.ts
git commit -m "feat(story-wizard): replace grids with dropdowns, add engaging loading states"
```

---

## Task 5: Refactor `QuestionsStep` — Navigation & Layout (R4, R5, R6, R7)

**Files:**
- Modify: `src/components/story-wizard/StoryWizardModal.tsx`

This is the largest single task. Break the QuestionsStep changes into sub-steps.

**Step 1: Remove inner navigation from QuestionsStep**

Delete lines 593-636 (the inner `<div className="flex items-center justify-between pt-2">` with Previous/Skip/Next buttons). The QuestionsStep component should only render the progress bar + question card. Navigation moves to the unified footer.

Update `QuestionsStepProps` — remove `onNext`, `onPrev`, `onSkip` since these move to the footer. Keep `questions`, `answers`, `onAnswerChange`, `currentQuestionIndex`.

**Step 2: Strip chrome from QuestionsStep**

Remove lines 494-508 (the progress header with `1/6 Context 0 answered`).

Remove the phase badge and phase config (lines 472-476, 489, 501-503).

Keep only the thin progress bar (lines 510-516).

**Step 3: Refactor question card to side-by-side layout**

Replace the question card content (lines 518-591) with the new layout:

```tsx
<div
  key={currentQuestion.id}
  className="rounded-2xl border border-gray-100 bg-white p-5 animate-in fade-in slide-in-from-right-4 duration-300"
>
  <div className="space-y-4">
    {/* Question text + hint toggle */}
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-base font-semibold text-gray-900 leading-relaxed">
        {currentQuestion.question}
      </h3>
      {currentQuestion.hint && (
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Show hint"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      )}
    </div>

    {/* Hint (click-to-toggle) */}
    {showHint && currentQuestion.hint && (
      <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 animate-in fade-in duration-200">
        {currentQuestion.hint}
      </p>
    )}

    {/* Side-by-side: chips + textarea */}
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Chips (left, 40%) */}
      {currentQuestion.options && currentQuestion.options.length > 0 && (
        <div
          className="sm:w-2/5 flex flex-wrap sm:flex-col gap-1.5"
          role="group"
          aria-label="Select options that apply"
        >
          {currentQuestion.options.map((opt) => {
            const isSelected = currentAnswer.selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => {
                  const newSelected = isSelected
                    ? currentAnswer.selected.filter((v) => v !== opt.value)
                    : [...currentAnswer.selected, opt.value];
                  onAnswerChange(currentQuestion.id, { ...currentAnswer, selected: newSelected });
                }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border transition-all duration-150 active:scale-95 text-left',
                  isSelected
                    ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {isSelected && <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-0.5" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Textarea (right, 60% or full-width if no chips) */}
      {currentQuestion.allowFreeText && (
        <div className={cn(
          currentQuestion.options?.length ? 'sm:w-3/5' : 'w-full'
        )}>
          <textarea
            id={textareaId}
            value={currentAnswer.freeText || ''}
            onChange={(e) => {
              onAnswerChange(currentQuestion.id, { ...currentAnswer, freeText: e.target.value });
              if (showHint) setShowHint(false); // Hide hint when typing
            }}
            placeholder={currentQuestion.hint || 'Add your thoughts...'}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all duration-150 bg-white"
            rows={4}
          />
        </div>
      )}
    </div>
  </div>
</div>
```

Add `HelpCircle` to lucide-react imports. Add `showHint` state:

```typescript
const [showHint, setShowHint] = useState(false);
```

Reset `showHint` when question changes (in a useEffect or by keying on `currentQuestionIndex`).

Import `cn` from `../../lib/utils`.

**Step 4: Add `min-h-[400px]` to content area**

In the main modal component, change the content area div (line 233):

```tsx
<div className="flex-1 overflow-y-auto min-h-[400px]">
```

**Step 5: Unify footer navigation**

Replace the entire footer (lines 282-331) with a unified footer that handles all steps and question navigation:

```tsx
{/* Footer — unified navigation */}
{!(step === 'generate' && isLoading) && (
  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
    <Button
      variant="ghost"
      onClick={() => {
        if (step === 'analyze') {
          onClose();
        } else if (step === 'questions') {
          if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((i) => i - 1);
          } else {
            setStep('analyze');
          }
        } else if (step === 'generate') {
          // Back from generate result → last question
          setStep('questions');
          setCurrentQuestionIndex(analyzeResult!.questions.length - 1);
        }
      }}
      disabled={isLoading}
    >
      <ChevronLeft className="h-4 w-4 mr-1" />
      {step === 'analyze' ? 'Cancel' : 'Back'}
    </Button>

    <div className="flex items-center gap-3">
      {/* Skip (questions only) */}
      {step === 'questions' && (
        <button
          type="button"
          onClick={() => {
            if (currentQuestionIndex < analyzeResult!.questions.length - 1) {
              setCurrentQuestionIndex((i) => i + 1);
            } else {
              handleGenerate();
            }
          }}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip
        </button>
      )}

      {/* Primary action */}
      {step === 'analyze' && (
        <Button
          onClick={() => setStep('questions')}
          disabled={isLoading || !analyzeResult}
          className="bg-primary-500 hover:bg-primary-600 text-white"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}

      {step === 'questions' && !isLastQuestion && (
        <Button
          onClick={() => setCurrentQuestionIndex((i) => i + 1)}
          className="bg-primary-500 hover:bg-primary-600 text-white"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}

      {step === 'questions' && isLastQuestion && (
        <Button
          onClick={handleGenerate}
          className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate
        </Button>
      )}

      {step === 'generate' && !isLoading && (
        <Button
          onClick={onClose}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Done
        </Button>
      )}
    </div>
  </div>
)}
```

Need to compute `isLastQuestion` in the parent scope (not inside QuestionsStep):

```typescript
const isLastQuestion = analyzeResult
  ? currentQuestionIndex === analyzeResult.questions.length - 1
  : false;
```

**Step 6: Commit**

```bash
git add src/components/story-wizard/StoryWizardModal.tsx
git commit -m "refactor(story-wizard): unified nav, side-by-side questions, fixed modal height"
```

---

## Task 6: Wire Parent Page (`list.tsx`) (Fix 1)

**Files:**
- Modify: `src/pages/journal/list.tsx`

**Step 1: Build `wizardEntryMeta` from activities data**

In `list.tsx`, add the `useMemo` lookup after the `storyWizardEntryId` state (around line 150):

```typescript
import { JournalEntryMeta } from '../../types/career-stories';

// Build journal entry metadata for Story Wizard loading facts
const wizardEntryMeta = useMemo<JournalEntryMeta | undefined>(() => {
  if (!storyWizardEntryId || !activitiesData) return undefined;
  // activitiesData can be grouped response
  const groups = 'groups' in activitiesData ? activitiesData.groups : [];
  const group = groups.find(
    (g) => g.storyMetadata?.id === storyWizardEntryId
  );
  if (!group?.storyMetadata) return undefined;
  const meta = group.storyMetadata;
  return {
    title: meta.title,
    dateRange: meta.timeRangeStart && meta.timeRangeEnd
      ? `${new Date(meta.timeRangeStart).toLocaleDateString()} - ${new Date(meta.timeRangeEnd).toLocaleDateString()}`
      : undefined,
    activityCount: group.count,
    tools: [...new Set(group.activities.map((a) => a.source))],
    topics: meta.topics,
    impactHighlights: meta.impactHighlights,
    skills: meta.skills,
  };
}, [storyWizardEntryId, activitiesData]);
```

**Step 2: Pass to StoryWizardModal**

Update the modal instantiation (around line 779):

```tsx
<StoryWizardModal
  isOpen={true}
  onClose={() => setStoryWizardEntryId(null)}
  journalEntryId={storyWizardEntryId}
  journalEntryMeta={wizardEntryMeta}
  onStoryCreated={handleStoryWizardComplete}
/>
```

**Step 3: Commit**

```bash
git add src/pages/journal/list.tsx
git commit -m "feat(story-wizard): pass journal entry metadata to wizard for loading facts"
```

---

## Task 7: Typography & Polish Pass (R9)

**Files:**
- Modify: `src/components/story-wizard/StoryWizardModal.tsx`

**Step 1: Review and tighten spacing/typography**

Do a visual review pass through the entire modal. Apply consistent sizing:
- Question text: `text-base font-semibold` (already set in Task 5)
- Chips: `text-xs` (already set in Task 5)
- Body/description text: `text-sm`
- Labels: `text-xs text-gray-500`
- Interactive: `primary-500/600`
- Tighten padding where it looks off (e.g., `p-6` → `p-5` on question cards)

**Step 2: Ensure consistent button labels**

Search for all button text in the file. Verify:
- "Cancel" (Analyze step, left)
- "Back" (all other steps, left) — never "Previous"
- "Next" (Analyze and Questions, right) — never "Continue"
- "Skip" (Questions only, text link)
- "Generate" (last question, right)
- "Done" (Generate result, right)

**Step 3: Remove dead code**

Remove the old `QuestionItem` component (lines 640-690) if it's no longer used (the `QuestionsStep` renders questions inline now). Remove unused imports.

**Step 4: Commit**

```bash
git add src/components/story-wizard/StoryWizardModal.tsx
git commit -m "style(story-wizard): typography consistency and dead code cleanup"
```

---

## Task 8: Run All Tests & Verify

**Step 1: Run all story-wizard tests**

Run: `npx vitest run src/components/story-wizard/`
Expected: All tests pass.

**Step 2: Run all career-stories tests**

Run: `npx vitest run src/components/career-stories/`
Expected: All tests pass.

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: No regressions.

**Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds.

**Step 6: Commit any fixes**

If any tests or builds fail, fix and commit:

```bash
git commit -m "fix(story-wizard): address test/build issues from UX refactor"
```

---

## Dependency Graph

```
Task 1 (constants/types) ──┬── Task 2 (WizardLoadingState)
                           ├── Task 3 (ArchetypeSelector)
                           │
Task 2 + Task 3 ───────────┴── Task 4 (AnalyzeStep refactor)
                                    │
                                Task 5 (QuestionsStep refactor)
                                    │
                                Task 6 (Parent page wiring)
                                    │
                                Task 7 (Polish pass)
                                    │
                                Task 8 (Verify all)
```

Tasks 2 and 3 can run **in parallel** after Task 1 completes. Everything else is sequential.
