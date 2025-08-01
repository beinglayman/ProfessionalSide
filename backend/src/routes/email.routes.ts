import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  testEmailConfig,
  sendTestEmail,
  sendNotificationEmail,
  sendWelcomeEmail,
  triggerDailyDigest,
  triggerWeeklyDigest,
  getQueueStats,
  updateNotificationPreferences,
  getNotificationPreferences,
  unsubscribeFromEmails
} from '../controllers/email.controller';

const router = Router();

/**
 * @route   GET /api/v1/email/test-config
 * @desc    Test email configuration
 * @access  Private (Admin)
 */
router.get('/test-config', authenticate, testEmailConfig);

/**
 * @route   POST /api/v1/email/test
 * @desc    Send test email
 * @access  Private (Admin)
 * @body    { to: string, subject: string, message: string }
 */
router.post('/test', authenticate, sendTestEmail);

/**
 * @route   POST /api/v1/email/notification
 * @desc    Send notification email manually
 * @access  Private
 * @body    {
 *   recipientId: string,
 *   type: 'like' | 'comment' | 'mention' | 'workspace_invite' | 'achievement' | 'system',
 *   data: object,
 *   metadata?: object
 * }
 */
router.post('/notification', authenticate, sendNotificationEmail);

/**
 * @route   POST /api/v1/email/welcome/:userId
 * @desc    Send welcome email to new user
 * @access  Private (Admin)
 * @params  userId - ID of the user to send welcome email to
 */
router.post('/welcome/:userId', authenticate, sendWelcomeEmail);

/**
 * @route   POST /api/v1/email/digest/daily
 * @desc    Trigger daily digest emails
 * @access  Private (Admin)
 */
router.post('/digest/daily', authenticate, triggerDailyDigest);

/**
 * @route   POST /api/v1/email/digest/weekly
 * @desc    Trigger weekly digest emails
 * @access  Private (Admin)
 */
router.post('/digest/weekly', authenticate, triggerWeeklyDigest);

/**
 * @route   GET /api/v1/email/queue/stats
 * @desc    Get notification queue statistics
 * @access  Private (Admin)
 */
router.get('/queue/stats', authenticate, getQueueStats);

/**
 * @route   GET /api/v1/email/preferences
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get('/preferences', authenticate, getNotificationPreferences);

/**
 * @route   PUT /api/v1/email/preferences
 * @desc    Update user notification preferences
 * @access  Private
 * @body    {
 *   emailNotifications?: boolean,
 *   pushNotifications?: boolean,
 *   likes?: boolean,
 *   comments?: boolean,
 *   mentions?: boolean,
 *   workspaceInvites?: boolean,
 *   achievements?: boolean,
 *   systemUpdates?: boolean,
 *   digestFrequency?: 'NONE' | 'DAILY' | 'WEEKLY',
 *   quietHoursStart?: string,
 *   quietHoursEnd?: string
 * }
 */
router.put('/preferences', authenticate, updateNotificationPreferences);

/**
 * @route   GET /api/v1/email/unsubscribe/:token
 * @desc    Unsubscribe from email notifications
 * @access  Public
 * @params  token - Unsubscribe token
 */
router.get('/unsubscribe/:token', unsubscribeFromEmails);

export default router;