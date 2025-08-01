import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requirePermission, requireSuperAdmin } from '../middleware/admin.middleware';
import { skipAudit } from '../middleware/audit.middleware';
import {
  getAuditLogs,
  getUserAuditLogs,
  getSecurityEvents,
  resolveSecurityEvent,
  getSystemLogs,
  getAuditStatistics,
  cleanupOldLogs,
  exportAuditLogs
} from '../controllers/audit.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Skip audit logging for audit endpoints to prevent infinite loops
router.use(skipAudit);

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs (admin only)
 * @access  Private (Admin)
 * @query   userId, adminId, entityType, action, startDate, endDate, page, limit
 */
router.get('/logs', requireAdmin, requirePermission('admin', 'read'), getAuditLogs);

/**
 * @route   GET /api/v1/audit/logs/user
 * @desc    Get current user's audit logs
 * @access  Private
 * @query   action, entityType, startDate, endDate, page, limit
 */
router.get('/logs/user', getUserAuditLogs);

/**
 * @route   GET /api/v1/audit/security-events
 * @desc    Get security events (admin only)
 * @access  Private (Admin)
 * @query   userId, type, severity, resolved, startDate, endDate, page, limit
 */
router.get('/security-events', requireAdmin, requirePermission('admin', 'read'), getSecurityEvents);

/**
 * @route   PUT /api/v1/audit/security-events/:eventId/resolve
 * @desc    Resolve a security event
 * @access  Private (Admin)
 * @params  eventId - Security event ID
 * @body    { resolution: string }
 */
router.put('/security-events/:eventId/resolve', requireAdmin, requirePermission('admin', 'update'), resolveSecurityEvent);

/**
 * @route   GET /api/v1/audit/system-logs
 * @desc    Get system logs (admin only)
 * @access  Private (Admin)
 * @query   level, module, startDate, endDate, page, limit
 */
router.get('/system-logs', requireAdmin, requirePermission('system', 'read'), getSystemLogs);

/**
 * @route   GET /api/v1/audit/statistics
 * @desc    Get audit statistics
 * @access  Private (Admin)
 * @query   startDate, endDate
 */
router.get('/statistics', requireAdmin, requirePermission('analytics', 'read'), getAuditStatistics);

/**
 * @route   GET /api/v1/audit/export
 * @desc    Export audit logs
 * @access  Private (Admin)
 * @query   startDate, endDate, format (json|csv)
 */
router.get('/export', requireAdmin, requirePermission('admin', 'read'), exportAuditLogs);

/**
 * @route   POST /api/v1/audit/cleanup
 * @desc    Clean up old audit logs
 * @access  Private (Super Admin)
 * @query   retentionDays - Number of days to retain (minimum 30)
 */
router.post('/cleanup', requireSuperAdmin, cleanupOldLogs);

export default router;