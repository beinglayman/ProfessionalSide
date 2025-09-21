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
  getPrivacySettings,
  updatePrivacySettings,
  checkProfileUrlAvailability,
  updateUserProfileUrlController,
  getUserProfileByUrl
} from '../controllers/user.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (with optional auth)
router.get('/search', optionalAuth, searchUsers);
router.get('/skills/all', getAllSkills);
router.get('/by-url/:profileUrl', optionalAuth, getUserProfileByUrl);
router.get('/:userId', optionalAuth, getUserProfile);
router.get('/:userId/skills', getUserSkills);

// Protected routes (require authentication)
router.use(authenticate);

// Profile management
router.get('/profile/me', getMyProfile);
router.put('/profile', updateProfile);
router.post('/avatar', uploadAvatarMiddleware, handleAvatarUpload);

// Skills management
router.get('/skills/my', getUserSkills);
router.post('/skills', addUserSkill);
router.put('/skills/:skillId', updateUserSkill);
router.delete('/skills/:skillId', removeUserSkill);

// Social features
router.post('/:userId/skills/:skillId/endorse', endorseUserSkill);

// Privacy and data management
router.get('/privacy-settings', getPrivacySettings);
router.put('/privacy-settings', updatePrivacySettings);
router.post('/export-data', requestDataExport);
router.get('/export-data/:exportId/status', checkExportStatus);
router.get('/export-data/:exportId/download', downloadExportData);
router.delete('/profile', deleteUserProfile);

// Profile URL management
router.get('/profile-url/check/:url', checkProfileUrlAvailability);
router.put('/profile-url', updateUserProfileUrlController);

export default router;