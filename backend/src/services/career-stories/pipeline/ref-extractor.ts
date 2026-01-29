/**
 * RefExtractor - Pipeline Processor
 *
 * Extracts cross-tool references from text with full diagnostics.
 *
 * Lifecycle:
 * 1. validate() - Ensure patterns are registered correctly
 * 2. process(input, options) - Extract refs with diagnostics
 *
 * Features:
 * - Pattern self-validation with examples
 * - Rich diagnostics (what matched, where, why)
 * - Debug mode with near-miss detection
 * - Backward-compatible API
 */

import {
  PipelineProcessor,
  ProcessorResult,
  ProcessorDiagnostics,
  ProcessorWarning,
  ProcessorError,
  RefExtractionInput,
  RefExtractionOutput,
  RefExtractionOptions,
  PatternMatch,
  PatternAnalysis,
  ConfidenceLevel,
} from './types';
import { PatternRegistry, patternRegistry } from './pattern-registry';

export class RefExtractor
  implements
    PipelineProcessor<RefExtractionInput, RefExtractionOutput, RefExtractionOptions>
{
  readonly name = 'RefExtractor';
  readonly version = '2.0.0';

  private registry: PatternRegistry;

  constructor(registry: PatternRegistry = patternRegistry) {
    this.registry = registry;
  }

  /**
   * Validate the processor is correctly configured
   */
  validate(): void {
    const errors = this.registry.getValidationErrors();
    if (errors.length > 0) {
      throw new Error(
        `RefExtractor validation failed:\n` +
          errors.map((e) => `  - [${e.patternId}] ${e.message}`).join('\n')
      );
    }

    const patterns = this.registry.getActivePatterns();
    if (patterns.length === 0) {
      throw new Error('RefExtractor has no registered patterns');
    }
  }

  /**
   * Process input and extract refs with full diagnostics
   */
  process(
    input: RefExtractionInput,
    options: RefExtractionOptions = {}
  ): ProcessorResult<RefExtractionOutput> {
    const startTime = performance.now();
    const warnings: ProcessorWarning[] = [];
    const errors: ProcessorError[] = [];

    // Combine all text sources
    const texts = [...input.texts];
    if (options.includeSourceUrl && input.sourceUrl) {
      texts.push(input.sourceUrl);
    }

    const combinedText = texts.filter(Boolean).join('\n');

    if (!combinedText) {
      return this.emptyResult(startTime, options);
    }

    // Select patterns based on options
    const patterns = this.selectPatterns(options);

    if (patterns.length === 0) {
      warnings.push({
        code: 'NO_PATTERNS',
        message: 'No patterns match the specified filters',
        context: { options },
      });
      return this.emptyResult(startTime, options, warnings);
    }

    // Extract matches
    const allMatches: PatternMatch[] = [];
    const patternAnalysis: PatternAnalysis[] = [];

    for (const pattern of patterns) {
      try {
        pattern.regex.lastIndex = 0;
        const matches = Array.from(combinedText.matchAll(pattern.regex));

        if (matches.length === 0) {
          patternAnalysis.push({
            patternId: pattern.id,
            matchCount: 0,
            noMatchReason: 'regex-no-match',
            nearMisses: options.debug
              ? this.findNearMisses(combinedText, pattern.id)
              : undefined,
          });
          continue;
        }

        patternAnalysis.push({
          patternId: pattern.id,
          matchCount: matches.length,
        });

        for (const match of matches) {
          const ref = pattern.normalizeMatch(match);
          allMatches.push({
            ref,
            patternId: pattern.id,
            confidence: pattern.confidence,
            location: {
              start: match.index!,
              end: match.index! + match[0].length,
              context: this.extractContext(combinedText, match.index!, 40),
            },
            rawMatch: match[0],
          });
        }
      } catch (error) {
        errors.push({
          code: 'PATTERN_ERROR',
          message: `Pattern ${pattern.id} threw error: ${error}`,
          recoverable: true,
          context: { patternId: pattern.id },
        });
      }
    }

    // Deduplicate refs
    const seenRefs = new Set<string>();
    const uniqueRefs: string[] = [];
    const uniqueMatches: PatternMatch[] = [];

    for (const match of allMatches) {
      if (!seenRefs.has(match.ref)) {
        seenRefs.add(match.ref);
        uniqueRefs.push(match.ref);
        uniqueMatches.push(match);
      }
    }

    const processingTimeMs = performance.now() - startTime;

    const diagnostics: ProcessorDiagnostics = {
      processor: this.name,
      processingTimeMs,
      inputMetrics: {
        textCount: texts.length,
        totalLength: combinedText.length,
      },
      outputMetrics: {
        refCount: uniqueRefs.length,
        matchCount: allMatches.length,
        patternsMatched: patternAnalysis.filter((a) => a.matchCount > 0).length,
      },
    };

    if (options.debug) {
      diagnostics.debug = {
        patternAnalysis,
        patternsAttempted: patterns.map((p) => p.id),
        textPreview: combinedText.substring(0, 500),
      };
    }

    return {
      data: {
        refs: uniqueRefs,
        matches: uniqueMatches,
        patternAnalysis,
      },
      diagnostics,
      warnings,
      errors,
    };
  }

  // ===========================================================================
  // BACKWARD-COMPATIBLE API
  // ===========================================================================

  /**
   * Simple extraction - returns just refs (backward compatible)
   */
  extractRefs(text: string): string[] {
    const result = this.process({ texts: [text] });
    return result.data.refs;
  }

  /**
   * Extract from multiple texts (backward compatible)
   */
  extractRefsFromMultiple(texts: (string | null | undefined)[]): string[] {
    const result = this.process({ texts });
    return result.data.refs;
  }

  /**
   * Extract from object by JSON stringifying (backward compatible)
   */
  extractRefsFromObject(obj: unknown): string[] {
    if (!obj) return [];
    const result = this.process({ texts: [JSON.stringify(obj)] });
    return result.data.refs;
  }

  /**
   * Extract from activity-like object with all sources
   */
  extractFromActivity(
    activity: {
      title?: string | null;
      description?: string | null;
      sourceUrl?: string | null;
      rawData?: Record<string, unknown> | null;
    },
    options: RefExtractionOptions = {}
  ): ProcessorResult<RefExtractionOutput> {
    const texts: (string | null | undefined)[] = [
      activity.title,
      activity.description,
      activity.rawData ? JSON.stringify(activity.rawData) : null,
    ];

    return this.process(
      {
        texts,
        sourceUrl: activity.sourceUrl,
      },
      {
        ...options,
        includeSourceUrl: options.includeSourceUrl ?? true, // Default to true for activities
      }
    );
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private selectPatterns(options: RefExtractionOptions) {
    let patterns = this.registry.getActivePatterns();

    if (options.patternIds) {
      const allowed = new Set(options.patternIds);
      patterns = patterns.filter((p) => allowed.has(p.id));
    }

    if (options.toolTypes) {
      const allowed = new Set(options.toolTypes);
      patterns = patterns.filter((p) => allowed.has(p.toolType));
    }

    if (options.minConfidence) {
      const levels: Record<ConfidenceLevel, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };
      const minLevel = levels[options.minConfidence];
      patterns = patterns.filter((p) => levels[p.confidence] >= minLevel);
    }

    return patterns;
  }

  private extractContext(text: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    let context = text.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context.replace(/\n/g, ' '); // Flatten newlines
  }

  private findNearMisses(text: string, patternId: string): string[] {
    const nearMisses: string[] = [];

    // Pattern-specific near-miss detection
    if (patternId.includes('jira')) {
      // Look for lowercase ticket-like patterns
      const lowerMatches = text.match(/\b[a-z]{2,10}-\d+\b/gi) || [];
      nearMisses.push(
        ...lowerMatches.filter((m) => m !== m.toUpperCase()).slice(0, 3)
      );
    }

    if (patternId.includes('github')) {
      // Look for bare numbers that might be PR refs
      const bareNumbers = text.match(/\b\d{1,5}\b/g) || [];
      if (bareNumbers.length > 0 && bareNumbers.length < 10) {
        nearMisses.push(`Possible PR numbers without #: ${bareNumbers.slice(0, 3).join(', ')}`);
      }
    }

    return nearMisses;
  }

  private emptyResult(
    startTime: number,
    options: RefExtractionOptions,
    warnings: ProcessorWarning[] = []
  ): ProcessorResult<RefExtractionOutput> {
    return {
      data: {
        refs: [],
        matches: [],
        patternAnalysis: [],
      },
      diagnostics: {
        processor: this.name,
        processingTimeMs: performance.now() - startTime,
        inputMetrics: { textCount: 0, totalLength: 0 },
        outputMetrics: { refCount: 0, matchCount: 0, patternsMatched: 0 },
        ...(options.debug && { debug: { reason: 'empty-input' } }),
      },
      warnings,
      errors: [],
    };
  }
}

// Singleton instance for convenience
export const refExtractor = new RefExtractor();
