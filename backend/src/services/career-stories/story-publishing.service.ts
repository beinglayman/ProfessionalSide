/**
 * Story Publishing Service
 *
 * Manages the publication lifecycle for career stories:
 * - Publish/unpublish stories to/from user profiles
 * - Control story visibility (private, workspace, network)
 * - Retrieve published stories respecting viewer access levels
 *
 * Visibility Levels:
 * - private: Only visible to the story owner
 * - workspace: Visible to workspace members
 * - network: Publicly visible to all authenticated users
 */

import { prisma } from '../../lib/prisma';
import { NARRATIVE_FRAMEWORKS } from './pipeline/narrative-frameworks';
import { NarrativeFrameworkType } from './pipeline/types';

export type Visibility = 'private' | 'workspace' | 'network';

/** Valid visibility values for story publication */
const VALID_VISIBILITIES: readonly Visibility[] = ['private', 'workspace', 'network'];

/** Error messages for consistent error responses */
const ERRORS = {
  STORY_NOT_FOUND: 'Story not found',
  NOT_OWNER: 'You do not own this story',
  INVALID_VISIBILITY: 'Invalid visibility setting',
  NEEDS_REGENERATION: 'Story needs regeneration before publishing',
  MISSING_FIELDS: 'Story is missing required fields',
} as const;

/** Type guard to validate visibility value */
function isValidVisibility(value: string): value is Visibility {
  return VALID_VISIBILITIES.includes(value as Visibility);
}

export interface PublishResult {
  success: boolean;
  error?: string;
  story?: PublishedStory;
  missingFields?: string[];
}

export interface PublishedStory {
  id: string;
  title: string;
  publishedAt: Date | null;
  visibility?: Visibility;
  framework?: string;
  sections?: unknown;
  activityIds?: string[];
  isPublished?: boolean;
  needsRegeneration?: boolean;
  generatedAt?: Date | null;
  archetype?: string | null;
  category?: string | null;
  role?: string | null;
  journalEntryId?: string | null;
}

export interface PublishedStoriesResult {
  stories: PublishedStory[];
  total: number;
  totalCount?: number;
  viewerAccess?: string;
}

export class StoryPublishingService {
  constructor(private isDemoMode: boolean) {}

  private get sourceMode(): 'demo' | 'production' {
    return this.isDemoMode ? 'demo' : 'production';
  }

  private mapStory(story: {
    id: string;
    title: string;
    publishedAt: Date | null;
    visibility: string;
    framework: string;
    sections: unknown;
    activityIds: string[];
    isPublished: boolean;
    needsRegeneration: boolean;
    generatedAt: Date | null;
    archetype?: string | null;
    category?: string | null;
    role?: string | null;
    journalEntryId?: string | null;
  }): PublishedStory {
    return {
      id: story.id,
      title: story.title,
      publishedAt: story.publishedAt,
      visibility: story.visibility as Visibility,
      framework: story.framework,
      sections: story.sections,
      activityIds: story.activityIds,
      isPublished: story.isPublished,
      needsRegeneration: story.needsRegeneration,
      generatedAt: story.generatedAt,
      archetype: story.archetype,
      category: story.category,
      role: story.role,
      journalEntryId: story.journalEntryId,
    };
  }

  private getMissingFields(story: {
    title: string | null;
    framework: string | null;
    sections: unknown;
    activityIds: string[];
  }): string[] {
    const missing: string[] = [];
    if (!story.title || story.title.trim().length === 0) {
      missing.push('title');
    }
    if (!story.framework || story.framework.trim().length === 0) {
      missing.push('framework');
    }
    if (!story.activityIds || story.activityIds.length === 0) {
      missing.push('activityIds');
    }
    const sections = story.sections;
    const hasSections =
      sections &&
      typeof sections === 'object' &&
      !Array.isArray(sections) &&
      Object.keys(sections as Record<string, unknown>).length > 0;
    if (!hasSections) {
      missing.push('sections');
      return missing;
    }

    const frameworkKey = story.framework as NarrativeFrameworkType;
    const requiredSections = NARRATIVE_FRAMEWORKS[frameworkKey]?.componentOrder || [];
    if (requiredSections.length === 0) {
      return missing;
    }

    const sectionRecord = sections as Record<string, any>;
    for (const sectionKey of requiredSections) {
      const section = sectionRecord[sectionKey];
      if (!section || typeof section !== 'object') {
        missing.push(`sections.${sectionKey}`);
        continue;
      }
      const summary = typeof section.summary === 'string'
        ? section.summary
        : typeof section.text === 'string'
          ? section.text
          : '';
      if (!summary || summary.trim().length === 0) {
        missing.push(`sections.${sectionKey}.summary`);
      }
    }
    return missing;
  }

