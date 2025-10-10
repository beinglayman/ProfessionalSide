# MCP OAuth Fix Summary

## Issue Diagnosed

The Jira OAuth redirect was going to `https://example.com/oauth/jira` instead of your actual backend URL. This happened because:

1. ✅ **OAuth credentials were configured** - All Client IDs and Secrets are set in Azure
2. ❌ **BACKEND_URL was missing** - This caused redirect URIs to fallback to localhost
3. ❌ **OAuth apps have wrong redirect URIs** - The Atlassian OAuth app (and possibly others) were created with placeholder URLs

## What I've Fixed

### 1. Added BACKEND_URL to Azure ✅
```bash
BACKEND_URL=https://ps-backend-1758551070.azurewebsites.net
```

### 2. Added Better Error Logging ✅
The OAuth service now logs detailed diagnostics on startup:
- Which tools are configured vs. not configured
- Which specific environment variables are missing
- Reference to setup guide

### 3. Created Complete Setup Guide ✅
See `MCP_OAUTH_SETUP_GUIDE.md` for detailed instructions on setting up all 7 MCP tool integrations.

### 4. Restarted Backend ✅
The backend has been restarted to pick up the BACKEND_URL change.

---

## What You Need to Do Next

### Critical: Update OAuth App Redirect URIs

The OAuth apps were created with placeholder redirect URIs. You need to update them in each provider's developer console:

#### 1. Atlassian (Jira + Confluence) - HIGHEST PRIORITY
**This is causing the current issue!**

1. Go to https://developer.atlassian.com/console/myapps/
2. Select your OAuth app
3. Go to "Authorization" → "OAuth 2.0 (3LO)"
4. **Update Callback URLs** from:
   ```
   https://example.com/oauth/jira
   https://example.com/oauth/confluence
   ```
   To:
   ```
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/jira
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/confluence
   ```
5. Click "Save"

#### 2. GitHub
1. Go to https://github.com/settings/developers
2. Select your OAuth App
3. **Update Authorization callback URL** to:
   ```
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/github
   ```
4. Click "Update application"

#### 3. Figma
1. Go to https://www.figma.com/developers/apps
2. Select your app
3. **Update Redirect URI** to:
   ```
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma
   ```
4. Save changes

#### 4. Microsoft (Outlook + Teams)
1. Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. Select your app registration
3. Go to "Authentication"
4. **Update Redirect URIs** to:
   ```
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/outlook
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/teams
   ```
5. Click "Save"

#### 5. Slack
1. Go to https://api.slack.com/apps
2. Select your app
3. Go to "OAuth & Permissions"
4. **Update Redirect URLs** to:
   ```
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/slack
   ```
5. Click "Save URLs"

---

## Testing After Update

Once you've updated the redirect URIs:

1. Go to https://ps-frontend-1758551070.azurewebsites.net/settings → Integrations
2. Click "Connect" for Jira
3. You should now be redirected to `https://auth.atlassian.com/authorize?...` (not example.com!)
4. Authorize the app
5. You should be redirected back to InChronicle with success message

Repeat for all tools.

---

## Current Status

### ✅ Configured in Azure
- GitHub (Client ID + Secret)
- Jira (Atlassian Client ID + Secret)
- Confluence (Atlassian Client ID + Secret)
- Figma (Client ID + Secret)
- Outlook (Microsoft Client ID + Secret)
- Teams (Microsoft Client ID + Secret)
- Slack (Client ID + Secret)
- BACKEND_URL

### ⚠️ Needs Action
- Update redirect URIs in all OAuth provider consoles (see above)

---

## Verification Commands

### Check Environment Variables
```bash
az webapp config appsettings list -g ps-prod-rg -n ps-backend-1758551070 \
  --query "[?name=='BACKEND_URL'].{Name:name, Value:value}" -o table
```

### Check Backend Logs for OAuth Diagnostics
```bash
az webapp log tail -g ps-prod-rg -n ps-backend-1758551070 --filter "MCP OAuth"
```

You should see output like:
```
[MCP OAuth] Initialized X OAuth configurations
[MCP OAuth] Configuration Status:
  ✓ Configured (X): github, jira, figma, outlook, confluence, slack, teams
```

---

## Common Issues After Update

### Issue: Still redirecting to wrong URL
**Cause**: OAuth app redirect URI not updated yet
**Fix**: Update the redirect URI in the provider's developer console (see above)

### Issue: "Invalid redirect_uri" error
**Cause**: Redirect URI doesn't match exactly
**Fix**: Ensure the redirect URI in the OAuth app matches exactly (including https, no trailing slash)

### Issue: OAuth not configured error
**Cause**: Backend hasn't restarted yet
**Fix**: Wait 1-2 minutes for backend restart to complete, or manually restart:
```bash
az webapp restart -g ps-prod-rg -n ps-backend-1758551070
```

---

## Reference

- **Full Setup Guide**: See `MCP_OAUTH_SETUP_GUIDE.md`
- **Backend URL**: https://ps-backend-1758551070.azurewebsites.net
- **Frontend URL**: https://ps-frontend-1758551070.azurewebsites.net
- **Callback URL Pattern**: `{BACKEND_URL}/api/v1/mcp/callback/{tool}`

---

## Next Steps Summary

**IMMEDIATE ACTION REQUIRED:**

1. ✅ ~~Add BACKEND_URL to Azure~~ (Done)
2. ✅ ~~Restart backend~~ (Done)
3. ⚠️ **Update Atlassian OAuth app redirect URIs** (You need to do this)
4. ⚠️ **Update other OAuth apps' redirect URIs** (You need to do this)
5. ✅ Test Jira connection
6. ✅ Test other tool connections

The backend code is now correct and will generate the right redirect URIs. The only remaining issue is that the OAuth apps themselves are configured with the wrong URIs in the providers' consoles.
