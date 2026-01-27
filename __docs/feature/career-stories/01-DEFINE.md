# InChronicle: Career Stories — Requirements Definition

## CD6 Define Document

**Created:** January 2026
**Stage:** Define
**Concept:** [00-CONCEPT.md](./00-CONCEPT.md)
**Role:** Specifier (Define Maker)

---

## Executive Summary

Transform InChronicle from a journaling tool into a career story generator. Engineers connect their tools, entries are enhanced and clustered, and STAR narratives are generated with evidence links and verification.

**Primary User:** Senior Software Engineer preparing for promotion conversation
**Core Value:** "You did the work. Now prove it."

---

## Epics

| Epic | Description | Phase |
|------|-------------|-------|
| **E1: Entry Persistence** | Store enhanced entries in Postgres for multi-week analysis | Phase 1 |
| **E2: Entry Enhancement** | Classify entries and extract signals from raw data | Phase 1 |
| **E3: Hard-Link Clustering** | Group entries by shared Jira tickets, PRs, participants | Phase 2 |
| **E4: Cluster Management** | UI for viewing, merging, splitting, renaming clusters | Phase 2 |
| **E5: STAR Generation** | Generate evidence-backed narratives from clusters | Phase 3 |
| **E6: Verification** | Challenge claims and suggest evidence gaps | Phase 3 |
| **E7: Demo UI** | Polished UI matching YC pitch script | Phase 4 |

---

## Epic 1: Entry Persistence

### User Stories

#### US-1.1: Database Schema
**As a** developer
**I want** Prisma models for EnhancedEntry, StoryCluster, CareerStory
**So that** entries can be persisted and queried

**Acceptance Criteria:**
- [ ] `EnhancedEntry` model exists with all fields from concept doc
- [ ] `StoryCluster` model exists with entry relationship
- [ ] `CareerStory` model exists with STAR JSON fields
- [ ] User model has `enhancedEntries` and `storyClusters` relations
- [ ] Migration runs without errors
- [ ] Indexes exist on `[userId, timestamp]` and `[userId, source]`
- [ ] Unique constraint on `[userId, source, sourceId]` prevents duplicates

**Technical Notes:**
- Schema defined in concept doc section 1.1
- Add to existing `schema.prisma`

---

#### US-1.2: Persist Entries After Analysis
**As a** user who fetches MCP data
**I want** my analyzed activities saved to the database
**So that** I can cluster them later across multiple sessions

**Acceptance Criteria:**
- [ ] When MCP organizer runs, entries are persisted to `enhanced_entries` table
- [ ] Duplicate entries (same source + sourceId) are skipped, not errored
- [ ] Entry timestamp matches original activity time, not fetch time
- [ ] Raw activity data is stored in `rawData` JSON field for debugging
- [ ] Source URL is preserved for evidence linking

**Technical Notes:**
- Modify `mcp-multi-source-organizer.service.ts`
- Use `createMany` with `skipDuplicates: true`

---

#### US-1.3: List Enhanced Entries API
**As a** frontend developer
**I want** an API to list a user's enhanced entries
**So that** I can display them in the UI

**Acceptance Criteria:**
- [ ] `GET /api/career-stories/entries` returns user's entries
- [ ] Supports `?from=DATE&to=DATE` query params for date filtering
- [ ] Supports `?source=github,jira` for source filtering
- [ ] Supports `?clustered=false` to show only unclustered entries
- [ ] Returns entries sorted by timestamp descending
- [ ] Pagination with `?limit=50&offset=0`
- [ ] Response includes total count for pagination

**Response Schema:**
```json
{
  "entries": [
    {
      "id": "cuid",
      "source": "github",
      "title": "PR: Add search optimization",
      "timestamp": "2026-01-24T14:30:00Z",
      "entryType": "initiated",
      "actionType": "pr_merged",
      "importance": "high",
      "impactSignals": { "approvalCount": 2 },
      "effortSignals": { "linesChanged": 847 },
      "skills": ["TypeScript", "Elasticsearch"],
      "sourceUrl": "https://github.com/...",
      "clusterId": null
    }
  ],
  "total": 24,
  "hasMore": false
}
```

