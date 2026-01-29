/**
 * Career Stories Pipeline Types
 *
 * Re-exports all types from focused modules for convenience.
 * Import from this file or directly from specific modules.
 */

// Pipeline processor base types
export {
  PipelineProcessor,
  ProcessorResult,
  ProcessorDiagnostics,
  ProcessorWarning,
  ProcessorError,
  WarningCodes,
  ErrorCodes,
  WarningCode,
  ErrorCode,
} from './pipeline.types';

// Cluster and activity types
export {
  ToolType,
  ConfidenceLevel,
  PatternExample,
  RefPattern,
  PatternMatch,
  RefExtractionInput,
  RefExtractionOutput,
  PatternAnalysis,
  RefExtractionOptions,
  ClusterableActivity,
  ClusterExtractionInput,
  Cluster,
  ClusterExtractionOutput,
  ClusterExtractionOptions,
  HydratedActivity,
  HydratedCluster,
  CareerPersona,
} from './cluster.types';

// STAR narrative types
export {
  ParticipationLevel,
  ParticipationResult,
  STARComponent,
  DraftSTAR,
  STARValidationResult,
  ScoredSTAR,
  STARExtractionInput,
  STARExtractionOutput,
  STARExtractionOptions,
  NarrativeFrameworkType,
  NarrativeComponent,
  GeneratedNarrative,
  NarrativeFrameworkDefinition,
  NarrativeExtractionInput,
  NarrativeExtractionOutput,
  PipelineInput,
  PipelineOutput,
} from './star.types';

// Error types
export {
  PipelineErrorBase,
  PipelineError,
  RefExtractionErrorCode,
  ClusterExtractionErrorCode,
  HydrationErrorCode,
  IdentityMatchErrorCode,
  STARExtractionErrorCode,
  PolishErrorCode,
  STARGenerationErrorCode,
  RefExtractionError,
  ClusterExtractionError,
  HydrationError,
  IdentityMatchError,
  STARExtractionError,
  PolishError,
  STARGenerationError,
  RefExtractionResult,
  ClusterExtractionResult,
  HydrationResult,
  STARExtractionResult,
} from './errors.types';
