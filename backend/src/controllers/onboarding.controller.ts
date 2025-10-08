import { Request, Response } from 'express';
import { OnboardingService } from '../services/onboarding.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import {
  createOnboardingDataSchema,
  updateOnboardingDataSchema,
  updateOnboardingStepSchema,
  completeOnboardingSchema,
  CreateOnboardingDataInput,
  UpdateOnboardingDataInput,
  UpdateOnboardingStepInput,
  CompleteOnboardingInput
} from '../types/onboarding.types';

const onboardingService = new OnboardingService();

/**
 * Get current user's onboarding data
 */
export const getMyOnboardingData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const onboardingData = await onboardingService.getOnboardingData(userId);
  
  if (!onboardingData) {
    // Return default onboarding data structure
    const defaultData = {
      currentStep: 0,  // Start at step 0 (Professional Basics)
      isCompleted: false,
      specializations: [],
      topSkills: [],
      careerGoals: [],
      professionalInterests: []
    };
    void sendSuccess(res, defaultData);
  }

  sendSuccess(res, onboardingData);
});

/**
 * Create or update onboarding data
 */
export const upsertOnboardingData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const validatedData: UpdateOnboardingDataInput = updateOnboardingDataSchema.parse(req.body);

  try {
    const onboardingData = await onboardingService.upsertOnboardingData(userId, validatedData);
    sendSuccess(res, onboardingData, 'Onboarding data updated successfully');
  } catch (error: any) {
    if ((error as any).message.includes('Validation') || (error as any).message.includes('Invalid')) {
      return void sendError(res, (error as any).message, 400);
    }
    throw error;
  }
});

/**
 * Update current step
 */
export const updateCurrentStep = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const validatedData: UpdateOnboardingStepInput = updateOnboardingStepSchema.parse(req.body);

  try {
    const onboardingData = await onboardingService.updateCurrentStep(userId, validatedData);
    sendSuccess(res, onboardingData, 'Onboarding step updated successfully');
  } catch (error: any) {
    if ((error as any).message.includes('Validation') || (error as any).message.includes('Invalid')) {
      return void sendError(res, (error as any).message, 400);
    }
    throw error;
  }
});

/**
 * Complete onboarding
 */
export const completeOnboarding = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    // Complete onboarding with personal workspace creation
    const success = await onboardingService.completeOnboardingWithWorkspace(userId, { isCompleted: true });
    sendSuccess(res, { success }, 'Onboarding completed successfully with personal workspace created');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Reset onboarding (delete onboarding data)
 */
export const resetOnboarding = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    await onboardingService.deleteOnboardingData(userId);
    sendSuccess(res, null, 'Onboarding data reset successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get onboarding progress
 */
export const getOnboardingProgress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const progress = await onboardingService.getOnboardingProgress(userId);
  sendSuccess(res, progress);
});

/**
 * Check if user has completed onboarding
 */
export const checkOnboardingStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const hasCompleted = await onboardingService.hasCompletedOnboarding(userId);
  sendSuccess(res, { hasCompleted });
});

/**
 * Manually sync onboarding data to user profile (for fixing sync issues)
 */
export const syncOnboardingToProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const success = await onboardingService.manualSyncOnboardingData(userId);
  
  if (success) {
    sendSuccess(res, { synced: true }, 'Profile synced successfully');
  } else {
    sendError(res, 'No onboarding data found to sync', 404);
  }
});

/**
 * Skip onboarding
 */
export const skipOnboarding = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    // Skip onboarding with personal workspace creation
    const success = await onboardingService.skipOnboardingWithWorkspace(userId);
    sendSuccess(res, { success }, 'Onboarding skipped successfully with personal workspace created');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Update specific step data
 */
export const updateStepData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const stepNumber = parseInt(req.params.stepNumber);
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!stepNumber || stepNumber < 1 || stepNumber > 7) {
    return void sendError(res, 'Invalid step number. Must be between 1 and 7', 400);
  }

  // Validate the step data based on the step number
  let validatedData: any;
  try {
    validatedData = updateOnboardingDataSchema.parse(req.body);
  } catch (error: any) {
    return void sendError(res, `Validation failed: ${(error as any).message}`, 400);
  }

  try {
    const onboardingData = await onboardingService.updateStepData(userId, stepNumber, validatedData);
    sendSuccess(res, onboardingData, `Step ${stepNumber} data updated successfully`);
  } catch (error: any) {
    if ((error as any).message.includes('Validation') || (error as any).message.includes('Invalid')) {
      return void sendError(res, (error as any).message, 400);
    }
    throw error;
  }
});