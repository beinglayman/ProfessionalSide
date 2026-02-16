# OAuth Reliability & Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the MCPOAuthService (singleton, 7 reliability fixes), build a CLI testing layer, split the class, and wire real OAuth into onboarding.

**Architecture:** Fix the singleton bug first (17 independent `new MCPOAuthService()` → 1 exported instance), then layer 7 reliability fixes onto it (retry, proactive refresh, mutex, encryption fail-fast, state expiry, PKCE, revocation). A CLI proves all paths work before touching any UI code. Class split (OAuthFlowService + TokenManager) happens after fixes are proven. Onboarding wiring is last — it's "just wiring" by that point.

**Tech Stack:** TypeScript, Node.js, Prisma ORM, vitest, commander (CLI), React + React Query (frontend)

**Design doc:** `docs/plans/auth-onboarding/2026-02-16-oauth-reliability-design.md`

---

## Phase 1: Singleton + Structured Logging + 7 Fixes (~1.5 days)

### Task 1: Export singleton + structured log object

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts:17-37` (constructor area) and bottom of file
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts` (NEW)

**Step 1: Write the failing test**

Create `backend/src/services/mcp/mcp-oauth.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set required env var BEFORE importing the service
vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key-for-unit-tests');
vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-id');
vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-github-secret');

describe('MCPOAuthService: singleton', () => {
  it('exports a singleton instance', async () => {
    const { oauthService: instance1 } = await import('./mcp-oauth.service');
    const { oauthService: instance2 } = await import('./mcp-oauth.service');
    expect(instance1).toBe(instance2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/mcp/mcp-oauth.service.test.ts --reporter verbose`
Expected: FAIL — `oauthService` is not exported

**Step 3: Add structured log object and export singleton**

In `backend/src/services/mcp/mcp-oauth.service.ts`:

1. Add log object at top of file (after imports, before class):

```typescript
const DEBUG = process.env.DEBUG_OAUTH === 'true' || process.env.NODE_ENV === 'development';

const log = {
  debug: (msg: string, data?: object) => DEBUG && console.log(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  info:  (msg: string, data?: object) => console.log(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  warn:  (msg: string, data?: object) => console.warn(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  error: (msg: string, data?: object) => console.error(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
};
```

2. Add singleton export at bottom of file:

```typescript
// Singleton instance — all consumers import this, never `new MCPOAuthService()`
export const oauthService = new MCPOAuthService();
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/mcp/mcp-oauth.service.test.ts --reporter verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "feat(oauth): export singleton instance + add structured log object"
```

---

### Task 2: Update all 17 call sites to use singleton

**Files:**
- Modify: 12 tool fetchers in `backend/src/services/mcp/tools/*.tool.ts`
- Modify: `backend/src/controllers/mcp.controller.ts` (4 instances)
- Modify: `backend/src/controllers/mcp-simple.controller.ts` (1 instance)

**Step 1: Update each tool fetcher**

For every file in `backend/src/services/mcp/tools/`:

Change the import:
```typescript
// Before
import { MCPOAuthService } from '../mcp-oauth.service';

// After
import { oauthService } from '../mcp-oauth.service';
```

Remove the constructor line:
```typescript
// Before (in constructor)
this.oauthService = new MCPOAuthService();

// After — delete this line entirely
```

Change the class property:
```typescript
// Before
private oauthService: MCPOAuthService;

// After — delete this property. Replace all this.oauthService references with oauthService (module-level import)
```

Files to update (12 files — same pattern each):
- `github.tool.ts:3,17,23` — import line, property, constructor
- `jira.tool.ts` — same pattern
- `confluence.tool.ts` — same pattern
- `outlook.tool.ts` — same pattern
- `teams.tool.ts` — same pattern
- `onedrive.tool.ts` — same pattern
- `onenote.tool.ts` — same pattern
- `slack.tool.ts` — same pattern
- `figma.tool.ts` — same pattern
- `zoom.tool.ts` — same pattern
- `google-workspace.tool.ts` — same pattern
- `sharepoint.tool.ts` — same pattern

**Step 2: Update controllers**

In `backend/src/controllers/mcp.controller.ts`, the service is instantiated inline at lines 174, 225, 270, 358. Each looks like:
```typescript
const oauthService = new MCPOAuthService();
```

Replace each with the module-level import at the top:
```typescript
import { oauthService } from '../services/mcp/mcp-oauth.service';
```
Then delete all 4 inline `const oauthService = new MCPOAuthService();` lines.

Same for `backend/src/controllers/mcp-simple.controller.ts:27`.

**Step 3: Verify no `new MCPOAuthService()` remains**

Run: `grep -r "new MCPOAuthService()" backend/src/ --include="*.ts"`
Expected: 0 matches (except the one inside `mcp-oauth.service.ts` itself for the singleton export)

**Step 4: Run existing tests to check for regressions**

Run: `cd backend && npx vitest run --reporter verbose`
Expected: All existing tests pass

**Step 5: Commit**

```bash
git add backend/src/services/mcp/tools/ backend/src/controllers/
git commit -m "refactor(oauth): replace 17 new MCPOAuthService() with singleton import"
```

---

