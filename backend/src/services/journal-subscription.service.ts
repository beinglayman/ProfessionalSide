import { prisma } from '../lib/prisma';
import {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  Frequency,
  DayOfWeek,
  LOOKBACK_PERIODS
} from '../types/journal-subscription.types';

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
      data.frequency,
      data.selectedDays as DayOfWeek[],
      data.generationTime,
      data.timezone
    );

    const subscription = await prisma.workspaceJournalSubscription.create({
      data: {
        userId,
        workspaceId,
        isActive: true,
        frequency: data.frequency,
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
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.selectedDays !== undefined) updateData.selectedDays = data.selectedDays;
    if (data.generationTime !== undefined) updateData.generationTime = data.generationTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.selectedTools !== undefined) updateData.selectedTools = data.selectedTools;
    if (data.customPrompt !== undefined) updateData.customPrompt = data.customPrompt;
    if (data.defaultCategory !== undefined) updateData.defaultCategory = data.defaultCategory;
    if (data.defaultTags !== undefined) updateData.defaultTags = data.defaultTags;

    // Recalculate next run time if schedule changed
    const frequency = data.frequency ?? existing.frequency;
    const selectedDays = data.selectedDays ?? existing.selectedDays;
    const generationTime = data.generationTime ?? existing.generationTime;
    const timezone = data.timezone ?? existing.timezone;
    const isActive = data.isActive ?? existing.isActive;

    if (isActive) {
      updateData.nextRunAt = this.calculateNextRunAt(
        frequency as Frequency,
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
        existing.frequency as Frequency,
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
      subscription.frequency as Frequency,
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
   * Note: Uses UTC internally. Timezone is stored for display purposes.
   */
  calculateNextRunAt(
    frequency: Frequency,
    selectedDays: DayOfWeek[],
    generationTime: string,
    _timezone: string // Timezone stored for reference, calculations done in UTC
  ): Date {
    const [hour, minute] = generationTime.split(':').map(Number);
    const now = new Date();

    // Create a date for today at the generation time (UTC)
    let nextRun = new Date(now);
    nextRun.setUTCHours(hour, minute, 0, 0);

    // If the time has already passed today, start from tomorrow
    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    // Helper to get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const getWeekday = (date: Date) => date.getUTCDay();

    // Helper to add days
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setUTCDate(result.getUTCDate() + days);
      return result;
    };

    // Find the next valid day based on frequency
    switch (frequency) {
      case 'daily':
        // nextRun is already set correctly
        break;

      case 'alternate':
        // Every other day - use days since epoch
        const daysSinceEpoch = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
        if (daysSinceEpoch % 2 !== 0) {
          nextRun = addDays(nextRun, 1);
        }
        break;

      case 'weekdays':
        // Skip weekends (0=Sunday, 6=Saturday)
        while (getWeekday(nextRun) === 0 || getWeekday(nextRun) === 6) {
          nextRun = addDays(nextRun, 1);
        }
        break;

      case 'weekly':
      case 'fortnightly':
      case 'monthly':
        // Find the next occurrence of the selected day
        if (selectedDays.length > 0) {
          const targetDay = this.dayToWeekday(selectedDays[0]);
          // Convert from 1-7 (Mon-Sun) to 0-6 (Sun-Sat)
          const targetJsDay = targetDay === 7 ? 0 : targetDay;

          while (getWeekday(nextRun) !== targetJsDay) {
            nextRun = addDays(nextRun, 1);
          }

          // For fortnightly, skip every other week
          if (frequency === 'fortnightly') {
            const weeksSinceEpoch = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
            if (weeksSinceEpoch % 2 !== 0) {
              nextRun = addDays(nextRun, 7);
            }
          } else if (frequency === 'monthly') {
            // For monthly, ensure we're in a future month if needed
            if (nextRun.getUTCMonth() === now.getUTCMonth() && nextRun.getUTCDate() <= now.getUTCDate()) {
              // Move to next month, first day
              nextRun.setUTCMonth(nextRun.getUTCMonth() + 1);
              nextRun.setUTCDate(1);
              nextRun.setUTCHours(hour, minute, 0, 0);
              // Find the first occurrence of target day in the new month
              while (getWeekday(nextRun) !== targetJsDay) {
                nextRun = addDays(nextRun, 1);
              }
            }
          }
        }
        break;

      case 'custom':
        // Find the next occurrence of any selected day
        if (selectedDays.length > 0) {
          const targetWeekdays = selectedDays.map(d => {
            const day = this.dayToWeekday(d);
            return day === 7 ? 0 : day; // Convert to JS day format
          });
          while (!targetWeekdays.includes(getWeekday(nextRun))) {
            nextRun = addDays(nextRun, 1);
          }
        }
        break;
    }

    return nextRun;
  }

  /**
   * Calculate lookback period in days
   */
  getLookbackDays(frequency: Frequency): number {
    return LOOKBACK_PERIODS[frequency];
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
