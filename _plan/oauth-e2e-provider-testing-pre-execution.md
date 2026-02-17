# Pre-Execution Plan: OAuth E2E Provider Testing (Atlassian + Google + Microsoft)

**Date:** 2026-02-17
**Branch:** `feat/oauth-setup-hardening` (or new branch after merge)
**Prerequisite:** PR #16 merged (shared contract wiring + CLI tests)

---

## 1. WHAT ARE WE ACTUALLY BUILDING?

We need to verify that Atlassian, Google, and Microsoft OAuth flows work end-to-end with real credentials. Today only GitHub has been tested with real OAuth app credentials. The other three providers have code written (CLI setup, admin API, service configs, frontend onboarding buckets) but zero real-world verification.

- **SINGLE core problem:** Three OAuth providers have untested credential flows — we don't know if token exchange, callback routing, group OAuth (Atlassian=2 tools, Microsoft=4 tools), and token storage actually work against real provider APIs.

- **User-visible behavior change:** After this work, a user clicking "Connect Atlassian" / "Connect Google" / "Connect Microsoft 365" in the onboarding flow will successfully authorize, return to the app, and see all connected tools (Jira+Confluence, Drive+Calendar, Outlook+Teams+OneDrive+OneNote).

- **"Done" looks like:**
  1. Each provider has a real OAuth app registration at its console
  2. `npm run oauth-cli -- validate` reports all 4 providers as configured (green)
  3. For each provider: click Connect in frontend → authorize at provider → callback returns `success=true` → `MCPIntegration` rows created with encrypted tokens → frontend shows "Connected" badge
  4. For group providers: single OAuth flow creates integration rows for ALL tools in the group (2 for Atlassian, 4 for Microsoft)
  5. Token refresh works (verify by inspecting stored token expiry and calling `oauth-cli -- refresh`)

---

## 2. SCOPE & BOUNDARIES

### FILES I EXPECT TO TOUCH

| File | Action | Why |
|---|---|---|
| `backend/.env` | Modify | Add real credentials for Atlassian, Google, Microsoft |
| `backend/.env.mcp.template` | Verify only | Confirm env key names match contract (no changes expected) |
| No code files | — | This is testing + credential provisioning, not code changes |

### FILES I EXPECT TO CREATE

| File | Purpose |
|---|---|
| `_plan/oauth-e2e-provider-testing-results.md` | Test execution results log |

### FILES I MUST NOT TOUCH

- `mcp-oauth.service.ts` — runtime OAuth flow logic (already tested, contract-wired)
- `mcp.controller.ts` — callback routing (30 controller tests passing)
- `oauth-provider-contract.ts` — shared contract (integration tests protect it)
- `callback.tsx` — frontend callback page (11 tests passing)
- `connect-tools.tsx` — onboarding flow (25 tests passing)
- Any test files — existing 38+ tests should not change

### DEPENDENCIES

- **External accounts required:**
  - Atlassian developer account at `developer.atlassian.com` (free)
  - Google Cloud project at `console.cloud.google.com` (free tier)
  - Azure AD app registration at `portal.azure.com` (free with Microsoft account)
- **No new packages** — all code is already written
- **Backend must be running** on `localhost:3002` during testing
- **Frontend must be running** on `localhost:5173` during testing

### DATA SHAPE CHANGES

- **None.** No schema changes, no API contract changes.
- `.env` gets real credentials added (existing blank placeholders filled in).

---

## 3. DESIGN DECISIONS

| Decision | Options Considered | Chosen | Why |
|---|---|---|---|
| Test approach | Automated E2E (Playwright) vs manual browser walkthrough | Manual browser walkthrough | OAuth redirects to external provider consoles — can't automate without provider-specific test accounts. Playwright can't interact with GitHub/Google/Microsoft login pages. |
| Credential storage | Real prod credentials vs test-only credentials | Test-only dev credentials | Use localhost callback URLs, dev-only OAuth apps. Never commit real secrets. |
| Provider order | Parallel setup vs sequential | Sequential: Atlassian → Google → Microsoft | Atlassian is simplest (2 tools, familiar Jira/Confluence). Google adds consent screen complexity. Microsoft has 4 tools + tenant ID. Escalating complexity. |
| Group vs individual testing | Test each tool individually vs group OAuth | Group OAuth first, then verify individual tools connected | Group OAuth is the happy path from onboarding. Individual tool initiation is a fallback. |
| Token refresh verification | Wait for natural expiry vs force refresh via CLI | Force refresh via CLI | Token expiry is hours/days away. CLI `refresh` command forces immediate refresh. |
| Failure scenario testing | Simulate all error states vs focus on happy path | Happy path + 3 targeted failure tests | E2E with real providers is slow. Cover: state expiry, user denial, invalid scope. |

