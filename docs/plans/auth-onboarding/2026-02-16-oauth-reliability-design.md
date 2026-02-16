# OAuth Reliability & Onboarding Design

> Harden MCPOAuthService, build CLI-first testing layer, wire real OAuth into onboarding.

**Date**: 2026-02-16
**Status**: Design approved
**Approach**: Singleton first, split second (Approach B with GSE-corrected sequencing)
**Scope**: All 7 OAuth fixes + CLI testing layer + onboarding wiring

---

## The 30-Second Version

The OAuth service works for all 4 buckets but has a critical structural bug (16 independent instances = mutex can never work) and 7 reliability gaps. We fix the singleton problem first, add retry/refresh/mutex, build a slim CLI to prove everything works, then wire real OAuth into onboarding.

**Sequence**: Singleton → Reliability fixes → CLI → Class split → Onboarding wiring

---

## Problem #0: The Singleton Bug (GSE Finding)

Every tool fetcher and every controller method does `new MCPOAuthService()`:

```
github.tool.ts:23      new MCPOAuthService()
jira.tool.ts:25         new MCPOAuthService()
confluence.tool.ts:26   new MCPOAuthService()
outlook.tool.ts:23      new MCPOAuthService()
teams.tool.ts:23        new MCPOAuthService()
onedrive.tool.ts:23     new MCPOAuthService()
onenote.tool.ts:23      new MCPOAuthService()
slack.tool.ts:23        new MCPOAuthService()
figma.tool.ts:23        new MCPOAuthService()
zoom.tool.ts:23         new MCPOAuthService()
google-workspace.tool.ts:22  new MCPOAuthService()
sharepoint.tool.ts:23   new MCPOAuthService()
mcp-simple.controller.ts:27  new MCPOAuthService()
mcp.controller.ts:174   new MCPOAuthService()
mcp.controller.ts:225   new MCPOAuthService()
mcp.controller.ts:270   new MCPOAuthService()
mcp.controller.ts:358   new MCPOAuthService()
```

That's **17 independent instances**. Each re-reads env vars, re-initializes 11 OAuth configs, re-creates the encryption key hash. The refresh mutex (`Map<string, Promise>`) would live on one instance and never see concurrent calls from another.

**Fix**: Export singleton instance. Update all 17 call sites.

```typescript
// backend/src/services/mcp/mcp-oauth.service.ts (bottom of file)
export const oauthService = new MCPOAuthService();
```

This is prerequisite to the mutex working. Nothing else matters without this.

---

## The 7 OAuth Fixes

All fixes go into the existing `MCPOAuthService` class. Class split (Approach B) happens after all fixes are proven via CLI.

### Fix 1: Retry on Refresh Failure

Inline retry loop in `refreshAccessToken()` — NOT a shared utility yet (YAGNI, one consumer today).

```typescript
// In refreshAccessToken():
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    const tokenResponse = await axios.post(config.tokenUrl, ...);
    // ... store tokens, log success
    log.info('Token refreshed', { toolType, userId, attempt });
    return tokens.access_token;
  } catch (error: any) {
    const status = error.response?.status;

    // 400 = invalid_grant → refresh token is permanently dead. Don't retry.
    if (status === 400 || status === 401) {
      log.error('Refresh token permanently invalid', {
        toolType, userId, status,
        errorBody: error.response?.data
      });
      return null;
    }

    // Network error or 5xx → retry with backoff
    if (attempt < MAX_ATTEMPTS) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      log.warn('Refresh failed, retrying', { toolType, userId, attempt, nextRetryMs: delay, error: error.message });
      await new Promise(r => setTimeout(r, delay));
    } else {
      log.error('Refresh exhausted all attempts', { toolType, userId, attempts: MAX_ATTEMPTS, error: error.message });
    }
  }
}
return null;
```

**Logging**: Every attempt logged with tool, user, attempt number, delay, and error. When it works, you see 1 log line. When it fails, you see the full retry history.

### Fix 2: Proactive Refresh (5-min Buffer)

In `getAccessToken()`, change:

```typescript
// Before
if (integration.expiresAt && new Date() > integration.expiresAt)

// After
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
if (integration.expiresAt && new Date() > new Date(integration.expiresAt.getTime() - REFRESH_BUFFER_MS))
```

