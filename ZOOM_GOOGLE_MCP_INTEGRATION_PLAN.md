# Zoom & Google Workspace MCP Integration Plan

**Created:** 2025-11-01
**Status:** PLANNED
**Estimated Duration:** 10-12 days

---

## Table of Contents
1. [OAuth Application Registration](#oauth-application-registration)
   - [Google Workspace Setup](#google-workspace-oauth-setup)
   - [Zoom Setup](#zoom-oauth-setup)
2. [Implementation Plan](#implementation-plan)
3. [Technical Architecture](#technical-architecture)
4. [Environment Variables](#environment-variables)
5. [Timeline & Phases](#timeline--phases)

---

## OAuth Application Registration

### Google Workspace OAuth Setup

#### Step 1: Access Google Cloud Console
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Create a new project or select existing one
   - Click project dropdown → "New Project"
   - Name: "InChronicle Integration"
   - Click "Create"

#### Step 2: Enable Required APIs
1. Navigate to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Google Drive API** (for Drive files and Meet recordings)
   - **Google Docs API** (for document access)
   - **Google Sheets API** (for spreadsheet access)
   - **Google Slides API** (for presentation access)
   - **Google Calendar API** (for Meet meetings)
   - **People API** (for user information)

#### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose User Type:
   - **Internal** (if using Google Workspace organization)
   - **External** (for general users)
3. Fill in app information:
   - App name: "InChronicle"
   - User support email: your email
   - App logo: upload if available
   - Application home page: `https://ps-frontend-1758551070.azurewebsites.net`
   - Privacy policy: `https://ps-frontend-1758551070.azurewebsites.net/privacy`
   - Terms of service: `https://ps-frontend-1758551070.azurewebsites.net/terms`
4. Add scopes (click "Add or Remove Scopes"):
   ```
   Recommended minimal scopes:
   - https://www.googleapis.com/auth/userinfo.email
   - https://www.googleapis.com/auth/userinfo.profile
   - https://www.googleapis.com/auth/drive.file (non-sensitive, recommended)
   - https://www.googleapis.com/auth/drive.meet.readonly
   - https://www.googleapis.com/auth/documents.readonly
   - https://www.googleapis.com/auth/spreadsheets.readonly
   - https://www.googleapis.com/auth/presentations.readonly
   - https://www.googleapis.com/auth/calendar.readonly
   ```
5. Add test users (if External type)
6. Review and submit

#### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "InChronicle Web Client"
5. Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://ps-frontend-1758551070.azurewebsites.net
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3002/api/v1/mcp/callback/google_workspace
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/google_workspace
   ```
7. Click "Create"
8. **Save the Client ID and Client Secret**

#### Step 5: Handle Verification (if needed)
- For production with sensitive scopes: Submit for verification
- For testing: Use test users only
- Consider using `drive.file` (non-sensitive) to avoid verification

---

### Zoom OAuth Setup

#### Step 1: Create Zoom Account & Access Marketplace
1. Go to [https://marketplace.zoom.us](https://marketplace.zoom.us)
2. Sign in or create a Zoom developer account
3. Click "Develop" → "Build App"

#### Step 2: Choose App Type

**Option A: Server-to-Server OAuth (Recommended for private use)**
1. Select "Server-to-Server OAuth"
2. Name: "InChronicle Integration"
3. Benefits:
   - Backend-only operations
   - No user interaction needed
   - Limited to your account only
   - Simpler implementation

**Option B: OAuth App (Required for recording access)**
1. Select "OAuth"
2. Name: "InChronicle Integration"
3. Choose "User-managed app"
4. Set to "Unlisted" (not published publicly)
5. Required for:
   - Recording access
   - User authorization flow
   - Cross-account access

#### Step 3: Configure App Information
1. Basic Information:
   - App name: "InChronicle"
   - Short description: "Professional activity tracking"
   - Long description: "Imports Zoom meeting data for journal entries"
   - Category: "Productivity"
2. Developer Contact Info:
   - Name, Email (required)
   - Company name (optional)

#### Step 4: Configure OAuth Settings
1. Redirect URLs:
   ```
   http://localhost:3002/api/v1/mcp/callback/zoom
   https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/zoom
   ```
2. Whitelist URLs:
   ```
   http://localhost:5173
   https://ps-frontend-1758551070.azurewebsites.net
   ```

#### Step 5: Select Scopes

**IMPORTANT**: Zoom uses a specific scope format: `{resource}:{action}:{subresource}:{level}`

For Server-to-Server OAuth, select these scopes in the Zoom Marketplace UI:

**Meetings** (essential):
```
✅ meeting:read:list_meetings:admin - View a user's meetings
✅ meeting:read:list_upcoming_meetings:admin - View upcoming meetings
✅ meeting:read:past_meeting:admin - View past meetings
✅ meeting:read:meeting:admin - View a meeting
✅ meeting:read:list_past_participants:admin - View past meeting participants
```

**Recording** (essential):
```
✅ cloud_recording:read:list_user_recordings:admin - Lists all cloud recordings
✅ cloud_recording:read:recording:admin - View a recording
✅ cloud_recording:read:meeting_transcript:admin - Read meeting transcript (CRITICAL)
✅ cloud_recording:read:list_recording_files:admin - Returns all recording files
```

**Reports** (essential):
```
✅ report:read:list_history_meetings:admin - List history meetings
✅ report:read:meeting:admin - View meeting detail reports
```

**User** (essential):
```
✅ user:read:user:admin - View a user
✅ user:read:list_users:admin - View users
```

**Optional** (nice-to-have for enhanced features):
- Meeting polls, Q&A, surveys
- Recording analytics
- Participant feedback

**Note**: These scopes are for Server-to-Server OAuth. The older scope format (`meeting:read:admin`) is deprecated and no longer appears in the Zoom Marketplace.

#### Step 6: Obtain Credentials
1. Go to "App Credentials" tab
2. Copy these values:
   - **Client ID**
   - **Client Secret**
   - **Account ID** (for S2S OAuth only)

#### Step 7: Activation
- For Server-to-Server: Click "Activate"
- For OAuth App: Submit for review if needed (for unlisted apps)

---

## Implementation Plan

### Phase 1: Backend Implementation (4-5 days)

#### 1.1 Update Type Definitions

**File:** `backend/src/types/mcp.types.ts`
```typescript
// Add to MCPToolType enum
export enum MCPToolType {
  // ... existing tools ...
  ZOOM = 'zoom',
  GOOGLE_WORKSPACE = 'google_workspace'
}

// Add activity interfaces
export interface ZoomActivity {
  meetings: Array<{
    id: string;
    topic: string;
    start_time: string;
    duration: number;
    participants_count: number;
    recording_url?: string;
    transcript?: string;
  }>;
  upcomingMeetings: Array<{
    id: string;
    topic: string;
    start_time: string;
    duration: number;
  }>;
}

export interface GoogleWorkspaceActivity {
  driveFiles: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    webViewLink: string;
    lastModifyingUser: string;
    starred: boolean;
  }>;
  docs: Array<{
    id: string;
    title: string;
    lastModified: string;
    webViewLink: string;
  }>;
  sheets: Array<{
    id: string;
    title: string;
    lastModified: string;
    webViewLink: string;
  }>;
  slides: Array<{
    id: string;
    title: string;
    lastModified: string;
    webViewLink: string;
  }>;
  meetRecordings: Array<{
    id: string;
    name: string;
    createdTime: string;
    webViewLink: string;
  }>;
}
```

#### 1.2 Create Zoom Tool Implementation

**File:** `backend/src/services/mcp/tools/zoom.tool.ts`
```typescript
import axios, { AxiosInstance } from 'axios';
import { MCPToolType, ZoomActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';

export class ZoomTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private zoomApi: AxiosInstance;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();

    this.zoomApi = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      headers: {
        Accept: 'application/json'
      }
    });
  }

  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<ZoomActivity>> {
    try {
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.ZOOM);

      if (!accessToken) {
        return {
          success: false,
          error: 'Zoom not connected. Please connect your Zoom account first.'
        };
      }

      this.zoomApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Fetch meetings
      const [pastMeetings, upcomingMeetings] = await Promise.all([
        this.fetchPastMeetings(dateRange),
        this.fetchUpcomingMeetings()
      ]);

      // Fetch recordings if available
      const recordings = await this.fetchRecordings(dateRange);

      const activity: ZoomActivity = {
        meetings: pastMeetings,
        upcomingMeetings,
        recordings
      };

      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.ZOOM,
        activity,
        true
      );

      return {
        success: true,
        data: activity,
        sessionId
      };
    } catch (error: any) {
      console.error('[ZoomTool] Error fetching activity:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Zoom activity'
      };
    }
  }

  private async fetchPastMeetings(dateRange?: { start?: Date; end?: Date }) {
    // Implementation details
  }

  private async fetchUpcomingMeetings() {
    // Implementation details
  }

  private async fetchRecordings(dateRange?: { start?: Date; end?: Date }) {
    // Implementation details
  }
}
```

#### 1.3 Create Google Workspace Tool Implementation

**File:** `backend/src/services/mcp/tools/google-workspace.tool.ts`
```typescript
import { google } from 'googleapis';
import { MCPToolType, GoogleWorkspaceActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';

export class GoogleWorkspaceTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
  }

  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<GoogleWorkspaceActivity>> {
    try {
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.GOOGLE_WORKSPACE);

      if (!accessToken) {
        return {
          success: false,
          error: 'Google Workspace not connected. Please connect your Google account first.'
        };
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      // Initialize Google APIs
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const docs = google.docs({ version: 'v1', auth: oauth2Client });
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      const slides = google.slides({ version: 'v1', auth: oauth2Client });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Fetch recent activity from each service
      const [driveFiles, meetRecordings, calendarEvents] = await Promise.all([
        this.fetchDriveFiles(drive, dateRange),
        this.fetchMeetRecordings(drive),
        this.fetchCalendarEvents(calendar, dateRange)
      ]);

      // Separate files by type
      const docFiles = driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.document');
      const sheetFiles = driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');
      const slideFiles = driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.presentation');

      const activity: GoogleWorkspaceActivity = {
        driveFiles,
        docs: docFiles,
        sheets: sheetFiles,
        slides: slideFiles,
        meetRecordings
      };

      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.GOOGLE_WORKSPACE,
        activity,
        true
      );

      return {
        success: true,
        data: activity,
        sessionId
      };
    } catch (error: any) {
      console.error('[GoogleWorkspaceTool] Error fetching activity:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Google Workspace activity'
      };
    }
  }

  private async fetchDriveFiles(drive: any, dateRange?: { start?: Date; end?: Date }) {
    // Implementation details
  }

  private async fetchMeetRecordings(drive: any) {
    // Implementation details
  }

  private async fetchCalendarEvents(calendar: any, dateRange?: { start?: Date; end?: Date }) {
    // Implementation details
  }
}
```

#### 1.4 Update OAuth Service

**File:** `backend/src/services/mcp/mcp-oauth.service.ts`

Add to `initializeOAuthConfigs()` method:

```typescript
// Zoom OAuth configuration
if (process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET) {
  this.oauthConfigs.set(MCPToolType.ZOOM, {
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    redirectUri: process.env.ZOOM_REDIRECT_URI ||
      `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/zoom`,
    authorizationUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    // Server-to-Server OAuth scopes (2025 format)
    // Core meeting and recording access for professional activity tracking
    scope: 'meeting:read:list_meetings:admin meeting:read:list_upcoming_meetings:admin meeting:read:past_meeting:admin meeting:read:meeting:admin meeting:read:list_past_participants:admin cloud_recording:read:list_user_recordings:admin cloud_recording:read:recording:admin cloud_recording:read:meeting_transcript:admin cloud_recording:read:list_recording_files:admin report:read:list_history_meetings:admin report:read:meeting:admin user:read:user:admin user:read:list_users:admin'
  });
}

