/**
 * Career Stories Pipeline - Shared Types
 *
 * Both RefExtractor and ClusterExtractor are pipeline processors.
 * They share common lifecycle, diagnostics, and result structures.
 */

// =============================================================================
// PIPELINE PROCESSOR INTERFACE
// =============================================================================

/**
 * Base interface for all pipeline processors
 */
export interface PipelineProcessor<TInput, TOutput, TOptions = object> {
  /** Unique processor name */
  readonly name: string;

  /** Processor version */
  readonly version: string;

  /**
   * Process input and return result with diagnostics
   */
  process(input: TInput, options?: TOptions): ProcessorResult<TOutput>;

  /**
   * Validate processor is correctly configured
   * @throws if configuration is invalid
   */
  validate(): void;
}

/**
 * Standard result structure for all processors
 */
export interface ProcessorResult<T> {
  /** The primary output */
  data: T;

  /** Processing diagnostics */
  diagnostics: ProcessorDiagnostics;

  /** Any warnings (non-fatal issues) */
  warnings: ProcessorWarning[];

  /** Any errors (may have partial results) */
  errors: ProcessorError[];
}

export interface ProcessorDiagnostics {
  /** Processor that generated this result */
  processor: string;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Input size metrics */
  inputMetrics: Record<string, number>;

  /** Output size metrics */
  outputMetrics: Record<string, number>;

  /** Debug info (when debug mode enabled) */
  debug?: Record<string, unknown>;
}

export interface ProcessorWarning {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ProcessorError {
  code: string;
  message: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

// =============================================================================
// WARNING AND ERROR CODES
// =============================================================================

/**
 * Standard warning codes used by pipeline processors.
 * Use these constants instead of magic strings.
 */
export const WarningCodes = {
  /** Input text was truncated due to size limits */
  TEXT_TRUNCATED: 'TEXT_TRUNCATED',
  /** No patterns matched the specified filters */
  NO_PATTERNS: 'NO_PATTERNS',
  /** Activities filtered out by date range */
  DATE_FILTERED: 'DATE_FILTERED',
  /** Some activities have no refs and cannot cluster */
  ACTIVITIES_WITHOUT_REFS: 'ACTIVITIES_WITHOUT_REFS',
  /** Cluster failed validation gates for STAR generation */
  VALIDATION_GATES_FAILED: 'VALIDATION_GATES_FAILED',
  /** Some activities in cluster could not be found */
  ACTIVITIES_NOT_FOUND: 'ACTIVITIES_NOT_FOUND',
} as const;

/**
 * Standard error codes used by pipeline processors.
 */
export const ErrorCodes = {
  /** A pattern threw an error during execution */
  PATTERN_ERROR: 'PATTERN_ERROR',
  /** Pattern validation failed */
  PATTERN_VALIDATION_FAILED: 'PATTERN_VALIDATION_FAILED',
} as const;

export type WarningCode = (typeof WarningCodes)[keyof typeof WarningCodes];
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// REF EXTRACTOR TYPES
// =============================================================================

/**
 * Pattern definition with metadata, examples, and test cases
 */
export interface RefPattern {
  /** Unique identifier (e.g., 'jira-ticket-v2') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Version number */
  version: number;

  /** What this pattern extracts */
  description: string;

  /** The regex (must have global flag) */
  regex: RegExp;

  /** Tool type */
  toolType: ToolType;

  /** Transform match to normalized ref string */
  normalizeMatch: (match: RegExpMatchArray) => string;

  /** Confidence level */
  confidence: ConfidenceLevel;

  /** Examples that SHOULD match */
  examples: PatternExample[];

  /** Examples that should NOT match */
  negativeExamples: string[];

  /** Pattern this supersedes (for versioning) */
  supersedes?: string;
}

export type ToolType =
  | 'jira'
  | 'github'
  | 'confluence'
  | 'figma'
  | 'slack'
  | 'outlook'
  | 'google'
  | 'generic';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface PatternExample {
  input: string;
  expectedRef: string;
  source?: string;
}

/**
 * Single pattern match with full context
 */
export interface PatternMatch {
  /** Extracted reference */
  ref: string;

  /** Pattern that matched */
  patternId: string;

  /** Confidence level */
  confidence: ConfidenceLevel;

  /** Location in source text */
  location: {
    start: number;
    end: number;
    context: string;
  };

  /** Raw matched text */
  rawMatch: string;
}

/**
 * RefExtractor input
 */
export interface RefExtractionInput {
  texts: (string | null | undefined)[];
  sourceUrl?: string | null;
}

/**
 * RefExtractor output
 */
export interface RefExtractionOutput {
  /** Deduplicated refs */
  refs: string[];

  /** All matches with details */
  matches: PatternMatch[];

  /** Per-pattern analysis */
  patternAnalysis: PatternAnalysis[];
}

export interface PatternAnalysis {
  patternId: string;
  matchCount: number;
  noMatchReason?: 'no-input' | 'regex-no-match';
  nearMisses?: string[];
}

/**
 * RefExtractor options
 */
export interface RefExtractionOptions {
  /** Enable debug mode */
  debug?: boolean;

