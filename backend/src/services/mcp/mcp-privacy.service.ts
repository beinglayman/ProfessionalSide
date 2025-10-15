import { PrismaClient } from '@prisma/client';
import { MCPAction, MCPToolType, MCPPrivacyStatus } from '../../types/mcp.types';
import { prisma } from '../../lib/prisma';

/**
 * MCP Privacy Service - Handles consent, audit logging, and privacy controls
 *
 * PRIVACY PRINCIPLES:
 * - Explicit consent required for every data fetch
 * - Comprehensive audit logging (actions only, no data)
 * - Transparent privacy status
 * - User control over all operations
 */
export class MCPPrivacyService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma; // Use singleton Prisma client
  }

  /**
   * Record user consent for a specific action
   * @param userId User ID
   * @param toolType Tool type
   * @param action Action type
   * @param consentGiven Whether consent was given
   * @param sessionId Optional session ID
   */
  public async recordConsent(
    userId: string,
    toolType: MCPToolType,
    action: MCPAction,
    consentGiven: boolean,
    sessionId?: string
  ): Promise<void> {
    try {
      // Get integration ID if exists
      const integration = await this.prisma.mCPIntegration.findUnique({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        }
      });

      // Create audit log entry
      await this.prisma.mCPAuditLog.create({
        data: {
          userId,
          integrationId: integration?.id,
          action,
          toolType,
          consentGiven,
          dataCleared: true, // Always true - we never store data
          sessionId,
          success: consentGiven,
          createdAt: new Date()
        }
      });

      console.log(`[MCP Privacy] Recorded consent: User ${userId}, Tool ${toolType}, Action ${action}, Consent ${consentGiven}`);
    } catch (error) {
      console.error('[MCP Privacy] Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Check if user has given recent consent for a tool
   * @param userId User ID
   * @param toolType Tool type
   * @param hoursValid How many hours consent is valid (default: 24)
   * @returns Whether valid consent exists
   */
  public async hasRecentConsent(
    userId: string,
    toolType: MCPToolType,
    hoursValid: number = 24
  ): Promise<boolean> {
    try {
      const cutoffTime = new Date(Date.now() - hoursValid * 60 * 60 * 1000);

      const recentConsent = await this.prisma.mCPAuditLog.findFirst({
        where: {
          userId,
          toolType,
          action: MCPAction.CONSENT_GIVEN,
          consentGiven: true,
          createdAt: {
            gte: cutoffTime
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return !!recentConsent;
    } catch (error) {
      console.error('[MCP Privacy] Error checking recent consent:', error);
      return false;
    }
  }

  /**
   * Log a fetch operation
   * @param userId User ID
   * @param toolType Tool type
   * @param itemCount Number of items fetched
   * @param sessionId Session ID
   * @param success Whether fetch was successful
   * @param errorMessage Optional error message
   */
  public async logFetchOperation(
    userId: string,
    toolType: MCPToolType,
    itemCount: number,
    sessionId: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Get integration
      const integration = await this.prisma.mCPIntegration.findUnique({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        }
      });

      // Log fetch request
      await this.prisma.mCPAuditLog.create({
        data: {
          userId,
          integrationId: integration?.id,
          action: MCPAction.FETCH_REQUESTED,
          toolType,
          consentGiven: true, // Assumed if fetch is happening
          dataCleared: true,
          sessionId,
          itemCount,
          success,
          errorMessage,
          createdAt: new Date()
        }
      });

      // If successful, also log completion
      if (success) {
        await this.prisma.mCPAuditLog.create({
          data: {
            userId,
            integrationId: integration?.id,
            action: MCPAction.FETCH_COMPLETED,
            toolType,
            consentGiven: true,
            dataCleared: true,
            sessionId,
            itemCount,
            success: true,
            createdAt: new Date()
          }
        });

        // Update last used timestamp
        if (integration) {
          await this.prisma.mCPIntegration.update({
            where: { id: integration.id },
            data: { lastUsedAt: new Date() }
          });
        }
      }

      console.log(`[MCP Privacy] Logged fetch: User ${userId}, Tool ${toolType}, Items ${itemCount}, Success ${success}`);
    } catch (error) {
      console.error('[MCP Privacy] Error logging fetch operation:', error);
    }
  }

  /**
   * Log data clearing
   * @param userId User ID
   * @param sessionId Session ID
   * @param toolType Optional tool type
   */
  public async logDataClearing(
    userId: string,
    sessionId: string,
    toolType?: MCPToolType
  ): Promise<void> {
    try {
      const logData: any = {
        userId,
        action: MCPAction.DATA_CLEARED,
        consentGiven: false,
        dataCleared: true,
        sessionId,
        success: true,
        createdAt: new Date()
      };

      if (toolType) {
        logData.toolType = toolType;

        // Get integration if tool type specified
        const integration = await this.prisma.mCPIntegration.findUnique({
          where: {
            userId_toolType: {
              userId,
              toolType
            }
          }
        });
        if (integration) {
          logData.integrationId = integration.id;
        }
      } else {
        // Use a default tool type for general clearing
        logData.toolType = MCPToolType.GITHUB; // Required field, using default
      }

      await this.prisma.mCPAuditLog.create({ data: logData });

      console.log(`[MCP Privacy] Logged data clearing: User ${userId}, Session ${sessionId}`);
    } catch (error) {
      console.error('[MCP Privacy] Error logging data clearing:', error);
    }
  }

  /**
   * Log integration connection/disconnection
   * @param userId User ID
   * @param toolType Tool type
   * @param action Connect or disconnect action
   * @param success Whether action was successful
   */
  public async logIntegrationAction(
    userId: string,
    toolType: MCPToolType,
    action: MCPAction.CONNECT | MCPAction.DISCONNECT,
    success: boolean = true
  ): Promise<void> {
    try {
      // Get or create integration record
      let integration = await this.prisma.mCPIntegration.findUnique({
        where: {
          userId_toolType: {
            userId,
            toolType
          }
        }
      });

      await this.prisma.mCPAuditLog.create({
        data: {
          userId,
          integrationId: integration?.id,
          action,
          toolType,
          consentGiven: action === MCPAction.CONNECT,
          dataCleared: true,
          success,
          createdAt: new Date()
        }
      });

      console.log(`[MCP Privacy] Logged integration action: User ${userId}, Tool ${toolType}, Action ${action}`);
    } catch (error) {
      console.error('[MCP Privacy] Error logging integration action:', error);
    }
  }

  /**
   * Get user's audit history
   * @param userId User ID
   * @param limit Number of records to return
   * @param toolType Optional filter by tool type
   * @returns Audit log entries
   */
  public async getUserAuditHistory(
    userId: string,
    limit: number = 50,
    toolType?: MCPToolType
  ): Promise<any[]> {
    try {
      const where: any = { userId };
      if (toolType) {
        where.toolType = toolType;
      }

      const logs = await this.prisma.mCPAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          toolType: true,
          consentGiven: true,
          itemCount: true,
          success: true,
          errorMessage: true,
          createdAt: true
        }
      });

      return logs;
    } catch (error) {
      console.error('[MCP Privacy] Error getting audit history:', error);
      return [];
    }
  }

  /**
   * Get privacy status for the MCP system
   * @returns Privacy status information
   */
  public getPrivacyStatus(): MCPPrivacyStatus {
    return {
      dataRetention: 'none', // We never store external data
      sessionDuration: 30, // Minutes
      consentRequired: true,
      encryptionEnabled: true,
      auditLoggingEnabled: true
    };
  }

  /**
   * Check if user has any active integrations
   * @param userId User ID
   * @returns Map of tool types to connection status
   */
  public async getUserIntegrationStatus(
    userId: string
  ): Promise<Map<MCPToolType, boolean>> {
    try {
      const integrations = await this.prisma.mCPIntegration.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          toolType: true
        }
      });

      const status = new Map<MCPToolType, boolean>();

      // Initialize all tools as disconnected
      Object.values(MCPToolType).forEach(tool => {
        status.set(tool, false);
      });

      // Mark connected tools
      integrations.forEach(integration => {
        status.set(integration.toolType as MCPToolType, true);
      });

      return status;
    } catch (error) {
      console.error('[MCP Privacy] Error getting integration status:', error);
      return new Map();
    }
  }

  /**
   * Delete all user's MCP data (for GDPR compliance)
   * @param userId User ID
   * @returns Success status
   */
  public async deleteUserMCPData(userId: string): Promise<boolean> {
    try {
      // Delete all audit logs
      await this.prisma.mCPAuditLog.deleteMany({
        where: { userId }
      });

      // Delete daily summary preferences
      await this.prisma.mCPDailySummaryPreference.deleteMany({
        where: { userId }
      });

      // Delete all integrations
      await this.prisma.mCPIntegration.deleteMany({
        where: { userId }
      });

      console.log(`[MCP Privacy] Deleted all MCP data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('[MCP Privacy] Error deleting user MCP data:', error);
      return false;
    }
  }

  /**
   * Get summary statistics for privacy monitoring
   * @returns Privacy statistics
   */
  public async getPrivacyStatistics(): Promise<{
    totalUsers: number;
    totalIntegrations: number;
    totalFetches: number;
    averageFetchesPerUser: number;
    mostUsedTool: MCPToolType | null;
  }> {
    try {
      // Count unique users with integrations
      const users = await this.prisma.mCPIntegration.findMany({
        select: { userId: true },
        distinct: ['userId']
      });

      // Count total integrations
      const totalIntegrations = await this.prisma.mCPIntegration.count();

      // Count total fetch operations
      const totalFetches = await this.prisma.mCPAuditLog.count({
        where: { action: MCPAction.FETCH_COMPLETED }
      });

      // Get most used tool
      const toolUsage = await this.prisma.mCPAuditLog.groupBy({
        by: ['toolType'],
        where: { action: MCPAction.FETCH_COMPLETED },
        _count: true,
        orderBy: {
          _count: {
            toolType: 'desc'
          }
        },
        take: 1
      });

      return {
        totalUsers: users.length,
        totalIntegrations,
        totalFetches,
        averageFetchesPerUser: users.length > 0 ? totalFetches / users.length : 0,
        mostUsedTool: toolUsage[0]?.toolType as MCPToolType || null
      };
    } catch (error) {
      console.error('[MCP Privacy] Error getting privacy statistics:', error);
      return {
        totalUsers: 0,
        totalIntegrations: 0,
        totalFetches: 0,
        averageFetchesPerUser: 0,
        mostUsedTool: null
      };
    }
  }

  /**
   * Cleanup old audit logs (data retention policy)
   * @param daysToKeep Number of days to keep logs (default: 90)
   * @returns Number of logs deleted
   */
  public async cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await this.prisma.mCPAuditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`[MCP Privacy] Cleaned up ${result.count} audit logs older than ${daysToKeep} days`);
      return result.count;
    } catch (error) {
      console.error('[MCP Privacy] Error cleaning up old audit logs:', error);
      return 0;
    }
  }
}