# Tools Integration Architecture

> How InChronicle gets work data from customer accounts into career stories.

## The 30-Second Version

Users OAuth-connect their tools (GitHub, Jira, etc.). On sync, we fetch their recent activity, transform it into a common format, persist it as `ToolActivity` records, cluster related activities across tools, and generate career narratives via LLM.

```
User connects tool → OAuth token encrypted & stored
User hits "Sync"   → Fetch → Transform → Persist → Cluster → Generate → Story
```

---

## What's Working Today (Feb 2026)

### Tools: 12 configured, 4 actually produce `ToolActivity` records

| Tool | Fetcher | Transformer | Signal Extractor | Status |
|------|---------|-------------|------------------|--------|
| **GitHub** | `github.tool.ts` | `github.transformer.ts` | collaborators + branch container | **Full pipeline** |
| **Jira** | `jira.tool.ts` | `jira.transformer.ts` | collaborators + epic container | **Full pipeline** |
| **Confluence** | `confluence.tool.ts` | `confluence.transformer.ts` | collaborators + space container | **Full pipeline** |
| **OneDrive** | `onedrive.tool.ts` | `onedrive.transformer.ts` | none | **Persists, no signals** |
| Outlook | `outlook.tool.ts` | **none** | none | Fetches, silently dropped |
| Slack | `slack.tool.ts` | **none** | slack extractor exists | Fetches, silently dropped |
| Figma | `figma.tool.ts` | **none** | figma extractor exists | Fetches, silently dropped |
| Google Workspace | `google-workspace.tool.ts` | **none** | none | Fetches, silently dropped |
| Teams | `teams.tool.ts` | **none** | none | Fetches, silently dropped |
| OneNote | `onenote.tool.ts` | **none** | none | Fetches, silently dropped |
| Zoom | `zoom.tool.ts` | **none** | none | Fetches, silently dropped |
| SharePoint | `sharepoint.tool.ts` | **none** | none | Disabled (needs admin consent) |

**The gap**: 8 tools have fetchers but no transformer, so their data is fetched into memory but never reaches `ToolActivity`. The `transformToolActivity()` switch in `transformers/index.ts` hits the `default` branch and returns `[]`.

### OAuth Groups (single auth, shared token)

- **Atlassian**: Jira + Confluence
- **Microsoft**: Outlook + Teams + OneDrive + OneNote

---

## Architecture Layers

### Layer 1: OAuth & Token Management

```
backend/src/services/mcp/mcp-oauth.service.ts
```

- OAuth 2.0 with PKCE for public clients
- Tokens AES-256 encrypted at rest in `MCPIntegration` table
- Per-tool: `@@unique([userId, toolType])`
- Auto-refresh on expiry
- Group OAuth: one Atlassian auth covers both Jira + Confluence

### Layer 2: Tool Fetchers

```
backend/src/services/mcp/tools/*.tool.ts
```

Each tool class (`GitHubTool`, `JiraTool`, etc.):
1. Gets decrypted access token from `MCPOAuthService`
2. Calls external API with date range filters
3. Returns `MCPServiceResponse<ToolActivity>` — data in memory only, 30-min TTL

**GitHub fetch stages** (example of the most mature fetcher):
- Stage 1: User info, repos, PRs, issues (parallel)
- Stage 2: Commits per-repo (depends on Stage 1 — switched from `/user/events` because that caps at 100 events total, crowding out commits)
- Stage 3: Releases, workflow runs, deployments, review comments, starred repos (parallel, non-blocking)

**Jira fetch**: Issues via JQL with sprint/epic/label data, changelogs (status transitions), worklogs, issue links, project versions.

### Layer 3: Transformers (the bottleneck)

```
backend/src/services/mcp/transformers/index.ts  →  switch(toolType)
```

Converts tool-specific API responses into unified `ActivityInput`:

```typescript
interface ActivityInput {
  source: string;       // "github" | "jira" | etc.
  sourceId: string;     // "org/repo#42" | "PROJ-123"
  sourceUrl?: string;   // Link back to source
  title: string;
  description?: string; // Critical: contains cross-tool refs like "Fixes PROJ-123"
  timestamp: Date;
  rawData?: Record<string, unknown>; // For signal extraction
}
```

Only 4 transformers exist: `github`, `jira`, `confluence`, `onedrive`. Everything else returns `[]`.

### Layer 4: Persistence

```
backend/src/services/career-stories/activity-persistence.service.ts
```

`ActivityInput[]` → `ToolActivity` records with:
- `crossToolRefs: string[]` — extracted by `RefExtractorService`
- `rawData: Json` — preserved for signal extraction
- Upsert on `@@unique([userId, source, sourceId])`

### Layer 5: Cross-Tool Reference Extraction

```
backend/src/services/career-stories/ref-extractor.service.ts
```

Regex patterns detect links between activities:

| Pattern | Example | Output |
|---------|---------|--------|
| Jira ticket | `PROJ-123` in PR body | `"PROJ-123"` |
| GitHub PR | `org/repo#42` | `"org/repo#42"` |
| GitHub URL | `github.com/org/repo/pull/42` | `"org/repo#42"` |
| Confluence | `atlassian.net/wiki/.../pages/123` | `"confluence:123"` |
| Figma | `figma.com/file/ABC123/...` | `"figma:ABC123"` |