  /** Filter to specific patterns */
  patternIds?: string[];

  /** Filter to specific tools */
  toolTypes?: ToolType[];

  /** Minimum confidence */
  minConfidence?: ConfidenceLevel;

  /** Include sourceUrl in extraction */
  includeSourceUrl?: boolean;
}

// =============================================================================
// CLUSTER EXTRACTOR TYPES
// =============================================================================

/**
 * Activity for clustering
 */
export interface ClusterableActivity {
  id: string;
  refs: string[];
  timestamp?: Date;
  source?: string;
}

/**
 * ClusterExtractor input
 */
export interface ClusterExtractionInput {
  activities: ClusterableActivity[];
}

/**
 * A single cluster of related activities
 */
export interface Cluster {
  /** Unique cluster ID */
  id: string;

  /** Activity IDs in this cluster */
  activityIds: string[];

  /** Shared refs that caused clustering */
  sharedRefs: string[];

  /** Cluster metrics */
  metrics: {
    activityCount: number;
    refCount: number;
    toolTypes: string[];
    dateRange?: {
      earliest: Date;
      latest: Date;
    };
  };
}

/**
 * ClusterExtractor output
 */
export interface ClusterExtractionOutput {
  /** Clusters found */
  clusters: Cluster[];

  /** Activities that didn't cluster */
  unclustered: string[];

  /** Clustering metrics */
  metrics: {
    totalActivities: number;
    clusteredActivities: number;
    unclusteredActivities: number;
    clusterCount: number;
    avgClusterSize: number;
  };
}

/**
 * ClusterExtractor options
 */
export interface ClusterExtractionOptions {
  /** Minimum activities to form a cluster */
  minClusterSize?: number;

  /** Enable debug mode */
  debug?: boolean;

  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// =============================================================================
// CAREER PERSONA (ICP - Identity Resolution)
// =============================================================================

/**
 * CareerPersona - User's identity across all connected tools.
 *
 * Provided during onboarding. Used by ParticipationDetector to determine
 * if the user was initiator/contributor/observer for each activity.
 *
 * Why user-provided? Avoids months of identity federation work.
 * OAuth flows return most of these IDs automatically during connection.
 */
export interface CareerPersona {
  /** Display name for generated STARs */
  displayName: string;

  /** Email addresses (for matching across tools) */
  emails: string[];

  /** Tool-specific identifiers */
  identities: {
    jira?: {
      accountId?: string;
      displayName?: string;
      emailAddress?: string;
    };
    github?: {
      login: string;
      id?: number;
    };
    confluence?: {
      accountId?: string;
      publicName?: string;
    };
    slack?: {
      userId: string;
      displayName?: string;
    };
    google?: {
      email: string;
      calendarId?: string;
    };
    figma?: {
      userId?: string;
      email?: string;
    };
    outlook?: {
      email: string;
      userId?: string;
    };
  };
}

// =============================================================================
// STAR GENERATION TYPES
// =============================================================================

/**
 * Participation level in an activity.
 * Determines how prominently to feature work in STAR narratives.
 */
export type ParticipationLevel = 'initiator' | 'contributor' | 'mentioned' | 'observer';

/**
 * Result of participation detection for a single activity.
 */
export interface ParticipationResult {
  activityId: string;
  level: ParticipationLevel;
  /** Evidence for classification (e.g., 'jira-assignee', 'github-reviewer') */
  signals: string[];
}

/**
 * Activity with full data (not just ID) for STAR generation.
 */
export interface HydratedActivity {
  id: string;
  source: ToolType;
  title: string;
  description?: string | null;
  timestamp: Date;
  sourceUrl?: string | null;
  rawData?: Record<string, unknown> | null;
  /** Extracted refs for this activity */
  refs: string[];
}

/**
 * Cluster enriched with full activity data.
 */
export interface HydratedCluster extends Cluster {
  activities: HydratedActivity[];
}

/**
 * A single STAR component with provenance.
 */
export interface STARComponent {
  /** Extracted/generated text */
  text: string;
  /** Activity IDs that contributed to this component */
  sources: string[];
  /** Confidence in extraction quality (0-1) */
  confidence: number;
}

/**
 * Draft STAR narrative generated from a cluster.
 */
export interface DraftSTAR {
  clusterId: string;
  situation: STARComponent;
  task: STARComponent;
  action: STARComponent;
  result: STARComponent;

  /** Overall confidence (min of component confidences) */
  overallConfidence: number;

  /** Participation breakdown */
  participationSummary: {
    initiatorCount: number;
    contributorCount: number;
    mentionedCount: number;
    observerCount: number;
  };

  /** Suggested improvements */
  suggestedEdits: string[];

