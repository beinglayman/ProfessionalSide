# Fly.io Backend — InChronicle

## App Details

| Field | Value |
|-------|-------|
| App name | `inchronicle-api` |
| Region | `iad` (Ashburn, Virginia) |
| Hostname | `inchronicle-api.fly.dev` |
| IPv6 | `2a09:8280:1::ef:bd76:0` |
| Shared IPv4 | `66.241.124.57` |
| Image base | `node:18` |
| VM | `shared-cpu-1x`, 512MB RAM |
| Internal port | 3002 |
| Min machines | 1 (auto-stop extras) |
| Machine IDs | `08045e2c0d41e8`, `0805095cd40278` |
| Database | Neon (`ep-sparkling-resonance-ajf3aqs3`) |
| Deployed | 2026-04-02 |
| Status | Running, health OK |

## CLI Setup

```bash
# Install
curl -L https://fly.io/install.sh | sh
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Login
fly auth login
```

## Common Commands

```bash
# Deploy (remote build, no local Docker needed)
cd backend
fly deploy --remote-only

# Status + logs
fly status -a inchronicle-api
fly logs -a inchronicle-api

# Health check
curl https://inchronicle-api.fly.dev/health

# SSH into running machine
fly ssh console -a inchronicle-api

# View machines
fly machine list -a inchronicle-api
```

## Secrets

```bash
# List current secrets
fly secrets list -a inchronicle-api

# Import from .env file
cat .env | fly secrets import -a inchronicle-api

# Set individual secrets
fly secrets set KEY=value -a inchronicle-api

# Unset
fly secrets unset KEY -a inchronicle-api

# Stage without restart (batch multiple changes)
fly secrets set KEY=value --stage -a inchronicle-api
fly secrets deploy -a inchronicle-api
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Neon pooled connection string (with `?sslmode=require&connection_limit=10`) |
| `DIRECT_DATABASE_URL` | Neon direct connection string (for migrations) |
| `JWT_SECRET` | JWT signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `ENCRYPTION_KEY` | OAuth token encryption key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key (Azure OpenAI vars also needed) |
| `FRONTEND_URL` | `https://inchronicle.com` |
| `CORS_ORIGINS` | `https://inchronicle.com,https://www.inchronicle.com` |
| `BACKEND_URL` | `https://inchronicle-api.fly.dev` (Phase 3: `https://api.inchronicle.com`) |
| `STORAGE_PROVIDER` | `r2` (set 2026-04-02) |
| `R2_ACCOUNT_ID` | `da07998400d83f9a3ad8f585d240e247` |
| `R2_ACCESS_KEY_ID` | R2 API token (from CF dashboard) |
| `R2_SECRET_ACCESS_KEY` | R2 API secret (from CF dashboard) |
| `R2_BUCKET` | `ic-uploads-prod` |
| `R2_PUBLIC_URL` | `https://uploads.inchronicle.com` |

## Rollback

```bash
# List releases with images
fly releases --image -a inchronicle-api

# Rollback to specific image
fly deploy --image registry.fly.io/inchronicle-api@sha256:<hash>
```

Note: Rollback reverts the image only, not secrets or config.

## Config

Config lives at `backend/fly.toml`. Key settings:

- **512MB memory** — Node.js + Prisma + tsx + cron jobs OOM on 256MB
- **grace_period = 30s** — startup.sh runs `prisma migrate deploy` before app starts
- **min_machines_running = 1** — prevents cold starts
- **auto_stop_machines = stop** — extras stop when idle
- **Health check**: `GET /health` every 15s

## GitHub Actions Deploy

Workflow at `.github/workflows/deploy-fly.yml`. Triggers on push to `main` when `backend/**` changes.

Requires `FLY_API_TOKEN` GitHub secret:

```bash
fly tokens create deploy -a inchronicle-api -x 999999h
# Add output as GitHub repo secret: FLY_API_TOKEN
```

## Architecture Notes

- **Ephemeral filesystem** — uploads are lost on deploy. Use R2 (`STORAGE_PROVIDER=r2`).
- **SSE/WebSocket** — works out of the box, no special config needed.
- **Database** — connected to Neon PostgreSQL (`ep-sparkling-resonance-ajf3aqs3`, us-east-2, ~10-15ms latency from iad).
- **Startup** — `startup.sh` runs migrations → verifies tables → starts app via `npx tsx src/app.ts`.

## Cost

~$3-5/mo with shared-cpu-1x, 512MB, auto-stop for idle machines.

## Gotchas

- `fly secrets set` restarts all machines — use `--stage` to batch changes
- Bulk import: `cat .env | fly secrets import -a inchronicle-api`
- Dockerfile is in `backend/`, so `fly.toml` must also live in `backend/`
- Node 18 in Dockerfile triggers `EBADENGINE` warnings for `@aws-sdk/*` (requires Node 20) — works fine at runtime, upgrade Dockerfile to `node:20` when ready
