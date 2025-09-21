import { Router } from 'express';
import {
  createInvitation,
  getInvitationQuota,
  getInvitationHistory,
  validateInvitationToken,
  getPlatformInvitationStats,
  acceptInvitation,
  getSystemSettings,
  expireOldInvitations
} from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes
router.get('/validate/:token', validateInvitationToken);
router.get('/system-settings', getSystemSettings);
router.post('/expire-old', expireOldInvitations); // Cron endpoint with API key

// Protected routes
router.post('/create', authenticate, authRateLimiter, createInvitation);
router.get('/quota', authenticate, getInvitationQuota);
router.get('/history', authenticate, getInvitationHistory);
router.post('/accept/:token', authenticate, acceptInvitation);

// Admin routes (auth middleware will check for admin status in controller)
router.get('/platform-stats', authenticate, getPlatformInvitationStats);

export default router;