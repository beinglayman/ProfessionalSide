/**
 * validation-response.service.ts
 *
 * Validator side of peer validation. Ship 3.2.
 *
 * What this service does:
 *   - listMyValidations: returns the pending + recently-responded
 *     validation rows where the caller is the validator. Feeds the
 *     /me/validations inbox page.
 *   - getStoryForValidator: returns story content + caller's
 *     validations on it. Access: caller must have at least one
 *     StoryValidation row on the story.
 *   - approveValidation: flips a single row to APPROVED, notifies
 *     the author.
 *   - disputeValidation: flips a single row to DISPUTED with the
 *     validator's short reason, notifies the author.
 *
 * Edit-suggestion (EDIT_SUGGESTED + StoryEditSuggestion sidecar) is
 * Ship 3.3.
 *
 * Authorization is strict: the caller must be the *validator* on the
 * row for approve / dispute. Authors cannot respond on behalf of
 * validators, even on their own stories.
 */

import { prisma } from '../../lib/prisma';
import { Prisma, StoryValidationStatus } from '@prisma/client';
import { InviteError } from './validation-invite.service';

export interface MyValidationRow {
  id: string;
  storyId: string;
  storyTitle: string;
  authorName: string;
  authorAvatar: string | null;
  sectionKey: string;
  status: StoryValidationStatus;
  note: string | null;
  requestedAt: string;
  respondedAt: string | null;
}

export interface ValidatorStoryMySection {
  validationId: string;
  sectionKey: string;
  status: StoryValidationStatus;
  note: string | null;
  respondedAt: string | null;
}

export interface ValidatorStoryView {
  story: {
    id: string;
    title: string;
    framework: string;
    archetype: string | null;
    sections: unknown;
    generatedAt: string | null;
    publishedAt: string | null;
  };
  author: {
    id: string;
    name: string;
    avatar: string | null;
    title: string | null;
    company: string | null;
  };
  mySections: ValidatorStoryMySection[];
}

/** Inbox feed for a validator. Pending first, then recent responses. */
export async function listMyValidations(userId: string): Promise<MyValidationRow[]> {
  const rows = await prisma.storyValidation.findMany({
    where: { validatorId: userId },
    select: {
      id: true,
      storyId: true,
      sectionKey: true,
      status: true,
      note: true,
      requestedAt: true,
      respondedAt: true,
      story: { select: { title: true } },
      author: { select: { name: true, avatar: true } },
    },
    orderBy: [
      // Pending first, then most recent.
      { status: 'asc' },
      { requestedAt: 'desc' },
    ],
  });

  return rows.map((r) => ({
    id: r.id,
    storyId: r.storyId,
    storyTitle: r.story?.title ?? 'Untitled story',
    authorName: r.author?.name ?? 'Unknown author',
    authorAvatar: r.author?.avatar ?? null,
    sectionKey: r.sectionKey,
    status: r.status,
    note: r.note,
    requestedAt: r.requestedAt.toISOString(),
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
  }));
}

/**
 * Read the story content + caller's validations. Gate: caller must have
 * at least one StoryValidation row on this story. If they do, they get
 * read access to the story regardless of its visibility setting - peer
 * validation is the whole point of the access grant.
 */
