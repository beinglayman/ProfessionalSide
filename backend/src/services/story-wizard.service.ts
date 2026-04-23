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
  buildDateLookup,
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

// Archetype now always comes from format7Data (populated at draft generation
// by generateNarrativeWithLLM). Legacy drafts without a stored archetype
// default to 'firefighter' — see the fallback in analyzeEntry(). The
// archetype-detector.ts module remains available to the standalone CLI tool
// at cli/story-coach but is no longer called from the wizard path.
import { ArchetypeDetection } from '../cli/story-coach/types';

// Question intents replace the 48-variant archetype-specific question bank.
import { QUESTION_INTENTS } from './ai/prompts/question-intents';
import type { ChecklistRowId } from '../types/journal.types';

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
  /** Checklist row this question covers (Ship 4+). */
  checklistRow?: ChecklistRowId;
  /** "Why we need this" line rendered above the question (Ship 4+). */
  whyWeNeed?: string;
  /** "How your answer helps" line rendered above the question (Ship 4+). */
  howItHelps?: string;
}

export interface ArchetypeResult {
  detected: StoryArchetype;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ archetype: StoryArchetype; confidence: number }>;
}

/** Story Checklist row classification, surfaced to the wizard's ChecklistStep. */
export interface AnalyzeChecklistRow {
  row: 'situation' | 'role' | 'action' | 'result' | 'stakes' | 'hardest' | 'learning';
  state: 'derived' | 'ask';
  summary?: string;
  evidenceActivityIds?: string[];
}

