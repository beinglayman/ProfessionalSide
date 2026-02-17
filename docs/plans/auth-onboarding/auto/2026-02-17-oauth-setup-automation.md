# OAuth Setup Automation

**Status:** PLANNED  
**Date:** 2026-02-17  
**Depends on:** `feat/oauth-reliability` branch (PR #15)  
**Execution plan:** `2026-02-17-oauth-setup-2week-breakdown.md` (lean 5-day version)

---

## Problem

OAuth setup currently requires opening multiple provider consoles, copying credentials, and editing `.env` manually.

Main pain points:

- Callback URL mistakes cause silent auth failures.
- Scope/env-key details are tribal knowledge.
- Setup is repetitive and easy to get wrong.

---

## Recommendation

Ship a **guided, GitHub-first setup CLI** in 5 days:

1. Build one working vertical slice in one file.
2. Clone pattern to Atlassian and Google.
3. Add Microsoft guided setup in the same style.
4. Keep Azure CLI automation as optional stretch, not default.

This is the fastest path to real value for a solo developer.

---

## Provider Reality (as of 2026-02-17)

| Provider | App Creation Automation for This Use Case | Practical v1 Mode |
|---|---|---|
| Microsoft | Possible with `az`, but operationally higher risk (CLI install, auth, permissions) | Guided/manual first; optional `--use-az` stretch |
| GitHub | OAuth App creation is manual; GitHub App manifest flow is separate model | Guided/manual OAuth App flow |
| Atlassian | Manual console flow | Guided/manual |
| Google | Manual console flow for standard OAuth clients | Guided/manual |

---

## v1 Scope

### CLI Commands

- `setup` (all or by provider)
- `status` (existing — already in oauth-cli.ts)
- `validate` (env keys present + non-blank + callbacks match runtime + prerequisites)

### File target

- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/cli/oauth-cli.ts` (extend existing CLI — already has commander, prisma, shutdown)

### Runtime alignment

Use current backend behavior as source of truth:

- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/services/mcp/mcp-oauth.service.ts`
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/types/mcp.types.ts`
- `/Users/ketankhairnar/_work/code/portfolio/ProfessionalSide/backend/src/routes/mcp.routes.ts`

---

## Provider Contract (v1)

| Provider | Env Keys | Callback URL(s) |
|---|---|---|
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/github` |
| Atlassian | `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/jira`, `http://localhost:3002/api/v1/mcp/callback/confluence`, `http://localhost:3002/api/v1/mcp/callback/atlassian` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/google_workspace` |
| Microsoft | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | `http://localhost:3002/api/v1/mcp/callback/outlook`, `http://localhost:3002/api/v1/mcp/callback/teams`, `http://localhost:3002/api/v1/mcp/callback/onedrive`, `http://localhost:3002/api/v1/mcp/callback/onenote` |

Important alignment notes:

- Atlassian credentials are shared across Jira + Confluence.
- Google requires consent screen setup before creating OAuth credentials.
- Microsoft uses one app registration with four redirect URIs.

---

## Implementation Guards

**Boot-order dependency:** `MCPOAuthService` constructor throws if `ENCRYPTION_KEY`/`MCP_ENCRYPTION_KEY` is missing (line 41-43). The `validate` command must:
1. Check `ENCRYPTION_KEY`/`MCP_ENCRYPTION_KEY` exists in `.env` *before* importing `MCPOAuthService`.
2. Load `.env` via dotenv *before* the service import.
3. If missing, report it as a validation failure — don't crash.

This means `validate` uses lazy/dynamic import of the service, not a top-level import.

## Failure Modes to Handle

v1 testing should prioritize these:

1. Partial `.env` state after failure.
2. `Ctrl+C` during setup.
3. Blank/invalid secrets entered by user.
4. Callback URL mismatch between setup prompts and runtime usage.
5. Missing `ENCRYPTION_KEY` — `validate` reports error instead of crashing.

---

## Design Principles

- Extend existing `oauth-cli.ts` — don't create a new CLI from scratch.
- No `automationLevel` taxonomy in v1.
- No separate `doctor` command — `validate` covers everything.
- Prefer compile-time shared constants over test-only synchronization.
- Let extraction shape emerge from code duplication, not pre-drawn interfaces.
- Keep dependencies minimal (`commander`, `readline`, existing Vitest setup).

---

## Implementation Plan (Lean 5 Days)

### Day 1

- Add `setup --provider github` + `validate` commands to existing `oauth-cli.ts`.
- Safe `.env` write path (temp file + backup + atomic rename).

### Day 2

- Add Atlassian + Google by cloning GitHub flow.
- Extract minimal shared helpers only if duplication justifies.

### Day 3

- Add Microsoft guided/manual flow.
- Optional `--use-az` stretch behind flag.

### Day 4

- Failure-mode tests + integration test (CLI-written .env initializes MCPOAuthService).
- Share provider constants between CLI and runtime via `oauth-provider-contract.ts`.
- Update docs and `.env` template.

### Day 5 (buffer)

- Absorb reality: fix what broke, clean-machine verification.
- Budget for the unexpected, not ceremony.

---

## Expected Outcome

Expected gain is mainly reliability and repeatability, not dramatic time collapse:

- Manual experienced setup baseline: ~20 minutes.
- v1 CLI target: save ~5 minutes plus avoid common misconfiguration failures.

---

## Out of Scope (v1)

- Migrating from GitHub OAuth Apps to GitHub Apps.
- Mandatory Azure CLI automation path.
- Secrets manager rollout (Doppler/Infisical) in this sprint.
- Production/staging IaC for OAuth app provisioning.

---

## References

- Microsoft app registration CLI: [az ad app](https://learn.microsoft.com/en-us/cli/azure/ad/app)
- Microsoft credential CLI: [az ad app credential reset](https://learn.microsoft.com/en-us/cli/azure/ad/app/credential)
- GitHub OAuth App creation: [Creating an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- GitHub App manifest flow (future/optional): [Registering a GitHub App from a manifest](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)
- Atlassian OAuth 2.0 (3LO): [Enable OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/oauth/getting-started/enabling-oauth-3lo/)
- Google consent screen: [Configure OAuth consent](https://developers.google.com/workspace/guides/configure-oauth-consent)
- Google OAuth credentials: [Create credentials](https://developers.google.com/workspace/guides/create-credentials)
- Probot reference patterns: [manifest-creation.ts](https://github.com/probot/probot/blob/master/src/manifest-creation.ts), [setup.ts](https://github.com/probot/probot/blob/master/src/apps/setup.ts)
- Supabase env/config pattern: [CLI config](https://supabase.com/docs/guides/local-development/cli/config)
- Doppler team-scale pattern: [Accessing secrets](https://docs.doppler.com/docs/accessing-secrets)
