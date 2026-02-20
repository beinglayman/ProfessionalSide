import { Router } from 'express';
import {
  getMyProfile,
  getUserProfile,
  updateProfile,
  getUserSkills,
  addUserSkill,
  updateUserSkill,
  removeUserSkill,
  searchUsers,
  getAllSkills,
  endorseUserSkill,
  uploadAvatarMiddleware,
  handleAvatarUpload,
  requestDataExport,
  checkExportStatus,
  downloadExportData,
  deleteUserProfile,
  hardDeleteUser,
  getPrivacySettings,
  updatePrivacySettings,
  getChronicle,
  updateProfileUrl
} from '../controllers/user.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { chronicleRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes (with optional auth) - specific routes BEFORE parametric
router.get('/search', optionalAuth, searchUsers);
router.get('/skills/all', getAllSkills);

// Public Chronicle endpoint (no auth, rate limited)
router.get('/chronicle/:slug', chronicleRateLimiter, getChronicle);

// Protected routes (require authentication) - must be BEFORE /:userId
router.get('/profile/me', authenticate, getMyProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/avatar', authenticate, uploadAvatarMiddleware, handleAvatarUpload);

// Public user profile routes (with optional auth) - AFTER specific routes
router.get('/:userId', optionalAuth, getUserProfile);
router.get('/:userId/skills', getUserSkills);

// Protected routes (require authentication)
router.use(authenticate);

// Skills management
router.get('/skills/my', getUserSkills);
router.post('/skills', addUserSkill);
router.put('/skills/:skillId', updateUserSkill);
router.delete('/skills/:skillId', removeUserSkill);

// Social features
router.post('/:userId/skills/:skillId/endorse', endorseUserSkill);

// Profile URL management
router.put('/profile-url', updateProfileUrl);

// Privacy and data management
router.get('/privacy-settings', getPrivacySettings);
router.put('/privacy-settings', updatePrivacySettings);
router.post('/export-data', requestDataExport);
router.get('/export-data/:exportId/status', checkExportStatus);
router.get('/export-data/:exportId/download', downloadExportData);
router.delete('/profile', deleteUserProfile);
router.delete('/hard-delete', hardDeleteUser);

export default router;