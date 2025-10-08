# MCP (Model Context Protocol) Integration Guide

## 🔐 Privacy-First Design

InChronicle's MCP integration is built with **privacy as the foundation**. We implement a zero-data-retention policy where:
- **NO external data is ever stored** in our database
- All fetched data exists only in **memory** and auto-expires after 30 minutes
- Only **encrypted OAuth tokens** are persisted
- **Explicit user consent** is required for every data fetch
- Users have **complete control** over what gets included in their journal entries

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup Instructions](#setup-instructions)
3. [Adding New Tool Integrations](#adding-new-tool-integrations)
4. [Privacy & Security](#privacy--security)
5. [API Documentation](#api-documentation)
6. [User Experience Flow](#user-experience-flow)
7. [Troubleshooting](#troubleshooting)
8. [Development Guidelines](#development-guidelines)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Components           │  Hooks              │  Services      │
│  - MCPPrivacyNotice   │  - useMCPTools      │  - mcpService  │
│  - MCPConsentDialog   │  - useMCPFetch      │                │
│  - MCPDataReview      │  - useMCPPrivacy    │                │
│  - MCPIntegrationBtn  │                     │                │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                │
├─────────────────────────────────────────────────────────────┤
│  Controllers          │  Services                           │
│  - MCPController      │  - MCPSessionService (Memory-only)  │
│                       │  - MCPPrivacyService (Audit logs)   │
│                       │  - MCPOAuthService (Token mgmt)     │
│                       │  - Tools (GitHub, Jira, etc.)       │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│  Tables                                                      │
│  - mcp_integrations (encrypted tokens only)                 │
│  - mcp_audit_logs (actions only, no data)                   │
│  - mcp_daily_summary_preferences (settings only)            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Initiates Connection** → OAuth flow → Encrypted token stored
2. **User Requests Import** → Consent dialog → Fetch from tool → Memory session
3. **User Reviews Data** → Selects items → Imports to journal → Session cleared
4. **Auto-Cleanup** → Sessions expire after 30 minutes → Memory freed

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OAuth apps for each tool you want to integrate

### 1. Database Setup

Run the Prisma migrations:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 2. Environment Variables

Add to `backend/.env`:

```env
# MCP Encryption (Required)
MCP_ENCRYPTION_KEY=your_32_character_encryption_key_here

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/github

# Jira OAuth (Optional)
JIRA_CLIENT_ID=your_jira_oauth_client_id
JIRA_CLIENT_SECRET=your_jira_oauth_client_secret
JIRA_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/jira

# Figma OAuth (Optional)
FIGMA_CLIENT_ID=your_figma_oauth_client_id
FIGMA_CLIENT_SECRET=your_figma_oauth_client_secret
FIGMA_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/figma

# Outlook OAuth (Optional)
OUTLOOK_CLIENT_ID=your_outlook_oauth_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_oauth_client_secret
OUTLOOK_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/outlook

# Confluence OAuth (Optional)
CONFLUENCE_CLIENT_ID=your_confluence_oauth_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_oauth_client_secret
CONFLUENCE_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/confluence

# Slack OAuth (Optional)
SLACK_CLIENT_ID=your_slack_oauth_client_id
SLACK_CLIENT_SECRET=your_slack_oauth_client_secret
SLACK_REDIRECT_URI=http://localhost:3002/api/v1/mcp/callback/slack
```

### 3. OAuth App Configuration

#### GitHub
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: InChronicle MCP Integration
   - **Homepage URL**: `http://localhost:5173` (dev) or your production URL
   - **Authorization callback URL**: `http://localhost:3002/api/v1/mcp/callback/github`
4. Save Client ID and Client Secret

#### Jira (Atlassian)
1. Go to https://developer.atlassian.com/console/myapps/
2. Create new app → OAuth 2.0
3. Add callback URL: `http://localhost:3002/api/v1/mcp/callback/jira`
4. Configure scopes: `read:jira-work`, `read:jira-user`, `offline_access`

#### Other Tools
Similar process - create OAuth apps and configure callback URLs.

### 4. Frontend Setup

No additional setup needed - components are already integrated!

## Adding New Tool Integrations

### Step 1: Create the Tool Service

Create `backend/src/services/mcp/tools/[toolname].tool.ts`:

```typescript
import { MCPToolType, MCPServiceResponse } from '../../../types/mcp.types';
import { MCPOAuthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

export class YourToolNameTool {
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;

  constructor() {
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();
  }

  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<any>> {
    try {
      // 1. Get access token
      const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.YOUR_TOOL);

      // 2. Fetch data from API
      const data = await this.fetchFromAPI(accessToken, dateRange);

      // 3. Create memory session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.YOUR_TOOL,
        data,
        true
      );

      // 4. Log operation (no data)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.YOUR_TOOL,
        itemCount,
        sessionId,
        true
      );

      return {
        success: true,
        data,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    } catch (error) {
      // Handle errors
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Step 2: Add OAuth Configuration

Update `backend/src/services/mcp/mcp-oauth.service.ts`:

```typescript
// In initializeOAuthConfigs() method
if (process.env.YOUR_TOOL_CLIENT_ID && process.env.YOUR_TOOL_CLIENT_SECRET) {
  this.oauthConfigs.set(MCPToolType.YOUR_TOOL, {
    clientId: process.env.YOUR_TOOL_CLIENT_ID,
    clientSecret: process.env.YOUR_TOOL_CLIENT_SECRET,
    redirectUri: process.env.YOUR_TOOL_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/your-tool',
    authorizationUrl: 'https://your-tool.com/oauth/authorize',
    tokenUrl: 'https://your-tool.com/oauth/token',
    scope: 'read:data' // Adjust based on tool
  });
}
```

### Step 3: Update Types

Add to `backend/src/types/mcp.types.ts`:

```typescript
export enum MCPToolType {
  // ... existing tools
  YOUR_TOOL = 'your-tool'
}

export interface YourToolActivity {
  // Define the data structure
}
```

### Step 4: Add to Controller

Update `backend/src/controllers/mcp.controller.ts` to handle the new tool in the fetch method.

### Step 5: Update Frontend

Add icon and description mappings in frontend components.

## Privacy & Security

### Data Handling Principles

1. **Zero Persistence**: No external data is ever written to the database
2. **Memory-Only Sessions**: All fetched data exists only in memory
3. **Auto-Expiry**: Sessions automatically expire after 30 minutes
4. **Encrypted Tokens**: OAuth tokens encrypted with AES-256
5. **Audit Logging**: Track actions, never data
6. **Explicit Consent**: Required for every fetch operation

### Security Checklist

- ✅ OAuth tokens encrypted at rest
- ✅ HTTPS only in production
- ✅ CSRF protection via state parameter
- ✅ Rate limiting on API endpoints
- ✅ Token refresh handling
- ✅ Secure session management
- ✅ Input validation on all endpoints
- ✅ Error messages don't leak sensitive info

### GDPR Compliance

- **Right to Access**: Users can view their integration status and audit logs
- **Right to Deletion**: One-click deletion of all MCP data
- **Data Minimization**: Only store what's absolutely necessary (tokens)
- **Purpose Limitation**: Data used only for journal creation
- **Transparency**: Clear privacy notices throughout

## API Documentation

### Endpoints

#### Get Available Tools
```http
GET /api/v1/mcp/tools
Authorization: Bearer {token}

Response:
{
  "success": true,
  "tools": [
    {
      "toolType": "github",
      "isAvailable": true,
      "isConnected": false,
      "privacyNotice": "..."
    }
  ],
  "privacyStatus": {
    "dataRetention": "none",
    "sessionDuration": 30,
    "consentRequired": true,
    "encryptionEnabled": true,
    "auditLoggingEnabled": true
  }
}
```

#### Initiate OAuth
```http
POST /api/v1/mcp/oauth/initiate
Authorization: Bearer {token}
Content-Type: application/json

{
  "toolType": "github"
}

Response:
{
  "success": true,
  "authUrl": "https://github.com/login/oauth/authorize?...",
  "state": "...",
  "privacyNotice": "..."
}
```

#### Fetch Data
```http
POST /api/v1/mcp/fetch
Authorization: Bearer {token}
Content-Type: application/json

{
  "toolTypes": ["github"],
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-02T00:00:00Z"
  },
  "consentGiven": true
}

Response:
{
  "success": true,
  "results": [
    {
      "toolType": "github",
      "success": true,
      "data": {...},
      "sessionId": "...",
      "expiresAt": "..."
    }
  ],
  "privacyNotice": "..."
}
```

#### Clear Session
```http
DELETE /api/v1/mcp/sessions/{sessionId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Session data cleared successfully"
}
```

## User Experience Flow

### Connection Flow
1. User navigates to Settings → Integrations
2. Sees privacy-first messaging
3. Clicks "Connect" on desired tool
4. OAuth popup opens
5. User authorizes app
6. Redirected back with success message
7. Tool shows as connected

### Import Flow
1. User creates new journal entry
2. In Step 3 (Content), sees "Import from External Tools"
3. Clicks import button
4. **Consent Dialog** appears with privacy notice
5. User selects tools and confirms consent
6. Data fetched (loading indicator)
7. **Data Review** interface shows fetched items
8. User selects specific items to include
9. Selected items imported into journal
10. Session automatically cleared after 30 minutes

### Privacy Indicators
- 🔒 Lock icons on all MCP features
- Timer showing session expiry
- "Your data, your control" messaging
- Clear consent checkboxes
- Privacy notice at every step

## Troubleshooting

### Common Issues

#### OAuth Connection Fails
- Verify OAuth app credentials in `.env`
- Check callback URLs match exactly
- Ensure required scopes are configured
- Check network/firewall settings

#### Data Fetch Errors
- Verify token hasn't expired
- Check API rate limits
- Ensure user has access to requested data
- Review scope permissions

#### Session Expiry
- Sessions auto-expire after 30 minutes
- Users can manually clear sessions anytime
- Expired sessions return null data
- New fetch required after expiry

### Debug Mode

Enable debug logging:

```typescript
// backend/src/services/mcp/mcp-session.service.ts
const DEBUG = process.env.MCP_DEBUG === 'true';

if (DEBUG) {
  console.log('[MCP Debug]', ...);
}
```

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Tool not connected" | No OAuth token exists | User needs to connect tool first |
| "Session expired" | 30-minute timeout reached | Fetch data again |
| "Consent required" | User didn't provide consent | Show consent dialog |
| "Token refresh failed" | OAuth token expired and refresh failed | User needs to reconnect |

## Development Guidelines

### Code Standards

1. **TypeScript**: Use strict typing for all MCP code
2. **Error Handling**: Always catch and handle errors gracefully
3. **Logging**: Log actions, never log actual data
4. **Testing**: Write tests for privacy compliance
5. **Documentation**: Document all privacy decisions

### Privacy Testing Checklist

- [ ] Verify no external data in database after fetch
- [ ] Confirm sessions expire after 30 minutes
- [ ] Check tokens are encrypted in database
- [ ] Validate consent flow works correctly
- [ ] Test data clearing functionality
- [ ] Verify audit logs don't contain data
- [ ] Confirm error messages don't leak info

### Performance Considerations

- Use parallel fetching where possible
- Implement pagination for large datasets
- Cache OAuth tokens (encrypted)
- Clear expired sessions regularly
- Monitor memory usage for sessions

## Deployment Checklist

### Pre-Deployment

- [ ] Set production OAuth callback URLs
- [ ] Generate secure `MCP_ENCRYPTION_KEY`
- [ ] Configure production OAuth apps
- [ ] Set up monitoring for MCP endpoints
- [ ] Review security measures
- [ ] Test with production-like data

### Environment Variables (Production)

```env
# Required
NODE_ENV=production
MCP_ENCRYPTION_KEY=<32-char-secure-random-string>

# OAuth Apps (with production URLs)
GITHUB_CLIENT_ID=<production-client-id>
GITHUB_CLIENT_SECRET=<production-client-secret>
GITHUB_REDIRECT_URI=https://yourdomain.com/api/v1/mcp/callback/github

# Frontend
FRONTEND_URL=https://yourdomain.com
```

### Post-Deployment

- [ ] Verify OAuth flows work
- [ ] Test data fetching
- [ ] Monitor error rates
- [ ] Check session cleanup
- [ ] Review audit logs
- [ ] Gather user feedback

## Support & Maintenance

### Monitoring

Monitor these metrics:
- OAuth success/failure rates
- Session creation/expiry counts
- API response times
- Memory usage for sessions
- Error rates by tool type

### Regular Maintenance

- Review and rotate OAuth tokens
- Clean up old audit logs (>90 days)
- Update OAuth scopes as needed
- Monitor tool API changes
- Review security updates

## Contributing

When contributing to MCP integration:

1. **Privacy First**: Never store external data
2. **User Consent**: Always require explicit permission
3. **Clear Messaging**: Explain what happens with data
4. **Test Thoroughly**: Include privacy tests
5. **Document Changes**: Update this README

## License

This MCP integration is part of the InChronicle project and follows the same license terms.

---

**Remember**: Privacy is not a feature, it's the foundation. Every line of code should respect user privacy and give them complete control over their data.