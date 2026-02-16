# Auth & Onboarding Gap Analysis

> Complete context for connecting 4 tool buckets (GitHub, Atlassian, Microsoft, Google Workspace) with rigor, retry, and the right OSS posture.
>
> See also: `tools-integration-architecture.md` (same directory) for the full data pipeline.

---

## The 30-Second Version

**OAuth works for all 4 buckets** — real configs, real endpoints, real scopes, real token storage. The gap is not "can we connect?" but **"what happens after we connect?"**

1. **OAuth is custom-built** (892-line `MCPOAuthService`), functional but missing production rigor (retry, proactive refresh, mutex, PKCE)
2. **Onboarding is simulated** — `connect-tools.tsx` uses `setTimeout(1500)` instead of real OAuth
3. **8 of 12 tools silently drop data** after successful fetch — no transformer exists
4. **OSS libraries don't help** — Passport.js is dead, Arctic is nice but unnecessary, the custom service covers more ground

---

## Bucket Status Matrix

| Bucket | OAuth | Fetcher | Transformer | Signal Extractor | End-to-End |
|--------|-------|---------|-------------|------------------|------------|
| **GitHub** | `repo read:user` | 3-stage parallel | Full (PRs, issues, commits, releases, workflows, reviews) | collaborators + branch container | **Working** |
| **Atlassian (Jira)** | `read:jira-work read:jira-user` + sprints + boards | Full (JQL + changelogs + worklogs + links) | Full (issues, sprints, changelogs, worklogs) | collaborators + epic container | **Working** |
| **Atlassian (Confluence)** | Granular v2 scopes (page, blogpost, space, comment, user) | Full (pages, blog posts, comments) | Full (pages, blog posts, comments) | collaborators + space container | **Working** |
| **Microsoft (Outlook)** | `User.Read Mail.Read Calendars.Read offline_access` | Meetings + emails | **NONE** — data silently dropped | none | **Broken** |
| **Microsoft (Teams)** | `ChannelMessage.Edit Chat.Read` + basics | Messages + channels | **NONE** — data silently dropped | extractor exists (unused) | **Broken** |
| **Microsoft (OneDrive)** | `User.Read Files.Read offline_access` | File activity | Exists (basic) | **NONE** | **Partial** |
| **Microsoft (OneNote)** | `User.Read Notes.Read offline_access` | Notebooks + pages | **NONE** — data silently dropped | none | **Broken** |
| **Google Workspace** | `drive.readonly calendar.readonly` + user info | Calendar + Drive + Docs | **NONE** — data silently dropped | none | **Broken** |
| **Figma** | `file_content:read file_metadata:read file_comments:read` | Files + comments | **NONE** — data silently dropped | extractor exists (unused) | **Broken** |
| **Slack** | `channels:read channels:history users:read chat:write` | Messages + channels | **NONE** — data silently dropped | extractor exists (unused) | **Broken** |
| **Zoom** | User-Managed granular (meetings, recordings, transcripts) | Meetings + recordings | **NONE** — data silently dropped | none | **Broken** |

