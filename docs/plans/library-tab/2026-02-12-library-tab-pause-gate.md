# PAUSE Gate — Library Tab

> **PAUSE verifies design understanding before implementing.** Close the docs. Can you explain what you're building, why each decision was made, and what the tradeoffs are? If you can't explain it without looking, you don't understand it well enough to build it.

---

## 1. What am I building?

A second tab on the Career Stories page called "Library" that shows every saved derivation (interview answers, LinkedIn posts, resume bullets) and packet (promotion cases, annual reviews, skip-level briefs) as a flat card list with a detail panel.

Today these deliverables are generated inside modals and then disappear. The only way to find them again is to open the same modal and scroll through versions. Library gives them a home — a place to browse, copy, delete, and regenerate.

## 2. Who is it for?

Someone preparing for a specific event — a promotion cycle, an interview loop, a skip-level meeting. They've already generated outputs from their stories. Now they need to *find* the right one, *copy* it into the right place, and occasionally *regenerate* it with fresh context.

The primary interaction is: scan → find → copy. Delete and regenerate are secondary.

## 3. Why "Library" and not "Playbook"?

"Playbook" implies strategy, curation, a carefully assembled plan of attack. That's not what this is. This is a flat list of things you made, sorted by date. Calling it a "playbook" would set expectations the feature can't meet. "Library" is honest — it's a collection. You browse it, you take what you need, you leave.

## 4. Why not a separate page?

The Library items are derivatives of stories. They make sense in context of the Career Stories page because:
- The "Use As" dropdown (which creates these items) lives on this page
- Users mentally associate "my career stories work" with this page
- A separate route would fragment navigation for a feature with 5-50 items
- The tab pattern already exists conceptually (Stories page has Category/Timeline toggles)

## 5. Why URL-driven state instead of `useState`?

Single source of truth. If tab state lives in `useState`, you can't share a link to the Library tab, and refreshing the page loses your position. `?tab=library&itemId=abc` is bookmarkable, shareable, and survives refresh.

The existing page already uses `useSearchParams` for `?storyId=` and `?clusterId=`, so this follows the established pattern rather than introducing a parallel state mechanism.

## 6. Why `replace: true` everywhere?

This means browser Back doesn't step through item selections within the Library — it exits entirely. This is the same behavior as the existing Stories tab (clicking story A, then B, then C — Back exits the page, doesn't step through C→B→A).

The tradeoff: power users who want to compare items by navigating back-and-forth lose that ability. But the alternative (pushing to history) would create a confusing history stack where Back sometimes changes the selected item and sometimes changes the page. Consistency wins.

This is a deliberate design choice, not an oversight.

## 7. Why two separate queries (`usePackets` + `useSingleDerivations`) instead of one?

Because the backend already has `GET /derivations?kind=packet` and `GET /derivations?kind=single` as separate endpoints, and `usePackets()` already exists and is used by the existing PacketModal. If I created a single `useAllDerivations()` hook, I'd either:
- Duplicate the packet data in cache (packets fetched twice — once by PacketModal, once by Library)
- Need to restructure PacketModal to share the combined query (scope creep)

Two queries with separate cache keys means PacketModal keeps working as-is, and the Library composes both. React Query handles the deduplication — if both are in cache, the merge in `useMemo` is free.

The tradeoff: two loading states and two error states instead of one. That's why the plan has partial failure handling — show what loaded, banner for what didn't.

## 8. Why no type filter chips in v1?

With 5-30 items, filtering is overhead. You can scan 20 cards in 3 seconds. A filter bar with 10 type options would take more screen space than the cards it filters. The decision to add filters should be driven by actual usage data showing users have >20 items and are struggling to find specific ones.

The tradeoff: if a power user generates 50+ items quickly, the list becomes a junk drawer. That's acceptable for v1 — we'll add filters when (if) usage data shows it's needed.

## 9. Why content-first in the detail view?

ET's core principle: "above all else, show the data." The deliverable text *is* the data. A user opens the detail view because they want to read/copy the text they generated. Metadata (type, date, word count, source stories) is reference information — it supports the content, it doesn't precede it.

The original plan had a multi-line metadata header above the content. ET pointed out that for a 142-word interview answer, the metadata could push the actual text below the fold. Compressing metadata to one line means the content is always visible immediately.

## 10. Why Copy as primary, Delete/Regenerate in dropdown?

Copy is the happy path — 80%+ of detail view interactions will be "copy this and paste it somewhere." It should be one click.

Delete and Regenerate are destructive/expensive. Delete removes the item permanently. Regenerate costs credits and opens a modal. Neither should be equally prominent as Copy because:
- Accidental delete is worse than accidental copy
- Regenerate requires further decisions (modal opens)
- Visual weight signals frequency of use

The tradeoff: Regenerate is slightly harder to discover. Acceptable — users who want to regenerate already know the flow (they originally generated through a modal).

## 11. Why navigate-then-delete (not delete-then-navigate)?

React Query cache invalidation is async. If you call `deleteDerivationMutation.mutateAsync(id)` while the URL still has `?itemId=id`, there's a race condition window where:
1. React Query removes the item from `libraryItems`
2. `selectedLibraryItem` becomes `null` (computed from `libraryItems.find(...)`)
3. The detail view tries to render with a null item → flash of empty/error state
4. Then URL updates → list view renders

