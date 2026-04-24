/**
 * Ship 4.1 - reminder cron for stale pending validations.
 *
 * Runs once a day. Finds StoryValidation rows that have been sitting in
 * PENDING for longer than the configured threshold and nudges each
 * validator with a single grouped notification per story.
 *
 * Cooldown: a validator is only reminded about a given story once every
 * `cooldownDays` even if new PENDING rows for the same story age in.
 * The cooldown is tracked via `StoryValidation.lastReminderAt`, which
 * we stamp in bulk when we send the notification.
 *
 * Grouping: one notification per (validator, story) pair, even if the
 * validator has multiple stale sections on the same story. Multiple
 * stories for the same validator produce multiple notifications - each
 * clicks through to a different `/validate/:storyId`.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidationReminderOptions {
  /** Only nudge rows that have been PENDING for at least this many days. */
  olderThanDays: number;
  /** Don't re-remind about the same (validator, story) pair inside this window. */
  cooldownDays: number;
}

export interface ValidationReminderResult {
  groupsFound: number;
  notificationsSent: number;
  rowsStamped: number;
}

export async function sendValidationReminders(
  opts: ValidationReminderOptions,
): Promise<ValidationReminderResult> {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - opts.olderThanDays * 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - opts.cooldownDays * 24 * 60 * 60 * 1000);

  const stale = await prisma.storyValidation.findMany({
    where: {
      status: 'PENDING',
      requestedAt: { lt: staleCutoff },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lt: cooldownCutoff } },
      ],
    },
    include: {
      story: { select: { id: true, title: true } },
      author: { select: { id: true, name: true } },
    },
    orderBy: { requestedAt: 'asc' },
  });

  if (stale.length === 0) {
    return { groupsFound: 0, notificationsSent: 0, rowsStamped: 0 };
  }

  // Group by (validatorId, storyId). One notification per group.
  const groups = new Map<string, typeof stale>();
  for (const row of stale) {
    const key = `${row.validatorId}::${row.storyId}`;
    const arr = groups.get(key);
    if (arr) {
      arr.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  let notificationsSent = 0;
  let rowsStamped = 0;

  for (const rows of groups.values()) {
    const first = rows[0];
    const sectionKeys = rows.map((r) => r.sectionKey);
    const authorName = first.author.name || 'A coworker';

    await prisma.notification.create({
      data: {
        type: 'STORY_VALIDATION_REMINDER',
        title: `Reminder: ${authorName} is still waiting on your validation`,
        message: `${sectionKeys.length} section${sectionKeys.length === 1 ? '' : 's'} on "${first.story.title}" still need your response.`,
        recipientId: first.validatorId,
        senderId: first.authorId,
        relatedEntityType: 'CAREER_STORY',
        relatedEntityId: first.storyId,
        data: {
          storyId: first.storyId,
          storyTitle: first.story.title,
          sectionKeys,
          claimCount: sectionKeys.length,
          pendingSinceDays: opts.olderThanDays,
        },
      },
    });
    notificationsSent += 1;

    const stamped = await prisma.storyValidation.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { lastReminderAt: now },
    });
    rowsStamped += stamped.count;
  }

  return { groupsFound: groups.size, notificationsSent, rowsStamped };
}
