/**
 * Multi-Story Derivation Service
 *
 * Generates derivations from MULTIPLE stories (packets).
 * Supports: promotion, annual-review, skip-level, portfolio-brief, self-assessment, one-on-one.
 * Returns structured sections (parsed from LLM JSON) + flat text for backward compat.
 *
 * @module derivation-multi.service
 */

import { createCareerStoryService } from './career-story.service';
import { getModelSelector } from '../ai/model-selector.service';
import { buildPacketMessages, PacketStoryInput } from '../ai/prompts/derivation.prompt';
import type { WritingStyle } from '../ai/prompts/career-story.prompt';
import type { PacketType } from '../../controllers/career-stories.schemas';
import { getToolActivityTable } from '../../lib/demo-tables';
import { parseSectionsFromLLM, extractMetrics, formatDateRange } from './derivation.service';

// =============================================================================
// TYPES
// =============================================================================

export interface DerivePacketOptions {
  packetType?: PacketType;
  tone?: WritingStyle;
  customPrompt?: string;
  dateRange?: { startDate: string; endDate: string };
}

export interface DerivePacketResult {
  text: string;
  sections: Record<string, { summary: string }>;
  sectionOrder: string[];
  charCount: number;
  wordCount: number;
  metadata: {
    storyCount: number;
    model: string;
    processingTimeMs: number;
  };
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Generate a multi-story packet (promotion, annual-review, skip-level, etc.).
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
        } catch (err) {
          console.warn(`[derivation-multi] Failed to fetch date range for story ${s.id}:`, err);
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

  // 2b. For annual-review, filter to stories with activities in the date range
  let filteredInputs = storyInputs;
  if (options?.packetType === 'annual-review' && options.dateRange) {
    const rangeStart = new Date(options.dateRange.startDate);
    const rangeEnd = new Date(options.dateRange.endDate);

    const activityTable = getToolActivityTable(isDemoMode);
    const inRangeIndices: number[] = [];

    for (let i = 0; i < stories.length; i++) {
      const s = stories[i]!;
      if (!s.activityIds?.length) continue;
      try {
        const count = await (activityTable.count as Function)({
          where: {
            id: { in: s.activityIds },
            timestamp: { gte: rangeStart, lte: rangeEnd },
          },
        });
        if (count > 0) inRangeIndices.push(i);
      } catch (err) {
        console.warn(`[derivation-multi] Failed to count activities for story ${stories[i]!.id}, including anyway:`, err);
        inRangeIndices.push(i);
      }
    }

    if (inRangeIndices.length >= 2) {
      filteredInputs = inRangeIndices.map(i => storyInputs[i]);
    }
    // If fewer than 2 stories match, use all stories to avoid empty output
  }

  // 3. Build prompt
  const messages = buildPacketMessages(filteredInputs, {
    packetType: options?.packetType,
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

  // 5. Parse structured sections from LLM output
  const { sections, sectionOrder, text } = parseSectionsFromLLM(result.content.trim());
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  const processingTimeMs = Date.now() - startTime;

  return {
    text,
    sections,
    sectionOrder,
    charCount,
    wordCount,
    metadata: {
      storyCount: filteredInputs.length,
      model: result.model,
      processingTimeMs,
    },
  };
}
