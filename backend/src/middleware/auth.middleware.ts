import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/auth.utils';
import { sendError } from '../utils/response.utils';
import { prisma } from '../lib/prisma';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Access token required', 401);
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Handle demo token in development
    if (process.env.NODE_ENV === 'development' && token.startsWith('demo_')) {
      console.log('🔧 Using demo authentication for development');
      
      // Create or get demo user
      let user = await prisma.users.findUnique({
        where: { email: 'demo@example.com' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          isActive: true
        }
      });
      
      if (!user) {
        // Create demo user with rich profile data
        user = await prisma.users.create({
          data: {
            email: 'demo@example.com',
            name: 'Demo User',
            password: 'demo_password_placeholder', // Demo user doesn't need real auth
            title: 'Software Engineer',
            company: 'Demo Company', 
            location: 'San Francisco, CA',
            bio: 'Demo user for development and testing',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
            isActive: true
          },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            isActive: true
          }
        });
        console.log('✅ Created demo user:', user.id);
      } else if (!user.title || !user.company) {
        // Update existing demo user with rich profile data if missing
        user = await prisma.users.update({
          where: { email: 'demo@example.com' },
          data: {
            title: 'Software Engineer',
            company: 'Demo Company', 
            location: 'San Francisco, CA',
            bio: 'Demo user for development and testing'
          },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            isActive: true
          }
        });
        console.log('✅ Updated demo user with profile data:', user.id);
      }
      
      req.user = user;
      next();
      return;
    }
    
    // Verify token
    const decoded: JwtPayload = verifyToken(token);
    
    if (decoded.type !== 'access') {
      sendError(res, 'Invalid token type', 401);
      return;
    }
    
    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isActive: true
      }
    });
    
    if (!user) {
      sendError(res, 'User not found', 401);
      return;
    }
    
    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 401);
      return;
    }
    
    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar || undefined
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    sendError(res, 'Invalid or expired token', 401);
  }
};

/**
 * Middleware to check if user has access to workspace
 */
export const requireWorkspaceAccess = (req: Request, res: Response, next: NextFunction) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        sendError(res, 'Authentication required', 401);
        return;
      }
      
      if (!workspaceId) {
        sendError(res, 'Workspace ID required', 400);
        return;
      }
      
      // Check if user is a member of the workspace
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId
          }
        }
      });
      
      if (!membership || !membership.isActive) {
        sendError(res, 'Access denied: Not a member of this workspace', 403);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Workspace access error:', error);
      sendError(res, 'Error checking workspace access', 500);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded: JwtPayload = verifyToken(token);
    
    if (decoded.type === 'access') {
      const user = await prisma.users.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          isActive: true
        }
      });
      
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || undefined
        };
      }
    }
    
    next();
  } catch (error) {
    // Token invalid, continue without user
    next();
  }
};