These refs are stored in `ToolActivity.crossToolRefs[]` and used for clustering.

### Layer 6: Signal Extraction

```
backend/src/services/career-stories/signal-extractor.ts
```

Extracts clustering signals from `rawData` per tool:

| Tool | Container Signal | Collaborator Signals |
|------|-----------------|---------------------|
| GitHub | Feature branch (excludes main/master/develop/release/hotfix) | Author, reviewers |
| Jira | Epic key | Assignee, reporter, watchers |
| Slack | Thread timestamp (not channel — too broad) | Author, mentions |
| Confluence | Space key | Creator, editors |
| Figma | File key | Owner, commenters |

Self-exclusion and deduplication built in. `IdentityMatcher` normalizes names.

### Layer 7: Clustering (Two-Layer)

**Layer 1 — Heuristic Graph** (instant, free):
```
backend/src/services/career-stories/clustering.service.ts
```
Connected components via DFS on shared `crossToolRefs`. Activities sharing a Jira ticket, GitHub PR, etc. cluster together. Collaborator overlap (>=2 shared people) and container matches add edges.

**Layer 2 — LLM Refinement** (<$0.005/sync):
```
backend/src/services/career-stories/production-sync.service.ts  (inline)
```
Unclustered activities sent to Haiku for KEEP/MOVE/NEW assignment. Falls back to Layer 1 only on failure.

### Layer 8: Narrative Generation

```
backend/src/services/career-stories/pipeline/narrative-extractor.ts
```

Clusters → STAR/CAR/PAR framework narratives via Sonnet. Results stored in `CareerStory.sections` JSON.

---

## The Sync Flow (production-sync.service.ts)

```
syncProductionActivities(userId, toolTypes, dateRange)
  │
  ├── 1. Fetch from each tool (parallel)
  │     └── github.tool.ts.fetchActivity() → MCPServiceResponse
  │
  ├── 2. Transform each tool's data
  │     └── transformToolActivity(toolType, data) → ActivityInput[]
  │         ⚠️ 8 tools return [] here (no transformer)
  │
  ├── 3. Persist to ToolActivity table
  │     └── Upsert with crossToolRefs + rawData
  │
  ├── 4. Extract signals from rawData
  │     └── extractSignals(source, rawData, selfIds) → {collaborators, container}
  │
  ├── 5. Cluster (Layer 1: heuristic graph)
  │     └── clusterProductionActivities() using refs + signals
  │
  ├── 6. Cluster (Layer 2: LLM assignment)
  │     └── Haiku assigns unclustered → existing/new clusters
  │
  ├── 7. Create JournalEntry records (temporal + cluster-based grouping)
  │
  └── 8. Generate narratives per entry (Sonnet, with SSE progress events)
```

---

## Recent Commits (Feb 2026)

### `5bc4b91` — Fetch unfetched GitHub & Jira data (+1,186 lines)

**GitHub additions**: releases, workflow runs, deployments, review comments, starred repos — all within existing `repo read:user` scopes.

**Jira additions**: changelogs (status transitions), worklogs, issue links, project versions, labels — all within existing `read:jira-work` scope.

**Structural fix**: Created `jira.transformer.ts` — Jira data was never persisted to ToolActivity before this commit.

### `2273f56` — Confluence transformer (+186 lines)

Created `confluence.transformer.ts` (pages, blog posts, comments). Added Confluence fallback in `createFallbackOrganization()`. Extracted labels from v2 API responses at zero extra API cost.

**Structural fix**: Confluence data was silently dropped on AI failure (no fallback handler).

### `157fa46` — Per-repo GitHub commits

Switched from `/user/events` (100 event cap across all types) to per-repo `/repos/{owner}/{repo}/commits` with server-side `since`/`until`, querying up to 10 recently-active repos in parallel.

### `3572902` — Signal extractor (26 tests, +560 lines)

New `signal-extractor.ts`: per-tool collaborator + container extraction. Branch blacklist, self-exclusion, deduplication.

### `5af6dc8` — LLM cluster assignment (Layer 2)

Wired Haiku into production sync. Unclustered activities get KEEP/MOVE/NEW assignment. Falls back to Layer 1.

### `0f623ff` — Wire signals into sync pipeline

Connected `extractSignals()` call into production sync after activity persistence. Signals now feed Layer 1 clustering.

---

## Key Gaps

### Gap 1: 8 tools fetch but don't persist (transformer gap)

Outlook, Slack, Figma, Google Workspace, Teams, OneNote, Zoom, SharePoint all have fetchers but no transformer. Their data gets fetched into memory and then silently lost when `transformToolActivity()` returns `[]`.

**Impact**: Users connect these tools, see them as "connected", sync happens, but zero activities appear from them.

**Fix**: Write transformers for each tool. Priority order from Phase 2 research:
1. Outlook (calendar attendees, email participants — deterministic API fields)
2. Google Workspace (Calendar events, Drive file activity — deterministic)
3. Figma (files, comments — deterministic)
4. Slack (messages, threads — rate-limited, Tier 3)

