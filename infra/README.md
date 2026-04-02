# InChronicle Infrastructure

## Architecture

```
                    Cloudflare DNS
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   Cloudflare Pages   Fly.io      Cloudflare R2
   inchronicle.com    api.inchronicle.com  uploads.inchronicle.com
   (frontend)         (backend)    (file storage)
                         │
                         ▼
                    Neon PostgreSQL
                    (us-east-2)
```

## Services

| Service | Purpose | Cost | Doc |
|---------|---------|------|-----|
| [Cloudflare Pages](CLOUDFLARE-PAGES.md) | Frontend hosting + edge SSR | Free | Setup, Functions, DNS |
| [Fly.io](FLY-IO.md) | Backend (Express, Docker) | ~$3-5/mo | Deploy, secrets, rollback |
| [Neon](NEON.md) | PostgreSQL database | $19/mo (Launch) | Provisioning, migration, Prisma |
| [Cloudflare R2](CLOUDFLARE-R2.md) | File uploads (S3-compatible) | ~$1/mo | Bucket, SDK, pricing |
| [DNS Cutover](DNS-CUTOVER.md) | Migration playbook | — | Step-by-step, OAuth, rollback |

**Total: ~$24/mo** (down from ~$50-65/mo on Azure)

## Quick Reference

```bash
# Backend deploy
cd backend && fly deploy --remote-only

# Backend logs
fly logs -a inchronicle-api

# Backend health
curl https://inchronicle-api.fly.dev/health

# Backend secrets
fly secrets list -a inchronicle-api

# Backend SSH
fly ssh console -a inchronicle-api
```

## Migration Progress

See [progress tracker](../docs/superpowers/plans/2026-03-28-migration-progress.html) for current status.

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | Done | DX fixes (dev:all, ports, BASE_URL) |
| Phase 1 | Done | Storage abstraction (StorageService interface) |
| Phase 2 | **Active** | Parallel environments (Fly.io + Neon deployed, R2 + Pages pending) |
| Phase 3 | Pending | DNS cutover + Azure decommission |

## Legacy (Azure)

- `azure-provision.sh` — original Azure provisioning script (kept for reference)
- `.env.example` — Azure infra config template
