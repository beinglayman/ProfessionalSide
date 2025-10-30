# Microsoft Suite MCP Integrations - Implementation Guide

**Date:** October 29, 2025
**Status:** Ready for Testing
**Version:** 1.0

---

## Overview

This guide documents the implementation of three new Microsoft Suite MCP integrations for InChronicle:
- **SharePoint** - Team collaboration and document management
- **OneDrive** - Personal file storage and sharing
- **OneNote** - Note-taking and knowledge management

These integrations complement the existing Outlook and Teams integrations, providing comprehensive coverage of Microsoft 365 productivity tools.

---

## Architecture

### Shared Authentication
All Microsoft tools (Outlook, Teams, SharePoint, OneDrive, OneNote) share the same OAuth application credentials:
- **Client ID**: `MICROSOFT_CLIENT_ID`
- **Client Secret**: `MICROSOFT_CLIENT_SECRET`
- **Tenant ID**: `MICROSOFT_TENANT_ID` (defaults to 'common' for multi-tenant)

### OAuth Scopes

Each tool requests specific Microsoft Graph API scopes:

| Tool | Scopes | Purpose |
|------|--------|---------|
| **SharePoint** | `Sites.Read.All`, `Files.Read.All` | Read SharePoint sites, lists, and document libraries |
| **OneDrive** | `Files.Read.All` | Read OneDrive files and folders |
| **OneNote** | `Notes.Read.All` | Read OneNote notebooks, sections, and pages |

All tools also include:
- `User.Read` - Basic user profile information
- `offline_access` - Refresh token support for long-term access

---

## Implementation Details

### Backend Components

#### 1. Type Definitions ([mcp.types.ts](backend/src/types/mcp.types.ts))

**New MCPToolType Enums:**
```typescript
export enum MCPToolType {
  // ... existing tools
  SHAREPOINT = 'sharepoint',
  ONEDRIVE = 'onedrive',
  ONENOTE = 'onenote'
}
```

**New Activity Interfaces:**
- `SharePointActivity` - Sites, recent files, and lists
- `OneDriveActivity` - Recent files, shared files, and folders
- `OneNoteActivity` - Notebooks, sections, and pages

#### 2. OAuth Service ([mcp-oauth.service.ts](backend/src/services/mcp/mcp-oauth.service.ts))

**New OAuth Configurations:**
- Automatically configured when `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` are present
- Default redirect URIs: `{BACKEND_URL}/api/v1/mcp/callback/{tool}`
- Can be overridden with environment variables: `SHAREPOINT_REDIRECT_URI`, `ONEDRIVE_REDIRECT_URI`, `ONENOTE_REDIRECT_URI`

**Group Authentication:**
Updated the `microsoft` tool group to include all five Microsoft tools:
```typescript
microsoft: [
  MCPToolType.OUTLOOK,
  MCPToolType.TEAMS,
  MCPToolType.SHAREPOINT,
  MCPToolType.ONEDRIVE,
  MCPToolType.ONENOTE
]
```

This allows users to connect all Microsoft tools with a single OAuth flow.

#### 3. Tool Implementations

**SharePoint Tool** ([sharepoint.tool.ts](backend/src/services/mcp/tools/sharepoint.tool.ts))
- Fetches followed SharePoint sites
- Retrieves recent files from site document libraries
- Gets recently updated SharePoint lists
- Filters results by date range (default: 30 days)
- Rate limiting: Checks max 5 sites for files, 3 sites for lists

**OneDrive Tool** ([onedrive.tool.ts](backend/src/services/mcp/tools/onedrive.tool.ts))
- Fetches recent files from `/me/drive/recent`
- Retrieves shared files from `/me/drive/sharedWithMe`
- Gets active folders from root directory
- Filters by date range (default: 30 days)
- Excludes folders from file listings

**OneNote Tool** ([onenote.tool.ts](backend/src/services/mcp/tools/onenote.tool.ts))
- Fetches user's notebooks
- Retrieves recently modified sections
- Gets recently created/edited pages
- Fetches content preview for top 10 pages
- Extracts plain text from HTML content
- Rate limiting: 100ms delay between page content fetches

### Frontend Components

#### 1. Service Types ([mcp.service.ts](src/services/mcp.service.ts))

Updated `MCPToolType` enum to include new tools.

#### 2. Integrations Page ([integrations.tsx](src/pages/settings/integrations.tsx))

**New Icons:**
- SharePoint: `Share2` (Lucide icon)
- OneDrive: `Cloud` (Lucide icon)
- OneNote: `BookOpen` (Lucide icon)

