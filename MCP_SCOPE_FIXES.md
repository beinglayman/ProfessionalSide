# MCP OAuth Scope Fixes

## Summary of Changes

I've updated the OAuth scopes in the backend to fix the 403/401 errors you were experiencing with various MCP tools.

## Updated Scopes

### ✅ Figma (FIXED)
**Before:** `current_user:read file_comments:read file_content:read file_metadata:read file_versions:read`
**After:** `files:read`
**Why:** The granular scopes didn't include team/project access. `files:read` is the standard scope that provides read access to files, teams, projects, and comments.

### ✅ Confluence (IMPROVED)
**Before:** `read:confluence-content.all read:confluence-user offline_access`
**After:** `read:confluence-content.all read:confluence-space.summary read:confluence-user offline_access`
**Why:** Added `read:confluence-space.summary` to ensure we can read space information, which is needed for listing spaces.

### ✅ Microsoft Teams (FIXED)
**Before:** `User.Read Channel.ReadBasic.All ChannelMessage.Edit Chat.Read Chat.ReadBasic offline_access`
**After:** `User.Read Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Read.All Chat.Read Chat.ReadBasic offline_access`
**Why:**
- Changed `ChannelMessage.Edit` → `ChannelMessage.Read.All` (we need to READ messages, not edit them)
- Added `Team.ReadBasic.All` to read team information

## What You Need to Do Next

### ⚠️ IMPORTANT: Reconnect All Integrations

Because OAuth scopes have changed, you need to **disconnect and reconnect** each integration for the new scopes to take effect:

1. **Figma**
   - Go to MCP integrations page
   - Click "Disconnect" on Figma
   - Click "Connect" again
   - Authorize with the new `files:read` scope

2. **Confluence**
   - Disconnect Confluence
   - Reconnect (it will request the additional `read:confluence-space.summary` scope)

3. **Microsoft Teams**
   - Disconnect Teams
   - Reconnect with corrected scopes (read instead of edit)

4. **Jira** (Optional)
   - The Jira scopes were already correct
   - But the 401/410 errors suggest your token may be expired or the Jira site/resources were deleted
   - Try disconnecting and reconnecting anyway

### Why Reconnection is Required

OAuth tokens are issued with specific scopes at authorization time. Simply updating the code doesn't change existing tokens - you must go through the OAuth flow again to get new tokens with the new scopes.

## Expected Improvements After Reconnection

After reconnecting with the new scopes, you should see:

- ✅ **Figma**: No more 403 errors when fetching team projects and files
- ✅ **Confluence**: Better access to spaces and pages (no more 401 on spaces endpoint)
- ✅ **Teams**: Proper read access to channel messages and teams
- ✅ **All tools**: More reliable data fetching across the board

## Current Status (Before Reconnection)

Based on the backend logs from your last test:

| Tool | Status | Items Fetched | Issues |
|------|--------|---------------|--------|
| **Outlook** | ✅ Working | 1 meeting | None |
| **Jira** | ⚠️ Partial | 1 item | 401 on sprints, 410 on issues |
| **Figma** | ❌ Failing | 0 items | 403 Forbidden (scope issue) |
| **Confluence** | ❌ Failing | 0 items | 401 Unauthorized (scope/token issue) |
| **Teams** | ⚠️ Unknown | Session created | Need to test after scope fix |
| **GitHub** | ⚠️ Connected | 0 items | No activity in date range |
| **Slack** | ⚠️ Connected | 0 items | No activity in date range |

## Next Steps

1. ✅ Deploy backend with updated OAuth scopes (I'll do this now)
2. ⬜ You: Disconnect all integrations in the app
3. ⬜ You: Reconnect all integrations (this will request new scopes)
4. ⬜ You: Create test activities in each tool again
5. ⬜ You: Test the MCP flow to fetch activities
6. ⬜ Verify all 7 tools are now working

## Deployment Status

✅ **DEPLOYED**: Backend with updated OAuth scopes deployed successfully!
- **Image**: `psacr1758551070.azurecr.io/inchronicle-backend:mcp-scopes-fixed-20251020-164222`
- **Deployment Time**: 2025-10-20 11:13 UTC
- **Status**: Running

The backend is now ready with corrected OAuth scopes. You can proceed with reconnecting your integrations!
