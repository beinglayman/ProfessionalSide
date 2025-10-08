import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess, sendError, sendPaginated, asyncHandler } from '../utils/response.utils';
import {
  updateProfileSchema,
  addUserSkillSchema,
  updateUserSkillSchema,
  searchUsersSchema,
  getUserProfileSchema,
  UpdateProfileInput,
  AddUserSkillInput,
  UpdateUserSkillInput,
  SearchUsersInput,
  GetUserProfileInput
} from '../types/user.types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// Note: Using Azure Files for persistent storage

const userService = new UserService();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use Azure Files mount path if available, fallback to local
    const baseUploadPath = process.env.UPLOAD_VOLUME_PATH || 'uploads';
    const uploadDir = path.join(baseUploadPath, 'avatars');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id;
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Export upload middleware for Azure Files
export const uploadAvatarMiddleware = upload.single('avatar');

/**
 * Get current user's full profile
 */
export const getMyProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const profile = await userService.getUserProfile(userId, userId);
  sendSuccess(res, profile);
});

/**
 * Get user profile by ID
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId }: GetUserProfileInput = getUserProfileSchema.parse(req.params);
  const requestingUserId = req.user?.id;

  try {
    const profile = await userService.getUserProfile(userId, requestingUserId);
    sendSuccess(res, profile);
  } catch (error: any) {
    if ((error as any).message === 'User not found') {
      return void sendError(res, 'User not found', 404);
    }
    throw error;
  }
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const validatedData: UpdateProfileInput = updateProfileSchema.parse(req.body);

  try {
    const updatedProfile = await userService.updateProfile(userId, validatedData);
    sendSuccess(res, updatedProfile, 'Profile updated successfully');
  } catch (error: any) {
    if ((error as any).message.includes('Invalid') || (error as any).message.includes('JSON')) {
      return void sendError(res, (error as any).message, 400);
    }
    throw error;
  }
});

/**
 * Get user skills
 */
export const getUserSkills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId || req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const skills = await userService.getUserSkills(userId);
  sendSuccess(res, skills);
});

/**
 * Add skill to user
 */
export const addUserSkill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const validatedData: AddUserSkillInput = addUserSkillSchema.parse(req.body);

  try {
    const userSkill = await userService.addUserSkill(userId, validatedData);
    sendSuccess(res, userSkill, 'Skill added successfully', 201);
  } catch (error: any) {
    if ((error as any).message === 'You already have this skill') {
      return void sendError(res, (error as any).message, 409);
    }
    throw error;
  }
});

/**
 * Update user skill
 */
export const updateUserSkill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { skillId } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!skillId) {
    return void sendError(res, 'Skill ID required', 400);
  }

  const validatedData: UpdateUserSkillInput = updateUserSkillSchema.parse(req.body);

  try {
    const userSkill = await userService.updateUserSkill(userId, skillId, validatedData);
    sendSuccess(res, userSkill, 'Skill updated successfully');
  } catch (error: any) {
    if ((error as any).message === 'Skill not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Remove user skill
 */
export const removeUserSkill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { skillId } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!skillId) {
    return void sendError(res, 'Skill ID required', 400);
  }

  try {
    await userService.removeUserSkill(userId, skillId);
    sendSuccess(res, null, 'Skill removed successfully');
  } catch (error: any) {
    if ((error as any).message === 'Skill not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Search users
 */
export const searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedData: SearchUsersInput = searchUsersSchema.parse(req.query);
  const requestingUserId = req.user?.id;

  const result = await userService.searchUsers(validatedData, requestingUserId);
  
  sendPaginated(res, result.users, result.pagination, 'Users found');
});

/**
 * Get all available skills
 */
export const getAllSkills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const skills = await userService.getAllSkills();
  sendSuccess(res, skills);
});

/**
 * Endorse user skill
 */
export const endorseUserSkill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const endorserId = req.user?.id;
  const { userId, skillId } = req.params;
  
  if (!endorserId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!userId || !skillId) {
    return void sendError(res, 'User ID and Skill ID required', 400);
  }

  try {
    const userSkill = await userService.endorseUserSkill(userId, skillId, endorserId);
    sendSuccess(res, userSkill, 'Skill endorsed successfully');
  } catch (error: any) {
    if ((error as any).message === 'You cannot endorse your own skills') {
      return void sendError(res, (error as any).message, 400);
    }
    if ((error as any).message === 'Skill not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Upload user avatar
 */
export const handleAvatarUpload = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!req.file) {
    return void sendError(res, 'No file uploaded', 400);
  }

  try {
    // Generate full avatar URL including protocol and host
    // Force HTTPS for Azure production environment
    const isProduction = process.env.NODE_ENV === 'production';
    const host = req.get('host');

    // Always use HTTPS for Azure production domains
    let baseUrl;
    if (process.env.API_BASE_URL && process.env.API_BASE_URL.startsWith('http')) {
      baseUrl = process.env.API_BASE_URL;
    } else if (host && host.includes('azurewebsites.net')) {
      // Force HTTPS for Azure domains
      baseUrl = `https://${host}`;
    } else {
      // Use detected protocol for local development, but force HTTP for localhost
      let protocol = isProduction ? 'https' : req.protocol;
      if (host && host.includes('localhost')) {
        protocol = 'http';
      }
      baseUrl = `${protocol}://${host}`;
    }
    
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    
    // Update user's avatar in database
    await userService.updateProfile(userId, { avatar: avatarUrl });
    
    sendSuccess(res, { avatarUrl }, 'Avatar uploaded successfully');
  } catch (error: any) {
    // Clean up uploaded file if database update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error;
  }
});

/**
 * Request data export
 */
export const requestDataExport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const exportData = await userService.requestDataExport(userId, req.body);
    sendSuccess(res, exportData, 'Data export requested successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Check export status
 */
export const checkExportStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { exportId } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!exportId) {
    return void sendError(res, 'Export ID required', 400);
  }

  try {
    const status = await userService.checkExportStatus(userId, exportId);
    sendSuccess(res, status);
  } catch (error: any) {
    if ((error as any).message === 'Export not found') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Download export data
 */
export const downloadExportData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { exportId } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!exportId) {
    return void sendError(res, 'Export ID required', 400);
  }

  try {
    const downloadInfo = await userService.downloadExportData(userId, exportId);
    
    // Set headers for JSON file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
    
    // Decode base64 data and send as JSON
    const jsonData = Buffer.from(downloadInfo.filePath, 'base64').toString('utf-8');
    res.send(jsonData);
  } catch (error: any) {
    if ((error as any).message === 'Export not found' || (error as any).message === 'Export not ready') {
      return void sendError(res, (error as any).message, 404);
    }
    throw error;
  }
});

/**
 * Delete user profile
 */
export const deleteUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { confirmText } = req.body;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (confirmText !== 'DELETE MY PROFILE') {
    return void sendError(res, 'Invalid confirmation text', 400);
  }

  try {
    await userService.deleteUserProfile(userId);
    sendSuccess(res, null, 'Profile deleted successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get privacy settings
 */
export const getPrivacySettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const settings = await userService.getPrivacySettings(userId);
    sendSuccess(res, settings);
  } catch (error: any) {
    throw error;
  }
});

/**
 * Update privacy settings
 */
export const updatePrivacySettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const settings = await userService.updatePrivacySettings(userId, req.body);
    sendSuccess(res, settings, 'Privacy settings updated successfully');
  } catch (error: any) {
    throw error;
  }
});