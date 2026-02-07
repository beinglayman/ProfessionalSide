# Clustering Redesign: Multi-Signal Graph + LLM Refinement

**Date**: 2026-02-07
**Status**: DESIGN
**Depends on**: Sources v1 (schema), Derivations v1 (LLM prompt pattern)

---

## Problem Statement

Two bugs in the current activity-to-story clustering:

1. **Wrong story attachment**: Activities from different features in the same 14-day temporal window merge into one story. Today's derivations commits (5 commits, 1 PR) got lumped into an old "Streamlining API Debugging and OAuth Integration" story.

2. **No new story creation**: The system didn't create stories for clearly distinct features shipped today (Share As derivations, Sources design) because the activities had no shared `crossToolRefs`.

### Root Cause

The clustering algorithm (`clustering.service.ts`) builds graph edges using **only one signal**: shared `crossToolRefs` (Jira ticket IDs, PR numbers, Confluence page IDs). When activities lack explicit cross-references, they fall through to pure temporal grouping (14-day windows), which conflates **temporal proximity** with **semantic relatedness**.

---

## Research Summary (SSR)

### What Exists in Production Tools

| Tool | Clustering Approach | Limitation |
|------|-------------------|------------|
| LinearB | Issue tracker anchoring (Jira/Linear ticket links) | Requires disciplined ticket linking |
| Swarmia | Epic-based grouping | Falls back to "everything else" for unlinked work |
| Pluralsight Flow | Proprietary, multi-source | Closed source |
| git-hours | 2-3hr gap = session boundary | Time only, no semantic understanding |
| Git Cluster RAG | K-means on commit embeddings | Requires tuning K, overkill for <500 items |

**Key finding**: No production-ready open-source tool does multi-signal clustering of dev activities. Commercial tools rely heavily on explicit ticket linking. None use LLM-based semantic clustering.

### Algorithm Comparison (for heuristic layer)

| Approach | Complexity (500 items) | Impl Effort | Handles Multi-Feature | Handles No-Refs |
|----------|----------------------|-------------|----------------------|-----------------|
| Union-Find (layered) | ~250K ops, <100ms | ~80 LOC | Good (with split) | Good |
| Graph multi-edge (extend current) | ~1M ops, <500ms | ~100 LOC | Good | Good |
| DBSCAN | ~1M + lib overhead | External dep | Best | Best |
| Simple heuristic | ~4.5K ops, <50ms | ~50 LOC | Good | Weak |

**Decision**: Extend current graph-based connected components. Already proven at 500 activities in <500ms. No external dependencies.

---

## First Principles Analysis

### What Makes Two Activities "Part of the Same Effort"?

An effort like "build OAuth2 flow" exists independent of tools. The Jira ticket, the branch, the Confluence doc, the Slack thread — these are all *projections* of the same underlying effort onto different tools.

### The 5 Universal Connection Signals

| Signal Type | What It Is | Examples | Availability |
|-------------|-----------|----------|-------------|
| **Explicit Reference** | One activity names another | "Closes AUTH-123", PR link in Jira | Sparse — depends on user discipline |
| **People Overlap** | Same collaborators involved | PR reviewers = Jira watchers = meeting attendees | **Universal** — every tool tracks who |
| **Structural Containment** | Parent/child relationship | Commits inside a PR, PR linked to Jira epic | Tool-specific but strong |
| **Lexical Similarity** | Same words/concepts | "OAuth" in commit, PR, Slack thread, doc title | Medium — depends on naming |
| **Temporal Proximity** | Close in time | Commit at 2pm, Slack message at 2:15pm | Universal but noisy alone |

### The Key Insight: People Overlap is the Universal Signal We're Ignoring

Every single tool's `rawData` contains people identifiers. The `IdentityMatcher` already knows how to extract and normalize them across tools. But this data never reaches the clustering algorithm.

If the same 3-4 people appear across a PR, a Jira ticket, a Slack thread, and a meeting — that's the same effort. The user is the constant; the collaborators are the differentiator.

### Available People Fields Per Tool

