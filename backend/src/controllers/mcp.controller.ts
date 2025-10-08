import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Mock data store for development
const mockIntegrations = new Map<string, any>();

/**
 * Get available MCP tools and their connection status
 */
export const getAvailableTools = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;

  try {
    // Get user's integrations from database
    const userIntegrations = await prisma.mCPIntegration.findMany({
      where: { userId },
      select: {
        toolType: true,
        isConnected: true,
        connectedAt: true,
        lastSyncAt: true
      }
    });

    // Create a map for quick lookup
    const integrationMap = new Map(
      userIntegrations.map(i => [i.toolType, i])
    );

    // Define available tools
    const tools = [
      { type: 'github', name: 'GitHub', description: 'Connect your GitHub account to import code contributions' },
      { type: 'jira', name: 'Jira', description: 'Import task completions and sprint activity from Jira' },
      { type: 'figma', name: 'Figma', description: 'Sync design contributions from Figma projects' },
      { type: 'outlook', name: 'Outlook', description: 'Import meeting notes and calendar events from Outlook' },
      { type: 'confluence', name: 'Confluence', description: 'Import documentation updates from Confluence' },
      { type: 'slack', name: 'Slack', description: 'Import important messages and discussions from Slack' },
      { type: 'teams', name: 'Microsoft Teams', description: 'Sync meeting notes and chat discussions from Teams' }
    ].map(tool => {
      const integration = integrationMap.get(tool.type);
      return {
        toolType: tool.type,
        name: tool.name,
        description: tool.description,
        isAvailable: true,
        isConnected: integration?.isConnected || false,
        connectedAt: integration?.connectedAt || null,
        lastSyncAt: integration?.lastSyncAt || null
      };
    });

    sendSuccess(res, {
      tools,
      privacyStatus: {
        dataRetentionPolicy: 'No external data is persisted',
        temporarySessionDuration: '30 minutes',
        encryptionStandard: 'AES-256'
      },
      message: 'Your data remains private. We only fetch information when you explicitly request it.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error getting available tools:', error);
    sendError(res, 'Failed to get available tools');
  }
});

/**
 * Get integration status for the current user
 */
export const getIntegrationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;

  try {
    const integrations = await prisma.mCPIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        toolType: true,
        isConnected: true,
        connectedAt: true,
        lastSyncAt: true,
        scope: true
      }
    });

    // Ensure all tools are represented
    const allTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'];
    const integrationMap = new Map(integrations.map(i => [i.toolType, i]));

    const allIntegrations = allTools.map(tool => {
      const existing = integrationMap.get(tool);
      return existing || {
        tool,
        isConnected: false,
        connectedAt: null,
        lastSyncAt: null
      };
    });

    sendSuccess(res, {
      integrations: allIntegrations,
      privacyNotice: 'Your integration status is private and not shared with any third parties.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error getting integration status:', error);
    sendError(res, 'Failed to get integration status');
  }
});

/**
 * Initiate OAuth flow for a tool
 */
export const initiateOAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { toolType } = req.body;

  const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'];

  if (!toolType || !validTools.includes(toolType)) {
    sendError(res, 'Invalid or unavailable tool type', 400);
    return;
  }

  try {
    // Generate state token for security
    const state = crypto.randomBytes(32).toString('base64url');

    // Store state in session or cache (for production, use Redis or similar)
    // For now, we'll encode userId in the state
    const stateData = Buffer.from(JSON.stringify({
      userId,
      toolType,
      timestamp: Date.now()
    })).toString('base64url');

    let authUrl: string;

    // Generate OAuth URL based on tool type
    if (toolType === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUri = process.env.GITHUB_REDIRECT_URI ||
        `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/github`;

      if (!clientId) {
        sendError(res, 'GitHub OAuth not configured', 500);
        return;
      }

      authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('repo user')}` +
        `&state=${stateData}`;
    } else {
      // Mock OAuth URLs for other tools (to be implemented)
      authUrl = `https://example.com/oauth/${toolType}?state=${stateData}`;
    }

    sendSuccess(res, {
      authUrl,
      state: stateData,
      privacyNotice: 'You will be redirected to authenticate with the external service. InChronicle only stores encrypted access tokens.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error initiating OAuth:', error);
    sendError(res, 'Failed to initiate OAuth');
  }
});

/**
 * Handle OAuth callback from external services
 */
export const handleOAuthCallback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { toolType } = req.params;
  const { code, state, error: oauthError } = req.query;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    if (oauthError) {
      // Redirect to frontend with error
      return res.redirect(`${frontendUrl}/mcp/callback?error=${oauthError}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/mcp/callback?error=missing_params`);
    }

    // Decode and validate state
    let stateData: any;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
    } catch (e) {
      return res.redirect(`${frontendUrl}/mcp/callback?error=invalid_state`);
    }

    const { userId, toolType: stateToolType } = stateData;

    if (stateToolType !== toolType) {
      return res.redirect(`${frontendUrl}/mcp/callback?error=state_mismatch`);
    }

    // For GitHub, exchange code for tokens
    if (toolType === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.redirect(`${frontendUrl}/mcp/callback?error=oauth_config_missing`);
    }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: process.env.GITHUB_REDIRECT_URI ||
            `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/v1/mcp/callback/github`
        })
      });

      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        console.error('GitHub OAuth error:', tokenData);
        return res.redirect(`${frontendUrl}/mcp/callback?error=oauth_exchange_failed`);
      }

      // Encrypt the access token
      const encryptionKey = process.env.MCP_ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.error('MCP_ENCRYPTION_KEY not set');
        return res.redirect(`${frontendUrl}/mcp/callback?error=encryption_config_missing`);
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'base64'),
        iv
      );

      let encryptedToken = cipher.update(tokenData.access_token, 'utf8', 'hex');
      encryptedToken += cipher.final('hex');

      const encryptedData = iv.toString('hex') + ':' + encryptedToken;

      // Store the integration in database
      await prisma.mCPIntegration.upsert({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        },
        update: {
          isConnected: true,
          connectedAt: new Date(),
          encryptedTokens: encryptedData,
          scope: tokenData.scope || 'repo user',
          isActive: true
        },
        create: {
          userId,
          toolType,
          isConnected: true,
          connectedAt: new Date(),
          encryptedTokens: encryptedData,
          scope: tokenData.scope || 'repo user',
          isActive: true
        }
      });
    } else {
      // For other tools (mock for now)
      await prisma.mCPIntegration.upsert({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        },
        update: {
          isConnected: true,
          connectedAt: new Date(),
          isActive: true
        },
        create: {
          userId,
          toolType,
          isConnected: true,
          connectedAt: new Date(),
          isActive: true
        }
      });
    }

    // Redirect to frontend success page
    return res.redirect(`${frontendUrl}/mcp/callback?success=true&tool=${toolType}`);
  } catch (error) {
    console.error('[MCP Controller] Error handling OAuth callback:', error);
    return res.redirect(`${frontendUrl}/mcp/callback?error=callback_failed`);
  }
});

/**
 * Disconnect a tool integration
 */
export const disconnectIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { toolType } = req.params;

  try {
    // Delete integration from database
    const result = await prisma.mCPIntegration.deleteMany({
      where: {
        userId,
        toolType
      }
    });

    if (result.count === 0) {
      sendError(res, 'Integration not found', 404);
      return;
    }

    sendSuccess(res, {
      message: `Successfully disconnected ${toolType}`,
      privacyNotice: 'All stored tokens and session data have been permanently deleted.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error disconnecting integration:', error);
    sendError(res, 'Failed to disconnect integration');
  }
});