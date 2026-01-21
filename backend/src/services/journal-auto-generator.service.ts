import { prisma } from '../lib/prisma';
import { journalSubscriptionService } from './journal-subscription.service';
import { JournalService } from './journal.service';
import { LOOKBACK_DAYS } from '../types/journal-subscription.types';

// TEMPORARY: Set to true to bypass activity check for testing
// MUST BE SET TO FALSE AFTER TESTING
const TESTING_MODE = true;

interface ToolActivityData {
  toolType: string;
  activities: any[];
  hasData: boolean;
}

export class JournalAutoGeneratorService {
  private journalService: JournalService;

  constructor() {
    this.journalService = new JournalService();
  }

  /**
   * Process all due subscriptions - called by cron job every 30 minutes
   */
  async processDueSubscriptions(): Promise<void> {
    console.log('📝 Starting journal auto-generation processing...');

    try {
      const dueSubscriptions = await journalSubscriptionService.getDueSubscriptions();
      console.log(`📝 Found ${dueSubscriptions.length} due subscriptions`);

      for (const subscription of dueSubscriptions) {
        try {
          await this.processSubscription(subscription);
        } catch (error) {
          console.error(`❌ Error processing subscription ${subscription.id}:`, error);
          // Continue with next subscription even if one fails
        }
      }

      console.log('📝 Journal auto-generation processing completed');
    } catch (error) {
      console.error('❌ Error in processDueSubscriptions:', error);
      throw error;
    }
  }

  /**
   * Process a single subscription
   */
  private async processSubscription(subscription: any): Promise<void> {
    const { id, userId, workspaceId, selectedTools, customPrompt, defaultCategory, defaultTags } = subscription;
    const workspaceName = subscription.workspace?.name || 'your workspace';

    console.log(`📝 Processing subscription ${id} for user ${userId} in workspace ${workspaceId}`);

    // Skip if workspace is inactive
    if (!subscription.workspace?.isActive) {
      console.log(`⚠️ Skipping subscription ${id} - workspace is inactive`);
      await journalSubscriptionService.markSubscriptionProcessed(id);
      return;
    }

    // Calculate lookback period (always 1 day since last run)
    const lookbackStart = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Fetch activity data from connected tools
    const { activityData, missingTools } = await this.fetchToolActivityData(
      userId,
      selectedTools,
      lookbackStart
    );

    // Check if we have any activity data
    const hasActivity = activityData.some(tool => tool.hasData);

    if (!hasActivity && !TESTING_MODE) {
      // No activity found - send notification (skip in testing mode)
      console.log(`📝 No activity found for subscription ${id}`);
      await this.sendNoActivityNotification(userId, workspaceId, workspaceName);
      await journalSubscriptionService.markSubscriptionProcessed(id);
      return;
    }

    if (TESTING_MODE && !hasActivity) {
      console.log(`📝 TESTING MODE: Bypassing activity check for subscription ${id}`);
    }

    // Generate journal entry using AI
    try {
      const entryData = await this.generateJournalEntry(
        activityData,
        customPrompt,
        defaultCategory,
        defaultTags,
        workspaceId
      );

      // Create draft journal entry
      const entry = await this.journalService.createJournalEntry(userId, {
        title: entryData.title,
        description: entryData.description,
        fullContent: entryData.fullContent,
        workspaceId,
        visibility: 'private', // Always create as private draft
        tags: [...(defaultTags || []), 'auto-generated'],
        skills: [], // Auto-generated entries don't auto-detect skills
        category: defaultCategory || entryData.category,
        format7Data: entryData.format7Data,
        networkContent: entryData.networkContent,
        format7DataNetwork: entryData.format7DataNetwork,
        generateNetworkEntry: true,
        collaborators: [],
        reviewers: [],
        artifacts: [],
        outcomes: []
      });

      console.log(`✅ Created draft journal entry ${entry.id} for subscription ${id}`);

      // Send "entry ready" notification
      await this.sendEntryReadyNotification(userId, workspaceId, workspaceName, entry.id);

      // Send "missing tools" notification if some tools weren't connected
      if (missingTools.length > 0) {
        await this.sendMissingToolsNotification(userId, workspaceId, workspaceName, missingTools);
      }
    } catch (error) {
      console.error(`❌ Error generating journal entry for subscription ${id}:`, error);
      await this.sendGenerationFailedNotification(userId, workspaceId, workspaceName);
    }

    // Update subscription tracking
    await journalSubscriptionService.markSubscriptionProcessed(id);
  }