### Task 3: Fix 4 — Remove encryption key fallback chain

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts:29-33`
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing tests**

Add to `mcp-oauth.service.test.ts`:

```typescript
describe('MCPOAuthService: Fix 4 — encryption key', () => {
  it('throws when ENCRYPTION_KEY and MCP_ENCRYPTION_KEY are both missing', () => {
    // Clear all encryption env vars
    vi.stubEnv('ENCRYPTION_KEY', '');
    vi.stubEnv('MCP_ENCRYPTION_KEY', '');
    delete process.env.ENCRYPTION_KEY;
    delete process.env.MCP_ENCRYPTION_KEY;

    expect(() => {
      // Must create fresh instance to test constructor
      const { MCPOAuthService } = require('./mcp-oauth.service');
      new MCPOAuthService();
    }).toThrow('ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required');
  });

  it('accepts MCP_ENCRYPTION_KEY as fallback', () => {
    vi.stubEnv('ENCRYPTION_KEY', '');
    vi.stubEnv('MCP_ENCRYPTION_KEY', 'valid-key');
    delete process.env.ENCRYPTION_KEY;

    expect(() => {
      const { MCPOAuthService } = require('./mcp-oauth.service');
      new MCPOAuthService();
    }).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/services/mcp/mcp-oauth.service.test.ts --reporter verbose`
Expected: FAIL — current code falls back to `JWT_SECRET` or `'default-key'`

**Step 3: Implement the fix**

In `mcp-oauth.service.ts`, replace lines 29-33:

```typescript
// Before
this.encryptionKey = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
if (this.encryptionKey === 'default-key') {
  console.warn('[MCP OAuth] WARNING: Using default encryption key. Set ENCRYPTION_KEY in environment.');
}

// After
const encKey = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY;
if (!encKey) {
  throw new Error('[MCPOAuthService] ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required');
}
this.encryptionKey = encKey;
```

**Step 4: Run tests**

Run: `cd backend && npx vitest run src/services/mcp/mcp-oauth.service.test.ts --reporter verbose`
Expected: PASS

**Step 5: Verify `.env` files have the key set**

Run: `grep ENCRYPTION_KEY backend/.env backend/.env.example 2>/dev/null`
Expected: Key is set. If not, add `ENCRYPTION_KEY=<generate-random-32-char-string>` to `.env`.

**Step 6: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "fix(oauth): remove unsafe encryption key fallback chain, fail fast on missing key"
```

---

### Task 4: Fix 1 — Retry with backoff on refresh failure

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts:676-745` (refreshAccessToken)
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing tests**

Add to test file. These tests need to mock axios and Prisma:

```typescript
import axios from 'axios';

vi.mock('axios');
vi.mock('../../lib/prisma', () => ({
  prisma: {
    mCPIntegration: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    mCPPrivacyLog: {
      create: vi.fn(),
    },
  },
}));

describe('MCPOAuthService: Fix 1 — retry on refresh', () => {
  let service: any;

  beforeEach(async () => {
    vi.stubEnv('ENCRYPTION_KEY', 'test-key-for-retry-tests');
    vi.stubEnv('GITHUB_CLIENT_ID', 'test-id');
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-secret');
    vi.resetModules();
    const mod = await import('./mcp-oauth.service');
    service = new mod.MCPOAuthService();
  });

  it('retries on 503 and succeeds on third attempt', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000), // expired
      accessToken: service.encrypt('old-token'),
    });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const mockPost = vi.mocked(axios.post);
    mockPost
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' })
      .mockResolvedValueOnce({ data: { access_token: 'new-token', refresh_token: 'new-refresh' } });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('new-token');
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 400 (permanent failure)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000),
      accessToken: service.encrypt('old-token'),
    });

    const mockPost = vi.mocked(axios.post);
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { error: 'invalid_grant' } }, message: 'Bad Request' });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBeNull();
    expect(mockPost).toHaveBeenCalledTimes(1); // No retry
  });

  it('returns null after 3 failed attempts (503)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      refreshToken: service.encrypt('mock-refresh-token'),
      expiresAt: new Date(Date.now() - 1000),
      accessToken: service.encrypt('old-token'),
    });

    const mockPost = vi.mocked(axios.post);
    mockPost
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'fail 1' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'fail 2' })
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'fail 3' });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBeNull();
    expect(mockPost).toHaveBeenCalledTimes(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/services/mcp/mcp-oauth.service.test.ts --reporter verbose`
Expected: FAIL — current code does single attempt, no retry

**Step 3: Implement retry logic**

In `mcp-oauth.service.ts`, refactor `refreshAccessToken()` (lines 676-745):

1. Rename current `refreshAccessToken` to `doRefresh` (private)
2. Create new `refreshAccessToken` that wraps `doRefresh` with retry loop

```typescript
private async refreshAccessToken(userId: string, toolType: MCPToolType): Promise<string | null> {
  return this.doRefresh(userId, toolType);
}

private async doRefresh(userId: string, toolType: MCPToolType): Promise<string | null> {
  const MAX_ATTEMPTS = 3;
  const BASE_DELAY_MS = 1000;

  const integration = await this.prisma.mCPIntegration.findUnique({
    where: { userId_toolType: { userId, toolType } }
  });

  if (!integration || !integration.refreshToken) return null;

  const config = this.oauthConfigs.get(toolType);
  if (!config) return null;

  const refreshToken = this.decrypt(integration.refreshToken);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const tokenResponse = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
      );

      const tokens = tokenResponse.data;
      await this.storeTokens(userId, toolType, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
        scope: tokens.scope
      });

      await this.privacyService.recordConsent(userId, toolType, MCPAction.TOKEN_REFRESHED, true);
      log.info('Token refreshed', { toolType, userId, attempt });
      return tokens.access_token;
    } catch (error: any) {
      const status = error.response?.status;

      if (status === 400 || status === 401) {
        log.error('Refresh token permanently invalid', { toolType, userId, status, errorBody: error.response?.data });
        return null;
      }

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
}
```

**Step 4: Run tests**

Run: `cd backend && npx vitest run src/services/mcp/mcp-oauth.service.test.ts --reporter verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "feat(oauth): add retry with exponential backoff on token refresh failure"
```

---

### Task 5: Fix 2 — Proactive refresh (5-min buffer)

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts:646` (expiry check in getAccessToken)
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('MCPOAuthService: Fix 2 — proactive refresh', () => {
  it('triggers refresh when token expires in <5 minutes', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('current-token'),
      refreshToken: service.encrypt('refresh-token'),
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 min from now (within 5-min buffer)
    });

    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValueOnce({ data: { access_token: 'refreshed-token' } });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('refreshed-token');
  });

  it('does NOT trigger refresh when token expires in >5 minutes', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('current-token'),
      refreshToken: service.encrypt('refresh-token'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    });

    const result = await service.getAccessToken('u1', 'github');
    expect(result).toBe('current-token');
    expect(axios.post).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Expected: FAIL — current code only refreshes AFTER expiry, not before

