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

/* ------------------------------------------------------------------ */
/*  V19 — "Compact Resume"                                             */
/*  Dense, print-friendly, resume-like maximum information density     */
/* ------------------------------------------------------------------ */

export function ProfileV19() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  const MAX_VISIBLE_TOOLS = 5;
  const visibleTools = p.connectedTools.slice(0, MAX_VISIBLE_TOOLS);
  const overflowCount = p.connectedTools.length - MAX_VISIBLE_TOOLS;

  // Group published stories by framework
  const storiesByFramework = p.publishedStories.reduce<Record<string, MockCareerStory[]>>(
    (acc, story) => {
      const key = story.framework;
      if (!acc[key]) acc[key] = [];
      acc[key].push(story);
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* ── Name ── */}
        <h1 className="text-3xl font-bold uppercase tracking-wide text-gray-900">
          {p.name}
        </h1>

        {/* Title / Company / Role */}
        <p className="mt-1 text-sm text-gray-600">
          {p.title} &middot; {p.company} &middot; {p.role}
        </p>

        {/* Tool icons row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {visibleTools.map((ta: MockToolActivity) => {
            const meta = TOOL_META[ta.tool as ConnectedTool];
            return (
              <span
                key={ta.tool}
                className={cn(
                  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                  meta.bgColor,
                  meta.color,
                )}
              >
                {meta.label}
              </span>
            );
          })}
          {overflowCount > 0 && (
            <span className="text-xs text-gray-400">+{overflowCount} more</span>
          )}
        </div>

        {/* Horizontal rule */}
        <hr className="my-6 border-gray-200" />

        {/* ── Stories Section ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Stories ({p.publishedStories.length})
          </h2>

          <div className="mt-4 space-y-5">
            {Object.entries(storiesByFramework).map(([framework, stories]) => (
              <div key={framework}>
                {/* Group header */}
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {framework}
                </h3>

                {/* Bulleted list */}
                <ul className="mt-1.5 space-y-1 pl-4">
                  {stories.map((story: MockCareerStory) => (
                    <li
                      key={story.id}
                      className="flex items-baseline gap-1 text-sm text-gray-800"
                    >
                      <span className="mr-1 text-gray-300">&bull;</span>
                      <span>{story.title}</span>
                      <span className="ml-1 text-xs text-gray-400">
                        ({story.framework}, {story.tools.length} source{story.tools.length !== 1 ? 's' : ''})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Horizontal rule */}
        <hr className="my-6 border-gray-200" />

        {/* ── Footer line ── */}
        <p className="text-xs text-gray-400">
          {p.draftStories.length} draft{p.draftStories.length !== 1 ? 's' : ''} in progress &middot;{' '}
          {p.totalActivities} total activities from {p.connectedTools.length} tool
          {p.connectedTools.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