---

## Epic 2: Entry Enhancement

### User Stories

#### US-2.1: Classify Entry Type
**As a** user viewing my entries
**I want** each entry classified as "initiated" or "participation"
**So that** I know what I drove vs. what I contributed to

**Acceptance Criteria:**
- [ ] PR author → `entryType: initiated`
- [ ] PR reviewer → `entryType: participation`
- [ ] Meeting organizer → `entryType: initiated`
- [ ] Meeting attendee → `entryType: participation`
- [ ] Ticket assignee who closed → `entryType: initiated`
- [ ] Ticket commenter → `entryType: participation`
- [ ] Page creator → `entryType: initiated`
- [ ] Page editor (not creator) → `entryType: participation`
- [ ] Classification happens in AnalyzerAgent prompt (not separate service)

**Technical Notes:**
- Add to AnalyzerAgent prompt, not post-processing
- LLM has context to determine role from activity metadata

---

#### US-2.2: Extract Action Type
**As a** system
**I want** each entry to have a specific actionType
**So that** I can filter and aggregate by action

**Acceptance Criteria:**
- [ ] GitHub PRs: `pr_opened`, `pr_merged`, `pr_reviewed`, `pr_commented`
- [ ] GitHub Issues: `issue_created`, `issue_closed`, `issue_commented`
- [ ] GitHub Commits: `commit_pushed`
- [ ] Jira: `ticket_created`, `ticket_updated`, `ticket_closed`, `ticket_commented`
- [ ] Confluence: `page_created`, `page_updated`, `page_commented`, `blog_published`
- [ ] Outlook: `meeting_organized`, `meeting_attended`, `email_sent`
- [ ] Figma: `design_created`, `design_updated`, `design_commented`
- [ ] actionType is derived from source + activity state (not LLM guessing)

**Technical Notes:**
- Deterministic mapping based on source data fields
- e.g., PR with `merged: true` → `pr_merged`

---

#### US-2.3: Extract Impact Signals
**As a** user preparing for promotion
**I want** to see impact metrics on my entries
**So that** I can highlight high-impact work

**Acceptance Criteria:**
- [ ] GitHub PR: `approvalCount` = number of approving reviews
- [ ] GitHub PR: `commentCount` = total comments on PR
- [ ] Jira ticket: `commentCount` = number of comments
- [ ] Confluence page: `viewCount` = page views (if available via API)
- [ ] Slack message: `reactionCount` = total emoji reactions
- [ ] All signals stored in `impactSignals` JSON field
- [ ] Missing signals are omitted (not set to 0)

**API Availability Check:**
| Signal | Source | Available? |
|--------|--------|------------|
| approvalCount | GitHub PR reviews API | Yes |
| commentCount | GitHub/Jira API | Yes |
| viewCount | Confluence Analytics API | Requires admin |
| reactionCount | Slack API | Yes (rate-limited) |

---

#### US-2.4: Extract Effort Signals
**As a** user
**I want** to see effort metrics on my entries
**So that** I can demonstrate the work I put in

**Acceptance Criteria:**
- [ ] GitHub PR: `linesChanged` = additions + deletions
- [ ] GitHub PR: `filesEdited` = number of changed files
- [ ] Jira ticket: `timeSpentMinutes` = logged time (if available)
- [ ] Confluence page: `revisionCount` = version number
- [ ] All signals stored in `effortSignals` JSON field
- [ ] Signals come from raw API data, not LLM estimation

**Technical Notes:**
- GitHub: Use `additions`, `deletions`, `changed_files` from PR API
- Jira: Use `timetracking.timeSpentSeconds` (convert to minutes)

---

#### US-2.5: Detect Cross-Tool References
**As a** system
**I want** to find references between tools (Jira IDs in PRs, etc.)
**So that** entries can be clustered by shared references

**Acceptance Criteria:**
- [ ] Detect Jira ticket IDs: `PROJ-123` pattern in PR title/body/commits
- [ ] Detect GitHub PR refs: `#123` or full URL in Jira/Confluence
- [ ] Detect Confluence page links in Jira tickets
- [ ] Store in `crossToolRefs` JSON: `{ jiraTickets: [], githubPRs: [], confluencePages: [] }`
- [ ] Regex patterns documented and tested

