# OAuth Runtime Scaling Fixes

**Status:** PLANNED
**Date:** 2026-02-17
**Depends on:** `feat/oauth-reliability` branch (PR #15)
**Context:** Pre-execution analysis found 11 scaling issues when projecting to 1000+ users connecting mix-and-match providers. This plan addresses the critical and medium issues.

---

## Problem

The OAuth token lifecycle works correctly for a handful of users. At 1000+ users with mix-and-match provider connections (GitHub, Microsoft 4-tool suite, Atlassian 2-tool suite, Google), three categories of failure emerge:

### Thundering Herd
500 users connect Microsoft during launch week. Tokens expire in 1 hour. At hour+1, all 500 refresh simultaneously. Microsoft returns 429s. Retry logic has no jitter — second wave is identical to the first. After 3 attempts, all 500 users show "disconnected."

### Multi-Pod Token Corruption
Refresh mutex (`refreshPromises` Map) lives in Node.js process memory. Behind a load balancer, two pods can refresh the same user's token simultaneously. Microsoft rotates refresh tokens on use — the pod that writes last wins. The other pod's refresh token is silently invalidated. User is permanently broken until they manually reconnect.

### Connection Pool Exhaustion
Prisma default: 10 connections. Each token refresh = 2-4 DB queries. 100 concurrent refreshes → queries queue → P1002 timeout cascades.

---

## Fix Priority

| # | Fix | Severity | Effort | Dependencies |
|---|---|---|---|---|
| **1** | Connection pool tuning | Critical | 5 min | None |
| **2** | Outbound refresh queue with concurrency limit + jitter | Critical | 0.5 day | `p-limit` (new dep) |
| **3** | Distributed refresh mutex (DB advisory lock) | Critical | 1 day | None (uses Prisma raw query) |
| **4** | Re-enable inbound rate limiting on MCP routes | Medium | 30 min | None (middleware exists) |
| **5** | Bounded concurrency in `validateAllIntegrations` | Medium | 30 min | Same `p-limit` from #2 |
| **6** | Server-side OAuth state store | Medium | 0.5 day | Redis (already in deps) or DB |
| **7** | Clean up dead `encryptedTokens` schema field | Low | 15 min | Migration |

Total: ~3 days of work. Fixes #1-#3 are the critical path for 1000-user readiness.

---

## Fix #1: Connection Pool Tuning (5 min)

### Problem
`DATABASE_URL` has no `connection_limit` or `pool_timeout` params. Prisma defaults to 10 connections. Under concurrent token operations, queries queue and timeout.

### Fix
Add connection pool params to `DATABASE_URL` in `.env.example` and `.env.mcp.template`:

```
DATABASE_URL=postgresql://user:pass@localhost:5433/inchronicle_dev?connection_limit=25&pool_timeout=30
```

**Why 25?** Rule of thumb: 2-3x expected concurrent DB operations. At 100 concurrent token refreshes (2-4 queries each), 25 connections with queueing handles the load. PostgreSQL default `max_connections` is 100, so 25 leaves room for other services.

### Files
- `backend/.env.example` — add `?connection_limit=25&pool_timeout=30` to DATABASE_URL
- `backend/.env.mcp.template` — document the recommendation

### Verification
- `SELECT count(*) FROM pg_stat_activity` during load shows <= 25 connections from this service

---

## Fix #2: Outbound Refresh Queue with Concurrency Limit + Jitter (0.5 day)

### Problem
`doRefresh()` fires `axios.post()` to provider token endpoints with no concurrency limit. N users expiring simultaneously = N parallel HTTP calls to the same provider. Providers return 429s. Retry logic has no jitter — all retries fire at the same delay, creating wave after wave.

### Current Code (service lines 759-806)
```typescript
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    const tokenResponse = await axios.post(config.tokenUrl, ...);
    // ...
  } catch (error) {
    let delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);  // no jitter
    await new Promise(r => setTimeout(r, delay));
  }
}
```

### Fix
1. Install `p-limit` (zero-dependency, 50 lines of code)
2. Create a per-provider concurrency limiter: `Map<string, pLimit.Limit>`
3. Wrap `axios.post` inside the provider's limiter
4. Add random jitter to retry delay: `delay * (0.5 + Math.random())`

```typescript
import pLimit from 'p-limit';

// Per-provider concurrency limits
private providerLimits = new Map<string, ReturnType<typeof pLimit>>();

private getProviderLimit(tokenUrl: string): ReturnType<typeof pLimit> {
  // Group by token endpoint host (e.g., all Microsoft tools share one limit)
  const host = new URL(tokenUrl).host;
  let limit = this.providerLimits.get(host);
  if (!limit) {
    limit = pLimit(10); // max 10 concurrent refreshes per provider
    this.providerLimits.set(host, limit);
  }
  return limit;
}

// In doRefresh, wrap the HTTP call:
const limit = this.getProviderLimit(config.tokenUrl);
const tokenResponse = await limit(() => axios.post(config.tokenUrl, ...));

// Add jitter to retry:
const jitter = 0.5 + Math.random(); // 0.5x to 1.5x
let delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) * jitter;
```

**Why 10 per provider?** GitHub and Microsoft don't publish exact token endpoint rate limits, but 10 concurrent is conservative. If we hit 429s, the backoff+jitter spreads them. We can tune up from telemetry.

**Why per-provider, not global?** GitHub rate limits are independent of Microsoft. A global limit of 10 would starve GitHub users while Microsoft users exhaust retries.

### Files
- `backend/package.json` — add `p-limit`
- `backend/src/services/mcp/mcp-oauth.service.ts` — add provider limits, jitter

### Verification
- Unit test: fire 50 concurrent refreshes for the same provider → only 10 in flight at once
- Unit test: retry delays show jitter (not identical values)

---

## Fix #3: Distributed Refresh Mutex (1 day)

### Problem
`refreshPromises` Map is in-process memory. Two pods behind a load balancer can refresh the same user+tool simultaneously. For providers that rotate refresh tokens on use (Microsoft), this causes silent token invalidation — the user is permanently broken until manual reconnect.

### Current Code (service lines 711-728)
```typescript
private refreshPromises = new Map<string, Promise<string | null>>();

private async refreshAccessToken(userId: string, toolType: MCPToolType) {
  const key = `${userId}:${toolType}`;
  const existing = this.refreshPromises.get(key);
  if (existing) return existing;  // dedup within this process only
  // ...
}
```

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| **A) PostgreSQL advisory lock** | Zero new infra, uses existing Prisma connection | Lock is per-DB-connection; need to ensure same connection for lock+unlock |
| **B) Redis distributed lock (Redlock)** | Standard pattern, fast, TTL-based | Redis not yet used at runtime; new operational dependency |
| **C) DB row-level lock (SELECT FOR UPDATE)** | Simple, transactional | Holds row lock during entire HTTP call to provider (~1-3s); blocks reads |
| **D) Optimistic: check-and-set with version** | No locking, no blocking | Complex retry logic; still double-refreshes, just handles the aftermath |

