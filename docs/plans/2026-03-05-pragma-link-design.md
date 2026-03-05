# Pragma Link — Design Document

> A shareable permalink system for career stories with progressive disclosure.
> One canonical URL, adaptive presentation based on viewer role.

**Date:** 2026-03-05
**Status:** Draft
**Feature:** Pragma Link v1

---

## Problem

InChronicle's current sharing is all-or-nothing: a story is either private (only you) or published to the entire network. There's no middle ground for:

- "Share this with my recruiter" (targeted, evidence-rich, time-limited)
- "Share this with my mentor for review" (full detail + annotation capability)
- "Let anyone see a teaser" (public landing page for the story)

Professionals maintain 3-5 separate documents for different audiences. Pragma Link replaces that with one URL that adapts.

---

## Solution

A **generic shareable link system** that works for any content type (story, derivation, packet). Each link has:

- A **short code** for the URL path (`/p/k7x9m2a1`)
- A **token** for tier-gated access (`?t=rec_a1b2c3...`)
- A **role** that determines what the viewer sees (public / recruiter / mentor)
- Optional **password protection** and **expiry**
- **Per-link audit trail** (view count, timestamps, IP)

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Content types | Any (story, derivation, packet) | Generic link table — polymorphic `targetType` + `targetId` |
| Viewer tiers | 3: public, recruiter, mentor | Progressive disclosure — teaser, full+evidence, full+annotations |
| Tier identification | Per-link token with role | Each share link = one token = one role. Per-recipient analytics + revocation |
| URL format | Auto-generated 8-char short code | No slug complexity for v1 |
| Publish dependency | Independent | Private stories can have Pragma Links. Links bypass `isPublished` / `visibility` |
| Expiry | Owner picks at creation | Options: 7d, 30d, 90d, never |
| UI entry point | New ShareModal (separate from PublishModal) | Publish = network visibility. Share = targeted link sharing. |

---

## Progressive Disclosure: What Each Tier Sees

| Content | Public | Recruiter | Mentor |
|---|---|---|---|
| Story title + framework badge | Yes | Yes | Yes |
| Author name + title + company | Yes | Yes | Yes |
| Narrative sections | **Teaser** (first 2-3 sentences) | **Full text** | **Full text** |
| Sources / evidence | No | Yes | Yes |
| Extracted metrics | No | Yes | Yes |
| Source annotations | No | No | Yes |
| Inline comments / feedback | No | No | Yes |
| Derivations (if shared) | No | Included | Included |

---

## Data Model

### PragmaLink

```prisma
model PragmaLink {
  id          String    @id @default(cuid())
  userId      String    // owner of the link

  // What this link points to
  targetType  String    // "story" | "derivation" | "packet"
  targetId    String    // FK to CareerStory.id, StoryDerivation.id, etc.

  // Access control
  shortCode   String    @unique  // 8-char random, URL-safe
  token       String    @unique  // crypto random, prefixed by role (rec_, men_)
  role        String    // "public" | "recruiter" | "mentor"
  passwordHash String?  // bcrypt hash, null = no password required

  // Metadata
  label       String?   // "Acme Corp - Jane Smith", "Coach Sarah"

  // Lifecycle
  expiresAt   DateTime? // null = never expires
  revokedAt   DateTime? // null = active, non-null = revoked

  // Denormalized audit
  viewCount    Int       @default(0)
  lastViewedAt DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  views       PragmaLinkView[]

  @@index([userId, targetType])
  @@index([shortCode])
  @@index([token])
  @@map("pragma_links")
}
```

### PragmaLinkView

```prisma
model PragmaLinkView {
  id        String   @id @default(cuid())
  linkId    String

  // Viewer info (best-effort, no login required)
  ip        String?
  userAgent String?
  referrer  String?

  viewedAt  DateTime @default(now())
  link      PragmaLink @relation(fields: [linkId], references: [id], onDelete: Cascade)

  @@index([linkId, viewedAt])
  @@map("pragma_link_views")
}
```

### URL Resolution

