/**
 * Career Story Service - STUB
 *
 * This is a temporary stub created to fix the deployment.
 * The full implementation was accidentally deleted and needs to be restored.
 *
 * TODO: Restore from feature/dual-path-draft-generation branch
 */

import { prisma } from '../../lib/prisma';

export type SourceMode = 'demo' | 'production';
export type FrameworkName = 'STAR' | 'ONE_ON_ONE' | 'SKILL_GAP' | 'PROJECT_IMPACT';

export interface NarrativeSection {
  title: string;
  content: string;
}

export interface NarrativeSections {
  [key: string]: NarrativeSection;
}

export interface CreateStoryInput {
  userId: string;
  title?: string;
  activityIds: string[];
  framework?: FrameworkName;
}

export interface EditActivitiesInput {
  storyId: string;
  userId: string;
  activityIds: string[];
}

export interface StoryResult {
  success: boolean;
  error?: string;
  story?: {
    id: string;
    title: string;
  };
}

export interface StoriesListResult {
  stories: Array<{
    id: string;
    title: string;
  }>;
  total: number;
}

export const NARRATIVE_FRAMEWORKS: Record<FrameworkName, { name: string; sections: string[] }> = {
  STAR: {
    name: 'STAR Method',
    sections: ['situation', 'task', 'action', 'result'],
  },
  ONE_ON_ONE: {
    name: '1:1 Meeting',
    sections: ['accomplishments', 'challenges', 'goals', 'feedback'],
  },
  SKILL_GAP: {
    name: 'Skill Gap Analysis',
    sections: ['current_skills', 'gaps', 'learning_plan', 'progress'],
  },
  PROJECT_IMPACT: {
    name: 'Project Impact',
    sections: ['context', 'contribution', 'impact', 'learnings'],
  },
};

export class CareerStoryService {
  constructor(private sourceMode: SourceMode) {}

  async createStory(input: CreateStoryInput): Promise<StoryResult> {
    console.warn('CareerStoryService.createStory is a stub - not implemented');
    return {
      success: false,
      error: 'Story creation is temporarily unavailable',
    };
  }

  async editActivities(input: EditActivitiesInput): Promise<StoryResult> {
    console.warn('CareerStoryService.editActivities is a stub - not implemented');
    return {
      success: false,
      error: 'Activity editing is temporarily unavailable',
    };
  }

  async getStories(userId: string): Promise<StoriesListResult> {
    console.warn('CareerStoryService.getStories is a stub - not implemented');
    return {
      stories: [],
      total: 0,
    };
  }
}

export function createCareerStoryService(sourceMode: SourceMode): CareerStoryService {
  return new CareerStoryService(sourceMode);
}
