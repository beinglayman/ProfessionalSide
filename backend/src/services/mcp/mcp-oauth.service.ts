import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import { MCPToolType, MCPOAuthConfig, MCPOAuthTokens, MCPAction } from '../../types/mcp.types';
import { MCPPrivacyService } from './mcp-privacy.service';
import { prisma } from '../../lib/prisma';

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

  constructor() {
    this.prisma = prisma; // Use singleton Prisma client
    this.privacyService = new MCPPrivacyService();

    // Initialize encryption key from environment
    this.encryptionKey = process.env.ENCRYPTION_KEY || process.env.MCP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
    if (this.encryptionKey === 'default-key') {
      console.warn('[MCP OAuth] WARNING: Using default encryption key. Set ENCRYPTION_KEY in environment.');
    }

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
        // GRANULAR scopes for v2 API compatibility
        // read:content:confluence - Read Confluence content (pages, blogs)
        // read:content-details:confluence - Read content details (version history, etc.)
        // read:space:confluence - Read space information
        // read:space-details:confluence - Read detailed space information
        // search:confluence - Search Confluence content
        // read:user:confluence - Read user information
        // read:me - User Identity API (user profile)
        // NOTE: Switched to granular scopes for v2 API compatibility (classic scopes cause 401)
        scope: 'read:content:confluence read:content-details:confluence read:space:confluence read:space-details:confluence search:confluence read:user:confluence read:me offline_access'
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

    console.log(`[MCP OAuth] Initialized ${this.oauthConfigs.size} OAuth configurations`);

    // Log detailed configuration status
    this.logConfigurationDiagnostics();
  }

  /**
   * Log detailed diagnostics about OAuth configuration status
   */
  private logConfigurationDiagnostics(): void {
    const allTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'];
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
        'slack': ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET']
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
  private encrypt(text: string): string {
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
  private decrypt(text: string): string {
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

    // Store state temporarily (you might want to use Redis in production)
    // For now, we'll encode userId and toolType in the state
    const stateData = Buffer.from(JSON.stringify({ userId, toolType, state })).toString('base64');

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
      microsoft: [MCPToolType.OUTLOOK, MCPToolType.TEAMS]
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

    // Store state with all tool types
    const stateData = Buffer.from(
      JSON.stringify({
        userId,
        toolTypes: tools,
        groupType,
        state
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

      // Check if token is expired
      if (integration.expiresAt && new Date() > integration.expiresAt) {
        // Try to refresh the token
        if (integration.refreshToken) {
          const refreshed = await this.refreshAccessToken(userId, toolType);
          if (refreshed) {
            return refreshed;
          }
        }
        return null;
      }

      return this.decrypt(integration.accessToken);
    } catch (error) {
      console.error(`[MCP OAuth] Error getting access token for ${toolType}:`, error);
      return null;
    }
  }

  /**
   * Refresh an access token
   * @param userId User ID
   * @param toolType Tool type
   * @returns New access token or null
   */
  private async refreshAccessToken(
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

      if (!integration || !integration.refreshToken) {
        return null;
      }

      const config = this.oauthConfigs.get(toolType);
      if (!config) {
        return null;
      }

      const refreshToken = this.decrypt(integration.refreshToken);

      // Request new tokens
      const tokenResponse = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
          }
        }
      );

      const tokens = tokenResponse.data;

      // Update stored tokens
      await this.storeTokens(userId, toolType, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken, // Keep old refresh token if not provided
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
        scope: tokens.scope
      });

      // Log token refresh
      await this.privacyService.recordConsent(
        userId,
        toolType,
        MCPAction.TOKEN_REFRESHED,
        true
      );

      console.log(`[MCP OAuth] Refreshed token for ${toolType}, user ${userId}`);

      return tokens.access_token;
    } catch (error) {
      console.error(`[MCP OAuth] Error refreshing token for ${toolType}:`, error);
      return null;
    }
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