/**
 * Ship 4.2 - external validation invites.
 *
 * Author invites a participant (known only by email from activity data) to
 * validate specific sections of a story. Since the participant is not yet
 * an InChronicle user, we cannot create StoryValidation rows directly.
 * Instead, we create a tokenized ExternalValidationInvite, send them a
 * magic-link email that takes them to /invite/validate/:token. After
 * signup, the frontend calls `claim` which creates the real StoryValidation
 * rows against the newly-minted user id.
 *
 * If the email already belongs to a user at create-time, we short-circuit
 * and call the regular inviteValidator flow instead (no external invite
 * needed).
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { InviteError, inviteValidator } from './validation-invite.service';

const INVITE_TTL_DAYS = 30;

export interface CreateExternalInviteRequest {
  storyId: string;
  /** Author creating the invite - must be the story's author. */
  authorUserId: string;
  /** Participant's email (case-insensitive). */
  email: string;
  /** Sections the participant should validate after signup. */
  sectionKeys: string[];
  /** Optional personal note from the author. */
  message?: string;
}

export interface ExternalInviteInfo {
  token: string;
  email: string;
  storyId: string;
  storyTitle: string;
  inviterName: string;
  sectionKeys: string[];
  message: string | null;
  expiresAt: Date;
  status: string;
}

/** Generate a URL-safe opaque token. */
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Create an external invite. Returns the existing pending invite if one
 * exists for the same (storyId, email), updating sectionKeys + expiresAt
 * rather than creating a duplicate - so re-inviting is idempotent.
 *
 * Short-circuits to inviteValidator (Ship 3.1b) when the email already
 * belongs to a user. That way the author doesn't accidentally spam a
 * signup email to someone who is already here.
 */
export async function createExternalInvite(
  req: CreateExternalInviteRequest,
): Promise<
  | { kind: 'external'; invite: ExternalInviteInfo; magicLinkPath: string }
  | { kind: 'existing_user'; userId: string; created: number; skipped: number }
> {
  const email = normalizeEmail(req.email);
  if (!email.includes('@')) {
    throw new InviteError('Invalid email', 'INVALID_EMAIL', 400);
  }
  if (!req.sectionKeys || req.sectionKeys.length === 0) {
    throw new InviteError('At least one section is required', 'NO_SECTIONS', 400);
  }

  const story = await prisma.careerStory.findUnique({
    where: { id: req.storyId },
    select: { id: true, userId: true, title: true },
  });
  if (!story) throw new InviteError('Story not found', 'STORY_NOT_FOUND', 404);
  if (story.userId !== req.authorUserId) {
    throw new InviteError('Only the story author can invite validators', 'NOT_AUTHOR', 403);
  }

  // Already a user? Short-circuit.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    if (existingUser.id === req.authorUserId) {
      throw new InviteError('Cannot invite yourself', 'SELF_INVITE', 400);
    }
    const result = await inviteValidator({
      storyId: req.storyId,
      authorUserId: req.authorUserId,
      validatorUserId: existingUser.id,
      sectionKeys: req.sectionKeys,
    });
    return {
      kind: 'existing_user',
      userId: existingUser.id,
      created: result.created,
      skipped: result.skipped,
    };
  }

  // Look for an existing pending invite for (story, email).
  const existing = await prisma.externalValidationInvite.findFirst({
    where: { storyId: req.storyId, email, status: 'pending' },
  });

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  let invite;
  if (existing) {
    // Merge new sectionKeys, refresh expiry. Keep same token so the
    // old email link keeps working.
    const mergedSections = Array.from(new Set([...existing.sectionKeys, ...req.sectionKeys]));
    invite = await prisma.externalValidationInvite.update({
      where: { id: existing.id },
      data: {
        sectionKeys: mergedSections,
        message: req.message ?? existing.message,
        expiresAt,
      },
    });
  } else {
    invite = await prisma.externalValidationInvite.create({
      data: {
        token: generateToken(),
        email,
        storyId: req.storyId,
        inviterId: req.authorUserId,
        sectionKeys: req.sectionKeys,
        message: req.message,
        status: 'pending',
        expiresAt,
      },
    });
  }

  const inviter = await prisma.user.findUnique({
    where: { id: req.authorUserId },
    select: { name: true },
  });

  return {
    kind: 'external',
    invite: {
      token: invite.token,
      email: invite.email,
      storyId: invite.storyId,
      storyTitle: story.title,
      inviterName: inviter?.name || 'A coworker',
      sectionKeys: invite.sectionKeys,
      message: invite.message,
      expiresAt: invite.expiresAt,
      status: invite.status,
    },
    magicLinkPath: `/invite/validate/${invite.token}`,
  };
}

