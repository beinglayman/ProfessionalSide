import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  startExport,
  getExportStatus,
  downloadExport,
  listUserExports,
  deleteExport,
  getExportStats,
  cleanupExpiredExports
} from '../controllers/export.controller';

const router = Router();

/**
 * @route   POST /api/v1/export
 * @desc    Start a new data export
 * @access  Private
 * @body    {
 *   format: 'json' | 'csv' | 'pdf',
 *   type: 'all' | 'journal_entries' | 'profile' | 'network' | 'achievements' | 'goals',
 *   dateRange?: { from: string, to: string },
 *   filters?: {
 *     workspaceId?: string,
 *     category?: string,
 *     tags?: string[],
 *     includePrivate?: boolean
 *   }
 * }
 */
router.post('/', authenticate, startExport);

/**
 * @route   GET /api/v1/export
 * @desc    List user's exports
 * @access  Private
 */
router.get('/', authenticate, listUserExports);

/**
 * @route   GET /api/v1/export/stats
 * @desc    Get export statistics for the user
 * @access  Private
 */
router.get('/stats', authenticate, getExportStats);

/**
 * @route   GET /api/v1/export/:exportId
 * @desc    Get export status by ID
 * @access  Private
 * @params  exportId - ID of the export to check
 */
router.get('/:exportId', authenticate, getExportStatus);

/**
 * @route   GET /api/v1/export/:exportId/download
 * @desc    Download export file
 * @access  Private
 * @params  exportId - ID of the export to download
 */
router.get('/:exportId/download', authenticate, downloadExport);

/**
 * @route   DELETE /api/v1/export/:exportId
 * @desc    Delete an export
 * @access  Private
 * @params  exportId - ID of the export to delete
 */
router.delete('/:exportId', authenticate, deleteExport);

/**
 * @route   POST /api/v1/export/cleanup
 * @desc    Cleanup expired exports (admin only)
 * @access  Private (Admin)
 */
router.post('/cleanup', authenticate, cleanupExpiredExports);

export default router;