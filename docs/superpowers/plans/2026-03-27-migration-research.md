# Migration Research — Actionable Coordinates

> Pre-execution research for `2026-03-26-azure-to-cloudflare-flyio-migration.md`.
> Every section contains exact commands, config, and known gotchas so execution is copy-paste, not discovery.

---

## Table of Contents

1. [Fly.io Backend Setup](#1-flyio-backend-setup)
2. [Cloudflare Pages + R2](#2-cloudflare-pages--r2)
3. [Neon PostgreSQL](#3-neon-postgresql)
4. [OAuth Redirect URIs](#4-oauth-redirect-uris)
5. [DNS Cutover Playbook](#5-dns-cutover-playbook)
6. [Plan Updates from Research](#6-plan-updates-from-research)

---

## 1. Fly.io Backend Setup

### First Deploy Sequence

```bash
cd backend

# 1. Create app (generates fly.toml, no deploy)
fly launch --no-deploy --name inchronicle-api --region iad

# 2. Edit fly.toml (see config below)

# 3. Set all secrets (one command)
fly secrets set \
  DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require&connection_limit=10" \
  DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  JWT_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  ENCRYPTION_KEY="..." \
  ANTHROPIC_API_KEY="sk-ant-..." \
  OPENAI_API_KEY="sk-..." \
  FRONTEND_URL="https://inchronicle.com" \
  CORS_ORIGINS="https://inchronicle.com,https://www.inchronicle.com" \
  BACKEND_URL="https://inchronicle-api.fly.dev" \
  STORAGE_PROVIDER="r2" \
  R2_ACCOUNT_ID="..." \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  R2_BUCKET="inchronicle-uploads" \
  R2_PUBLIC_URL="https://uploads.inchronicle.com" \
  -a inchronicle-api

# 4. Deploy (remote build — no local Docker needed)
fly deploy --remote-only

# 5. Verify
fly status -a inchronicle-api
curl https://inchronicle-api.fly.dev/health
```

### fly.toml (place in `backend/fly.toml`)

```toml
app = 'inchronicle-api'
primary_region = 'iad'

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3002"

[http_service]
  internal_port = 3002
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    interval = "15s"
    timeout = "5s"
    grace_period = "30s"
    method = "GET"
    path = "/health"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

**Key decisions:**
- **512MB memory** (not 256MB) — Node.js + Prisma + tsx + cron jobs + LLM calls will OOM on 256MB
- **`grace_period = "30s"`** — startup.sh runs `prisma migrate deploy` before app starts
- **`min_machines_running = 1`** — prevents cold starts for first user
- **Cost: ~$3-5/mo** with auto-stop for extras

### GitHub Actions Deploy

```yaml
name: Deploy Backend to Fly.io
on:
  push:
    branches: [main]
    paths: ['backend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Create deploy token:**
```bash
fly tokens create deploy -a inchronicle-api -x 999999h
# Add output as GitHub secret FLY_API_TOKEN
```

### Rollback

```bash
fly releases --image -a inchronicle-api           # list releases
fly deploy --image registry.fly.io/inchronicle-api@sha256:<hash>  # rollback
```

Note: Rollback reverts image only, not secrets/config.

### WebSocket / SSE

Works out of the box. No special config. SSE connections keep the machine alive (correct behavior).

### Gotchas

- **Ephemeral filesystem** — uploads WILL be lost on deploy. S3/R2 migration is mandatory.
- **`fly secrets set` restarts all machines** — use `--stage` to defer restart
- **Bulk secret import:** `cat .env.production | fly secrets import -a inchronicle-api`
- **Logs:** `fly logs -a inchronicle-api` (real-time streaming)
- **Metrics:** `fly dashboard metrics -a inchronicle-api` or `fly-metrics.net`

---

## 2. Cloudflare Pages + R2

### Pages Setup (Dashboard)

1. `dash.cloudflare.com` → Workers & Pages → Create → Pages → Connect to Git
2. Select `beinglayman/ProfessionalSide`
3. Build config:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `/` (default)
4. Environment variables:
   - Production: `VITE_API_URL=https://api.inchronicle.com/api/v1`, `NODE_VERSION=18`
   - Preview: same (or staging URL)

### Pages Functions — USE FILE-BASED ROUTING (not catch-all)

**Research finding:** Don't use `functions/[[path]].ts` catch-all. Use file-per-route:

```
functions/
  p/
    [shortCode].ts      # matches /p/:shortCode
  [slug].ts             # matches /:slug
```

### USE HTMLRewriter (not string .replace())

**Research finding:** Workers runtime has `HTMLRewriter` — a streaming HTML parser. Zero dependencies, handles edge cases string replacement misses.

```typescript
// Instead of: html.replace('</head>', `${ogTags}\n</head>`)
// Use:
return new HTMLRewriter()
  .on('head', {
    element(el) {
      el.append(ogTags, { html: true });
    },
  })
  .transform(response);
```

### Critical: `_routes.json`

Create `public/_routes.json` (Vite copies to `dist/`) to prevent EVERY request from invoking a Function:

```json
{
  "version": 1,
  "include": ["/p/*", "/*"],
  "exclude": [
    "/assets/*", "/favicon.ico", "/robots.txt",
    "/*.js", "/*.css", "/*.svg", "/*.png", "/*.jpg", "/*.ico"
  ]
}
```

Without this, static asset requests burn your free 100k/day Function quota.

### Pragma Link Function: `functions/p/[shortCode].ts`

```typescript
interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string;
  BASE_URL: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env, request } = context;
  const shortCode = params.shortCode as string;

  if (!/^[a-hjkmnp-z2-9]{8}$/.test(shortCode)) {
    return env.ASSETS.fetch(request);
  }

  try {
    const apiRes = await fetch(`${env.API_ORIGIN}/api/v1/pragma/resolve/${shortCode}`);
    if (!apiRes.ok) return env.ASSETS.fetch(request);

    const body = await apiRes.json() as any;
    if (!body.success || !body.data) return env.ASSETS.fetch(request);

    const { content, author } = body.data;
    const firstSection = Object.values(content.sections || {})[0] as any;
    const desc = (firstSection?.summary || '').slice(0, 160);

    const ogTags = `
      <title>${esc(content.title)} | inchronicle</title>
      <meta property="og:title" content="${esc(`${content.title} — ${author.name}`)}" />
      <meta property="og:description" content="${esc(desc)}" />
      <meta property="og:url" content="${esc(`${env.BASE_URL}/p/${shortCode}`)}" />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary" />
      <meta name="robots" content="noindex, nofollow">`;

    const assetRes = await env.ASSETS.fetch(new Request(new URL('/', request.url)));

    return new HTMLRewriter()
      .on('head', { element(el) { el.append(ogTags, { html: true }); } })
      .transform(new Response(assetRes.body, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300',
          'Referrer-Policy': 'no-referrer',
        },
      }));
  } catch {
    return env.ASSETS.fetch(request);
  }
};
```

### SPA Routing

**Automatic.** If no `404.html` exists in `dist/`, Pages serves `index.html` for all unmatched routes. **Do NOT create a 404.html file.**

### Function Environment Bindings

Set via Dashboard → Settings → Environment Variables (separate Production/Preview):
- `API_ORIGIN` = `https://api.inchronicle.com` (bare origin, no path)
- `BASE_URL` = `https://inchronicle.com`

Or via `wrangler.toml`:
```toml
name = "inchronicle"
pages_build_output_dir = "dist"

[vars]
API_ORIGIN = "https://api.inchronicle.com"
BASE_URL = "https://inchronicle.com"
```

### R2 Setup

1. Dashboard → R2 → Create bucket: `inchronicle-uploads`
2. API tokens: My Profile → API Tokens → Create (R2 Read & Write)
3. Custom domain: R2 → bucket → Settings → Custom Domains → `uploads.inchronicle.com`
4. S3 endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

**Custom domain is READ-ONLY.** Uploads go through S3 API endpoint. Reads served via `uploads.inchronicle.com` with Cloudflare CDN caching.

**Set cache headers at upload time:**
```typescript
new PutObjectCommand({
  Bucket: 'inchronicle-uploads',
  Key: key,
  Body: buffer,
  ContentType: contentType,
  CacheControl: 'public, max-age=31536000, immutable', // for hashed filenames
});
```

### R2 Pricing

| Component | Free | Paid overage |
|---|---|---|
| Storage | 10 GB/mo | $0.015/GB |
| Writes (Class A) | 1M/mo | $4.50/M |
| Reads (Class B) | 10M/mo | $0.36/M |
| **Egress** | **Free always** | **$0** |

### Workers Runtime Gotchas

| API | Available? | Notes |
|---|---|---|
| `fetch()` | Yes | Standard Web fetch |
| `HTMLRewriter` | Yes | Built-in, streaming |
| `Buffer` | Yes | With `nodejs_compat` flag |
| `fs.readFileSync` | **No** | Use `env.ASSETS.fetch()` |
| `process.env` | **No** | Use `env` from context |
| `express` | **No** | Not Node.js runtime |

### Free Plan Limits (sufficient for current stage)

- Builds: 500/month
- Function invocations: 100,000/day
- Bandwidth: Unlimited
- Static requests: Unlimited
- Custom domains: 100/project

---

## 3. Neon PostgreSQL

### Project Setup

1. Go to `console.neon.tech` → Create project
2. Name: `inchronicle`
3. Region: **US East (Ohio)** — `us-east-2` — closest to Fly.io `iad` (Virginia), ~10-15ms latency
4. PostgreSQL version: 15 (matches current Azure setup)
5. Default branch: `main`

### Connection Strings (CRITICAL)

Neon provides TWO hostnames per branch. The `-pooler` suffix is the key difference:

**Pooled (PgBouncer) — for runtime queries:**
```
postgresql://user:pass@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require&connection_limit=10
```

**Direct — for migrations (DDL):**
```
postgresql://user:pass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/inchronicle?sslmode=require
```

### Prisma Schema Change (REQUIRED)

Add `directUrl` to `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")           // pooled — runtime queries
  directUrl = env("DIRECT_DATABASE_URL")     // direct — migrations + introspection
}
```

**Why:** Your `startup.sh` runs `prisma migrate deploy` on every boot. Without `directUrl`, migrations go through PgBouncer which doesn't support advisory locks or temporary tables that Prisma migrations need. With `directUrl`, Prisma automatically uses the direct connection for migrations and the pooled connection for runtime queries.

**This is a code change that should ship in Phase 1** (before migration) since it's backward-compatible — if `DIRECT_DATABASE_URL` is not set, Prisma falls back to `DATABASE_URL` for everything.

### Data Migration from Azure

```bash
# 1. Export from Azure (custom format for selective restore)
pg_dump "postgresql://psadmin:PASS@ps-postgres-server.postgres.database.azure.com:5432/inchronicle?sslmode=require" \
  --no-owner --no-acl -Fc -f backup.dump

# 2. Check dump size (must fit Neon free tier: 0.5 GiB)
ls -lh backup.dump

# 3. Run Prisma migrations on Neon first (creates schema)
cd backend
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  npx prisma migrate deploy

# 4. Import data only (uses direct connection, not pooled)
pg_restore --data-only --no-owner --no-acl \
  -d "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  backup.dump

# 5. Verify row counts
psql "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  -c "SELECT 'users', count(*) FROM users UNION ALL
      SELECT 'career_stories', count(*) FROM career_stories UNION ALL
      SELECT 'journal_entries', count(*) FROM journal_entries UNION ALL
      SELECT 'workspace_members', count(*) FROM workspace_members;"
```

**Sequences:** `pg_restore --data-only` includes `setval()` calls that correctly reset auto-increment sequences. No manual intervention needed.

### `@prisma/adapter-neon` — NOT Needed

This adapter is only needed for edge runtimes (Cloudflare Workers, Vercel Edge). For Node.js on Fly.io, the standard Prisma client works fine with the pooled connection string.

### Connection Pooling

- Neon's built-in PgBouncer supports up to 10,000 concurrent connections
- Prisma's default pool: 5 connections. Set `connection_limit=10` in `DATABASE_URL` for headroom with cron jobs + API
- No need for Prisma Accelerate or separate PgBouncer

### Cold Start (Autosuspend)

- Neon autosuspends compute after **5 minutes** of inactivity (free tier, configurable on paid)
- First query after suspend takes **0.5-2 seconds** to wake
- With `min_machines_running=1` on Fly.io keeping traffic flowing, health checks hit the DB regularly — Neon rarely suspends in practice
- If it does suspend: first user request takes ~2s extra. Subsequent requests are normal.

### SSL

`sslmode=require` in the connection string. No certificate pinning needed. Neon uses publicly trusted certificates.

### Free Tier Limits

| Resource | Free Allowance |
|---|---|
| Storage | 0.5 GiB |
| Compute hours | 191.9 hours/month (~6.4 hrs/day) |
| Branches | 10 |
| Projects | 1 |
| Autosuspend | After 5 min idle |

**When you'd upgrade to Launch ($19/mo):** If storage exceeds 0.5 GiB or you need always-on compute (no cold starts).

### Monitoring

- Neon dashboard → Monitoring tab: active connections, compute usage, storage
- Query statistics available in the dashboard
- Connection count visible per branch

### Gotchas

- **Check Azure DB size first:** `pg_dump` output must fit in 0.5 GiB on Neon free tier. Run `SELECT pg_database_size('inchronicle');` on Azure to check.
- **PgBouncer + prepared statements:** Neon's PgBouncer runs in transaction mode. Prisma handles this correctly with the pooled connection. If you see "prepared statement already exists" errors, add `&pgbouncer=true` to `DATABASE_URL`.
- **Extensions:** Check `SELECT * FROM pg_extension;` on Azure. Neon supports most common extensions (uuid-ossp, pgcrypto, etc.) but not all. Verify before migration.
- **Encrypted OAuth tokens survive:** Tokens encrypted with `ENCRYPTION_KEY` are just byte strings in the DB. As long as the same `ENCRYPTION_KEY` is used in Fly.io, they decrypt correctly. No re-encryption needed.

---

## 4. OAuth Redirect URIs

### Summary: 13 New URIs Across 7 Providers

All prefixed with `https://api.inchronicle.com/api/v1/mcp/callback/`

| Provider | URIs | Multi-URI? | Propagation | Dashboard |
|---|---|---|---|---|
| **GitHub** | `/github` | **NO — 1 only** | Instant | github.com → Settings → Developer settings → OAuth Apps |
| **Atlassian** | `/jira`, `/confluence`, `/atlassian` | Yes | Instant | developer.atlassian.com → My Apps → Authorization |
| **Google** | `/google_workspace` | Yes | 5min-few hrs | console.cloud.google.com → APIs → Credentials |
| **Microsoft** | `/outlook`, `/teams`, `/onedrive`, `/onenote`, `/microsoft` | Yes (256 max) | **Up to 24hrs** | portal.azure.com → App registrations → Authentication |
| **Figma** | `/figma` | Yes | Instant | figma.com → Developer settings |
| **Slack** | `/slack` | Yes | Instant | api.slack.com → Your Apps → OAuth & Permissions |
| **Zoom** | `/zoom` | Yes | Instant | marketplace.zoom.us → Manage → OAuth |

### Critical: Execution Order

**Day -1 (24hrs before cutover):**
1. **Microsoft** — add all 5 URIs. Can take 24hrs to propagate.
2. **Google** — add 1 URI. Can take a few hours.

**Day 0 (cutover day, hours before):**
3. Atlassian — 3 URIs (instant)
4. Slack — 1 URI (instant)
5. Figma — 1 URI (instant)
6. Zoom — 1 URI + add to allowlist (instant)

**At cutover time:**
7. **GitHub** — only supports 1 callback URL. **Create a second OAuth App** with the new URL. Update Fly.io env to use new app credentials. This is zero-downtime. Delete old app after 2 weeks.

**Post-cutover:**
8. Set `BACKEND_URL=https://api.inchronicle.com` on Fly.io → all providers auto-construct correct URIs.

### GitHub Workaround (critical)

GitHub OAuth Apps support only ONE callback URL. Options:
- **Option A (recommended):** Create second GitHub OAuth App with new URL. Run both during transition. Delete old after 2 weeks.
- **Option B:** Atomic swap — change URL and `BACKEND_URL` simultaneously. ~30s of broken GitHub OAuth.

### Zoom Gotcha

Update BOTH "Redirect URL for OAuth" AND "Allow List" — updating only one causes failures.

### Testing Strategy

Test with `inchronicle-api.fly.dev` domain before custom domain:
1. Temporarily register `fly.dev` callback URLs
2. Set `BACKEND_URL=https://inchronicle-api.fly.dev`
3. Test OAuth flows from local frontend (`VITE_API_URL=https://inchronicle-api.fly.dev/api/v1`)
4. After custom domain works, switch to `api.inchronicle.com` URLs

### Code Files

Redirect URIs are centralized — changing `BACKEND_URL` env var fixes all providers:
- `backend/src/services/mcp/oauth-provider-contract.ts` — `getBackendUrl()` reads `BACKEND_URL`
- `backend/src/services/mcp/mcp-oauth.service.ts` — builds all redirect URIs from contract
- Note: Figma, Slack, Zoom hardcode `process.env.BACKEND_URL || 'http://localhost:3002'` directly (same result but inconsistent with contract pattern)

---

## 5. DNS Cutover Playbook

### Pre-Cutover: Snapshot Current DNS

```bash
dig inchronicle.com A +short
dig inchronicle.com AAAA +short
dig inchronicle.com MX +short
dig inchronicle.com TXT +short
dig www.inchronicle.com CNAME +short
dig _dmarc.inchronicle.com TXT +short
dig selector1._domainkey.inchronicle.com CNAME +short
dig selector2._domainkey.inchronicle.com CNAME +short
```

Save all output. Compare after migration.

### Recommended: Separate Nameserver Migration from Traffic Cutover

**Week 1:** Move nameservers to Cloudflare. Keep all records pointing to Azure. Verify email + site work through Cloudflare proxy.

**Week 2:** Change Cloudflare records to point to Pages/Fly/R2. This is the actual cutover.

This separates two risky changes and gives you a stable Cloudflare DNS baseline before switching traffic.

### T-48h: Lower TTLs

On current DNS (or Cloudflare if already migrated):
```
A record @         → TTL 60
CNAME www          → TTL 60
# Leave MX, TXT records alone
```

### T-0: Execute Cutover (Cloudflare Dashboard)

| Type | Name | Value | Proxy | TTL |
|---|---|---|---|---|
| CNAME | @ | `your-project.pages.dev` | Proxied (orange) | Auto |
| CNAME | www | `your-project.pages.dev` | Proxied (orange) | Auto |
| CNAME | api | `inchronicle-api.fly.dev` | DNS only (grey) | 60 |
| CNAME | uploads | (auto-managed by R2 custom domain) | Proxied | Auto |

**Proxied records take effect in SECONDS.** DNS-only records depend on TTL (60s if you lowered it).

### T+5m: Verify

```bash
curl -sI https://inchronicle.com | grep cf-ray    # confirms Cloudflare
curl -sI https://www.inchronicle.com               # should 301 → non-www
curl https://api.inchronicle.com/health             # should 200
curl -sI https://uploads.inchronicle.com/test.txt   # should 200
```

### T+24h: Raise TTLs

```
api CNAME → TTL 3600
```

### Rollback

Change records back to Azure values. Effect is instant for proxied records, ≤60s for DNS-only. **Azure must still be running.**

### www → non-www Redirect

Dashboard → Rules → Redirect Rules:
- When: Hostname equals `www.inchronicle.com`
- Then: Dynamic redirect to `concat("https://inchronicle.com", http.request.uri.path)`
- Status: 301

Also need a CNAME for `www` → `your-project.pages.dev` (proxied) so Cloudflare can intercept.

### API DNS: Start with DNS-only (grey cloud)

- Simpler: Fly.io handles TLS via Let's Encrypt directly
- Switch to proxied later if you want Cloudflare WAF/DDoS protection
- If proxied: backend sees Cloudflare IPs, use `CF-Connecting-IP` header for real client IP

### Final DNS State

| Type | Name | Value | Proxy | TTL |
|---|---|---|---|---|
| CNAME | @ | your-project.pages.dev | Proxied | Auto |
| CNAME | www | your-project.pages.dev | Proxied | Auto |
| CNAME | api | inchronicle-api.fly.dev | DNS only | 3600 |
| CNAME | uploads | (R2 managed) | Proxied | Auto |
| MX | @ | (unchanged) | N/A | 3600 |
| TXT | @ | SPF record (unchanged) | N/A | Auto |
| TXT | _dmarc | DMARC record (unchanged) | N/A | Auto |
| CNAME | selector1._domainkey | (DKIM, unchanged, DNS only) | DNS only | Auto |

### Edge Cases

- **Email (MX):** Never proxied by Cloudflare. Preserved as-is. Test after nameserver change.
- **DKIM CNAMEs:** Must be DNS-only (grey cloud). Proxying breaks DKIM.
- **In-flight requests:** TCP connections survive DNS changes. Only new connections route differently.
- **Mobile DNS caching:** Some clients cache 10+ min. Force-close app clears cache.

### Azure Decommissioning (T+2w)

```bash
# Verify zero traffic first
az monitor metrics list --resource "..." --metric "Requests" --interval PT1H

# Remove custom domain
az webapp config hostname delete --webapp-name <name> --resource-group ps-prod-rg --hostname inchronicle.com

# Delete everything
az group delete --name ps-prod-rg --yes --no-wait
```

---

## 6. Plan Updates from Research

Research revealed several improvements to the original plan:

### Must-Fix Before Execution

| Finding | Impact | Plan Update |
|---|---|---|
| **Pages Functions: use file-based routing** not `[[path]].ts` catch-all | Better routing, clearer code | Update Task 2.4 — create `functions/p/[shortCode].ts` + `functions/[slug].ts` |
| **Use `HTMLRewriter`** not string `.replace()` | Streaming, handles edge cases | Update Task 2.4 code |
| **Add `_routes.json`** to exclude static assets from Functions | Without it, every request burns Function quota | Add to Task 2.4 |
| **fly.toml in `backend/`** not project root | Fly.io needs build context in backend dir | Update Task 2.2 — `fly.toml` lives at `backend/fly.toml` |
| **512MB memory** not default 256MB | Node+Prisma+tsx OOMs on 256MB | Update Task 2.2 fly.toml |
| **GitHub OAuth: create second app** | Only supports 1 callback URL | Update Task 2.7 with dual-app strategy |
| **Zoom: update BOTH redirect URL + allowlist** | Updating only one breaks flow | Note in Task 2.7 |
| **Prisma schema: add `directUrl`** | Required for migrations through PgBouncer | Add to Task 2.1 or Phase 1 prep |
| **`wrangler.toml`** for Function bindings | Needed for `API_ORIGIN` and `BASE_URL` | Add to Task 2.4 |
| **Separate nameserver migration from traffic cutover** | Reduces risk by separating two changes | Update Task 3.1 timeline |

### Nice-to-Have

- Add `public/_headers` for cache-control on static assets
- Consider `nodejs_compat` flag if Functions need `Buffer`
- `fly secrets import` for bulk secret loading from `.env` file
- Wrangler local dev: `npx wrangler pages dev -- npm run dev` for testing Functions locally
