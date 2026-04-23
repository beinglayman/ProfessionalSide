# Profile Rebuild — Design Document

**Status:** Design complete, awaiting pickup.
**Do not start until these ship first:**
1. **Stories page co-sign:** peer can request validation, peer can validate or request edits as validator.
2. **Narratives page:** currently missing. Should land as a page with auto-built narratives (e.g. "leadership stories" clustered by theme) and custom-built narratives (e.g. "performance review for last 6 weeks", "promotion packet from Apr 2025 to Mar 2026").
3. **Story Creation Simplification — Ship 4b:** per-draft LLM rephrasing of question intents, plus activity-derived option chips (Jira severity → stakes chips, GitHub review-heat → hardest chips, etc.). Ship 4a (generic intents + why-we-ask explainer + skip feedback) is already live; 4b is the polish layer. Profile's Story-pops flow (flow E) is the biggest downstream consumer of well-phrased Stories, so it should wait.

Once both are live, this profile rebuild picks up as the third Q2 Proof-Layer build (roadmap: `docs/2026-04-19-inchronicle-roadmap-recalibrated.md` → "Q2 2026 — The Proof Layer → `/me` redesign").

---

## Context

Today's `/me` page (`src/pages/profile/view.tsx`) is scaffolding — it shows OAuth connection rings, not validated career entries. That directly contradicts the product sentence: *"every claim has evidence or a peer behind it."* This design turns Profile into the **verified career surface** that the pitch requires, and positions it as a full substitute for the LinkedIn profile page (artifact substitute, not platform substitute — no social graph, no feed, no messaging).

The design reflects two non-negotiable product positions:
- **Hybrid Documented + Validated model.** Every bullet on Work Experience is either Documented (user asserted it) or Validated (grounded in a Story claim). Both render publicly with subtle visual distinction — Validated gets a small check badge; Documented is plain text. Documented is the norm for pre-InChronicle history; Validated is aspirational but not shaming.
- **Skills are Validated by construction.** Skills can *only* originate from Story claims — never hand-typed. This kills LinkedIn's worst antipattern (50 unbacked skills per profile) at the data-model level, not via UX nudge.

---

## 1. Product Shape (5 fixed sections, no custom)

Profile has exactly five top-level sections, in this order. No custom sections. No catalog (publications/patents/speaking/etc.) in MVP — dropped for substance over breadth.

1. **Identity** — name, photo, one-line tagline, location.
2. **About** — one paragraph, user-written.
3. **Work Experience** — role + company + dates + bullets. Each bullet independently Documented or Validated.
4. **Skills** — flat list, ≤10 visible. Validated-by-construction (no Documented state).
5. **Featured Stories** — 3 pinned Story cards.

**Explicitly deferred to post-MVP:** Education, Certifications, Publications, Patents, Speaking, Open Source, Awards, Advisory, Volunteering, Recommendations, custom sections.

**Owner view** (`/me`): same 5 sections with inline add/edit affordances and contextual hints ("3 Story pops waiting"). The current OAuth connection rings UI is demoted to Settings.

**Public view** (`inchronicle.com/u/<slug>`): same 5 sections, no edit affordances. Validated items show a small check + tooltip (grounding Story title, published date, co-sign count); click → jumps to the Story with the grounding claim highlighted. Documented items are plain text with no hover behavior.

---

## 2. Data Model

```
Profile
  identity { name, tagline, location, photoUrl }
  about { paragraph }
  workExperience: WorkExperience[]
  skills: Skill[]             // Validated-by-construction
  featuredStories: string[]   // max 3 storyIds
  publicSlug: string          // unique, editable-once
  contactCta: 'email' | 'request-cosign' | 'none'

WorkExperience
  id, company, role, startDate, endDate (nullable = current)
  orgDomain (nullable — filled when sourced from OAuth signal)
  source: ('manual' | 'resumeImport' | 'oauthSignal')[]
  bullets: Bullet[]

Bullet
  id, text
  state: 'documented' | 'validated'  // derived: validated iff groundingLinks.length >= 1
  groundingLinks: GroundingLink[]

Skill
  id, name
  groundingLinks: GroundingLink[]    // >=1 by construction; auto-hidden from public if drops to 0

GroundingLink
  storyId, claimId, linkedAt, linkedBy: 'user' | 'auto-confirmed'

profile_signals (separate table, proposals queue — not on profile until user accepts)
  userId, signalType, payload, proposedAt, resolvedAt, outcome
  signalTypes:
    - workExperienceStart { orgDomain, companyGuess, connectedAt }
    - workExperienceEnd   { orgDomain, authFailureAt }
    - storyClaimMatch     { storyId, claimId, targetKind: 'skill'|'bullet', targetId? }
```

