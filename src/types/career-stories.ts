/**
 * Career Stories Types
 *
 * Frontend types for tool activities, clusters, and STAR narratives.
 * These match the backend API contract from career-stories.controller.ts
 *
 * Type Hierarchy:
 * - ToolActivity: Individual work item from integrated tools
 * - Cluster: Group of related activities
 * - ScoredSTAR: Generated narrative with confidence scores
 *
 * NOTE: Keep in sync with backend types in:
 * - backend/src/services/career-stories/pipeline/types/star.types.ts
 * - backend/src/services/career-stories/pipeline/types/cluster.types.ts
 */

import { TOOL_METADATA } from '../constants/tools';

// =============================================================================
// TOOL TYPES
// =============================================================================

export type ToolType =
  | 'jira'
  | 'github'
  | 'confluence'
  | 'figma'
  | 'slack'
  | 'outlook'
  | 'google'
  | 'google-calendar'
  | 'google-docs'
  | 'google-drive'
  | 'google-meet'
  | 'google-sheets'
  | 'generic';

// =============================================================================
// TOOL ACTIVITIES
// =============================================================================

export interface ToolActivity {
  id: string;
  userId: string;
  source: ToolType;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: string; // ISO date string
  clusterId: string | null;
  crossToolRefs: string[];
  rawData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CLUSTERS
// =============================================================================

export interface ClusterMetrics {
  activityCount: number;
  refCount: number;
  toolTypes: string[];
  dateRange?: {
    earliest: string; // ISO date string
    latest: string;
  };
}

export interface Cluster {
  id: string;
  userId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  activityCount: number;
  activityIds: string[];
  metrics?: ClusterMetrics;
}

export interface ClusterWithActivities extends Cluster {
  activities: ToolActivity[];
}

// =============================================================================
// STAR NARRATIVE
// =============================================================================

export interface STARComponent {
  text: string;
  sources: string[];
  confidence: number;
}

export interface STARValidationResult {
  passed: boolean;
  score: number;
  failedGates: string[];
  warnings: string[];
}

export interface ParticipationSummary {
  initiatorCount: number;
  contributorCount: number;
  mentionedCount: number;
  observerCount: number;
}

export interface STARMetadata {
  dateRange: {
    start: string;
    end: string;
  };
  toolsCovered: ToolType[];
  totalActivities: number;
}

export interface ScoredSTAR {
  clusterId: string;
  situation: STARComponent;
  task: STARComponent;
  action: STARComponent;
  result: STARComponent;
  overallConfidence: number;
  participationSummary: ParticipationSummary;
  suggestedEdits: string[];
  metadata: STARMetadata;
  validation: STARValidationResult;
  userEdits?: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  };
}

export type ParticipationLevel = 'initiator' | 'contributor' | 'mentioned' | 'observer';

export interface ParticipationResult {
  activityId: string;
  level: ParticipationLevel;
  signals: string[];
}

export type PolishStatus = 'success' | 'skipped' | 'failed';

