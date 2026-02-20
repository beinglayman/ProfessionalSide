/**
 * Prompts for Journal Narrative Generation
 *
 * Centralized prompt definitions for LLM-powered narrative generation.
 * Used by JournalService.regenerateNarrative() for both demo and production modes.
 *
 * @module journal-narrative.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { compileSafe, SafeTemplate } from './handlebars-safe';

// =============================================================================
// TYPES
// =============================================================================

export interface NarrativePromptParams {
  title: string;
  activitiesText: string;
  style: string;
}

export interface EnhancedNarrativePromptParams {
  title: string;
  activitiesText: string;
  isCluster: boolean;
  clusterRef?: string;
  userEmail?: string;
}

export interface EnhancedActivity {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: Date;
  rawData: Record<string, unknown> | null;
  crossToolRefs: string[];
}

export interface GroupingContext {
  type: 'temporal' | 'cluster';
  clusterRef?: string;
}

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

// Load templates once at startup
let systemTemplate: string;
let userTemplateCompiled: SafeTemplate;
let exampleJson: string;

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'draft-story-system.prompt.md'), 'utf-8');
  const userTemplateRaw = readFileSync(join(TEMPLATES_DIR, 'draft-story-user.prompt.md'), 'utf-8');
  userTemplateCompiled = compileSafe(userTemplateRaw);
  exampleJson = readFileSync(join(TEMPLATES_DIR, 'draft-story-example.json'), 'utf-8');
} catch (error) {
  // Templates may not exist during tests - provide fallbacks
  console.warn('Failed to load prompt templates, using fallback prompts:', (error as Error).message);
  systemTemplate = 'You are a professional journal writer. Write in first person. Return valid JSON.';
  userTemplateCompiled = compileSafe(
    'Generate a journal entry for "{{title}}" based on:\n{{activitiesText}}\n\nReturn JSON with description and fullContent.'
  );
  exampleJson = '{}';
}

// =============================================================================
// ENHANCED PROMPT FUNCTIONS
// =============================================================================

/**
 * Get the enhanced system prompt for narrative generation.
 */
export function getEnhancedSystemPrompt(): string {
  return systemTemplate;
}

/**
 * Get the enhanced user prompt with all context.
 */
export function getEnhancedUserPrompt(params: EnhancedNarrativePromptParams): string {
  return userTemplateCompiled({
    ...params,
    exampleJson,
  });
}

/**
 * Build enhanced messages array for narrative generation.
 */
export function buildEnhancedNarrativeMessages(
  params: EnhancedNarrativePromptParams
): ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: getEnhancedSystemPrompt(),
    },
    {
      role: 'user',
      content: getEnhancedUserPrompt(params),
    },
  ];
}

// =============================================================================
// ACTIVITY FORMATTING (Enhanced with rawData)
// =============================================================================

/**
 * Format activities for the enhanced prompt.
 * Includes rawData context for richer narratives.
 */
export function formatEnhancedActivitiesForPrompt(
  activities: EnhancedActivity[],
  groupingContext: GroupingContext
): string {
  const formattedActivities = activities.map((a) => {
    const date = a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const rawContext = extractRawDataContext(a.source, a.rawData);

    let lines = [`- [${date}] ${a.source.toUpperCase()}: ${a.title}`];

    if (a.description) {
      lines.push(`  Description: ${a.description}`);
    }
    if (rawContext) {
      lines.push(`  Context: ${rawContext}`);
    }
    if (a.crossToolRefs && a.crossToolRefs.length > 0) {
      lines.push(`  Related: ${a.crossToolRefs.join(', ')}`);
    }
    lines.push(`  [id: ${a.id}]`);

    return lines.join('\n');
  }).join('\n\n');

  // Add grouping context header
  let header = '';
  if (groupingContext.type === 'cluster' && groupingContext.clusterRef) {
    header = `Grouping: Cluster-based (shared reference: ${groupingContext.clusterRef})\n\n`;
  } else {
    header = `Grouping: Temporal (time-based window)\n\n`;
  }

  return header + formattedActivities;
}

/**
 * Extract human-readable context from rawData based on source type.
 */
