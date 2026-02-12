# Library Tab — Career Stories Page

> Revised after RJ (5→8/10), ET (7/10), PGC (6/10) review. RJ round-2 nits incorporated.

## Context

Packets (multi-story documents) and derivations (single-story outputs) are the finished deliverables users carry into promotions, interviews, and 1:1s. Currently they're generated in modals and then vanish — no spatial presence, no browsing, no management.

This plan adds a **Library** tab to the Career Stories page — a flat, scannable list of every saved deliverable. The word "Library" is honest: it's a collection of things you made, not a strategy guide.

## Naming Decisions (PGC review)

| Internal term | User-facing label | Why |
|---|---|---|
| ~~Playbook~~ | **Library** | "Playbook" overpromises strategy. Library = "stuff I collected." Honest. |
| `kind: 'packet'` | **"from 4 stories"** | "Packet" is inside baseball. Show source count, let scale be self-evident. |
| `kind: 'single'` | *(no badge)* | Don't label the default. Only label the exception. |
| Tab label | **Library (4)** | Count shows inventory. No "new" badge in v1 (ET: earn the ink). |

## Architecture: Phased

**Phase A (this plan):** Library tab with cards + detail panel using existing data. ~3 days.
**Phase B (future):** Sections for packets, annotations on derivations, mermaid rendering.

## Verified Assumptions

Before implementation, these were confirmed by reading the codebase:

| Claim | Status | Evidence |
|---|---|---|
| `GET /derivations?kind=single` works | **Verified** | `usePackets()` uses `listDerivationsByKind('packet')` — same endpoint, different kind param |
| `DELETE /derivations/:id` exists | **Verified** | `career-stories.controller.ts:1558-1575`, `useDeleteDerivation()` hook exists |
| Response shape has enough data for cards | **Verified** | `StoryDerivation` has `type`, `text`, `wordCount`, `storySnapshots[]`, `createdAt`, `tone` |
| `useDeriveStory()` invalidates single-derivation list | **Bug found** | It does NOT invalidate `derivations-by-kind/single`. Fix in Step 1. |
| `DeriveStoryResponse` has derivation ID for toast link | **Verified** | `DeriveStoryResponse.derivationId: string` (career-stories.ts:401). Toast can link to `?tab=library&itemId={derivationId}`. |
| `DerivePacketResponse` has derivation ID for toast link | **Verified** | `DerivePacketResponse.derivationId: string` (career-stories.ts:432). Same pattern. |
| Extra fields on `PACKET_TYPE_META` won't break `PromotionPacketModal` | **Verified** | Modal destructures only `label`, `description`, `loadingText`. TypeScript allows extra properties on record values. No `Object.keys()` or spread of meta values in that file. |

## URL / Routing Strategy

Pattern: mirror existing `?storyId=` approach with `?tab=library&itemId=`.

```
/career-stories                          → Stories tab, list view
/career-stories?tab=library              → Library tab, list view
/career-stories?tab=library&itemId=abc   → Library tab, detail view for item abc
```

On detail open: `setSearchParams({ tab: 'library', itemId: item.id }, { replace: true })`.
On back/Escape: `setSearchParams({ tab: 'library' }, { replace: true })`.
On tab switch to Stories: `setSearchParams({}, { replace: true })`.
Params cleared after state hydration (same `replace: true` pattern as existing storyId handling).

**`replace: true` is intentional.** The existing story detail uses the same pattern — clicking story A then story B then pressing browser Back exits the page entirely, not stepping through A→B. Library mirrors this. Navigating within a tab is selection, not navigation — browser history tracks page-level transitions, not item-level selections. This is consistent with how list/detail views work in macOS Finder, Gmail, and the existing Stories tab.

## Performance

Realistic inventory: 5-50 items. No pagination or virtualization needed in v1. If a user has 200+ items, the cards are lightweight DOM nodes (no images, no heavy renders). Cross that bridge if usage data shows it.

## Accessibility

- Cards: `role="button"`, `tabIndex={0}`, Enter/Space triggers onClick (same as StoryCard)
- Tab toggle: `role="tablist"` with `role="tab"` + `aria-selected` on each button
- Detail view: focus moves to detail header on open, Escape returns focus to previously-selected card
- Screen reader: tab toggle announces "Stories tab, selected" / "Library tab, 4 items"
- Delete confirmation: focus trap in confirm dialog (Radix Dialog handles this)

---