**State machine for bullets:** one direction only. `documented → validated` when user confirms a link to a Story claim. Never reverses. If the grounding Story is unpublished, the link survives but surfaces "grounding removed, re-link?" in the owner view.

**Boolean, not score.** No gradient of validation, no percentile. Honest per roadmap open question #2 ("Boolean is honest. Score is game-able").

---

## 3. Bootstrap & Input Flows

Three flows with three different triggers.

### C — Resume / LinkedIn import (one-time, cold start)

At sign-up, user uploads a resume PDF or pastes a LinkedIn PDF export. An LLM pass extracts only:
- `identity` (name, tagline from headline)
- `about` (summary paragraph if present)
- `workExperience[]` (role + company + dates + bullets — all Documented)

**Skills are dropped.** Per the rule, skills only come from Stories. Everything imported lands directly on the profile (not the signals queue) because the user explicitly uploaded. User reviews a diff screen before the first save.

### B' — OAuth-domain signal (ongoing, passive)

Listens to three events on existing MCP integrations (reuses `src/services/mcp.service.ts` + the 9 live integrations):
- **Connect** `honey@acme.com` → signal `workExperienceStart { orgDomain: acme.com, connectedAt }`. A resolver maps domain → company name (lookup table for common orgs + Clearbit-style fallback; unresolved → raw domain, user edits).
- **Permanent auth failure** on a previously working integration → `workExperienceEnd`.
- **Second active work email** → propose closing the older role.

All land in `profile_signals` and surface as pops in `/me`. **Dedup rule:** if a resume-imported WE entry matches `company` with overlapping dates to an OAuth-derived one, merge into one entry and union the `source` array.

### E — Story pops (the magic moment)

Fires on Story publish. LLM extracts claim-level skill candidates and bullet candidates from the published Story. A matcher runs against existing Documented bullets on the profile (embedding similarity + string overlap, threshold ~0.82):
- **Upgrade pop** — high-confidence match to existing Documented bullet → one-click "confirm link" upgrades it to Validated.
- **New-skill pop** — skill candidate not already on profile → one-click "add to skills".
- **New-bullet pop** — claim doesn't match any existing bullet on any role → propose as new Validated bullet under the relevant role (company matched from Story's Activity sources).

Batched into a single "Profile pops (N)" card shown on the post-publish confirmation screen *and* persisted in the signals queue.

---

## 4. Public Surface

- **URL:** `inchronicle.com/u/<slug>`. Slug defaults to firstname-lastname, editable once, unique.
- **Indexability:** `noindex` until profile has ≥ 1 published Story *and* ≥ 1 Validated item. Protects the "every profile has substance" promise from empty skeletons in Google results.
- **Evidence density strip** (top of public view, below identity):
  > `12 of 47 claims validated · 2 pending peer co-sign · last grounded 3 days ago`

  Click → drawer listing every item with its state. Headline metric. No gamified score.
- **Validated hover:** small filled check on each Validated item → tooltip shows grounding Story title, published date, co-sign count → click jumps to Story with claim highlighted. Documented items are plain text, no hover.
- **Contact CTA** (owner-configurable, one of): `Email` (mailto), `Request co-sign` (logged-in InChronicle users only), `None`. No DMs, no connections graph.
- **PDF export:** header button → server-rendered PDF of the same 5 sections; Validated items marked `✓ verified`; footer line *"Verified by InChronicle · view live: inchronicle.com/u/<slug>"*. ATS fallback.
- **Owner-only view counts:** small stat in `/me` header — `238 profile views this week · up 34% vs last week`. Aggregate only, never named visitors. Public view shows nothing about views.
- **OG/Twitter cards:** rich preview with name, tagline, "X validated claims."

