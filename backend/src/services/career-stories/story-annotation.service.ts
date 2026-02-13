/**
 * Story Annotation Service
 *
 * CRUD for rough-notation annotations and Tufte margin notes.
 * Annotations are text-anchored marks (highlight, underline, box, circle,
 * strike-through, bracket) with optional margin notes, or standalone asides.
 *
 * Supports both story and derivation ownership (exactly one must be set).
 */

import { prisma } from '../../lib/prisma';

const VALID_STYLES = [
  'highlight', 'underline', 'box', 'circle', 'strike-through', 'bracket', 'aside',
] as const;

type AnnotationStyle = typeof VALID_STYLES[number];

interface CreateAnnotationInput {
  sectionKey: string;
  startOffset: number;
  endOffset: number;
  annotatedText: string;
  style: AnnotationStyle;
  color?: string | null;
  note?: string | null;
}

interface UpdateAnnotationInput {
  note?: string | null;
  style?: AnnotationStyle;
  color?: string | null;
}

class StoryAnnotationService {
  // =========================================================================
  // STORY ANNOTATIONS
  // =========================================================================

  async getAnnotationsForStory(storyId: string) {
    return prisma.storyAnnotation.findMany({
      where: { storyId },
      orderBy: [{ sectionKey: 'asc' }, { startOffset: 'asc' }],
    });
  }

  async createAnnotation(storyId: string, input: CreateAnnotationInput) {
    return prisma.storyAnnotation.create({
      data: {
        storyId,
        sectionKey: input.sectionKey,
        startOffset: input.startOffset,
        endOffset: input.endOffset,
        annotatedText: input.annotatedText,
        style: input.style,
        ...(input.color !== undefined ? { color: input.color } : {}),
        note: input.note ?? null,
      },
    });
  }

  async updateAnnotation(annotationId: string, storyId: string, input: UpdateAnnotationInput) {
    return prisma.storyAnnotation.update({
      where: { id: annotationId, storyId },
      data: {
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.style !== undefined ? { style: input.style } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  }

  async deleteAnnotation(annotationId: string, storyId: string) {
    return prisma.storyAnnotation.delete({
      where: { id: annotationId, storyId },
    });
  }

  async verifyOwnership(annotationId: string, storyId: string): Promise<boolean> {
    const annotation = await prisma.storyAnnotation.findFirst({
      where: { id: annotationId, storyId },
      select: { id: true },
    });
    return annotation !== null;
  }

  // =========================================================================
  // DERIVATION ANNOTATIONS
  // =========================================================================

  async getAnnotationsForDerivation(derivationId: string) {
    return prisma.storyAnnotation.findMany({
      where: { derivationId },
      orderBy: [{ sectionKey: 'asc' }, { startOffset: 'asc' }],
    });
  }

  async createDerivationAnnotation(derivationId: string, input: CreateAnnotationInput) {
    return prisma.storyAnnotation.create({
      data: {
        derivationId,
        sectionKey: input.sectionKey,
        startOffset: input.startOffset,
        endOffset: input.endOffset,
        annotatedText: input.annotatedText,
        style: input.style,
        ...(input.color !== undefined ? { color: input.color } : {}),
        note: input.note ?? null,
      },
    });
  }

  async updateDerivationAnnotation(annotationId: string, derivationId: string, input: UpdateAnnotationInput) {
    return prisma.storyAnnotation.update({
      where: { id: annotationId, derivationId },
      data: {
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.style !== undefined ? { style: input.style } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  }

  async deleteDerivationAnnotation(annotationId: string, derivationId: string) {
    return prisma.storyAnnotation.delete({
      where: { id: annotationId, derivationId },
    });
  }

  async verifyDerivationOwnership(annotationId: string, derivationId: string): Promise<boolean> {
    const annotation = await prisma.storyAnnotation.findFirst({
      where: { id: annotationId, derivationId },
      select: { id: true },
    });
    return annotation !== null;
  }
}

export const storyAnnotationService = new StoryAnnotationService();