**Step 3: Implement the fix**

In `getAccessToken()`, replace line 646:

```typescript
// Before
if (integration.expiresAt && new Date() > integration.expiresAt) {

// After
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const needsRefresh = integration.expiresAt &&
  new Date() > new Date(integration.expiresAt.getTime() - REFRESH_BUFFER_MS);

if (needsRefresh) {
  log.info('Proactive refresh triggered', {
    toolType, userId,
    expiresAt: integration.expiresAt,
    expiresInMs: integration.expiresAt!.getTime() - Date.now()
  });
```

**Step 4: Run tests**

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "feat(oauth): proactive token refresh 5 minutes before expiry"
```

---

### Task 6: Fix 3 — Refresh mutex

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts` (add mutex map + wrapper)
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing test**

```typescript
describe('MCPOAuthService: Fix 3 — refresh mutex', () => {
  it('deduplicates concurrent refresh calls (only 1 actual refresh)', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('old-token'),
      refreshToken: service.encrypt('refresh-token'),
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    (prisma.mCPIntegration.upsert as any).mockResolvedValue({});

    const mockPost = vi.mocked(axios.post);
    // Add small delay to simulate real network call
    mockPost.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        data: { access_token: 'new-token', refresh_token: 'new-refresh' }
      } as any), 50))
    );

    // Fire 5 concurrent requests
    const results = await Promise.all([
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
      service.getAccessToken('u1', 'github'),
    ]);

    // All should get the same token
    results.forEach(r => expect(r).toBe('new-token'));
    // But axios.post should only be called ONCE (the mutex deduplicates)
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test — FAIL**

Expected: FAIL — current code has no mutex, axios.post called 5 times

**Step 3: Implement mutex**

Add to class:

```typescript
private refreshPromises = new Map<string, Promise<string | null>>();
```

Wrap `refreshAccessToken()`:

```typescript
private async refreshAccessToken(userId: string, toolType: MCPToolType): Promise<string | null> {
  const key = `${userId}:${toolType}`;
  const existing = this.refreshPromises.get(key);
  if (existing) {
    log.info('Mutex: waiting on in-flight refresh', { toolType, userId });
    return existing;
  }

  const promise = this.doRefresh(userId, toolType);
  this.refreshPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    this.refreshPromises.delete(key);
  }
}
```

**Step 4: Run tests — PASS**

**Step 5: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "feat(oauth): add refresh mutex to prevent concurrent refresh races"
```

---

### Task 7: Fix 5 — State parameter expiry (iat + 10-min check)

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts:335` (getAuthorizationUrl) and `462-469` (handleCallback)
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('MCPOAuthService: Fix 5 — state parameter expiry', () => {
  it('generates state with iat timestamp', () => {
    const result = service.getAuthorizationUrl('user-1', 'github');
    expect(result).not.toBeNull();
    const stateData = JSON.parse(Buffer.from(result!.state, 'base64').toString('utf8'));
    expect(stateData.iat).toBeDefined();
    expect(typeof stateData.iat).toBe('number');
    expect(Date.now() - stateData.iat).toBeLessThan(1000); // issued < 1 sec ago
  });

  it('rejects state with no iat (legacy)', async () => {
    const legacyState = Buffer.from(JSON.stringify({
      userId: 'u1', toolType: 'github', state: 'abc'
      // no iat
    })).toString('base64');

    await expect(service.handleCallback('code', legacyState))
      .rejects.toThrow('Authorization state missing timestamp');
  });

  it('rejects state older than 10 minutes', async () => {
    const staleState = Buffer.from(JSON.stringify({
      userId: 'u1', toolType: 'github', state: 'abc',
      iat: Date.now() - 11 * 60 * 1000 // 11 min ago
    })).toString('base64');

    await expect(service.handleCallback('code', staleState))
      .rejects.toThrow('Authorization state expired');
  });
});
```