**Regex Patterns:**
```typescript
// Jira ticket: PROJECT-123
const JIRA_PATTERN = /\b([A-Z]{2,10}-\d+)\b/g;

// GitHub PR: #123 or org/repo#123 or full URL
const GITHUB_PR_PATTERN = /(?:([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+))?#(\d+)/g;
const GITHUB_URL_PATTERN = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/g;

// Confluence: atlassian.net/wiki/spaces/.../pages/ID
const CONFLUENCE_PATTERN = /atlassian\.net\/wiki\/.*\/pages\/(\d+)/g;
```

---

#### US-2.6: Extract Actors
**As a** user
**I want** to know who was involved in each entry
**So that** I can see collaboration patterns

**Acceptance Criteria:**
- [ ] `actor` = who performed the action (PR author, meeting organizer)
- [ ] `participants` = everyone else involved (reviewers, attendees, commenters)
- [ ] Actor and participants extracted from source API data
- [ ] Names normalized to consistent format (email or username)

---

## Epic 3: Hard-Link Clustering

### User Stories

#### US-3.1: Cluster by Shared References
**As a** user
**I want** my entries automatically grouped by shared Jira tickets/PRs
**So that** related work appears together as a story

**Acceptance Criteria:**
- [ ] Entries sharing a Jira ticket ID are clustered together
- [ ] Entries sharing a GitHub PR reference are clustered together
- [ ] Transitive clustering: if A→Jira-123 and B→Jira-123, then A and B cluster
- [ ] Clusters have auto-generated title from most common reference
- [ ] Unclustered entries remain with `clusterId: null`

**Algorithm:**
1. Build reference graph: ref → [entry IDs]
2. Find connected components
3. Each component = one cluster

---

#### US-3.2: Generate Clusters API
**As a** user
**I want** to trigger clustering for a date range
**So that** I can organize my recent work

**Acceptance Criteria:**
- [ ] `POST /api/career-stories/clusters/generate` triggers clustering
- [ ] Request body: `{ "from": "2026-01-01", "to": "2026-01-31" }`
- [ ] Only unclustered entries in range are processed
- [ ] Existing clusters are not modified
- [ ] Response returns new cluster count and IDs
- [ ] Idempotent: re-running doesn't create duplicate clusters

---

#### US-3.3: List Clusters API
**As a** frontend developer
**I want** an API to list user's clusters
**So that** I can display them in the UI

**Acceptance Criteria:**
- [ ] `GET /api/career-stories/clusters` returns user's clusters
- [ ] Includes entry count per cluster
- [ ] Includes aggregated metrics (total lines changed, total effort)
- [ ] Supports `?status=draft,active` filtering
- [ ] Sorted by most recent entry timestamp

**Response Schema:**
```json
{
  "clusters": [
    {
      "id": "cuid",
      "title": "Search Infrastructure Migration",
      "summary": null,
      "entryCount": 7,
      "totalLinesChanged": 1444,
      "totalEffortMinutes": 270,
      "status": "draft",
      "latestEntryAt": "2026-01-24T14:30:00Z",
      "entries": [{ "id": "...", "title": "...", "timestamp": "..." }]
    }
  ]
}
```

---

#### US-3.4: Update Cluster API
**As a** user
**I want** to rename, merge, or modify clusters
**So that** I can organize my stories my way

**Acceptance Criteria:**
- [ ] `PATCH /api/career-stories/clusters/:id` updates cluster
- [ ] Can update: `title`, `summary`, `color`, `status`
- [ ] `POST /api/career-stories/clusters/:id/merge` merges another cluster into this one
- [ ] Merge moves all entries to target cluster, deletes source cluster
- [ ] `DELETE /api/career-stories/clusters/:id` deletes cluster (entries become unclustered)

---

#### US-3.5: Move Entry Between Clusters
**As a** user
**I want** to drag an entry from one cluster to another
**So that** I can fix clustering mistakes