## Step 1: `useSingleDerivations()` hook + invalidation fix

**File:** `src/hooks/useCareerStories.ts`
**Effort:** 15 min

```typescript
export const useSingleDerivations = () => {
  return useQuery({
    queryKey: ['career-stories', 'derivations-by-kind', 'single'],
    queryFn: () => CareerStoriesService.listDerivationsByKind('single'),
    select: (response) => response.data,
  });
};
```

**Bug fix:** `useDeriveStory()` onSuccess must also invalidate:
```typescript
queryClient.invalidateQueries({ queryKey: ['career-stories', 'derivations-by-kind', 'single'] });
```

Without this, generating a new single derivation won't appear in the Library until page refresh.

---

## Step 2: Promote `PACKET_TYPE_META` to shared constants

**File:** `src/components/career-stories/constants.ts`
**Effort:** 20 min

Move from `PromotionPacketModal.tsx:30-65` into constants. Add `Icon` and `color` fields to match `DERIVATION_TYPE_META` shape:

```typescript
export const PACKET_TYPE_META: Record<PacketType, {
  label: string;
  description: string;
  loadingText: string;
  Icon: React.FC<{ className?: string }>;
  color: string;
}> = {
  promotion:         { label: 'Promotion',       description: '...', loadingText: '...', Icon: TrendingUp,   color: 'emerald' },
  'annual-review':   { label: 'Annual Review',   description: '...', loadingText: '...', Icon: Clock,        color: 'blue' },
  'skip-level':      { label: 'Skip-Level',      description: '...', loadingText: '...', Icon: ArrowUpRight, color: 'purple' },
  'portfolio-brief': { label: 'Portfolio Brief',  description: '...', loadingText: '...', Icon: FileText,     color: 'indigo' },
  'self-assessment': { label: 'Self Assessment',  description: '...', loadingText: '...', Icon: Target,       color: 'rose' },
  'one-on-one':      { label: '1:1 Prep',         description: '...', loadingText: '...', Icon: Users,        color: 'amber' },
};
```

Add missing `DERIVATION_COLOR_CLASSES` entries: `blue`, `purple` (if not already there).

Update `PromotionPacketModal.tsx` to `import { PACKET_TYPE_META } from './constants'` and delete the local copy.

---

## Step 3: `LibraryCard.tsx`

**File (new):** `src/components/career-stories/LibraryCard.tsx`
**Effort:** 1.5 hours

### Layout (ET-revised — stripped to data-ink)

```
┌─────────────────────────────────────────────────────────┐
│ Interview Answer                              Feb 10  │
│ When asked about distributed systems, I led a...       │
│ from BILL-550 Double-debit Work · 142 words            │
└─────────────────────────────────────────────────────────┘
```

Changes from original plan per ET/PGC:
- **No colored icon container** — type label alone communicates the type. Monochrome icon at 16px inline with title, same gray as date. Not an 8x8 colored logo.
- **No chevron** — cursor + hover state already say "clickable"
- **No "single"/"packet" badge** — instead show "from 3 stories" for packets, nothing for singles. Scale is self-evident.
- **Selection: 2 indicators max** — `bg-purple-50/50 border-purple-300`. No shadow, no ring.
- **Source stories capped at 1 name + count** — "from BILL-550 Double-debit Work + 2 more" keeps cards consistent as small multiples.

### Data resolution

```typescript
function getItemMeta(item: StoryDerivation) {
  if (item.kind === 'single') {
    const meta = DERIVATION_TYPE_META[item.type as DerivationType];
    if (!meta) {
      if (import.meta.env.DEV) console.warn(`[LibraryCard] Unknown single derivation type: "${item.type}"`);
      return { label: item.type, Icon: Sparkles, color: 'gray' };
    }
    return meta;
  }
  const meta = PACKET_TYPE_META[item.type as PacketType];
  if (!meta) {
    if (import.meta.env.DEV) console.warn(`[LibraryCard] Unknown packet type: "${item.type}"`);
    return { label: item.type, Icon: Briefcase, color: 'gray' };
  }
  return meta;
}
```

The `DEV` guard ensures fallback rendering is silent in production but loud in development — unknown types surface immediately in dev tools instead of hiding for weeks.

### Preview text

Strip markdown formatting then truncate at 100 chars. Covers the actual markdown features our LLM produces (verified: headers, bold, italic, bullets, blockquotes, links — no code fences in derivation/packet output, but handled defensively):

