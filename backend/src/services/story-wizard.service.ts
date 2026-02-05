/**
 * Story Wizard Service
 *
 * Two-step stateless wizard for promoting journal entries to career stories:
 * 1. analyzeEntry() - Detect archetype, return D-I-G questions
 * 2. generateStory() - Generate story with user answers as context
 *
 * ## Architecture
 * Reuses existing components (Extract-Enrich-Integrate pattern):
 * - career-story.prompt.ts (extended with archetype + extractedContext)
 * - career-story.service.ts (persistence layer)
 * - cli/story-coach/archetype-detector.ts (LLM-based archetype detection)
 * - cli/story-coach/questions.ts (D-I-G question bank - 6 questions per archetype)
 *
 * ## D-I-G Protocol (Dig-Impact-Growth)
 * Questions are organized into three phases:
 * - DIG: Find the buried lede (what really happened?)
 * - IMPACT: Quantify the outcome (what would have happened otherwise?)
 * - GROWTH: Extract learning (what changed because of this?)
 *
 * ## Error Handling
 * Throws WizardError with codes: ENTRY_NOT_FOUND, INSUFFICIENT_CONTENT,
 * INVALID_ARCHETYPE, GENERATION_FAILED. All have appropriate HTTP status codes.
 *
 * ## Invariants (see story-wizard.invariants.md)
 * - Entry must have >50 chars combined content
 * - Score range: 1.0 - 9.5 (never 10)
 * - Max 3 suggestions per evaluation
 *
 * @module story-wizard.service
 */

import { prisma } from '../lib/prisma';
import {
  createCareerStoryService,
  FrameworkName,
} from './career-stories/career-story.service';
import {
  buildCareerStoryMessages,
  JournalEntryContent,
  FrameworkName as PromptFrameworkName,
  parseCareerStoryResponse,
  FRAMEWORK_SECTIONS,
  StoryArchetype,
  ExtractedContext,
} from './ai/prompts/career-story.prompt';
import { getModelSelector } from './ai/model-selector.service';

// Reuse archetype detection and questions from CLI
import { detectArchetype } from '../cli/story-coach/services/archetype-detector';
import { ARCHETYPE_QUESTIONS } from '../cli/story-coach/questions';
import { JournalEntryFile } from '../cli/story-coach/types';

// Re-export types for convenience
export { StoryArchetype, ExtractedContext } from './ai/prompts/career-story.prompt';

// ============================================================================
// TYPES
// ============================================================================

export interface WizardQuestion {
  id: string;
  question: string;
  phase: 'dig' | 'impact' | 'growth';
  hint?: string;
  options?: Array<{ label: string; value: string }>;
  allowFreeText: boolean;
}

export interface ArchetypeResult {
  detected: StoryArchetype;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ archetype: StoryArchetype; confidence: number }>;
}

export interface AnalyzeResult {
  archetype: ArchetypeResult;
  questions: WizardQuestion[];
  journalEntry: { id: string; title: string };
}

export interface WizardAnswer {
  selected: string[];
  freeText?: string;
}

export interface GenerateInput {
  journalEntryId: string;
  answers: Record<string, WizardAnswer>;
  archetype: StoryArchetype;
  framework: FrameworkName;
}

