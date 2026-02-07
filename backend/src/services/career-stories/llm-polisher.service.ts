/**
 * LLMPolisherService - Polishes STAR narratives using Azure OpenAI GPT-4o-mini
 *
 * Takes a draft STAR and improves the prose of each component
 * while preserving the original facts and meaning.
 *
 * Features:
 * - Parallel component polishing (4x speedup)
 * - Uses existing ModelSelectorService for Azure OpenAI
 * - Returns original text if LLM fails
 * - Explicit status for all outcomes (no hidden failures)
 */

import { ok, err, Result } from 'neverthrow';
import { DraftSTAR, STARComponent, PolishError, ScoredSTAR } from './pipeline/types';
import type { ChatCompletionMessageParam } from 'openai/resources/index';

// Type for ModelSelectorService - avoid importing to prevent initialization at import time
interface IModelSelectorService {
  executeTask(
    task: string,
    messages: ChatCompletionMessageParam[],
    quality?: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; model: string; estimatedCost: number }>;
}

/**
 * Polish status - explicit outcome of polish operation.
 * Replaces boolean 'polished' flag for clarity.
 */
export type PolishStatus =
  | 'not_requested'  // Polish was not requested in options
  | 'not_configured' // Azure OpenAI not configured
  | 'success'        // Polish successfully applied (renamed from 'applied' for frontend compatibility)
  | 'applied'        // Alias for 'success'
  | 'skipped'        // Text too short or empty
  | 'failed'         // LLM error (timeout, rate limit, etc.)
  | 'no_improvement'; // LLM returned same or empty text

/**
 * Result of polishing a single STAR component.
 */
export interface PolishResult {
  /** Status of this component's polish */
  status: PolishStatus;
  /** Original component */
  original: STARComponent;
  /** Improved component (same as original if polish failed) */
  improved: STARComponent;
  /** Reason if polish failed or skipped */
  reason?: string;
}

/**
 * Result of polishing an entire STAR.
 */
export interface PolishedSTAR {
  situation: PolishResult;
  task: PolishResult;
  action: PolishResult;
  result: PolishResult;
  /** Overall status (applied if any component was polished) */
  status: PolishStatus;
  /** Reason if entire polish failed */
  reason?: string;
}

/**
 * Result of polishIfConfigured - safe wrapper for pipeline.
 */
export interface PolishOutcome {
  star: ScoredSTAR;
  status: PolishStatus;
  reason?: string;
}

export class LLMPolisherService {
  private modelSelector: IModelSelectorService | null = null;
  private readonly MAX_TOKENS = 500;
  private readonly MIN_TEXT_LENGTH = 10;

