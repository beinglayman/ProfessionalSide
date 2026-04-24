/**
 * E2E seed script for the Peer Validation + External Invite flows.
 *
 * Creates a reproducible "golden state" in the production tables so the
 * Playwright specs (and manual smoke tests) can log in, find exactly what
 * they expect, and stop mid-flow without polluting future runs.
 *
 *   npm run --prefix backend seed:validation-e2e
 *
 * Idempotent: re-running deletes and rebuilds everything keyed on the two
 * test emails. Safe to run against staging or a local DB. Do NOT run this
 * against production - it deletes any user with the seeded emails.
 *
 * Output: prints the seeded story id, page URLs, and login credentials.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/utils/auth.utils';

const prisma = new PrismaClient();

// Deterministic fixtures. Checked into the repo on purpose - these are
// test-only credentials never valid against production.
export const E2E_AUTHOR_EMAIL = 'e2e-story-author@inchronicle.test';
export const E2E_VALIDATOR_EMAIL = 'e2e-story-validator@inchronicle.test';
export const E2E_UNKNOWN_PARTICIPANT_EMAIL = 'e2e-unknown-participant@inchronicle.test';
export const E2E_PASSWORD = 'E2eTestPassword123!';

const STORY_TITLE = 'Recovered the payments pipeline during the Q2 incident';
const STORY_ID_DETERMINISTIC = 'e2e-story-validation-flow';

async function wipeExisting(): Promise<void> {
  // Delete by email - cascades clean up stories, validations, invites.
  await prisma.externalValidationInvite.deleteMany({
    where: {
      OR: [
        { email: E2E_UNKNOWN_PARTICIPANT_EMAIL },
        { email: E2E_AUTHOR_EMAIL },
        { email: E2E_VALIDATOR_EMAIL },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [E2E_AUTHOR_EMAIL, E2E_VALIDATOR_EMAIL] } },
  });
}

async function createUsers() {
  const password = await hashPassword(E2E_PASSWORD);

  const author = await prisma.user.create({
    data: {
      email: E2E_AUTHOR_EMAIL,
      password,
      name: 'Erin Author',
      title: 'Staff Engineer',
      company: 'InChronicle QA',
      location: 'Remote',
      profile: { create: { profileCompleteness: 40 } },
    },
  });

  const validator = await prisma.user.create({
    data: {
      email: E2E_VALIDATOR_EMAIL,
      password,
      name: 'Val Idator',
      title: 'Engineering Manager',
      company: 'InChronicle QA',
      location: 'Remote',
      profile: { create: { profileCompleteness: 40 } },
    },
  });

  return { author, validator };
}

async function createStory(authorId: string, validatorId: string) {
  const sections = {
    situation: {
      summary:
        'Payments pipeline started dropping transactions at 09:14 on April 3. Error rate climbed from 0.2% to 8% inside twenty minutes; Stripe webhooks began retrying in a loop and the retry queue doubled every five minutes. The team had four unrelated deploys going out that morning, and the on-call rotation was between shifts.',
      evidence: [] as Array<{ activityId?: string; description?: string; date?: string }>,
    },
    task: {
      summary:
        'Take point on triage: find the regression, stop the bleed without dropping payments in flight, and coordinate comms so support and finance know what customers will see.',
      evidence: [],
    },
    action: {
      summary:
        'Rolled back the payments-api deploy, paused the retry queue with a feature flag, drained in-flight transactions through a read-only path, then wrote a targeted fix to the idempotency-key handling that had regressed. Ran the fix through staging before letting retries resume.',
      evidence: [],
    },
    result: {
      summary:
        'Total customer-visible disruption: 42 minutes. Zero transactions dropped. Finance reconciliation showed no revenue loss. The postmortem shipped the following Tuesday and became the basis for a new pre-deploy smoke check.',
      evidence: [],
    },
  };

  const story = await prisma.careerStory.upsert({
    where: { id: STORY_ID_DETERMINISTIC },
    update: {
      userId: authorId,
      title: STORY_TITLE,
      framework: 'STAR',
      sections: sections as unknown as Prisma.JsonValue,
      originalSections: sections as unknown as Prisma.JsonValue,
      isPublished: true,
      publishedAt: new Date(),
      visibility: 'network',
      archetype: 'firefighter',
      category: 'projects-impact',
      role: 'led',
      generatedAt: new Date(),
    },
    create: {
      id: STORY_ID_DETERMINISTIC,
      userId: authorId,
      title: STORY_TITLE,
      framework: 'STAR',
      sections: sections as unknown as Prisma.JsonValue,
      originalSections: sections as unknown as Prisma.JsonValue,
      isPublished: true,
      publishedAt: new Date(),
      visibility: 'network',
      archetype: 'firefighter',
      category: 'projects-impact',
      role: 'led',
      generatedAt: new Date(),
    },
  });

  // Connect the validator to the author so participant resolvers treat
  // the validator as a known user instead of an unresolved participant.
  await prisma.networkConnection.upsert({
    where: { senderId_receiverId: { senderId: authorId, receiverId: validatorId } },
    update: { status: 'accepted', tier: 'core' },
    create: {
      senderId: authorId,
      receiverId: validatorId,
      status: 'accepted',
      tier: 'core',
      context: 'workspace-collaborator',
    },
  });

  return story;
}

async function createValidations(storyId: string, authorId: string, validatorId: string) {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  // APPROVED on 'situation' - validator approved a day ago.
  await prisma.storyValidation.create({
    data: {
      storyId,
      sectionKey: 'situation',
      validatorId,
      authorId,
      status: 'APPROVED',
      requestedAt: days(2),
      respondedAt: days(1),
    },
  });

  // PENDING on 'task' - requested 4 days ago so the reminder cron
  // (olderThanDays: 3) will fire on the next run.
  await prisma.storyValidation.create({
    data: {
      storyId,
      sectionKey: 'task',
      validatorId,
      authorId,
      status: 'PENDING',
      requestedAt: days(4),
    },
  });

  // EDIT_SUGGESTED on 'action' - validator proposed a rewrite; author
  // sees the EditSuggestionsPanel on the story.
  const editValidation = await prisma.storyValidation.create({
    data: {
      storyId,
      sectionKey: 'action',
      validatorId,
      authorId,
      status: 'EDIT_SUGGESTED',
      requestedAt: days(3),
      respondedAt: days(2),
    },
  });
  await prisma.storyEditSuggestion.create({
    data: {
      validationId: editValidation.id,
      suggestedText:
        'Rolled back the bad deploy inside seven minutes, paused retries behind a feature flag so in-flight payments drained through a read-only path, and shipped a targeted fix to the idempotency-key handling. Verified against staging before unpausing retries.',
    },
  });

  // PENDING on 'result' - freshly requested (no reminder yet), validator
  // inbox should show this as "new".
  await prisma.storyValidation.create({
    data: {
      storyId,
      sectionKey: 'result',
      validatorId,
      authorId,
      status: 'PENDING',
      requestedAt: new Date(),
    },
  });
}

async function createExternalInvite(storyId: string, authorId: string) {
  const token = `e2e-invite-token-${Date.now()}`;
  const invite = await prisma.externalValidationInvite.create({
    data: {
      token,
      email: E2E_UNKNOWN_PARTICIPANT_EMAIL,
      storyId,
      inviterId: authorId,
      sectionKeys: ['task', 'action'],
      message: 'You were on the incident call - would love your read on my write-up.',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return invite;
}

async function main() {
  console.log('Wiping existing e2e seed data...');
  await wipeExisting();

  console.log('Creating author + validator users...');
  const { author, validator } = await createUsers();

  console.log('Creating published story...');
  const story = await createStory(author.id, validator.id);

  console.log('Creating validations in mixed states...');
  await createValidations(story.id, author.id, validator.id);

  console.log('Creating external invite...');
  const invite = await createExternalInvite(story.id, author.id);

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5555';

  console.log('\n================================================');
  console.log(' Peer Validation E2E seed complete.');
  console.log('================================================');
  console.log('\nCredentials (both users, same password):');
  console.log(`  password: ${E2E_PASSWORD}`);
  console.log(`  author:    ${E2E_AUTHOR_EMAIL}`);
  console.log(`  validator: ${E2E_VALIDATOR_EMAIL}`);
  console.log('\nKey URLs:');
  console.log(`  Story page (author view):    ${baseUrl}/stories/${story.id}`);
  console.log(`  Validator inbox:             ${baseUrl}/me/validations`);
  console.log(`  Validator per-story view:    ${baseUrl}/validate/${story.id}`);
  console.log(`  External invite landing:     ${baseUrl}/invite/validate/${invite.token}`);
  console.log('\nPre-seeded state on the story:');
  console.log('  situation  : APPROVED (responded 1d ago)');
  console.log('  task       : PENDING  (4 days old - reminder cron will fire)');
  console.log('  action     : EDIT_SUGGESTED (author sees EditSuggestionsPanel)');
  console.log('  result     : PENDING  (just now, fresh)');
  console.log('\nExternal invite email (not a real user):');
  console.log(`  ${E2E_UNKNOWN_PARTICIPANT_EMAIL}`);
  console.log('\nTo test the external-invite signup flow, open the landing URL');
  console.log('above in an incognito window. Registering through it will create');
  console.log('a real user bound to that email.');
  console.log('================================================\n');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
