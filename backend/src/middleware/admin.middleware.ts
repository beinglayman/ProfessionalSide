import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.utils';
import { prisma } from '../lib/prisma';

// Admin user configuration
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean);
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: AdminPermission[];
}

export interface AdminPermission {
  resource: string;
  actions: string[];
}

// Extend Express Request type to include admin
declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // Check if user email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(user.email) || user.email === SUPER_ADMIN_EMAIL;
    
    if (!isAdmin) {
      sendError(res, 'Admin access required', 403);
      return;
    }

    // Get user details and construct admin object
    const adminUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      }
    });

    if (!adminUser || !adminUser.isActive) {
      sendError(res, 'Admin account not found or inactive', 403);
      return;
    }

    // Determine admin role and permissions
    const adminRole = user.email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'admin';
    const permissions = getAdminPermissions(adminRole);

    req.admin = {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminRole,
      permissions
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    sendError(res, 'Admin authentication failed', 500);
  }
};

/**
 * Middleware to check specific admin permissions
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = req.admin;
    
    if (!admin) {
      sendError(res, 'Admin access required', 403);
      return;
    }

    // Super admin has all permissions
    if (admin.role === 'super_admin') {
      next();
      return;
    }

    // Check if admin has the required permission
    const hasPermission = admin.permissions.some(permission => 
      permission.resource === resource && permission.actions.includes(action)
    );

    if (!hasPermission) {
      sendError(res, `Permission denied: ${action} on ${resource}`, 403);
      return;
    }

    next();
  };
};

/**
 * Middleware for super admin only actions
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const admin = req.admin;
  
  if (!admin || admin.role !== 'super_admin') {
    sendError(res, 'Super admin access required', 403);
    return;
  }

  next();
};

/**
 * Get admin permissions based on role
 */
function getAdminPermissions(role: string): AdminPermission[] {
  const basePermissions: AdminPermission[] = [
    {
      resource: 'users',
      actions: ['read', 'update']
    },
    {
      resource: 'workspaces',
      actions: ['read', 'update']
    },
    {
      resource: 'journal_entries',
      actions: ['read', 'update', 'delete']
    },
    {
      resource: 'notifications',
      actions: ['read', 'create']
    },
    {
      resource: 'analytics',
      actions: ['read']
    },
    {
      resource: 'exports',
      actions: ['read', 'delete']
    }
  ];

  if (role === 'super_admin') {
    return [
      ...basePermissions,
      {
        resource: 'system',
        actions: ['read', 'update', 'delete', 'backup', 'restore']
      },
      {
        resource: 'users',
        actions: ['read', 'create', 'update', 'delete', 'suspend']
      },
      {
        resource: 'workspaces',
        actions: ['read', 'create', 'update', 'delete']
      },
      {
        resource: 'admin',
        actions: ['read', 'create', 'update', 'delete']
      }
    ];
  }

  if (role === 'admin') {
    return [
      ...basePermissions,
      {
        resource: 'users',
        actions: ['read', 'update', 'suspend']
      },
      {
        resource: 'system',
        actions: ['read']
      }
    ];
  }

  // Moderator permissions
  return [
    {
      resource: 'users',
      actions: ['read']
    },
    {
      resource: 'journal_entries',
      actions: ['read', 'update']
    },
    {
      resource: 'workspaces',
      actions: ['read']
    }
  ];
}

/**
 * Check if current admin has permission
 */
export const hasAdminPermission = (admin: AdminUser, resource: string, action: string): boolean => {
  if (admin.role === 'super_admin') {
    return true;
  }

  return admin.permissions.some(permission => 
    permission.resource === resource && permission.actions.includes(action)
  );
};

/**
 * Get admin info for current request
 */
export const getAdminInfo = (req: Request): AdminUser | null => {
  return req.admin || null;
};