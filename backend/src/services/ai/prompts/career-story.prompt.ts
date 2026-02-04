/**
 * Prompts for Career Story Generation
 *
 * Transforms journal entries into framework-specific career story sections.
 * Used by CareerStoryService when promoting a journal entry to a career story.
 *
 * @module career-story.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { ChatCompletionMessageParam } from 'openai/resources/index';

// =============================================================================
// TYPES
// =============================================================================

export type FrameworkName = 'STAR' | 'STARL' | 'CAR' | 'PAR' | 'SAR' | 'SOAR' | 'SHARE' | 'CARL';

export interface JournalEntryContent {
  title: string;
  description: string | null;
  fullContent: string | null;
  category: string | null;
  dominantRole: string | null;
  phases: Array<{
    name: string;
    summary: string;
    activityIds: string[];
  }> | null;
  impactHighlights: string[] | null;
  skills: string[] | null;
  activityIds: string[];
}

export interface CareerStoryPromptParams {
  journalEntry: JournalEntryContent;
  framework: FrameworkName;
}

export interface CareerStorySection {
  summary: string;
  evidence: Array<{
    activityId: string;
    description?: string;
  }>;
}

export interface CareerStoryOutput {
  sections: Record<string, CareerStorySection>;
  title: string;
  reasoning: string;
}

// =============================================================================
// FRAMEWORK DEFINITIONS
// =============================================================================

export const FRAMEWORK_SECTIONS: Record<FrameworkName, string[]> = {
  STAR: ['situation', 'task', 'action', 'result'],
  STARL: ['situation', 'task', 'action', 'result', 'learning'],
  CAR: ['challenge', 'action', 'result'],
  PAR: ['problem', 'action', 'result'],
  SAR: ['situation', 'action', 'result'],
  SOAR: ['situation', 'obstacles', 'actions', 'results'],
  SHARE: ['situation', 'hindrances', 'actions', 'results', 'evaluation'],
  CARL: ['context', 'action', 'result', 'learning'],
};

const SECTION_GUIDELINES: Record<string, string> = {
  situation: 'Business context, team, and the challenge or opportunity that arose',
  task: 'Your specific responsibilities and objectives in this situation',
  action: 'Concrete steps YOU took, emphasizing individual contribution',
  result: 'Measurable outcomes, metrics, and business impact',
  learning: 'Key insights, skills gained, or how this experience changed your approach',
  challenge: 'The problem or difficulty that needed to be solved',
  problem: 'The specific issue or gap you identified',
  obstacles: 'Barriers, constraints, or difficulties you faced',
  hindrances: 'Challenges that impacted progress and how you navigated them',
  actions: 'Steps taken to address the situation and overcome obstacles',
  results: 'Outcomes achieved, including quantified impact where possible',
  context: 'Background information and the problem space',
  evaluation: 'Your assessment of what worked, what could improve, and lessons learned',
};

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

let systemTemplate: string;
let userTemplateCompiled: Handlebars.TemplateDelegate;

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'career-story-system.prompt.md'), 'utf-8');
  const userTemplateRaw = readFileSync(join(TEMPLATES_DIR, 'career-story-user.prompt.md'), 'utf-8');
  userTemplateCompiled = Handlebars.compile(userTemplateRaw);
} catch (error) {
  console.warn('Failed to load career story prompt templates, using fallback:', (error as Error).message);
  systemTemplate = `You are a career coach transforming journal entries into career story narratives.
Return valid JSON with sections matching the requested framework.`;
  userTemplateCompiled = Handlebars.compile(
    `Transform this journal entry into a "{{framework}}" career story.
Title: {{title}}
Content: {{fullContent}}
Return JSON with sections for: {{sectionsList}}`
  );
}

// =============================================================================
// PROMPT FUNCTIONS
// =============================================================================

/**
 * Get the system prompt for career story generation.
 */
export function getCareerStorySystemPrompt(): string {
  return systemTemplate;
}

/**
 * Get the user prompt for career story generation.
 */
export function getCareerStoryUserPrompt(params: CareerStoryPromptParams): string {
  const { journalEntry, framework } = params;
  const sectionKeys = FRAMEWORK_SECTIONS[framework];
  const sectionsList = sectionKeys.join(', ');

  // Build section guidelines for this framework
  const sectionGuidelines: Record<string, string> = {};
  for (const key of sectionKeys) {
    sectionGuidelines[key] = SECTION_GUIDELINES[key] || `Content for ${key} section`;
  }

  return userTemplateCompiled({
    framework,
    title: journalEntry.title,
    description: journalEntry.description || 'No description provided',
    fullContent: journalEntry.fullContent || 'No content provided',
    category: journalEntry.category || 'general',
    dominantRole: journalEntry.dominantRole || 'Contributed',
    phases: journalEntry.phases,
    impactHighlights: journalEntry.impactHighlights,
    skills: journalEntry.skills?.join(', '),
    sectionKeys,
    sectionsList,
    sectionGuidelines,
  });
}

/**
 * Build messages array for career story generation.
 */
export function buildCareerStoryMessages(
  params: CareerStoryPromptParams
): ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: getCareerStorySystemPrompt(),
    },
    {
      role: 'user',
      content: getCareerStoryUserPrompt(params),
    },
  ];
}

/**
 * Parse LLM response into CareerStoryOutput.
 */
export function parseCareerStoryResponse(content: string): CareerStoryOutput | null {
  try {
    // Remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanContent);

    // Validate required fields
    if (!parsed.sections || typeof parsed.sections !== 'object') {
      console.warn('Career story response missing sections');
      return null;
    }

    return {
      sections: parsed.sections,
      title: parsed.title || 'Career Story',
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    console.error('Failed to parse career story response:', error);
    return null;
  }
}
