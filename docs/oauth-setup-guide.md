# InChronicle OAuth Provider Setup Guide

This guide covers how to configure OAuth credentials for each integration provider. InChronicle registers **one OAuth app per provider** — all users authenticate through it.

---

## Environments

| Environment | Backend URL | Frontend URL |
|-------------|-------------|--------------|
| **Production** | `https://ps-backend-1758551070.azurewebsites.net` | `https://ps-frontend-1758551070.azurewebsites.net` |
| **Local** | `http://localhost:3002` | `http://localhost:5555` |

---

## Current Status

| Provider | Production | Local | Client ID |
|----------|-----------|-------|-----------|
| GitHub | Done | Done | *(in backend/.env)* |
| Atlassian (Jira + Confluence) | Done | **Needs local callback URLs + env vars** | `9Ry1PnM5u7fN1EdbqGLm6YPulRuXDICO` |
| Microsoft (Outlook, Teams, OneDrive, OneNote) | Done | **Needs local callback URLs + env vars** | `a8bac720-8c24-4cd9-8886-0902eee1acdc` |
| Google Workspace | Not set up | Not set up | — |
| Figma | Not set up | Not set up | — |
| Slack | Not set up | Not set up | — |
| Zoom | Not set up | Not set up | — |

---

## How It Works

Each provider has **one** registered OAuth app (owned by InChronicle/SparkLogics). The app has:
- A **Client ID** and **Client Secret** (set once, shared across all users)
- One or more **callback URLs** (where the provider redirects after user authorizes)

For local testing, we add `localhost` callback URLs to the **same** production app. Both production and local URLs coexist — the provider uses whichever URL was in the original request.

Credentials go in `backend/.env`. Restart the backend after changes.

---

## 1. GitHub (Already Done)

**Console**: https://github.com/settings/developers → "InChronicle" app

### What was done for local:
1. Opened the existing GitHub OAuth App in GitHub Developer Settings
2. Added callback URL: `http://localhost:3002/api/v1/mcp/callback/github`
3. Copied Client ID and Client Secret
4. Added to `backend/.env`:
   ```
   GITHUB_CLIENT_ID=<client_id>
   GITHUB_CLIENT_SECRET=<client_secret>
   ```

### Production callback URL:
```
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/github
```

---

## 2. Atlassian (Jira + Confluence)

**Console**: https://developer.atlassian.com/console/myapps/ → "InChronicle MCP"

**Client ID**: `9Ry1PnM5u7fN1EdbqGLm6YPulRuXDICO`

One app covers both Jira and Confluence.

### Production callback URLs (already configured):
```
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/jira
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/confluence
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/atlassian
```

### To enable locally:

**Step 1** — Add local callback URLs to the existing app:
1. Go to https://developer.atlassian.com/console/myapps/
2. Open **"InChronicle MCP"**
3. Go to **Authorization** > **OAuth 2.0 (3LO)** > **Configure** (or Edit)
4. Add these callback URLs (keep the production ones):
   ```
   http://localhost:3002/api/v1/mcp/callback/jira
   http://localhost:3002/api/v1/mcp/callback/confluence
   http://localhost:3002/api/v1/mcp/callback/atlassian
   ```
5. Save

**Step 2** — Get the secret:
1. In the same app, go to **Settings**
2. Copy the **Secret** (Client ID is `9Ry1PnM5u7fN1EdbqGLm6YPulRuXDICO`)

**Step 3** — Add to `backend/.env`:
```
ATLASSIAN_CLIENT_ID=9Ry1PnM5u7fN1EdbqGLm6YPulRuXDICO
ATLASSIAN_CLIENT_SECRET=<paste_secret_here>
```

**Step 4** — Restart the backend.

---

## 3. Microsoft (Outlook, Teams, OneDrive, OneNote)

**Console**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps → "InChronicle MCP"

**Client ID**: `a8bac720-8c24-4cd9-8886-0902eee1acdc`

One Azure app covers Outlook, Teams, OneDrive, and OneNote.

### Production callback URLs (already configured):
```
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/outlook
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/teams
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/onedrive
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/onenote
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/microsoft
```

### To enable locally:

**Step 1** — Add local callback URLs to the existing app:
1. Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
2. Open **"InChronicle MCP"**
3. Go to **Authentication** > **Web** platform section > **Add URI**
4. Add these redirect URIs (keep the production ones):
   ```
   http://localhost:3002/api/v1/mcp/callback/outlook
   http://localhost:3002/api/v1/mcp/callback/teams
   http://localhost:3002/api/v1/mcp/callback/onedrive
   http://localhost:3002/api/v1/mcp/callback/onenote
   http://localhost:3002/api/v1/mcp/callback/microsoft
   ```
5. Save

**Step 2** — Get the secret:
1. Go to **Certificates & secrets** > **Client secrets**
2. If an existing secret is available and not expired, copy the **Value** (NOT the Secret ID)
3. If expired, click **New client secret** > set description "local dev" > choose expiry > copy the **Value** immediately (it won't be shown again)

**Step 3** — Add to `backend/.env`:
```
MICROSOFT_CLIENT_ID=a8bac720-8c24-4cd9-8886-0902eee1acdc
MICROSOFT_CLIENT_SECRET=<paste_secret_value_here>
```

**Step 4** (optional) — If your org uses a specific Azure AD tenant:
```
MICROSOFT_TENANT_ID=<your_tenant_id>
```
Default is `common` (multi-tenant, works for personal + org accounts).

**Step 5** — Restart the backend.

---

## 4. Google Workspace (Not Yet Set Up)

**Console**: https://console.cloud.google.com/apis/credentials

### To set up from scratch:

**Step 1** — Configure OAuth consent screen (must be done first):
1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Choose **External** user type
3. Fill in app name: "InChronicle MCP"
4. Add authorized domains
5. Add scopes:
   - `userinfo.email`, `userinfo.profile`
   - `drive.readonly`, `calendar.readonly`
6. Save

**Step 2** — Create OAuth credentials:
1. Go to https://console.cloud.google.com/apis/credentials
2. **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: "InChronicle MCP"
5. Authorized redirect URIs — add both:
   ```
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/google_workspace
   http://localhost:3002/api/v1/mcp/callback/google_workspace
   ```
6. Save and copy Client ID + Client Secret

**Step 3** — Add to `backend/.env` (local) and production env:
```
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>
```

---

## Verification

After adding credentials and restarting the backend, verify with:

```bash
# Check which providers are configured (from backend logs on startup)
# Look for: [MCP OAuth] Initialized N OAuth configurations

# Or test the connect flow:
# 1. Go to http://localhost:5555/onboarding
# 2. Click "Connect" on the provider
# 3. Should redirect to provider's consent screen (not show "not yet available" error)
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "integration is not yet available" | Missing env vars | Add CLIENT_ID and CLIENT_SECRET to backend/.env, restart |
| "redirect_uri_mismatch" | Callback URL not registered | Add the localhost callback URL in the provider's console |
| "invalid_client" | Wrong Client ID or Secret | Double-check the values in backend/.env |
| "admin_consent_required" (Microsoft) | Org policy blocks the app | Ask org admin to approve, or use a personal account for testing |