```typescript
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')    // fenced code blocks (defensive)
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/^#{1,6}\s+/gm, '')       // headers
    .replace(/^>\s+/gm, '')            // blockquotes
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1') // bold+italic
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '')        // unordered bullets
    .replace(/^\d+\.\s+/gm, '')        // ordered list items
    .replace(/\n+/g, ' ')              // collapse newlines
    .replace(/\s+/g, ' ')              // collapse multiple spaces
    .trim();
}
```

### Props

```typescript
interface LibraryCardProps {
  item: StoryDerivation;
  isSelected: boolean;
  onClick: () => void;
}
```

---

## Step 4: `LibraryDetail.tsx`

**File (new):** `src/components/career-stories/LibraryDetail.tsx`
**Effort:** 2 hours

### Layout (ET-revised — content first)

```
← Back to library

Interview Answer · 142 words · Feb 10                    [Copy ▾]
from BILL-550 Double-debit Work
──────────────────────────────────────────────────────────────
[Content area — full rich rendering, takes all remaining space]
```

Changes from original per ET:
- **Content first** — metadata compressed to a single line above content. The deliverable text IS the reason they opened this.
- **Destructive actions hidden** — Copy is the primary (visible) button. Delete and Regenerate are in a dropdown menu (`▾`), since they are expensive/destructive and shouldn't share visual weight with Copy.
- **No icon in header** — the type label is sufficient.

### Sub-components (not substeps — just rendering branches)

**Content area routing:**
- `kind === 'single'` → `<DerivationPreview>` (already built, handles LinkedIn/resume/interview frames)
- `kind === 'packet'` → `<SimpleMarkdown>` in document container (`bg-white rounded-lg border border-gray-200 px-5 py-4`)

**Source stories section:**
- Shows clickable story names resolved from `storySnapshots` (preferred) or `storyIds` against `allStories`
- Click navigates: `setSearchParams({ storyId: id }, { replace: true })` — switches to Stories tab and selects that story

**Actions (dropdown menu):**
- **Copy** (primary button) — clipboard + "Copied — go get 'em" toast (same pattern as modals)
- **Delete** (dropdown) — opens Radix AlertDialog for confirmation. On confirm: navigate back to list *first* (`onBack()`), *then* call `deleteDerivationMutation.mutateAsync(id)`. Navigate-then-delete avoids a flash of null state where the URL has `itemId` but React Query has already removed the item from cache. The `onDelete` callback in the parent handles both steps.
- **Regenerate** (dropdown) — opens DerivationModal (for singles) or PacketModal (for packets) pre-loaded with the type. Does NOT navigate away — modal overlays.

**Keyboard:**
- Escape returns to list (parent handles this, same as story detail)
- Focus management: on mount, focus moves to back button

### Props

```typescript
interface LibraryDetailProps {
  item: StoryDerivation;
  allStories: CareerStory[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onNavigateToStory: (storyId: string) => void;
}
```

---

## Step 5: Wire into `CareerStoriesPage.tsx`

**File:** `src/components/career-stories/CareerStoriesPage.tsx`
**Effort:** 2.5 hours

### 5a. URL-driven tab state

```typescript
const pageTab = searchParams.get('tab') === 'library' ? 'library' : 'stories';
const selectedItemId = searchParams.get('itemId');
```

No separate `useState` for tab — derive from URL. Single source of truth.

### 5b. New hooks

```typescript
const { data: singleDerivations, isLoading: isLoadingSingles, isError: isErrorSingles } = useSingleDerivations();
```

### 5c. Combined library data

```typescript
const libraryItems = useMemo(() => {
  return [...(packets || []), ...(singleDerivations || [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [packets, singleDerivations]);

const selectedLibraryItem = useMemo(() => {
  if (!selectedItemId) return null;
  return libraryItems.find(item => item.id === selectedItemId) ?? null;
}, [selectedItemId, libraryItems]);
```

Sorted by `createdAt` — the only date field on `StoryDerivation`. No ambiguity.

### 5d. Tab toggle (accessible)

