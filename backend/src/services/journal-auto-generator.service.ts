import { prisma } from '../lib/prisma';
import { journalSubscriptionService } from './journal-subscription.service';
import { JournalService } from './journal.service';
import {
  GroupingMethod,
  JournalFramework,
  JOURNAL_FRAMEWORK_COMPONENTS,
  JOURNAL_FRAMEWORKS,
  FrameworkComponent,
  validateCadence,
  validateGroupingMethod,
  calculateLookbackStart,
  MS_PER_DAY,
  // Constants (Uncle Bob)
  DEFAULT_VISIBILITY,
  DEFAULT_IMPORTANCE,
  DEFAULT_CATEGORY,
  AUTO_GENERATED_TAGS,
  // Framework metadata registry (Sandi)
  FRAMEWORK_METADATA,
  DEFAULT_TITLE_PREFIX,
  DEFAULT_DESCRIPTION_TEMPLATE,
  // Generation context types (KB)
  ToolActivity,
  ToolActivityData,
  ActivityForGrouping,
  GroupedActivities,
  GenerationContext,
  GeneratedEntry,
  Format7Data,
  Format7Activity,
  Format7DataNetwork,
  // Notification types (DHH)
  NotificationType,
  NotificationContext,
  NotificationData,
  NOTIFICATION_CONFIGS,
  // Subscription type
  SubscriptionForProcessing,
} from '../types/journal-subscription.types';
import { ClusteringService } from './career-stories/clustering.service';
import { NARRATIVE_FRAMEWORKS } from './career-stories/pipeline/narrative-frameworks';

// Feature flag for testing - bypasses activity check when true
const TESTING_MODE = process.env.JOURNAL_AUTO_TESTING_MODE === 'true';

/** Capitalizes first letter of a string */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Validates if a string is a valid JournalFramework
 */
function isValidFramework(framework: string | null | undefined): framework is JournalFramework {
  return framework != null && JOURNAL_FRAMEWORKS.includes(framework as JournalFramework);
}

export class JournalAutoGeneratorService {
  private journalService: JournalService;
  private clusteringService: ClusteringService;

