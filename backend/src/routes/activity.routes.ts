import { Router, Request, Response, NextFunction } from 'express';
import {
  getJournalEntryActivities,
  getActivityStats
} from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isDemoModeRequest } from '../middleware/demo-mode.middleware';
import { ActivityService } from '../services/activity.service';

const router = Router();

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Attach request-scoped ActivityService based on X-Demo-Mode header.
 * Note: For journal entry activities, the service will use the journal entry's
 * sourceMode instead of the header, but we still attach for stats endpoint.
 */
function attachActivityService(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const isDemoMode = isDemoModeRequest(req);
  req.activityService = new ActivityService(isDemoMode);
  next();
}

// =============================================================================
// ROUTES
// =============================================================================

// All activity routes require authentication
router.use(authenticate);
router.use(attachActivityService);

/**
 * GET /api/v1/journal-entries/:id/activities
 *
 * Fetch activities for a specific journal entry (sub-resource pattern).
 * The sourceMode is derived from the journal entry, not the header.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - source: string (optional, filter by source)
 */
router.get('/journal-entries/:id/activities', getJournalEntryActivities);

/**
 * GET /api/v1/activity-stats
 *
 * Get activity aggregations (counts, not actual activities).
 * Uses X-Demo-Mode header to determine which table to query.
 *
 * Query params:
 * - groupBy: 'source' | 'temporal' (required)
 * - timezone: string (default: 'UTC', only for groupBy=temporal)
 */
router.get('/activity-stats', getActivityStats);

export default router;
