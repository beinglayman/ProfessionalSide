# MCP OAuth Deployment Status

## ✅ Completed Actions

### 1. Code Changes Deployed
**Commit**: `7d991c8` - "Fix MCP OAuth redirect URIs and add diagnostic logging"

**Changes Included**:
- Enhanced `mcp-oauth.service.ts` with diagnostic logging
  - Logs which tools are configured vs. missing at startup
  - Shows specific missing environment variables
  - Provides actionable setup guidance
- Created comprehensive setup guide (`MCP_OAUTH_SETUP_GUIDE.md`)
- Created fix summary with user action items (`MCP_OAUTH_FIX_SUMMARY.md`)

### 2. Backend Built and Deployed
- **Image**: `ps-backend:oauth-fix-20251011-004938`
- **Digest**: `sha256:1c6841ad84d8d8125d800a5d6f8666514cb131cda85439e73171a0c406ff82f1`
- **Tagged as**: `ps-backend:latest`
- **Status**: Successfully pushed to ACR and deployed

### 3. Environment Configuration
- **BACKEND_URL**: ✅ Set to `https://ps-backend-1758551070.azurewebsites.net`
- **OAuth Credentials**: ✅ All 7 tool credentials present:
  - GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Jira/Confluence: `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`
  - Figma: `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`
  - Outlook/Teams: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
  - Slack: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`

### 4. Backend Restarted
- Restarted to pick up new image with OAuth diagnostic logging
- Backend is running and serving requests

---

## ⚠️ Action Required: Update OAuth App Redirect URIs

The backend code is now generating correct redirect URIs using `BACKEND_URL`. However, the OAuth apps in provider consoles still have placeholder redirect URIs and need to be updated.

### Critical: Atlassian (Jira + Confluence) - HIGHEST PRIORITY

**Current Redirect URIs** (wrong):
```
https://example.com/oauth/jira
https://example.com/oauth/confluence
```

**Required Redirect URIs** (correct):
```
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/jira
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/confluence
```

**How to Update**:
1. Go to https://developer.atlassian.com/console/myapps/
2. Select your OAuth app
3. Go to "Authorization" → "OAuth 2.0 (3LO)"
4. Update Callback URLs to the correct URIs above
5. Click "Save"

### Other OAuth Apps to Update

Follow instructions in `MCP_OAUTH_FIX_SUMMARY.md` sections 2-5 for:
- GitHub
- Figma
- Microsoft (Outlook + Teams)
- Slack

---

## 🧪 Testing the OAuth Flow

### Step 1: Verify Diagnostic Logging

SSH into backend and check if OAuth service initialized correctly:

```bash
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
```

Then check environment:
```bash
echo "BACKEND_URL: $BACKEND_URL"
echo "ATLASSIAN_CLIENT_ID: ${ATLASSIAN_CLIENT_ID:0:10}..."
```

### Step 2: Test Jira OAuth (After Updating Redirect URI)

1. Go to https://ps-frontend-1758551070.azurewebsites.net/settings
2. Navigate to "Integrations" tab
3. Click "Connect" for Jira
4. **Expected behavior**:
   - Should redirect to `https://auth.atlassian.com/authorize?...`
   - NOT to `https://example.com/oauth/jira`
5. Authorize the app
6. Should redirect back to InChronicle with success message

### Step 3: Test Other Tools

Repeat the same process for GitHub, Figma, Outlook, Teams, Slack, and Confluence.

---

## 📊 Current OAuth Configuration Status

| Tool | Client ID | Client Secret | Redirect URI in Code | Redirect URI in Provider Console |
|------|-----------|---------------|---------------------|----------------------------------|
| GitHub | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |
| Jira | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |
| Confluence | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |
| Figma | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |
| Outlook | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |
| Teams | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |
| Slack | ✅ Set | ✅ Set | ✅ Correct | ⚠️ **Needs Update** |

---

## 🔍 Diagnostic Commands

### Check if Backend is Using New Image

```bash
az webapp config container show -g ps-prod-rg -n ps-backend-1758551070 \
  --query "imageTag" -o tsv
```

Should show: `psacr1758551070.azurecr.io/ps-backend:latest`

### Check Backend Logs for OAuth Initialization

```bash
az webapp log download -g ps-prod-rg -n ps-backend-1758551070 -p logs.zip
unzip logs.zip
grep -r "MCP OAuth" .
```

Expected output:
```
[MCP OAuth] Initialized X OAuth configurations
[MCP OAuth] Configuration Status:
  ✓ Configured (7): github, jira, figma, outlook, confluence, slack, teams
```

### Test OAuth Initiate Endpoint Directly

```bash
curl -v -X POST https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/oauth/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{"toolType": "jira"}'
```

Expected response should contain:
```json
{
  "authorizationUrl": "https://auth.atlassian.com/authorize?..."
}
```

The redirect_uri parameter in the URL should be:
```
redirect_uri=https%3A%2F%2Fps-backend-1758551070.azurewebsites.net%2Fapi%2Fv1%2Fmcp%2Fcallback%2Fjira
```

---

## 🎯 Next Steps

1. ⚠️ **Update Atlassian OAuth app redirect URIs** (See above)
2. ⚠️ **Update other OAuth apps' redirect URIs** (See `MCP_OAUTH_FIX_SUMMARY.md`)
3. ✅ **Test Jira connection** - Try connecting Jira from Settings → Integrations
4. ✅ **Test other tools** - Connect remaining tools
5. 📝 **Report back** - Let me know if OAuth redirect now works correctly

---

## 📁 Reference Files

- **Setup Guide**: `MCP_OAUTH_SETUP_GUIDE.md` - Complete setup instructions for all tools
- **Fix Summary**: `MCP_OAUTH_FIX_SUMMARY.md` - What was fixed and what you need to do
- **Backend Service**: `backend/src/services/mcp/mcp-oauth.service.ts` - OAuth service code

---

## 🐛 Troubleshooting

### Issue: Still redirecting to example.com

**Likely Cause**: OAuth app redirect URI not updated yet in provider console
**Fix**: Update the redirect URI in the OAuth app settings (see above)

### Issue: "OAuth not configured" error

**Likely Cause**: Backend hasn't picked up environment variables or new image
**Fix**:
```bash
az webapp restart -g ps-prod-rg -n ps-backend-1758551070
```

### Issue: Backend logs don't show diagnostic messages

**Likely Cause**: OAuth service not instantiated yet or logs not retained
**Fix**: Trigger an OAuth request to force service initialization, or download full logs

---

**Last Updated**: 2025-10-11T00:49:38Z
**Deployment Tag**: `oauth-fix-20251011-004938`
**Commit**: `7d991c8`