```
/p/k7x9m2a1             -> public tier (teaser)
/p/k7x9m2a1?t=rec_...   -> recruiter tier (full + sources)
/p/k7x9m2a1?t=men_...   -> mentor tier (full + sources + annotations + comments)
```

- `shortCode` is the URL path segment
- `token` is the query parameter for elevated access
- Public tier = shortCode only, no token needed
- Different tokens on the same shortCode = different tiers of the same content

---

## API Surface

### Link Management (authenticated, owner only)

```
POST   /api/v1/pragma-links
  Body: { targetType, targetId, role, label?, password?, expiresAt? }
  Response: { id, shortCode, token, url, role, label, expiresAt }

  - Validates targetType + targetId (content must exist, user must own it)
  - Generates 8-char shortCode + role-prefixed token
  - If password provided, bcrypt hash and store
  - Story does NOT need to be published

GET    /api/v1/pragma-links?targetType=story&targetId=xxx
  Response: [{ id, shortCode, role, label, viewCount, lastViewedAt, expiresAt, revokedAt, createdAt }]

  - Lists all links for a specific target
  - Includes revoked links (shown greyed out in UI)

DELETE /api/v1/pragma-links/:id/revoke
  Response: { success, revokedAt }

  - Sets revokedAt = now()
  - Does not delete — preserves audit trail
```

### Public Resolution (no auth required)

```
GET    /p/:shortCode?t=<token>&pw=<password>
  Response: { content, tier, targetType, author }

  Resolution logic:
  1. Find PragmaLink by shortCode                    -> 404 if not found
  2. Check revokedAt                                  -> 410 Gone if revoked
  3. Check expiresAt                                  -> 410 Gone if expired
  4. No token provided                                -> public tier (teaser)
  5. Token provided -> find matching PragmaLink        -> 403 if invalid token
  6. If passwordHash set and role != public            -> require pw, 401 if wrong
  7. Record PragmaLinkView row, increment viewCount
  8. Fetch target content by targetType + targetId
  9. Apply tier filter (public/recruiter/mentor)
  10. Return filtered content + author info
```

### Tier Content Filtering

```typescript
function filterByTier(content, tier: 'public' | 'recruiter' | 'mentor') {
  switch (tier) {
    case 'public':
      // Truncate each section summary to first 2-3 sentences
      // Strip: sources, metrics, annotations
      return { ...content, sections: truncated, sources: [] }

    case 'recruiter':
      // Full section text + sources + metrics
      // Strip: annotations, wizard_answers, excluded sources
      return { ...content, sources: filteredSources }

    case 'mentor':
      // Everything recruiter sees + annotations
      // Enable inline comment capability
      return { ...content, sources: filteredSources, annotations, canComment: true }
  }
}
```

---

## Frontend

### New Files

```
src/components/career-stories/ShareModal.tsx    — Share link creation + management modal
src/hooks/usePragmaLinks.ts                     — React Query hooks (create, list, revoke)
src/services/pragma-link.service.ts             — API client
src/pages/pragma/view.tsx                       — Public pragma link viewer page
```

### ShareModal

Triggered from a **Link icon** on NarrativePreview toolbar. Available on any story regardless of publish status.

**Layout:**

```
+-----------------------------------------------------+
|  Share "Led Backend Migration to Microservices"      |
|  --------------------------------------------------- |
|                                                       |
|  -- Create New Link -------------------------------- |
|  |  Role:  (o) Public  (*) Recruiter  (o) Mentor   | |
|  |  Label: [ Acme Corp - Jane Smith              ]  | |
|  |  Password: [ optional                         ]  | |
|  |  Expires:  [ 30 days v ]  (7d/30d/90d/Never)    | |
|  |                              [ Create Link ]     | |
|  --------------------------------------------------- |
|                                                       |
|  -- Active Links ----------------------------------- |
|                                                       |
|  * Recruiter - "Acme Corp - Jane Smith"              |
|    inchronicle.com/p/k7x9m2a1?t=rec_...             |
|    Created 2d ago - 3 views - Last: 1h ago           |
|    [Copy] [Revoke]                                    |
|                                                       |
|  * Mentor - "Coach Sarah"                            |
|    inchronicle.com/p/k7x9m2a1?t=men_...             |
|    Created 5d ago - 7 views - Last: yesterday         |
|    [Copy] [Revoke]                                    |
|                                                       |
|  x Recruiter - "OldCo" (revoked)                     |
|    Revoked 3d ago                                     |
|                                                       |
+-----------------------------------------------------+
```

