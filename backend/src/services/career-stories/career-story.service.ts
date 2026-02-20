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
import { getModelSelector } from '../ai/model-selector.service';
import {
  buildCareerStoryMessages,
  parseCareerStoryResponse,
  FrameworkName as PromptFrameworkName,
  JournalEntryContent,
  FRAMEWORK_SECTIONS,
  WritingStyle,
} from '../ai/prompts/career-story.prompt';
import { buildLLMInput } from './llm-input.builder';

/** Simplified Format7Data type for journal content extraction */
interface Format7Data {
  frameworkComponents?: Array<{
    name: string;
    label: string;
    content: string;
    prompt?: string;
  }>;
  phases?: Array<{
    name: string;
    summary: string;
    activityIds?: string[];
  }>;
  activities?: Array<{
    id: string;
    description: string;
    action?: string;
  }>;
  summary?: {
    skills_demonstrated?: string[];
    technologies_used?: string[];
  };
  context?: {
    primary_focus?: string;
  };
  dominantRole?: string;
  impactHighlights?: string[];
}

/** Journal content for building sections */
interface JournalContent {
  fullContent: string | null;
  format7Data: Format7Data | null;
  description: string | null;
  category: string | null;
}

/** Error messages for consistent error responses */
const ERRORS = {
  STORY_NOT_FOUND: 'Story not found',
  NO_ACTIVITIES: 'No activities found for story',
  ENTRY_NOT_FOUND: 'Journal entry not found',
  ENTRY_NO_ACTIVITIES: 'Journal entry has no activities',
  INVALID_SECTIONS: 'Invalid narrative sections',
} as const;

/**
 * Maps framework section names to STAR component keys.
 * Used as a fallback when framework-specific sections aren't available.
 * Note: Frameworks like SHARE have unique sections (hindrances, evaluation)
 * that don't map cleanly to STAR - we use best-effort approximation.
 */
const SECTION_TO_STAR_COMPONENT: Record<string, 'situation' | 'task' | 'action' | 'result'> = {
  // STAR sections
  situation: 'situation',
  task: 'task',
  action: 'action',
  result: 'result',
  // Context/challenge variants → situation
  context: 'situation',
  challenge: 'situation',
  problem: 'situation',
  // SOAR obstacles → task (represents the difficulty to overcome)
  obstacles: 'task',
  // SHARE hindrances → task (represents challenges that impacted progress)
  hindrances: 'task',
  // Action variants
  actions: 'action',
  objective: 'task',
  // Result variants
  results: 'result',
  outcome: 'result',
  // Learning/evaluation → result (reflection on outcomes)
  learning: 'result',
  evaluation: 'result',
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
  archetype?: string;
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
  archetype?: string | null;
  category?: string | null;
  role?: string | null;
  journalEntryId?: string | null;
}

export interface StoryResult {
  success: boolean;
  error?: string;
  missingFields?: string[];
  story?: CareerStoryRecord;
  _sourceDebug?: Record<string, unknown>;
}

export interface StoriesListResult {
  stories: CareerStoryRecord[];
  total: number;
}

/**
 * Framework section definitions matching LLM prompt expectations.
 * Uses FRAMEWORK_SECTIONS from the prompt file for consistency with LLM output.
 *
 * Note: The pipeline framework definitions (PIPELINE_FRAMEWORKS) use slightly different
 * section names in some cases. Always use NARRATIVE_FRAMEWORKS for story sections.
 */
