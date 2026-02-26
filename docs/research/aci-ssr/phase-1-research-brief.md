# Phase 1: Research Brief — ACI.dev for Inchronicle Activity Ingestion

**Date**: 2026-02-26
**Researcher**: SSR (Sr Staff Researcher)

---

## Mission

**How can ACI.dev's unified tool integration platform expand inchronicle's developer activity data ingestion — adding more sources, reducing per-tool OAuth/fetch boilerplate, and improving the quality of career story clustering?**

## Audience

Backend engineering (sync pipeline), product (roadmap for new integrations)

## Decision

**Build vs Buy (vs Hybrid)**: Should inchronicle adopt ACI.dev as its integration layer, keep building bespoke connectors, or use ACI selectively for new tools while keeping existing connectors?

## Timeline

Research: 1 session. Decision: within 1 week.

## Success Criteria

- [ ] Full understanding of ACI's integration catalog vs. inchronicle's current 11 tools
- [ ] Clear mapping of ACI's data model → inchronicle's `ActivityInput` / `ToolActivity` schema
- [ ] Identified gold-seam integrations ACI could unlock that we don't have today
- [ ] Cost/effort comparison: ACI adoption vs. bespoke connectors
- [ ] Architectural fit assessment: ACI's auth model vs. our `MCPIntegration` + AES-256 token store

## Scope

### Covers
- ACI's 600+ integration catalog — which ones matter for developer/team activity tracking
- ACI's OAuth & secrets model — can it replace our `mcp-oauth.service.ts`?
- ACI's data extraction capabilities — what fields come back per tool?
- ACI's MCP server / SDK — how to call from our Express backend
- Competitive landscape: ACI vs. Composio vs. Nango vs. Merge.dev
- Licensing & self-hosting viability (Apache 2.0)

### Excludes
- ACI's "VibeOps" / DevOps automation use case (not relevant to activity tracking)
- Gate22 enterprise governance (premature for our stage)
- Frontend/UI changes to inchronicle
- Migration of existing 4 production connectors (GitHub, Jira, Confluence, OneDrive)

## Open Questions

1. Does ACI return raw activity data (timestamps, authors, bodies) or just summarized results?
2. Can we use ACI for OAuth + fetch while keeping our own transformer/persistence layer?
3. What's the latency overhead of going through ACI vs. direct API calls?
4. How does ACI handle pagination for high-volume tools (GitHub commits, Slack messages)?
5. Can ACI's per-user auth model map to our `MCPIntegration` table's userId_toolType pattern?
6. What tools does ACI have that we DON'T have — and which of those produce meaningful developer activity signals?
