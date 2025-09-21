import { Request, Response } from 'express';
import { z } from 'zod';
import { InvitationService } from '../services/invitation.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';

const invitationService = new InvitationService();

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email('Valid email required'),
  message: z.string().optional()
});

const validateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

/**
 * Create a new platform invitation
 */
export const createInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate input
  const validatedData = createInvitationSchema.parse(req.body);
  
  try {
    const result = await invitationService.createInvitation({
      email: validatedData.email,
      inviterId: userId,
      message: validatedData.message
    });

    sendSuccess(res, {
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        status: result.invitation.status,
        expiresAt: result.invitation.expiresAt,
        createdAt: result.invitation.createdAt,
        inviter: result.invitation.inviter
      },
      quotaRemaining: result.hasQuota
    }, 'Invitation sent successfully', 201);
  } catch (error: any) {
    if (error.message.includes('No invitation quota')) {
      return sendError(res, 'You have no invitation quota remaining', 400);
    }
    if (error.message.includes('already exists')) {
      return sendError(res, error.message, 409);
    }
    if (error.message.includes('already pending')) {
      return sendError(res, error.message, 409);
    }
    
    console.error('Error creating invitation:', error);
    sendError(res, 'Failed to create invitation', 500);
  }
});

/**
 * Get user's invitation quota and statistics
 */
export const getInvitationQuota = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const [quotaCheck, stats] = await Promise.all([
      invitationService.checkInvitationQuota(userId),
      invitationService.getUserInvitationStats(userId)
    ]);

    sendSuccess(res, {
      quota: {
        remaining: quotaCheck.remaining,
        isAdmin: quotaCheck.isAdmin,
        hasQuota: quotaCheck.hasQuota
      },
      stats
    });
  } catch (error) {
    console.error('Error getting invitation quota:', error);
    sendError(res, 'Failed to get invitation quota', 500);
  }
});

/**
 * Get user's invitation history
 */
export const getInvitationHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const result = await invitationService.getUserInvitations(userId, page, limit);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Error getting invitation history:', error);
    sendError(res, 'Failed to get invitation history', 500);
  }
});

/**
 * Validate invitation token (public endpoint)
 */
export const validateInvitationToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token) {
    return sendError(res, 'Token is required', 400);
  }

  try {
    const validation = await invitationService.validateInvitationToken(token);
    
    if (!validation.valid) {
      return sendError(res, 'Invalid or expired invitation token', 400);
    }

    sendSuccess(res, {
      valid: true,
      email: validation.email,
      inviter: validation.inviter
    });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    sendError(res, 'Failed to validate invitation token', 500);
  }
});

/**
 * Get platform invitation statistics (admin only)
 */
export const getPlatformInvitationStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Check if user is admin
  const user = await require('@prisma/client').PrismaClient().user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  try {
    const stats = await invitationService.getPlatformInvitationStats();
    sendSuccess(res, stats);
  } catch (error) {
    console.error('Error getting platform invitation stats:', error);
    sendError(res, 'Failed to get platform invitation statistics', 500);
  }
});

/**
 * Accept invitation by token (used during registration)
 */
export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { token } = req.params;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!token) {
    return sendError(res, 'Token is required', 400);
  }

  try {
    const result = await invitationService.acceptInvitation(token, userId);
    sendSuccess(res, result, 'Invitation accepted successfully');
  } catch (error: any) {
    if (error.message.includes('Invalid or expired')) {
      return sendError(res, error.message, 400);
    }
    
    console.error('Error accepting invitation:', error);
    sendError(res, 'Failed to accept invitation', 500);
  }
});

/**
 * Get system settings (public endpoint for checking invitation mode)
 */
export const getSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { SystemSettingsService } = await import('../services/system-settings.service');
    const systemSettingsService = new SystemSettingsService();
    
    const settings = await systemSettingsService.getSettings();
    
    // Only return public settings
    sendSuccess(res, {
      invitationOnlyMode: settings.invitationOnlyMode
    });
  } catch (error) {
    console.error('Error getting system settings:', error);
    sendError(res, 'Failed to get system settings', 500);
  }
});

/**
 * Expire old invitations (cron endpoint)
 */
export const expireOldInvitations = asyncHandler(async (req: Request, res: Response) => {
  // This endpoint should be protected by API key or internal access only
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const expiredCount = await invitationService.expireOldInvitations();
    sendSuccess(res, { expiredCount }, `Expired ${expiredCount} old invitations`);
  } catch (error) {
    console.error('Error expiring old invitations:', error);
    sendError(res, 'Failed to expire old invitations', 500);
  }
});