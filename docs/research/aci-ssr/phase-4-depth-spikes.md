# Phase 4: Depth Spikes — ACI.dev for Inchronicle

**Date**: 2026-02-26

---

## Spike 1: ACI Data Extraction Granularity

### TL;DR

ACI wraps raw SaaS APIs as callable functions. Each function maps 1:1 to an API endpoint (e.g., `GITHUB__LIST_PULL_REQUESTS` → `GET /repos/{owner}/{repo}/pulls`). Responses are the **full upstream API response** — not summarized. This means we get the same data as direct API calls, proxied through ACI's auth + execution layer.

### How It Works

ACI's integration model:
```
1. Each SaaS tool = an "App" (e.g., GITHUB, JIRA, SLACK)
2. Each App exposes multiple "Functions" (e.g., GITHUB__LIST_PULL_REQUESTS, GITHUB__GET_COMMIT)
3. Each Function has a JSON Schema definition (parameters, required fields, return type)
4. Calling ACI_EXECUTE_FUNCTION runs the upstream API call with managed auth
5. Response = raw upstream API JSON (not transformed by ACI)
```

**Function discovery**:
```python
from aci import ACI
client = ACI(api_key="...")

# Search for functions by intent
functions = client.functions.search(query="list pull requests", app_names=["GITHUB"])
# Returns: [{ name: "GITHUB__LIST_PULL_REQUESTS", description: "...", parameters: {...} }]

# Get full function definition
definition = client.functions.get_definition("GITHUB__LIST_PULL_REQUESTS")
# Returns: JSON Schema with all parameters (owner, repo, state, per_page, page, etc.)

# Execute function
result = client.functions.execute(
    function_name="GITHUB__LIST_PULL_REQUESTS",
    function_input={"owner": "org", "repo": "repo", "state": "all", "per_page": 100},
    linked_account_owner_id="user-123"
)
# Returns: Raw GitHub API response — full PR objects with title, body, user, created_at, etc.
```

### What This Means for Inchronicle

**Good news**: ACI returns the same data we'd get from direct API calls. Our existing transformers (GitHub, Jira, etc.) would work with minor adaptation — the input shape is the same upstream API response.

**Implication**: ACI is a **fetch + auth layer**, not a data transformation layer. We still need our own transformers to convert raw API responses → `ActivityInput`.

### Data Fields Available (Verified from API Schemas)

| Tool | Function | Key Fields We Need | Available? |
|------|----------|--------------------|------------|
| GitHub | LIST_PULL_REQUESTS | title, body, user, created_at, merged_at, head.ref, requested_reviewers | Yes — full GH API response |
| GitHub | LIST_COMMITS | message, author, date, sha, stats (additions/deletions) | Yes |
| Jira | LIST_ISSUES | key, summary, description, assignee, reporter, status, created, updated | Yes |
| Slack | LIST_MESSAGES | text, user, ts, thread_ts, reactions, reply_count | Yes |
| Linear | LIST_ISSUES | title, description, assignee, state, team, labels, createdAt | Yes (NEW tool for us) |
| Notion | LIST_PAGES | title, created_by, last_edited_by, created_time, properties | Yes (NEW tool for us) |
| GitLab | LIST_MERGE_REQUESTS | title, description, author, created_at, merged_at, source_branch | Yes (NEW tool for us) |

### When to Use / Not Use

| Use When | Don't Use When |
|----------|----------------|
| Adding a new tool where we don't have a bespoke connector | Existing connectors work well (GitHub, Jira) |
| Need quick prototype of new integration | Need sub-second latency for real-time features |
| Want to test if a tool's data is useful before building full connector | Need write operations (ACI is read+write, but we should stay read-only) |
| OAuth for a new provider is complex (e.g., Salesforce) | Existing OAuth flow is stable and users are connected |

### Gotchas

| Gotcha | Symptom | Fix |
|--------|---------|-----|
| Pagination not automatic | First call returns page 1 only | Must loop with cursor/page params ourselves |
| Rate limits are upstream's | GitHub 5000/hr, Jira varies | Same limits as direct calls — no ACI overhead |
| ACI OAuth app vs. ours | If ACI uses their OAuth app, rate limits are shared across ACI users | Verify: can we use our own OAuth app credentials through ACI? |
| Function naming convention | `GITHUB__LIST_PULL_REQUESTS` — double underscore, all caps | Map to our tool types: `github`, `jira`, etc. |

---

## Spike 2: OAuth Model — ACI vs. Inchronicle's MCPIntegration

### TL;DR

