# Pragma Link v1 — Feature Documentation

> Share a career story with one link. Recruiters see the full story with evidence. Mentors see everything and can annotate. Everyone else gets a teaser.

**Status:** Backend complete (Phases 1-4), Frontend pending (Phases 5-7)
**Date:** 2026-03-05

---

## What It Does

Pragma Link creates **shareable URLs** for career stories with progressive disclosure. Each link has a unique short code and optional access token that determines what the viewer sees.

```
/p/k7x9m2a1              -> public tier (teaser)
/p/k7x9m2a1?t=a1b2c3...  -> recruiter tier (full + sources)
/p/j8n4p6b2?t=d4e5f6...  -> mentor tier (full + sources + annotations)
```

### Three Tiers

| Content | Public | Recruiter | Mentor |
|---|---|---|---|
| Story title + framework badge | Yes | Yes | Yes |
| Author name + title + company | Yes | Yes | Yes |
| Narrative sections | Teaser (~200 chars) | Full text | Full text |
| Sources / evidence | No | Yes | Yes |
| Source annotations | No | No | Yes (read-only) |

---

## API Endpoints

### Management (authenticated)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/pragma-links` | Create link (storyId, tier, label?, expiresAt?) |
| `GET` | `/api/v1/pragma-links?storyId=xxx` | List all links for a story (active + revoked, with view counts) |
| `POST` | `/api/v1/pragma-links/:id/revoke` | Revoke a link (sets revokedAt, preserves audit trail) |

### Public Resolution (no auth, rate limited)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/pragma/resolve/:shortCode?t=token` | Resolve link to tier-appropriate content |

**Response headers:** `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`

---

## Data Model

### PragmaLink

```
id, userId, storyId (FK, cascade), shortCode (unique, 8-char), token (unique, 32-char),
tier ("public"|"recruiter"|"mentor"), label?, expiresAt?, revokedAt?, createdAt, updatedAt
```

### PragmaLinkView

```
id, linkId (FK, cascade), viewerId?, ip? (GDPR: nullified after 30d), userAgent?, viewedAt
```

---

## Security

- **Short codes:** 8-char, 30-char alphabet (no ambiguous 0/O/1/l/I), rejection sampling
- **Tokens:** 24 random bytes, base64url (2^192 entropy) — not guessable
- **Rate limiting:** 60 req/min/IP on resolve endpoint
- **View dedup:** 1 view per IP per link per hour
- **Limits:** 20 active links per story, 100 total per user
- **Demo rejection:** Cannot create links for demo-mode stories
- **Cascade deletion:** User -> CareerStory -> PragmaLink -> PragmaLinkView

---

## Validations

| Rule | Error |
|---|---|
| Story must exist + owned by user | 404 |
| Story must not be demo sourceMode | 400 |
| Tier must be public/recruiter/mentor | 400 |
| Per-story limit (20 active) | 429 |
| Per-user limit (100 active) | 429 |
| Revoked link | 410 "revoked" |
| Expired link | 410 "expired" |
| Invalid/mismatched token | 403 |
| Non-existent shortCode | 404 |

---

## Test Coverage

**56 tests total** (19 unit + 37 integration)

### Unit Tests (`pragma-link.service.test.ts`)
- `generateShortCode`: format, alphabet, uniqueness
- `generateToken`: format, uniqueness
- `truncateSections`: word boundary, short passthrough, empty, null, multiple sections
- `filterSources`: excluded removal, wizard_answer removal, empty input
- `filterByTier`: public/recruiter/mentor content, metadata inclusion

### Integration Tests (`pragma-link.integration.test.ts`)
Self-contained with beforeAll/afterAll setup/teardown. Tests against live backend.

- **Create:** recruiter, mentor, public, with expiry, draft story, invalid tier, missing fields, non-existent story, demo rejection, auth required
- **List:** all links with fields, empty for no links, requires storyId, auth required
- **Resolve Public:** truncated teaser, security headers
- **Resolve Recruiter:** full sections, no annotations
- **Resolve Mentor:** full sections, annotations array
- **Error States:** 404 non-existent, 403 invalid token, 403 mismatched token
- **View Tracking:** increment count, dedup within 1 hour
- **Revoke:** success, 410 on resolve after, 410 without token, in list, non-existent
- **Unpublish:** activePragmaLinkCount in response
- **Tier Filtering:** truncation bounds, full sections, metadata
- **Format:** shortCode alphabet, token base64url, uniqueness
- **Isolation:** cross-story link separation

---

## Files

### New (8)

| File | Purpose |
|---|---|
| `backend/prisma/migrations/20260305010000_add_pragma_links/migration.sql` | Database migration |
| `backend/src/services/pragma-link.service.ts` | Core business logic |
| `backend/src/controllers/pragma-link.controller.ts` | Request handling |
| `backend/src/routes/pragma-link.routes.ts` | Route definitions |
| `backend/src/utils/source-filter.ts` | Shared filterSources util |
| `backend/src/services/pragma-link.service.test.ts` | Unit tests |
| `backend/src/services/pragma-link.integration.test.ts` | Integration tests |
| `docs/features/pragma-link-v1.md` | This document |

### Modified (4)

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | PragmaLink + PragmaLinkView models, relations |
| `backend/src/app.ts` | Route registration (public resolve + management) |
| `backend/src/controllers/career-stories.controller.ts` | filterSources import, activePragmaLinkCount |
| `backend/src/middleware/rateLimiter.middleware.ts` | pragmaResolveLimiter |

---

## Pending (Next Session: Phases 5-7)

- **Phase 5:** Frontend API client + React Query hooks + ShareModal
- **Phase 6:** Pragma viewer page (`/p/:shortCode`) with tier-aware rendering + error states
- **Phase 7:** OG meta tags in server.mjs, GDPR cron job, unpublish warning dialog

Design doc: `docs/plans/2026-03-05-pragma-link-design.md`
Session plan: `docs/plans/2026-03-05-pragma-link-session-plan.md`
