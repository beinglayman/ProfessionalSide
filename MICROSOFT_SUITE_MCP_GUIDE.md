# Microsoft Suite MCP Integrations - Implementation Guide

**Date:** October 30, 2025
**Status:** Ready for Testing
**Version:** 1.1

---

## Overview

This guide documents the Microsoft Suite MCP integrations for InChronicle:
- **OneDrive** - Personal file storage and sharing
- **OneNote** - Note-taking and knowledge management

These integrations complement the existing Outlook and Teams integrations, providing comprehensive coverage of Microsoft 365 productivity tools without requiring admin consent.

**Note:** SharePoint has been intentionally excluded to avoid admin consent requirements (`Sites.Read.All` permission), making the integration B2C-compatible.

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
| **OneDrive** | `Files.Read` | Read OneDrive files user has access to (no admin consent) |
| **OneNote** | `Notes.Read` | Read OneNote notebooks, sections, and pages (no admin consent) |

All tools also include:
- `User.Read` - Basic user profile information
- `offline_access` - Refresh token support for long-term access

**Permissions Philosophy:** All scopes are user-delegated and do not require admin consent, ensuring B2C compatibility.

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
The `microsoft` tool group includes four Microsoft tools:
```typescript
microsoft: [
  MCPToolType.OUTLOOK,
  MCPToolType.TEAMS,
  MCPToolType.ONEDRIVE,
  MCPToolType.ONENOTE
]
```

This allows users to connect all Microsoft tools with a single OAuth flow without requiring admin consent.

#### 3. Tool Implementations

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
- OneDrive: `Cloud` (Lucide icon)
- OneNote: `BookOpen` (Lucide icon)

**Tool Descriptions:**
- OneDrive: "Import OneDrive file changes and collaboration activity"
- OneNote: "Import OneNote pages, notebooks, and note-taking activity"

---

## Microsoft Graph API Endpoints

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
ONEDRIVE_REDIRECT_URI=https://yourdomain.com/api/v1/mcp/callback/onedrive
ONENOTE_REDIRECT_URI=https://yourdomain.com/api/v1/mcp/callback/onenote
```

---

## Azure App Registration Setup

### Required API Permissions

If you already have a Microsoft OAuth app for Outlook/Teams, you need to add these permissions:

**Delegated Permissions (No Admin Consent Required):**
1. `Files.Read` - Read files user has access to in OneDrive
2. `Notes.Read` - Read user's OneNote notebooks

**Why These Permissions:**
- `Files.Read` provides access to OneDrive files the user can already access (no admin consent)
- `Notes.Read` provides access to user's own notebooks (no admin consent)
- SharePoint intentionally excluded to avoid `Sites.Read.All` which requires admin consent

### Redirect URIs

Add these redirect URIs to your Azure app registration:
- `{BACKEND_URL}/api/v1/mcp/callback/onedrive`
- `{BACKEND_URL}/api/v1/mcp/callback/onenote`

Or use the group callback (recommended):
- `{BACKEND_URL}/api/v1/mcp/callback/microsoft`

---

## Testing Checklist

### OAuth Flow
- [ ] Navigate to Settings > Integrations
- [ ] Click "Connect" for OneDrive
- [ ] Verify redirect to Microsoft OAuth page
- [ ] Grant permissions (no admin consent required)
- [ ] Verify redirect back to InChronicle
- [ ] Confirm tool shows as "Connected"
- [ ] Repeat for OneNote

### Data Fetching
- [ ] Create a new journal entry
- [ ] Select OneDrive in MCP tools
- [ ] Set date range to last 30 days
- [ ] Click "Fetch Activities"
- [ ] Verify data appears (files, shared items, folders)
- [ ] Repeat for OneNote (notebooks, sections, pages)

### Journal Generation
- [ ] Select activities from fetched data
- [ ] Click "Generate Entry"
- [ ] Verify AI generates meaningful content
- [ ] Check that artifacts include links to OneDrive/OneNote
- [ ] Verify entry can be saved/published

### Privacy & Security
- [ ] Confirm data auto-expires after 30 minutes
- [ ] Verify disconnect removes OAuth tokens
- [ ] Check audit log shows fetch operations
- [ ] Ensure no sensitive data logged to console

---

## Rate Limiting & Performance

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

**Error: "Insufficient privileges"**
- User may not have accepted required permissions
- Admin consent may be required for your organization
- Check Azure app permissions are granted (not just added)

### Data Fetching Errors

**Error: "No data returned"**
- Check date range (default is last 30 days)
- Verify user has activity in that date range
- For OneNote: User must have created notebooks
- For OneDrive: Ensure user has files in OneDrive

**Error: "429 Too Many Requests"**
- Microsoft Graph API rate limit exceeded
- Wait 60 seconds and retry
- Consider reducing date range to fetch less data

### Empty Results

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
   - Currently covered by OneDrive file activity
   - Could add specific file type filtering and metrics
   - Example: "Edited 5 Word documents" instead of "Modified 5 files"

2. **OneDrive Enhancements**
   - Version history tracking
   - Collaboration metrics (co-authors, reviewers)
   - File type breakdown and statistics

4. **OneNote Enhancements**
   - Full-text search across notebooks
   - Tag extraction and categorization
   - Meeting notes vs. project notes classification

5. **Cross-Tool Intelligence**
   - Connect OneDrive files to email attachments (Outlook)
   - Associate Teams discussions with shared files
   - Link OneNote meeting notes to calendar events

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
3. Verify OAuth tokens in database: `SELECT * FROM "mcp_integrations" WHERE "toolType" IN ('onedrive', 'onenote')`
4. Review audit logs in Settings > Integrations > "View Audit Log"

---

**Document Version:** 1.1
**Last Updated:** October 30, 2025
**Status:** SharePoint Removed for B2C Compatibility, OneDrive Permissions Reduced to Files.Read
