# Cloudflare R2 — InChronicle File Storage

## Bucket Details

| Field | Value |
|-------|-------|
| Bucket name | `ic-uploads-prod` |
| Account ID | `da07998400d83f9a3ad8f585d240e247` |
| Custom domain | `uploads.inchronicle.com` (after DNS on Cloudflare) |
| S3 endpoint | `https://da07998400d83f9a3ad8f585d240e247.r2.cloudflarestorage.com` |
| SDK | `@aws-sdk/client-s3` (S3-compatible) |
| API token name | `ic-uploads-prod-rw` (Object Read & Write, scoped to bucket) |
| Provisioned | 2026-04-02 via `infra/cloudflare-provision.sh` |
| Fly.io secrets | Set — `STORAGE_PROVIDER=r2`, all R2 vars configured |
| Naming convention | `ic-<purpose>-<env>` (e.g., `ic-uploads-prod`, `ic-uploads-staging`) |

## Setup (Dashboard)

Automated via `infra/cloudflare-provision.sh`:
```bash
./infra/cloudflare-provision.sh             # prod (default)
ENV=staging ./infra/cloudflare-provision.sh  # staging
```

Manual step (API token — Wrangler can't create these):
1. Go to `dash.cloudflare.com/<ACCOUNT_ID>/r2/api-tokens`
2. Create token: Object Read & Write, scoped to bucket
3. Custom domain: R2 → bucket → Settings → Custom Domains → `uploads.inchronicle.com` (after DNS on Cloudflare)

## Fly.io Secrets

```bash
# Already set on 2026-04-02. To update:
fly secrets set \
  STORAGE_PROVIDER="r2" \
  R2_ACCOUNT_ID="da07998400d83f9a3ad8f585d240e247" \
  R2_ACCESS_KEY_ID="<from-dashboard>" \
  R2_SECRET_ACCESS_KEY="<from-dashboard>" \
  R2_BUCKET="ic-uploads-prod" \
  R2_PUBLIC_URL="https://uploads.inchronicle.com" \
  -a inchronicle-api
```

> Access Key ID and Secret are in Fly.io secrets and `backend/.env` (gitignored). Token name: `ic-uploads-prod-rw`.

## How It Works

Backend uses `StorageService` interface (`backend/src/services/storage/`):

- `STORAGE_PROVIDER=local` → filesystem (local dev)
- `STORAGE_PROVIDER=r2` → R2 via S3 API (production)

Custom domain is **read-only** (CDN-cached). Uploads go through S3 API endpoint.

### Upload with Cache Headers

```typescript
new PutObjectCommand({
  Bucket: 'ic-uploads-prod',
  Key: key,
  Body: buffer,
  ContentType: contentType,
  CacheControl: 'public, max-age=31536000, immutable', // hashed filenames
});
```

## DNS Record

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| CNAME | uploads | (auto-managed by R2 custom domain) | Proxied | Auto |

## Data Migration from Azure Files

```bash
# Download from Azure
az storage file download-batch \
  --destination ./uploads-backup \
  --source uploads \
  --account-name psstorage1758551070

# Upload to R2 (using rclone or aws cli with R2 endpoint)
aws s3 sync ./uploads-backup s3://ic-uploads-prod \
  --endpoint-url https://da07998400d83f9a3ad8f585d240e247.r2.cloudflarestorage.com

# Update avatar URLs in database (Azure Files → R2)
# Run a migration script to replace old URLs with uploads.inchronicle.com paths
```

## Pricing

| Component | Free Tier | Paid Overage |
|-----------|-----------|--------------|
| Storage | 10 GB/mo | $0.015/GB |
| Writes (Class A) | 1M/mo | $4.50/M |
| Reads (Class B) | 10M/mo | $0.36/M |
| **Egress** | **Free always** | **$0** |

## Gotchas

- Custom domain is read-only — uploads go through S3 API endpoint, not the domain
- R2 is S3-compatible but not 100% — some advanced S3 features may not work
- No server-side encryption config needed — R2 encrypts at rest by default
