/**
 * participant-resolver.service.ts
 *
 * Given a story's source activities, surface the real humans who showed
 * up in them and try to match each to an inchronicle User. The output
 * feeds two downstream surfaces:
 *
 *   1. The Participants row in the fullscreen story view.
 *   2. The "who to invite as a validator" picker in the publish flow
 *      (Ship 3.1b, not shipping this session).
 *
 * Scope: read-only. No DB writes. Safe to call on any story the caller
 * is allowed to view.
 *
 * Resolution strategy, per the design doc at
 * docs/2026-04-24-evidence-layer-and-validation-design.md:
 *
 *   a) Extract raw participant strings from each ToolActivity's rawData,
 *      per-tool, tagging each with their role in the activity
 *      (reviewer / assignee / attendee / author / etc.).
 *   b) Normalize each participant into a stable identity key
 *      (email if we have one, otherwise lowercased display name).
 *   c) Merge duplicates across activities, keeping the union of
 *      roles + activity IDs per unique identity.
 *   d) For participants that expose an email, batch-query the User
 *      table by email (case-insensitive) and attach the resolved
 *      inchronicle user record.
 *   e) Self-filter: drop the story's author from the result - they
 *      can't validate their own story.
 *
 * NOT YET RESOLVED (intentional gaps for Ship 3.1b / 3.2):
 *   - Display-name fallback resolution via NetworkConnection list. Ship 3.1b.
 *   - Email invite for unknown users. Ship 3.4.
 */

import { prisma } from '../../lib/prisma';

// =============================================================================
// TYPES
// =============================================================================

/** Role label surfaced to the UI. Kept loose/stringy on purpose. */
export type ParticipantRole =
  | 'author'
  | 'reviewer'
  | 'assignee'
  | 'reporter'
  | 'attendee'
  | 'organizer'
  | 'commenter'
  | 'editor'
  | 'contributor'
  | 'mention'
  | 'recipient';

export interface ResolvedParticipantActivity {
  activityId: string;
  source: string;
  role: ParticipantRole;
}

export interface ResolvedParticipantUser {
  id: string;
  name: string;
  avatar: string | null;
  title: string | null;
  company: string | null;
}

export interface ResolvedParticipant {
  /** Stable key for UI list rendering. */
  key: string;
  /** Best display name we found (resolved user name > raw display name > email). */
  displayName: string;
  /** Email if any activity carried one; null otherwise. */
  email: string | null;
  /** Per-activity appearances with role context. */
  activities: ResolvedParticipantActivity[];
  /** True if we matched to an inchronicle user by email. */
  isResolved: boolean;
  /** Resolved user record, or null when unresolved. */
  user: ResolvedParticipantUser | null;
}

// =============================================================================
// RAW EXTRACTION - one helper per tool
// =============================================================================

type RawDataRecord = Record<string, unknown>;

interface RawParticipant {
  displayName: string;
  email: string | null;
  role: ParticipantRole;
}

/**
 * Split a "Name <email>" / plain name / plain email string into parts.
 * Returns { displayName, email? }.
 */
function parsePerson(raw: unknown): { displayName: string; email: string | null } | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    return { displayName: angleMatch[1].trim(), email: angleMatch[2].trim().toLowerCase() };
  }
  if (trimmed.includes('@') && /^\S+@\S+\.\S+$/.test(trimmed)) {
    return { displayName: trimmed.split('@')[0], email: trimmed.toLowerCase() };
  }
  return { displayName: trimmed, email: null };
}

function pushPerson(
  into: RawParticipant[],
  raw: unknown,
  role: ParticipantRole,
): void {
  const parsed = parsePerson(raw);
  if (!parsed) return;
  into.push({ ...parsed, role });
}

function pushPersonList(
  into: RawParticipant[],
  list: unknown,
  role: ParticipantRole,
): void {
  if (!Array.isArray(list)) return;
  for (const entry of list) pushPerson(into, entry, role);
}

/**
 * Extract raw participants from a single ToolActivity's rawData.
 * Each tool's participant shape lives in rawData under known keys -
 * see `extractRawDataContext` / `activity-context.adapter.ts` for the
 * existing pattern. This helper mirrors that map.
 */
