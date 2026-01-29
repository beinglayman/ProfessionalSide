/**
 * STARGenerationService - Orchestrates STAR generation from clusters
 *
 * Wires together:
 * 1. ClusterHydrator - Enrich cluster with full activity data
 * 2. STARExtractor - Generate STAR narrative
 * 3. LLMPolisherService - Optional polish pass using Claude 3 Haiku
 *
 * Uses neverthrow for typed error handling.
 *
 * This is the service layer called by the API controller.
 */

import { ok, err, Result } from 'neverthrow';
import {
  Cluster,
  CareerPersona,
  ScoredSTAR,
  ParticipationResult,
  NarrativeFrameworkType,
  STARGenerationError,
} from './pipeline/types';
import {
  ClusterHydrator,
  clusterHydrator,
  ActivityWithRefs,
} from './pipeline/cluster-hydrator';
import { STARExtractor, starExtractor } from './pipeline/star-extractor';
import {
  LLMPolisherService,
  llmPolisherService,
  PolishStatus,
} from './llm-polisher.service';

/**
 * Options for STAR generation.
 */
export interface STARGenerationOptions {
  /** Enable LLM polish pass (default: false until explicitly enabled) */
  polish?: boolean;
  /** Narrative framework to use (default: STAR) - reserved for future use */
  framework?: NarrativeFrameworkType;
  /** Enable debug mode */
  debug?: boolean;
  /** Minimum activities for valid STAR */
  minActivities?: number;
  /** Minimum tool types for valid STAR */
  minToolTypes?: number;
  /** Maximum observer ratio allowed */
  maxObserverRatio?: number;
}

/**
 * Result of STAR generation.
 */
export interface STARGenerationResult {
  /** Generated STAR or null if validation failed */
  star: ScoredSTAR | null;
  /** Status of LLM polish operation */
  polishStatus: PolishStatus;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Failed validation gates (if any) */
  failedGates?: string[];
  /** Participation results for all activities */
  participations: ParticipationResult[];
}

export class STARGenerationService {
  constructor(
    private hydrator: ClusterHydrator = clusterHydrator,
    private extractor: STARExtractor = starExtractor,
    private polisher: LLMPolisherService = llmPolisherService
  ) {}

  /**
   * Generate a STAR narrative from a cluster using Result-based error handling.
   *
   * Pipeline: Hydrate → Extract → Polish (optional)
   */
  async generate(
    cluster: Cluster,
    activities: ActivityWithRefs[],
    persona: CareerPersona,
    options: STARGenerationOptions = {}
  ): Promise<Result<STARGenerationResult, STARGenerationError>> {
    const startTime = performance.now();

    // Step 1: Hydrate cluster
    const activityLookup = ClusterHydrator.buildLookup(activities);
    const hydrationResult = this.hydrator.safeHydrate(cluster, activityLookup);

    if (hydrationResult.isErr()) {
      return err({
        code: 'HYDRATION_FAILED',
        message: hydrationResult.error.message,
        stage: 'hydration',
        underlyingError: hydrationResult.error,
      });
    }

    const hydratedCluster = hydrationResult.value.cluster;

    // Step 2: Extract STAR
    const extractionResult = this.extractor.safeProcess(
      { cluster: hydratedCluster, persona },
      {
        debug: options.debug,
        minActivities: options.minActivities,
        minToolTypes: options.minToolTypes,
        maxObserverRatio: options.maxObserverRatio,
      }
    );

    let star: ScoredSTAR | null = null;
    let participations: ParticipationResult[] = [];
    let failedGates: string[] | undefined;

    if (extractionResult.isErr()) {
      const error = extractionResult.error;

      // Validation failures are expected - return success with null star
      if (error.code === 'VALIDATION_FAILED') {
        failedGates = error.failedGates;
        participations = error.participations || [];
      } else {
        return err({
          code: 'EXTRACTION_FAILED',
          message: error.message,
          stage: 'extraction',
          underlyingError: error,
        });
      }
    } else {
      star = extractionResult.value.data.star;
      participations = extractionResult.value.data.participations;
    }

    // Step 3: Optional polish
    let polishStatus: PolishStatus = 'not_requested';

    if (star && options.polish) {
      const polishOutcome = await this.polisher.polishIfConfigured(star);
      star = polishOutcome.star;
      polishStatus = polishOutcome.status;
    }

    const processingTimeMs = performance.now() - startTime;

    return ok({
      star,
      polishStatus,
      processingTimeMs,
      failedGates,
      participations,
    });
  }

  /**
   * Generate STAR from cluster ID with Result-based error handling.
   */
  async generateFromClusterId(
    clusterId: string,
    clusterData: {
      cluster: Cluster;
      activities: ActivityWithRefs[];
    },
    persona: CareerPersona,
    options: STARGenerationOptions = {}
  ): Promise<Result<STARGenerationResult, STARGenerationError>> {
    if (clusterData.cluster.id !== clusterId) {
      return err({
        code: 'CLUSTER_NOT_FOUND',
        message: `Cluster ID mismatch: expected ${clusterId}, got ${clusterData.cluster.id}`,
      });
    }

    return this.generate(
      clusterData.cluster,
      clusterData.activities,
      persona,
      options
    );
  }
}

// Singleton instance
export const starGenerationService = new STARGenerationService();
