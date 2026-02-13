import React, { useState } from 'react';
import {
  mockReducedProfile,
  TOOL_META,
  getInitials,
  getConfidenceLevel,
} from './mock-data';
import type { MockCareerStory } from './mock-data';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  Wrench,
  BookOpen,
  FileEdit,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V13 — "Tool Activity Map"                                          */
/*  Two-column: left sidebar (identity + tools), right (stories)       */
/* ------------------------------------------------------------------ */

function relativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffDays = Math.floor((now - then) / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function TimelineStory({ story }: { story: MockCareerStory }) {
  const [expanded, setExpanded] = useState(false);
  const confidence = getConfidenceLevel(story.overallConfidence);
  const publishedDate = new Date(story.publishedAt).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-2">
        <h4 className="font-semibold text-gray-900 leading-snug">
          {story.title}
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary-200 bg-primary-50 text-xs text-primary-700"
          >
            {story.framework}
          </Badge>
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-xs text-purple-700"
          >
            {story.archetype}
          </Badge>
          <span className={cn('text-xs font-medium', confidence.color)}>
            {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          {publishedDate}
        </div>

        {/* Tool sources */}
        <div className="flex flex-wrap gap-1.5">
          {story.tools.map((toolKey) => {
            const key = toolKey.toLowerCase() as keyof typeof TOOL_META;
            const meta = TOOL_META[key];
            if (!meta) return null;
            return (
              <span
                key={toolKey}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  meta.bgColor,
                  meta.color,
                )}
              >
                <Wrench className="h-2.5 w-2.5" />
                {meta.label}
              </span>
            );
          })}
        </div>

        {/* Expandable sections */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Hide sections
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {story.sections.length} sections
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            {story.sections.map((section) => {
              const sc = getConfidenceLevel(section.confidence);
              return (
                <div key={section.key} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {section.label}
                    </span>
                    <span className={cn('text-[10px] font-medium', sc.color)}>
                      {Math.round(section.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {section.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfileV13() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  // Sort published stories newest first
  const sortedStories = [...p.publishedStories].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-80 shrink-0 space-y-6">
          {/* Identity */}
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Avatar */}
              {p.avatar ? (
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <span className="text-xl font-bold">{initials}</span>
                </div>
              )}

              <div>
                <h1 className="text-lg font-bold text-gray-900">{p.name}</h1>
                <p className="text-sm text-gray-600">{p.role}</p>
                <p className="text-sm text-gray-500">
                  {p.title} at {p.company}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Connected Tools */}
          <Card>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Wrench className="h-4 w-4 text-gray-400" />
                Connected Tools
              </h2>

              <div className="mt-4 space-y-4">
                {p.connectedTools.map((t) => {
                  const meta = TOOL_META[t.tool];
                  return (
                    <div key={t.tool}>
                      {/* Tool header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center rounded h-6 w-6 text-[10px] font-bold',
                              meta.bgColor,
                              meta.color,
                            )}
                          >
                            {meta.label.charAt(0)}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {meta.label}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {t.activityCount} activities
                        </Badge>
                      </div>

                      {/* Recent items */}
                      <div className="mt-1.5 ml-8 space-y-1">
                        {t.recentItems.slice(0, 3).map((item, idx) => (
                          <p
                            key={idx}
                            className="text-xs text-gray-500 leading-tight truncate"
                          >
                            <span className="text-gray-400">
                              {relativeDate(item.date)}
                            </span>{' '}
                            &mdash; {item.title}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BookOpen className="h-5 w-5 text-primary-500" />
              Career Stories
            </h2>
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              View All
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Timeline */}
          <div className="relative mt-6">
            {/* Vertical spine */}
            <div className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-gray-200" />

            <div className="space-y-5">
              {sortedStories.map((story) => (
                <div key={story.id} className="relative pl-[30px]">
                  {/* Dot on spine */}
                  <div className="absolute left-[7px] top-5 z-10 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-500" />
                  <TimelineStory story={story} />
                </div>
              ))}
            </div>
          </div>

          {/* Drafts note */}
          {p.draftStories.length > 0 && (
            <div className="mt-8 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <FileEdit className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                {p.draftStories.length} draft{p.draftStories.length !== 1 ? 's' : ''} in progress
              </span>
              <div className="flex-1" />
              <button
                type="button"
                className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
              >
                Continue editing
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
