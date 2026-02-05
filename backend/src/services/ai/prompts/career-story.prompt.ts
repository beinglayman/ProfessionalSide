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

export interface CareerStoryPromptParams {
  journalEntry: JournalEntryContent;
  framework: FrameworkName;
  /** Optional: Story archetype for narrative shaping */
  archetype?: StoryArchetype;
  /** Optional: Extracted context from Story Coach D-I-G questions */
  extractedContext?: ExtractedContext;
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

/**
 * Archetype-specific narrative guidance.
 * Shapes the voice and emphasis of the generated story.
 */
const ARCHETYPE_GUIDANCE: Record<StoryArchetype, string> = {
  firefighter: 'This is a CRISIS RESPONSE story. Emphasize: urgency, quick thinking, disaster averted. The drama is in what almost went wrong. Use time markers ("At 2am...", "With 48 hours left..."). Show the moment of realization.',
  architect: 'This is a SYSTEM DESIGN story. Emphasize: vision, trade-offs, lasting impact. The value is in what was built to last. Show the design decisions and their rationale. Mention adoption ("5 teams now use...", "still the foundation...").',
  diplomat: 'This is a STAKEHOLDER ALIGNMENT story. Emphasize: competing interests, influence, consensus building. The skill is in bridging divides. Name the stakeholders and their concerns. Show how you found common ground.',
  multiplier: 'This is a FORCE MULTIPLICATION story. Emphasize: creating leverage, adoption by others, compound impact. The value scales beyond the individual. Quantify the multiplication ("20 engineers now use...", "saved 10 hours/week each").',
  detective: 'This is an INVESTIGATION story. Emphasize: mystery, dead ends, breakthrough moment. The skill is in finding the root cause. Walk through the investigation. Show the "aha" moment when you found it.',
  pioneer: 'This is a FIRST MOVER story. Emphasize: no documentation, learning by doing, trail left for others. The courage is in exploring unknown territory. Show what you tried that didn\'t work. Highlight the guide you created for others.',
  turnaround: 'This is a RECOVERY story. Emphasize: inherited mess, diagnosis, systematic fix. Show the before/after transformation with specific metrics. Be honest about how bad it was initially.',
  preventer: 'This is a RISK PREVENTION story. Emphasize: noticing what others missed, raising the alarm, disaster averted. The value is in what didn\'t happen. Paint the picture of the counterfactual disaster.',
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
  const sections: string[] = ['\n\n## Extracted Context from Story Coach\n'];
  sections.push('The user revealed these additional details. Use them to enrich the story:\n');

  if (ctx.realStory) {
    sections.push(`### The Real Story\n${ctx.realStory}\n`);
  }
  if (ctx.obstacle) {
    sections.push(`### What Almost Went Wrong\n${ctx.obstacle}\n`);
  }
  if (ctx.keyDecision) {
    sections.push(`### Key Decision\n${ctx.keyDecision}\n`);
  }
  if (ctx.namedPeople?.length) {
    sections.push(`### Key People Involved\n${ctx.namedPeople.map(p => `- ${p}`).join('\n')}\n`);
  }
  if (ctx.counterfactual) {
    sections.push(`### What Would Have Happened (Counterfactual)\n${ctx.counterfactual}\n`);
  }
  if (ctx.metric) {
    sections.push(`### Quantified Impact\n${ctx.metric}\n`);
  }
  if (ctx.learning) {
    sections.push(`### Key Learning\n${ctx.learning}\n`);
  }

  return sections.join('\n');
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
