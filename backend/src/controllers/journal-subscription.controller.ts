import { Request, Response } from 'express';
import { journalSubscriptionService } from '../services/journal-subscription.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  toggleSubscriptionSchema
} from '../types/journal-subscription.types';
import { z } from 'zod';

/**
 * Get subscription for a workspace
 */
export const getSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { workspaceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!workspaceId) {
    return void sendError(res, 'Workspace ID is required', 400);
  }

  try {
    const subscription = await journalSubscriptionService.getSubscription(userId, workspaceId);
    sendSuccess(res, subscription, 'Subscription retrieved successfully');
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return void sendError(res, error.message, 403);
    }
    throw error;
  }
});

/**
 * Create a new subscription
 */
export const createSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { workspaceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!workspaceId) {
    return void sendError(res, 'Workspace ID is required', 400);
  }

  try {
    const validatedData = createSubscriptionSchema.parse(req.body);
    const subscription = await journalSubscriptionService.createSubscription(userId, workspaceId, validatedData);
    sendSuccess(res, subscription, 'Subscription created successfully', 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return void sendError(res, 'Validation failed: ' + error.issues.map(i => i.message).join(', '), 400);
    }
    if (error.message.includes('Access denied')) {
      return void sendError(res, error.message, 403);
    }
    if (error.message.includes('already exists')) {
      return void sendError(res, error.message, 409);
    }
    throw error;
  }
});

/**
 * Update an existing subscription
 */
export const updateSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { workspaceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!workspaceId) {
    return void sendError(res, 'Workspace ID is required', 400);
  }

  try {
    const validatedData = updateSubscriptionSchema.parse(req.body);
    const subscription = await journalSubscriptionService.updateSubscription(userId, workspaceId, validatedData);
    sendSuccess(res, subscription, 'Subscription updated successfully');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return void sendError(res, 'Validation failed: ' + error.issues.map(i => i.message).join(', '), 400);
    }
    if (error.message.includes('not found')) {
      return void sendError(res, error.message, 404);
    }
    throw error;
  }
});

/**
 * Delete a subscription
 */
export const deleteSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { workspaceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!workspaceId) {
    return void sendError(res, 'Workspace ID is required', 400);
  }

  try {
    await journalSubscriptionService.deleteSubscription(userId, workspaceId);
    sendSuccess(res, { success: true }, 'Subscription deleted successfully');
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return void sendError(res, error.message, 404);
    }
    throw error;
  }
});

/**
 * Toggle subscription active status
 */
export const toggleSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { workspaceId } = req.params;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!workspaceId) {
    return void sendError(res, 'Workspace ID is required', 400);
  }

  try {
    const validatedData = toggleSubscriptionSchema.parse(req.body);
    const subscription = await journalSubscriptionService.toggleSubscription(userId, workspaceId, validatedData.isActive);
    sendSuccess(res, subscription, `Subscription ${validatedData.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return void sendError(res, 'Validation failed: ' + error.issues.map(i => i.message).join(', '), 400);
    }
    if (error.message.includes('not found')) {
      return void sendError(res, error.message, 404);
    }
    throw error;
  }
});

/**
 * Get user's connected tools
 */
export const getConnectedTools = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const tools = await journalSubscriptionService.getConnectedTools(userId);
    sendSuccess(res, tools, 'Connected tools retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});
