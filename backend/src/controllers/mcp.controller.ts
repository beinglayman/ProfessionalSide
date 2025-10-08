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

/**
 * Fetch data from connected tools (memory-only storage)
 */
export const fetchData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { toolTypes, dateRange, consentGiven } = req.body;

  try {
    // Validate consent
    if (!consentGiven) {
      sendError(res, 'User consent is required to fetch data', 400);
      return;
    }

    // Validate tool types
    if (!toolTypes || !Array.isArray(toolTypes) || toolTypes.length === 0) {
      sendError(res, 'At least one tool type is required', 400);
      return;
    }

    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'];
    const invalidTools = toolTypes.filter((t: string) => !validTools.includes(t));

    if (invalidTools.length > 0) {
      sendError(res, `Invalid tool types: ${invalidTools.join(', ')}`, 400);
      return;
    }

    // Import tool services dynamically
    const { GitHubTool } = await import('../services/mcp/tools/github.tool');

    const results = [];

    // Fetch data from each tool
    for (const toolType of toolTypes) {
      try {
        if (toolType === 'github') {
          const githubTool = new GitHubTool();
          const result = await githubTool.fetchActivity(userId, dateRange);
          results.push({
            toolType,
            ...result
          });
        } else {
          // Other tools not yet implemented
          results.push({
            toolType,
            success: false,
            error: `${toolType} integration not yet implemented`
          });
        }
      } catch (error: any) {
        console.error(`[MCP Controller] Error fetching from ${toolType}:`, error);
        results.push({
          toolType,
          success: false,
          error: error.message || `Failed to fetch from ${toolType}`
        });
      }
    }

    sendSuccess(res, {
      results,
      privacyNotice: 'All fetched data is stored in memory only and will automatically expire after 30 minutes. No external data is persisted to our database.',
      message: 'Data fetch completed'
    });
  } catch (error) {
    console.error('[MCP Controller] Error fetching data:', error);
    sendError(res, 'Failed to fetch data from tools');
  }
});

/**
 * Get session data (memory-only)
 */
export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { sessionId } = req.params;

  try {
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');
    const sessionService = MCPSessionService.getInstance();

    const sessionData = sessionService.getSession(sessionId, userId);

    if (!sessionData) {
      sendError(res, 'Session not found or expired', 404);
      return;
    }

    sendSuccess(res, {
      session: sessionData,
      privacyNotice: 'Session data is stored in memory only and will expire after 30 minutes.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error getting session:', error);
    sendError(res, 'Failed to get session data');
  }
});

/**
 * Clear specific session
 */
export const clearSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { sessionId } = req.params;

  try {
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');
    const sessionService = MCPSessionService.getInstance();

    const sessionData = sessionService.getSession(sessionId, userId);

    // Verify session belongs to user before clearing
    if (sessionData && sessionData.userId !== userId) {
      sendError(res, 'Unauthorized access to session', 403);
      return;
    }

    sessionService.clearSession(sessionId);

    sendSuccess(res, {
      message: 'Session data cleared successfully',
      privacyNotice: 'All temporary data has been removed from memory.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error clearing session:', error);
    sendError(res, 'Failed to clear session');
  }
});

/**
 * Clear all user sessions
 */
export const clearAllSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;

  try {
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');
    const sessionService = MCPSessionService.getInstance();

    sessionService.clearUserSessions(userId);

    sendSuccess(res, {
      message: 'All session data cleared successfully',
      privacyNotice: 'All your temporary data has been removed from memory.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error clearing all sessions:', error);
    sendError(res, 'Failed to clear sessions');
  }
});

/**
 * Get MCP privacy status
 */
export const getPrivacyStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, {
      dataRetentionPolicy: 'zero-persistence',
      dataRetentionDescription: 'No external data is ever persisted to our database. Only encrypted OAuth tokens are stored.',
      sessionDuration: parseInt(process.env.MCP_SESSION_DURATION || '30'),
      sessionDurationUnit: 'minutes',
      encryptionStandard: 'AES-256',
      consentRequired: true,
      auditLogging: true,
      auditRetention: '90 days',
      gdprCompliant: true,
      features: {
        autoExpiry: true,
        manualClear: true,
        encryptedTokens: true,
        noDataPersistence: true,
        explicitConsent: true,
        auditTrail: true
      },
      privacyPrinciples: [
        'Zero external data persistence',
        'Memory-only temporary storage',
        'Automatic 30-minute expiry',
        'Encrypted OAuth tokens (AES-256)',
        'Explicit user consent required',
        'Complete audit logging (no data)',
        'User-controlled data deletion',
        'GDPR compliant'
      ]
    });
  } catch (error) {
    console.error('[MCP Controller] Error getting privacy status:', error);
    sendError(res, 'Failed to get privacy status');
  }
});

/**
 * Get user's audit history
 */
export const getAuditHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;
  const { limit = 50, toolType } = req.query;

  try {
    const where: any = { userId };

    if (toolType) {
      where.toolType = toolType as string;
    }

    const auditLogs = await prisma.mCPAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        action: true,
        toolType: true,
        itemCount: true,
        sessionId: true,
        success: true,
        errorMessage: true,
        createdAt: true
      }
    });

    sendSuccess(res, {
      auditLogs,
      total: auditLogs.length,
      privacyNotice: 'Audit logs contain only action metadata. No actual data from external tools is logged.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error getting audit history:', error);
    sendError(res, 'Failed to get audit history');
  }
});

/**
 * Delete all MCP data for user (GDPR compliance)
 */
export const deleteAllMCPData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;

  try {
    // Clear all sessions
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');
    const sessionService = MCPSessionService.getInstance();
    sessionService.clearUserSessions(userId);

    // Delete all integrations (including encrypted tokens)
    const integrationsDeleted = await prisma.mCPIntegration.deleteMany({
      where: { userId }
    });

    // Delete all audit logs
    const auditLogsDeleted = await prisma.mCPAuditLog.deleteMany({
      where: { userId }
    });

    sendSuccess(res, {
      message: 'All MCP data deleted successfully',
      deleted: {
        integrations: integrationsDeleted.count,
        auditLogs: auditLogsDeleted.count,
        sessions: 'all'
      },
      privacyNotice: 'All your MCP-related data, including OAuth tokens and audit logs, has been permanently deleted.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error deleting MCP data:', error);
    sendError(res, 'Failed to delete MCP data');
  }
});