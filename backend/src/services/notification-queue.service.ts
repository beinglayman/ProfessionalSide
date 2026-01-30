import { EmailService } from './email.service';
import { EmailNotificationEvent, DigestEmailData } from '../types/email.types';
import { prisma } from '../lib/prisma';

interface QueuedNotification {
  id: string;
  type: 'email' | 'push' | 'in_app';
  event: EmailNotificationEvent;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
}

export class NotificationQueueService {
  private emailService: EmailService;
  private queue: QueuedNotification[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.emailService = new EmailService();
    this.startProcessing();
  }

  /**
   * Queue a notification for processing
   */
  async queueNotification(event: EmailNotificationEvent, delay = 0): Promise<string> {
    const notification: QueuedNotification = {
      id: this.generateId(),
      type: 'email',
      event,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: new Date(Date.now() + delay),
      status: 'pending',
      createdAt: new Date()
    };

    this.queue.push(notification);
    console.log(`Queued notification: ${notification.id}, type: ${event.type}`);
    
    return notification.id;
  }

  /**
   * Queue digest emails for all users
   */
  async queueDigestEmails(period: 'daily' | 'weekly'): Promise<void> {
    try {
      console.log(`Queueing ${period} digest emails...`);

      // Get users who want digest emails for this period
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          notificationPreferences: {
            digestFrequency: period === 'daily' ? 'DAILY' : 'WEEKLY',
            emailNotifications: true
          }
        },
        include: {
          notificationPreferences: true
        }
      });

      console.log(`Found ${users.length} users for ${period} digest`);

      for (const user of users) {
        try {
          // Generate digest data for user
          const digestData = await this.generateDigestData(user.id, period);
          
          if (digestData) {
            // Queue digest email
            await this.emailService.sendDigestEmail(digestData);
          }
        } catch (error) {
          console.error(`Error generating digest for user ${user.id}:`, error);
        }
      }

      console.log(`Completed queueing ${period} digest emails`);
    } catch (error) {
      console.error(`Error queueing ${period} digest emails:`, error);
    }
  }

  /**
   * Process pending notifications
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const pendingNotifications = this.queue.filter(
        n => n.status === 'pending' && n.scheduledAt <= now
      );

      for (const notification of pendingNotifications) {
        await this.processNotification(notification);
      }

      // Clean up completed/failed notifications older than 24 hours
      this.cleanupOldNotifications();
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: QueuedNotification): Promise<void> {
    try {
      notification.status = 'processing';
      notification.attempts++;

      console.log(`Processing notification: ${notification.id}, attempt: ${notification.attempts}`);

      let success = false;

      switch (notification.type) {
        case 'email':
          success = await this.emailService.sendNotificationEmail(notification.event);
          break;
        case 'push':
          // TODO: Implement push notification service
          success = true; // Placeholder
          break;
        case 'in_app':
          // TODO: Implement in-app notification service
          success = true; // Placeholder
          break;
      }

      if (success) {
        notification.status = 'completed';
        notification.processedAt = new Date();
        console.log(`Notification processed successfully: ${notification.id}`);
      } else {
        this.handleNotificationFailure(notification);
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      notification.error = (error as any).message;
      this.handleNotificationFailure(notification);
    }
  }

  /**
   * Handle notification processing failure
   */
  private handleNotificationFailure(notification: QueuedNotification): void {
    if (notification.attempts >= notification.maxAttempts) {
      notification.status = 'failed';
      console.error(`Notification failed after ${notification.attempts} attempts: ${notification.id}`);
    } else {
      notification.status = 'pending';
      // Retry with exponential backoff
      const delay = Math.pow(2, notification.attempts) * 1000;
      notification.scheduledAt = new Date(Date.now() + delay);
      console.log(`Retrying notification ${notification.id} in ${delay}ms`);
    }
  }

  /**
   * Generate digest data for a user
   */
  private async generateDigestData(userId: string, period: 'daily' | 'weekly'): Promise<DigestEmailData | null> {
    try {
      const now = new Date();
      const startDate = new Date();
      
      if (period === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 7);
      }

      // Get new likes on user's entries
      const newLikes = await prisma.journalLike.findMany({
        where: {
          entry: { authorId: userId },
          likedAt: { gte: startDate },
          userId: { not: userId } // Exclude self-likes
        },
        include: {
          user: { select: { name: true } },
          entry: { select: { title: true } }
        },
        orderBy: { likedAt: 'desc' },
        take: 10
      });

      // Get new comments on user's entries
      const newComments = await prisma.journalComment.findMany({
        where: {
          entry: { authorId: userId },
          createdAt: { gte: startDate },
          userId: { not: userId } // Exclude own comments
        },
        include: {
          user: { select: { name: true } },
          entry: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get new network connections
      const newConnections = await prisma.networkConnection.findMany({
        where: {
          OR: [
            { receiverId: userId, status: 'accepted' },
            { senderId: userId, status: 'accepted' }
          ],
          createdAt: { gte: startDate }
        },
        include: {
          sender: { select: { id: true, name: true, title: true, company: true } },
          receiver: { select: { id: true, name: true, title: true, company: true } }
        },
        take: 10
      });

      // Get workspace activity
      const workspaceActivity = await prisma.journalEntry.findMany({
        where: {
          authorId: { not: userId },
          workspace: {
            members: { some: { userId: userId, isActive: true } }
          },
          createdAt: { gte: startDate },
          visibility: { in: ['workspace', 'network'] }
        },
        include: {
          author: { select: { name: true } },
          workspace: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get new achievements
      const achievements = await prisma.achievement.findMany({
        where: {
          userId,
          achievedAt: { gte: startDate }
        },
        orderBy: { achievedAt: 'desc' },
        take: 5
      });

      // Check if there's enough activity to send digest
      const totalActivity = newLikes.length + newComments.length + 
                           newConnections.length + workspaceActivity.length + 
                           achievements.length;

      if (totalActivity === 0) {
        return null;
      }

      return {
        recipientId: userId,
        period,
        data: {
          newLikes: {
            count: newLikes.length,
            entries: newLikes.map(like => ({
              entryTitle: like.entry.title,
              likerName: like.user.name,
              createdAt: like.likedAt.toISOString()
            }))
          },
          newComments: {
            count: newComments.length,
            entries: newComments.map(comment => ({
              entryTitle: comment.entry.title,
              commenterName: comment.user.name,
              comment: comment.content,
              createdAt: comment.createdAt.toISOString()
            }))
          },
          newConnections: {
            count: newConnections.length,
            connections: newConnections.map(conn => {
              const connectedUser = conn.senderId === userId ? conn.receiver : conn.sender;
              return {
                name: connectedUser.name,
                title: connectedUser.title || undefined,
                company: connectedUser.company || undefined,
                connectedAt: conn.createdAt.toISOString()
              };
            })
          },
          workspaceActivity: {
            count: workspaceActivity.length,
            activities: workspaceActivity.map(entry => ({
              workspaceName: entry.workspace.name,
              type: 'journal_entry',
              authorName: entry.author.name,
              title: entry.title,
              createdAt: entry.createdAt.toISOString()
            }))
          },
          achievements: {
            count: achievements.length,
            achievements: achievements.map(achievement => ({
              title: achievement.title,
              achievedAt: achievement.achievedAt.toISOString()
            }))
          }
        }
      };
    } catch (error) {
      console.error('Error generating digest data:', error);
      return null;
    }
  }

  /**
   * Start queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    console.log('Notification queue processing started');
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('Notification queue processing stopped');
  }

  /**
   * Clean up old notifications
   */
  private cleanupOldNotifications(): void {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(notification => {
      return notification.createdAt > cutoffDate || notification.status === 'pending';
    });

    const removedCount = initialLength - this.queue.length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old notifications`);
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(n => n.status === 'pending').length,
      processing: this.queue.filter(n => n.status === 'processing').length,
      completed: this.queue.filter(n => n.status === 'completed').length,
      failed: this.queue.filter(n => n.status === 'failed').length
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}