  async publish(
    storyId: string,
    userId: string,
    visibility: Visibility
  ): Promise<PublishResult> {
    if (!isValidVisibility(visibility)) {
      return { success: false, error: ERRORS.INVALID_VISIBILITY };
    }

    const story = await prisma.careerStory.findUnique({
      where: { id: storyId },
    });

    if (!story || story.sourceMode !== this.sourceMode) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    if (story.userId !== userId) {
      return { success: false, error: ERRORS.NOT_OWNER };
    }

    if (story.needsRegeneration) {
      return { success: false, error: ERRORS.NEEDS_REGENERATION };
    }

    const missingFields = this.getMissingFields({
      title: story.title,
      framework: story.framework,
      sections: story.sections,
      activityIds: story.activityIds,
    });

    if (missingFields.length > 0) {
      return {
        success: false,
        error: ERRORS.MISSING_FIELDS,
        missingFields,
      };
    }

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: {
        isPublished: true,
        visibility,
        publishedAt: story.publishedAt ?? new Date(),
      },
    });

    return {
      success: true,
      story: this.mapStory(updated),
    };
  }

  async unpublish(storyId: string, userId: string): Promise<PublishResult> {
    const story = await prisma.careerStory.findUnique({
      where: { id: storyId },
    });

    if (!story || story.sourceMode !== this.sourceMode) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    if (story.userId !== userId) {
      return { success: false, error: ERRORS.NOT_OWNER };
    }

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });

    return {
      success: true,
      story: this.mapStory(updated),
    };
  }

  async setVisibility(
    storyId: string,
    userId: string,
    visibility: Visibility
  ): Promise<PublishResult> {
    if (!isValidVisibility(visibility)) {
      return { success: false, error: ERRORS.INVALID_VISIBILITY };
    }

    const story = await prisma.careerStory.findUnique({
      where: { id: storyId },
    });

    if (!story || story.sourceMode !== this.sourceMode) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    if (story.userId !== userId) {
      return { success: false, error: ERRORS.NOT_OWNER };
    }

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: { visibility },
    });

    return {
      success: true,
      story: this.mapStory(updated),
    };
  }

  async getStory(
    storyId: string,
    userId: string
  ): Promise<PublishResult> {
    const story = await prisma.careerStory.findUnique({
      where: { id: storyId },
    });

    if (!story || story.sourceMode !== this.sourceMode) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    if (story.userId !== userId) {
      return { success: false, error: ERRORS.NOT_OWNER };
    }

    return {
      success: true,
      story: this.mapStory(story),
    };
  }

  async getPublishedStories(
    userId: string,
    viewerId?: string | null,
    isWorkspaceMember?: boolean
  ): Promise<PublishedStoriesResult> {
    // Access tier drives which visibility levels the viewer can see.
    const viewerAccess = viewerId === userId
      ? 'owner'
      : isWorkspaceMember
        ? 'workspace'
        : viewerId
          ? 'network'
          : 'public';

    // Enforce profile visibility for unauthenticated viewers
    if (viewerAccess === 'public') {
      const profile = await prisma.userProfile.findFirst({
        where: { userId },
        select: { profileVisibility: true },
      });
      const visibility = profile?.profileVisibility ?? 'network';
      if (visibility !== 'public') {
        return { stories: [], total: 0, totalCount: 0, viewerAccess: 'none' };
      }
    }

    let visibilityFilter: Visibility[] | null = null;
    if (viewerAccess === 'workspace') {
      visibilityFilter = ['workspace', 'network'];
    } else if (viewerAccess === 'network' || viewerAccess === 'public') {
      visibilityFilter = ['network'];
    }

    const baseWhere = {
      userId,
      sourceMode: this.sourceMode,
      isPublished: true,
      ...(visibilityFilter ? { visibility: { in: visibilityFilter } } : {}),
    };

    const [stories, totalCount] = await Promise.all([
      prisma.careerStory.findMany({
        where: baseWhere,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.careerStory.count({ where: baseWhere }),
    ]);

    return {
      stories: stories.map((story) => this.mapStory(story)),
      total: stories.length,
      totalCount,
      viewerAccess,
    };
  }

  async getPublicProfile(
    userId: string
  ): Promise<{ stories: PublishedStory[]; profile: unknown } | null> {
    const profile = await prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        name: true,
        title: true,
        company: true,
        bio: true,
        avatar: true,
        profile: {
          select: {
            profileVisibility: true,
          },
        },
      },
    });

    if (!profile) return null;

    const visibility = profile.profile?.profileVisibility ?? 'network';
    if (visibility !== 'public') {
      return null;
    }

    const result = await this.getPublishedStories(userId, null, false);

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        title: profile.title,
        company: profile.company,
        bio: profile.bio,
        avatar: profile.avatar,
      },
      stories: result.stories,
    };
  }
}

export function createStoryPublishingService(isDemoMode: boolean): StoryPublishingService {
  return new StoryPublishingService(isDemoMode);
}
