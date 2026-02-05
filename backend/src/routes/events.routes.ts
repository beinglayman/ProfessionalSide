/**
 * Server-Sent Events (SSE) Routes
 *
 * Provides real-time event streaming to connected clients.
 * Used for narrative completion notifications and data change events.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { sseService } from '../services/sse.service';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, JwtPayload } from '../utils/auth.utils';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Custom auth middleware for SSE that accepts token from query param.
 * EventSource API doesn't support custom headers, so we use query param.
 */
const authenticateSSE = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get token from query param (SSE workaround) or Authorization header
  const token = (req.query.token as string) ||
    req.headers.authorization?.replace('Bearer ', '');

  try {

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Handle demo token in development
    if (process.env.NODE_ENV === 'development' && token.startsWith('demo_')) {
      const user = await prisma.user.findUnique({
        where: { email: 'demo@example.com' },
        select: { id: true, email: true, name: true, avatar: true }
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || undefined
        };
        next();
        return;
      }
    }

    // Verify JWT token
    console.log('[SSE Auth] Verifying token...');
    const decoded: JwtPayload = verifyToken(token);
    console.log('[SSE Auth] Token decoded:', { userId: decoded.userId, type: decoded.type });

    if (decoded.type !== 'access') {
      console.log('[SSE Auth] Invalid token type:', decoded.type);
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    console.log('[SSE Auth] Looking up user:', decoded.userId);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatar: true, isActive: true }
    });
    console.log('[SSE Auth] User found:', !!user, 'isActive:', user?.isActive);

    if (!user || !user.isActive) {
      console.log('[SSE Auth] User not found or inactive');
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar || undefined
    };

    next();
  } catch (error: any) {
    console.error('[SSE Auth] Error:', error?.message || error);
    console.error('[SSE Auth] Token (first 50 chars):', token?.substring(0, 50));
    res.status(401).json({ error: 'Invalid or expired token', details: error?.message });
  }
};

/**
 * GET /api/v1/events/stream
 *
 * SSE endpoint for real-time updates.
 * Client should connect and keep connection open.
 * Token can be passed via query param (for EventSource) or Authorization header.
 *
 * Events sent:
 * - narratives-complete: When background narrative generation finishes
 * - data-changed: When data changes that client should refresh
 * - heartbeat: Keep-alive ping every 30s
 */
router.get('/stream', authenticateSSE, (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const clientId = uuidv4();

  // Add client to SSE service
  sseService.addClient(clientId, userId, res);

  // Keep connection alive - handled by SSE service heartbeat
  // Connection cleanup handled by 'close' event in sseService.addClient
});

/**
 * GET /api/v1/events/stats
 *
 * Debug endpoint to check SSE connection stats (admin only in production)
 */
router.get('/stats', authenticate, (req: Request, res: Response) => {
  const stats = sseService.getStats();
  res.json(stats);
});

export default router;
