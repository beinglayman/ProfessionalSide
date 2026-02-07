/**
 * Prompts for Story Derivations
 *
 * Transforms career stories into audience-specific formats
 * (interview, LinkedIn, resume, 1:1, self-assessment, team share).
 * Derivations are ephemeral — generated on demand, not stored.
 *
 * @module derivation.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import type { DerivationType } from '../../../controllers/career-stories.schemas';
import type { StoryArchetype, WritingStyle } from './career-story.prompt';

// =============================================================================
// TYPES
// =============================================================================

export interface DerivationPromptParams {
  title: string;
  framework: string;
  sections: Record<string, { summary: string }>;
  archetype?: string | null;
  tone?: WritingStyle;
  customPrompt?: string;
  /** Pre-extracted metrics from section text */
  metrics?: string;
  /** Number of source activities */
  activityCount?: number;
  /** Number of curated sources */
  sourceCount?: number;
  /** Wizard answer summaries (D-I-G context) */
  wizardContext?: string;
  /** Date range of underlying activities */
  dateRange?: string;
}

// =============================================================================
// ARCHETYPE GUIDANCE (reused from career-story.prompt.ts)
// =============================================================================

const ARCHETYPE_GUIDANCE: Record<StoryArchetype, string> = {
  firefighter: 'This is a CRISIS RESPONSE story. Emphasize urgency and quick thinking.',
  architect: 'This is a SYSTEM DESIGN story. Emphasize vision, trade-offs, and lasting impact.',
  diplomat: 'This is a STAKEHOLDER ALIGNMENT story. Emphasize influence and consensus building.',
  multiplier: 'This is a FORCE MULTIPLICATION story. Emphasize leverage and compound impact.',
  detective: 'This is an INVESTIGATION story. Emphasize the root-cause discovery.',
  pioneer: 'This is a FIRST MOVER story. Emphasize exploring unknown territory.',
  turnaround: 'This is a RECOVERY story. Emphasize the before/after transformation.',
  preventer: 'This is a RISK PREVENTION story. Emphasize what didn\'t happen because of you.',
};

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

let systemTemplate: string;
const DERIVATION_TEMPLATES: Record<string, Handlebars.TemplateDelegate> = {};

const DERIVATION_TYPES: DerivationType[] = [
  'interview', 'linkedin', 'resume', 'one-on-one', 'self-assessment', 'team-share',
];

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'derivation-system.prompt.md'), 'utf-8');

  for (const type of DERIVATION_TYPES) {
    const raw = readFileSync(join(TEMPLATES_DIR, `derivation-${type}.prompt.md`), 'utf-8');
    DERIVATION_TEMPLATES[type] = Handlebars.compile(raw);
  }
} catch (error) {
  console.warn('Failed to load derivation prompt templates:', (error as Error).message);
  systemTemplate = 'You are a career communication specialist. Rewrite the story for the specified audience. Return only the derived text.';
  for (const type of DERIVATION_TYPES) {
    DERIVATION_TEMPLATES[type] = Handlebars.compile(
      `Rewrite this story as a {{derivationType}} format.\nTitle: {{title}}\n{{#each sections}}{{@key}}: {{this.summary}}\n{{/each}}`
    );
  }
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build chat messages for a derivation request.
 * Provides the full bill of materials: title, framework, all sections,
 * archetype, metrics, activity count, source count, wizard context, date range.
 */
export function buildDerivationMessages(
  derivationType: DerivationType,
  params: DerivationPromptParams,
): ChatCompletionMessageParam[] {
  // Build system prompt with optional archetype guidance
  let systemContent = systemTemplate;
  if (params.archetype && ARCHETYPE_GUIDANCE[params.archetype as StoryArchetype]) {
    const guidance = ARCHETYPE_GUIDANCE[params.archetype as StoryArchetype];
    systemContent = `## Story Archetype: ${params.archetype.toUpperCase()}\n\n${guidance}\n\n---\n\n${systemContent}`;
  }

  // Compile user template with full story context
  const template = DERIVATION_TEMPLATES[derivationType];
  const userContent = template({
    derivationType,
    title: params.title,
    framework: params.framework,
    sections: params.sections,
    archetype: params.archetype || undefined,
    tone: params.tone || undefined,
    customPrompt: params.customPrompt || undefined,
    metrics: params.metrics || undefined,
    activityCount: params.activityCount || undefined,
    sourceCount: params.sourceCount || undefined,
    wizardContext: params.wizardContext || undefined,
    dateRange: params.dateRange || undefined,
  });

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}
