# MCP OAuth Setup Guide

This guide explains how to set up OAuth integrations for all 7 MCP tools in InChronicle.

## Overview

InChronicle supports importing work activity from 7 external tools:
- **GitHub** - Code contributions, PRs, issues
- **Jira** - Tasks, sprints, projects
- **Figma** - Design files, components, comments
- **Outlook** - Meetings, emails, calendar
- **Confluence** - Documentation, pages
- **Slack** - Messages, threads, channels
- **Microsoft Teams** - Meetings, chats, collaboration

Each tool requires OAuth 2.0 credentials to be configured.

---

## Backend URL

Your backend callback URL base is:
```
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback
```

---

## 1. GitHub OAuth Setup

### Create OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: InChronicle MCP Integration
   - **Homepage URL**: https://ps-frontend-1758551070.azurewebsites.net
   - **Authorization callback URL**: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/github`
4. Click "Register application"
5. Generate a client secret

### Add to Azure
```bash
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings \
    GITHUB_CLIENT_ID="<your_client_id>" \
    GITHUB_CLIENT_SECRET="<your_client_secret>"
```

### Scopes Required
- `repo` - Access repositories
- `read:user` - Read user profile
- `user:email` - Access user email

---

## 2. Jira OAuth Setup (Atlassian)

### Create OAuth 2.0 App
1. Go to https://developer.atlassian.com/console/myapps/
2. Click "Create" → "OAuth 2.0 integration"
3. Name: "InChronicle MCP Integration"
4. Under "Authorization" → "OAuth 2.0 (3LO)":
   - **Callback URL**: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/jira`
5. Under "Permissions" → "Jira API":
   - Add scopes: `read:jira-work`, `read:jira-user`, `offline_access`
6. Click "Save"
7. Get Client ID and generate Secret

### Add to Azure
```bash
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings \
    ATLASSIAN_CLIENT_ID="<your_client_id>" \
    ATLASSIAN_CLIENT_SECRET="<your_client_secret>"
```

**Note**: Jira and Confluence share the same Atlassian OAuth app.

---

## 3. Confluence OAuth Setup (Atlassian)

### Use Same OAuth App as Jira
1. Go to your Atlassian OAuth app from Step 2
2. Add additional callback URL:
   - **Callback URL**: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/confluence`
3. Under "Permissions" → "Confluence API":
   - Add scopes: `read:confluence-content.all`, `read:confluence-user`, `offline_access`
4. Click "Save"

**No additional Azure settings needed** - uses same ATLASSIAN_* credentials.

---

## 4. Figma OAuth Setup

### Create OAuth App
1. Go to https://www.figma.com/developers/apps
2. Click "Create new app"
3. Fill in:
   - **App name**: InChronicle MCP Integration
   - **Website**: https://ps-frontend-1758551070.azurewebsites.net
   - **Redirect URI**: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma`
4. Click "Create app"
5. Copy Client ID and Client Secret

### Add to Azure
```bash
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings \
    FIGMA_CLIENT_ID="<your_client_id>" \
    FIGMA_CLIENT_SECRET="<your_client_secret>"
```

### Scopes Required

**Users:**
- `current_user:read` - Read the current user's name, email, and profile image

**Files:**
- `file_comments:read` - Read comments in accessible files
- `file_content:read` - Read the contents of and render images from files
- `file_metadata:read` - Read metadata of files
- `file_versions:read` - Read version history of files

---

## 5. Microsoft Outlook OAuth Setup (Microsoft Graph)