```tsx
<div role="tablist" className="bg-gray-100 p-0.5 rounded-lg inline-flex">
  <button
    role="tab"
    aria-selected={pageTab === 'stories'}
    onClick={() => setSearchParams({}, { replace: true })}
    className={cn(
      'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
      pageTab === 'stories'
        ? 'bg-white shadow-sm text-gray-900'
        : 'text-gray-500 hover:text-gray-700'
    )}
  >
    Stories
  </button>
  <button
    role="tab"
    aria-selected={pageTab === 'library'}
    onClick={() => setSearchParams({ tab: 'library' }, { replace: true })}
    className={cn(
      'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
      pageTab === 'library'
        ? 'bg-white shadow-sm text-gray-900'
        : 'text-gray-500 hover:text-gray-700'
    )}
  >
    Library{libraryItems.length > 0 && ` (${libraryItems.length})`}
  </button>
</div>
```

### 5e. Error & loading states

```tsx
{/* Library loading */}
{pageTab === 'library' && (isLoadingSingles || isLoadingPackets) && (
  <div className="space-y-3 py-4">
    {[1,2,3].map(i => (
      <div key={i} className="animate-pulse rounded-2xl border border-gray-100 p-4">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
    ))}
  </div>
)}

{/* Library error — partial (one query failed) */}
{pageTab === 'library' && (isErrorSingles || isErrorPackets) && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
    Some items couldn't be loaded. Showing what's available.
  </div>
)}
```

Partial failure: if packets load but singles fail, show packets + error banner. Don't blank the whole tab.

### 5f. Empty state (PGC-revised)

```tsx
{pageTab === 'library' && !isLoading && libraryItems.length === 0 && (
  <div className="text-center py-12">
    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <Sparkles className="w-6 h-6 text-gray-400" />
    </div>
    <h3 className="text-sm font-semibold text-gray-900 mb-1">Your library is empty</h3>
    <p className="text-xs text-gray-500 max-w-xs mx-auto">
      When you save an interview answer, LinkedIn post, or other output from your stories, it shows up here.
    </p>
  </div>
)}
```

Tells users: what goes here + how to create one. No illustration, no decoration.

### 5g. Content gating

```tsx
{/* Stories tab */}
{pageTab === 'stories' && (
  <>
    {/* existing: stats banner, timeline/category toggle, story cards, detail view */}
  </>
)}

{/* Library tab — list */}
{pageTab === 'library' && !selectedLibraryItem && (
  <>
    {/* library header + card list + empty state */}
    {libraryItems.map(item => (
      <LibraryCard
        key={item.id}
        item={item}
        isSelected={false}
        onClick={() => setSearchParams({ tab: 'library', itemId: item.id }, { replace: true })}
      />
    ))}
  </>
)}

{/* Library tab — detail (desktop) */}
{pageTab === 'library' && selectedLibraryItem && (
  <>
    {/* Desktop: inline detail panel (same position as story NarrativePreview) */}
    <div className="hidden lg:block">
      <LibraryDetail
        item={selectedLibraryItem}
        allStories={allStories}
        onBack={() => setSearchParams({ tab: 'library' }, { replace: true })}
        onDelete={handleDeleteLibraryItem}
        onNavigateToStory={(id) => setSearchParams({ storyId: id }, { replace: true })}
      />
    </div>

    {/* Mobile: bottom sheet (same MobileSheet used for story detail) */}
    <MobileSheet
      isOpen={window.innerWidth < BREAKPOINTS.DESKTOP}
      onClose={() => setSearchParams({ tab: 'library' }, { replace: true })}
    >
      <LibraryDetail
        item={selectedLibraryItem}
        allStories={allStories}
        onBack={() => setSearchParams({ tab: 'library' }, { replace: true })}
        onDelete={handleDeleteLibraryItem}
        onNavigateToStory={(id) => setSearchParams({ storyId: id }, { replace: true })}
      />
    </MobileSheet>
  </>
)}
```

Mobile uses the same `MobileSheet` component (CareerStoriesPage.tsx:69-133) and `BREAKPOINTS.DESKTOP` threshold as the existing story detail. `LibraryDetail` renders identically in both contexts — no mobile-specific layout needed since the component is already a single-column vertical stack.

### 5h. Escape key extension

Add `selectedLibraryItem` to existing Escape handler:
```typescript
if (selectedLibraryItem) {
  setSearchParams({ tab: 'library' }, { replace: true });
  return;
}
```

### 5i. Cross-flow: generation → Library

After generating a new derivation/packet, the success toast should link to the Library.

Both `DeriveStoryResponse.derivationId` and `DerivePacketResponse.derivationId` return the saved derivation's ID (verified in types/career-stories.ts:401,432), so the toast can deep-link:

