# Draft Stories on Timeline — UX Design Spec (v4)

> CD6 Design-UX Stage | Experience Designer output
> Date: 2026-02-24
> Reviews incorporated: FLEA (6/10), Russian Judge (5.4/10), Grumpy Staff Engineer, DLG review
> v3: Collapsed phasing — sidebar is the feature, not inline cards
> v4: Addressed all review issues — Create Story flow, WCAG fixes, empty states, data loading, filter architecture

---

## Problem

First-time users see raw tool activities on the timeline but have **no idea what Draft Stories are**, how they relate to activities, or that the system automatically groups work into narrative clusters. The current UI hides drafts behind a separate "Drafts" pill toggle tab — a discoverability dead zone.

## Core Insight

The fix is **spatial separation**: activities on the left, draft stories on the right. Two visually distinct things. The sidebar IS the discoverability mechanism — it says "your raw work is becoming stories" by existing next to the activity feed. Inline cards (whether interleaved or stacked above) muddy this distinction.

## Design Principles

1. **Clear distinction** — Activities and draft stories are different things. They look different. They live in different columns.
2. **Two states, not four** — Default + Click-to-filter. No hover highlighting, no expand view.
3. **Every state specified** — Loading, empty, error, zero-drafts, promotion success/failure.
4. **Accessibility is not optional** — Focus management, WCAG contrast, keyboard navigation.
5. **Reuse existing components** — `InlineDraftCard`, `DraftBadge`, `CollapsibleGroup` already exist.

---

## Layout: Two-Column with Sidebar Rail

Desktop (`lg:` breakpoint, >= 1024px):

```
┌──────────────────────────────────────────────────────────────────────┐
│  FilterBar: source chips  |  view toggle  |  ⊞ ≡                    │
├────────────────────────────────────────┬─────────────────────────────┤
│                                        │                             │
│  ACTIVITY TIMELINE (~65%)              │  DRAFT STORIES (~35%)       │
│                                        │  sticky, scrolls separately │
│  ┌─ Today ──────────────────────┐      │                             │
│  │                              │      │  ┌────────────────────────┐ │
│  │  ● GitHub PR #342            │      │  │ Draft ★                │ │
│  │  ● Jira AUTH-1204            │      │  │ Led OAuth2 Security    │ │
│  │  ● Slack #backend            │      │  │ Overhaul               │ │
│  │  ● Confluence — Rate Limit   │      │  │ ⊙⊙⊙⊙ · 7 activities   │ │
│  │  ● Google Meet — Sprint      │      │  │ [Security] [Auth]     │ │
│  │                              │      │  └────────────────────────┘ │
│  └──────────────────────────────┘      │                             │
│                                        │  ┌────────────────────────┐ │
│  ┌─ Yesterday ──────────────────┐      │  │ Draft ★                │ │
│  │  ● GitHub — WebSocket fix    │      │  │ Dashboard Perf         │ │
│  │  ● Jira DASH-892             │      │  │ Optimization           │ │
│  │  ● Figma — onboarding v3    │      │  │ ⊙⊙⊙ · 5 activities    │ │
│  │  ● Slack #incidents          │      │  │ [Perf] [Frontend]     │ │
│  │                              │      │  └────────────────────────┘ │
│  └──────────────────────────────┘      │                             │
│                                        │  ┌────────────────────────┐ │
│  ┌─ This Week ──────────────────┐      │  │ Draft ★                │ │
│  │  ...                         │      │  │ API Rate Limiting      │ │
│  └──────────────────────────────┘      │  │ ⊙⊙⊙ · 4 activities    │ │
│                                        │  │ [Infra] [Redis]       │ │
│                                        │  └────────────────────────┘ │
│                                        │                             │
│                                        │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│                                        │  Click a story to see its   │
│                                        │  activities in the timeline │
│                                        │                             │
├────────────────────────────────────────┴─────────────────────────────┤
└──────────────────────────────────────────────────────────────────────┘
```

**Grid:** `lg:grid lg:grid-cols-[1fr,300px] lg:gap-6`
**Sidebar:** `sticky top-6 self-start max-h-[calc(100vh-6rem)] overflow-y-auto`
**Scroll behavior:** Sidebar stays pinned even when the user scrolls past all activities (e.g., past footer). This is expected — the sidebar is a persistent navigation element, not spatially anchored to specific activity groups. The sidebar's own content scrolls independently via `overflow-y-auto`.
**Below `lg:`:** Single column, floating peek bar + bottom sheet (see Mobile Layout below).

**Data loading change:** `JournalListPage` currently defers storyGroups fetch with `{ enabled: !activitiesLoading }`. This remains correct — the sidebar simply renders skeleton state while `storyData` is loading. No change to the query gating logic; the existing deferred fetch feeds the sidebar once activities finish loading. The pill toggle removal means `storyGroups` is always consumed (by sidebar/peek bar), not gated behind a user tab click.

---

## State 1: DEFAULT (Resting)

Activity timeline scrolls on the left. Sidebar shows draft story cards on the right.

### Sidebar Draft Card (Resting)

