/**
 * ParticipantsRow - renders the humans surfaced from a story's source
 * activities at the bottom of the fullscreen story view when Evidence
 * is on.
 *
 * Ship 3.1b expands this beyond Ship 3.1a's read-only version:
 *   - "Invite to validate" expands the card into an inline section
 *     picker with auto-suggested checkboxes based on which sections
 *     contain the participant's activities.
 *   - Confirm posts to the validation-invite endpoint, creates a
 *     StoryValidation row per checked section, fires a notification
 *     to the validator, and flips the card to a "Pending" state.
 *   - If a validator already has invitations on this story, the card
 *     shows their current validation statuses (PENDING / APPROVED /
 *     DISPUTED / etc.) instead of the Invite CTA.
 *   - "Invite to InChronicle" for unresolved users is still a
 *     placeholder (Ship 3.4).
 *
 * Design reference: public/prototypes/evidence/proto-V6c-tufte-inline-badges.html
 */

import React, { useMemo, useState } from 'react';
import { UserPlus, Users, Mail, UserCircle2, Check, X, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStoryParticipants } from '../../hooks/useStoryParticipants';
import { useStoryValidations, useInviteValidator } from '../../hooks/useStoryValidations';
import { CareerStoriesService } from '../../services/career-stories.service';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import type { CreateExternalInviteResponse } from '../../types/career-stories';
import type {
  StoryParticipant,
  ParticipantRole,
  StoryValidationSummary,
  StoryValidationStatus,
  StorySource,
} from '../../types/career-stories';

interface ParticipantsRowProps {
  storyId: string;
  isOwner?: boolean;
  hideWhenEmpty?: boolean;
  /** Section keys in canonical order for the picker checkboxes. */
  sectionKeys?: string[];
  /** Activity IDs per section - used to auto-suggest which sections each participant should validate. */
  sourcesBySection?: Map<string, StorySource[]>;
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

/** Two-letter initials for avatar fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

function uniqueSources(p: StoryParticipant): string[] {
  return Array.from(new Set(p.activities.map((a) => a.source)));
}

/** Visual treatment for validation-status chip. */
const STATUS_META: Record<
  StoryValidationStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  EDIT_SUGGESTED: { label: 'Edit suggested', color: 'bg-primary-50 text-primary-700 border-primary-200', icon: AlertTriangle },
  DISPUTED: { label: 'Disputed', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  INVALIDATED: { label: 'Needs re-review', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: Clock },
};

/** Sections (by key) that contain any activity where this participant appears. */
function autoSuggestedSections(
  participant: StoryParticipant,
  sectionKeys: string[],
  sourcesBySection: Map<string, StorySource[]> | undefined,
): Set<string> {
  const out = new Set<string>();
  if (!sourcesBySection) return out;
  const pActIds = new Set(participant.activities.map((a) => a.activityId));
  for (const key of sectionKeys) {
    const sources = sourcesBySection.get(key) ?? [];
    if (sources.some((s) => s.activityId && pActIds.has(s.activityId))) {
      out.add(key);
    }
  }
  return out;
}

interface ParticipantCardProps {
  p: StoryParticipant;
  isOwner?: boolean;
  sectionKeys?: string[];
  sourcesBySection?: Map<string, StorySource[]>;
  storyId: string;
  existing: StoryValidationSummary[];
}

function ParticipantCard({ p, isOwner, sectionKeys, sourcesBySection, storyId, existing }: ParticipantCardProps) {
  const role = dominantRole(p);
  const sources = uniqueSources(p);
  const activityCount = p.activities.length;

  // Existing invitations for this validator, grouped by section.
  const existingForUser = useMemo(() => {
    if (!p.user) return [] as StoryValidationSummary[];
    return existing.filter((e) => e.validatorId === p.user!.id);
  }, [existing, p.user]);
  const hasExistingInvites = existingForUser.length > 0;

  const invite = useInviteValidator(storyId);
  const qc = useQueryClient();
  const externalInvite = useMutation({
    mutationFn: ({ email, sections }: { email: string; sections: string[] }) =>
      CareerStoriesService.createExternalInvite(storyId, {
        email,
        sectionKeys: sections,
      }),
    onSuccess: () => {
      // If the email was actually an existing user, we materialized real
      // validations and need the Participants + validations data to refresh.
      qc.invalidateQueries({ queryKey: ['story-validations', storyId] });
      qc.invalidateQueries({ queryKey: ['story-participants', storyId] });
    },
  });
  const [externalResult, setExternalResult] = useState<CreateExternalInviteResponse | null>(null);

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const suggested = useMemo(
    () => autoSuggestedSections(p, sectionKeys ?? [], sourcesBySection),
    [p, sectionKeys, sourcesBySection],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(suggested));

  const openPicker = () => {
    // Reset selection to the auto-suggestion each time we open.
    setSelected(new Set(suggested));
    setExternalResult(null);
    setPickerOpen(true);
  };

  const toggleSection = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sendInvite = () => {
    if (!p.user || selected.size === 0) return;
    invite.mutate(
      {
        validatorUserId: p.user.id,
        sectionKeys: [...selected],
        groundingActivityIds: p.activities.map((a) => a.activityId),
      },
      { onSuccess: () => setPickerOpen(false) },
    );
  };

  const sendExternalInvite = () => {
    if (!p.email || selected.size === 0) return;
    externalInvite.mutate(
      { email: p.email, sections: [...selected] },
      {
        onSuccess: (res) => {
          const payload = res.data;
          if (payload) {
            setExternalResult(payload);
          }
        },
      },
    );
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3.5 transition-all',
        p.isResolved ? 'border-gray-200' : 'border-dashed border-gray-200',
        !pickerOpen && 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
      )}
    >
      {/* Header: avatar + name + role */}
      <div className="flex items-center gap-2.5 mb-2.5">
        {p.isResolved && p.user?.avatar ? (
          <img
            src={getAvatarUrl(p.user.avatar)}
            alt={p.displayName}
            onError={handleAvatarError}
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

      {/* Existing-invite status chips */}
      {hasExistingInvites && !pickerOpen && (
        <div className="mb-2 flex flex-wrap gap-1">
          {existingForUser.map((v) => {
            const meta = STATUS_META[v.status];
            const Icon = meta.icon;
            return (
              <span
                key={v.id}
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-1.5 py-0.5',
                  meta.color,
                )}
                title={`${v.sectionKey} — ${meta.label}`}
              >
                <Icon className="h-2.5 w-2.5" />
                {v.sectionKey}
              </span>
            );
          })}
        </div>
      )}

