# Pragma Link — Implementation Session Plan

> DLG execution plan. Design doc: `docs/plans/2026-03-05-pragma-link-design.md`

**Date:** 2026-03-05
**Status:** Ready to execute
**Estimated effort:** ~5d total, ~4d critical path

---

## Pre-Implementation Decisions

These questions came up during the DLG deep-check. Decisions recorded here so the next session starts clean.

### D1: Unpublish + active links warning

**Decision:** Backend returns `activePragmaLinkCount` in the unpublish response. Frontend shows the dialog only if count > 0. One round-trip, no pre-fetch needed.

**Where:** `career-stories.controller.ts` unpublish handler (~line 1137). After `service.unpublish()`, query `prisma.pragmaLink.count({ where: { storyId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } })`. Return in response.

### D2: enrichStoryWithSources reuse

**Decision:** Option (b) — call from pragma-link controller, not service. Service returns raw story + raw sources query. Controller calls `enrichStoryWithSources` (from career-stories.controller.ts, line 57) then applies `filterByTier`. Matches existing pattern.

**Note:** `enrichStoryWithSources` does NOT include annotations. For mentor tier, controller does a separate `prisma.storyAnnotation.findMany({ where: { storyId } })`.

### D3: ShareModal state management

**Decision:** Follow existing pattern — modal state lives in `CareerStoriesPage.tsx` (like PublishModal at `publishModalStoryId` and DerivationModal at `derivationStoryId`). Add `shareModalStoryId: string | null` state. NarrativePreview gets `onCreatePragmaLink` prop.

### D4: Public tier token redundancy

**Decision:** Yes, visiting any shortCode without a token always serves the public teaser — regardless of the link's tier. A "public" tier link's token is functionally redundant for viewing, but it exists for:
- Consistent URL format in the ShareModal (every link shows a copyable URL)
- View tracking attribution (views with the public token are attributed to that specific link)
- Future-proofing if we ever want to restrict teasers

The "public" tier in ShareModal means: "I want to generate a trackable link that shows the teaser." Without creating a link, the shortCode doesn't exist, so there's nothing to visit.

---

## Exact Files to Touch

### New Files (6)

| File | Purpose |
|---|---|
| `backend/src/services/pragma-link.service.ts` | CRUD + resolve + tier filtering + shortCode/token gen + view dedup + limits |
| `backend/src/routes/pragma-link.routes.ts` | Authenticated management endpoints (create, list, revoke) |
| `backend/src/controllers/pragma-link.controller.ts` | Request handling for management + public resolve |
| `backend/src/utils/source-filter.ts` | Shared `filterSources()` extracted from career-stories controller |
| `src/components/career-stories/ShareModal.tsx` | Share link creation + management modal |
| `src/hooks/usePragmaLinks.ts` | React Query hooks (create, list, revoke) + resolve query |
| `src/services/pragma-link.service.ts` | Frontend API client |
| `src/pages/pragma/view.tsx` | Public pragma link viewer page |

### Modified Files (9)

| File | What Changes | Exact Location |
|---|---|---|
| `backend/prisma/schema.prisma` | Add PragmaLink + PragmaLinkView models, add relations to User + CareerStory | User model ~line 111, CareerStory ~line 1478, new models ~line 1617 |
| `backend/src/app.ts` | Register pragma routes (public before auth, management after) | Route registration block ~line 803-839 |
| `backend/src/controllers/career-stories.controller.ts` | Extract `filterSources` to shared util, import from there. Add `activePragmaLinkCount` to unpublish response. | `enrichStoryWithSources` ~line 57, source filter ~line 1872, unpublish ~line 1137 |
| `backend/src/middleware/rateLimiter.middleware.ts` | Add `pragmaResolveLimiter` (60 req/min/IP) | After `chronicleRateLimiter` ~line 44 |
| `backend/src/services/cron.service.ts` | Add GDPR IP nullification job (daily 3am) | `startJobs()` ~line 87, `getJobsStatus()` ~line 146, `triggerJob()` ~line 179 |
| `server.mjs` | Add `/p/:shortCode` SSR handler for OG meta tags | BEFORE `/:slug` handler, ~line 20 |
| `src/App.tsx` | Add lazy import + route for `/p/:shortCode` | Lazy import ~line 41, route before `/:slug` ~line 297 |
| `src/components/career-stories/NarrativePreview.tsx` | Add Link2 button to toolbar, add `onCreatePragmaLink` prop | Import ~line 16, prop ~line 87, handler ~line 288, button ~line 519 |
| `src/components/career-stories/CareerStoriesPage.tsx` | Add ShareModal state + trigger, wire to NarrativePreview | State declarations (near other modal states), render ShareModal |

