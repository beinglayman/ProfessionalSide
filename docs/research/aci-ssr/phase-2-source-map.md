# Phase 2: Source Map & Landscape — ACI.dev

**Date**: 2026-02-26

---

## What Is ACI.dev?

**ACI.dev** (Agent-Computer Interface) is an open-source (Apache 2.0), AI-first unified tool integration platform by Aipotheosis Labs (London, founded 2024, $3M raised). It provides:

- **600+ pre-built integrations** to SaaS tools (GitHub, Jira, Slack, Notion, Gmail, etc.)
- **Unified OAuth management** — handles auth flows, token refresh, secrets storage
- **Two access patterns**: Direct function calling (Python/TS SDK) or Unified MCP Server
- **Meta-function architecture**: 2 functions (`ACI_SEARCH_FUNCTIONS` + `ACI_EXECUTE_FUNCTION`) that dynamically discover and execute any of 600+ tool functions
- **Multi-tenant auth**: Per-user or org-wide credential modes
- **Self-hostable**: Full Docker deployment, no vendor lock-in

**GitHub**: 4,658 stars, 446 forks — active development through 2026.

---

## Tier 1: Primary Sources (High Trust)

| Source | Type | Quality | Updated | Key Value |
|--------|------|---------|---------|-----------|
| [github.com/aipotheosis-labs/aci](https://github.com/aipotheosis-labs/aci) | Source code | High | Active 2026 | Ground truth — backend, integrations, schemas |
| [aci.dev/docs](https://www.aci.dev/docs/) | Official docs | High | Current | SDK usage, meta-functions, quickstart |
| [aci.dev/docs/sdk/metafunctions](https://www.aci.dev/docs/sdk/metafunctions) | Docs | High | Current | Core architecture — how discovery + execution works |
| [aci.dev/docs/sdk/tool-use-patterns](https://www.aci.dev/docs/sdk/tool-use-patterns) | Docs | High | Current | Direct vs. meta-function patterns |
| [aci.dev/tools](https://www.aci.dev/tools) | Tool catalog | High | Current | Complete list of 600+ integrations |
| [github.com/aipotheosis-labs/aci-python-sdk](https://github.com/aipotheosis-labs/aci-python-sdk) | SDK source | High | Active | Python SDK internals, API surface |
| [github.com/aipotheosis-labs/aci-mcp](https://github.com/aipotheosis-labs/aci-mcp) | MCP server | High | Active | MCP integration patterns |
| [github.com/aipotheosis-labs/aci-agents](https://github.com/aipotheosis-labs/aci-agents) | Examples | Medium | Active | Real usage patterns with agents |

## Tier 2: Practitioner Sources (Verify Claims)

| Source | Context | Key Insight |
|--------|---------|-------------|
| [skywork.ai — ACI MCP Server guide](https://skywork.ai/skypage/en/aci-dev-mcp-server-ai-agent/1981199707054243840) | Technical deep-dive | Meta-function approach preserves LLM token budget — 2 functions instead of 600 |
| [CAMEL-AI — Pair agent with 600+ tools](https://www.camel-ai.org/blogs/pairing-your-ai-agent-with-600-mcp-servers-seamlessly) | Framework integration | Shows real ACI adoption in agent framework ecosystem |
| [Dev.to — MCP-Powered Agents: Wiring Gaia to ACI](https://dev.to) | Practitioner tutorial | Integration pattern with Gaia agent framework |
| [apidog.com — How to Use ACI.dev MCP Servers](https://apidog.com/blog/aci-dev-mcp-servers/) | Tutorial | Step-by-step MCP server setup |
| [Composio comparison blog](https://composio.dev/blog/best-unified-api-platforms) | Competitor view | Positions ACI alongside Composio, Nango, Merge — biased but informative |

## Tier 3: Critical Sources (Counterpoints)

| Source | Criticism | Valid? | Our Take |
|--------|-----------|--------|----------|
| Early stage (2024) | Fewer production references than Merge/Nango | Yes | Mitigated by Apache 2.0 — we can fork/self-host if company dies |
| Text-based tool discovery accuracy | Lower accuracy vs. native tool list expansion | Yes | We'd use direct function calls, not text discovery — non-issue |
| Small team | Less support bandwidth | Partially | Open source means we can debug ourselves; community growing |
| No formal case studies | Can't verify production scale | Yes | Would need to test data volume ourselves before committing |

## Noise (Ignore)

| Source | Why |
|--------|-----|
| "VibeOps" marketing content | DevOps automation ≠ our use case (activity tracking) |
| Gate22 enterprise governance docs | Premature for our stage |
| AI hype blog posts ("AI agents will replace developers") | No substance for our integration decision |

---

## Competitive Landscape

| Platform | Integrations | Open Source | Self-Host | MCP Native | OAuth Built-in | Best For |
|----------|-------------|-------------|-----------|------------|----------------|----------|
| **ACI.dev** | 600+ | Yes (Apache 2.0) | Yes | Yes | Yes | AI agent tool calling, self-hosted |
| **Composio** | 500+ | Partial | No | Yes | Yes | Managed AI agent integrations |
| **Nango** | 600+ | Yes | Yes | No | Yes | Auth-focused, webhooks, fine-grained |
| **Merge.dev** | 200+ (deep) | No | No | No | Yes | Enterprise HRIS/accounting verticals |
| **Pipedream** | 2000+ | Partial | No | No | Yes | Workflow automation, event triggers |

### For Inchronicle's Use Case (Activity Data Ingestion):

**ACI.dev Strengths**:
- Open source = no vendor lock-in, can inspect exactly what data comes back
- MCP-native = aligns with our existing MCP architecture naming
- 600+ tools = covers everything we need + expansion
- OAuth built-in = could replace our 1026-line `mcp-oauth.service.ts`

**ACI.dev Risks**:
- Young platform (2024) — less battle-tested than Nango
- We'd depend on their OAuth flow quality for critical user data
- Data extraction granularity unknown — do we get full PR bodies or just metadata?
- Latency overhead of proxying through ACI vs. direct API calls

**Nango Alternative**:
- More mature, better auth infrastructure, webhooks for real-time sync
- But: no MCP, no meta-function discovery, more plumbing code needed
- Better for "auth only" — worse for "discovery + execution"

---

## Inchronicle's Current State (for Context)

| Dimension | Current State |
|-----------|---------------|
| **Integrations** | 11 tools: GitHub, Jira, Confluence, OneDrive, Slack, Outlook, Teams, Figma, Google Workspace, Zoom, OneNote |
| **Production Transformers** | 4 only: GitHub, Jira, Confluence, OneDrive |
| **Fetch-Only (no transformer)** | 7: Slack, Outlook, Teams, Figma, Google Workspace, Zoom, OneNote |
| **OAuth Layer** | Bespoke `mcp-oauth.service.ts` (1026 lines) — AES-256 encrypted tokens, per-provider configs |
| **Data Model** | `ToolActivity` → `ActivityInput` → `ActivityContext` → clustering → career stories |
| **Sync Pipeline** | OAuth → Tool Fetch → Transform → Persist (upsert) → Ref Extract → Cluster → LLM Enrich |
| **Adding a new tool** | 5 files: OAuth config + Tool fetcher + Transformer + Signal extractor + Context adapter |

### Tools We DON'T Have That ACI Could Provide:

**High-Value for Developer Activity**:
- **Linear** — modern issue tracker, heavy in startups
- **GitLab** — alternative to GitHub, many orgs use it
- **Bitbucket** — Atlassian ecosystem
- **Azure DevOps** — enterprise CI/CD + boards
- **Asana** — project management
- **Monday.com** — team task tracking
- **ClickUp** — all-in-one PM
- **Todoist** — personal task tracking
- **Google Meet** (extended) — meeting transcripts
- **HubSpot** — sales/marketing activity for GTM roles
- **Salesforce** — CRM activity for sales engineers
- **Notion** — docs, wikis, knowledge bases
- **Shortcut** (formerly Clubhouse) — issue tracking
- **Trello** — kanban boards

**Medium-Value**:
- **Vercel / Netlify** — deployment activity
- **Sentry** — error monitoring (debugging activity)
- **Datadog** — monitoring activity
- **PagerDuty / OpsGenie** — incident response activity
- **CircleCI / GitHub Actions** — CI/CD pipeline activity
