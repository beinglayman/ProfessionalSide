/**
 * Pipeline Error Types
 *
 * Typed error interfaces for neverthrow Result handling.
 */

import { Result } from 'neverthrow';
import { ProcessorResult, ProcessorWarning } from './pipeline.types';
import {
  RefExtractionOutput,
  ClusterExtractionOutput,
  HydratedCluster,
} from './cluster.types';
import {
  STARExtractionOutput,
  ParticipationResult,
} from './star.types';

// =============================================================================
// BASE ERROR TYPE
// =============================================================================

/**
 * Base error for all pipeline operations.
 * All specific errors extend this.
 */
export interface PipelineErrorBase {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable message */
  message: string;
  /** Original error if wrapping an exception */
  cause?: Error;
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// STAGE-SPECIFIC ERROR TYPES
// =============================================================================

/** RefExtractor error codes */
export type RefExtractionErrorCode =
  | 'PATTERN_EXECUTION_FAILED'
  | 'INVALID_INPUT'
  | 'PATTERN_NOT_FOUND';

export interface RefExtractionError extends PipelineErrorBase {
  code: RefExtractionErrorCode;
  patternId?: string;
}

/** ClusterExtractor error codes */
export type ClusterExtractionErrorCode =
  | 'GRAPH_BUILD_FAILED'
  | 'INVALID_ACTIVITIES'
  | 'CLUSTERING_FAILED';

export interface ClusterExtractionError extends PipelineErrorBase {
  code: ClusterExtractionErrorCode;
}

/** ClusterHydrator error codes */
export type HydrationErrorCode =
  | 'ACTIVITY_LOOKUP_FAILED'
  | 'INVALID_CLUSTER'
  | 'NO_ACTIVITIES_FOUND';

export interface HydrationError extends PipelineErrorBase {
  code: HydrationErrorCode;
  missingActivityIds?: string[];
}

/** IdentityMatcher error codes */
export type IdentityMatchErrorCode =
  | 'INVALID_PERSONA'
  | 'MATCHING_FAILED';

export interface IdentityMatchError extends PipelineErrorBase {
  code: IdentityMatchErrorCode;
}

/** STARExtractor error codes */
export type STARExtractionErrorCode =
  | 'VALIDATION_FAILED'
  | 'EXTRACTION_FAILED'
  | 'INVALID_CLUSTER';

export interface STARExtractionError extends PipelineErrorBase {
  code: STARExtractionErrorCode;
  failedGates?: string[];
  participations?: ParticipationResult[];
}

/** LLMPolisher error codes */
export type PolishErrorCode =
  | 'LLM_UNAVAILABLE'
  | 'LLM_TIMEOUT'
  | 'LLM_ERROR'
  | 'NOT_CONFIGURED';

export interface PolishError extends PipelineErrorBase {
  code: PolishErrorCode;
  component?: 'situation' | 'task' | 'action' | 'result';
}

/** STARGenerationService error codes */
export type STARGenerationErrorCode =
  | 'HYDRATION_FAILED'
  | 'EXTRACTION_FAILED'
  | 'POLISH_FAILED'
  | 'CLUSTER_NOT_FOUND'
  | 'PERSONA_NOT_FOUND';

export interface STARGenerationError extends PipelineErrorBase {
  code: STARGenerationErrorCode;
  stage?: 'hydration' | 'extraction' | 'polish';
  underlyingError?: PipelineErrorBase;
}

// =============================================================================
// UNION TYPE FOR EXHAUSTIVE HANDLING
// =============================================================================

export type PipelineError =
  | RefExtractionError
  | ClusterExtractionError
  | HydrationError
  | IdentityMatchError
  | STARExtractionError
  | PolishError
  | STARGenerationError;

// =============================================================================
// RESULT TYPE ALIASES
// =============================================================================

export type RefExtractionResult = Result<
  ProcessorResult<RefExtractionOutput>,
  RefExtractionError
>;

export type ClusterExtractionResult = Result<
  ProcessorResult<ClusterExtractionOutput>,
  ClusterExtractionError
>;

export type HydrationResult = Result<
  { cluster: HydratedCluster; warnings: ProcessorWarning[] },
  HydrationError
>;

export type STARExtractionResult = Result<
  ProcessorResult<STARExtractionOutput>,
  STARExtractionError
>;
