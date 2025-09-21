import * as cron from 'node-cron';
import { NotificationQueueService } from './notification-queue.service';
import { ExportService } from './export.service';
import { InvitationReplenishmentService } from './invitation-replenishment.service';

export class CronService {
  private notificationQueue: NotificationQueueService;
  private exportService: ExportService;
  private invitationReplenishment: InvitationReplenishmentService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.notificationQueue = new NotificationQueueService();
    this.exportService = new ExportService();
    this.invitationReplenishment = new InvitationReplenishmentService();
  }

  /**
   * Start all scheduled jobs
   */
  startJobs(): void {
    console.log('Starting scheduled jobs...');

    // Daily digest emails - every day at 8:00 AM
    this.scheduleJob('daily-digest', '0 8 * * *', async () => {
      console.log('Triggering daily digest emails...');
      try {
        await this.notificationQueue.queueDigestEmails('daily');
        console.log('Daily digest emails queued successfully');
      } catch (error) {
        console.error('Error queueing daily digest emails:', error);
      }
    });

    // Weekly digest emails - every Monday at 9:00 AM
    this.scheduleJob('weekly-digest', '0 9 * * 1', async () => {
      console.log('Triggering weekly digest emails...');
      try {
        await this.notificationQueue.queueDigestEmails('weekly');
        console.log('Weekly digest emails queued successfully');
      } catch (error) {
        console.error('Error queueing weekly digest emails:', error);
      }
    });

    // Clean up expired exports - every day at 2:00 AM
    this.scheduleJob('cleanup-exports', '0 2 * * *', async () => {
      console.log('Cleaning up expired exports...');
      try {
        await this.exportService.cleanupExpiredExports();
        console.log('Export cleanup completed successfully');
      } catch (error) {
        console.error('Error cleaning up exports:', error);
      }
    });

    // Monthly invitation quota replenishment - 1st of every month at 9:00 AM
    this.scheduleJob('invitation-replenishment', '0 9 1 * *', async () => {
      console.log('🔄 Triggering monthly invitation quota replenishment...');
      try {
        const results = await this.invitationReplenishment.replenishMonthlyQuotas();
        console.log(`✅ Monthly replenishment completed: ${results.replenished}/${results.processed} users replenished, ${results.errors} errors`);
      } catch (error) {
        console.error('❌ Error in monthly invitation replenishment:', error);
      }
    });

    // Health check - every 5 minutes (optional for monitoring)
    if (process.env.NODE_ENV === 'production') {
      this.scheduleJob('health-check', '*/5 * * * *', async () => {
        // Log system health metrics
        const stats = this.notificationQueue.getQueueStats();
        if (stats.failed > 10) {
          console.warn('High number of failed notifications:', stats);
        }
      });
    }

    console.log(`Scheduled ${this.jobs.size} jobs`);
  }

  /**
   * Stop all scheduled jobs
   */
  stopJobs(): void {
    console.log('Stopping scheduled jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.notificationQueue.stopProcessing();
    
    console.log('All scheduled jobs stopped');
  }

  /**
   * Schedule a new job
   */
  private scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      console.warn(`Job ${name} already exists, skipping`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Error in scheduled job ${name}:`, error);
      }
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });

    this.jobs.set(name, job);
    console.log(`Scheduled job: ${name} with schedule: ${schedule}`);
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus(): Array<{ name: string; running: boolean; schedule: string }> {
    const status: Array<{ name: string; running: boolean; schedule: string }> = [];

    this.jobs.forEach((job, name) => {
      // Note: node-cron doesn't expose schedule info easily, so we'll use predefined schedules
      const schedules = {
        'daily-digest': '0 8 * * *',
        'weekly-digest': '0 9 * * 1',
        'cleanup-exports': '0 2 * * *',
        'invitation-replenishment': '0 9 1 * *',
        'health-check': '*/5 * * * *'
      };

      status.push({
        name,
        running: job.getStatus() === 'scheduled',
        schedule: schedules[name] || 'unknown'
      });
    });

    return status;
  }

  /**
   * Manually trigger a specific job
   */
  async triggerJob(jobName: string): Promise<boolean> {
    try {
      switch (jobName) {
        case 'daily-digest':
          await this.notificationQueue.queueDigestEmails('daily');
          return true;
        case 'weekly-digest':
          await this.notificationQueue.queueDigestEmails('weekly');
          return true;
        case 'cleanup-exports':
          await this.exportService.cleanupExpiredExports();
          return true;
        case 'invitation-replenishment':
          await this.invitationReplenishment.replenishMonthlyQuotas();
          return true;
        default:
          console.error(`Unknown job: ${jobName}`);
          return false;
      }
    } catch (error) {
      console.error(`Error triggering job ${jobName}:`, error);
      return false;
    }
  }
}