      {/* Picker (inline expansion) */}
      {pickerOpen && (
        <div className="mt-2 border-t border-gray-100 pt-2.5">
          <div className="text-[11px] font-medium text-gray-700 mb-1.5">
            Which sections should {p.displayName.split(' ')[0] || 'they'} approve?
          </div>
          {!p.isResolved && p.email && !externalResult && (
            <p className="text-[10px] text-gray-500 mb-1.5 italic">
              They'll receive an email at <span className="font-medium not-italic">{p.email}</span> and
              sign up to validate.
            </p>
          )}
          <div className="space-y-1 mb-2.5">
            {(sectionKeys ?? []).map((key) => {
              const isSelected = selected.has(key);
              const isSuggested = suggested.has(key);
              return (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 hover:bg-gray-50 rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSection(key)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span className="capitalize">{key}</span>
                  {isSuggested && (
                    <span className="text-[9px] uppercase tracking-wider text-primary-600 font-semibold">auto</span>
                  )}
                </label>
              );
            })}
          </div>
          {invite.isError && (
            <p className="text-[11px] text-red-600 mb-1.5">
              {(invite.error as Error | undefined)?.message || 'Failed to send invite. Try again.'}
            </p>
          )}
          {externalInvite.isError && (
            <p className="text-[11px] text-red-600 mb-1.5">
              {(externalInvite.error as Error | undefined)?.message || 'Failed to send invite. Try again.'}
            </p>
          )}
          {externalResult && externalResult.kind === 'external' && (
            <div className="rounded-md bg-primary-50/60 border border-primary-100 px-2.5 py-2 mb-1.5 space-y-1">
              <p className="text-[11px] text-primary-800 font-medium">
                Invite sent to {externalResult.invite.email}.
              </p>
              <p className="text-[10px] text-gray-500 break-all">
                Magic link: <span className="font-mono">{externalResult.magicLinkPath}</span>
              </p>
            </div>
          )}
          {externalResult && externalResult.kind === 'existing_user' && (
            <div className="rounded-md bg-emerald-50/60 border border-emerald-200 px-2.5 py-2 mb-1.5">
              <p className="text-[11px] text-emerald-800 font-medium">
                Already an InChronicle user - invite sent in-app ({externalResult.created} new,{' '}
                {externalResult.skipped} already pending).
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              disabled={invite.isPending || externalInvite.isPending}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
            >
              <X className="h-3 w-3" />
              {externalResult ? 'Close' : 'Cancel'}
            </button>
            {!externalResult && (
              <button
                type="button"
                onClick={p.isResolved ? sendInvite : sendExternalInvite}
                disabled={
                  invite.isPending ||
                  externalInvite.isPending ||
                  selected.size === 0 ||
                  (!p.isResolved && !p.email)
                }
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-medium rounded px-2 py-1',
                  invite.isPending ||
                    externalInvite.isPending ||
                    selected.size === 0 ||
                    (!p.isResolved && !p.email)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700',
                )}
              >
                {invite.isPending || externalInvite.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Invite ({selected.size})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer: activity count + action */}
      {!pickerOpen && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-400 font-mono">
            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
          </span>
          {isOwner && p.isResolved ? (
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 hover:text-primary-800"
            >
              <UserPlus className="h-3 w-3" />
              {hasExistingInvites ? 'Invite for more' : 'Invite to validate'}
            </button>
          ) : isOwner && !p.isResolved && p.email ? (
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 hover:text-primary-800"
              title={`Send a magic-link invite to ${p.email}`}
            >
              <Mail className="h-3 w-3" />
              Invite by email
            </button>
          ) : isOwner && !p.isResolved ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 cursor-not-allowed"
              title="No email captured for this participant"
            >
              <Mail className="h-3 w-3" />
              No email on file
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const ParticipantsRow: React.FC<ParticipantsRowProps> = ({
  storyId,
  isOwner,
  hideWhenEmpty,
  sectionKeys,
  sourcesBySection,
}) => {
  const { data, isLoading, isError, error } = useStoryParticipants(storyId, Boolean(isOwner));
  const { data: validationsData } = useStoryValidations(storyId, Boolean(isOwner));

  if (!isOwner || isLoading) return null;

  if (isError) {
    const msg = String((error as Error | undefined)?.message || '');
    if (msg.includes('403') || msg.includes('forbidden')) return null;
    return null;
  }

  const participants = data?.participants ?? [];
  const validations = validationsData?.validations ?? [];

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
          <ParticipantCard
            key={p.key}
            p={p}
            isOwner={isOwner}
            sectionKeys={sectionKeys}
            sourcesBySection={sourcesBySection}
            storyId={storyId}
            existing={validations}
          />
        ))}
      </div>
    </section>
  );
};
