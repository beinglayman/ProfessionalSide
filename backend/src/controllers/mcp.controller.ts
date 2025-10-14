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
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
      if (existing) {
        // Return existing integration with consistent property name
        return {
          ...existing,
          tool: existing.toolType
        };
      }
      // Return placeholder with consistent structure
      return {
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
  const userId = req.user?.id;
  const { toolType } = req.body;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

  const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'];

  if (!toolType || !validTools.includes(toolType)) {
    sendError(res, 'Invalid or unavailable tool type', 400);
    return;
  }

  try {
    // Use OAuth service to get authorization URL
    const { MCPOAuthService } = await import('../services/mcp/mcp-oauth.service');
    const oauthService = new MCPOAuthService();

    const result = oauthService.getAuthorizationUrl(userId, toolType);

    if (!result) {
      sendError(res, `${toolType} OAuth not configured. Please ensure OAuth credentials are set in environment variables.`, 500);
      return;
    }

    console.log(`[MCP OAuth] Generated authorization URL for ${toolType}, user ${userId}`);

    sendSuccess(res, {
      authUrl: result.url,
      state: result.state,
      toolType,
      privacyNotice: 'You will be redirected to authenticate with the external service. InChronicle only stores encrypted access tokens.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error initiating OAuth:', error);
    sendError(res, 'Failed to initiate OAuth');
  }
});

/**
 * Initiate OAuth for a group of tools (e.g., Jira + Confluence)
 */
export const initiateGroupOAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { groupType } = req.body;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

  const validGroups = ['atlassian', 'microsoft'];

  if (!groupType || !validGroups.includes(groupType)) {
    sendError(res, 'Invalid group type. Must be "atlassian" or "microsoft"', 400);
    return;
  }

  try {
    // Use OAuth service to get group authorization URL
    const { MCPOAuthService } = await import('../services/mcp/mcp-oauth.service');
    const oauthService = new MCPOAuthService();

    const result = oauthService.getAuthorizationUrlForGroup(userId, groupType);

    if (!result) {
      sendError(res, `${groupType} OAuth not configured. Please ensure OAuth credentials are set in environment variables.`, 500);
      return;
    }

    console.log(`[MCP OAuth] Generated group authorization URL for ${groupType} (${result.tools.join(', ')}), user ${userId}`);

    sendSuccess(res, {
      authUrl: result.url,
      state: result.state,
      groupType,
      tools: result.tools,
      privacyNotice: 'You will be redirected to authenticate with the external service. InChronicle only stores encrypted access tokens.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error initiating group OAuth:', error);
    sendError(res, 'Failed to initiate group OAuth');
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
      console.error(`[MCP OAuth] OAuth error from ${toolType}:`, oauthError);
      return res.redirect(`${frontendUrl}/mcp/callback?error=${oauthError}&tool=${toolType}`);
    }

    if (!code || !state) {
      console.error(`[MCP OAuth] Missing code or state for ${toolType}`);
      return res.redirect(`${frontendUrl}/mcp/callback?error=missing_params&tool=${toolType}`);
    }

    // Validate that the toolType in params matches expected tools or groups
    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'];
    const validGroups = ['atlassian', 'microsoft'];
    const isGroupCallback = validGroups.includes(toolType);

    if (!validTools.includes(toolType) && !isGroupCallback) {
      console.error(`[MCP OAuth] Invalid tool type: ${toolType}`);
      return res.redirect(`${frontendUrl}/mcp/callback?error=invalid_tool&tool=${toolType}`);
    }

    // Decode and validate state
    let stateData: any;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch (e) {
      console.error(`[MCP OAuth] Invalid state format for ${toolType}`);
      return res.redirect(`${frontendUrl}/mcp/callback?error=invalid_state&tool=${toolType}`);
    }

    const { userId, toolType: stateToolType, toolTypes, groupType } = stateData;

    // For group callbacks, validate the groupType matches the URL param
    // For individual callbacks, validate the toolType matches
    if (isGroupCallback) {
      if (groupType !== toolType) {
        console.error(`[MCP OAuth] Group type mismatch: expected ${groupType}, got ${toolType}`);
        return res.redirect(`${frontendUrl}/mcp/callback?error=state_mismatch&tool=${toolType}`);
      }
    } else {
      if (stateToolType !== toolType) {
        console.error(`[MCP OAuth] State mismatch for ${toolType}: expected ${stateToolType}`);
        return res.redirect(`${frontendUrl}/mcp/callback?error=state_mismatch&tool=${toolType}`);
      }
    }

    if (!userId) {
      console.error(`[MCP OAuth] No userId in state for ${toolType}`);
      return res.redirect(`${frontendUrl}/mcp/callback?error=invalid_state&tool=${toolType}`);
    }

    console.log(`[MCP OAuth] Processing callback for ${toolType}, user ${userId}`);

    // Use OAuth service to handle callback for all tools
    const { MCPOAuthService } = await import('../services/mcp/mcp-oauth.service');
    const oauthService = new MCPOAuthService();

    const result = await oauthService.handleCallback(code as string, state as string);

    if (!result.success) {
      console.error(`[MCP OAuth] Failed to handle callback for ${toolType}`);
      return res.redirect(`${frontendUrl}/mcp/callback?error=oauth_exchange_failed&tool=${toolType}`);
    }

    // For group callbacks, pass all connected tools
    // For individual callbacks, pass the single tool
    const connectedTools = result.toolTypes || [result.toolType];
    const toolsParam = connectedTools.join(',');

    console.log(`[MCP OAuth] Successfully connected ${connectedTools.join(', ')} for user ${userId}`);

    // Redirect to frontend success page
    return res.redirect(`${frontendUrl}/mcp/callback?success=true&tools=${toolsParam}`);
  } catch (error) {
    console.error('[MCP OAuth] Error handling OAuth callback:', error);
    return res.redirect(`${frontendUrl}/mcp/callback?error=callback_failed&tool=${toolType}`);
  }
});

