# Implementation Plan Review — RJ + DLG + GSE

**Date:** 2026-02-16
**Subject:** `2026-02-16-oauth-reliability-impl-plan.md`
**Reviewers:** Russian Judge (RJ), Diligent (DLG), Grumpy Staff Engineer (GSE)

---

## Individual Top 3 Concerns

### Russian Judge (Score: 7/10)

| # | Concern | Severity |
|---|---------|----------|
| RJ-1 | `encrypt()` is private — 10+ tests across Tasks 4-9 call `service.encrypt()` directly. Won't compile with TypeScript (tests use `: any` escape hatch but CLI will fail). Plan gives zero guidance on resolution. | Blocker |
| RJ-2 | Task 3 (encryption fail-fast) breaks Task 1 singleton — `export const oauthService = new MCPOAuthService()` runs at module load. Task 3's test clears `ENCRYPTION_KEY` then does `require()`, but the singleton instantiation throws first. Tests use `require()` in what may be an ESM context. | High |
| RJ-3 | Tasks 5-9 reference `service` variable from Task 4's describe scope — no shared `beforeEach` shown. Plan claims TDD-complete but tests won't run standalone. | Medium |

### Diligent (DLG)

| # | Concern | Severity |
|---|---------|----------|
| DLG-1 | `encrypt()`/`decrypt()` are private — tests and CLI call them as public. Must resolve in Task 1. | Blocker |
| DLG-2 | `mcp.controller.ts` uses `await import()` (dynamic) not static imports — Task 2 describes the wrong refactoring pattern for the controller. Implementer will be confused. | High |
| DLG-3 | Task 3 test incompatible with Task 1 singleton — module-level `new MCPOAuthService()` means constructor runs at import time, making "constructor throws" test impossible with `require()`/simple `import()`. | High |

### Grumpy Staff Engineer

| # | Concern | Severity |
|---|---------|----------|
| GSE-1 | Phase 3 (Class Split) is 0.5 days of churn that ships zero user value. File a ticket, do it later. | Waste |
| GSE-2 | PKCE stores verifiers in RAM — server restart between auth URL generation and callback = lost verifier = silent failure. Also: PKCE on a confidential client is YAGNI. Cut it. | High / YAGNI |
| GSE-3 | Retry tests mock axios but don't test real failure shapes (429 with Retry-After, connection resets, 200 with error body). Tests prove the for-loop works, not that retry actually helps. Missing 429 handling entirely. | Medium |

---

## Collated Agenda (deduplicated, ranked)

Six unique concerns emerged. Three have consensus across reviewers.

### Agenda Item 1: `encrypt()` is private (RJ-1, DLG-1) — CONSENSUS BLOCKER

All three reviewers noted this. RJ and DLG flag it as a blocker. GSE doesn't call it out separately but cuts PKCE (which also needs `encrypt`). Every test from Task 4 onward and the `simulate-failure` CLI command depend on being able to encrypt test values.

**Options on the table:**
- A) Make `encrypt()`/`decrypt()` public (API surface change)
- B) Add a static test helper method: `static _testEncrypt(key, text)` (test-only surface)
- C) Pre-encrypt test fixture values and hardcode them
- D) Pass encryption key to a standalone function (extract from class)

### Agenda Item 2: Singleton + encryption fail-fast test interaction (RJ-2, DLG-3) — CONSENSUS HIGH

The singleton export (`export const oauthService = new MCPOAuthService()`) runs the constructor at module load time. Task 3 wants to test "constructor throws when env var is missing." But importing the module triggers the singleton, so the throw happens during module evaluation, not inside the test's `expect()` wrapper. `require()` may not work in ESM context.

**Options on the table:**
- A) Use `vi.resetModules()` + dynamic `import()` with `rejects.toThrow()`
- B) Don't test the constructor-throws behavior directly — test it via integration (startup script that fails)
- C) Conditional singleton (lazy initialization via `getOAuthService()`)

### Agenda Item 3: Cut PKCE entirely (GSE-2) vs. keep but fix storage (RJ mentioned, DLG noted restart gap)

GSE wants PKCE cut — confidential client, `client_secret` in every token exchange, PKCE adds complexity for zero security benefit. RJ didn't explicitly flag PKCE but noted the round-trip test is missing. DLG noted the restart vulnerability (verifier lost on deploy/crash between auth URL and callback).

**Options on the table:**
- A) Cut PKCE entirely (GSE recommendation) — save 0.25 days
- B) Keep PKCE but store verifier in DB (survives restart)
- C) Keep PKCE but embed verifier in state (design doc says don't, GSE says that reasoning is wrong)
- D) Keep PKCE in RAM and accept the restart gap (current plan)

### Agenda Item 4: Cut Phase 3 (Class Split) entirely (GSE-1)

Only GSE flagged this, but the reasoning is strong: 0.5 days of refactoring that touches every file already modified in Phase 1, ships zero user value, and creates potential for circular imports. The class is ~900 lines — not big enough to justify a split. DLG's review also noted Task 12 is "dangerously underspecified" with no test migration plan.

