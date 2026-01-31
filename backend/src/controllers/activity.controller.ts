import { Request, Response } from 'express';
import { createHash } from 'crypto';
import {
  ActivityService,
  CACHE_CONTROL,
  ActivityNotFoundError,
  ActivityAccessDeniedError
} from '../services/activity.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import {
  getJournalEntryActivitiesSchema,
  getActivityStatsSchema,
  journalEntryIdSchema,
  GetJournalEntryActivitiesInput,
  GetActivityStatsInput
} from '../types/activity.types';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get or create request-scoped ActivityService
 */
function getActivityService(req: Request): ActivityService {
  // Check if already attached by middleware
  if (req.activityService) {
    return req.activityService;
  }

  // Fallback: create from header
  const isDemoMode = req.headers['x-demo-mode'] === 'true';
  return new ActivityService(isDemoMode);
}

/**
 * Generate ETag for cache validation using content hash.
 * Uses MD5 for speed (not security) - sufficient for cache validation.
 */
function generateETag(data: unknown): string {
  const content = JSON.stringify(data);
  const hash = createHash('md5').update(content).digest('hex').slice(0, 16);
  return `"${hash}"`;
}

// =============================================================================
// CONTROLLERS
// =============================================================================

/**
 * GET /journal-entries/:id/activities
 *
 * Fetch raw activities for a specific draft story (journal entry).
 * Activities are a sub-resource of journal entries.
 */
export const getJournalEntryActivities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return void sendError(res, 'User not authenticated', 401);
    }

    // Validate path param
    const journalEntryIdResult = journalEntryIdSchema.safeParse(req.params.id);
    if (!journalEntryIdResult.success) {
      return void sendError(res, 'Invalid journal entry ID', 400);
    }
    const journalEntryId = journalEntryIdResult.data;

    // Validate query params
    const queryResult = getJournalEntryActivitiesSchema.safeParse({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      source: req.query.source
    });

    if (!queryResult.success) {
      const errors = queryResult.error.issues.map(i => i.message).join(', ');
      return void sendError(res, `Validation failed: ${errors}`, 400);
    }

    const options: GetJournalEntryActivitiesInput = queryResult.data;

    try {
      const service = getActivityService(req);
      const result = await service.getActivitiesForJournalEntry(
        journalEntryId,
        userId,
        options
      );

      // Set cache headers
      res.set('Cache-Control', CACHE_CONTROL.ACTIVITIES);
      res.set('ETag', generateETag(result));

      sendSuccess(res, result);
    } catch (error: unknown) {
      if (error instanceof ActivityNotFoundError) {
        return void sendError(res, error.message, 404);
      }
      if (error instanceof ActivityAccessDeniedError) {
        return void sendError(res, error.message, 403);
      }
      throw error;
    }
  }
);

/**
 * GET /activity-stats
 *
 * Get activity aggregations (counts by source or temporal bucket).
 * This is an aggregation endpoint, not a resource endpoint.
 */
export const getActivityStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return void sendError(res, 'User not authenticated', 401);
    }

    // Validate query params
    const queryResult = getActivityStatsSchema.safeParse({
      groupBy: req.query.groupBy,
      timezone: req.query.timezone || 'UTC'
    });

    if (!queryResult.success) {
      const errors = queryResult.error.issues.map(i => i.message).join(', ');
      return void sendError(res, `Validation failed: ${errors}`, 400);
    }

    const { groupBy, timezone }: GetActivityStatsInput = queryResult.data;

    try {
      const service = getActivityService(req);
      const result = await service.getActivityStats(userId, groupBy, timezone);

      // Set cache headers (stats can be cached longer)
      res.set('Cache-Control', CACHE_CONTROL.STATS);
      res.set('ETag', generateETag(result));

      sendSuccess(res, result);
    } catch (error: unknown) {
      if (error instanceof ActivityNotFoundError) {
        return void sendError(res, error.message, 404);
      }
      throw error;
    }
  }
);

// =============================================================================
// TYPE EXTENSIONS
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      activityService?: ActivityService;
    }
  }
}
