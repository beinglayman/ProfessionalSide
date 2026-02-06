# Career Story Publishing & Distribution — Design

## Problem

Career stories live only at `/career-stories`. Zero connection to Profile, Workspace, or Network.
Backend is 80% ready. Frontend is 0% wired. Publishing is a 3.5px icon button.

## Vision

**GitHub repo visibility, applied to career stories. Twitter feed for professional work.**

Profile becomes a shareable brag document. Network feed shows stories from people you follow.

### Content Pipeline & Provenance

```
Raw Tool Activities → Journal Entry → Career Story (promoted via wizard)
```

Journal entries and raw activities = internal working material (activities tab).
Career stories = refined, publishable output (profile + feed).

**Provenance is visible:** Each career story traces back to its source journal entry and raw tool activities. On the profile, published career stories are the primary view, but users can drill down to see the evidence chain — the journal entry it was promoted from, and the raw activities that fed it. This gives the brag document credibility: "here's the story, and here's the proof."

**Note:** Currently CareerStory has no direct `journalEntryId` FK — provenance is indirect via `activityIds` overlap. This design adds a `journalEntryId` field for direct lineage tracking.

### Design Debate Outcomes

| Topic | Decision | Rationale |
|---|---|---|
| 100-cap on follows | Keep | Product philosophy: "Your 100 most important professional voices." Forces curation. |
| Workspace at launch | **Defer to Phase 2** | Infrastructure ready but premature. No real orgs yet. Launch with private + network. |
| Profile tab strategy | **Replace journal entries** | Journal entries are raw material. Career stories are the refined output. Profile shows polished work only. |
| Network ⊃ Workspace | Yes | Publishing to network = visible to everyone including workspace members. Workspace-only = internal stuff. |
| Connect at launch | **Defer** | Launch with Follow only. Connect (two-way, approval) is future scope for messaging/endorsements. |

---

## Visibility Model

Three tiers, matching GitHub (workspace deferred to Phase 2):

| Visibility | Who sees it | GitHub analog | Phase |
|---|---|---|---|
| `private` | Only you | Private repo | 1 |
| `workspace` | Org members | Internal repo | **2 (deferred)** |
| `network` | All signed-up users + shareable profile | Public repo | 1 |

**Naming:** Standardize on `'network'` everywhere. Frontend currently uses `'public'` — rename to `'network'`.

**Hierarchy:** Network ⊃ Workspace. Publishing to `network` makes it visible to everyone, including workspace members. Publishing to `workspace` limits to org members only.

### Changes Required

| Layer | Current | After |
|---|---|---|
| Prisma schema | `'private' \| 'workspace' \| 'network'` | No change |
| `StoryPublishingService` | `Visibility = 'private' \| 'workspace' \| 'network'` | No change |
| Controller validation | `['public', 'workspace', 'private']` | `['network', 'workspace', 'private']` |
| Frontend `StoryVisibility` | `'private' \| 'workspace' \| 'public'` | `'private' \| 'workspace' \| 'network'` |

**Phase 1 UI** shows "Publish to Network" + Cancel in PublishModal. No private option (private is default). Workspace option added in Phase 2.

---

## Distribution Surfaces

### 1. Profile Page (Brag Document)

- `/profile/:userId` "Published Work" tab shows **career stories** (replaces journal entries)
- Calls existing `GET /career-stories/users/:userId/published-stories`
- **Organized by brag document categories** (not a flat chronological list)
- Shareable URL — this is your public brag document

#### Brag Document Categories

Inspired by Julia Evans' brag document template, collapsed to 4 categories to minimize publish-time cognitive overhead.

| Category | What goes here | Archetype affinity |
|---|---|---|
| **Projects & Impact** | Core work output — shipped features, solved problems, built systems, architecture decisions | firefighter, architect, detective, pioneer |
| **Leadership & Collaboration** | Mentoring, cross-team alignment, code reviews, hiring, onboarding, process improvements | multiplier, diplomat |
| **Growth & Learning** | Skill growth, new tools mastered, domain expertise gained, certifications | All (maps to STARL/CARL `learning` section) |
| **External** | Blog posts, conference talks, open source, industry recognition, public documentation | pioneer |

