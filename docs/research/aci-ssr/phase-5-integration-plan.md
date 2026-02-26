# Phase 5: Integration Plan & Team Artifacts — ACI.dev for Inchronicle

**Date**: 2026-02-26

---

## Executive Summary

**Recommendation: Hybrid adoption — use ACI for NEW tool integrations only.**

ACI.dev provides a viable path to expanding inchronicle's activity data sources from 11 → 20+ tools with ~60% less code per integration. The platform handles OAuth and API fetching, while we retain full control over data transformation, persistence, and clustering.

**Key numbers**:
- Current tools: 11 (4 with production transformers)
- ACI catalog: 600+ tools
- High-value additions via ACI: 6-8 tools (Linear, GitLab, Notion, Azure DevOps, Asana, Shortcut)
- Effort per new tool via ACI: ~6-9 hours (vs. 14-27 hours bespoke)
- ACI license: Apache 2.0 (no vendor lock-in)

---

## Decision Matrix

| Decision | Chosen Option | Rationale |
|----------|---------------|-----------|
| Adoption Strategy | **(B) Hybrid** — ACI for new tools, keep existing | Zero risk to production. Incremental. Reversible. |
| Auth Ownership | **(C) Hybrid Auth** — our OAuth for existing, ACI for new | No user disruption. Two systems, but cleanly separated. |
| Deployment | **Managed first** — start with aci.dev cloud | Lower ops. Self-host later if needed. |
| First Tools | **Linear + GitLab** | Highest signal richness. Strongest cross-tool refs. |

---

## Architecture: ACI Integration Layer

### New File Structure

```
backend/src/services/mcp/
├── aci/                              # NEW — ACI integration layer
│   ├── aci-client.ts                 # ACI SDK wrapper (singleton, config)
│   ├── aci-sync.service.ts           # Orchestrates ACI-based sync per tool
│   ├── aci-oauth.service.ts          # ACI OAuth flow handlers (connect/disconnect)
│   └── adapters/                     # Per-tool ACI response → ActivityInput
│       ├── linear.adapter.ts
│       ├── gitlab.adapter.ts
│       ├── notion.adapter.ts
│       ├── asana.adapter.ts
│       └── azure-devops.adapter.ts
├── tools/                            # EXISTING — bespoke fetchers (unchanged)
│   ├── github.tool.ts
│   ├── jira.tool.ts
│   └── ...
├── transformers/                     # EXISTING — bespoke transformers (unchanged)
│   ├── github.transformer.ts
│   ├── jira.transformer.ts
│   └── ...
```

### Integration Points

```
production-sync.service.ts (modified):
  ├── For existing tools → existing fetch + transform pipeline (unchanged)
  └── For ACI tools → aci-sync.service.ts → adapter → ActivityInput
                                                          │
                                                          ▼
                                              ActivityPersistenceService (unchanged)
                                                          │
                                                          ▼
                                              ClusteringService (unchanged)
```

### ACI Client Configuration

```typescript
// backend/src/services/mcp/aci/aci-client.ts
import { ACI } from 'aci-sdk';  // or equivalent TS SDK

export class ACIClientService {
  private client: ACI;

  constructor() {
    this.client = new ACI({
      apiKey: process.env.ACI_API_KEY,
      // baseUrl: process.env.ACI_BASE_URL  // for self-hosted
    });
  }

  async executeFunction(
    functionName: string,
    input: Record<string, unknown>,
    userId: string
  ): Promise<unknown> {
    return this.client.functions.execute({
      function_name: functionName,
      function_input: input,
      linked_account_owner_id: userId,
    });
  }

  async getAuthUrl(appName: string, userId: string, scopes: string[]): Promise<string> {
    return this.client.auth.getAuthorizationUrl({
      app_name: appName,
      linked_account_owner_id: userId,
      scopes,
    });
  }
}
```

---

## Implementation Roadmap

### Phase 0: Foundation (1-2 days)

