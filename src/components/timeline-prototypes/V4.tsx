'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  GitBranch, SquareKanban, Hash, FileText, Figma, Video,
  ChevronDown, ChevronRight, Star, ArrowUpRight, Calendar,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Inline Utilities                                                          */
/* -------------------------------------------------------------------------- */

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const formatDateRange = (start: string, end: string): string => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
};

function SourceIcon({ source, className }: { source: ActivitySource; className?: string }) {
  const icons: Record<ActivitySource, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <SquareKanban className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

/* -------------------------------------------------------------------------- */
/*  Feed Types                                                                */
/* -------------------------------------------------------------------------- */

type FeedItem =
  | { kind: 'activity'; activity: MockActivity; globalIndex: number }
  | { kind: 'draft'; draft: MockDraftStory }
  | { kind: 'group-header'; group: TemporalGroup };

/* -------------------------------------------------------------------------- */
/*  Main Component — V4 "Split Stream"                                        */
/* -------------------------------------------------------------------------- */

/**
 * V4 — "Split Stream"
 *
 * Activities alternate left and right of a central spine. Draft story cards
 * span the full width across both columns, interrupting the stream with
 * purple-themed editorial cards. Hovering a draft highlights its linked
 * activities; clicking expands its contributing activity list.
 */
export function TimelineV4() {
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);

  /* ---- Pre-compute draft ↔ activity relationships ---- */
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  /* ---- Build the interleaved feed ---- */
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    const insertedDrafts = new Set<string>();
    let globalIndex = 0;

    for (const group of mockTemporalGroups) {
      items.push({ kind: 'group-header', group });

      for (const activity of group.activities) {
        // Before emitting this activity, check if it is the first member of
        // an un-inserted draft — if so, insert the draft card first.
        const draftIds = activityDraftMap[activity.id] ?? [];
        for (const draftId of draftIds) {
          if (!insertedDrafts.has(draftId)) {
            insertedDrafts.add(draftId);
            const draft = mockDraftStories.find((d) => d.id === draftId);
            if (draft) {
              items.push({ kind: 'draft', draft });
            }
          }
        }

        items.push({ kind: 'activity', activity, globalIndex });
        globalIndex++;
      }
    }

    return items;
  }, []);

  /* ---- Get contributing activities for expanded draft ---- */
  const expandedContributing = useMemo(() => {
    if (!expandedDraftId) return null;
    const draft = mockDraftStories.find((d) => d.id === expandedDraftId);
    if (!draft) return null;
    const activities = getActivitiesForDraft(draft);
    // Group by source
    const grouped: Record<string, MockActivity[]> = {};
    for (const a of activities) {
      if (!grouped[a.source]) grouped[a.source] = [];
      grouped[a.source].push(a);
    }
    return grouped;
  }, [expandedDraftId]);

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Activity Timeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Split stream view &mdash; activities flow on both sides of the timeline
          </p>
        </div>

        {/* Timeline container with central spine */}
        <div className="relative">
          {/* Central spine */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />

          {feed.map((item, feedIdx) => {
            /* ---- GROUP HEADER ---- */
            if (item.kind === 'group-header') {
              return (
                <div
                  key={`gh-${item.group.key}`}
                  className="relative flex items-center justify-center py-6"
                >
                  {/* Horizontal rules on both sides */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 -translate-y-1/2" />

                  {/* Label pill centered on spine */}
                  <div className="relative z-10 bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {item.group.label}
                    </span>
                  </div>
                </div>
              );
            }

            /* ---- DRAFT CARD ---- */
            if (item.kind === 'draft') {
              const { draft } = item;
              const isExpanded = expandedDraftId === draft.id;
              const contributingActivities = getActivitiesForDraft(draft);

              return (
                <div
                  key={`draft-${draft.id}`}
                  className="relative py-4 px-8"
                  onMouseEnter={() => setHoveredDraftId(draft.id)}
                  onMouseLeave={() => setHoveredDraftId(null)}
                >
                  {/* Star icon on spine */}
                  <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20">
                    <div className="w-8 h-8 rounded-full bg-purple-100 border-4 border-white shadow-md flex items-center justify-center ring-2 ring-purple-300">
                      <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
                    </div>
                  </div>

                  {/* Draft card spanning full width */}
                  <div
                    className={cn(
                      'mt-6 border-2 border-dashed border-purple-300 rounded-2xl',
                      'bg-gradient-to-br from-purple-50 via-purple-100/50 to-white',
                      'p-6 cursor-pointer transition-all duration-200',
                      'hover:shadow-lg hover:border-purple-400',
                      isExpanded && 'shadow-lg border-purple-400',
                    )}
                    onClick={() =>
                      setExpandedDraftId((prev) => (prev === draft.id ? null : draft.id))
                    }
                  >
                    {/* Top row: Draft label + role badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-purple-300 text-purple-700 bg-purple-50 font-semibold uppercase tracking-wider"
                        >
                          Draft Story
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold',
                            draft.dominantRole === 'Led'
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : draft.dominantRole === 'Contributed'
                                ? 'border-blue-300 text-blue-700 bg-blue-50'
                                : 'border-gray-300 text-gray-600 bg-gray-50',
                          )}
                        >
                          <Star className="w-2.5 h-2.5 mr-0.5" />
                          {draft.dominantRole}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2">
                      {draft.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {draft.description}
                    </p>

                    {/* Middle row: tool icons + topic chips */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      {/* Overlapping tool icon stack */}
                      <div className="flex items-center -space-x-1.5">
                        {draft.tools.map((tool) => (
                          <div
                            key={tool}
                            className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                            style={{ backgroundColor: SOURCE_META[tool].color }}
                          >
                            <SourceIcon source={tool} className="w-3.5 h-3.5 text-white" />
                          </div>
                        ))}
                        <span className="pl-3 text-xs text-gray-500 font-medium">
                          {contributingActivities.length} activities
                        </span>
                      </div>

                      {/* Topic chips */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {draft.topics.map((topic) => (
                          <span
                            key={topic}
                            className="bg-purple-100 text-purple-700 text-[11px] px-2 py-0.5 rounded-full font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom row: expand indicator + CTA */}
                    <div className="flex items-center justify-between">
                      <button
                        className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium hover:text-purple-800 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDraftId((prev) => (prev === draft.id ? null : draft.id));
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {isExpanded ? 'Hide activities' : 'Show contributing activities'}
                      </button>

                      <button
                        className={cn(
                          'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shrink-0',
                          'bg-gradient-to-r from-purple-600 to-indigo-500 text-white',
                          'hover:from-purple-700 hover:to-indigo-600 hover:shadow-md',
                          'active:scale-[0.97]',
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        Create Story
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expanded: contributing activities list */}
                    {isExpanded && expandedContributing && (
                      <div className="mt-5 pt-4 border-t border-purple-200 animate-in">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
                          Contributing Activities
                        </p>
                        <div className="space-y-3">
                          {Object.entries(expandedContributing).map(([source, activities]) => (
                            <div key={source}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{
                                    backgroundColor: `${SOURCE_META[source as ActivitySource].color}18`,
                                  }}
                                >
                                  <SourceIcon
                                    source={source as ActivitySource}
                                    className="w-3 h-3"
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">
                                  {SOURCE_META[source as ActivitySource].name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  ({activities.length})
                                </span>
                              </div>
                              <div className="pl-7 space-y-1">
                                {activities.map((a) => (
                                  <div
                                    key={a.id}
                                    className="flex items-center justify-between gap-2 text-xs py-0.5"
                                  >
                                    <span className="text-gray-700 truncate">{a.title}</span>
                                    <span className="text-gray-400 whitespace-nowrap shrink-0">
                                      {timeAgo(a.timestamp)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            /* ---- ACTIVITY CARD ---- */
            if (item.kind === 'activity') {
              const { activity, globalIndex } = item;
              const isLeft = globalIndex % 2 === 0;
              const meta = SOURCE_META[activity.source];
              const belongsToDraftIds = activityDraftMap[activity.id] ?? [];
              const hasDraftLink = belongsToDraftIds.length > 0;
              const isHighlighted = hoveredDraftActivityIds.has(activity.id);
              const isDimmed = hoveredDraftId !== null && !isHighlighted;

              return (
                <div
                  key={activity.id}
                  className={cn(
                    'relative flex items-center py-2 transition-all duration-200',
                    isDimmed && 'opacity-30',
                  )}
                >
                  {/* Center dot on spine */}
                  <div className="absolute left-1/2 -translate-x-1/2 z-10">
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all duration-200',
                        isHighlighted && 'ring-2 ring-purple-400 ring-offset-1 scale-125',
                      )}
                      style={{ backgroundColor: meta.color }}
                    />
                  </div>

                  {/* Left side card */}
                  {isLeft && (
                    <>
                      <div className="w-1/2 pr-8 flex justify-end">
                        <Card
                          className={cn(
                            'w-[280px] shadow-sm hover:shadow-md transition-all duration-200',
                            isHighlighted && 'border-purple-400 shadow-purple-100 shadow-md',
                          )}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${meta.color}18` }}
                              >
                                <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {activity.title}
                                </p>
                                {activity.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                    {activity.description}
                                  </p>
                                )}
                                <span className="text-[11px] text-gray-400 mt-1 block">
                                  {timeAgo(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                            {hasDraftLink && (
                              <div className="mt-2 pt-1.5 border-t border-gray-100">
                                <span className="text-[10px] text-purple-500 font-medium">
                                  Linked to draft story
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                      {/* Right side empty + connector line */}
                      <div className="w-1/2 pl-8 relative">
                        {/* Connector line from card to center dot */}
                        <div className="absolute left-0 top-1/2 w-8 h-px bg-gray-200 -translate-y-1/2" />
                      </div>
                    </>
                  )}

                  {/* Right side card */}
                  {!isLeft && (
                    <>
                      {/* Left side empty + connector line */}
                      <div className="w-1/2 pr-8 relative">
                        {/* Connector line from center dot to card */}
                        <div className="absolute right-0 top-1/2 w-8 h-px bg-gray-200 -translate-y-1/2" />
                      </div>
                      <div className="w-1/2 pl-8 flex justify-start">
                        <Card
                          className={cn(
                            'w-[280px] shadow-sm hover:shadow-md transition-all duration-200',
                            isHighlighted && 'border-purple-400 shadow-purple-100 shadow-md',
                          )}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${meta.color}18` }}
                              >
                                <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {activity.title}
                                </p>
                                {activity.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                    {activity.description}
                                  </p>
                                )}
                                <span className="text-[11px] text-gray-400 mt-1 block">
                                  {timeAgo(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                            {hasDraftLink && (
                              <div className="mt-2 pt-1.5 border-t border-gray-100">
                                <span className="text-[10px] text-purple-500 font-medium">
                                  Linked to draft story
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* Bottom cap on spine */}
          <div className="relative flex items-center justify-center py-4">
            <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm" />
          </div>
        </div>
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top {
          from { transform: translateY(-8px); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, slide-in-from-top 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