// Google Workspace OAuth configuration
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  this.oauthConfigs.set(MCPToolType.GOOGLE_WORKSPACE, {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/google_workspace`,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.meet.readonly https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/calendar.readonly'
  });
}
```

#### 1.5 Update MCP Controller

**File:** `backend/src/controllers/mcp.controller.ts`

1. Add to valid tools arrays:
```typescript
const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint', 'zoom', 'google_workspace'];
```

2. Add to tool metadata:
```typescript
const toolMetadata: Record<string, { name: string; description: string }> = {
  // ... existing tools ...
  zoom: { name: 'Zoom', description: 'Meeting recordings and transcripts' },
  google_workspace: { name: 'Google Workspace', description: 'Google Docs, Sheets, Slides, Drive, and Meet' }
};
```

3. Add to fetchAndProcessWithAgents method:
```typescript
const toolImports = {
  // ... existing tools ...
  zoom: () => import('../services/mcp/tools/zoom.tool').then(m => new m.ZoomTool()),
  google_workspace: () => import('../services/mcp/tools/google-workspace.tool').then(m => new m.GoogleWorkspaceTool())
};
```

4. Add item count logic:
```typescript
case 'zoom':
  return (data.meetings?.length || 0) + (data.recordings?.length || 0);
case 'google_workspace':
  return (data.driveFiles?.length || 0) + (data.docs?.length || 0) +
         (data.sheets?.length || 0) + (data.slides?.length || 0) +
         (data.meetRecordings?.length || 0);
```

---

### Phase 2: Frontend Updates (2 days)

#### 2.1 Update Tool Icons

**File:** `src/components/icons/ToolIcons.tsx`

Add new tool types and icons:
```typescript
export type ToolType = 'github' | 'jira' | 'figma' | 'outlook' | 'confluence' |
                       'slack' | 'teams' | 'onedrive' | 'onenote' | 'sharepoint' |
                       'zoom' | 'google_workspace';

// Add icon components for Zoom and Google Workspace
const ZoomIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    {/* Zoom icon SVG path */}
  </svg>
);

const GoogleWorkspaceIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    {/* Google Workspace icon SVG path */}
  </svg>
);

// Update getToolDisplayName function
export function getToolDisplayName(tool: ToolType): string {
  const names: Record<ToolType, string> = {
    // ... existing tools ...
    zoom: 'Zoom',
    google_workspace: 'Google Workspace'
  };
  return names[tool] || tool;
}

// Update getToolDescription function
export function getToolDescription(tool: ToolType): string {
  const descriptions: Record<ToolType, string> = {
    // ... existing tools ...
    zoom: 'Meeting recordings, transcripts, and participant data',
    google_workspace: 'Google Docs, Sheets, Slides, Drive files, and Meet recordings'
  };
  return descriptions[tool] || '';
}
```

#### 2.2 Update MCPSourceSelector Component

The component should automatically pick up the new tools once backend returns them. Verify it displays correctly.

#### 2.3 Update Settings Integration Page

Add connection buttons for new tools in the integrations settings.

---

### Phase 3: AI Processing Enhancement (1-2 days)

#### 3.1 Update Multi-Source Organizer

**File:** `backend/src/services/mcp/mcp-multi-source-organizer.service.ts`

Add categorization logic for new tools:
```typescript
private categorizeZoomActivity(activity: ZoomActivity): OrganizedActivity {
  // Categorize meetings as Team Collaboration
  // Extract key points from transcripts
  // Highlight important discussions
}

private categorizeGoogleActivity(activity: GoogleWorkspaceActivity): OrganizedActivity {
  // Categorize by document type:
  // - Docs → Documentation
  // - Sheets → Analysis/Reports
  // - Slides → Presentations
  // - Drive → File Management
  // - Meet → Team Meetings
}
```

---

## Technical Architecture

### Data Flow
1. User selects Zoom and/or Google Workspace in MCPSourceSelector
2. Frontend calls `/api/v1/mcp/fetch-and-process-agents` with tool array
3. Backend fetches from each API in parallel
4. AI organizer processes and correlates data
5. Results stored in memory-only session (30-min expiry)
6. Frontend displays organized activities for journal entry

### Privacy & Security
- OAuth tokens encrypted with AES-256
- No external data persisted to database
- Memory-only sessions with auto-expiry
- Explicit user consent required
- Minimal OAuth scopes requested

---

## Environment Variables

### Development (.env)
```env
# Google Workspace
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/google_workspace

# Zoom
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
ZOOM_ACCOUNT_ID=your_account_id_here (for S2S OAuth)
ZOOM_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/zoom
```

### Production (Azure App Settings)
```bash
az webapp config appsettings set -g ps-prod-rg -n ps-backend-1758551070 \
  --settings GOOGLE_CLIENT_ID=xxx \
             GOOGLE_CLIENT_SECRET=xxx \
             GOOGLE_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/google_workspace \
             ZOOM_CLIENT_ID=xxx \
             ZOOM_CLIENT_SECRET=xxx \
             ZOOM_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/zoom
```

---

## Timeline & Phases

### Phase Breakdown
1. **OAuth Registration** (1-2 hours)
   - Register apps on both platforms
   - Configure OAuth consent screens
   - Obtain credentials

2. **Backend Implementation** (4-5 days)
   - Day 1-2: Core tool implementations
   - Day 3: OAuth integration
   - Day 4: Testing and refinement
   - Day 5: Integration with existing flow

3. **Frontend Updates** (2 days)
   - Day 1: UI components and icons
   - Day 2: Integration settings

4. **AI Processing** (1-2 days)
   - Day 1: Categorization logic
   - Day 2: Cross-tool correlation

5. **Testing & Deployment** (1-2 days)
   - Day 1: Local testing
   - Day 2: Production deployment

### Total Timeline: 10-12 days

---

## Testing Checklist

### OAuth Flow
- [ ] Google OAuth consent flow works
- [ ] Zoom OAuth authorization works
- [ ] Tokens stored encrypted
- [ ] Refresh tokens handled properly

### Data Fetching
- [ ] Google Drive files retrieved correctly
- [ ] Zoom meetings fetched with date range
- [ ] Error handling for API failures
- [ ] Rate limiting handled

### UI/UX
- [ ] Tools appear in selector
- [ ] Connection status displays correctly
- [ ] Activities render properly
- [ ] Multi-source selection works

### AI Processing
- [ ] Activities categorized correctly
- [ ] Cross-tool correlations identified
- [ ] Content generation includes new sources
- [ ] Performance acceptable

### Production
- [ ] Environment variables configured
- [ ] Azure deployment successful
- [ ] CORS settings updated
- [ ] Production OAuth callbacks work

---

## Troubleshooting Guide

### Common Issues

#### Google OAuth Issues
- **403 Forbidden**: Check API is enabled in Cloud Console
- **Scope not authorized**: Add scope to consent screen
- **Invalid redirect URI**: Must match exactly, including protocol

#### Zoom OAuth Issues
- **Invalid client**: Check client ID/secret
- **Scope not available**: May need different app type
- **Recording access denied**: Requires OAuth app, not S2S

#### Integration Issues
- **No data returned**: Check date ranges
- **Timeout errors**: Implement pagination
- **Rate limiting**: Add exponential backoff

---

## Notes

- Start with Google Workspace for simpler OAuth flow
- Consider using Google's `drive.file` scope to avoid verification
- For Zoom, decide between S2S (simpler) vs OAuth app (more features)
- Test with small date ranges initially
- Monitor API quotas and rate limits

---

## Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Workspace API Documentation](https://developers.google.com/workspace)
- [Zoom OAuth Documentation](https://developers.zoom.us/docs/integrations/oauth)
- [Zoom API Reference](https://developers.zoom.us/docs/api)

---

## Contact for Questions

If you encounter any issues during implementation, refer to:
- Existing tool implementations (GitHub, Teams, etc.)
- MCP OAuth service patterns
- Azure deployment documentation

This plan follows your existing architecture and maintains the privacy-first approach while adding powerful new integrations for professional activity tracking.