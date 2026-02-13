/**
 * Story Source Service
 *
 * Reads, creates (user_note), and excludes/restores story sources.
 * Sources are included in story GET responses — no separate query needed.
 *
 * v1 scope: read, add user_note, exclude/restore via excludedAt.
 * v2 scope: edit annotation, edit content, reorder, reassign section.
 */

import { prisma } from '../../lib/prisma';

// Vague metric detection patterns
const VAGUE_PATTERNS = [
  { pattern: /significantly\s+(improved|reduced|increased|enhanced)/i, suggestion: 'Add specific numbers (e.g., "by 40%")' },
  { pattern: /greatly\s+(improved|reduced|enhanced|increased)/i, suggestion: 'Add specific numbers' },
  { pattern: /improved\s+\w+\s+(?!by\s+\d)/i, suggestion: 'Consider adding "by X%"' },
  { pattern: /reduced\s+\w+\s+(?!by\s+\d|from\s+\d)/i, suggestion: 'Consider adding "from X to Y"' },
  { pattern: /substantially\s+(improved|reduced|increased)/i, suggestion: 'Quantify the improvement' },
  { pattern: /dramatically\s+(improved|reduced|increased)/i, suggestion: 'Replace with specific numbers' },
];

export interface SourceCoverage {
  total: number;
  sourced: number;
  gaps: string[];
  vagueMetrics: Array<{
    sectionKey: string;
    match: string;
    suggestion: string;
  }>;
}

export interface StorySourceRow {
  id: string;
  storyId: string | null;
  derivationId: string | null;
  sectionKey: string;
  sourceType: string;
  activityId: string | null;
  label: string;
  content: string | null;
  url: string | null;
  annotation: string | null;
  toolType: string | null;
  role: string | null;
  questionId: string | null;
  sortOrder: number;
  excludedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class StorySourceService {
  /**
   * Get all sources for a story (included in story GET response).
   */
  async getSourcesForStory(storyId: string): Promise<StorySourceRow[]> {
    return prisma.storySource.findMany({
      where: { storyId },
      orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Compute source coverage for a story.
   * Returns total sections, sourced sections, gaps, and vague metrics.
   */
  computeCoverage(
    sources: StorySourceRow[],
    sections: Record<string, { summary?: string }>,
    sectionKeys: string[]
  ): SourceCoverage {
    const activeSources = sources.filter((s) => !s.excludedAt);
    const sourcedSections = new Set<string>();

    for (const source of activeSources) {
      if (source.sectionKey !== 'unassigned') {
        sourcedSections.add(source.sectionKey);
      }
    }

    const gaps = sectionKeys.filter((key) => !sourcedSections.has(key));

    // Detect vague metrics in section text
    const vagueMetrics: SourceCoverage['vagueMetrics'] = [];
    for (const key of sectionKeys) {
      const summary = sections[key]?.summary || '';
      for (const { pattern, suggestion } of VAGUE_PATTERNS) {
        const match = summary.match(pattern);
        if (match) {
          vagueMetrics.push({
            sectionKey: key,
            match: match[0],
            suggestion,
          });
          break; // One warning per section
        }
      }
    }

    return {
      total: sectionKeys.length,
      sourced: sourcedSections.size,
      gaps,
      vagueMetrics,
    };
  }

  /**
   * Create a user_note source for a story section.
   * v1: Only user_note type is creatable by users.
   */
  async createUserNote(
    storyId: string,
    sectionKey: string,
    content: string
  ): Promise<StorySourceRow> {
    // Get next sortOrder for this section
    const maxSort = await prisma.storySource.aggregate({
      where: { storyId, sectionKey },
      _max: { sortOrder: true },
    });

    return prisma.storySource.create({
      data: {
        storyId,
        sectionKey,
        sourceType: 'user_note',
        label: 'Your note',
        content,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  /**
   * Exclude or restore a source.
   * v1: Only excludedAt is patchable.
   */
  async updateExcludedAt(
    sourceId: string,
    storyId: string,
    excludedAt: Date | null
  ): Promise<StorySourceRow> {
    // Verify source belongs to the story before updating
    const source = await prisma.storySource.findFirst({
      where: { id: sourceId, storyId },
      select: { id: true },
    });
    if (!source) {
      throw new Error(`Source ${sourceId} not found for story ${storyId}`);
    }
    return prisma.storySource.update({
      where: { id: sourceId },
      data: { excludedAt },
    });
  }

  /**
   * Verify a source belongs to a story (ownership check).
   */
  async verifyOwnership(sourceId: string, storyId: string): Promise<boolean> {
    const source = await prisma.storySource.findFirst({
      where: { id: sourceId, storyId },
      select: { id: true },
    });
    return !!source;
  }

  // ===========================================================================
  // DERIVATION SOURCES
  // ===========================================================================

  /**
   * Get all sources for a derivation.
   */
  async getSourcesForDerivation(derivationId: string): Promise<StorySourceRow[]> {
    return prisma.storySource.findMany({
      where: { derivationId },
      orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Create a user_note source for a derivation section.
   */
  async createDerivationUserNote(
    derivationId: string,
    sectionKey: string,
    content: string
  ): Promise<StorySourceRow> {
    const maxSort = await prisma.storySource.aggregate({
      where: { derivationId, sectionKey },
      _max: { sortOrder: true },
    });

    return prisma.storySource.create({
      data: {
        derivationId,
        sectionKey,
        sourceType: 'user_note',
        label: 'Your note',
        content,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  /**
   * Exclude or restore a derivation source.
   */
  async updateDerivationExcludedAt(
    sourceId: string,
    derivationId: string,
    excludedAt: Date | null
  ): Promise<StorySourceRow> {
    const source = await prisma.storySource.findFirst({
      where: { id: sourceId, derivationId },
      select: { id: true },
    });
    if (!source) {
      throw new Error(`Source ${sourceId} not found for derivation ${derivationId}`);
    }
    return prisma.storySource.update({
      where: { id: sourceId },
      data: { excludedAt },
    });
  }

  /**
   * Verify a source belongs to a derivation (ownership check).
   */
  async verifyDerivationOwnership(sourceId: string, derivationId: string): Promise<boolean> {
    const source = await prisma.storySource.findFirst({
      where: { id: sourceId, derivationId },
      select: { id: true },
    });
    return !!source;
  }
}

export const storySourceService = new StorySourceService();