### Decisions needing user input: None.

---

## 4. EXPECTED BEHAVIOR CONTRACT

### Happy Path — Atlassian (Jira + Confluence)

**GIVEN** `ATLASSIAN_CLIENT_ID` and `ATLASSIAN_CLIENT_SECRET` configured in `.env` from a real Atlassian OAuth app with 3 callback URLs registered
**WHEN** user clicks "Connect Atlassian" in onboarding (or settings)
**THEN**
1. `POST /mcp/oauth/initiate-group { groupType: "atlassian" }` returns `authUrl` pointing to `auth.atlassian.com/authorize`
2. Browser redirects to Atlassian consent screen showing requested scopes
3. User authorizes → Atlassian redirects to `localhost:3002/api/v1/mcp/callback/atlassian?code=...&state=...`
4. Backend exchanges code for tokens, stores encrypted tokens for BOTH `jira` and `confluence` tool types
5. Frontend callback page shows "Connected: Jira, Confluence" and redirects to settings/onboarding
6. `MCPIntegration` table has 2 new rows (jira + confluence) with `isConnected=true`

**GIVEN** Atlassian already connected
**WHEN** `oauth-cli -- refresh jira --user <userId>`
**THEN** Token refresh succeeds, new access token returned

### Happy Path — Google Workspace (Drive + Calendar)

**GIVEN** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured from a Google Cloud OAuth app with consent screen configured and `localhost:3002/api/v1/mcp/callback/google_workspace` as redirect URI
**WHEN** user clicks "Connect Google Workspace" in onboarding
**THEN**
1. `POST /mcp/oauth/initiate { toolType: "google_workspace" }` returns `authUrl` pointing to `accounts.google.com/o/oauth2/v2/auth` with `access_type=offline`
2. Browser redirects to Google consent screen
3. User authorizes → Google redirects to callback with `code` and `state`
4. Backend exchanges code for tokens (including `refresh_token` because `access_type=offline`)
5. Frontend shows "Connected: Google Workspace"
6. `MCPIntegration` table has 1 new row (`google_workspace`) with `isConnected=true` and non-null `refreshToken`

**GIVEN** Google already connected
**WHEN** `oauth-cli -- refresh google_workspace --user <userId>`
**THEN** Token refresh succeeds using stored refresh token

### Happy Path — Microsoft (Outlook + Teams + OneDrive + OneNote)

**GIVEN** `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` configured from an Azure AD app registration with all 4 redirect URIs registered (outlook, teams, onedrive, onenote)
**WHEN** user clicks "Connect Microsoft 365" in onboarding
**THEN**
1. `POST /mcp/oauth/initiate-group { groupType: "microsoft" }` returns `authUrl` pointing to `login.microsoftonline.com/common/oauth2/v2.0/authorize`
2. Browser redirects to Microsoft consent screen showing combined scopes
3. User authorizes → Microsoft redirects to callback with `code` and `state`
4. Backend exchanges code for tokens, stores encrypted tokens for ALL 4 tools
5. Frontend shows "Connected: Outlook, Teams, OneDrive, OneNote"
6. `MCPIntegration` table has 4 new rows with `isConnected=true`

**GIVEN** Microsoft already connected
**WHEN** `oauth-cli -- refresh outlook --user <userId>`
**THEN** Token refresh succeeds

### Edge Cases

**GIVEN** Atlassian OAuth app has only 1 of 3 callback URLs registered (missing `/atlassian` group callback)
**WHEN** user clicks "Connect Atlassian" via group flow
**THEN** Atlassian returns `redirect_uri_mismatch` error → frontend shows "Authorization failed" with error details

