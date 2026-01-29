/**
 * STARExtractor - Pipeline Processor
 *
 * Transforms a HydratedCluster into a STAR narrative.
 * Uses pattern matching to extract Situation/Task/Action/Result components.
 *
 * Lifecycle:
 * 1. validate() - Ensure configuration is valid
 * 2. process(input, options) - Extract STAR with diagnostics
 *
 * Follows same PipelineProcessor pattern as RefExtractor and ClusterExtractor.
 */

import { ok, err } from 'neverthrow';
import {
  PipelineProcessor,
  ProcessorResult,
  ProcessorDiagnostics,
  ProcessorWarning,
  HydratedCluster,
  HydratedActivity,
  CareerPersona,
  ParticipationResult,
  DraftSTAR,
  ScoredSTAR,
  STARComponent,
  STARValidationResult,
  STARExtractionInput,
  STARExtractionOutput,
  STARExtractionOptions,
  STARExtractionResult,
  STARExtractionError,
  ToolType,
  WarningCodes,
} from './types';
import { IdentityMatcher } from './identity-matcher';

/**
 * Patterns for extracting STAR components.
 * Centralized for maintainability (per Principal Ghost's advice).
 */
const PATTERNS = {
  /** Situation: problem/context language */
  situation: /\b(need|problem|issue|slow|broken|currently|before|was|had|required|must|should|failing|error|bug|outage|incident|blocker)\b/i,

  /** Result: outcome/improvement language */
  result: /\b(reduc(e|ed|es|ing)|improv(e|ed|es|ing)|increas(e|ed|es|ing)|from .{1,30} to|closes?|fix(ed|es)?|resolv(e|ed|es)|complet(e|ed)|deliver(ed)?|ship(ped)?|launch(ed)?)\b|\d+%|\d+x|\d+ ?(ms|seconds?|minutes?|hours?|days?|users?|requests?)/i,

  /** Action: work done language */
  action: /\b(implement(ed)?|add(ed)?|creat(e|ed)|built?|develop(ed)?|design(ed)?|refactor(ed)?|optimiz(e|ed)|updat(e|ed)|configur(e|ed)|deploy(ed)?|migrat(e|ed)|integrat(e|ed))\b/i,
} as const;

/**
 * Confidence thresholds.
 */
const CONFIDENCE = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
} as const;

/**
 * Default validation gate thresholds.
 */
const DEFAULT_GATES = {
  minActivities: 3,
  minToolTypes: 2,
  maxObserverRatio: 0.6,
  minFilledComponents: 3,
} as const;