export const NARRATIVE_FRAMEWORKS: Record<FrameworkName, string[]> = FRAMEWORK_SECTIONS as Record<FrameworkName, string[]>;

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
    archetype?: string | null;
    category?: string | null;
    role?: string | null;
    journalEntryId?: string | null;
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
      archetype: story.archetype,
      category: story.category,
      role: story.role,
      journalEntryId: story.journalEntryId,
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

  /**
   * Check if journal content has rich data we can use.
   * Returns true if frameworkComponents or fullContent exists.
   */
  private hasRichJournalContent(content: JournalContent): boolean {
    if (content.format7Data?.frameworkComponents?.length) {
      return true;
    }
    if (content.fullContent && content.fullContent.trim().length > 100) {
      return true;
    }
    return false;
  }

  /**
   * Build narrative sections directly from journal content.
   *
   * Strategy:
   * 1. If format7Data has frameworkComponents, map them directly to STAR sections
   * 2. If fullContent exists, extract sections using pattern matching
   * 3. Fall back to description/category for context
   *
   * The key insight is that the journal entry already contains a narrative -
   * we just need to reformat it into the framework structure.
   */
  private buildSectionsFromJournalContent(
    content: JournalContent,
    framework: FrameworkName,
    activityIds: string[]
  ): NarrativeSections {
    const sections: NarrativeSections = {};
    const sectionKeys = NARRATIVE_FRAMEWORKS[framework] || [];
    const defaultEvidence = activityIds.map((activityId) => ({ activityId }));

    // If we have frameworkComponents, use them directly
    const components = content.format7Data?.frameworkComponents || [];
    if (components.length > 0) {
      const componentMap = new Map(
        components.map((c) => [c.name.toLowerCase(), c.content])
      );

      for (const sectionKey of sectionKeys) {
        const starComponent = SECTION_TO_STAR_COMPONENT[sectionKey] || sectionKey;
        const content =
          componentMap.get(sectionKey) ||
          componentMap.get(starComponent) ||
          componentMap.get(sectionKey.toLowerCase());

        sections[sectionKey] = {
          summary: content || `${sectionKey}: details pending`,
          evidence: defaultEvidence,
        };
      }

      return sections;
    }

    // Extract sections from fullContent using pattern matching
    if (content.fullContent) {
      const extracted = this.extractSectionsFromContent(
        content.fullContent,
        sectionKeys
      );

      for (const sectionKey of sectionKeys) {
        sections[sectionKey] = {
          summary: extracted[sectionKey] || `${sectionKey}: details pending`,
          evidence: defaultEvidence,
        };
      }

      return sections;
    }

    // Fallback: use description/category to populate minimal sections
    for (const sectionKey of sectionKeys) {
      let summary = `${sectionKey}: details pending`;

      // Map description to situation for context
      if (sectionKey === 'situation' || sectionKey === 'context') {
        summary = content.description || content.format7Data?.context?.primary_focus || summary;
      }

      sections[sectionKey] = { summary, evidence: defaultEvidence };
    }

    return sections;
  }

  /**
   * Generate sections using LLM from journal content.
   *
   * This method transforms journal entry content into framework-specific
   * career story sections using AI. It produces interview-ready narratives
   * that emphasize the user's individual contributions and quantified impact.
   *
   * @param content - Journal entry content (fullContent, format7Data, etc.)
   * @param framework - Target framework (STAR, SOAR, CAR, etc.)
   * @param title - Journal entry title
   * @param activityIds - Activity IDs for evidence linking
   * @returns Promise<NarrativeSections> - Framework-specific sections
   */
  private async generateSectionsWithLLM(
    content: JournalContent,
    framework: FrameworkName,
    title: string,
    activityIds: string[],
    style?: WritingStyle,
    userPrompt?: string
  ): Promise<{ sections: NarrativeSections; category?: string } | null> {
    const modelSelector = getModelSelector();
    if (!modelSelector) {
      console.warn('LLM not available for career story generation');
      return null;
    }

    // Build journal entry content via unified builder
    const journalEntry = buildLLMInput({
      journalEntry: {
        title,
        description: content.description,
        fullContent: content.fullContent,
        category: content.category,
        activityIds,
        format7Data: content.format7Data,
      },
    });

    const messages = buildCareerStoryMessages({
      journalEntry,
      framework: framework as PromptFrameworkName,
      style,
      userPrompt,
    });

    try {
      const result = await modelSelector.executeTask('generate', messages, 'balanced', {
        maxTokens: 2000,
        temperature: 0.7,
      });

      const parsed = parseCareerStoryResponse(result.content);
      if (!parsed) {
        console.warn('Failed to parse career story LLM response');
        return null;
      }

      // Convert parsed sections to NarrativeSections format
      const sections: NarrativeSections = {};
      const sectionKeys = NARRATIVE_FRAMEWORKS[framework] || [];
      const defaultEvidence = activityIds.map((activityId) => ({ activityId }));

      // Log which sections LLM returned vs expected
      const returnedKeys = Object.keys(parsed.sections);
      const missingKeys = sectionKeys.filter((k) => !returnedKeys.includes(k));
      if (missingKeys.length > 0) {
        console.warn(`LLM missing sections for ${framework}: ${missingKeys.join(', ')}. Returned: ${returnedKeys.join(', ')}`);
      }

      for (const sectionKey of sectionKeys) {
        const parsedSection = parsed.sections[sectionKey];
        if (parsedSection && parsedSection.summary && parsedSection.summary.trim().length > 10) {
          // Use LLM-generated section
          sections[sectionKey] = {
            summary: parsedSection.summary,
            evidence: parsedSection.evidence?.length > 0
              ? parsedSection.evidence.map((e) => ({
                  activityId: e.activityId,
                  description: e.description,
                }))
              : defaultEvidence,
          };
        } else {
          // Fallback: generate meaningful content from fullContent
          const fallbackContent = this.generateFallbackSection(
            sectionKey,
            content.fullContent || '',
            content.description || ''
          );
          sections[sectionKey] = {
            summary: fallbackContent,
            evidence: defaultEvidence,
          };
        }
      }

      console.log(`✅ Generated ${framework} career story via LLM: "${parsed.title}"`);
      return { sections, category: parsed.category };
    } catch (error) {
      console.error('Failed to generate career story with LLM:', error);
      return null;
    }
  }

  /**
   * Generate a fallback section when LLM doesn't return a specific section.
   * Uses the fullContent intelligently based on section type.
   */
  private generateFallbackSection(
    sectionKey: string,
    fullContent: string,
    description: string
  ): string {
    const content = fullContent || description || '';
    if (!content) {
      return `This section describes the ${sectionKey} of this achievement.`;
    }

    // Extract relevant portion based on section type
    const contentLower = content.toLowerCase();
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 20);

    // Map section keys to content patterns
    const patterns: Record<string, RegExp[]> = {
      situation: [/context|background|challenge|problem|initially|before/i],
      context: [/context|background|setting|environment/i],
      task: [/task|objective|goal|responsible|assigned/i],
      action: [/implement|develop|creat|built|designed|led|executed/i],
      actions: [/implement|develop|creat|built|designed|led|executed/i],
      result: [/result|outcome|impact|improved|reduced|increased|achieved/i],
      results: [/result|outcome|impact|improved|reduced|increased|achieved/i],
      hindrances: [/challenge|obstacle|difficult|barrier|constraint|pushback/i],
      obstacles: [/challenge|obstacle|difficult|barrier|constraint/i],
      evaluation: [/learn|reflect|insight|takeaway|growth|next time/i],
      learning: [/learn|reflect|insight|takeaway|growth|realize/i],
      challenge: [/challenge|problem|issue|bug|difficult/i],
      problem: [/problem|issue|gap|pain point/i],
    };

    const sectionPatterns = patterns[sectionKey] || [];

    // Find paragraph that matches the section pattern
    for (const paragraph of paragraphs) {
      for (const pattern of sectionPatterns) {
        if (pattern.test(paragraph)) {
          return paragraph.slice(0, 500);
        }
      }
    }

    // Fallback: use first/last paragraph based on section type
    if (paragraphs.length > 0) {
      if (['situation', 'context', 'challenge', 'problem'].includes(sectionKey)) {
        return paragraphs[0].slice(0, 500);
      }
      if (['result', 'results', 'evaluation', 'learning'].includes(sectionKey)) {
        return paragraphs[paragraphs.length - 1].slice(0, 500);
      }
      // Middle sections get middle paragraphs
      const midIdx = Math.floor(paragraphs.length / 2);
      return paragraphs[midIdx].slice(0, 500);
    }

    return description || `This section describes the ${sectionKey} of this achievement.`;
  }

  /**
   * Extract sections from fullContent using simple pattern matching.
   * Looks for common headers and markdown structure.
   */
  private extractSectionsFromContent(
    fullContent: string,
    sectionKeys: string[]
  ): Record<string, string> {
    const result: Record<string, string> = {};
    const content = fullContent.trim();

    // Pattern 1: Look for explicit section headers (## Situation, **Situation**, etc.)
    for (const sectionKey of sectionKeys) {
      const patterns = [
        new RegExp(`##\\s*${sectionKey}[:\\s]*\\n([\\s\\S]*?)(?=##|$)`, 'i'),
        new RegExp(`\\*\\*${sectionKey}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
        new RegExp(`${sectionKey}[:\\s]+([^\\n]+)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]?.trim()) {
          result[sectionKey] = match[1].trim().slice(0, 1000); // Limit length
          break;
        }
      }
    }

    // Pattern 2: If no explicit sections found, try to intelligently split the content
    const foundKeys = Object.keys(result);
    if (foundKeys.length === 0 && content.length > 0) {
      // For STAR framework, map content paragraphs to sections
      const paragraphs = content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      if (paragraphs.length >= sectionKeys.length) {
        // Distribute paragraphs across sections
        for (let i = 0; i < sectionKeys.length; i++) {
          result[sectionKeys[i]] = paragraphs[i] || `${sectionKeys[i]}: details pending`;
        }
      } else if (paragraphs.length > 0) {
        // Use first paragraph for situation, last for result
        result['situation'] = paragraphs[0];
        if (paragraphs.length > 1) {
          result['result'] = paragraphs[paragraphs.length - 1];
        }
      }
    }

    return result;
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
        archetype: input.archetype || null,
      },
    });

    // Populate StorySource rows from section evidence
    const sectionKeys = NARRATIVE_FRAMEWORKS[framework] || [];
    await this.populateSourcesFromSections(story.id, sections, input.activityIds, userId, sectionKeys);

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
    // Fetch journal entry with rich content for narrative generation
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        authorId: userId,
        sourceMode: this.sourceMode,
      },
      select: {
        id: true,
        title: true,
        activityIds: true,
        fullContent: true,
        format7Data: true,
        description: true,
        category: true,
      },
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

    const useFramework: FrameworkName = framework || 'STAR';

    // Primary: Use journal content (fullContent, format7Data) to build sections
    // This preserves the user's narrative instead of regenerating from scratch
    let sections: NarrativeSections;

    const journalContent = {
      fullContent: entry.fullContent,
      format7Data: entry.format7Data as Format7Data | null,
      description: entry.description,
      category: entry.category,
    };

    let category: string | undefined;

    if (this.hasRichJournalContent(journalContent)) {
      // Primary: Use LLM to transform journal content into framework-specific sections
      // This produces interview-ready narratives that emphasize contributions and impact
      const llmResult = await this.generateSectionsWithLLM(
        journalContent,
        useFramework,
        entry.title || 'Career Story',
        entry.activityIds
      );

      if (llmResult) {
        sections = llmResult.sections;
        category = llmResult.category;
      } else {
        // Fallback to pattern-based extraction if LLM unavailable
        sections = this.buildSectionsFromJournalContent(
          journalContent,
          useFramework,
          entry.activityIds
        );
      }
    } else {
      // Fallback: Generate narrative using the pipeline (pattern matching + optional LLM polish)
      const activities = await this.fetchActivitiesWithRefs(userId, entry.activityIds);
      try {
        sections = await this.generateNarrativeSections(activities, useFramework, userId);
      } catch {
        // Final fallback to basic template-based sections
        const basicActivities = await this.fetchActivities(userId, entry.activityIds);
        sections = this.buildSections(useFramework, basicActivities);
      }
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
        journalEntryId: entryId,
        category: category || null,
      },
    });

    // After story creation, populate StorySource rows
    const sectionKeys = NARRATIVE_FRAMEWORKS[useFramework] || [];
    const _sourceDebug = await this.populateSourcesFromSections(story.id, sections, entry.activityIds, userId, sectionKeys);

    return {
      success: true,
      story: this.mapStory(story),
      clusterId,
      _sourceDebug,
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

    // If sections were rebuilt, re-populate activity sources from new evidence
    if (sections) {
      await prisma.storySource.deleteMany({
        where: { storyId, sourceType: 'activity' },
      });
      const sectionKeys = NARRATIVE_FRAMEWORKS[framework] || [];
      await this.populateSourcesFromSections(storyId, sections, activityIds, userId, sectionKeys);
    }

    return { success: true, story: this.mapStory(updated) };
  }

  async regenerate(
    storyId: string,
    userId: string,
    framework?: FrameworkName,
    style?: WritingStyle,
    userPrompt?: string,
    archetype?: string
  ): Promise<StoryResult> {
    const story = await prisma.careerStory.findFirst({
      where: { id: storyId, userId, sourceMode: this.sourceMode },
    });

    if (!story) {
      return { success: false, error: ERRORS.STORY_NOT_FOUND };
    }

    const nextFramework = framework || (story.framework as FrameworkName);

    // Try FK first (Bug B fix), fall back to activity overlap for old stories
    let journalEntry = null;
    if (story.journalEntryId) {
      journalEntry = await prisma.journalEntry.findFirst({
        where: {
          id: story.journalEntryId,
          authorId: userId,
          sourceMode: this.sourceMode,
        },
        select: {
          id: true,
          title: true,
          fullContent: true,
          format7Data: true,
          description: true,
          category: true,
        },
      });
    }
    // Fallback: activity overlap (for stories created before Bug A fix)
    if (!journalEntry) {
      journalEntry = await prisma.journalEntry.findFirst({
        where: {
          authorId: userId,
          sourceMode: this.sourceMode,
          activityIds: { hasSome: story.activityIds },
        },
        select: {
          id: true,
          title: true,
          fullContent: true,
          format7Data: true,
          description: true,
          category: true,
        },
      });
    }

    let sections: NarrativeSections;
    let category: string | undefined;

    // Primary path: Use LLM with journal content
    if (journalEntry?.fullContent || journalEntry?.format7Data) {
      const journalContent: JournalContent = {
        fullContent: journalEntry.fullContent,
        format7Data: journalEntry.format7Data as Format7Data | null,
        description: journalEntry.description,
        category: journalEntry.category,
      };

      const llmResult = await this.generateSectionsWithLLM(
        journalContent,
        nextFramework,
        journalEntry.title || story.title,
        story.activityIds,
        style,
        userPrompt
      );

      if (llmResult) {
        sections = llmResult.sections;
        category = llmResult.category;
      } else {
        // LLM failed, use pattern-based extraction
        sections = this.buildSectionsFromJournalContent(
          journalContent,
          nextFramework,
          story.activityIds
        );
      }
    } else {
      // Fallback: Use activity-based generation
      const activities = await this.fetchActivitiesWithRefs(userId, story.activityIds);
      if (activities.length === 0) {
        return { success: false, error: ERRORS.NO_ACTIVITIES };
      }

      try {
        sections = await this.generateNarrativeSections(activities, nextFramework, userId);
      } catch {
        // Final fallback to basic template-based sections
        const basicActivities = await this.fetchActivities(userId, story.activityIds);
        sections = this.buildSections(nextFramework, basicActivities);
      }
    }

    const updated = await prisma.careerStory.update({
      where: { id: storyId },
      data: {
        framework: nextFramework,
        sections: sections as unknown as Prisma.InputJsonValue,
        needsRegeneration: false,
        generatedAt: new Date(),
        ...(archetype ? { archetype } : {}),
        ...(category ? { category } : {}),
      },
    });

    // Re-populate activity sources from new sections.
    // Delete old activity sources and create fresh ones from the new evidence mapping.
    // User-created sources (user_note, wizard_answer) are NEVER touched (Decision #20).
    await prisma.storySource.deleteMany({
      where: { storyId, sourceType: 'activity' },
    });
    const sectionKeys = NARRATIVE_FRAMEWORKS[nextFramework] || [];
    const _sourceDebug = await this.populateSourcesFromSections(storyId, sections, story.activityIds, userId, sectionKeys);

    // Store generation prompt
    if (userPrompt) {
      await prisma.careerStory.update({
        where: { id: storyId },
        data: { lastGenerationPrompt: userPrompt },
      });
    }

    return { success: true, story: this.mapStory(updated), _sourceDebug };
  }

  /**
   * Populate StorySource rows from generated sections.
   * Creates activity-type source rows from evidence in sections.
   * Handles the defaultEvidence shotgun: if all sections have identical
   * evidence, assigns sectionKey = "unassigned" instead.
   */
  private async populateSourcesFromSections(
    storyId: string,
    sections: NarrativeSections,
    activityIds: string[],
    userId: string,
    sectionKeys: string[]
  ): Promise<Record<string, unknown>> {
    const logCtx = { storyId: storyId.slice(0, 8), isDemoMode: this.isDemoMode, userId: userId.slice(0, 8) };

    // Detect shotgun pattern: if every section has the same evidence array
    const evidenceArrays = sectionKeys.map((key) =>
      (sections[key]?.evidence || []).map((e) => e.activityId).sort().join(',')
    );
    const isShotgun = new Set(evidenceArrays).size === 1 && evidenceArrays[0] !== '';

    // Fetch activities for hydration
    const activities = await this.fetchActivitiesWithRefs(userId, activityIds);

    console.log('[populateSourcesFromSections]', {
      ...logCtx,
      sectionKeys,
      activityIdsCount: activityIds.length,
      activitiesFound: activities.length,
      isShotgun,
      evidenceSample: sectionKeys.slice(0, 2).map((k) => ({
        key: k,
        evidenceCount: (sections[k]?.evidence || []).length,
        evidenceIds: (sections[k]?.evidence || []).slice(0, 3).map((e) => e.activityId),
      })),
    });
    const activityMap = new Map(activities.map((a) => [a.id, a]));

    const sourcesToCreate: Array<{
      storyId: string;
      sectionKey: string;
      sourceType: string;
      activityId: string | null;
      label: string;
      url: string | null;
      toolType: string | null;
      role: string | null;
      annotation: string | null;
      sortOrder: number;
    }> = [];

    // In demo mode, activityId FK can't reference DemoToolActivity — set to null
    const canSetFk = !this.isDemoMode;

    // Check if LLM evidence IDs actually resolve to real activities
    const allEvidenceIds: string[] = [];
    for (const key of sectionKeys) {
      for (const e of (sections[key]?.evidence || [])) {
        if (e.activityId) allEvidenceIds.push(e.activityId);
      }
    }
    const resolvedCount = allEvidenceIds.filter((id) => activityMap.has(id)).length;
    const useFakeIds = resolvedCount === 0 && allEvidenceIds.length > 0 && activities.length > 0;

    // No evidence at all — LLM returned empty arrays for every section
    const noEvidence = allEvidenceIds.length === 0 && activities.length > 0;

    console.log('[populateSourcesFromSections] decision', {
      ...logCtx,
      allEvidenceIds: allEvidenceIds.length,
      resolvedCount,
      useFakeIds,
      noEvidence,
      canSetFk,
      branch: (isShotgun && !useFakeIds) || noEvidence ? 'shotgun/noEvidence→unassigned'
        : useFakeIds ? 'fakeIds→roundRobin'
        : 'normal→mapEvidence',
    });

    if ((isShotgun && !useFakeIds) || noEvidence) {
      // Bug C fix / empty-evidence fallback: assign all to "unassigned"
      const uniqueActivityIds = [...new Set(activityIds)];
      for (let i = 0; i < uniqueActivityIds.length; i++) {
        const activity = activityMap.get(uniqueActivityIds[i]);
        if (!activity) continue;
        sourcesToCreate.push({
          storyId,
          sectionKey: 'unassigned',
          sourceType: 'activity',
          activityId: canSetFk ? uniqueActivityIds[i] : null,
          label: activity.title,
          url: activity.sourceUrl || null,
          toolType: activity.source || null,
          role: this.detectRole(activity),
          annotation: null,
          sortOrder: i,
        });
      }
    } else if (useFakeIds) {
      // LLM used placeholder IDs — distribute real activities round-robin
      let activityIdx = 0;
      const perSection = Math.max(1, Math.ceil(activities.length / sectionKeys.length));
      for (const sectionKey of sectionKeys) {
        const evidence = sections[sectionKey]?.evidence || [];
        const llmDescription = evidence[0]?.description || null;
        const sectionActivities = activities.slice(activityIdx, activityIdx + perSection);
        activityIdx += perSection;

        for (let i = 0; i < sectionActivities.length; i++) {
          const activity = sectionActivities[i];
          sourcesToCreate.push({
            storyId,
            sectionKey,
            sourceType: 'activity',
            activityId: canSetFk ? activity.id : null,
            label: activity.title,
            url: activity.sourceUrl || null,
            toolType: activity.source || null,
            role: this.detectRole(activity),
            annotation: i === 0 ? llmDescription : null,
            sortOrder: i,
          });
        }
      }
    } else {
      // Normal case: LLM IDs resolved — use standard mapping
      for (const sectionKey of sectionKeys) {
        const evidence = sections[sectionKey]?.evidence || [];
        for (let i = 0; i < evidence.length; i++) {
          const e = evidence[i];
          const activity = activityMap.get(e.activityId);
          if (!activity) continue; // Skip unresolvable
          sourcesToCreate.push({
            storyId,
            sectionKey,
            sourceType: 'activity',
            activityId: canSetFk ? e.activityId : null,
            label: activity.title,
            url: activity.sourceUrl || null,
            toolType: activity.source || null,
            role: this.detectRole(activity),
            annotation: e.description || null,
            sortOrder: i,
          });
        }
      }
    }

    // Safety net: if no sources were created but we have activityIds, create skeleton sources.
    // This handles the case where activities aren't found in the queried table
    // (e.g., demo/production table mismatch, or activities deleted after journal creation).
    if (sourcesToCreate.length === 0 && activityIds.length > 0) {
      console.warn('[populateSourcesFromSections] fallback: creating skeleton sources from activityIds', logCtx);
      const uniqueIds = [...new Set(activityIds)];
      const perSection = Math.max(1, Math.ceil(uniqueIds.length / sectionKeys.length));
      let idx = 0;
      for (const sectionKey of sectionKeys) {
        const sectionIds = uniqueIds.slice(idx, idx + perSection);
        idx += perSection;
        for (let i = 0; i < sectionIds.length; i++) {
          sourcesToCreate.push({
            storyId,
            sectionKey,
            sourceType: 'activity',
            activityId: canSetFk ? sectionIds[i] : null,
            label: `Activity ${i + 1}`,
            url: null,
            toolType: null,
            role: null,
            annotation: null,
            sortOrder: i,
          });
        }
      }
    }

    const debugInfo = {
      ...logCtx,
      activityIdsCount: activityIds.length,
      activitiesFound: activities.length,
      table: this.isDemoMode ? 'DemoToolActivity' : 'ToolActivity',
      allEvidenceIds: allEvidenceIds.length,
      resolvedCount,
      useFakeIds,
      noEvidence,
      isShotgun,
      branch: (isShotgun && !useFakeIds) || noEvidence ? 'shotgun/noEvidence→unassigned'
        : useFakeIds ? 'fakeIds→roundRobin'
        : sourcesToCreate.length === 0 && activityIds.length > 0 ? 'skeleton-fallback'
        : 'normal→mapEvidence',
      sourcesCreated: sourcesToCreate.length,
      sourceSections: [...new Set(sourcesToCreate.map((s) => s.sectionKey))],
      evidenceSample: sectionKeys.slice(0, 2).map((k) => ({
        key: k,
        evidenceIds: (sections[k]?.evidence || []).slice(0, 3).map((e) => e.activityId),
      })),
    };

    console.log('[populateSourcesFromSections] result', debugInfo);

    if (sourcesToCreate.length > 0) {
      await prisma.storySource.createMany({ data: sourcesToCreate });
    } else {
      console.warn('[populateSourcesFromSections] ⚠️ ZERO sources — no activityIds at all', logCtx);
    }

    return debugInfo;
  }

  /**
   * Detect user's role from activity rawData.
   */
  private detectRole(activity: { rawData?: Record<string, unknown> | null } | undefined): string | null {
    if (!activity?.rawData) return null;
    const raw = activity.rawData;

    // GitHub signals
    if (raw.author) return 'authored';
    if (raw.state === 'APPROVED') return 'approved';
    if (raw.reviewers) return 'reviewed';

    // Jira signals
    if (raw.assignee) return 'assigned';
    if (raw.reporter) return 'reported';

    return 'mentioned';
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

  async getStoryById(storyId: string, userId: string): Promise<CareerStoryRecord | null> {
    const story = await prisma.careerStory.findFirst({
      where: { id: storyId, userId, sourceMode: this.sourceMode },
    });

    return story ? this.mapStory(story) : null;
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
