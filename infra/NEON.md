# Neon PostgreSQL — InChronicle

## Project Details

| Field | Value |
|-------|-------|
| Console | `console.neon.tech` |
| Project name | `inchronicle` |
| Region | **US East (Ohio)** — `us-east-2` (~10-15ms from Fly.io `iad`) |
| PostgreSQL version | 15 |
| Plan | Launch ($19/mo) — 10 GiB storage, always-on compute |
| Default branch | `main` |

## Connection Strings

Neon provides **two hostnames** per branch. The `-pooler` suffix is the key difference:

```bash
# Pooled (PgBouncer) — for runtime queries
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require&connection_limit=10"

# Direct — for migrations and introspection (DDL)
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require"
```

Both are set as Fly.io secrets. Prisma uses `DATABASE_URL` for runtime and `DIRECT_DATABASE_URL` for migrations (configured in `backend/prisma/schema.prisma`).

## Provisioning

```bash
# 1. Create project at console.neon.tech
#    Name: inchronicle, Region: US East (Ohio), PG 15

# 2. Run Prisma migrations on Neon (creates schema)
cd backend
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  npx prisma migrate deploy

# 3. Export from Azure
pg_dump "postgresql://psadmin:PASS@ps-postgres-server.postgres.database.azure.com:5432/inchronicle?sslmode=require" \
  --no-owner --no-acl -Fc -f backup.dump

# 4. Import data only (direct connection, not pooled)
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

## Prisma Schema Requirement

`backend/prisma/schema.prisma` must have `directUrl`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")           // pooled — runtime
  directUrl = env("DIRECT_DATABASE_URL")     // direct — migrations
}
```

This is backward-compatible — if `DIRECT_DATABASE_URL` is unset, Prisma falls back to `DATABASE_URL`.

## Update Fly.io Secrets

```bash
fly secrets set \
  DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require&connection_limit=10" \
  DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  -a inchronicle-api
```

## Monitoring

- Dashboard: `console.neon.tech` → Project → Monitoring tab
- Active connections, compute usage, storage visible per branch
- Query statistics available in dashboard

## Free Tier vs Launch Plan

| Resource | Free | Launch ($19/mo) |
|----------|------|-----------------|
| Storage | 0.5 GiB | 10 GiB |
| Compute | 191.9 hrs/mo (~6.4 hrs/day) | Always-on (no cold starts) |
| Branches | 10 | 10 |
| Autosuspend | After 5 min idle | Configurable / disabled |

## Gotchas

- **Check Azure DB size first**: `SELECT pg_database_size('inchronicle');` — must fit Neon storage limit
- **PgBouncer + prepared statements**: If you see "prepared statement already exists", add `&pgbouncer=true` to `DATABASE_URL`
- **No `@prisma/adapter-neon` needed**: That's for edge runtimes (Workers, Vercel Edge). Standard Prisma client works on Fly.io (Node.js)
- **Encrypted OAuth tokens survive**: Same `ENCRYPTION_KEY` on Fly.io = tokens decrypt correctly. No re-encryption needed
- **Sequences**: `pg_restore --data-only` includes `setval()` calls — auto-increment resets correctly
- **SSL**: `sslmode=require` in connection string. No certificate pinning needed
- **Cold starts (free tier)**: First query after suspend takes 0.5-2s. With `min_machines_running=1` on Fly.io, health checks keep Neon awake in practice
