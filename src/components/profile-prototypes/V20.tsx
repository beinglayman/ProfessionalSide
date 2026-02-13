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
  BookOpen,
  Calendar,
  Edit,
  FileText,
  Wrench,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V20 — "Live Activity"                                              */
/*  Two-column: left = live tool activity, right = stories             */
/* ------------------------------------------------------------------ */

export function ProfileV20() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  const formatDateFull = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ── Compact Header ── */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <span className="text-sm font-semibold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900">{p.name}</h1>
            <p className="text-sm text-gray-500">
              {p.role} &middot; {p.title} at {p.company}
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Edit className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>

        {/* ── Two-Column Layout ── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Left Column: Tools & Activity ── */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Wrench className="h-3.5 w-3.5" />
              Tools &amp; Activity
            </h2>

            <div className="mt-3 space-y-3">
              {p.connectedTools.map((ta: MockToolActivity) => {
                const meta = TOOL_META[ta.tool as ConnectedTool];
                const hasRecent = ta.recentItems.length > 0;
                const displayItems = ta.recentItems.slice(0, 3);

                return (
                  <Card key={ta.tool} className="shadow-sm">
                    <CardContent className="p-4">
                      {/* Tool header with status dot */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            hasRecent ? 'bg-emerald-500' : 'bg-gray-300',
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            meta.color,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                          {ta.activityCount} activities
                        </span>
                      </div>

                      {/* Recent items */}
                      {displayItems.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-4">
                          {displayItems.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-baseline justify-between gap-2 text-xs"
                            >
                              <span className="truncate text-gray-600">
                                {item.title}
                              </span>
                              <span className="shrink-0 text-gray-400">
                                {formatDate(item.date)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Total activities footer */}
            <p className="mt-4 text-center text-xs text-gray-400">
              {p.totalActivities} activities this month
            </p>
          </div>

          {/* ── Right Column: Stories ── */}
          <div>
            {/* Published Stories */}
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <BookOpen className="h-3.5 w-3.5" />
              Published ({p.publishedStories.length})
            </h2>

            <div className="mt-3 space-y-2">
              {p.publishedStories.map((story: MockCareerStory) => {
                const confidence = getConfidenceLevel(story.overallConfidence);
                return (
                  <Card key={story.id} className="shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-gray-900">
                        {story.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                          {story.framework}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {formatDateFull(story.publishedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Draft Stories */}
            <h2 className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <FileText className="h-3.5 w-3.5" />
              Drafts ({p.draftStories.length})
            </h2>

            <div className="mt-3 space-y-2">
              {p.draftStories.map((draft: MockDraftStory) => (
                <Card key={draft.id} className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-gray-900">
                        {draft.title}
                      </p>
                      <span className="shrink-0 text-xs font-medium text-gray-500">
                        {draft.completionPercent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-1 rounded-full transition-all',
                          draft.completionPercent >= 60
                            ? 'bg-emerald-400'
                            : draft.completionPercent >= 30
                              ? 'bg-amber-400'
                              : 'bg-gray-300',
                        )}
                        style={{ width: `${draft.completionPercent}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* View all link */}
            <div className="mt-4 text-center">
              <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View all &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
