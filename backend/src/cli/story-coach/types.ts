/**
 * Story Coach CLI Types
 *
 * File-based handoff types for pipeline testing.
 */

// =============================================================================
// ARCHETYPE TYPES
// =============================================================================

export type StoryArchetype =
  | 'firefighter'
  | 'architect'
  | 'diplomat'
  | 'multiplier'
  | 'detective'
  | 'pioneer'
  | 'turnaround'
  | 'preventer';

export interface ArchetypeSignals {
  hasCrisis: boolean;
  hasArchitecture: boolean;
  hasStakeholders: boolean;
  hasMultiplication: boolean;
  hasMystery: boolean;
  hasPioneering: boolean;
  hasTurnaround: boolean;
  hasPrevention: boolean;
}

export interface ArchetypeDetection {
  primary: {
    archetype: StoryArchetype;
    confidence: number;
    reasoning: string;
  };
  alternatives: Array<{
    archetype: StoryArchetype;
    confidence: number;
    reasoning: string;
  }>;
  signals: ArchetypeSignals;
}

// =============================================================================
// JOURNAL ENTRY (INPUT)
// =============================================================================

export interface JournalEntryFile {
  id: string;
  title: string;
  description: string | null;
  fullContent: string | null;
  category: string | null;
  dominantRole: string | null;
  phases?: Array<{
    name: string;
    summary: string;
    activityIds: string[];
  }>;
  impactHighlights?: string[];
  skills?: string[];
  activityIds?: string[];
}

// =============================================================================
// STORY COACH SESSION
// =============================================================================

export interface CoachQuestion {
  id: string;
  phase: 'dig' | 'impact' | 'growth';
  question: string;
  hint?: string;
  followUp?: string;
}

export interface CoachExchange {
  questionId: string;
  question: string;
  answer: string;
  phase: 'dig' | 'impact' | 'growth';
  timestamp: string;
}

export interface ExtractedContext {
  realStory?: string;
  obstacle?: string;
  keyDecision?: string;
  namedPeople?: string[];
  counterfactual?: string;
  metric?: string;
  evidence?: string;
  impactType?: 'performance' | 'cost' | 'capability' | 'risk' | 'experience';
  learning?: string;
}

export interface CoachSessionFile {
  id: string;
  journalEntryId: string;
  archetype: StoryArchetype;
  exchanges: CoachExchange[];
  extractedContext: ExtractedContext;
  currentPhase: 'dig' | 'impact' | 'growth' | 'complete';
  questionsAsked: number;
  status: 'in_progress' | 'completed' | 'skipped';
  startedAt: string;
  completedAt?: string;
}

// =============================================================================
// GENERATED STORY
// =============================================================================

export type FrameworkName = 'STAR' | 'STARL' | 'CAR' | 'PAR' | 'SAR' | 'SOAR' | 'SHARE' | 'CARL';

export interface StorySection {
  summary: string;
  evidence: Array<{
    activityId?: string;
    description?: string;
  }>;
}

export interface GeneratedStoryFile {
  id: string;
  journalEntryId: string;
  sessionId?: string;
  title: string;
  hook: string;
  framework: FrameworkName;
  archetype?: StoryArchetype;
  sections: Record<string, StorySection>;
  reasoning: string;
  generatedAt: string;
  // For comparison
  withCoaching: boolean;
}

// =============================================================================
// EVALUATION
// =============================================================================

export interface EvaluationBreakdown {
  specificity: number;      // Names, numbers, dates
  compellingHook: number;   // Opening grabs attention
  evidenceQuality: number;  // Claims backed by proof
  archetypeFit: number;     // Follows archetype arc
  actionableImpact: number; // Clear outcomes
}

export interface StoryEvaluationFile {
  storyId: string;
  score: number;
  breakdown: EvaluationBreakdown;
  suggestions: string[];
  coachComment: string;
  evaluatedAt: string;
}

// =============================================================================
// COMPARISON
// =============================================================================

export interface ComparisonResultFile {
  journalEntryId: string;
  basicStory: {
    story: GeneratedStoryFile;
    evaluation: StoryEvaluationFile;
  };
  enhancedStory: {
    story: GeneratedStoryFile;
    evaluation: StoryEvaluationFile;
    session: CoachSessionFile;
  };
  improvement: {
    scoreDelta: number;
    percentImprovement: number;
    keyDifferences: string[];
  };
  comparedAt: string;
}