### Create Azure AD App
1. Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. Click "New registration"
3. Fill in:
   - **Name**: InChronicle MCP Integration
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web - `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/outlook`
4. Click "Register"
5. Go to "Certificates & secrets" → "New client secret"
6. Copy the secret value immediately (it won't be shown again)
7. Go to "API permissions" → "Add a permission" → "Microsoft Graph"
8. Add delegated permissions:
   - `User.Read`
   - `Mail.Read`
   - `Calendars.Read`
   - `offline_access`
9. Click "Grant admin consent"

### Add to Azure
```bash
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings \
    MICROSOFT_CLIENT_ID="<your_application_id>" \
    MICROSOFT_CLIENT_SECRET="<your_client_secret>" \
    MICROSOFT_TENANT_ID="common"
```

**Note**: Outlook and Teams share the same Microsoft OAuth app.

---

## 6. Microsoft Teams OAuth Setup (Microsoft Graph)

### Use Same OAuth App as Outlook
1. Go to your Microsoft OAuth app from Step 5
2. Under "Authentication", add additional redirect URI:
   - **Redirect URI**: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/teams`
3. Under "API permissions", add additional delegated permissions:
   - `Team.ReadBasic.All`
   - `Channel.ReadBasic.All`
   - `Chat.Read`
   - `ChannelMessage.Read.All`
4. Click "Grant admin consent"

**No additional Azure settings needed** - uses same MICROSOFT_* credentials.

---

## 7. Slack OAuth Setup

### Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "InChronicle MCP Integration"
4. Pick a workspace for development
5. Under "OAuth & Permissions":
   - **Redirect URLs**: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/slack`
6. Under "Scopes" → "User Token Scopes", add:
   - `channels:read`
   - `channels:history`
   - `users:read`
   - `chat:write`
7. Click "Install to Workspace"
8. Copy Client ID and Client Secret from "Basic Information"

### Add to Azure
```bash
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings \
    SLACK_CLIENT_ID="<your_client_id>" \
    SLACK_CLIENT_SECRET="<your_client_secret>"
```

---

## Verification

### Check All Environment Variables
```bash
az webapp config appsettings list \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --query "[?name=='GITHUB_CLIENT_ID' || name=='ATLASSIAN_CLIENT_ID' || name=='FIGMA_CLIENT_ID' || name=='MICROSOFT_CLIENT_ID' || name=='SLACK_CLIENT_ID'].{Name:name, Value:value}" \
  -o table
```

### Expected Environment Variables

| Variable | Used For |
|----------|----------|
| `GITHUB_CLIENT_ID` | GitHub |
| `GITHUB_CLIENT_SECRET` | GitHub |
| `ATLASSIAN_CLIENT_ID` | Jira + Confluence |
| `ATLASSIAN_CLIENT_SECRET` | Jira + Confluence |
| `FIGMA_CLIENT_ID` | Figma |
| `FIGMA_CLIENT_SECRET` | Figma |
| `MICROSOFT_CLIENT_ID` | Outlook + Teams |
| `MICROSOFT_CLIENT_SECRET` | Outlook + Teams |
| `MICROSOFT_TENANT_ID` | Outlook + Teams |
| `SLACK_CLIENT_ID` | Slack |
| `SLACK_CLIENT_SECRET` | Slack |
| `BACKEND_URL` | All (should be `https://ps-backend-1758551070.azurewebsites.net`) |

---

## Testing OAuth Flow

### For Each Tool:
1. Go to https://ps-frontend-1758551070.azurewebsites.net/settings → Integrations tab
2. Click "Connect" for the tool
3. You should be redirected to the tool's OAuth page (not example.com!)
4. Authorize the app
5. You should be redirected back to InChronicle with success message
6. The tool should show as "Connected"

### Common Issues

#### 1. Redirecting to example.com
**Cause**: OAuth app's redirect URI is set to placeholder URL
**Fix**: Update the redirect URI in the OAuth app settings

#### 2. "OAuth not configured" error
**Cause**: Missing environment variables in Azure
**Fix**: Run the Azure CLI commands above to add credentials

#### 3. "Invalid redirect_uri" error
**Cause**: Redirect URI in code doesn't match OAuth app settings
**Fix**: Ensure redirect URI exactly matches (including https, trailing slashes, etc.)

#### 4. "Invalid client" error
**Cause**: Wrong Client ID or Secret
**Fix**: Double-check credentials in Azure App Settings

---

## Security Best Practices

1. **Never commit credentials** - Always use environment variables
2. **Use HTTPS only** - All redirect URIs must use HTTPS in production
3. **Rotate secrets regularly** - Update secrets every 90 days
4. **Minimal scopes** - Only request permissions you need
5. **Monitor access** - Check OAuth app logs regularly

---

## Development vs Production

### Development (localhost)
For local development, create separate OAuth apps with:
- Redirect URI: `http://localhost:3002/api/v1/mcp/callback/{tool}`
- Use different Client ID/Secret in local `.env` file

### Production (Azure)
- Redirect URI: `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/{tool}`
- Credentials stored in Azure App Settings

---

## Troubleshooting

### Check Backend Logs
```bash
az webapp log tail -g ps-prod-rg -n ps-backend-1758551070 --filter "MCP OAuth"
```

### Test OAuth Service Directly
```bash
# SSH into backend container
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070

# Check if environment variables are set
env | grep -E "GITHUB_CLIENT_ID|ATLASSIAN_CLIENT_ID|FIGMA_CLIENT_ID|MICROSOFT_CLIENT_ID|SLACK_CLIENT_ID|BACKEND_URL"
```

### Restart After Adding Credentials
```bash
az webapp restart -g ps-prod-rg -n ps-backend-1758551070
```

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify environment variables are set correctly
3. Check OAuth app redirect URIs match exactly
4. Review backend logs for specific error messages
5. Test in incognito mode to avoid cookie/cache issues
