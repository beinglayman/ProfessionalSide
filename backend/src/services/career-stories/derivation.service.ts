/**
 * Derivation Service
 *
 * Generates audience-specific derivations from career stories.
 * Returns structured sections (parsed from LLM JSON) + flat text for backward compat.
 *
 * @module derivation.service
 */

import { createCareerStoryService } from './career-story.service';
import { getModelSelector } from '../ai/model-selector.service';
import { buildDerivationMessages, DerivationPromptParams } from '../ai/prompts/derivation.prompt';
import type { DerivationType } from '../../controllers/career-stories.schemas';
import type { WritingStyle } from '../ai/prompts/career-story.prompt';
import { storySourceService } from './story-source.service';
import { getToolActivityTable } from '../../lib/demo-tables';

// =============================================================================
// TYPES
// =============================================================================

export interface DeriveOptions {
  tone?: WritingStyle;
  customPrompt?: string;
}

export interface DeriveResult {
  text: string;
  sections: Record<string, { summary: string }>;
  sectionOrder: string[];
  charCount: number;
  wordCount: number;
  speakingTimeSec?: number;
  metadata: {
    derivation: DerivationType;
    framework: string;
    archetype: string | null;
    model: string;
    processingTimeMs: number;
  };
}

// =============================================================================
// JSON SECTION PARSING
// =============================================================================

interface LLMSection { key: string; title: string; content: string; }

/**
 * Parse structured sections from LLM output.
 * Expects JSON: {"sections": [{"key": "...", "title": "...", "content": "..."}]}
 * Falls back to flat text wrapped in a single "content" section.
 */
export function parseSectionsFromLLM(raw: string): {
  sections: Record<string, { summary: string }>;
  sectionOrder: string[];
  text: string;
} {
  try {
    // Strip markdown code fences (```json, ```JSON, ```). LLMs sometimes wrap output in fences.
    const cleaned = raw.replace(/^```[jJ][sS][oO][nN]?\s*\n?|\n?\s*```\s*$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.sections && Array.isArray(parsed.sections)) {
      const sections: Record<string, { summary: string }> = {};
      const sectionOrder: string[] = [];
      const textParts: string[] = [];

      for (const sec of parsed.sections as LLMSection[]) {
        sections[sec.key] = { summary: sec.content };
        sectionOrder.push(sec.key);
        textParts.push(`**${sec.title}**\n${sec.content}`);
      }

      return { sections, sectionOrder, text: textParts.join('\n\n') };
    }
  } catch (err) {
    // JSON parse failed — fall back to flat text. Log for observability.
    console.warn('[derivation] Failed to parse LLM JSON sections, using flat text fallback:', (err as Error).message);
  }

  // Fallback: entire response is flat text, single "content" section
  return {
    sections: { content: { summary: raw } },
    sectionOrder: ['content'],
    text: raw,
  };
}

// =============================================================================
// METRIC EXTRACTION
// =============================================================================

export const METRIC_PATTERN = /\d[\d,.]*\s*(?:%|x|ms|seconds?|minutes?|hours?|days?|weeks?|months?|users?|customers?|teams?|engineers?|endpoints?|requests?|incidents?|deployments?|PRs?)\b/gi;

export function extractMetrics(text: string): string[] {
  const matches = text.match(METRIC_PATTERN);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches.map(m => m.trim()))];
}

// =============================================================================
// DATE RANGE EXTRACTION
// =============================================================================

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateRange(minDate: Date, maxDate: Date): string {
  const minMonth = MONTH_NAMES[minDate.getMonth()];
  const maxMonth = MONTH_NAMES[maxDate.getMonth()];
  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();

  if (minYear === maxYear && minDate.getMonth() === maxDate.getMonth()) {
    return `${minMonth} ${minYear}`;
  }
  return `${minMonth} ${minYear} – ${maxMonth} ${maxYear}`;
}

async function getDateRangeForActivities(activityIds: string[], isDemoMode: boolean): Promise<string | undefined> {
  if (!activityIds || activityIds.length === 0) return undefined;

  try {
    const activityTable = getToolActivityTable(isDemoMode);
    const result = await (activityTable.aggregate as Function)({
      where: { id: { in: activityIds } },
      _min: { timestamp: true },
      _max: { timestamp: true },
    });

    if (result._min.timestamp && result._max.timestamp) {
      return formatDateRange(result._min.timestamp, result._max.timestamp);
    }
  } catch {
    // Date range is supplementary — don't fail if unavailable
  }
  return undefined;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Derive a story into an audience-specific format.
 *
 * Provides the full bill of materials to the LLM:
 * - Title, framework, all section summaries
 * - Archetype, extracted metrics
 * - Activity count, source count
 */
export async function deriveStory(
  storyId: string,
  userId: string,
  derivation: DerivationType,
  isDemoMode: boolean,
  options?: DeriveOptions,
): Promise<DeriveResult> {
  const startTime = Date.now();

  // 1. Fetch story
  const storyService = createCareerStoryService(isDemoMode);
  const story = await storyService.getStoryById(storyId, userId);
  if (!story) {
    throw new Error('Story not found');
  }

  // 2. Gather full bill of materials
  const storySections = story.sections as Record<string, { summary: string }>;
  const allText = Object.values(storySections).map(s => s.summary || '').join(' ');
  const metrics = extractMetrics(allText);

  // Get source count and date range for context
  let sourceCount = 0;
  try {
    const sources = await storySourceService.getSourcesForStory(storyId);
    sourceCount = sources.filter(s => !s.excludedAt).length;
  } catch {
    // Sources are supplementary — don't fail if unavailable
  }

  const dateRange = await getDateRangeForActivities(story.activityIds, isDemoMode);

  // 3. Build prompt with complete context
  const promptParams: DerivationPromptParams = {
    title: story.title,
    framework: story.framework,
    sections: storySections,
    archetype: story.archetype || null,
    tone: options?.tone,
    customPrompt: options?.customPrompt,
    metrics: metrics.length > 0 ? metrics.join(', ') : undefined,
    activityCount: story.activityIds?.length || 0,
    sourceCount,
    dateRange,
  };

  const messages = buildDerivationMessages(derivation, promptParams);

  // 4. Execute LLM call
  const modelSelector = getModelSelector();
  if (!modelSelector) {
    throw new Error('LLM service not available');
  }

  const result = await modelSelector.executeTask('derive', messages, 'balanced', {
    maxTokens: 500,
    temperature: 0.7,
  });

  // 5. Parse structured sections from LLM output
  const { sections, sectionOrder, text } = parseSectionsFromLLM(result.content.trim());
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  // Speaking time only for formats meant to be spoken
  let speakingTimeSec: number | undefined;
  if (derivation === 'interview' || derivation === 'one-on-one') {
    speakingTimeSec = Math.round((wordCount / 150) * 60);
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    text,
    sections,
    sectionOrder,
    charCount,
    wordCount,
    speakingTimeSec,
    metadata: {
      derivation,
      framework: story.framework,
      archetype: story.archetype || null,
      model: result.model,
      processingTimeMs,
    },
  };
}
