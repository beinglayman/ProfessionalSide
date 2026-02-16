import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import { MCPToolType, MCPOAuthConfig, MCPOAuthTokens, MCPAction } from '../../types/mcp.types';
import { MCPPrivacyService } from './mcp-privacy.service';
import { prisma } from '../../lib/prisma';

const DEBUG = process.env.DEBUG_OAUTH === 'true' || process.env.NODE_ENV === 'development';

const log = {
  debug: (msg: string, data?: object) => DEBUG && console.log(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  info:  (msg: string, data?: object) => console.log(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  warn:  (msg: string, data?: object) => console.warn(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
  error: (msg: string, data?: object) => console.error(`[OAuth] ${msg}`, JSON.stringify(data ?? {})),
};

/**
 * MCP OAuth Service - Handles OAuth authentication for external tools
 *
 * SECURITY FEATURES:
 * - Token encryption at rest (AES-256)
 * - Secure state parameter for CSRF protection
 * - Token refresh handling
 * - Minimal scope requests
 */
export class MCPOAuthService {
  private prisma: PrismaClient;
  private privacyService: MCPPrivacyService;
  private encryptionKey: string;

  // OAuth configurations per tool
  private oauthConfigs: Map<MCPToolType, MCPOAuthConfig> = new Map();
  // Mutex: deduplicates concurrent refresh calls per user+tool
  private refreshPromises = new Map<string, Promise<string | null>>();

  constructor() {
    this.prisma = prisma; // Use singleton Prisma client
    this.privacyService = new MCPPrivacyService();

    // Initialize encryption key from environment — fail fast if missing
    const encKey = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY;
    if (!encKey) {
      throw new Error('[MCPOAuthService] ENCRYPTION_KEY or MCP_ENCRYPTION_KEY environment variable is required');
    }
    this.encryptionKey = encKey;

    // Initialize OAuth configurations
    this.initializeOAuthConfigs();
  }

  /**
   * Initialize OAuth configurations for each tool
   */
  private initializeOAuthConfigs(): void {
    // GitHub OAuth configuration
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.GITHUB, {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/github',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'repo read:user' // Minimal scope for reading repos and user info
      });
    }

    // Jira OAuth configuration (OAuth 2.0 for Atlassian Cloud)
    // Uses shared ATLASSIAN credentials
    if (process.env.ATLASSIAN_CLIENT_ID && process.env.ATLASSIAN_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.JIRA, {
        clientId: process.env.ATLASSIAN_CLIENT_ID,
        clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
        redirectUri: process.env.JIRA_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/jira`,
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        // CLASSIC scopes (Atlassian recommended approach) + Jira Software granular (no classic alternative)
        // read:jira-work - Read issues, projects, worklogs, etc. (replaces granular issue/project scopes)
        // read:jira-user - Read user information (replaces granular user scope)
        // read:board-scope:jira-software - Read Jira Software boards (granular, no classic alternative)
        // read:sprint:jira-software - Read Jira Software sprints (granular, no classic alternative)
        // read:me - User Identity API (user profile)
        // NOTE: Using classic scopes to avoid mixing with granular and prevent 401 errors
        scope: 'read:jira-work read:jira-user read:board-scope:jira-software read:sprint:jira-software read:me offline_access'
      });
    }

    // Figma OAuth configuration
    if (process.env.FIGMA_CLIENT_ID && process.env.FIGMA_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.FIGMA, {
        clientId: process.env.FIGMA_CLIENT_ID,
        clientSecret: process.env.FIGMA_CLIENT_SECRET,
        redirectUri: process.env.FIGMA_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/figma`,
        authorizationUrl: 'https://www.figma.com/oauth',
        tokenUrl: 'https://api.figma.com/v1/oauth/token',
        // Granular scopes for 2025: file_content:read (file content), file_metadata:read (user/teams/projects), file_comments:read (comments)
        scope: 'file_content:read file_metadata:read file_comments:read'
      });
    }

    // Outlook (Microsoft Graph) OAuth configuration
    // Uses shared MICROSOFT credentials
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.OUTLOOK, {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.OUTLOOK_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/outlook`,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        scope: 'User.Read Mail.Read Calendars.Read offline_access'
      });

      // Microsoft Teams OAuth configuration (uses same Microsoft app credentials)
      this.oauthConfigs.set(MCPToolType.TEAMS, {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.TEAMS_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/teams`,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        // Read user's own channel messages + all chats (no admin consent required)
        // ChannelMessage.Edit allows reading/editing user's own messages without admin consent
        scope: 'User.Read Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Edit Chat.Read Chat.ReadBasic offline_access'
      });

      // SharePoint OAuth configuration - DISABLED
      // Requires Sites.Read.All permission which triggers admin consent requirement
      // Disabled for B2C compatibility - can be re-enabled for enterprise deployments
      // this.oauthConfigs.set(MCPToolType.SHAREPOINT, {
      //   clientId: process.env.MICROSOFT_CLIENT_ID,
      //   clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      //   redirectUri: process.env.SHAREPOINT_REDIRECT_URI ||
      //     `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/sharepoint`,
      //   authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      //   tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      //   scope: 'User.Read Sites.Read.All Files.Read.All offline_access'
      // });

      // OneDrive OAuth configuration (uses same Microsoft app credentials)
      this.oauthConfigs.set(MCPToolType.ONEDRIVE, {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.ONEDRIVE_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/onedrive`,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        // Files.Read - Read files user has access to (no admin consent required)
        // Note: Includes files from OneDrive and SharePoint sites user has access to
        scope: 'User.Read Files.Read offline_access'
      });

      // OneNote OAuth configuration (uses same Microsoft app credentials)
      this.oauthConfigs.set(MCPToolType.ONENOTE, {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.ONENOTE_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/onenote`,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        // Notes.Read - Read OneNote notebooks (no admin consent required)
        scope: 'User.Read Notes.Read offline_access'
      });
    }

    // Confluence OAuth configuration (Atlassian)
    // Uses shared ATLASSIAN credentials
    if (process.env.ATLASSIAN_CLIENT_ID && process.env.ATLASSIAN_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.CONFLUENCE, {
        clientId: process.env.ATLASSIAN_CLIENT_ID,
        clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
        redirectUri: process.env.CONFLUENCE_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/confluence`,
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        // GRANULAR scopes - required for v2 REST API
        // v2 API requires granular scopes, not classic scopes
        // read:page:confluence - Read pages via v2 API
        // read:blogpost:confluence - Read blog posts via v2 API
        // read:space:confluence - Read spaces via v2 API
        // read:comment:confluence - Read comments via v2 API
        // read:user:confluence - Read user information
        // read:me - User Identity API (user profile)
        // offline_access - Required for refresh tokens
        scope: 'read:page:confluence read:blogpost:confluence read:space:confluence read:comment:confluence read:user:confluence read:me offline_access'
      });
    }

    // Slack OAuth configuration
    if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.SLACK, {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        redirectUri: process.env.SLACK_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/slack`,
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scope: 'channels:read channels:history users:read chat:write'
      });
    }

    // Zoom OAuth configuration (User-Managed OAuth)
    // Note: Uses granular scopes WITHOUT :admin suffix (User-Managed apps don't accept :admin)
    if (process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.ZOOM, {
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
        redirectUri: process.env.ZOOM_REDIRECT_URI ||
          `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/zoom`,
        authorizationUrl: 'https://zoom.us/oauth/authorize',
        tokenUrl: 'https://zoom.us/oauth/token',
        // User-Managed OAuth granular scopes (2025 format without :admin suffix)
        // Core meeting and recording access for professional activity tracking
        scope: 'meeting:read:meeting meeting:read:list_meetings meeting:read:list_upcoming_meetings meeting:read:list_past_instances cloud_recording:read:list_user_recordings cloud_recording:read:list_recording_files cloud_recording:read:meeting_transcript cloud_recording:read:recording user:read:user'
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
        // Read-only access to Drive (includes Docs, Sheets, Slides, Meet recordings) and Calendar
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly'
      });
    }

    console.log(`[MCP OAuth] Initialized ${this.oauthConfigs.size} OAuth configurations`);

    // Log detailed configuration status
    this.logConfigurationDiagnostics();
  }

  /**
   * Log detailed diagnostics about OAuth configuration status
   */
  private logConfigurationDiagnostics(): void {
    const allTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'zoom', 'google_workspace'];
    // Note: SharePoint removed (requires admin consent for Sites.Read.All)
    const configured: string[] = [];
    const missing: string[] = [];

    allTools.forEach(tool => {
      if (this.oauthConfigs.has(tool as MCPToolType)) {
        configured.push(tool);
      } else {
        missing.push(tool);
      }
    });

    console.log('[MCP OAuth] Configuration Status:');
    console.log(`  ✓ Configured (${configured.length}): ${configured.join(', ') || 'none'}`);

    if (missing.length > 0) {
      console.log(`  ✗ Not Configured (${missing.length}): ${missing.join(', ')}`);
      console.log('  💡 See MCP_OAUTH_SETUP_GUIDE.md for setup instructions');

      // Log specific missing environment variables
      const envVarMap: Record<string, string[]> = {
        'github': ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
        'jira': ['ATLASSIAN_CLIENT_ID', 'ATLASSIAN_CLIENT_SECRET'],
        'confluence': ['ATLASSIAN_CLIENT_ID', 'ATLASSIAN_CLIENT_SECRET'],
        'figma': ['FIGMA_CLIENT_ID', 'FIGMA_CLIENT_SECRET'],
        'outlook': ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        'teams': ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        'sharepoint': ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        'onedrive': ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        'onenote': ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        'slack': ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
        'zoom': ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
        'google_workspace': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
      };

      missing.forEach(tool => {
        const vars = envVarMap[tool] || [];
        const missingVars = vars.filter(v => !process.env[v]);
        if (missingVars.length > 0) {
          console.log(`  → ${tool}: Missing ${missingVars.join(', ')}`);
        }
      });
    }
  }

  /**
   * Encrypt sensitive data
   * @param text Plain text to encrypt
   * @returns Encrypted text
   */
  public encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(crypto.createHash('sha256').update(this.encryptionKey).digest()),
      iv
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   * @param text Encrypted text
   * @returns Decrypted text
   */
  public decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(crypto.createHash('sha256').update(this.encryptionKey).digest()),
      iv
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate OAuth authorization URL
   * @param userId User ID
   * @param toolType Tool type
   * @returns Authorization URL and state parameter
   */
  public getAuthorizationUrl(
    userId: string,
    toolType: MCPToolType
  ): { url: string; state: string } | null {
    const config = this.oauthConfigs.get(toolType);
    if (!config) {
      console.error(`[MCP OAuth] No OAuth config for tool: ${toolType}`);
      return null;
    }

    // Generate secure state parameter (CSRF protection)
    const state = crypto.randomBytes(32).toString('hex');

    // Encode userId, toolType, random state, and iat (issued-at) for expiry check
    const stateData = Buffer.from(JSON.stringify({ userId, toolType, state, iat: Date.now() })).toString('base64');

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state: stateData
    });

    // Add tool-specific parameters
    if (toolType === MCPToolType.OUTLOOK || toolType === MCPToolType.TEAMS) {
      params.append('response_mode', 'query');
      params.append('prompt', 'consent');
      params.append('access_type', 'offline'); // Request refresh token for Microsoft
    } else if (toolType === MCPToolType.GOOGLE_WORKSPACE) {
      params.append('access_type', 'offline'); // Request refresh token for Google
      params.append('prompt', 'consent'); // Force consent screen to ensure refresh token
    } else if (toolType === MCPToolType.SLACK) {
      params.append('user_scope', config.scope);
    } else if (toolType === MCPToolType.GITHUB) {
      // GitHub doesn't need special parameters
    }
    // Figma, Jira, Confluence don't need access_type parameter

    const url = `${config.authorizationUrl}?${params.toString()}`;

    console.log(`[MCP OAuth] Generated auth URL for ${toolType}: ${url}`);

    return { url, state: stateData };
  }

  /**
   * Generate OAuth authorization URL for a group of tools (e.g., Jira + Confluence)
   * @param userId User ID
   * @param groupType Group type ('atlassian' or 'microsoft')
   * @returns Authorization URL and state parameter
   */
  public getAuthorizationUrlForGroup(
    userId: string,
    groupType: 'atlassian' | 'microsoft'
  ): { url: string; state: string; tools: MCPToolType[] } | null {
    // Define tool groups
    const toolGroups: Record<string, MCPToolType[]> = {
      atlassian: [MCPToolType.JIRA, MCPToolType.CONFLUENCE],
      microsoft: [MCPToolType.OUTLOOK, MCPToolType.TEAMS, MCPToolType.ONEDRIVE, MCPToolType.ONENOTE]
      // Note: SharePoint removed - requires admin consent (Sites.Read.All) incompatible with B2C
    };

    const tools = toolGroups[groupType];
    if (!tools || tools.length === 0) {
      console.error(`[MCP OAuth] Invalid group type: ${groupType}`);
      return null;
    }

    // Get configs for all tools in the group
    const configs = tools.map(tool => ({
      tool,
      config: this.oauthConfigs.get(tool)
    }));

    // Check if all tools have configs
    const missingConfigs = configs.filter(c => !c.config);
    if (missingConfigs.length > 0) {
      console.error(`[MCP OAuth] Missing configs for tools: ${missingConfigs.map(c => c.tool).join(', ')}`);
      return null;
    }

    // Use the first tool's config for authorization URL and redirect
    const primaryConfig = configs[0].config!;

    // Combine scopes from all tools (deduplicate)
    const combinedScopes = Array.from(
      new Set(
        configs
          .map(c => c.config!.scope.split(' '))
          .flat()
      )
    ).join(' ');

    // Use the first tool's redirect URI (they should all use the same callback)
    // But we'll use a group-specific callback
    const redirectUri = primaryConfig.redirectUri.replace(/\/(jira|outlook)$/, `/${groupType}`);

    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with all tool types + iat for expiry check
    const stateData = Buffer.from(
      JSON.stringify({
        userId,
        toolTypes: tools,
        groupType,
        state,
        iat: Date.now()
      })
    ).toString('base64');

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: primaryConfig.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: combinedScopes,
      state: stateData,
      access_type: 'offline'
    });

    // Add tool-specific parameters based on group
    if (groupType === 'microsoft') {
      params.append('response_mode', 'query');
      params.append('prompt', 'consent');
    }

    const url = `${primaryConfig.authorizationUrl}?${params.toString()}`;

    console.log(`[MCP OAuth] Generated group auth URL for ${groupType} (${tools.join(', ')}): ${url}`);

    return { url, state: stateData, tools };
  }

  /**
   * Exchange authorization code for access token
   * @param code Authorization code
   * @param state State parameter
   * @returns Success status
   */
  public async handleCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; userId?: string; toolType?: MCPToolType; toolTypes?: MCPToolType[] }> {
    try {
      // Decode and validate state
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

      // Validate state expiry (iat + 10 minutes)
      const STATE_MAX_AGE_MS = 10 * 60 * 1000;
      if (!stateData.iat) {
        log.warn('OAuth state missing iat (pre-migration state), rejecting', { toolType: stateData.toolType, userId: stateData.userId });
        throw new Error('Authorization state missing timestamp — please reconnect');
      }
      if (Date.now() - stateData.iat > STATE_MAX_AGE_MS) {
        log.error('OAuth state expired', { toolType: stateData.toolType, userId: stateData.userId, ageMs: Date.now() - stateData.iat });
        throw new Error('Authorization state expired (older than 10 minutes)');
      }

      const { userId, toolType, toolTypes, groupType } = stateData;

      // Determine which tools to connect (group or single)
      const toolsToConnect: MCPToolType[] = toolTypes || [toolType];

      // Use the first tool's config for token exchange
      const primaryTool = toolsToConnect[0];
      const config = this.oauthConfigs.get(primaryTool);
      if (!config) {
        throw new Error(`No OAuth config for tool: ${primaryTool}`);
      }

      // Determine redirect URI (group-specific if applicable)
      const redirectUri = groupType
        ? config.redirectUri.replace(/\/(jira|outlook)$/, `/${groupType}`)
        : config.redirectUri;

      console.log(`[MCP OAuth] Exchanging code for ${primaryTool}:`, {
        tokenUrl: config.tokenUrl,
        redirectUri,
        clientId: config.clientId,
        hasClientSecret: !!config.clientSecret,
        codeLength: code.length
      });

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
          }
        }
      );

      const tokens = tokenResponse.data;

      // Debug log to track token scope
      console.log(`[MCP OAuth] Token received for ${toolsToConnect.join(', ')}:`, {
        scope: tokens.scope,
        expires_in: tokens.expires_in,
        hasRefreshToken: !!tokens.refresh_token
      });

      // Store tokens for ALL tools in the group
      for (const tool of toolsToConnect) {
        await this.storeTokens(userId, tool, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : undefined,
          scope: tokens.scope
        });

        // Log successful connection for each tool
        await this.privacyService.logIntegrationAction(userId, tool, MCPAction.CONNECT, true);
      }

      console.log(`[MCP OAuth] Successfully connected ${toolsToConnect.join(', ')} for user ${userId}`);

      return {
        success: true,
        userId,
        toolType: toolsToConnect[0],
        toolTypes: toolsToConnect
      };
    } catch (error: any) {
      console.error('[MCP OAuth] Error handling callback:', error);
      if (error.response) {
        // Axios error with response from server
        console.error('[MCP OAuth] Response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        // Request was made but no response received
        console.error('[MCP OAuth] No response received:', error.message);
      } else {
        // Something else happened
        console.error('[MCP OAuth] Error details:', error.message);
      }
      return { success: false };
    }
  }

  /**
   * Store OAuth tokens (encrypted)
   * @param userId User ID
   * @param toolType Tool type
   * @param tokens OAuth tokens
   */
  private async storeTokens(
    userId: string,
    toolType: MCPToolType,
    tokens: MCPOAuthTokens
  ): Promise<void> {
    const encryptedAccessToken = this.encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? this.encrypt(tokens.refreshToken)
      : null;

    await this.prisma.mCPIntegration.upsert({
      where: {
        userId_toolType: {
          userId,
          toolType
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        isActive: true,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        toolType,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        isActive: true,
        isConnected: true,
        connectedAt: new Date()
      }
    });
  }

  /**
   * Get decrypted access token for a tool
   * @param userId User ID
   * @param toolType Tool type
   * @returns Access token or null
   */
  public async getAccessToken(
    userId: string,
    toolType: MCPToolType
  ): Promise<string | null> {
    try {
      const integration = await this.prisma.mCPIntegration.findUnique({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        }
      });

      if (!integration || !integration.isActive) {
        console.log(`[MCP OAuth] No integration found for ${toolType}`);
        return null;
      }

      // Debug log to track stored scope
      console.log(`[MCP OAuth] Retrieved token for ${toolType}:`, {
        scope: integration.scope,
        expiresAt: integration.expiresAt,
        hasRefreshToken: !!integration.refreshToken,
        connectedAt: integration.connectedAt
      });

      // Check if token is expired or will expire within 5 minutes (proactive refresh)
      const REFRESH_BUFFER_MS = 5 * 60 * 1000;
      const needsRefresh = integration.expiresAt &&
        new Date() > new Date(integration.expiresAt.getTime() - REFRESH_BUFFER_MS);

      if (needsRefresh) {
        log.info('Proactive refresh triggered', {
          toolType, userId,
          expiresInMs: integration.expiresAt!.getTime() - Date.now()
        });
        // Try to refresh the token
        if (integration.refreshToken) {
          const refreshed = await this.refreshAccessToken(userId, toolType);
          if (refreshed) {
            return refreshed;
          }
        }
        // If already expired and refresh failed, return null
        if (new Date() > integration.expiresAt!) {
          return null;
        }
      }

      // Ensure accessToken exists before decrypting
      if (!integration.accessToken) {
        console.error(`[MCP OAuth] No access token stored for ${toolType}`);
        return null;
      }

      return this.decrypt(integration.accessToken);
    } catch (error) {
      console.error(`[MCP OAuth] Error getting access token for ${toolType}:`, error);
      return null;
    }
  }

  /**
   * Refresh an access token with mutex to prevent concurrent refresh races
   */
  private async refreshAccessToken(
    userId: string,
    toolType: MCPToolType
  ): Promise<string | null> {
    const key = `${userId}:${toolType}`;
    const existing = this.refreshPromises.get(key);
    if (existing) {
      log.info('Mutex: waiting on in-flight refresh', { toolType, userId });
      return existing;
    }

    const promise = this.doRefresh(userId, toolType);
    this.refreshPromises.set(key, promise);
    try {
      return await promise;
    } finally {
      this.refreshPromises.delete(key);
    }
  }

  /**
   * Actual refresh implementation with retry + exponential backoff
   */
  private async doRefresh(
    userId: string,
    toolType: MCPToolType
  ): Promise<string | null> {
    const MAX_ATTEMPTS = 3;
    const BASE_DELAY_MS = 1000;

    const integration = await this.prisma.mCPIntegration.findUnique({
      where: { userId_toolType: { userId, toolType } }
    });

    if (!integration || !integration.refreshToken) return null;

    const config = this.oauthConfigs.get(toolType);
    if (!config) return null;

    const refreshToken = this.decrypt(integration.refreshToken);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const tokenResponse = await axios.post(
          config.tokenUrl,
          new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
        );

        const tokens = tokenResponse.data;
        await this.storeTokens(userId, toolType, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || refreshToken,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
          scope: tokens.scope
        });

        await this.privacyService.recordConsent(userId, toolType, MCPAction.TOKEN_REFRESHED, true);
        log.info('Token refreshed', { toolType, userId, attempt });
        return tokens.access_token;
      } catch (error: any) {
        const status = error.response?.status;

        // 400/401 = permanent failure (invalid_grant, revoked). Don't retry.
        if (status === 400 || status === 401) {
          log.error('Refresh token permanently invalid', { toolType, userId, status, errorBody: error.response?.data });
          return null;
        }

        // 429 or 5xx = transient. Retry with backoff.
        if (attempt < MAX_ATTEMPTS) {
          let delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          if (status === 429) {
            const retryAfter = parseInt(error.response?.headers?.['retry-after'], 10);
            if (!isNaN(retryAfter)) delay = Math.min(retryAfter * 1000, 60000);
          }
          log.warn('Refresh failed, retrying', { toolType, userId, attempt, nextRetryMs: delay, status, error: error.message });
          await new Promise(r => setTimeout(r, delay));
        } else {
          log.error('Refresh exhausted all attempts', { toolType, userId, attempts: MAX_ATTEMPTS, error: error.message });
        }
      }
    }
    return null;
  }

  /**
   * Disconnect a tool integration
   * @param userId User ID
   * @param toolType Tool type
   * @returns Success status
   */
  public async disconnectIntegration(
    userId: string,
    toolType: MCPToolType
  ): Promise<boolean> {
    try {
      // Deactivate the integration
      await this.prisma.mCPIntegration.update({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Log disconnection
      await this.privacyService.logIntegrationAction(userId, toolType, MCPAction.DISCONNECT, true);

      console.log(`[MCP OAuth] Disconnected ${toolType} for user ${userId}`);

      return true;
    } catch (error) {
      console.error(`[MCP OAuth] Error disconnecting ${toolType}:`, error);
      return false;
    }
  }

  /**
   * Validate OAuth token for a tool integration
   * @param userId User ID
   * @param toolType Tool type
   * @returns Validation status
   */
  public async validateIntegration(
    userId: string,
    toolType: MCPToolType
  ): Promise<{ status: 'valid' | 'expired' | 'invalid'; error?: string }> {
    try {
      const integration = await this.prisma.mCPIntegration.findUnique({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        }
      });

      if (!integration || !integration.isActive) {
        return { status: 'invalid', error: 'Integration not found or inactive' };
      }

      // Check token expiration
      if (integration.expiresAt && integration.expiresAt < new Date()) {
        console.log(`[MCP OAuth] Token expired for ${toolType}, attempting refresh`);

        // Attempt to refresh the token
        const newToken = await this.refreshAccessToken(userId, toolType);

        if (newToken) {
          return { status: 'valid' };
        } else {
          return { status: 'expired', error: 'Token expired and refresh failed' };
        }
      }

      // Token is not expired, return valid
      return { status: 'valid' };
    } catch (error: any) {
      console.error(`[MCP OAuth] Error validating ${toolType}:`, error);
      return { status: 'invalid', error: error.message || 'Validation failed' };
    }
  }

  /**
   * Validate all integrations for a user
   * @param userId User ID
   * @returns Map of tool type to validation status
   */
  public async validateAllIntegrations(
    userId: string
  ): Promise<Record<string, { status: 'valid' | 'expired' | 'invalid'; error?: string }>> {
    try {
      // Get all active integrations for the user
      const integrations = await this.prisma.mCPIntegration.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          toolType: true
        }
      });

      // Validate each integration in parallel
      const validationPromises = integrations.map(async (integration) => {
        const result = await this.validateIntegration(userId, integration.toolType as MCPToolType);
        return { toolType: integration.toolType, ...result };
      });

      const validationResults = await Promise.all(validationPromises);

      // Convert array to record
      const resultMap: Record<string, { status: 'valid' | 'expired' | 'invalid'; error?: string }> = {};
      validationResults.forEach(result => {
        resultMap[result.toolType] = {
          status: result.status,
          error: result.error
        };
      });

      console.log(`[MCP OAuth] Validated ${validationResults.length} integrations for user ${userId}`);

      return resultMap;
    } catch (error: any) {
      console.error(`[MCP OAuth] Error validating all integrations:`, error);
      return {};
    }
  }

  /**
   * Check if a tool is available (configured)
   * @param toolType Tool type
   * @returns Whether tool is configured
   */
  public isToolAvailable(toolType: MCPToolType): boolean {
    return this.oauthConfigs.has(toolType);
  }

  /**
   * Get list of available tools
   * @returns Array of available tool types
   */
  public getAvailableTools(): MCPToolType[] {
    return Array.from(this.oauthConfigs.keys());
  }
}

// Singleton instance — all consumers import this, never `new MCPOAuthService()`
export const oauthService = new MCPOAuthService();