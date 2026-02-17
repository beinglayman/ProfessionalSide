# OAuth Setup Automation: Lean 5-Day Plan

**Date:** 2026-02-17  
**Approach:** GitHub-first vertical slice, extract only when duplication appears  
**Target:** Ship useful onboarding automation in 5 days, not 10

---

## Reality Check

- This is mostly a UX and error-reduction problem, not deep technical risk.
- Real manual baseline is closer to ~20 minutes for someone experienced.
- Expected win from v1 CLI is mainly:
  - Fewer mistakes (callbacks/scopes/env keys)
  - Less context switching between docs and provider consoles
  - Better repeatability for future team onboarding

---

## Scope Decisions (Intentional Constraints)

1. Extend existing `oauth-cli.ts` — don't create a new CLI. It already has commander, prisma, shutdown.
2. No `automationLevel` in v1 interface.
3. No separate `doctor` command — `validate` checks everything (env vars, values, callbacks, prerequisites).
4. Treat Microsoft like guided/manual in v1; keep `az` automation as stretch.
5. Replace drift snapshot tests with compile-time config sharing.
6. Let extraction shape emerge from code duplication on Day 2, not pre-drawn interfaces.
7. Focus tests on failure modes that actually hurt:
  - Partial `.env` writes
  - `Ctrl+C` mid-flow
  - Invalid/empty secrets entered by user
  - Callback URL mismatch between setup instructions and runtime

---

## End-State by Day 4 (Day 5 = buffer)

- `oauth-cli` supports `setup`, `status`, `validate` (extended from existing CLI).
- Providers supported: GitHub, Atlassian, Google, Microsoft (all guided/manual in core path).
- Shared provider contract imported by both CLI and runtime service (compile-time sharing).
- Integration test proves CLI-written `.env` can initialize MCPOAuthService.
- `.env` writes are safe (temp file + backup + atomic replace).
- Docs use one onboarding command.

---

## Provider Contract (Runtime-Aligned)

Source of truth to keep aligned with `MCPOAuthService`:

| Provider | Env Keys | Callback URL(s) | Scopes |
|---|---|---|---|
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/github` | `repo read:user` |
| Atlassian | `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/jira`, `http://localhost:3002/api/v1/mcp/callback/confluence`, `http://localhost:3002/api/v1/mcp/callback/atlassian` (group callback) | Jira + Confluence scope sets from `mcp-oauth.service.ts` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/google_workspace` | `userinfo.email`, `userinfo.profile`, `drive.readonly`, `calendar.readonly` |
| Microsoft | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/outlook`, `http://localhost:3002/api/v1/mcp/callback/teams`, `http://localhost:3002/api/v1/mcp/callback/onedrive`, `http://localhost:3002/api/v1/mcp/callback/onenote` | Outlook/Teams/OneDrive/OneNote scope sets from `mcp-oauth.service.ts` |

---

## Day-by-Day Plan

### Day 1: Add GitHub setup to existing CLI (working tool)

- [ ] Add `setup` command with `--provider github` to existing `oauth-cli.ts`:
  - GitHub guided setup (open console URL, prompt for client ID/secret)
  - safe `.env` read/write (temp file + backup + atomic rename)
- [ ] Add `validate` command (env keys present + non-blank + callbacks match runtime).
- [ ] **Implementation guard:** `validate` must check `ENCRYPTION_KEY`/`MCP_ENCRYPTION_KEY` in `.env` *before* importing `MCPOAuthService` — its constructor throws if missing (line 41-43). Use dynamic `import()` for the service, not top-level import. If key is missing, report it as a validation error, don't crash.
- [ ] Existing `status` command already works — no changes needed.

**Paths**
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-cli.ts` (extend existing)
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/services/mcp/mcp-oauth.service.ts` (runtime reference for callback URLs)