#### Role Badge (separate from category)

Each story also carries an auto-detected **role badge**: `Led | Contributed | Participated`

This is already in the AI prompt (`draft-story-system.prompt.md:32-35`) — the LLM detects participation level from activity patterns. Category = *what kind of work*. Role = *your involvement level*. Orthogonal axes.

**Implementation:**
- New `category` field on `CareerStory` (set during publish in PublishModal)
- New `role` field on `CareerStory` (auto-detected during generation, editable)
- Profile page renders sections with headings, stories grouped under each category
- Empty sections are hidden
- Default category: "Projects & Impact" (most stories land here)
- Category selector added to PublishModal right panel
- Archetype + role badges shown in NarrativePreview detail header (not on StoryCard — keeps cards clean)

### 2. Workspace Feed (Phase 2 — deferred)

- Stories from workspace members with `visibility: 'workspace'` or `'network'`
- Scoped to the workspace context
- Requires fixing the hardcoded `isWorkspaceMember = false` in `career-stories.controller.ts:1151`
- Uses existing `WorkspaceMember` model for membership check
- **Deferred:** No real orgs using the platform yet. Ship once B2B angle materializes.

### 3. Network Feed

- Stories from people you follow with `visibility: 'network'`
- Chronological feed, newest first
- Requires new Follow infrastructure

#### Empty Feed & Discovery

New users follow nobody — their feed is empty. This kills first-session engagement. Minimum viable solution:

**Empty state:** "Your feed is empty. Follow people to see their career stories here."

**Suggested users section** (below empty state or as sidebar when feed has content):
- Query: users with the most published stories (`network` visibility), ordered by publish count desc
- Show: name, title, published story count, "Follow" button
- Cap: top 20 suggestions, exclude users already followed
- No algorithm — just "most active publishers" as a starting point

This is lightweight to build (one query + a card list) and solves the cold-start problem.

---

## Follow Model

**One-way follow, no approval, capped at 100.**

### New Prisma Model

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User @relation("Follower", fields: [followerId], references: [id], onDelete: Cascade)
  following   User @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@map("follows")
}
```

### Constraints

- **100 follow cap** per user (backend-enforced)
- One-way: I follow you, no approval needed
- Separate from `NetworkConnection` (which handles two-way mutual connections)
- Unfollowing is instant, frees a slot

### API Endpoints

```
POST   /network/follow/:userId      → follow (checks 100 cap)
DELETE /network/follow/:userId      → unfollow
GET    /network/following            → list who I follow (max 100)
GET    /network/followers            → list who follows me (paginated)
GET    /network/feed                 → stories from people I follow (paginated)
```

### Connect (Phase 2 — deferred)

Existing `NetworkConnection` model handles two-way connections:
- Two-way, approval-based, unlimited
- `status: 'pending' | 'accepted'`
- Unlocks deeper features (messaging, endorsements) — future scope
- **Not part of Phase 1 launch.** Follow is sufficient for feed + distribution.

---

## Archetype Storage & Surfacing

### DB Change

Add `archetype`, `category`, `role`, and `journalEntryId` columns to `CareerStory`:

```prisma
model CareerStory {
  // ... existing fields ...
  archetype      String?  // firefighter, architect, diplomat, etc.
  category       String?  // projects-impact, leadership, growth, external
  role           String?  // led, contributed, participated (auto-detected by LLM)
  journalEntryId String?  // FK to source journal entry (provenance chain)

  journalEntry   JournalEntry? @relation(fields: [journalEntryId], references: [id])
}
```

`journalEntryId` closes the provenance gap — currently the only link between a career story and its source journal entry is an indirect `activityIds` overlap query. This makes the lineage explicit and queryable.

### New Types

```typescript
export type BragDocCategory =
  | 'projects-impact'
  | 'leadership'
  | 'growth'
  | 'external';

