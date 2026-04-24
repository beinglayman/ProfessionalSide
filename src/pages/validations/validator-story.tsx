/**
 * ValidatorStoryPage - /validate/:storyId
 *
 * Ship 3.2: validator reads a story they were invited to approve, with
 * per-section action bars on only the sections they're assigned to.
 * Other sections render read-only for context.
 *
 * Approve: one click, immediate update.
 * Dispute: inline textarea (required, <= 500 chars), then submit.
 */

import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Loader2, CheckCircle2, AlertTriangle, Clock, ShieldCheck, PencilLine } from 'lucide-react';
import {
  useApproveValidation,
  useDisputeValidation,
  useSuggestEdit,
  useValidatorStoryView,
} from '../../hooks/useMyValidations';
import { NARRATIVE_FRAMEWORKS } from '../../components/career-stories/constants';
import type { ValidatorStorySection, StoryValidationStatus } from '../../types/career-stories';
import { cn } from '../../lib/utils';

const STATUS_META: Record<StoryValidationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Awaiting your review', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  APPROVED: { label: 'You approved this', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  EDIT_SUGGESTED: { label: 'Edit sent to author', color: 'text-primary-700 bg-primary-50 border-primary-200', icon: AlertTriangle },
  DISPUTED: { label: 'You disputed this', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle },
  INVALIDATED: { label: 'Needs re-review', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Clock },
};

interface SectionActionBarProps {
  section: ValidatorStorySection;
  storyId: string;
  /** Current section prose - used to pre-fill the "Suggest edit" textarea. */
  currentText: string;
}

function SectionActionBar({ section, storyId, currentText }: SectionActionBarProps) {
  const [mode, setMode] = useState<'idle' | 'dispute' | 'edit'>('idle');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState(currentText);

  const approve = useApproveValidation(storyId);
  const dispute = useDisputeValidation(storyId);
  const suggest = useSuggestEdit(storyId);

  const meta = STATUS_META[section.status];
  const Icon = meta.icon;
  const isPending = section.status === 'PENDING';
  const isEditSuggested = section.status === 'EDIT_SUGGESTED';

  // Responded states (APPROVED / DISPUTED / EDIT_SUGGESTED / INVALIDATED).
  if (!isPending && mode === 'idle') {
    return (
      <div className={cn('mt-4 rounded-md border px-3 py-2 flex items-start gap-2 text-xs', meta.color)}>
        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium">{meta.label}</span>
          {section.note && (
            <p className="mt-0.5 text-[11px] italic opacity-90">&ldquo;{section.note}&rdquo;</p>
          )}
          {isEditSuggested && (
            <p className="mt-0.5 text-[11px] opacity-80">Waiting on the author to accept or reject.</p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'dispute') {
    return (
      <div className="mt-4 rounded-md border border-red-200 bg-red-50/50 px-3 py-2.5">
        <div className="text-xs font-medium text-red-800 mb-1.5">Why are you disputing this?</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. The timeline was Q2 not Q1, and I wasn't the reviewer on the migration PR."
          className="w-full text-xs border border-red-200 rounded bg-white px-2 py-1.5 focus:ring-1 focus:ring-red-400 focus:outline-none resize-y"
        />
        {dispute.isError && (
          <p className="mt-1 text-[11px] text-red-700">
            {(dispute.error as Error | undefined)?.message || 'Could not submit. Try again.'}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-red-500">{note.length} / 500</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setMode('idle'); setNote(''); dispute.reset(); }}
              disabled={dispute.isPending}
              className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-800 px-2 py-1 rounded"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (note.trim().length === 0) return;
                dispute.mutate(
                  { validationId: section.validationId, note: note.trim() },
                  { onSuccess: () => setMode('idle') },
                );
              }}
              disabled={dispute.isPending || note.trim().length === 0}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium rounded px-2 py-1',
                dispute.isPending || note.trim().length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700',
              )}
            >
              {dispute.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
              Submit dispute
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'edit') {
    return (
      <div className="mt-4 rounded-md border border-primary-200 bg-primary-50/40 px-3 py-2.5">
        <div className="text-xs font-medium text-primary-800 mb-1.5">Propose a rewrite</div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          maxLength={5000}
          placeholder="Edit this section as you'd like it to read..."
          className="w-full text-sm border border-primary-200 rounded bg-white px-2 py-1.5 focus:ring-1 focus:ring-primary-400 focus:outline-none resize-y font-serif leading-relaxed"
        />
        {suggest.isError && (
          <p className="mt-1 text-[11px] text-red-700">
            {(suggest.error as Error | undefined)?.message || 'Could not send. Try again.'}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-primary-500">{draft.length} / 5000</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setMode('idle'); setDraft(currentText); suggest.reset(); }}
              disabled={suggest.isPending}
              className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-800 px-2 py-1 rounded"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const trimmed = draft.trim();
                if (trimmed.length === 0) return;
                suggest.mutate(
                  { validationId: section.validationId, suggestedText: trimmed },
                  { onSuccess: () => setMode('idle') },
                );
              }}
              disabled={suggest.isPending || draft.trim().length === 0 || draft.trim() === currentText.trim()}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium rounded px-2 py-1',
                suggest.isPending || draft.trim().length === 0 || draft.trim() === currentText.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700',
              )}
            >
              {suggest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PencilLine className="h-3 w-3" />}
              Send suggestion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
        <span className="text-xs font-medium text-amber-900 flex-1">Awaiting your review</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => approve.mutate(section.validationId)}
            disabled={approve.isPending}
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium rounded px-2.5 py-1',
              approve.isPending
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700',
            )}
          >
            {approve.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Approve
          </button>
          <button
            type="button"
            onClick={() => { setDraft(currentText); setMode('edit'); }}
            disabled={approve.isPending}
            className="inline-flex items-center gap-1 text-[11px] font-medium rounded px-2.5 py-1 border border-primary-200 text-primary-700 bg-white hover:bg-primary-50"
          >
            <PencilLine className="h-3 w-3" />
            Suggest edit
          </button>
          <button
            type="button"
            onClick={() => setMode('dispute')}
            disabled={approve.isPending}
            className="inline-flex items-center gap-1 text-[11px] font-medium rounded px-2.5 py-1 border border-red-200 text-red-700 bg-white hover:bg-red-50"
          >
            <AlertTriangle className="h-3 w-3" />
            Dispute
          </button>
        </div>
      </div>
      {approve.isError && (
        <p className="mt-1.5 text-[11px] text-red-700">
          {(approve.error as Error | undefined)?.message || 'Could not approve. Try again.'}
        </p>
      )}
    </div>
  );
}