**Acceptance Criteria:**
- [ ] `PATCH /api/career-stories/entries/:id` with `{ "clusterId": "new-cluster-id" }`
- [ ] Entry count updated on both old and new cluster
- [ ] Moving to `clusterId: null` removes from cluster
- [ ] Can move to a new cluster created on the fly

---

## Epic 4: Cluster Management UI

### User Stories

#### US-4.1: Cluster List View
**As a** user
**I want** to see my clusters as cards
**So that** I can browse my work stories

**Acceptance Criteria:**
- [ ] Clusters displayed as cards with title, entry count, date range
- [ ] Color indicator for each cluster
- [ ] Click to expand and see entries
- [ ] Unclustered entries shown separately

---

#### US-4.2: Drag and Drop Entries
**As a** user
**I want** to drag entries between clusters
**So that** I can manually organize my work

**Acceptance Criteria:**
- [ ] Drag entry card to different cluster
- [ ] Visual feedback during drag
- [ ] Drop zone highlights
- [ ] API called on drop
- [ ] Optimistic UI update

---

#### US-4.3: Merge Clusters
**As a** user
**I want** to merge two clusters into one
**So that** I can combine related work

**Acceptance Criteria:**
- [ ] Select two clusters
- [ ] "Merge" button appears
- [ ] Choose which title to keep
- [ ] Entries combined
- [ ] Source cluster deleted

---

## Epic 5: STAR Generation

### User Stories

#### US-5.1: Generate STAR from Cluster
**As a** user
**I want** to generate a STAR narrative from my cluster
**So that** I have a ready-to-use career story

**Acceptance Criteria:**
- [ ] `POST /api/career-stories/stories/generate` with `{ clusterId, intent }`
- [ ] Intent options: `promotion`, `interview`, `negotiation`, `review`
- [ ] Returns STAR JSON with Situation, Task, Action, Result
- [ ] Each section includes evidence links to entries
- [ ] Action items include effort metrics ("847 lines", "4.5 hrs")
- [ ] Result includes quantified outcomes

**STAR Response Schema:**
```json
{
  "id": "cuid",
  "intent": "promotion",
  "situation": {
    "text": "Search was slow — half a second per query...",
    "evidence": [
      { "entryId": "...", "date": "2026-01-06", "description": "Triaged timeout reports" }
    ]
  },
  "task": {
    "text": "Lead the migration with zero downtime...",
    "evidence": [...]
  },
  "action": {
    "items": [
      {
        "description": "Built search service foundation",
        "effort": "312 lines",
        "evidence": { "entryId": "...", "url": "github.com/..." }
      }
    ]
  },
  "result": {
    "metrics": ["10x faster (450ms → 45ms)", "Zero downtime"],
    "evidence": [...]
  },
  "verification": [
    { "claim": "10x faster", "status": "needs_evidence", "suggestion": "Add Datadog dashboard or PM confirmation" }
  ],
  "verificationScore": 67
}
```

---

#### US-5.2: Intent-Specific Formatting
**As a** user
**I want** different STAR formats for different situations
**So that** my story fits the context

**Acceptance Criteria:**
- [ ] **Promotion**: Emphasizes scope, ownership, cross-team impact
- [ ] **Interview**: Concise, emphasizes transferable skills
- [ ] **Negotiation**: Impact-first, shows value delivered
- [ ] **Review**: Balanced, includes growth areas
- [ ] Intent affects prompt, not post-processing

---

## Epic 6: Verification

### User Stories

#### US-6.1: Identify Unverified Claims
**As a** user
**I want** the AI to challenge my claims
**So that** I don't exaggerate in my story

**Acceptance Criteria:**
- [ ] Quantified claims flagged if no evidence: "10x faster — who says so?"
- [ ] Leadership claims flagged if only participation entries: "Led — did you lead or participate?"
- [ ] Cross-team claims flagged if no other teams in participants
- [ ] Each flag includes suggestion for evidence to add

**Verification Statuses:**
- `verified` — Evidence exists in entries
- `needs_evidence` — Claim made, no supporting entry
- `needs_context` — Claim is vague, needs specifics

---

