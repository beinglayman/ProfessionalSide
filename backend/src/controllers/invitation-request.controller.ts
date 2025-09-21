import { Request, Response } from 'express';
import { z } from 'zod';
import { InvitationRequestService } from '../services/invitation-request.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';

const invitationRequestService = new InvitationRequestService();

// Validation schemas
const createRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Valid email required'),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long'),
  organization: z.string().min(1, 'Organization is required').max(100, 'Organization too long'),
  linkedinUrl: z.string().url('Valid LinkedIn URL required').optional().or(z.literal('')),
  message: z.string().max(500, 'Message too long').optional()
});

const reviewRequestSchema = z.object({
  status: z.enum(['approved', 'denied'], { required_error: 'Status must be approved or denied' }),
  adminMessage: z.string().max(500, 'Admin message too long').optional()
});

const bulkReviewSchema = z.object({
  requestIds: z.array(z.string().min(1, 'Request ID required')).min(1, 'At least one request ID required'),
  status: z.enum(['approved', 'denied'], { required_error: 'Status must be approved or denied' }),
  adminMessage: z.string().max(500, 'Admin message too long').optional()
});

/**
 * Create a new invitation request (public endpoint)
 */
export const createInvitationRequest = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData = createRequestSchema.parse(req.body);

  try {
    const request = await invitationRequestService.createRequest({
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
      organization: validatedData.organization,
      linkedinUrl: validatedData.linkedinUrl || undefined,
      message: validatedData.message
    });

    // Return limited information for security
    sendSuccess(res, {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt
    }, 'Invitation request submitted successfully. We will review your request and get back to you soon.', 201);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return sendError(res, 'User with this email already exists', 409);
    }
    if (error.message.includes('already pending')) {
      return sendError(res, 'You already have a pending invitation request', 409);
    }
    if (error.message.includes('already sent')) {
      return sendError(res, 'An invitation has already been sent to this email', 409);
    }
    
    console.error('Error creating invitation request:', error);
    sendError(res, 'Failed to submit invitation request', 500);
  }
});

/**
 * Get pending invitation requests (admin only)
 */
export const getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Check if user is admin
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const result = await invitationRequestService.getPendingRequests(page, limit);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Error getting pending requests:', error);
    sendError(res, 'Failed to get pending requests', 500);
  }
});

/**
 * Get all invitation requests with filters (admin only)
 */
export const getAllRequests = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Check if user is admin
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as 'pending' | 'approved' | 'denied' | undefined;

  try {
    const result = await invitationRequestService.getAllRequests(page, limit, status);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Error getting all requests:', error);
    sendError(res, 'Failed to get requests', 500);
  }
});

/**
 * Review a single invitation request (admin only)
 */
export const reviewInvitationRequest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { requestId } = req.params;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!requestId) {
    return sendError(res, 'Request ID is required', 400);
  }

  // Check if user is admin
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, name: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  // Validate input
  const validatedData = reviewRequestSchema.parse(req.body);

  try {
    const result = await invitationRequestService.reviewRequest({
      requestId,
      reviewerId: userId,
      status: validatedData.status,
      adminMessage: validatedData.adminMessage
    });

    sendSuccess(res, result, `Request ${validatedData.status} successfully`);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already been reviewed')) {
      return sendError(res, error.message, 409);
    }
    if (error.message.includes('Failed to create invitation')) {
      return sendError(res, error.message, 500);
    }
    
    console.error('Error reviewing invitation request:', error);
    sendError(res, 'Failed to review request', 500);
  }
});

/**
 * Bulk review invitation requests (admin only)
 */
export const bulkReviewRequests = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Check if user is admin
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, name: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  // Validate input
  const validatedData = bulkReviewSchema.parse(req.body);

  try {
    const result = await invitationRequestService.bulkReviewRequests(
      validatedData.requestIds,
      userId,
      validatedData.status,
      validatedData.adminMessage
    );

    sendSuccess(res, result, `Bulk review completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);
  } catch (error) {
    console.error('Error bulk reviewing requests:', error);
    sendError(res, 'Failed to bulk review requests', 500);
  }
});

/**
 * Get invitation request statistics (admin only)
 */
export const getRequestStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Check if user is admin
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    return sendError(res, 'Admin access required', 403);
  }

  try {
    const stats = await invitationRequestService.getRequestStats();
    sendSuccess(res, stats);
  } catch (error) {
    console.error('Error getting request stats:', error);
    sendError(res, 'Failed to get request statistics', 500);
  }
});

/**
 * Check if invitation requests are enabled (public endpoint)
 */
export const getRequestsEnabled = asyncHandler(async (req: Request, res: Response) => {
  // For now, always enabled. Could be controlled by environment variable
  const enabled = process.env.ENABLE_INVITATION_REQUESTS !== 'false';
  
  sendSuccess(res, {
    enabled,
    message: enabled 
      ? 'Invitation requests are currently being accepted' 
      : 'Invitation requests are temporarily disabled'
  });
});