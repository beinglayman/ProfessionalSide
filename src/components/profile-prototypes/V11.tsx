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
  Pencil,
  BookOpen,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V11 — "Story-First"                                                */
/*  Single column, story-dominant layout with timeline spine           */
/* ------------------------------------------------------------------ */

/** Group stories by quarter string like "Q1 2026" */
function getQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function groupByQuarter(
  stories: MockCareerStory[],
): { quarter: string; stories: MockCareerStory[] }[] {
  const map = new Map<string, MockCareerStory[]>();
  // Sort newest first
  const sorted = [...stories].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  for (const story of sorted) {
    const label = getQuarterLabel(story.publishedAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(story);
  }
  return Array.from(map.entries()).map(([quarter, stories]) => ({
    quarter,
    stories,
  }));
}

function StoryCard({ story }: { story: MockCareerStory }) {
  const [expanded, setExpanded] = useState(false);
  const confidence = getConfidenceLevel(story.overallConfidence);

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h4 className="font-semibold text-gray-900 leading-snug">
          {story.title}
        </h4>

        {/* Badges row */}
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

        {/* Confidence */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-gray-100">
            <div
              className={cn(
                'h-1.5 rounded-full',
                story.overallConfidence >= 0.8
                  ? 'bg-emerald-500'
                  : story.overallConfidence >= 0.6
                    ? 'bg-amber-500'
                    : 'bg-red-500',
              )}
              style={{ width: `${Math.round(story.overallConfidence * 100)}%` }}
            />
          </div>
          <span className={cn('text-xs font-medium', confidence.color)}>
            {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
          </span>
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
              Show {story.sections.length} sections
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

export function ProfileV11() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);
  const quarters = groupByQuarter(p.publishedStories);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* ── Compact Profile Header ── */}
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <span className="text-lg font-bold">{initials}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{p.name}</h1>
            <p className="text-sm text-gray-600">
              {p.role} &middot; {p.title} at {p.company}
            </p>

            {/* Connected tool badges */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.connectedTools.map((t) => {
                const meta = TOOL_META[t.tool];
                return (
                  <span
                    key={t.tool}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
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
          </div>

          {/* Edit button */}
          <button
            type="button"
            className="absolute right-0 top-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className="mt-6 flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-primary-500" />
            <span className="font-semibold text-gray-900">
              {p.publishedStories.length}
            </span>
            <span className="text-gray-500">Published</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2 text-sm">
            <FileEdit className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-gray-900">
              {p.draftStories.length}
            </span>
            <span className="text-gray-500">Drafts</span>
          </div>
        </div>

        {/* ── Story Timeline ── */}
        <div className="relative mt-8">
          {/* Vertical spine */}
          <div className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-gray-200" />

          {quarters.map((group) => (
            <div key={group.quarter} className="relative mb-8">
              {/* Quarter label */}
              <div className="relative mb-4 flex items-center gap-3">
                <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                  <span className="text-[10px] font-bold text-white">
                    {group.quarter.charAt(1)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-700">
                  {group.quarter}
                </h3>
              </div>

              {/* Stories in this quarter */}
              <div className="space-y-4 pl-[30px]">
                {group.stories.map((story) => (
                  <div key={story.id} className="relative">
                    {/* Dot on spine */}
                    <div className="absolute -left-[23px] top-5 z-10 h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-400" />
                    <StoryCard story={story} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