---

## Phase-by-Phase Execution

### Phase 1: Schema + Migration + Shared Utils (0.5d)

**Goal:** Database ready, shared utilities extracted.

**Tasks:**
1. Add `PragmaLink` model to schema (per design doc — `shortCode`, `token`, `tier`, `label`, `expiresAt`, `revokedAt`, FK to CareerStory + User)
2. Add `PragmaLinkView` model to schema (per design doc — `linkId`, `viewerId`, `ip`, `userAgent`, `viewedAt`)
3. Add `pragmaLinks PragmaLink[]` relation to User model (~line 111)
4. Add `pragmaLinks PragmaLink[]` relation to CareerStory model (~line 1478)
5. Run `npx prisma migrate dev --name add-pragma-links`
6. Extract `filterSources()` from `career-stories.controller.ts:1872` into `backend/src/utils/source-filter.ts`
7. Update `career-stories.controller.ts` to import from shared util
8. Verify existing tests still pass

**Commit:** `feat(schema): add PragmaLink + PragmaLinkView models, extract filterSources util`

### Phase 2: Backend Service (1d)

**Goal:** Core business logic complete.

**Tasks:**
1. Create `backend/src/services/pragma-link.service.ts`
2. Implement `generateShortCode()` — 8-char, 30-char alphabet, rejection sampling, 3 retries on collision
3. Implement `generateToken()` — 24 random bytes, base64url, opaque
4. Implement `createLink(userId, storyId, tier, label?, expiresAt?)`:
   - Validate story exists + owned by user
   - Validate story.sourceMode !== 'demo'
   - Validate tier is valid enum
   - Check limits: 20 active per story, 100 total per user
   - Generate shortCode + token, create PragmaLink row
   - Return { id, shortCode, token, url, tier, label, expiresAt }
5. Implement `listLinks(userId, storyId)`:
   - Fetch all links for story (active + revoked)
   - Compute views (COUNT) and lastViewedAt (MAX) per link via aggregate
   - Return sorted by createdAt desc
6. Implement `revokeLink(userId, linkId)`:
   - Validate link exists + owned by user
   - Set revokedAt = now()
7. Implement `resolveLink(shortCode, token?)`:
   - Find link by shortCode -> 404
   - Check revokedAt -> 410
   - Check expiresAt -> 410
   - Check story exists + user.isActive -> 410
   - If no token: return { story (raw), tier: 'public' }
   - If token: find link by token -> 403, verify shortCode match -> 403
   - Return { story (raw), tier: link.tier, linkId }
8. Implement `recordView(linkId, ip?, userAgent?, viewerId?)`:
   - Dedup check: SELECT WHERE linkId AND ip AND viewedAt > (now - 1 hour)
   - If no recent view: INSERT PragmaLinkView
9. Implement `filterByTier(story, sources, annotations, tier)`:
   - Public: truncateSections(200 chars), strip sources + annotations
   - Recruiter: full sections + filterSources(), no annotations
   - Mentor: full sections + filterSources() + annotations
10. Implement `truncateSections(sections, maxChars)` — word-boundary truncation
11. Implement `countActiveLinks(storyId)` — for unpublish warning

**Commit:** `feat(backend): pragma-link service with CRUD, resolve, tier filtering`

### Phase 3: Backend Routes + Controller (0.5d)

**Goal:** API endpoints wired up.

**Tasks:**
1. Create `backend/src/controllers/pragma-link.controller.ts`:
   - `createPragmaLink` — parse body, call service.createLink, return URL
   - `listPragmaLinks` — parse query (storyId required), call service.listLinks
   - `revokePragmaLink` — parse params, call service.revokeLink
   - `resolvePragmaLink` — parse shortCode + optional token, call service.resolveLink, call enrichStoryWithSources (+ annotations for mentor), call filterByTier, set response headers
