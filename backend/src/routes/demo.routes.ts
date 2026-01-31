/**
 * Demo Routes
 *
 * API routes for demo mode functionality.
 * These endpoints seed and manage demo data separately from real user data.
 *
 * NOTE: For reading journal entries in demo mode, use the unified endpoint:
 *   GET /api/v1/journal/feed with header X-Demo-Mode: true
 * The /demo/journal-entries endpoint is deprecated.
 */

import { Router } from 'express';
import {
  syncDemoData,
  clearDemoData,
  getDemoJournalEntries,
  updateDemoJournalEntryActivities,
  updateDemoClusterActivities,
  regenerateDemoJournalNarrative,
} from '../controllers/career-stories.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All demo routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/demo/sync
 * Seed demo data (activities, clusters, journal entries) for the user.
 * Called when user clicks Sync button in demo mode.
 */
router.post('/sync', syncDemoData);

/**
 * DELETE /api/v1/demo/clear
 * Clear all demo data for the user.
 */
router.delete('/clear', clearDemoData);

/**
 * GET /api/v1/demo/journal-entries
 * @deprecated Use GET /api/v1/journal/feed with X-Demo-Mode header instead.
 * This endpoint now redirects to the unified JournalService internally.
 */
router.get('/journal-entries', getDemoJournalEntries);

/**
 * PATCH /api/v1/demo/journal-entries/:id/activities
 * Update activity IDs for a demo journal entry.
 * Sets groupingMethod to 'manual'.
 */
router.patch('/journal-entries/:id/activities', updateDemoJournalEntryActivities);

/**
 * PATCH /api/v1/demo/clusters/:id/activities
 * Update activity assignments for a demo cluster.
 * Sets groupingMethod to 'manual'.
 */
router.patch('/clusters/:id/activities', updateDemoClusterActivities);

/**
 * POST /api/v1/demo/journal-entries/:id/regenerate
 * Regenerate narrative for a demo journal entry using LLM.
 */
router.post('/journal-entries/:id/regenerate', regenerateDemoJournalNarrative);

export default router;