**Tool Descriptions:**
- SharePoint: "Import SharePoint site activity, documents, and list updates"
- OneDrive: "Import OneDrive file changes and collaboration activity"
- OneNote: "Import OneNote pages, notebooks, and note-taking activity"

---

## Microsoft Graph API Endpoints

### SharePoint
- `GET /me/followedSites` - User's followed sites
- `GET /sites/{site-id}/drive/recent` - Recent files in site
- `GET /sites/{site-id}/lists` - Site lists

### OneDrive
- `GET /me/drive/recent` - Recently accessed files (max 50)
- `GET /me/drive/sharedWithMe` - Files shared with user (max 30)
- `GET /me/drive/root/children` - Root folder contents (max 50)

### OneNote
- `GET /me/onenote/notebooks` - User's notebooks (max 25)
- `GET /me/onenote/sections` - All sections (max 50)
- `GET /me/onenote/pages` - All pages (max 100)
- `GET /me/onenote/pages/{id}/content` - Page HTML content

---

## Environment Variables

### Required (Shared with Outlook/Teams)
```bash
MICROSOFT_CLIENT_ID=your-app-client-id
MICROSOFT_CLIENT_SECRET=your-app-client-secret
MICROSOFT_TENANT_ID=common  # or specific tenant ID
```

### Optional (Override Defaults)
```bash
SHAREPOINT_REDIRECT_URI=https://yourdomain.com/api/v1/mcp/callback/sharepoint
ONEDRIVE_REDIRECT_URI=https://yourdomain.com/api/v1/mcp/callback/onedrive
ONENOTE_REDIRECT_URI=https://yourdomain.com/api/v1/mcp/callback/onenote
```

---

## Azure App Registration Setup

### Required API Permissions

If you already have a Microsoft OAuth app for Outlook/Teams, you need to add these permissions:

**Delegated Permissions:**
1. `Sites.Read.All` - Read items in all site collections
2. `Files.Read.All` - Read files user can access
3. `Notes.Read.All` - Read user's notebooks

**Grant Admin Consent:**
Some permissions may require admin consent depending on your organization's policies. Check with your Azure AD administrator.

### Redirect URIs

Add these redirect URIs to your Azure app registration:
- `{BACKEND_URL}/api/v1/mcp/callback/sharepoint`
- `{BACKEND_URL}/api/v1/mcp/callback/onedrive`
- `{BACKEND_URL}/api/v1/mcp/callback/onenote`

Or use the group callback (recommended):
- `{BACKEND_URL}/api/v1/mcp/callback/microsoft`

---

## Testing Checklist

### OAuth Flow
- [ ] Navigate to Settings > Integrations
- [ ] Click "Connect" for SharePoint
- [ ] Verify redirect to Microsoft OAuth page
- [ ] Grant permissions
- [ ] Verify redirect back to InChronicle
- [ ] Confirm tool shows as "Connected"
- [ ] Repeat for OneDrive and OneNote

### Data Fetching
- [ ] Create a new journal entry
- [ ] Select SharePoint in MCP tools
- [ ] Set date range to last 30 days
- [ ] Click "Fetch Activities"
- [ ] Verify data appears (sites, files, lists)
- [ ] Repeat for OneDrive (files, shared items, folders)
- [ ] Repeat for OneNote (notebooks, sections, pages)

### Journal Generation
- [ ] Select activities from fetched data
- [ ] Click "Generate Entry"
- [ ] Verify AI generates meaningful content
- [ ] Check that artifacts include links to SharePoint/OneDrive/OneNote
- [ ] Verify entry can be saved/published

### Privacy & Security
- [ ] Confirm data auto-expires after 30 minutes
- [ ] Verify disconnect removes OAuth tokens
- [ ] Check audit log shows fetch operations
- [ ] Ensure no sensitive data logged to console

---

## Rate Limiting & Performance

### SharePoint
- Checks max **5 sites** for recent files
- Checks max **3 sites** for lists
- 100ms delay between site queries

### OneDrive
- Fetches max **50 recent files**
- Fetches max **30 shared files**
- Fetches max **50 folders**

### OneNote
- Fetches max **25 notebooks**
- Fetches max **50 sections**
- Fetches max **100 pages**
- Content preview for top **10 pages only**
- 100ms delay between content fetches

These limits prevent rate limiting and ensure reasonable performance.

---

## User Value Proposition

### SharePoint
**High Value** - Captures team collaboration context
- Documents created/modified in team sites
- SharePoint list updates (project tracking)
- Site membership and activity

