# Microsoft Suite MCP Integrations - Acceptance Criteria

**Date:** October 30, 2025
**Version:** 1.1
**Status:** SharePoint Removed for B2C Compatibility

---

## Table of Contents
1. [OneDrive Acceptance Criteria](#onedrive-acceptance-criteria)
2. [OneNote Acceptance Criteria](#onenote-acceptance-criteria)
3. [Cross-Tool Integration Criteria](#cross-tool-integration-criteria)
4. [Privacy & Security Criteria](#privacy--security-criteria)
5. [Testing Scenarios](#testing-scenarios)

**Note:** SharePoint acceptance criteria removed. SharePoint integration disabled to avoid admin consent requirements (`Sites.Read.All` permission).

---

## ~~SharePoint Acceptance Criteria~~ (Removed)

### AC-SP1: Site Activity Tracking

#### Given
- User has connected SharePoint via OAuth
- User follows one or more SharePoint sites

#### When
- User fetches SharePoint activity with date range

#### Then
- [ ] System fetches user's followed sites
- [ ] Shows site name, display name, and web URL
- [ ] Displays site description when available
- [ ] Shows site creation and last modified dates
- [ ] Maximum 25 sites retrieved
- [ ] Sites ordered by most recently modified

#### Success Metrics
- All followed sites appear in results
- Site metadata is complete and accurate
- Sites display in chronological order

---

### AC-SP2: Document Activity Tracking

#### Given
- User has connected SharePoint
- User has accessed documents in SharePoint sites within date range

#### When
- User fetches SharePoint activity for specific date range

#### Then
- [ ] System fetches recent files from followed sites
- [ ] Checks maximum 5 sites to avoid rate limiting
- [ ] Shows file name, type, size, and web URL
- [ ] Displays last modified date and last modified by user
- [ ] Includes site name and site ID for context
- [ ] Maximum 20 files per site checked
- [ ] Only files modified within date range are included
- [ ] Folders are excluded from file listings

#### Success Metrics
- Recent file activity appears correctly
- Files filtered by date range accurately
- File metadata includes all required fields
- Performance remains under 10 seconds for 5 sites

#### Exclusions
- ❌ Do NOT fetch files user cannot access
- ❌ Do NOT fetch deleted or archived files
- ❌ Do NOT fetch files from sites user doesn't follow
- ❌ Do NOT include folder items in file counts

---

### AC-SP3: SharePoint List Activity

#### Given
- User has connected SharePoint
- User works with SharePoint lists within date range

#### When
- User fetches SharePoint activity

#### Then
- [ ] System fetches recently updated SharePoint lists
- [ ] Checks maximum 3 sites to avoid rate limiting
- [ ] Shows list name, display name, and description
- [ ] Displays list type (generic, document library, etc.)
- [ ] Includes web URL and site name
- [ ] Maximum 10 lists per site checked
- [ ] Only lists modified within date range included

#### Success Metrics
- Active lists appear in results
- List metadata is complete
- Lists filtered by date range correctly

#### Exclusions
- ❌ Do NOT fetch list item details (only list metadata)
- ❌ Do NOT fetch system lists (hidden lists)
- ❌ Do NOT include item-level changes
- ❌ Do NOT fetch lists from unfollowed sites

---

### AC-SP4: Privacy & Rate Limiting

#### Given
- User initiates SharePoint fetch

#### When
- System queries Microsoft Graph API

#### Then
- [ ] Maximum 5 sites checked for file activity
- [ ] Maximum 3 sites checked for list activity
- [ ] 100ms delay between site queries
- [ ] No data persisted to database
- [ ] All data expires after 30 minutes
- [ ] Access tokens encrypted at rest

#### Success Metrics
- No rate limit errors (429 responses)
- Fetch completes within 30 seconds
- No sensitive data in logs

---

### AC-SP5: Journal Entry Generation

#### Given
- SharePoint activity has been fetched
- User selects SharePoint activities to include

#### When
- User generates journal entry

#### Then
- [ ] Title reflects main activity type (e.g., "Worked on 5 SharePoint files")
- [ ] Description mentions number of files, lists, and sites
- [ ] Lists affected sites by name
- [ ] Includes file types worked on
- [ ] Top 5 files included as artifacts with links
- [ ] Top 3 lists included as artifacts with links
- [ ] All artifact links are clickable and valid

#### Success Metrics
- Generated content is meaningful and accurate
- Links open correct SharePoint resources
- Activity categorization makes sense

---

## OneDrive Acceptance Criteria

### AC-OD1: Recent File Activity

#### Given
- User has connected OneDrive via OAuth
- User has modified files in OneDrive within date range

#### When
- User fetches OneDrive activity

#### Then
- [ ] System fetches recent files using `/me/drive/recent` API
- [ ] Maximum 50 files retrieved
- [ ] Shows file name, type, size, and web URL
- [ ] Displays created date and last modified date
- [ ] Shows last modified by user name
- [ ] Includes parent path for context
- [ ] Only files (not folders) included in results
- [ ] Files filtered by date range (created or modified)

#### Success Metrics
- Recent file modifications appear correctly
- File metadata is complete and accurate
- Date filtering works correctly

#### Exclusions
- ❌ Do NOT include folders in file listings
- ❌ Do NOT fetch files user cannot access
- ❌ Do NOT include deleted files
- ❌ Do NOT fetch files older than date range

---

### AC-OD2: Shared File Collaboration

#### Given
- User has connected OneDrive
- User has shared files or received shared files within date range

#### When
- User fetches OneDrive activity

#### Then
- [ ] System fetches shared files using `/me/drive/sharedWithMe` API
- [ ] Maximum 30 shared files retrieved
- [ ] Shows file name, type, and web URL
- [ ] Displays shared date (approximated by lastModifiedDateTime)
- [ ] Lists users/groups file is shared with
- [ ] Shows sharing permissions (view, edit, etc.)
- [ ] Only files (not folders) included
- [ ] Filtered by modification date as proxy for share date

#### Success Metrics
- Shared files appear in results
- Sharing metadata is accurate
- Collaboration context is clear

#### Exclusions
- ❌ Do NOT include files where user is sole owner with no shares
- ❌ Do NOT fetch expired share links
- ❌ Do NOT include folder shares (only file shares)

---

### AC-OD3: Folder Organization Activity

#### Given
- User has connected OneDrive
- User has organized folders within date range

#### When
- User fetches OneDrive activity

#### Then
- [ ] System fetches root-level folders
- [ ] Maximum 50 folders retrieved
- [ ] Only folders included (files excluded from this query)
- [ ] Shows folder name, web URL, and item count
- [ ] Displays last modified date
- [ ] Only folders modified within date range included
- [ ] Ordered by most recently modified

#### Success Metrics
- Active folders appear correctly
- Folder metadata includes item counts
- Date filtering accurate

#### Exclusions
- ❌ Do NOT fetch nested subfolder hierarchy
- ❌ Do NOT include system folders (Recycle Bin, etc.)
- ❌ Do NOT fetch folders with no recent activity

---

### AC-OD4: File Type Intelligence

#### Given
- OneDrive files have been fetched

#### When
- System processes file activity

#### Then
- [ ] File type extracted from file extension
- [ ] Common types recognized: docx, xlsx, pptx, pdf, png, jpg, etc.
- [ ] Unknown types marked as 'unknown'
- [ ] File type used in journal entry descriptions
- [ ] File type statistics included (e.g., "5 Word docs, 3 Excel files")

#### Success Metrics
- File types correctly identified
- Type statistics accurate
- Meaningful categorization in journal

---

### AC-OD5: Journal Entry Generation

#### Given
- OneDrive activity has been fetched
- User selects OneDrive activities to include

#### When
- User generates journal entry

#### Then
- [ ] Title reflects main activity (e.g., "Worked on 12 OneDrive files")
- [ ] Description includes file count and types
- [ ] Mentions shared files if applicable
- [ ] Lists folder organization activity
- [ ] Top 5 recent files as artifacts
- [ ] Top 3 shared files as artifacts
- [ ] All artifact links work correctly

#### Success Metrics
- Content accurately reflects OneDrive work
- File type breakdown is clear
- Collaboration activity highlighted

---

## OneNote Acceptance Criteria

### AC-ON1: Notebook Discovery

#### Given
- User has connected OneNote via OAuth
- User has OneNote notebooks

#### When
- User fetches OneNote activity

#### Then
- [ ] System fetches user's notebooks using `/me/onenote/notebooks` API
- [ ] Maximum 25 notebooks retrieved
- [ ] Shows notebook display name and web URL
- [ ] Displays created date and last modified date
- [ ] Indicates default notebook with boolean flag
- [ ] Includes section count (if available)
- [ ] Ordered by most recently modified

#### Success Metrics
- All user's notebooks appear
- Notebook metadata complete
- Default notebook clearly marked

#### Exclusions
- ❌ Do NOT fetch shared notebooks user doesn't own (unless explicitly granted access)
- ❌ Do NOT include archived notebooks

---

### AC-ON2: Section Activity Tracking

#### Given
- User has connected OneNote
- User has modified notebook sections within date range

#### When
- User fetches OneNote activity

#### Then
- [ ] System fetches sections using `/me/onenote/sections` API
- [ ] Maximum 50 sections retrieved
- [ ] Shows section display name and web URL
- [ ] Displays parent notebook name
- [ ] Shows created and last modified dates
- [ ] Includes page count (if available)
- [ ] Only sections modified within date range included
- [ ] Ordered by most recently modified

#### Success Metrics
- Active sections appear in results
- Section-to-notebook relationship clear
- Date filtering accurate

#### Exclusions
- ❌ Do NOT fetch empty sections with no pages
- ❌ Do NOT include deleted sections

---

### AC-ON3: Page Activity Tracking

#### Given
- User has connected OneNote
- User has created or edited pages within date range

#### When
- User fetches OneNote activity

#### Then
- [ ] System fetches pages using `/me/onenote/pages` API
- [ ] Maximum 100 pages retrieved initially
- [ ] Shows page title and web URL
- [ ] Displays created date and last modified date
- [ ] Includes parent section name and notebook name
- [ ] Content preview for top 10 pages (performance optimization)
- [ ] Only pages created or modified within date range included
- [ ] Ordered by most recently modified

#### Success Metrics
- Recent page activity captured correctly
- Page context (section, notebook) clear
- Content previews meaningful

#### Exclusions
- ❌ Do NOT fetch untitled/empty pages
- ❌ Do NOT include pages from deleted sections
- ❌ Do NOT fetch full page content for all pages (only top 10)

---

### AC-ON4: Content Preview Extraction

#### Given
- OneNote pages have been fetched

#### When
- System retrieves page content (top 10 pages only)

#### Then
- [ ] Fetches page content using `/me/onenote/pages/{id}/content` API
- [ ] Content returned as HTML
- [ ] Strips HTML tags to extract plain text
- [ ] Removes scripts, styles, and formatting
- [ ] Converts HTML entities to plain text
- [ ] Normalizes whitespace
- [ ] Truncates to 200 characters for preview
- [ ] 100ms delay between content fetches to avoid rate limits

#### Success Metrics
- Content preview is readable
- No HTML tags in preview text
- Preview gives sense of page content

#### Exclusions
- ❌ Do NOT include images or attachments in preview
- ❌ Do NOT fetch content for pages beyond top 10
- ❌ Do NOT include formatting or styling information

---

### AC-ON5: Journal Entry Generation

#### Given
- OneNote activity has been fetched
- User selects OneNote activities to include

#### When
- User generates journal entry

#### Then
- [ ] Title reflects main activity (e.g., "Created 7 OneNote pages")
- [ ] Description includes page, section, and notebook counts
- [ ] Lists affected notebooks by name
- [ ] Highlights knowledge organization activity
- [ ] Top 5 pages as artifacts with content preview
- [ ] Top 3 sections as artifacts
- [ ] All links open correct OneNote resources

#### Success Metrics
- Content reflects note-taking and knowledge work
- Notebook organization clear
- Meeting notes vs. project notes distinguishable

---

## Cross-Tool Integration Criteria

### AC-CT1: Combined Microsoft Suite Fetching

#### Given
- User has connected multiple Microsoft tools
- User selects "Fetch from all Microsoft tools"

#### When
- User initiates combined fetch

#### Then
- [ ] All Microsoft tools queried in parallel
- [ ] Results combined into unified activity view
- [ ] Each activity tagged with source tool
- [ ] Duplicate activities detected and merged
- [ ] Total activity count shown per tool
- [ ] Fetch completes within 45 seconds for all tools

#### Success Metrics
- All tools fetch successfully
- Results clearly attributed to source
- No duplicate entries

---

### AC-CT2: Activity Deduplication

#### Given
- Same file appears in multiple tools (e.g., SharePoint and OneDrive)

#### When
- System organizes activities

#### Then
- [ ] Duplicate files identified by ID or URL
- [ ] Most detailed version retained
- [ ] Source tools indicated (e.g., "SharePoint & OneDrive")
- [ ] Timestamps reconciled (use most recent)
- [ ] Context from both sources preserved

#### Success Metrics
- No duplicate artifacts in journal
- User sees unified view
- Context not lost

---

### AC-CT3: Related Activity Detection

#### Given
- Activities from different tools may be related

#### When
- AI processes combined activities

#### Then
- [ ] OneNote meeting notes linked to calendar events (Outlook)
- [ ] SharePoint documents mentioned in Teams messages
- [ ] OneDrive files shared via email (Outlook)
- [ ] Related activities grouped in journal entry
- [ ] Context enriched with cross-tool information

#### Success Metrics
- Relationships detected accurately
- Journal entry tells complete story
- User doesn't have to manually connect dots

---

## Privacy & Security Criteria

### AC-PS1: Data Retention Compliance

#### Given
- User fetches activity from Microsoft tools

#### When
- Data is stored temporarily

#### Then
- [ ] No data persisted to database
- [ ] All data stored in memory only
- [ ] Session expires after 30 minutes
- [ ] Expired sessions auto-deleted
- [ ] No cache files created
- [ ] No data in localStorage or sessionStorage

#### Success Metrics
- Zero database records for fetched data
- Memory cleaned after 30 minutes
- No data survives server restart

---

### AC-PS2: OAuth Token Security

#### Given
- User connects Microsoft tools

#### When
- OAuth tokens are stored

#### Then
- [ ] Access tokens encrypted with AES-256
- [ ] Refresh tokens encrypted with AES-256
- [ ] Encryption key from environment variable
- [ ] Tokens never logged to console or files
- [ ] Tokens never sent to client
- [ ] Tokens deleted on disconnect

#### Success Metrics
- Database inspection shows encrypted tokens only
- No plaintext tokens in logs
- Tokens revoked on disconnect

---

### AC-PS3: Scope Minimization

#### Given
- User grants permissions to Microsoft tools

#### When
- OAuth consent screen displays

#### Then
- [ ] Only required scopes requested (minimal permissions)
- [ ] OneDrive: `Files.Read` (user-delegated, no admin consent)
- [ ] OneNote: `Notes.Read` (user-delegated, no admin consent)
- [ ] No write permissions requested
- [ ] No admin consent required for any permission
- [ ] Offline access for refresh tokens
- [ ] SharePoint excluded (would require `Sites.Read.All` admin consent)

#### Success Metrics
- Minimal scope set requested
- User sees only necessary permissions
- No admin consent warnings or requirements
- B2C-compatible permissions only

---

### AC-PS4: Audit Logging

#### Given
- User performs MCP operations

#### When
- Operations complete

#### Then
- [ ] All fetch operations logged to `mcp_audit` table
- [ ] Logs include: user ID, tool type, timestamp, success/failure
- [ ] Item counts logged (not actual data)
- [ ] Error messages logged (sanitized)
- [ ] Session IDs recorded
- [ ] Logs retained for 90 days

#### Success Metrics
- Complete audit trail available
- No sensitive data in logs
- Logs support debugging and compliance

---

## Testing Scenarios

### Scenario 1: New User - First SharePoint Connection

#### Steps
1. User signs up for InChronicle
2. Navigates to Settings > Integrations
3. Clicks "Connect" for SharePoint
4. Redirected to Microsoft OAuth
5. Grants permissions
6. Redirected back to InChronicle

#### Expected Results
- [ ] OAuth flow completes successfully
- [ ] SharePoint shows as "Connected"
- [ ] Connection timestamp recorded
- [ ] Audit log shows connection event
- [ ] User can immediately fetch data

---

### Scenario 2: Power User - Fetch All Microsoft Tools

#### Setup
- User has connected all 5 Microsoft tools
- User has activity across all tools in last 30 days

#### Steps
1. User creates new journal entry
2. Selects all Microsoft tools
3. Sets date range: last 30 days
4. Clicks "Fetch Activities"

#### Expected Results
- [ ] All 5 tools fetch in parallel
- [ ] Results appear within 45 seconds
- [ ] Each tool shows activity count
- [ ] Activities organized by type
- [ ] No duplicate entries
- [ ] Performance acceptable

---

### Scenario 3: SharePoint Document Collaboration

#### Setup
- User follows 3 SharePoint sites
- User edited 10 documents in last week
- User updated 2 SharePoint lists

#### Steps
1. User fetches SharePoint activity (7-day range)
2. Reviews fetched data
3. Selects all documents and 1 list
4. Generates journal entry

#### Expected Results
- [ ] All 10 documents appear
- [ ] Both lists appear
- [ ] Site names shown for context
- [ ] File types identified correctly
- [ ] Generated entry mentions "10 documents across 3 sites"
- [ ] Artifacts include document links
- [ ] Links work when clicked

---

### Scenario 4: OneDrive File Sharing

#### Setup
- User modified 5 files in OneDrive
- User shared 3 files with team members
- User organized files into 2 new folders

#### Steps
1. User fetches OneDrive activity (14-day range)
2. Reviews activity breakdown
3. Selects shared files and 1 folder
4. Generates journal entry

#### Expected Results
- [ ] 5 recent files listed
- [ ] 3 shared files listed with sharing details
- [ ] 2 folders shown with item counts
- [ ] Generated entry highlights collaboration
- [ ] Shared users/groups displayed
- [ ] File types categorized correctly

---

### Scenario 5: OneNote Meeting Notes

#### Setup
- User created 7 pages in "Meeting Notes" section
- User updated 3 pages in "Project Planning" section
- User organized into 2 notebooks

#### Steps
1. User fetches OneNote activity (30-day range)
2. Reviews pages by notebook and section
3. Selects meeting note pages
4. Generates journal entry

#### Expected Results
- [ ] All 10 pages appear
- [ ] Pages grouped by section and notebook
- [ ] Content preview available for recent pages
- [ ] Generated entry mentions "7 meeting notes"
- [ ] Context shows which meetings/projects
- [ ] Links open correct OneNote pages

---

### Scenario 6: Date Range Filtering

#### Setup
- User has activity spanning 90 days

#### Steps
1. User fetches with 7-day range
2. Verifies only last 7 days included
3. User changes to 30-day range
4. Verifies more activities appear
5. User tries future date range

#### Expected Results
- [ ] 7-day range returns subset
- [ ] 30-day range returns more items
- [ ] Date filtering accurate to the day
- [ ] Future dates return no results
- [ ] Error message for invalid date ranges

---

### Scenario 7: Empty Results Handling

#### Setup
- New user with no Microsoft activity

#### Steps
1. User connects all Microsoft tools
2. User fetches activity (30-day range)
3. No activities found

#### Expected Results
- [ ] Clear message: "No activity found in date range"
- [ ] Suggestion to extend date range
- [ ] No error or crash
- [ ] UI remains functional
- [ ] User can retry with different settings

---

### Scenario 8: Rate Limiting Recovery

#### Setup
- User fetches from SharePoint
- Microsoft API returns 429 (rate limit)

#### Steps
1. Fetch initiated
2. Rate limit hit
3. System handles error

#### Expected Results
- [ ] User-friendly error message displayed
- [ ] Suggestion to wait and retry
- [ ] No crash or data corruption
- [ ] Partial results shown if available
- [ ] Audit log records rate limit event

---

### Scenario 9: Disconnection & Reconnection

#### Setup
- User has connected SharePoint
- User fetches data successfully

#### Steps
1. User clicks "Disconnect" for SharePoint
2. Confirms disconnection
3. Verifies SharePoint shows "Connect" button
4. User reconnects SharePoint
5. Fetches data again

#### Expected Results
- [ ] Disconnect removes OAuth tokens
- [ ] Previous sessions invalidated
- [ ] Reconnection requires new OAuth
- [ ] New tokens stored securely
- [ ] Fetch works after reconnection
- [ ] Audit logs show disconnect and reconnect

---

### Scenario 10: Cross-Tool Deduplication

#### Setup
- User has same file in SharePoint and OneDrive
- File appears in both tools' recent activity

#### Steps
1. User fetches from both SharePoint and OneDrive
2. System detects duplicate file
3. User generates journal entry

#### Expected Results
- [ ] Duplicate detected by file ID or URL
- [ ] Single entry in journal artifacts
- [ ] Source noted as "SharePoint & OneDrive"
- [ ] Most complete metadata used
- [ ] No confusion for user

---

## Performance Benchmarks

### Acceptable Performance

| Operation | Target | Maximum |
|-----------|--------|---------|
| SharePoint fetch | < 15 seconds | 30 seconds |
| OneDrive fetch | < 10 seconds | 20 seconds |
| OneNote fetch | < 20 seconds | 40 seconds |
| Combined fetch (all 5 Microsoft tools) | < 30 seconds | 60 seconds |
| Journal generation | < 5 seconds | 10 seconds |
| OAuth flow | < 3 seconds | 5 seconds |

### Resource Limits

| Resource | Limit | Reason |
|----------|-------|--------|
| SharePoint sites checked (files) | 5 | Rate limiting |
| SharePoint sites checked (lists) | 3 | Rate limiting |
| OneDrive recent files | 50 | API limit |
| OneNote page content fetches | 10 | Performance |
| Memory per session | < 10 MB | Scalability |
| Concurrent API requests | 3 | Rate limiting |

---

## Success Criteria Summary

The Microsoft Suite MCP integrations are considered successful when:

### Functional Requirements
- [ ] All three tools (SharePoint, OneDrive, OneNote) can be connected via OAuth
- [ ] Activities fetch successfully from all tools
- [ ] Date range filtering works accurately
- [ ] Journal entries generate with meaningful content
- [ ] All links and artifacts work correctly
- [ ] Cross-tool deduplication functions properly

### Non-Functional Requirements
- [ ] Performance meets benchmarks (< 30 seconds for combined fetch)
- [ ] No data persisted beyond 30-minute session
- [ ] OAuth tokens encrypted at rest
- [ ] Rate limiting respected (no 429 errors in normal use)
- [ ] Audit logging complete and accurate
- [ ] User experience smooth and intuitive

### Quality Assurance
- [ ] All acceptance criteria pass
- [ ] Testing scenarios validated
- [ ] No critical bugs
- [ ] Error handling graceful
- [ ] Documentation complete

### Production Readiness
- [ ] Deployed to production
- [ ] Azure permissions configured
- [ ] Monitoring enabled
- [ ] Support team trained
- [ ] Rollback plan documented

---

## Known Limitations & Trade-offs

### SharePoint
- ✅ **Included**: Followed sites, recent files, list metadata
- ❌ **Excluded**: List item details, unfollowed sites, file contents

### OneDrive
- ✅ **Included**: Recent files, shared files, folder organization
- ❌ **Excluded**: Version history, deep folder trees, collaboration metrics

### OneNote
- ✅ **Included**: Notebooks, sections, pages, content preview (top 10)
- ❌ **Excluded**: Full content for all pages, embedded media, page sections

### Performance Trade-offs
- **Chosen**: Limit sites/pages checked to maintain performance
- **Trade-off**: May miss some activity in less-used sites/notebooks
- **Mitigation**: User can extend date range or reconnect to refresh

---

**Document Version:** 1.0
**Last Updated:** October 29, 2025
**Status:** Acceptance Criteria Defined - Ready for Validation Testing

---

## Appendix: API Coverage Matrix

| Tool | API Endpoint | Data Fetched | Filters | Limits |
|------|--------------|--------------|---------|--------|
| **SharePoint** | `/me/followedSites` | Sites user follows | None | 25 sites |
| **SharePoint** | `/sites/{id}/drive/recent` | Recent files in site | Date range (client) | 20 per site, 5 sites max |
| **SharePoint** | `/sites/{id}/lists` | SharePoint lists | Date range (client) | 10 per site, 3 sites max |
| **OneDrive** | `/me/drive/recent` | Recent files | Date range (client) | 50 files |
| **OneDrive** | `/me/drive/sharedWithMe` | Shared files | Date range (client) | 30 files |
| **OneDrive** | `/me/drive/root/children` | Root folders | Date range (client) | 50 folders |
| **OneNote** | `/me/onenote/notebooks` | User notebooks | None | 25 notebooks |
| **OneNote** | `/me/onenote/sections` | All sections | Date range (client) | 50 sections |
| **OneNote** | `/me/onenote/pages` | All pages | Date range (client) | 100 pages |
| **OneNote** | `/me/onenote/pages/{id}/content` | Page HTML content | None | 10 pages (performance) |
