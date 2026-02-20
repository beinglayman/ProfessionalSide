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
import { Prisma } from '@prisma/client';
import {
  createCareerStoryService,
  FrameworkName,
} from './career-stories/career-story.service';
import {
  buildCareerStoryMessages,
  JournalEntryContent,
  FrameworkName as PromptFrameworkName,
  parseCareerStoryResponse,
  logTokenUsage,
  FRAMEWORK_SECTIONS,
  StoryArchetype,
  ExtractedContext,
} from './ai/prompts/career-story.prompt';
import { getModelSelector } from './ai/model-selector.service';

// Reuse archetype detection and questions from CLI
import { detectArchetype } from '../cli/story-coach/services/archetype-detector';
import { ARCHETYPE_QUESTIONS } from '../cli/story-coach/questions';
import { JournalEntryFile, ArchetypeSignals } from '../cli/story-coach/types';

// Dynamic wizard question generation
import {
  buildWizardQuestionMessages,
  parseWizardQuestionsResponse,
  enforceQuestionCount,
  ARCHETYPE_PREFIXES,
  KnownContext,
} from './ai/prompts/wizard-questions.prompt';
import { buildLLMInput } from './career-stories/llm-input.builder';
import { rankActivities } from './career-stories/activity-context.adapter';

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
    suggestions: string[];
    coachComment: string;
  };
  _sourceDebug?: Record<string, unknown>;
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

/** Question ID patterns for mapping answers to context fields */
const QUESTION_PATTERNS = {
  DIG_1: 'dig-1',
  DIG_2: 'dig-2',
  DIG_3: 'dig-3',
  IMPACT_1: 'impact-1',
  IMPACT_2: 'impact-2',
  GROWTH: 'growth',
} as const;

/** Default hooks per archetype - Story Coach voice */
const ARCHETYPE_HOOKS: Record<StoryArchetype, string> = {
  firefighter: 'When the alert came in, everything changed.',
  architect: 'I saw what needed to be built, and I built it to last.',
  diplomat: 'Two teams, opposing views, one path forward.',
  multiplier: 'What started as my solution became everyone\'s solution.',
  detective: 'No one could figure out why. Until I traced it back.',
  pioneer: 'No documentation. No playbook. Just a problem that needed solving.',
  turnaround: 'I inherited a mess. Here\'s how I turned it around.',
  preventer: 'I noticed something others missed. It saved us.',
};

/** Common words to filter from name extraction (sentence starters, question words, verbs) */
const COMMON_WORDS = new Set([
  // Question words and pronouns
  'The', 'This', 'That', 'When', 'What', 'Where', 'How', 'Why', 'Who',
  // Common sentence starters / past tense verbs
  'Worked', 'Called', 'Created', 'Built', 'Fixed', 'Made', 'Started', 'Helped',
  'Found', 'Asked', 'Told', 'Saw', 'Got', 'Had', 'Was', 'Did', 'Used', 'Went',
  // Time/place words
  'After', 'Before', 'During', 'While', 'Then', 'Now', 'Here', 'There',
  // Other common starters
  'Our', 'Their', 'Some', 'Most', 'Many', 'Each', 'Every', 'Both',
]);

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
    if (q.phase === 'impact' && q.id.includes(QUESTION_PATTERNS.IMPACT_1)) {
      wizardQ.options = [...QUESTION_OPTIONS.IMPACT_TYPES];
    } else if (q.phase === 'dig' && q.id.includes(QUESTION_PATTERNS.DIG_1)) {
      wizardQ.options = [...QUESTION_OPTIONS.DISCOVERY_METHODS];
    }

    return wizardQ;
  });
}

/**
 * Safely combine selected options and free text into a single string.
 */
function combineAnswerParts(answer: WizardAnswer | undefined): string {
  const selected = Array.isArray(answer?.selected) ? answer.selected : [];
  const freeText = typeof answer?.freeText === 'string' ? answer.freeText : '';
  return [...selected, freeText].filter(Boolean).join('. ');
}

/**
 * Extract proper names from text (capitalized words, filtering common words).
 * Returns undefined if no names found.
 */