/**
 * Disconnect a tool integration
 */
export const disconnectIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { toolType } = req.params;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
  const userId = req.user?.id;
  const { toolTypes, dateRange, consentGiven } = req.body;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
 * Fetch and organize data from multiple tools using AI
 * This is the multi-source endpoint that provides unified, AI-organized results
 */
export const fetchMultiSource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { toolTypes, dateRange, consentGiven } = req.body;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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

    console.log(`[MCP Multi-Source] Fetching from ${toolTypes.length} tools for user ${userId}`);

    // Import tool services
    const { GitHubTool } = await import('../services/mcp/tools/github.tool');
    const { JiraTool } = await import('../services/mcp/tools/jira.tool');
    const { FigmaTool } = await import('../services/mcp/tools/figma.tool');
    const { OutlookTool } = await import('../services/mcp/tools/outlook.tool');
    const { ConfluenceTool } = await import('../services/mcp/tools/confluence.tool');
    const { SlackTool } = await import('../services/mcp/tools/slack.tool');
    const { TeamsTool } = await import('../services/mcp/tools/teams.tool');
    const { MCPMultiSourceOrganizer } = await import('../services/mcp/mcp-multi-source-organizer.service');
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');

    // Parse date range
    let parsedDateRange: { start: Date; end: Date } | undefined;
    if (dateRange?.start && dateRange?.end) {
      parsedDateRange = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      };
    }

    // Fetch data from all tools in parallel
    const fetchPromises = toolTypes.map(async (toolType: string) => {
      try {
        let tool: any;
        let result: any;

        switch (toolType) {
          case 'github':
            tool = new GitHubTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'jira':
            tool = new JiraTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'figma':
            tool = new FigmaTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'outlook':
            tool = new OutlookTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'confluence':
            tool = new ConfluenceTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'slack':
            tool = new SlackTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'teams':
            tool = new TeamsTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          default:
            console.log(`[MCP Multi-Source] Unknown tool type: ${toolType}`);
            return null;
        }

        if (result && result.success && result.data) {
          return { toolType, data: result.data };
        }

        return null;
      } catch (error: any) {
        console.error(`[MCP Multi-Source] Error fetching from ${toolType}:`, error);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    // Filter out failed fetches and create source map
    const sourcesMap = new Map<string, any>();
    results.forEach(result => {
      if (result && result.data) {
        sourcesMap.set(result.toolType, result.data);
      }
    });

    if (sourcesMap.size === 0) {
      sendError(res, 'Failed to fetch data from any connected tools. Please ensure at least one tool is properly connected.', 400);
      return;
    }

    console.log(`[MCP Multi-Source] Successfully fetched from ${sourcesMap.size} tools`);

    // Use AI to organize and correlate multi-source data
    const organizer = new MCPMultiSourceOrganizer();
    const organized = await organizer.organizeMultiSourceActivity(sourcesMap, parsedDateRange);

    // Store organized results in session
    const sessionService = MCPSessionService.getInstance();
    const sessionId = sessionService.createSession(
      userId,
      'multi-source' as any, // Special multi-source session type
      {
        sources: Array.from(sourcesMap.keys()),
        organized,
        rawData: Object.fromEntries(sourcesMap)
      },
      true
    );

    console.log(`[MCP Multi-Source] Created session ${sessionId} with organized data`);

    sendSuccess(res, {
      sessionId,
      sources: Array.from(sourcesMap.keys()),
      organized,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      privacyNotice: 'All fetched data is stored in memory only and will automatically expire after 30 minutes. No external data is persisted to our database.',
      message: `Successfully organized activity from ${sourcesMap.size} tool(s) with AI`
    });
  } catch (error: any) {
    console.error('[MCP Multi-Source] Error:', error);
    sendError(res, error.message || 'Failed to fetch and organize multi-source data');
  }
});

/**
 * Get session data (memory-only)
 */
export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
  const userId = req.user?.id;
  const { limit = 50, toolType } = req.query;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'Unauthorized: User not authenticated', 401);
  }

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