**Journal Entry Examples:**
- "Updated 5 documents in Project Alpha SharePoint site"
- "Contributed to 3 team lists across 2 sites"
- "Collaborated on proposal documents in Client Hub"

### OneDrive
**High Value** - Tracks personal document work
- Recent file modifications
- File sharing and collaboration
- Folder organization

**Journal Entry Examples:**
- "Organized 12 files across OneDrive folders"
- "Shared 5 documents with team members"
- "Updated quarterly reports in OneDrive"

### OneNote
**High Value** - Captures knowledge work
- Meeting notes creation
- Project planning and brainstorming
- Personal knowledge management

**Journal Entry Examples:**
- "Created 7 meeting notes in Project notebook"
- "Updated planning sections across 3 notebooks"
- "Documented technical research in Engineering notebook"

---

## Known Limitations

### SharePoint
- Only fetches from **followed sites** (not all accessible sites)
- List item details not available (only list metadata)
- Site activity limited to last 30 days by default

### OneDrive
- "Recent files" endpoint has 50-item limit
- Shared files use `lastModifiedDateTime` as proxy for share date
- Cannot distinguish between user's edits vs. others' edits on shared files

### OneNote
- Page content fetching is slow (HTML parsing required)
- Only fetches top 10 page content previews to avoid rate limits
- Cannot access content inside page sections/regions

### All Tools
- No real-time updates (fetch on-demand only)
- Date filtering done client-side for some endpoints
- Microsoft Graph API rate limits apply (429 errors possible)

---

## Troubleshooting

### OAuth Errors

**Error: "SharePoint not connected"**
- Check `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` are set
- Verify Azure app has `Sites.Read.All` permission
- Ensure redirect URI is configured in Azure app

**Error: "Insufficient privileges"**
- User may not have accepted required permissions
- Admin consent may be required for your organization
- Check Azure app permissions are granted (not just added)

### Data Fetching Errors

**Error: "No data returned"**
- Check date range (default is last 30 days)
- Verify user has activity in that date range
- For SharePoint: User must "follow" sites to see them
- For OneNote: User must have created notebooks

**Error: "429 Too Many Requests"**
- Microsoft Graph API rate limit exceeded
- Wait 60 seconds and retry
- Consider reducing date range to fetch less data

### Empty Results

**SharePoint returns 0 items:**
- User hasn't followed any SharePoint sites
- No recent activity in followed sites
- Try extending date range

**OneDrive returns 0 items:**
- No recent file activity
- Try extending date range beyond 30 days

**OneNote returns 0 items:**
- User hasn't created OneNote notebooks
- No recent page/section activity

---

## Future Enhancements

### Potential Additions

1. **Word/Excel/PowerPoint Online**
   - Currently covered by OneDrive/SharePoint file activity
   - Could add specific file type filtering and metrics
   - Example: "Edited 5 Word documents" instead of "Modified 5 files"

2. **SharePoint Enhancements**
   - Fetch from all accessible sites (not just followed)
   - Include list item details and changes
   - Add site analytics (page views, visitor counts)

3. **OneDrive Enhancements**
   - Version history tracking
   - Collaboration metrics (co-authors, reviewers)
   - File type breakdown and statistics

4. **OneNote Enhancements**
   - Full-text search across notebooks
   - Tag extraction and categorization
   - Meeting notes vs. project notes classification

5. **Cross-Tool Intelligence**
   - Link SharePoint documents to OneNote meeting notes
   - Connect OneDrive files to email attachments (Outlook)
   - Associate Teams discussions with shared files

---

## Support & Feedback

### Documentation
- Main MCP docs: [MCP_ACCEPTANCE_CRITERIA.md](MCP_ACCEPTANCE_CRITERIA.md)
- GitHub integration: [GITHUB_MCP_ACCEPTANCE_CRITERIA.md](GITHUB_MCP_ACCEPTANCE_CRITERIA.md)
- Security summary: [SECURITY_REMEDIATION_SUMMARY.md](SECURITY_REMEDIATION_SUMMARY.md)

### Reporting Issues
If you encounter issues with the Microsoft Suite integrations:
1. Check backend logs: `az webapp log tail -g ps-prod-rg -n ps-backend-1758551070`
2. Check browser console for frontend errors
3. Verify OAuth tokens in database: `SELECT * FROM "mcp_integrations" WHERE "toolType" IN ('sharepoint', 'onedrive', 'onenote')`
4. Review audit logs in Settings > Integrations > "View Audit Log"

---

**Document Version:** 1.0
**Last Updated:** October 29, 2025
**Status:** Implementation Complete, Ready for Testing