  constructor(
    journalService?: JournalService,
    clusteringService?: ClusteringService
  ) {
    this.journalService = journalService ?? new JournalService();
    this.clusteringService = clusteringService ?? new ClusteringService(prisma);
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
          await this.processSubscription(subscription as SubscriptionForProcessing);
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
  private async processSubscription(subscription: SubscriptionForProcessing): Promise<void> {
    const { id, userId, workspaceId, selectedTools, customPrompt, defaultCategory, defaultTags } = subscription;
    const workspaceName = subscription.workspace?.name || 'your workspace';

    console.log(`📝 Processing subscription ${id} for user ${userId} in workspace ${workspaceId}`);

    // Validate workspace is active
    if (!this.isWorkspaceActive(subscription)) {
      console.log(`⚠️ Skipping subscription ${id} - workspace is inactive`);
      await journalSubscriptionService.markSubscriptionProcessed(id);
      return;
    }

    // Fetch activity data
    const { activityData, missingTools, hasActivity } = await this.fetchAndValidateActivity(
      userId,
      selectedTools,
      subscription.cadence
    );

    // Handle no activity case
    if (!hasActivity && !TESTING_MODE) {
      console.log(`📝 No activity found for subscription ${id}`);
      await this.sendNotification('no_activity', { userId, workspaceId, workspaceName });
      await journalSubscriptionService.markSubscriptionProcessed(id);
      return;
    }

    if (TESTING_MODE && !hasActivity) {
      console.log(`📝 TESTING MODE: Bypassing activity check for subscription ${id}`);
    }

    // Generate and create entry
    await this.createEntryFromActivity(
      { userId, workspaceId, workspaceName },
      {
        activityData,
        customPrompt,
        defaultCategory,
        defaultTags,
        workspaceId,
        preferredFramework: this.validateFramework(subscription.preferredFramework),
        groupingMethod: validateGroupingMethod(subscription.groupingMethod),
      },
      missingTools,
      id
    );

    await journalSubscriptionService.markSubscriptionProcessed(id);
  }

  /**
   * Check if workspace is active
   */
  private isWorkspaceActive(subscription: SubscriptionForProcessing): boolean {
    return subscription.workspace?.isActive !== false;
  }

  /**
   * Validate and convert framework string to JournalFramework type
   */
  private validateFramework(framework: string | null | undefined): JournalFramework | null {
    if (isValidFramework(framework)) {
      return framework;
    }
    return null;
  }

  /**
   * Fetch activity data and validate
   */
  private async fetchAndValidateActivity(
    userId: string,
    selectedTools: string[],
    cadence: string | null
  ): Promise<{
    activityData: ToolActivityData[];
    missingTools: string[];
    hasActivity: boolean;
  }> {
    const validatedCadence = validateCadence(cadence);
    const lookbackStart = calculateLookbackStart(validatedCadence);

    const { activityData, missingTools } = await this.fetchToolActivityData(
      userId,
      selectedTools,
      lookbackStart
    );

    const hasActivity = activityData.some(tool => tool.hasData);

    return { activityData, missingTools, hasActivity };
  }

  /**
   * Create entry from activity data
   */
  private async createEntryFromActivity(
    context: NotificationContext,
    generationContext: GenerationContext,
    missingTools: string[],
    subscriptionId: string
  ): Promise<void> {
    const { userId, workspaceId, workspaceName } = context;

    try {
      const entryData = await this.generateJournalEntry(generationContext);

      const entry = await this.journalService.createJournalEntry(userId, {
        title: entryData.title,
        description: entryData.description,
        fullContent: entryData.fullContent,
        workspaceId,
        visibility: DEFAULT_VISIBILITY,
        tags: [...(generationContext.defaultTags || []), ...AUTO_GENERATED_TAGS],
        skills: [],
        category: generationContext.defaultCategory || entryData.category,
        format7Data: entryData.format7Data,
        networkContent: entryData.networkContent,
        format7DataNetwork: entryData.format7DataNetwork,
        generateNetworkEntry: true,
        collaborators: [],
        reviewers: [],
        artifacts: [],
        outcomes: []
      });

      console.log(`✅ Created draft journal entry ${entry.id} for subscription ${subscriptionId}`);

      await this.sendNotification('entry_ready', context, { entryId: entry.id });

      if (missingTools.length > 0) {
        await this.sendNotification('missing_tools', context, { missingTools });
      }
    } catch (error) {
      console.error(`❌ Error generating journal entry for subscription ${subscriptionId}:`, error);
      await this.sendNotification('generation_failed', context);
    }
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
   * Fetch activity from ToolActivity table
   */
  private async fetchMCPToolActivity(
    userId: string,
    toolType: string,
    lookbackStart: Date
  ): Promise<ToolActivity[]> {
    console.log(`[JournalAutoGenerator] Fetching ${toolType} activity for user ${userId} since ${lookbackStart.toISOString()}`);

    const activities = await prisma.toolActivity.findMany({
      where: {
        userId,
        source: toolType,
        timestamp: { gte: lookbackStart },
      },
      orderBy: { timestamp: 'desc' },
    });

    console.log(`[JournalAutoGenerator] Found ${activities.length} ${toolType} activities`);

    return activities as ToolActivity[];
  }

  /**
   * Group activities based on grouping method
   */
  groupActivities(
    activities: ActivityForGrouping[],
    method: GroupingMethod
  ): GroupedActivities {
    if (method === 'cluster') {
      return this.groupByCluster(activities);
    }
    return this.groupByTemporal(activities);
  }

  /**
   * Group activities by date (temporal grouping)
   */
  private groupByTemporal(activities: ActivityForGrouping[]): GroupedActivities {
    const dateMap = new Map<string, string[]>();

    activities.forEach((a) => {
      const dateKey = a.timestamp.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(a.id);
    });

    const groups = Array.from(dateMap.entries()).map(([key, activityIds]) => ({
      key,
      activityIds,
    }));

    return { method: 'temporal', groups };
  }

  /**
   * Group activities by shared references (cluster grouping)
   */
  private groupByCluster(activities: ActivityForGrouping[]): GroupedActivities {
    const clusterInput = activities.map((a) => ({
      id: a.id,
      source: a.source || 'unknown',
      sourceId: a.id,
      title: '',
      description: null,
      timestamp: a.timestamp,
      crossToolRefs: a.crossToolRefs,
    }));

    const clusters = this.clusteringService.clusterActivitiesInMemory(clusterInput);

    const groups = clusters.map((cluster, idx) => ({
      key: cluster.name || `cluster-${idx}`,
      activityIds: cluster.activityIds,
    }));

    // Add unclustered activities as individual groups
    const clusteredIds = new Set(clusters.flatMap((c) => c.activityIds));
    const unclustered = activities.filter((a) => !clusteredIds.has(a.id));

    if (unclustered.length > 0) {
      groups.push({
        key: 'unclustered',
        activityIds: unclustered.map((a) => a.id),
      });
    }

    return { method: 'cluster', groups };
  }

  /**
   * Group all activities from all tools using the specified grouping method
   */
  private groupAllActivities(
    activityData: ToolActivityData[],
    method: GroupingMethod
  ): GroupedActivities {
    const allActivities: ActivityForGrouping[] = activityData.flatMap(tool =>
      tool.activities.map(activity => ({
        id: activity.id,
        timestamp: activity.timestamp,
        crossToolRefs: activity.crossToolRefs || [],
        source: tool.toolType,
      }))
    );

    return this.groupActivities(allActivities, method);
  }

  /**
   * Get framework component definitions for a given framework type
   */
  getFrameworkComponents(framework: string | null | undefined): FrameworkComponent[] | null {
    if (!framework) {
      return null;
    }

    // Check journal-specific frameworks first
    if (JOURNAL_FRAMEWORK_COMPONENTS[framework]) {
      return JOURNAL_FRAMEWORK_COMPONENTS[framework];
    }

    // Check career-story narrative frameworks
    const narrativeFramework = NARRATIVE_FRAMEWORKS[framework as keyof typeof NARRATIVE_FRAMEWORKS];
    if (narrativeFramework) {
      return narrativeFramework.componentDefinitions.map((c) => ({
        name: c.name,
        label: c.label,
        description: c.description,
        prompt: c.prompt,
      }));
    }

    return null;
  }

  /**
   * Generate journal entry content using AI
   * Supports both context object (preferred) and legacy positional parameters
   */
  async generateJournalEntry(
    contextOrActivityData: GenerationContext | ToolActivityData[],
    customPrompt?: string | null,
    defaultCategory?: string | null,
    defaultTags?: string[],
    workspaceId?: string,
    preferredFramework?: JournalFramework | string | null,
    groupingMethod?: GroupingMethod | string | null
  ): Promise<GeneratedEntry> {
    // Support both new context object and legacy positional parameters
    let context: GenerationContext;

    if (Array.isArray(contextOrActivityData)) {
      // Legacy positional parameters - convert to context object
      context = {
        activityData: contextOrActivityData,
        customPrompt: customPrompt ?? null,
        defaultCategory: defaultCategory ?? null,
        defaultTags: defaultTags ?? [],
        workspaceId: workspaceId ?? '',
        preferredFramework: this.validateFramework(preferredFramework),
        groupingMethod: groupingMethod ? validateGroupingMethod(groupingMethod) : null,
      };
    } else {
      context = contextOrActivityData;
    }

    const ctxActivityData = context.activityData;
    const ctxCustomPrompt = context.customPrompt;
    const ctxDefaultCategory = context.defaultCategory;
    const ctxWorkspaceId = context.workspaceId;
    const ctxPreferredFramework = context.preferredFramework;
    const ctxGroupingMethod = context.groupingMethod;

    // TODO: Integrate with AI service for actual content generation
    // For now, generate a placeholder structure

    const toolsUsed = ctxActivityData.filter(t => t.hasData).map(t => t.toolType);
    const totalActivities = ctxActivityData.reduce((sum, t) => sum + t.activities.length, 0);

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Get framework components if a framework is specified
    const frameworkComponents = this.getFrameworkComponents(ctxPreferredFramework);

    // Group activities if groupingMethod is provided
    const validatedGroupingMethod = ctxGroupingMethod ? validateGroupingMethod(ctxGroupingMethod) : null;
    const groupedActivities = validatedGroupingMethod
      ? this.groupAllActivities(ctxActivityData, validatedGroupingMethod)
      : null;

    // Generate title and description using registry (Sandi: O/C Principle)
    const title = this.generateTitle(today, ctxPreferredFramework);
    const description = this.generateDescription(toolsUsed, ctxPreferredFramework);

    // Generate content structured by framework (if provided) and grouping
    const fullContent = this.generateFullContent(
      ctxActivityData,
      today,
      ctxCustomPrompt,
      frameworkComponents,
      groupedActivities
    );

    // Build format7Data (KB: extracted method)
    const format7Data = this.buildFormat7Data({
      title,
      workspaceId: ctxWorkspaceId,
      toolsUsed,
      totalActivities,
      customPrompt: ctxCustomPrompt,
      activityData: ctxActivityData,
      preferredFramework: ctxPreferredFramework ?? undefined,
      frameworkComponents,
      validatedGroupingMethod,
      groupedActivities,
    });

    return {
      title,
      description,
      fullContent,
      category: ctxDefaultCategory || DEFAULT_CATEGORY,
      format7Data,
      networkContent: description,
      format7DataNetwork: this.buildFormat7DataNetwork(title, description, toolsUsed),
    };
  }

  /**
   * Build Format7 data structure (KB: Extracted from generateJournalEntry)
   */
  private buildFormat7Data(params: {
    title: string;
    workspaceId: string;
    toolsUsed: string[];
    totalActivities: number;
    customPrompt: string | null;
    activityData: ToolActivityData[];
    preferredFramework?: string;
    frameworkComponents: FrameworkComponent[] | null;
    validatedGroupingMethod: GroupingMethod | null;
    groupedActivities: GroupedActivities | null;
  }): Format7Data {
    const {
      title,
      workspaceId,
      toolsUsed,
      totalActivities,
      customPrompt,
      activityData,
      preferredFramework,
      frameworkComponents,
      validatedGroupingMethod,
      groupedActivities,
    } = params;

    const now = new Date();

    // Extract signals from activity data for LLM context
    const { dominantRole, impactHighlights, technologies, activityEdges } =
      this.extractActivitySignals(activityData);

    const format7Data: Format7Data = {
      entry_metadata: {
        title,
        date: now.toISOString().split('T')[0],
        type: 'reflection',
        workspace: workspaceId,
        privacy: DEFAULT_VISIBILITY,
        isAutomated: true,
        created_at: now.toISOString()
      },
      context: {
        date_range: {
          start: new Date(Date.now() - MS_PER_DAY).toISOString(),
          end: now.toISOString()
        },
        sources_included: toolsUsed,
        total_activities: totalActivities,
        primary_focus: customPrompt || 'Daily work summary'
      },
      activities: this.buildFormat7Activities(activityData),
      summary: {
        total_time_range_hours: 24,
        activities_by_type: { task: totalActivities },
        activities_by_source: Object.fromEntries(
          activityData.map(t => [t.toolType, t.activities.length])
        ),
        unique_collaborators: [],
        unique_reviewers: [],
        technologies_used: technologies,
        skills_demonstrated: []
      },
      correlations: [],
      artifacts: [],
      generatedAt: now.toISOString(),
      isAutoGenerated: true,
      customPrompt
    } as any;

    // Add LLM-facing fields (not in Format7Data type but read by buildLLMInput via JSON)
    (format7Data as any).dominantRole = dominantRole;
    (format7Data as any).impactHighlights = impactHighlights;
    (format7Data as any).activityEdges = activityEdges;

    // Add framework info if provided
    if (preferredFramework && frameworkComponents) {
      format7Data.framework = preferredFramework;
      format7Data.frameworkComponents = frameworkComponents.map(c => ({
        name: c.name,
        label: c.label,
        content: '', // Placeholder for AI-generated content
        prompt: c.prompt,
      }));
    }

    // Add grouping info if groupingMethod was provided
    if (validatedGroupingMethod && groupedActivities) {
      format7Data.grouping = {
        method: validatedGroupingMethod,
        groups: groupedActivities.groups,
      };
    }

    return format7Data;
  }

  /**
   * Build Format7 activities array
   */
  private buildFormat7Activities(activityData: ToolActivityData[]): Format7Activity[] {
    const now = new Date();

    return activityData.flatMap(tool =>
      tool.activities.map((activity, idx): Format7Activity => ({
        id: `${tool.toolType}-${idx}`,
        source: tool.toolType,
        type: 'task',
        action: 'completed',
        description: activity.title || activity.description || 'Activity',
        timestamp: activity.timestamp?.toISOString?.() || now.toISOString(),
        evidence: {
          type: 'link',
          url: activity.sourceUrl || '',
          title: activity.title || 'Activity',
          links: [],
          metadata: {}
        },
        related_activities: [],
        technologies: [],
        collaborators: [],
        reviewers: [],
        importance: DEFAULT_IMPORTANCE,
        metadata: activity
      }))
    );
  }

  /**
   * Extract signals from activity data for LLM context.
   * Heuristic extraction — no LLM call, just pattern matching.
   */
  private extractActivitySignals(activityData: ToolActivityData[]): {
    dominantRole: string;
    impactHighlights: string[];
    technologies: string[];
    activityEdges: Array<{ activityId: string; type: string; message: string }>;
  } {
    const allActivities = activityData.flatMap(t =>
      t.activities.map(a => ({ ...a, toolType: t.toolType }))
    );

    // Infer dominant role from activity mix
    let prsMerged = 0;
    let reviewsDone = 0;
    let totalCommits = 0;
    for (const a of allActivities) {
      const raw = a.rawData as Record<string, any> | null;
      const sid = a.sourceId || '';
      if (sid.includes('#') && !sid.startsWith('commit:')) prsMerged++;
      if (raw?.state === 'APPROVED' || raw?.reviewDecision) reviewsDone++;
      if (sid.startsWith('commit:')) totalCommits++;
    }

    let dominantRole = 'Contributed';
    if (prsMerged >= 3 || reviewsDone >= 2) dominantRole = 'Led';
    else if (prsMerged >= 1) dominantRole = 'Drove';

    // Extract impact highlights from titles with quantitative signals
    const impactHighlights: string[] = [];
    const impactPattern = /\d+%|\d+ (file|test|endpoint|user|error|bug|fix|migration|table|api)/i;
    for (const a of allActivities) {
      const text = `${a.title || ''} ${a.description || ''}`;
      if (impactPattern.test(text) && impactHighlights.length < 5) {
        impactHighlights.push(a.title || a.description || '');
      }
    }
    // If no quantitative signals, use PR titles as highlights
    if (impactHighlights.length === 0) {
      for (const a of allActivities) {
        const sid = a.sourceId || '';
        if (sid.includes('#') && !sid.startsWith('commit:') && impactHighlights.length < 3) {
          impactHighlights.push(a.title || '');
        }
      }
    }

    // Extract technologies from rawData labels and language fields
    const techSet = new Set<string>();
    for (const a of allActivities) {
      const raw = a.rawData as Record<string, any> | null;
      if (!raw) continue;
      // GitHub labels
      if (Array.isArray(raw.labels)) {
        for (const label of raw.labels) {
          const name = typeof label === 'string' ? label : label?.name;
          if (name) techSet.add(name);
        }
      }
      // Language field
      if (raw.language && typeof raw.language === 'string') {
        techSet.add(raw.language);
      }
    }

    // Build activity edges (primary for PRs, supporting for commits, contextual for others)
    const activityEdges: Array<{ activityId: string; type: string; message: string }> = [];
    for (const a of allActivities) {
      const sid = a.sourceId || '';
      let type = 'contextual';
      if (sid.includes('#') && !sid.startsWith('commit:')) type = 'primary';
      else if (sid.startsWith('commit:')) type = 'supporting';
      activityEdges.push({
        activityId: a.id,
        type,
        message: a.title || ''
      });
    }

    return {
      dominantRole,
      impactHighlights,
      technologies: Array.from(techSet).slice(0, 10),
      activityEdges
    };
  }

  /**
   * Build Format7 data for network view
   */
  private buildFormat7DataNetwork(
    title: string,
    description: string,
    toolsUsed: string[]
  ): Format7DataNetwork {
    const now = new Date();
    return {
      entry_metadata: {
        title,
        date: now.toISOString().split('T')[0],
        type: 'reflection',
        isAutomated: true
      },
      summary: description,
      toolsUsed,
      isAutoGenerated: true
    };
  }

  /**
   * Generate title based on framework type using FRAMEWORK_METADATA registry
   * (Sandi: Open/Closed Principle - add new frameworks without modifying this method)
   */
  generateTitle(today: string, framework?: string | null): string {
    const metadata = framework ? FRAMEWORK_METADATA[framework] : null;
    const prefix = metadata?.titlePrefix || DEFAULT_TITLE_PREFIX;
    return `${prefix} - ${today}`;
  }

  /**
   * Generate description based on framework type using FRAMEWORK_METADATA registry
   * (Sandi: Open/Closed Principle)
   */
  generateDescription(toolsUsed: string[], framework?: string | null): string {
    const toolsList = toolsUsed.length > 0 ? toolsUsed.join(', ') : 'connected tools';
    const metadata = framework ? FRAMEWORK_METADATA[framework] : null;
    const template = metadata?.descriptionTemplate || DEFAULT_DESCRIPTION_TEMPLATE;
    return template.replace('{tools}', toolsList);
  }

  /**
   * Generate full content structured by framework components
   */
  generateFullContent(
    activityData: ToolActivityData[],
    today: string,
    customPrompt: string | null,
    frameworkComponents: FrameworkComponent[] | null,
    groupedActivities?: GroupedActivities | null
  ): string {
    let content = '';

    if (frameworkComponents && frameworkComponents.length > 0) {
      content += `# ${today}\n\n`;

      for (const component of frameworkComponents) {
        if (!component.label) continue;

        content += `## ${component.label}\n`;
        if (component.description) {
          content += `*${component.description}*\n\n`;
        }
        if (component.prompt) {
          content += `<!-- ${component.prompt} -->\n`;
        }
        content += `- *(Add your ${component.label.toLowerCase()} here)*\n\n`;
      }

      content += '---\n\n';
      content += this.generateActivitySummaryContent(activityData, groupedActivities);
    } else {
      content += `# Daily Work Summary\n\n`;
      content += `**Date:** ${today}\n\n`;
      content += this.generateActivitySummaryContent(activityData, groupedActivities);
    }

    if (customPrompt) {
      content += `\n---\n*Focus: ${customPrompt}*\n`;
    }

    return content;
  }

  /**
   * Generate activity summary content section
   */
  generateActivitySummaryContent(
    activityData: ToolActivityData[],
    groupedActivities?: GroupedActivities | null
  ): string {
    let content = `## Activity Summary\n\n`;

    const toolsWithData = activityData.filter(tool => tool.hasData);

    if (toolsWithData.length === 0) {
      content += `*No activities recorded*\n\n`;
      return content;
    }

    if (groupedActivities && groupedActivities.groups.length > 0) {
      content += `*Grouped by ${groupedActivities.method}*\n\n`;

      for (const group of groupedActivities.groups) {
        content += `### ${group.key}\n`;
        content += `- ${group.activityIds.length} activities\n\n`;
      }

      content += `#### By Tool\n`;
      for (const tool of toolsWithData) {
        content += `- **${capitalize(tool.toolType)}**: ${tool.activities.length} activities\n`;
      }
      content += '\n';
    } else {
      for (const tool of toolsWithData) {
        content += `### ${capitalize(tool.toolType)}\n`;
        content += `- ${tool.activities.length} activities recorded\n\n`;
      }
    }

    return content;
  }

  /**
   * Send notification (DHH: Consolidated notification handling)
   * Single method handles all notification types using NOTIFICATION_CONFIGS registry
   */
  private async sendNotification(
    type: NotificationType,
    context: NotificationContext,
    data?: NotificationData
  ): Promise<void> {
    try {
      const config = NOTIFICATION_CONFIGS[type];
      const { userId, workspaceId, workspaceName } = context;

      // Build title from template
      let title = config.titleTemplate.replace('{workspaceName}', workspaceName);

      // Build message, replacing any placeholders
      let message = config.message;
      if (data?.missingTools) {
        message = message.replace('{missingTools}', data.missingTools.join(', '));
      }

      // Determine relatedEntityId
      const relatedEntityId = config.relatedEntityType === 'JOURNAL_ENTRY' && data?.entryId
        ? data.entryId
        : workspaceId;

      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          recipientId: userId,
          title,
          message,
          relatedEntityType: config.relatedEntityType,
          relatedEntityId,
          data: {
            subtype: config.subtype,
            workspaceId,
            ...(data?.entryId && { entryId: data.entryId }),
            ...(data?.missingTools && { missingTools: data.missingTools }),
          }
        }
      });
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error);
    }
  }
}

// Export singleton instance
export const journalAutoGeneratorService = new JournalAutoGeneratorService();
