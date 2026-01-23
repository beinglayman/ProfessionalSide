# Workspace List UX Improvements

**Date:** 2026-01-23
**Branch:** `ux/workspace-list-improvements`
**Status:** Ready for Review

---

## Summary

UX review of the Workspaces list view using F-L-E-A protocol (Flow, Loading, Errors, Accessibility). Addresses usability issues, missing states, and accessibility gaps.

Includes Code Masters recommendations: extracted reusable components (FilterSelect, EmptyState) and replaced inline SVGs with Lucide icons.

---

## UX Review Findings (F-L-E-A)

### F - Flow Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Unlabeled filters | P0 | Three dropdowns show "All" with no visible labels - user can't tell what each filters |
| "+" button no label | P1 | Top-right "+" icon has no text label or tooltip |
| "Search & Filter" toggle confusing | P2 | Unclear affordance - search is always visible but toggle collapses filters |
| "Team Workspace" redundant | P2 | All cards show "Team Workspace" - adds no information value |
| Card hierarchy inverted | P2 | Organization badge more prominent than workspace name |

### L - Loading States

| Issue | Status | Description |
|-------|--------|-------------|
| Skeleton loading | TBD | What shows while workspaces load? |
| Pagination/infinite scroll | TBD | Behavior with 20+ workspaces? |
| Search debounce | TBD | Does search make API calls? Debounced? |

### E - Error States

| Issue | Status | Description |
|-------|--------|-------------|
| List load failure | TBD | What if workspace list fails to load? |
| Empty state | TBD | What shows with 0 workspaces? Is there CTA to create? |
| "Open Workspace" failure | TBD | What if navigation fails? |

### A - Accessibility

| Issue | Severity | Description |
|-------|----------|-------------|
| Filter dropdowns no labels | P0 | Missing `<label>` or `aria-label` for screen readers |
| "+" button no aria-label | P1 | Should be "Create new workspace" |
| Keyboard navigation | TBD | Can Tab through cards and activate with Enter? |

---

## Proposed Changes

### P0 - Critical

- [x] Add visible labels above filter dropdowns (Type, Category, Ownership)
- [x] Add `aria-label` to filter dropdowns for screen readers

### P1 - High Priority

- [x] Add "New Workspace" label to create button
- [x] Add `aria-label="Create new workspace"` to button
- [x] Design and implement empty state with CTA

### P2 - Medium Priority

- [x] Conditionalize category subtitle (hide generic "Team/Personal Workspace")
- [x] Increase workspace name font size/weight (text-lg → text-xl, font-medium → font-semibold)
- [ ] Clarify "Search & Filter" toggle UX (deferred)

### P3 - Nice to Have

- [ ] Add skeleton loading state for cards (deferred)
- [ ] Implement proper loading/error states (already exists)

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/workspaces/discovery.tsx` | Use new components, fix UX issues |
| `src/components/ui/filter-select.tsx` | **New** - Reusable labeled filter dropdown |
| `src/components/ui/filter-select.test.tsx` | **New** - 12 tests |
| `src/components/ui/empty-state.tsx` | **New** - Reusable empty state component |
| `src/components/ui/empty-state.test.tsx` | **New** - 16 tests |

## Code Masters Recommendations Applied

| Reviewer | Recommendation | Status |
|----------|---------------|--------|
| Kent Beck | Replace inline SVG with Plus icon | ✅ Done |
| Kent Beck | Avoid magic strings in category check | ⚠️ Deferred (needs data model change) |
| Sandi Metz | Extract FilterSelect component | ✅ Done |
| Sandi Metz | Extract EmptyState component | ✅ Done |
| DHH | Ship it | ✅ Ready |

---

## Testing Instructions

### Accessibility Testing
1. Use Tab key to navigate through all interactive elements
2. Verify screen reader announces filter purposes
3. Verify "+" button has accessible name

### Flow Testing
1. First-time user should understand each filter's purpose
2. Empty state should guide user to create first workspace

---

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `filter-select.test.tsx` | 12 | Rendering, accessibility, interaction, edge cases |
| `empty-state.test.tsx` | 16 | Variants, actions, styling, real-world scenarios |
| **Total** | **109** | +28 new tests (was 81) |

---

## Checklist

- [x] P0 issues resolved (filter labels, aria-labels)
- [x] P1 issues resolved (create button, empty state)
- [x] P2 issues resolved (card hierarchy, redundant labels)
- [x] TypeScript compiles without errors
- [x] All 109 tests pass
- [x] Code Masters recommendations applied
- [ ] Manual accessibility testing
- [ ] Manual flow testing