| Task | Effort | Output |
|------|--------|--------|
| Sign up for ACI managed cloud | 30 min | API key, project setup |
| Test data granularity — call `GITHUB__LIST_PULL_REQUESTS` via ACI, compare to direct API | 2 hours | Validation that raw data is sufficient |
| Test OAuth flow — connect a test user to Linear via ACI | 2 hours | Verify UX (does user see "ACI" or can we white-label?) |
| Test pagination — fetch large dataset through ACI | 1 hour | Confirm we can paginate manually |
| Install ACI TypeScript SDK (or write thin REST wrapper) | 1 hour | `aci-client.ts` |
| **GATE: Data quality sufficient? OAuth UX acceptable?** | — | Go/no-go for Phase 1 |

### Phase 1: Linear Integration (2-3 days)

| Task | Effort | Output |
|------|--------|--------|
| Create `aci-sync.service.ts` — orchestrator for ACI-based tools | 4 hours | Generic sync service that delegates to adapters |
| Create `adapters/linear.adapter.ts` — Linear response → ActivityInput | 3 hours | Full mapping with rawData preservation |
| Add Linear to `signal-extractor.ts` | 1 hour | People + container extraction |
| Add Linear to `activity-context.adapter.ts` | 1 hour | LLM-ready normalized context |
| Add Linear ref patterns to `ref-extractor.service.ts` | 1 hour | `ENG-123` pattern matching |
| Add `linear` to MCPToolType enum + tool constants | 30 min | UI display name, color, icon |
| Wire ACI OAuth into integrations page | 2 hours | Connect/disconnect Linear |
| Modify `production-sync.service.ts` to route Linear through ACI | 1 hour | Conditional routing |
| Test end-to-end: connect → sync → activities appear on timeline | 2 hours | Verified integration |
| Test clustering: Linear issues cluster with GitHub PRs via cross-refs | 1 hour | `ENG-123` in PR body → same cluster |

### Phase 2: GitLab Integration (2-3 days)

Same pattern as Linear, plus:
| Task | Effort | Output |
|------|--------|--------|
| `adapters/gitlab.adapter.ts` — MRs, issues, commits | 3 hours | Full mapping |
| GitLab ref patterns (`!42`, `#123`) in ref-extractor | 1 hour | Cross-tool clustering |
| Handle GitLab's nested group structure | 1 hour | Correct sourceId formatting |
| Test GitLab ↔ GitHub cross-refs (shared commits) | 1 hour | Cross-platform clustering |

### Phase 3: Notion + Azure DevOps (3-4 days)

| Tool | Key Challenge | Effort |
|------|---------------|--------|
| Notion | Page content is blocks, not plain text — need to extract meaningful summary | 3-4 hours adapter |
| Notion | Less structured for "activities" — more like docs. Map page edits as activities? | Design decision |
| Azure DevOps | Work items, PRs, builds, releases — multiple function calls per sync | 4-5 hours adapter |
| Azure DevOps | `AB#123` ref pattern for cross-tool refs | 1 hour |

### Phase 4: Asana + Shortcut (2-3 days)

Lower priority. Same adapter pattern.

---

## Quick Reference: Adding a New Tool via ACI

### Checklist

```markdown
# Adding [TOOL_NAME] via ACI

## Prerequisites
- [ ] ACI has the tool in their catalog (check aci.dev/tools)
- [ ] ACI functions return sufficient data (test via SDK)
- [ ] Tool produces timestamped, attributed activities

## Implementation (6-9 hours)
- [ ] 1. Create `aci/adapters/{tool}.adapter.ts`
  - [ ] Map ACI response → ActivityInput[]
  - [ ] Preserve full rawData for LLM enrichment
  - [ ] Handle pagination (loop with cursor)
  - [ ] Handle date range filtering

- [ ] 2. Update `signal-extractor.ts`
  - [ ] Add case for collaborator extraction
  - [ ] Add case for container extraction

- [ ] 3. Update `activity-context.adapter.ts`
  - [ ] Add case for normalized context generation

- [ ] 4. Update `ref-extractor.service.ts`
  - [ ] Add regex patterns for tool-specific references (if any)

- [ ] 5. Update tool constants
  - [ ] Add to MCPToolType enum
  - [ ] Add display name, color, icon to tool registry
  - [ ] Add to ACI tool routing in production-sync

- [ ] 6. Wire OAuth
  - [ ] ACI OAuth connect endpoint
  - [ ] Store ACI connection status in MCPIntegration (isConnected via ACI)

- [ ] 7. Test
  - [ ] Connect → sync → activities on timeline
  - [ ] Cross-tool refs cluster correctly
  - [ ] Signal extraction produces people + container
  - [ ] ActivityContext generates meaningful LLM input
```

