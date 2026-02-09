/**
 * Story Derivation Service
 *
 * Persists generated derivations (single-story "Share As" and multi-story "Build Packet").
 * Each generation is auto-saved for history and credit tracking.
 *
 * @module story-derivation.service
 */

import { prisma } from '../../lib/prisma';

// =============================================================================
// TYPES
// =============================================================================

export interface SaveDerivationInput {
  userId: string;
  kind: 'single' | 'packet';
  type: string;
  storyIds: string[];
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
}