export interface GenerateSTARResult {
  star: ScoredSTAR | null;
  polishStatus?: PolishStatus;
  processingTimeMs: number;
  // When star is null (validation failed)
  reason?: 'VALIDATION_GATES_FAILED';
  failedGates?: string[];
  participations?: ParticipationResult[];
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface GenerateClustersRequest {
  startDate?: string;
  endDate?: string;
  minClusterSize?: number;
}

export interface GenerateClustersResponse {
  clustersCreated: number;
  clusters: Array<{
    cluster: Cluster;
    activityIds: string[];
    activityCount: number;
  }>;
}

export type NarrativeFramework = 'STAR' | 'STARL' | 'CAR' | 'PAR' | 'SAR' | 'SOAR' | 'SHARE' | 'CARL';

export type WritingStyle = 'professional' | 'casual' | 'technical' | 'storytelling';

export interface GenerateSTARRequest {
  personaId?: string;
  options?: {
    debug?: boolean;
    polish?: boolean;
    framework?: NarrativeFramework;
  };
}

export interface MergeClustersRequest {
  targetClusterId: string;
  sourceClusterIds: string[];
}

export interface CareerStoriesStats {
  activities: {
    total: number;
    unclustered: number;
    bySource: Record<string, number>;
  };
  clusters: number;
  stories: number;
}

// =============================================================================
// UI DISPLAY TYPES
// =============================================================================

/** Cluster display with computed UI properties */
export interface ClusterDisplay extends Cluster {
  /** Status indicator for whether a STAR has been generated */
  hasSTAR: boolean;
  /** Generated STAR if available */
  star?: ScoredSTAR;
  /** Confidence level for UI display (high/medium/low) */
  confidenceLevel: 'high' | 'medium' | 'low';
  /** Tool icons to display */
  toolIcons: ToolType[];
  /** Formatted date range for display */
  dateRangeDisplay: string;
}

/** Tool icon metadata for display — derived from TOOL_METADATA (single source of truth) */
const toolEntry = (key: ToolType) => ({ name: TOOL_METADATA[key].name, color: TOOL_METADATA[key].color });

export const TOOL_ICONS: Record<ToolType, { name: string; color: string }> = {
  jira: toolEntry('jira'),
  github: toolEntry('github'),
  confluence: toolEntry('confluence'),
  figma: toolEntry('figma'),
  slack: toolEntry('slack'),
  outlook: toolEntry('outlook'),
  google: toolEntry('google'),
  'google-calendar': toolEntry('google-calendar'),
  'google-docs': toolEntry('google-docs'),
  'google-drive': toolEntry('google-drive'),
  'google-meet': toolEntry('google-meet'),
  'google-sheets': toolEntry('google-sheets'),
  generic: toolEntry('generic'),
};

// =============================================================================
// CAREER STORIES
// =============================================================================

export type StoryVisibility = 'private' | 'workspace' | 'network';

export type BragDocCategory =
  | 'projects-impact'
  | 'leadership'
  | 'growth'
  | 'external';

export type StoryRole = 'led' | 'contributed' | 'participated';

export interface CareerStorySection {
  summary: string;
  evidence?: Array<{ activityId: string; description?: string }>;
}

export interface CareerStory {
  id: string;
  userId: string;
  sourceMode: 'demo' | 'production';
  title: string;
  framework: NarrativeFramework;
  sections: Record<string, CareerStorySection>;
  activityIds: string[];
  needsRegeneration: boolean;
  generatedAt: string;
  isPublished: boolean;
  visibility: StoryVisibility;
  publishedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  archetype?: StoryArchetype | null;
  category?: BragDocCategory | null;
  role?: StoryRole | null;
  journalEntryId?: string | null;
  sources?: StorySource[];
  sourceCoverage?: SourceCoverage;
  lastGenerationPrompt?: string | null;
  wizardAnswers?: Record<string, WizardAnswer> | null;
  groupingMethod?: 'time' | 'cluster' | 'manual' | 'ai' | null;
}

export interface CareerStoriesListResult {
  stories: CareerStory[];
  total: number;
}

export interface CreateCareerStoryRequest {
  clusterId: string;
  title: string;
  framework: NarrativeFramework;
  sections: Record<string, CareerStorySection>;
  activityIds: string[];
}

export interface UpdateCareerStoryRequest {
  title?: string;
  sections?: Record<string, CareerStorySection>;
}

// =============================================================================
// STORY WIZARD (Promotion Flow)
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

export interface WizardAnalyzeResponse {
  archetype: ArchetypeResult;
  questions: WizardQuestion[];
  journalEntry: { id: string; title: string };
}

export interface WizardAnswer {
  selected: string[];
  freeText?: string;
}

export interface WizardGenerateRequest {
  journalEntryId: string;
  answers: Record<string, WizardAnswer>;
  archetype: StoryArchetype;
  framework: NarrativeFramework;
}

export interface StoryEvaluation {
  score: number;
  suggestions: string[];
  coachComment: string;
}

export interface WizardGenerateResponse {
  story: {
    id: string;
    title: string;
    hook: string;
    framework: NarrativeFramework;
    archetype: StoryArchetype;
    sections: Record<string, { summary: string; evidence: Array<{ activityId?: string; description?: string }> }>;
  };
  evaluation: StoryEvaluation;
}

/** Metadata passed to Story Wizard for loading state facts */
export interface JournalEntryMeta {
  title: string;
  dateRange?: string;
  activityCount?: number;
  tools?: string[];
  topics?: string[];
  impactHighlights?: string[];
  skills?: string[];
}

// =============================================================================
// STORY DERIVATIONS
// =============================================================================

export type DerivationType = 'interview' | 'linkedin' | 'resume' | 'one-on-one' | 'self-assessment' | 'team-share';

export interface DeriveStoryRequest {
  derivation: DerivationType;
  tone?: WritingStyle;
  customPrompt?: string;
}

export interface DeriveStoryResponse {
  text: string;
  charCount: number;
  wordCount: number;
  speakingTimeSec?: number;
  metadata: {
    derivation: DerivationType;
    framework: NarrativeFramework;
    archetype: string | null;
    model: string;
    processingTimeMs: number;
  };
}

// =============================================================================
// STORY SOURCES
// =============================================================================

export interface StorySource {
  id: string;
  storyId: string;
  sectionKey: string;
  sourceType: 'activity' | 'user_note' | 'wizard_answer';
  activityId: string | null;
  label: string;
  content: string | null;
  url: string | null;
  annotation: string | null;
  toolType: string | null;
  role: string | null;
  questionId: string | null;
  sortOrder: number;
  excludedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCoverage {
  total: number;
  sourced: number;
  gaps: string[];
  vagueMetrics: Array<{
    sectionKey: string;
    match: string;
    suggestion: string;
  }>;
}
