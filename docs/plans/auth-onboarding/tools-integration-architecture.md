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
backend/src/services/mcp/mcp-oauth.service.ts  (singleton: import { oauthService })
backend/src/services/mcp/mcp-oauth.service.test.ts  (23 tests)
backend/src/cli/oauth-cli.ts  (6 CLI commands)
```

- **Singleton pattern**: One exported `oauthService` instance, all 12 tool fetchers and 2 controllers use static import (no `new MCPOAuthService()`)
- Tokens AES-256 encrypted at rest in `MCPIntegration` table
- Per-tool: `@@unique([userId, toolType])`
- Group OAuth: one Atlassian auth covers both Jira + Confluence

**Reliability fixes (Feb 2026)**:
1. **Retry with backoff**: 3 attempts on 5xx/429, exponential backoff, honors `Retry-After` header. 400/401 = permanent failure, no retry.
2. **Proactive refresh**: Triggers refresh 5 minutes before expiry, not after.
3. **Refresh mutex**: `Map<string, Promise>` deduplicates concurrent refresh calls per user+tool.
4. **Encryption fail-fast**: Constructor throws if `ENCRYPTION_KEY`/`MCP_ENCRYPTION_KEY` missing. No fallback to `JWT_SECRET` or `'default-key'`.
5. **State parameter expiry**: `iat` timestamp in OAuth state, 10-minute max age, rejects legacy states without `iat`.
6. **Token revocation on disconnect**: Calls provider-specific revocation endpoint before deactivating integration. Best-effort (disconnect succeeds even if revocation fails).

**Deferred**: PKCE (YAGNI — confidential client with `client_secret`), class split (zero user value at current file size).

**CLI** (`npm run oauth-cli -- <command>`): `status`, `inspect`, `refresh`, `validate-all`, `disconnect`, `simulate-failure`, `setup --provider <name>`, `validate`.

**Admin API** (3 endpoints for frontend setup wizard):
- `GET /api/v1/admin/oauth/providers` — list all providers with status, setup instructions, callback URLs
- `POST /api/v1/admin/oauth/providers/:provider/configure` — write clientId/clientSecret to .env + hot-reload into `process.env`
- `GET /api/v1/admin/oauth/validate` — validate all provider configs

**Shared Provider Contract**: `backend/src/services/mcp/oauth-provider-contract.ts` — single source of truth for env keys, callback paths, console URLs, scopes. Imported by CLI and API controller.

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

### OAuth Reliability & Onboarding (feat/oauth-reliability branch)

| Commit | Change |
|--------|--------|
| `afcbe9e` | Singleton export + structured log object |
| `6ab3083` | Replace 17 `new MCPOAuthService()` with singleton import |
| `40fadb0` | Remove unsafe encryption key fallback chain |
| `d2fe47b` | Retry with exponential backoff on refresh failure |
| `e04f0b3` | Proactive token refresh 5 min before expiry |
| `e1c726d` | Refresh mutex to prevent concurrent refresh races |
| `03aa4cf` | State parameter `iat` timestamp, reject stale/legacy states |
| `4553a8e` | Token revocation on disconnect + controller rewire |
| `0e4367c` | OAuth CLI: status, inspect, refresh, validate-all, disconnect, simulate-failure |
| `ac74ebe` | Hardening: decrypt safety, structured logging, edge case tests (23 total) |
| `eaa2738` | OAuth setup CLI plan (lean 5-day) |
| `5b65de4` | Add commander dependency + oauth-cli npm script |
| `3f3f634` | Fix stale env template + add OAuth setup guide to README |
| `589fc8d` | Pre-execution plan for setup CLI |
| `ef46160` | Scaling fixes plan for 1000+ user readiness |
| `3c3fd57` | Admin API + shared provider contract for OAuth setup wizard |
| `2c5fcf8` | Add zoom + google_workspace to frontend MCPToolType |
| `5e0a4e3` | Onboarding: 4 real OAuth buckets, real hooks, connection gate, Coming Soon |
| `1288318` | OAuth callback: onboarding return detection with 15-min stale guard |

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
| OAuth service | Singleton, not per-request instances | Enables refresh mutex, consistent state, simpler imports |
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
| `src/pages/onboarding/steps/connect-tools.tsx` | Onboarding tool connection (4 OAuth buckets, real hooks) |
| `src/pages/mcp/callback.tsx` | OAuth callback with onboarding return detection |
| `backend/src/cli/oauth-cli.ts` | OAuth CLI (8 commands: setup, validate, status, inspect, refresh, validate-all, disconnect, simulate-failure) |
| `backend/src/services/mcp/oauth-provider-contract.ts` | Shared provider contract (env keys, callback paths, scopes, console URLs for all 4 providers) |
| `backend/src/controllers/oauth-setup.controller.ts` | Admin API for OAuth provider setup wizard (3 endpoints) |
| `backend/src/services/mcp/mcp-oauth.service.test.ts` | OAuth service tests (23 tests) |

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
