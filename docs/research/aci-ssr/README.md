# SSR: ACI.dev for Inchronicle Activity Ingestion

**Structured Study Report** — Researching how ACI.dev can expand inchronicle's developer activity data sources.

**Date**: 2026-02-26
**Status**: Research Complete. Awaiting Phase 0 experiments (data validation).

---

## Documents

| Phase | File | Summary |
|-------|------|---------|
| 1 | [Research Brief](./phase-1-research-brief.md) | Mission, scope, open questions |
| 2 | [Source Map & Landscape](./phase-2-source-map.md) | ACI overview, sources, competitive landscape, inchronicle current state |
| 3 | [Gold Seam Map](./phase-3-gold-seam-map.md) | What to understand, avoid, decide, and experiment |
| 4 | [Depth Spikes](./phase-4-depth-spikes.md) | Data granularity, OAuth models, hybrid pattern, tool priority, self-host |
| 5 | [Integration Plan](./phase-5-integration-plan.md) | Architecture, roadmap, checklists, cost analysis, risk mitigation |
| 6 | [Next Actions](./phase-6-next-actions.md) | Experiments to run, decision gate, tool expansion roadmap |

---

## TL;DR

**ACI.dev** is an open-source (Apache 2.0) unified tool integration platform with 600+ pre-built integrations. It handles OAuth and API fetching, letting us add new developer activity sources with ~60% less code.

**Recommendation**: Hybrid adoption — use ACI for new tools (Linear, GitLab, Notion, Azure DevOps) while keeping existing bespoke connectors (GitHub, Jira, Confluence, OneDrive).

**Next step**: Run 3 validation experiments (data granularity, OAuth UX, latency) before committing.
