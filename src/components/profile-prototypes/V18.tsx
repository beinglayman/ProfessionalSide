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
  Star,
  Wrench,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V18 — "Story Showcase"                                             */
/*  Featured story expanded + grid of remaining stories                */
/* ------------------------------------------------------------------ */

export function ProfileV18() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  // Featured story = first (most recent) published
  const [featured, ...remaining] = p.publishedStories;
  const featuredConfidence = featured
    ? getConfidenceLevel(featured.overallConfidence)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ── Compact Header ── */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <span className="text-sm font-semibold">{initials}</span>
          </div>

          {/* Name + title */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{p.name}</h1>
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                {p.role}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {p.title} at {p.company}
            </p>
          </div>

          {/* Tool icons */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {p.connectedTools.map((ta: MockToolActivity) => {
              const meta = TOOL_META[ta.tool as ConnectedTool];
              return (
                <span
                  key={ta.tool}
                  className={cn(
                    'inline-flex h-7 items-center rounded px-2 text-xs font-medium',
                    meta.bgColor,
                    meta.color,
                  )}
                  title={meta.label}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>

          {/* Edit button */}
          <button className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {/* ── Featured Story ── */}
        {featured && featuredConfidence && (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Star className="h-3.5 w-3.5" />
              Featured Story
            </h2>
            <Card className="mt-3 shadow-md">
              <CardContent className="p-6">
                {/* Title row */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {featured.title}
                  </h3>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(featured.publishedAt)}
                  </span>
                </div>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {featured.framework}
                  </span>
                  <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                    {featured.archetype}
                  </span>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-medium',
                      featuredConfidence.bgColor,
                      featuredConfidence.color,
                    )}
                  >
                    {featuredConfidence.label} ({Math.round(featured.overallConfidence * 100)}%)
                  </span>
                </div>

                {/* All sections */}
                <div className="mt-5 space-y-4">
                  {featured.sections.map((section) => (
                    <div key={section.key}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {section.key.toUpperCase()}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-gray-700">
                        {section.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Tool sources */}
                <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4">
                  <Wrench className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">Sources:</span>
                  {featured.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                    >
                      {tool}
                    </span>
                  ))}
                </div>

                {/* Confidence score bar */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400">Confidence</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        'h-1.5 rounded-full',
                        featured.overallConfidence >= 0.8
                          ? 'bg-emerald-500'
                          : featured.overallConfidence >= 0.6
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                      )}
                      style={{ width: `${featured.overallConfidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {Math.round(featured.overallConfidence * 100)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── More Stories Grid ── */}
        {remaining.length > 0 && (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <BookOpen className="h-3.5 w-3.5" />
              More Stories ({remaining.length})
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {remaining.map((story: MockCareerStory) => (
                <Card
                  key={story.id}
                  className="shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <p className="font-medium text-gray-900">{story.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        {story.framework}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(story.publishedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
