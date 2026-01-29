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
