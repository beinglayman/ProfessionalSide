/**
 * Career Story Service
 *
 * Creates and manages career story records backed by the CareerStory table.
 * Supports demo/production isolation via sourceMode.
 *
 * Key Features:
 * - Create stories from activities or journal entries
 * - Generate narratives using pattern matching + optional LLM polish
 * - Support multiple narrative frameworks (STAR, CAR, PAR, etc.)
 * - Publish/unpublish stories with visibility controls
 */

import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { getToolActivityTable } from '../../lib/demo-tables';
import { NarrativeFrameworkType, CareerPersona } from './pipeline/types';
import { NARRATIVE_FRAMEWORKS as PIPELINE_FRAMEWORKS } from './pipeline/narrative-frameworks';
import {
  StoryPublishingService,
  PublishResult,
  Visibility,
} from './story-publishing.service';
import { narrativeGenerationService } from './star-generation.service';
import { ActivityWithRefs } from './pipeline/cluster-hydrator';

/** Error messages for consistent error responses */
const ERRORS = {
  STORY_NOT_FOUND: 'Story not found',
  NO_ACTIVITIES: 'No activities found for story',
  ENTRY_NOT_FOUND: 'Journal entry not found',
  ENTRY_NO_ACTIVITIES: 'Journal entry has no activities',
  INVALID_SECTIONS: 'Invalid narrative sections',
} as const;

/** Maps framework section names to STAR component keys */
const SECTION_TO_STAR_COMPONENT: Record<string, 'situation' | 'task' | 'action' | 'result'> = {
  situation: 'situation',
  context: 'situation',
  challenge: 'situation',
  problem: 'situation',
  task: 'task',
  objective: 'task',
  action: 'action',
  actions: 'action',
  result: 'result',
  results: 'result',
  learning: 'result',
  outcome: 'result',
};

export type SourceMode = 'demo' | 'production';
export type FrameworkName = NarrativeFrameworkType;

export interface NarrativeEvidence {
  activityId: string;
  date?: string;
  description?: string;
}

export interface NarrativeSection {
  summary: string;
  evidence: NarrativeEvidence[];
}

export interface NarrativeSections {
  [key: string]: NarrativeSection;
}

/** Input section from API - allows optional summary/text */
export interface InputSection {
  summary?: string;
  text?: string;
  evidence?: NarrativeEvidence[];
}

export interface CreateStoryInput {
  title?: string;
  activityIds: string[];
  framework?: FrameworkName;
  sections?: Record<string, InputSection>;
}

export interface EditActivitiesInput {
  storyId: string;
  userId: string;
  activityIds: string[];
}

export interface UpdateStoryInput {
  title?: string;
  framework?: FrameworkName;
  sections?: Record<string, InputSection>;
  activityIds?: string[];
}

export interface CareerStoryRecord {
  id: string;
  userId: string;
  sourceMode: SourceMode;
  title: string;
  framework: FrameworkName;
  sections: NarrativeSections;
  activityIds: string[];
  needsRegeneration: boolean;
  generatedAt: Date | null;
  isPublished: boolean;
  visibility: Visibility;
  publishedAt: Date | null;
}

export interface StoryResult {
  success: boolean;
  error?: string;
  missingFields?: string[];
  story?: CareerStoryRecord;
}

export interface StoriesListResult {
  stories: CareerStoryRecord[];
  total: number;
}

// Simplified framework map used by tests and validations
export const NARRATIVE_FRAMEWORKS: Record<FrameworkName, string[]> = Object.fromEntries(
  Object.entries(PIPELINE_FRAMEWORKS).map(([key, def]) => [key, def.componentOrder])
) as Record<FrameworkName, string[]>;

type ActivitySnapshot = {
  id: string;
  title: string;
  description: string | null;
  timestamp: Date;
};

export class CareerStoryService {
  private publishingService: StoryPublishingService;

  constructor(private isDemoMode: boolean) {
    this.publishingService = new StoryPublishingService(isDemoMode);
  }

  private get sourceMode(): SourceMode {
    return this.isDemoMode ? 'demo' : 'production';
  }

  private get activityTable() {
    return getToolActivityTable(this.isDemoMode);
  }