---

## Gotcha List

| # | Gotcha | Symptom | Fix |
|---|--------|---------|-----|
| 1 | ACI SDK is Python-first | TypeScript SDK may be less mature | Write thin REST wrapper over ACI HTTP API if TS SDK has gaps |
| 2 | ACI OAuth shows "ACI.dev" branding | Users confused: "Why am I authorizing ACI?" | Custom OAuth app via self-host, or explain in UI: "Powered by ACI.dev" |
| 3 | Pagination varies by tool | Some use cursor, some use page/offset | Each adapter handles its tool's pagination pattern |
| 4 | ACI managed cloud rate limits | Unclear if free tier has API call limits | Monitor usage, upgrade tier, or self-host if hit |
| 5 | ACI function names change | `GITHUB__LIST_PULL_REQUESTS` could be renamed | Pin ACI SDK version, add integration tests |
| 6 | Duplicate activities if tool added via both ACI and bespoke | User connects GitHub via both paths | Prevent: ACI tools should be tools we DON'T have bespoke connectors for |
| 7 | rawData shape differs from direct API | ACI may wrap response in envelope | Unwrap in adapter: `response.data` or `response.result` |

---

## Cost Analysis

### Per-Integration Cost

| Approach | Dev Time | Maintenance | Dependency Risk |
|----------|----------|-------------|-----------------|
| Bespoke | 14-27 hours | High (OAuth + API changes) | Low (direct API) |
| Via ACI | 6-9 hours | Medium (ACI SDK changes) | Medium (ACI platform) |
| Savings | **~60%** | **~40%** | Trade: less code, more dependency |

### For 6 New Tools (Linear, GitLab, Notion, Azure DevOps, Asana, Shortcut)

| Approach | Total Dev Time | Total Lines of Code |
|----------|---------------|---------------------|
| All Bespoke | 84-162 hours | ~2,300-4,100 lines |
| All via ACI | 36-54 hours + 8h foundation | ~800-1,000 lines |
| **Savings** | **40-108 hours** | **~1,500-3,100 lines** |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ACI.dev shuts down | Low (funded, Apache 2.0) | High | Fork repo. Self-host. Our adapters only depend on HTTP API. |
| ACI data quality insufficient | Medium | High | **Phase 0 gate** — test before committing. |
| ACI OAuth UX confusing | Medium | Medium | UI copy: "Connect via ACI.dev (powered by open-source infrastructure)" |
| ACI latency too high | Low | Medium | Benchmark in Phase 0. Self-host eliminates network hop. |
| ACI rate limits hit | Low | Medium | Self-host or upgrade tier. |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| New tools integrated | 4+ within 4 weeks | Tool count in integrations page |
| Dev hours per tool | <10 hours | Time tracking per adapter |
| Activity quality | Same richness as bespoke | Compare ActivityContext output: fields present, ref extraction rate |
| Clustering improvement | New tools' activities cluster with existing | % of new-tool activities assigned to multi-tool clusters |
| User adoption | 20%+ of active users connect 1+ ACI tool | Analytics: MCPIntegration records for ACI tools |

---

## What The Team Needs To Know

### 1-Minute Summary

> We're adding ACI.dev as a second integration layer alongside our existing bespoke connectors. ACI handles OAuth and API fetching for NEW tools (Linear, GitLab, Notion, etc.) while we keep full control of data transformation and storage. This lets us add ~6 new tools in ~4 weeks instead of ~4 months. Existing GitHub/Jira/Confluence/OneDrive integrations are untouched.

### For the Backend Dev Adding Adapters

1. Look at `aci/adapters/linear.adapter.ts` as the template
2. Each adapter: call ACI SDK → map response → return `ActivityInput[]`
3. Always preserve `rawData` — the LLM needs it for story generation
4. Always extract `crossToolRefs` from descriptions — clustering depends on it
5. Test with real data: connect your own account, sync, check timeline

### For Product/Design

- Users see new tools in the integrations page alongside existing ones
- OAuth flow goes through ACI.dev (user sees ACI's consent screen for new tools)
- Once connected, new tools sync and appear on timeline identically to existing tools
- Career stories from new tools have same quality as existing tools (same LLM pipeline)
