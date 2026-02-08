/**
 * Multi-Story Derivation Service
 *
 * Generates ephemeral derivations from MULTIPLE stories.
 * Currently supports: promotion-packet.
 * No DB storage — generate, copy, done.
 *
 * @module derivation-multi.service
 */

import { createCareerStoryService } from './career-story.service';
import { getModelSelector } from '../ai/model-selector.service';
import { buildPacketMessages, PacketStoryInput } from '../ai/prompts/derivation.prompt';
import type { WritingStyle } from '../ai/prompts/career-story.prompt';
import { getToolActivityTable } from '../../lib/demo-tables';

// =============================================================================
// TYPES
// =============================================================================

export interface DerivePacketOptions {
  tone?: WritingStyle;
  customPrompt?: string;
}

export interface DerivePacketResult {
  text: string;
  charCount: number;
  wordCount: number;
  metadata: {
    storyCount: number;
    model: string;
    processingTimeMs: number;
  };
}

// =============================================================================
// METRIC EXTRACTION (same pattern as single-story)
// =============================================================================

const METRIC_PATTERN = /\d[\d,.]*\s*(?:%|x|ms|seconds?|minutes?|hours?|days?|weeks?|months?|users?|customers?|teams?|engineers?|endpoints?|requests?|incidents?|deployments?|PRs?)\b/gi;

function extractMetrics(text: string): string[] {
  const matches = text.match(METRIC_PATTERN);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.trim()))];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateRange(minDate: Date, maxDate: Date): string {
  const minMonth = MONTH_NAMES[minDate.getMonth()];
  const maxMonth = MONTH_NAMES[maxDate.getMonth()];
  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();

  if (minYear === maxYear && minDate.getMonth() === maxDate.getMonth()) {
    return `${minMonth} ${minYear}`;
  }
  return `${minMonth} ${minYear} – ${maxMonth} ${maxYear}`;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Generate a promotion packet from multiple stories.
 *
 * Fetches all stories, extracts metrics from each, builds combined context,
 * and calls LLM with larger token budget.
 */
export async function derivePacket(
  userId: string,
  storyIds: string[],
  isDemoMode: boolean,
  options?: DerivePacketOptions,
): Promise<DerivePacketResult> {
  const startTime = Date.now();

  // 1. Fetch all stories — verify ownership
  const storyService = createCareerStoryService(isDemoMode);
  const stories = await Promise.all(
    storyIds.map(id => storyService.getStoryById(id, userId)),
  );

  const missing = storyIds.filter((id, i) => !stories[i]);
  if (missing.length > 0) {
    throw new Error(`Stories not found: ${missing.join(', ')}`);
  }

  // 2. Build story inputs with metrics and date ranges
  const storyInputs: PacketStoryInput[] = await Promise.all(
    stories.map(async (story) => {
      const s = story!;
      const sections = s.sections as Record<string, { summary: string }>;
      const allText = Object.values(sections).map(sec => sec.summary || '').join(' ');
      const metrics = extractMetrics(allText);

      // Get date range from activities
      let dateRange: string | undefined;
      if (s.activityIds?.length > 0) {
        try {
          const activityTable = getToolActivityTable(isDemoMode);
          const result = await (activityTable.aggregate as Function)({
            where: { id: { in: s.activityIds } },
            _min: { timestamp: true },
            _max: { timestamp: true },
          });
          if (result._min.timestamp && result._max.timestamp) {
            dateRange = formatDateRange(result._min.timestamp, result._max.timestamp);
          }
        } catch {
          // Supplementary — don't fail
        }
      }

      return {
        title: s.title,
        framework: s.framework,
        sections,
        metrics: metrics.length > 0 ? metrics.join(', ') : undefined,
        dateRange,
      };
    }),
  );

  // 3. Build prompt
  const messages = buildPacketMessages(storyInputs, {
    tone: options?.tone,
    customPrompt: options?.customPrompt,
  });

  // 4. Execute LLM call with larger token budget
  const modelSelector = getModelSelector();
  if (!modelSelector) {
    throw new Error('LLM service not available');
  }

  const result = await modelSelector.executeTask('derive', messages, 'balanced', {
    maxTokens: 1500,
    temperature: 0.7,
  });

  // 5. Compute output metrics
  const text = result.content.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  const processingTimeMs = Date.now() - startTime;

  return {
    text,
    charCount,
    wordCount,
    metadata: {
      storyCount: storyIds.length,
      model: result.model,
      processingTimeMs,
    },
  };
}
