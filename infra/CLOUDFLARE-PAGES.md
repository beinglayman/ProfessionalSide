# Cloudflare Pages — InChronicle Frontend

## Project Details

| Field | Value |
|-------|-------|
| Dashboard | `dash.cloudflare.com` → Workers & Pages |
| Domain | `inchronicle.com` (CNAME → `professionalside.pages.dev`) |
| Preview URL | `professionalside.pages.dev` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | `/` (default) |
| Framework | Vite + React |

## Setup (Dashboard)

1. `dash.cloudflare.com` → Workers & Pages → Create → Pages → Connect to Git
2. Select `beinglayman/ProfessionalSide`
3. Build config:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `/` (default)
4. Environment variables:
   - Production: `VITE_API_URL=https://api.inchronicle.com/api/v1`, `NODE_VERSION=20`
   - Preview: same (or staging URL)
   - **Node 20 required** — Vite 7 + Rollup native binaries need Node >=20. Node 18 causes `Cannot find module @rollup/rollup-linux-x64-gnu`.

## Pages Functions (Edge SSR)

Functions live in `functions/` at project root. File-based routing:

```
functions/
  p/
    [shortCode].ts      # /p/:shortCode — Pragma Link OG tags
  [slug].ts             # /:slug — Chronicle profile OG tags
```

Uses `HTMLRewriter` (streaming, built-in) for OG tag injection — not string `.replace()`.

### Function Environment Bindings

Set via Dashboard → Settings → Environment Variables (separate Production/Preview):

| Variable | Value |
|----------|-------|
| `API_ORIGIN` | `https://api.inchronicle.com` (bare origin, no path) |
| `BASE_URL` | `https://inchronicle.com` |

Or via `wrangler.toml` (if added):
```toml
name = "inchronicle"
pages_build_output_dir = "dist"

[vars]
API_ORIGIN = "https://api.inchronicle.com"
BASE_URL = "https://inchronicle.com"
```

## Critical: `_routes.json`

`public/_routes.json` prevents every request from invoking a Function:

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

Without this, static asset requests burn the free 100k/day Function quota.

## SPA Routing

Automatic. If no `404.html` exists in `dist/`, Pages serves `index.html` for all unmatched routes. **Do NOT create a 404.html file.**

## DNS Records

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| CNAME | @ | `professionalside.pages.dev` | Proxied (orange) | Auto |
| CNAME | www | `professionalside.pages.dev` | Proxied (orange) | Auto |

www → non-www redirect: Dashboard → Rules → Redirect Rules:
- When: Hostname equals `www.inchronicle.com`
- Then: Dynamic redirect to `concat("https://inchronicle.com", http.request.uri.path)`
- Status: 301

## PR Preview Deploys

Every PR automatically gets a preview URL: `https://<hash>.professionalside.pages.dev`. Free, no config needed.

## Free Plan Limits

| Resource | Limit |
|----------|-------|
| Builds | 500/month |
| Function invocations | 100,000/day |
| Bandwidth | Unlimited |
| Static requests | Unlimited |
| Custom domains | 100/project |

## Workers Runtime Notes

| API | Available? | Notes |
|-----|-----------|-------|
| `fetch()` | Yes | Standard Web fetch |
| `HTMLRewriter` | Yes | Built-in, streaming |
| `Buffer` | Yes | With `nodejs_compat` flag |
| `fs.readFileSync` | **No** | Use `env.ASSETS.fetch()` |
| `process.env` | **No** | Use `env` from context |
| `express` | **No** | Not Node.js runtime |

## Local Development

```bash
# Test Pages Functions locally
npx wrangler pages dev -- npm run dev
```
