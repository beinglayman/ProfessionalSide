/**
 * Server-Sent Events (SSE) Service
 *
 * Manages SSE connections and broadcasts events to connected clients.
 * Used for real-time updates (narrative generation completion, data changes).
 */

import { Response } from 'express';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Heartbeat interval to keep connections alive (ms) */
export const HEARTBEAT_INTERVAL_MS = 30000;

// =============================================================================
// TYPES
// =============================================================================

export type SSEEventType =
  | 'narratives-complete'
  | 'data-changed'
  | 'sync-progress'
  | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  userId?: string;
}

interface SSEClient {
  id: string;
  userId: string;
  res: Response;
  connectedAt: Date;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  /**
   * Add a new SSE client connection
   */
  addClient(clientId: string, userId: string, res: Response): void {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial connection event
    this.sendToClient(res, {
      type: 'heartbeat',
      data: { message: 'connected', clientId },
    });

    this.clients.set(clientId, {
      id: clientId,
      userId,
      res,
      connectedAt: new Date(),
    });

    console.log(`[SSE] Client connected: ${clientId} (user: ${userId}). Total: ${this.clients.size}`);

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(clientId);
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`[SSE] Client disconnected: ${clientId}. Total: ${this.clients.size}`);
    }
  }

  /**
   * Broadcast event to all clients for a specific user
   */
  broadcastToUser(userId: string, event: Omit<SSEEvent, 'userId'>): void {
    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        this.sendToClient(client.res, event);
        sent++;
      }
    }
    console.log(`[SSE] Broadcast ${event.type} to ${sent} clients (user: ${userId})`);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcastToAll(event: Omit<SSEEvent, 'userId'>): void {
    for (const client of this.clients.values()) {
      this.sendToClient(client.res, event);
    }
    console.log(`[SSE] Broadcast ${event.type} to ${this.clients.size} clients`);
  }

  /**
   * Send event to a specific client response
   */
  private sendToClient(res: Response, event: Omit<SSEEvent, 'userId'>): void {
    try {
      const data = JSON.stringify(event);
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('[SSE] Error sending to client:', error);
    }
  }

  /**
   * Start heartbeat to keep connections alive (every 30s)
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcastToAll({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Get connection stats
   */
  getStats(): { totalClients: number; clientsByUser: Record<string, number> } {
    const clientsByUser: Record<string, number> = {};
    for (const client of this.clients.values()) {
      clientsByUser[client.userId] = (clientsByUser[client.userId] || 0) + 1;
    }
    return {
      totalClients: this.clients.size,
      clientsByUser,
    };
  }

  /**
   * Clean up service (for graceful shutdown)
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch {
        // Ignore errors on shutdown
      }
    }
    this.clients.clear();
    console.log('[SSE] Service shut down');
  }
}

// Singleton instance
export const sseService = new SSEService();