### Chosen: Option A (PostgreSQL advisory lock)

**Why:** Zero new infrastructure. The project already has PostgreSQL. Advisory locks are lightweight, don't block row reads, and have automatic release on connection close (safety net). Redis is a dependency in package.json but not used at runtime — adding it as a requirement for distributed locking adds operational burden (must run Redis alongside Postgres).

**Implementation:**

```typescript
private async refreshAccessToken(userId: string, toolType: MCPToolType) {
  const key = `${userId}:${toolType}`;

  // In-process dedup (still useful — prevents redundant DB lock attempts within same pod)
  const existing = this.refreshPromises.get(key);
  if (existing) return existing;

  const promise = this.doRefreshWithLock(userId, toolType);
  this.refreshPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    this.refreshPromises.delete(key);
  }
}

private async doRefreshWithLock(userId: string, toolType: MCPToolType) {
  // Generate a stable numeric lock ID from the key
  const lockKey = this.hashToInt(`refresh:${userId}:${toolType}`);

  // Try to acquire advisory lock (non-blocking)
  const [{ acquired }] = await this.prisma.$queryRawUnsafe<[{ acquired: boolean }]>(
    `SELECT pg_try_advisory_lock($1) as acquired`, lockKey
  );

  if (!acquired) {
    // Another pod is refreshing this token. Wait briefly, then read from DB.
    await new Promise(r => setTimeout(r, 2000));
    const integration = await this.prisma.mCPIntegration.findUnique({
      where: { userId_toolType: { userId, toolType } }
    });
    if (integration?.accessToken && integration.expiresAt && integration.expiresAt > new Date()) {
      return this.decrypt(integration.accessToken);
    }
    return null; // Other pod's refresh also failed
  }

  try {
    return await this.doRefresh(userId, toolType);
  } finally {
    await this.prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock($1)`, lockKey);
  }
}

