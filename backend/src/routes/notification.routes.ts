import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { NotificationQueueService } from '../services/notification-queue.service';
import { EmailNotificationEvent } from '../types/email.types';

const router = Router();
const notificationQueue = new NotificationQueueService();

// Helper function to check if current time is within quiet hours
function isInQuietHours(quietHoursStart?: string, quietHoursEnd?: string): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
  
  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  // Handle same-day quiet hours (e.g., 14:00 to 16:00)
  return currentTime >= startTime && currentTime <= endTime;
}

// All notification routes require authentication
router.use(authenticate);

// Validation schemas
const createNotificationSchema = z.object({
  type: z.enum(['LIKE', 'COMMENT', 'MENTION', 'WORKSPACE_INVITE', 'ACHIEVEMENT', 'SYSTEM']),
  title: z.string().min(1).max(255),
  message: z.string().max(1000).optional(),
  recipientId: z.string(),
  relatedEntityType: z.enum(['JOURNAL_ENTRY', 'WORKSPACE', 'USER', 'COMMENT']).optional(),
  relatedEntityId: z.string().optional(),
  data: z.any().optional()
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  likes: z.boolean().optional(),
  comments: z.boolean().optional(),
  mentions: z.boolean().optional(),
  workspaceInvites: z.boolean().optional(),
  achievements: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  digestFrequency: z.enum(['NONE', 'DAILY', 'WEEKLY']).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional()
});

// Get notifications for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { 
      page = '1', 
      limit = '20', 
      type, 
      isRead 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where = {
      recipientId: userId,
      ...(type && { type }),
      ...(isRead !== undefined && { isRead: isRead === 'true' })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.notification.count({ where })
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };

    sendSuccess(res, { notifications, pagination }, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('Error fetching notifications:', error);
    sendError(res, 'Failed to fetch notifications', 500);
  }
});

// Get unread notification count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });

    sendSuccess(res, { count }, 'Unread count retrieved successfully');
  } catch (error) {
    console.error('Error fetching unread count:', error);
    sendError(res, 'Failed to fetch unread count', 500);
  }
});

// Get notification preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: {
          userId,
          emailNotifications: false,
          pushNotifications: false,
          likes: true,
          comments: true,
          mentions: true,
          workspaceInvites: true,
          achievements: true,
          systemUpdates: true,
          digestFrequency: 'WEEKLY'
        }
      });
    }

    sendSuccess(res, preferences, 'Preferences retrieved successfully');
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    sendError(res, 'Failed to fetch notification preferences', 500);
  }
});

// Create notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const senderId = req.user!.id;
    const validatedData = createNotificationSchema.parse(req.body);

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: validatedData.recipientId }
    });

    if (!recipient) {
      return void sendError(res, 'Recipient not found', 404);
    }

    // Check recipient's notification preferences
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: validatedData.recipientId }
    });

    if (preferences) {
      // Check if this type of notification is enabled
      const typeEnabled = {
        'LIKE': preferences.likes,
        'COMMENT': preferences.comments,
        'MENTION': preferences.mentions,
        'WORKSPACE_INVITE': preferences.workspaceInvites,
        'ACHIEVEMENT': preferences.achievements,
        'SYSTEM': preferences.systemUpdates
      };

      if (!typeEnabled[validatedData.type]) {
        void sendSuccess(res, null, 'Notification blocked by user preferences');
      }

      // Check quiet hours for email and push notifications
      const inQuietHours = isInQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd);
      
      // Note: We still create the in-app notification, but external notifications 
      // (email/push) would be handled by a separate service that respects quiet hours
      if (inQuietHours) {
        console.log(`📱 User ${validatedData.recipientId} is in quiet hours - email/push notifications will be delayed`);
      }
    }

    const notification = await prisma.notification.create({
      data: {
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        recipientId: validatedData.recipientId,
        senderId,
        relatedEntityType: validatedData.relatedEntityType,
        relatedEntityId: validatedData.relatedEntityId,
        data: validatedData.data
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // Queue email notification if user has email notifications enabled
    if (preferences?.emailNotifications && !inQuietHours) {
      const emailEvent: EmailNotificationEvent = {
        type: validatedData.type.toLowerCase() as any,
        recipientId: validatedData.recipientId,
        senderId,
        title: validatedData.title,
        data: validatedData.data || {},
        metadata: {
          entityType: validatedData.relatedEntityType,
          entityId: validatedData.relatedEntityId,
          notificationId: notification.id
        }
      };

      try {
        await notificationQueue.queueNotification(emailEvent);
        console.log(`📧 Queued email notification for ${validatedData.type} to user ${validatedData.recipientId}`);
      } catch (error) {
        console.error('Failed to queue email notification:', error);
        // Don't fail the request if email queueing fails
      }
    } else if (inQuietHours) {
      // Queue email for after quiet hours
      const quietEndTime = preferences?.quietHoursEnd;
      let delayMs = 0;
      
      if (quietEndTime) {
        const [endHour, endMin] = quietEndTime.split(':').map(Number);
        const now = new Date();
        const quietEnd = new Date();
        quietEnd.setHours(endHour, endMin, 0, 0);
        
        // If quiet end is tomorrow
        if (quietEnd <= now) {
          quietEnd.setDate(quietEnd.getDate() + 1);
        }
        
        delayMs = quietEnd.getTime() - now.getTime();
      }

      const emailEvent: EmailNotificationEvent = {
        type: validatedData.type.toLowerCase() as any,
        recipientId: validatedData.recipientId,
        senderId,
        title: validatedData.title,
        data: validatedData.data || {},
        metadata: {
          entityType: validatedData.relatedEntityType,
          entityId: validatedData.relatedEntityId,
          notificationId: notification.id
        }
      };

      try {
        await notificationQueue.queueNotification(emailEvent, delayMs);
        console.log(`📧 Queued delayed email notification for ${validatedData.type} (delay: ${delayMs}ms)`);
      } catch (error) {
        console.error('Failed to queue delayed email notification:', error);
      }
    }

    sendSuccess(res, notification, 'Notification created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error creating notification:', error);
    sendError(res, 'Failed to create notification', 500);
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId
      }
    });

    if (!notification) {
      return void sendError(res, 'Notification not found', 404);
    }

    if (notification.isRead) {
      void sendSuccess(res, notification, 'Notification already read');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    sendSuccess(res, updatedNotification, 'Notification marked as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    sendError(res, 'Failed to mark notification as read', 500);
  }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    sendSuccess(res, { updatedCount: result.count }, 'All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    sendError(res, 'Failed to mark all notifications as read', 500);
  }
});

