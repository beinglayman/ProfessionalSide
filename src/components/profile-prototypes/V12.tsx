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
  BookOpen,
  FileEdit,
  Wrench,
  Activity,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V12 — "Dashboard Card"                                             */
/*  Centered identity card + metric strip + story grid                 */
/* ------------------------------------------------------------------ */

export function ProfileV12() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);

  const metrics = [
    {
      label: 'Published',
      value: p.publishedStories.length,
      icon: BookOpen,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'Drafts',
      value: p.draftStories.length,
      icon: FileEdit,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Tools',
      value: p.connectedTools.length,
      icon: Wrench,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Activities',
      value: p.totalActivities,
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* ── Identity Card ── */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 px-6 py-10 text-center">
            {/* Avatar */}
            {p.avatar ? (
              <img
                src={p.avatar}
                alt={p.name}
                className="mx-auto h-20 w-20 rounded-full border-4 border-white/30 object-cover"
              />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/20">
                <span className="text-2xl font-bold text-white">
                  {initials}
                </span>
              </div>
            )}

            {/* Name */}
            <h1 className="mt-4 text-2xl font-bold text-white">{p.name}</h1>

            {/* Title at Company */}
            <p className="mt-1 text-sm text-white/80">
              {p.title} at {p.company}
            </p>

            {/* Role badge */}
            <div className="mt-3">
              <Badge className="border-white/30 bg-white/20 text-xs text-white hover:bg-white/30">
                {p.role}
              </Badge>
            </div>
          </div>
        </Card>

        {/* ── Metric Strip ── */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="text-center">
                <CardContent className="p-5">
                  <div
                    className={cn(
                      'mx-auto flex h-10 w-10 items-center justify-center rounded-full',
                      m.bg,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', m.color)} />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-gray-900">
                    {m.value}
                  </p>
                  <p className="text-xs text-gray-500">{m.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Story Grid ── */}
        <h2 className="mt-10 text-lg font-semibold text-gray-900">
          Career Stories
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {p.publishedStories.map((story) => {
            const confidence = getConfidenceLevel(story.overallConfidence);
            const publishedDate = new Date(story.publishedAt).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' },
            );

            return (
              <Card
                key={story.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5 space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                    {story.title}
                  </h3>

                  {/* Framework + Archetype pills */}
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
                  </div>

                  {/* Confidence score */}
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
                        style={{
                          width: `${Math.round(story.overallConfidence * 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn('text-xs font-medium whitespace-nowrap', confidence.color)}
                    >
                      {confidence.label} {Math.round(story.overallConfidence * 100)}%
                    </span>
                  </div>

                  {/* Published date */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {publishedDate}
                  </div>

                  {/* Tool icons */}
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
                          {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