**Step 2: Run tests — FAIL**

**Step 3: Implement**

In `getAuthorizationUrl()` at line 335, add `iat`:
```typescript
const stateData = Buffer.from(JSON.stringify({ userId, toolType, state, iat: Date.now() })).toString('base64');
```

Same for `getAuthorizationUrlForGroup()`.

In `handleCallback()` at line 468, after decoding `stateData`, add:
```typescript
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

if (!stateData.iat) {
  log.warn('OAuth state missing iat (pre-migration state), rejecting', { toolType: stateData.toolType, userId: stateData.userId });
  throw new Error('Authorization state missing timestamp — please reconnect');
}

if (Date.now() - stateData.iat > STATE_MAX_AGE_MS) {
  log.error('OAuth state expired', { toolType: stateData.toolType, userId: stateData.userId, ageMs: Date.now() - stateData.iat });
  throw new Error('Authorization state expired (older than 10 minutes)');
}
```

**Step 4: Run tests — PASS**

**Step 5: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "feat(oauth): add iat timestamp to state parameter, reject stale/legacy states"
```

---

### Task 8: Fix 6 — PKCE (conditional)

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts` (getAuthorizationUrl + handleCallback)
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('MCPOAuthService: Fix 6 — PKCE', () => {
  it('adds code_challenge for Jira (PKCE provider)', () => {
    // Requires ATLASSIAN_CLIENT_ID to be set
    vi.stubEnv('ATLASSIAN_CLIENT_ID', 'test-atlassian-id');
    vi.stubEnv('ATLASSIAN_CLIENT_SECRET', 'test-atlassian-secret');

    const result = service.getAuthorizationUrl('u1', 'jira');
    if (result) {
      const url = new URL(result.url);
      expect(url.searchParams.get('code_challenge')).not.toBeNull();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    }
  });

  it('does NOT add code_challenge for GitHub (non-PKCE)', () => {
    const result = service.getAuthorizationUrl('u1', 'github');
    expect(result).not.toBeNull();
    const url = new URL(result!.url);
    expect(url.searchParams.get('code_challenge')).toBeNull();
  });
});
```

**Step 2: Run tests — FAIL** (no PKCE exists)

**Step 3: Implement**

Add to class:
```typescript
private pkceVerifiers = new Map<string, { verifier: string; createdAt: number }>();
```

In `getAuthorizationUrl()`, after building params:
```typescript
const PKCE_PROVIDERS = new Set([
  MCPToolType.JIRA, MCPToolType.CONFLUENCE, MCPToolType.OUTLOOK,
  MCPToolType.TEAMS, MCPToolType.ONEDRIVE, MCPToolType.ONENOTE,
  MCPToolType.GOOGLE_WORKSPACE
]);

if (PKCE_PROVIDERS.has(toolType)) {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  params.append('code_challenge', codeChallenge);
  params.append('code_challenge_method', 'S256');
  this.pkceVerifiers.set(state, { verifier: codeVerifier, createdAt: Date.now() });
}
```

In `handleCallback()`, before token exchange:
```typescript
const pkceEntry = this.pkceVerifiers.get(stateData.state);
if (pkceEntry) {
  // Include code_verifier in token exchange
  tokenParams.append('code_verifier', pkceEntry.verifier);
  this.pkceVerifiers.delete(stateData.state);
}
```

Add TTL sweep (call periodically or in constructor):
```typescript
private cleanupPkceVerifiers(): void {
  const MAX_AGE_MS = 15 * 60 * 1000;
  const now = Date.now();
  for (const [key, entry] of this.pkceVerifiers) {
    if (now - entry.createdAt > MAX_AGE_MS) this.pkceVerifiers.delete(key);
  }
}
```

**Step 4: Run tests — PASS**

**Step 5: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "feat(oauth): add PKCE for Atlassian/Microsoft/Google providers"
```

---

### Task 9: Fix 7 — Token revocation on disconnect + controller rewire

**Files:**
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts:753-782` (disconnectIntegration)
- Modify: `backend/src/controllers/mcp.controller.ts:385-416` (disconnectIntegration handler)
- Test: `backend/src/services/mcp/mcp-oauth.service.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('MCPOAuthService: Fix 7 — revocation on disconnect', () => {
  it('calls GitHub revocation endpoint on disconnect', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('token-to-revoke'),
    });
    (prisma.mCPIntegration.update as any).mockResolvedValue({});

    const mockDelete = vi.mocked(axios.delete);
    mockDelete.mockResolvedValueOnce({} as any);

    await service.disconnectIntegration('u1', 'github');

    expect(mockDelete).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com/applications'),
      expect.objectContaining({ data: { access_token: 'token-to-revoke' } })
    );
  });

  it('completes disconnect even if revocation fails', async () => {
    const { prisma } = await import('../../lib/prisma');
    (prisma.mCPIntegration.findUnique as any).mockResolvedValue({
      id: '1', userId: 'u1', toolType: 'github', isActive: true,
      accessToken: service.encrypt('token-to-revoke'),
    });
    (prisma.mCPIntegration.update as any).mockResolvedValue({});

    const mockDelete = vi.mocked(axios.delete);
    mockDelete.mockRejectedValueOnce(new Error('404 Not Found'));

    const result = await service.disconnectIntegration('u1', 'github');
    expect(result).toBe(true); // Disconnect succeeds despite revocation failure
  });
});
```

**Step 2: Run tests — FAIL**

**Step 3: Implement revocation**

Add `revokeTokenAtProvider()` private method and call it from `disconnectIntegration()` before setting `isActive: false`. See design doc Fix 7 for full implementation.

**Step 4: Rewire controller**

In `backend/src/controllers/mcp.controller.ts`, replace the `disconnectIntegration` handler (lines 385-416):

```typescript
// Before: raw prisma.mCPIntegration.deleteMany(...)
// After:
import { oauthService } from '../services/mcp/mcp-oauth.service';