  /**
   * Fetch activity data from user's connected tools
   */
  private async fetchToolActivityData(
    userId: string,
    selectedTools: string[],
    lookbackStart: Date
  ): Promise<{ activityData: ToolActivityData[]; missingTools: string[] }> {
    const activityData: ToolActivityData[] = [];
    const missingTools: string[] = [];

    // Get user's connected integrations
    const integrations = await prisma.mCPIntegration.findMany({
      where: {
        userId,
        toolType: { in: selectedTools },
        isActive: true
      }
    });

    const connectedToolTypes = integrations.map(i => i.toolType);

    for (const toolType of selectedTools) {
      if (!connectedToolTypes.includes(toolType)) {
        missingTools.push(toolType);
        continue;
      }

      try {
        // Fetch activity from MCP integration
        // Note: This is a placeholder - actual MCP data fetching would go through the MCP service
        const activities = await this.fetchMCPToolActivity(userId, toolType, lookbackStart);

        activityData.push({
          toolType,
          activities,
          hasData: activities.length > 0
        });
      } catch (error) {
        console.error(`Error fetching ${toolType} activity:`, error);
        activityData.push({
          toolType,
          activities: [],
          hasData: false
        });
      }
    }

    return { activityData, missingTools };
  }

  /**
   * Fetch activity from MCP tool
   * This is a placeholder that would integrate with the actual MCP service
   */
  private async fetchMCPToolActivity(
    userId: string,
    toolType: string,
    lookbackStart: Date
  ): Promise<any[]> {
    // TODO: Integrate with actual MCP service to fetch tool activity
    // For now, return empty array - the actual implementation would:
    // 1. Get the user's MCP integration credentials
    // 2. Call the appropriate MCP tool to fetch activity
    // 3. Filter by lookback period
    // 4. Return normalized activity data

    console.log(`📝 Fetching ${toolType} activity for user ${userId} since ${lookbackStart.toISOString()}`);

    // Placeholder - in production this would call the MCP service
    return [];
  }

  /**
   * Generate journal entry content using AI
   */
  private async generateJournalEntry(
    activityData: ToolActivityData[],
    customPrompt: string | null,
    defaultCategory: string | null,
    defaultTags: string[],
    workspaceId: string
  ): Promise<{
    title: string;
    description: string;
    fullContent: string;
    category?: string;
    format7Data?: any;
    networkContent?: string;
    format7DataNetwork?: any;
  }> {
    // TODO: Integrate with AI service for actual content generation
    // For now, generate a placeholder structure

    const toolsUsed = activityData.filter(t => t.hasData).map(t => t.toolType);
    const totalActivities = activityData.reduce((sum, t) => sum + t.activities.length, 0);

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Placeholder content generation
    const title = `Work Summary - ${today}`;
    const description = `Auto-generated summary of activities from ${toolsUsed.join(', ')}`;

    let fullContent = `# Daily Work Summary\n\n`;
    fullContent += `**Date:** ${today}\n\n`;
    fullContent += `## Activity Summary\n\n`;

    for (const tool of activityData) {
      if (tool.hasData) {
        fullContent += `### ${tool.toolType.charAt(0).toUpperCase() + tool.toolType.slice(1)}\n`;
        fullContent += `- ${tool.activities.length} activities recorded\n\n`;
      }
    }

    if (customPrompt) {
      fullContent += `\n---\n*Focus: ${customPrompt}*\n`;
    }

    // Format7 data structure for rich journal entries (with required entry_metadata)
    const now = new Date();
    const format7Data = {
      entry_metadata: {
        title,
        date: now.toISOString().split('T')[0],
        type: 'reflection' as const,
        workspace: workspaceId,
        privacy: 'private' as const,
        isAutomated: true,
        created_at: now.toISOString()
      },
      context: {
        date_range: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: now.toISOString()
        },
        sources_included: toolsUsed,
        total_activities: totalActivities,
        primary_focus: customPrompt || 'Daily work summary'
      },
      activities: activityData.flatMap(tool =>
        tool.activities.map((activity: any, idx: number) => ({
          id: `${tool.toolType}-${idx}`,
          source: tool.toolType,
          type: 'task',
          action: 'completed',
          description: activity.title || activity.description || 'Activity',
          timestamp: activity.timestamp || now.toISOString(),
          evidence: {
            type: 'link',
            url: activity.url || '',
            title: activity.title || 'Activity',
            links: [],
            metadata: {}
          },
          related_activities: [],
          technologies: [],
          collaborators: [],
          reviewers: [],
          importance: 'medium' as const,
          metadata: activity
        }))
      ),
      summary: {
        total_time_range_hours: 24,
        activities_by_type: { task: totalActivities },
        activities_by_source: Object.fromEntries(
          activityData.map(t => [t.toolType, t.activities.length])
        ),
        unique_collaborators: [],
        unique_reviewers: [],
        technologies_used: [],
        skills_demonstrated: []
      },
      correlations: [],
      artifacts: [],
      // Legacy fields for backward compatibility
      generatedAt: now.toISOString(),
      isAutoGenerated: true,
      customPrompt
    };