**Non-goals (explicit):** no feed, no activity timeline on public view, no endorsement widget, no "People who viewed your profile," no named-visitor analytics, no "People you may know," no InMail, no job listings.

---

## 5. Build Order (5 atomic ships)

Each ship is independently demoable. Cumulative estimate 6–9 weeks after Stories co-sign + Narratives page are live.

| # | Ship | What lands | Est. |
|---|------|------------|------|
| 1 | **Schema + Identity/About/WorkExperience (Documented-only)** | New profile shape with hand-edit Documented items. Owner view + public URL + indexability rule. No import, no signals, no Stories grounding yet. | 1–2 wk |
| 2 | **Resume / LinkedIn import (flow C)** | LLM extracts identity + about + workExperience into profile as Documented. Diff-review screen. No skills. | 1 wk |
| 3 | **Story pops — bullet upgrade path (flow E, upgrade)** | Match engine runs on Story publish; Documented bullets upgrade to Validated via user confirm. Check badge + tooltip + click-through. | 1–2 wk |
| 4 | **Story-born skills (flow E, new-item)** | Skills section ships. Extraction + dedup + user-confirm flow. Skills render publicly with grounding links. | 1 wk |
| 5 | **OAuth-domain signal (B') + Featured Stories + evidence density + PDF export + view counts** | Polish ship. | 1–2 wk |

**Critical dependency inversion:** Ship 1 must land *before* co-sign extends to profile items. Stories co-sign (prerequisite) is Story-level only; a later quarter can extend co-sign to profile work-experience bullets once Validated items exist.

---

## Critical files & reuse

- `src/pages/profile/view.tsx` — rewritten. Current OAuth-rings content moves to a Settings subpage.
- `src/hooks/useProfile.ts` — extended with new data model.
- `src/services/mcp.service.ts` — source for OAuth-domain signal events (B').
- `src/components/career-stories/` — Story publish hook is where the E-flow extractor hangs.
- `src/pages/journal/list.tsx` — no change (Timeline page is unrelated).
- New: `src/pages/profile/public.tsx` for `/u/<slug>` (public view) + server-side render for PDF export.
- New: `profile_signals` table + migrations.
- New: LLM extraction module for resume parse and Story claim → skill/bullet candidates (reuse existing Claude API client; apply prompt caching for the extraction prompt).

---

## Verification (when eventually built)

1. **Cold-start flow:** new account → upload resume PDF → review diff → confirm → `/me` renders identity + about + work experience as Documented. Skills section empty.
2. **First Story grounding:** user publishes a Story → post-publish screen shows "Profile pops (N)" card → user confirms one skill and one bullet upgrade → `/me` shows Validated badge on bullet + new skill in Skills section.
3. **OAuth signal:** user connects a new work email integration → within 1 min, `/me` shows a pop proposing a new Work Experience entry with the company/domain pre-filled → user confirms → entry lands as Documented.
4. **Public view:** open `/u/<slug>` in incognito → 5 sections render → evidence density strip shows correct counts → hover a Validated badge → tooltip → click jumps to Story → PDF export button downloads styled PDF → no edit affordances visible → no messaging/connect UI.
5. **Indexability:** `curl -I inchronicle.com/u/<newslug>` returns `X-Robots-Tag: noindex` until ≥ 1 Story + ≥ 1 Validated item exist.
6. **Skills integrity:** attempt to POST a skill directly to the API with no groundingLinks → server rejects (enforces Validated-by-construction at the data layer, not just UI).
7. **View-count privacy:** open `/u/<slug>` from a different account → owner's `/me` view-count increments by 1 → public view shows nothing about views.

---

## Open items to resolve at pickup time

- Company-name resolution for B' (simple static map vs Clearbit-style API vs both with fallback).
- PDF export renderer (server-side Puppeteer vs React-PDF vs a template service).
- Slug collision UX (append number? prompt user?).
- Whether to show "recently viewed by 3 recruiters" *category* hint (no names) as a Q3 follow-up — defer the call.