export const disconnectIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { toolType } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  const success = await oauthService.disconnectIntegration(userId, toolType as MCPToolType);

  if (!success) {
    sendError(res, 'Integration not found or already disconnected', 404);
    return;
  }

  sendSuccess(res, {
    message: `Successfully disconnected ${toolType}`,
    privacyNotice: 'Token revoked at provider and integration deactivated.'
  });
});
```

**Step 5: Run all tests**

Run: `cd backend && npx vitest run --reporter verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/mcp-oauth.service.test.ts backend/src/controllers/mcp.controller.ts
git commit -m "feat(oauth): add token revocation on disconnect + rewire controller through service"
```

---

## Phase 2: OAuth CLI (~1 day)

### Task 10: Create CLI scaffold with `status` and `inspect` commands

**Files:**
- Create: `backend/src/cli/oauth-cli.ts`

**Step 1: Create the CLI file**

Follow the `story-coach/index.ts` pattern (uses `commander`):

```typescript
#!/usr/bin/env ts-node
/**
 * OAuth CLI — Testing tool for OAuth token lifecycle
 *
 * Usage:
 *   npx ts-node backend/src/cli/oauth-cli.ts <command> [options]
 */

import { Command } from 'commander';
import { prisma } from '../lib/prisma';
import { oauthService } from '../services/mcp/mcp-oauth.service';
import { MCPToolType } from '../types/mcp.types';

const program = new Command();

program
  .name('oauth-cli')
  .description('OAuth token lifecycle testing tool')
  .version('1.0.0');

// --- status command ---
program
  .command('status')
  .description('List all users with integrations and per-tool status')
  .option('--user <userId>', 'Show detailed status for one user')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    if (opts.user) {
      const integrations = await prisma.mCPIntegration.findMany({
        where: { userId: opts.user },
        orderBy: { toolType: 'asc' },
      });

      if (integrations.length === 0) {
        console.log('No integrations found for user', opts.user);
        return;
      }

      const rows = integrations.map(i => ({
        tool: i.toolType,
        active: i.isActive,
        connected: i.isConnected,
        tokenAge: i.connectedAt ? `${Math.round((Date.now() - i.connectedAt.getTime()) / 86400000)}d` : 'n/a',
        expiresIn: i.expiresAt ? `${Math.round((i.expiresAt.getTime() - Date.now()) / 60000)}m` : 'n/a',
        hasRefresh: !!i.refreshToken,
        scope: i.scope || 'n/a',
      }));

      if (opts.json) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        console.table(rows);
      }
    } else {
      // Summary: all users
      const integrations = await prisma.mCPIntegration.findMany({
        select: { userId: true, toolType: true, isActive: true },
      });

      const byUser = new Map<string, string[]>();
      for (const i of integrations) {
        const tools = byUser.get(i.userId) || [];
        tools.push(`${i.toolType}${i.isActive ? '' : ' (inactive)'}`);
        byUser.set(i.userId, tools);
      }

      for (const [userId, tools] of byUser) {
        console.log(`${userId}: ${tools.join(', ')}`);
      }
    }
  });

// --- inspect command ---
program
  .command('inspect <tool>')
  .description('Show token metadata (NOT the token itself)')
  .requiredOption('--user <userId>', 'User ID')
  .option('--json', 'Output as JSON')
  .action(async (tool, opts) => {
    const integration = await prisma.mCPIntegration.findUnique({
      where: { userId_toolType: { userId: opts.user, toolType: tool } },
    });

    if (!integration) {
      console.log(`No integration found for ${tool}`);
      return;
    }

    const info = {
      tool: integration.toolType,
      active: integration.isActive,
      connected: integration.isConnected,
      connectedAt: integration.connectedAt?.toISOString() || 'n/a',
      expiresAt: integration.expiresAt?.toISOString() || 'n/a',
      expiresInMs: integration.expiresAt ? integration.expiresAt.getTime() - Date.now() : null,
      hasRefreshToken: !!integration.refreshToken,
      scope: integration.scope || 'n/a',
      updatedAt: integration.updatedAt?.toISOString() || 'n/a',
    };

    if (opts.json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      console.log('\n--- Token Inspection ---');
      for (const [k, v] of Object.entries(info)) {
        console.log(`  ${k}: ${v}`);
      }
    }
  });