    return {
      title,
      description,
      fullContent,
      category: defaultCategory || 'Daily Summary',
      format7Data,
      networkContent: description, // Simplified version for network view
      format7DataNetwork: {
        entry_metadata: {
          title,
          date: now.toISOString().split('T')[0],
          type: 'reflection',
          isAutomated: true
        },
        summary: description,
        toolsUsed,
        isAutoGenerated: true
      }
    };
  }

  /**
   * Send notification when entry is ready for review
   */
  private async sendEntryReadyNotification(
    userId: string,
    workspaceId: string,
    workspaceName: string,
    entryId: string
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          recipientId: userId,
          title: `Journal entry ready for ${workspaceName}`,
          message: 'Your auto-generated journal entry is ready for review',
          relatedEntityType: 'JOURNAL_ENTRY',
          relatedEntityId: entryId,
          data: {
            subtype: 'journal_auto_entry_ready',
            workspaceId,
            entryId
          }
        }
      });
    } catch (error) {
      console.error('Error sending entry ready notification:', error);
    }
  }

  /**
   * Send notification when no activity was found
   */
  private async sendNoActivityNotification(
    userId: string,
    workspaceId: string,
    workspaceName: string
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          recipientId: userId,
          title: `No activity found for ${workspaceName}`,
          message: 'No activity was found from your connected tools. Want to add an entry manually?',
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: workspaceId,
          data: {
            subtype: 'journal_auto_no_activity',
            workspaceId
          }
        }
      });
    } catch (error) {
      console.error('Error sending no activity notification:', error);
    }
  }

  /**
   * Send notification about missing/disconnected tools
   */
  private async sendMissingToolsNotification(
    userId: string,
    workspaceId: string,
    workspaceName: string,
    missingTools: string[]
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          recipientId: userId,
          title: `Missing tools for ${workspaceName}`,
          message: `Your journal entry was generated without ${missingTools.join(', ')}. Connect them for complete entries.`,
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: workspaceId,
          data: {
            subtype: 'journal_auto_tools_missing',
            workspaceId,
            missingTools
          }
        }
      });
    } catch (error) {
      console.error('Error sending missing tools notification:', error);
    }
  }

  /**
   * Send notification when generation fails
   */
  private async sendGenerationFailedNotification(
    userId: string,
    workspaceId: string,
    workspaceName: string
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          recipientId: userId,
          title: `Journal generation failed for ${workspaceName}`,
          message: 'There was an issue generating your journal entry. Please try again later or create one manually.',
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: workspaceId,
          data: {
            subtype: 'journal_auto_generation_failed',
            workspaceId
          }
        }
      });
    } catch (error) {
      console.error('Error sending generation failed notification:', error);
    }
  }
}

// Export singleton instance
export const journalAutoGeneratorService = new JournalAutoGeneratorService();
