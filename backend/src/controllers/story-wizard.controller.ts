/**
 * Story Wizard Controller
 *
 * API endpoints for the two-step wizard flow:
 * 1. POST /wizard/analyze - detect archetype, return D-I-G questions
 * 2. POST /wizard/generate - generate story with user answers
 */

import { Request, Response } from 'express';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import { createStoryWizardService, WizardError } from '../services/story-wizard.service';
import {
  analyzeRequestSchema,
  generateRequestSchema,
  formatZodErrors,
} from './story-wizard.schemas';

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Handle WizardError and return appropriate HTTP response.
 * Returns true if error was handled, false if it should be re-thrown.
 */
function handleWizardError(error: unknown, res: Response): boolean {
  if (error instanceof WizardError) {
    sendError(res, error.message, error.statusCode, { code: error.code });
    return true;
  }
  return false;
}

// =============================================================================
// DEMO MODE DETECTION
// =============================================================================

function isDemoModeRequest(req: Request): boolean {
  if (req.isDemoMode !== undefined) {
    return req.isDemoMode;
  }
  if (req.headers['x-demo-mode'] === 'true') {
    return true;
  }
  if (req.query.isDemoMode === 'true') {
    return true;
  }
  return false;
}

// =============================================================================
// WIZARD ENDPOINTS
// =============================================================================

/**
 * POST /api/career-stories/wizard/analyze
 * Analyze journal entry → detect archetype + return D-I-G questions
 */
export const analyzeEntry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  // Validate request body
  const validation = analyzeRequestSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 'Invalid request', 400, formatZodErrors(validation.error));
    return;
  }

  const { journalEntryId } = validation.data;
  const isDemoMode = isDemoModeRequest(req);
  const wizardService = createStoryWizardService(isDemoMode);

  try {
    const result = await wizardService.analyzeEntry(journalEntryId, userId);
    sendSuccess(res, result);
  } catch (error) {
    if (handleWizardError(error, res)) return;
    throw error;
  }
});

/**
 * POST /api/career-stories/wizard/generate
 * Generate story with user answers → return story + evaluation
 */
export const generateStory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  // Validate request body
  const validation = generateRequestSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 'Invalid request', 400, formatZodErrors(validation.error));
    return;
  }

  const isDemoMode = isDemoModeRequest(req);
  const wizardService = createStoryWizardService(isDemoMode);

  try {
    const result = await wizardService.generateStory(validation.data, userId);
    sendSuccess(res, result);
  } catch (error) {
    if (handleWizardError(error, res)) return;
    throw error;
  }
});
