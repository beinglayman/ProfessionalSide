# Microsoft Teams OAuth Scope Update

## What Changed

Updated the Microsoft Teams OAuth scope to avoid requiring admin consent while still providing full read access to Teams messages.

## Scope Change

**Before:**
```
User.Read Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Read.All Chat.Read Chat.ReadBasic offline_access
```

**After:**
```
User.Read Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Read Chat.Read Chat.ReadBasic offline_access
```

**Key Change:** `ChannelMessage.Read.All` → `ChannelMessage.Read`

## Why This Matters

### Admin Consent Requirements (Microsoft Graph Delegated Permissions)

| Permission | Admin Consent Required? | What It Does |
|------------|------------------------|--------------|
| `ChannelMessage.Read.All` | ✅ **YES** | Read ALL channel messages across the entire organization |
| `ChannelMessage.Read` | ❌ **NO** | Read channel messages only from teams the user is a member of |

### The Fix

By using `ChannelMessage.Read` (user-scoped) instead of `ChannelMessage.Read.All` (organization-wide), we:
- ✅ Avoid admin consent requirement
- ✅ Still read all Teams messages the user has access to
- ✅ Maintain privacy - only access teams the user is actually part of
- ✅ Work for personal and work accounts

## Deployment Status

✅ **DEPLOYED**: Backend with updated Teams scope
- **Image**: `psacr1758551070.azurecr.io/inchronicle-backend:teams-scope-fixed-20251020-170931`
- **Deployment Time**: 2025-10-20 11:41 UTC
- **Status**: Running

## Next Steps for You

### 1. Update Azure App Registration

Go to Azure Portal → App Registrations → InChronicle MCP → API Permissions:

**Remove:**
- `ChannelMessage.Read.All` (if it was added)

**Ensure these are present:**
- ✅ `User.Read` (Delegated)
- ✅ `Team.ReadBasic.All` (Delegated)
- ✅ `Channel.ReadBasic.All` (Delegated)
- ✅ `ChannelMessage.Read` (Delegated) ← **Use this one, NOT .Read.All**
- ✅ `Chat.Read` (Delegated)
- ✅ `Chat.ReadBasic` (Delegated)
- ✅ `offline_access`

All of these should show **"No"** in the "Admin consent required" column.

### 2. Reconnect Teams Integration

1. Go to InChronicle MCP integrations page
2. Disconnect Teams (if already connected)
3. Click "Connect Teams"
4. You should see the standard Microsoft consent screen (NOT the admin approval screen)
5. Authorize the app

### 3. Update Atlassian App (Reminder)

Don't forget to also update your Atlassian OAuth app with the `read:confluence-space.summary` scope as mentioned earlier.

## Summary of All OAuth Updates

### Figma
- **New Scope:** `files:read`
- **Action Required:** Update Figma app settings, reconnect

### Confluence
- **New Scope:** Added `read:confluence-space.summary`
- **Action Required:** Update Atlassian Developer Console, reconnect

### Microsoft Teams
- **New Scope:** Changed `ChannelMessage.Read.All` → `ChannelMessage.Read`
- **Action Required:** Update Azure app registration, reconnect
- **Benefit:** No admin consent needed! 🎉

All updates are now deployed and ready for testing!