#### US-6.2: Add Evidence to Claim
**As a** user
**I want** to add evidence to flagged claims
**So that** my story becomes bulletproof

**Acceptance Criteria:**
- [ ] Click "Add evidence" on flagged claim
- [ ] Options: select existing entry, add URL, add text note
- [ ] Added evidence updates verification status
- [ ] Verification score recalculates

---

#### US-6.3: Verification Score
**As a** user
**I want** to see my story's verification score
**So that** I know how solid my evidence is

**Acceptance Criteria:**
- [ ] Score 0-100 based on % of claims verified
- [ ] Visual indicator: red (<50), yellow (50-80), green (>80)
- [ ] "Ready" badge when score > 80
- [ ] Score visible on cluster card and story view

---

## Epic 7: Demo UI

### User Stories

#### US-7.1: Entry Stream Animation
**As a** demo viewer
**I want** to see entries stream in visually
**So that** I understand the data being captured

**Acceptance Criteria:**
- [ ] Entries appear one by one with 150ms stagger
- [ ] Color-coded by source (GitHub=green, Jira=blue, etc.)
- [ ] Shows title, timestamp, source icon
- [ ] Stream can be triggered on demand

---

#### US-7.2: Cluster Animation
**As a** demo viewer
**I want** to see entries cluster together
**So that** I understand the grouping

**Acceptance Criteria:**
- [ ] Entries fly/animate into cluster cards
- [ ] Cluster card grows as entries join
- [ ] Clear visual of "same tickets = same story"

---

#### US-7.3: STAR Viewer
**As a** user
**I want** a polished view of my STAR story
**So that** I can present it confidently

**Acceptance Criteria:**
- [ ] Sections expand sequentially
- [ ] Evidence links highlighted on hover
- [ ] Click evidence to see source entry
- [ ] Export to markdown/PDF

---

## Non-Functional Requirements

### NFR-1: Performance
- Entry list API: < 200ms for 100 entries
- Clustering: < 2s for 200 entries
- STAR generation: < 10s (LLM call)

### NFR-2: Privacy
- Entries only visible to owner
- No cross-user data access
- User can delete all entries

### NFR-3: Data Integrity
- No duplicate entries (unique constraint)
- Cascade delete: user → entries → clusters → stories
- Audit log for all deletions

---

## Open Questions (For Clarifier)

1. **Q:** Should we store entry data indefinitely or offer retention limits?
   **Context:** Privacy vs. historical clustering

2. **Q:** What happens to clusters when entries are deleted?
   **Options:** Delete cluster, keep with fewer entries, archive

3. **Q:** Should clustering be automatic or user-triggered?
   **Context:** Background job vs. on-demand

4. **Q:** Maximum entries per cluster before suggesting split?
   **Proposal:** Warn at 20, suggest split at 30

---

## Definition of Done

Phase 1 (Entry Persistence + Enhancement):
- [ ] All US-1.x acceptance criteria pass
- [ ] All US-2.x acceptance criteria pass
- [ ] 24 test entries persisted from demo data
- [ ] API endpoints documented in Swagger/OpenAPI

Phase 2 (Clustering):
- [ ] All US-3.x acceptance criteria pass
- [ ] All US-4.x acceptance criteria pass
- [ ] 3 clusters generated matching demo script
- [ ] Drag-and-drop works in UI

Phase 3 (STAR + Verification):
- [ ] All US-5.x acceptance criteria pass
- [ ] All US-6.x acceptance criteria pass
- [ ] STAR generated for "Search Migration" cluster
- [ ] Verification catches "10x faster" claim

Phase 4 (Demo):
- [ ] All US-7.x acceptance criteria pass
- [ ] Demo video recorded
- [ ] Matches YC pitch script timing

---

## Traceability

| Requirement | Concept Section | Demo Script Act |
|-------------|-----------------|-----------------|
| US-1.x | Phase 1: Persist Enhanced Entries | Act 2: Firehose |
| US-2.x | BUILDING: Enhanced Entry Schema | Act 2: Firehose |
| US-3.x | Phase 2: Hard-Link Clustering | Act 3: Clusters |
| US-4.x | Phase 2: Cluster UI | Act 3: Clusters |
| US-5.x | Phase 3: STAR Generation | Act 4: Generate STAR |
| US-6.x | Verification layer | Act 5: AI Challenges |
| US-7.x | Phase 4: Demo Polish | All Acts |