export default function ValidatorStoryPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { data, isLoading, isError, error } = useValidatorStoryView(storyId);

  const mySectionByKey = useMemo(() => {
    const m = new Map<string, ValidatorStorySection>();
    if (data?.mySections) for (const s of data.mySections) m.set(s.sectionKey, s);
    return m;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <p className="text-gray-500 text-sm">
          {(error as Error | undefined)?.message || 'You don\'t have access to this story.'}
        </p>
        <Link to="/me/validations" className="text-primary-600 hover:underline text-sm">
          Back to your validations
        </Link>
      </div>
    );
  }

  const { story, author, mySections } = data;
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework as keyof typeof NARRATIVE_FRAMEWORKS];
  const sectionKeys = frameworkMeta?.sections ?? Object.keys(story.sections);
  const pendingCount = mySections.filter((s) => s.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header with reviewer context */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to="/me/validations"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to your validations
          </Link>
          <div className="inline-flex items-center gap-2 rounded-md bg-primary-50 border border-primary-200 px-3 py-1 text-xs text-primary-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Reviewer mode
            {pendingCount > 0 && (
              <span className="ml-1 text-[10px] font-medium text-primary-900 bg-primary-100 rounded-full px-1.5 py-0.5">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Who and what */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            {author.avatar ? (
              <img src={author.avatar} alt={author.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                {author.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">A story by</p>
              <p className="text-sm font-semibold text-gray-900">
                {author.name}
                {author.title && <span className="text-gray-500 font-normal">, {author.title}</span>}
              </p>
            </div>
          </div>
          <h1 className="font-serif text-3xl font-bold text-gray-900 leading-tight tracking-tight">
            {story.title}
          </h1>
        </div>

        {/* Sections */}
        <div className="space-y-10 border-t border-gray-200 pt-8">
          {sectionKeys.map((key: string) => {
            const section = story.sections[key];
            if (!section) return null;
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            const myRow = mySectionByKey.get(key);
            return (
              <section key={key}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 mb-3">
                  {label}
                  {!myRow && (
                    <span className="ml-2 normal-case tracking-normal text-[10px] text-gray-400">
                      (not assigned to you)
                    </span>
                  )}
                </h2>
                {section.summary ? (
                  <p className="font-serif text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {section.summary}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No content</p>
                )}
                {myRow && (
                  <SectionActionBar
                    section={myRow}
                    storyId={story.id}
                    currentText={section.summary || ''}
                  />
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-16 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          Your validation only counts for the sections you were assigned. Others can be reviewed by different peers.
        </div>
      </main>
    </div>
  );
}
