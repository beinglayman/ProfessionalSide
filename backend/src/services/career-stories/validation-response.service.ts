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

// ========================================================================
// Edit-suggestion workflow (Ship 3.3)
// ========================================================================

/**
 * Validator proposes rewritten text for a section. Upserts the
 * StoryEditSuggestion sidecar (validator can revise their suggestion
 * before the author responds) and flips the parent validation to
 * EDIT_SUGGESTED. One notification to the author.
 *
 * Guards:
 *   - Caller must be the assigned validator.
 *   - The validation must be PENDING or already EDIT_SUGGESTED (so
 *     they can revise their own suggestion). Cannot overwrite an
 *     APPROVED or DISPUTED response without re-opening first (comes
 *     in 3.4).
 *   - Suggested text is required, 1 <= len <= 5000 chars.
 */
export async function suggestEdit(
  validationId: string,
  userId: string,
  suggestedText: string,
) {
  const trimmed = (suggestedText || '').trim();
  if (trimmed.length === 0) {
    throw new InviteError('Suggested text cannot be empty', 'SUGGESTION_EMPTY', 400);
  }
  if (trimmed.length > 5000) {
    throw new InviteError('Suggested text must be 5000 characters or fewer', 'SUGGESTION_TOO_LONG', 400);
  }

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
    throw new InviteError('Only the assigned validator can suggest edits', 'NOT_VALIDATOR', 403);
  }
  if (existing.status !== 'PENDING' && existing.status !== 'EDIT_SUGGESTED') {
    throw new InviteError(
      `This validation is already ${existing.status.toLowerCase()}. Re-opening isn't supported yet.`,
      'ALREADY_RESPONDED',
      409,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const validation = await tx.storyValidation.update({
      where: { id: validationId },
      data: {
        status: 'EDIT_SUGGESTED',
        note: null,
        respondedAt: new Date(),
      },
      select: { id: true, status: true, respondedAt: true, sectionKey: true },
    });

    // Upsert the sidecar so a validator can revise their suggestion.
    const suggestion = await tx.storyEditSuggestion.upsert({
      where: { validationId },
      update: {
        suggestedText: trimmed,
        authorVerdict: null,
        respondedAt: null,
      },
      create: {
        validationId,
        suggestedText: trimmed,
      },
      select: { id: true, suggestedText: true, createdAt: true },
    });

    return { validation, suggestion };
  });

  // Notify author.
  await prisma.notification.create({
    data: {
      type: 'STORY_EDIT_SUGGESTED',
      title: `${existing.validator?.name || 'A validator'} suggested an edit`,
      message: `${existing.story?.title || 'Your story'}: a rewrite of "${existing.sectionKey}" is waiting for your review.`,
      recipientId: existing.authorId,
      senderId: userId,
      relatedEntityType: 'CAREER_STORY',
      relatedEntityId: existing.storyId,
      data: {
        storyId: existing.storyId,
        sectionKey: existing.sectionKey,
        validationId: existing.id,
      } as Prisma.InputJsonValue,
    },
  });

  return result;
}

interface VerdictArgs {
  validationId: string;
  userId: string;
  verdict: 'accepted' | 'rejected';
}

/**
 * Author responds to a validator's edit suggestion.
 *
 * Accept: replaces the section text in story.sections JSON, marks the
 *   validation as APPROVED (the validator already endorsed the new
 *   text by suggesting it), marks the sidecar as accepted. Notifies
 *   validator (STORY_EDIT_ACCEPTED).
 *
 * Reject: resets the validation to PENDING so the validator can
 *   approve/dispute/re-suggest again. Marks the sidecar as rejected
 *   (keeping the rejected text for history). Notifies validator
 *   (STORY_EDIT_REJECTED).
 *
 * Only the story's author can act on a suggestion.
 */