---

## Clarifier Review (Define Checker)

### Testability Assessment

| Story | Testable? | Issue | Resolution |
|-------|-----------|-------|------------|
| US-1.1 | ✅ Yes | — | Schema can be validated with migration |
| US-1.2 | ✅ Yes | — | Integration test with mock MCP data |
| US-1.3 | ✅ Yes | — | API test with fixtures |
| US-2.1 | ⚠️ Partial | "LLM determines role" is non-deterministic | Add fallback rules for when LLM is wrong |
| US-2.2 | ✅ Yes | Deterministic mapping | Unit test per source type |
| US-2.3 | ⚠️ Partial | viewCount requires admin API | Mark as optional, test what's available |
| US-2.4 | ✅ Yes | Direct from API data | Unit test per source |
| US-2.5 | ✅ Yes | Regex patterns | Unit test with edge cases |
| US-2.6 | ✅ Yes | From API data | Unit test per source |
| US-3.1 | ✅ Yes | Algorithm defined | Unit test with known graph |
| US-3.2 | ✅ Yes | API contract clear | Integration test |
| US-3.3 | ✅ Yes | — | API test |
| US-3.4 | ✅ Yes | — | API test |
| US-3.5 | ✅ Yes | — | API test |
| US-4.x | ⚠️ Partial | UI tests need E2E setup | Add Playwright tests |
| US-5.1 | ⚠️ Partial | LLM output non-deterministic | Test structure, not content |
| US-5.2 | ⚠️ Partial | "Emphasizes X" is subjective | Define concrete differences |
| US-6.1 | ⚠️ Partial | Detection logic undefined | Add specific rules |
| US-6.2 | ✅ Yes | — | Integration test |
| US-6.3 | ✅ Yes | Formula defined | Unit test |
| US-7.x | ⚠️ Partial | Animation timing subjective | Visual regression test |

### Completeness Gaps

1. **US-2.1 Fallback Rules Missing**
   - What if LLM misclassifies?
   - **Add:** Deterministic fallback based on API fields (author = initiated)

2. **US-5.2 Intent Differences Undefined**
   - "Emphasizes scope" is vague
   - **Add:** Concrete prompt differences per intent

3. **US-6.1 Detection Rules Undefined**
   - How does AI know "10x faster" needs evidence?
   - **Add:** Pattern matching for quantified claims

4. **Error Handling Missing**
   - What if GitHub API fails mid-fetch?
   - What if clustering has 0 entries?
   - **Add:** Error states for each API

5. **Concurrency Not Addressed**
   - What if user triggers clustering twice?
   - **Add:** Idempotency requirements

### Additions Required

#### US-2.1 Amendment: Deterministic Fallback

Add to acceptance criteria:
- [ ] If LLM fails to classify, fallback rules apply:
  - PR where user = author → `initiated`
  - PR where user ∈ reviewers → `participation`
  - Meeting where user = organizer → `initiated`
  - Meeting where user ∈ attendees → `participation`
  - Default: `participation`

#### US-5.2 Amendment: Intent Prompt Differences

| Intent | Prompt Modifier |
|--------|-----------------|
| **Promotion** | "Emphasize: scope of responsibility, ownership signals, cross-team coordination, technical decisions made" |
| **Interview** | "Emphasize: transferable skills, problem-solving approach, measurable outcomes. Keep concise (200 words max per section)" |
| **Negotiation** | "Lead with business impact. Quantify value delivered. Include: revenue, cost savings, time saved, efficiency gains" |
| **Review** | "Balance achievements with growth areas. Include: what went well, what you'd do differently, skills developed" |

#### US-6.1 Amendment: Claim Detection Rules