ACI manages OAuth end-to-end: authorization URLs, token exchange, encrypted storage, automatic refresh. This overlaps with our `mcp-oauth.service.ts` (1026 lines). Three viable models exist; **Hybrid Auth** (option C) is recommended.

**CONFIRMED**: ACI supports full multi-user per-user OAuth — same pattern as our existing bespoke connectors. Each inchronicle user gets their own OAuth tokens stored on ACI, keyed by our userId.

### How ACI OAuth Works

```
1. Developer registers app on ACI platform (or self-hosts)
2. Configure OAuth credentials per tool (client_id, client_secret) — supports BYOA (Bring Your Own App)
3. ACI generates authorization URL for end-user
4. User completes OAuth in browser → ACI stores tokens per linked_account_owner_id
5. When executing functions, ACI automatically uses that user's stored tokens
6. Token refresh handled transparently by ACI (automatic, no manual intervention needed)
```

**Key concept**: `linked_account_owner_id` — ACI's equivalent of our `userId`. Each user's tokens are isolated by this ID. **We use our own UUIDs directly — no mapping needed.**

### Multi-User Auth Model (Verified)

| Capability | Supported? | Details |
|------------|-----------|---------|
| Per-user OAuth consent | Yes | Each end-user authorizes independently |
| Server-side token usage (user not present) | Yes | Backend calls `aci.execute(..., userId)` |
| Bring Your Own OAuth App | Yes | "Security Overrides" in App Configuration |
| Automatic token refresh | Yes | Transparent, no manual refresh needed |
| Use our own user IDs | Yes | `linked_account_owner_id` accepts any string |
| Multiple tools per user | Yes | Same owner ID across different apps |
| Batch sync across all users | Yes | Loop users, call ACI per user — same as today |
| Rate limit isolation (own OAuth app) | Yes | Own client_id = own rate limits |
| Linked account limits | No documented limits | Contact ACI for high-volume guidance |

### Model Comparison

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **(A) Full ACI Auth** | Migrate all OAuth to ACI. Delete `mcp-oauth.service.ts`. | Single auth system. Less code. | Migration risk. Users re-auth all tools. Breaking change. |
| **(B) Our Auth, ACI Fetch Only** | Keep our OAuth, pass tokens to ACI for execution | Full token control. No user disruption. | ACI may not support "bring your own token" well. |
| **(C) Hybrid Auth** ✓ | Keep existing tools' auth. Use ACI auth for NEW tools only. | Zero migration. Incremental. Low risk. | Two auth systems to maintain. |
| **(D) ACI Auth Behind Proxy** | ACI manages all auth, but we proxy the OAuth flow to look like inchronicle | Unified UX. Single auth system. | Complex proxy setup. Fragile. |

### Recommended: Option C — Hybrid Auth

```
Existing tools (GitHub, Jira, Confluence, OneDrive, Slack, Outlook, Teams, Figma, Google, Zoom):
  → Keep mcp-oauth.service.ts
  → Keep bespoke fetchers + transformers
  → No changes for users

New tools via ACI (Linear, GitLab, Notion, Asana, Azure DevOps, etc.):
  → ACI manages OAuth
  → ACI executes API calls
  → We add transformers only (ACI response → ActivityInput)
  → New MCPIntegration entries point to ACI (toolType = 'linear-via-aci')
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  INCHRONICLE                     │
│                                                  │
│  ┌─────────────┐     ┌──────────────────────┐   │
│  │ mcp-oauth   │     │  ACI SDK Client      │   │
│  │ .service.ts │     │  (Python or TS)       │   │
│  │             │     │                       │   │
│  │ GitHub  ────┤     │  Linear ──────┐       │   │
│  │ Jira   ────┤     │  GitLab ──────┤       │   │
│  │ Confluence─┤     │  Notion ──────┤──→ ACI│   │
│  │ OneDrive ──┤     │  Asana ───────┤  Platform│ │
│  │ Slack  ────┤     │  Azure DevOps─┘       │   │
│  │ Outlook ───┤     │                       │   │
│  │ etc.   ────┤     └──────────────────────┘   │
│  └──────┬──────┘              │                  │
│         │                     │                  │
│         ▼                     ▼                  │
│  ┌──────────────────────────────────────┐       │
│  │         Transformer Layer             │       │
│  │  (tool-specific → ActivityInput)      │       │
│  └──────────────────┬───────────────────┘       │
│                     │                            │
│                     ▼                            │
│  ┌──────────────────────────────────────┐       │
│  │    ActivityPersistenceService         │       │
│  │    → upsert ToolActivity              │       │
│  │    → extract crossToolRefs            │       │
│  │    → cluster → LLM enrich             │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

## Spike 3: Hybrid Integration Pattern — Adding a New Tool via ACI

### TL;DR

Adding a new tool via ACI requires ~60% less code than a bespoke connector: skip OAuth config and tool fetcher, write only transformer + signal extractor + context adapter. The ACI SDK handles auth and API calls.

### Bespoke Connector: 5 Files

| File | Lines (avg) | Purpose |
|------|-------------|---------|
| `mcp-oauth.service.ts` (add config) | +30 | OAuth client_id, scopes, URLs |
| `tools/new-tool.tool.ts` | ~200-400 | API client, staged fetch, pagination, error handling |
| `transformers/new-tool.transformer.ts` | ~100-200 | Raw API → ActivityInput |
| `signal-extractor.ts` (add case) | +20 | Extract people + container from rawData |
| `activity-context.adapter.ts` (add case) | +30 | Normalize to ActivityContext for LLM |
| **Total** | **~380-680 lines** | |

### ACI Connector: 3 Files (OAuth + Fetch handled by ACI)

| File | Lines (avg) | Purpose |
|------|-------------|---------|
| `aci-tools/new-tool.aci-adapter.ts` | ~80-120 | Call ACI SDK, map response → ActivityInput |
| `signal-extractor.ts` (add case) | +20 | Extract people + container from rawData |
| `activity-context.adapter.ts` (add case) | +30 | Normalize to ActivityContext for LLM |
| **Total** | **~130-170 lines** | |

### Example: Adding Linear via ACI

```typescript
// backend/src/services/mcp/aci-tools/linear.aci-adapter.ts

