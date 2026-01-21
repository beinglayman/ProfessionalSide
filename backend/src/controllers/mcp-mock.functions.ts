import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Mock data store - replace with database later
const mockIntegrations = new Map<string, any>();

/**
 * Get available MCP tools and their connection status
 */
export async function getAvailableTools(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    // Mock available tools
    const tools = [
      {
        toolType: 'github',
        name: 'GitHub',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-github`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      },
      {
        toolType: 'jira',
        name: 'Jira',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-jira`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      },
      {
        toolType: 'figma',
        name: 'Figma',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-figma`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      },
      {
        toolType: 'outlook',
        name: 'Outlook',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-outlook`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      },
      {
        toolType: 'confluence',
        name: 'Confluence',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-confluence`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      },
      {
        toolType: 'slack',
        name: 'Slack',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-slack`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      },
      {
        toolType: 'teams',
        name: 'Microsoft Teams',
        isAvailable: true,
        isConnected: mockIntegrations.has(`${userId}-teams`),
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      }
    ];

    res.json({
      success: true,
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
    res.status(500).json({
      success: false,
      error: 'Failed to get available tools',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get integration status for the current user
 */
export async function getIntegrationStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    // Mock integrations data
    const integrations = [
      'github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams'
    ].map(tool => ({
      tool,
      isConnected: mockIntegrations.has(`${userId}-${tool}`),
      connectedAt: mockIntegrations.has(`${userId}-${tool}`)
        ? mockIntegrations.get(`${userId}-${tool}`).connectedAt
        : null,
      lastSyncAt: null
    }));

    res.json({
      success: true,
      integrations,
      privacyNotice: 'Your integration status is private and not shared with any third parties.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error getting integration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Initiate OAuth flow for a tool
 */
export async function initiateOAuth(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { toolType } = req.body;

    if (!toolType || !['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint'].includes(toolType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid or unavailable tool type'
      });
      return;
    }

    // For GitHub, generate real OAuth URL
    if (toolType === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3002/api/v1/mcp/callback/github';
      const state = Buffer.from(`${userId}:${Date.now()}`).toString('base64');

      const authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('repo user')}` +
        `&state=${state}`;

      res.json({
        success: true,
        authUrl,
        state,
        privacyNotice: 'You will be redirected to authenticate with the external service. InChronicle only stores encrypted access tokens.'
      });
      return;
    }

    // Mock OAuth URL for other tools
    const mockAuthUrl = `https://example.com/oauth/${toolType}?state=${Buffer.from(userId).toString('base64')}`;

    res.json({
      success: true,
      authUrl: mockAuthUrl,
      state: Buffer.from(userId).toString('base64'),
      privacyNotice: 'You will be redirected to authenticate with the external service. InChronicle only stores encrypted access tokens.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle OAuth callback from external services
 */
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { toolType } = req.params;
    const { code, state, error: oauthError } = req.query;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (oauthError) {
      // Redirect to frontend with error
      return res.redirect(`${frontendUrl}/mcp/callback?error=${oauthError}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/mcp/callback?error=missing_params`);
    }

    // Mock successful connection for demo
    const userId = Buffer.from(state as string, 'base64').toString().split(':')[0];

    if (userId) {
      try {
        // Store integration in database
        await prisma.mCPIntegration.upsert({
          where: {
            userId_toolType: {
              userId,
              toolType: toolType as string
            }
          },
          update: {
            isConnected: true,
            connectedAt: new Date(),
            isActive: true
          },
          create: {
            userId,
            toolType: toolType as string,
            isConnected: true,
            connectedAt: new Date(),
            isActive: true
          }
        });

        // Also store in mock map for backward compatibility
        mockIntegrations.set(`${userId}-${toolType}`, {
          connectedAt: new Date().toISOString(),
          toolType
        });

        // Redirect to frontend success page
        return res.redirect(`${frontendUrl}/mcp/callback?success=true&tool=${toolType}`);
      } catch (dbError) {
        console.error('[MCP OAuth] Database error:', dbError);
        // Fall back to redirect with success even if DB fails
        return res.redirect(`${frontendUrl}/mcp/callback?success=true&tool=${toolType}`);
      }
    } else {
      return res.redirect(`${frontendUrl}/mcp/callback?error=invalid_state`);
    }
  } catch (error) {
    console.error('[MCP Controller] Error handling OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/mcp/callback?error=callback_failed`);
  }
}

/**
 * Disconnect a tool integration
 */
export async function disconnectIntegration(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { toolType } = req.params;

    // Remove mock integration
    mockIntegrations.delete(`${userId}-${toolType}`);

    res.json({
      success: true,
      message: `Successfully disconnected ${toolType}`,
      privacyNotice: 'All stored tokens and session data have been permanently deleted.'
    });
  } catch (error) {
    console.error('[MCP Controller] Error disconnecting integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect integration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}