/**
 * validation-invite.service.ts
 *
 * Author-side of peer validation: creating invitations. Ship 3.1b.
 *
 * Flow:
 *   1. Author picks a resolved participant (from participant-resolver.service)
 *      and chooses which sections they should approve. The frontend auto-
 *      suggests the sections grounded in activities where this person
 *      participated; the author can prune.
 *   2. This service creates one StoryValidation row per (story, section,
 *      validator) tuple with status = PENDING, skipping any duplicates.
 *   3. One in-app Notification per validator (not per section) with
 *      type = STORY_VALIDATION_REQUESTED, carrying the list of sections
 *      in its JSON payload so the inbox can render "3 sections need your
 *      approval" without another round-trip.
 *
 * NOT IN THIS SHIP (come later):
 *   - Email notifications. Ship 3.2.
 *   - Tokenized validator URLs for logged-out flow. Ship 3.2.
 *   - External invites (unresolved participants). Ship 3.4.
 *
 * Author self-invite guard: this service will refuse to create a
 * validation where validatorId === authorId.
 */

import { prisma } from '../../lib/prisma';

export interface InviteRequest {
  storyId: string;
  /** Inviting user - must be the story's author. */
  authorUserId: string;
  /** The coworker being invited. Must be an InChronicle user. */
  validatorUserId: string;
  /** Sections the validator is asked to approve. */
  sectionKeys: string[];
  /** Activity IDs surfaced as the "why" for each section (used for context). */
  groundingActivityIds?: string[];
}

export interface InviteResult {
  created: number;
  skipped: number;
  /** IDs of the rows created in this call. */
  validationIds: string[];
}

export class InviteError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = 'InviteError';
  }
}

/**
 * Create PENDING StoryValidation rows + one grouped Notification.
 * Idempotent per (storyId, sectionKey, validatorId) via the unique index:
 * re-inviting the same coworker for a section that already has a row is a
 * no-op, NOT an error. That lets the UI call this on every confirm without
 * blowing up on double-clicks.
 */
export async function inviteValidator(req: InviteRequest): Promise<InviteResult> {
  const {
    storyId,
    authorUserId,
    validatorUserId,
    sectionKeys,
    groundingActivityIds = [],
  } = req;

  if (!sectionKeys || sectionKeys.length === 0) {
    throw new InviteError('At least one section must be selected', 'NO_SECTIONS', 400);
  }

  if (validatorUserId === authorUserId) {
    throw new InviteError('You cannot invite yourself to validate your own story', 'SELF_INVITE', 400);
  }

  // Confirm story exists and author owns it.
  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, title: true, isPublished: true },
  });
  if (!story) {
    throw new InviteError('Story not found', 'STORY_NOT_FOUND', 404);
  }
  if (story.userId !== authorUserId) {
    throw new InviteError('Only the story author can invite validators', 'NOT_AUTHOR', 403);
  }

  // Confirm validator is a real user.
  const validator = await prisma.user.findUnique({
    where: { id: validatorUserId },
    select: { id: true, name: true, email: true },
  });
  if (!validator) {
    throw new InviteError('Validator user not found', 'VALIDATOR_NOT_FOUND', 404);
  }

  // Read existing validations for this trio so we know what's already sent
  // and don't double-notify.
  const existing = await prisma.storyValidation.findMany({
    where: {
      storyId,
      validatorId: validatorUserId,
      sectionKey: { in: sectionKeys },
    },
    select: { sectionKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.sectionKey));
  const newSectionKeys = sectionKeys.filter((s) => !existingKeys.has(s));

  const createdIds: string[] = [];
  if (newSectionKeys.length > 0) {
    // Insert new rows.
    const created = await prisma.$transaction(
      newSectionKeys.map((sectionKey) =>
        prisma.storyValidation.create({
          data: {
            storyId,
            sectionKey,
            validatorId: validatorUserId,
            authorId: authorUserId,
            status: 'PENDING',
            groundingActivityIds,
          },
          select: { id: true },
        }),
      ),
    );
    createdIds.push(...created.map((c) => c.id));

    // Grouped in-app notification (Ship 3.2 will add email).
    await prisma.notification.create({
      data: {
        type: 'STORY_VALIDATION_REQUESTED',
        title: `${validator.name || 'A coworker'} - you've been asked to validate a story`,
        message: `${story.title}: ${newSectionKeys.length} section${newSectionKeys.length === 1 ? '' : 's'} need your approval.`,
        recipientId: validatorUserId,
        senderId: authorUserId,
        relatedEntityType: 'CAREER_STORY',
        relatedEntityId: storyId,
        data: {
          storyId,
          storyTitle: story.title,
          sectionKeys: newSectionKeys,
          claimCount: newSectionKeys.length,
        },
      },
    });
  }

  return {
    created: newSectionKeys.length,
    skipped: existingKeys.size,
    validationIds: createdIds,
  };
}

/** Shape returned by listing an author's validations for a given story. */
export interface StoryValidationSummary {
  id: string;
  storyId: string;
  sectionKey: string;
  validatorId: string;
  validatorName: string;
  validatorAvatar: string | null;
  status: 'PENDING' | 'APPROVED' | 'EDIT_SUGGESTED' | 'DISPUTED' | 'INVALIDATED';
  requestedAt: string;
  respondedAt: string | null;
}

/** Author view: list all validation rows on a story. */
export async function listStoryValidations(
  storyId: string,
  authorUserId: string,
): Promise<StoryValidationSummary[]> {
  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true },
  });
  if (!story) {
    throw new InviteError('Story not found', 'STORY_NOT_FOUND', 404);
  }
  if (story.userId !== authorUserId) {
    throw new InviteError('Only the story author can view validations', 'NOT_AUTHOR', 403);
  }

  const rows = await prisma.storyValidation.findMany({
    where: { storyId },
    select: {
      id: true,
      storyId: true,
      sectionKey: true,
      validatorId: true,
      status: true,
      requestedAt: true,
      respondedAt: true,
      validator: { select: { name: true, avatar: true } },
    },
    orderBy: [{ requestedAt: 'desc' }],
  });

  return rows.map((r) => ({
    id: r.id,
    storyId: r.storyId,
    sectionKey: r.sectionKey,
    validatorId: r.validatorId,
    validatorName: r.validator?.name || 'Unknown',
    validatorAvatar: r.validator?.avatar || null,
    status: r.status,
    requestedAt: r.requestedAt.toISOString(),
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
  }));
}
