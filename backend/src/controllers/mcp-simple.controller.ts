import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PrismaClient } from '@prisma/client';
import {
  MCPToolType,
  MCPOAuthInitiateSchema,
  MCPOAuthCallbackSchema,
  MCPFetchDataSchema,
  MCPAction,
  isMCPToolType
} from '../types/mcp.types';
import { MCPOAuthService } from '../services/mcp/mcp-oauth.service';
import { MCPSessionService } from '../services/mcp/mcp-session.service';
import { MCPPrivacyService } from '../services/mcp/mcp-privacy.service';

/**
 * Simplified MCP Controller - Testing without tool instantiations
 */
export class MCPSimpleController {
  private prisma: PrismaClient;
  private oauthService: MCPOAuthService;
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;

  constructor() {
    this.prisma = prisma;
    this.oauthService = new MCPOAuthService();
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();
  }

  /**
   * Get available MCP tools and their connection status
   */
  public getAvailableTools = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      // Get all available tools
      const availableTools = this.oauthService.getAvailableTools();

      // Get user's integration status
      const integrationStatus = await this.privacyService.getUserIntegrationStatus(userId);

      // Build response with privacy notice
      const tools = availableTools.map(toolType => ({
        toolType,
        isAvailable: true,
        isConnected: integrationStatus.get(toolType) || false,
        privacyNotice: 'InChronicle does not store any data from this tool. Data is fetched on-demand only.'
      }));

      res.json({
        success: true,
        tools,
        privacyStatus: this.privacyService.getPrivacyStatus(),
        message: 'Your data remains private. We only fetch information when you explicitly request it.'
      });
    } catch (error) {
      console.error('[MCP Controller] Error getting available tools:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available tools'
      });
    }
  };

  /**
   * Initiate OAuth flow for a tool
   */
  public initiateOAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { toolType } = MCPOAuthInitiateSchema.parse(req.body);

      // Check if tool is available
      if (!this.oauthService.isToolAvailable(toolType)) {
        res.status(400).json({
          success: false,
          error: `${toolType} integration is not configured`
        });
        return;
      }

      // Generate authorization URL
      const authData = this.oauthService.getAuthorizationUrl(userId, toolType);
      if (!authData) {
        res.status(500).json({
          success: false,
          error: 'Failed to generate authorization URL'
        });
        return;
      }

      // Log OAuth initiation
      await this.privacyService.logIntegrationAction(
        userId,
        toolType,
        MCPAction.CONNECT,
        false
      );

      res.json({
        success: true,
        authUrl: authData.url,
        state: authData.state,
        privacyNotice: 'You will be redirected to authorize access. InChronicle will only access data when you explicitly request it.'
      });
    } catch (error) {
      console.error('[MCP Controller] Error initiating OAuth:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate OAuth flow'
      });
    }
  };

  /**
   * Handle OAuth callback
   */
  public handleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { toolType } = req.params;
      const { code, state } = req.query;

      if (!code || !state || !isMCPToolType(toolType)) {
        res.redirect(`${process.env.FRONTEND_URL}/settings?error=invalid_callback`);
        return;
      }

      const result = await this.oauthService.handleCallback(
        code as string,
        state as string
      );

      if (result.success) {
        res.redirect(`${process.env.FRONTEND_URL}/settings?mcp_connected=${toolType}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/settings?error=connection_failed`);
      }
    } catch (error) {
      console.error('[MCP Controller] Error handling OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/settings?error=callback_error`);
    }
  };

  /**
   * Get integration status for the current user
   */
  public getIntegrationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      const integrations = await this.prisma.mCPIntegration.findMany({
        where: { userId },
        select: {
          toolType: true,
          isActive: true,
          lastUsedAt: true,
          scope: true,
          createdAt: true
        }
      });

      const formattedIntegrations = integrations.map(integration => ({
        ...integration,
        privacyNote: 'No data from this integration is stored. OAuth tokens are encrypted at rest.'
      }));

      res.json({
        success: true,
        integrations: formattedIntegrations,
        privacyMessage: 'Your integrations are secure. Data is only fetched when you request it.'
      });
    } catch (error) {
      console.error('[MCP Controller] Error getting integration status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get integration status'
      });
    }
  };

  /**
   * Disconnect an integration
   */
  public disconnectIntegration = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { toolType } = req.params;

      if (!isMCPToolType(toolType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid tool type'
        });
        return;
      }

      // Delete the integration
      await this.prisma.mCPIntegration.deleteMany({
        where: {
          userId,
          toolType
        }
      });

      // Clear any active sessions for this tool
      this.sessionService.clearUserSessions(userId);

      // Log disconnection
      await this.privacyService.logIntegrationAction(
        userId,
        toolType as MCPToolType,
        MCPAction.DISCONNECT,
        true
      );

      res.json({
        success: true,
        message: `${toolType} integration disconnected successfully. All related data has been cleared.`
      });
    } catch (error) {
      console.error('[MCP Controller] Error disconnecting integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect integration'
      });
    }
  };
}