**GIVEN** Google consent screen not configured (app in "Testing" mode, user not added as test user)
**WHEN** non-test user clicks "Connect Google Workspace"
**THEN** Google shows "Access blocked: app has not completed the Google verification process" → user cannot authorize

**GIVEN** Microsoft Azure app uses single-tenant but `MICROSOFT_TENANT_ID` is set to `common`
**WHEN** user from a different tenant clicks "Connect Microsoft 365"
**THEN** Microsoft shows error about tenant mismatch → frontend shows error

**GIVEN** user clicks Connect but then clicks "Deny" on the provider consent screen
**WHEN** provider redirects back with `error=access_denied`
**THEN** Frontend callback page shows "Authorization was denied" with option to retry

### Error States

**GIVEN** `ENCRYPTION_KEY` is missing from `.env`
**WHEN** backend starts
**THEN** `MCPOAuthService` constructor throws immediately — OAuth endpoints return 500. `oauth-cli -- validate` reports this as first error.

**GIVEN** valid credentials but backend is down when provider redirects back
**WHEN** provider redirects to `localhost:3002/api/v1/mcp/callback/...`
**THEN** Browser shows connection refused. User must retry from onboarding.

**GIVEN** OAuth state parameter is older than 10 minutes (user left consent screen open too long)
**WHEN** provider redirects back with stale state
**THEN** Backend rejects state, frontend shows "Authorization failed: state expired"

---

## 5. BLAST RADIUS ANALYSIS

```
Provider Console → .env credentials → MCPOAuthService.initializeOAuthConfigs()
                                    → oauth-cli validate
                                    → oauth-setup.controller (admin API)
                                    ↓
                          Frontend "Connect" button
                                    ↓
                    POST /mcp/oauth/initiate(-group)
                                    ↓
                    Browser redirect to provider
                                    ↓
                    Provider consent screen
                                    ↓
                    GET /mcp/callback/:toolType
                                    ↓
                    handleCallback() → exchangeCode → storeTokens
                                    ↓
                    MCPIntegration table (encrypted tokens)
                                    ↓
                    Frontend callback.tsx → redirect to onboarding/settings
```

**If credentials are wrong:**
- `initiate` returns auth URL with wrong client_id → provider shows "invalid client" error
- Only affects the misconfigured provider — other providers unaffected
- GitHub (already working) is completely isolated

**If callback URLs are wrong:**
- Provider rejects the redirect_uri → shows error at provider consent screen
- No callback reaches our backend — no data corruption risk

**If token storage fails:**
- Frontend shows "Authorization failed" error
- User can retry — no partial state (upsert pattern is atomic)

**Existing tests that might fail:** None. We're adding credentials to `.env`, not changing code. The 38 existing tests mock all provider calls.

**Monitoring/alerts in production:**
- None currently (no production deployment). For future: monitor 4xx/5xx on callback endpoints, alert on >10% failure rate.

---

## 6. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Provider console setup takes longer than expected (unfamiliar UI) | Medium | Low | Follow CLI `setup` prompts which print exact URLs and steps. Budget 15 min per provider. |
| Google consent screen requires domain verification for non-test users | High | Medium | Use "Testing" mode + add test user email. This is dev-only, not production. |
| Microsoft requires admin consent for certain scopes | Medium | High | We already disabled SharePoint (requires `Sites.Read.All`). Remaining scopes are user-consent only. If Teams scopes need admin consent, we can reduce scope to read-only. |
| Atlassian scopes rejected (classic vs granular mismatch) | Low | Medium | Service uses classic scopes for Jira, granular for Confluence. If rejected, adjust scope string in the service. |
| Token refresh fails because provider doesn't issue refresh_token | Medium | Medium | Google requires `access_type=offline` (already set). Atlassian requires `offline_access` scope (already included). Microsoft includes `offline_access` in scopes (already set). |
| Callback URL mismatch (http vs https, port difference) | Low | High | `oauth-cli -- validate` checks callback URLs against `BACKEND_URL`. Run validate before testing. |
| Rate limiting during repeated test attempts | Low | Low | Wait between retries. Each provider allows hundreds of auth flows per day for dev apps. |

