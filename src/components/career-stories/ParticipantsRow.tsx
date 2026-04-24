/**
 * ParticipantsRow - renders the humans surfaced from a story's source
 * activities, at the bottom of the fullscreen story view when Evidence
 * is on.
 *
 * Phase 3.1a scope:
 *   - Read-only list of resolved + unresolved participants.
 *   - Resolved users get a name + role chip; unresolved get a generic
 *     icon and an "Invite to InChronicle" button (placeholder, wired
 *     to a no-op toast for now; becomes real in Ship 3.4).
 *   - "Invite to validate" button per resolved user (placeholder; wired
 *     to a no-op toast for now; becomes real in Ship 3.1b).
 *
 * Design reference: public/prototypes/evidence/proto-V6c-tufte-inline-badges.html
 * (the "Participants" section near the bottom).
 */

import React from 'react';
import { UserPlus, Users, Mail, UserCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStoryParticipants } from '../../hooks/useStoryParticipants';
import type { StoryParticipant, ParticipantRole } from '../../types/career-stories';

interface ParticipantsRowProps {
  storyId: string;
  /** Only the author sees Invite/Validate CTAs in 3.1a. */
  isOwner?: boolean;
  /** Hide the whole row if we have no participants - useful for stories built from solo activities. */
  hideWhenEmpty?: boolean;
}

/** Short human-readable label for a role. */
const ROLE_LABEL: Record<ParticipantRole, string> = {
  author: 'Author',
  reviewer: 'Reviewer',
  assignee: 'Assignee',
  reporter: 'Reporter',
  attendee: 'Attendee',
  organizer: 'Organizer',
  commenter: 'Commenter',
  editor: 'Editor',
  contributor: 'Contributor',
  mention: 'Mentioned',
  recipient: 'Recipient',
};

/** Two-letter initials for the avatar fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Dominant role across a participant's appearances. Whatever role appears first in activities wins ties. */
function dominantRole(p: StoryParticipant): ParticipantRole | null {
  if (p.activities.length === 0) return null;
  const counts = new Map<ParticipantRole, number>();
  for (const a of p.activities) counts.set(a.role, (counts.get(a.role) ?? 0) + 1);
  let best: ParticipantRole | null = null;
  let bestCount = 0;
  for (const [role, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      best = role;
    }
  }
  return best;
}

/** Unique source tools across a participant's appearances. */
function uniqueSources(p: StoryParticipant): string[] {
  return Array.from(new Set(p.activities.map((a) => a.source)));
}

function ParticipantCard({ p, isOwner }: { p: StoryParticipant; isOwner?: boolean }) {
  const role = dominantRole(p);
  const sources = uniqueSources(p);
  const activityCount = p.activities.length;

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
        p.isResolved ? 'border-gray-200' : 'border-dashed border-gray-200',
      )}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        {p.isResolved && p.user?.avatar ? (
          <img
            src={p.user.avatar}
            alt={p.displayName}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : p.isResolved ? (
          <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
            {initials(p.displayName)}
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <UserCircle2 className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-medium truncate', p.isResolved ? 'text-gray-900' : 'text-gray-500')}>
            {p.displayName}
          </div>
          <div className="text-[11px] text-gray-500 truncate">
            {role ? ROLE_LABEL[role] : 'Participant'}
            {sources.length > 0 && ` \u00b7 ${sources.join(', ')}`}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-400 font-mono">
          {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
        </span>
        {isOwner && p.isResolved ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 cursor-not-allowed"
            title="Invite to validate - available in Ship 3.1b"
            disabled
          >
            <UserPlus className="h-3 w-3" />
            Invite to validate
          </button>
        ) : isOwner && !p.isResolved ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 cursor-not-allowed"
            title="Invite to InChronicle - available in Ship 3.4"
            disabled
          >
            <Mail className="h-3 w-3" />
            Invite to InChronicle
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const ParticipantsRow: React.FC<ParticipantsRowProps> = ({ storyId, isOwner, hideWhenEmpty }) => {
  const { data, isLoading, isError, error } = useStoryParticipants(storyId, Boolean(isOwner));

  // Non-owners or loading state: skip the row entirely.
  if (!isOwner || isLoading) return null;

  // 403 and other access errors: skip silently. 3.2 will relax this.
  if (isError) {
    const msg = String((error as Error | undefined)?.message || '');
    if (msg.includes('403') || msg.includes('forbidden')) return null;
    return null;
  }

  const participants = data?.participants ?? [];
  if (participants.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <section className="mt-10 border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-primary-600" />
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-900">Participants</h3>
        </div>
        <p className="text-xs text-gray-500">
          We did not find any coworkers in the source activities for this story yet. Once your tools surface more
          participants (reviewers, attendees, co-authors), they will show up here and you will be able to invite
          them to validate this story.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-gray-200 pt-6">
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-4 w-4 text-primary-600" />
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-900">Participants</h3>
        <span className="text-xs text-gray-500 ml-1">
          {participants.length} {participants.length === 1 ? 'person' : 'people'} referenced in evidence
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {participants.map((p) => (
          <ParticipantCard key={p.key} p={p} isOwner={isOwner} />
        ))}
      </div>

      <p className="mt-4 text-[11px] text-gray-400 italic">
        Peer validation coming soon. You will be able to invite resolved coworkers to approve the claims in this
        story.
      </p>
    </section>
  );
};
