import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  changePassword,
  testPrisma
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes (with rate limiting)
router.post('/register', authRateLimiter, register);
router.post('/login', /* authRateLimiter, */ login); // Temporarily disabled for debugging
router.post('/refresh', authRateLimiter, refreshToken);
router.get('/test-prisma', testPrisma); // Debug endpoint

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);
router.put('/change-password', authenticate, changePassword);

export default router;