2. Create `backend/src/routes/pragma-link.routes.ts`:
   - `POST /` — createPragmaLink (auth required)
   - `GET /` — listPragmaLinks (auth required)
   - `POST /:id/revoke` — revokePragmaLink (auth required)
3. Add public resolve route to `app.ts`:
   - `GET /api/v1/pragma/resolve/:shortCode` — resolvePragmaLink (no auth, rate limited)
   - Register BEFORE auth middleware
4. Add `pragmaResolveLimiter` to `rateLimiter.middleware.ts` (60 req/min/IP)
5. Register management routes in `app.ts` at `/api/v1/pragma-links` (after auth middleware)
6. Set response headers on resolve: `Referrer-Policy`, `X-Robots-Tag`, `Cache-Control`

**Commit:** `feat(backend): pragma-link routes and controller`

### Phase 4: Backend Tests (0.5d)

**Goal:** Core logic verified.

**Tests:**
1. `createLink` — happy path, ownership validation, sourceMode rejection, tier validation, limit enforcement, collision retry
2. `resolveLink` — public tier (no token), recruiter tier (with token), mentor tier (with annotations), revoked (410), expired (410), invalid token (403), story deleted (cascade)
3. `revokeLink` — happy path, ownership validation, already revoked
4. `listLinks` — returns active + revoked, computes view counts
5. `filterByTier` — public truncation, recruiter sources filter, mentor annotations
6. `recordView` — deduplication (same IP within 1 hour ignored)
7. `truncateSections` — word boundary, short text passthrough, empty sections

**Commit:** `test(backend): pragma-link service unit tests`

### Phase 5: Frontend API + Hooks + ShareModal (1d)

**Goal:** Owner can create, view, copy, and revoke links.

**Tasks:**
1. Create `src/services/pragma-link.service.ts`:
   - `createLink(storyId, tier, label?, expiresAt?)` -> POST /api/v1/pragma-links
   - `listLinks(storyId)` -> GET /api/v1/pragma-links?storyId=xxx
   - `revokeLink(linkId)` -> POST /api/v1/pragma-links/:id/revoke
2. Create `src/hooks/usePragmaLinks.ts`:
   - `usePragmaLinks(storyId)` — React Query query, key: `['pragma-links', storyId]`
   - `useCreatePragmaLink()` — mutation, invalidates `['pragma-links']`
   - `useRevokePragmaLink()` — mutation, invalidates `['pragma-links']`
3. Create `src/components/career-stories/ShareModal.tsx`:
   - Radix Dialog (same pattern as PublishModal / DerivationModal)
   - Create form: tier radio pills (with hint text), label input, expiry dropdown (7d/30d/90d/Never)
   - Active links list: grouped by active/revoked, shows tier badge + label + view count + last viewed + copy + revoke
   - Post-creation: auto-copy URL to clipboard, toast "Link copied to clipboard"
   - Revoke: confirmation dialog
   - Limit reached: disabled Create button + tooltip "Maximum links reached"
4. Wire into `CareerStoriesPage.tsx`:
   - Add `shareModalStoryId` state
   - Render ShareModal when set
   - Pass `onCreatePragmaLink` to NarrativePreview
5. Update `NarrativePreview.tsx`:
   - Add `Link2` import from lucide-react
   - Add `onCreatePragmaLink` prop
   - Add Link2 button after StoryUseAs, before Copy (~line 519)

**Commit:** `feat(frontend): ShareModal with link creation, listing, copy, revoke`

### Phase 6: Pragma Viewer Page + Error States (0.75d)

**Goal:** Recipients can view shared stories at the appropriate tier.

**Tasks:**
1. Create `src/pages/pragma/view.tsx`:
   - Route: `/p/:shortCode`, reads `?t=` from search params
   - Calls `GET /api/v1/pragma/resolve/:shortCode?t=token`
   - Three render states: content, error, loading
