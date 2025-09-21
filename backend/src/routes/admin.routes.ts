import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requirePermission, requireSuperAdmin } from '../middleware/admin.middleware';
import {
  // New invitation system endpoints
  getSystemSettings,
  updateSystemSettings,
  toggleInvitationMode,
  getAdminDashboard,
  grantInvitations,
  getUsers,
  getReplenishmentHistory,
  getReplenishmentPreview,
  triggerManualReplenishment,
  requireAdmin as requireAdminMiddleware
} from '../controllers/admin.controller';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination and search
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search term
 * @query   isAdmin - filter by admin status
 */
router.get('/users', getUsers);

// Invitation system admin endpoints

/**
 * @route   GET /api/v1/admin/system-settings
 * @desc    Get current system settings
 * @access  Private (Admin)
 */
router.get('/system-settings', getSystemSettings);

/**
 * @route   PUT /api/v1/admin/system-settings
 * @desc    Update system settings
 * @access  Private (Admin)
 */
router.put('/system-settings', updateSystemSettings);

/**
 * @route   POST /api/v1/admin/toggle-invitation-mode
 * @desc    Toggle invitation-only mode
 * @access  Private (Admin)
 */
router.post('/toggle-invitation-mode', toggleInvitationMode);

/**
 * @route   GET /api/v1/admin/invitation-dashboard
 * @desc    Get comprehensive admin dashboard data including invitation stats
 * @access  Private (Admin)
 */
router.get('/invitation-dashboard', getAdminDashboard);

/**
 * @route   POST /api/v1/admin/grant-invitations
 * @desc    Grant additional invitations to a user
 * @access  Private (Admin)
 * @body    { userId: string, amount: number }
 */
router.post('/grant-invitations', grantInvitations);

/**
 * @route   GET /api/v1/admin/replenishment-history
 * @desc    Get invitation replenishment history
 * @access  Private (Admin)
 * @query   limit - Number of history entries to return
 */
router.get('/replenishment-history', getReplenishmentHistory);

/**
 * @route   GET /api/v1/admin/replenishment-preview
 * @desc    Get preview of users eligible for replenishment
 * @access  Private (Admin)
 */
router.get('/replenishment-preview', getReplenishmentPreview);

/**
 * @route   POST /api/v1/admin/trigger-replenishment
 * @desc    Manually trigger invitation quota replenishment
 * @access  Private (Admin)
 */
router.post('/trigger-replenishment', triggerManualReplenishment);

export default router;