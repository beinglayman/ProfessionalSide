import { v4 as uuidv4 } from 'uuid';
import { MCPSession, MCPToolType, MCPFetchResponse } from '../../types/mcp.types';

/**
 * MCP Session Service - Memory-only data management
 *
 * PRIVACY FIRST:
 * - No data persistence to database
 * - Automatic session expiry after 30 minutes
 * - Immediate data clearing on request
 * - Session isolation per user
 */
export class MCPSessionService {
  private static instance: MCPSessionService;
  private sessions: Map<string, MCPSession> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  // Session configuration
  private readonly SESSION_DURATION_MINUTES = 30;
  private readonly CLEANUP_INTERVAL_MINUTES = 5;

  private constructor() {
    // Start cleanup interval to remove expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
  }

  public static getInstance(): MCPSessionService {
    if (!MCPSessionService.instance) {
      MCPSessionService.instance = new MCPSessionService();
    }
    return MCPSessionService.instance;
  }

  /**
   * Create a new session for fetched data
   * @param userId User ID
   * @param toolType Tool type (GitHub, Jira, etc.)
   * @param data Fetched data (memory-only)
   * @param consentGiven Whether user gave consent
   * @returns Session ID
   */
  public createSession(
    userId: string,
    toolType: MCPToolType,
    data: any,
    consentGiven: boolean = true
  ): string {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_MINUTES * 60 * 1000);

    const session: MCPSession = {
      sessionId,
      userId,
      toolType,
      tempData: data,
      fetchedAt: now,
      expiresAt,
      consentGiven
    };

    this.sessions.set(sessionId, session);

    // Log session creation (no data logged)
    console.log(`[MCP Session] Created session ${sessionId} for user ${userId}, tool ${toolType}`);
    console.log(`[MCP Session] Session expires at ${expiresAt.toISOString()}`);
    console.log(`[MCP Session] Data will be automatically cleared after expiry`);

    return sessionId;
  }

  /**
   * Get session data by session ID
   * @param sessionId Session ID
   * @param userId User ID (for validation)
   * @returns Session data or null if expired/not found
   */
  public getSession(sessionId: string, userId: string): MCPSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[MCP Session] Session ${sessionId} not found`);
      return null;
    }

    // Validate user ownership
    if (session.userId !== userId) {
      console.warn(`[MCP Session] User ${userId} attempted to access session owned by ${session.userId}`);
      return null;
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      console.log(`[MCP Session] Session ${sessionId} has expired`);
      this.clearSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get all active sessions for a user
   * @param userId User ID
   * @returns Array of active sessions
   */
  public getUserSessions(userId: string): MCPSession[] {
    const userSessions: MCPSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId && new Date() <= session.expiresAt) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  /**
   * Clear a specific session
   * @param sessionId Session ID
   * @returns Success status
   */
  public clearSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Clear the data
      session.tempData = null;
      this.sessions.delete(sessionId);

      console.log(`[MCP Session] Cleared session ${sessionId} and all associated data`);
      return true;
    }

    return false;
  }

  /**
   * Clear all sessions for a user
   * @param userId User ID
   * @returns Number of sessions cleared
   */
  public clearUserSessions(userId: string): number {
    let clearedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`[MCP Session] Cleared ${clearedCount} sessions for user ${userId}`);
    }

    return clearedCount;
  }

  /**
   * Clear all sessions for a specific tool type
   * @param userId User ID
   * @param toolType Tool type
   * @returns Number of sessions cleared
   */
  public clearToolSessions(userId: string, toolType: MCPToolType): number {
    let clearedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.toolType === toolType) {
        this.sessions.delete(sessionId);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`[MCP Session] Cleared ${clearedCount} ${toolType} sessions for user ${userId}`);
    }

    return clearedCount;
  }

  /**
   * Clean up expired sessions (called automatically)
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[MCP Session] Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Get session statistics (for monitoring)
   * @returns Session statistics
   */
  public getStatistics(): {
    totalSessions: number;
    sessionsPerUser: Map<string, number>;
    sessionsPerTool: Map<MCPToolType, number>;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const stats = {
      totalSessions: this.sessions.size,
      sessionsPerUser: new Map<string, number>(),
      sessionsPerTool: new Map<MCPToolType, number>(),
      oldestSession: null as Date | null,
      newestSession: null as Date | null
    };

    for (const session of this.sessions.values()) {
      // Count per user
      const userCount = stats.sessionsPerUser.get(session.userId) || 0;
      stats.sessionsPerUser.set(session.userId, userCount + 1);

      // Count per tool
      const toolCount = stats.sessionsPerTool.get(session.toolType) || 0;
      stats.sessionsPerTool.set(session.toolType, toolCount + 1);

      // Track oldest/newest
      if (!stats.oldestSession || session.fetchedAt < stats.oldestSession) {
        stats.oldestSession = session.fetchedAt;
      }
      if (!stats.newestSession || session.fetchedAt > stats.newestSession) {
        stats.newestSession = session.fetchedAt;
      }
    }

    return stats;
  }

  /**
   * Extend session expiry time
   * @param sessionId Session ID
   * @param userId User ID
   * @param additionalMinutes Additional minutes to extend
   * @returns New expiry time or null if session not found
   */
  public extendSession(
    sessionId: string,
    userId: string,
    additionalMinutes: number = 30
  ): Date | null {
    const session = this.getSession(sessionId, userId);

    if (!session) {
      return null;
    }

    const newExpiry = new Date(session.expiresAt.getTime() + additionalMinutes * 60 * 1000);
    session.expiresAt = newExpiry;

    console.log(`[MCP Session] Extended session ${sessionId} expiry to ${newExpiry.toISOString()}`);

    return newExpiry;
  }

  /**
   * Destroy the service (cleanup on shutdown)
   */
  public destroy(): void {
    // Clear all sessions
    for (const sessionId of this.sessions.keys()) {
      this.clearSession(sessionId);
    }

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('[MCP Session] Service destroyed, all sessions cleared');
  }
}