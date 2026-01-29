/**
 * Pipeline Processor Types
 *
 * Base interfaces for all pipeline processors, diagnostics, and results.
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