### Agenda Item 5: Controller uses dynamic `await import()` not static imports (DLG-2)

Task 2's instructions describe the tool fetcher pattern (static import, property, constructor). The controller is different — it does `await import()` inside each handler. The plan's Step 1 for the controller is factually wrong about the current pattern.

### Agenda Item 6: Missing 429 handling in retry + test quality (GSE-3)

Retry only handles 5xx and short-circuits on 400/401. But 429 (rate limit) is common on OAuth token endpoints. Current plan treats it as... nothing (falls through to the retry path, but with hardcoded backoff instead of honoring `Retry-After` header). Tests only prove mocks work, not that real provider error shapes are handled.

---

## DLG Debate

### Format

DLG moderates. Each reviewer states their position on each agenda item. DLG seeks convergence or documents the split.

---

### Debate: Agenda Item 1 — `encrypt()` is private

**RJ:** This is a blocker. The plan has 10+ tests that call `service.encrypt()`. The `: any` type escape hatch hides the problem at compile time but it's still a design smell — you're testing private internals. Option C (pre-encrypted fixtures) is the cleanest: compute the encrypted values once, hardcode them, document the key they were encrypted with.

**GSE:** Who cares about visibility modifiers in a test? `as any` works. The real problem is the CLI `simulate-failure` command which calls `oauthService.encrypt()` on the real typed singleton. For that, you need option A (make it public) or you restructure the command to not need encryption. I already said cut `simulate-failure` entirely. If you cut it, the only consumer is tests, and `as any` is fine.

**DLG:** Both are partially right. The tests work with `as any` but the CLI doesn't. The cleanest fix: **(A) make `encrypt` public** — it's a utility method, not a security boundary. The class already exports the singleton; anyone who can import the service can encrypt. There's no security lost. Add a one-line note in Task 1: "Make `encrypt()` and `decrypt()` public — needed by CLI and tests."

**RESOLUTION:** Make `encrypt()`/`decrypt()` public. Add to Task 1 Step 3. If `simulate-failure` is cut per GSE, this becomes optional — but do it anyway for testing ergonomics.

---

### Debate: Agenda Item 2 — Singleton + constructor-throws test

**RJ:** The test as written will break. `require()` in ESM is suspect, and the singleton export means the constructor fires at import time. This needs `vi.resetModules()` at minimum.

**DLG:** I verified: the project uses vitest. `vi.resetModules()` clears the module cache. Dynamic `import()` after reset will re-evaluate the module. The test needs to be:

```typescript
it('throws when ENCRYPTION_KEY is missing', async () => {
  vi.resetModules();
  delete process.env.ENCRYPTION_KEY;
  delete process.env.MCP_ENCRYPTION_KEY;

  await expect(() => import('./mcp-oauth.service')).rejects.toThrow(
    'ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required'
  );
});
```

This tests the MODULE EVALUATION throwing (because the singleton constructor runs). It tests the right thing — that the app won't start without the key. But we need a cleanup `afterEach` that restores the env and resets modules again for subsequent tests.

**GSE:** Over-thinking it. You want to know if the app crashes without the key? Add a startup check in `server.ts` that reads the env var before importing anything else. Test that check. Don't test the constructor. The constructor test is fragile because it depends on module evaluation order, which is an implementation detail.

**DLG:** GSE's approach is simpler but misses the point — the fail-fast IS in the constructor, by design. Moving it out is a design change.

**RESOLUTION:** Use `vi.resetModules()` + dynamic `import()` + `rejects.toThrow()`. Fix Task 3's test code. Add `afterEach` cleanup. This is the minimum change that tests what the design specifies.

---

### Debate: Agenda Item 3 — PKCE: cut, fix, or keep as-is

**GSE:** Cut it. You have `client_secret`. PKCE is for public clients. This is resume-driven security. You're adding an in-memory map, a TTL sweep, a restart vulnerability, and complexity in handleCallback — for a threat that doesn't apply to your architecture. The RFC says "RECOMMENDED for confidential clients" not "REQUIRED." Save 0.25 days and cut 30 lines of complexity. If an auditor asks, add it then.

**RJ:** I agree it's low-value, but cutting it changes the scope of an approved design. The design doc went through brainstorming, GSE review, critique triage, and RJ scoring. If you cut PKCE now, you're making a design decision in an implementation review. That's scope creep in reverse. Flag it for the design owner to decide.

**DLG:** GSE's technical argument is correct — PKCE on a confidential client has minimal security benefit. The in-memory storage is a real risk (deploy during OAuth flow = broken callback). But RJ's process point is valid too. Here's the middle ground: **move PKCE to a follow-up task, not in this plan.** The design doc already says "Low priority" for PKCE. Remove Task 8 from the implementation plan. Keep the design doc unchanged. File a ticket for "Add PKCE when/if we move to SPA-based OAuth."

