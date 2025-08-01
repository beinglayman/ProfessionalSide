import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { sendSuccess, sendError, sendPaginated, asyncHandler } from '../utils/response.utils';
import { hasAdminPermission } from '../middleware/admin.middleware';
import { z } from 'zod';

const prisma = new PrismaClient();
const adminDashboardService = new AdminDashboardService();

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  title: z.string().optional(),
  company: z.string().optional()
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  title: z.string().optional(),
  company: z.string().optional()
});

/**
 * Get admin dashboard overview
 */
export const getDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin) {
    return sendError(res, 'Admin access required', 403);
  }

  try {
    const [systemMetrics, userMetrics, contentMetrics, systemHealth] = await Promise.all([
      adminDashboardService.getSystemMetrics(),
      adminDashboardService.getUserMetrics(),
      adminDashboardService.getContentMetrics(),
      adminDashboardService.getSystemHealth()
    ]);

    const overview = {
      system: systemMetrics,
      users: userMetrics,
      content: contentMetrics,
      health: systemHealth,
      admin: {
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    };

    sendSuccess(res, overview, 'Dashboard overview retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get system metrics
 */
export const getSystemMetrics = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'system', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const metrics = await adminDashboardService.getSystemMetrics();
    sendSuccess(res, metrics, 'System metrics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get user metrics and management
 */
export const getUserMetrics = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'users', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const metrics = await adminDashboardService.getUserMetrics();
    sendSuccess(res, metrics, 'User metrics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get all users with pagination
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'users', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          company: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              journalEntries: true,
              workspaceMemberships: true
            }
          },
          profile: {
            select: {
              lastActiveAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    sendPaginated(res, users, pagination, 'Users retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get user details by ID
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const { userId } = req.params;
  
  if (!admin || !hasAdminPermission(admin, 'users', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  if (!userId) {
    return sendError(res, 'User ID is required', 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: {
          include: {
            skill: true
          }
        },
        workspaceMemberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        _count: {
          select: {
            journalEntries: true,
            sentConnections: true,
            receivedConnections: true,
            achievements: true
          }
        }
      }
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, user, 'User details retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const { userId } = req.params;
  
  if (!admin || !hasAdminPermission(admin, 'users', 'update')) {
    return sendError(res, 'Permission denied', 403);
  }

  if (!userId) {
    return sendError(res, 'User ID is required', 400);
  }

  try {
    const validatedData = updateUserSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        company: true,
        isActive: true,
        updatedAt: true
      }
    });

    sendSuccess(res, updatedUser, 'User updated successfully');
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid user data', 400, error.errors);
    }
    if (error.code === 'P2002') {
      return sendError(res, 'Email already exists', 409);
    }
    if (error.code === 'P2025') {
      return sendError(res, 'User not found', 404);
    }
    throw error;
  }
});

/**
 * Suspend/unsuspend user
 */
export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const { userId } = req.params;
  
  if (!admin || !hasAdminPermission(admin, 'users', 'suspend')) {
    return sendError(res, 'Permission denied', 403);
  }

  if (!userId) {
    return sendError(res, 'User ID is required', 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, name: true }
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        updatedAt: true
      }
    });

    const action = updatedUser.isActive ? 'activated' : 'suspended';
    sendSuccess(res, updatedUser, `User ${action} successfully`);
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get content metrics
 */
export const getContentMetrics = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'journal_entries', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const metrics = await adminDashboardService.getContentMetrics();
    sendSuccess(res, metrics, 'Content metrics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get system health
 */
export const getSystemHealth = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'system', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const health = await adminDashboardService.getSystemHealth();
    sendSuccess(res, health, 'System health retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get system statistics for charts
 */
export const getSystemStatistics = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'analytics', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
    const statistics = await adminDashboardService.getSystemStatistics(period);
    sendSuccess(res, statistics, 'System statistics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get admin activity logs
 */
export const getAdminActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'admin', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await adminDashboardService.getAdminActivityLogs(limit);
    sendSuccess(res, logs, 'Admin activity logs retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get workspaces with admin view
 */
export const getWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'workspaces', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where: whereClause,
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              members: true,
              journalEntries: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.workspace.count({ where: whereClause })
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    sendPaginated(res, workspaces, pagination, 'Workspaces retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Delete journal entry (admin)
 */
export const deleteJournalEntry = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const { entryId } = req.params;
  
  if (!admin || !hasAdminPermission(admin, 'journal_entries', 'delete')) {
    return sendError(res, 'Permission denied', 403);
  }

  if (!entryId) {
    return sendError(res, 'Entry ID is required', 400);
  }

  try {
    await prisma.journalEntry.delete({
      where: { id: entryId }
    });

    sendSuccess(res, null, 'Journal entry deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Journal entry not found', 404);
    }
    throw error;
  }
});

/**
 * Get admin permissions for current user
 */
export const getAdminPermissions = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin) {
    return sendError(res, 'Admin access required', 403);
  }

  sendSuccess(res, {
    role: admin.role,
    permissions: admin.permissions
  }, 'Admin permissions retrieved successfully');
});