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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
    return;
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
      { type: 'teams', name: 'Microsoft Teams', description: 'Sync meeting notes and chat discussions from Teams' },
      { type: 'onedrive', name: 'OneDrive', description: 'Import OneDrive file changes and collaboration activity' },
      { type: 'onenote', name: 'OneNote', description: 'Import OneNote pages, notebooks, and note-taking activity' }
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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

    // Tool metadata
    const toolMetadata: Record<string, { name: string; description: string }> = {
      github: { name: 'GitHub', description: 'Code contributions and repositories' },
      jira: { name: 'Jira', description: 'Task completions and sprint activity' },
      figma: { name: 'Figma', description: 'Design contributions and projects' },
      outlook: { name: 'Outlook', description: 'Meeting notes and calendar events' },
      confluence: { name: 'Confluence', description: 'Documentation updates' },
      slack: { name: 'Slack', description: 'Important messages and discussions' },
      teams: { name: 'Microsoft Teams', description: 'Meeting notes and chat discussions' },
      onedrive: { name: 'OneDrive', description: 'OneDrive file changes and collaboration' },
      onenote: { name: 'OneNote', description: 'OneNote pages, notebooks, and notes' }
    };

    // Ensure all tools are represented
    const allTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote'];
    const integrationMap = new Map(integrations.map(i => [i.toolType, i]));

    const allIntegrations = allTools.map(tool => {
      const existing = integrationMap.get(tool);
      const metadata = toolMetadata[tool] || { name: tool, description: '' };

      if (existing) {
        // Return existing integration with complete metadata
        return {
          ...existing,
          name: metadata.name,
          description: metadata.description,
          tool: existing.toolType
        };
      }
      // Return placeholder with consistent structure and metadata
      return {
        toolType: tool,
        tool,
        name: metadata.name,
        description: metadata.description,
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote'];

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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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
    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint'];
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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

    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint'];
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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

    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint'];
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
    const { OneDriveTool } = await import('../services/mcp/tools/onedrive.tool');
    const { OneNoteTool } = await import('../services/mcp/tools/onenote.tool');
    const { SharePointTool } = await import('../services/mcp/tools/sharepoint.tool');
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

          case 'onedrive':
            tool = new OneDriveTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'onenote':
            tool = new OneNoteTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'sharepoint':
            tool = new SharePointTool();
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
    const organized = await organizer.organizeMultiSourceActivity(sourcesMap as Map<any, any>, parsedDateRange);

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
 * Process fetched data with AI agents (progressive endpoint)
 * Allows frontend to call different processing stages independently
 */
export const processWithAgents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const {
    stage,
    sessionId,
    data,
    options = {}
  } = req.body;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  try {
    // Validate stage
    const validStages = ['analyze', 'correlate', 'generate'];
    if (!validStages.includes(stage)) {
      sendError(res, `Invalid processing stage. Must be one of: ${validStages.join(', ')}`, 400);
      return;
    }

    // Import required services
    const { MCPMultiSourceOrganizer } = await import('../services/mcp/mcp-multi-source-organizer.service');
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');

    const organizer = new MCPMultiSourceOrganizer();
    const sessionService = MCPSessionService.getInstance();

    // For generate stage, we need a sessionId to get previous results
    if (stage === 'generate' && !sessionId) {
      sendError(res, 'Session ID required for generate stage', 400);
      return;
    }

    // Get session data if sessionId provided
    let sessionData = null;
    if (sessionId) {
      sessionData = sessionService.getSession(sessionId, userId);
      if (!sessionData) {
        sendError(res, 'Session not found or expired', 404);
        return;
      }
    }

    console.log(`[MCP Agents] Processing stage: ${stage} for user ${userId}`);

    // Process the stage
    const result = await organizer.processStage(stage as any, data || sessionData?.tempData, options);

    // Store result in session for next stages
    if (result.nextStage) {
      const newSessionId = sessionId || crypto.randomBytes(16).toString('hex');

      // Update or create session with new data
      sessionService.createSession(
        userId,
        'agent-processing' as any,
        {
          stage,
          result: result.result,
          previousData: data || sessionData?.tempData,
          nextStage: result.nextStage
        },
        true
      );

      sendSuccess(res, {
        sessionId: newSessionId,
        stage,
        result: result.result,
        nextStage: result.nextStage,
        progress: result.progress,
        message: `Stage '${stage}' completed successfully`
      });
    } else {
      // Final stage completed
      sendSuccess(res, {
        sessionId,
        stage,
        result: result.result,
        progress: 100,
        complete: true,
        message: 'All processing stages completed'
      });
    }
  } catch (error: any) {
    console.error(`[MCP Agents] Error in ${stage} stage:`, error);
    sendError(res, error.message || `Failed to process ${stage} stage`);
  }
});

/**
 * Fetch and process with agents in one call (convenience endpoint)
 */
export const fetchAndProcessWithAgents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const {
    toolTypes,
    dateRange,
    consentGiven,
    quality = 'balanced',
    generateContent = true,
    workspaceName
  } = req.body;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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

    console.log(`[MCP Agents] Full pipeline: Fetching from ${toolTypes.length} tools and processing with agents`);
    console.log(`[MCP Agents] Requested toolTypes:`, toolTypes);

    // Helper function to calculate item count for different tool data structures
    const getItemCount = (toolType: string, data: any): number => {
      if (!data) return 0;

      switch (toolType) {
        case 'confluence':
          // Confluence returns object with arrays: {pages[], blogPosts[], comments[], spaces[]}
          return (data.pages?.length || 0) + (data.blogPosts?.length || 0) + (data.comments?.length || 0);
        case 'github':
          // GitHub returns object with arrays: {commits[], pullRequests[], issues[], repositories[]}
          return (data.commits?.length || 0) + (data.pullRequests?.length || 0) + (data.issues?.length || 0);
        case 'jira':
          // Jira returns object with arrays: {issues[], sprints[], epics[]}
          return (data.issues?.length || 0) + (data.sprints?.length || 0);
        case 'figma':
          // Figma returns object with arrays: {files[], comments[], versions[]}
          return (data.files?.length || 0) + (data.comments?.length || 0);
        case 'outlook':
          // Outlook returns object with arrays: {meetings[], emails[]}
          return (data.meetings?.length || 0) + (data.emails?.length || 0);
        case 'slack':
          // Slack returns object with arrays: {messages[], threads[], channels[]}
          return (data.messages?.length || 0) + (data.threads?.length || 0);
        case 'teams':
          // Teams returns object with arrays: {meetings[], messages[], calls[]}
          return (data.meetings?.length || 0) + (data.messages?.length || 0);
        case 'onedrive':
          // OneDrive returns object: {recentFiles, sharedFiles, foldersAccessed[], highlights[]}
          return (data.recentFiles || 0) + (data.sharedFiles || 0);
        case 'onenote':
          // OneNote returns object: {notebooks, pagesCreated, pagesUpdated, highlights[]}
          return (data.pagesCreated || 0) + (data.pagesUpdated || 0);
        case 'sharepoint':
          // SharePoint returns object: {sitesAccessed, filesModified, listsUpdated, highlights[]}
          return (data.filesModified || 0) + (data.listsUpdated || 0);
        default:
          // Fallback: if data is an array, return its length
          return Array.isArray(data) ? data.length : 0;
      }
    };

    // Helper function to get detailed count summary for logging
    const getCountSummary = (toolType: string, data: any): string => {
      if (!data) return '0 items';

      switch (toolType) {
        case 'confluence':
          return `${data.pages?.length || 0} pages, ${data.blogPosts?.length || 0} blog posts, ${data.comments?.length || 0} comments`;
        case 'github':
          return `${data.commits?.length || 0} commits, ${data.pullRequests?.length || 0} PRs, ${data.issues?.length || 0} issues`;
        case 'jira':
          return `${data.issues?.length || 0} issues, ${data.sprints?.length || 0} sprints`;
        case 'figma':
          return `${data.files?.length || 0} files, ${data.comments?.length || 0} comments`;
        case 'outlook':
          return `${data.meetings?.length || 0} meetings, ${data.emails?.length || 0} emails`;
        case 'slack':
          return `${data.messages?.length || 0} messages, ${data.threads?.length || 0} threads`;
        case 'teams':
          return `${data.meetings?.length || 0} meetings, ${data.messages?.length || 0} messages`;
        case 'onedrive':
          return `${data.recentFiles || 0} recent files, ${data.sharedFiles || 0} shared files`;
        case 'onenote':
          return `${data.pagesCreated || 0} pages created, ${data.pagesUpdated || 0} pages updated`;
        case 'sharepoint':
          return `${data.filesModified || 0} files modified, ${data.listsUpdated || 0} lists updated`;
        default:
          return `${Array.isArray(data) ? data.length : 0} items`;
      }
    };

    // Import tool services
    const toolImports = {
      github: () => import('../services/mcp/tools/github.tool').then(m => new m.GitHubTool()),
      jira: () => import('../services/mcp/tools/jira.tool').then(m => new m.JiraTool()),
      figma: () => import('../services/mcp/tools/figma.tool').then(m => new m.FigmaTool()),
      outlook: () => import('../services/mcp/tools/outlook.tool').then(m => new m.OutlookTool()),
      confluence: () => import('../services/mcp/tools/confluence.tool').then(m => new m.ConfluenceTool()),
      slack: () => import('../services/mcp/tools/slack.tool').then(m => new m.SlackTool()),
      teams: () => import('../services/mcp/tools/teams.tool').then(m => new m.TeamsTool()),
      onedrive: () => import('../services/mcp/tools/onedrive.tool').then(m => new m.OneDriveTool()),
      onenote: () => import('../services/mcp/tools/onenote.tool').then(m => new m.OneNoteTool()),
      sharepoint: () => import('../services/mcp/tools/sharepoint.tool').then(m => new m.SharePointTool())
    };

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
        console.log(`[MCP Agents] Attempting to fetch from ${toolType} for user ${userId}`);
        const toolImport = toolImports[toolType as keyof typeof toolImports];
        if (!toolImport) {
          console.log(`[MCP Agents] No tool import found for ${toolType}`);
          return null;
        }

        const tool = await toolImport();
        console.log(`[MCP Agents] Tool instance created for ${toolType}, calling fetchActivity`);
        const result = await tool.fetchActivity(userId, parsedDateRange);

        const itemCount = result?.data ? getItemCount(toolType, result.data) : 0;
        console.log(`[MCP Agents] fetchActivity result for ${toolType}:`, {
          success: result?.success,
          hasData: !!result?.data,
          itemCount,
          details: getCountSummary(toolType, result?.data)
        });

        if (result && result.success && result.data) {
          console.log(`[MCP Agents] ✅ Successfully fetched from ${toolType}: ${getCountSummary(toolType, result.data)}`);
          return { toolType, data: result.data };
        }
        console.log(`[MCP Agents] ❌ No valid data from ${toolType} (success: ${result?.success})`);
        return null;
      } catch (error: any) {
        console.error(`[MCP Agents] Error fetching from ${toolType}:`, error.message);
        console.error(`[MCP Agents] Error details for ${toolType}:`, {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n')[0]
        });
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    console.log(`[MCP Agents] Completed all fetch attempts. Results:`, results.map(r => r ? `${r.toolType}: ${getCountSummary(r.toolType, r.data)}` : 'null'));

    // Filter out failed fetches and create source map
    const sourcesMap = new Map<string, any>();
    results.forEach(result => {
      if (result && result.data) {
        sourcesMap.set(result.toolType, result.data);
      }
    });

    console.log(`[MCP Agents] sourcesMap size: ${sourcesMap.size}, tools: [${Array.from(sourcesMap.keys()).join(', ')}]`);

    if (sourcesMap.size === 0) {
      console.error(`[MCP Agents] No data fetched from any tool. All ${toolTypes.length} tools failed.`);
      sendError(res, 'Failed to fetch data from any connected tools. Please ensure at least one tool is properly connected.', 400);
      return;
    }

    console.log(`[MCP Agents] Successfully fetched from ${sourcesMap.size} tools, starting agent processing`);

    // Use AI agents to organize and generate content
    const { MCPMultiSourceOrganizer } = await import('../services/mcp/mcp-multi-source-organizer.service');
    const { MCPSessionService } = await import('../services/mcp/mcp-session.service');

    const organizer = new MCPMultiSourceOrganizer();
    const agentResults = await organizer.organizeWithAgents(
      sourcesMap as Map<any, any>,
      {
        quality,
        generateContent,
        workspaceName: workspaceName || 'Professional Work'
      }
    );

    // Store results in session
    const sessionService = MCPSessionService.getInstance();
    const sessionId = sessionService.createSession(
      userId,
      'agent-processed' as any,
      {
        sources: Array.from(sourcesMap.keys()),
        ...agentResults,
        rawData: Object.fromEntries(sourcesMap)
      },
      true
    );

    console.log(`[MCP Agents] Created session ${sessionId} with agent-processed data`);

    sendSuccess(res, {
      sessionId,
      sources: Array.from(sourcesMap.keys()),
      analysis: agentResults.analysis,
      correlations: agentResults.correlations,
      content: agentResults.content,
      organized: agentResults.organized,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      privacyNotice: 'All fetched data is stored in memory only and will automatically expire after 30 minutes.',
      message: `Successfully processed activity from ${sourcesMap.size} tool(s) with AI agents`
    });
  } catch (error: any) {
    console.error('[MCP Agents] Full pipeline error:', error);
    sendError(res, error.message || 'Failed to fetch and process with agents');
  }
});

/**
 * Get session data (memory-only)
 */
export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
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