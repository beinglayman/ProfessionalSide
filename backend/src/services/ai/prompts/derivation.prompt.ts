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
import type { DerivationType, PacketType } from '../../../controllers/career-stories.schemas';
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
// MULTI-STORY TYPES
// =============================================================================

export interface PacketStoryInput {
  title: string;
  framework: string;
  sections: Record<string, { summary: string }>;
  metrics?: string;
  dateRange?: string;
}

export interface PacketPromptParams {
  packetType?: PacketType;
  tone?: WritingStyle;
  customPrompt?: string;
}

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

let systemTemplate: string;
const DERIVATION_TEMPLATES: Record<string, Handlebars.TemplateDelegate> = {};
const PACKET_TEMPLATES: Record<string, Handlebars.TemplateDelegate> = {};

const DERIVATION_TYPES: DerivationType[] = [
  'interview', 'linkedin', 'resume', 'one-on-one', 'self-assessment', 'team-share',
];

const PACKET_TYPES: PacketType[] = [
  'promotion', 'annual-review', 'skip-level', 'portfolio-brief', 'self-assessment', 'one-on-one',
];

const PACKET_TEMPLATE_FILES: Record<PacketType, string> = {
  'promotion': 'derivation-promotion-packet.prompt.md',
  'annual-review': 'derivation-annual-review.prompt.md',
  'skip-level': 'derivation-skip-level.prompt.md',
  'portfolio-brief': 'derivation-portfolio-brief.prompt.md',
  'self-assessment': 'derivation-packet-self-assessment.prompt.md',
  'one-on-one': 'derivation-packet-one-on-one.prompt.md',
};

try {
  systemTemplate = readFileSync(join(TEMPLATES_DIR, 'derivation-system.prompt.md'), 'utf-8');

  for (const type of DERIVATION_TYPES) {
    const raw = readFileSync(join(TEMPLATES_DIR, `derivation-${type}.prompt.md`), 'utf-8');
    DERIVATION_TEMPLATES[type] = Handlebars.compile(raw);
  }

  for (const type of PACKET_TYPES) {
    const raw = readFileSync(join(TEMPLATES_DIR, PACKET_TEMPLATE_FILES[type]), 'utf-8');
    PACKET_TEMPLATES[type] = Handlebars.compile(raw);
  }
} catch (error) {
  console.warn('Failed to load derivation prompt templates:', (error as Error).message);
  systemTemplate = 'You are a career communication specialist. Rewrite the story for the specified audience. Return only the derived text.';
  for (const type of DERIVATION_TYPES) {
    DERIVATION_TEMPLATES[type] = Handlebars.compile(
      `Rewrite this story as a {{derivationType}} format.\nTitle: {{title}}\n{{#each sections}}{{@key}}: {{this.summary}}\n{{/each}}`
    );
  }
  const fallbackPacket = Handlebars.compile(
    `Generate a document from these stories.\n{{#each stories}}Title: {{this.title}}\n{{#each this.sections}}{{@key}}: {{this.summary}}\n{{/each}}\n---\n{{/each}}`
  );
  for (const type of PACKET_TYPES) {
    PACKET_TEMPLATES[type] = fallbackPacket;
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

// =============================================================================
// PROMOTION PACKET PROMPT BUILDER
// =============================================================================

/**
 * Build chat messages for a multi-story packet derivation.
 * Selects the appropriate template based on packetType.
 */
export function buildPacketMessages(
  stories: PacketStoryInput[],
  params: PacketPromptParams,
): ChatCompletionMessageParam[] {
  const packetType = params.packetType || 'promotion';
  const template = PACKET_TEMPLATES[packetType];

  const userContent = template({
    stories,
    tone: params.tone || undefined,
    customPrompt: params.customPrompt || undefined,
  });

  return [
    { role: 'system', content: systemTemplate },
    { role: 'user', content: userContent },
  ];
}
