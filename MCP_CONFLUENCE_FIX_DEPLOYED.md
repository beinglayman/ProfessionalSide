# Confluence MCP Integration Fix - Deployed

## Issue Summary
User reported that Confluence MCP integration was returning 0 activities despite creating:
- 2 new pages
- 1 comment on a page

## Root Cause Analysis

### Problem Identified
1. **CQL Query Limitation**: The original query only looked for `lastmodified` date, missing newly created pages
2. **Date Range Too Narrow**: Default 7 days might miss some activities
3. **Lack of Diagnostic Logging**: No visibility into what was happening during the fetch

## Fix Implementation

### 1. Enhanced CQL Queries
```typescript
// BEFORE: Only checking lastmodified
const cql = `lastmodified >= "${startDate}" AND lastmodified <= "${endDate}" AND type = page`

// AFTER: Checking both created AND lastmodified
const cql = `(created >= "${startDateStr}" AND created <= "${endDateStr}" OR lastmodified >= "${startDateStr}" AND lastmodified <= "${endDateStr}") AND type = page ORDER BY lastmodified DESC`
```

### 2. Extended Date Range
- Changed default date range from 7 days to 30 days for better coverage
- This ensures recently created content is captured even if the user selects a narrow range

### 3. Comprehensive Diagnostic Logging
Added detailed logging at every step:
- Access token retrieval status
- Cloud ID initialization
- Date range being queried
- CQL queries being executed
- Number of items found for each type (pages, blog posts, comments)
- Current user information
- Error details with response data

### 4. Increased Limits
- Pages limit increased from 30 to 50
- Added `history` expansion to capture creation dates

## Files Modified

### `/backend/src/services/mcp/tools/confluence.tool.ts`

1. **fetchActivity method** (lines 65-180)
   - Added comprehensive logging
   - Extended default date range to 30 days
   - Added detailed error logging

2. **fetchCurrentUser method** (lines 185-203)
   - Added user context logging
   - Enhanced error details

3. **fetchRecentPages method** (lines 224-276)
   - Fixed CQL to include created OR lastmodified
   - Added query logging
   - Increased limit to 50
   - Added sample page logging for debugging

4. **fetchBlogPosts method** (lines 281-324)
   - Fixed CQL to include created OR lastmodified
   - Added query and response logging

## Deployment Details

- **Build Command**: `az acr build --image inchronicle-backend:confluence-fix`
- **Container Update**: Updated to `psacr1758551070.azurecr.io/inchronicle-backend:confluence-fix`
- **Backend Restart**: Completed successfully
- **Deployment Time**: October 24, 2025

## Expected Behavior After Fix

1. **New Pages**: Will be captured immediately based on `created` date
2. **Modified Pages**: Will be captured based on `lastmodified` date
3. **Better Coverage**: 30-day default range ensures recent activities aren't missed
4. **Visibility**: Detailed logs will show exactly what's being fetched

## Testing Instructions

1. Reconnect Confluence OAuth (if needed)
2. Create test content:
   - Create a new page
   - Edit an existing page
   - Add a comment
3. Fetch activities using MCP
4. Check logs for detailed diagnostic information

## Monitoring

The following logs will now appear in Azure:
```
[Confluence Tool] Starting fetch for user {userId}
[Confluence Tool] Access token retrieved successfully
[Confluence Tool] Initialized with cloud ID: {cloudId}
[Confluence Tool] Date range: {startDate} to {endDate}
[Confluence Tool] Pages CQL query: {query}
[Confluence Tool] Pages API response: {count} pages found
[Confluence Tool] Sample page: {title, created, modified}
[Confluence Tool] Blog posts CQL query: {query}
[Confluence Tool] Blog posts API response: {count} posts found
[Confluence Tool] Fetched data:
  - Current user: Yes/No
  - Spaces: {count}
  - Pages: {count}
  - Blog posts: {count}
[Confluence Tool] Fetched {count} comments
[Confluence Tool] Successfully fetched {total} total items for user {userId}
```

## Status
✅ **DEPLOYED** - The fix is now live in production

## Next Steps
Please test the Confluence integration again with the same test data. The activities should now be properly fetched and displayed.