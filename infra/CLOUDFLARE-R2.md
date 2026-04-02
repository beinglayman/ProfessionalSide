# Cloudflare R2 — InChronicle File Storage

## Bucket Details

| Field | Value |
|-------|-------|
| Bucket name | `inchronicle-uploads` |
| Custom domain | `uploads.inchronicle.com` |
| S3 endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| SDK | `@aws-sdk/client-s3` (S3-compatible) |

## Setup (Dashboard)

1. `dash.cloudflare.com` → R2 → Create bucket: `inchronicle-uploads`
2. API tokens: My Profile → API Tokens → Create (R2 Read & Write)
3. Custom domain: R2 → bucket → Settings → Custom Domains → `uploads.inchronicle.com`

## Fly.io Secrets

```bash
fly secrets set \
  STORAGE_PROVIDER="r2" \
  R2_ACCOUNT_ID="<your-account-id>" \
  R2_ACCESS_KEY_ID="<api-token-access-key>" \
  R2_SECRET_ACCESS_KEY="<api-token-secret>" \
  R2_BUCKET="inchronicle-uploads" \
  R2_PUBLIC_URL="https://uploads.inchronicle.com" \
  -a inchronicle-api
```

## How It Works

Backend uses `StorageService` interface (`backend/src/services/storage/`):

- `STORAGE_PROVIDER=local` → filesystem (local dev)
- `STORAGE_PROVIDER=r2` → R2 via S3 API (production)

Custom domain is **read-only** (CDN-cached). Uploads go through S3 API endpoint.

### Upload with Cache Headers

```typescript
new PutObjectCommand({
  Bucket: 'inchronicle-uploads',
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
aws s3 sync ./uploads-backup s3://inchronicle-uploads \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com

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