  /** Metadata */
  metadata: {
    dateRange: { start: Date; end: Date };
    toolsCovered: ToolType[];
    totalActivities: number;
  };
}

/**
 * Validation result for a STAR.
 */
export interface STARValidationResult {
  passed: boolean;
  score: number;
  failedGates: string[];
  warnings: string[];
}

/**
 * Final scored STAR ready for display/editing.
 */
export interface ScoredSTAR extends DraftSTAR {
  validation: STARValidationResult;
  /** User edits (if any) */
  userEdits?: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  };
}

/**
 * STARExtractor input - follows PipelineProcessor pattern.
 */
export interface STARExtractionInput {
  cluster: HydratedCluster;
  persona: CareerPersona;
}

/**
 * STARExtractor output.
 */
export interface STARExtractionOutput {
  star: ScoredSTAR | null;
  participations: ParticipationResult[];
}

/**
 * STARExtractor options.
 */
export interface STARExtractionOptions {
  /** Enable debug mode */
  debug?: boolean;
  /** Minimum cluster size to generate STAR */
  minActivities?: number;
  /** Minimum tool types to generate STAR */
  minToolTypes?: number;
  /** Maximum observer ratio allowed */
  maxObserverRatio?: number;
}

// =============================================================================
// NARRATIVE FRAMEWORK SYSTEM
// Configurable "views" on the same core cluster data.
// =============================================================================

/**
 * Available narrative frameworks.
 * Each extracts different components from the same HydratedCluster.
 *
 * - STAR: Situation-Task-Action-Result (classic)
 * - STARL: STAR + Learning (growth-focused)
 * - CAR: Challenge-Action-Result (concise, problem-focused)
 * - PAR: Problem-Action-Result (technical, engineering)
 * - SAR: Situation-Action-Result (ultra-concise)
 * - SOAR: Situation-Objective-Action-Result (business alignment)
 * - SHARE: Situation-Hindsight-Action-Result-Example (collaboration)
 * - CARL: Context-Action-Result-Learning (failure/accountability)
 */
export type NarrativeFrameworkType =
  | 'STAR'
  | 'STARL'
  | 'CAR'
  | 'PAR'
  | 'SAR'
  | 'SOAR'
  | 'SHARE'
  | 'CARL';

/**
 * A narrative component (flexible - works for any framework).
 */
export interface NarrativeComponent {
  /** Component name (e.g., 'situation', 'challenge', 'learning') */
  name: string;
  /** Extracted text */
  text: string;
  /** Activity IDs that contributed */
  sources: string[];
  /** Extraction confidence (0-1) */
  confidence: number;
}

/**
 * A generated narrative (framework-agnostic).
 */
export interface GeneratedNarrative {
  /** Source cluster ID */
  clusterId: string;
  /** Framework used */
  framework: NarrativeFrameworkType;
  /** Ordered components */
  components: NarrativeComponent[];
  /** Overall confidence */
  overallConfidence: number;
  /** Participation breakdown */
  participationSummary: {
    initiatorCount: number;
    contributorCount: number;
    mentionedCount: number;
    observerCount: number;
  };
  /** Suggested edits */
  suggestedEdits: string[];
  /** Metadata */
  metadata: {
    dateRange: { start: Date; end: Date };
    toolsCovered: ToolType[];
    totalActivities: number;
  };
  /** Validation result */
  validation: STARValidationResult;
}

/**
 * Framework definition - describes a narrative framework's structure.
 */
export interface NarrativeFrameworkDefinition {
  /** Framework type */
  type: NarrativeFrameworkType;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Ordered component names */
  componentOrder: string[];
  /** Best suited for these contexts */
  bestFor: string[];
  /** Not ideal for these contexts */
  notIdealFor: string[];
}

/**
 * Narrative extraction input (framework-agnostic).
 */
export interface NarrativeExtractionInput {
  cluster: HydratedCluster;
  persona: CareerPersona;
  /** Which framework to use (default: STAR) */
  framework?: NarrativeFrameworkType;
}

/**
 * Narrative extraction output.
 */
export interface NarrativeExtractionOutput {
  narrative: GeneratedNarrative | null;
  participations: ParticipationResult[];
  /** Alternative frameworks that could work for this cluster */
  alternativeFrameworks?: NarrativeFrameworkType[];
}

// =============================================================================
// PIPELINE COMPOSITION
// =============================================================================

/**
 * Full pipeline input (raw activities)
 */
export interface PipelineInput {
  activities: Array<{
    id: string;
    source: string;
    sourceId: string;
    sourceUrl?: string | null;
    title: string;
    description?: string | null;
    timestamp: Date;
    rawData?: Record<string, unknown> | null;
  }>;
}

/**
 * Full pipeline output
 */
export interface PipelineOutput {
  /** Extraction results per activity */
  extractions: Map<string, RefExtractionOutput>;

  /** Clustering results */
  clustering: ClusterExtractionOutput;

  /** Combined diagnostics */
  diagnostics: {
    refExtraction: ProcessorDiagnostics;
    clustering: ProcessorDiagnostics;
    totalTimeMs: number;
  };
}
