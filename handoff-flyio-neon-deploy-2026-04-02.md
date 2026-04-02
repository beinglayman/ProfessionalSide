# Handoff: Fly.io + Neon Deployment — 2026-04-02

**Branch:** `main` (pushed, clean)
**Session:** Deployed backend to Fly.io, provisioned Neon, wrote infra runbooks, updated all tracking docs.

---

## What Exists Now

### Fly.io Backend — LIVE
- App: `inchronicle-api` | Region: `iad` | Hostname: `inchronicle-api.fly.dev`
- IPv6: `2a09:8280:1::ef:bd76:0` | Shared IPv4: `66.241.124.57`
- Machines: `08045e2c0d41e8` (running), `0805095cd40278` (stopped)
- Config: 512MB shared-cpu-1x, health at `/health` q15s, grace 30s, min 1 machine
- 32 secrets imported from `.env` + production overrides (FRONTEND_URL, CORS_ORIGINS, BACKEND_URL, STORAGE_PROVIDER=local)
- CLI: `~/.fly/bin/flyctl` — add `export PATH="$HOME/.fly/bin:$PATH"` to shell
- Auth: `ketan.khairnar@gmail.com`

### Neon PostgreSQL — LIVE
- Endpoint: `ep-sparkling-resonance-ajf3aqs3` | Region: `us-east-2`
- Database: `neondb` | Role: `neondb_owner`
- Pooler: `ep-sparkling-resonance-ajf3aqs3-pooler.c-3.us-east-2.aws.neon.tech`
- Direct: `ep-sparkling-resonance-ajf3aqs3.c-3.us-east-2.aws.neon.tech`
- 36 Prisma migrations applied. Schema only — no production data yet.
- Password: in Fly.io secrets (`fly secrets list -a inchronicle-api`) and Neon dashboard. Not committed anywhere.
- Health: `curl https://inchronicle-api.fly.dev/health` → `{"status":"OK","database":"connected"}`

### Infrastructure Runbooks — Complete
Six docs in `infra/`: README.md, FLY-IO.md, NEON.md, CLOUDFLARE-PAGES.md, CLOUDFLARE-R2.md, DNS-CUTOVER.md

### Migration Tracking — Updated
- Plan (`docs/superpowers/plans/2026-03-26-azure-to-cloudflare-flyio-migration.md`): 84/129 checkboxes done, status banners on Phase 0 (COMPLETE), Phase 1 (COMPLETE), Phase 2 (IN PROGRESS)
- Diagram (`2026-03-26-migration-diagram.html`): timeline + Phase 2 diagram show Fly.io + Neon as LIVE
- Progress tracker (`2026-03-28-migration-progress.html`): 23/33 tasks done (70%)
- Research (`2026-03-27-migration-research.md`): unchanged, still accurate

### Commits Pushed (6)
```
64b2755 docs: update migration plan + diagram with completion status
8abe8a0 docs: update migration progress tracker — Fly.io + Neon done
b9cfc74 docs: update infra runbooks with provisioned Neon + Fly.io details
d81cce3 fix: add trailing newline to .dockerignore
4b6380e docs: add infrastructure runbooks for cloud migration
b0903ce feat: add Fly.io config for backend deployment
```

---

## What's Left

### Phase 2 — Remaining (3 tasks)

**t2.3: R2 Bucket** (~15 min, dashboard)
- Create bucket `inchronicle-uploads` at `dash.cloudflare.com` → R2
- API token: My Profile → API Tokens → R2 Read & Write
- Custom domain `uploads.inchronicle.com` may need to wait for CF DNS (Phase 3)
- Set secrets: `fly secrets set STORAGE_PROVIDER="r2" R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." R2_SECRET_ACCESS_KEY="..." R2_BUCKET="inchronicle-uploads" R2_PUBLIC_URL="https://uploads.inchronicle.com" -a inchronicle-api`

**t2.5: Cloudflare Pages** (~30 min, dashboard)
- Connect `beinglayman/ProfessionalSide` repo to CF Pages
- Build: `npm run build`, output: `dist`, root: `/`
- Env: `VITE_API_URL=https://api.inchronicle.com/api/v1`, `NODE_VERSION=18`
- Pages Functions + `_routes.json` already committed

