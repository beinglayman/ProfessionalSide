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
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { compileSafe, SafeTemplate, escapeHandlebarsInput } from './handlebars-safe';
import type { ActivityContext } from '../../career-stories/activity-context.adapter';

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

/**
 * Story archetypes that shape the narrative voice and structure.
 * Detected from journal content or selected by user.
 */
export type StoryArchetype =
  | 'firefighter'   // Crisis response
  | 'architect'     // System design
  | 'diplomat'      // Stakeholder alignment
  | 'multiplier'    // Force multiplication
  | 'detective'     // Investigation
  | 'pioneer'       // New territory
  | 'turnaround'    // Inherited mess
  | 'preventer';    // Risk prevention

/**
 * Context extracted from user via D-I-G (Dig-Impact-Growth) questioning.
 * Enriches the story with details the user knows but didn't write.
 */
export interface ExtractedContext {
  realStory?: string;        // The buried lede
  obstacle?: string;         // What almost went wrong
  keyDecision?: string;      // Hardest choice made
  namedPeople?: string[];    // Specific individuals involved
  counterfactual?: string;   // What would have happened
  metric?: string;           // Quantified impact
  evidence?: string;         // Where it's documented
  learning?: string;         // Key learning
  impactType?: 'performance' | 'cost' | 'capability' | 'risk' | 'experience';
}

import type { WritingStyle } from '../../../controllers/career-stories.schemas';
export type { WritingStyle };

export interface CareerStoryPromptParams {
  journalEntry: JournalEntryContent;
  framework: FrameworkName;
  /** Optional: Writing style for tone adaptation */
  style?: WritingStyle;
  /** Optional: Free-text user instructions for regeneration */
  userPrompt?: string;
  /** Optional: Story archetype for narrative shaping */
  archetype?: StoryArchetype;
  /** Optional: Extracted context from Story Coach D-I-G questions */
  extractedContext?: ExtractedContext;
  /** PEER of journalEntry, not a child — raw evidence from tools (RH-3) */
  activities?: ActivityContext[];
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
  category?: string;
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

/**
 * Archetype-specific narrative guidance.
 * Shapes the voice and emphasis of the generated story.
 */
const ARCHETYPE_GUIDANCE: Record<StoryArchetype, string> = {
  firefighter: 'CRISIS RESPONSE. Lead with the time marker ("At 2am...", "With 48h left..."). State what broke, who you called, what you did, what was saved. Keep it tight.',
  architect: 'SYSTEM DESIGN. State the design decision, the trade-off, and who uses it now. Numbers: "5 teams", "still the foundation 2 years later."',
  diplomat: 'STAKEHOLDER ALIGNMENT. Name the sides, name their concerns, state how you bridged them. Skip "I learned that influence matters."',
  multiplier: 'FORCE MULTIPLICATION. State what you built, who adopted it, and the compound math: "20 engineers × 10 hrs/week saved."',
  detective: 'INVESTIGATION. State the mystery, the dead ends, and the root cause. One sentence for the breakthrough, not three.',
  pioneer: 'FIRST MOVER. State what was unknown, what you tried that failed, and the trail you left (doc, guide, template).',
  turnaround: 'RECOVERY. Before/after numbers. State what you inherited, what you diagnosed, what changed.',
  preventer: 'RISK PREVENTION. State what you noticed, what you did about it, and the disaster that didn\'t happen. Counterfactual in one line.',
};

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

let systemTemplate: string;
let userTemplateCompiled: SafeTemplate;

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'career-story-system.prompt.md'), 'utf-8');
  const userTemplateRaw = readFileSync(join(TEMPLATES_DIR, 'career-story-user.prompt.md'), 'utf-8');
  userTemplateCompiled = compileSafe(userTemplateRaw);
} catch (error) {
  console.warn('Failed to load career story prompt templates, using fallback:', (error as Error).message);
  systemTemplate = `You are a career coach transforming journal entries into career story narratives.
Return valid JSON with sections matching the requested framework.`;
  userTemplateCompiled = compileSafe(
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
  const { journalEntry, framework, style, userPrompt, activities } = params;
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
    style: style || undefined,
    userPrompt: userPrompt || undefined,
    // B-3: Escape Handlebars syntax in user-authored activity content before template rendering
    activities: activities?.map(a => ({
      ...a,
      body: escapeHandlebarsInput(a.body),
      title: escapeHandlebarsInput(a.title),
    })) || undefined,
  });
}

/**
 * Build messages array for career story generation.
 * Supports optional archetype and extractedContext for enhanced prompts.
 */
export function buildCareerStoryMessages(
  params: CareerStoryPromptParams
): ChatCompletionMessageParam[] {
  let systemContent = getCareerStorySystemPrompt();

  // Add archetype guidance if provided
  if (params.archetype) {
    const guidance = ARCHETYPE_GUIDANCE[params.archetype];
    if (guidance) {
      systemContent = `## Story Archetype: ${params.archetype.toUpperCase()}\n\n${guidance}\n\n---\n\n${systemContent}`;
    }
  }

  let userContent = getCareerStoryUserPrompt(params);

  // Add extracted context if provided
  if (params.extractedContext && Object.keys(params.extractedContext).length > 0) {
    userContent += formatExtractedContext(params.extractedContext);
  }

  return [
    {
      role: 'system',
      content: systemContent,
    },
    {
      role: 'user',
      content: userContent,
    },
  ];
}

/**
 * Format extracted context for inclusion in the prompt.
 */
function formatExtractedContext(ctx: ExtractedContext): string {
  const sections: string[] = ['\n\n## User-Provided Context\n'];
  sections.push('Weave these facts into the story. Do not pad or editorialize around them — use them directly.\n');

  if (ctx.realStory) {
    sections.push(`- **Real story:** ${ctx.realStory}`);
  }
  if (ctx.obstacle) {
    sections.push(`- **Obstacle:** ${ctx.obstacle}`);
  }
  if (ctx.keyDecision) {
    sections.push(`- **Key decision:** ${ctx.keyDecision}`);
  }
  if (ctx.namedPeople?.length) {
    sections.push(`- **People:** ${ctx.namedPeople.join(', ')}`);
  }
  if (ctx.counterfactual) {
    sections.push(`- **Counterfactual:** ${ctx.counterfactual}`);
  }
  if (ctx.metric) {
    sections.push(`- **Metric:** ${ctx.metric}`);
  }
  if (ctx.learning) {
    sections.push(`- **Learning:** ${ctx.learning}`);
  }

  return sections.join('\n');
}

/**
 * Log token usage and warn if input exceeds threshold (RJ-7, B-2).
 */
export function logTokenUsage(
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined,
  storyTitle: string,
): void {
  if (!usage) return;
  const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = usage;
  console.log(
    `[Career Story LLM] tokens: ${prompt_tokens} in / ${completion_tokens} out / ${total_tokens} total` +
    ` | story: ${storyTitle?.slice(0, 40)}`
  );
  if (prompt_tokens > 15000) {
    console.warn(
      `[Career Story LLM] WARNING: input tokens (${prompt_tokens}) exceed 15K threshold. ` +
      `Check activity count or body truncation. Story: ${storyTitle}`
    );
  }
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

    const VALID_CATEGORIES = ['projects-impact', 'leadership', 'growth', 'external'];

    return {
      sections: parsed.sections,
      title: parsed.title || 'Career Story',
      reasoning: parsed.reasoning || '',
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : undefined,
    };
  } catch (error) {
    console.error('Failed to parse career story response:', error);
    return null;
  }
}