import { ACIClient } from '../aci-client';
import { ActivityInput } from '../../../types/activity.types';

export class LinearACIAdapter {
  constructor(private aci: ACIClient) {}

  async fetchActivities(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<ActivityInput[]> {
    // 1. Fetch issues assigned to user
    const issues = await this.aci.execute(
      'LINEAR__LIST_ISSUES',
      {
        filter: { assignee: { isMe: true } },
        first: 100,
        // date filter if supported
      },
      userId // linked_account_owner_id
    );

    // 2. Transform to ActivityInput
    return issues.nodes.map((issue: any) => ({
      source: 'linear',
      sourceId: issue.identifier,         // e.g., "ENG-123"
      sourceUrl: issue.url,
      title: `${issue.identifier}: ${issue.title}`,
      description: issue.description,      // Full markdown body
      timestamp: new Date(issue.updatedAt || issue.createdAt),
      rawData: {
        key: issue.identifier,
        status: issue.state?.name,
        priority: issue.priority,
        assignee: issue.assignee?.displayName,
        team: issue.team?.name,
        labels: issue.labels?.nodes?.map((l: any) => l.name),
        project: issue.project?.name,
        cycle: issue.cycle?.name,
        // Preserve for signal extraction
        creator: issue.creator?.displayName,
        subscribers: issue.subscribers?.nodes?.map((s: any) => s.displayName),
      },
    }));
  }
}
```

### Signal Extractor Addition

```typescript
// Add to signal-extractor.ts
case 'linear':
  return {
    collaborators: dedupe([
      raw.assignee,
      raw.creator,
      ...(raw.subscribers || []),
    ].filter(Boolean), selfSet),
    container: raw.project || raw.cycle || raw.team,
  };
```

### Effort Comparison

| Task | Bespoke | Via ACI | Savings |
|------|---------|---------|---------|
| OAuth setup | 2-4 hours | 0 (ACI handles) | 100% |
| API client + pagination | 4-8 hours | 0 (ACI handles) | 100% |
| Transformer | 2-4 hours | 2-3 hours | ~25% (still need mapping) |
| Signal extractor | 1 hour | 1 hour | 0% |
| Context adapter | 1 hour | 1 hour | 0% |
| Testing | 4-8 hours | 2-4 hours | ~50% (less to test) |
| **Total** | **14-27 hours** | **6-9 hours** | **~60% reduction** |

---

## Spike 4: Priority New Tools — Signal Richness Analysis

### TL;DR

Not all tools produce equal activity signals. The tools worth adding via ACI are those that produce **timestamped, attributed, cross-referenceable activities** with rich text bodies. Linear, GitLab, and Notion are highest priority.

### Tool Signal Richness Scorecard

| Tool | Timestamp | Attribution | Body/Description | Cross-Refs | Collaborators | Container | Score | Priority |
|------|-----------|-------------|-----------------|------------|---------------|-----------|-------|----------|
| **Linear** | Yes (createdAt, updatedAt) | Yes (assignee, creator) | Yes (markdown) | Yes (GH PRs, branch names) | Yes (subscribers, mentions) | Yes (project, cycle, team) | **9/10** | **P0** |
| **GitLab** | Yes | Yes (author, assignees) | Yes (MR descriptions) | Yes (issue refs, commit SHAs) | Yes (reviewers, participants) | Yes (branches, milestones) | **9/10** | **P0** |
| **Notion** | Yes | Yes (created_by, edited_by) | Yes (page content) | Partial (links) | Limited | Yes (workspace, database) | **6/10** | **P1** |
| **Asana** | Yes | Yes (assignee) | Yes (task notes) | Partial | Yes (followers, collaborators) | Yes (project, section) | **7/10** | **P1** |
| **Azure DevOps** | Yes | Yes (assignedTo) | Yes (work item body) | Yes (PR links, commit refs) | Yes (reviewers) | Yes (iteration, area path) | **8/10** | **P1** |
| **Shortcut** | Yes | Yes (owners) | Yes (description) | Yes (GH branches) | Yes (followers) | Yes (epic, iteration) | **7/10** | **P2** |
| **ClickUp** | Yes | Yes (assignees) | Yes (description) | Limited | Yes (watchers) | Yes (list, folder, space) | **6/10** | **P2** |
| **Trello** | Yes | Yes (members) | Limited (card desc) | Limited | Limited | Yes (board, list) | **4/10** | **P3** |
| **Todoist** | Yes | Yes (assignee) | Limited | No | Limited | Yes (project) | **3/10** | **P3** |

### Recommended Rollout Order

```
Phase 1 (Week 1-2): Linear + GitLab
  → Highest signal richness
  → Strong cross-tool refs (Linear↔GitHub, GitLab native)
  → Large user demand in startup + enterprise segments

Phase 2 (Week 3-4): Notion + Azure DevOps
  → Notion: documentation activity (design docs, RFCs, meeting notes)
  → Azure DevOps: enterprise segment unlock

Phase 3 (Week 5+): Asana + Shortcut
  → Broader PM tool coverage
  → Lower priority — less rich signals
```

### Cross-Tool Ref Extraction for New Tools

| Tool | Ref Pattern | Example | Maps To |
|------|-------------|---------|---------|
| Linear | `ENG-123` | "Fixes ENG-456" in PR body | Jira-style key |
| Linear | Branch name `eng-123-feature-name` | GitHub PR headRef | GitHub branch |
| GitLab | `!42` (MR), `#123` (issue) | "Closes #123" | GitLab internal |
| GitLab | Commit SHA references | `abc1234` | Git commits |
| Notion | Page URLs | `notion.so/page-id` | Notion page ID |
| Azure DevOps | `AB#123` (work item) | "Related to AB#456" | Azure work item |

**Key insight**: Linear and GitLab have the richest cross-tool ref patterns, which directly improve clustering quality.

---

## Spike 5: Self-Host Assessment

### TL;DR

ACI is fully self-hostable via Docker. For our use case (backend service calling ACI SDK), managed cloud is simpler to start. Self-host when we need data residency or hit managed tier limits.

### Self-Host Requirements

```
Docker Compose stack:
  - ACI Backend (API server)
  - PostgreSQL (tool configs, OAuth tokens, audit logs)
  - Redis (optional, for caching)
  - ACI Frontend (dev portal, optional — we'd use SDK directly)
```

### Decision Matrix

| Factor | Managed (aci.dev) | Self-Hosted |
|--------|--------------------|-------------|
| Setup time | 10 minutes | 2-4 hours |
| Ops burden | Zero | Container management, DB backups |
| Data residency | ACI's cloud | Our infrastructure |
| Token storage | ACI's encrypted store | Our encrypted store |
| Cost | Free tier → paid at scale | Infrastructure cost only |
| Latency | Extra network hop to aci.dev | Same-network (lower latency) |
| Updates | Automatic | Manual docker pull |
| Vendor risk | Dependent on aci.dev uptime | Independent |

### Recommendation

**Start with managed cloud** (aci.dev). Migrate to self-host if:
- User count exceeds free tier
- Data residency requirements emerge
- Latency becomes an issue (>500ms overhead)
- ACI.dev has reliability problems

---

## Sources

- [ACI.dev Official Docs](https://www.aci.dev/docs/)
- [ACI GitHub — aipotheosis-labs/aci](https://github.com/aipotheosis-labs/aci)
- [ACI Python SDK](https://github.com/aipotheosis-labs/aci-python-sdk)
- [ACI MCP Server](https://github.com/aipotheosis-labs/aci-mcp)
- Inchronicle codebase: `backend/src/services/mcp/` (sync pipeline, OAuth, tools, transformers)