**t2.7: OAuth URIs** (manual, 7 provider dashboards)
- Microsoft FIRST (24hr propagation). Full table in `infra/DNS-CUTOVER.md`.
- GitHub: create second OAuth App (1 callback URL limit per app)
- Zoom: update BOTH redirect URL AND allowlist
- Also: Razorpay webhook URL

**FLY_API_TOKEN** — not yet created. Run `fly tokens create deploy -a inchronicle-api -x 999999h`, add as GitHub repo secret.

### Phase 3 — Cutover (not started)
1. **t3.0**: NS → Cloudflare (soak 1 week, verify email)
2. **t3.1a**: Final data sync (pg_dump Azure → Neon, Azure Files → R2, update avatar URLs)
3. **t3.1b**: Fix `VITE_API_URL` GitHub secret (missing `/api/v1` suffix — caused 2026-03-28 incident, guard in `src/lib/api.ts`)
4. **t3.1c**: DNS cutover (CNAME @→Pages, api→Fly.io, uploads→R2)
5. **t3.1d**: Smoke test (homepage, login, API, uploads, OG tags, OAuth)
6. **t3.2**: Disable Azure deploy workflows
7. **t3.3**: Decommission Azure (+2 weeks)

---

## Gotchas & Pitfalls

| Pitfall | What happened | Avoid by |
|---------|--------------|----------|
| Fly.io billing page broken | "Continue" button dead in Chrome | Use incognito mode |
| `fly launch` provisions unwanted DBs | Auto-created Postgres, Redis, Tigris | Destroy immediately after launch |
| `fly launch` installs `@flydotio/dockerfile` | Added to node_modules | `npm uninstall` — it wasn't in package.json |
| psql env var expansion | `DIRECT_DATABASE_URL="..." psql "$VAR"` connected to localhost | Inline the URL directly |
| `fly secrets import` syntax | Reads stdin, not file arg | `cat .env \| fly secrets import -a ...` |
| REDIS_URL auto-set | Provisioned Redis set it | `fly secrets unset REDIS_URL` after destroying Redis |
| Health returns 200 even when DEGRADED | HTTP status is always 200, body has status field | GH Actions workflow checks HTTP code — works correctly |
| `channel_binding=require` in Neon URLs | Neon adds by default | Dropped from Fly.io secrets, using `sslmode=require` only |

---

## Known Issues

1. **VITE_API_URL secret** missing `/api/v1` — production incident 2026-03-28 (commit `3cbbfdd`). Guard in `src/lib/api.ts` protects prod. Fix secret BEFORE removing guard. (t3.1b)
2. **Node 18 Dockerfile** → `EBADENGINE` warnings for `@aws-sdk/*` (needs Node 20). Works at runtime. Upgrade when ready.
3. **No production data in Neon** — schema only. pg_dump → pg_restore at cutover. (t3.1a)
4. **Neon free tier** — 0.5 GiB storage, autosuspends after 5 min. Upgrade to Launch ($19/mo) when needed.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| 512MB not 256MB | Node + Prisma + tsx + cron OOM on 256 |
| min_machines=1 | No cold starts, ~$3/mo floor |
| grace_period=30s | startup.sh runs `prisma migrate deploy` |
| STORAGE_PROVIDER=local | Temporary until R2 bucket exists |
| API DNS: grey cloud (DNS-only) | Fly.io handles TLS. Proxy later for WAF |
| Neon free tier | Upgrade when >0.5 GiB or need always-on |

---

## Key Files

| Purpose | Path |
|---------|------|
| Migration plan | `docs/superpowers/plans/2026-03-26-azure-to-cloudflare-flyio-migration.md` |
| Research | `docs/superpowers/plans/2026-03-27-migration-research.md` |
| Diagram | `docs/superpowers/plans/2026-03-26-migration-diagram.html` |
| Progress tracker | `docs/superpowers/plans/2026-03-28-migration-progress.html` |
| Infra runbooks | `infra/README.md`, `FLY-IO.md`, `NEON.md`, `CLOUDFLARE-PAGES.md`, `CLOUDFLARE-R2.md`, `DNS-CUTOVER.md` |
| Fly.io config | `backend/fly.toml` |
| GH Actions deploy | `.github/workflows/deploy-fly.yml` |
| Dockerfile | `backend/Dockerfile` |
| Startup script | `backend/startup.sh` |

---

## Next Action

**R2 bucket** (t2.3) — dashboard task, ~15 min. Then CF Pages (t2.5), then OAuth URIs (t2.7).