export interface AnalyzeResult {
  archetype: ArchetypeResult;
  questions: WizardQuestion[];
  journalEntry: { id: string; title: string };
  /**
   * Story Checklist state per row. Read from format7Data (populated at draft
   * generation time). Always 6 rows for STAR; the frontend appends a 7th
   * 'learning' row client-side when the user selects STARL.
   */
  checklist: AnalyzeChecklistRow[];
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
 * Build the wizard question list from a checklist. Every 'ask' row (except
 * 'action', which is universally derived and doesn't spawn a question in
 * the default flow) maps to its canonical intent seed in question-intents.ts.
 *
 * Questions come back in canonical checklist order. Activity-derived chips
 * and per-draft rephrasing are a Ship 4b concern — for now we use the
 * intent's generic question and fallback chips.
 */
function buildQuestionsFromChecklist(
  checklist: AnalyzeChecklistRow[],
): WizardQuestion[] {
  return checklist
    .filter((row) => row.state === 'ask' && row.row !== 'action')
    .map((row): WizardQuestion => {
      const intent = QUESTION_INTENTS[row.row as ChecklistRowId];
      if (!intent) {
        // Safety net: the row id doesn't match a known intent. Skip silently.
        return null as unknown as WizardQuestion;
      }
      return {
        id: `${intent.id}-q`,
        question: intent.genericQuestion,
        phase: intent.phase,
        hint: intent.hint,
        allowFreeText: true,
        checklistRow: intent.id,
        whyWeNeed: intent.whyWeNeed,
        howItHelps: intent.howItHelps,
        options: intent.fallbackChips.length > 0 ? [...intent.fallbackChips] : undefined,
      };
    })
    .filter((q): q is WizardQuestion => q !== null);
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

  // Fallback: extract names and metrics from ALL answer text if specific paths missed
  if (!context.namedPeople || !context.metric) {
    const allText = Object.values(answers)
      .map((a) => combineAnswerParts(a))
      .filter(Boolean)
      .join('. ');

    if (allText) {
      if (!context.namedPeople) {
        const extracted = extractNamedPeople(allText);
        if (extracted && extracted.length > 0) {
          context.namedPeople = extracted;
        }
      }
      if (!context.metric) {
        const metricPattern = /\d+%|\$[\d,]+|\d+\s*(hours?|days?|weeks?|months?|teams?|users?|engineers?)/i;
        const match = allText.match(metricPattern);
        if (match) {
          context.metric = match[0];
        }
      }
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

  /** Fetch activity rows by IDs from the correct table (demo vs production). */
  private async fetchActivityRows(
    activityIds: string[],
    extraSelect?: Record<string, boolean>,
  ): Promise<any[]> {
    if (activityIds.length === 0) return [];
    const table = this.isDemoMode ? prisma.demoToolActivity : prisma.toolActivity;
    return (table.findMany as Function)({
      where: { id: { in: activityIds } },
      select: { id: true, source: true, title: true, rawData: true, timestamp: true, ...extraSelect },
    });
  }

  /** Fetch + rank activities, return contexts. Returns [] if no activities. */
  private async fetchRankedContexts(
    activityIds: string[],
    format7Data: Record<string, any> | null,
    selfIdentifier: string,
  ): Promise<import('./career-stories/activity-context.adapter').ActivityContext[]> {
    const rows = await this.fetchActivityRows(activityIds);
    if (rows.length === 0) return [];
    return rankActivities(rows, format7Data, selfIdentifier, 20).map(r => r.context);
  }

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

    // Reuse archetype from format7Data if draft story already detected one.
    // New drafts also carry archetypeAlternatives and archetypeConfidence from
    // the same LLM pass (see JournalService.generateNarrativeWithLLM).
    const format7 = (entry.format7Data as Record<string, unknown>) || {};
    const VALID_ARCHETYPES: Set<string> = new Set([
      'firefighter', 'architect', 'diplomat', 'multiplier',
      'detective', 'pioneer', 'turnaround', 'preventer',
    ]);
    let detection: ArchetypeDetection;
    if (format7.archetype && typeof format7.archetype === 'string' && VALID_ARCHETYPES.has(format7.archetype)) {
      console.log(`${this.logPrefix} Reusing stored archetype: ${format7.archetype}`);
      const storedAlternatives = Array.isArray(format7.archetypeAlternatives)
        ? (format7.archetypeAlternatives as unknown[])
            .filter((a): a is string => typeof a === 'string' && VALID_ARCHETYPES.has(a))
            .slice(0, 2)
            .map((a) => ({ archetype: a as any, confidence: 0.5, reasoning: 'From draft story generation' }))
        : [];
      const storedConfidence = typeof format7.archetypeConfidence === 'number'
        ? Math.min(1, Math.max(0, format7.archetypeConfidence))
        : 0.8;
      detection = {
        primary: { archetype: format7.archetype as any, confidence: storedConfidence, reasoning: 'Reused from draft story generation' },
        alternatives: storedAlternatives,
        signals: { hasCrisis: false, hasArchitecture: false, hasStakeholders: false, hasMultiplication: false, hasMystery: false, hasPioneering: false, hasTurnaround: false, hasPrevention: false },
      };
    } else {
      // Legacy drafts (pre-Ship 1) don't carry archetype in format7Data.
      // Fall back to 'firefighter' as the default — the user can change it
      // via the Questions-header archetype chip. Ship 4 intentionally does
      // NOT call the LLM detector here because questions now come from the
      // checklist, not from archetype-specific templates.
      console.log(`${this.logPrefix} No stored archetype on legacy draft; defaulting to firefighter`);
      detection = {
        primary: { archetype: 'firefighter', confidence: 0.3, reasoning: 'Default fallback (legacy draft)' },
        alternatives: [],
        signals: { hasCrisis: false, hasArchitecture: false, hasStakeholders: false, hasMultiplication: false, hasMystery: false, hasPioneering: false, hasTurnaround: false, hasPrevention: false },
      };
    }

    // Read checklistState from format7Data (populated by generateNarrativeWithLLM
    // at draft time). If missing (legacy draft pre-Ship 3), every row defaults
    // to 'ask' — the wizard still works, just with more questions.
    const checklist = this.normalizeChecklistFromFormat7(format7);

    // Build questions from the checklist's 'ask' rows via the intent seeds.
    // Replaces the old archetype-driven 48-variant bank + LLM dynamic generation.
    const questions = buildQuestionsFromChecklist(checklist);

    console.log(`${this.logPrefix} analyzeEntry complete`, {
      entryId: entry.id,
      archetype: detection.primary.archetype,
      confidence: detection.primary.confidence,
      questionCount: questions.length,
      askRowIds: checklist.filter((r) => r.state === 'ask').map((r) => r.row),
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
      checklist,
    };
  }

  /**
   * Extract a 6-row checklist from format7Data. Returns all rows in canonical
   * order; unknown/missing entries default to { state: 'ask' } so the caller
   * can treat legacy drafts uniformly.
   */
  private normalizeChecklistFromFormat7(format7: Record<string, unknown>): AnalyzeChecklistRow[] {
    const BASE_ROWS: Array<AnalyzeChecklistRow['row']> = [
      'situation', 'role', 'action', 'result', 'stakes', 'hardest',
    ];
    const raw = format7.checklistState;
    const byRow = new Map<AnalyzeChecklistRow['row'], AnalyzeChecklistRow>();

    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const row = (entry as { row?: unknown }).row;
        const state = (entry as { state?: unknown }).state;
        if (typeof row !== 'string' || !(BASE_ROWS as string[]).includes(row)) continue;
        if (state !== 'derived' && state !== 'ask') continue;

        const normalized: AnalyzeChecklistRow = {
          row: row as AnalyzeChecklistRow['row'],
          state,
        };
        const summary = (entry as { summary?: unknown }).summary;
        if (typeof summary === 'string' && summary.trim().length > 0) {
          normalized.summary = summary.trim();
        }
        const evidence = (entry as { evidenceActivityIds?: unknown }).evidenceActivityIds;
        if (Array.isArray(evidence)) {
          const ids = evidence.filter((id): id is string => typeof id === 'string');
          if (ids.length > 0) normalized.evidenceActivityIds = ids;
        }
        byRow.set(row as AnalyzeChecklistRow['row'], normalized);
      }
    }

    // Fallback for legacy drafts (pre-Ship 3) that don't carry checklistState.
    // Rather than default every row to 'ask' (which makes the wizard ask 6
    // questions for a draft where Activities clearly cover most rows), infer
    // 'derived' from the other format7Data fields that *are* present:
    // phases → situation, dominantRole → role, primary activityEdges → action,
    // impactHighlights → result. 'stakes' and 'hardest' are user-only per
    // design and stay 'ask'.
    if (byRow.size === 0) {
      for (const inferred of this.inferChecklistFromFormat7(format7)) {
        byRow.set(inferred.row, inferred);
      }
    }

    return BASE_ROWS.map((row) => byRow.get(row) ?? { row, state: 'ask' });
  }

  /**
   * Heuristic backfill for drafts missing checklistState. Mirrors the
   * per-row derivability rules the draft-generation prompt uses, but works
   * without an extra LLM call — consults the format7Data fields we already
   * populated at draft-generation time.
   */
  private inferChecklistFromFormat7(format7: Record<string, unknown>): AnalyzeChecklistRow[] {
    const out: AnalyzeChecklistRow[] = [];

    // situation: phases were generated, so we know when/what happened
    const phases = format7.phases;
    if (Array.isArray(phases) && phases.length > 0) {
      out.push({
        row: 'situation',
        state: 'derived',
        summary: 'Context and timeline captured from your activities',
      });
    }

    // role: dominantRole is set and not the ambiguous 'Participated' default
    const dominantRole = format7.dominantRole;
    if (typeof dominantRole === 'string' && (dominantRole === 'Led' || dominantRole === 'Contributed')) {
      out.push({
        row: 'role',
        state: 'derived',
        summary: `Role: ${dominantRole}`,
      });
    }

    // action: at least one activity classified as 'primary' in the edges
    const edges = format7.activityEdges;
    if (Array.isArray(edges)) {
      const primaryIds: string[] = [];
      for (const edge of edges) {
        if (edge && typeof edge === 'object'
            && (edge as { type?: unknown }).type === 'primary'
            && typeof (edge as { activityId?: unknown }).activityId === 'string') {
          primaryIds.push((edge as { activityId: string }).activityId);
        }
      }
      if (primaryIds.length > 0) {
        out.push({
          row: 'action',
          state: 'derived',
          summary: `${primaryIds.length} primary action${primaryIds.length === 1 ? '' : 's'} across your activities`,
          evidenceActivityIds: primaryIds,
        });
      }
    }

    // result: at least one concrete impact highlight
    const impacts = format7.impactHighlights;
    if (Array.isArray(impacts)) {
      const first = impacts.find((i): i is string => typeof i === 'string' && i.trim().length > 0);
      if (first) {
        out.push({ row: 'result', state: 'derived', summary: first });
      }
    }

    // stakes and hardest are user-only per design — always 'ask'.
    return out;
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
      journalEntry: { ...entry, format7Data: entry.format7Data as Record<string, any> | null },
      extractedContext,
    });