```
┌─ border-l-4 border-l-purple-400 ────────────────────────┐
│                                                           │
│  Draft ★                                                  │  ← DraftBadge (serif italic)
│                                                           │
│  Led OAuth2 Security Overhaul                             │  ← title, font-semibold
│                                                           │
│  ⊙⊙⊙⊙  ·  Jan 14 – Feb 24  ·  7 activities              │  ← source icons (max 4 + overflow), date, count
│                                                           │
│  [Security] [Auth] +2                                     │  ← topics (max 2 + overflow count)
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Visual treatment:**
- White bg, `border border-gray-200`, `border-l-4 border-l-purple-400`
- `rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer`
- Existing `DraftBadge` component with `animate: false` (static — no paint storm when 10 cards mount)
- Source icon stack: overlapping circles (`-space-x-1.5`), max 4 icons + `+N` overflow badge
- **No "Create Story" CTA in resting state** — entire card is the click target. CTA appears only in selected state.

### Sidebar Header

```
┌─────────────────────────────────────────┐
│  ★ Draft Stories              3         │  ← header + count badge
└─────────────────────────────────────────┘
```

- `text-sm font-semibold text-gray-700 uppercase tracking-wider`
- Count badge: `Badge variant="secondary" text-[10px]`
- Progressive disclosure: first 10 cards visible. If more: `"+ Show 10 more"` button at bottom (matches existing `CollapsibleGroup` pattern with `previewLimit`). Loads in batches of 10 — not all-at-once — to prevent DOM bloat in the 300px sticky sidebar. State tracked via `visibleCount` in `DraftStorySidebar`, incremented by 10 per click.

### Sidebar Footer Hint

```
  Click a story to see which
  activities built it
```

- `text-[11px] text-gray-300 text-center leading-relaxed`
- Hidden after first card selection (user learned the interaction)

### First-Time Banner (above sidebar cards, one-time)

On first render when `storyGroups.length > 0`:

```
┌─ bg-purple-50 border border-purple-200 rounded-lg p-3 ───┐
│                                                            │
│  ★ Your work is forming into stories                       │
│                                                            │
│  We group related activities into drafts you can turn      │
│  into career stories. Click one to explore.                │
│                                                            │
│                                          [Got it]          │
└────────────────────────────────────────────────────────────┘
```

- `useState` initialized from `localStorage('inchronicle:draft-sidebar-seen')`
- Graceful fallback if localStorage unavailable (incognito): default to shown, dismiss on click
- Dismissed on "Got it" click only — no auto-fade timer (auto-dismissing educational content before the user reads it is hostile; users scrolling the timeline will miss it entirely)

---

## State 2: SELECTED (Click-to-Filter)

Clicking a sidebar card filters the timeline to **only** that draft's contributing activities.

### Behavior on Click

1. Save current source/temporal filter state to a ref
2. Clear source/temporal filters (override — not AND)
3. Set `selectedDraftId` → compute `filteredActivityIds` from `storyMetadata.activityEdges`
4. Filter timeline to those activity IDs
5. Show filter banner at top of timeline
6. Expand the clicked sidebar card to show full details + CTA
7. Move focus to `DraftFilterBanner`

### Sidebar Card (Selected)

```
┌─ border-2 border-purple-500 bg-purple-50 shadow-lg rounded-xl ───┐
│                                                                    │
│  ★ Led OAuth2 Security Overhaul                         [✕ Clear] │
│                                                                    │
│  ⊙⊙⊙⊙  ·  Showing 7 of 20 activities                             │
│                                                                    │
│  [Security] [Authentication] [Mobile] [Architecture]               │
│                                                                    │
│  ──────────────────────────────────────────────────────────────    │
│                                                                    │
│  Designed and implemented PKCE-based OAuth2 flow for               │
│  mobile clients, conducted security review, and                    │
│  coordinated cross-team rollout affecting 3 microservices.         │
│                                                                    │
│  ┌── Key Impact ──────────────────────────────────────────────┐    │
│  │ • Secured OAuth flow for 50K+ mobile users                 │    │
│  │ • 95% reduction in auth-related security tickets           │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  [Create Story →]   ·   [Re-enhance with AI ✨]          │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Visual:**
- `border-2 border-purple-500 bg-purple-50 shadow-lg`
- Full description (no line-clamp)
- All topic chips visible
- Impact highlights with metric highlighting (`highlightMetrics()` — existing)
- **CTA visible only in selected state** — prominent purple button
- Re-enhance button: shown when `description` exists AND story is not published AND `onRegenerateNarrative` callback provided (matches existing `InlineDraftCard` gating at `activity-stream.tsx:523`)
- `[✕ Clear]` top-right to deselect

