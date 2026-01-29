/**
 * NarrativeExtractor - Framework-Aware Pipeline Processor
 *
 * Transforms a HydratedCluster into a narrative using the specified framework
 * (STAR, CAR, SOAR, CARL, etc.). Uses pattern matching and LLM prompts to
 * extract appropriate components based on the framework definition.
 *
 * This extends STARExtractor to support all 8 narrative frameworks.
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
  NarrativeFrameworkType,
  NarrativeComponent,
  GeneratedNarrative,
  NarrativeExtractionInput,
  NarrativeExtractionOutput,
  STARValidationResult,
  ToolType,
  WarningCodes,
} from './types';
import { IdentityMatcher } from './identity-matcher';
import { NARRATIVE_FRAMEWORKS } from './narrative-frameworks';

/**
 * Extraction options for the narrative extractor.
 */
export interface NarrativeExtractionOptions {
  framework?: NarrativeFrameworkType;
  debug?: boolean;
  minActivities?: number;
  minToolTypes?: number;
  maxObserverRatio?: number;
}

/**
 * Patterns for extracting narrative components.
 * These are used to match activities to component types.
 */
const COMPONENT_PATTERNS: Record<string, RegExp> = {
  // Context/Situation patterns - problem/context language
  situation: /\b(need|problem|issue|slow|broken|currently|before|was|had|required|must|should|failing|error|bug|outage|incident|blocker|context|background)\b/i,
  context: /\b(need|problem|issue|slow|broken|currently|before|was|had|required|must|should|failing|error|bug|outage|incident|blocker|context|background|pressure|deadline|constraint)\b/i,

  // Challenge/Problem patterns
  challenge: /\b(challeng|problem|issue|difficult|struggle|obstacle|block|barrier|impediment|risk|threat)\b/i,
  problem: /\b(problem|issue|bug|error|failure|broken|crash|slow|latency|bottleneck|limit)\b/i,

  // Task/Objective patterns
  task: /\b(task|goal|objective|target|deliverable|requirement|milestone|sprint|assigned|responsible)\b/i,
  objective: /\b(objective|goal|target|kpi|metric|okr|aim|mission|vision|strategy)\b/i,

  // Action patterns - work done language
  action: /\b(implement(ed)?|add(ed)?|creat(e|ed)|built?|develop(ed)?|design(ed)?|refactor(ed)?|optimiz(e|ed)|updat(e|ed)|configur(e|ed)|deploy(ed)?|migrat(e|ed)|integrat(e|ed)|led|drove|initiated|coordinated)\b/i,

  // Result/Outcome patterns
  result: /\b(reduc(e|ed|es|ing)|improv(e|ed|es|ing)|increas(e|ed|es|ing)|from .{1,30} to|closes?|fix(ed|es)?|resolv(e|ed|es)|complet(e|ed)|deliver(ed)?|ship(ped)?|launch(ed)?|achiev(e|ed)|success)\b|\d+%|\d+x|\d+ ?(ms|seconds?|minutes?|hours?|days?|users?|requests?)/i,

  // Learning patterns
  learning: /\b(learn(ed|ing)?|realiz(e|ed)|discover(ed)?|understand|insight|takeaway|lesson|retrospective|reflect|growth|improve(ment)?)\b/i,

  // Hindsight patterns
  hindsight: /\b(hindsight|retrospect|looking back|realized|should have|could have|in retrospect|with hindsight)\b/i,

  // Obstacles patterns
  obstacles: /\b(obstacle|barrier|blocker|impediment|challenge|resistance|pushback|constraint|limitation)\b/i,

  // Example patterns
  example: /\b(example|instance|case|specifically|for instance|such as|like when|one time)\b/i,
};

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
  minFilledComponents: 2, // Lower than STAR since some frameworks have fewer components
} as const;

