# Phase 3: Gold Seam Map — ACI.dev for Inchronicle

**Date**: 2026-02-26

---

## Must Understand (Core Concepts)

| # | Seam | Why Critical | Depth Needed |
|---|------|--------------|--------------|
| 1 | **ACI Data Extraction Granularity** | We need full activity records (title, timestamp, author, body, metadata) — not summaries. If ACI only returns truncated data, it's useless for clustering/LLM enrichment. | **HIGH** — test actual API responses per tool |
| 2 | **ACI OAuth Model vs. Ours** | Our `MCPIntegration` table stores encrypted tokens per userId_toolType with proactive refresh. ACI manages its own token store. Can they coexist? Do we hand over auth entirely? | **HIGH** — architecture decision |
| 3 | **Hybrid Integration Pattern** | Keep existing 4 production connectors (GitHub/Jira/Confluence/OneDrive), use ACI for NEW tools only. Is this viable without duplicating OAuth? | **HIGH** — the most likely adoption path |
| 4 | **ACI → ActivityInput Mapping** | ACI function responses must map to our `ActivityInput { source, sourceId, sourceUrl, title, description, timestamp, rawData }`. What transformation is needed? | **MEDIUM** — depends on seam #1 |
| 5 | **Self-Host vs. Managed** | Self-hosted ACI = full control, no vendor risk. Managed = less ops. What's the self-hosting effort? | **MEDIUM** — Docker compose analysis |

---

## Must Avoid (Pitfalls)

| # | Pitfall | How Teams Hit It | Mitigation |
|---|---------|------------------|------------|
| 1 | **Rip-and-replace existing connectors** | Excitement about ACI leads to migrating working GitHub/Jira connectors, breaking production | **Freeze existing 4 connectors. ACI for NEW tools only.** |
| 2 | **Black-box data dependency** | ACI returns data in their format; if they change schemas, our transforms break silently | Use ACI as fetch layer only, validate + transform on our side. Pin ACI version. |
| 3 | **OAuth double-management** | Users authenticate via ACI for new tools, via our flow for existing — confusing UX | Either: (a) unified ACI OAuth for all, or (b) ACI behind the scenes (user never sees ACI) |
| 4 | **Latency overhead** | ACI adds a proxy hop. For sync-intensive tools (GitHub with 1000+ commits), this compounds | Benchmark: direct API call vs. ACI SDK call. Accept if <2x latency. |
| 5 | **Vendor death risk** | ACI is a 2024 startup with $3M funding. Could fold. | Mitigated by Apache 2.0 — we can fork. But self-host readiness is insurance. |
| 6 | **Scope creep into VibeOps** | ACI's marketing pushes DevOps automation. We only need read-only activity data. | Stay disciplined: read-only data extraction. No write operations through ACI. |

---

## Must Decide

| # | Decision | Options | Criteria |
|---|----------|---------|----------|
| 1 | **Adoption Strategy** | (A) Full ACI adoption (replace all connectors) / (B) Hybrid (ACI for new tools, keep existing) / (C) ACI OAuth-only (use their auth, our fetch) / (D) Pass (keep building bespoke) | Data quality, effort reduction, risk, UX coherence |
| 2 | **Auth Ownership** | (A) ACI manages all OAuth (simplest) / (B) We manage OAuth, use ACI for discovery/schema only / (C) ACI for new tools, ours for existing | User experience, migration effort, token control |
| 3 | **Self-Host or Managed** | (A) Self-host ACI backend / (B) Use managed aci.dev / (C) Start managed, migrate to self-host later | Ops burden, data residency, cost |
| 4 | **Priority Tools via ACI** | Which new tools to add first? Linear, GitLab, Notion, Asana, Azure DevOps? | User demand, signal richness, clustering value |

---

## Must Experiment (Unknowns)

| # | Unknown | Why Unknown | How to Test |
|---|---------|-------------|-------------|
| 1 | **Data granularity per tool** | ACI docs show function schemas but not actual response payloads with full activity data | Sign up for ACI, call `GITHUB__LIST_PULL_REQUESTS` and `JIRA__LIST_ISSUES`, inspect actual JSON responses. Compare to our direct API responses. |
| 2 | **Pagination behavior** | Does ACI handle cursor-based pagination internally or expose it? Our GitHub connector fetches 1000+ commits with staged pagination. | Test with a large GitHub org — does `ACI_EXECUTE_FUNCTION` return all results or require manual cursor management? |
| 3 | **Latency overhead** | Unknown proxy hop cost | Benchmark: time `octokit.pulls.list()` vs `aci.execute("GITHUB__LIST_PULL_REQUESTS")` for same repo |
| 4 | **OAuth UX flow** | Does ACI's OAuth redirect the user to ACI's domain first? Would users see "Authorize ACI.dev" instead of "Authorize Inchronicle"? | Test OAuth flow end-to-end for GitHub via ACI |
| 5 | **Rate limit passthrough** | If GitHub rate-limits ACI's OAuth app, does that affect ALL ACI users or just ours? | Check: does ACI use their OAuth app or ours? Shared app = shared rate limits = risk. |

---

## Gold Seam Priority Matrix

```
                    HIGH VALUE
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │  #1 Data          │  #3 Hybrid        │
    │  Granularity      │  Pattern          │
    │  (MUST TEST)      │  (ARCHITECTURE)   │
    │                   │                   │
────┼───────────────────┼───────────────────┼────
    │                   │                   │    HIGH
LOW │  #5 Self-Host     │  #2 OAuth Model   │    EFFORT
EFFORT                  │  (DESIGN)         │
    │                   │                   │
    │  #4 ActivityInput │                   │
    │  Mapping          │                   │
    │  (MECHANICAL)     │                   │
    └───────────────────┼───────────────────┘
                        │
                    LOW VALUE
```

### Recommended Spike Order

1. **Experiment #1** — Test ACI data granularity (2 hours). This gates everything else.
2. **Decide #1** — Adoption strategy. If data is rich enough, proceed with Hybrid.
3. **Deep dive #3** — Design the hybrid integration pattern.
4. **Deep dive #2** — OAuth ownership model.
5. **Experiment #3** — Latency benchmark (if considering replacing existing connectors later).
