# Pragma Link — Design Document

> Share a career story with one link. Recruiters see the full story with evidence.
> Mentors see everything and can annotate. Everyone else gets a teaser.

**Date:** 2026-03-05
**Status:** Reviewed (DLG + RJ + GSE + PGC)
**Feature:** Pragma Link v1

---

## Problem

InChronicle's current sharing is all-or-nothing: a story is either private (only you) or published to the entire network. There's no middle ground for:

- "Share this with my recruiter" (targeted, evidence-rich, time-limited)
- "Share this with my mentor for review" (full detail + can see annotations)
- "Let anyone see a teaser" (public landing page for the story)

Professionals maintain 3-5 separate documents for different audiences. Pragma Link replaces that with one story that adapts to each viewer.

---

## Solution

Each Pragma Link is a **shareable URL** with a unique short code and an optional access token. The token determines what the viewer sees.

```
/p/k7x9m2a1              -> public tier (teaser)
/p/k7x9m2a1?t=a1b2c3...  -> recruiter tier (full + sources)
/p/j8n4p6b2?t=d4e5f6...  -> mentor tier (full + sources + annotations)
```

- **No token** = public teaser (truncated summary, no evidence)
- **Token** = tier-gated access (determined by the link's tier, not the token format)
- Each link has its **own short code and token** — every recipient gets a unique URL
- Tokens are opaque (no role prefix) — tier info is stored server-side only

---

## Progressive Disclosure: What Each Tier Sees

| Content | Public | Recruiter | Mentor |
|---|---|---|---|
| Story title + framework badge | Yes | Yes | Yes |
| Author name + title + company | Yes | Yes | Yes |
| Narrative sections | **Teaser** (~200 chars per section) | **Full text** | **Full text** |
| Sources / evidence | No | Yes | Yes |
| Extracted metrics | No | Yes | Yes |
| Source annotations ("why this matters") | No | No | Yes (read-only) |

**Mentor tier = recruiter tier + annotations.** No separate rendering path — just include annotation data when `tier === 'mentor'`.

**Mentor inline commenting (write-back) is deferred to v2.** In v1, mentors see existing annotations but cannot add new ones via the link.

---

## Data Model

### PragmaLink

```prisma
model PragmaLink {
  id        String    @id @default(cuid())
  userId    String

  // What this link points to (proper FK, cascade on delete)
  storyId   String
  story     CareerStory @relation(fields: [storyId], references: [id], onDelete: Cascade)

  // Access control
  shortCode String    @unique   // 8-char random, URL-safe
  token     String    @unique   // 32-char opaque crypto random (no role prefix)
  tier      String              // "public" | "recruiter" | "mentor"

  // Metadata
  label     String?             // "Acme Corp - Jane Smith", "Coach Sarah"

  // Lifecycle
  expiresAt DateTime?           // null = never expires
  revokedAt DateTime?           // null = active, non-null = revoked

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  views     PragmaLinkView[]

  @@index([userId, storyId])
  @@map("pragma_links")
}
```

### PragmaLinkView

```prisma
model PragmaLinkView {
  id        String    @id @default(cuid())
  linkId    String

  // Viewer info
  viewerId  String?             // nullable — populated if viewer is logged in
  ip        String?             // best-effort, auto-deleted after 30 days (GDPR)
  userAgent String?

  viewedAt  DateTime  @default(now())
  link      PragmaLink @relation(fields: [linkId], references: [id], onDelete: Cascade)

  @@index([linkId, viewedAt])
  @@map("pragma_link_views")
}
```

### Schema Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **FK not polymorphic** | `storyId` FK to CareerStory | DB-level referential integrity. Cascade on delete. Polymorphic `targetId` = orphan links at 2am. Add nullable `derivationId` in v2. (GSE, DLG) |
| **No password field** | Cut entirely | Token IS the password. If leaked, revoke + recreate. Zero users asked for passwords. Adds bcrypt in hot path for no benefit. 2-hour add later if needed. (GSE) |
| **Opaque tokens** | No role prefix (`rec_`, `men_`) | Prefixed tokens leak tier info to anyone who sees the URL. Tier stored server-side only. (RJ, DLG) |
| **`tier` not `role`** | Column named `tier` | "Role" implies viewer identity. "Tier" describes access level — what they see. (PGC) |
| **No `viewCount` denorm** | Compute from COUNT() | Denormalized counter drifts under concurrent requests. COUNT on indexed `linkId` is fast at this scale. (GSE) |
| **No `referrer` field** | Removed from PragmaLinkView | `Referrer-Policy: no-referrer` means this column is always null. (GSE) |
| **View deduplication** | 1 view per IP per link per hour | Prevents page-refresh inflation. Check before INSERT. (DLG) |
| **Each link = unique shortCode** | No shared shortCodes | Simple 1:1 — one link, one URL. No ambiguity about which link is being accessed. (PGC, RJ, DLG) |
| **Nullable `viewerId`** | On PragmaLinkView | If a logged-in InChronicle user views a link, store their userId for richer analytics. (DLG) |

---

## API Surface

### Link Management (authenticated, owner only)

```
POST   /api/v1/pragma-links
  Body: { storyId, tier, label?, expiresAt? }
  Response: { id, shortCode, token, url, tier, label, expiresAt }

  Validations:
  - Story must exist and be owned by the authenticated user
  - Story must not be in demo sourceMode
  - tier must be "public" | "recruiter" | "mentor"
  - User cannot exceed 20 active (non-revoked) links per story
  - User cannot exceed 100 total active links
  - Short code collision: retry up to 3 times on unique constraint violation

GET    /api/v1/pragma-links?storyId=xxx
  Response: [{ id, shortCode, tier, label, views, lastViewedAt, expiresAt, revokedAt, createdAt }]

  - Lists all links for a story (active + revoked)
  - `views` computed as COUNT(PragmaLinkView) per link
  - `lastViewedAt` computed as MAX(viewedAt) per link

POST   /api/v1/pragma-links/:id/revoke
  Response: { success, revokedAt }

  - Sets revokedAt = now()
  - Preserves audit trail (no hard delete)
  - POST not DELETE — revocation is a state change, not a deletion
```

### Public Resolution (no auth required)

```
GET    /api/v1/pragma/resolve/:shortCode?t=<token>
  Response: { content, tier, author, meta }

  Resolution logic:
  1. Find PragmaLink by shortCode              -> 404 if not found
  2. Check revokedAt                            -> 410 "This link has been revoked"
  3. Check expiresAt                            -> 410 "This link has expired"
  4. Check story exists + user.isActive         -> 410 "Content no longer available"
  5. No token provided                          -> serve public tier (teaser)
  6. Token provided -> find PragmaLink by token -> 403 if invalid
  7. Verify token's shortCode matches URL       -> 403 if mismatch
  8. Record PragmaLinkView (deduplicated: 1/IP/link/hour)
  9. Fetch story via enrichStoryWithSources() (reuse existing function)
  10. Apply tier filter (public/recruiter/mentor)
  11. Return filtered content + author info + OG meta

  Response headers:
  - Referrer-Policy: no-referrer
  - X-Robots-Tag: noindex, nofollow
  - Cache-Control: no-store
```

### Tier Content Filtering

```typescript
type Tier = 'public' | 'recruiter' | 'mentor';

function filterByTier(story: EnrichedStory, tier: Tier) {
  // Base: always include title, framework, author
  const base = {
    title: story.title,
    framework: story.framework,
    archetype: story.archetype,
    category: story.category,
    publishedAt: story.publishedAt,
  };

  switch (tier) {
    case 'public':
      return {
        ...base,
        sections: truncateSections(story.sections, 200), // chars, word-boundary
        sources: [],
        annotations: [],
      };

    case 'recruiter':
      return {
        ...base,
        sections: story.sections,
        sources: filterSources(story.sources), // exclude wizard_answers + excluded
        annotations: [],
      };

    case 'mentor':
      return {
        ...base,
        sections: story.sections,
        sources: filterSources(story.sources),
        annotations: story.annotations ?? [],
      };
  }
}
```

### Teaser Truncation

```typescript
function truncateSections(
  sections: Record<string, { summary: string }>,
  maxChars = 200
): Record<string, { summary: string }> {
  const truncated: Record<string, { summary: string }> = {};
  for (const [key, section] of Object.entries(sections)) {
    const text = section.summary ?? '';
    if (text.length <= maxChars) {
      truncated[key] = section;
    } else {
      // Truncate at word boundary
      const cut = text.slice(0, maxChars);
      const lastSpace = cut.lastIndexOf(' ');
      truncated[key] = {
        summary: (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '...',
      };
    }
  }
  return truncated;
}
```

---

## Frontend

### New Files

```
src/components/career-stories/ShareModal.tsx    -- Share link creation + management modal
src/hooks/usePragmaLinks.ts                     -- React Query hooks (create, list, revoke)
src/services/pragma-link.service.ts             -- API client
src/pages/pragma/view.tsx                       -- Public pragma link viewer page
```

### ShareModal

Triggered from a **Link2 icon** (lucide-react) on NarrativePreview toolbar. Available on any story regardless of publish status. Positioned after Share As (sparkles), before Publish.

**Layout:**

```
+-----------------------------------------------------+
|  Share "Led Backend Migration to Microservices"      |
|  --------------------------------------------------- |
|                                                       |
|  -- Create New Link -------------------------------- |
|  |  Tier:  (o) Public  (*) Recruiter  (o) Mentor   | |
|  |         "Full story with evidence and metrics"    | |
|  |  Label: [ Acme Corp - Jane Smith              ]  | |
|  |  Expires:  [ 30 days v ]  (7d/30d/90d/Never)    | |
|  |                              [ Create Link ]     | |
|  --------------------------------------------------- |
|                                                       |
|  -- Active Links (2) ------------------------------- |
|                                                       |
|  * Recruiter - "Acme Corp - Jane Smith"              |
|    inchronicle.com/p/k7x9m2a1?t=a1b2c3...           |
|    Created 2d ago - 3 views - Last: 1h ago           |
|    [Copy] [Revoke]                                    |
|                                                       |
|  * Mentor - "Coach Sarah"                            |
|    inchronicle.com/p/j8n4p6b2?t=d4e5f6...           |
|    Created 5d ago - 7 views - Last: yesterday         |
|    [Copy] [Revoke]                                    |
|                                                       |
|  -- Revoked (1) ------------------------------------ |
|  x Recruiter - "OldCo" (revoked 3d ago)              |
|                                                       |
+-----------------------------------------------------+
```

**Tier selector** hint text:
- Public: "Anyone with the link sees a summary of your story"
- Recruiter: "Full story with evidence and metrics"
- Mentor: "Full story with your annotations visible"

**Post-creation:** Auto-copy URL to clipboard + toast "Link copied to clipboard".

**Revoke:** Confirmation dialog before revoking.

### Public Viewer Page

Route: `/p/:shortCode` in React Router, lazy-loaded with Suspense.

**Three states:**

1. **Content loaded** — tier-appropriate story rendering (reuses PublishedStoryPage section rendering as an extracted inner component)
2. **Error states:**
   - **Revoked** — branded page: "This share link has been revoked. Contact the author if you need access."
   - **Expired** — branded page: "This share link has expired. Contact the author for a new link."
   - **Not found / Content removed** — branded page: "This story is no longer available."
3. **Loading** — spinner (same as current PublishedStoryPage)

**Public tier** shows truncated sections + author info. No "Request full access" CTA (dead end without a designed request flow — deferred to v2).

**OG meta tags** (set via SSR or server-side HTML injection):
- `og:title` — story title
- `og:description` — first 160 chars of first section teaser
- `og:type` — "article"
- `og:image` — default InChronicle branded card (static asset)

### SPA Routing

Both Vite dev server and production `server.mjs` must serve `index.html` for `/p/*` paths so React Router handles the route client-side. The page then fetches content from `GET /api/v1/pragma/resolve/:shortCode`.

### Unpublish Warning

When a user unpublishes a story that has active (non-revoked, non-expired) pragma links, show a warning:

> "This story has 3 active share links. They will continue working even after unpublishing. Would you like to revoke them?"
> [Keep Links] [Revoke All]

---

## Backend

### New Files

```
backend/src/services/pragma-link.service.ts       -- CRUD + resolution + tier filtering
backend/src/routes/pragma-link.routes.ts          -- Authenticated management endpoints
backend/src/controllers/pragma-link.controller.ts -- Request handling
```

### Short Code & Token Generation

```typescript
import crypto from 'crypto';

// 30-char alphabet: no ambiguous chars (0/O, 1/l/I)
const SHORT_CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

function generateShortCode(): string {
  const result: string[] = [];
  for (let i = 0; i < 8; i++) {
    let byte: number;
    // Rejection sampling to avoid modulo bias (256 % 30 = 16)
    do {
      byte = crypto.randomBytes(1)[0];
    } while (byte >= 240); // 240 = 30 * 8, largest multiple of 30 <= 255
    result.push(SHORT_CODE_CHARS[byte % SHORT_CODE_CHARS.length]);
  }
  return result.join('');
}

function generateToken(): string {
  // Opaque, no role prefix — tier stored server-side only
  return crypto.randomBytes(24).toString('base64url'); // 32 chars
}
```

### Rate Limiting

```typescript
// /api/v1/pragma/resolve/:shortCode
// 60 requests per minute per IP (general)
// Token brute-force protection not needed — 32-char base64url tokens are not guessable
```

### Source Mode Validation

At link creation time:
```typescript
const story = await prisma.careerStory.findUnique({ where: { id: storyId } });
if (story.sourceMode === 'demo') {
  throw new Error('Cannot create share links for demo stories');
}
```

### GDPR: IP Retention

Cron job or Prisma middleware to auto-nullify `ip` on PragmaLinkView rows older than 30 days:

```sql
UPDATE pragma_link_views SET ip = NULL WHERE viewed_at < NOW() - INTERVAL '30 days' AND ip IS NOT NULL;
```

---

## Security Considerations

- **Tokens are 32-char crypto-random base64url** — 2^192 bits of entropy, not guessable or enumerable
- **Short codes are 8 chars from 30-char alphabet** — 30^8 = 656 billion combinations with rejection sampling (no modulo bias)
- **Short code collision handling** — retry up to 3 times on unique constraint violation
- **No passwords** — token is the auth credential. Revoke + recreate if compromised.
- **Rate limiting** — 60 req/min/IP on public resolution endpoint
- **IP logging** — best-effort, auto-deleted after 30 days (GDPR compliance)
- **Revocation is immediate** — `revokedAt` checked before any content is served
- **Opaque tokens** — no role/tier prefix, no information leakage
- **Response headers** — `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`
- **User.isActive check** — deactivated accounts' links return "content no longer available"
- **sourceMode validation** — demo stories cannot have pragma links

---

## What's NOT in v1

| Feature | Deferred to |
|---|---|
| Custom slugs | v2 |
| Collaborator tier (testimonials) | v2 |
| Mentor inline commenting (write-back) | v2 (read-only annotations in v1) |
| Detailed analytics page | v2 (inline view count in v1) |
| Derivation links | v2 (add nullable `derivationId` column) |
| Packet/portfolio links | v2 |
| Password protection | v2 (if users request it) |
| Email notification on view | v2 |
| QR code generation | v2 |
| "Request full access" CTA on public tier | v2 (needs request flow design) |

---

## Migration Path

1. Add `PragmaLink` and `PragmaLinkView` models to Prisma schema
2. Add `pragmaLinks PragmaLink[]` relation to `User` model
3. Add `pragmaLinks PragmaLink[]` relation to `CareerStory` model
4. Run `prisma migrate dev`
5. Configure `/p/*` catch-all in Vite dev server and production `server.mjs`
6. No changes to existing `CareerStory` or `StoryDerivation` models beyond adding the relation

---

## Success Criteria

- User can create a share link for any story (published or not, excluding demo)
- Each link has a unique short code and unique opaque token
- Link resolves to tier-appropriate view: public (teaser), recruiter (full+sources), mentor (full+sources+annotations)
- Views are tracked per link with deduplication (1/IP/link/hour)
- Logged-in viewers' userIds are recorded for richer analytics
- Links can be revoked instantly via ShareModal
- Expired links show a branded "link expired" page
- Revoked links show a branded "link revoked" page
- Deleted stories cascade-delete their pragma links
- OG meta tags render when link is pasted in Slack/LinkedIn/email
- Unpublishing a story with active links prompts the user to revoke them
- Link count limits enforced: 20 active per story, 100 total per user

---

## Review Log

| Reviewer | Score | Verdict | Key Feedback |
|---|---|---|---|
| **DLG** (Diligent) | Ship | Fix shortCode/token ambiguity + password-in-GET | sourceMode missing, story deletion orphans, redundant indexes |
| **RJ** (Russian Judge) | 6.5/10 | Iterate | Password antipattern, OG tags critical, error states undesigned |
| **GSE** (Grumpy Staff Engineer) | Ship (scoped) | Cut password, cut polymorphic, cut dead flags | FK not polymorphic, viewCount denorm drifts, referrer always null |
| **PGC** (Paul Graham Clarity) | 7/10 | Ship | "role" vs "tier" naming, shortCode uniqueness bug, doc structure |

All feedback incorporated in this revision.