| Tool | rawData People Fields |
|------|----------------------|
| GitHub PR | `author`, `reviewers` |
| GitHub Commit | `author` |
| Jira | `assignee`, `reporter`, `watchers`, `mentions` |
| Confluence | `createdBy`, `lastModifiedBy`, `mentions`, `watchers` |
| Slack | `parentAuthor`, `replyAuthor`, `mentions` |
| Google Meet | `organizer`, `participants` |
| Google Calendar | `organizer`, `attendees` |
| Google Docs | `owner`, `contributors`, `suggestedEditors` |
| Google Sheets | `owner`, `lastModifiedBy`, `mentions` |
| Outlook | `organizer`, `attendees` |
| Figma | `owner`, `commenters` |
| OneDrive | `lastModifiedBy`, `sharedWith` |

Identity normalization already exists in `identity-matcher.ts` via `CareerPersona`.

---

## Design: Two-Layer Clustering Architecture

### Overview

```
Layer 1: DETERMINISTIC (heuristics, instant, free)
  Resolves the obvious 60-70% of connections.

Layer 2: SEMANTIC (LLM, per sync, cheap)
  Resolves the ambiguous 30-40% that heuristics can't.
```

### Why Two Layers (Not Just LLM)?

- Layer 1 is instant and deterministic — no API call needed for the easy cases
- Layer 1 reduces the LLM's input size — only ambiguous cases go to Layer 2
- Layer 1 provides a fallback if the LLM is down or rate-limited
- Layer 1 handles the easy cases so the LLM can focus on the hard ones

### Why Two Layers (Not Just Heuristics)?

- Heuristics can't connect "fixing OAuth callback" to "MCP auth middleware" without shared refs
- Heuristics can't name clusters ("Share As Derivations Feature" vs "Week of Jan 23 - Feb 2")
- Heuristics can't detect when a cluster should be split because the activities diverged semantically
- The LLM understands **intent** — heuristics only see string matching

---

## Layer 1: Multi-Signal Heuristic Graph

### Evolved Node Type

```typescript
// Current ClusterableActivity (too thin — rawData stripped)
{ id, refs, timestamp?, source? }

// Evolved — carry the 3 new signal fields
interface ClusterableActivity {
  id: string;
  refs: string[];              // crossToolRefs (existing)
  timestamp?: Date;
  source?: string;
  // NEW signals extracted from rawData:
  collaborators?: string[];    // normalized people involved (excluding self)
  container?: string;          // branch, channel, epic, folder — tool-specific grouping
  keywords?: string[];         // significant words from title (stop-words removed)
}
```

### Edge Types

| Edge Type | Rule | Guards | Priority |
|-----------|------|--------|----------|
| **Explicit Ref** | Shared `crossToolRef` string | None needed | Definitive — existing, unchanged |
| **Containment** | Commit ↔ PR via SHA membership (preferred) or repo + tight time window + file overlap | See Containment section below | Definitive |
| **Container** | Same non-null `container` (feature branch, thread, epic) | Exclude default/long-lived branches; use thread IDs not channel IDs | Strong |
| **Collaborator** | ≥2 shared people in `collaborators` (excluding self) | Must be within 30-day window | Strong |
| **Lexical** | ≥2 shared `keywords` AND temporal gap < 30 days | None beyond time gate | Moderate |

### Containment: Commit ↔ PR Association (P1 Fix)

**Problem**: Inferring commit→PR by repo + time overlap is ambiguous when multiple PRs overlap in time. This can create hard false edges and merge unrelated work.

**Solution (ordered by preference)**:

1. **SHA membership (preferred)**: Fetch PR commit list via `GET /repos/{owner}/{repo}/pulls/{number}/commits` during sync. Store commit SHAs in PR's rawData as `commitShas: string[]`. Match commits to PRs by exact SHA. This is definitive — zero false positives.

