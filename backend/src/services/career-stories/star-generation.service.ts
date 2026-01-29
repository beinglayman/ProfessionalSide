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
  GeneratedNarrative,
  STARComponent,
} from './pipeline/types';
import {
  ClusterHydrator,
  clusterHydrator,
  ActivityWithRefs,
} from './pipeline/cluster-hydrator';
import { STARExtractor, starExtractor } from './pipeline/star-extractor';
import { NarrativeExtractor, narrativeExtractor } from './pipeline/narrative-extractor';
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
  private _narrativeExtractor: NarrativeExtractor | null = null;

  constructor(
    private hydrator: ClusterHydrator = clusterHydrator,
    private extractor: STARExtractor = starExtractor,
    narrativeExtractorInstance?: NarrativeExtractor,
    private polisher: LLMPolisherService = llmPolisherService
  ) {
    if (narrativeExtractorInstance) {
      this._narrativeExtractor = narrativeExtractorInstance;
    }
  }

  private get narrativeExtractorInstance(): NarrativeExtractor {
    if (!this._narrativeExtractor) {
      this._narrativeExtractor = narrativeExtractor;
    }
    return this._narrativeExtractor;
  }

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

    // Step 2: Extract narrative using the specified framework
    const framework = options.framework || 'STAR';

    // Use NarrativeExtractor for all frameworks - it handles STAR and others
    const narrativeResult = this.narrativeExtractorInstance.safeProcess(
      { cluster: hydratedCluster, persona, framework },
      {
        framework,
        debug: options.debug,
        minActivities: options.minActivities,
        minToolTypes: options.minToolTypes,
        maxObserverRatio: options.maxObserverRatio,
      }
    );

    let star: ScoredSTAR | null = null;
    let participations: ParticipationResult[] = [];
    let failedGates: string[] | undefined;

    if (narrativeResult.isErr()) {
      const error = narrativeResult.error;

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
      const narrative = narrativeResult.value.data.narrative;
      participations = narrativeResult.value.data.participations;

      if (narrative) {
        // Convert GeneratedNarrative to ScoredSTAR format for frontend compatibility
        star = this.convertNarrativeToScoredSTAR(narrative);
      }
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

  /**
   * Convert GeneratedNarrative to ScoredSTAR format for frontend compatibility.
   * Maps framework components to STAR-like structure.
   */
  private convertNarrativeToScoredSTAR(narrative: GeneratedNarrative): ScoredSTAR {
    const componentMap = new Map(
      narrative.components.map((c) => [c.name, c])
    );

    // Map components to STAR structure
    // Different frameworks have different components, so we map them intelligently
    const getComponent = (...names: string[]): STARComponent => {
      for (const name of names) {
        const component = componentMap.get(name);
        if (component && component.text) {
          return {
            text: component.text,
            sources: component.sources,
            confidence: component.confidence,
          };
        }
      }
      // Return empty component if none found
      return { text: '', sources: [], confidence: 0 };
    };

    // Map framework components to STAR structure:
    // - Situation: situation, context, problem, challenge
    // - Task: task, objective
    // - Action: action
    // - Result: result, learning, hindsight, example (combined if multiple)
    const situation = getComponent('situation', 'context', 'problem', 'challenge');
    const task = getComponent('task', 'objective');
    const action = getComponent('action');

    // For result, we may want to combine result + learning for frameworks like STARL/CARL
    let result = getComponent('result');
    const learning = componentMap.get('learning');
    const hindsight = componentMap.get('hindsight');
    const example = componentMap.get('example');

    // Append learning/hindsight/example to result if present
    const resultExtras: string[] = [];
    if (learning?.text) resultExtras.push(`Learning: ${learning.text}`);
    if (hindsight?.text) resultExtras.push(`Hindsight: ${hindsight.text}`);
    if (example?.text) resultExtras.push(`Example: ${example.text}`);

    if (resultExtras.length > 0 && result.text) {
      result = {
        ...result,
        text: `${result.text}\n\n${resultExtras.join('\n\n')}`,
      };
    } else if (resultExtras.length > 0 && !result.text) {
      // If no result but have extras, use them
      result = {
        text: resultExtras.join('\n\n'),
        sources: [
          ...(learning?.sources || []),
          ...(hindsight?.sources || []),
          ...(example?.sources || []),
        ],
        confidence: Math.max(
          learning?.confidence || 0,
          hindsight?.confidence || 0,
          example?.confidence || 0
        ),
      };
    }

    return {
      clusterId: narrative.clusterId,
      situation,
      task,
      action,
      result,
      overallConfidence: narrative.overallConfidence,
      participationSummary: narrative.participationSummary,
      suggestedEdits: narrative.suggestedEdits,
      metadata: narrative.metadata,
      validation: narrative.validation,
    };
  }
}

// Singleton instance
export const starGenerationService = new STARGenerationService();