Log when proactive refresh triggers:

```typescript
log.info('Proactive refresh triggered', {
  toolType, userId,
  expiresAt: integration.expiresAt,
  expiresInMs: integration.expiresAt.getTime() - Date.now()
});
```

### Fix 3: Refresh Mutex

Requires singleton (Fix #0) to work. In-memory `Map` on the single instance:

```typescript
private refreshPromises = new Map<string, Promise<string | null>>();

private async refreshAccessToken(userId: string, toolType: MCPToolType): Promise<string | null> {
  const key = `${userId}:${toolType}`;

  // If another caller is already refreshing this token, wait on their result
  const existing = this.refreshPromises.get(key);
  if (existing) {
    log.info('Mutex: waiting on in-flight refresh', { toolType, userId });
    return existing;
  }

  // We're the first caller — do the refresh
  const promise = this.doRefresh(userId, toolType);
  this.refreshPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    this.refreshPromises.delete(key);
  }
}

// Actual refresh logic moves to private doRefresh()
private async doRefresh(userId: string, toolType: MCPToolType): Promise<string | null> {
  // ... existing refresh logic with retry (Fix 1)
}
```

### Fix 4: Remove Encryption Key Fallback

```typescript
// Before
this.encryptionKey = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';

// After
const key = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY;
if (!key) {
  throw new Error('[MCPOAuthService] ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required');
}
this.encryptionKey = key;
```

No `JWT_SECRET` fallback (rotation risk). No `'default-key'` fallback (no encryption). Fail fast at startup.

### Fix 5: State Parameter Expiry

In `getAuthorizationUrl()` and `getAuthorizationUrlForGroup()`:

```typescript
const stateData = Buffer.from(JSON.stringify({
  userId, toolType, state,
  iat: Date.now()  // ← NEW: issued-at timestamp
})).toString('base64');
```

In `handleCallback()`:

```typescript
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
if (stateData.iat && Date.now() - stateData.iat > STATE_MAX_AGE_MS) {
  log.error('OAuth state expired', {
    toolType: stateData.toolType,
    userId: stateData.userId,
    ageMs: Date.now() - stateData.iat
  });
  throw new Error('Authorization state expired (older than 10 minutes)');
}
```

### Fix 6: PKCE (Conditional)

Only for providers that support it (Atlassian, Microsoft, Google). GitHub doesn't.

In `getAuthorizationUrl()`:

```typescript
const PKCE_PROVIDERS = new Set([MCPToolType.JIRA, MCPToolType.CONFLUENCE, MCPToolType.OUTLOOK,
  MCPToolType.TEAMS, MCPToolType.ONEDRIVE, MCPToolType.ONENOTE, MCPToolType.GOOGLE_WORKSPACE]);

if (PKCE_PROVIDERS.has(toolType)) {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  params.append('code_challenge', codeChallenge);
  params.append('code_challenge_method', 'S256');
  // Store codeVerifier in state for callback
  statePayload.codeVerifier = codeVerifier;
}
```

In `handleCallback()`, include `code_verifier` in the token exchange request when present.

### Fix 7: Token Revocation on Disconnect

New method, called from `disconnectIntegration()` before setting `isActive: false`:

```typescript
private async revokeTokenAtProvider(toolType: MCPToolType, accessToken: string, config: MCPOAuthConfig): Promise<void> {
  try {
    switch (toolType) {
      case MCPToolType.GITHUB:
        // DELETE /applications/{client_id}/grant with Basic auth
        await axios.delete(`https://api.github.com/applications/${config.clientId}/grant`, {
          auth: { username: config.clientId, password: config.clientSecret },
          data: { access_token: accessToken }
        });
        break;
      case MCPToolType.GOOGLE_WORKSPACE:
        await axios.post(`https://oauth2.googleapis.com/revoke?token=${accessToken}`);
        break;
      case MCPToolType.SLACK:
        await axios.post('https://slack.com/api/auth.revoke', null, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        break;
      // Microsoft: limited revocation (session logout only)
      // Atlassian: no revocation endpoint
      // Figma, Zoom: no standard revocation
      default:
        log.info('No revocation endpoint for provider', { toolType });
    }
    log.info('Token revoked at provider', { toolType });
  } catch (error: any) {
    // Best-effort — if revocation fails, still disconnect locally
    log.warn('Token revocation failed (continuing with local disconnect)', {
      toolType, error: error.message
    });
  }
}
```

---

## Structured Logging

All OAuth operations use a consistent `log` object (matching `production-sync.service.ts` pattern):

```typescript
const DEBUG = process.env.DEBUG_OAUTH === 'true' || process.env.NODE_ENV === 'development';

