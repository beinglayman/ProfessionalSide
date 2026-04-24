/**
 * ValidatorInboxPage - /me/validations
 *
 * Ship 3.2: reader's side of peer validation. Shows pending + recently
 * responded validation rows grouped by story, so the validator can scan
 * their queue and jump into the story-level review.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useMyValidations } from '../../hooks/useMyValidations';
import type { MyValidationRow, StoryValidationStatus } from '../../types/career-stories';
import { cn } from '../../lib/utils';

interface StoryGroup {
  storyId: string;
  storyTitle: string;
  authorName: string;
  authorAvatar: string | null;
  rows: MyValidationRow[];
  pendingCount: number;
  earliestRequestedAt: string;
}

function groupByStory(rows: MyValidationRow[]): StoryGroup[] {
  const byStory = new Map<string, StoryGroup>();
  for (const row of rows) {
    const existing = byStory.get(row.storyId);
    if (existing) {
      existing.rows.push(row);
      if (row.status === 'PENDING') existing.pendingCount += 1;
      if (row.requestedAt < existing.earliestRequestedAt) existing.earliestRequestedAt = row.requestedAt;
    } else {
      byStory.set(row.storyId, {
        storyId: row.storyId,
        storyTitle: row.storyTitle,
        authorName: row.authorName,
        authorAvatar: row.authorAvatar,
        rows: [row],
        pendingCount: row.status === 'PENDING' ? 1 : 0,
        earliestRequestedAt: row.requestedAt,
      });
    }
  }
  // Sort: stories with pending items first (most pending first), then by most recent request.
  return [...byStory.values()].sort((a, b) => {
    if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
    return a.earliestRequestedAt < b.earliestRequestedAt ? 1 : -1;
  });
}

const STATUS_META: Record<StoryValidationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  EDIT_SUGGESTED: { label: 'Edit sent', color: 'bg-primary-50 text-primary-700 border-primary-200', icon: AlertTriangle },
  DISPUTED: { label: 'Disputed', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  INVALIDATED: { label: 'Needs re-review', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: Clock },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ValidatorInboxPage() {
  const { data, isLoading, isError, error } = useMyValidations(true);
  const groups = useMemo(() => groupByStory(data?.validations ?? []), [data]);
  const totalPending = groups.reduce((acc, g) => acc + g.pendingCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Validations</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Review requests for you</h1>
          <p className="mt-1 text-sm text-gray-600">
            Coworkers have asked you to validate specific sections of their stories. Approve what you witnessed, dispute what you didn't.
          </p>
          {totalPending > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
              <Clock className="h-3.5 w-3.5" />
              {totalPending} pending {totalPending === 1 ? 'section' : 'sections'} across {groups.filter(g => g.pendingCount > 0).length} {groups.filter(g => g.pendingCount > 0).length === 1 ? 'story' : 'stories'}
            </div>
          )}
        </header>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>
        )}

        {isError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {(error as Error | undefined)?.message || 'Failed to load your validations.'}
          </div>
        )}

        {!isLoading && !isError && groups.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
            <ShieldCheck className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">No review requests yet</p>
            <p className="text-xs text-gray-400 mt-1">
              When a coworker asks you to validate claims in their story, they'll show up here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {groups.map((g) => (
            <Link
              key={g.storyId}
              to={`/validate/${g.storyId}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-primary-200 hover:shadow-[0_2px_12px_rgba(93,37,159,0.08)] transition-all"
            >
              <div className="flex items-start gap-4">
                {g.authorAvatar ? (
                  <img src={g.authorAvatar} alt={g.authorName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                    {initials(g.authorName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{g.authorName} asked you to validate</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 leading-snug mb-2 truncate">
                    {g.storyTitle}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {g.rows.map((r) => {
                      const meta = STATUS_META[r.status];
                      const Icon = meta.icon;
                      return (
                        <span
                          key={r.id}
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5',
                            meta.color,
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          <span className="capitalize">{r.sectionKey}</span>
                          {r.status !== 'PENDING' && <span className="text-gray-400">· {meta.label.toLowerCase()}</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