**References**
- [GitHub OAuth App creation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Probot manifest/setup patterns](https://github.com/probot/probot/tree/master/src)
- [Node `readline/promises`](https://nodejs.org/api/readline.html#readlinepromisescreateinterfaceoptions)

**Runnable check**
```bash
cd /Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend
npx ts-node src/cli/oauth-cli.ts setup --provider github
npx ts-node src/cli/oauth-cli.ts status
npx ts-node src/cli/oauth-cli.ts validate
```

---

### Day 2: Add Atlassian + Google; extract only what's duplicated

- [ ] Add Atlassian setup by cloning GitHub flow and swapping constants.
- [ ] Add Google setup by cloning GitHub flow and swapping constants.
- [ ] Look at the three flows. Extract only what's actually duplicated:
  - provider list / common prompt helpers / env write helper
  - Let the code tell you the shape — don't pre-commit to an adapter interface.
- [ ] Keep structure minimal; three similar blocks in one file is fine.

**Paths**
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-cli.ts` (extend in place)
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-providers.ts` (new, only if duplication justifies)

**Alignment notes**
- Atlassian uses shared creds for Jira + Confluence.
- Google requires consent screen setup before client ID/secret creation.

**References**
- [Atlassian OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/oauth/getting-started/enabling-oauth-3lo/)
- [Google OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [Google OAuth credentials](https://developers.google.com/workspace/guides/create-credentials)

**Runnable check**
```bash
npx ts-node src/cli/oauth-cli.ts setup --provider atlassian
npx ts-node src/cli/oauth-cli.ts setup --provider google
npx ts-node src/cli/oauth-cli.ts status
```

---

### Day 3: Microsoft guided flow (core), optional `az` stretch

- [ ] Add Microsoft guided/manual setup using same pattern as other providers.
- [ ] Show all 4 Microsoft callback URLs in one prompt flow.
- [ ] Optional stretch: `--use-az` flag for automation if CLI and permissions exist.

**Paths**
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-cli.ts` (core guided path)
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/microsoft-az.ts` (optional stretch file)

**References**
- [Azure app registration CLI docs](https://learn.microsoft.com/en-us/cli/azure/ad/app)
- [Azure credential reset docs](https://learn.microsoft.com/en-us/cli/azure/ad/app/credential)

**Runnable check**
```bash
npx ts-node src/cli/oauth-cli.ts setup --provider microsoft
npx ts-node src/cli/oauth-cli.ts validate
```

---

### Day 4: Tests, compile-time contract sharing, docs

- [ ] Extract provider constants into a shared module imported by both CLI and runtime service.
- [ ] Add failure-mode tests focused on real pain points.
- [ ] Add integration test: CLI-written `.env` can initialize MCPOAuthService (closes compile-time guarantee).
- [ ] Update onboarding docs and `.env` template to reference CLI.

**Paths**
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-cli.ts`
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/services/mcp/oauth-provider-contract.ts` (new)
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/services/mcp/mcp-oauth.service.ts` (import shared constants)
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-cli.test.ts` (new)
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/README-LOCAL-DEV.md`
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/.env.mcp.template`

**Failure modes to test**
- Partial write protection: write to temp + rename; backup created first.
- Interrupt safety: `SIGINT` before commit does not leave broken `.env`.
- Secret validation: reject blank/placeholder values.
- Callback mismatch: validate command checks generated auth URL `redirect_uri` equals documented callback.
- Missing `ENCRYPTION_KEY`: validate reports error gracefully, doesn't crash on MCPOAuthService import.

**Integration test (MF/UB)**
```ts
test('provider contract env keys match MCPOAuthService expectations', () => {
  // import from shared contract, verify both sides agree
});
```

**References**
- [Node process signals](https://nodejs.org/api/process.html#signal-events)
- [Node fs rename/atomicity notes](https://nodejs.org/api/fs.html#fspromisesrenameoldpath-newpath)
- [Vitest](https://vitest.dev/)

**Runnable check**
```bash
npx vitest run src/cli/oauth-cli.test.ts
npx ts-node src/cli/oauth-cli.ts validate
```

---

### Day 5: Buffer (absorb reality)

- [ ] Fix whatever broke on Days 1-4.
- [ ] Clean-machine verification: strip OAuth vars from `.env`, run full setup, validate.
- [ ] Record actual measured setup time vs manual baseline.

This is not ceremony — it's budget for the unexpected. If Days 1-4 go cleanly, ship early.

**Runnable check**
```bash
# clean OAuth vars from backend/.env, then:
npx ts-node src/cli/oauth-cli.ts setup
npx ts-node src/cli/oauth-cli.ts validate
```

---

## Extraction Guidance (Day 2)

Don't pre-build an adapter interface. Write GitHub, Atlassian, and Google setup inline in `oauth-cli.ts`. Look at the three flows. Extract only what's actually duplicated.

The extraction might be an interface with methods, or it might be a config object with data. Let the code tell you. Three similar blocks in one file is a valid end state if the duplication is small.

No `automationLevel` in v1.

---

## Progressive Testing Table

| Day | Something Runnable |
|---|---|
| 1 | `oauth-cli setup --provider github`, `validate` |
| 2 | `setup --provider atlassian`, `setup --provider google` |
| 3 | `setup --provider microsoft` |
| 4 | failure-mode tests + integration test + docs updated |
| 5 | clean-machine full run (buffer day) |

---

## Definition of Done

- CLI is useful by Day 1 and complete by Day 4.
- All 4 providers can be configured through guided flows.
- Runtime and setup constants are shared at compile time (not synchronized manually by tests).
- Integration test proves CLI-written `.env` initializes MCPOAuthService.
- Failure-mode tests cover env corruption/interrupt/input validation/callback mismatch.
- Docs are updated and clean-machine flow is verified.
