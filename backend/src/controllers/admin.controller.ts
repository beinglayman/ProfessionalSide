import { Request, Response } from 'express';
import { z } from 'zod';
import { SystemSettingsService } from '../services/system-settings.service';
import { InvitationService } from '../services/invitation.service';
import { InvitationRequestService } from '../services/invitation-request.service';
import { InvitationReplenishmentService } from '../services/invitation-replenishment.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const systemSettingsService = new SystemSettingsService();
const invitationService = new InvitationService();
const invitationRequestService = new InvitationRequestService();
const invitationReplenishmentService = new InvitationReplenishmentService();

// Validation schemas
const updateSettingsSchema = z.object({
  invitationOnlyMode: z.boolean().optional()
});

const grantInvitationsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().min(1, 'Amount must be at least 1').max(100, 'Cannot grant more than 100 invitations at once')
});

/**
 * Middleware to check admin access
 */
export const requireAdmin = asyncHandler(async (req: Request, res: Response, next: any) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  next();
});

/**
 * Get system settings (admin only)
 */
export const getSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const settings = await systemSettingsService.getSettings();
    sendSuccess(res, settings);
  } catch (error) {
    console.error('Error getting system settings:', error);
    sendError(res, 'Failed to get system settings', 500);
  }
});

/**
 * Update system settings (admin only)
 */
export const updateSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate input
  const validatedData = updateSettingsSchema.parse(req.body);

  try {
    const updatedSettings = await systemSettingsService.updateSettings(validatedData, userId);
    
    sendSuccess(res, updatedSettings, 'System settings updated successfully');
  } catch (error: any) {
    if (error.message.includes('Only admins')) {
      return sendError(res, error.message, 403);
    }
    
    console.error('Error updating system settings:', error);
    sendError(res, 'Failed to update system settings', 500);
  }
});

/**
 * Toggle invitation-only mode (admin only)
 */
export const toggleInvitationMode = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const result = await systemSettingsService.toggleInvitationMode(userId);
    
    sendSuccess(res, result, `Invitation-only mode ${result.enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error toggling invitation mode:', error);
    sendError(res, 'Failed to toggle invitation mode', 500);
  }
});

/**
 * Get comprehensive admin dashboard data
 */
export const getAdminDashboard = asyncHandler(async (req: Request, res: Response) => {
  try {
    const [
      systemStatus,
      invitationStats,
      requestStats,
      userStats,
      recentActivity
    ] = await Promise.all([
      systemSettingsService.getSystemStatus(),
      invitationService.getPlatformInvitationStats(),
      invitationRequestService.getRequestStats(),
      getUserStats(),
      getRecentActivity()
    ]);

    sendSuccess(res, {
      systemStatus,
      invitationStats,
      requestStats,
      userStats,
      recentActivity
    });
  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    sendError(res, 'Failed to get admin dashboard data', 500);
  }
});

/**
 * Grant additional invitations to a user (admin only)
 */
export const grantInvitations = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  
  if (!adminId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate input
  const validatedData = grantInvitationsSchema.parse(req.body);

  try {
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        invitationsRemaining: true,
        isAdmin: true
      }
    });

    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    // Update user's invitation quota
    const updatedUser = await prisma.user.update({
      where: { id: validatedData.userId },
      data: {
        invitationsRemaining: { increment: validatedData.amount }
      },
      select: {
        id: true,
        name: true,
        email: true,
        invitationsRemaining: true
      }
    });

    sendSuccess(res, {
      user: updatedUser,
      granted: validatedData.amount
    }, `Successfully granted ${validatedData.amount} invitations to ${targetUser.name}`);
  } catch (error) {
    console.error('Error granting invitations:', error);
    sendError(res, 'Failed to grant invitations', 500);
  }
});

/**
 * Get users with search and filtering (admin only)
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const isAdmin = req.query.isAdmin === 'true' ? true : req.query.isAdmin === 'false' ? false : undefined;

  const offset = (page - 1) * limit;

  try {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (isAdmin !== undefined) {
      where.isAdmin = isAdmin;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          company: true,
          isAdmin: true,
          invitationsRemaining: true,
          totalInvitationsSent: true,
          isActive: true,
          createdAt: true,
          profile: {
            select: {
              lastActiveAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    sendSuccess(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    sendError(res, 'Failed to get users', 500);
  }
});

/**
 * Helper function to get user statistics
 */
async function getUserStats() {
  const [
    totalUsers,
    adminUsers,
    activeUsers,
    newUsersThisMonth,
    invitationUserStats
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    prisma.user.aggregate({
      _avg: { invitationsRemaining: true, totalInvitationsSent: true },
      _sum: { invitationsRemaining: true, totalInvitationsSent: true }
    })
  ]);

  return {
    totalUsers,
    adminUsers,
    activeUsers,
    newUsersThisMonth,
    averageInvitationsRemaining: Math.round(invitationUserStats._avg.invitationsRemaining || 0),
    averageInvitationsSent: Math.round(invitationUserStats._avg.totalInvitationsSent || 0),
    totalInvitationsRemaining: invitationUserStats._sum.invitationsRemaining || 0,
    totalInvitationsSent: invitationUserStats._sum.totalInvitationsSent || 0
  };
}

/**
 * Helper function to get recent activity
 */
async function getRecentActivity() {
  const [recentUsers, recentInvitations, recentRequests] = await Promise.all([
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.platformInvitation.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        inviter: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.invitationRequest.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  return {
    recentUsers,
    recentInvitations,
    recentRequests
  };
}

/**
 * Get invitation replenishment history (admin only)
 */
export const getReplenishmentHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const history = await invitationReplenishmentService.getReplenishmentHistory(limit);
    const nextReplenishment = invitationReplenishmentService.getNextReplenishmentDate();
    
    sendSuccess(res, {
      history,
      nextReplenishment,
      currentDate: new Date()
    });
  } catch (error) {
    console.error('Error getting replenishment history:', error);
    sendError(res, 'Failed to get replenishment history', 500);
  }
});

/**
 * Get users eligible for replenishment preview (admin only)
 */
export const getReplenishmentPreview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const preview = await invitationReplenishmentService.getEligibleUsersPreview();
    sendSuccess(res, preview);
  } catch (error) {
    console.error('Error getting replenishment preview:', error);
    sendError(res, 'Failed to get replenishment preview', 500);
  }
});

/**
 * Manually trigger invitation replenishment (admin only)
 */
export const triggerManualReplenishment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const result = await invitationReplenishmentService.manualReplenishment(userId);
    
    if (result.success) {
      sendSuccess(res, result.results, result.message);
    } else {
      sendError(res, result.message, 403);
    }
  } catch (error) {
    console.error('Error triggering manual replenishment:', error);
    sendError(res, 'Failed to trigger manual replenishment', 500);
  }
});