### Gap 2: Signal extraction missing for OneDrive, Outlook, Google

Even for tools with transformers, OneDrive has no signal extractor. Once Outlook/Google get transformers, they'll also need signal extractors for collaborator/container signals.

### Gap 3: rawData ref extraction incomplete

`RefExtractorService` only extracts refs from text fields (title, description, sourceUrl). It doesn't look at structured `rawData` fields like `rawData.key` (Jira), `rawData.pageId` (Confluence), `rawData.channelId` (Slack).

### Gap 4: ADF parsing not implemented

Jira and Confluence @mentions are stored as structured ADF (Atlassian Document Format) JSON nodes, not plain text. Current regex patterns miss these. Phase 2 research has a full implementation spec (`03-DEEP-DIVE-ADF-MENTIONS.md`).

### Gap 5: Google Meet not B2C-viable

Google Meet participant data requires Admin SDK (organization-level consent). Workaround: use Calendar attendee lists as a proxy. Documented in Phase 2 research (`04-DEEP-DIVE-GOOGLE-WORKSPACE.md`).

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Token storage | AES-256 encrypted in PostgreSQL | Minimal attack surface, no separate secrets service needed |
| Data retention | Memory-only, 30-min TTL sessions | GDPR compliant by design — no right-to-erasure complexity |
| Clustering approach | Shared refs > keywords | Deterministic, zero false positives (PROJ-123 in PR body = same project) |
| Collaborator signal | People overlap >= 2 | Universal across all tools, already normalized by IdentityMatcher |
| LLM for clustering | Haiku only for unclustered leftovers | <$0.005/sync, Layer 1 handles 80%+ free |
| GitHub commits | Per-repo listing, not /user/events | /user/events caps at 100 events total, push events get crowded out |
| OAuth grouping | Atlassian group, Microsoft group | Single auth flow connects 2-4 tools at once |

---

## File Index

| File | What it does |
|------|-------------|
| `backend/src/services/mcp/mcp-oauth.service.ts` | OAuth token lifecycle |
| `backend/src/services/mcp/mcp-session.service.ts` | 30-min TTL memory sessions |
| `backend/src/services/mcp/mcp-privacy.service.ts` | Consent + audit logging |
| `backend/src/services/mcp/tools/*.tool.ts` | Per-tool API fetchers (12 files) |
| `backend/src/services/mcp/transformers/*.transformer.ts` | Tool data → ActivityInput (4 files) |
| `backend/src/services/mcp/transformers/index.ts` | Transformer dispatch (switch on toolType) |
| `backend/src/services/mcp/mcp-multi-source-organizer.service.ts` | Orchestrates multi-tool fetch + AI pipeline |
| `backend/src/services/mcp/content-sanitizer.service.ts` | Strips IPR for network view |
| `backend/src/services/career-stories/activity-persistence.service.ts` | ActivityInput → ToolActivity DB records |
| `backend/src/services/career-stories/ref-extractor.service.ts` | Cross-tool ref extraction (regex) |
| `backend/src/services/career-stories/signal-extractor.ts` | Collaborator + container extraction |
| `backend/src/services/career-stories/clustering.service.ts` | Layer 1: heuristic graph clustering |
| `backend/src/services/career-stories/production-sync.service.ts` | Orchestrates entire sync flow |
| `backend/src/services/career-stories/pipeline/` | Narrative generation pipeline |
| `backend/src/types/mcp.types.ts` | MCPToolType enum, session types, OAuth types |
| `backend/src/routes/mcp.routes.ts` | API endpoints |
| `backend/src/controllers/mcp.controller.ts` | Request handlers |
| `src/services/mcp.service.ts` | Frontend API client |
| `src/pages/onboarding/steps/connect-tools.tsx` | Tool connection UI |

---

## Prior Research

The `.archive/backend/__docs/research/entries-feasibility-phase2/` directory contains completed Phase 2 research (Jan 2026):

| Document | What it covers |
|----------|---------------|
| `00-RESEARCH-BRIEF.md` | Mission: map all interaction types across B2C-accessible APIs |
| `01-SOURCE-MAP.md` | Deterministic vs text-parsing per tool (most signals are deterministic API fields) |
| `02-GOLD-SEAM-MAP.md` | Priority areas and pitfalls |
| `03-DEEP-DIVE-ADF-MENTIONS.md` | Full ADF parser implementation spec for Jira/Confluence @mentions |
| `04-DEEP-DIVE-GOOGLE-WORKSPACE.md` | Calendar, Drive, Meet API feasibility |
| `05-EVIDENCE-MATRIX.md` | Complete tool x signal mapping (10 evidence types x 7 tools) |
| `06-EXTRACTION-SPEC.md` | Implementation guidance with code examples |
| `07-GAP-ANALYSIS.md` | Identified gaps (mock data, ref extraction, clustering, tests) |

**Key finding from research**: 11 of 13 participant signals are deterministic API fields. Only Jira/Confluence @mentions need parsing (ADF format).