2. **Fallback (when SHA list unavailable)**: Repo match + tight time window (commit within PR's `createdAt..mergedAt` range) + require ≥1 shared file path. This is stricter than "repo + time overlap" alone.

3. **Unmatched commits**: If a commit can't be linked to any PR, it keeps no container and relies on other signals (refs, collaborators, keywords) or falls through to Layer 2.

**Implementation note**: The GitHub tool already fetches PR details (`github.tool.ts:270-295`). Adding `commitShas` requires one additional API call per PR: `GET /repos/{owner}/{repo}/pulls/{number}/commits`. Cap at 50 PRs per sync (same as commit detail cap) to protect rate limits.

**Required tests**: Concurrent PRs in same repo — verify commits route to correct PR, not both.

### Container Extraction Per Tool (P2 Fixes Applied)

| Tool | Container Field | rawData Path | Guards |
|------|----------------|-------------|--------|
| GitHub PR | Feature branch | `rawData.headRef` | **Exclude**: `main`, `master`, `develop`, `release/*`, `hotfix/*`. Only feature branches create container edges. |
| GitHub Commit | (inferred from PR) | SHA membership → PR's `headRef` | See Containment section above |
| Jira | Epic key | `rawData.linkedIssues` (first epic-type) | None — epics are specific enough |
| Slack | **Thread ID** (not channel) | `rawData.threadTs ?? rawData.thread_ts` | Thread IDs are specific to a conversation. Channel IDs (`rawData.channelId`) are too broad — busy channels have many unrelated efforts. **Normalization**: Slack API returns `thread_ts`, mock-data uses `threadTs`. Signal extractor must check both: `threadTs = rawData.threadTs ?? rawData.thread_ts`. Root messages (no thread) have no container — they rely on other signals. |
| Confluence | Space | `rawData.spaceKey` | None — spaces are project-scoped |
| OneDrive | Folder path | `rawData.parentPath` | None |
| Figma | File key | `rawData.fileKey` | None |
| Google/Outlook/Meet | (none strong enough) | Skip | — |

### Collaborator Extraction (P2 Fix: Time Gating)

Reuse `IdentityMatcher` normalization logic but invert the question: instead of "is this me?", extract "who ISN'T me?" from all people fields. Normalize via `CareerPersona.emails` and tool-specific identities.

**Time gate**: Collaborator edges only created between activities within a **30-day window**. Without this, small teams where the same 2-3 people work on everything would merge all activities across months. The 30d window is generous enough for feature-length work but prevents cross-quarter false matches.

### Keyword Extraction

Lightweight — no embeddings, no ML:
1. Split title into words
2. Lowercase, strip punctuation
3. Remove stop words + common dev noise ("fix", "add", "update", "feat", "test", "the", "a", "in", "for")
4. Remove short words (<3 chars)
5. Keep remaining significant terms

### Temporal Split (Post-Process)

After finding connected components via DFS:
1. For each component, sort activities by timestamp
2. Walk sequentially
3. If gap between consecutive activities > 14 days → split into sub-components
4. Each sub-component becomes a separate cluster

### What Layer 1 Resolves

- Same branch → same cluster (fixes Bug 2)
- Same Jira ticket → same cluster (existing, works)
- Same collaborator group → same cluster (new — cross-tool)
- >14d gap → separate clusters (fixes Bug 1)

### What Layer 1 Can't Resolve

- Activities with no shared refs, different branches, different collaborators, but semantically related (e.g., "OAuth callback fix" commit + "auth middleware" Slack discussion)
- Cluster naming (still produces "AUTH-123" or null)
- Cluster splitting based on semantic divergence within a time window

---

## Layer 2: LLM Semantic Refinement

### When It Runs

On every sync, AFTER Layer 1 completes. Receives a unified **candidates** list:
- **Unclustered activities** (Layer 1 couldn't assign) — `currentClusterId: null`
- **Weak assignments** (assigned by keyword-only edges) — `currentClusterId: <id>, confidence: low`

### What It Does

1. **Assigns** unclustered activities to existing clusters or new clusters
2. **Names** new clusters with human-readable descriptions
3. **Validates** weak assignments — can KEEP, MOVE to a different cluster, or split via NEW
4. **Splits** bloated clusters when a previously-assigned activity gets `NEW:...` — it leaves its old cluster

### Prompt Shape (P1 Fix: supports KEEP/MOVE/NEW, uses stable clusterIds not indices)

```handlebars
You are a work activity clustering engine for a career stories app.

Your job: for each candidate activity, decide whether to:
- KEEP it in its current cluster,
- MOVE it to a different existing cluster, or
- NEW: create/join a new cluster name.

Return a JSON object with EXACTLY ONE entry per candidate activity ID.
Do not invent IDs or omit any. No extra keys.

EXISTING CLUSTERS (last 30 days + any currentClusterId referenced by candidates):
{{#each existingClusters}}
- clusterId: {{id}}
  name: "{{name}}"
  activityCount: {{activityCount}}
  dateRange: {{dateRange}}
  tools: {{toolSummary}}
  {{#if isReferenced}}(referenced by a candidate below){{/if}}
  topActivities: {{topActivities}}
{{/each}}

CANDIDATE ACTIVITIES:
{{#each candidates}}
{{id}}. [{{source}}] "{{title}}" ({{date}})
   currentClusterId: {{#if currentClusterId}}{{currentClusterId}}{{else}}null{{/if}}
   confidence: {{#if confidence}}{{confidence}}{{else}}null{{/if}}
   {{#if description}}{{truncate description 100}}{{/if}}
{{/each}}

Rules:
- Use only clusterId values listed above for KEEP or MOVE.
- Use NEW:<descriptive cluster name> to create/join a new cluster.
- Every candidate ID must appear exactly once in the JSON output.
- If unsure, prefer NEW to avoid false merges.
- Keep names short and specific ("Share As Derivations Feature").

Respond as JSON:
{
  "<activity_id>": "KEEP:<clusterId>" | "MOVE:<clusterId>" | "NEW:<name>"
}
```

### Key Design Decisions

- **Stable `clusterId`** instead of array index. Prevents hallucinated index bugs (e.g., "ASSIGN:7" when only 3 clusters exist). Cluster IDs are CUIDs from the database — unambiguous.
- **Three actions** (KEEP/MOVE/NEW) instead of just ASSIGN/NEW. This lets the LLM reassign weak assignments and split clusters without needing a separate "split" protocol.
- **`confidence` field** on candidates tells the LLM which assignments to scrutinize. `null` = unclustered, `low` = keyword-only edge, `high` = ref/branch/collaborator edge. Only low/null candidates are sent as candidates; high-confidence assignments from Layer 1 are NOT sent to the LLM.
- **"Prefer NEW when unsure"** — biases toward over-splitting rather than over-merging. Over-splitting is cheap (user merges two stories). Over-merging is expensive (user must manually disentangle).
- **Existing cluster list = 30-day active clusters PLUS any cluster referenced by a candidate.** If a candidate has `currentClusterId: cluster_old_xyz` from a 45-day-old effort, that cluster is included in the prompt with a minimal summary so the LLM can KEEP it there. This prevents forcing long-running efforts into wrong clusters. Implementation: `SELECT DISTINCT currentClusterId FROM candidates WHERE currentClusterId IS NOT NULL` → union with 30-day active clusters → deduplicate by ID.

### Example Input/Output

**Input** (what would have been sent today):

```
EXISTING CLUSTERS (last 30 days + any currentClusterId referenced by candidates):
- clusterId: cluster_abc123
  name: "API Debugging and OAuth Integration"
  activityCount: 4
  dateRange: Jan 22-28
  tools: github, jira
  topActivities: PR#38 error tracking, PR#41 OAuth callback fix

CANDIDATE ACTIVITIES:
A. [github] "docs: add Share As derivations design document" (Feb 7)
   currentClusterId: null
   confidence: null
B. [github] "copy: strip jargon from derivation UI labels" (Feb 7)
   currentClusterId: null
   confidence: null
C. [github] "test: derivation prompt builder (32) and service (16) tests" (Feb 7)
   currentClusterId: null
   confidence: null
D. [github] "feat: DerivationModal UI with pill selectors and preview frames" (Feb 7)
   currentClusterId: null
   confidence: null
E. [github] "feat: wire POST /stories/:storyId/derive endpoint" (Feb 7)
   currentClusterId: null
   confidence: null
F. [github] "Closed PR: Fixing OAuth Callback Blockage" (Feb 7)
   currentClusterId: null
   confidence: null
```

**Output:**

```json
{
  "A": "NEW:Share As Derivations Feature",
  "B": "NEW:Share As Derivations Feature",
  "C": "NEW:Share As Derivations Feature",
  "D": "NEW:Share As Derivations Feature",
  "E": "NEW:Share As Derivations Feature",
  "F": "MOVE:cluster_abc123"
}
```

This creates a new "Share As Derivations Feature" story and correctly moves the OAuth PR to the existing OAuth cluster. **Exactly what should have happened today.**

### Cost Analysis

| Metric | Value |
|--------|-------|
| Input tokens per sync | ~3-6K (cluster summaries + candidates) |
| Output tokens per sync | ~200-500 (JSON assignments) |
| Model | Haiku (quick tier) |
| Cost per sync | <$0.005 |
| Latency | 1-3 seconds |
| Syncs per day per user | 1-5 |
| Monthly cost per active user | <$0.10 |

Already spending 10x more on narrative generation per story.

### Output Validation Contract (P2 Fix: strict one-to-one enforcement)

```typescript
function validateLLMResponse(
  rawJson: string,
  response: Record<string, string>,
  candidateIds: Set<string>,
  existingClusterIds: Set<string>
): { valid: boolean; errors: string[] }
```

**Rules (all must pass):**
1. JSON parse succeeds
2. **Pre-parse duplicate check**: Scan raw JSON text for repeated keys via regex (`/"([^"]+)":/g` → count occurrences). `JSON.parse()` silently drops duplicate keys, so this must happen BEFORE parsing. If duplicates found → validation fails.
3. Response keys === candidate IDs set (no missing, no extras)
4. Every value matches `KEEP:<knownClusterId>` | `MOVE:<knownClusterId>` | `NEW:<non-empty-string>`
5. `KEEP` is only valid when the candidate has a non-null `currentClusterId`
6. `MOVE` target must be different from `currentClusterId` (otherwise it's a KEEP)

**On failure**: Retry once with the same prompt. If still invalid, fall back to Layer 1 results only. Log the failure for monitoring.

### Error Handling

- **LLM down/timeout**: Fall back to Layer 1 results only. Unclustered activities go to temporal grouping (degraded but functional).
- **Validation failure (2 attempts)**: Fall back to Layer 1. Log for monitoring.
- **Non-determinism**: Acceptable. Stories are already LLM-generated. The grouping doesn't need to be deterministic — it needs to be *reasonable*.

---

## Data Flow: Complete Pipeline

```
On Sync:
  1. Fetch new activities from tools (GitHub, Jira, Slack, etc.)

  2. Transform + persist (existing)
     → ActivityInput[] with rawData preserved
     → Extract crossToolRefs via refExtractor (existing)
     → Upsert to ToolActivity table

  3. Extract signals (NEW)
     → For each activity, extract from rawData:
        - collaborators: normalized people (excluding self)
        - container: feature branch / thread ID / epic / folder (with guards)
        - keywords: significant words from title

  4. Layer 1: Heuristic graph (ENHANCED)
     → Build multi-signal adjacency:
        - Explicit ref edges (existing)
        - Container edges (same feature branch / thread ID / epic — with guards)
        - Collaborator edges (≥2 shared people + <30d window)
        - Keyword edges (≥2 shared keywords + <30d gap)
     → DFS connected components (existing algorithm)
     → Temporal split pass (NEW — break >14d gaps)
     → Result: resolved clusters + unclustered activities

  5. Layer 2: LLM refinement (NEW)
     → Build candidates list: unclustered (null) + weak assignments (low confidence)
     → Summarize existing clusters (last 30 days + any currentClusterId referenced by candidates)
     → LLM returns: KEEP/MOVE/NEW per candidate
     → Validate: all candidate IDs present, no extras, valid clusterIds
     → Apply: KEEP=noop, MOVE=reassign, NEW=create/join new cluster

  6. Persist clusters + create journal entries (existing, modified)
     → Cluster-based entries get LLM-assigned names
     → Temporal entries ONLY for true orphans (LLM couldn't assign either)

  7. Generate narratives for changed clusters (existing)
```

---

## Files to Modify

### Backend Changes

| File | Change | Effort |
|------|--------|--------|
| `clustering.service.ts` | Widen `ClusterableActivity`, add multi-signal adjacency, add temporal split | Medium |
| `production-sync.service.ts` | Extract signals from rawData, wire Layer 2, pass rawData to clustering | Medium |
| `pipeline/types/cluster.types.ts` | Update `ClusterableActivity` type with new fields | Small |
| **NEW** `cluster-assignment.prompt.ts` | Handlebars template for LLM refinement prompt | Small |
| **NEW** `cluster-assignment.service.ts` | LLM call + response parsing for Layer 2 | Medium |
| **NEW** `signal-extractor.ts` | Extract collaborators/container/keywords from rawData per tool | Medium |
| `clustering.service.test.ts` | Add tests for new edge types + temporal split | Medium |

### No Schema Changes Needed

All new signal data is extracted at clustering time from existing `rawData` JSON field. No new columns or tables required.

---

## GSE Verdict (Grumpy Staff Engineer Review)

### DO:
- **Branch edges** — Strongest unused signal. Same `headRef` = same feature. 5 lines in adjacency builder.
- **Temporal split** — Simple post-process. Fixes the "14-day blob" problem. 15 lines.
- **LLM refinement for unclustered** — Cheap, handles the hard 30%. Use Haiku.

### DON'T:
- **Repository-level edges** — Too broad. All commits in `acme/backend` would cluster together. Repository is what you cluster WITHIN, not a clustering signal.
- **Label overlap edges** — Noise. Labels like `bug`, `enhancement` are categorical, not feature-specific. Two PRs both labeled `bug` aren't related.
- **Edge weights** — Connected components don't use weights. Binary: connected or not. If you want weights, you need a different algorithm.
- **Full semantic embeddings** — Overkill. The LLM call in Layer 2 provides semantic understanding without the embedding infrastructure.

### WATCH OUT:
- **Commits don't have branch names** from GitHub API. Use SHA membership from PR commit list (preferred) or strict fallback with file overlap guard.
- **Collaborator threshold of ≥2** is critical. With ≥1, your manager (who appears everywhere) would cluster everything together.
- **Collaborator time gate of 30d** — without this, small teams merge everything.
- **Branch blacklist** — `main`, `master`, `develop`, `release/*` must not create container edges.
- **Slack channels are too broad** — use `threadTs` (available in rawData), not `channelId`.
- **Keyword stop-word list** needs dev-specific additions: "fix", "add", "update", "feat", "refactor", "test", "merge", "bump", "chore".

---

## Implementation Phases

### Phase 1: Heuristic Layer Enhancement (~2 days)
1. Add `signal-extractor.ts` — extract collaborators, container, keywords from rawData
2. Widen `ClusterableActivity` type
3. Enhance `buildAdjacencyList()` → `buildMultiSignalAdjacency()`
4. Add temporal split post-process
5. Wire in `production-sync.service.ts` (pass rawData signals to clustering)
6. Tests for new edge types

### Phase 2: LLM Refinement Layer (~1.5 days)
1. Create `cluster-assignment.prompt.ts` (Handlebars template)
2. Create `cluster-assignment.service.ts` (LLM call + JSON parsing)
3. Wire into sync pipeline after Layer 1
4. Fallback to Layer 1 only on LLM failure
5. Tests for prompt building + response parsing

### Phase 3: Temporal Entry Demotion (~0.5 day)
1. Temporal entries only created for true orphans (neither layer could assign)
2. Reduce window from 14d → 7d for orphan grouping
3. Better titles for temporal entries (include tool types, not just dates)

**Total: ~4 days**

---

## Success Criteria

After implementation:
1. Today's derivations commits → grouped into "Share As Derivations" story (not "Week of Jan 23 - Feb 2")
2. OAuth PR → assigned to existing OAuth cluster (not mixed with derivations)
3. Cross-tool clustering works: Jira ticket + PR + Slack thread about same feature → one story
4. Temporal windows only appear for genuinely orphaned activities
5. Cluster names are meaningful (LLM-generated) instead of "Week of X - Y"
6. Performance: <3 seconds total (heuristics <500ms + LLM <2.5s)

---

## Test Matrix

Minimal set covering all identified risks from code review.

### Layer 2: LLM Output Validation

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | Missing candidate ID | 3 candidates, output has 2 keys | Validation fails → retry → fallback to Layer 1 |
| 2 | Extra unknown ID | Output includes ID not in candidates | Validation fails → retry → fallback |
| 3 | Invalid clusterId | `KEEP:cluster_999` (not in existing list) | Validation fails → retry → fallback |
| 4 | KEEP on unclustered activity | `KEEP:cluster_x` but candidate has `currentClusterId: null` | Validation fails (KEEP requires existing assignment) |
| 5 | MOVE same as current | `MOVE:cluster_x` where `currentClusterId: cluster_x` | Validation fails (MOVE must differ from current) |

### Layer 2: Reassignment and Splitting

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 6 | Weak assignment reassigned | Candidate with `currentClusterId: cluster_a, confidence: low`, LLM returns `MOVE:cluster_b` | Activity removed from cluster_a, added to cluster_b |
| 7 | Split via NEW on clustered item | Candidate with `currentClusterId: cluster_a`, LLM returns `NEW:New Feature` | New cluster created, activity removed from cluster_a |
| 8 | Multiple items to same NEW name | 3 candidates all return `NEW:Share As Derivations` | Single new cluster created with all 3 |

### Layer 1: Containment (Commit ↔ PR)

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 9 | Concurrent PRs, same repo | 2 PRs overlapping in time, commit falls in overlap | No containment edge unless SHA membership matches exactly one PR |
| 10 | Commit matches PR by SHA | Commit SHA appears in PR's `commitShas` array | Containment edge created, commit inherits PR's `headRef` as container |
| 11 | Commit matches no PR | Commit in repo with no open PRs during its timestamp | No containment edge, no container — relies on other signals or Layer 2 |

### Layer 1: Container Edge Guards

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 12 | Default branch exclusion | Two activities with `headRef: main` | No container edge created |
| 13 | Long-lived branch exclusion | Activities with `headRef: release/1.2` | No container edge created |
| 14 | Feature branch match | Two activities with `headRef: feature/oauth2-auth` | Container edge created |
| 15 | Slack thread container | Two messages with same `threadTs` | Container edge created |
| 16 | Slack channel (no thread) | Two messages in same channel, different `threadTs` | No container edge (channel too broad) |

### Layer 1: Collaborator Edge Guards

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 17 | Within 30d window, ≥2 shared | Activities 7 days apart, shared collaborators {alice, bob} | Collaborator edge created |
| 18 | Beyond 30d window | Activities 60 days apart, same shared collaborators | No collaborator edge |
| 19 | Only 1 shared collaborator | Same timeframe but only {alice} in common | No collaborator edge (threshold is ≥2) |
| 20 | Self excluded | Both activities have same author (self) + 1 shared collaborator | No edge (self not counted, only 1 non-self overlap) |

### Layer 1: Temporal Split

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 21 | Component with >14d gap | 5 activities: 3 in Jan, 2 in Feb (20d gap) | Split into 2 sub-components |
| 22 | Component with no gap | 5 activities across 10 days | Single component preserved |
| 23 | Multiple gaps | 7 activities with 2 gaps >14d | Split into 3 sub-components |

### Integration

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 24 | Today's bug reproduction | 5 derivation commits + 1 OAuth PR, no shared crossToolRefs | Derivations form new cluster (branch or LLM), OAuth PR joins existing OAuth cluster |
| 25 | LLM failure graceful degradation | Layer 2 returns invalid JSON twice | Falls back to Layer 1 results, temporal grouping for unclustered |
| 26 | Full cross-tool story | Jira ticket + PR + Slack thread + meeting, same collaborators | All cluster together via collaborator + ref edges |