**Role selector** shows hint text:
- Public: "Anyone can see a summary of your story"
- Recruiter: "Full story with evidence and metrics"
- Mentor: "Full story + can leave inline feedback"

**Active Links** show view stats inline. Copy button copies full URL. Revoke shows confirmation dialog.

### Public Viewer Page

Route: `/p/:shortCode` — lazy-loaded, no auth required.

Reuses the existing `PublishedStoryPage` component pattern but with tier-aware rendering:
- **Public tier**: Truncated sections, no sources, CTA to "Request full access"
- **Recruiter tier**: Full `PublishedStoryPage` rendering (sections + sources + metrics)
- **Mentor tier**: Full rendering + annotation sidebar (reuses existing annotation system from NarrativePreview)

### Integration Point

NarrativePreview toolbar gets a new button:
- **Link2 icon** (from lucide-react) -> opens ShareModal
- Positioned after Share As (sparkles), before Publish
- Available regardless of `isPublished` status

---

## Backend

### New Files

```
backend/src/services/pragma-link.service.ts     — CRUD + resolution logic
backend/src/routes/pragma-link.routes.ts        — Management endpoints
backend/src/controllers/pragma-link.controller.ts — Request handling
backend/src/routes/pragma-public.routes.ts      — Public /p/:shortCode route
```

### Short Code Generation

```typescript
import crypto from 'crypto';

function generateShortCode(): string {
  // 8 chars, URL-safe: a-z, 0-9 (no ambiguous chars: 0/O, 1/l/I)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function generateToken(role: string): string {
  const prefix = role === 'recruiter' ? 'rec_' : role === 'mentor' ? 'men_' : 'pub_';
  return prefix + crypto.randomBytes(24).toString('base64url');
}
```

### Content Teaser Truncation

```typescript
function truncateToTeaser(summary: string, maxSentences = 2): string {
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
  return sentences.slice(0, maxSentences).join('').trim();
}
```

---

## Security Considerations

- **Tokens are crypto-random** (24 bytes base64url = 32 chars) — not guessable
- **Passwords are bcrypt hashed** — never stored in plain text
- **Short codes are 8 chars from 30-char alphabet** — 30^8 = 656 billion combinations, not enumerable
- **Rate limiting** on `/p/:shortCode` — prevent brute-force token guessing
- **IP logging** in PragmaLinkView is best-effort, privacy-aware — no geolocation, no fingerprinting
- **Revocation is immediate** — revokedAt check happens before any content is served
- **Token in query param, not path** — allows the shortCode to be shareable without leaking tier access
- **No referrer leakage** — add `Referrer-Policy: no-referrer` header on pragma link responses

---

## What's NOT in v1

| Feature | Deferred to |
|---|---|
| Custom slugs | v2 |
| Collaborator tier (testimonials) | v2 |
| Mentor inline commenting (write-back) | v2 (read-only annotations in v1) |
| Detailed analytics page | v2 (inline view count in v1) |
| Packet/portfolio links | v2 (schema supports it, UI doesn't) |
| Email notification on view | v2 |
| QR code generation | v2 |
| Social preview / OG tags | v1.1 (quick follow-up) |

---

## Migration Path

1. Add `PragmaLink` and `PragmaLinkView` models to Prisma schema
2. Run `prisma migrate dev`
3. Add `pragma_links` relation to `User` model
4. No changes to existing `CareerStory` or `StoryDerivation` models — Pragma Links are additive

---

## Success Criteria

- User can create a share link for any story (published or not)
- Link resolves to tier-appropriate view based on token
- View count and last-viewed timestamp are tracked per link
- Links can be revoked instantly
- Password-protected links require correct password before showing content
- Expired links return 410 Gone