export async function getStoryForValidator(
  storyId: string,
  userId: string,
): Promise<ValidatorStoryView> {
  const myValidations = await prisma.storyValidation.findMany({
    where: { storyId, validatorId: userId },
    select: { id: true, sectionKey: true, status: true, note: true, respondedAt: true },
  });
  if (myValidations.length === 0) {
    throw new InviteError('No validation request found for this story', 'NOT_VALIDATOR', 403);
  }

  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      title: true,
      framework: true,
      archetype: true,
      sections: true,
      generatedAt: true,
      publishedAt: true,
      user: { select: { id: true, name: true, avatar: true, title: true, company: true } },
    },
  });
  if (!story) {
    throw new InviteError('Story not found', 'STORY_NOT_FOUND', 404);
  }

  return {
    story: {
      id: story.id,
      title: story.title,
      framework: story.framework,
      archetype: story.archetype,
      sections: story.sections,
      generatedAt: story.generatedAt ? story.generatedAt.toISOString() : null,
      publishedAt: story.publishedAt ? story.publishedAt.toISOString() : null,
    },
    author: {
      id: story.user.id,
      name: story.user.name ?? 'Unknown',
      avatar: story.user.avatar ?? null,
      title: story.user.title ?? null,
      company: story.user.company ?? null,
    },
    mySections: myValidations.map((v) => ({
      validationId: v.id,
      sectionKey: v.sectionKey,
      status: v.status,
      note: v.note,
      respondedAt: v.respondedAt ? v.respondedAt.toISOString() : null,
    })),
  };
}

interface RespondArgs {
  validationId: string;
  userId: string;
  action: 'APPROVED' | 'DISPUTED';
  note?: string;
}

/**
 * Flip a validation to APPROVED or DISPUTED. Fires one notification to
 * the story's author. PENDING → terminal states only; re-responding on
 * a non-pending row is rejected (re-opens come via Ship 3.3's edit
 * flow or Ship 3.4's re-invite).
 */
async function respondToValidation({ validationId, userId, action, note }: RespondArgs) {
  const existing = await prisma.storyValidation.findUnique({
    where: { id: validationId },
    select: {
      id: true, validatorId: true, authorId: true, storyId: true, sectionKey: true, status: true,
      story: { select: { title: true } },
      validator: { select: { name: true } },
    },
  });
  if (!existing) {
    throw new InviteError('Validation request not found', 'VALIDATION_NOT_FOUND', 404);
  }
  if (existing.validatorId !== userId) {
    throw new InviteError('Only the assigned validator can respond', 'NOT_VALIDATOR', 403);
  }
  if (existing.status !== 'PENDING') {
    throw new InviteError(
      `This validation is already ${existing.status.toLowerCase()}. Reopening is coming in a future ship.`,
      'ALREADY_RESPONDED',
      409,
    );
  }
  if (action === 'DISPUTED' && (!note || note.trim().length === 0)) {
    throw new InviteError('A short reason is required to dispute a claim', 'DISPUTE_NOTE_REQUIRED', 400);
  }

  const updated = await prisma.storyValidation.update({
    where: { id: validationId },
    data: {
      status: action as StoryValidationStatus,
      note: note?.trim() || null,
      respondedAt: new Date(),
    },
    select: { id: true, status: true, note: true, respondedAt: true, sectionKey: true },
  });

  // Notify the author.
  const notifType = action === 'APPROVED' ? 'STORY_VALIDATION_APPROVED' : 'STORY_VALIDATION_DISPUTED';
  const verb = action === 'APPROVED' ? 'approved' : 'disputed';
  await prisma.notification.create({
    data: {
      type: notifType,
      title: `${existing.validator?.name || 'Your validator'} ${verb} a claim`,
      message: `${existing.story?.title || 'Your story'}: ${existing.sectionKey} — ${verb}${note ? `. "${note.trim().slice(0, 80)}"` : '.'}`,
      recipientId: existing.authorId,
      senderId: userId,
      relatedEntityType: 'CAREER_STORY',
      relatedEntityId: existing.storyId,
      data: {
        storyId: existing.storyId,
        sectionKey: existing.sectionKey,
        validationId: existing.id,
        status: action,
      } as Prisma.InputJsonValue,
    },
  });

  return updated;
}

export function approveValidation(validationId: string, userId: string) {
  return respondToValidation({ validationId, userId, action: 'APPROVED' });
}

export function disputeValidation(validationId: string, userId: string, note: string) {
  return respondToValidation({ validationId, userId, action: 'DISPUTED', note });
}
