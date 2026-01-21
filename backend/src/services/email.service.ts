import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import {
  EmailConfig,
  EmailData,
  EmailJob,
  EmailNotificationEvent,
  DigestEmailData,
  EmailTemplateVariables
} from '../types/email.types';
import { EmailTemplateService } from './email-template.service';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private templateService: EmailTemplateService;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.EMAIL_ENABLED === 'true';
    
    if (this.isEnabled) {
      this.config = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        },
        from: {
          name: process.env.FROM_NAME || 'InChronicle',
          email: process.env.FROM_EMAIL || 'noreply@inchronicle.com'
        }
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth
      });
    }

    this.templateService = new EmailTemplateService();
  }

  /**
   * Send email immediately
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('Email disabled, would send:', emailData.subject, 'to', emailData.to);
      return true;
    }

    try {
      const mailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: emailData.toName ? `${emailData.toName} <${emailData.to}>` : emailData.to,
        subject: emailData.subject,
        text: emailData.textContent,
        html: emailData.htmlContent,
        attachments: emailData.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding as any,
          cid: att.cid
        }))
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Queue email for later sending
   */
  async queueEmail(emailData: EmailData, scheduledAt?: Date): Promise<string> {
    const emailJob: EmailJob = {
      id: this.generateJobId(),
      emailData,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      scheduledAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would be stored in a job queue (Redis, Bull, etc.)
    // For now, we'll store it in memory and process immediately if not scheduled
    if (!scheduledAt || scheduledAt <= new Date()) {
      this.processEmailJob(emailJob);
    }

    return emailJob.id;
  }

  /**
   * Send notification email based on event
   */
  async sendNotificationEmail(event: EmailNotificationEvent): Promise<boolean> {
    try {
      // Get recipient user and preferences
      const recipient = await prisma.user.findUnique({
        where: { id: event.recipientId },
        include: {
          notificationPreferences: true
        }
      });

      if (!recipient) {
        console.error('Recipient not found:', event.recipientId);
        return false;
      }

      // Check if user has email notifications enabled for this type
      if (!this.shouldSendEmailNotification(recipient.notificationPreferences, event.type)) {
        console.log('Email notification disabled for user:', recipient.email, 'type:', event.type);
        return true; // Not an error, just disabled
      }

      // Get sender information if available
      let sender = null;
      if (event.senderId) {
        sender = await prisma.user.findUnique({
          where: { id: event.senderId },
          select: { id: true, name: true, email: true, avatar: true }
        });
      }

      // Generate email content based on event type
      const emailContent = await this.generateNotificationEmail(event, recipient, sender);
      
      if (!emailContent) {
        console.error('Failed to generate email content for event:', event.type);
        return false;
      }

      // Send email
      return await this.sendEmail({
        to: recipient.email,
        toName: recipient.name,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        category: `notification_${event.type}`,
        metadata: {
          eventType: event.type,
          recipientId: event.recipientId,
          senderId: event.senderId,
          entityType: event.metadata?.entityType,
          entityId: event.metadata?.entityId
        }
      });
    } catch (error) {
      console.error('Error sending notification email:', error);
      return false;
    }
  }

  /**
   * Send digest email (daily/weekly summary)
   */
  async sendDigestEmail(digestData: DigestEmailData): Promise<boolean> {
    try {
      const recipient = await prisma.user.findUnique({
        where: { id: digestData.recipientId },
        include: {
          notificationPreferences: true
        }
      });

      if (!recipient || !recipient.notificationPreferences) {
        return false;
      }

      // Check if user wants digest emails
      const digestFrequency = recipient.notificationPreferences.digestFrequency;
      if (digestFrequency === 'NONE' || 
          (digestData.period === 'daily' && digestFrequency !== 'DAILY') ||
          (digestData.period === 'weekly' && digestFrequency !== 'WEEKLY')) {
        return true; // Not enabled, but not an error
      }

      // Check if there's enough activity to send digest
      const totalActivity = digestData.data.newLikes.count + 
                           digestData.data.newComments.count + 
                           digestData.data.newConnections.count + 
                           digestData.data.workspaceActivity.count + 
                           digestData.data.achievements.count;

      if (totalActivity === 0) {
        console.log('No activity for digest email:', recipient.email);
        return true;
      }

      // Generate digest email content
      const emailContent = await this.generateDigestEmail(digestData, recipient);

      return await this.sendEmail({
        to: recipient.email,
        toName: recipient.name,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        category: `digest_${digestData.period}`,
        metadata: {
          digestPeriod: digestData.period,
          recipientId: digestData.recipientId,
          totalActivity
        }
      });
    } catch (error) {
      console.error('Error sending digest email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return false;
      }

      const variables: EmailTemplateVariables = {
        recipientName: user.name,
        recipientEmail: user.email,
        actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
        companyName: 'InChronicle',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com',
        websiteUrl: process.env.FRONTEND_URL || 'https://inchronicle.com',
        logoUrl: `${process.env.FRONTEND_URL}/logo.png`
      };

      const emailContent = await this.templateService.renderTemplate('welcome', variables);

      return await this.sendEmail({
        to: user.email,
        toName: user.name,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        category: 'welcome',
        metadata: { userId }
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return false;
      }

      const variables: EmailTemplateVariables = {
        recipientName: user.name,
        recipientEmail: user.email,
        actionUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
        companyName: 'InChronicle',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com',
        websiteUrl: process.env.FRONTEND_URL || 'https://inchronicle.com',
        logoUrl: `${process.env.FRONTEND_URL}/logo.png`
      };

      const emailContent = await this.templateService.renderTemplate('password_reset', variables);

      return await this.sendEmail({
        to: user.email,
        toName: user.name,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        category: 'password_reset',
        priority: 'high',
        metadata: { userId: user.id, resetToken }
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('Email is disabled');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private shouldSendEmailNotification(preferences: any, eventType: string): boolean {
    if (!preferences || !preferences.emailNotifications) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHoursStart && preferences.quietHoursEnd) {
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = parseInt(preferences.quietHoursStart.split(':')[0]);
      const quietEnd = parseInt(preferences.quietHoursEnd.split(':')[0]);
      
      if (quietStart <= quietEnd) {
        if (currentHour >= quietStart && currentHour < quietEnd) {
          return false;
        }
      } else {
        if (currentHour >= quietStart || currentHour < quietEnd) {
          return false;
        }
      }
    }

    // Check specific notification preferences
    switch (eventType) {
      case 'like':
        return preferences.likes;
      case 'comment':
        return preferences.comments;
      case 'mention':
        return preferences.mentions;
      case 'workspace_invite':
        return preferences.workspaceInvites;
      case 'achievement':
        return preferences.achievements;
      case 'system':
        return preferences.systemUpdates;
      default:
        return true;
    }
  }

  private async generateNotificationEmail(
    event: EmailNotificationEvent, 
    recipient: any, 
    sender: any
  ): Promise<{ subject: string; html: string; text: string } | null> {
    const variables: EmailTemplateVariables = {
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      senderName: sender?.name,
      unsubscribeUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
      companyName: 'InChronicle',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com',
      websiteUrl: process.env.FRONTEND_URL || 'https://inchronicle.com',
      logoUrl: `${process.env.FRONTEND_URL}/logo.png`,
      ...event.data
    };

    let templateId = '';
    switch (event.type) {
      case 'like':
        templateId = 'journal_like';
        variables.actionUrl = `${process.env.FRONTEND_URL}/journal/${event.metadata?.entityId}`;
        break;
      case 'comment':
        templateId = 'journal_comment';
        variables.actionUrl = `${process.env.FRONTEND_URL}/journal/${event.metadata?.entityId}`;
        break;
      case 'mention':
        templateId = 'mention';
        variables.actionUrl = `${process.env.FRONTEND_URL}/journal/${event.metadata?.entityId}`;
        break;
      case 'workspace_invite':
        templateId = 'workspace_invite';
        variables.actionUrl = `${process.env.FRONTEND_URL}/workspaces/${event.metadata?.workspaceId}`;
        break;
      case 'achievement':
        templateId = 'achievement';
        variables.actionUrl = `${process.env.FRONTEND_URL}/profile/${recipient.id}#achievements`;
        break;
      case 'system':
        templateId = 'system_notification';
        variables.actionUrl = process.env.FRONTEND_URL;
        break;
      default:
        return null;
    }

    return await this.templateService.renderTemplate(templateId, variables);
  }

  private async generateDigestEmail(
    digestData: DigestEmailData, 
    recipient: any
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: EmailTemplateVariables = {
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
      unsubscribeUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
      companyName: 'InChronicle',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com',
      websiteUrl: process.env.FRONTEND_URL || 'https://inchronicle.com',
      logoUrl: `${process.env.FRONTEND_URL}/logo.png`,
      digestPeriod: digestData.period,
      digestData: digestData.data
    };

    const templateId = digestData.period === 'daily' ? 'daily_digest' : 'weekly_digest';
    return await this.templateService.renderTemplate(templateId, variables);
  }

  private async processEmailJob(job: EmailJob): Promise<void> {
    try {
      job.status = 'processing';
      job.attempts++;
      job.updatedAt = new Date();

      const success = await this.sendEmail(job.emailData);

      if (success) {
        job.status = 'sent';
        job.processedAt = new Date();
      } else {
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          job.error = 'Max attempts reached';
        } else {
          job.status = 'pending';
          // Retry with exponential backoff
          setTimeout(() => this.processEmailJob(job), Math.pow(2, job.attempts) * 1000);
        }
      }

      job.updatedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = (error as any).message;
      job.updatedAt = new Date();
      console.error('Error processing email job:', error);
    }
  }

  private generateJobId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}