export interface GenerateResult {
  story: {
    id: string;
    title: string;
    hook: string;
    framework: FrameworkName;
    archetype: StoryArchetype;
    sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }>;
  };
  evaluation: {
    score: number;
    breakdown: Record<string, number>;
    suggestions: string[];
    coachComment: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum content length for meaningful archetype detection */
const MIN_CONTENT_LENGTH = 50;

/** Score evaluation constants */
const EVALUATION = {
  BASE_SCORE: 5.0,
  MIN_SCORE: 1.0,
  MAX_SCORE: 9.5, // Never 10 per invariants
  SPECIFICITY_BONUS: 1.0,
  NAMED_PEOPLE_BONUS: 0.5,
  COUNTERFACTUAL_BONUS: 1.0,
  METRIC_BONUS: 0.5,
  SCORE_THRESHOLDS: { EXCELLENT: 8, GOOD: 7, ADEQUATE: 6 },
};

/** Predefined options for common question types */
const QUESTION_OPTIONS = {
  IMPACT_TYPES: [
    { label: 'Revenue/money at risk', value: 'revenue_risk' },
    { label: 'Customer impact', value: 'customer_impact' },
    { label: 'System outage', value: 'outage' },
    { label: 'Reputation damage', value: 'reputation' },
    { label: 'Missed deadline', value: 'deadline' },
  ],
  DISCOVERY_METHODS: [
    { label: 'Got paged/alerted', value: 'paged' },
    { label: 'Customer reported', value: 'customer_report' },
    { label: 'Found in testing', value: 'testing' },
    { label: 'Noticed something off', value: 'intuition' },
    { label: 'Code review', value: 'review' },
  ],
} as const;

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class WizardError extends Error {
  constructor(
    message: string,
    public readonly code: 'ENTRY_NOT_FOUND' | 'INSUFFICIENT_CONTENT' | 'INVALID_ARCHETYPE' | 'GENERATION_FAILED',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'WizardError';
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Transform archetype questions to wizard format with checkbox options.
 * Returns empty array if archetype has no questions defined.
 */
function transformQuestions(archetype: StoryArchetype): WizardQuestion[] {
  const questions = ARCHETYPE_QUESTIONS[archetype];

  if (!questions || !Array.isArray(questions)) {
    console.warn(`[StoryWizard] No questions found for archetype: ${archetype}`);
    return [];
  }

  return questions.map((q) => {
    const wizardQ: WizardQuestion = {
      id: q.id,
      question: q.question,
      phase: q.phase,
      hint: q.hint,
      allowFreeText: true,
    };

    // Add options for specific question types
    if (q.phase === 'impact' && q.id.includes('impact-1')) {
      wizardQ.options = [...QUESTION_OPTIONS.IMPACT_TYPES];
    } else if (q.phase === 'dig' && q.id.includes('dig-1')) {
      wizardQ.options = [...QUESTION_OPTIONS.DISCOVERY_METHODS];
    }

    return wizardQ;
  });
}

/**
 * Transform wizard answers to ExtractedContext.
 * Maps question IDs to context fields based on D-I-G protocol phases.
 *
 * TODO: Consider making question ID → context field mapping configurable
 * TODO: Add support for extracting metrics/numbers from free text answers
 */
function answersToContext(answers: Record<string, WizardAnswer>): ExtractedContext {
  const context: ExtractedContext = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    // Safely handle missing or malformed answers
    const selected = Array.isArray(answer?.selected) ? answer.selected : [];
    const freeText = typeof answer?.freeText === 'string' ? answer.freeText : '';

    const combined = [...selected, freeText].filter(Boolean).join('. ');
    if (!combined) continue;

    // Map question IDs to context fields based on D-I-G phases
    if (questionId.includes('dig-1')) {
      context.realStory = combined;
    } else if (questionId.includes('dig-2')) {
      context.keyDecision = combined;
      // Extract proper names (capitalized words 2+ chars, not common words)
      // Pattern: Capital letter followed by lowercase, min 2 chars total
      const namePattern = /\b([A-Z][a-z]{1,})\b/g;
      const matches = combined.match(namePattern);
      if (matches) {
        // Filter out common words that match the pattern
        const commonWords = new Set(['The', 'This', 'That', 'When', 'What', 'Where', 'How', 'Why', 'Who']);
        const names = matches.filter((name) => !commonWords.has(name));
        if (names.length > 0) {
          context.namedPeople = Array.from(new Set(names));
        }
      }
    } else if (questionId.includes('dig-3')) {
      context.obstacle = combined;
    } else if (questionId.includes('impact-1')) {
      context.counterfactual = combined;
    } else if (questionId.includes('impact-2')) {
      context.metric = combined;
    } else if (questionId.includes('growth')) {
      context.learning = combined;
    }
  }

  return context;
}

/**
 * Rule-based story evaluation using D-I-G context signals.
 * Score range: 1.0 - 9.5 (never 10 per design invariants).
 *
 * Scoring factors:
 * - Specificity: +1.0 for numbers/metrics in generated content
 * - Named people: +0.5 for mentioning specific individuals
 * - Counterfactual: +1.0 for explaining what would have happened
 * - Metric: +0.5 for quantified impact in answers
 *
 * TODO: Consider LLM-based evaluation for more nuanced scoring
 * TODO: Add archetype-specific scoring criteria
 */
function evaluateStory(
  sections: Record<string, { summary: string }>,
  context: ExtractedContext
): GenerateResult['evaluation'] {
  let score = EVALUATION.BASE_SCORE;
  const suggestions: string[] = [];

  // Combine all section text for analysis
  const allText = Object.values(sections)
    .map((s) => s?.summary || '')
    .join(' ');

  // Check for specificity (numbers, percentages, time units)
  const specificityPattern = /\d+%|\$[\d,]+|\d+\s*(hours?|days?|weeks?|months?|teams?|users?|engineers?)/i;
  if (specificityPattern.test(allText)) {
    score += EVALUATION.SPECIFICITY_BONUS;
  } else {
    suggestions.push('Add specific numbers to quantify impact');
  }

  // Named people increases credibility
  if (context.namedPeople?.length) {
    score += EVALUATION.NAMED_PEOPLE_BONUS;
  } else {
    suggestions.push('Mention specific people by name');
  }

  // Counterfactual establishes stakes
  if (context.counterfactual) {
    score += EVALUATION.COUNTERFACTUAL_BONUS;
  } else {
    suggestions.push('Explain what would have happened without your intervention');
  }

  // Metrics add concrete evidence
  if (context.metric) {
    score += EVALUATION.METRIC_BONUS;
  }

  // Clamp score to valid range
  score = Math.min(EVALUATION.MAX_SCORE, Math.max(EVALUATION.MIN_SCORE, score));

  // Generate coach comment based on score thresholds
  const { EXCELLENT, GOOD, ADEQUATE } = EVALUATION.SCORE_THRESHOLDS;
  const coachComment = score >= EXCELLENT
    ? "THAT'S a story. The details sell it."
    : score >= GOOD
      ? 'Good structure. The numbers are there.'
      : score >= ADEQUATE
        ? 'I can see what happened. Now make me care.'
        : "This is a summary, not a story. Where's the drama?";

  return {
    score,
    breakdown: {
      specificity: context.metric ? 8 : 5,
      compellingHook: context.realStory ? 7 : 5,
      evidenceQuality: 6,
      archetypeFit: 7,
      actionableImpact: context.counterfactual ? 8 : 5,
    },
    suggestions: suggestions.slice(0, 3), // Max 3 suggestions per invariants
    coachComment,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export class StoryWizardService {
  private readonly logPrefix = '[StoryWizard]';

  constructor(private isDemoMode: boolean = true) {}

  /**
   * Step 1: Analyze journal entry → archetype + questions.
   * @throws {WizardError} If entry not found or has insufficient content
   */
  async analyzeEntry(journalEntryId: string, userId: string): Promise<AnalyzeResult> {
    console.log(`${this.logPrefix} analyzeEntry started`, {
      journalEntryId,
      userId: userId.slice(0, 8) + '...', // Truncate for privacy
      isDemoMode: this.isDemoMode,
    });

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        authorId: userId,
        sourceMode: this.isDemoMode ? 'demo' : 'production',
      },
      select: { id: true, title: true, description: true, fullContent: true, category: true },
    });

    if (!entry) {
      console.warn(`${this.logPrefix} Entry not found: ${journalEntryId}`);
      throw new WizardError('Journal entry not found', 'ENTRY_NOT_FOUND', 404);
    }

    // Validate content length per invariants
    const contentLength = (entry.fullContent?.length || 0) + (entry.description?.length || 0);
    if (contentLength < MIN_CONTENT_LENGTH) {
      console.warn(`${this.logPrefix} Insufficient content: ${contentLength} chars (min: ${MIN_CONTENT_LENGTH})`);
      throw new WizardError(
        `Entry has insufficient content for analysis (${contentLength} chars, need ${MIN_CONTENT_LENGTH}+)`,
        'INSUFFICIENT_CONTENT',
        400
      );
    }

    // Convert to format expected by archetype detector
    const entryFile: JournalEntryFile = {
      id: entry.id,
      title: entry.title || 'Untitled',
      description: entry.description,
      fullContent: entry.fullContent,
      category: entry.category,
      dominantRole: null,
    };

    const detection = await detectArchetype(entryFile);
    const questions = transformQuestions(detection.primary.archetype);

    console.log(`${this.logPrefix} analyzeEntry complete`, {
      entryId: entry.id,
      archetype: detection.primary.archetype,
      confidence: detection.primary.confidence,
      questionCount: questions.length,
    });

    return {
      archetype: {
        detected: detection.primary.archetype,
        confidence: detection.primary.confidence,
        reasoning: detection.primary.reasoning,
        alternatives: detection.alternatives.map((a) => ({
          archetype: a.archetype,
          confidence: a.confidence,
        })),
      },
      questions,
      journalEntry: { id: entry.id, title: entry.title || 'Untitled' },
    };
  }

  /**
   * Step 2: Generate story with user answers.
   * @throws {WizardError} If entry not found or generation fails
   */
  async generateStory(input: GenerateInput, userId: string): Promise<GenerateResult> {
    const { journalEntryId, answers, archetype, framework } = input;

    console.log(`${this.logPrefix} generateStory started`, {
      journalEntryId,
      userId: userId.slice(0, 8) + '...',
      archetype,
      framework,
      answerCount: Object.keys(answers).length,
    });

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        authorId: userId,
        sourceMode: this.isDemoMode ? 'demo' : 'production',
      },
      select: { id: true, title: true, description: true, fullContent: true, category: true, activityIds: true },
    });

    if (!entry) {
      console.warn(`${this.logPrefix} Entry not found for generate: ${journalEntryId}`);
      throw new WizardError('Journal entry not found', 'ENTRY_NOT_FOUND', 404);
    }

    const extractedContext = answersToContext(answers);

    // Build content for prompt (uses extended buildCareerStoryMessages)
    const journalEntryContent: JournalEntryContent = {
      title: entry.title || 'Untitled',
      description: entry.description,
      fullContent: entry.fullContent,
      category: entry.category,
      dominantRole: null,
      phases: null,
      impactHighlights: extractedContext.metric ? [extractedContext.metric] : null,
      skills: null,
      activityIds: entry.activityIds,
    };

    // Generate via LLM with archetype + context
    const sections = await this.generateSections(journalEntryContent, framework, archetype, extractedContext);

    // Build hook
    const hook = extractedContext.realStory?.slice(0, 200)
      || extractedContext.obstacle?.slice(0, 200)
      || this.getDefaultHook(archetype);

    // Evaluate
    const evaluation = evaluateStory(sections, extractedContext);

    // Save to DB via existing service
    const careerStoryService = createCareerStoryService(this.isDemoMode);
    const saveResult = await careerStoryService.createFromJournalEntry(userId, journalEntryId, framework);

    const storyId = saveResult.story?.id || `wizard-${Date.now()}`;

    console.log(`${this.logPrefix} generateStory complete`, {
      storyId,
      framework,
      archetype,
      score: evaluation.score,
      sectionCount: Object.keys(sections).length,
    });

    return {
      story: {
        id: storyId,
        title: entry.title || 'Career Story',
        hook,
        framework,
        archetype,
        sections,
      },
      evaluation,
    };
  }

  private async generateSections(
    journalEntry: JournalEntryContent,
    framework: FrameworkName,
    archetype: StoryArchetype,
    extractedContext: ExtractedContext
  ): Promise<Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }>> {
    const modelSelector = getModelSelector();
    if (!modelSelector) {
      return this.buildFallbackSections(framework, journalEntry);
    }

    // Use updated buildCareerStoryMessages with archetype + context
    const messages = buildCareerStoryMessages({
      journalEntry,
      framework: framework as PromptFrameworkName,
      archetype,
      extractedContext,
    });

    try {
      const result = await modelSelector.executeTask('generate', messages, 'balanced', {
        maxTokens: 2000,
        temperature: 0.7,
      });

      const parsed = parseCareerStoryResponse(result.content);
      if (!parsed) return this.buildFallbackSections(framework, journalEntry);

      const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || [];
      const sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }> = {};

      for (const key of sectionKeys) {
        const section = parsed.sections[key];
        sections[key] = {
          summary: section?.summary || `${key} details pending`,
          evidence: section?.evidence || journalEntry.activityIds.map((id) => ({ activityId: id })),
        };
      }

      return sections;
    } catch (error) {
      console.error('Story generation failed:', error);
      return this.buildFallbackSections(framework, journalEntry);
    }
  }

  private buildFallbackSections(
    framework: FrameworkName,
    journalEntry: JournalEntryContent
  ): Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }> {
    const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || ['situation', 'task', 'action', 'result'];
    const sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }> = {};

    for (const key of sectionKeys) {
      sections[key] = {
        summary: `${key}: ${journalEntry.description || journalEntry.title || 'Details pending'}`,
        evidence: journalEntry.activityIds.map((id) => ({ activityId: id })),
      };
    }

    return sections;
  }

  private getDefaultHook(archetype: StoryArchetype): string {
    const hooks: Record<StoryArchetype, string> = {
      firefighter: 'When the alert came in, everything changed.',
      architect: 'I saw what needed to be built, and I built it to last.',
      diplomat: 'Two teams, opposing views, one path forward.',
      multiplier: 'What started as my solution became everyone\'s solution.',
      detective: 'No one could figure out why. Until I traced it back.',
      pioneer: 'No documentation. No playbook. Just a problem that needed solving.',
      turnaround: 'I inherited a mess. Here\'s how I turned it around.',
      preventer: 'I noticed something others missed. It saved us.',
    };
    return hooks[archetype];
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createStoryWizardService(isDemoMode: boolean = true): StoryWizardService {
  return new StoryWizardService(isDemoMode);
}