2. Extract shared `StoryContent` component from `PublishedStoryPage`:
   - Section rendering, source items, author header — reusable between published view and pragma view
   - PublishedStoryPage imports and uses StoryContent
   - Pragma viewer uses StoryContent with tier-specific props
3. Tier-aware rendering:
   - Public: truncated sections, no sources, author info
   - Recruiter: full sections + sources + metrics
   - Mentor: full sections + sources + annotations (read-only, existing annotation rendering)
4. Error states (branded pages):
   - 410 revoked: "This share link has been revoked. Contact the author if you need access."
   - 410 expired: "This share link has expired. Contact the author for a new link."
   - 404/410 not found: "This story is no longer available."
   - Each with InChronicle branding, no nav header
5. Register in `App.tsx`:
   - Lazy import: `const PragmaLinkPage = React.lazy(() => import('./pages/pragma/view'))`
   - Route: `<Route path="/p/:shortCode" element={...} />` before `/:slug`

**Commit:** `feat(frontend): pragma link viewer page with tier-aware rendering`

### Phase 7: Integration + OG Tags + Cron (0.75d)

**Goal:** Polish, social preview, GDPR compliance.

**Tasks:**
1. **Unpublish warning**: In CareerStoriesPage, after unpublish mutation succeeds, check `activePragmaLinkCount` in response. If > 0, show confirmation dialog: "N active share links will continue working. Revoke them?" [Keep Links] [Revoke All]. "Revoke All" calls revoke for each active link.
2. **OG meta tags in server.mjs**:
   - Add route handler: `app.get('/p/:shortCode([a-hjkmnp-z2-9]{8})', async (req, res, next) => { ... })`
   - BEFORE the `/:slug` handler
   - Fetch: `${API_URL}/api/v1/pragma/resolve/${req.params.shortCode}` (no token = public tier)
   - Inject: `og:title` (story title), `og:description` (first 160 chars of teaser), `og:type` ("article"), `og:image` (default branded card)
   - Headers: `Cache-Control: public, max-age=300`, `Referrer-Policy: no-referrer`
   - On failure: fall through to SPA (`next()`)
3. **GDPR cron job**: Add to `CronService.startJobs()`:
   - Schedule: `0 3 * * *` (daily 3am)
   - Action: `UPDATE pragma_link_views SET ip = NULL WHERE viewed_at < NOW() - INTERVAL '30 days' AND ip IS NOT NULL`
   - Add to `getJobsStatus()` and `triggerJob()`
4. **Smoke test the full flow**: Create link -> copy URL -> open in incognito -> verify teaser -> open with token -> verify full content -> revoke -> verify 410

**Commit:** `feat: pragma link integration, OG meta tags, GDPR cron`

---

## Risk Checklist

| Risk | Mitigation | Phase |
|---|---|---|
| shortCode collision on insert | Retry loop (3 attempts) with catch on unique constraint | Phase 2 |
| enrichStoryWithSources is controller-scoped | Call from pragma controller, not service — matches existing pattern | Phase 3 |
| server.mjs route order (`/p/:shortCode` vs `/:slug`) | `/p/` prefix ensures no collision. Add BEFORE `/:slug` handler. | Phase 7 |
| Slack/LinkedIn don't execute JS for OG tags | Server-side injection in server.mjs (proven pattern from Chronicle) | Phase 7 |
| PublishedStoryPage extraction breaks existing page | Extract to shared component, both pages import it. Run existing tests. | Phase 6 |
| View dedup race condition | SELECT-then-INSERT with hour window. Worst case: duplicate view row. Acceptable. | Phase 2 |

---

## Definition of Done

- [ ] All 7 phases committed and passing tests
- [ ] `npx prisma migrate dev` succeeds cleanly
- [ ] Existing career-stories tests still pass after filterSources extraction
- [ ] ShareModal creates links, copies URLs, shows view counts, revokes
- [ ] `/p/:shortCode` shows teaser (no token), full story (recruiter token), full + annotations (mentor token)
- [ ] Revoked/expired links show branded error pages
- [ ] OG tags render in Slack/LinkedIn preview
- [ ] Unpublish warning shows active link count
- [ ] GDPR cron job registered and manually triggerable
- [ ] No regressions in existing publish/unpublish/derivation flows
