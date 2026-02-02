/**
 * Story Publishing Service - STUB
 *
 * This is a temporary stub created to fix the deployment.
 * The full implementation was accidentally deleted and needs to be restored.
 *
 * TODO: Restore from feature/dual-path-draft-generation branch
 */

import { prisma } from '../../lib/prisma';

export type Visibility = 'private' | 'workspace' | 'network';

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
}

export interface PublishedStoriesResult {
  stories: PublishedStory[];
  total: number;
  totalCount?: number;
  viewerAccess?: string;
}

export class StoryPublishingService {
  constructor(private isDemoMode: boolean) {}

  async publish(
    storyId: string,
    userId: string,
    visibility: Visibility
  ): Promise<PublishResult> {
    console.warn('StoryPublishingService.publish is a stub - not implemented');
    return {
      success: false,
      error: 'Story publishing is temporarily unavailable',
    };
  }

  async unpublish(storyId: string, userId: string): Promise<PublishResult> {
    console.warn('StoryPublishingService.unpublish is a stub - not implemented');
    return {
      success: false,
      error: 'Story unpublishing is temporarily unavailable',
    };
  }

  async setVisibility(
    storyId: string,
    userId: string,
    visibility: Visibility
  ): Promise<PublishResult> {
    console.warn('StoryPublishingService.setVisibility is a stub - not implemented');
    return {
      success: false,
      error: 'Visibility update is temporarily unavailable',
    };
  }

  async getStory(
    storyId: string,
    userId: string
  ): Promise<PublishResult> {
    console.warn('StoryPublishingService.getStory is a stub - not implemented');
    return {
      success: false,
      error: 'Story fetch is temporarily unavailable',
    };
  }

  async getPublishedStories(
    userId: string,
    viewerId?: string | null,
    isWorkspaceMember?: boolean
  ): Promise<PublishedStoriesResult> {
    console.warn('StoryPublishingService.getPublishedStories is a stub - not implemented');
    return {
      stories: [],
      total: 0,
      totalCount: 0,
      viewerAccess: 'none',
    };
  }

  async getPublicProfile(
    userId: string
  ): Promise<{ stories: PublishedStory[]; profile: unknown } | null> {
    console.warn('StoryPublishingService.getPublicProfile is a stub - not implemented');
    return null;
  }
}

export function createStoryPublishingService(isDemoMode: boolean): StoryPublishingService {
  return new StoryPublishingService(isDemoMode);
}