program.parseAsync().catch(console.error).finally(() => prisma.$disconnect());
```

**Step 2: Run it**

Run: `cd backend && npx ts-node src/cli/oauth-cli.ts status`
Expected: Lists users (or "No integrations found" if empty DB)

Run: `cd backend && npx ts-node src/cli/oauth-cli.ts --help`
Expected: Shows usage with both commands

**Step 3: Commit**

```bash
git add backend/src/cli/oauth-cli.ts
git commit -m "feat(oauth-cli): scaffold with status and inspect commands"
```

---

### Task 11: Add `refresh`, `validate-all`, `disconnect`, `simulate-failure` commands

**Files:**
- Modify: `backend/src/cli/oauth-cli.ts`

**Step 1: Add remaining commands**

```typescript
// --- refresh command ---
program
  .command('refresh <tool>')
  .description('Force-refresh token (even if not expired)')
  .requiredOption('--user <userId>', 'User ID')
  .option('--verbose', 'Show retry/backoff details')
  .option('--json', 'Output as JSON')
  .action(async (tool, opts) => {
    if (opts.verbose) process.env.DEBUG_OAUTH = 'true';

    console.log(`Force-refreshing ${tool} for user ${opts.user}...`);
    const token = await oauthService.getAccessToken(opts.user, tool as MCPToolType);

    if (token) {
      console.log(`Refresh successful. Token starts with: ${token.substring(0, 8)}...`);
    } else {
      console.log('Refresh FAILED — returned null');
    }
  });

