/**
 * LLMPolisherService - Polishes STAR narratives using Claude 3 Haiku
 *
 * Takes a draft STAR and improves the prose of each component
 * while preserving the original facts and meaning.
 *
 * Features:
 * - Parallel component polishing (4x speedup)
 * - 5-second timeout with graceful fallback
 * - Returns original text if LLM fails
 * - Explicit status for all outcomes (no hidden failures)
 */

import Anthropic from '@anthropic-ai/sdk';
import { ok, err, Result } from 'neverthrow';
import { DraftSTAR, STARComponent, PolishError, ScoredSTAR } from './pipeline/types';

/**
 * Polish status - explicit outcome of polish operation.
 * Replaces boolean 'polished' flag for clarity.
 */
export type PolishStatus =
  | 'not_requested'  // Polish was not requested in options
  | 'not_configured' // ANTHROPIC_API_KEY not set
  | 'applied'        // Polish successfully applied
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

/**
 * Factory function type for creating Anthropic clients.
 * Allows injection of configured clients for testing.
 */
export type AnthropicClientFactory = (apiKey: string) => Anthropic;

/**
 * Default factory - creates real Anthropic client.
 */
const defaultClientFactory: AnthropicClientFactory = (apiKey) =>
  new Anthropic({ apiKey });

export class LLMPolisherService {
  private client: Anthropic | null = null;
  private readonly MODEL = 'claude-3-haiku-20240307';
  private readonly MAX_TOKENS = 500;
  private readonly TIMEOUT_MS = 5000;
  private readonly MIN_TEXT_LENGTH = 10;

  /**
   * Create LLMPolisherService.
   * @param client - Pre-configured Anthropic client (preferred for DI)
   * @param apiKey - API key (falls back to ANTHROPIC_API_KEY env var)
   * @param clientFactory - Factory for creating client from key (for testing)
   */
  constructor(
    client?: Anthropic | null,
    apiKey?: string,
    clientFactory: AnthropicClientFactory = defaultClientFactory
  ) {
    if (client) {
      this.client = client;
    } else {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (key) {
        this.client = clientFactory(key);
      }
    }
  }

  /**
   * Polish a STAR if the service is configured.
   * Safe wrapper that never throws - always returns a result.
   * Use this in pipeline for graceful degradation.
   */
  async polishIfConfigured(star: ScoredSTAR): Promise<PolishOutcome> {
    if (!this.client) {
      return {
        star,
        status: 'not_configured',
        reason: 'ANTHROPIC_API_KEY not configured',
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

    if (polished.status !== 'applied') {
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
      status: 'applied',
    };
  }

  /**
   * Polish all STAR components in parallel.
   * Returns Result type for explicit error handling.
   */
  async safePolish(
    star: DraftSTAR
  ): Promise<Result<PolishedSTAR, PolishError>> {
    if (!this.client) {
      return err({
        code: 'NOT_CONFIGURED',
        message: 'ANTHROPIC_API_KEY not configured',
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
    if (!this.client) {
      return this.fallbackResult(star, 'not_configured', 'ANTHROPIC_API_KEY not configured');
    }

    try {
      const [situation, task, action, result] = await Promise.all([
        this.polishComponent('situation', star.situation),
        this.polishComponent('task', star.task),
        this.polishComponent('action', star.action),
        this.polishComponent('result', star.result),
      ]);

      const anyApplied =
        situation.status === 'applied' ||
        task.status === 'applied' ||
        action.status === 'applied' ||
        result.status === 'applied';

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
        status: allFailed ? 'failed' : anyApplied ? 'applied' : 'no_improvement',
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

    const prompt = this.buildPrompt(type, component.text);

    try {
      const response = await this.callWithTimeout(prompt);
      const improvedText = this.extractText(response);

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
        status: 'applied',
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
   * Call LLM with timeout.
   */
  private async callWithTimeout(
    prompt: string
  ): Promise<Anthropic.Message> {
    if (!this.client) {
      throw new Error('LLM client not initialized');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await this.client.messages.create(
        {
          model: this.MODEL,
          max_tokens: this.MAX_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal }
      );

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build polish prompt for a component type.
   */
  private buildPrompt(type: string, text: string): string {
    const componentGuidelines: Record<string, string> = {
      situation: 'Focus on the business context and problem. What was at stake?',
      task: 'Clarify what specifically needed to be accomplished.',
      action: 'Highlight the technical approach and your individual contributions.',
      result: 'Quantify the impact where possible (metrics, time saved, etc.).',
    };

    const guideline = componentGuidelines[type] || '';

    return `You are a career coach helping someone prepare for job interviews.

Improve this ${type.toUpperCase()} component of a STAR story for clarity and impact.
Keep the same facts and meaning, but make it flow naturally and sound professional.
Keep it concise (1-3 sentences).

${guideline}

Original text:
${text}

Improved version (just the text, no explanation):`;
  }

  /**
   * Extract text from LLM response.
   */
  private extractText(response: Anthropic.Message): string {
    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return '';
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
    return this.client !== null;
  }
}

// Singleton instance
export const llmPolisherService = new LLMPolisherService();
