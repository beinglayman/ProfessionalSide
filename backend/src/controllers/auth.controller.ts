import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  comparePassword,
  generateTokenPair,
  verifyToken
} from '../utils/auth.utils';
import { EmailService } from '../services/email.service';
import { InvitationService } from '../services/invitation.service';
import { SystemSettingsService } from '../services/system-settings.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput
} from '../types/auth.types';

const emailService = new EmailService();
const invitationService = new InvitationService();
const systemSettingsService = new SystemSettingsService();

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData: RegisterInput = registerSchema.parse(req.body);
  const { invitationToken } = req.body;
  
  // Check if invitation-only mode is enabled
  const invitationRequired = await systemSettingsService.isInvitationOnlyMode();
  
  // Check if admin email (for auto-admin assignment)
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const isAdminEmail = adminEmails.includes(validatedData.email);
  
  // Validate invitation requirement
  if (invitationRequired && !isAdminEmail && !invitationToken) {
    return sendError(res, 'Valid invitation required', 403);
  }
  
  let invitation = null;
  if (invitationRequired && invitationToken) {
    // Validate invitation token
    const tokenValidation = await invitationService.validateInvitationToken(invitationToken);
    if (!tokenValidation.valid) {
      return sendError(res, 'Invalid or expired invitation', 400);
    }
    
    if (tokenValidation.email !== validatedData.email) {
      return sendError(res, 'Invitation email does not match registration email', 400);
    }
    
    // Get full invitation details for later processing
    invitation = await prisma.platformInvitation.findFirst({
      where: { token: invitationToken }
    });
  }
  
  // Check if user already exists
  console.log('🔍 Attempting to check existing user with email:', validatedData.email);
  console.log('🔍 Prisma client status:', !!prisma, typeof prisma);

  const existingUser = await prisma.user.findUnique({
    where: { email: validatedData.email }
  });

  console.log('✅ User check completed:', !!existingUser);
  
  if (existingUser) {
    return sendError(res, 'User with this email already exists', 409);
  }
  
  // Hash password
  const hashedPassword = await hashPassword(validatedData.password);
  
  // Create user with invitation tracking
  const user = await prisma.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      title: validatedData.title,
      company: validatedData.company,
      location: validatedData.location,
      isAdmin: isAdminEmail, // Auto-assign admin for admin emails
      invitationsRemaining: isAdminEmail ? 999 : 10, // Unlimited for admins
      profile: {
        create: {
          profileCompleteness: 40 // Base completeness for required fields
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      company: true,
      location: true,
      avatar: true,
      isAdmin: true,
      invitationsRemaining: true,
      createdAt: true,
      profile: {
        select: {
          profileCompleteness: true,
          joinedDate: true
        }
      }
    }
  });
  
  // If invitation was used, mark it as accepted
  if (invitation) {
    try {
      await invitationService.acceptInvitation(invitationToken, user.id);
    } catch (error) {
      console.error('Failed to process invitation acceptance:', error);
      // Don't fail registration if invitation processing fails
    }
  }
  
  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);
  
  // Store refresh token
  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });
  
  // Send welcome email asynchronously (don't block registration)
  emailService.sendWelcomeEmail(user.id).then(() => {
    // Mark welcome email as sent
    return prisma.user.update({
      where: { id: user.id },
      data: { welcomeEmailSent: true }
    });
  }).catch(error => {
    console.error(`Failed to send welcome email to user ${user.id}:`, error);
  });
  
  // Log successful registration
  if (isAdminEmail) {
    console.log(`🔑 Admin user registered: ${user.email}`);
  } else if (invitation) {
    console.log(`📨 Invited user registered: ${user.email}`);
  } else {
    console.log(`👤 User registered: ${user.email}`);
  }
  
  sendSuccess(res, {
    user,
    ...tokens
  }, 'User registered successfully', 201);
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData: LoginInput = loginSchema.parse(req.body);
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: validatedData.email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      title: true,
      company: true,
      location: true,
      avatar: true,
      isActive: true,
      profile: {
        select: {
          profileCompleteness: true,
          lastActiveAt: true
        }
      }
    }
  });
  
  if (!user) {
    return sendError(res, 'Invalid email or password', 401);
  }
  
  if (!user.isActive) {
    return sendError(res, 'Account is deactivated', 401);
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(validatedData.password, user.password);
  if (!isPasswordValid) {
    return sendError(res, 'Invalid email or password', 401);
  }
  
  // Update last active
  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { lastActiveAt: new Date() }
  });
  
  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);
  
  // Store refresh token
  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });
  
  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  
  sendSuccess(res, {
    user: userWithoutPassword,
    ...tokens
  }, 'Login successful');
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData: RefreshTokenInput = refreshTokenSchema.parse(req.body);
  
  // Verify refresh token
  const decoded = verifyToken(validatedData.refreshToken);
  
  if (decoded.type !== 'refresh') {
    return sendError(res, 'Invalid token type', 401);
  }
  
  // Check if refresh token exists in database
  const session = await prisma.userSession.findUnique({
    where: { refreshToken: validatedData.refreshToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true
        }
      }
    }
  });
  
  if (!session || session.expiresAt < new Date()) {
    return sendError(res, 'Invalid or expired refresh token', 401);
  }
  
  if (!session.user.isActive) {
    return sendError(res, 'Account is deactivated', 401);
  }
  
  // Generate new tokens
  const tokens = generateTokenPair(session.user.id, session.user.email);
  
  // Update session with new refresh token
  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });
  
  sendSuccess(res, tokens, 'Token refreshed successfully');
});

/**
 * Get current user profile
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      company: true,
      location: true,
      avatar: true,
      bio: true,
      welcomeEmailSent: true,
      createdAt: true,
      profile: {
        select: {
          profileCompleteness: true,
          joinedDate: true,
          lastActiveAt: true,
          showEmail: true,
          showLocation: true,
          showCompany: true
        }
      },
      workspaceMemberships: {
        where: { isActive: true },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      },
      skills: {
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      }
    }
  });
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  sendSuccess(res, user);
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const refreshToken = req.body.refreshToken;
  
  if (refreshToken) {
    // Remove specific session
    await prisma.userSession.deleteMany({
      where: {
        userId,
        refreshToken
      }
    });
  } else if (userId) {
    // Remove all sessions for user
    await prisma.userSession.deleteMany({
      where: { userId }
    });
  }
  
  sendSuccess(res, null, 'Logout successful');
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }
  
  // Validate input
  const validatedData: ChangePasswordInput = changePasswordSchema.parse(req.body);
  
  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });
  
  if (!user) {
    return sendError(res, 'User not found', 404);
  }
  
  // Verify current password
  const isCurrentPasswordValid = await comparePassword(
    validatedData.currentPassword, 
    user.password
  );
  
  if (!isCurrentPasswordValid) {
    return sendError(res, 'Current password is incorrect', 400);
  }
  
  // Hash new password
  const hashedNewPassword = await hashPassword(validatedData.newPassword);
  
  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword }
  });
  
  // Invalidate all sessions (force re-login)
  await prisma.userSession.deleteMany({
    where: { userId }
  });
  
  sendSuccess(res, null, 'Password changed successfully');
});