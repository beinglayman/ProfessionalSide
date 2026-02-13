import React from 'react';
import {
  mockReducedProfile,
  TOOL_META,
  getInitials,
  getConfidenceLevel,
} from './mock-data';
import { cn } from '../../lib/utils';
import { ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V14 — "Minimal Card"                                               */
/*  Ultra-minimal, text-only, maximum whitespace                       */
/* ------------------------------------------------------------------ */

export function ProfileV14() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  // Sort published stories newest first
  const sortedStories = [...p.publishedStories].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  // Connected tool names joined
  const toolNames = p.connectedTools
    .map((t) => {
      const meta = TOOL_META[t.tool];
      return meta.label;
    })
    .join(' \u00B7 ');

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* ── Identity ── */}
        <div className="flex items-center gap-4">
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
              <span className="text-base font-semibold">{initials}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
        </div>

        <p className="mt-3 text-base text-gray-600">
          {p.role} &middot; {p.title} at {p.company}
        </p>

        <p className="mt-2 text-sm text-gray-400">{toolNames}</p>

        {/* ── Divider ── */}
        <hr className="my-8 border-gray-200" />

        {/* ── Published count ── */}
        <p className="text-sm text-gray-500">
          {p.publishedStories.length} stories published
        </p>

        {/* ── Latest stories ── */}
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Latest
        </p>

        <div className="mt-4 space-y-5">
          {sortedStories.map((story) => {
            const confidence = getConfidenceLevel(story.overallConfidence);
            const publishedDate = new Date(
              story.publishedAt,
            ).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div key={story.id}>
                <p className="text-base text-gray-900">
                  &ldquo;{story.title}&rdquo;
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {story.framework} &middot; {story.archetype}
                </p>
                <p className="mt-0.5 text-sm text-gray-400">
                  {publishedDate} &middot;{' '}
                  {story.sections.length} section{story.sections.length !== 1 ? 's' : ''} &middot;{' '}
                  <span className={cn('font-medium', confidence.color)}>
                    {Math.round(story.overallConfidence * 100)}% confidence
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Drafts note ── */}
        {p.draftStories.length > 0 && (
          <p className="mt-8 text-sm text-gray-400">
            {p.draftStories.length} draft{p.draftStories.length !== 1 ? 's' : ''} in progress
          </p>
        )}

        {/* ── View all link ── */}
        <button
          type="button"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          View all stories
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