/**
 * Public read of an invite by token. Used by the landing page to render
 * who invited you and for what before prompting signup. Does not leak any
 * other user data.
 */
export async function getExternalInviteByToken(token: string): Promise<ExternalInviteInfo> {
  const invite = await prisma.externalValidationInvite.findUnique({
    where: { token },
    include: {
      story: { select: { title: true } },
      inviter: { select: { name: true } },
    },
  });
  if (!invite) throw new InviteError('Invite not found', 'INVITE_NOT_FOUND', 404);

  // Lazy-expire.
  if (invite.status === 'pending' && invite.expiresAt < new Date()) {
    await prisma.externalValidationInvite.update({
      where: { id: invite.id },
      data: { status: 'expired' },
    });
    invite.status = 'expired';
  }

  return {
    token: invite.token,
    email: invite.email,
    storyId: invite.storyId,
    storyTitle: invite.story.title,
    inviterName: invite.inviter.name || 'A coworker',
    sectionKeys: invite.sectionKeys,
    message: invite.message,
    expiresAt: invite.expiresAt,
    status: invite.status,
  };
}

/**
 * Called after the invited user signs up. Creates real StoryValidation
 * rows for the sections and marks the invite claimed. The caller passes
 * their fresh `userId` (derived from req.user).
 *
 * If the authenticated user's email doesn't match the invite, we accept
 * anyway (users sometimes sign up with a different personal email but
 * still want to validate). The invite is a bearer token; possession is
 * sufficient authority to claim it.
 */
export async function claimExternalInvite(
  token: string,
  userId: string,
): Promise<{ storyId: string; created: number; skipped: number }> {
  const invite = await prisma.externalValidationInvite.findUnique({
    where: { token },
  });
  if (!invite) throw new InviteError('Invite not found', 'INVITE_NOT_FOUND', 404);
  if (invite.status === 'claimed') {
    throw new InviteError('Invite already claimed', 'ALREADY_CLAIMED', 409);
  }
  if (invite.status === 'revoked') {
    throw new InviteError('Invite has been revoked', 'REVOKED', 410);
  }
  if (invite.expiresAt < new Date()) {
    await prisma.externalValidationInvite.update({
      where: { id: invite.id },
      data: { status: 'expired' },
    });
    throw new InviteError('Invite expired', 'EXPIRED', 410);
  }
  if (invite.inviterId === userId) {
    throw new InviteError('Cannot claim your own invite', 'SELF_CLAIM', 400);
  }

  // Create the real validation rows via the regular flow. inviteValidator
  // is idempotent per (story, section, validator) so this is safe.
  const result = await inviteValidator({
    storyId: invite.storyId,
    authorUserId: invite.inviterId,
    validatorUserId: userId,
    sectionKeys: invite.sectionKeys,
  });

  await prisma.externalValidationInvite.update({
    where: { id: invite.id },
    data: {
      status: 'claimed',
      claimedAt: new Date(),
      claimedByUserId: userId,
    },
  });

  return {
    storyId: invite.storyId,
    created: result.created,
    skipped: result.skipped,
  };
}