// --- validate-all command ---
program
  .command('validate-all')
  .description('Validate all integrations in parallel')
  .requiredOption('--user <userId>', 'User ID')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const results = await oauthService.validateAllIntegrations(opts.user);

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const [tool, result] of Object.entries(results)) {
        const icon = result.status === 'valid' ? '✓' : result.status === 'expired' ? '⏱' : '✗';
        console.log(`  ${icon} ${tool}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
      }
    }
  });

// --- disconnect command ---
program
  .command('disconnect <tool>')
  .description('Disconnect + revoke token at provider')
  .requiredOption('--user <userId>', 'User ID')
  .action(async (tool, opts) => {
    process.env.DEBUG_OAUTH = 'true'; // Show revocation logs
    console.log(`Disconnecting ${tool} for user ${opts.user}...`);
    const success = await oauthService.disconnectIntegration(opts.user, tool as MCPToolType);
    console.log(success ? 'Disconnected successfully' : 'Disconnect FAILED');
  });

// --- simulate-failure command ---
program
  .command('simulate-failure <tool>')
  .description('Corrupt refresh token → trigger real 400 → restore')
  .requiredOption('--user <userId>', 'User ID')
  .action(async (tool, opts) => {
    process.env.DEBUG_OAUTH = 'true';
    const userId = opts.user;

    const integration = await prisma.mCPIntegration.findUnique({
      where: { userId_toolType: { userId, toolType: tool } },
    });

    if (!integration || !integration.refreshToken) {
      console.log(`No active integration with refresh token for ${tool}`);
      return;
    }

    const originalRefreshToken = integration.refreshToken;
    console.log('1. Saving original refresh token...');

    // Corrupt refresh token
    console.log('2. Corrupting refresh token in DB...');
    await prisma.mCPIntegration.update({
      where: { id: integration.id },
      data: { refreshToken: originalRefreshToken.split('').reverse().join('') }, // corrupt by reversing
    });

    // Force refresh — should hit real provider and get 400
    console.log('3. Triggering forced refresh (expect 400 from provider)...');
    const result = await oauthService.getAccessToken(userId, tool as MCPToolType);
    console.log(`4. Result: ${result ? 'got token (unexpected)' : 'null (expected — graceful failure)'}`);

    // Restore
    console.log('5. Restoring original refresh token...');
    await prisma.mCPIntegration.update({
      where: { id: integration.id },
      data: { refreshToken: originalRefreshToken },
    });

    console.log('6. Done. Token restored.');
  });
```

**Step 2: Test each command**

Run: `cd backend && npx ts-node src/cli/oauth-cli.ts refresh github --user <test-user-id> --verbose`
Run: `cd backend && npx ts-node src/cli/oauth-cli.ts validate-all --user <test-user-id>`
Run: `cd backend && npx ts-node src/cli/oauth-cli.ts --help`

**Step 3: Commit**

```bash
git add backend/src/cli/oauth-cli.ts
git commit -m "feat(oauth-cli): add refresh, validate-all, disconnect, simulate-failure commands"
```

---

## Phase 3: Class Split (~0.5 day)

### Task 12: Extract TokenManager from MCPOAuthService

**Files:**
- Create: `backend/src/services/mcp/token-manager.ts`
- Modify: `backend/src/services/mcp/mcp-oauth.service.ts` (rename to OAuthFlowService, remove token methods)
- Modify: All 12 tool fetcher imports
- Test: Run existing tests to verify no behavioral change

**Step 1: Create `token-manager.ts`**

Extract these methods from `MCPOAuthService`:
- `encrypt()` / `decrypt()`
- `storeTokens()`
- `getAccessToken()` (with proactive refresh)
- `refreshAccessToken()` / `doRefresh()` (with retry + mutex)
- `revokeTokenAtProvider()`
- `disconnectIntegration()`
- `validateIntegration()` / `validateAllIntegrations()`

The `TokenManager` class takes the encryption key in constructor, owns the refresh mutex map and PKCE verifier map.

Export singleton:
```typescript
export const tokenManager = new TokenManager();
```

**Step 2: Slim down MCPOAuthService → OAuthFlowService**

Remaining methods:
- `initializeOAuthConfigs()`
- `getAuthorizationUrl()` / `getAuthorizationUrlForGroup()`
- `handleCallback()` — calls `tokenManager.storeTokens()`
- `isToolAvailable()` / `getAvailableTools()`
- `logConfigurationDiagnostics()`

Rename file or keep the same file but rename the class. Export:
```typescript
export const oauthFlowService = new OAuthFlowService(tokenManager);
```

Also keep backward-compatible export:
```typescript
export const oauthService = oauthFlowService; // backward compat
```

**Step 3: Update tool fetcher imports**

All `*.tool.ts` files: change from `import { oauthService }` to `import { tokenManager }`. They only call `getAccessToken()`.

**Step 4: Update controller imports**

Controllers need `oauthFlowService` (for auth URLs, callbacks) and `tokenManager` (for disconnect).

**Step 5: Update CLI imports**

CLI imports both.

**Step 6: Run ALL tests**

Run: `cd backend && npx vitest run --reporter verbose`
Expected: All tests pass (pure refactor, no behavioral change)

**Step 7: Commit**

```bash
git add backend/src/services/mcp/token-manager.ts backend/src/services/mcp/mcp-oauth.service.ts backend/src/services/mcp/tools/ backend/src/controllers/ backend/src/cli/oauth-cli.ts backend/src/services/mcp/mcp-oauth.service.test.ts
git commit -m "refactor(oauth): split MCPOAuthService into OAuthFlowService + TokenManager"
```

---

## Phase 4: Onboarding Wiring (~1.5 days)

### Task 13: Fix frontend MCPToolType in both files

**Files:**
- Modify: `src/types/mcp.types.ts:2-12`
- Modify: `src/services/mcp.service.ts:13-24`

**Step 1: Add missing types to union**

In `src/types/mcp.types.ts`, add `zoom` and `google_workspace`:

```typescript
export type MCPToolType =
  | 'github'
  | 'jira'
  | 'figma'
  | 'outlook'
  | 'confluence'
  | 'slack'
  | 'teams'
  | 'onedrive'
  | 'onenote'
  | 'sharepoint'
  | 'zoom'
  | 'google_workspace';
```

**Step 2: Add missing types to enum**

In `src/services/mcp.service.ts`, add:

```typescript
export enum MCPToolType {
  GITHUB = 'github',
  JIRA = 'jira',
  FIGMA = 'figma',
  OUTLOOK = 'outlook',
  CONFLUENCE = 'confluence',
  SLACK = 'slack',
  TEAMS = 'teams',
  SHAREPOINT = 'sharepoint',
  ONEDRIVE = 'onedrive',
  ONENOTE = 'onenote',
  ZOOM = 'zoom',
  GOOGLE_WORKSPACE = 'google_workspace',
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types/mcp.types.ts src/services/mcp.service.ts
git commit -m "fix(types): add zoom and google_workspace to frontend MCPToolType"
```

---

### Task 14: Replace onboarding tool list with 4 real buckets

**Files:**
- Modify: `src/pages/onboarding/steps/connect-tools.tsx:14-79`

**Step 1: Replace AVAILABLE_TOOLS with bucket config**

```typescript
interface ToolBucket {
  id: string;
  name: string;
  description: string;
  icon: string;
  toolType?: string;       // for single-tool OAuth (github, google_workspace)
  groupType?: 'atlassian' | 'microsoft';  // for group OAuth
  subTools: string[];
}

const TOOL_BUCKETS: ToolBucket[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Pull requests, commits, code reviews, and releases',
    icon: '🐙',
    toolType: 'github',
    subTools: ['PRs', 'Commits', 'Reviews'],
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    description: 'Jira issues, sprints, and Confluence docs',
    icon: '🔷',
    groupType: 'atlassian',
    subTools: ['Jira', 'Confluence'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    description: 'Outlook calendar, Teams messages, and OneDrive files',
    icon: '📧',
    groupType: 'microsoft',
    subTools: ['Outlook', 'Teams', 'OneDrive'],
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Calendar events and Google Drive activity',
    icon: '🔍',
    toolType: 'google_workspace',
    subTools: ['Calendar', 'Drive'],
  },
];
```

**Step 2: Update the render loop**

Replace the mapping over `AVAILABLE_TOOLS` with `TOOL_BUCKETS`. Show sub-tools as chips.

**Step 3: Commit**

```bash
git add src/pages/onboarding/steps/connect-tools.tsx
git commit -m "feat(onboarding): replace 8 hardcoded tools with 4 real OAuth buckets"
```

---

### Task 15: Replace setTimeout with real OAuth hooks

**Files:**
- Modify: `src/pages/onboarding/steps/connect-tools.tsx:93-112`

**Step 1: Import real hooks**

```typescript
import { useMCPOAuth, useMCPGroupOAuth, useMCPIntegrations } from '../../../hooks/useMCP';
```

**Step 2: Replace handleConnectTool**

```typescript
const { mutate: initiateOAuth } = useMCPOAuth();
const { mutate: initiateGroupOAuth } = useMCPGroupOAuth();

const handleConnectTool = async (bucket: ToolBucket) => {
  setConnectingTool(bucket.id);
  setError('');

  try {
    // Save onboarding state before OAuth redirect (page will unload)
    localStorage.setItem('onboarding-oauth-return', JSON.stringify({
      step: 'connect-tools',
      connectedTools: Array.from(connectedTools),
      ts: Date.now(),
    }));

    if (bucket.groupType) {
      initiateGroupOAuth({ groupType: bucket.groupType }, {
        onSuccess: (data) => { window.location.href = data.authUrl; },
        onError: (err: any) => {
          setError(err.response?.data?.error || `Failed to connect ${bucket.name}`);
          setConnectingTool(null);
        },
      });
    } else if (bucket.toolType) {
      initiateOAuth({ toolType: bucket.toolType as any }, {
        onSuccess: (data) => { window.location.href = data.authUrl; },
        onError: (err: any) => {
          setError(err.response?.data?.error || `Failed to connect ${bucket.name}`);
          setConnectingTool(null);
        },
      });
    }
  } catch (err: any) {
    setError(`Failed to connect ${bucket.name}. Please try again.`);
    setConnectingTool(null);
  }
};
```

**Step 3: Commit**

```bash
git add src/pages/onboarding/steps/connect-tools.tsx
git commit -m "feat(onboarding): replace setTimeout with real OAuth hooks"
```

---

### Task 16: Onboarding return detection in callback

**Files:**
- Modify: `src/pages/mcp/callback.tsx:54-76` (success handler)

**Step 1: Add onboarding return detection**

In the success block (around line 55), before the `setTimeout` redirect:

```typescript
// Check if user came from onboarding
const onboardingReturn = localStorage.getItem('onboarding-oauth-return');
if (onboardingReturn) {
  try {
    const parsed = JSON.parse(onboardingReturn);
    // Only honor if < 15 min old (stale guard)
    if (Date.now() - parsed.ts < 15 * 60 * 1000) {
      localStorage.removeItem('onboarding-oauth-return');
      setTimeout(() => {
        navigate('/onboarding', { state: { returnToStep: 'connect-tools' } });
      }, 2000);
      return;
    }
  } catch { /* malformed localStorage — fall through to default */ }
  localStorage.removeItem('onboarding-oauth-return');
}

// Default: redirect to settings
setTimeout(() => {
  navigate('/settings', { state: { tab: 'integrations' } });
}, 2000);
```

**Step 2: Commit**

```bash
git add src/pages/mcp/callback.tsx
git commit -m "feat(onboarding): detect onboarding origin in OAuth callback, redirect back"
```

---

### Task 17: Connection gate (1+ bucket required)

**Files:**
- Modify: `src/pages/onboarding/steps/connect-tools.tsx`

**Step 1: Add real connection check**

```typescript
const { data: integrationData } = useMCPIntegrations();
const hasRealConnection = integrationData?.integrations?.some((i: any) => i.isConnected) ?? false;
```

**Step 2: Disable Next button when no connections**

```typescript
<Button
  onClick={onNext}
  disabled={!hasRealConnection}
>
  {hasRealConnection ? 'Next' : 'Connect at least 1 tool to continue'}
</Button>
```

**Step 3: Commit**

```bash
git add src/pages/onboarding/steps/connect-tools.tsx
git commit -m "feat(onboarding): require at least 1 real connection before proceeding"
```

---

## Phase 5: Polish (~0.5 day)

### Task 18: Error UX for tools without transformers

**Files:**
- Modify: `src/pages/onboarding/steps/connect-tools.tsx`

**Step 1: Mark buckets that lack transformers**

Only GitHub and Atlassian have full transformer pipelines. Microsoft and Google do not.

Add a `comingSoon` flag to the Microsoft and Google buckets, and render them with a "Coming Soon" badge and disabled connect button. This prevents users from connecting tools that will silently drop their data.

**Step 2: Commit**

```bash
git add src/pages/onboarding/steps/connect-tools.tsx
git commit -m "feat(onboarding): show 'coming soon' for tools without transformers"
```

---

### Task 19: Update architecture docs

**Files:**
- Modify: `docs/plans/auth-onboarding/tools-integration-architecture.md`

**Step 1: Update the OAuth section**

Document: singleton pattern, retry, proactive refresh, mutex, PKCE, state expiry, revocation. Reference the class split (OAuthFlowService + TokenManager).

**Step 2: Commit**

```bash
git add docs/plans/auth-onboarding/tools-integration-architecture.md
git commit -m "docs: update architecture with OAuth reliability fixes"
```

---

## Summary

| Phase | Tasks | Key files | Tests |
|-------|-------|-----------|-------|
| 1: Singleton + 7 Fixes | Tasks 1-9 | `mcp-oauth.service.ts`, 12 tool fetchers, 2 controllers | ~20 unit tests |
| 2: CLI | Tasks 10-11 | `oauth-cli.ts` (NEW) | Manual CLI scenarios |
| 3: Class Split | Task 12 | `token-manager.ts` (NEW), rename service, update imports | Existing tests pass |
| 4: Onboarding | Tasks 13-17 | `connect-tools.tsx`, `callback.tsx`, 2 type files | Manual browser tests |
| 5: Polish | Tasks 18-19 | `connect-tools.tsx`, architecture doc | — |

**Total: 19 tasks, ~5 days**