// Delete notification
router.delete('/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId
      }
    });

    if (!notification) {
      return void sendError(res, 'Notification not found', 404);
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    sendSuccess(res, null, 'Notification deleted successfully');
  } catch (error) {
    console.error('Error deleting notification:', error);
    sendError(res, 'Failed to delete notification', 500);
  }
});

// Update notification preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = updatePreferencesSchema.parse(req.body);

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        emailNotifications: false,
        pushNotifications: false,
        likes: true,
        comments: true,
        mentions: true,
        workspaceInvites: true,
        achievements: true,
        systemUpdates: true,
        digestFrequency: 'WEEKLY',
        ...validatedData
      },
      update: validatedData
    });

    sendSuccess(res, preferences, 'Preferences updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error updating notification preferences:', error);
    sendError(res, 'Failed to update notification preferences', 500);
  }
});

// Helper function to create notifications for specific events
export async function createNotificationForEvent(
  type: 'LIKE' | 'COMMENT' | 'MENTION' | 'WORKSPACE_INVITE' | 'ACHIEVEMENT',
  recipientId: string,
  senderId: string,
  title: string,
  message?: string,
  relatedEntityType?: 'JOURNAL_ENTRY' | 'WORKSPACE' | 'USER' | 'COMMENT',
  relatedEntityId?: string,
  data?: any
) {
  try {
    // Check if recipient exists and preferences
    const [recipient, preferences] = await Promise.all([
      prisma.user.findUnique({ where: { id: recipientId } }),
      prisma.notificationPreferences.findUnique({ where: { userId: recipientId } })
    ]);

    if (!recipient) return null;

    // Check if this type of notification is enabled
    if (preferences) {
      const typeEnabled = {
        'LIKE': preferences.likes,
        'COMMENT': preferences.comments,
        'MENTION': preferences.mentions,
        'WORKSPACE_INVITE': preferences.workspaceInvites,
        'ACHIEVEMENT': preferences.achievements
      };

      if (!typeEnabled[type]) return null;
    }

    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        recipientId,
        senderId,
        relatedEntityType,
        relatedEntityId,
        data
      }
    });

    // Queue email notification if enabled
    if (preferences?.emailNotifications) {
      const inQuietHours = isInQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd);
      
      const emailEvent: EmailNotificationEvent = {
        type: type.toLowerCase() as any,
        recipientId,
        senderId,
        title,
        data: data || {},
        metadata: {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          notificationId: notification.id
        }
      };

      let delayMs = 0;
      if (inQuietHours) {
        // Calculate delay until quiet hours end
        const quietEndTime = preferences.quietHoursEnd;
        if (quietEndTime) {
          const [endHour, endMin] = quietEndTime.split(':').map(Number);
          const now = new Date();
          const quietEnd = new Date();
          quietEnd.setHours(endHour, endMin, 0, 0);
          
          if (quietEnd <= now) {
            quietEnd.setDate(quietEnd.getDate() + 1);
          }
          
          delayMs = quietEnd.getTime() - now.getTime();
        }
      }

      try {
        await notificationQueue.queueNotification(emailEvent, delayMs);
        console.log(`📧 Queued email notification for ${type} (${delayMs > 0 ? 'delayed' : 'immediate'})`);
      } catch (error) {
        console.error('Failed to queue email notification:', error);
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification for event:', error);
    return null;
  }
}

export default router;