export type StoryRole = 'led' | 'contributed' | 'participated';
```

### UI: Badge Hierarchy

StoryCard is compact — avoid clutter. Two tiers of badge visibility:

**StoryCard (always visible):** Framework + Status only
```
[STAR] [Published]  3 activities • ~1:30 • Jan 15, 2026
```

**NarrativePreview detail (full context):** Framework + Archetype + Role + Status
```
[STAR] [Architect] [Led] [Published to Network]
```

Archetype and role are detail-level metadata — they matter when reading the story, not when scanning a list. This keeps StoryCard clean while the preview panel shows everything.

Uses existing `ARCHETYPE_METADATA` from `constants.ts` for labels and grouping.

### UI: FormatSwitchModal

Add archetype picker alongside framework and style:

- **Framework** = structure (STAR, SOAR, CAR...)
- **Archetype** = narrative angle (firefighter, architect, detective...)
- **Style** = tone (professional, casual, technical, storytelling)

Three independent knobs in one modal. Archetype picker uses same grouped layout as framework picker (proactive / reactive / people groups from `ARCHETYPE_GROUPS`).

### Backend

`regenerate()` already accepts archetype via `CareerStoryPromptParams.archetype`. Just needs:
1. Store archetype on create/regenerate
2. Return archetype in API responses
3. Accept archetype in regenerate request body

### API Response Update

The `PublishedStory` interface in `story-publishing.service.ts` currently returns: id, title, publishedAt, visibility, framework, sections, activityIds. It must be extended to include the new fields:

```typescript
export interface PublishedStory {
  // ... existing fields ...
  archetype?: string;
  category?: string;
  role?: string;
  journalEntryId?: string;
}
```

Without this, the profile page won't have the data it needs for category grouping, archetype/role badges, or provenance drill-down.

---

## Publish Ceremony (PublishModal)

Replace the tiny icon button with a proper modal, same weight as FormatSwitchModal.

### Trigger

- "Publish" button in NarrativePreview toolbar (replacing tiny icon)
- Opens PublishModal

### Layout

**Left panel:** Story preview
- Title, framework badge, archetype badge
- Section summaries (collapsed)
- Key metrics, speaking time
- Activity count, date range

**Right panel:** Publish options
- **Brag doc category picker:** Projects & Impact / Leadership & Collaboration / Growth & Learning / External
  - Default: "Projects & Impact"
  - Determines where the story appears on your profile
- **"Who will see this"** explainer: "All inChronicle users can see this on your profile and in their feed"
- **Career quote** (from `CAREER_QUOTES`, publishing-themed)

### Action Buttons

- **Primary:** "Publish to Network" — publishes with `visibility: 'network'`
- **Secondary:** "Cancel" — closes modal, story stays in current state (private/saved)
- No "Save as Private" button. Private is the default state, not a publish action. To take a published story back to private, use "Unpublish."
- (Phase 2 adds: "Publish to [Workspace Name]" when workspace visibility is enabled)

### Status Flow

No separate "Ready" state. Opening PublishModal = implicit quality approval.

**StoryCard badges:**
- `Draft` — no content
- `Saved` — has content, not published
- `Published` + visibility indicator (workspace icon / network icon)

### Edit Published Story Metadata

When a story is published, NarrativePreview toolbar shows:
- **Change category** — dropdown to reassign brag doc category (moves story to a different profile section)
- **Unpublish** — confirmation dialog: "This will remove the story from your profile and followers' feeds. Continue?" Sets `isPublished: false`, clears `publishedAt`

---

## Implementation Order

### Phase 1: Launch (private + network)

**1a. Backend Foundation**
1. **Visibility alignment** — rename frontend `'public'` → `'network'`, fix controller validation
2. **New DB columns** — Prisma migration: archetype, category, role, journalEntryId on CareerStory
3. **Provenance FK** — update wizard `generateStory()` and `createFromJournalEntry()` to store `journalEntryId`
4. **Follow model** — Prisma migration, CRUD endpoints, 100-cap validation
5. **Archetype in regeneration** — store on create/regenerate, accept in request body
6. **Role auto-detection** — store LLM-detected role (led/contributed/participated) on story
7. **Update PublishedStory API response** — include archetype, category, role, journalEntryId in returned fields

**1b. Publishing UI**
8. **PublishModal** — new component, category picker, "Publish to Network" + Cancel
9. **Replace NarrativePreview publish buttons** — trigger PublishModal instead
10. **Published story toolbar** — change category dropdown + unpublish in NarrativePreview
11. **Update StoryCard StatusBadge** — Draft/Saved/Published + visibility indicator

**1c. Distribution**
12. **Profile rewiring** — replace journal entries with career stories, organized by brag doc categories
13. **Network feed** — new page/section showing followed users' stories
14. **Suggested users** — "most active publishers" query for empty feed / sidebar discovery

**1d. Archetype UI (detail view only — not on StoryCard)**
15. **Archetype + role badges in NarrativePreview** — display in detail panel header
16. **Archetype in FormatSwitchModal** — picker alongside framework + style
17. **Pass archetype through regeneration pipeline** — backend already supports it

### Phase 2: Workspace + Connect (deferred)

15. **Workspace membership check** — unblock `isWorkspaceMember` in controller
16. **Workspace visibility in PublishModal** — add workspace option + workspace selector
17. **Workspace feed** — stories from org members
18. **Connect model** — two-way approval flow using existing `NetworkConnection`

---

## Files That Need Changes

| Concern | File(s) |
|---|---|
| Visibility rename | `src/types/career-stories.ts`, `career-stories.controller.ts:1119` |
| New DB columns | `schema.prisma` (archetype, category, role, journalEntryId) |
| Provenance FK | `story-wizard.service.ts`, `career-story.service.ts` (store journalEntryId on create) |
| API response update | `story-publishing.service.ts` (PublishedStory interface + select) |
| Brag doc categories | `constants.ts` (new `BRAG_DOC_CATEGORIES`), `src/types/career-stories.ts` |
| Follow model | `schema.prisma`, new `follow.service.ts`, `network.routes.ts` |
| PublishModal | New `PublishModal.tsx` |
| NarrativePreview toolbar | `NarrativePreview.tsx:1487-1495` (publish button + category change + unpublish) |
| StoryCard badges | `StoryCard.tsx:31-63` (framework + status only) |
| NarrativePreview badges | `NarrativePreview.tsx` (archetype + role badges in detail header) |
| Profile rewiring | `src/pages/profile/public-view.tsx` |
| FormatSwitchModal archetype | `FormatSwitchModal.tsx` |
| Feed + discovery | New feed component(s), suggested users query |
| Workspace check (Phase 2) | `career-stories.controller.ts:1151` |

---

## GSE Review Fixes Applied

| # | Issue | Fix |
|---|---|---|
| 1 | No `journalEntryId` FK — provenance claim not implementable | Added `journalEntryId` to migration + wizard/service updates |
| 2 | "Save as Private" in PublishModal is confusing — private isn't publishing | Removed. Modal = "Publish to Network" + Cancel. Unpublish is a separate action. |
| 3 | 4 badges on StoryCard = visual clutter | Framework + status on StoryCard. Archetype + role in NarrativePreview detail only. |
| 4 | No way to re-categorize after publishing | Added "Change category" dropdown to NarrativePreview toolbar for published stories |
| 5 | Empty feed state — new users see nothing | Added suggested users section ("most active publishers" query) for discovery |
| 6 | `PublishedStory` API missing new fields | Updated interface to include archetype, category, role, journalEntryId |

---

## Out of Scope

- Workspace visibility (Phase 2)
- Connect / two-way connections (Phase 2)
- Rename "regenerate" → "rewrite" (vocabulary cleanup)
- Framework onboarding / tooltips
- `GeneratingState` extraction from FormatSwitchModal
- Messaging / endorsements (Connect feature, future)
- Feed algorithm / recommendations (start with chronological)