**Empty description/impact state (selected card):**
When `storyMetadata.description` is null and `impactHighlights` is empty/undefined (e.g., clustering ran but LLM enhancement hasn't completed yet), the selected card shows:

```
┌─ border-2 border-purple-500 bg-purple-50 shadow-lg rounded-xl ───┐
│                                                                    │
│  ★ Led OAuth2 Security Overhaul                         [✕ Clear] │
│                                                                    │
│  ⊙⊙⊙⊙  ·  Showing 7 of 20 activities                             │
│                                                                    │
│  [Security] [Authentication] [Mobile] [Architecture]               │
│                                                                    │
│  ──────────────────────────────────────────────────────────────    │
│                                                                    │
│  No summary generated yet.                                         │  ← italic, text-gray-400
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  [Create Story →]                                        │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- Placeholder: `text-xs text-gray-400 italic` — "No summary generated yet." (matches existing `InlineDraftCard` pattern at `activity-stream.tsx:564-566`)
- No "Re-enhance" button (no description to enhance)
- "Create Story" CTA still available — the wizard generates narrative from raw activities regardless

### Other Sidebar Cards (While One Is Selected)

```
┌─ bg-gray-50 border border-gray-200 rounded-xl ───────┐
│  Draft ★  Dashboard Perf Optimization                  │  ← muted but readable
│  5 activities                                          │
└────────────────────────────────────────────────────────┘
```

- `bg-gray-50 text-gray-500` (title and metadata) — 4.6:1 contrast on `bg-gray-50`, passes WCAG AA
- NOT `text-gray-400` for metadata (2.9:1 on `bg-gray-50` — fails WCAG AA)
- NOT `opacity-50` (contrast failure) or `border-dashed` (looks like a bug)
- Still clickable — switches selection

### Timeline (Filtered)

Filter banner at top:

```
┌─ bg-purple-50 border border-purple-200 rounded-lg p-3 ───────────┐
│  Showing 7 activities for: OAuth2 Security Overhaul   [✕ Clear]   │
│  Source and time filters paused while viewing story.               │
└───────────────────────────────────────────────────────────────────┘
```

Filtered activity groups:

```
  ┌─ Today ─── 3 of 5 activities ─────────────────────────┐
  │                                                        │
  │  ● GitHub PR #342 — feat: add OAuth2 PKCE flow         │
  │  ● Jira AUTH-1204 — Implement SSO integration          │
  │  ● Slack #backend — Shared architecture decision doc   │
  │                                                        │
  └────────────────────────────────────────────────────────┘

  ┌─ Yesterday ─── 1 of 4 activities ─────────────────────┐
  │                                                        │
  │  ● Slack #incidents — Helped debug Redis issue          │
  │                                                        │
  └────────────────────────────────────────────────────────┘
```

**Behavior:**
- Non-contributing activities: `display: none`
- Group headers show filtered count: `"3 of 5 activities"`
- Groups with 0 matches: hidden entirely
- `[✕ Clear]` on banner OR sidebar card → deselect, restore saved filters
- `Escape` key → deselect

**Filter architecture:** Filtering lives in `useDraftTimelineInteraction` hook and `JournalListPage`, NOT inside `ActivityStream`. The hook computes `filteredGroups` by filtering each `ActivityGroup.activities` array against `filteredActivityIds`, then dropping empty groups. `JournalListPage` passes the pre-filtered `filteredGroups` to `ActivityStream` via the existing `groups` prop — no new `filterToActivityIds` prop on `ActivityStream`. This keeps `ActivityStream` a pure renderer and avoids mixing filter concerns into the stream component.

```typescript
// In useDraftTimelineInteraction.ts
const filteredGroups = useMemo(() => {
  if (!filteredActivityIds) return null; // null = no draft selected, use original groups
  return groups
    .map(g => ({
      ...g,
      activities: g.activities.filter(a => filteredActivityIds.has(a.id)),
      _originalCount: g.activities.length, // for "3 of 5" header display
    }))
    .filter(g => g.activities.length > 0);
}, [groups, filteredActivityIds]);
```

`JournalListPage` passes `filteredGroups ?? groups` to `ActivityStream`. `CollapsibleGroup` uses `_originalCount` (when present) for the "N of M activities" header.

**Activity count mismatch:**
If draft claims "7 activities" but only 5 are in the loaded timeline range, show:
`"Showing 5 of 7 activities (2 are outside the current time range)"`

### Filter Axis Conflict Resolution

When a draft is selected, **override** source/temporal filters:
1. Save current filter state to `savedFiltersRef`
2. Clear all source and temporal chips
3. Apply draft filter
4. Show "Source and time filters paused" in banner
5. On deselect: restore from `savedFiltersRef`

This avoids the "7 activities in draft but 0 shown because GitHub-only filter hides the Jira ones" confusion.

---

## State Transitions

```
                    click card
  DEFAULT ─────────────────────── SELECTED
     ▲                                │
     │                                │
     │  Escape / ✕ / click same card  │
     │                                │
     └────────────────────────────────┘
```

Two states. That's it.

**Keyboard:**
- `Tab` → navigate between sidebar cards
- `Enter` / `Space` → select focused card (or deselect if already selected)
- `Escape` → deselect, focus returns to previously selected card
- `Tab` from last sidebar card → moves to timeline content

---

## Loading / Empty / Error States

### Sidebar Loading (activities loaded, drafts still loading)

```
┌─ ★ Draft Stories ─────────────────────┐
│                                        │
│  ┌────────────────────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░    │    │  ← shimmer skeleton card
│  │ ░░░░░░░  ·  ░░░░░             │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░░░░           │    │
│  │ ░░░░░  ·  ░░░░░               │    │
│  └────────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

2 skeleton cards: `h-[80px] bg-gray-100 rounded-xl animate-shimmer`

### Zero Drafts (activities exist, clustering hasn't run yet)

```
┌─ ★ Draft Stories ─────────────────────┐
│                                        │
│  Stories form automatically as your    │
│  activities sync. Check back soon.     │
│                                        │
└────────────────────────────────────────┘
```

`bg-purple-50/40 border border-dashed border-purple-200 rounded-xl p-4`
`text-gray-500 text-sm`

### Sidebar Error (storyGroups query failed)

Don't show the sidebar at all. Timeline remains single-column, fully functional.
Log error to console. No user-facing error for a secondary feature.

### Zero Activities + Zero Drafts (brand new user)

Single-column layout. No sidebar. Existing empty state ("No activities found") handles this.

---

## Promotion Flow

### On "Create Story" Click

**"Create Story" opens `StoryWizardModal`** — same as the existing `InlineDraftCard` behavior. It does NOT directly promote. The wizard provides the 3-step flow (Analyze → Questions → Generate) that produces a quality career story.

1. Click "Create Story" → `setStoryWizardEntryId(draft.storyMetadata.id)` → `StoryWizardModal` mounts
2. **Desktop:** Modal overlays on top of the sidebar + timeline. Draft selection stays active (filtered timeline visible behind the modal backdrop). On wizard close without completion: selection preserved, user returns to filtered view.
3. **Mobile:** Bottom sheet closes first (to avoid z-index/focus conflict between sheet and wizard modal), then wizard modal opens. On wizard close: peek bar returns to resting state.
4. **On wizard completion (story created):**
   - Sidebar card border flashes green briefly (`border-green-500`, 500ms transition)
   - Card fades out (`opacity-0 h-0 overflow-hidden transition-all duration-300`)
   - Timeline filter clears, previous filters restored
   - Toast: "Career story created! [View →]" (links to `/stories`)
   - `storyGroups` query invalidated → sidebar updates
   - Focus moves to next sidebar card (or sidebar header if last card)
5. **On wizard error or cancel:**
   - Card stays, CTA re-enabled
   - Selection preserved (desktop) / peek bar visible (mobile)
   - No inline error needed — wizard handles its own error states

### On "Re-enhance" Click

1. CTA shows `Loader2 animate-spin` + "Enhancing..."
2. `disabled:opacity-50` on button
3. **Success:** Description updates in-place (React Query invalidation). Toast: "Draft enhanced!"
4. **Failure:** "Enhancement failed. Try again?" inline error below button

---

## Mobile Layout: Floating Peek Bar + Bottom Sheet

On screens < 1024px (`lg:`), the sidebar becomes a **floating peek bar** pinned to the bottom of the viewport. Tapping it opens a **bottom sheet** with draft story cards. Same spatial separation principle as desktop — activities are the page, stories float above.

### Default: Peek Bar (Collapsed)

```
┌────────────────────────────────┐
│  FilterBar                     │
├────────────────────────────────┤
│                                │
│  ─ Today ────────────────      │
│  ● GitHub PR #342              │
│  ● Jira AUTH-1204              │
│  ● Slack #backend              │
│                                │
│  ─ Yesterday ─────────────     │
│  ● GitHub — WebSocket fix      │
│  ● Jira DASH-892               │
│  ● Figma — onboarding v3      │
│                                │
│  ...                           │
│                                │
├════════════════════════════════┤
│ ★ 3 Draft Stories         ▲   │  ← floating peek bar
└────────────────────────────────┘
```

**Peek bar visual:**
- `fixed bottom-0 left-0 right-0 z-30`
- `bg-white border-t border-purple-200 shadow-lg`
- `px-4 py-3 flex items-center justify-between`
- Left: `★` icon + "N Draft Stories" (`text-sm font-semibold text-purple-700`)
- Right: `ChevronUp` icon (`w-4 h-4 text-purple-400`)
- Tap target: entire bar
- Add `pb-[60px]` to `ActivityStream` container so bottom activities aren't hidden behind the bar

**Peek bar states:**
- `storyGroups.length === 0`: bar hidden entirely
- `storyGroups.length > 0`: bar visible
- Bottom sheet open: bar transforms into sheet header (no separate bar behind it)

### Expanded: Bottom Sheet with Draft Cards

```
┌────────────────────────────────┐
│  Timeline (visible, scrollable)│
│  ─ Today ────────────────      │
│  ● GitHub PR #342              │
│  ● Jira AUTH-1204              │
│                                │
├════════════════════════════════┤
│  ───── (drag handle) ─────    │
│                                │
│  ★ Draft Stories          ▼   │  ← header row (tap ▼ to collapse)
│                                │
│  ┌──────────────────────────┐  │
│  │ Draft ★                  │  │
│  │ Led OAuth2 Security      │  │
│  │ Overhaul                 │  │
│  │ ⊙⊙⊙⊙ · 7 activities     │  │
│  │ [Security] [Auth]        │  │
│  │           [Create Story →]│ │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ Draft ★                  │  │
│  │ Dashboard Perf           │  │
│  │ Optimization             │  │
│  │ ⊙⊙⊙ · 5 activities      │  │
│  │ [Perf] [Frontend]        │  │
│  │           [Create Story →]│ │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ Draft ★                  │  │
│  │ API Rate Limiting        │  │
│  │ ⊙⊙⊙ · 4 activities      │  │
│  │ [Infra] [Redis]          │  │
│  │           [Create Story →]│ │
│  └──────────────────────────┘  │
│                                │
└────────────────────────────────┘
```

**Bottom sheet behavior:**
- Reuse extracted `MobileSheet` from `src/components/ui/mobile-sheet.tsx`
  - Backdrop: `bg-black/50`
  - Sheet: `absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl`
  - Drag handle: `w-10 h-1 bg-gray-300 rounded-full` centered
  - **`maxHeightVh` prop** (default: `85`): Timeline page passes `85`, CareerStoriesPage keeps its current `50` (via existing `MOBILE_SHEET_MAX_HEIGHT_VH` constant). This prevents breaking CareerStoriesPage when the shared component is extracted.
  - Content: `overflow-y-auto`
- Escape key or backdrop tap → close sheet, show peek bar
- Draft cards inside sheet use **compact `SidebarDraftCard`** (same component, just full-width)
- **CTA visible on every card** in the sheet (unlike desktop where CTA only shows on selected) — on mobile there's no "selected" state, just browse + act
- No click-to-filter on mobile — screen too small for split experience
- Tap "Create Story" → close bottom sheet first (to avoid z-index/focus conflict), then open `StoryWizardModal`. On wizard close/cancel: peek bar returns to resting state. On wizard completion: card removed from sheet, peek bar count decrements.

### Mobile Draft Card (Inside Sheet)

Same as desktop `SidebarDraftCard` but with these differences:
- Full width (no sidebar constraint)
- CTA always visible (not gated behind selection)
- Tap card → expand to show description + impact highlights (reuse `InlineDraftCard` expand behavior)
- Tap "Create Story" → `onPromoteToCareerStory` (same as desktop)

```
┌─ border-l-4 border-l-purple-400 w-full ──────────────────┐
│                                                            │
│  Draft ★                                                   │
│                                                            │
│  Led OAuth2 Security Overhaul                      ▶      │  ← tap to expand
│                                                            │
│  ⊙⊙⊙⊙  ·  7 activities  ·  Jan 14 – Feb 24               │
│                                                            │
│  [Security] [Auth] +2           [Create Story →]          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Mobile Loading / Empty States

**Loading (drafts loading):** Peek bar shows shimmer: `★ ░░░░░░░░░░░░░` (single line shimmer, not skeleton cards)

**Zero drafts:** Peek bar hidden. No floating element. Full-screen activity timeline.

**Error:** Peek bar hidden. Fail silently.

### Mobile Promotion Flow

1. Tap "Create Story" → bottom sheet closes → `StoryWizardModal` opens full-screen
2. **Wizard completion (story created):** count updates in peek bar ("2 Draft Stories"), toast appears. If sheet reopened, promoted card is gone.
3. **Wizard cancel/error:** peek bar returns to resting state, sheet can be reopened with all cards intact
4. If last draft promoted → peek bar disappears (count = 0)

### Implementation

```tsx
// Hook: filtering lives here, not in ActivityStream
const { filteredGroups, selectedDraftId, ...draftInteraction } =
  useDraftTimelineInteraction(storyGroups, groups);

{/* Desktop: sidebar */}
<div className="lg:grid lg:grid-cols-[1fr,300px] lg:gap-6">
  <div>
    <ActivityStream
      groups={filteredGroups ?? groups}  // pre-filtered, no filter prop on ActivityStream
      ...
    />
  </div>
  <aside className="hidden lg:block" aria-label="Draft Stories">
    <DraftStorySidebar ... />
  </aside>
</div>

{/* Mobile: floating peek bar + bottom sheet */}
<div className="lg:hidden">
  {storyGroups.length > 0 && (
    <>
      <DraftPeekBar
        count={storyGroups.length}
        isOpen={mobileSheetOpen}
        onTap={() => setMobileSheetOpen(true)}
      />
      <MobileSheet
        isOpen={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        maxHeightVh={85}  // CareerStoriesPage uses 50
      >
        <DraftSheetContent
          drafts={storyGroups}
          onPromote={handlePromoteToCareerStory}  // opens StoryWizardModal
          onRegenerate={onRegenerateNarrative}
        />
      </MobileSheet>
    </>
  )}
</div>
```

**Removes the pill toggle entirely.** The floating peek bar replaces the Activities/Drafts tab switcher. Activities are always the main view. Drafts float above as a persistent entry point.

---

## SSE / Real-Time Sync Handling

When SSE fires `data-changed` during a draft selection:

1. `useActivities()` refetches — new activities may appear
2. `storyGroups` refetches — draft may gain new activities
3. **Selected draft still exists:** `filteredActivityIds` recomputed via `useMemo` dependency. Filter adjusts automatically.
4. **Selected draft gone** (promoted or deleted externally): Clear selection, toast "This draft was updated. Showing all activities."
5. **New drafts appearing:** Append to sidebar, no animation needed.

---

## Visual Design Tokens

| Element | Token | Value |
|---------|-------|-------|
| Draft card border-left | `border-l-purple-400` | `#a78bfa` |
| Selected border | `border-purple-500` | `#8b5cf6` |
| Selected bg | `bg-purple-50` | `#faf5ff` |
| Draft badge text | `text-purple-700` | `#6d28d9` |
| CTA button | `bg-purple-600` | `#7c3aed` |
| CTA hover | `bg-purple-700` | `#6d28d9` |
| Muted card bg | `bg-gray-50` | `#f9fafb` |
| Muted card title | `text-gray-500` | `#6b7280` (4.6:1 contrast on `bg-gray-50` — WCAG AA) |
| Muted card metadata | `text-gray-500` | `#6b7280` (4.6:1 — same as title for WCAG AA compliance) |
| Filter banner bg | `bg-purple-50` | `#faf5ff` |
| Filter banner border | `border-purple-200` | `#e9d5ff` |
| Skeleton shimmer | `animate-shimmer` | existing keyframe |
| Transition duration | `duration-200` | 200ms |
| Promotion success | `border-green-500` | `#22c55e` |
| Error text | `text-red-600` | `#dc2626` |
| Peek bar bg | `bg-white` | `#ffffff` |
| Peek bar border | `border-t border-purple-200` | `#e9d5ff` |
| Peek bar text | `text-purple-700` | `#6d28d9` |
| Peek bar shadow | `shadow-lg` | box-shadow elevation |
| Sheet backdrop | `bg-black/50` | 50% opacity black |
| Sheet bg | `bg-white rounded-t-2xl` | standard sheet |
| Sheet max height | `85vh` | leaves timeline visible |

---

## Component Architecture

### New Components

**Desktop:**

1. **`DraftStorySidebar`** (~150 lines)
   - Props: `drafts: ActivityGroup[]`, `selectedId: string | null`, `isLoading: boolean`, `onSelect: (id: string | null) => void`, `onPromote: (id: string) => void`, `onRegenerate: (id: string) => void`
   - Renders: header, first-time banner, skeleton/empty states, draft cards, footer hint
   - `sticky top-6 self-start`

2. **`SidebarDraftCard`** (~180 lines)
   - Props: `draft: ActivityGroup`, `isSelected: boolean`, `isMuted: boolean`, `onSelect: () => void`, `onPromote: () => void`, `onRegenerate?: () => void`, `promotionState: 'idle' | 'loading' | 'error'`, `showCTA?: boolean`
   - Two visual states: resting (compact) and selected (expanded with CTA + description + impact + empty state)
   - Reuses existing `DraftBadge` (with `animate: false`)
   - Shared between desktop sidebar and mobile sheet (with `showCTA={true}` on mobile)
   - ~180 lines accounts for: resting state, selected state, empty description state, source icon stack, topic chips, CTA + loading/error, accessibility attributes

3. **`DraftFilterBanner`** (~30 lines)
   - Props: `draftTitle: string`, `matchCount: number`, `totalCount: number`, `missingCount: number`, `onClear: () => void`
   - `role="status"` + `aria-live="polite"`

**Mobile:**

4. **`DraftPeekBar`** (~50 lines)
   - Props: `count: number`, `isLoading: boolean`, `onTap: () => void`
   - `fixed bottom-0 left-0 right-0 z-30 lg:hidden`
   - Shows `★ N Draft Stories ▲` or shimmer loading state
   - Hidden when `count === 0`

5. **`DraftSheetContent`** (~60 lines)
   - Props: `drafts: ActivityGroup[]`, `onPromote: (id: string) => void`, `onRegenerate?: (id: string) => void`
   - Renders draft cards inside existing `MobileSheet` (from `CareerStoriesPage.tsx`)
   - Each card: `SidebarDraftCard` with `showCTA={true}` and full-width styling
   - Tap card to expand (description + impact), tap "Create Story" to promote

### Modified Components

1. **`ActivityStream`** — NO new filter prop. Receives pre-filtered `groups` from `JournalListPage` (filtering happens in `useDraftTimelineInteraction` hook). Remove pill toggle and `storyGroups` prop (pill toggle removed entirely — replaced by peek bar on mobile, sidebar on desktop). `ActivityStream` becomes a pure renderer of whatever groups it receives.
2. **`CollapsibleGroup`** — add optional `originalCount` prop for "N of M activities" header display when draft filter is active (reads from `_originalCount` injected by `useDraftTimelineInteraction`)
3. **`JournalListPage`** — add two-column grid (desktop), floating peek bar + sheet state (mobile), draft interaction state
4. **`MobileSheet`** — extract from `CareerStoriesPage.tsx` into `src/components/ui/mobile-sheet.tsx` for reuse. Add `maxHeightVh?: number` prop (default: `85`). CareerStoriesPage passes `50` to preserve its current behavior.

### State Management

```typescript
// src/hooks/useDraftTimelineInteraction.ts

export function useDraftTimelineInteraction(
  storyGroups: ActivityGroup[],
  activityGroups: ActivityGroup[]  // temporal groups from useActivities({ groupBy: 'temporal' })
) {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const savedFiltersRef = useRef<SavedFilterState | null>(null);

  const selectedDraft = useMemo(
    () => storyGroups.find(g => g.key === selectedDraftId) ?? null,
    [selectedDraftId, storyGroups]
  );

  const filteredActivityIds = useMemo(() => {
    if (!selectedDraft?.storyMetadata?.activityEdges) return null;
    return new Set(selectedDraft.storyMetadata.activityEdges.map(e => e.activityId));
  }, [selectedDraft]);

  // Pre-filtered groups for ActivityStream — filtering lives HERE, not in ActivityStream
  const filteredGroups = useMemo(() => {
    if (!filteredActivityIds) return null; // null = no draft selected, use original groups
    return activityGroups
      .map(g => ({
        ...g,
        activities: g.activities.filter(a => filteredActivityIds.has(a.id)),
        _originalCount: g.activities.length, // for "3 of 5" header display in CollapsibleGroup
      }))
      .filter(g => g.activities.length > 0);
  }, [activityGroups, filteredActivityIds]);

  // Handle draft disappearing after SSE refresh
  useEffect(() => {
    if (selectedDraftId && !storyGroups.some(g => g.key === selectedDraftId)) {
      setSelectedDraftId(null);
      // toast notification
    }
  }, [selectedDraftId, storyGroups]);

  return {
    selectedDraftId, setSelectedDraftId,
    selectedDraft, filteredActivityIds, filteredGroups,
    savedFiltersRef
  };
}
```

**Usage in JournalListPage:**
```typescript
const { filteredGroups, ...draftInteraction } = useDraftTimelineInteraction(storyGroups, groups);

// Pass pre-filtered groups to ActivityStream
<ActivityStream groups={filteredGroups ?? groups} ... />
```

---

## Data Requirements

### Existing Data (No New Backend Endpoints)

- `storyGroups` from `useActivities({ groupBy: 'story' })` — `ActivityGroup[]` with `storyMetadata.activityEdges`
- Each `activityEdges` entry: `{ activityId: string, type: ActivityStoryEdgeType }`
- Each `Activity` has `storyId` and `storyTitle` (reverse lookup)

### Client-Side Computation

The `draftActivityMap` is a one-liner derived from `storyGroups`:
```typescript
new Map(storyGroups.map(g => [g.key, g.storyMetadata?.activityEdges?.map(e => e.activityId) ?? []]))
```

### Data Gaps (honest)

- If clustering hasn't run yet after first sync, `activityEdges` will be empty. Draft cards show "0 activities" until clustering completes (~60s after sync).
- The `storyMetadata.activityEdges` field comes from the clustering pipeline, not a dedicated API endpoint.

---

## Accessibility

### Sidebar
- `<aside aria-label="Draft Stories">`
- Cards: `role="button"`, `tabIndex={0}`, `aria-pressed={isSelected}`, `aria-expanded={isSelected}`
- Keyboard: `Enter`/`Space` to select/deselect

### Focus Management
- **Select draft** → focus moves to `DraftFilterBanner` ref
- **Deselect** (Escape/clear) → focus returns to the sidebar card (saved ref)
- **Promotion success** → focus moves to next sidebar card, or sidebar header if last
- **Promotion failure** → focus stays on card, error message announced

### Mobile (Peek Bar + Sheet)
- Peek bar: `role="button"`, `aria-label="Open draft stories. N drafts available."`, `aria-expanded={sheetOpen}`
- Bottom sheet: `role="dialog"`, `aria-modal="true"`, `aria-label="Draft Stories"`
- Escape key closes sheet
- Focus trapped within sheet when open (existing `MobileSheet` pattern handles this)
- On sheet close: focus returns to peek bar

### Screen Reader Announcements
- Desktop select: "Showing 7 activities for OAuth2 Security Overhaul. Source and time filters paused."
- Desktop deselect: "Filters restored. Showing all 20 activities."
- Mobile sheet open: "Draft stories sheet opened. 3 drafts available."
- Mobile sheet close: "Draft stories sheet closed."
- Promote success: "Career story created for OAuth2 Security Overhaul."
- Promote failure: "Could not create story. Retry button available."

### Contrast
- Muted card title: `text-gray-500` on `bg-gray-50` = 4.6:1 (WCAG AA pass)
- Muted card metadata: `text-gray-500` on `bg-gray-50` = 4.6:1 (WCAG AA pass — NOT `text-gray-400` which is 2.9:1)
- Peek bar text: `text-purple-700` on `bg-white` = 7.8:1 (excellent)
- No `opacity-40` anywhere

### Motion
- `prefers-reduced-motion`: skip card transitions, instant state changes
- Bottom sheet: no `animate-slide-up` when reduced motion preferred — instant render

---

## Implementation Plan

| Step | Scope | Effort |
|------|-------|--------|
| **1** | Two-column layout + responsive breakpoint + sidebar skeleton/empty states | 1d |
| **2** | `SidebarDraftCard` (resting + selected states) + `DraftStorySidebar` container | 1d |
| **3** | Click-to-filter + `DraftFilterBanner` + filter axis override/restore | 1.5d |
| **4** | Promotion flow (optimistic UI, success/failure, toast) + re-enhance | 0.5d |
| **5** | Mobile: Extract `MobileSheet` to shared component, build `DraftPeekBar` + `DraftSheetContent` | 1d |
| **6** | Mobile: peek bar loading/empty states, promotion within sheet, auto-close on last promote | 0.5d |
| **7** | Remove pill toggle, first-time banner, keyboard nav, focus management, a11y | 0.5d |

**Total: 6 days**

### Future (deferred, needs validation)

| Feature | Gate |
|---------|------|
| Hover → highlight activities | Users report wanting to "preview" before clicking. Performance: wrap `ActivityCard` in `React.memo` with highlight callback via context. |
| Expand view + activity rail | >30% of sidebar clicks lead to "Create Story". Rail click highlights mention in text (not scroll-to-section — drafts have flat `fullContent`). No CSS Grid animation (Safari). Use Framer Motion or instant swap. |

---

## Decisions Made

| Question | Decision | Rationale |
|----------|----------|-----------|
| Inline cards vs sidebar | **Sidebar** | Core insight: spatial separation creates clear distinction |
| Mobile pattern | **Floating peek bar + bottom sheet** | Same spatial separation: activities are the page, stories float above. Like a music player mini-bar. |
| Pill toggle (Activities/Drafts) | **Removed entirely** | Replaced by sidebar (desktop) and peek bar (mobile). No more hidden tab. |
| Hover state | **Cut** | GSE: redundant with click-to-filter, performance cost on production `ActivityCard` |
| Expand state | **Deferred** | Needs validation. No data model for scroll-to-section. |
| State management | **Extracted hook** `useDraftTimelineInteraction.ts` | No ambiguity |
| URL state `?draft=ds1` | **Cut** | Not needed for MVP. Filter state lost on refresh — accepted trade-off. |
| Max sidebar cards | **10** + progressive batches of 10 | Matches `CollapsibleGroup` `previewLimit` pattern. Prevents DOM bloat in sticky 300px sidebar. |
| Source icon stack | **Max 4** + `+N` overflow | Prevents unusable stack with 8+ sources |
| DraftBadge animation | **Static** (`animate: false`) | 10 simultaneous animations = paint storm |
| Filter conflict | **Override** (suspend source/temporal) | AND produces 0-result confusion |
| CTA placement | **Desktop: selected state only. Mobile: always visible** | Desktop: resting CTA competed with card click. Mobile: no "selected" state, browse + act. |
| Dimmed cards | **`text-gray-500 bg-gray-50`** (title AND metadata) | WCAG AA: `text-gray-400` on `bg-gray-50` = 2.9:1 (fails). `text-gray-500` = 4.6:1 (passes). |
| Double-click | **No** | Undiscoverable in web UIs |
| Mobile click-to-filter | **No** | Screen too small for split filter experience. Draft cards expand inline in sheet instead. |
| `MobileSheet` reuse | **Extract to `ui/mobile-sheet.tsx`** with `maxHeightVh` prop | Currently embedded in `CareerStoriesPage.tsx` at 50vh. Timeline needs 85vh. Prop prevents breaking existing usage. |
| "Create Story" flow | **Opens `StoryWizardModal`** (not direct promote) | Matches existing `InlineDraftCard` behavior. Wizard provides 3-step quality flow. Mobile: sheet closes first to avoid z-index conflict. |
| Filter architecture | **Pre-filter in hook, not in `ActivityStream`** | `useDraftTimelineInteraction` computes `filteredGroups`; `ActivityStream` receives pre-filtered `groups`. Keeps stream as pure renderer. |
| Re-enhance gating | **Show when: description exists + not published + callback provided** | Matches existing `InlineDraftCard` gating (`activity-stream.tsx:523`). No separate flag needed. |
| First-time banner dismissal | **"Got it" click only** — no auto-fade | Auto-dismissing educational content before the user reads it is hostile. |
| storyGroups fetch timing | **Keep existing deferred gating** (`enabled: !activitiesLoading`) | Sidebar shows skeleton while loading. No change to query logic — just always consumed now. |

---

## References

- **V10 Prototype** (`timeline-prototypes/V10.tsx`): Sidebar + inline activation — layout and interaction pattern
- **V1 Prototype** (`timeline-prototypes/V1.tsx`): Interleaved feed with hover — informed hover-cut decision
- **Existing `InlineDraftCard`** (`activity-stream.tsx:278-601`): Content/layout reference for `SidebarDraftCard`
- **Existing `DraftBadge`** (`activity-stream.tsx:292-326`): Reused with `animate: false`
- **Existing `CollapsibleGroup`** (`ui/collapsible-group.tsx`): Modified for filtered count

---

## Review Issues Addressed (v3 → v4)

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | `storyGroups` fetch gating — sidebar won't populate if deferred | Keep existing `{ enabled: !activitiesLoading }` — sidebar shows skeleton during load. Pill toggle removal means data is always consumed, no behavioral change needed. |
| 2 | `filterToActivityIds` mixes filter logic into `ActivityStream` | Moved filtering to `useDraftTimelineInteraction` hook. Hook produces `filteredGroups`. `ActivityStream` receives pre-filtered `groups` — no new filter prop. |
| 3 | "Create Story" flow ambiguous — wizard or direct promote? | Clarified: opens `StoryWizardModal` (matches existing `list.tsx:432-435`). Mobile: bottom sheet closes first to avoid z-index/focus conflict. Desktop: wizard overlays filtered view. |
| 4 | Muted card `text-gray-400` metadata fails WCAG AA (2.9:1) | Bumped to `text-gray-500` (4.6:1). Updated design tokens table, contrast section, and decisions table. |
| 5 | Selected card with null description/impact — no empty state | Added explicit empty state: "No summary generated yet." (italic gray, matches `activity-stream.tsx:564-566` pattern). No Re-enhance button when no description. Create Story CTA still available. |
| 6 | Re-enhance button always shows if prop is passed | Specified 3-condition gating: `description` exists + `!isPublished` + callback provided. Matches existing `InlineDraftCard` gating at `activity-stream.tsx:523`. |
| 7 | First-time banner 10s auto-fade is hostile | Removed auto-fade. Dismissed on "Got it" click only. |
| 8 | `MobileSheet` extraction — max height mismatch (50vh vs 85vh) | Added `maxHeightVh` prop (default: 85). CareerStoriesPage passes 50 to preserve current behavior. |
| 9 | "Show N more" loads all remaining cards at once | Progressive disclosure in batches of 10 (matches `CollapsibleGroup` `previewLimit` pattern). `visibleCount` state in `DraftStorySidebar`. |
| 10 | Sidebar behavior when scrolled past all activities | Documented: sidebar stays pinned (expected — persistent nav element, not spatially anchored to activity groups). |
| N1 | `SidebarDraftCard` ~100 lines underestimates | Updated to ~180 lines (resting + selected + empty state + a11y). |
| N2 | `savedFiltersRef` lost on page refresh | Documented as accepted trade-off (no `?draft=` URL param — cut for MVP). |
| N3 | Skeleton count (2) may mismatch actual draft count | Accepted — lightweight metadata endpoint not worth the complexity. Minor visual jump on load. |
