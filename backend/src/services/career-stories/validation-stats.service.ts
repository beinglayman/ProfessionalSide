/**
 * Ship 4.4 - author-facing validation analytics for a single story.
 *
 * Returns rolled-up numbers the author can glance at: how many sections
 * have at least one approval, how many invited validators have responded,
 * what the average response time looks like, and a status breakdown.
 *
 * Author-only. Throws InviteError('NOT_AUTHOR', 403) otherwise.
 */

import { prisma } from '../../lib/prisma';
import { InviteError } from './validation-invite.service';

export interface StoryValidationStats {
  storyId: string;
  /** Total sections on the story (from the JSON `sections` keys). */
  sectionsTotal: number;
  /** Sections with at least one APPROVED validation. */
  sectionsCoSigned: number;
  /** Unique validators invited on the story (all statuses). */
  validatorsInvited: number;
  /** Unique validators who have at least one non-PENDING row. */
  validatorsResponded: number;
  /** Mean hours between requestedAt and respondedAt across responded rows. Null when no responses. */
  avgResponseHours: number | null;
  breakdown: {
    pending: number;
    approved: number;
    disputed: number;
    editSuggested: number;
    invalidated: number;
  };
}

export async function getStoryValidationStats(
  storyId: string,
  requesterUserId: string,
): Promise<StoryValidationStats> {
  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, sections: true },
  });
  if (!story) {
    throw new InviteError('Story not found', 'STORY_NOT_FOUND', 404);
  }
  if (story.userId !== requesterUserId) {
    throw new InviteError('Only the story author can view stats', 'NOT_AUTHOR', 403);
  }

  const sections = (story.sections as Record<string, unknown> | null) || {};
  const sectionsTotal = Object.keys(sections).length;

  const rows = await prisma.storyValidation.findMany({
    where: { storyId },
    select: {
      sectionKey: true,
      validatorId: true,
      status: true,
      requestedAt: true,
      respondedAt: true,
    },
  });

  const coSignedSections = new Set<string>();
  const invitedValidators = new Set<string>();
  const respondedValidators = new Set<string>();
  let responseMsSum = 0;
  let responseCount = 0;
  const breakdown = { pending: 0, approved: 0, disputed: 0, editSuggested: 0, invalidated: 0 };

  for (const r of rows) {
    invitedValidators.add(r.validatorId);
    switch (r.status) {
      case 'PENDING':
        breakdown.pending += 1;
        break;
      case 'APPROVED':
        breakdown.approved += 1;
        coSignedSections.add(r.sectionKey);
        respondedValidators.add(r.validatorId);
        break;
      case 'DISPUTED':
        breakdown.disputed += 1;
        respondedValidators.add(r.validatorId);
        break;
      case 'EDIT_SUGGESTED':
        breakdown.editSuggested += 1;
        respondedValidators.add(r.validatorId);
        break;
      case 'INVALIDATED':
        breakdown.invalidated += 1;
        break;
    }
    if (r.respondedAt) {
      responseMsSum += r.respondedAt.getTime() - r.requestedAt.getTime();
      responseCount += 1;
    }
  }

  return {
    storyId,
    sectionsTotal,
    sectionsCoSigned: coSignedSections.size,
    validatorsInvited: invitedValidators.size,
    validatorsResponded: respondedValidators.size,
    avgResponseHours:
      responseCount > 0 ? Math.round((responseMsSum / responseCount / 36e5) * 10) / 10 : null,
    breakdown,
  };
}