```typescript
// In DerivationModal onSuccess:
const result = await deriveMutation.mutateAsync({ storyId, params });
toast.success('Saved to Library', {
  action: {
    label: 'View',
    onClick: () => setSearchParams({ tab: 'library', itemId: result.derivationId }, { replace: true }),
  },
});

// In PacketModal onSuccess — same pattern:
const result = await packetMutation.mutateAsync(params);
toast.success('Saved to Library', {
  action: {
    label: 'View',
    onClick: () => setSearchParams({ tab: 'library', itemId: result.derivationId }, { replace: true }),
  },
});
```

This teaches the mental model: Stories are raw material, Library is where finished work lands.

**Note:** The toast `onClick` navigates via `setSearchParams` which requires the modals to receive a navigation callback prop (or use `useSearchParams` directly). Simplest approach: pass `onSavedToLibrary: (derivationId: string) => void` prop to both modals from CareerStoriesPage.

---

## Step 6: Tests

**Effort:** 1.5 hours

### `LibraryCard.test.tsx`

1. **Renders single derivation metadata** — shows type label, preview text, word count, relative date
2. **Renders packet with source count** — shows "from Story Title + 2 more" for 3 storySnapshots
3. **Truncates preview at ~100 chars** — long text gets ellipsis
4. **Strips markdown from preview** — `**bold**` renders as `bold`, `## Header` renders as `Header`
5. **Shows selected state** — has `bg-purple-50/50 border-purple-300` classes
6. **Calls onClick** — click triggers handler
7. **Falls back for unknown type** — unknown type shows fallback icon/label
8. **Keyboard accessible** — Enter/Space triggers onClick

### `LibraryDetail.test.tsx`

1. **Renders DerivationPreview for single-kind** — passes correct props
2. **Renders SimpleMarkdown for packet-kind** — renders in document container
3. **Shows source story names** — resolves from storySnapshots
4. **Copy action** — writes to clipboard, shows feedback
5. **Delete action** — shows confirmation dialog, calls onDelete on confirm
6. **Back button calls onBack**
7. **Shows metadata line** — type + word count + date in single line

### Integration (in existing `CareerStoriesPage.test.tsx` if it exists, else new)

1. **Tab toggle switches content** — clicking Library shows library cards, clicking Stories shows story cards
2. **URL drives tab state** — `?tab=library` renders Library tab
3. **URL drives detail selection** — `?tab=library&itemId=abc` opens detail
4. **Empty state shows when no items** — correct guidance text
5. **Partial error** — one query fails, shows error banner + available items

---

## Effort Summary

| Step | What | Effort |
|---|---|---|
| 1 | `useSingleDerivations()` + invalidation fix | 15 min |
| 2 | `PACKET_TYPE_META` to constants | 20 min |
| 3 | `LibraryCard.tsx` | 1.5 hr |
| 4 | `LibraryDetail.tsx` | 2 hr |
| 5 | Wire into `CareerStoriesPage.tsx` | 2.5 hr |
| 6 | Tests | 1.5 hr |
| **Total** | | **~8 hr (1.5 days)** |

## Dependency Order

```
Step 1 (hook) ──────────────┐
Step 2 (constants) ──┬──────┤
                     │      │
Step 3 (Card) ──── (2)     │
Step 4 (Detail) ── (2)     │
                     │      │
Step 5 (Page) ──── (1,3,4) ┘
Step 6 (Tests) ─── (3,4,5)
```

## File Summary

| File | Action | Step |
|---|---|---|
| `src/hooks/useCareerStories.ts` | Add `useSingleDerivations()`, fix `useDeriveStory()` invalidation | 1 |
| `src/components/career-stories/constants.ts` | Add `PACKET_TYPE_META` with icons/colors | 2 |
| `src/components/career-stories/PromotionPacketModal.tsx` | Import `PACKET_TYPE_META` from constants | 2 |
| `src/components/career-stories/LibraryCard.tsx` | **NEW** | 3 |
| `src/components/career-stories/LibraryDetail.tsx` | **NEW** | 4 |
| `src/components/career-stories/CareerStoriesPage.tsx` | Tab toggle, URL routing, library list/detail, empty/error/loading | 5 |
| `src/components/career-stories/LibraryCard.test.tsx` | **NEW** — 8 test cases | 6 |
| `src/components/career-stories/LibraryDetail.test.tsx` | **NEW** — 7 test cases | 6 |

## Verification Checklist

