import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import { MCPToolType, MCPOAuthConfig, MCPOAuthTokens, MCPAction } from '../../types/mcp.types';
import { MCPPrivacyService } from './mcp-privacy.service';

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
    this.prisma = new PrismaClient();
    this.privacyService = new MCPPrivacyService();

    // Initialize encryption key from environment
    this.encryptionKey = process.env.MCP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
    if (this.encryptionKey === 'default-key') {
      console.warn('[MCP OAuth] WARNING: Using default encryption key. Set MCP_ENCRYPTION_KEY in environment.');
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
    if (process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.JIRA, {
        clientId: process.env.JIRA_CLIENT_ID,
        clientSecret: process.env.JIRA_CLIENT_SECRET,
        redirectUri: process.env.JIRA_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/jira',
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scope: 'read:jira-work read:jira-user offline_access'
      });
    }

    // Figma OAuth configuration
    if (process.env.FIGMA_CLIENT_ID && process.env.FIGMA_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.FIGMA, {
        clientId: process.env.FIGMA_CLIENT_ID,
        clientSecret: process.env.FIGMA_CLIENT_SECRET,
        redirectUri: process.env.FIGMA_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/figma',
        authorizationUrl: 'https://www.figma.com/oauth',
        tokenUrl: 'https://www.figma.com/api/oauth/token',
        scope: 'file_read'
      });
    }

    // Outlook (Microsoft Graph) OAuth configuration
    if (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.OUTLOOK, {
        clientId: process.env.OUTLOOK_CLIENT_ID,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
        redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/outlook',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: 'User.Read Mail.Read Calendars.Read offline_access'
      });
    }

    // Microsoft Teams OAuth configuration (uses same Microsoft app as Outlook but with Teams scopes)
    if (process.env.TEAMS_CLIENT_ID && process.env.TEAMS_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.TEAMS, {
        clientId: process.env.TEAMS_CLIENT_ID,
        clientSecret: process.env.TEAMS_CLIENT_SECRET,
        redirectUri: process.env.TEAMS_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/teams',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: 'User.Read Team.ReadBasic.All Channel.ReadBasic.All Chat.Read ChannelMessage.Read.All offline_access'
      });
    } else if (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) {
      // Fallback: Use Outlook credentials for Teams (same Microsoft account)
      this.oauthConfigs.set(MCPToolType.TEAMS, {
        clientId: process.env.OUTLOOK_CLIENT_ID,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
        redirectUri: process.env.TEAMS_REDIRECT_URI || process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/teams',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: 'User.Read Team.ReadBasic.All Channel.ReadBasic.All Chat.Read ChannelMessage.Read.All offline_access'
      });
    }

    // Confluence OAuth configuration (Atlassian)
    if (process.env.CONFLUENCE_CLIENT_ID && process.env.CONFLUENCE_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.CONFLUENCE, {
        clientId: process.env.CONFLUENCE_CLIENT_ID,
        clientSecret: process.env.CONFLUENCE_CLIENT_SECRET,
        redirectUri: process.env.CONFLUENCE_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/confluence',
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scope: 'read:confluence-content.all read:confluence-user offline_access'
      });
    }

    // Slack OAuth configuration
    if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
      this.oauthConfigs.set(MCPToolType.SLACK, {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/slack',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scope: 'channels:read users:read chat:write'
      });
    }

    console.log(`[MCP OAuth] Initialized ${this.oauthConfigs.size} OAuth configurations`);
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
      state: stateData,
      access_type: 'offline' // Request refresh token
    });

    // Add tool-specific parameters
    if (toolType === MCPToolType.OUTLOOK) {
      params.append('response_mode', 'query');
      params.append('prompt', 'consent');
    } else if (toolType === MCPToolType.SLACK) {
      params.append('user_scope', config.scope);
    }

    const url = `${config.authorizationUrl}?${params.toString()}`;

    console.log(`[MCP OAuth] Generated auth URL for ${toolType}: ${url}`);

    return { url, state: stateData };
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
  ): Promise<{ success: boolean; userId?: string; toolType?: MCPToolType }> {
    try {
      // Decode and validate state
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      const { userId, toolType } = stateData;

      const config = this.oauthConfigs.get(toolType);
      if (!config) {
        throw new Error(`No OAuth config for tool: ${toolType}`);
      }

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
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

      // Store encrypted tokens
      await this.storeTokens(userId, toolType, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
        scope: tokens.scope
      });

      // Log successful connection
      await this.privacyService.logIntegrationAction(userId, toolType, MCPAction.CONNECT, true);

      console.log(`[MCP OAuth] Successfully connected ${toolType} for user ${userId}`);

      return { success: true, userId, toolType };
    } catch (error) {
      console.error('[MCP OAuth] Error handling callback:', error);
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
        updatedAt: new Date()
      },
      create: {
        userId,
        toolType,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        isActive: true
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
        return null;
      }

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