---

## 7. IMPLEMENTATION SEQUENCE

### Step 1: Pre-flight checks (5 min)

**What:** Verify backend + frontend running, existing GitHub flow still works.
**Verify:**
```bash
# Backend health
curl http://localhost:3002/health

# Frontend accessible
curl -s http://localhost:5173 | head -1

# Validate current state
cd backend && npm run oauth-cli -- validate
```
**Rollback:** If backend won't start, fix startup issue first.

### Step 2: Atlassian OAuth app registration (15 min)

**What:**
1. Go to `https://developer.atlassian.com/console/myapps/`
2. Create new OAuth 2.0 app
3. Add 3 callback URLs:
   - `http://localhost:3002/api/v1/mcp/callback/jira`
   - `http://localhost:3002/api/v1/mcp/callback/confluence`
   - `http://localhost:3002/api/v1/mcp/callback/atlassian`
4. Enable OAuth 2.0 (3LO) authorization code grants
5. Add scopes: `read:jira-work`, `read:jira-user`, `read:me`, `offline_access`, plus Confluence granular scopes
6. Copy Client ID + Secret
7. Run: `npm run oauth-cli -- setup --provider atlassian` (enter credentials)

**Verify:**
```bash
npm run oauth-cli -- validate
# Should show: OK  Atlassian: configured
```
**Rollback:** Delete the Atlassian app at the console. Remove `ATLASSIAN_*` from `.env`.

### Step 3: Atlassian E2E test (15 min)

**What:**
1. Open `http://localhost:5173` in browser, log in
2. Navigate to Settings → Integrations (or Onboarding → Connect Tools)
3. Click "Connect Atlassian"
4. Authorize at Atlassian consent screen
5. Verify callback success page shows "Connected: Jira, Confluence"
6. Verify redirect to settings/onboarding
7. Check DB: `MCPIntegration` has 2 rows for jira + confluence with `isConnected=true`

**Verify:**
```bash
npm run oauth-cli -- status
# Should show user with jira, confluence tools
npm run oauth-cli -- inspect jira --user <userId>
# Should show token metadata with connectedAt, hasRefreshToken
npm run oauth-cli -- refresh jira --user <userId>
# Should succeed if refresh_token was issued
```
**Rollback:** Disconnect via CLI: `npm run oauth-cli -- disconnect jira --user <userId>`

### Step 4: Google OAuth app registration (20 min)

**What:**
1. Go to `https://console.cloud.google.com/apis/credentials/consent`
2. Configure OAuth consent screen (External, Testing mode)
3. Add test user email
4. Add scopes: `userinfo.email`, `userinfo.profile`, `drive.readonly`, `calendar.readonly`
5. Go to `https://console.cloud.google.com/apis/credentials`
6. Create OAuth 2.0 Client ID (Web application)
7. Add redirect URI: `http://localhost:3002/api/v1/mcp/callback/google_workspace`
8. Copy Client ID + Secret
9. Run: `npm run oauth-cli -- setup --provider google`

**Verify:**
```bash
npm run oauth-cli -- validate
# Should show: OK  Google Workspace: configured
```
**Rollback:** Delete OAuth client at Google console. Remove `GOOGLE_*` from `.env`.

### Step 5: Google E2E test (15 min)

**What:**
1. Click "Connect Google Workspace" in browser
2. Google consent screen should force consent (because `prompt=consent`)
3. Authorize → callback → "Connected: Google Workspace"
4. Verify `refresh_token` was issued (because `access_type=offline`)

**Verify:**
```bash
npm run oauth-cli -- status
npm run oauth-cli -- inspect google_workspace --user <userId>
# hasRefreshToken should be true
npm run oauth-cli -- refresh google_workspace --user <userId>
```
**Rollback:** Disconnect via CLI.

### Step 6: Microsoft Azure app registration (20 min)