  private mapStory(story: {
    id: string;
    userId: string;
    sourceMode: string;
    title: string;
    framework: string;
    sections: unknown;
    activityIds: string[];
    needsRegeneration: boolean;
    generatedAt: Date | null;
    isPublished: boolean;
    visibility: string;
    publishedAt: Date | null;
  }): CareerStoryRecord {
    return {
      id: story.id,
      userId: story.userId,
      sourceMode: story.sourceMode as SourceMode,
      title: story.title,
      framework: story.framework as FrameworkName,
      sections: story.sections as NarrativeSections,
      activityIds: story.activityIds,
      needsRegeneration: story.needsRegeneration,
      generatedAt: story.generatedAt,
      isPublished: story.isPublished,
      visibility: story.visibility as Visibility,
      publishedAt: story.publishedAt,
    };
  }

  private async fetchActivities(userId: string, activityIds: string[]): Promise<ActivitySnapshot[]> {
    if (activityIds.length === 0) {
      return [];
    }

    const activities = await (this.activityTable.findMany as Function)({
      where: {
        userId,
        id: { in: activityIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    return activities as ActivitySnapshot[];
  }

  private buildTitle(activities: ActivitySnapshot[]): string {
    if (activities.length === 0) return 'Career Story';
    if (activities.length === 1) return activities[0].title;
    const titles = activities.slice(0, 2).map((a) => a.title).join(', ');
    const remaining = activities.length - 2;
    return remaining > 0
      ? `${titles} (+${remaining} more)`
      : titles;
  }

  private buildEvidence(activities: ActivitySnapshot[]): NarrativeEvidence[] {
    return activities.map((activity) => ({
      activityId: activity.id,
      date: activity.timestamp.toISOString(),
      description: activity.title,
    }));
  }

  private buildSectionSummary(section: string, activities: ActivitySnapshot[]): string {
    if (activities.length === 0) {
      return `${section} details pending.`;
    }
    const primary = activities[0].title;
    return `${section}: ${primary}${activities.length > 1 ? ` and ${activities.length - 1} more activities` : ''}`;
  }

  private buildSections(
    framework: FrameworkName,
    activities: ActivitySnapshot[]
  ): NarrativeSections {
    const sections: NarrativeSections = {};
    const evidence = this.buildEvidence(activities);
    const sectionKeys = NARRATIVE_FRAMEWORKS[framework] || [];

    sectionKeys.forEach((section) => {
      sections[section] = {
        summary: this.buildSectionSummary(section, activities),
        evidence,
      };
    });

    return sections;
  }

  private validateSectionsInput(
    framework: FrameworkName,
    sections: unknown,
    activityIds: string[]
  ): { valid: boolean; missingFields: string[]; normalized?: NarrativeSections } {
    const missingFields: string[] = [];

    if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
      return { valid: false, missingFields: ['sections'] };
    }

    const requiredSections = NARRATIVE_FRAMEWORKS[framework] || [];
    if (requiredSections.length === 0) {
      return { valid: false, missingFields: ['framework'] };
    }

    const normalized: NarrativeSections = {};

    for (const sectionKey of requiredSections) {
      const section = (sections as Record<string, any>)[sectionKey];
      if (!section || typeof section !== 'object') {
        missingFields.push(`sections.${sectionKey}`);
        continue;
      }

      const summary = typeof section.summary === 'string'
        ? section.summary
        : typeof section.text === 'string'
          ? section.text
          : '';

      if (!summary || summary.trim().length === 0) {
        missingFields.push(`sections.${sectionKey}.summary`);
      }

      const evidenceRaw = Array.isArray(section.evidence) ? section.evidence : [];
      const evidence = evidenceRaw
        .filter((item: any) => typeof item?.activityId === 'string')
        .map((item: any) => ({
          activityId: item.activityId as string,
          date: typeof item.date === 'string' ? item.date : undefined,
          description: typeof item.description === 'string' ? item.description : undefined,
        }))
        .filter((item: NarrativeEvidence) => activityIds.includes(item.activityId));

      normalized[sectionKey] = {
        summary,
        evidence,
      };
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
      normalized,
    };
  }

  async createStory(userId: string, input: CreateStoryInput): Promise<StoryResult> {
    const framework: FrameworkName = input.framework || 'STAR';

    const activities = await this.fetchActivities(userId, input.activityIds);
    if (activities.length === 0) {
      return { success: false, error: ERRORS.NO_ACTIVITIES };
    }

    let sections: NarrativeSections;
    if (input.sections) {
      const validation = this.validateSectionsInput(framework, input.sections, input.activityIds);
      if (!validation.valid || !validation.normalized) {
        return {
          success: false,
          error: ERRORS.INVALID_SECTIONS,
          missingFields: validation.missingFields,
        };
      }
      sections = validation.normalized;
    } else {
      sections = this.buildSections(framework, activities);
    }

    const title = input.title || this.buildTitle(activities);

    const story = await prisma.careerStory.create({
      data: {
        userId,
        sourceMode: this.sourceMode,
        title,
        activityIds: input.activityIds,
        framework,
        sections: sections as unknown as Prisma.InputJsonValue,
        generatedAt: new Date(),
        needsRegeneration: false,
        visibility: 'private',
        isPublished: false,
      },
    });

    return { success: true, story: this.mapStory(story) };
  }

  /**
   * Create a career story from a journal entry.
   *
   * This is the primary entry point for the "Promote to Career Story" feature.
   * It:
   * 1. Fetches the journal entry and its associated activities
   * 2. Generates narrative sections using the pipeline (pattern matching + LLM)
   * 3. Creates a CareerStory record with the generated content
   *
   * The narrative pipeline extracts STAR components from activity data using
   * regex patterns and can optionally polish the output via Azure OpenAI.
   *
   * @param userId - The user creating the story (must own the journal entry)
   * @param entryId - The journal entry to promote
   * @param framework - Narrative framework (default: STAR)
   * @returns Story result with optional clusterId if activities were clustered
   *
   * TODO: Include journal entry's fullContent/format7Data in narrative generation
   * TODO: Support custom prompts for LLM polishing
   */
  async createFromJournalEntry(
    userId: string,
    entryId: string,
    framework?: FrameworkName
  ): Promise<StoryResult & { clusterId?: string }> {
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        authorId: userId,
        sourceMode: this.sourceMode,
      },
      select: { id: true, title: true, activityIds: true },
    });

    if (!entry) {
      return { success: false, error: ERRORS.ENTRY_NOT_FOUND };
    }

    if (entry.activityIds.length === 0) {
      return { success: false, error: ERRORS.ENTRY_NO_ACTIVITIES };
    }

    // Find an existing cluster that contains any of these activities.
    // This helps correlate the story with existing clustering data (production only).
    let clusterId: string | undefined;

    if (!this.isDemoMode) {
      const activityWithCluster = await prisma.toolActivity.findFirst({
        where: {
          id: { in: entry.activityIds },
          clusterId: { not: null },
        },
        select: { clusterId: true },
      });

      if (activityWithCluster?.clusterId) {
        clusterId = activityWithCluster.clusterId;
      }
    }

    // Fetch full activities with cross-tool refs for narrative generation
    const activities = await this.fetchActivitiesWithRefs(userId, entry.activityIds);
    const useFramework: FrameworkName = framework || 'STAR';

    // Generate narrative using the pipeline (pattern matching + optional LLM polish).
    // Falls back to basic template-based sections if generation fails.
    let sections: NarrativeSections;
    try {
      sections = await this.generateNarrativeSections(activities, useFramework, userId);
    } catch {
      // Fallback to basic template-based sections if pipeline fails
      const basicActivities = await this.fetchActivities(userId, entry.activityIds);
      sections = this.buildSections(useFramework, basicActivities);
    }

    const title = entry.title || this.buildTitle(await this.fetchActivities(userId, entry.activityIds));

    const story = await prisma.careerStory.create({
      data: {
        userId,
        sourceMode: this.sourceMode,
        title,
        activityIds: entry.activityIds,
        framework: useFramework,
        sections: sections as unknown as Prisma.InputJsonValue,
        generatedAt: new Date(),
        needsRegeneration: false,
        visibility: 'private',
        isPublished: false,
      },
    });

    return {
      success: true,
      story: this.mapStory(story),
      clusterId,
    };
  }