private hashToInt(key: string): number {
  // Stable hash to 32-bit integer for pg_try_advisory_lock
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return hash;
}
```

**Edge case: pod crashes while holding lock.** PostgreSQL advisory locks are session-level — they auto-release when the DB connection closes. If the pod crashes, the Prisma connection pool drops the connection, and Postgres releases the lock. No manual cleanup needed.

**Edge case: Prisma connection pooling.** Advisory locks are per-connection, not per-transaction. Prisma may return the `$queryRawUnsafe` calls to different connections from the pool. To guarantee lock+unlock use the same connection, wrap in `$transaction`:

```typescript
await this.prisma.$transaction(async (tx) => {
  const [{ acquired }] = await tx.$queryRawUnsafe<[{ acquired: boolean }]>(
    `SELECT pg_try_advisory_lock($1) as acquired`, lockKey
  );
  if (!acquired) return null;
  try {
    return await this.doRefresh(userId, toolType);
  } finally {
    await tx.$queryRawUnsafe(`SELECT pg_advisory_unlock($1)`, lockKey);
  }
});
```

**Concern:** This holds a Prisma transaction (and its DB connection) open for the entire duration of `doRefresh`, which includes the HTTP call to the provider (1-3 seconds, up to 60s with retries). At 100 concurrent refreshes, this ties up 100 DB connections during the HTTP round-trip.

**Mitigation:** The concurrency limiter from Fix #2 (10 per provider) means at most ~40 concurrent refreshes across all providers (10 per provider x 4 provider groups). 40 connections is within the pool limit of 25... no, that's a problem. We need the connection pool to be larger than the concurrency limit.

**Revised connection pool:** Set `connection_limit=50` (Fix #1) and provider concurrency limit to 10 each (Fix #2). Worst case: 40 refreshes holding transactions + 10 normal queries = 50 connections. This fits.

### Files
- `backend/src/services/mcp/mcp-oauth.service.ts` — add `doRefreshWithLock`, `hashToInt`

### Verification
- Integration test: two concurrent `doRefresh` calls for same user+tool → only one HTTP call fires
- Test: lock auto-releases after refresh completes
- Test: if lock acquisition fails, caller reads refreshed token from DB

---

## Fix #4: Re-enable Inbound Rate Limiting on MCP Routes (30 min)

### Problem
`app.ts` line 292: `// app.use('/api/', rateLimiter);` — commented out. MCP routes have zero inbound rate limiting. A misbehaving client or script can hammer token endpoints.

### Fix
Uncomment the general rate limiter and add MCP-specific limits:

```typescript
// In mcp.routes.ts:
import { rateLimiter } from '../middleware/rateLimiter.middleware';

// Token initiation: 10 per 15 min per user (generous for onboarding)
const oauthInitiateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many OAuth requests, please try again later.' }
});

router.post('/oauth/initiate', authMiddleware, oauthInitiateLimit, initiateOAuth);
router.post('/oauth/initiate-group', authMiddleware, oauthInitiateLimit, initiateGroupOAuth);

// Callback: 20 per 15 min per IP (callbacks come from provider redirects)
const callbackLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many callback requests.' }
});

router.get('/callback/:toolType', callbackLimit, handleOAuthCallback);
```

### Files
- `backend/src/routes/mcp.routes.ts` — add rate limiters
- `backend/src/app.ts` — consider uncommenting general limiter (separate decision)

### Verification
- Test: 11th OAuth initiation within 15 min returns 429

---

## Fix #5: Bounded Concurrency in `validateAllIntegrations` (30 min)

### Problem
`validateAllIntegrations` (service lines 968-974) fires `Promise.all` over all tools. User with 8 connected tools → 8 parallel provider calls. At 100 users validating simultaneously → 800 concurrent outbound calls.

### Current Code
```typescript
const validationPromises = integrations.map(async (integration) => {
  const result = await this.validateIntegration(userId, integration.toolType as MCPToolType);
  return { toolType: integration.toolType, ...result };
});
const validationResults = await Promise.all(validationPromises);
```