**Summary**: 3 tools fully working, 1 partial, 8 broken (fetch works, transform doesn't).

---

## Gap 1: OAuth Reliability (MCPOAuthService)

### What Works

`backend/src/services/mcp/mcp-oauth.service.ts` (892 lines):

- **All 4 buckets have real OAuth configs** — real client IDs, real endpoints, real scopes
- **Group OAuth** — single Atlassian auth → Jira + Confluence; single Microsoft auth → Outlook + Teams + OneDrive + OneNote
- **AES-256-CBC encryption** at rest in `MCPIntegration` table
- **Token refresh** — `refreshAccessToken()` called on expired tokens
- **Privacy logging** — every connect/disconnect/refresh logged via `MCPPrivacyService`
- **Scope documentation** — inline comments explain every scope choice

### What's Missing

#### 1. No retry on token refresh failure

```
Current: Single axios.post() → catch → return null
Needed:  Exponential backoff (3 attempts, 1s/2s/4s)
```

`refreshAccessToken()` at line 676 does a single `axios.post()`. If the provider is briefly down (common with Microsoft Graph), the user's token becomes permanently invalid until they reconnect.

**Fix**: Add retry with exponential backoff (3 attempts, 1s → 2s → 4s). ~20 lines.

#### 2. No proactive token refresh

```
Current: Refresh only when getAccessToken() finds expired token
Needed:  Refresh 5 min before expiry to avoid mid-request failures
```

`getAccessToken()` at line 646 checks `if (new Date() > integration.expiresAt)`. This means the first request after expiry always fails, then triggers a refresh, then the retry succeeds. Users see a transient error.

**Fix**: Check `if (new Date() > new Date(expiresAt.getTime() - 5 * 60 * 1000))`. 1 line change.

#### 3. No refresh mutex (concurrent requests race)

```
Current: Two concurrent getAccessToken() calls → two refresh attempts
Needed:  Lock so only the first caller refreshes, second waits
```

If two API calls hit `getAccessToken()` simultaneously and the token is expired, both trigger `refreshAccessToken()`, and one gets an invalid refresh token (most providers invalidate on use).

**Fix**: In-memory `Map<string, Promise>` keyed on `userId:toolType`. ~15 lines.

#### 4. Encryption key fallback chain is dangerous

```typescript
// Line 30 — current
this.encryptionKey = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
```

The fallback to `JWT_SECRET` means a JWT rotation breaks all encrypted tokens. The `'default-key'` fallback means no-env-var = no encryption.

**Fix**: Remove fallback chain. Require `ENCRYPTION_KEY` or fail fast at startup.

#### 5. No PKCE (Proof Key for Code Exchange)

OAuth 2.0 best practice for public clients. Not critical for server-side flows (we have client_secret), but Atlassian and Google support it and some security audits flag its absence.

**Fix**: Add `code_verifier` + `code_challenge` to auth URL generation and callback. ~30 lines. Low priority.

#### 6. State parameter is non-expiring

```typescript
// Line 335
const stateData = Buffer.from(JSON.stringify({ userId, toolType, state })).toString('base64');
```

Base64-encoded JSON with no timestamp. A captured state value works forever.

**Fix**: Add `iat` timestamp, reject states older than 10 minutes in callback. ~5 lines.

#### 7. No token revocation on disconnect

`disconnectIntegration()` at line 753 sets `isActive: false` but doesn't call the provider's revocation endpoint. Tokens remain valid at the provider until they naturally expire.

**Fix**: Call provider-specific revocation endpoints (GitHub: `DELETE /applications/{client_id}/token`, Microsoft: revocation endpoint, Google: `https://oauth2.googleapis.com/revoke`). ~40 lines.

---

## Gap 2: Onboarding is Simulated

### Current State

`src/pages/onboarding/steps/connect-tools.tsx` lines 93–113:

```typescript
// TODO: Replace with actual MCP OAuth flow
// For now, simulate a connection delay
await new Promise(resolve => setTimeout(resolve, 1500));
```

Users click "Connect", see a spinner for 1.5s, then the tool shows as "connected" — but **no OAuth flow runs**, no tokens are stored, no real connection is made.

### The Real Flow Exists Elsewhere

`src/components/settings/integrations-settings.tsx` has the real implementation:

```typescript
handleConnect → initiateOAuth({ toolType }) → window.location.href = data.authUrl
handleConnectGroup → initiateGroupOAuth({ groupType }) → window.location.href = data.authUrl
```

Callback: `src/pages/mcp/callback.tsx` handles `?success=true&tool=X` params, invalidates React Query cache, redirects to settings.

### The Fix

Replace the simulated flow in `connect-tools.tsx` with the real OAuth flow from `integrations-settings.tsx`. Challenges:

1. **OAuth redirect leaves the page** — onboarding state must persist (localStorage or URL state)
2. **Callback redirects to `/settings`** — needs to detect "came from onboarding" and redirect back
3. **Group OAuth** — onboarding should show "Connect Atlassian" (not separate Jira + Confluence buttons)
4. **Minimum gate** — require at least 1 real connection before proceeding

### Onboarding Tool List Mismatch

`connect-tools.tsx` shows 8 tools including **GitLab, Linear, Notion, Bitbucket** — none of which have any backend support. The backend supports: github, jira, confluence, figma, outlook, teams, onedrive, onenote, slack, zoom, google_workspace.

**Fix**: Align the onboarding tool list with what actually works. Show the 4 buckets:
- GitHub (standalone)
- Atlassian (Jira + Confluence, group OAuth)
- Microsoft (Outlook + Teams + OneDrive + OneNote, group OAuth)
- Google Workspace (standalone)

---

## Gap 3: Transformer Bottleneck (8 Tools Silently Drop Data)

### The Mechanism

`backend/src/services/mcp/transformers/index.ts`:

```typescript
export function transformToolActivity(toolType: string, data: unknown): ActivityInput[] {
  switch (toolType) {
    case 'github':     return transformGitHubActivity(data);
    case 'jira':       return transformJiraActivity(data);
    case 'confluence':  return transformConfluenceActivity(data);
    case 'onedrive':   return transformOneDriveActivity(data);
    default:
      console.warn(`[Transformer] No transformer for tool type: ${toolType}`);
      return [];  // ← ALL OTHER TOOLS: data silently lost
  }
}
```

### Priority Transformers Needed

Based on Phase 2 research (`entries-feasibility-phase2/01-SOURCE-MAP.md`), most signals are **deterministic API fields** — no NLP needed:

| Tool | Effort | Signals Available | Notes |
|------|--------|-------------------|-------|
| **Outlook** | Low (~0.5d) | Calendar attendees (deterministic), email participants (deterministic) | Microsoft Graph returns structured `attendees[]` and `from`/`to` fields |
| **Google Workspace** | Low (~0.5d) | Calendar event attendees (deterministic), Drive file editors (deterministic) | Calendar API returns `attendees[]`, Drive API returns `permissions[]` |
| **Figma** | Low (~0.5d) | File comments with user references (deterministic API fields) | Figma API returns `user` objects on files and comments |
| **Slack** | Medium (~1d) | Message author + mentions (partially deterministic — `<@U123>` format) | Rate-limited (Tier 3), needs thread-level grouping |
| **Teams** | Medium (~1d) | Channel messages + chat participants | Microsoft Graph, structured `from.user` fields |
| **OneNote** | Low (~0.5d) | Notebook/page metadata only | Limited value — mostly timestamps and titles |
| **Zoom** | Low (~0.5d) | Meeting participant lists (deterministic), recording metadata | Participant data requires meeting host role |

### Why This Matters for Onboarding

If a user connects Microsoft in onboarding, they sync, and **zero activities appear** from Outlook/Teams/OneDrive because the transformer drops them. The user thinks the connection failed. This is worse than not offering the tool at all.

---

## Gap 4: Signal Extraction Coverage

`backend/src/services/career-stories/signal-extractor.ts`:

```typescript
export function extractSignals(source: string, rawData: any, selfIdentifiers: string[]) {
  switch (source) {
    case 'github':     // collaborators + branch container ✓
    case 'jira':       // collaborators + epic container ✓
    case 'confluence':  // collaborators + space container ✓
    case 'slack':      // author + mentions — extractor exists but no transformer feeds it
    case 'figma':      // owner + commenters — extractor exists but no transformer feeds it
    default:           return { collaborators: [], container: null };
  }
}
```

**OneDrive** has a transformer but no signal extractor — file edits are persisted but contribute nothing to clustering.

**Outlook, Google, Teams** need both transformers AND signal extractors.

---

## Gap 5: Frontend Type Mismatch

Backend `MCPToolType` enum (12 tools): includes `zoom` and `google_workspace`.

Frontend `MCPToolType` union type: only 10 tools — **missing `zoom` and `google_workspace`**.

This means the frontend can't properly handle these tools in the UI even if the backend connects them.

---

## OSS Library Evaluation

### Verdict: Keep Custom MCPOAuthService, Add Targeted Fixes

| Library | Status | Why Not |
|---------|--------|---------|
| **Passport.js** | Effectively dead (last meaningful update 2023, 800+ open issues) | Strategy pattern adds complexity, no value over direct OAuth |
| **Arctic** (Lucia auth) | Best lightweight option | Clean API but we'd be wrapping 892 lines of working code into a different 892 lines. No net gain. |
| **simple-oauth2** | Stale (last release 2023) | Missing Atlassian/Zoom providers |
| **google-auth-library** | Archived Nov 2025 | Google-only, deprecated |
| **@azure/msal-node** | Active, Microsoft-only | Would only cover 1 of 4 buckets. Adds 2MB dependency for what's 50 lines of code. |
| **Nango** | External SaaS service | Overkill — manages connections outside your infra. Good for 50+ integrations, not 4. |

**The right move**: Keep `MCPOAuthService`, add the 4 reliability fixes (retry, proactive refresh, mutex, encryption key). This is ~70 lines of change, not a library swap.

---

## Implementation Plan

### Phase 1: OAuth Reliability (~1 day)

1. **Retry with backoff on refresh** — 3 attempts, exponential backoff (~20 lines)
2. **Proactive refresh** — 5-min buffer before expiry (~1 line)
3. **Refresh mutex** — in-memory lock per userId:toolType (~15 lines)
4. **Remove encryption key fallback** — require `ENCRYPTION_KEY` env var (~3 lines)
5. **State parameter expiry** — add `iat`, reject > 10 min (~5 lines)

### Phase 2: Missing Transformers (~3 days)

Priority order (highest value per effort):

1. **Outlook transformer** (~0.5d) — calendar attendees + meeting titles
2. **Google Workspace transformer** (~0.5d) — calendar events + Drive file activity
3. **Figma transformer** (~0.5d) — files + comments with user references
4. **Teams transformer** (~0.5d) — channel messages + participants
5. **Slack transformer** (~1d) — messages + threads (rate limit complexity)

Each transformer:
- Convert tool-specific API response → `ActivityInput[]`
- Add signal extractor case for collaborator/container extraction
- Add to `transformToolActivity()` switch
- Tests: 10-15 per transformer (following existing patterns)

### Phase 3: Real Onboarding Connection (~1.5 days)

1. **Replace simulated flow** with real OAuth (use `useMCPOAuth` / `useMCPGroupOAuth` hooks)
2. **Persist onboarding state** before OAuth redirect (localStorage with step + form data)
3. **Callback routing** — detect "came from onboarding" (state parameter or localStorage flag), redirect back to onboarding step
4. **Align tool list** — show 4 buckets matching backend: GitHub, Atlassian, Microsoft, Google Workspace
5. **Connection gate** — require at least 1 bucket connected before "Next" enables
6. **Fix frontend types** — add `zoom` and `google_workspace` to frontend `MCPToolType`

### Phase 4: Production Polish (~0.5 day)

1. **Token revocation on disconnect** — call provider revocation endpoints
2. **PKCE** — add code_verifier/code_challenge (low priority, nice-to-have)
3. **Error UX** — surface transformer-less tools as "coming soon" instead of silently dropping data

---

## Key Files

| File | Role |
|------|------|
| `backend/src/services/mcp/mcp-oauth.service.ts` | OAuth lifecycle (892 lines) — all 4 buckets |
| `backend/src/services/mcp/tools/*.tool.ts` | Per-tool API fetchers (12 files) |
| `backend/src/services/mcp/transformers/index.ts` | Transformer dispatch — the bottleneck |
| `backend/src/services/mcp/transformers/*.transformer.ts` | 4 working transformers |
| `backend/src/services/career-stories/signal-extractor.ts` | Collaborator + container extraction |
| `backend/src/services/career-stories/ref-extractor.service.ts` | Cross-tool reference patterns |
| `backend/src/services/career-stories/production-sync.service.ts` | Full sync orchestrator |
| `backend/src/types/mcp.types.ts` | Backend MCPToolType enum (12 tools) |
| `src/types/mcp.types.ts` | Frontend MCPToolType (10 tools — **mismatch**) |
| `src/pages/onboarding/steps/connect-tools.tsx` | **Simulated** connection flow |
| `src/components/settings/integrations-settings.tsx` | **Real** OAuth flow |
| `src/pages/mcp/callback.tsx` | OAuth callback handler |
| `src/hooks/useMCP.ts` | React Query hooks for OAuth |
| `src/constants/tools.ts` | Tool metadata (names, colors, descriptions) |

---

## Prior Research

`.archive/backend/__docs/research/entries-feasibility-phase2/` (Jan 2026):

- **Key finding**: 11 of 13 participant signals are **deterministic API fields** — no NLP needed
- Only Jira/Confluence @mentions need parsing (ADF format) — full parser spec in `03-DEEP-DIVE-ADF-MENTIONS.md`
- Google Meet not B2C-viable (requires Admin SDK) — use Calendar attendees as proxy
- Slack rate-limited (Tier 3) — defer to after deterministic tools
- Evidence matrix: `05-EVIDENCE-MATRIX.md` — 10 evidence types x 7 tools