  /**
   * Fetch activities with refs for narrative generation.
   * Returns activities in chronological order with cross-tool references.
   */
  private async fetchActivitiesWithRefs(userId: string, activityIds: string[]): Promise<ActivityWithRefs[]> {
    if (activityIds.length === 0) return [];

    type ActivityRow = {
      id: string;
      source: string;
      sourceId: string;
      sourceUrl: string | null;
      title: string;
      description: string | null;
      timestamp: Date;
      rawData: Record<string, unknown> | null;
      crossToolRefs: string[];
    };

    const activities = await (this.activityTable.findMany as Function)({
      where: {
        userId,
        id: { in: activityIds },
      },
      orderBy: { timestamp: 'asc' },
    }) as ActivityRow[];

    return activities.map((a) => ({
      id: a.id,
      source: a.source,
      sourceId: a.sourceId,
      sourceUrl: a.sourceUrl,
      title: a.title,
      description: a.description,
      timestamp: a.timestamp,
      rawData: a.rawData,
      refs: a.crossToolRefs || [],
    }));
  }

  /**
   * Generate narrative sections using the NarrativeGenerationService pipeline.
   *
   * The pipeline works as follows:
   * 1. Creates a pseudo-cluster from the activities (for pipeline compatibility)
   * 2. Runs pattern-based extraction to identify STAR components from activity data
   * 3. Optionally polishes the output via LLM (Azure OpenAI) for better prose
   * 4. Maps the STAR output to the requested framework's section format
   *
   * @param activities - Activities with cross-tool refs for context
   * @param framework - Target narrative framework (STAR, CAR, etc.)
   * @param userId - User ID (for persona context, not currently used)
   * @returns Formatted sections for the specified framework
   *
   * Known Limitation: Currently only uses activity title/description, not the
   * journal entry's rich content (fullContent, format7Data). This means some
   * context from the user's written narrative is not incorporated.
   */
  private async generateNarrativeSections(
    activities: ActivityWithRefs[],
    framework: FrameworkName,
    userId: string
  ): Promise<NarrativeSections> {
    if (activities.length === 0) {
      return this.buildSections(framework, []);
    }

    // Build a pseudo-cluster for the narrative generator
    const cluster = {
      id: `temp-${Date.now()}`,
      activityIds: activities.map((a) => a.id),
      sharedRefs: [...new Set(activities.flatMap((a) => a.refs))],
      metrics: {
        activityCount: activities.length,
        refCount: activities.reduce((sum, a) => sum + (a.refs?.length || 0), 0),
        toolTypes: [...new Set(activities.map((a) => a.source))],
        dateRange: activities.length > 0 ? {
          earliest: activities[0].timestamp,
          latest: activities[activities.length - 1].timestamp,
        } : undefined,
      },
    };

    // Default persona for generation
    const persona: CareerPersona = {
      displayName: 'User',
      emails: [],
      identities: {},
    };

    // Run through narrative generation pipeline (with polish enabled)
    const result = await narrativeGenerationService.generate(
      cluster,
      activities,
      persona,
      { framework, polish: true }
    );

    if (result.isErr() || !result.value.star) {
      // Fall back to basic sections if generation fails
      const basicActivities = activities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description ?? null,
        timestamp: a.timestamp,
      }));
      return this.buildSections(framework, basicActivities);
    }

    const star = result.value.star;

    // Convert ScoredSTAR to NarrativeSections format
    const sectionKeys = NARRATIVE_FRAMEWORKS[framework] || ['situation', 'task', 'action', 'result'];
    const sections: NarrativeSections = {};

    // Map framework sections to STAR components using the constant mapping
    for (const sectionKey of sectionKeys) {
      const starComponent = SECTION_TO_STAR_COMPONENT[sectionKey] || 'result';
      const component = star[starComponent];
      sections[sectionKey] = {
        summary: component.text || `${sectionKey}: details pending`,
        evidence: component.sources.map((activityId) => ({ activityId })),
      };
    }

    return sections;
  }

  async editActivities(
    storyId: string,
    userId: string,
    input: { activityIds: string[] }
  ): Promise<StoryResult> {
    const story = await prisma.careerStory.findFirst({
      where: { id: storyId, userId, sourceMode: this.sourceMode },
    });

    if (!story) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: {
        activityIds: input.activityIds,
        needsRegeneration: true,
      },
    });

    return { success: true, story: this.mapStory(updated) };
  }

  async updateStory(
    storyId: string,
    userId: string,
    input: UpdateStoryInput
  ): Promise<StoryResult> {
    const story = await prisma.careerStory.findFirst({
      where: { id: storyId, userId, sourceMode: this.sourceMode },
    });

    if (!story) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    const activityIds = input.activityIds || story.activityIds;
    const framework = input.framework || (story.framework as FrameworkName);

    let sections: NarrativeSections | undefined;
    if (input.sections) {
      const validation = this.validateSectionsInput(framework, input.sections, activityIds);
      if (!validation.valid || !validation.normalized) {
        return {
          success: false,
          error: ERRORS.INVALID_SECTIONS,
          missingFields: validation.missingFields,
        };
      }
      sections = validation.normalized;
    } else if (input.framework && input.framework !== story.framework) {
      const activities = await this.fetchActivities(userId, activityIds);
      sections = this.buildSections(framework, activities);
    }

    const activityIdsChanged = Boolean(
      input.activityIds &&
      (input.activityIds.length !== story.activityIds.length ||
        input.activityIds.some((id, idx) => id !== story.activityIds[idx]))
    );

    const needsRegeneration = sections
      ? false
      : activityIdsChanged
        ? true
        : story.needsRegeneration;

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: {
        title: input.title ?? undefined,
        framework,
        activityIds,
        sections: sections ? (sections as unknown as Prisma.InputJsonValue) : undefined,
        needsRegeneration,
        generatedAt: sections ? new Date() : story.generatedAt,
      },
    });

    return { success: true, story: this.mapStory(updated) };
  }

  async regenerate(
    storyId: string,
    userId: string,
    framework?: FrameworkName
  ): Promise<StoryResult> {
    const story = await prisma.careerStory.findFirst({
      where: { id: storyId, userId, sourceMode: this.sourceMode },
    });

    if (!story) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    const nextFramework = framework || (story.framework as FrameworkName);

    // Use the narrative pipeline for proper generation
    const activities = await this.fetchActivitiesWithRefs(userId, story.activityIds);
    if (activities.length === 0) {
      return { success: false, error: ERRORS.NO_ACTIVITIES };
    }

    let sections: NarrativeSections;
    try {
      sections = await this.generateNarrativeSections(activities, nextFramework, userId);
    } catch {
      // Fallback to basic template-based sections if pipeline fails
      const basicActivities = await this.fetchActivities(userId, story.activityIds);
      sections = this.buildSections(nextFramework, basicActivities);
    }

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: {
        framework: nextFramework,
        sections: sections as unknown as Prisma.InputJsonValue,
        needsRegeneration: false,
        generatedAt: new Date(),
      },
    });

    return { success: true, story: this.mapStory(updated) };
  }

  async deleteStory(storyId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const story = await prisma.careerStory.findFirst({
      where: { id: storyId, userId, sourceMode: this.sourceMode },
    });

    if (!story) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    await prisma.careerStory.delete({
      where: { id: storyId },
    });

    return { success: true };
  }

  async listStories(userId: string): Promise<StoriesListResult> {
    const stories = await prisma.careerStory.findMany({
      where: { userId, sourceMode: this.sourceMode },
      orderBy: { createdAt: 'desc' },
    });

    return {
      stories: stories.map((story) => this.mapStory(story)),
      total: stories.length,
    };
  }

  async publish(
    storyId: string,
    userId: string,
    visibility: Visibility = 'private'
  ): Promise<PublishResult> {
    return this.publishingService.publish(storyId, userId, visibility);
  }

  async unpublish(storyId: string, userId: string): Promise<PublishResult> {
    return this.publishingService.unpublish(storyId, userId);
  }

  async setVisibility(
    storyId: string,
    userId: string,
    visibility: Visibility
  ): Promise<PublishResult> {
    return this.publishingService.setVisibility(storyId, userId, visibility);
  }
}

export function createCareerStoryService(sourceMode: SourceMode | boolean): CareerStoryService {
  const isDemo = typeof sourceMode === 'boolean' ? sourceMode : sourceMode === 'demo';
  return new CareerStoryService(isDemo);
}