export function extractNamedPeople(text: string): string[] | undefined {
  const namePattern = /\b([A-Z][a-z]{1,})\b/g;
  const matches = text.match(namePattern);
  if (!matches) return undefined;

  const names = matches.filter((name) => !COMMON_WORDS.has(name));
  return names.length > 0 ? Array.from(new Set(names)) : undefined;
}

/**
 * Transform wizard answers to ExtractedContext.
 * Maps question IDs to context fields based on D-I-G protocol phases.
 */
export function answersToContext(answers: Record<string, WizardAnswer>): ExtractedContext {
  const context: ExtractedContext = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    const combined = combineAnswerParts(answer);
    if (!combined) continue;

    if (questionId.includes(QUESTION_PATTERNS.DIG_1)) {
      context.realStory = combined;
    } else if (questionId.includes(QUESTION_PATTERNS.DIG_2)) {
      context.keyDecision = combined;
      context.namedPeople = extractNamedPeople(combined);
    } else if (questionId.includes(QUESTION_PATTERNS.DIG_3)) {
      context.obstacle = combined;
    } else if (questionId.includes(QUESTION_PATTERNS.IMPACT_1)) {
      context.counterfactual = combined;
    } else if (questionId.includes(QUESTION_PATTERNS.IMPACT_2)) {
      context.metric = combined;
    } else if (questionId.includes(QUESTION_PATTERNS.GROWTH)) {
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
    suggestions: suggestions.slice(0, 3),
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
      select: { id: true, title: true, description: true, fullContent: true, category: true, activityIds: true, format7Data: true },
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

    // Fetch + rank activities for knownContext (what the system already knows)
    const analyzeActivityTable = this.isDemoMode ? prisma.demoToolActivity : prisma.toolActivity;
    const analyzeActivityRows = entry.activityIds?.length > 0
      ? await (analyzeActivityTable.findMany as Function)({
          where: { id: { in: entry.activityIds } },
          select: { id: true, source: true, title: true, rawData: true, timestamp: true },
        })
      : [];

    const rankedForContext = analyzeActivityRows.length > 0
      ? rankActivities(
          analyzeActivityRows,
          (entry.format7Data as Record<string, any>) || null,
          userId,
          20,
        ).map(r => r.context)
      : [];

    // Extract primitives from activities — prompt layer doesn't know ActivityContext (RH-5)
    const knownContext: KnownContext | undefined = rankedForContext.length > 0
      ? {
          dateRange: (() => {
            const dates = rankedForContext.map(a => a.date).filter(d => d !== 'unknown').sort();
            return dates.length >= 2 ? `${dates[0]} to ${dates[dates.length - 1]}` : undefined;
          })(),
          collaborators: (() => {
            const all = [...new Set(rankedForContext.flatMap(a => a.people))];
            return all.length > 0 ? all.slice(0, 8).join(', ') : undefined;
          })(),
          codeStats: (() => {
            const total = rankedForContext.reduce((sum, a) => {
              const m = a.scope?.match(/\+(\d+)/);
              return sum + (m ? parseInt(m[1]) : 0);
            }, 0);
            return total > 0 ? `${total}+ lines of code` : undefined;
          })(),
          tools: [...new Set(rankedForContext.map(a => a.source))].join(', ') || undefined,
          labels: (() => {
            const all = [...new Set(rankedForContext.flatMap(a => a.labels || []))];
            return all.length > 0 ? all.join(', ') : undefined;
          })(),
        }
      : undefined;

    // Try dynamic LLM-generated questions, fall back to static
    const entryText = [entry.fullContent, entry.description].filter(Boolean).join('\n\n');
    let questions = await this.generateDynamicQuestions(
      detection.primary.archetype,
      detection.primary.reasoning,
      entry.title || 'Untitled',
      entryText,
      detection.signals,
      knownContext,
    );
    const isDynamic = questions !== null;
    if (!questions) {
      questions = transformQuestions(detection.primary.archetype);
    }

    console.log(`${this.logPrefix} analyzeEntry complete`, {
      entryId: entry.id,
      archetype: detection.primary.archetype,
      confidence: detection.primary.confidence,
      questionCount: questions.length,
      dynamicQuestions: isDynamic,
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
      select: { id: true, title: true, description: true, fullContent: true, category: true, activityIds: true, format7Data: true },
    });

    if (!entry) {
      console.warn(`${this.logPrefix} Entry not found for generate: ${journalEntryId}`);
      throw new WizardError('Journal entry not found', 'ENTRY_NOT_FOUND', 404);
    }

    const extractedContext = answersToContext(answers);

    // Build content for prompt — unified builder extracts format7Data (phases, skills, etc.)
    const journalEntryContent = buildLLMInput({
      journalEntry: entry,
      extractedContext,
    });

    // Rank and adapt activities (separate composable step — RH-2)
    // Activities are fetched later for source creation; rank them here for the prompt
    const activityTable = this.isDemoMode ? prisma.demoToolActivity : prisma.toolActivity;
    const allActivityRows = entry.activityIds.length > 0
      ? await (activityTable.findMany as Function)({
          where: { id: { in: entry.activityIds } },
          select: { id: true, source: true, sourceUrl: true, title: true, rawData: true, timestamp: true },
        })
      : [];

    const rankedActivities = allActivityRows.length > 0
      ? rankActivities(
          allActivityRows,
          (entry.format7Data as Record<string, any>) || null,
          userId,
          20,
        ).map(r => r.context)
      : undefined;

    // Generate via LLM with archetype + context + activities as PEER (RH-3)
    const { sections, category } = await this.generateSections(journalEntryContent, framework, archetype, extractedContext, rankedActivities);

    // Build hook
    const hook = extractedContext.realStory?.slice(0, 200)
      || extractedContext.obstacle?.slice(0, 200)
      || this.getDefaultHook(archetype);

    // Evaluate
    const evaluation = evaluateStory(sections, extractedContext);

    // Save to DB directly - we have pre-generated sections from wizard
    // Using prisma directly since createStory requires activities which may not exist
    const story = await prisma.careerStory.create({
      data: {
        userId,
        sourceMode: this.isDemoMode ? 'demo' : 'production',
        title: entry.title || 'Career Story',
        activityIds: entry.activityIds,
        framework,
        sections: sections as unknown as Prisma.InputJsonValue,
        generatedAt: new Date(),
        needsRegeneration: false,
        visibility: 'private',
        isPublished: false,
        archetype: archetype || null,
        journalEntryId: journalEntryId || null,
        category: category || null,
      },
    });

    // Store wizard answers on the story
    await prisma.careerStory.update({
      where: { id: story.id },
      data: { wizardAnswers: answers as any },
    });

    // Populate activity sources from sections evidence
    // In demo mode, activityId FK can't reference DemoToolActivity — set to null
    const canSetFk = !this.isDemoMode;
    const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || [];

    // Reuse allActivityRows fetched above for ranking — no duplicate query
    const activityMap = new Map<string, any>(allActivityRows.map((a: any) => [a.id, a]));

    // Check if LLM evidence IDs actually resolve to real activities
    const allEvidenceIds: string[] = [];
    for (const key of sectionKeys) {
      for (const e of ((sections as any)[key]?.evidence || [])) {
        if (e.activityId) allEvidenceIds.push(e.activityId);
      }
    }
    const resolvedCount = allEvidenceIds.filter((id) => activityMap.has(id)).length;
    const useFakeIds = resolvedCount === 0 && allEvidenceIds.length > 0;

    console.log(`${this.logPrefix} [sourceCreation]`, {
      storyId: story.id.slice(0, 8),
      isDemoMode: this.isDemoMode,
      entryActivityIds: entry.activityIds.length,
      activityRowsFound: allActivityRows.length,
      allEvidenceIds: allEvidenceIds.length,
      resolvedCount,
      useFakeIds,
      canSetFk,
      sectionKeys,
      evidenceSample: sectionKeys.slice(0, 2).map((k) => ({
        key: k,
        ids: ((sections as any)[k]?.evidence || []).slice(0, 3).map((e: any) => e.activityId),
      })),
    });

    const activitySourceData: any[] = [];

    if (useFakeIds && allActivityRows.length > 0) {
      // LLM used placeholder IDs — distribute real activities round-robin
      // Use LLM descriptions as annotations
      let activityIdx = 0;
      for (const sectionKey of sectionKeys) {
        const evidence = (sections as any)[sectionKey]?.evidence || [];
        // Assign ceil(totalActivities / sections) per section, min 1
        const perSection = Math.max(1, Math.ceil(allActivityRows.length / sectionKeys.length));
        const sectionActivities = allActivityRows.slice(activityIdx, activityIdx + perSection);
        activityIdx += perSection;

        // First source: use LLM description as annotation if available
        const llmDescription = evidence[0]?.description || null;

        for (let i = 0; i < sectionActivities.length; i++) {
          const activity = sectionActivities[i];
          activitySourceData.push({
            storyId: story.id,
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
      // LLM IDs resolved or no activities — use standard mapping
      for (const sectionKey of sectionKeys) {
        const evidence = (sections as any)[sectionKey]?.evidence || [];
        for (let i = 0; i < evidence.length; i++) {
          const e = evidence[i];
          if (!e.activityId) continue;
          const activity = activityMap.get(e.activityId);
          if (!activity) continue; // Skip unresolvable
          activitySourceData.push({
            storyId: story.id,
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

    // Safety net: if no activity sources created but we have activityIds, create skeleton sources
    if (activitySourceData.length === 0 && entry.activityIds.length > 0) {
      console.warn(`${this.logPrefix} [sourceCreation] fallback: skeleton sources from activityIds`);
      const uniqueIds = [...new Set(entry.activityIds)];
      const perSection = Math.max(1, Math.ceil(uniqueIds.length / sectionKeys.length));
      let idx = 0;
      for (const sectionKey of sectionKeys) {
        const sectionIds = uniqueIds.slice(idx, idx + perSection);
        idx += perSection;
        for (let i = 0; i < sectionIds.length; i++) {
          activitySourceData.push({
            storyId: story.id,
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

    // Populate wizard_answer sources
    const QUESTION_SECTION_MAP: Record<string, string> = {
      'dig-1': 'situation',
      'dig-2': 'action',
      'dig-3': sectionKeys.includes('obstacles') ? 'obstacles' : sectionKeys.includes('hindrances') ? 'hindrances' : 'situation',
      'impact-1': 'result',
      'impact-2': 'result',
      'growth': sectionKeys.includes('learning') ? 'learning' : sectionKeys.includes('evaluation') ? 'evaluation' : 'result',
    };

    for (const [questionId, answer] of Object.entries(answers)) {
      const combined = [
        ...(Array.isArray((answer as any).selected) ? (answer as any).selected : []),
        (answer as any).freeText || '',
      ].filter(Boolean).join('. ');
      if (!combined) continue;

      activitySourceData.push({
        storyId: story.id,
        sectionKey: QUESTION_SECTION_MAP[questionId] || 'unassigned',
        sourceType: 'wizard_answer',
        activityId: null,
        label: questionId,
        content: combined,
        questionId,
        sortOrder: 0,
      });
    }

    const _sourceDebug = {
      isDemoMode: this.isDemoMode,
      table: this.isDemoMode ? 'DemoToolActivity' : 'ToolActivity',
      entryActivityIds: entry.activityIds.length,
      activityRowsFound: allActivityRows.length,
      allEvidenceIds: allEvidenceIds.length,
      resolvedCount,
      useFakeIds,
      canSetFk,
      activitySources: activitySourceData.filter((s: any) => s.sourceType === 'activity').length,
      wizardSources: activitySourceData.filter((s: any) => s.sourceType === 'wizard_answer').length,
      totalSources: activitySourceData.length,
      sourceSections: [...new Set(activitySourceData.map((s: any) => s.sectionKey))],
      evidenceSample: sectionKeys.slice(0, 2).map((k) => ({
        key: k,
        ids: ((sections as any)[k]?.evidence || []).slice(0, 3).map((e: any) => e.activityId),
      })),
      entryActivityIdSample: entry.activityIds.slice(0, 3),
      activityRowIdSample: allActivityRows.slice(0, 3).map((a: any) => a.id),
    };

    console.log(`${this.logPrefix} [sourceCreation] result`, _sourceDebug);

    if (activitySourceData.length > 0) {
      await prisma.storySource.createMany({ data: activitySourceData });
    } else {
      console.warn(`${this.logPrefix} ⚠️ ZERO sources created for story ${story.id.slice(0, 8)}`);
    }

    const storyId = story.id;

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
      _sourceDebug,
    };
  }

  /**
   * Generate contextual D-I-G questions via LLM.
   * Returns null on any failure (caller falls back to static questions).
   */
  private async generateDynamicQuestions(
    archetype: StoryArchetype,
    archetypeReasoning: string,
    entryTitle: string,
    entryContent: string,
    signals: ArchetypeSignals,
    knownContext?: KnownContext,
  ): Promise<WizardQuestion[] | null> {
    const modelSelector = getModelSelector();
    if (!modelSelector) return null;

    const prefix = ARCHETYPE_PREFIXES[archetype];
    const messages = buildWizardQuestionMessages({
      archetype,
      archetypeReasoning,
      entryTitle,
      entryContent,
      signals,
      questionIdPrefix: prefix,
      knownContext,
    });

    try {
      const result = await modelSelector.executeTask('analyze', messages, 'quick', {
        maxTokens: 1200,
        temperature: 0.4,
      });

      const parsed = parseWizardQuestionsResponse(result.content, prefix);
      if (!parsed) {
        console.warn(`${this.logPrefix} Dynamic question parse failed, falling back to static`);
        return null;
      }

      // Enforce exactly 3 questions (RJ-6)
      const enforced = enforceQuestionCount(parsed, prefix);

      // Convert to WizardQuestion[] and add static checkbox options
      return enforced.map((q) => {
        const wizardQ: WizardQuestion = {
          id: q.id,
          question: q.question,
          phase: q.phase,
          hint: q.hint,
          allowFreeText: true,
        };

        // TODO: Generate context-appropriate options via LLM in v2 instead of static options
        if (q.phase === 'impact' && q.id.includes(QUESTION_PATTERNS.IMPACT_1)) {
          wizardQ.options = [...QUESTION_OPTIONS.IMPACT_TYPES];
        } else if (q.phase === 'dig' && q.id.includes(QUESTION_PATTERNS.DIG_1)) {
          wizardQ.options = [...QUESTION_OPTIONS.DISCOVERY_METHODS];
        }

        return wizardQ;
      });
    } catch (error) {
      console.warn(`${this.logPrefix} Dynamic question generation failed:`, error);
      return null;
    }
  }

  private async generateSections(
    journalEntry: JournalEntryContent,
    framework: FrameworkName,
    archetype: StoryArchetype,
    extractedContext: ExtractedContext,
    activities?: import('./career-stories/activity-context.adapter').ActivityContext[],
  ): Promise<{ sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }>; category?: string }> {
    const modelSelector = getModelSelector();
    if (!modelSelector) {
      return { sections: this.buildFallbackSections(framework, journalEntry) };
    }

    // Use updated buildCareerStoryMessages with archetype + context + activities as PEER (RH-3)
    const messages = buildCareerStoryMessages({
      journalEntry,
      framework: framework as PromptFrameworkName,
      archetype,
      extractedContext,
      activities,
    });

    try {
      const result = await modelSelector.executeTask('generate', messages, 'balanced', {
        maxTokens: 2500,
        temperature: 0.7,
      });

      logTokenUsage(result.usage, journalEntry.title);

      const parsed = parseCareerStoryResponse(result.content);
      if (!parsed) return { sections: this.buildFallbackSections(framework, journalEntry) };

      const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || [];
      const sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }> = {};

      for (const key of sectionKeys) {
        const section = parsed.sections[key];
        sections[key] = {
          summary: section?.summary || `${key} details pending`,
          evidence: section?.evidence || journalEntry.activityIds.map((id) => ({ activityId: id })),
        };
      }

      return { sections, category: parsed.category };
    } catch (error) {
      console.error('Story generation failed:', error);
      return { sections: this.buildFallbackSections(framework, journalEntry) };
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
    return ARCHETYPE_HOOKS[archetype];
  }

  private detectRole(activity: { rawData?: Record<string, unknown> | null } | undefined): string | null {
    if (!activity?.rawData) return null;
    const raw = activity.rawData;
    if (raw.author) return 'authored';
    if (raw.state === 'APPROVED') return 'approved';
    if (raw.reviewers) return 'reviewed';
    if (raw.assignee) return 'assigned';
    if (raw.reporter) return 'reported';
    return 'mentioned';
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createStoryWizardService(isDemoMode: boolean = true): StoryWizardService {
  return new StoryWizardService(isDemoMode);
}
