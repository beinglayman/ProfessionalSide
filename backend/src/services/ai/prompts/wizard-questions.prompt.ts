/**
 * Prompts for Dynamic Wizard Questions
 *
 * Generates contextual D-I-G questions via LLM based on
 * journal entry content and detected archetype signals.
 * Falls back to static question bank on any failure.
 *
 * Updated: 3 gap-targeted questions instead of 6 generic.
 * The system already knows timeline, people, and scope from activities.
 *
 * @module wizard-questions.prompt
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { compileSafe, SafeTemplate } from './handlebars-safe';
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
  /** Primitives extracted from ranked activities — NOT ActivityContext[] (RH-5) */
  knownContext?: KnownContext;
}

export interface ParsedWizardQuestion {
  id: string;
  question: string;
  phase: 'dig' | 'impact' | 'growth';
  hint: string;
}

/** Primitives only — no dependency on ActivityContext type (RH-5) */
export interface KnownContext {
  dateRange?: string;
  collaborators?: string;
  codeStats?: string;
  tools?: string;
  labels?: string;
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

let wizardTemplate: SafeTemplate;

try {
  const raw = readFileSync(join(TEMPLATES_DIR, 'wizard-questions.prompt.md'), 'utf-8');
  wizardTemplate = compileSafe(raw);
} catch (error) {
  console.warn('Failed to load wizard-questions template:', (error as Error).message);
  wizardTemplate = compileSafe(
    'Generate 3 D-I-G questions (1 dig, 1 impact, 1 growth) for a {{archetype}} story about: {{entryTitle}}'
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
// QUESTION COUNT ENFORCEMENT (RJ-6)
// =============================================================================

const TARGET_QUESTION_COUNT = 3;

const FALLBACK_QUESTIONS: ParsedWizardQuestion[] = [
  { id: 'fallback-dig-1', question: 'What was the biggest obstacle you faced?', phase: 'dig', hint: 'Describe the moment it went wrong.' },
  { id: 'fallback-impact-1', question: 'What would have happened if you hadn\'t been involved?', phase: 'impact', hint: 'Estimate the cost or consequence.' },
  { id: 'fallback-growth-1', question: 'What specific metric proves this was successful?', phase: 'growth', hint: 'Give me the number.' },
];

/**
 * Enforce exactly 3 questions. Slice if too many, pad with fallbacks if too few. (RJ-6)
 * Exported for testability.
 */
export function enforceQuestionCount(
  questions: ParsedWizardQuestion[],
  prefix?: string,
): ParsedWizardQuestion[] {
  let result = questions.slice(0, TARGET_QUESTION_COUNT);
  let fallbackIdx = result.length;
  while (result.length < TARGET_QUESTION_COUNT) {
    const fallback = FALLBACK_QUESTIONS[fallbackIdx];
    result.push({
      ...fallback,
      id: prefix ? `${prefix}-${fallback.phase}-1` : fallback.id,
    });
    fallbackIdx++;
  }
  return result;
}

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

  // Build knownContext for template — only include if any field has data
  const knownContext = params.knownContext;
  const hasKnownContext = knownContext &&
    (knownContext.dateRange || knownContext.collaborators || knownContext.codeStats ||
     knownContext.tools || knownContext.labels);

  const userContent = wizardTemplate({
    ...params,
    presentSignals,
    missingSignals,
    knownContext: hasKnownContext ? knownContext : undefined,
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

/**
 * Parse and validate LLM response into WizardQuestion[].
 * Accepts 3 questions (new) or 6 questions (legacy compatibility).
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
    if (!Array.isArray(questions) || questions.length < 1) {
      return null;
    }

    // Validate each question
    const result: ParsedWizardQuestion[] = [];

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

      result.push({
        id: obj.id,
        question: obj.question,
        phase,
        hint: obj.hint,
      });
    }

    return result;
  } catch {
    return null;
  }
}