function extractFromRawData(source: string, rawData: RawDataRecord | null): RawParticipant[] {
  if (!rawData) return [];
  const out: RawParticipant[] = [];

  switch (source.toLowerCase()) {
    case 'github': {
      pushPerson(out, rawData.author, 'author');
      pushPersonList(out, rawData.reviewers, 'reviewer');
      pushPersonList(out, rawData.requestedReviewers, 'reviewer');
      pushPersonList(out, rawData.mentions, 'mention');
      break;
    }
    case 'jira': {
      pushPerson(out, rawData.assignee, 'assignee');
      pushPerson(out, rawData.reporter, 'reporter');
      pushPersonList(out, rawData.watchers, 'mention');
      pushPersonList(out, rawData.mentions, 'mention');
      if (Array.isArray(rawData.comments)) {
        for (const c of rawData.comments as RawDataRecord[]) {
          pushPerson(out, c?.author, 'commenter');
        }
      }
      break;
    }
    case 'slack': {
      pushPerson(out, rawData.author, 'author');
      pushPerson(out, rawData.parentAuthor, 'author');
      pushPerson(out, rawData.replyAuthor, 'commenter');
      pushPersonList(out, rawData.mentions, 'mention');
      break;
    }
    case 'outlook':
    case 'teams': {
      pushPerson(out, rawData.from, 'author');
      pushPerson(out, rawData.organizer, 'organizer');
      pushPersonList(out, rawData.to, 'recipient');
      pushPersonList(out, rawData.cc, 'recipient');
      // attendees can be a count OR an array of names/emails.
      if (Array.isArray(rawData.attendees)) pushPersonList(out, rawData.attendees, 'attendee');
      break;
    }
    case 'confluence': {
      pushPerson(out, rawData.lastModifiedBy, 'editor');
      break;
    }
    case 'google-calendar': {
      pushPerson(out, rawData.organizer, 'organizer');
      if (Array.isArray(rawData.attendees)) pushPersonList(out, rawData.attendees, 'attendee');
      break;
    }
    case 'google-docs':
    case 'google-sheets': {
      pushPerson(out, rawData.owner, 'author');
      pushPerson(out, rawData.lastModifiedBy, 'editor');
      pushPersonList(out, rawData.contributors, 'contributor');
      pushPersonList(out, rawData.suggestedEditors, 'editor');
      pushPersonList(out, rawData.mentions, 'mention');
      if (Array.isArray(rawData.comments)) {
        for (const c of rawData.comments as RawDataRecord[]) {
          pushPerson(out, c?.author, 'commenter');
        }
      }
      break;
    }
    case 'figma': {
      pushPersonList(out, rawData.commenters, 'commenter');
      break;
    }
    default:
      break;
  }

  return out;
}

// =============================================================================
// MERGE + RESOLVE
// =============================================================================

/** Stable identity key for dedup. Email wins, then lowercased name. */
function identityKey(p: { displayName: string; email: string | null }): string {
  if (p.email) return `email:${p.email}`;
  return `name:${p.displayName.toLowerCase().trim()}`;
}

export interface ResolveOptions {
  /** Story author - will be self-filtered out. */
  authorUserId: string;
}

export async function resolveStoryParticipants(
  storyId: string,
  options: ResolveOptions,
): Promise<ResolvedParticipant[]> {
  // 1. Pull the story's activity IDs. Covers both `story.activityIds`
  //    (the primary binding) and `storySources[].activityId` (sources
  //    surface additional activities in some paths). We union both to
  //    be safe.
  const story = await prisma.careerStory.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      userId: true,
      activityIds: true,
      sources: { select: { activityId: true } },
    },
  });
  if (!story) return [];

  const activityIdSet = new Set<string>();
  for (const id of story.activityIds ?? []) if (id) activityIdSet.add(id);
  for (const s of story.sources ?? []) if (s.activityId) activityIdSet.add(s.activityId);
  if (activityIdSet.size === 0) return [];

  // 2. Load the activities' raw data.
  const activities = await prisma.toolActivity.findMany({
    where: { id: { in: [...activityIdSet] } },
    select: { id: true, source: true, rawData: true },
  });

  // 3. Extract raw participants per activity, track roles + activity ids.
  type MergedEntry = {
    displayName: string;
    email: string | null;
    /** Activities + roles where this participant shows up. */
    appearances: ResolvedParticipantActivity[];
  };
  const merged = new Map<string, MergedEntry>();

  for (const act of activities) {
    const raws = extractFromRawData(act.source, act.rawData as RawDataRecord | null);
    for (const r of raws) {
      const key = identityKey(r);
      const existing = merged.get(key);
      if (existing) {
        // Prefer a version of displayName that isn't just an email local-part.
        if (r.displayName && !r.displayName.includes('@') && existing.displayName.includes('@')) {
          existing.displayName = r.displayName;
        }
        if (!existing.email && r.email) existing.email = r.email;
        existing.appearances.push({ activityId: act.id, source: act.source, role: r.role });
      } else {
        merged.set(key, {
          displayName: r.displayName,
          email: r.email,
          appearances: [{ activityId: act.id, source: act.source, role: r.role }],
        });
      }
    }
  }

  // 4. Resolve emails to inchronicle users in one batch query.
  const emails = [...merged.values()].map((p) => p.email).filter((e): e is string => Boolean(e));
  const userMap = new Map<string, ResolvedParticipantUser>();
  if (emails.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: emails, mode: 'insensitive' } },
      select: { id: true, name: true, avatar: true, title: true, company: true, email: true },
    });
    for (const u of users) {
      if (!u.email) continue;
      userMap.set(u.email.toLowerCase(), {
        id: u.id,
        name: u.name ?? u.email,
        avatar: u.avatar ?? null,
        title: u.title ?? null,
        company: u.company ?? null,
      });
    }
  }

  // 5. Shape + self-filter.
  const out: ResolvedParticipant[] = [];
  for (const [key, entry] of merged) {
    const resolvedUser = entry.email ? userMap.get(entry.email.toLowerCase()) ?? null : null;
    // Skip the story author so they can't appear as their own validator.
    if (resolvedUser && resolvedUser.id === options.authorUserId) continue;

    out.push({
      key,
      displayName: resolvedUser?.name ?? entry.displayName,
      email: entry.email,
      activities: entry.appearances,
      isResolved: Boolean(resolvedUser),
      user: resolvedUser,
    });
  }

  // Sort: resolved first, then by activity-appearance count desc, then display name.
  out.sort((a, b) => {
    if (a.isResolved !== b.isResolved) return a.isResolved ? -1 : 1;
    if (b.activities.length !== a.activities.length) return b.activities.length - a.activities.length;
    return a.displayName.localeCompare(b.displayName);
  });

  return out;
}
