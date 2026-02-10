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
   * List derivations that include a given story, ordered by most recent first.
   */
  static async listForStory(storyId: string, userId: string) {
    return prisma.storyDerivation.findMany({
      where: {
        userId,
        storyIds: { has: storyId },
      },
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
   */
  static async listByKind(userId: string, kind: 'single' | 'packet', take = 20) {
    return prisma.storyDerivation.findMany({
      where: { userId, kind },
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
