# Pre-Execution Plan: OAuth Setup CLI

**Date:** 2026-02-17
**Branch:** `feat/oauth-reliability` (PR #15)
**Source plans:** `docs/plans/auth-onboarding/auto/2026-02-17-oauth-setup-automation.md`, `2026-02-17-oauth-setup-2week-breakdown.md`

---

## 1. WHAT ARE WE ACTUALLY BUILDING?

Add `setup` and `validate` commands to the existing `oauth-cli.ts` so that developers can configure OAuth provider credentials through a guided interactive flow instead of manually copy-pasting between provider consoles and `.env`.

- **SINGLE core problem:** OAuth app credential misconfiguration during backend environment setup — wrong callback URLs, wrong env key names, missing scopes — causes silent auth failures for ALL users connecting through that environment.
- **Who runs this:** A backend admin/developer configuring the environment. OAuth apps are **per-environment, not per-user** — one app registration per provider serves thousands of users. Individual users connect via the frontend onboarding flow.
- **User-visible behavior change:** Running `npm run oauth-cli -- setup --provider github` walks the admin through creating a GitHub OAuth App and writes the correct env vars to `.env`. Running `validate` checks that all configured providers have correct, non-blank credentials and matching callback URLs.
- **"Done" looks like:** An admin with zero OAuth knowledge can run `oauth-cli setup`, follow the prompts for each provider, and end up with a working `.env` that passes `oauth-cli validate` — backend starts, all users' OAuth flows succeed through the shared app credentials.

---

## 2. SCOPE & BOUNDARIES

### FILES I EXPECT TO TOUCH

| File | Action | Day |
|---|---|---|
| `backend/src/cli/oauth-cli.ts` | Extend with `setup` + `validate` commands | 1-3 |
| `backend/src/cli/oauth-providers.ts` | New, **only if** Day 2 duplication justifies | 2 |
| `backend/src/cli/microsoft-az.ts` | New, optional stretch | 3 |
| `backend/src/services/mcp/oauth-provider-contract.ts` | New, shared constants | 4 |
| `backend/src/services/mcp/mcp-oauth.service.ts` | Import from shared contract | 4 |
| `backend/src/cli/oauth-cli.test.ts` | New, failure-mode + integration tests | 4 |
| `backend/.env.mcp.template` | Fix stale env key names, add missing providers | 4 |
| `backend/README-LOCAL-DEV.md` | Add OAuth setup section | 4 |
| `backend/package.json` | Add `commander` dependency + `oauth-cli` script | 1 |

### FILES I MUST NOT TOUCH

- `mcp-oauth.service.test.ts` — existing 24 tests, don't break
- `mcp.routes.ts` — callback routes are correct, no changes needed
- `mcp.types.ts` — `MCPToolType` enum is stable
- `mcp.controller.ts` / `mcp-group.controller.ts` — runtime OAuth flow is out of scope
- Frontend onboarding (`connect-tools.tsx`) — no changes

### DEPENDENCIES

- `commander` — **CRITICAL GAP: imported by existing `oauth-cli.ts` but NOT in package.json.** Must add before anything works. (Existing CLI was never tested via npm because it was invoked manually.)
- `readline/promises` — Node built-in (stable since Node 18, project requires >=18). No install needed.
- `dotenv` — already in dependencies. Needed for loading `.env` before dynamic service import.

### DATA SHAPE CHANGES

- **No schema changes.** No DB migrations.
- **No API contract changes.** CLI is local-only.
- **`.env` changes:** CLI writes provider credentials to `.env`. Safe path: temp file + backup + atomic rename.

---

## 3. DESIGN DECISIONS

| Decision | Options Considered | Chosen | Why |
|---|---|---|---|
| CLI entry point | New `setup-oauth.ts` vs extend `oauth-cli.ts` | Extend existing | Already has commander, prisma, shutdown. DHH/GSE review. |
| `validate` vs `doctor` + `validate` | Two commands vs one | Single `validate` | One command checks everything. GSE/DHH review. |
| Adapter interface | Pre-drawn interface vs emergent extraction | Emergent | Let Day 2 code reveal shape. SM/RJ review. |
| `.env` write safety | Direct write vs temp+rename | Temp + backup + atomic rename | Protects against Ctrl+C and partial writes. |
| MCPOAuthService import in `validate` | Top-level import vs dynamic `import()` | Dynamic import | Constructor throws if ENCRYPTION_KEY missing. Must check env first. |
| Provider scopes | Hardcode in CLI vs read from service | Shared contract module (Day 4) | Compile-time guarantee. MF/UB review. |
| `commander` installation | Add to deps vs rewrite with built-in args | Add to deps | Already used by existing CLI. Rewriting is waste. |

### Decisions needing user input: None. All resolved by review rounds.

---

## 4. EXPECTED BEHAVIOR CONTRACT

### Happy Path

**GIVEN** a developer with no OAuth env vars configured
**WHEN** they run `oauth-cli setup --provider github`
**THEN** CLI:
1. Prints the GitHub OAuth App creation URL (`https://github.com/settings/developers`)
2. Shows the exact callback URL to enter: `http://localhost:3002/api/v1/mcp/callback/github`
3. Prompts for Client ID
4. Prompts for Client Secret
5. Writes `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env` (atomic write)
6. Confirms success

**GIVEN** GitHub credentials already in `.env`
**WHEN** they run `oauth-cli setup --provider github`
**THEN** CLI shows existing values are configured and asks to overwrite or skip.

**GIVEN** all 4 providers configured in `.env`
**WHEN** they run `oauth-cli validate`
**THEN** CLI checks each provider and reports:
- ENCRYPTION_KEY present: yes/no
- Per-provider: env keys present, non-blank, callback URL matches runtime expectation

**GIVEN** no `--provider` flag
**WHEN** they run `oauth-cli setup`
**THEN** CLI walks through ALL providers sequentially (GitHub, Atlassian, Google, Microsoft), skipping any already configured (with option to reconfigure).

### Edge Cases

**GIVEN** `.env` file doesn't exist
**WHEN** `setup` writes credentials
**THEN** creates `.env` from scratch (not crash)

**GIVEN** `.env` has `GITHUB_CLIENT_ID=` (key exists but blank value)
**WHEN** `validate` runs
**THEN** reports as failure: "GITHUB_CLIENT_ID is blank"

**GIVEN** `ATLASSIAN_CLIENT_ID` is set but `.env.mcp.template` says `JIRA_CLIENT_ID`
**WHEN** `validate` runs
**THEN** validates against actual runtime keys (`ATLASSIAN_*`), not stale template keys

**GIVEN** user enters a value with leading/trailing whitespace
**WHEN** `setup` writes to `.env`
**THEN** trims the value before writing

### Error States

**GIVEN** `ENCRYPTION_KEY` is missing from `.env`
**WHEN** `validate` runs
**THEN** reports "ENCRYPTION_KEY or MCP_ENCRYPTION_KEY required" as first validation error. Does NOT crash. Does NOT import MCPOAuthService.

**GIVEN** user presses Ctrl+C mid-setup after entering Client ID but before Client Secret
**WHEN** SIGINT fires
**THEN** `.env` is unchanged (write only commits atomically after all values collected)

**GIVEN** user enters blank string for Client Secret
**WHEN** `setup` prompts
**THEN** rejects and re-prompts: "Client Secret cannot be blank"

**GIVEN** `BACKEND_URL` is set to `https://myapp.com`
**WHEN** `validate` checks callback URLs
**THEN** validates against `https://myapp.com/api/v1/mcp/callback/github` (not hardcoded localhost)

---

## 5. BLAST RADIUS ANALYSIS

```
oauth-cli.ts (modified)
    ├── DEPENDS ON: commander (must install), readline/promises (built-in), dotenv, fs/promises
    ├── DEPENDS ON (Day 4): oauth-provider-contract.ts (new shared constants)
    ├── READS: backend/.env
    ├── WRITES: backend/.env (atomic: temp → backup → rename)
    └── DOES NOT import MCPOAuthService at top level (dynamic import in validate only)

oauth-provider-contract.ts (new, Day 4)
    ├── IMPORTED BY: oauth-cli.ts (setup + validate)
    └── IMPORTED BY: mcp-oauth.service.ts (initializeOAuthConfigs)
        └── IF THIS BREAKS: mcp-oauth.service.ts constructor fails → ALL OAuth flows break
        └── MITIGATION: service currently works fine with inline constants; contract import
            is additive, not replacing. If import fails, service's existing fallback values
            still work. But TypeScript compilation will catch mismatches.

mcp-oauth.service.ts (modified Day 4)
    └── ONLY CHANGE: import env key names / callback URL patterns from shared contract
    └── Behavior is identical — same values, different source
    └── RISK: typo in contract module → service doesn't configure a provider → silent failure
    └── MITIGATION: integration test (Day 4) catches this
```

**Existing tests that could break:**
- `mcp-oauth.service.test.ts` (24 tests) — only if Day 4 contract import changes the service behavior. Should be zero risk since values don't change.
- `mcp.controller.test.ts` (30 tests) — no risk, controller doesn't change.
- `connect-tools.test.ts` (25 tests) — no risk, frontend doesn't change.

**Monitoring:** This is a dev-only CLI tool. No production monitoring needed. Validation is the monitoring — run `oauth-cli validate` to check health.

---

## 6. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `commander` not installed — existing CLI already broken | **Confirmed** | High (nothing works) | Install as first action, Day 1 |
| Atomic `.env` write fails on Windows (rename semantics differ) | Low (dev is macOS) | Medium | Use `fs.rename` which is atomic on POSIX. Document macOS/Linux requirement. |
| Dynamic `import()` of MCPOAuthService causes ESM/CJS issues | Medium | Medium | Test immediately on Day 1. Fallback: wrap in try/catch, report error. |
| `.env.mcp.template` stale keys confuse developers | **Confirmed** | Medium (wrong env keys → silent failure) | Fix template on Day 4 as part of docs update. |
| GitHub callback URL uses hardcoded string while others use `BACKEND_URL` | Low (inconsistency exists today) | Low | Document in validate output. Don't fix the service in this sprint. |
| Ctrl+C during `readline` prompt leaves terminal in raw mode | Medium | Low (annoying) | Register SIGINT handler to restore terminal and exit cleanly. |
| Shared contract module introduces circular dependency | Low | High (build breaks) | Contract is pure data (no imports from service). No circular risk. |

---

## 7. IMPLEMENTATION SEQUENCE

### Step 1: Install `commander` + add npm script (15 min)

**What:** `npm install commander` + add `"oauth-cli": "tsx src/cli/oauth-cli.ts"` to scripts
**Verify:** `npm run oauth-cli -- status` runs without module-not-found error
**Rollback:** `npm uninstall commander`, remove script

### Step 2: Add safe `.env` read/write helpers (30 min)

**What:** Functions to read `.env` into a Map, write Map back to `.env` via temp+backup+rename. Handle: file doesn't exist, file is empty, preserve comments, preserve ordering.
**Verify:** Unit test — write to temp `.env`, read back, values match. Simulate interrupt (no corruption).
**Rollback:** Delete helper functions

### Step 3: Add `setup --provider github` command (1 hr)

**What:** Commander subcommand. Opens browser URL (or prints it). Shows callback URL. Prompts for Client ID + Secret. Validates non-blank. Writes to `.env` via safe helpers.
**Verify:** Run interactively: `npm run oauth-cli -- setup --provider github`. Enter test values. Check `.env` has correct keys.
**Rollback:** Remove command handler

### Step 4: Add `validate` command (1 hr)

**What:** For each known provider, check:
1. `ENCRYPTION_KEY` or `MCP_ENCRYPTION_KEY` present and non-blank (FIRST, before any service import)
2. Per-provider env keys present and non-blank
3. Callback URL matches runtime expectation (construct from `BACKEND_URL` fallback pattern)
Uses dynamic `import()` for MCPOAuthService only if ENCRYPTION_KEY passes.
**Verify:** Run with missing keys → reports errors. Run with valid keys → reports success. Run with missing ENCRYPTION_KEY → reports error, doesn't crash.
**Rollback:** Remove command handler

### Step 5: Add Atlassian setup (45 min) — Day 2

**What:** Clone GitHub flow. Key differences: shared creds for Jira + Confluence (one Client ID/Secret → `ATLASSIAN_CLIENT_ID`/`ATLASSIAN_CLIENT_SECRET`), show 3 callback URLs, mention consent screen.
**Verify:** Run interactively. Check `.env`.
**Rollback:** Remove handler

### Step 6: Add Google setup (45 min) — Day 2

**What:** Clone flow. Key difference: must set up consent screen FIRST (show link), then create credentials. Full-URL scopes (googleapis.com format).
**Verify:** Run interactively. Check `.env`.
**Rollback:** Remove handler

### Step 7: Extract duplication if it exists (30 min) — Day 2

**What:** Look at 3 providers. If the prompt→collect→write pattern is copy-pasted 3 times, extract a common helper or config table. If it's <20 lines of difference each, leave it inline.
**Verify:** All 3 providers still work after extraction.
**Rollback:** Revert extraction, keep inline

### Step 8: Add Microsoft setup (1 hr) — Day 3

**What:** One Client ID/Secret for 4 tools (Outlook, Teams, OneDrive, OneNote). Show all 4 callback URLs. Mention `MICROSOFT_TENANT_ID` (default: 'common'). Also show Azure portal link.
**Verify:** Run interactively. Check `.env`.
**Rollback:** Remove handler

### Step 9: Shared contract module (1 hr) — Day 4

**What:** Create `oauth-provider-contract.ts` exporting provider env keys, callback URL patterns, scopes. Import in both `oauth-cli.ts` and `mcp-oauth.service.ts`.
**Verify:** TypeScript compiles. All existing tests pass (`npx vitest run`). Service behavior unchanged.
**Rollback:** Revert imports, delete contract file. Service falls back to inline values.

### Step 10: Failure-mode + integration tests (2 hr) — Day 4

**What:**
- Partial write: mock fs.rename to fail mid-write → `.env` unchanged
- Blank secret rejection
- Missing ENCRYPTION_KEY → validate reports error, no crash
- Integration: write `.env` with CLI values, dynamic-import MCPOAuthService, verify it initializes
**Verify:** `npx vitest run src/cli/oauth-cli.test.ts` — all pass
**Rollback:** Delete test file (tests don't affect runtime)

### Step 11: Fix `.env.mcp.template` + update docs (1 hr) — Day 4

**What:**
- Fix stale keys: `JIRA_CLIENT_ID` → `ATLASSIAN_CLIENT_ID`, `CONFLUENCE_CLIENT_ID` → `ATLASSIAN_CLIENT_ID`
- Add missing: `ZOOM_*`, `GOOGLE_*`, `MICROSOFT_TENANT_ID`, `BACKEND_URL`
- Add OAuth setup section to `README-LOCAL-DEV.md` referencing `npm run oauth-cli -- setup`
**Verify:** `oauth-cli validate` against fresh `.env` from updated template
**Rollback:** Git revert

---

## 8. THE 25% IMPROVEMENT RADAR

### Confirmed gaps found during analysis

| Issue | Location | Severity | Fix Cost |
|---|---|---|---|
| **`commander` not in package.json** | `backend/package.json` | Blocker (existing CLI is broken) | 1 min — `npm install commander` |
| **`.env.mcp.template` stale env keys** | `backend/.env.mcp.template` lines 33-34, 56-58 | Medium (misleads devs) | 15 min — rename JIRA_→ATLASSIAN_, add missing providers |
| **Template missing providers** | `.env.mcp.template` | Medium | 15 min — add ZOOM_*, GOOGLE_*, MICROSOFT_TENANT_ID, BACKEND_URL |
| **GitHub callback URL inconsistency** | `mcp-oauth.service.ts` line 60-61 | Low (works, just inconsistent) | 5 min — add `BACKEND_URL` fallback like other providers. **Out of scope for this sprint.** |
| **No OAuth docs in README** | `README-LOCAL-DEV.md` | Medium | 30 min — Day 4 deliverable |
| **`validate-all` command name** | `oauth-cli.ts` line 156 | Informational | Existing command validates live tokens against providers. New `validate` checks local env config. Different purpose, keep both. Rename consideration deferred. |

### Missing tests for code we depend on

- `mcp-oauth.service.ts` has 24 tests — adequate coverage for our needs
- `initializeOAuthConfigs()` is not directly unit-tested (tested indirectly via integration) — not blocking

### Patterns to extract/share

- Provider env keys + callback URL patterns → `oauth-provider-contract.ts` (Day 4 deliverable)
- Safe `.env` read/write → could be reused by future CLI tools (extract only if another consumer appears)