async function applyEditVerdict({ validationId, userId, verdict }: VerdictArgs) {
  const existing = await prisma.storyValidation.findUnique({
    where: { id: validationId },
    select: {
      id: true, validatorId: true, authorId: true, storyId: true, sectionKey: true, status: true,
      story: { select: { title: true, sections: true } },
      author: { select: { name: true } },
      editSuggestion: { select: { id: true, suggestedText: true, authorVerdict: true } },
    },
  });
  if (!existing) {
    throw new InviteError('Validation request not found', 'VALIDATION_NOT_FOUND', 404);
  }
  if (existing.authorId !== userId) {
    throw new InviteError('Only the story author can respond to a suggested edit', 'NOT_AUTHOR', 403);
  }
  if (existing.status !== 'EDIT_SUGGESTED' || !existing.editSuggestion) {
    throw new InviteError('No edit suggestion awaiting your response on this row', 'NO_SUGGESTION', 409);
  }
  if (existing.editSuggestion.authorVerdict) {
    throw new InviteError('You have already responded to this suggestion', 'ALREADY_RESPONDED', 409);
  }

  await prisma.$transaction(async (tx) => {
    // Update the sidecar.
    await tx.storyEditSuggestion.update({
      where: { id: existing.editSuggestion!.id },
      data: { authorVerdict: verdict, respondedAt: new Date() },
    });

    if (verdict === 'accepted') {
      // Replace the section's summary text in the story.sections JSON.
      const sections = (existing.story?.sections as Record<string, { summary?: string; evidence?: unknown }> | null) || {};
      const section = sections[existing.sectionKey] || {};
      const nextSections = {
        ...sections,
        [existing.sectionKey]: {
          ...section,
          summary: existing.editSuggestion!.suggestedText,
        },
      };
      await tx.careerStory.update({
        where: { id: existing.storyId },
        data: { sections: nextSections as Prisma.InputJsonValue },
      });
      await tx.storyValidation.update({
        where: { id: validationId },
        data: { status: 'APPROVED', respondedAt: new Date() },
      });
    } else {
      // Reject: reset validation to PENDING so the validator can try again.
      await tx.storyValidation.update({
        where: { id: validationId },
        data: { status: 'PENDING', respondedAt: null, note: null },
      });
    }
  });

  const notifType = verdict === 'accepted' ? 'STORY_EDIT_ACCEPTED' : 'STORY_EDIT_REJECTED';
  const verbPast = verdict === 'accepted' ? 'accepted' : 'declined';
  await prisma.notification.create({
    data: {
      type: notifType,
      title: `${existing.author?.name || 'The author'} ${verbPast} your edit`,
      message: `${existing.story?.title || 'A story'}: your suggestion for "${existing.sectionKey}" was ${verbPast}.`,
      recipientId: existing.validatorId,
      senderId: userId,
      relatedEntityType: 'CAREER_STORY',
      relatedEntityId: existing.storyId,
      data: {
        storyId: existing.storyId,
        sectionKey: existing.sectionKey,
        validationId: existing.id,
        verdict,
      } as Prisma.InputJsonValue,
    },
  });

  return { verdict };
}

export function acceptEditSuggestion(validationId: string, userId: string) {
  return applyEditVerdict({ validationId, userId, verdict: 'accepted' });
}

export function rejectEditSuggestion(validationId: string, userId: string) {
  return applyEditVerdict({ validationId, userId, verdict: 'rejected' });
}

// ========================================================================
// Author-side read: suggestions awaiting my response on a story
// ========================================================================

export interface PendingEditSuggestion {
  validationId: string;
  storyId: string;
  sectionKey: string;
  validatorId: string;
  validatorName: string;
  validatorAvatar: string | null;
  suggestedText: string;
  /** The current section text in the story, for diff display. */
  currentSectionText: string;
  suggestedAt: string;
}

/**
 * Author view: list edit suggestions on a story that are waiting for
 * their Accept/Reject response. Used to render the suggestion cards
 * inline on the Participants row.
 */
export async function listPendingEditSuggestionsForStory(
  storyId: string,
  authorUserId: string,
): Promise<PendingEditSuggestion[]> {
  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, sections: true },
  });
  if (!story) {
    throw new InviteError('Story not found', 'STORY_NOT_FOUND', 404);
  }
  if (story.userId !== authorUserId) {
    throw new InviteError('Only the story author can view edit suggestions', 'NOT_AUTHOR', 403);
  }

  const rows = await prisma.storyValidation.findMany({
    where: {
      storyId,
      status: 'EDIT_SUGGESTED',
      editSuggestion: { authorVerdict: null },
    },
    select: {
      id: true,
      storyId: true,
      sectionKey: true,
      validatorId: true,
      validator: { select: { name: true, avatar: true } },
      editSuggestion: { select: { suggestedText: true, createdAt: true } },
    },
    orderBy: { respondedAt: 'desc' },
  });

  const sections = (story.sections as Record<string, { summary?: string } | undefined>) || {};

  return rows
    .filter((r) => r.editSuggestion)
    .map((r) => ({
      validationId: r.id,
      storyId: r.storyId,
      sectionKey: r.sectionKey,
      validatorId: r.validatorId,
      validatorName: r.validator?.name || 'Unknown',
      validatorAvatar: r.validator?.avatar || null,
      suggestedText: r.editSuggestion!.suggestedText,
      currentSectionText: sections[r.sectionKey]?.summary || '',
      suggestedAt: r.editSuggestion!.createdAt.toISOString(),
    }));
}
