# SSR Research: OAuth Setup Automation Patterns

**Mission**: Find established patterns and working code for CLI tools that automate multi-provider OAuth app setup
**Date**: 2026-02-17
**Time spent**: ~30 min light research

---

## TL;DR

No one has solved "one CLI to setup all OAuth providers" because 3 of 4 major providers don't expose creation APIs. The industry has converged on two patterns:

1. **Secrets Manager Pull** (Doppler/Infisical/Vercel): Admin creates apps once, team pulls credentials with one command. This is the established pattern for teams.
2. **Guided Setup Wizard** (Probot/Supabase): Interactive CLI walks developer through manual steps, collects credentials, writes config. This is the established pattern for open-source projects.

For InChronicle, **Pattern 1 (secrets pull) is the target state** but requires infrastructure. **Pattern 2 (guided wizard) is the right v1** — zero infrastructure needed, immediate value.

---

## Source Map

### Tier 1: Primary (Working Code)

| Source | Type | Key Value |
|--------|------|-----------|
| [Probot manifest-creation.ts](https://github.com/probot/probot/blob/master/src/manifest-creation.ts) | Working code | GitHub App manifest flow — complete implementation of redirect → code exchange → write .env |
| [Probot setup.ts](https://github.com/probot/probot/blob/master/src/apps/setup.ts) | Working code | Local HTTP server that hosts setup UI, receives manifest callback, writes env |
| [Supabase config.toml](https://supabase.com/docs/guides/local-development/cli/config) | Docs | OAuth providers configured in `config.toml` with `env()` function for secrets |
| [Doppler CLI](https://docs.doppler.com/docs/accessing-secrets) | Docs | `doppler run -- npm start` injects secrets, no .env files |
| [Infisical CLI](https://infisical.com/docs/cli/commands/export) | Docs | `infisical export --format=dotenv > .env` for team secret pull |
| [Firebase Identity Platform REST API](https://firebase.google.com/docs/projects/provisioning/configure-oauth) | Docs | Programmatic OAuth IdP config via REST (but for Firebase-as-IdP, not our use case) |
| [Microsoft az ad app create](https://learn.microsoft.com/en-us/cli/azure/ad/app) | Docs | Full programmatic app registration — only provider that supports this |

### Tier 2: Practitioner

| Source | Context | Key Insight |
|--------|---------|-------------|
| [RunsOn blog: GitHub App manifests](https://runs-on.com/blog/self-serve-github-app-registration-with-manifests/) | Production usage | HTML form POSTs manifest to GitHub, code exchange returns full credentials |
| [Auth.js/NextAuth](https://authjs.dev/guides/configuring-oauth-providers) | Framework docs | Auto-infers env vars prefixed `AUTH_` (e.g., `AUTH_GITHUB_ID`). No setup wizard. Manual .env editing. |
| [Supabase local OAuth discussion](https://github.com/orgs/supabase/discussions/2818) | Community | Local OAuth dev is a known pain point — no automation exists, manual config.toml editing |
| [Google oauth2l](https://github.com/google/oauth2l) | CLI tool | Google's own CLI for *using* OAuth tokens, not *creating* OAuth apps |

### Tier 3: Noise (Skip)

| Source | Why |
|--------|-----|
| Medium OAuth tutorials | Rehash official docs, no setup automation |
| Generic "awesome developer tools" lists | Breadth without depth on this specific problem |
| Clerk docs | SaaS that owns the OAuth apps for you — different model entirely |

---

## Gold Seams

### 1. Probot's Manifest Flow (Working Reference Implementation)

**What it does**: When a developer runs Probot for the first time without `APP_ID` in .env, it:
1. Starts a local HTTP server
2. Serves a setup page with a "Register GitHub App" button
3. The button POSTs a pre-filled manifest JSON to `https://github.com/settings/apps/new`
4. User names the app and clicks "Create" (2 clicks total)
5. GitHub redirects back to local server with a temp `code`
6. Server exchanges code via `POST /app-manifests/{code}/conversions`
7. Response contains `client_id`, `client_secret`, `pem`, `webhook_secret`
8. All credentials written to `.env` automatically

**Key code** (`manifest-creation.ts`):
```typescript
public async createAppFromCode(code: string, probotOptions?) {
  const octokit = new ProbotOctokit(probotOptions);
  const response = await octokit.request(
    "POST /app-manifests/:code/conversions",
    { code }
  );
  const { id, client_id, client_secret, webhook_secret, pem } = response.data;
  this.#updateEnv({
    APP_ID: id.toString(),
    PRIVATE_KEY: `"${pem}"`,
    WEBHOOK_SECRET: webhook_secret,
    GITHUB_CLIENT_ID: client_id,
    GITHUB_CLIENT_SECRET: client_secret,
  });
  return response.data.html_url;
}
```

**Applicability to InChronicle**: This is for **GitHub Apps**, not classic OAuth Apps. GitHub Apps use a different auth model (installation tokens + JWT, not just client_id/secret). Our current `MCPOAuthService` uses classic OAuth App flow. Switching to GitHub Apps would be a larger change but would enable this manifest automation.

**Verdict**: Great reference for the *shape* of the setup flow (local server → redirect → code exchange → write env). But adopting it means migrating from OAuth Apps to GitHub Apps.

### 2. Secrets Manager Pull Pattern (Doppler/Infisical/Vercel)

**What it does**:
- Admin creates OAuth apps once per environment (dev/staging/prod)
- Admin stores `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, etc. in Doppler/Infisical
- Developer runs one command to pull all secrets:

```bash
# Doppler
doppler run -- npm start          # injects at runtime, no .env
doppler secrets download --no-file --format env > .env  # or export to file

# Infisical
infisical export --format=dotenv > backend/.env

# Vercel
vercel env pull .env.local
```

**Key insight from Doppler case study**: "Onboard a new engineer in two minutes instead of two hours."

**Applicability to InChronicle**: This is the *right long-term answer*. But it requires:
- A secrets manager (Doppler free tier, or Infisical self-hosted)
- An admin to set up OAuth apps once
- Team access controls

**Verdict**: Target state. But overkill for a solo developer today. Worth adopting when there's a second developer.

### 3. Supabase's config.toml Pattern

**What it does**: OAuth providers configured declaratively in `supabase/config.toml`:

```toml
[auth.external.github]
enabled = true
client_id = "env(GITHUB_CLIENT_ID)"
secret = "env(GITHUB_CLIENT_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

The `env()` function reads from a `.env` file in the project root. Still requires manual OAuth app creation at each provider.

**Applicability to InChronicle**: We already do this (env vars in `MCPOAuthService.initializeOAuthConfigs()`). Supabase's approach confirms our pattern is standard. They don't automate the app creation either.

### 4. Auth.js Auto-Inference Pattern

**What it does**: Auth.js v5 auto-infers provider credentials from env var naming convention:

```bash
# Just set these in .env:
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=yyy
# Auth.js automatically configures the GitHub provider
```

No setup wizard. No CLI. Just a naming convention that reduces config code.

**Applicability to InChronicle**: We could adopt a similar convention (we already partly do with `GITHUB_CLIENT_ID`). But this doesn't solve the "where do the values come from" problem.

---

## Decision Matrix

| Approach | Setup Time | Infra Needed | Solo Dev | Team | Open Source Friendly |
|----------|-----------|--------------|----------|------|---------------------|
| **Manual .env** (current) | ~60 min | None | OK | Bad | Bad |
| **Guided wizard CLI** | ~15 min | None | Good | OK | Good |
| **Secrets manager pull** | ~2 min | Doppler/Infisical | Overkill | Best | N/A (private) |
| **GitHub App manifest** | ~5 min (GitHub only) | None | Good | Good | Great |

### Recommendation for InChronicle

**Phase 1 (now)**: Guided wizard CLI — the Probot/Supabase pattern. No infrastructure needed. Script walks through each provider, collects credentials, writes .env, validates.

**Phase 2 (when team grows)**: Doppler or Infisical for shared secrets. Admin creates OAuth apps once, devs run `doppler run` or `infisical export`.

**Phase 3 (optional)**: GitHub App manifest flow if we migrate from OAuth Apps to GitHub Apps. Enables the slickest developer experience for GitHub specifically.

---

## Key Takeaways

1. **Nobody has solved "one CLI for all providers"** — this is a provider-side limitation, not a tooling gap. Each provider's app creation is a walled garden.

2. **The established pattern is guided wizard + env writer**. Probot is the best reference implementation. Supabase confirms config.toml + env vars is the standard approach.

3. **Secrets manager is the team-scale answer**. Doppler's "2 minutes vs 2 hours" case study is the proof point.

4. **Don't over-engineer the wizard**. The Probot setup flow is ~200 lines total. A guided prompt that collects credentials and writes .env is sufficient.

5. **Microsoft is special** — it's the only provider where `az ad app create` can fully automate app creation. Worth supporting for teams that use Azure.

---

## Sources

- [Probot manifest-creation.ts](https://github.com/probot/probot/blob/master/src/manifest-creation.ts) — GitHub App manifest flow implementation
- [Probot setup.ts](https://github.com/probot/probot/blob/master/src/apps/setup.ts) — Local setup server + env writer
- [RunsOn: GitHub App manifests blog](https://runs-on.com/blog/self-serve-github-app-registration-with-manifests/) — Production manifest flow usage
- [Supabase: Managing config and secrets](https://supabase.com/docs/guides/local-development/managing-config) — config.toml + env() pattern
- [Supabase: Local OAuth discussion #2818](https://github.com/orgs/supabase/discussions/2818) — Community confirms no automation exists
- [Doppler: Accessing secrets CLI](https://docs.doppler.com/docs/accessing-secrets) — `doppler run` pattern
- [Infisical: Export command](https://infisical.com/docs/cli/commands/export) — `infisical export` to .env
- [Auth.js: Configuring OAuth providers](https://authjs.dev/guides/configuring-oauth-providers) — Auto-inference from AUTH_ prefix
- [Microsoft: az ad app create](https://learn.microsoft.com/en-us/cli/azure/ad/app) — Full programmatic app registration
- [Firebase: Programmatic OAuth IdP config](https://firebase.google.com/docs/projects/provisioning/configure-oauth) — REST API for Firebase-hosted IdPs
- [Google oauth2l](https://github.com/google/oauth2l) — Google's OAuth CLI (token usage, not app creation)
- [GitHub: OAuth App creation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) — Manual-only, no API
- [Atlassian: Enable OAuth 2.0 3LO](https://developer.atlassian.com/cloud/oauth/getting-started/enabling-oauth-3lo/) — Manual-only, no API
