/**
 * Unified LLM Input Builder
 *
 * Single function that all three generation paths call to build JournalEntryContent.
 * Eliminates the wizard/promote/regenerate divergence where the wizard forgot format7Data.
 *
 * Consumers:
 * - story-wizard.service.ts (wizard path)
 * - career-story.service.ts (promote path)
 * - career-story.service.ts (regenerate path)
 *
 * @see docs/plans/wizard-pipeline/2026-02-12-wizard-pipeline-gap-analysis.md §18 R1
 */

import type { JournalEntryContent, ExtractedContext } from '../ai/prompts/career-story.prompt';

interface JournalEntryData {
  title?: string | null;
  description?: string | null;
  fullContent?: string | null;
  category?: string | null;
  activityIds: string[];
  format7Data?: Record<string, any> | null;
}

export interface BuildLLMInputParams {
  journalEntry: JournalEntryData;
  extractedContext?: ExtractedContext;
}

/**
 * Build a JournalEntryContent from a journal entry + optional context.
 * Single source of truth for all generation paths.
 */
export function buildLLMInput(params: BuildLLMInputParams): JournalEntryContent {
  const { journalEntry, extractedContext } = params;
  const f7 = journalEntry.format7Data || {};

  // Extract phases from format7Data (prefer phases over legacy frameworkComponents)
  const phases = f7.phases?.map((p: any) => ({
    name: p.name,
    summary: p.summary,
    activityIds: p.activityIds || [],
  })) || f7.frameworkComponents?.map((c: any) => ({
    name: c.name,
    summary: c.content,
    activityIds: [] as string[],
  })) || null;

  // Extract impact highlights (prefer format7Data over wizard answer)
  const impactHighlights = f7.impactHighlights
    || f7.summary?.skills_demonstrated
    || (extractedContext?.metric ? [extractedContext.metric] : null);

  return {
    title: journalEntry.title || 'Untitled',
    description: journalEntry.description || null,
    fullContent: journalEntry.fullContent || null,
    category: journalEntry.category || null,
    dominantRole: f7.dominantRole || f7.context?.primary_focus || null,
    phases,
    impactHighlights,
    skills: f7.summary?.technologies_used || null,
    activityIds: journalEntry.activityIds,
  };
}
