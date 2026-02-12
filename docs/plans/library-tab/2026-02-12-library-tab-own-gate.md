# OWN Gate — Library Tab

> **OWN verifies code ownership before committing.** Every line changed must have a named reason. Every file touched must be justified. No drive-by cleanups, no "while I was in there" edits.

## Files I Will Create

| File | Why it exists | Who asked for it |
|---|---|---|
| `src/components/career-stories/LibraryCard.tsx` | Card component for library items. No existing component renders `StoryDerivation` in a list context — `DerivationPreview` is for modal detail, `StoryCard` is for `CareerStory`. New type needs new card. | Plan Step 3 |
| `src/components/career-stories/LibraryDetail.tsx` | Detail view for selected library item. No existing component composes `DerivationPreview`/`SimpleMarkdown` with back-nav + actions outside a modal. This is the "right panel" equivalent of `NarrativePreview` but for derivations. | Plan Step 4 |
| `src/components/career-stories/LibraryCard.test.tsx` | Tests for LibraryCard. 8 named test cases. | Plan Step 6 |
| `src/components/career-stories/LibraryDetail.test.tsx` | Tests for LibraryDetail. 7 named test cases. | Plan Step 6 |

## Files I Will Modify

| File | What changes | Why | Blast radius |
|---|---|---|---|
| `src/hooks/useCareerStories.ts` | Add `useSingleDerivations()` hook (5 lines). Fix `useDeriveStory()` onSuccess to invalidate `derivations-by-kind/single` (1 line). | Hook mirrors existing `usePackets()`. Bug fix: new single derivations don't appear in Library without manual refresh. | **Low.** New hook is additive. Invalidation fix is a missing query key — adds a cache bust, doesn't change mutation behavior. No existing consumer affected. |
| `src/components/career-stories/constants.ts` | Add `PACKET_TYPE_META` record (~25 lines). Add `blue` and `purple` entries to `DERIVATION_COLOR_CLASSES` (~2 lines). | Constants needed by LibraryCard for type→icon/color resolution. Currently private in `PromotionPacketModal.tsx`. Follows same pattern as existing `DERIVATION_TYPE_META`. | **None.** Pure additions. No existing code references these new exports yet. |
| `src/components/career-stories/PromotionPacketModal.tsx` | Delete local `PACKET_TYPE_META` (~35 lines). Add import from `constants.ts`. | Deduplicate. Single source of truth for packet type metadata. Verified: modal destructures only `label`, `description`, `loadingText` — extra fields (`Icon`, `color`) are ignored by TypeScript. | **Low.** Same data, different import path. Modal behavior unchanged. |
| `src/components/career-stories/CareerStoriesPage.tsx` | Add tab toggle JSX, URL-driven tab/item state, library list/detail rendering, escape handler extension, mobile sheet for library detail. | Core wiring. This is the page that needs a second tab. | **Medium.** Largest change. Mitigated by: all Stories tab JSX gated behind `pageTab === 'stories'` — zero render changes when tab is 'stories'. New code only executes in 'library' branch. |

## Files I Will NOT Touch

| File | Why not |
|---|---|
| Backend (`*.controller.ts`, `*.service.ts`, `*.routes.ts`) | No backend changes needed. `GET /derivations?kind=single` and `DELETE /derivations/:id` already exist and return the right shape. Verified. |
| `DerivationPreview.tsx` | Used as-is inside `LibraryDetail`. No modifications needed — it accepts `derivation`, `text`, `isGenerating`, `charCount`, `wordCount` which are all available from `StoryDerivation`. |
| `SimpleMarkdown.tsx` | Used as-is for packet rendering. No modifications. |
| `StoryCard.tsx` | Stories tab card. Unrelated to Library tab. |
| `NarrativePreview.tsx` | Stories tab detail. Unrelated to Library tab. |
| `DerivationModal.tsx` | Used as-is for Regenerate action. Not modified, just opened from LibraryDetail. Future: may add `onSavedToLibrary` callback prop for cross-flow toast, but that's a prop addition, not a behavior change — and it's optional (toast works without deep-link). |
| `PromotionPacketModal.tsx` (beyond import) | Only change is swapping import source. No behavior changes. |
| Database schema / migrations | Phase A uses existing data only. Schema changes deferred to Phase B. |

## Data Flow Ownership

```
useSingleDerivations() ──→ LibraryCard[] ──click──→ LibraryDetail
usePackets() (existing) ──→ LibraryCard[] ──click──→ LibraryDetail

LibraryDetail ──copy──→ clipboard (no mutation)
LibraryDetail ──delete──→ useDeleteDerivation() (existing hook, existing endpoint)
LibraryDetail ──regenerate──→ opens DerivationModal/PacketModal (existing modals)
LibraryDetail ──navigate──→ setSearchParams({storyId}) (existing Stories tab handler)
```

No new data flows are created. All mutations use existing hooks. All API calls use existing endpoints. The Library tab is a **read-only view** with three actions (copy, delete, regenerate) that all delegate to existing infrastructure.

## What I Am NOT Doing (scope boundary)

- No new API endpoints
- No new database tables or columns
- No changes to derivation/packet generation logic
- No changes to how DerivationModal or PacketModal work internally
- No analytics instrumentation (deferred, TODO filed)
- No type filter chips or search
- No changes to Stories tab behavior
- No changes to the journal page
- No CSS framework changes or new dependencies