**Quantified claims to flag:**
```typescript
const QUANTIFIED_PATTERNS = [
  /(\d+)x\s*(faster|slower|better|improvement)/i,  // "10x faster"
  /(\d+)%\s*(increase|decrease|improvement)/i,     // "50% improvement"
  /reduced.*by\s*(\d+)/i,                          // "reduced by 30"
  /saved\s*\$?(\d+)/i,                             // "saved $10K"
  /(\d+)\s*(hours?|days?|weeks?)\s*saved/i,        // "20 hours saved"
];
```

**Leadership claims to flag:**
```typescript
const LEADERSHIP_PATTERNS = [
  /\b(led|lead|owned|drove|spearheaded|architected)\b/i,
  /\b(my initiative|I decided|I proposed)\b/i,
];
```

For each flagged claim:
1. Search entries for supporting evidence (URL, metric, third-party confirmation)
2. If not found → `needs_evidence`
3. If found but user-authored → `needs_context` (self-reported)
4. If found from external source → `verified`

#### New Story: US-1.4 Error Handling

**As a** user
**I want** graceful handling when data fetch fails
**So that** partial data is still saved

**Acceptance Criteria:**
- [ ] If one source fails, others still persist
- [ ] Failed source logged with error message
- [ ] User notified which sources failed
- [ ] Retry option available

#### New Story: US-3.6 Clustering Idempotency

**As a** user
**I want** clustering to be idempotent
**So that** running it twice doesn't create duplicates

**Acceptance Criteria:**
- [ ] Running clustering twice on same date range produces same result
- [ ] Already-clustered entries are skipped
- [ ] New entries in range are added to appropriate clusters
- [ ] No duplicate clusters created

---

## Scope Guardian Review (Define Arbiter)

### Priority Assessment

| Epic | Priority | Rationale |
|------|----------|-----------|
| E1: Entry Persistence | **P0 - Must** | Foundation for everything |
| E2: Entry Enhancement | **P0 - Must** | Required for useful entries |
| E3: Hard-Link Clustering | **P0 - Must** | Core differentiator |
| E4: Cluster Management | **P1 - Should** | Can use API directly for demo |
| E5: STAR Generation | **P0 - Must** | Demo requires it |
| E6: Verification | **P1 - Should** | Demo shows it, but can be simplified |
| E7: Demo UI | **P1 - Should** | Can record with existing UI + manual steps |

### MVP Cut Recommendation

**Phase 1 MVP (Demo-ready):**
- ✅ E1: Entry Persistence (all)
- ✅ E2: Entry Enhancement (US-2.1 through US-2.5, skip US-2.6 actors)
- ✅ E3: Hard-Link Clustering (US-3.1, US-3.2, US-3.3)
- ⏸️ E4: Cluster Management (skip — use API/database directly)
- ✅ E5: STAR Generation (US-5.1 only, skip US-5.2 intent variants)
- ⏸️ E6: Verification (simplify — just identify claims, skip add-evidence UI)
- ⏸️ E7: Demo UI (skip — record with existing journal UI + voiceover)

**What this means:**
- Can demo the full flow with 24 entries → 3 clusters → 1 STAR story
- Verification shows flags but doesn't have "add evidence" flow
- Demo uses existing UI, not custom animations
- Manual database queries for cluster management

### Risk: Scope Creep

**Watch for:**
- "Let's add one more actionType" — stick to the list
- "The animation needs to be smoother" — ship, then polish
- "We should support Slack reactions" — defer until after MVP

---

## Answers to Open Questions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Retention limits? | **No limit for MVP** | Simplicity. Add retention settings post-launch. |
| 2 | Clusters when entries deleted? | **Keep cluster with fewer entries** | Don't surprise user. Warn if cluster goes to 0. |
| 3 | Automatic vs triggered clustering? | **User-triggered for MVP** | Simpler. Add auto-clustering later. |
| 4 | Max entries per cluster? | **Warn at 20, suggest split at 30** | Accepted as proposed. |

---

## Sign-off

- [ ] **Specifier** (Define Maker): Requirements complete
- [ ] **Clarifier** (Define Checker): Testability verified, gaps addressed
- [ ] **Scope Guardian** (Define Arbiter): Priorities set, MVP defined

**Next Stage:** Design System (CD6 Architecture)
