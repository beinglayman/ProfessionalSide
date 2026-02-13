import React from 'react';
import {
  mockReducedProfile,
  TOOL_META,
  getInitials,
  getConfidenceLevel,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  ArrowRight,
  Calendar,
  Wrench,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V15 — "Connected Ecosystem"                                        */
/*  Hub-and-spoke visual metaphor with category bar chart              */
/* ------------------------------------------------------------------ */

/** Count stories by archetype category */
function countByCategory(
  stories: typeof mockReducedProfile.publishedStories,
): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of stories) {
    map.set(s.archetype, (map.get(s.archetype) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

const CATEGORY_COLORS: Record<string, string> = {
  Architect: 'bg-blue-500',
  Detective: 'bg-amber-500',
  Multiplier: 'bg-purple-500',
  Builder: 'bg-emerald-500',
  Fixer: 'bg-red-500',
  Explorer: 'bg-indigo-500',
};

const TOOL_NODE_COLORS: Record<string, string> = {
  github: 'bg-gray-800',
  jira: 'bg-blue-600',
  confluence: 'bg-blue-500',
  slack: 'bg-purple-600',
  linear: 'bg-indigo-600',
  notion: 'bg-gray-700',
  gitlab: 'bg-orange-600',
  bitbucket: 'bg-blue-700',
};

export function ProfileV15() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);
  const categories = countByCategory(p.publishedStories);
  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  // Sort stories newest first
  const recentStories = [...p.publishedStories]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* ── Centered Profile ── */}
        <div className="text-center">
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.name}
              className="mx-auto h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <span className="text-2xl font-bold">{initials}</span>
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{p.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {p.title} at {p.company}
          </p>
          <Badge variant="secondary" className="mt-2 text-xs">
            {p.role}
          </Badge>
        </div>

        {/* ── Hub-and-Spoke: Connected Tools ── */}
        <div className="mt-10">
          <div className="flex items-center justify-center gap-0">
            {p.connectedTools.map((t, idx) => {
              const nodeColor =
                TOOL_NODE_COLORS[t.tool] ?? 'bg-gray-500';
              const meta = TOOL_META[t.tool];
              const isLast = idx === p.connectedTools.length - 1;

              return (
                <React.Fragment key={t.tool}>
                  {/* Tool node */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full text-white text-xs font-bold',
                        nodeColor,
                      )}
                      title={meta.label}
                    >
                      {meta.label.charAt(0)}
                    </div>
                    <span className="text-[10px] font-medium text-gray-600">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {t.activityCount}
                    </span>
                  </div>

                  {/* Connector line to center hub */}
                  {!isLast && (
                    <div className="mx-1 h-0.5 w-6 bg-gray-300 sm:w-10" />
                  )}

                  {/* Center hub (avatar) placed after the first half */}
                  {idx === Math.floor((p.connectedTools.length - 1) / 2) && (
                    <>
                      <div className="mx-1 h-0.5 w-6 bg-gray-300 sm:w-10" />
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-400 bg-primary-100 text-primary-700">
                          <span className="text-sm font-bold">{initials}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-700">
                          You
                        </span>
                      </div>
                      <div className="mx-1 h-0.5 w-6 bg-gray-300 sm:w-10" />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Funnel Metric ── */}
        <div className="mt-10 text-center">
          <p className="text-lg font-semibold text-gray-900">
            <span className="text-primary-600">{p.totalActivities}</span>{' '}
            activities{' '}
            <ArrowRight className="inline h-4 w-4 text-gray-400" />{' '}
            <span className="text-primary-600">
              {p.publishedStories.length}
            </span>{' '}
            stories
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Your tool activity has been synthesized into career stories
          </p>
        </div>

        {/* ── Category Bar Chart ── */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Stories by Category
            </h2>
            <div className="mt-4 space-y-3">
              {categories.map((cat) => {
                const barColor =
                  CATEGORY_COLORS[cat.category] ?? 'bg-gray-400';
                const widthPercent = Math.round((cat.count / maxCount) * 100);

                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-right text-sm text-gray-600">
                      {cat.category}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 w-full rounded bg-gray-100">
                        <div
                          className={cn(
                            'flex h-6 items-center rounded px-2',
                            barColor,
                          )}
                          style={{ width: `${Math.max(widthPercent, 12)}%` }}
                        >
                          <span className="text-xs font-medium text-white">
                            {cat.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Recent Stories ── */}
        <h2 className="mt-10 text-sm font-semibold text-gray-900">
          Recent Stories
        </h2>
        <div className="mt-3 space-y-3">
          {recentStories.map((story) => {
            const confidence = getConfidenceLevel(story.overallConfidence);
            const publishedDate = new Date(
              story.publishedAt,
            ).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <Card
                key={story.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Left: confidence circle */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      story.overallConfidence >= 0.8
                        ? 'bg-emerald-100 text-emerald-700'
                        : story.overallConfidence >= 0.6
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700',
                    )}
                  >
                    <span className="text-xs font-bold">
                      {Math.round(story.overallConfidence * 100)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 leading-snug line-clamp-1">
                      {story.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {story.framework}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {story.archetype}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {publishedDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {story.tools.length} source{story.tools.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Drafts note ── */}
        {p.draftStories.length > 0 && (
          <p className="mt-6 text-center text-sm text-gray-400">
            + {p.draftStories.length} draft{p.draftStories.length !== 1 ? 's' : ''} in progress
          </p>
        )}
      </div>
    </div>
  );
}