export function extractRawDataContext(
  source: string,
  rawData: Record<string, unknown> | null
): string | null {
  if (!rawData) return null;

  switch (source.toLowerCase()) {
    case 'github': {
      const parts: string[] = [];
      if (rawData.author) parts.push(`author: ${rawData.author}`);
      if (rawData.state) parts.push(String(rawData.state));
      if (typeof rawData.additions === 'number' || typeof rawData.deletions === 'number') {
        parts.push(`+${rawData.additions || 0}/-${rawData.deletions || 0}`);
      }
      if (typeof rawData.changedFiles === 'number') {
        parts.push(`${rawData.changedFiles} files`);
      }
      if (typeof rawData.reviews === 'number' && rawData.reviews > 0) {
        parts.push(`${rawData.reviews} reviews`);
      }
      if (typeof rawData.commits === 'number') {
        parts.push(`${rawData.commits} commits`);
      }
      if (Array.isArray(rawData.reviewers) && rawData.reviewers.length > 0) {
        parts.push(`reviewers: ${(rawData.reviewers as string[]).join(', ')}`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'jira': {
      const parts: string[] = [];
      if (rawData.assignee) parts.push(`assignee: ${rawData.assignee}`);
      if (rawData.reporter) parts.push(`reporter: ${rawData.reporter}`);
      if (rawData.status) parts.push(String(rawData.status));
      if (rawData.priority) parts.push(`${rawData.priority} priority`);
      if (typeof rawData.storyPoints === 'number') {
        parts.push(`${rawData.storyPoints} pts`);
      }
      if (rawData.issueType) parts.push(String(rawData.issueType));
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'confluence': {
      const parts: string[] = [];
      if (rawData.lastModifiedBy) parts.push(`author: ${rawData.lastModifiedBy}`);
      if (rawData.spaceKey) parts.push(`space: ${rawData.spaceKey}`);
      if (typeof rawData.version === 'number') {
        parts.push(`v${rawData.version}`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'slack': {
      const parts: string[] = [];
      if (rawData.channelName) parts.push(`#${rawData.channelName}`);
      if (rawData.isThreadReply) parts.push('thread reply');
      if (Array.isArray(rawData.reactions) && rawData.reactions.length > 0) {
        const totalReactions = rawData.reactions.reduce(
          (sum: number, r: { count?: number }) => sum + (r.count || 0),
          0
        );
        parts.push(`${totalReactions} reactions`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'teams':
    case 'outlook': {
      const parts: string[] = [];
      if (rawData.from) parts.push(`from: ${rawData.from}`);
      if (Array.isArray(rawData.to)) parts.push(`to: ${(rawData.to as string[]).join(', ')}`);
      if (typeof rawData.duration === 'number') {
        parts.push(`${rawData.duration} min`);
      }
      if (typeof rawData.attendees === 'number') {
        parts.push(`${rawData.attendees} attendees`);
      } else if (Array.isArray(rawData.attendees)) {
        parts.push(`${rawData.attendees.length} attendees`);
      }
      if (rawData.userRole) parts.push(String(rawData.userRole));
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'google-calendar': {
      const parts: string[] = [];
      if (rawData.organizer) parts.push(`organizer: ${rawData.organizer}`);
      if (typeof rawData.duration === 'number') {
        parts.push(`${rawData.duration} min`);
      }
      if (typeof rawData.attendees === 'number') {
        parts.push(`${rawData.attendees} attendees`);
      } else if (Array.isArray(rawData.attendees)) {
        parts.push(`${rawData.attendees.length} attendees`);
      }
      if (rawData.userRole) parts.push(String(rawData.userRole));
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'google-docs':
    case 'google-sheets': {
      const parts: string[] = [];
      if (rawData.owner) parts.push(`owner: ${rawData.owner}`);
      if (Array.isArray(rawData.contributors) && rawData.contributors.length > 0) {
        parts.push(`contributors: ${(rawData.contributors as string[]).join(', ')}`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    }

    case 'figma': {
      const parts: string[] = [];
      if (rawData.fileName) parts.push(String(rawData.fileName));
      if (Array.isArray(rawData.commenters) && rawData.commenters.length > 0) {
        parts.push(`${rawData.commenters.length} commenters`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    }

    default:
      return null;
  }
}

// =============================================================================
// LEGACY PROMPTS (for backwards compatibility)
// =============================================================================

/**
 * System prompt for narrative generation.
 * Establishes the persona and constraints for the LLM.
 * @deprecated Use getEnhancedSystemPrompt() instead
 */
export function getSystemPrompt(style: string): string {
  return `You are a professional journal writer helping someone document their work accomplishments.
Write in first person with a ${style} tone.
Focus on achievements, learnings, and impact.
Be concise but meaningful.
Always return valid JSON.`;
}

/**
 * User prompt for narrative generation.
 * Provides the activities and expected output format.
 * @deprecated Use getEnhancedUserPrompt() instead
 */
export function getUserPrompt(title: string, activitiesText: string): string {
  return `Generate a journal entry narrative for "${title}" based on these activities:

${activitiesText}

Return JSON with this structure:
{
  "description": "A 1-2 sentence summary of the key accomplishments",
  "fullContent": "A detailed narrative (3-5 paragraphs) in first person describing the work, challenges, solutions, and outcomes. Use markdown formatting."
}`;
}

/**
 * Build the full messages array for narrative generation.
 * Combines system and user prompts into the format expected by OpenAI.
 * @deprecated Use buildEnhancedNarrativeMessages() instead
 */
export function buildNarrativeMessages(params: NarrativePromptParams): ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: getSystemPrompt(params.style),
    },
    {
      role: 'user',
      content: getUserPrompt(params.title, params.activitiesText),
    },
  ];
}

/**
 * Format activities for the prompt.
 * Converts activity objects to a bulleted text format.
 * @deprecated Use formatEnhancedActivitiesForPrompt() instead
 */
export function formatActivitiesForPrompt(
  activities: Array<{
    source: string;
    title: string;
    description: string | null;
    timestamp: Date;
  }>
): string {
  return activities
    .map((a) => {
      const date = a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `- [${date}] ${a.source}: ${a.title}${a.description ? ` - ${a.description}` : ''}`;
    })
    .join('\n');
}
