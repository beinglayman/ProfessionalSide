# Confluence MCP Integration - Final Fix

## Issues Identified from Logs

After deploying the initial Confluence fix, the logs revealed TWO critical issues:

### Issue 1: 410 Gone - Deprecated API Endpoint
```
[Confluence Tool] Error fetching spaces: AxiosError: Request failed with status code 410
message: 'This deprecated endpoint has been removed.'
```

**Root Cause**: Atlassian deprecated the v1 spaces API endpoint `/wiki/rest/api/space`

**Fix**: Migrated to v2 API `/wiki/api/v2/spaces`

### Issue 2: 401 Unauthorized - Missing OAuth Scopes
```
[Confluence Tool] Error fetching pages: AxiosError: Request failed with status code 401
```

**Root Cause**: Missing OAuth scopes for page and comment access

**Fix**: Added `read:page:confluence` and `read:comment:confluence` to OAuth scopes

## Changes Made

### 1. Spaces API Migration (confluence.tool.ts:208-236)
```typescript
// BEFORE - Using deprecated v1 API
const response = await this.confluenceApi!.get('/wiki/rest/api/space', {
  params: {
    limit: 25,
    expand: 'description.plain,homepage'
  }
});

// AFTER - Using v2 API
const response = await this.confluenceApi!.get('/wiki/api/v2/spaces', {
  params: {
    limit: 25
  }
});
```

### 2. OAuth Scopes Update (mcp-oauth.service.ts:122-123)
```typescript
// BEFORE
scope: 'read:confluence-content.all read:confluence-space.summary read:confluence-user offline_access'

// AFTER
scope: 'read:confluence-content.all read:confluence-space.summary read:confluence-user read:page:confluence read:comment:confluence offline_access'
```

## All Confluence Fixes Combined

1. ✅ **CQL Query Enhancement** - Check both `created` AND `lastmodified` dates
2. ✅ **Date Range Extension** - Increased from 7 to 30 days default
3. ✅ **API v2 Migration** - Fixed 410 Gone error
4. ✅ **OAuth Scopes** - Added page and comment read permissions
5. ✅ **Comprehensive Logging** - Detailed diagnostics at every step

## Deployment Info

- **Image**: `psacr1758551070.azurecr.io/inchronicle-backend:confluence-v2-scopes`
- **Build Status**: In progress
- **Files Modified**:
  - `backend/src/services/mcp/tools/confluence.tool.ts`
  - `backend/src/services/mcp/mcp-oauth.service.ts`

## Next Steps After Deployment

**IMPORTANT**: You MUST reconnect Confluence OAuth after deployment

1. **Disconnect Confluence** - Go to MCP settings and disconnect
2. **Reconnect Confluence** - New OAuth flow will request updated scopes
3. **Test with your data**:
   - 2 pages you created
   - 1 comment you added
   - Should now appear in MCP fetch

## Expected Behavior

After reconnecting with new scopes:
- ✅ Pages API will return your 2 created pages
- ✅ Comments API will return your 1 comment
- ✅ Spaces API will work without 410 errors
- ✅ Detailed logs will show exactly what's being fetched

## Logs to Monitor

```
[Confluence Tool] Starting fetch for user {userId}
[Confluence Tool] Access token retrieved successfully
[Confluence Tool] Initialized with cloud ID: {cloudId}
[Confluence Tool] Date range: {start} to {end}
[Confluence Tool] Fetched {count} spaces
[Confluence Tool] Pages CQL query: {query}
[Confluence Tool] Pages API response: {count} pages found
[Confluence Tool] Fetched {count} comments
[Confluence Tool] Successfully fetched {total} total items
```

## Status

🔄 **Building** - Docker image in progress
⏳ **Pending Deployment** - Will deploy once build completes
📋 **Action Required** - You must reconnect Confluence OAuth after deployment