Navigating first (`onBack()` → URL clears `itemId` → list renders → *then* delete fires) avoids this entirely. The user sees the list immediately while the deletion happens in the background. The item disappears from the list when the cache invalidates, which is the natural React Query behavior.

The tradeoff: if the delete fails, the item reappears in the list (cache refetch). This is actually correct behavior — it means deletion is optimistically navigated but pessimistically retained. No data loss from a failed delete.

## 12. What are the LibraryCard data resolution rules?

```
item.kind === 'single' → look up DERIVATION_TYPE_META[item.type]
item.kind === 'packet' → look up PACKET_TYPE_META[item.type]
neither found → fallback { label: item.type, Icon: Sparkles/Briefcase, color: 'gray' } + DEV console.warn
```

The fallback exists for forward-compatibility: if the backend adds a new derivation type before the frontend is updated, cards still render (with the raw type string as label) instead of crashing. The DEV warning ensures developers notice during development.

## 13. What markdown does `stripMarkdown` handle and why?

Our LLM outputs use: headers (`#`), bold (`**`), italic (`*`), bullets (`-`), blockquotes (`>`), links (`[text](url)`). Packets occasionally use numbered lists (`1.`).

The regex handles all of these plus fenced code blocks and inline code defensively (not currently in LLM output, but cheap to strip). The order matters — `***bold italic***` must be caught before `**bold**` before `*italic*`, otherwise partial matches leave stray asterisks.

The tradeoff: this is a regex-based stripper, not a proper markdown parser. It will break on deeply nested or pathological markdown. For card previews (first 100 chars of LLM-generated text), this is acceptable. If we ever need robust stripping, we'd import a library — but for 100-char previews, a 2KB dependency isn't worth it.

## 14. What are the mobile considerations?

Library detail opens in the same `MobileSheet` component as story detail (bottom sheet, 85vh max height, backdrop, swipe-to-close). Same breakpoint (`BREAKPOINTS.DESKTOP`).

`LibraryDetail` is a single-column vertical stack — no responsive layout needed inside the component itself. It renders identically in the inline desktop panel and the mobile sheet.

The tradeoff: the MobileSheet caps at 85vh, which may cut off long packet content. Acceptable — the sheet scrolls internally, same as story detail.

## 15. What existing behavior MUST NOT change?

- **Stories tab**: zero render changes. All existing JSX gated behind `pageTab === 'stories'`. Card click → detail, timeline/category toggle, UseAs dropdown, format chips — all unchanged.
- **PacketModal**: still works exactly as before. Only change is import path for `PACKET_TYPE_META`.
- **DerivationModal**: unchanged. Future `onSavedToLibrary` callback is additive and optional.
- **UseAs dropdown**: still accessible from both tabs (it's in the page header, not inside either tab's content area).
- **URL behavior for `?storyId`**: existing auto-select effect still works. Library params (`?tab=library`, `?itemId=`) are orthogonal.

## 16. What happens in each error scenario?

| Scenario | Behavior |
|---|---|
| Singles query fails, packets loads | Show packets + red banner "Some items couldn't be loaded" |
| Packets query fails, singles loads | Show singles + red banner |
| Both queries fail | Show empty state + red banner (no items to render) |
| Both loading | 3 skeleton cards |
| Delete fails | Item reappears on list (cache refetch). Toast error. User is already on list view (navigate-then-delete). |
| Copy fails (clipboard API denied) | Toast error. No state change. |
| `?itemId=` points to non-existent item | `selectedLibraryItem` is `null` → list view renders (no detail). Same as stale bookmark. |

## 17. What are the risks?

| Risk | Likelihood | Mitigation |
|---|---|---|
| CareerStoriesPage.tsx is already 1100+ lines — adding ~150 more makes it harder to maintain | Medium | Library tab logic is self-contained within `{pageTab === 'library' && ...}` guards. Could extract to a `LibraryTab` component later, but premature for v1. |
| `useSingleDerivations` causes unnecessary network requests on the Stories tab | Low | React Query only fires when the component mounting the hook renders. If we call `useSingleDerivations()` unconditionally, it fetches on Stories tab too. Mitigate: call hook unconditionally (data needed for tab count badge) but it's one lightweight GET that caches. |
| `stripMarkdown` produces ugly previews for edge-case markdown | Low | Only affects card preview — detail view shows full rich rendering. Edge cases are visible and non-breaking. |
| Mobile sheet scrolling conflicts with detail content | Low | Existing pattern handles this — MobileSheet has `overflow-y-auto` on content area. |

## 18. What's the testing strategy?

Unit tests (LibraryCard, LibraryDetail) cover component rendering in isolation. Integration tests (in CareerStoriesPage test suite) cover tab switching, URL state, and the interplay between tab toggle and content gating.

No E2E tests in this plan — the feature is a client-side view layer over existing API endpoints. If the endpoints work (they do, they're already used by modals), the Library is just rendering their responses differently.

The tradeoff: no test coverage for the cross-flow toast ("Saved to Library" → click View → navigates to Library tab). This is a UX nicety, not a correctness requirement. Manual testing covers it.
