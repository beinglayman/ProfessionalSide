# Pragma Link v1 — UI Fixes (RJ + GSE Review)

> Fixes from RJ (5.5/10) and GSE production review. All frontend, no backend changes.

**Date:** 2026-03-05
**Status:** Ready for next session

---

## P0 — Must Fix

### 1. Clipboard fallback
`ShareModal.tsx` — `navigator.clipboard.writeText()` fails on HTTP/iframe/denied.
Add try/catch with `document.execCommand('copy')` textarea fallback + toast error if both fail.

### 2. Error detection by status code, not string
`view.tsx` — Replace `errorMsg.includes('revoked')` with HTTP status code + error key matching.
Backend already returns `{ error: 'revoked', status: 410 }` etc. Use `error.response?.status` (410 vs 403 vs 404) and `error.response?.data?.error` key.

### 3. Mobile mentor annotations
`view.tsx` — MarginColumn is `hidden lg:block`, annotations vanish on mobile.
Add collapsible "Author Notes (N)" section below each section on mobile (shown only when `< lg`). Keep MarginColumn on desktop.

### 4. Token missing from React Query cache key (cache poisoning)
`usePragmaLinks.ts` — `resolve` key is `['pragma-resolve', shortCode]` but doesn't include `token`. If same shortCode is opened with different tokens (public vs recruiter), React Query serves stale cached data from the first request. Fix: add token to cache key → `['pragma-resolve', shortCode, token]`.

---

## P1 — UX Clarity

### 5. Rename "Access tier" to human labels
ShareModal: "Who is this for?" with pills: "Anyone (preview)" / "Recruiter (full story)" / "Mentor (with notes)".

### 6. Show truncated URL in link cards
LinkItem: add `text-[11px] text-gray-400 truncate` showing `inchronicle.com/p/k7x9m2...` below the tier badge.

### 7. Hide confidence badge in viewer
`view.tsx` — pass `hideHeader={false}` but the NarrativeSection confidence badge ("Strong") is meaningless to recipients. Either pass `confidence={-1}` to hide or add a `hideConfidence` prop.

### 8. Enter key submits create form
ShareModal: `onKeyDown` on label input → Enter → `handleCreate()`.

### 9. Expired links still copyable
`ShareModal.tsx` — LinkItem shows copy button even for expired links. Disable copy button when `expiresAt` is in the past (same pattern as revoked links).

---

## P2 — Visual Polish

### 10. Branded header on viewer pages
Minimal top bar: InChronicle logo (left), tier badge (right). No nav links. Subtle, not intrusive. Use `border-b border-gray-100` pattern.

### 11. Public teaser as mini landing page
Replace plain truncated text with:
- Author card (avatar, name, title — already exists)
- Truncated sections in slightly muted cards
- CTA block: "Want the full story? Ask [author name] for access." + "Build your own career story" button linking to `/register`
- Proper InChronicle logo footer

### 12. Branded footer on all viewer pages
Replace "Shared via inchronicle" with small logo + "Career stories backed by evidence" tagline + link to homepage.

### 13. Loading skeleton
Replace spinner with skeleton cards matching section layout.

### 14. Dynamic page title
`view.tsx` — Set `document.title` to story title (e.g. "Ketan's Career Story — InChronicle") via `useEffect`. Currently shows default Vite title.

### 15. Revoked links list unbounded
`ShareModal.tsx` — Revoked links list grows forever. Collapse after 3 with "Show N more" toggle, or paginate.

---

## P3 — Opportunities (defer)

- Link analytics sparkline in ShareModal
- "Share as preview" quick action (skip modal)
- Print/PDF stylesheet (`@media print`)
- Label max length (100 chars)
- Reading time estimate on viewer
- Preview-as-recipient button in ShareModal (open `/p/:shortCode?t=...` in new tab)
- Tune `staleTime` on resolve query (currently 0 → unnecessary refetches; consider 5min for viewer)

---

## Execution Order

1. P0s first (clipboard, error codes, mobile annotations, cache key fix) — ~1h
2. P1s (rename tiers, URL preview, hide confidence, enter key, expired link copy) — ~30min
3. P2s (branded header, public CTA page, footer, skeleton, page title, revoked list) — ~2h
4. Commit + push

---

## Files to Touch

| File | Changes |
|---|---|
| `src/components/career-stories/ShareModal.tsx` | Clipboard fallback, tier rename, URL preview, enter key, label maxLength, expired link copy disable, revoked list collapse |
| `src/pages/pragma/view.tsx` | Error code matching, mobile annotations, branded header, public CTA page, footer, skeleton, hide confidence, dynamic page title |
| `src/hooks/usePragmaLinks.ts` | Cache key fix (add token), error response typing, staleTime tuning |