1. `npx tsc --noEmit` passes
2. All tests pass: `npx vitest run src/components/career-stories/`
3. Stories tab: zero behavior change
4. Library tab: cards render, click → detail, back returns to list
5. URL: `?tab=library` opens Library tab, `?tab=library&itemId=X` opens detail, browser back works
6. Empty state: shows guidance text when no items
7. Error state: partial failure shows banner + available items
8. Delete: confirmation dialog, item removed, returns to list
9. Copy: clipboard write, toast feedback
10. Mobile: detail opens in MobileSheet, back/Escape returns to list
11. Accessibility: tab toggle has role="tablist", cards have role="button", Escape works, focus managed

## What's NOT in Phase A (explicitly deferred)

- **Type filter chips** — deferred until Library has >20 items in real usage. Empty/low-count filtering is premature infrastructure.
- **Search** — same reasoning. 5-30 items don't need search.
- **Sections for packets** — requires schema changes (Phase B)
- **Annotations on derivations** — requires schema changes (Phase B)
- **Mermaid/ASCII rendering** — enhancement to SimpleMarkdown (Phase B)
- **Analytics/telemetry** — important but separate concern. **TODO: file issue for Library analytics** covering: tab switches, card clicks by type, detail views, copy actions, delete actions. These are the engagement signals that determine whether Phase B is worth building.
- **"New" badge on tab** — ET: earn the ink. Count is sufficient for v1.

## RJ Concerns Addressed

| RJ Concern | Resolution |
|---|---|
| No effort estimates | Added per-step + total (~1.5 days) |
| "No backend changes" unverified | Verified all 4 assumptions against actual code (table above) |
| No URL/routing strategy | Full URL strategy with `?tab=` and `?itemId=` params |
| No error states | Partial failure banner + loading skeletons |
| No empty state design | PGC-approved guidance text |
| Step 4 does too much | Destructive actions moved to dropdown menu, rendering is just component routing |
| No accessibility | role="tablist", aria-selected, focus management, keyboard nav |
| Test plan is a checkbox | 15 specific test cases enumerated with expected behavior |
| Sort date ambiguous | Explicitly `createdAt` — the only date on StoryDerivation |
| No performance consideration | Addressed: 5-50 items realistic, lightweight DOM, defer virtualization |

## ET Concerns Addressed

| ET Concern | Resolution |
|---|---|
| Kill colored icon container | 16px monochrome icon inline with title, same gray as date |
| Quad-indicator selection | 2 indicators only: bg-purple-50/50 + border-purple-300 |
| Remove chevron | Removed. Cursor + hover sufficient. |
| Detail view: content first | Metadata in one line above content. Content takes all space. |
| Destructive actions hidden | Copy is primary. Delete/Regenerate in dropdown. |
| Cap source stories | 1 name + "+ N more" |

## PGC Concerns Addressed

| PGC Concern | Resolution |
|---|---|
| "Playbook" overpromises | Renamed to **Library** |
| "Packet" is inside baseball | Replaced with "from N stories" on cards |
| Empty state teaches nothing | "When you save an interview answer, LinkedIn post, or other output from your stories, it shows up here." |
| First-time discoverability zero | Success toast "Saved to Library" with View link after generation |

## RJ Round-2 Nits Addressed

| Nit | Resolution |
|---|---|
| `stripMarkdown` fragile — no code blocks, blockquotes, numbered lists | Expanded to cover fenced code blocks, inline code, blockquotes, ordered lists, bold+italic nesting, multi-space collapse |
| `getItemMeta` fallback too quiet | Added `import.meta.env.DEV` console.warn — loud in dev, silent in prod |
| Toast link needs `derivationId` — unverified | **Verified**: both `DeriveStoryResponse.derivationId` and `DerivePacketResponse.derivationId` exist (career-stories.ts:401,432). Added to verified assumptions table. |
| Delete timing: async cache vs sync URL | Navigate back *first*, then delete. Avoids flash of null state. Documented in Step 4. |
| Mobile MobileSheet hand-waved | Spelled out: same `MobileSheet` + `BREAKPOINTS.DESKTOP` as story detail. Full JSX in Step 5g. |
| Analytics deferred with no tracking | Added TODO with specific events to track. |
| Extra fields on PACKET_TYPE_META | **Verified**: PromotionPacketModal destructures only label/description/loadingText. Extra fields safe. Added to verified assumptions table. |
| `replace: true` = no browser Back within Library | **Intentional**: matches existing story detail pattern. Documented rationale in URL/Routing section. |