const log = {
  debug: (msg: string, data?: object) => DEBUG && console.log(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  info:  (msg: string, data?: object) => console.log(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  warn:  (msg: string, data?: object) => console.warn(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  error: (msg: string, data?: object) => console.error(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
};
```

**Every operation logs**: tool, user, what happened, how long it took, what went wrong.

- Retry: `[OAuth] Refresh failed, retrying {"toolType":"github","userId":"abc","attempt":1,"nextRetryMs":1000,"error":"ECONNRESET"}`
- Mutex: `[OAuth] Mutex: waiting on in-flight refresh {"toolType":"jira","userId":"abc"}`
- Proactive: `[OAuth] Proactive refresh triggered {"toolType":"outlook","userId":"abc","expiresInMs":240000}`
- State: `[OAuth] OAuth state expired {"toolType":"github","userId":"abc","ageMs":720000}`
- Revocation: `[OAuth] Token revocation failed (continuing with local disconnect) {"toolType":"github","error":"404 Not Found"}`

No `OAuthEventEmitter` class. Just structured console output with JSON. The CLI reads the same logs.

---

## OAuth CLI (Slim — 6 Commands)

**File**: `backend/src/cli/oauth-cli.ts`

Following the existing `backend/src/cli/story-coach/` pattern.

### Commands

```
Usage: npx ts-node backend/src/cli/oauth-cli.ts <command> [options]

Commands:
  status                      List all users with integrations, show per-tool status
  status --user <id>          Detailed status for one user (per-tool: connected/expired/invalid,
                              token age, expires-in, scopes, has-refresh-token)
  inspect <tool> --user <id>  Show token metadata: expiry countdown, scope, connected-at,
                              last-refreshed, refresh-token presence (NOT the token itself)
  refresh <tool> --user <id>  Force-refresh token (even if not expired). Shows retry/backoff
                              behavior with --verbose.
  validate-all --user <id>    Validate all integrations in parallel. Shows which are
                              valid/expired/invalid.
  disconnect <tool> --user <id>  Disconnect + revoke. Shows revocation attempt result.
  simulate-failure <tool> --user <id>  Mock 400 invalid_grant on next refresh to test
                              graceful degradation path.

Options:
  --user <userId>   User ID (required for all except bare 'status')
  --verbose         Show all retry attempts, mutex waits, timing
  --json            Output as JSON (for scripting)
```

### What's NOT in the CLI (GSE cuts)

| Cut command | Why |
|-------------|-----|
| `connect` | Requires browser — user must click "Authorize" at provider. Use the UI. |
| `callback` | Can't generate a valid auth code. Test with unit tests, not CLI. |
| `test-cycle` | `connect` needs browser, so full cycle can't run headless. |
| `--dry-run` | For what? Dry-run of refresh that doesn't refresh = `inspect`. Cut it. |

### `simulate-failure` (the scary scenario)

The CLI sets a flag that makes the next `doRefresh()` call for that tool return a mock 400 `invalid_grant` response instead of calling the real provider. This tests:

1. Does retry correctly skip 400 (permanent failure)?
2. Does `getAccessToken()` return `null` gracefully?
3. Does the tool fetcher handle the `null` without crashing?
4. What does the user see in the UI?

Implementation: A `Map<string, boolean>` on the singleton that `doRefresh()` checks before the real axios call. Only settable via CLI (not exposed in production API).

### User Authentication

The CLI connects directly to the database via Prisma (same as `story-coach` CLI):

- `status` (no user): queries `MCPIntegration` table, groups by userId
- `status --user <id>`: queries integrations for that user
- No HTTP server needed — direct service calls

---

## Class Split (Approach B — After Fixes Are Proven)

**Timing**: After Phase 1 (singleton + 7 fixes) and Phase 2 (CLI) are working. This is a refactor, not a prerequisite.

```
MCPOAuthService (singleton, ~1000 lines after fixes)
    ↓ splits into
OAuthFlowService (~400 lines)          TokenManager (~550 lines)
├── OAuth config initialization        ├── encrypt / decrypt
├── getAuthorizationUrl()              ├── storeTokens()
├── getAuthorizationUrlForGroup()      ├── getAccessToken() ← proactive refresh
├── handleCallback()                   ├── refreshAccessToken() ← retry + mutex
├── logConfigurationDiagnostics()      ├── revokeTokenAtProvider()
├── isToolAvailable()                  ├── validateIntegration()
└── getAvailableTools()                └── validateAllIntegrations()
```

**Who imports what after split**:
- Tool fetchers (`*.tool.ts`): import `tokenManager` — they only need `getAccessToken()`
- Routes/controller: import `oauthFlowService` — auth URLs and callbacks
- CLI: imports both
- `handleCallback()` stays in `OAuthFlowService` but calls `tokenManager.storeTokens()`

**Both are singletons**: `export const tokenManager = new TokenManager()` and `export const oauthFlowService = new OAuthFlowService(tokenManager)`.

---

## Onboarding Wiring (After CLI Proves OAuth Works)

### Sequence: CLI proves it → then wire to UI

The CLI-first approach means by the time we touch `connect-tools.tsx`, every OAuth path has been exercised and logged. The UI becomes "just wiring."

### 5a. Tool List Alignment

Replace 8 hardcoded tools (including non-existent GitLab, Linear, Notion, Bitbucket) with 4 real buckets:

| Bucket | Display | OAuth | Sub-tools shown |
|--------|---------|-------|-----------------|
| GitHub | "GitHub" | Single | PRs, commits, reviews |
| Atlassian | "Atlassian" | Group | Jira + Confluence |
| Microsoft | "Microsoft 365" | Group | Outlook + Teams + OneDrive |
| Google | "Google Workspace" | Single | Calendar + Drive |

Use `ToolIcon` component (exists) instead of emoji. Show sub-tools as chips.

### 5b. Real OAuth Flow

Replace `setTimeout(1500)` with existing hooks from `integrations-settings.tsx`:

```typescript
import { useMCPOAuth, useMCPGroupOAuth, useMCPIntegrations } from '../../../hooks/useMCP';

// In connect handler:
if (bucket.groupType) {
  initiateGroupOAuth({ groupType: bucket.groupType }, {
    onSuccess: (data) => {
      saveOnboardingState(); // ← localStorage
      window.location.href = data.authUrl;
    }
  });
} else {
  initiateOAuth({ toolType: bucket.toolType }, {
    onSuccess: (data) => {
      saveOnboardingState();
      window.location.href = data.authUrl;
    }
  });
}
```

### 5c. State Preservation Across OAuth Redirect

Before redirect:
```typescript
localStorage.setItem('onboarding-oauth-return', JSON.stringify({
  step: 'connect-tools',
  connectedTools: Array.from(connectedTools),
  ts: Date.now()
}));
```

In `callback.tsx` — detect onboarding origin:
```typescript
const onboardingReturn = localStorage.getItem('onboarding-oauth-return');
if (onboardingReturn) {
  const parsed = JSON.parse(onboardingReturn);
  // Only honor if < 15 min old (stale guard)
  if (Date.now() - parsed.ts < 15 * 60 * 1000) {
    localStorage.removeItem('onboarding-oauth-return');
    navigate('/onboarding', { state: { returnToStep: 'connect-tools' } });
    return;
  }
}
// Default: settings redirect
navigate('/settings', { state: { tab: 'integrations' } });
```

### 5d. Connection Gate

```typescript
const { data } = useMCPIntegrations();
const hasRealConnection = data?.integrations?.some(i => i.isConnected) ?? false;
// "Next" button disabled until at least 1 bucket connected
```

### 5e. Frontend Type Fix

Add `zoom` and `google_workspace` to `src/types/mcp.types.ts` to match backend enum.

---

## Implementation Phases

### Phase 1: Singleton + 7 Fixes (~1.5 days)

1. Export singleton `oauthService` from `mcp-oauth.service.ts`
2. Update all 17 `new MCPOAuthService()` call sites to use singleton import
3. Add structured `log` object
4. Fix 1: Retry with backoff in `refreshAccessToken()` (inline loop)
5. Fix 2: Proactive refresh (5-min buffer)
6. Fix 3: Refresh mutex (`Map<string, Promise>`)
7. Fix 4: Remove encryption key fallback chain
8. Fix 5: State parameter expiry (`iat` + 10-min check)
9. Fix 6: PKCE (conditional, Atlassian/Microsoft/Google only)
10. Fix 7: Token revocation on disconnect

### Phase 2: OAuth CLI (~1 day)

1. Create `backend/src/cli/oauth-cli.ts` following `story-coach/` pattern
2. Implement 6 commands: `status`, `inspect`, `refresh`, `validate-all`, `disconnect`, `simulate-failure`
3. Wire CLI to singleton `oauthService`
4. Test all paths: happy refresh, retry behavior, mutex, state expiry, revocation, failure simulation

### Phase 3: Class Split (~0.5 day)

1. Extract `TokenManager` from `MCPOAuthService` (token storage, refresh, mutex, validation, revocation)
2. Rename remaining class to `OAuthFlowService` (config, auth URLs, callbacks)
3. Both exported as singletons
4. Update imports: tool fetchers → `tokenManager`, controllers → `oauthFlowService`
5. CLI imports both

### Phase 4: Onboarding Wiring (~1.5 days)

1. Replace `connect-tools.tsx` tool list with 4 real buckets
2. Replace `setTimeout(1500)` with real OAuth hooks
3. Add localStorage state preservation before redirect
4. Update `callback.tsx` to detect onboarding origin
5. Add connection gate (1+ bucket required)
6. Fix frontend `MCPToolType` (add `zoom`, `google_workspace`)

### Phase 5: Polish (~0.5 day)

1. Error UX: tools without transformers shown as "coming soon"
2. Integration tests using CLI commands
3. Documentation update in `tools-integration-architecture.md`

**Total: ~5 days**

---

## GSE Review Summary

The design was reviewed by the Grumpy Staff Engineer persona. Key corrections incorporated:

| GSE Finding | Action Taken |
|-------------|--------------|
| **16 instances = mutex can't work** | Added "Problem #0: Singleton Bug" as the first fix |
| **`OAuthEventEmitter` is overengineered** | Replaced with simple `log` object (4 lines, matching production-sync pattern) |
| **`connect`/`callback`/`test-cycle` CLI commands can't work without browser** | Cut from CLI. 10 commands → 6 commands. |
| **`--dry-run` is meaningless** | Cut from CLI. |
| **Shared retry utility is YAGNI** | Inline retry loop in `refreshAccessToken()`. Extract utility when there's a second consumer. |
| **Missing `token-age`/`expires-in` in CLI output** | Added to `inspect` and `status` commands. |
| **Missing `refresh --force`** | Added — force-refresh even when token isn't expired. |
| **Missing `simulate-failure`** | Added — mock 400 `invalid_grant` to test graceful degradation. |
| **Missing CLI user auth strategy** | Direct Prisma access (same as story-coach CLI). No HTTP server needed. |
| **Do singleton first, split second** | Reordered: Phase 1 (singleton + fixes) → Phase 2 (CLI) → Phase 3 (split) |

---

## Key Files

| File | Role | Changes |
|------|------|---------|
| `backend/src/services/mcp/mcp-oauth.service.ts` | OAuth lifecycle (892→~1000 lines) | Singleton + 7 fixes + structured logging |
| `backend/src/cli/oauth-cli.ts` | **NEW** — OAuth CLI testing tool | 6 commands |
| `backend/src/services/mcp/tools/*.tool.ts` (12 files) | Tool fetchers | `new MCPOAuthService()` → `import { oauthService }` |
| `backend/src/controllers/mcp.controller.ts` | Request handlers | `new MCPOAuthService()` → `import { oauthService }` |
| `backend/src/controllers/mcp-simple.controller.ts` | Simplified controller | `new MCPOAuthService()` → `import { oauthService }` |
| `src/pages/onboarding/steps/connect-tools.tsx` | Onboarding connection UI | Real OAuth + 4 buckets |
| `src/pages/mcp/callback.tsx` | OAuth callback | Onboarding return detection |
| `src/types/mcp.types.ts` | Frontend types | Add `zoom`, `google_workspace` |