**GSE:** Fine. As long as it's not in THIS PR.

**RESOLUTION:** Remove Task 8 (PKCE) from implementation plan. Keep design doc unchanged (it already marks PKCE as low priority). File follow-up ticket. **Save: ~0.25 days.**

---

### Debate: Agenda Item 4 — Cut Phase 3 (Class Split)

**GSE:** Cut it. 0.5 days of refactoring. ~900 lines is not "too big." The split creates two files, two singletons, and potential circular imports. It ships nothing. Do it in 3 months if the file annoys someone.

**RJ:** The split makes the CLI cleaner and makes imports more intentional (tool fetchers import `tokenManager`, controllers import `oauthFlowService`). But I agree it's not urgent. It's a Phase 3 that depends on Phase 1 being stable. If Phase 1 has bugs, you're refactoring broken code.

**DLG:** The split is correctly designed but incorrectly timed. GSE is right that it ships no value and touches every file again. The test migration alone (rewriting all imports in `mcp-oauth.service.test.ts`) adds risk. Defer it.

**RESOLUTION:** Remove Task 12 (Class Split) from implementation plan. File follow-up ticket. **Save: ~0.5 days.** The singleton from Phase 1 is sufficient.

---

### Debate: Agenda Item 5 — Controller dynamic imports

**DLG:** The plan says the controller has `import { MCPOAuthService } from '...'` at the top. It doesn't. It does `const { MCPOAuthService } = await import('...')` inside each handler. Task 2 needs a correction: for the controller, the fix is to add a top-level static import of the singleton and delete the 4 dynamic import lines inside the handlers.

**RJ:** Agreed. This is a factual error in the plan.

**GSE:** Fix the plan. This is a 2-minute edit. Next.

**RESOLUTION:** Fix Task 2 to describe the controller's actual pattern (dynamic `await import()`) and the correct fix (convert to top-level static import). Minor plan edit.

---

### Debate: Agenda Item 6 — Missing 429 handling + test quality

**GSE:** 429 is real. GitHub and Microsoft both rate-limit token endpoints. The retry logic needs to treat 429 as retryable and honor `Retry-After`. This is 5 lines of code. Add it to Fix 1.

**RJ:** Agree on 429. On test quality — the mock tests are fine for regression. You can't hit real provider endpoints in CI. The mock tests prove the control flow (retry on 5xx, bail on 400, bail after 3). That's their job. Integration tests against real providers happen via CLI. The plan already has this separation.

**DLG:** Both right. Add 429 handling (read `Retry-After`, cap at 60s, fall back to exponential backoff if header missing). Add one test case for 429. The mock vs real debate is moot — mocks test the code, CLI tests the integration.

**RESOLUTION:** Add 429 to retryable status codes in Fix 1. Read `Retry-After` header. Cap at 60s. Add one test case. ~10 min implementation.

---

## Final Recommendations

### Changes to implementation plan

| # | Change | Impact | Source |
|---|--------|--------|--------|
| 1 | Make `encrypt()`/`decrypt()` public in Task 1 | Unblocks all tests + CLI | RJ-1, DLG-1 |
| 2 | Fix Task 3 test: `vi.resetModules()` + dynamic `import()` + `rejects.toThrow()` | Prevents test failures | RJ-2, DLG-3 |
| 3 | Remove Task 8 (PKCE) — defer to follow-up ticket | Save 0.25 days, remove restart risk | GSE-2 |
| 4 | Remove Task 12 (Class Split) — defer to follow-up ticket | Save 0.5 days, reduce churn | GSE-1 |
| 5 | Fix Task 2 controller instructions — document dynamic import pattern | Prevent implementer confusion | DLG-2 |
| 6 | Add 429 handling to Fix 1 retry logic | Handle rate limiting | GSE-3 |
| 7 | Show shared `beforeEach` setup for Tasks 5-9 test scopes | Prevent scope issues | RJ-3 |

### Revised plan summary

| Phase | Before | After | Delta |
|-------|--------|-------|-------|
| 1: Singleton + Fixes | Tasks 1-9 (7 fixes) | Tasks 1-7 + Task 9 (6 fixes, no PKCE) | -1 task |
| 2: CLI | Tasks 10-11 | Tasks 8-9 (renumbered) | No change |
| 3: Class Split | Task 12 | **CUT** | -1 task, -0.5 days |
| 4: Onboarding | Tasks 13-17 | Tasks 10-14 (renumbered) | No change |
| 5: Polish | Tasks 18-19 | Tasks 15-16 (renumbered) | No change |
| **Total** | **19 tasks, ~5 days** | **16 tasks, ~4.25 days** | **-3 tasks, -0.75 days** |

### Scores (post-debate)

| Reviewer | Before | After (if fixes applied) |
|----------|--------|--------------------------|
| RJ | 7/10 | 8.5/10 |
| GSE | "70% shipworthy" | "Ship it" |
| DLG | "Well-structured, 3 blockers" | "No blockers, ready to execute" |