  /**
   * Create LLMPolisherService.
   * @param modelSelector - Pre-configured ModelSelectorService (for DI/testing)
   */
  constructor(modelSelector?: IModelSelectorService | null) {
    if (modelSelector) {
      this.modelSelector = modelSelector;
    } else {
      // Try to initialize ModelSelectorService lazily - it will throw if not configured
      try {
        // Dynamic require to avoid module initialization at import time
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ModelSelectorService } = require('../ai/model-selector.service');
        this.modelSelector = new ModelSelectorService();
      } catch (error) {
        console.warn('LLMPolisherService: Azure OpenAI not configured, polish disabled');
        this.modelSelector = null;
      }
    }
  }

  /**
   * Polish a STAR if the service is configured.
   * Safe wrapper that never throws - always returns a result.
   * Use this in pipeline for graceful degradation.
   */
  async polishIfConfigured(star: ScoredSTAR): Promise<PolishOutcome> {
    if (!this.modelSelector) {
      return {
        star,
        status: 'not_configured',
        reason: 'Azure OpenAI not configured',
      };
    }

    const polishResult = await this.safePolish(star);

    if (polishResult.isErr()) {
      return {
        star,
        status: 'failed',
        reason: polishResult.error.message,
      };
    }

    const polished = polishResult.value;

    if (polished.status !== 'applied' && polished.status !== 'success') {
      return {
        star,
        status: polished.status,
        reason: polished.reason,
      };
    }

    // Apply polished text to STAR components
    return {
      star: {
        ...star,
        situation: polished.situation.improved,
        task: polished.task.improved,
        action: polished.action.improved,
        result: polished.result.improved,
      },
      status: 'success',
    };
  }

  /**
   * Polish all STAR components in parallel.
   * Returns Result type for explicit error handling.
   */
  async safePolish(
    star: DraftSTAR
  ): Promise<Result<PolishedSTAR, PolishError>> {
    if (!this.modelSelector) {
      return err({
        code: 'NOT_CONFIGURED',
        message: 'Azure OpenAI not configured',
      });
    }

    try {
      const result = await this.polish(star);
      return ok(result);
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      return err({
        code: errorCode,
        message: error instanceof Error ? error.message : 'Unknown polish error',
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Polish all STAR components in parallel.
   */
  async polish(star: DraftSTAR): Promise<PolishedSTAR> {
    if (!this.modelSelector) {
      return this.fallbackResult(star, 'not_configured', 'Azure OpenAI not configured');
    }

    try {
      const [situation, task, action, result] = await Promise.all([
        this.polishComponent('situation', star.situation),
        this.polishComponent('task', star.task),
        this.polishComponent('action', star.action),
        this.polishComponent('result', star.result),
      ]);

      const anyApplied =
        situation.status === 'applied' || situation.status === 'success' ||
        task.status === 'applied' || task.status === 'success' ||
        action.status === 'applied' || action.status === 'success' ||
        result.status === 'applied' || result.status === 'success';

      const allFailed =
        situation.status === 'failed' &&
        task.status === 'failed' &&
        action.status === 'failed' &&
        result.status === 'failed';

      return {
        situation,
        task,
        action,
        result,
        status: allFailed ? 'failed' : anyApplied ? 'success' : 'no_improvement',
        reason: allFailed ? situation.reason : undefined,
      };
    } catch (error) {
      const reason = this.getErrorMessage(error);
      return this.fallbackResult(star, 'failed', reason);
    }
  }

  /**
   * Map error to appropriate error code.
   */
  private getErrorCode(error: unknown): PolishError['code'] {
    if (error instanceof Error) {
      if (error.name === 'AbortError') return 'LLM_TIMEOUT';
      if (error.message.includes('timeout')) return 'LLM_TIMEOUT';
    }
    return 'LLM_ERROR';
  }

  /**
   * Polish a single STAR component.
   */
  private async polishComponent(
    type: string,
    component: STARComponent
  ): Promise<PolishResult> {
    // Skip if text is too short
    if (!component.text || component.text.length < this.MIN_TEXT_LENGTH) {
      return {
        status: 'skipped',
        original: component,
        improved: component,
        reason: 'Text too short to polish',
      };
    }

    // Skip if component has no confidence (empty extraction)
    if (component.confidence === 0) {
      return {
        status: 'skipped',
        original: component,
        improved: component,
        reason: 'Empty component',
      };
    }

    const messages = this.buildMessages(type, component.text);

    try {
      const response = await this.modelSelector!.executeTask(
        'summarize', // Use 'summarize' task type - quick model is sufficient
        messages,
        'quick',
        { maxTokens: this.MAX_TOKENS, temperature: 0.7 }
      );

      const improvedText = response.content.trim();

      // If LLM returned empty or same text, don't mark as polished
      if (!improvedText || improvedText === component.text) {
        return {
          status: 'no_improvement',
          original: component,
          improved: component,
          reason: 'LLM returned no improvement',
        };
      }

      return {
        status: 'success',
        original: component,
        improved: {
          ...component,
          text: improvedText,
        },
      };
    } catch (error) {
      return {
        status: 'failed',
        original: component,
        improved: component,
        reason: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Build messages for polish request.
   */
  private buildMessages(type: string, text: string): ChatCompletionMessageParam[] {
    const componentGuidelines: Record<string, string> = {
      situation: 'Focus on the business context and problem. What was at stake?',
      task: 'Clarify what specifically needed to be accomplished.',
      action: 'Highlight the technical approach and your individual contributions.',
      result: 'Quantify the impact where possible (metrics, time saved, etc.).',
    };

    const guideline = componentGuidelines[type] || '';

    const systemPrompt = `You polish stories like Carmine Gallo coaches TED speakers — make every sentence land in 10 seconds, cut anything the audience won't remember.
Improve the ${type.toUpperCase()} component of a STAR story for clarity and impact.
Keep the same facts and meaning, but make it flow naturally and sound professional.
Keep it concise (1-3 sentences).
${guideline}
Return ONLY the improved text, no explanation or quotes.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ];
  }

  /**
   * Create fallback result when polish fails entirely.
   */
  private fallbackResult(
    star: DraftSTAR,
    status: PolishStatus,
    reason: string
  ): PolishedSTAR {
    return {
      situation: {
        status,
        original: star.situation,
        improved: star.situation,
        reason,
      },
      task: {
        status,
        original: star.task,
        improved: star.task,
        reason,
      },
      action: {
        status,
        original: star.action,
        improved: star.action,
        reason,
      },
      result: {
        status,
        original: star.result,
        improved: star.result,
        reason,
      },
      status,
      reason,
    };
  }

  /**
   * Extract error message from unknown error.
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return 'LLM request timed out';
      }
      return error.message;
    }
    return 'Unknown error';
  }

  /**
   * Check if the service is configured and ready.
   */
  isConfigured(): boolean {
    return this.modelSelector !== null;
  }
}

// Singleton instance - lazy initialization to avoid startup errors
let _instance: LLMPolisherService | null = null;

export const llmPolisherService = new Proxy({} as LLMPolisherService, {
  get(_, prop) {
    if (!_instance) {
      _instance = new LLMPolisherService();
    }
    return (_instance as any)[prop];
  },
});
