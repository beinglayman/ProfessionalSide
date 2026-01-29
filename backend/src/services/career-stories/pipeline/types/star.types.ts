/**
 * STAR Narrative Types
 *
 * Types for STAR generation, narrative frameworks, and scoring.
 */

import { ToolType, HydratedCluster, CareerPersona } from './cluster.types';

// =============================================================================
// PARTICIPATION TYPES
// =============================================================================

export type ParticipationLevel = 'initiator' | 'contributor' | 'mentioned' | 'observer';

export interface ParticipationResult {
  activityId: string;
  level: ParticipationLevel;
  signals: string[];
}

// =============================================================================
// STAR COMPONENTS
// =============================================================================

export interface STARComponent {
  text: string;
  sources: string[];
  confidence: number;
}

export interface DraftSTAR {
  clusterId: string;
  situation: STARComponent;
  task: STARComponent;
  action: STARComponent;
  result: STARComponent;
  overallConfidence: number;
  participationSummary: {
    initiatorCount: number;
    contributorCount: number;
    mentionedCount: number;
    observerCount: number;
  };
  suggestedEdits: string[];
  metadata: {
    dateRange: { start: Date; end: Date };
    toolsCovered: ToolType[];
    totalActivities: number;
  };
}

export interface STARValidationResult {
  passed: boolean;
  score: number;
  failedGates: string[];
  warnings: string[];
}

export interface ScoredSTAR extends DraftSTAR {
  validation: STARValidationResult;
  userEdits?: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  };
}

// =============================================================================
// STAR EXTRACTOR TYPES
// =============================================================================

export interface STARExtractionInput {
  cluster: HydratedCluster;
  persona: CareerPersona;
}

export interface STARExtractionOutput {
  star: ScoredSTAR | null;
  participations: ParticipationResult[];
}

export interface STARExtractionOptions {
  debug?: boolean;
  minActivities?: number;
  minToolTypes?: number;
  maxObserverRatio?: number;
}

// =============================================================================
// NARRATIVE FRAMEWORK TYPES
// =============================================================================

export type NarrativeFrameworkType =
  | 'STAR'
  | 'STARL'
  | 'CAR'
  | 'PAR'
  | 'SAR'
  | 'SOAR'
  | 'SHARE'
  | 'CARL';

export interface NarrativeComponent {
  name: string;
  text: string;
  sources: string[];
  confidence: number;
}

export interface GeneratedNarrative {
  clusterId: string;
  framework: NarrativeFrameworkType;
  components: NarrativeComponent[];
  overallConfidence: number;
  participationSummary: {
    initiatorCount: number;
    contributorCount: number;
    mentionedCount: number;
    observerCount: number;
  };
  suggestedEdits: string[];
  metadata: {
    dateRange: { start: Date; end: Date };
    toolsCovered: ToolType[];
    totalActivities: number;
  };
  validation: STARValidationResult;
}

export interface NarrativeFrameworkDefinition {
  type: NarrativeFrameworkType;
  name: string;
  description: string;
  componentOrder: string[];
  bestFor: string[];
  notIdealFor: string[];
}

export interface NarrativeExtractionInput {
  cluster: HydratedCluster;
  persona: CareerPersona;
  framework?: NarrativeFrameworkType;
}

export interface NarrativeExtractionOutput {
  narrative: GeneratedNarrative | null;
  participations: ParticipationResult[];
  alternativeFrameworks?: NarrativeFrameworkType[];
}

// =============================================================================
// PIPELINE COMPOSITION
// =============================================================================

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

export interface PipelineOutput {
  extractions: Map<string, import('./cluster.types').RefExtractionOutput>;
  clustering: import('./cluster.types').ClusterExtractionOutput;
  diagnostics: {
    refExtraction: import('./pipeline.types').ProcessorDiagnostics;
    clustering: import('./pipeline.types').ProcessorDiagnostics;
    totalTimeMs: number;
  };
}
