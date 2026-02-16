import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import * as crypto from 'crypto';
import { format7Transformer } from '../services/mcp/format7-transformer.service';
import { getContentSanitizerService } from '../services/mcp/content-sanitizer.service';
import { MCPToolType } from '../types/mcp.types';
import { isDemoModeRequest } from '../middleware/demo-mode.middleware';
import { oauthService } from '../services/mcp/mcp-oauth.service';

/**
 * Get available MCP tools and their connection status
 */
export const getAvailableTools = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
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
      { type: 'onenote', name: 'OneNote', description: 'Import OneNote pages, notebooks, and note-taking activity' },
      { type: 'zoom', name: 'Zoom', description: 'Import Zoom meeting recordings and transcripts' },
      { type: 'google_workspace', name: 'Google Workspace', description: 'Import Google Docs, Sheets, Slides, Drive files, and Meet recordings' }
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
      onenote: { name: 'OneNote', description: 'OneNote pages, notebooks, and notes' },
      zoom: { name: 'Zoom', description: 'Meeting recordings and transcripts' },
      google_workspace: { name: 'Google Workspace', description: 'Google Docs, Sheets, Slides, Drive, and Meet' }
    };

    // Demo mode: show tools as connected to match seeded demo activities
    // Each integration group got connected at a different time (staggered onboarding)
    const isDemo = isDemoModeRequest(req);
    const demoConnectedTools = new Set([
      'github', 'jira', 'confluence', 'slack', 'figma', 'outlook', 'google_workspace'
    ]);
    const demoConnectedAtByTool: Record<string, string> = {
      github:          new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks ago (first)
      jira:            new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // ~3.5 weeks ago
      confluence:      new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // same as Jira (Atlassian group)
      slack:           new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks ago
      google_workspace:new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
      figma:           new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // ~1.5 weeks ago
      outlook:         new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago (latest)
    };
    const demoLastSyncAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

    // Ensure all tools are represented
    const allTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'zoom', 'google_workspace'];
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

      // In demo mode, mark matching tools as connected
      if (isDemo && demoConnectedTools.has(tool)) {
        return {
          toolType: tool,
          tool,
          name: metadata.name,
          description: metadata.description,
          isConnected: true,
          connectedAt: demoConnectedAtByTool[tool] ?? demoLastSyncAt,
          lastSyncAt: demoLastSyncAt,
          lastUsedAt: demoLastSyncAt,
          isActive: true,
          scope: 'read'
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
 * Validate OAuth tokens for all integrations
 * Returns validation status for each connected tool
 */
export const validateIntegrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  // Demo mode: return all demo-connected tools as valid
  if (isDemoModeRequest(req)) {
    const demoTools = ['github', 'jira', 'confluence', 'slack', 'figma', 'outlook', 'google_workspace'];
    const validations: Record<string, { status: string }> = {};
    for (const tool of demoTools) {
      validations[tool] = { status: 'valid' };
    }
    sendSuccess(res, {
      validations,
      summary: { valid: demoTools.length, expired: 0, invalid: 0, total: demoTools.length }
    });
    return;
  }

  try {
    console.log(`[MCP Controller] Validating integrations for user ${userId}`);

    // Validate all integrations
    const validationResults = await oauthService.validateAllIntegrations(userId);

    // Count results
    const validCount = Object.values(validationResults).filter(r => r.status === 'valid').length;
    const expiredCount = Object.values(validationResults).filter(r => r.status === 'expired').length;
    const invalidCount = Object.values(validationResults).filter(r => r.status === 'invalid').length;

    console.log(`[MCP Controller] Validation complete: ${validCount} valid, ${expiredCount} expired, ${invalidCount} invalid`);

    sendSuccess(res, {
      validations: validationResults,
      summary: {
        valid: validCount,
        expired: expiredCount,
        invalid: invalidCount,
        total: Object.keys(validationResults).length
      }
    });
  } catch (error) {
    console.error('[MCP Controller] Error validating integrations:', error);
    sendError(res, 'Failed to validate integrations');
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

  const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'zoom', 'google_workspace'];

  if (!toolType || !validTools.includes(toolType)) {
    sendError(res, 'Invalid or unavailable tool type', 400);
    return;
  }

  try {
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
    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint', 'zoom', 'google_workspace'];
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

  const success = await oauthService.disconnectIntegration(userId, toolType as MCPToolType);

  if (!success) {
    sendError(res, 'Integration not found or already disconnected', 404);
    return;
  }

  sendSuccess(res, {
    message: `Successfully disconnected ${toolType}`,
    privacyNotice: 'Token revoked at provider and integration deactivated.'
  });
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

    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint', 'zoom', 'google_workspace'];
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

    const validTools = ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint', 'zoom', 'google_workspace'];
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
    const { ZoomTool } = await import('../services/mcp/tools/zoom.tool');
    const { GoogleWorkspaceTool } = await import('../services/mcp/tools/google-workspace.tool');
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

          case 'zoom':
            tool = new ZoomTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          case 'google_workspace':
            tool = new GoogleWorkspaceTool();
            result = await tool.fetchActivity(userId, parsedDateRange);
            break;

          default:
            console.log(`[MCP Multi-Source] Unknown tool type: ${toolType}`);
            return null;
        }

        if (result && result.success && result.data) {
          // Log success with data summary
          const dataKeys = Object.keys(result.data);
          const activityCounts = dataKeys.map(key => {
            const value = result.data[key];
            return `${key}:${Array.isArray(value) ? value.length : '?'}`;
          }).join(', ');
          console.log(`[MCP Multi-Source] ✓ ${toolType} returned data: {${activityCounts}}`);

          // Update lastSyncAt timestamp for this tool
          try {
            await prisma.mCPIntegration.update({
              where: { userId_toolType: { userId, toolType } },
              data: { lastSyncAt: new Date() }
            });
            console.log(`[MCP Multi-Source] Updated lastSyncAt for ${toolType}`);
          } catch (e) {
            console.error(`[MCP Multi-Source] Failed to update lastSyncAt for ${toolType}:`, e);
          }

          return { toolType, success: true, data: result.data };
        }

        // Tool failed or returned no data - include error message
        const errorMessage = result?.error || 'Failed to fetch data';
        console.log(`[MCP Multi-Source] ✗ ${toolType} failed: ${errorMessage}`);
        return { toolType, success: false, error: errorMessage };
      } catch (error: any) {
        console.error(`[MCP Multi-Source] Error fetching from ${toolType}:`, error);
        return { toolType, success: false, error: error.message || 'Unexpected error occurred' };
      }
    });

    const results = await Promise.all(fetchPromises);

    // Separate successful and failed tools
    const sourcesMap = new Map<string, any>();
    const errors: Record<string, string> = {};

    results.forEach(result => {
      if (!result) return;

      if (result.success && result.data) {
        sourcesMap.set(result.toolType, result.data);
      } else if (result.error) {
        errors[result.toolType] = result.error;
      }
    });

    // Log summary of results
    const successfulTools = Array.from(sourcesMap.keys());
    const failedTools = Object.keys(errors);
    console.log(`[MCP Multi-Source] Summary: ${successfulTools.length}/${toolTypes.length} tools succeeded`);
    console.log(`[MCP Multi-Source] Successful: [${successfulTools.join(', ')}]`);
    if (failedTools.length > 0) {
      console.log(`[MCP Multi-Source] Failed: [${failedTools.map(t => `${t}: ${errors[t]}`).join(', ')}]`);
    }

    if (sourcesMap.size === 0) {
      // All tools failed - return specific error messages
      const errorDetails = Object.entries(errors).map(([tool, error]) => `${tool}: ${error}`).join('; ');
      sendError(res, `Failed to fetch data from any connected tools. ${errorDetails}`, 400);
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
      rawData: Object.fromEntries(sourcesMap),
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      privacyNotice: 'All fetched data is stored in memory only and will automatically expire after 30 minutes. No external data is persisted to our database.',
      message: `Successfully organized activity from ${sourcesMap.size} tool(s) with AI${Object.keys(errors).length > 0 ? ` (${Object.keys(errors).length} tool(s) failed)` : ''}`
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
    console.log(`[MCP Agents] Incoming data type:`, typeof data);
    console.log(`[MCP Agents] Data has activities?`, !!data?.activities);
    console.log(`[MCP Agents] Data keys:`, data ? Object.keys(data).slice(0, 10) : 'no data');

    // Normalize data: Convert plain object to Map only for analyze stage (raw activities)
    // For correlate/generate stages, pass AnalysisResult object as-is
    let processData = data || sessionData?.tempData;
    if (stage === 'analyze' && processData && !(processData instanceof Map) && typeof processData === 'object') {
      // Only convert to Map for analyze stage (raw tool data)
      console.log('[MCP Agents] Converting plain object to Map for analyze stage');
      processData = new Map(Object.entries(processData));
    }

    // Process the stage
    const result = await organizer.processStage(stage as any, processData, options);

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

    console.log(`[MCP Agents] ========================================`);
    console.log(`[MCP Agents] NEW REQUEST - Fetch and Process with Agents`);
    console.log(`[MCP Agents] User ID: ${userId}`);
    console.log(`[MCP Agents] Requested toolTypes:`, toolTypes);
    console.log(`[MCP Agents] Date range:`, dateRange);
    console.log(`[MCP Agents] Quality:`, quality);
    console.log(`[MCP Agents] Generate content:`, generateContent);
    console.log(`[MCP Agents] ========================================`);
    // Comprehensive logging enabled for debugging tool selection issues

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
        case 'zoom':
          // Zoom returns object: {meetings[], upcomingMeetings[], recordings[]}
          return (data.meetings?.length || 0) + (data.upcomingMeetings?.length || 0) + (data.recordings?.length || 0);
        case 'google_workspace':
          // Google Workspace returns object: {driveFiles[], docs[], sheets[], slides[], meetRecordings[]}
          return (data.driveFiles?.length || 0) + (data.docs?.length || 0) + (data.sheets?.length || 0) + (data.slides?.length || 0) + (data.meetRecordings?.length || 0);
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
        case 'zoom':
          return `${data.meetings?.length || 0} meetings, ${data.upcomingMeetings?.length || 0} upcoming, ${data.recordings?.length || 0} recordings`;
        case 'google_workspace':
          return `${data.driveFiles?.length || 0} Drive files, ${data.docs?.length || 0} Docs, ${data.sheets?.length || 0} Sheets, ${data.slides?.length || 0} Slides, ${data.meetRecordings?.length || 0} Meet recordings`;
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
      sharepoint: () => import('../services/mcp/tools/sharepoint.tool').then(m => new m.SharePointTool()),
      zoom: () => import('../services/mcp/tools/zoom.tool').then(m => new m.ZoomTool()),
      google_workspace: () => import('../services/mcp/tools/google-workspace.tool').then(m => new m.GoogleWorkspaceTool())
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

          // Update lastSyncAt timestamp for this tool
          try {
            await prisma.mCPIntegration.update({
              where: { userId_toolType: { userId, toolType } },
              data: { lastSyncAt: new Date() }
            });
            console.log(`[MCP Agents] Updated lastSyncAt for ${toolType}`);
          } catch (e) {
            console.error(`[MCP Agents] Failed to update lastSyncAt for ${toolType}:`, e);
          }

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

    // Debug: Log actual contents of sourcesMap
    console.log(`[MCP Agents] sourcesMap contents summary:`);
    for (const [toolType, data] of sourcesMap.entries()) {
      const dataPreview = JSON.stringify(data).substring(0, 200);
      console.log(`  - ${toolType}: ${dataPreview}...`);
    }

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

    // Log response details before sending
    console.log(`[MCP Agents] ========================================`);
    console.log(`[MCP Agents] SENDING RESPONSE TO FRONTEND`);
    console.log(`[MCP Agents] Session ID: ${sessionId}`);
    console.log(`[MCP Agents] Sources returned:`, Array.from(sourcesMap.keys()));
    console.log(`[MCP Agents] Organized categories:`, Object.keys(agentResults.organized || {}));
    if (agentResults.organized) {
      Object.entries(agentResults.organized).forEach(([category, data]: [string, any]) => {
        console.log(`[MCP Agents]   - ${category}: ${data.items?.length || 0} items`);
      });
    }
    console.log(`[MCP Agents] ========================================`);

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
 * Generate Format7 journal entry from tools data
 * Complete end-to-end: fetch, process with AI, transform to Format7
 */
export const generateFormat7Entry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const {
    toolTypes,
    dateRange,
    consentGiven,
    quality = 'balanced',
    privacy = 'team',
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

    console.log(`[Format7] ========================================`);
    console.log(`[Format7] Generating Format7 entry for user ${userId}`);
    console.log(`[Format7] Tools:`, toolTypes);
    console.log(`[Format7] Date range:`, dateRange);
    console.log(`[Format7] Privacy:`, privacy);
    console.log(`[Format7] Workspace:`, workspaceName);
    console.log(`[Format7] ========================================`);

    // Helper function to calculate item count for different tool data structures
    const getItemCount = (toolType: string, data: any): number => {
      if (!data) return 0;

      switch (toolType) {
        case 'confluence':
          return (data.pages?.length || 0) + (data.blogPosts?.length || 0) + (data.comments?.length || 0);
        case 'github':
          return (data.commits?.length || 0) + (data.pullRequests?.length || 0) + (data.issues?.length || 0);
        case 'jira':
          return (data.issues?.length || 0) + (data.sprints?.length || 0);
        case 'figma':
          return (data.files?.length || 0) + (data.comments?.length || 0);
        case 'outlook':
          return (data.meetings?.length || 0) + (data.emails?.length || 0);
        case 'slack':
          return (data.messages?.length || 0) + (data.threads?.length || 0);
        case 'teams':
          return (data.meetings?.length || 0) + (data.messages?.length || 0);
        case 'onedrive':
          return (data.recentFiles || 0) + (data.sharedFiles || 0);
        case 'onenote':
          return (data.pagesCreated || 0) + (data.pagesUpdated || 0);
        case 'sharepoint':
          return (data.filesModified || 0) + (data.listsUpdated || 0);
        case 'zoom':
          return (data.meetings?.length || 0) + (data.upcomingMeetings?.length || 0) + (data.recordings?.length || 0);
        case 'google_workspace':
          return (data.driveFiles?.length || 0) + (data.docs?.length || 0) + (data.sheets?.length || 0) + (data.slides?.length || 0) + (data.meetRecordings?.length || 0);
        default:
          return Array.isArray(data) ? data.length : 0;
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
      sharepoint: () => import('../services/mcp/tools/sharepoint.tool').then(m => new m.SharePointTool()),
      zoom: () => import('../services/mcp/tools/zoom.tool').then(m => new m.ZoomTool()),
      google_workspace: () => import('../services/mcp/tools/google-workspace.tool').then(m => new m.GoogleWorkspaceTool())
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
        console.log(`[Format7] Fetching from ${toolType}...`);
        const toolImport = toolImports[toolType as keyof typeof toolImports];
        if (!toolImport) {
          console.log(`[Format7] No tool import found for ${toolType}`);
          return null;
        }

        const tool = await toolImport();
        const result = await tool.fetchActivity(userId, parsedDateRange);

        const itemCount = result?.data ? getItemCount(toolType, result.data) : 0;

        if (result && result.success && result.data) {
          console.log(`[Format7] ✅ Successfully fetched from ${toolType}: ${itemCount} items`);

          // Update lastSyncAt timestamp for this tool
          try {
            await prisma.mCPIntegration.update({
              where: { userId_toolType: { userId, toolType } },
              data: { lastSyncAt: new Date() }
            });
            console.log(`[Format7] Updated lastSyncAt for ${toolType}`);
          } catch (e) {
            console.error(`[Format7] Failed to update lastSyncAt for ${toolType}:`, e);
          }

          return { toolType, data: result.data, currentUser: result.currentUser };
        }
        console.log(`[Format7] ❌ No valid data from ${toolType}`);
        return null;
      } catch (error: any) {
        console.error(`[Format7] Error fetching from ${toolType}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    // Filter out failed fetches and create source map
    // Also collect currentUser identifiers from all tools
    const sourcesMap = new Map<string, any>();
    const toolCurrentUsers: any[] = [];
    results.forEach(result => {
      if (result && result.data) {
        sourcesMap.set(result.toolType, result.data);
        if (result.currentUser) {
          toolCurrentUsers.push(result.currentUser);
        }
      }
    });

    console.log(`[Format7] Successfully fetched from ${sourcesMap.size} tools: [${Array.from(sourcesMap.keys()).join(', ')}]`);
    console.log(`[Format7] Collected currentUser from ${toolCurrentUsers.length} tools`);

    if (sourcesMap.size === 0) {
      console.error(`[Format7] No data fetched from any tool`);
      sendError(res, 'Failed to fetch data from any connected tools. Please ensure at least one tool is properly connected.', 400);
      return;
    }

    // Use AI agents to organize and generate content
    console.log(`[Format7] Processing with AI agents (quality: ${quality})...`);
    const { MCPMultiSourceOrganizer } = await import('../services/mcp/mcp-multi-source-organizer.service');

    const organizer = new MCPMultiSourceOrganizer();
    const agentResults = await organizer.organizeWithAgents(
      sourcesMap as Map<any, any>,
      {
        quality,
        generateContent: true,
        workspaceName: workspaceName || 'Professional Work'
      }
    );

    console.log(`[Format7] AI agent processing complete. Categories:`, Object.keys(agentResults.organized || {}));

    // Transform to Format7 structure
    console.log(`[Format7] Transforming to Format7 structure...`);
    const { format7Transformer } = await import('../services/mcp/format7-transformer.service');

    // Collect current user identifiers to filter from collaborators
    // Include name, email username, and any names found from tool data
    const currentUserIdentifiers: string[] = [];
    if (req.user?.name) currentUserIdentifiers.push(req.user.name);
    if (req.user?.email) {
      currentUserIdentifiers.push(req.user.email);
      // Also add email username (before @)
      const emailUsername = req.user.email.split('@')[0];
      if (emailUsername) currentUserIdentifiers.push(emailUsername);
    }

    // Collect identifiers from all connected tools' currentUser responses
    toolCurrentUsers.forEach(cu => {
      if (cu.login) currentUserIdentifiers.push(cu.login);           // GitHub username
      if (cu.displayName) currentUserIdentifiers.push(cu.displayName); // Display name
      if (cu.email) currentUserIdentifiers.push(cu.email);           // Email
      if (cu.accountId) currentUserIdentifiers.push(cu.accountId);   // Jira/Confluence account ID
      if (cu.id) currentUserIdentifiers.push(String(cu.id));         // User ID
      if (cu.userPrincipalName) currentUserIdentifiers.push(cu.userPrincipalName); // Microsoft UPN
      if (cu.mail) currentUserIdentifiers.push(cu.mail);             // Microsoft mail
    });

    // Dedupe and normalize (lowercase)
    const uniqueIdentifiers = [...new Set(
      currentUserIdentifiers
        .filter(Boolean)
        .map(id => id.toLowerCase().trim())
    )];

    console.log(`[Format7] Current user identifiers for filtering: [${uniqueIdentifiers.slice(0, 5).join(', ')}${uniqueIdentifiers.length > 5 ? '...' : ''}]`);

    const format7Entry = format7Transformer.transformToFormat7(
      agentResults.organized as any,
      sourcesMap as Map<MCPToolType, any>,
      {
        userId,
        workspaceName: workspaceName || 'Professional Work',
        privacy: privacy as 'private' | 'team' | 'network' | 'public',
        dateRange: parsedDateRange || {
          start: new Date(),
          end: new Date()
        },
        currentUserIdentifiers: uniqueIdentifiers
      }
    );

    console.log(`[Format7] ========================================`);
    console.log(`[Format7] TRANSFORMATION COMPLETE`);
    console.log(`[Format7] Title: ${format7Entry.entry_metadata.title}`);
    console.log(`[Format7] Type: ${format7Entry.entry_metadata.type}`);
    console.log(`[Format7] Activities: ${format7Entry.activities.length}`);
    console.log(`[Format7] Collaborators: ${format7Entry.summary.unique_collaborators.length}`);
    console.log(`[Format7] Technologies: ${format7Entry.summary.technologies_used.length}`);
    console.log(`[Format7] ========================================`);

    sendSuccess(res, format7Entry, `Successfully generated Format7 entry from ${sourcesMap.size} tool(s)`);
  } catch (error: any) {
    console.error('[Format7] Error:', error);
    sendError(res, error.message || 'Failed to generate Format7 entry');
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

/**
 * Transform MCP data to Format7 journal entry
 */
export const transformFormat7 = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  try {
    const {
      activities,
      organizedData,
      correlations,
      generatedContent,
      selectedActivityIds,
      options
    } = req.body;

    console.log('[MCP Controller] Transforming to Format7 entry...');
    console.log('[MCP Controller] Request body keys:', Object.keys(req.body));
    console.log('[MCP Controller] Selected activities:', selectedActivityIds?.length || 0);
    console.log('[MCP Controller] Correlations:', correlations?.length || 0);
    console.log('[MCP Controller] Categories:', organizedData?.categories?.length || 0);
    console.log('[MCP Controller] Activities type:', activities ? (activities instanceof Map ? 'Map' : typeof activities) : 'null/undefined');
    console.log('[MCP Controller] Activities keys:', activities ? Object.keys(activities).join(', ') : 'none');

    // Build organized activity structure expected by transformToFormat7
    const organizedActivity = {
      suggestedEntryType: organizedData?.suggestedEntryType || 'achievement',
      suggestedTitle: generatedContent?.workspaceEntry?.title || organizedData?.suggestedTitle || 'Activity Summary',
      contextSummary: generatedContent?.workspaceEntry?.description || organizedData?.contextSummary || '',
      extractedSkills: organizedData?.extractedSkills || [],
      categories: organizedData?.categories || [],
      // Extract correlations array if wrapped in CorrelationResult object
      correlations: Array.isArray(correlations)
        ? correlations
        : (correlations?.correlations || []),
      artifacts: organizedData?.artifacts || []
    };

    // SAFETY NET: Ensure all category items have skills property
    // Copy from global extractedSkills if individual items are missing them
    if (organizedActivity.categories && organizedActivity.categories.length > 0) {
      console.log('[MCP Controller] Applying skills safety net to category items...');
      let itemsFixed = 0;

      organizedActivity.categories.forEach((category: { items?: Array<{ id: string; skills?: string[] }> }) => {
        if (category.items && Array.isArray(category.items)) {
          category.items.forEach((item: { id: string; skills?: string[] }) => {
            // Check if item is missing skills
            if (!item.skills || !Array.isArray(item.skills) || item.skills.length === 0) {
              // Copy from global extractedSkills as fallback
              item.skills = organizedActivity.extractedSkills || [];
              itemsFixed++;
              console.log(`[MCP Controller] Item ${item.id} missing skills, applied ${(item.skills || []).length} global skills`);
            }
          });
        }
      });

      console.log(`[MCP Controller] Skills safety net: Fixed ${itemsFixed} items`);
    }

    // Convert activities to Map if it's an object
    let rawToolData: Map<string, any>;
    if (!activities) {
      rawToolData = new Map();
    } else if (activities instanceof Map) {
      rawToolData = activities;
    } else {
      rawToolData = new Map(Object.entries(activities));
    }

    // Transform to Format7 using the backend service
    console.log('[MCP Controller] Calling transformToFormat7...');
    console.log('[MCP Controller] organizedActivity:', {
      suggestedEntryType: organizedActivity.suggestedEntryType,
      suggestedTitle: organizedActivity.suggestedTitle,
      categoriesCount: organizedActivity.categories?.length || 0,
      correlationsCount: organizedActivity.correlations?.length || 0
    });
    console.log('[MCP Controller] rawToolData size:', rawToolData.size);
    console.log('[MCP Controller] options.dateRange:', options?.dateRange);

    // Ensure dateRange has proper Date objects
    let dateRange: { start: Date; end: Date };
    if (options?.dateRange?.start && options?.dateRange?.end) {
      // Convert string dates to Date objects if needed
      dateRange = {
        start: typeof options.dateRange.start === 'string'
          ? new Date(options.dateRange.start)
          : options.dateRange.start,
        end: typeof options.dateRange.end === 'string'
          ? new Date(options.dateRange.end)
          : options.dateRange.end
      };
    } else {
      // Fallback to current date
      const now = new Date();
      dateRange = { start: now, end: now };
    }

    console.log('[MCP Controller] Using dateRange:', {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    });

    // Collect current user identifiers to filter from collaborators
    const currentUserIdentifiers: string[] = [];
    if (req.user?.name) currentUserIdentifiers.push(req.user.name);
    if (req.user?.email) {
      currentUserIdentifiers.push(req.user.email);
      const emailUsername = req.user.email.split('@')[0];
      if (emailUsername) currentUserIdentifiers.push(emailUsername);
    }

    const format7Entry = format7Transformer.transformToFormat7(
      organizedActivity as any,
      rawToolData as Map<MCPToolType, any>,
      {
        userId,
        workspaceName: options?.workspaceName || 'Professional Work',
        privacy: options?.privacy || 'team',
        dateRange,
        currentUserIdentifiers
      }
    );

    console.log('[MCP Controller] transformToFormat7 completed successfully');

    console.log('[MCP Controller] Format7 transformation complete');
    console.log('[MCP Controller] Collaborators:', format7Entry.summary?.unique_collaborators?.length || 0);
    console.log('[MCP Controller] Reviewers:', format7Entry.summary?.unique_reviewers?.length || 0);

    sendSuccess(res, format7Entry);
  } catch (error: any) {
    console.error('[MCP Controller] Format7 transform error:', error);
    console.error('[MCP Controller] Error stack:', error.stack);
    console.error('[MCP Controller] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    sendError(res, `Failed to transform to Format7: ${error.message}`, 500, {
      error: error.message,
      type: error.name
    });
  }
});

/**
 * Sanitize content for network view
 * Creates an IPR-stripped version of workspace content suitable for public profile
 * POST /api/v1/mcp/sanitize-for-network
 */
export const sanitizeForNetwork = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { title, description, fullContent, format7Data } = req.body;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  try {
    // Validate required fields
    if (!title || !fullContent) {
      sendError(res, 'Title and fullContent are required', 400);
      return;
    }

    console.log('[MCP Controller] Sanitizing content for network view...');
    console.log('[MCP Controller] Title:', title);
    console.log('[MCP Controller] Has Format7 data:', !!format7Data);
    console.log('[MCP Controller] format7Data type:', typeof format7Data);
    if (format7Data) {
      console.log('[MCP Controller] format7Data keys:', Object.keys(format7Data).slice(0, 10));
    }

    // Get sanitizer service
    const sanitizer = getContentSanitizerService();

    // Sanitize content
    const result = await sanitizer.sanitizeForNetwork({
      title,
      description: description || '',
      fullContent,
      format7Data
    });

    console.log('[MCP Controller] Sanitization complete');
    console.log('[MCP Controller] Items stripped:', result.sanitizationLog.itemsStripped);

    sendSuccess(res, {
      networkTitle: result.networkTitle,
      networkContent: result.networkContent,
      format7DataNetwork: result.format7DataNetwork,
      sanitizationLog: result.sanitizationLog,
      message: 'Content sanitized for network view'
    });
  } catch (error: any) {
    console.error('[MCP Controller] Sanitization error:', error);
    sendError(res, `Failed to sanitize content: ${error.message}`, 500);
  }
});

/**
 * Sync data from MCP tools and persist to ToolActivity table
 * This is the production (live mode) equivalent of /demo/sync
 *
 * Flow (mirrors demo sync exactly):
 * 1. Fetch real data from connected tools (GitHub, OneDrive, etc.)
 * 2. Transform tool-specific responses to ActivityInput format
 * 3. Persist to ToolActivity table (production, not demo)
 * 4. Cluster activities in-memory
 * 5. Create JournalEntry records (temporal + cluster-based)
 * 6. Generate narratives via LLM
 * 7. Return activity counts and entry previews for UI display
 */
export const syncAndPersist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { toolTypes, dateRange, consentGiven } = req.body;

  if (!userId) {
    sendError(res, 'Unauthorized: User not authenticated', 401);
    return;
  }

  try {
    // Validate consent
    if (!consentGiven) {
      sendError(res, 'User consent is required to sync data', 400);
      return;
    }

    // Default to GitHub and OneDrive if no tools specified
    const tools = toolTypes?.length > 0 ? toolTypes : ['github', 'onedrive'];
    const validTools = ['github', 'onedrive']; // Only these two have transformers for now
    const selectedTools = tools.filter((t: string) => validTools.includes(t));

    if (selectedTools.length === 0) {
      sendError(res, `No supported tools specified. Currently supported: ${validTools.join(', ')}`, 400);
      return;
    }

    console.log(`[MCP Sync] Starting live sync for user ${userId}, tools: [${selectedTools.join(', ')}]`);

    // Import required services
    const { GitHubTool } = await import('../services/mcp/tools/github.tool');
    const { OneDriveTool } = await import('../services/mcp/tools/onedrive.tool');
    const { transformToolActivity } = await import('../services/mcp/transformers');
    const { runProductionSync } = await import('../services/career-stories/production-sync.service');
    // ActivityInput is a type, import separately
    type ActivityInputType = import('../services/career-stories/activity-persistence.service').ActivityInput;

    // Parse date range (default: last 30 days)
    let parsedDateRange: { start: Date; end: Date };
    if (dateRange?.start && dateRange?.end) {
      parsedDateRange = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      };
    } else {
      const now = new Date();
      parsedDateRange = {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now
      };
    }

    console.log(`[MCP Sync] Date range: ${parsedDateRange.start.toISOString()} to ${parsedDateRange.end.toISOString()}`);

    // Fetch and transform activities from each tool
    const allActivities: ActivityInputType[] = [];
    const fetchErrors: Record<string, string> = {};

    for (const toolType of selectedTools) {
      try {
        let result: any;

        if (toolType === 'github') {
          const tool = new GitHubTool();
          result = await tool.fetchActivity(userId, parsedDateRange);
        } else if (toolType === 'onedrive') {
          const tool = new OneDriveTool();
          result = await tool.fetchActivity(userId, parsedDateRange);
        }

        if (result?.success && result?.data) {
          // Transform to ActivityInput format
          const activities = transformToolActivity(toolType, result.data);
          allActivities.push(...activities);
          console.log(`[MCP Sync] ✓ ${toolType}: Fetched ${activities.length} activities`);

          // Update lastSyncAt timestamp
          await prisma.mCPIntegration.update({
            where: { userId_toolType: { userId, toolType } },
            data: { lastSyncAt: new Date() }
          }).catch(e => console.error(`[MCP Sync] Failed to update lastSyncAt for ${toolType}:`, e));

        } else {
          const errorMsg = result?.error || 'Failed to fetch data';
          console.log(`[MCP Sync] ✗ ${toolType}: ${errorMsg}`);
          fetchErrors[toolType] = errorMsg;
        }
      } catch (error: any) {
        console.error(`[MCP Sync] Error with ${toolType}:`, error);
        fetchErrors[toolType] = error.message || 'Unexpected error';
      }
    }

    if (allActivities.length === 0) {
      const errorDetails = Object.entries(fetchErrors)
        .map(([tool, error]) => `${tool}: ${error}`)
        .join('; ');
      sendError(res, `No activities fetched from any tools. ${errorDetails}`, 400);
      return;
    }

    console.log(`[MCP Sync] Total activities fetched: ${allActivities.length}`);

    // Run production sync (narratives generate in background for fast sync response)
    // This will: persist → cluster → create journal entries → start background narrative generation
    const result = await runProductionSync(userId, allActivities as any, { clearExisting: false, backgroundNarratives: true });

    console.log(`[MCP Sync] Complete: ${result.activitiesSeeded} activities, ${result.entriesCreated} entries`);

    sendSuccess(res, {
      activityCount: result.activitiesSeeded,
      activitiesBySource: result.activitiesBySource,
      entryCount: result.entriesCreated,
      temporalEntryCount: result.temporalEntriesCreated,
      clusterEntryCount: result.clusterEntriesCreated,
      entryPreviews: result.entryPreviews,
      errors: Object.keys(fetchErrors).length > 0 ? fetchErrors : undefined,
      message: `Synced ${result.activitiesSeeded} activities, created ${result.entriesCreated} journal entries`
    });
  } catch (error: any) {
    console.error('[MCP Sync] Error:', error);
    sendError(res, error.message || 'Failed to sync and persist data');
  }
});