export class NarrativeExtractor
  implements PipelineProcessor<NarrativeExtractionInput, NarrativeExtractionOutput, NarrativeExtractionOptions>
{
  readonly name = 'NarrativeExtractor';
  readonly version = '1.0.0';

  validate(): void {
    // No external dependencies to validate
  }

  /**
   * Process a hydrated cluster and extract narrative using the specified framework.
   * Returns Result type for explicit error handling.
   */
  safeProcess(
    input: NarrativeExtractionInput,
    options: NarrativeExtractionOptions = {}
  ) {
    try {
      const result = this.process(input, options);

      if (!result.data.narrative) {
        const failedGates = result.warnings
          .find((w) => w.code === WarningCodes.VALIDATION_GATES_FAILED)
          ?.context?.failedGates as string[] | undefined;

        return err({
          code: 'VALIDATION_FAILED' as const,
          message: 'Cluster failed validation gates',
          failedGates: failedGates || [],
          participations: result.data.participations,
          context: { clusterId: input.cluster.id },
        });
      }

      return ok(result);
    } catch (error) {
      return err({
        code: 'EXTRACTION_FAILED' as const,
        message: error instanceof Error ? error.message : 'Unknown extraction error',
        cause: error instanceof Error ? error : undefined,
        context: { clusterId: input.cluster.id },
      });
    }
  }

  /**
   * Process a hydrated cluster and extract narrative.
   */
  process(
    input: NarrativeExtractionInput,
    options: NarrativeExtractionOptions = {}
  ): ProcessorResult<NarrativeExtractionOutput> {
    const startTime = performance.now();
    const warnings: ProcessorWarning[] = [];

    const { cluster, persona } = input;
    const frameworkType = options.framework || input.framework || 'STAR';
    const frameworkDef = NARRATIVE_FRAMEWORKS[frameworkType];

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
      return {
        data: {
          narrative: null,
          participations,
        },
        diagnostics: this.buildDiagnostics(startTime, cluster, participations, null, frameworkType, options),
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

    // Step 3: Extract components based on framework
    const components = this.extractComponents(frameworkType, cluster.activities);

    // Step 4: Build participation summary
    const participationSummary = this.buildParticipationSummary(participations);

    // Step 5: Generate suggested edits
    const suggestedEdits = this.generateSuggestedEdits(components, frameworkDef.componentOrder, participationSummary);

    // Step 6: Calculate overall confidence
    const confidences = components.map((c) => c.confidence);
    const overallConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    // Step 7: Build narrative
    const narrative: GeneratedNarrative = {
      clusterId: cluster.id,
      framework: frameworkType,
      components,
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
      validation: this.validateNarrative(components, frameworkDef.componentOrder, gateResult),
    };

    // Step 8: Suggest alternative frameworks
    const alternativeFrameworks = this.suggestAlternativeFrameworks(components, frameworkType);

    return {
      data: {
        narrative,
        participations,
        alternativeFrameworks,
      },
      diagnostics: this.buildDiagnostics(startTime, cluster, participations, narrative, frameworkType, options),
      warnings,
      errors: [],
    };
  }

  // ===========================================================================
  // COMPONENT EXTRACTION
  // ===========================================================================

  private extractComponents(
    frameworkType: NarrativeFrameworkType,
    activities: HydratedActivity[]
  ): NarrativeComponent[] {
    const frameworkDef = NARRATIVE_FRAMEWORKS[frameworkType];
    const components: NarrativeComponent[] = [];

    for (const componentName of frameworkDef.componentOrder) {
      const component = this.extractComponent(componentName, activities);
      components.push(component);
    }

    return components;
  }

  private extractComponent(
    componentName: string,
    activities: HydratedActivity[]
  ): NarrativeComponent {
    // Get the pattern for this component type
    const pattern = COMPONENT_PATTERNS[componentName];

    if (!pattern) {
      // Fallback to generic extraction
      return this.extractGenericComponent(componentName, activities);
    }

    // Find activities matching this component pattern
    const candidates = activities.filter((a) => {
      const text = `${a.title} ${a.description || ''}`;
      return pattern.test(text);
    });

    if (candidates.length > 0) {
      // Sort by relevance (based on component type)
      const sorted = this.sortCandidates(candidates, componentName);
      const best = sorted[0];

      return {
        name: componentName,
        text: this.formatComponentText(componentName, sorted),
        sources: sorted.slice(0, 3).map((a) => a.id),
        confidence: this.calculateConfidence(sorted.length, activities.length, componentName),
      };
    }

    // Fallback: use tool-based extraction
    return this.extractByToolType(componentName, activities);
  }

  private extractGenericComponent(
    componentName: string,
    activities: HydratedActivity[]
  ): NarrativeComponent {
    // For unknown component types, use first activity
    if (activities.length > 0) {
      return {
        name: componentName,
        text: activities[0].description || activities[0].title,
        sources: [activities[0].id],
        confidence: CONFIDENCE.LOW,
      };
    }

    return {
      name: componentName,
      text: '',
      sources: [],
      confidence: 0,
    };
  }

  private sortCandidates(
    candidates: HydratedActivity[],
    componentName: string
  ): HydratedActivity[] {
    // Sort based on component type
    switch (componentName) {
      case 'situation':
      case 'context':
      case 'problem':
      case 'challenge':
        // Prefer earliest activities
        return candidates.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      case 'result':
      case 'learning':
      case 'example':
        // Prefer latest activities
        return candidates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      case 'action':
        // Prefer GitHub (PRs show actions)
        return candidates.sort((a, b) => {
          if (a.source === 'github' && b.source !== 'github') return -1;
          if (b.source === 'github' && a.source !== 'github') return 1;
          return 0;
        });

      case 'task':
      case 'objective':
        // Prefer Jira (tickets define tasks)
        return candidates.sort((a, b) => {
          if (a.source === 'jira' && b.source !== 'jira') return -1;
          if (b.source === 'jira' && a.source !== 'jira') return 1;
          return 0;
        });

      default:
        return candidates;
    }
  }

  private formatComponentText(
    componentName: string,
    activities: HydratedActivity[]
  ): string {
    const topActivities = activities.slice(0, 3);

    switch (componentName) {
      case 'action':
        // Combine action descriptions
        return topActivities
          .map((a) => {
            const desc = a.description ? `: ${a.description.slice(0, 100)}` : '';
            return `${a.title}${desc}`;
          })
          .join('. ');

      case 'result':
        // Use most recent result
        return topActivities[0]?.description || topActivities[0]?.title || '';

      case 'situation':
      case 'context':
      case 'problem':
      case 'challenge':
        // Use earliest context
        return topActivities[0]?.description || topActivities[0]?.title || '';

      case 'task':
      case 'objective':
        // Combine task descriptions
        return topActivities.map((a) => a.title).join('; ');

      case 'learning':
      case 'hindsight':
        // Use the learning text if available, otherwise synthesize
        const learningActivity = topActivities.find((a) =>
          COMPONENT_PATTERNS.learning?.test(`${a.title} ${a.description || ''}`)
        );
        if (learningActivity?.description) {
          return learningActivity.description;
        }
        // Synthesize a learning from the activities
        return `Key takeaways from working on ${topActivities.map((a) => a.title).join(', ')}`;

      default:
        return topActivities[0]?.description || topActivities[0]?.title || '';
    }
  }

  private extractByToolType(
    componentName: string,
    activities: HydratedActivity[]
  ): NarrativeComponent {
    // Map component types to preferred tool sources
    const toolPreferences: Record<string, string[]> = {
      situation: ['jira', 'confluence'],
      context: ['jira', 'confluence'],
      problem: ['jira', 'github'],
      challenge: ['jira', 'github'],
      task: ['jira', 'confluence'],
      objective: ['jira', 'confluence'],
      action: ['github', 'jira'],
      result: ['github', 'slack', 'jira'],
      learning: ['confluence', 'slack'],
      hindsight: ['confluence', 'slack'],
      obstacles: ['jira', 'slack'],
      example: ['github', 'jira'],
    };

    const preferredTools = toolPreferences[componentName] || ['jira', 'github'];

    for (const tool of preferredTools) {
      const toolActivities = activities.filter((a) => a.source === tool);
      if (toolActivities.length > 0) {
        const best = toolActivities[0];
        return {
          name: componentName,
          text: best.description || best.title,
          sources: [best.id],
          confidence: CONFIDENCE.MEDIUM,
        };
      }
    }

    // Last resort: use any activity
    if (activities.length > 0) {
      return {
        name: componentName,
        text: activities[0].title,
        sources: [activities[0].id],
        confidence: CONFIDENCE.LOW,
      };
    }

    return {
      name: componentName,
      text: '',
      sources: [],
      confidence: 0,
    };
  }

  private calculateConfidence(
    matchCount: number,
    totalActivities: number,
    componentName: string
  ): number {
    // Base confidence on match ratio
    const ratio = matchCount / totalActivities;

    // Adjust based on component type importance
    const importanceMultiplier: Record<string, number> = {
      situation: 1.0,
      context: 1.0,
      task: 0.9,
      objective: 0.9,
      action: 1.0,
      result: 1.1, // Slightly boost results
      learning: 0.8,
      hindsight: 0.7,
      challenge: 0.9,
      problem: 0.9,
    };

    const multiplier = importanceMultiplier[componentName] || 1.0;

    if (ratio >= 0.3) return Math.min(CONFIDENCE.HIGH * multiplier, 1.0);
    if (ratio >= 0.1) return CONFIDENCE.MEDIUM * multiplier;
    if (matchCount > 0) return CONFIDENCE.LOW * multiplier;
    return 0;
  }

  // ===========================================================================
  // VALIDATION & SUGGESTIONS
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

  private validateNarrative(
    components: NarrativeComponent[],
    expectedOrder: string[],
    gateResult: { passed: boolean; failedGates: string[] }
  ): STARValidationResult {
    const warnings: string[] = [];

    // Check component fill rate
    const filledComponents = components.filter((c) => c.text.length > 0).length;
    const minFilled = Math.max(2, Math.floor(expectedOrder.length * 0.5));

    if (filledComponents < minFilled) {
      warnings.push(`Only ${filledComponents}/${expectedOrder.length} components have content`);
    }

    // Check for low confidence
    const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
    if (avgConfidence < CONFIDENCE.MEDIUM) {
      warnings.push('Low confidence extraction - review carefully');
    }

    // Score based on confidence and completeness
    const score = Math.round(
      (avgConfidence * 50) + (filledComponents / expectedOrder.length * 50)
    );

    return {
      passed: gateResult.passed && filledComponents >= minFilled,
      score,
      failedGates: gateResult.failedGates,
      warnings,
    };
  }

  private generateSuggestedEdits(
    components: NarrativeComponent[],
    componentOrder: string[],
    participation: GeneratedNarrative['participationSummary']
  ): string[] {
    const edits: string[] = [];

    for (const component of components) {
      if (component.confidence < CONFIDENCE.MEDIUM) {
        const componentDef = this.getComponentDescription(component.name);
        edits.push(`Add more detail to ${component.name}: ${componentDef}`);
      }
    }

    if (participation.observerCount > participation.initiatorCount) {
      edits.push('Note: You were more observer than initiator. Consider highlighting your specific contributions.');
    }

    return edits;
  }

  private getComponentDescription(componentName: string): string {
    const descriptions: Record<string, string> = {
      situation: 'What was the context or background?',
      context: 'What were the circumstances or constraints?',
      task: 'What were you specifically asked to do?',
      objective: 'What measurable goal did you set?',
      challenge: 'What obstacle did you face?',
      problem: 'What technical problem needed solving?',
      action: 'What specific steps did you take?',
      result: 'What was the measurable outcome?',
      learning: 'What did you learn from this experience?',
      hindsight: 'What insight did you gain looking back?',
      obstacles: 'What blocked your progress?',
      example: 'Can you give a specific instance?',
    };

    return descriptions[componentName] || 'Add more detail.';
  }

  private suggestAlternativeFrameworks(
    components: NarrativeComponent[],
    currentFramework: NarrativeFrameworkType
  ): NarrativeFrameworkType[] {
    const alternatives: NarrativeFrameworkType[] = [];

    // Check if learning component has content
    const hasLearning = components.some((c) =>
      c.name === 'learning' && c.confidence >= CONFIDENCE.MEDIUM
    );

    // Check if result component is strong
    const hasStrongResult = components.some((c) =>
      c.name === 'result' && c.confidence >= CONFIDENCE.HIGH
    );

    // Suggest STARL/CARL if we have learning content
    if (hasLearning && currentFramework !== 'STARL' && currentFramework !== 'CARL') {
      alternatives.push('STARL');
    }

    // Suggest concise formats if story is simple
    const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
    if (avgConfidence >= CONFIDENCE.HIGH && currentFramework !== 'SAR' && currentFramework !== 'CAR') {
      alternatives.push('SAR'); // Suggest simpler format
    }

    // Suggest SOAR for business-oriented stories
    const hasObjective = components.some((c) => c.name === 'objective' && c.text.length > 0);
    if (hasObjective && currentFramework !== 'SOAR') {
      alternatives.push('SOAR');
    }

    return alternatives.filter((f) => f !== currentFramework).slice(0, 2);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private buildParticipationSummary(participations: ParticipationResult[]): GeneratedNarrative['participationSummary'] {
    return {
      initiatorCount: participations.filter((p) => p.level === 'initiator').length,
      contributorCount: participations.filter((p) => p.level === 'contributor').length,
      mentionedCount: participations.filter((p) => p.level === 'mentioned').length,
      observerCount: participations.filter((p) => p.level === 'observer').length,
    };
  }

  private buildDiagnostics(
    startTime: number,
    cluster: HydratedCluster,
    participations: ParticipationResult[],
    narrative: GeneratedNarrative | null,
    framework: NarrativeFrameworkType,
    options: NarrativeExtractionOptions
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
        narrativeGenerated: narrative ? 1 : 0,
        overallConfidence: narrative?.overallConfidence ?? 0,
        validationScore: narrative?.validation.score ?? 0,
        componentCount: narrative?.components.length ?? 0,
        suggestedEditCount: narrative?.suggestedEdits.length ?? 0,
      },
    };

    if (options.debug) {
      diagnostics.debug = {
        participations,
        componentConfidences: narrative?.components.reduce((acc, c) => {
          acc[c.name] = c.confidence;
          return acc;
        }, {} as Record<string, number>),
      };
    }

    return diagnostics;
  }
}

// Singleton instance
export const narrativeExtractor = new NarrativeExtractor();