**What:**
1. Go to `https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps`
2. New registration → "InChronicle Dev" → Accounts in any organizational directory and personal accounts
3. Platform: Web → Add 4 redirect URIs:
   - `http://localhost:3002/api/v1/mcp/callback/outlook`
   - `http://localhost:3002/api/v1/mcp/callback/teams`
   - `http://localhost:3002/api/v1/mcp/callback/onedrive`
   - `http://localhost:3002/api/v1/mcp/callback/onenote`
4. Certificates & secrets → New client secret → Copy Value (not Secret ID)
5. Copy Application (client) ID
6. Run: `npm run oauth-cli -- setup --provider microsoft`
7. Optionally set `MICROSOFT_TENANT_ID` if single-tenant (default: `common`)

**Verify:**
```bash
npm run oauth-cli -- validate
# Should show: OK  Microsoft: configured
```
**Rollback:** Delete app registration at Azure portal. Remove `MICROSOFT_*` from `.env`.

### Step 7: Microsoft E2E test (20 min)

**What:**
1. Click "Connect Microsoft 365" in browser
2. Microsoft consent screen shows combined scopes for all 4 tools
3. Authorize → callback → "Connected: Outlook, Teams, OneDrive, OneNote"
4. Verify 4 `MCPIntegration` rows created

**Verify:**
```bash
npm run oauth-cli -- status
# Should show: outlook, teams, onedrive, onenote for user
npm run oauth-cli -- inspect outlook --user <userId>
npm run oauth-cli -- refresh outlook --user <userId>
```
**Rollback:** Disconnect via CLI.

### Step 8: Failure scenario testing (15 min)

**What:** Test 3 targeted failure scenarios:
1. **State expiry:** Initiate OAuth, wait 11 minutes, then complete authorization → expect "state expired" error
2. **User denial:** Click Connect, then click "Deny" at provider consent screen → expect "access_denied" error page
3. **Disconnect + reconnect:** Disconnect a provider via CLI, then reconnect via browser → should work cleanly

**Verify:** Frontend error page shows correct error messages for each scenario.

### Step 9: Record results (10 min)

**What:** Document all results in `_plan/oauth-e2e-provider-testing-results.md`:
- Per-provider: pass/fail, any issues encountered, screenshots if relevant
- Token refresh: pass/fail per provider
- Failure scenarios: pass/fail
- Any code changes needed (should be zero if everything works)

---

## 8. THE 25% IMPROVEMENT RADAR

While analyzing the codebase for this task:

1. **Missing: Atlassian group callback path in service.** The `mcp-oauth.service.ts` `initializeOAuthConfigs()` doesn't set up a config for the `/callback/atlassian` group path — it only has `/callback/jira` and `/callback/confluence`. The controller routes the group callback via state param decoding, but if the callback arrives at `/callback/atlassian`, the `handleOAuthCallback` method needs to resolve the correct config. **Verify during Step 3 — this may be a bug.**

2. **Missing: Google `access_type=offline` and `prompt=consent` params.** The `getAuthorizationUrl` method builds the URL with standard params but doesn't add Google-specific `access_type=offline` or `prompt=consent`. The service file shows these in comments but they may not be in the URL builder. **Verify during Step 5 — if refresh_token is missing, this is the cause.**

3. **`logConfigurationDiagnostics()` lists all tools individually** but doesn't distinguish providers from tools. After contract wiring, it could use `PROVIDER_CONTRACTS` to show provider-level status (e.g., "Atlassian: configured (covers Jira + Confluence)").

4. **No disconnect E2E test in existing test suites.** The controller test mocks `disconnectIntegration` but never tests actual token revocation against the DB.

5. **The `.env.mcp.template` has Figma/Slack/Zoom sections** but those providers aren't in the shared contract. Consider adding them to the contract for consistency (low priority — they work but aren't contract-protected).

6. **Onboarding flow doesn't show Figma/Slack/Zoom** — `connect-tools.tsx` shows "Coming Soon" badges. These tools are configurable via Settings but not onboarding. Minor UX inconsistency.

7. **Microsoft `response_mode=query`** is set in the service comments but needs verification in the actual URL builder. Some Microsoft OAuth errors return as fragments (`#error=...`) instead of query params if `response_mode` is not explicit.
