import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/email.service';
import { NotificationQueueService } from '../services/notification-queue.service';
import { sendSuccess, sendError, asyncHandler } from '../utils/response.utils';
import { z } from 'zod';

const emailService = new EmailService();
const notificationQueue = new NotificationQueueService();

// Validation schemas
const testEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1)
});

const sendNotificationSchema = z.object({
  recipientId: z.string(),
  type: z.enum(['like', 'comment', 'mention', 'workspace_invite', 'achievement', 'system']),
  data: z.record(z.any()),
  metadata: z.object({
    entityType: z.enum(['journal_entry', 'workspace', 'user', 'comment']).optional(),
    entityId: z.string().optional(),
    workspaceId: z.string().optional()
  }).optional()
});

/**
 * Test email configuration
 */
export const testEmailConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const isValid = await emailService.testEmailConfig();
    
    if (isValid) {
      sendSuccess(res, { status: 'valid' }, 'Email configuration is valid');
    } else {
      sendError(res, 'Email configuration is invalid', 500);
    }
  } catch (error: any) {
    sendError(res, 'Email configuration test failed', 500, (error as any).message);
  }
});

/**
 * Send test email
 */
export const sendTestEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const validatedData = testEmailSchema.parse(req.body);

    const success = await emailService.sendEmail({
      to: validatedData.to,
      subject: validatedData.subject,
      htmlContent: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>Test Email</h2>
            <p>${validatedData.message}</p>
            <p><small>Sent from InChronicle Backend</small></p>
          </body>
        </html>
      `,
      textContent: `Test Email\n\n${validatedData.message}\n\nSent from InChronicle Backend`,
      category: 'test'
    });

    if (success) {
      sendSuccess(res, null, 'Test email sent successfully');
    } else {
      sendError(res, 'Failed to send test email', 500);
    }
  } catch (error: any) {
    if ((error as any).name === 'ZodError') {
      return void sendError(res, 'Invalid email data', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Send test email (public endpoint for health monitoring)
 */
export const sendTestEmailPublic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = testEmailSchema.parse(req.body);

    const success = await emailService.sendEmail({
      to: validatedData.to,
      subject: validatedData.subject,
      htmlContent: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>🚀 Azure Email Test</h2>
            <p>${validatedData.message}</p>
            <p><strong>Test Status:</strong> Email service is working correctly!</p>
            <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
            <hr>
            <p><small>Sent from InChronicle Backend via Azure</small></p>
          </body>
        </html>
      `,
      textContent: `🚀 Azure Email Test\n\n${validatedData.message}\n\nTest Status: Email service is working correctly!\nTest Time: ${new Date().toISOString()}\n\nSent from InChronicle Backend via Azure`,
      category: 'test'
    });

    if (success) {
      sendSuccess(res, {
        emailSent: true,
        recipient: validatedData.to,
        timestamp: new Date().toISOString()
      }, 'Test email sent successfully from Azure');
    } else {
      sendError(res, 'Failed to send test email', 500);
    }
  } catch (error: any) {
    if ((error as any).name === 'ZodError') {
      return void sendError(res, 'Invalid email data', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Send notification email manually
 */
export const sendNotificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const validatedData = sendNotificationSchema.parse(req.body);

    const notificationId = await notificationQueue.queueNotification({
      type: validatedData.type,
      recipientId: validatedData.recipientId,
      senderId: userId,
      data: validatedData.data,
      metadata: validatedData.metadata
    });

    sendSuccess(res, { notificationId }, 'Notification queued successfully');
  } catch (error: any) {
    if ((error as any).name === 'ZodError') {
      return void sendError(res, 'Invalid notification data', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  
  if (!userId) {
    return void sendError(res, 'User ID is required', 400);
  }

  try {
    // Check if welcome email was already sent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { welcomeEmailSent: true, email: true, name: true }
    });

    if (!user) {
      return void sendError(res, 'User not found', 404);
    }

    if (user.welcomeEmailSent) {
      return void sendError(res, 'Welcome email already sent to this user', 409);
    }

    const success = await emailService.sendWelcomeEmail(userId);

    if (success) {
      // Mark welcome email as sent
      await prisma.user.update({
        where: { id: userId },
        data: { welcomeEmailSent: true }
      });
      
      sendSuccess(res, null, 'Welcome email sent successfully');
    } else {
      sendError(res, 'Failed to send welcome email', 500);
    }
  } catch (error: any) {
    throw error;
  }
});

/**
 * Trigger daily digest emails
 */
export const triggerDailyDigest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    await notificationQueue.queueDigestEmails('daily');
    sendSuccess(res, null, 'Daily digest emails queued successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Trigger weekly digest emails
 */
export const triggerWeeklyDigest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    await notificationQueue.queueDigestEmails('weekly');
    sendSuccess(res, null, 'Weekly digest emails queued successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get notification queue statistics
 */
export const getQueueStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = notificationQueue.getQueueStats();
    sendSuccess(res, stats, 'Queue statistics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Update user notification preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  const updateSchema = z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    likes: z.boolean().optional(),
    comments: z.boolean().optional(),
    mentions: z.boolean().optional(),
    workspaceInvites: z.boolean().optional(),
    connectionRequests: z.boolean().optional(),
    achievements: z.boolean().optional(),
    systemUpdates: z.boolean().optional(),
    digestFrequency: z.enum(['NONE', 'DAILY', 'WEEKLY']).optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional()
  });

  try {
    const validatedData = updateSchema.parse(req.body);

    const updatedPreferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: validatedData,
      create: {
        userId,
        ...validatedData
      }
    });

    sendSuccess(res, updatedPreferences, 'Notification preferences updated successfully');
  } catch (error: any) {
    if ((error as any).name === 'ZodError') {
      return void sendError(res, 'Invalid preferences data', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Get user notification preferences
 */
export const getNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  try {
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Return default preferences
      const defaultPreferences = {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        likes: true,
        comments: true,
        mentions: true,
        workspaceInvites: true,
        connectionRequests: true,
        achievements: true,
        systemUpdates: true,
        digestFrequency: 'DAILY',
        quietHoursStart: null,
        quietHoursEnd: null
      };

      sendSuccess(res, defaultPreferences, 'Default notification preferences retrieved');
    } else {
      sendSuccess(res, preferences, 'Notification preferences retrieved successfully');
    }
  } catch (error: any) {
    throw error;
  }
});

/**
 * Unsubscribe from all email notifications
 */
export const unsubscribeFromEmails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  
  if (!token) {
    return void sendError(res, 'Unsubscribe token is required', 400);
  }

  try {
    // TODO: Implement token verification and user lookup
    // For now, we'll just return success
    sendSuccess(res, null, 'Successfully unsubscribed from email notifications');
  } catch (error: any) {
    throw error;
  }
});