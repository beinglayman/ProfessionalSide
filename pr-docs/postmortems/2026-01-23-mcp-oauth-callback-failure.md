# Postmortem: MCP OAuth Callback Failure

**Date:** 2026-01-23
**Severity:** High (All MCP integrations broken)
**Duration:** ~2 days (introduced Jan 21, discovered Jan 23)
**Status:** Resolved

---

## Summary

GitHub OAuth callback (and all MCP routes) returned `{"success":false,"error":"Access token required"}` even though the callback route was defined without authentication middleware.

---

## Impact

- All 12 MCP tool integrations (GitHub, Jira, Figma, Slack, etc.) were non-functional
- Users could not connect new tools via OAuth
- Existing OAuth token refreshes may have failed silently

---

## Timeline

| Time | Event |
|------|-------|
| **Jan 21, 17:45** | Commit `1fa9884` deployed - "Add workspace journal auto-creation subscription feature" |
| **Jan 21 - Jan 23** | MCP OAuth silently broken (no alerts, no user reports) |
| **Jan 23** | User reports GitHub OAuth returning "Access token required" |
| **Jan 23** | Root cause identified via systematic debugging |
| **Jan 23** | Fix implemented |

---

## Root Cause

### The Bug

Commit `1fa9884` introduced `journal-subscription.routes.ts` with:

```typescript
const router = Router();
router.use(authenticate);  // ← Applied to ALL requests passing through
```

This router was mounted at a broad path in `app.ts`:

```typescript
app.use('/api/v1', journalSubscriptionRoutes);  // ← Catches ALL /api/v1/*
```

### Why It Broke MCP

```
Request: GET /api/v1/mcp/callback/github?code=xxx

┌─────────────────────────────────────────────────────────────────────┐
│  app.use('/api/v1', journalSubscriptionRoutes)     ← LINE 701      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  router.use(authenticate)  ← RUNS FOR ALL /api/v1/* REQUESTS │ │
│  │           │                                                   │ │
│  │           ▼                                                   │ │
│  │  ┌─────────────────────────────────────────┐                  │ │
│  │  │ No Bearer token?                        │                  │ │
│  │  │ → sendError("Access token required")    │                  │ │
│  │  │ → return (no next() called)             │  ← REQUEST DIES  │ │
│  │  └─────────────────────────────────────────┘        HERE      │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ✗
                    REQUEST NEVER REACHES MCP ROUTES
```

The `authenticate` middleware sends a response and returns **without calling `next()`** when no auth header is present. Because it was applied via `router.use()`, it ran for ALL requests matching `/api/v1/*`, not just routes defined in that router.

---

## Detection

### Why It Wasn't Caught

1. **No integration tests** for OAuth callback flow
2. **No monitoring** on MCP endpoint error rates
3. **Silent failure** - returned valid JSON error, not 500
4. **Feature worked in isolation** - subscription routes themselves worked fine

### How It Was Found

Manual testing of GitHub OAuth flow returned unexpected auth error. Systematic debugging revealed:
- ALL MCP routes returned auth error (not just callback)
- Even non-existent `/api/v1/mcp/fake` returned auth error (not 404)
- Non-MCP routes like `/api/v1/test` worked fine

This pattern indicated middleware intercepting requests before route matching.

---

## Resolution

### Fix Applied

Changed from global `router.use(authenticate)` to per-route middleware:

```diff
 // journal-subscription.routes.ts

 const router = Router();
-router.use(authenticate);

-router.get('/users/me/connected-tools', getConnectedTools);
+router.get('/users/me/connected-tools', authenticate, getConnectedTools);
```

### File Changed

`backend/src/routes/journal-subscription.routes.ts`

---

## Lessons Learned

### What Went Well

- Systematic debugging methodology quickly identified root cause
- Fix was minimal and low-risk

### What Went Wrong

1. **Broad route mounting** - Mounting at `/api/v1` instead of specific path
2. **Global middleware on shared path** - `router.use()` affects all requests, not just matching routes
3. **No regression tests** - OAuth flow not covered by automated tests
4. **No alerting** - MCP errors didn't trigger any alerts

---

## Action Items

| Action | Owner | Status |
|--------|-------|--------|
| Deploy fix to production | - | Pending |
| Add integration test for OAuth callback | - | TODO |
| Add error rate monitoring for MCP endpoints | - | TODO |
| Document Express middleware gotcha in dev guide | - | TODO |
| Review other routers for similar patterns | - | TODO |

---

## Express Middleware Gotcha (Reference)

When using `router.use(middleware)` on a router mounted at a broad path:

```typescript
// DANGEROUS: Middleware runs for ALL /api/v1/* requests
const router = Router();
router.use(authenticate);  // Runs even if no route matches!
app.use('/api/v1', router);

// SAFE: Middleware only runs when route matches
const router = Router();
router.get('/specific-path', authenticate, handler);
app.use('/api/v1', router);
```

**Rule:** Only use `router.use(middleware)` when the router is mounted at a specific, non-overlapping path (e.g., `/api/v1/subscriptions`).
