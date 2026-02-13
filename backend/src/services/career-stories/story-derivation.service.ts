/**
 * Story Derivation Service
 *
 * Persists generated derivations (single-story "Share As" and multi-story "Build Packet").
 * Each generation is auto-saved for history and credit tracking.
 *
 * @module story-derivation.service
 */

import { prisma } from '../../lib/prisma';
import { getToolActivityTable } from '../../lib/demo-tables';

// =============================================================================
// TYPES
// =============================================================================

export interface StorySnapshot {
  storyId: string;
  title: string;
  generatedAt: string | null;
  dateRange?: { earliest: string; latest: string } | null; // activity date range
}

export interface SaveDerivationInput {
  userId: string;
  kind: 'single' | 'packet';
  type: string;
  storyIds: string[];
  storySnapshots?: StorySnapshot[];
  text: string;
  sections?: Record<string, { summary: string }> | null;
  sectionOrder?: string[];
  charCount: number;
  wordCount: number;
  speakingTimeSec?: number;
  tone?: string;
  customPrompt?: string;
  framework?: string;
  archetype?: string;
  model: string;
  processingTimeMs: number;
  featureCode: string;
  creditCost: number;
}

// =============================================================================
// SERVICE
// =============================================================================

export class StoryDerivationService {
  /**
   * Save a derivation to the database.
   */
  static async save(input: SaveDerivationInput) {
    return prisma.storyDerivation.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        type: input.type,
        storyIds: input.storyIds,
        storySnapshots: input.storySnapshots ? JSON.parse(JSON.stringify(input.storySnapshots)) : undefined,
        text: input.text,
        sections: input.sections ? JSON.parse(JSON.stringify(input.sections)) : undefined,
        sectionOrder: input.sectionOrder ?? [],
        charCount: input.charCount,
        wordCount: input.wordCount,
        speakingTimeSec: input.speakingTimeSec,
        tone: input.tone,
        customPrompt: input.customPrompt,
        framework: input.framework,
        archetype: input.archetype,
        model: input.model,
        processingTimeMs: input.processingTimeMs,
        featureCode: input.featureCode,
        creditCost: input.creditCost,
      },
    });
  }

  /**
   * Get a single derivation by ID with sources and annotations.
   */
  static async getById(id: string, userId: string) {
    return prisma.storyDerivation.findFirst({
      where: { id, userId },
      include: { sources: true, annotations: true },
    });
  }

  /**
   * Snapshot activity sources from parent stories into derivation-owned sources.
   *
   * Section key assignment:
   * - single: "content" — generic bucket. Single derivations have granular section keys
   *   (hook/narrative/takeaway etc.) but we can't map sources to specific sections without
   *   an LLM pass. Sources appear in the mobile footnotes / unassigned pool.
   * - packet: "unassigned" — packets synthesize across multiple stories, so per-section
   *   mapping isn't meaningful at snapshot time.
   *
   * Deduplicates by activityId across multiple parent stories.
   */
  static async snapshotSources(
    derivationId: string,
    storyIds: string[],
    kind: 'single' | 'packet',
  ): Promise<void> {
    // Fetch sources from all parent stories in parallel
    const allStorySources = await Promise.all(
      storyIds.map((storyId) =>
        prisma.storySource.findMany({
          where: {
            storyId,
            sourceType: 'activity',
            excludedAt: null,
            activityId: { not: null },
          },
          orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
        }),
      ),
    );

    // Flatten and deduplicate by activityId (first occurrence wins)
    const seenActivityIds = new Set<string>();
    const sourcesToCreate: Array<{
      derivationId: string;
      sectionKey: string;
      sourceType: string;
      activityId: string;
      label: string;
      url: string | null;
      toolType: string | null;
      role: string | null;
      sortOrder: number;
    }> = [];

    let sortOrder = 0;

    for (const storySources of allStorySources) {
      for (const src of storySources) {
        if (!src.activityId || seenActivityIds.has(src.activityId)) continue;
        seenActivityIds.add(src.activityId);

        sourcesToCreate.push({
          derivationId,
          sectionKey: kind === 'single' ? 'content' : 'unassigned',
          sourceType: 'activity',
          activityId: src.activityId,
          label: src.label,
          url: src.url,
          toolType: src.toolType,
          role: src.role,
          sortOrder: sortOrder++,
        });
      }
    }

    if (sourcesToCreate.length > 0) {
      await prisma.storySource.createMany({ data: sourcesToCreate });
      console.info(`[story-derivation] Snapshotted ${sourcesToCreate.length} sources for derivation ${derivationId} (kind=${kind})`);
    }
  }

  /**
   * List derivations that include a given story, ordered by most recent first.
   * Includes annotation count for LibraryCard badge display.
   */
  static async listForStory(storyId: string, userId: string) {
    return prisma.storyDerivation.findMany({
      where: {
        userId,
        storyIds: { has: storyId },
      },
      include: { _count: { select: { annotations: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Delete a derivation (owned by userId).
   */
  static async delete(id: string, userId: string) {
    return prisma.storyDerivation.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Count derivations for a story (for badge display).
   */
  static async countForStory(storyId: string, userId: string) {
    return prisma.storyDerivation.count({
      where: {
        userId,
        storyIds: { has: storyId },
      },
    });
  }

  /**
   * List derivations by kind (e.g. all packets for a user).
   * Includes annotation count for LibraryCard badge display.
   */
  static async listByKind(userId: string, kind: 'single' | 'packet', take = 20) {
    return prisma.storyDerivation.findMany({
      where: { userId, kind },
      include: { _count: { select: { annotations: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Build story snapshots from story objects.
   * Includes activity date range (or falls back to generatedAt).
   */
  static async buildSnapshots(
    stories: Array<{ id: string; title: string; generatedAt: string | Date | null; activityIds?: string[] }>,
    isDemoMode: boolean,
  ): Promise<StorySnapshot[]> {
    const activityTable = getToolActivityTable(isDemoMode);

    return Promise.all(
      stories.map(async (s) => {
        let dateRange: { earliest: string; latest: string } | null = null;

        if (s.activityIds && s.activityIds.length > 0) {
          try {
            const result = await (activityTable.aggregate as Function)({
              where: { id: { in: s.activityIds } },
              _min: { timestamp: true },
              _max: { timestamp: true },
            });
            if (result._min.timestamp && result._max.timestamp) {
              dateRange = {
                earliest: (result._min.timestamp as Date).toISOString(),
                latest: (result._max.timestamp as Date).toISOString(),
              };
            }
          } catch {
            // Activity lookup failed — fallback to no range
          }
        }

        return {
          storyId: s.id,
          title: s.title,
          generatedAt: s.generatedAt instanceof Date ? s.generatedAt.toISOString() : (s.generatedAt ?? null),
          dateRange,
        };
      }),
    );
  }
}
