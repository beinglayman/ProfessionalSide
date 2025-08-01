import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requirePermission, requireSuperAdmin } from '../middleware/admin.middleware';
import {
  getDashboardOverview,
  getSystemMetrics,
  getUserMetrics,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  getContentMetrics,
  getSystemHealth,
  getSystemStatistics,
  getAdminActivityLogs,
  getWorkspaces,
  deleteJournalEntry,
  getAdminPermissions
} from '../controllers/admin.controller';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard overview
 * @access  Private (Admin)
 */
router.get('/dashboard', getDashboardOverview);

/**
 * @route   GET /api/v1/admin/permissions
 * @desc    Get current admin's permissions
 * @access  Private (Admin)
 */
router.get('/permissions', getAdminPermissions);

/**
 * @route   GET /api/v1/admin/system/metrics
 * @desc    Get system metrics
 * @access  Private (Admin)
 */
router.get('/system/metrics', requirePermission('system', 'read'), getSystemMetrics);

/**
 * @route   GET /api/v1/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get('/system/health', requirePermission('system', 'read'), getSystemHealth);

/**
 * @route   GET /api/v1/admin/system/statistics
 * @desc    Get system statistics for charts
 * @access  Private (Admin)
 * @query   period - daily, weekly, or monthly
 */
router.get('/system/statistics', requirePermission('analytics', 'read'), getSystemStatistics);

/**
 * @route   GET /api/v1/admin/users/metrics
 * @desc    Get user metrics
 * @access  Private (Admin)
 */
router.get('/users/metrics', requirePermission('users', 'read'), getUserMetrics);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination and search
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search term
 * @query   status - active, inactive, or all
 */
router.get('/users', requirePermission('users', 'read'), getUsers);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get user details by ID
 * @access  Private (Admin)
 * @params  userId - User ID
 */
router.get('/users/:userId', requirePermission('users', 'read'), getUserById);

/**
 * @route   PUT /api/v1/admin/users/:userId
 * @desc    Update user information
 * @access  Private (Admin)
 * @params  userId - User ID
 * @body    { name?, email?, isActive?, title?, company? }
 */
router.put('/users/:userId', requirePermission('users', 'update'), updateUser);

/**
 * @route   POST /api/v1/admin/users/:userId/toggle-status
 * @desc    Suspend or activate user
 * @access  Private (Admin)
 * @params  userId - User ID
 */
router.post('/users/:userId/toggle-status', requirePermission('users', 'suspend'), toggleUserStatus);

/**
 * @route   GET /api/v1/admin/content/metrics
 * @desc    Get content metrics
 * @access  Private (Admin)
 */
router.get('/content/metrics', requirePermission('journal_entries', 'read'), getContentMetrics);

/**
 * @route   GET /api/v1/admin/workspaces
 * @desc    Get all workspaces with admin view
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search term
 */
router.get('/workspaces', requirePermission('workspaces', 'read'), getWorkspaces);

/**
 * @route   DELETE /api/v1/admin/journal-entries/:entryId
 * @desc    Delete journal entry (admin action)
 * @access  Private (Admin)
 * @params  entryId - Journal entry ID
 */
router.delete('/journal-entries/:entryId', requirePermission('journal_entries', 'delete'), deleteJournalEntry);

/**
 * @route   GET /api/v1/admin/activity-logs
 * @desc    Get admin activity logs
 * @access  Private (Super Admin)
 * @query   limit - Number of logs to retrieve
 */
router.get('/activity-logs', requireSuperAdmin, getAdminActivityLogs);

export default router;