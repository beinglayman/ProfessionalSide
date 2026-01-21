import { prisma } from '../lib/prisma';
import {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  DayOfWeek,
  LOOKBACK_DAYS
} from '../types/journal-subscription.types';

// TEMPORARY: Set to true to test entry generation every 2 minutes
// MUST BE SET TO FALSE AFTER TESTING
const TESTING_MODE = true;

export class JournalSubscriptionService {
  /**
   * Get subscription for a user in a workspace
   */
  async getSubscription(userId: string, workspaceId: string) {
    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!membership || !membership.isActive) {
      throw new Error('Access denied: Not a member of this workspace');
    }

    const subscription = await prisma.workspaceJournalSubscription.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return subscription;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(userId: string, workspaceId: string, data: CreateSubscriptionInput) {
    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!membership || !membership.isActive) {
      throw new Error('Access denied: Not a member of this workspace');
    }

    // Check if subscription already exists
    const existing = await prisma.workspaceJournalSubscription.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (existing) {
      throw new Error('Subscription already exists for this workspace');
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRunAt(
      data.selectedDays as DayOfWeek[],
      data.generationTime,
      data.timezone
    );

    const subscription = await prisma.workspaceJournalSubscription.create({
      data: {
        userId,
        workspaceId,
        isActive: true,
        frequency: 'custom', // Always custom for backward compatibility
        selectedDays: data.selectedDays,
        generationTime: data.generationTime,
        timezone: data.timezone,
        selectedTools: data.selectedTools,
        customPrompt: data.customPrompt,
        defaultCategory: data.defaultCategory,
        defaultTags: data.defaultTags,
        nextRunAt
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📝 Created journal subscription for user ${userId} in workspace ${workspaceId}`);
    return subscription;
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(userId: string, workspaceId: string, data: UpdateSubscriptionInput) {
    // Verify subscription exists and belongs to user
    const existing = await prisma.workspaceJournalSubscription.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!existing) {
      throw new Error('Subscription not found');
    }

    // Build update data
    const updateData: any = {};

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.selectedDays !== undefined) updateData.selectedDays = data.selectedDays;
    if (data.generationTime !== undefined) updateData.generationTime = data.generationTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.selectedTools !== undefined) updateData.selectedTools = data.selectedTools;
    if (data.customPrompt !== undefined) updateData.customPrompt = data.customPrompt;
    if (data.defaultCategory !== undefined) updateData.defaultCategory = data.defaultCategory;
    if (data.defaultTags !== undefined) updateData.defaultTags = data.defaultTags;

    // Recalculate next run time if schedule changed
    const selectedDays = data.selectedDays ?? existing.selectedDays;
    const generationTime = data.generationTime ?? existing.generationTime;
    const timezone = data.timezone ?? existing.timezone;
    const isActive = data.isActive ?? existing.isActive;

    if (isActive) {
      updateData.nextRunAt = this.calculateNextRunAt(
        selectedDays as DayOfWeek[],
        generationTime,
        timezone
      );
    } else {
      updateData.nextRunAt = null;
    }

    const subscription = await prisma.workspaceJournalSubscription.update({
      where: {
        userId_workspaceId: { userId, workspaceId }
      },
      data: updateData,
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📝 Updated journal subscription for user ${userId} in workspace ${workspaceId}`);
    return subscription;
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(userId: string, workspaceId: string) {
    // Verify subscription exists and belongs to user
    const existing = await prisma.workspaceJournalSubscription.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!existing) {
      throw new Error('Subscription not found');
    }

    await prisma.workspaceJournalSubscription.delete({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    console.log(`📝 Deleted journal subscription for user ${userId} in workspace ${workspaceId}`);
    return { success: true };
  }

  /**
   * Toggle subscription active status
   */
  async toggleSubscription(userId: string, workspaceId: string, isActive: boolean) {
    const existing = await prisma.workspaceJournalSubscription.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!existing) {
      throw new Error('Subscription not found');
    }

    const updateData: any = { isActive };

    if (isActive) {
      // Recalculate next run time when activating
      updateData.nextRunAt = this.calculateNextRunAt(
        existing.selectedDays as DayOfWeek[],
        existing.generationTime,
        existing.timezone
      );
    } else {
      updateData.nextRunAt = null;
    }

    const subscription = await prisma.workspaceJournalSubscription.update({
      where: {
        userId_workspaceId: { userId, workspaceId }
      },
      data: updateData,
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📝 Toggled journal subscription (${isActive ? 'active' : 'inactive'}) for user ${userId} in workspace ${workspaceId}`);
    return subscription;
  }

  /**
   * Get user's connected tools
   */
  async getConnectedTools(userId: string) {
    const integrations = await prisma.mCPIntegration.findMany({
      where: { userId },
      select: {
        toolType: true,
        isConnected: true,
        connectedAt: true,
        lastUsedAt: true
      }
    });

    return {
      tools: integrations.map(integration => ({
        toolType: integration.toolType,
        isConnected: integration.isConnected,
        connectedAt: integration.connectedAt?.toISOString() ?? null,
        lastUsedAt: integration.lastUsedAt?.toISOString() ?? null
      }))
    };
  }

  /**
   * Get subscriptions due for processing
   */
  async getDueSubscriptions() {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    return prisma.workspaceJournalSubscription.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now,
          gt: thirtyMinutesAgo
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });
  }

  /**
   * Update subscription after processing
   */
  async markSubscriptionProcessed(subscriptionId: string) {
    const subscription = await prisma.workspaceJournalSubscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const nextRunAt = this.calculateNextRunAt(
      subscription.selectedDays as DayOfWeek[],
      subscription.generationTime,
      subscription.timezone
    );

    return prisma.workspaceJournalSubscription.update({
      where: { id: subscriptionId },
      data: {
        lastRunAt: new Date(),
        nextRunAt
      }
    });
  }

  /**
   * Calculate the next run time based on subscription settings
   * Properly converts user's local time to UTC for storage.
   */
  calculateNextRunAt(
    selectedDays: DayOfWeek[],
    generationTime: string,
    timezone: string
  ): Date {
    // TESTING MODE: Return 2 minutes from now for quick testing
    if (TESTING_MODE) {
      console.log('📝 TESTING MODE: Setting nextRunAt to 2 minutes from now');
      return new Date(Date.now() + 2 * 60 * 1000);
    }

    const [hour, minute] = generationTime.split(':').map(Number);
    const now = new Date();

    // Get current date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayInUserTz = formatter.format(now); // YYYY-MM-DD

    // Create a datetime string in ISO format for the user's timezone
    // Then parse it to get the actual UTC time
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

    // Use a trick: Create the date as if it's in the user's timezone
    // by using the timezone in toLocaleString and comparing
    let nextRun = this.createDateInTimezone(todayInUserTz, timeStr, timezone);

    // If the time has already passed in user's timezone, start from tomorrow
    if (nextRun <= now) {
      // Add one day
      const tomorrow = new Date(nextRun);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      nextRun = tomorrow;
    }

    // Helper to get day of week in user's timezone
    const getWeekdayInTz = (date: Date) => {
      const dayStr = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short'
      }).format(date);
      const dayMap: Record<string, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };
      return dayMap[dayStr] ?? 0;
    };

    // Helper to add days
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setUTCDate(result.getUTCDate() + days);
      return result;
    };

    // Find the next occurrence of any selected day
    if (selectedDays.length > 0) {
      const targetWeekdays = selectedDays.map(d => {
        const day = this.dayToWeekday(d);
        return day === 7 ? 0 : day; // Convert to JS day format (0=Sun, 1=Mon, etc.)
      });

      // Keep advancing until we find a selected day
      let maxIterations = 7;
      while (!targetWeekdays.includes(getWeekdayInTz(nextRun)) && maxIterations > 0) {
        nextRun = addDays(nextRun, 1);
        maxIterations--;
      }
    }

    return nextRun;
  }

  /**
   * Create a Date object for a specific time in a specific timezone
   */
  private createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
    // Parse the target local time components
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);

    // Create a date and find the UTC offset for this timezone at this time
    // Use a binary search approach to find the correct UTC time
    const targetLocal = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    // Get what time it would be in the target timezone if targetLocal was UTC
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Estimate the offset by comparing
    const parts = formatter.formatToParts(targetLocal);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

    const tzHour = parseInt(getPart('hour'));
    const tzMinute = parseInt(getPart('minute'));

    // Calculate offset in minutes
    const targetMinutes = hour * 60 + minute;
    const actualMinutes = tzHour * 60 + tzMinute;
    let offsetMinutes = actualMinutes - targetMinutes;

    // Handle day boundary
    if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
    if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

    // Adjust the time by the offset
    return new Date(targetLocal.getTime() - offsetMinutes * 60 * 1000);
  }

  /**
   * Get lookback period in days (always 1 day since last run)
   */
  getLookbackDays(): number {
    return LOOKBACK_DAYS;
  }

  /**
   * Convert day string to Luxon weekday number (1=Monday, 7=Sunday)
   */
  private dayToWeekday(day: DayOfWeek): number {
    const mapping: Record<DayOfWeek, number> = {
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      sun: 7
    };
    return mapping[day];
  }
}

// Export singleton instance
export const journalSubscriptionService = new JournalSubscriptionService();
