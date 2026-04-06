# DNS Cutover Playbook

## Current State (as of 2026-03-27)

| Record | Name | Value | Notes |
|--------|------|-------|-------|
| NS | @ | `launch1.spaceship.net` / `launch2.spaceship.net` | Spaceship registrar |
| A | @ | `20.119.0.51` | Azure App Service |
| CNAME | www | `ps-frontend-1758551070.azurewebsites.net` | Azure |
| MX | @ | `0 inchronicle-com.mail.protection.outlook.com` | **Microsoft 365 — CRITICAL** |
| TXT | @ | `v=spf1 include:spf.protection.outlook.com -all` | **SPF — CRITICAL** |
| TXT | @ | `MS=ms35993909` | Microsoft verification |
| TXT | @ | `google-site-verification=3za1l...` | Google verification |
| TXT | _dmarc | `v=DMARC1; p=reject; rua=mailto:dmarc@inchronicle.com` | **DMARC — CRITICAL** |

## Strategy: Two-Step Migration

Separate nameserver migration from traffic cutover to reduce risk.

### Step 1: Nameservers → Cloudflare (1 week before cutover)

1. Add domain to Cloudflare dashboard
2. Cloudflare auto-imports records — **verify ALL records match** before proceeding
3. Update nameservers at Spaceship: `launch1.spaceship.net` → Cloudflare NS
4. Wait 24-48hrs for propagation
5. Verify: site works, email works (send test email to/from inchronicle.com)

### Step 2: Traffic Switch (weekend, low traffic)

**T-48h: Lower TTLs**
```
A record @     → TTL 60
CNAME www      → TTL 60
# Leave MX, TXT alone
```

**T-24h: Add OAuth redirect URIs**
- Microsoft (24hr propagation): add all 5 URIs
- Google (few hours): add 1 URI

**T-2h: Add remaining OAuth URIs**
- Atlassian: 3 URIs (instant)
- Slack: 1 URI (instant)
- Figma: 1 URI (instant)
- Zoom: 1 URI + allowlist (instant)
- GitHub: create second OAuth App (only supports 1 callback URL per app)

**T-0: Execute (Cloudflare Dashboard)**

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| CNAME | @ | `professionalside.pages.dev` | Proxied (orange) | Auto |
| CNAME | www | `professionalside.pages.dev` | Proxied (orange) | Auto |
| CNAME | api | `inchronicle-api.fly.dev` | DNS only (grey) | 60 |
| CNAME | uploads | (auto-managed by R2 custom domain) | Proxied | Auto |
| MX | @ | (unchanged) | N/A | 3600 |
| TXT | @ | SPF (unchanged) | N/A | Auto |
| TXT | _dmarc | DMARC (unchanged) | N/A | Auto |

**T+5m: Verify**
```bash
curl -sI https://inchronicle.com | grep cf-ray    # confirms Cloudflare
curl -sI https://www.inchronicle.com               # should 301 → non-www
curl https://api.inchronicle.com/health             # should 200
curl -sI https://uploads.inchronicle.com/test.txt   # should 200
```

**T+24h: Raise TTLs**
```
api CNAME → TTL 3600
```

## Rollback

Change records back to Azure values. Instant for proxied records, ≤60s for DNS-only. **Azure must still be running.**

## OAuth Redirect URIs

Callback URLs are built from `BACKEND_URL` env var + provider callbackPaths (see `backend/src/services/mcp/oauth-provider-contract.ts`).

### Phase 2 (now): Testing with fly.dev

All prefixed with `https://inchronicle-api.fly.dev/api/v1/mcp/callback/`

| Provider | URIs to add | Multi-URI? | Propagation | Dashboard |
|----------|------------|-----------|-------------|-----------|
| **GitHub** | `/github` | **NO — 1 only** | Instant | github.com → Settings → Developer settings → OAuth Apps |
| **Atlassian** | `/jira`, `/confluence`, `/atlassian` | Yes | Instant | developer.atlassian.com |
| **Google** | `/google_workspace` | Yes | 5min-few hrs | console.cloud.google.com |
| **Microsoft** | `/outlook`, `/teams`, `/onedrive`, `/onenote` | Yes | **Up to 24hrs** | portal.azure.com |

### Phase 3 (cutover): Production with api.inchronicle.com

All prefixed with `https://api.inchronicle.com/api/v1/mcp/callback/` — replace fly.dev URIs after DNS cutover.

| Provider | URIs | Multi-URI? | Propagation | Dashboard |
|----------|------|-----------|-------------|-----------|
| **GitHub** | `/github` | **NO — 1 only** | Instant | github.com → Settings → Developer settings → OAuth Apps |
| **Atlassian** | `/jira`, `/confluence`, `/atlassian` | Yes | Instant | developer.atlassian.com |
| **Google** | `/google_workspace` | Yes | 5min-few hrs | console.cloud.google.com |
| **Microsoft** | `/outlook`, `/teams`, `/onedrive`, `/onenote` | Yes | **Up to 24hrs** | portal.azure.com |
| **Figma** | `/figma` | Yes | Instant | figma.com → Developer settings |
| **Slack** | `/slack` | Yes | Instant | api.slack.com |
| **Zoom** | `/zoom` | Yes | Instant | marketplace.zoom.us |

### GitHub Workaround

GitHub OAuth Apps support only ONE callback URL. Create a **second OAuth App** for the new URL:
1. https://github.com/settings/applications/new
2. Homepage URL: `https://inchronicle-api.fly.dev`
3. Callback URL: `https://inchronicle-api.fly.dev/api/v1/mcp/callback/github`
4. Set new `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` on Fly.io
5. Keep old app for Azure. Delete old after cutover.

### Zoom Gotcha

Update BOTH "Redirect URL for OAuth" AND "Allow List" — updating only one causes failures.

### Also Update

- **Razorpay webhook URL** → `https://api.inchronicle.com/api/v1/billing/webhook`
- **Fly.io `BACKEND_URL`** → `https://api.inchronicle.com` (after custom domain verified)

## Azure Decommissioning (T+2 weeks)

```bash
# Verify zero traffic first
az monitor metrics list --resource "..." --metric "Requests" --interval PT1H

# Remove custom domain
az webapp config hostname delete --webapp-name <name> --resource-group ps-prod-rg --hostname inchronicle.com

# Delete everything
az group delete --name ps-prod-rg --yes --no-wait
```

## Edge Cases

- **Email (MX)**: Never proxied by Cloudflare. Preserved as-is.
- **DKIM CNAMEs**: Must be DNS-only (grey cloud). Proxying breaks DKIM.
- **API DNS**: Start with DNS-only (grey cloud). Fly.io handles TLS via Let's Encrypt. Switch to proxied later for WAF/DDoS if needed.
- **In-flight requests**: TCP connections survive DNS changes. Only new connections route differently.