### Fix
Use `p-limit` (same dep from Fix #2) to limit per-user concurrency:

```typescript
import pLimit from 'p-limit';

const perUserLimit = pLimit(3); // max 3 concurrent validations per user
const validationPromises = integrations.map((integration) =>
  perUserLimit(() => this.validateIntegration(userId, integration.toolType as MCPToolType)
    .then(result => ({ toolType: integration.toolType, ...result })))
);
const validationResults = await Promise.all(validationPromises);
```

Combined with Fix #2's per-provider limit, the total outbound concurrency is bounded.

### Files
- `backend/src/services/mcp/mcp-oauth.service.ts` — wrap `Promise.all` in `p-limit`

### Verification
- Test: `validateAllIntegrations` with 8 tools → at most 3 in flight at once

---

## Fix #6: Server-Side OAuth State Store (0.5 day)

### Problem
OAuth state parameter is stateless (base64 JSON with embedded userId, toolType, nonce, iat). The nonce is never validated against a server-side store. CSRF protection is temporal only (10-min window). While not trivially exploitable (attacker needs both userId and a valid provider code), it's weaker than standard.

### Current Code (service lines 342-346)
```typescript
const state = crypto.randomBytes(32).toString('hex');
const stateData = Buffer.from(JSON.stringify({ userId, toolType, state, iat: Date.now() })).toString('base64');
```

### Fix
Store the nonce server-side and validate it on callback:

**Option A: Database table (simple, no new infra)**
```sql
CREATE TABLE oauth_state (
  nonce TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_oauth_state_cleanup ON oauth_state (created_at);
```

On initiate: INSERT nonce.
On callback: SELECT + mark `used = true`. Reject if missing or already used.
Cron: DELETE WHERE `created_at < NOW() - INTERVAL '15 minutes'`.

**Option B: Redis with TTL (cleaner, auto-expiry)**
```typescript
await redis.set(`oauth:state:${nonce}`, JSON.stringify({ userId, toolType }), { EX: 600 });
```

On callback: `GET` + `DEL` (atomic via Lua script or `GETDEL`). Reject if missing.

### Chosen: Option A (DB table)
Redis is not yet used at runtime. Adding Redis as a dependency for one feature increases operational burden. A DB table with periodic cleanup is sufficient for this use case (OAuth initiations are low-frequency — max ~10 per user per session).

### Files
- `backend/prisma/schema.prisma` — add `OAuthState` model
- `backend/prisma/migrations/` — new migration
- `backend/src/services/mcp/mcp-oauth.service.ts` — store on initiate, verify on callback

### Verification
- Test: callback with valid nonce succeeds
- Test: callback with reused nonce fails
- Test: callback with expired nonce (>10 min) fails
- Test: callback with fabricated nonce fails

---

## Fix #7: Clean Up Dead `encryptedTokens` Field (15 min)

### Problem
`MCPIntegration.encryptedTokens` (schema line 1144) is declared but never written by any service code. The actual tokens are stored in `accessToken` and `refreshToken` fields directly. This is misleading schema drift.

### Fix
```prisma
model MCPIntegration {
  // ... remove:
  // encryptedTokens String? @db.Text
}
```

### Files
- `backend/prisma/schema.prisma` — remove field
- `backend/prisma/migrations/` — new migration (`ALTER TABLE DROP COLUMN`)

### Verification
- Migration runs cleanly
- All existing tests pass

---

## Implementation Sequence

```
Fix #1 (5 min) → Fix #2 (0.5 day) → Fix #3 (1 day) → Fix #4 (30 min) → Fix #5 (30 min)
                                                                          ↑
                                                                     Fix #6 (0.5 day, parallel)
                                                                     Fix #7 (15 min, parallel)
```

### Phase 1: Critical (1.5 days) — must ship before scaling

| Order | Fix | Time |
|---|---|---|
| 1 | Connection pool tuning | 5 min |
| 2 | Outbound refresh queue + jitter | 0.5 day |
| 3 | Distributed refresh mutex | 1 day |

After Phase 1: system handles 1000 users without thundering herd or token corruption.

### Phase 2: Hardening (1.5 days) — should ship before production

| Order | Fix | Time |
|---|---|---|
| 4 | Inbound rate limiting on MCP routes | 30 min |
| 5 | Bounded `validateAllIntegrations` | 30 min |
| 6 | Server-side OAuth state store | 0.5 day |
| 7 | Dead field cleanup | 15 min |

---

## What This Plan Does NOT Cover

- **Encryption key rotation** — rotating the shared ENCRYPTION_KEY requires re-encrypting all token rows. Important but separate workstream (needs a migration script + maintenance window).
- **Per-user key derivation** — defense-in-depth improvement. If the shared key leaks, all tokens are exposed. HKDF with userId salt would isolate blast radius. Separate workstream.
- **Background token pre-refresh** — proactively refreshing tokens before they expire (e.g., a cron job that refreshes tokens expiring in the next 10 min). Eliminates mass-expiry thundering herd entirely. Deferred because Fix #2 (concurrency limit + jitter) is sufficient for 1000 users.
- **Redis migration** — using Redis for distributed locks, state store, and rate limiting. Cleaner than DB-based solutions but adds operational dependency. Revisit when Redis is needed for another feature (e.g., real-time notifications, session store).
- **Multi-region / multi-tenant** — assumed single-region, single-tenant deployment for v1.

---

## Revised Connection Pool Math

With all fixes applied:

| Resource | Limit | Calculation |
|---|---|---|
| Provider concurrency (per provider) | 10 | Fix #2: `p-limit(10)` per token endpoint host |
| Max concurrent refreshes (all providers) | ~40 | 10 per provider x 4 major provider groups |
| DB connections held during refresh | ~40 | Fix #3: advisory lock holds transaction during HTTP call |
| DB connections for normal queries | ~10 | Non-refresh traffic |
| Total pool needed | 50 | Fix #1: `connection_limit=50` |
| PostgreSQL `max_connections` | 100 (default) | Leaves 50 for other services, pgAdmin, migrations |
