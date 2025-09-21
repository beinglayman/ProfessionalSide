import { Router } from 'express';
import {
  createInvitationRequest,
  getPendingRequests,
  getAllRequests,
  reviewInvitationRequest,
  bulkReviewRequests,
  getRequestStats,
  getRequestsEnabled
} from '../controllers/invitation-request.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes
router.post('/create', authRateLimiter, createInvitationRequest);
router.get('/enabled', getRequestsEnabled);

// Admin routes (auth middleware will check for admin status in controller)
router.get('/pending', authenticate, getPendingRequests);
router.get('/all', authenticate, getAllRequests);
router.post('/review/:requestId', authenticate, reviewInvitationRequest);
router.post('/bulk-review', authenticate, bulkReviewRequests);
router.get('/stats', authenticate, getRequestStats);

export default router;