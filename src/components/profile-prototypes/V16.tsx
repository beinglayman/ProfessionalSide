import React from 'react';
import {
  mockReducedProfile,
  TOOL_META,
  getInitials,
  getConfidenceLevel,
} from './mock-data';
import type {
  MockCareerStory,
  MockDraftStory,
  MockToolActivity,
  ConnectedTool,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import {
  ArrowDown,
  BookOpen,
  Edit,
  FileText,
  Wrench,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V16 — "Activity-to-Story Funnel"                                   */
/*  Vertical flow showing tools -> activity -> drafts -> published     */
/* ------------------------------------------------------------------ */

export function ProfileV16() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* ── Compact Header ── */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <span className="text-sm font-semibold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900">
              {p.name} <span className="font-normal text-gray-400">&middot;</span>{' '}
              <span className="font-normal text-gray-500">{p.role}</span>
            </p>
            <p className="text-sm text-gray-500">
              {p.title} at {p.company}
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Edit className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>

        {/* ── Funnel ── */}
        <div className="mt-10 space-y-0">

          {/* ── Section 1: Connected Tools ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Wrench className="h-3.5 w-3.5" />
              Connected Tools
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {p.connectedTools.map((ta: MockToolActivity) => {
                const meta = TOOL_META[ta.tool as ConnectedTool];
                return (
                  <Card key={ta.tool} className="shadow-sm">
                    <CardContent className="p-3">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                          meta.bgColor,
                          meta.color,
                        )}
                      >
                        {meta.label}
                      </span>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {ta.activityCount}
                      </p>
                      <p className="text-xs text-gray-400">activities</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Funnel arrow */}
            <div className="flex flex-col items-center py-4 text-gray-300">
              <ArrowDown className="h-5 w-5" />
              <span className="mt-1 text-xs font-medium text-gray-400">
                {p.totalActivities} total activities
              </span>
            </div>
          </section>

          {/* ── Section 2: Draft Stories ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <FileText className="h-3.5 w-3.5" />
              Draft Stories ({p.draftStories.length})
            </h2>
            <div className="mt-3 space-y-2">
              {p.draftStories.map((draft: MockDraftStory) => (
                <Card key={draft.id} className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {draft.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {draft.framework}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-gray-500">
                        {draft.completionPercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-amber-400 transition-all"
                        style={{ width: `${draft.completionPercent}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Funnel arrow */}
            <div className="flex flex-col items-center py-4 text-gray-300">
              <ArrowDown className="h-5 w-5" />
            </div>
          </section>

          {/* ── Section 3: Published Stories ── */}
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <BookOpen className="h-3.5 w-3.5" />
              Published Stories ({p.publishedStories.length})
            </h2>
            <div className="mt-3 space-y-3">
              {p.publishedStories.map((story: MockCareerStory, idx: number) => {
                const confidence = getConfidenceLevel(story.overallConfidence);
                return (
                  <Card key={story.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Timeline dot + title */}
                          <div className="flex items-start gap-2">
                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                            <p className="text-sm font-semibold text-gray-900">
                              {story.title}
                            </p>
                          </div>

                          {/* Badges */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 pl-4">
                            <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                              {story.framework}
                            </span>
                            <span className="inline-block rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                              {story.archetype}
                            </span>
                            <span
                              className={cn(
                                'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                                confidence.bgColor,
                                confidence.color,
                              )}
                            >
                              {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatDate(story.publishedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* View all link */}
            <div className="mt-4 text-center">
              <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View all &rarr;
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
