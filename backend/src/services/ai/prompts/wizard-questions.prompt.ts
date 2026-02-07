/**
 * Prompts for Dynamic Wizard Questions
 *
 * Generates contextual D-I-G questions via LLM based on
 * journal entry content and detected archetype signals.
 * Falls back to static question bank on any failure.
 *
 * @module wizard-questions.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import type { StoryArchetype } from './career-story.prompt';
import type { ArchetypeSignals } from '../../../cli/story-coach/types';

// =============================================================================
// TYPES
// =============================================================================

export interface WizardQuestionPromptParams {
  archetype: StoryArchetype;
  archetypeReasoning: string;
  entryTitle: string;
  entryContent: string;
  signals: ArchetypeSignals;
  questionIdPrefix: string;
}

export interface ParsedWizardQuestion {
  id: string;
  question: string;
  phase: 'dig' | 'impact' | 'growth';
  hint: string;
}

// =============================================================================
// ARCHETYPE ID PREFIXES
// =============================================================================

export const ARCHETYPE_PREFIXES: Record<StoryArchetype, string> = {
  firefighter: 'ff',
  architect: 'ar',
  diplomat: 'di',
  multiplier: 'mu',
  detective: 'de',
  pioneer: 'pi',
  turnaround: 'tu',
  preventer: 'pr',
};

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

const TEMPLATES_DIR = join(__dirname, 'templates');

let wizardTemplate: Handlebars.TemplateDelegate;

try {
  const raw = readFileSync(join(TEMPLATES_DIR, 'wizard-questions.prompt.md'), 'utf-8');
  wizardTemplate = Handlebars.compile(raw);
} catch (error) {
  console.warn('Failed to load wizard-questions template:', (error as Error).message);
  wizardTemplate = Handlebars.compile(
    'Generate 6 D-I-G questions (3 dig, 2 impact, 1 growth) for a {{archetype}} story about: {{entryTitle}}'
  );
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are a Story Coach who questions like Tim Ferriss deconstructs — skip the surface, find the non-obvious specific moment or tactic. You're designing interview questions for someone about a career achievement.

Your style:
- Direct but warm
- Curious, not judgmental
- You dig for specifics: names, numbers, moments
- You find the drama they didn't know was there

Your job: generate questions that pull out what they KNOW but didn't WRITE.

You MUST return valid JSON and nothing else.`;

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build chat messages for dynamic wizard question generation.
 */
export function buildWizardQuestionMessages(
  params: WizardQuestionPromptParams,
): ChatCompletionMessageParam[] {
  const presentSignals: string[] = [];
  const missingSignals: string[] = [];

  const signalLabels: Record<keyof ArchetypeSignals, string> = {
    hasCrisis: 'crisis/urgency',
    hasArchitecture: 'system design/architecture',
    hasStakeholders: 'stakeholder management',
    hasMultiplication: 'force multiplication/leverage',
    hasMystery: 'investigation/debugging',
    hasPioneering: 'pioneering/exploration',
    hasTurnaround: 'turnaround/recovery',
    hasPrevention: 'risk prevention',
  };

  for (const [key, label] of Object.entries(signalLabels)) {
    if (params.signals[key as keyof ArchetypeSignals]) {
      presentSignals.push(label);
    } else {
      missingSignals.push(label);
    }
  }

  const userContent = wizardTemplate({
    ...params,
    presentSignals,
    missingSignals,
  });

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

const VALID_PHASES = new Set(['dig', 'impact', 'growth']);
const PHASE_COUNTS = { dig: 3, impact: 2, growth: 1 };

/**
 * Parse and validate LLM response into WizardQuestion[].
 * Returns null on any failure (triggers static fallback).
 */
export function parseWizardQuestionsResponse(
  content: string,
  prefix: string,
): ParsedWizardQuestion[] | null {
  try {
    // Strip markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    // Accept either root array or { questions: [...] }
    const questions: unknown[] = Array.isArray(parsed) ? parsed : parsed?.questions;
    if (!Array.isArray(questions) || questions.length !== 6) {
      return null;
    }

    // Validate each question
    const result: ParsedWizardQuestion[] = [];
    const phaseCounts = { dig: 0, impact: 0, growth: 0 };

    for (const q of questions) {
      if (typeof q !== 'object' || q === null) return null;
      const obj = q as Record<string, unknown>;

      if (typeof obj.id !== 'string') return null;
      if (typeof obj.question !== 'string') return null;
      if (typeof obj.phase !== 'string' || !VALID_PHASES.has(obj.phase)) return null;
      if (typeof obj.hint !== 'string') return null;

      const phase = obj.phase as 'dig' | 'impact' | 'growth';

      // Validate ID pattern: {prefix}-{phase}-{n}
      const expectedPrefix = `${prefix}-${phase}-`;
      if (!obj.id.startsWith(expectedPrefix)) return null;

      phaseCounts[phase]++;

      result.push({
        id: obj.id,
        question: obj.question,
        phase,
        hint: obj.hint,
      });
    }

    // Validate phase distribution: exactly 3 dig, 2 impact, 1 growth
    if (
      phaseCounts.dig !== PHASE_COUNTS.dig ||
      phaseCounts.impact !== PHASE_COUNTS.impact ||
      phaseCounts.growth !== PHASE_COUNTS.growth
    ) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}