    // Fetch activities for ranking AND source creation (needs sourceUrl for sources)
    const allActivityRows = await this.fetchActivityRows(entry.activityIds, { sourceUrl: true });

    const dateByActivityId = buildDateLookup(allActivityRows);

    // Rank and adapt activities (separate composable step — RH-2)
    const rankedActivities = allActivityRows.length > 0
      ? rankActivities(
          allActivityRows,
          (entry.format7Data as Record<string, any>) || null,
          userId,
          20,
        ).map(r => r.context)
      : undefined;

    // Generate via LLM with archetype + context + activities as PEER (RH-3)
    const { sections, category } = await this.generateSections(journalEntryContent, framework, archetype, extractedContext, rankedActivities, dateByActivityId);

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
        originalSections: sections as unknown as Prisma.InputJsonValue,
        generatedAt: new Date(),
        needsRegeneration: false,
        visibility: 'private',
        isPublished: false,
        archetype: archetype || null,
        journalEntryId: journalEntryId || null,
        category: category || null,
        wizardAnswers: answers as any,
      },
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

  private async generateSections(
    journalEntry: JournalEntryContent,
    framework: FrameworkName,
    archetype: StoryArchetype,
    extractedContext: ExtractedContext,
    activities?: import('./career-stories/activity-context.adapter').ActivityContext[],
    dateByActivityId?: Map<string, string>,
  ): Promise<{ sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string; date?: string }> }>; category?: string }> {
    const modelSelector = getModelSelector();
    if (!modelSelector) {
      return { sections: this.buildFallbackSections(framework, journalEntry, dateByActivityId) };
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

      logTokenUsage(undefined, journalEntry.title);

      const parsed = parseCareerStoryResponse(result.content);
      if (!parsed) return { sections: this.buildFallbackSections(framework, journalEntry, dateByActivityId) };

      const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || [];
      const sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string; date?: string }> }> = {};

      for (const key of sectionKeys) {
        const section = parsed.sections[key];
        sections[key] = {
          summary: section?.summary || `${key} details pending`,
          evidence: (section?.evidence || journalEntry.activityIds.map((id) => ({ activityId: id }))).map((e) => ({
            ...e,
            date: e.activityId ? dateByActivityId?.get(e.activityId) : undefined,
          })),
        };
      }

      return { sections, category: parsed.category };
    } catch (error) {
      console.error('Story generation failed:', error);
      return { sections: this.buildFallbackSections(framework, journalEntry, dateByActivityId) };
    }
  }

  private buildFallbackSections(
    framework: FrameworkName,
    journalEntry: JournalEntryContent,
    dateByActivityId?: Map<string, string>,
  ): Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string; date?: string }> }> {
    const sectionKeys = FRAMEWORK_SECTIONS[framework as PromptFrameworkName] || ['situation', 'task', 'action', 'result'];
    const sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string; date?: string }> }> = {};

    for (const key of sectionKeys) {
      sections[key] = {
        summary: `${key}: ${journalEntry.description || journalEntry.title || 'Details pending'}`,
        evidence: journalEntry.activityIds.map((id) => ({
          activityId: id,
          date: dateByActivityId?.get(id),
        })),
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