export class STARExtractor
  implements PipelineProcessor<STARExtractionInput, STARExtractionOutput, STARExtractionOptions>
{
  readonly name = 'STARExtractor';
  readonly version = '1.0.0';

  /**
   * Validate processor configuration.
   */
  validate(): void {
    // STARExtractor has no external dependencies to validate
  }

  /**
   * Process a hydrated cluster and extract STAR narrative.
   * Returns Result type for explicit error handling.
   */
  safeProcess(
    input: STARExtractionInput,
    options: STARExtractionOptions = {}
  ): STARExtractionResult {
    try {
      const result = this.process(input, options);

      // Check if validation failed - this is an expected "error" case
      if (!result.data.star) {
        const failedGates = result.warnings
          .find((w) => w.code === WarningCodes.VALIDATION_GATES_FAILED)
          ?.context?.failedGates as string[] | undefined;

        return err({
          code: 'VALIDATION_FAILED',
          message: 'Cluster failed validation gates',
          failedGates: failedGates || [],
          // Include participations to avoid duplicate processing in caller
          participations: result.data.participations,
          context: { clusterId: input.cluster.id },
        });
      }

      return ok(result);
    } catch (error) {
      return err({
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown extraction error',
        cause: error instanceof Error ? error : undefined,
        context: { clusterId: input.cluster.id },
      });
    }
  }

  /**
   * Process a hydrated cluster and extract STAR narrative.
   * @deprecated Use safeProcess() for Result-based error handling
   */
  process(
    input: STARExtractionInput,
    options: STARExtractionOptions = {}
  ): ProcessorResult<STARExtractionOutput> {
    const startTime = performance.now();
    const warnings: ProcessorWarning[] = [];

    const { cluster, persona } = input;

    // Step 1: Detect participation for all activities
    const identityMatcher = new IdentityMatcher(persona);
    const participations = cluster.activities.map((a) =>
      identityMatcher.detectParticipation(a)
    );

    // Step 2: Check validation gates
    const gateOptions = {
      minActivities: options.minActivities ?? DEFAULT_GATES.minActivities,
      minToolTypes: options.minToolTypes ?? DEFAULT_GATES.minToolTypes,
      maxObserverRatio: options.maxObserverRatio ?? DEFAULT_GATES.maxObserverRatio,
    };

    const gateResult = this.checkGates(cluster, participations, gateOptions);

    if (!gateResult.passed) {
      // Return null STAR but include participations for debugging
      return {
        data: {
          star: null,
          participations,
        },
        diagnostics: this.buildDiagnostics(startTime, cluster, participations, null, options),
        warnings: [
          ...warnings,
          {
            code: WarningCodes.VALIDATION_GATES_FAILED,
            message: `Cluster failed validation: ${gateResult.failedGates.join(', ')}`,
            context: { failedGates: gateResult.failedGates },
          },
        ],
        errors: [],
      };
    }

    // Step 3: Extract STAR components
    const situation = this.extractSituation(cluster.activities);
    const task = this.extractTask(cluster.activities);
    const action = this.extractAction(cluster.activities);
    const result = this.extractResult(cluster.activities);

    // Step 4: Build participation summary
    const participationSummary = this.buildParticipationSummary(participations);

    // Step 5: Generate suggested edits
    const suggestedEdits = this.generateSuggestedEdits(situation, task, action, result, participationSummary);

    // Step 6: Build draft STAR
    const overallConfidence = Math.min(
      situation.confidence,
      task.confidence,
      action.confidence,
      result.confidence
    );

    const draft: DraftSTAR = {
      clusterId: cluster.id,
      situation,
      task,
      action,
      result,
      overallConfidence,
      participationSummary,
      suggestedEdits,
      metadata: {
        dateRange: {
          start: cluster.metrics.dateRange?.earliest ?? cluster.activities[0]?.timestamp ?? new Date(),
          end: cluster.metrics.dateRange?.latest ?? cluster.activities[cluster.activities.length - 1]?.timestamp ?? new Date(),
        },
        toolsCovered: cluster.metrics.toolTypes as ToolType[],
        totalActivities: cluster.activities.length,
      },
    };

    // Step 7: Final validation
    const validation = this.validateSTAR(draft, gateResult);

    const scoredSTAR: ScoredSTAR = {
      ...draft,
      validation,
    };

    return {
      data: {
        star: scoredSTAR,
        participations,
      },
      diagnostics: this.buildDiagnostics(startTime, cluster, participations, scoredSTAR, options),
      warnings,
      errors: [],
    };
  }

  // ===========================================================================
  // EXTRACTION METHODS
  // ===========================================================================

  /** Empty component returned on extraction failure */
  private readonly EMPTY_COMPONENT: STARComponent = { text: '', sources: [], confidence: 0 };

  private extractSituation(activities: HydratedActivity[]): STARComponent {
    try {
      // Look for problem/context language in earliest activities
      const candidates = activities
        .filter((a) => {
          const text = `${a.title} ${a.description || ''}`;
          return PATTERNS.situation.test(text);
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (candidates.length > 0) {
        const best = candidates[0];
        return {
          text: best.description || best.title,
          sources: [best.id],
          confidence: CONFIDENCE.HIGH,
        };
      }

      // Fallback: first Jira ticket description
      const firstJira = activities.find((a) => a.source === 'jira' && a.description);
      if (firstJira) {
        return {
          text: firstJira.description!,
          sources: [firstJira.id],
          confidence: CONFIDENCE.MEDIUM,
        };
      }

      // Last resort: first activity title
      if (activities.length > 0) {
        return {
          text: activities[0].title,
          sources: [activities[0].id],
          confidence: CONFIDENCE.LOW,
        };
      }

      return this.EMPTY_COMPONENT;
    } catch {
      return this.EMPTY_COMPONENT;
    }
  }

  private extractTask(activities: HydratedActivity[]): STARComponent {
    try {
      // Jira ticket titles are task descriptions
      const jiraActivities = activities.filter((a) => a.source === 'jira');

      if (jiraActivities.length > 0) {
        const taskTexts = jiraActivities.map((a) => a.title);
        return {
          text: taskTexts.join('; '),
          sources: jiraActivities.map((a) => a.id),
          confidence: CONFIDENCE.HIGH,
        };
      }

      // Fallback: Confluence page titles (often design docs)
      const confluenceActivities = activities.filter((a) => a.source === 'confluence');
      if (confluenceActivities.length > 0) {
        return {
          text: confluenceActivities.map((a) => a.title).join('; '),
          sources: confluenceActivities.map((a) => a.id),
          confidence: CONFIDENCE.MEDIUM,
        };
      }

      // Last resort: any activity with action language
      const actionActivity = activities.find((a) => PATTERNS.action.test(a.title));
      if (actionActivity) {
        return {
          text: actionActivity.title,
          sources: [actionActivity.id],
          confidence: CONFIDENCE.LOW,
        };
      }

      return this.EMPTY_COMPONENT;
    } catch {
      return this.EMPTY_COMPONENT;
    }
  }

  private extractAction(activities: HydratedActivity[]): STARComponent {
    try {
      // PR titles and descriptions describe actions taken
      const prActivities = activities.filter((a) => a.source === 'github');

      if (prActivities.length > 0) {
        const actionTexts = prActivities.map((a) => {
          const desc = a.description ? `: ${a.description.slice(0, 100)}` : '';
          return `${a.title}${desc}`;
        });

        return {
          text: actionTexts.join('\n'),
          sources: prActivities.map((a) => a.id),
          confidence: CONFIDENCE.HIGH,
        };
      }

      // Fallback: activities with action language
      const actionActivities = activities.filter((a) => PATTERNS.action.test(`${a.title} ${a.description || ''}`));

      if (actionActivities.length > 0) {
        return {
          text: actionActivities.map((a) => a.title).join('; '),
          sources: actionActivities.map((a) => a.id),
          confidence: CONFIDENCE.MEDIUM,
        };
      }

      return this.EMPTY_COMPONENT;
    } catch {
      return this.EMPTY_COMPONENT;
    }
  }

  private extractResult(activities: HydratedActivity[]): STARComponent {
    try {
      // Look for quantified outcomes (latest activities first)
      const sortedByLatest = [...activities].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      for (const activity of sortedByLatest) {
        const text = `${activity.title} ${activity.description || ''}`;
        if (PATTERNS.result.test(text)) {
          // Extract the sentence/phrase with the result
          const resultMatch = text.match(PATTERNS.result);
          if (resultMatch) {
            return {
              text: activity.description || activity.title,
              sources: [activity.id],
              confidence: CONFIDENCE.HIGH,
            };
          }
        }
      }

      // Fallback: summarize from rawData metrics
      const metrics = this.extractMetricsFromRawData(activities);
      if (metrics) {
        return {
          text: metrics,
          sources: activities.map((a) => a.id),
          confidence: CONFIDENCE.MEDIUM,
        };
      }

      // Last resort: count what was done
      const prCount = activities.filter((a) => a.source === 'github').length;
      const ticketCount = activities.filter((a) => a.source === 'jira').length;

      if (prCount > 0 || ticketCount > 0) {
        const parts = [];
        if (ticketCount > 0) parts.push(`Completed ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}`);
        if (prCount > 0) parts.push(`merged ${prCount} PR${prCount > 1 ? 's' : ''}`);

        return {
          text: parts.join(', '),
          sources: activities.map((a) => a.id),
          confidence: CONFIDENCE.LOW,
        };
      }

      return this.EMPTY_COMPONENT;
    } catch {
      return this.EMPTY_COMPONENT;
    }
  }

  private extractMetricsFromRawData(activities: HydratedActivity[]): string | null {
    const metrics: string[] = [];

    for (const activity of activities) {
      const rawData = activity.rawData;
      if (!rawData) continue;

      // GitHub PR metrics
      if (rawData.additions && rawData.deletions) {
        metrics.push(`+${rawData.additions}/-${rawData.deletions} lines`);
      }

      // Jira story points
      if (rawData.storyPoints) {
        metrics.push(`${rawData.storyPoints} story points`);
      }
    }

    if (metrics.length > 0) {
      return [...new Set(metrics)].join(', ');
    }

    return null;
  }

  // ===========================================================================
  // VALIDATION & GATES
  // ===========================================================================

  private checkGates(
    cluster: HydratedCluster,
    participations: ParticipationResult[],
    options: { minActivities: number; minToolTypes: number; maxObserverRatio: number }
  ): { passed: boolean; failedGates: string[] } {
    const failedGates: string[] = [];

    if (cluster.activities.length < options.minActivities) {
      failedGates.push(`MIN_ACTIVITIES (${cluster.activities.length} < ${options.minActivities})`);
    }

    if (cluster.metrics.toolTypes.length < options.minToolTypes) {
      failedGates.push(`MIN_TOOL_TYPES (${cluster.metrics.toolTypes.length} < ${options.minToolTypes})`);
    }

    const observerCount = participations.filter((p) => p.level === 'observer').length;
    const observerRatio = participations.length > 0 ? observerCount / participations.length : 0;
    if (observerRatio > options.maxObserverRatio) {
      failedGates.push(`MAX_OBSERVER_RATIO (${(observerRatio * 100).toFixed(0)}% > ${(options.maxObserverRatio * 100).toFixed(0)}%)`);
    }

    return {
      passed: failedGates.length === 0,
      failedGates,
    };
  }

  private validateSTAR(
    draft: DraftSTAR,
    gateResult: { passed: boolean; failedGates: string[] }
  ): STARValidationResult {
    const warnings: string[] = [];

    // Check component fill rate
    const filledComponents = [
      draft.situation.text,
      draft.task.text,
      draft.action.text,
      draft.result.text,
    ].filter(Boolean).length;

    if (filledComponents < DEFAULT_GATES.minFilledComponents) {
      warnings.push(`Only ${filledComponents}/4 STAR components have content`);
    }

    // Check for low confidence
    if (draft.overallConfidence < CONFIDENCE.MEDIUM) {
      warnings.push('Low confidence extraction - review carefully');
    }

    // Score based on confidence and completeness
    const score = Math.round(
      (draft.overallConfidence * 50) + (filledComponents / 4 * 50)
    );

    return {
      passed: gateResult.passed && filledComponents >= DEFAULT_GATES.minFilledComponents,
      score,
      failedGates: gateResult.failedGates,
      warnings,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private buildParticipationSummary(participations: ParticipationResult[]): DraftSTAR['participationSummary'] {
    return {
      initiatorCount: participations.filter((p) => p.level === 'initiator').length,
      contributorCount: participations.filter((p) => p.level === 'contributor').length,
      mentionedCount: participations.filter((p) => p.level === 'mentioned').length,
      observerCount: participations.filter((p) => p.level === 'observer').length,
    };
  }

  private generateSuggestedEdits(
    situation: STARComponent,
    task: STARComponent,
    action: STARComponent,
    result: STARComponent,
    participation: DraftSTAR['participationSummary']
  ): string[] {
    const edits: string[] = [];

    if (situation.confidence < CONFIDENCE.MEDIUM) {
      edits.push('Add context: What was the business problem or need?');
    }

    if (task.confidence < CONFIDENCE.MEDIUM) {
      edits.push('Clarify task: What specifically were you asked to do?');
    }

    if (action.confidence < CONFIDENCE.MEDIUM) {
      edits.push('Detail actions: What technical approach did you take?');
    }

    if (result.confidence < CONFIDENCE.MEDIUM) {
      edits.push('Quantify results: Add metrics like time saved, performance improvement, or business impact');
    }

    if (participation.observerCount > participation.initiatorCount) {
      edits.push('Note: You were more observer than initiator in this work. Consider highlighting your specific contributions.');
    }

    return edits;
  }

  private buildDiagnostics(
    startTime: number,
    cluster: HydratedCluster,
    participations: ParticipationResult[],
    star: ScoredSTAR | null,
    options: STARExtractionOptions
  ): ProcessorDiagnostics {
    const diagnostics: ProcessorDiagnostics = {
      processor: this.name,
      processingTimeMs: performance.now() - startTime,
      inputMetrics: {
        activityCount: cluster.activities.length,
        toolTypeCount: cluster.metrics.toolTypes.length,
        initiatorCount: participations.filter((p) => p.level === 'initiator').length,
      },
      outputMetrics: {
        starGenerated: star ? 1 : 0,
        overallConfidence: star?.overallConfidence ?? 0,
        validationScore: star?.validation.score ?? 0,
        suggestedEditCount: star?.suggestedEdits.length ?? 0,
      },
    };

    if (options.debug) {
      diagnostics.debug = {
        participations,
        componentConfidences: star
          ? {
              situation: star.situation.confidence,
              task: star.task.confidence,
              action: star.action.confidence,
              result: star.result.confidence,
            }
          : null,
      };
    }

    return diagnostics;
  }
}

// Singleton instance
export const starExtractor = new STARExtractor();
