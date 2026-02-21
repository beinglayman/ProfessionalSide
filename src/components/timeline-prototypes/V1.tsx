'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ChevronDown, ChevronRight, Filter, Star, ArrowUpRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

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

const ALL_SOURCES: ActivitySource[] = ['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'];

// ---------------------------------------------------------------------------
// Types for the interleaved feed
// ---------------------------------------------------------------------------

type FeedItemActivity = { kind: 'activity'; activity: MockActivity };
type FeedItemDraft = { kind: 'draft'; draft: MockDraftStory; contributingActivities: MockActivity[] };
type FeedItemGroupHeader = { kind: 'group-header'; group: TemporalGroup; filteredCount: number };
type FeedItem = FeedItemActivity | FeedItemDraft | FeedItemGroupHeader;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV1() {
  // ---- state ----
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeFilters, setActiveFilters] = useState<Set<ActivitySource>>(new Set(ALL_SOURCES));
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);

  // ---- handlers ----
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleFilter = (source: ActivitySource) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  // ---- build filtered groups ----
  const filteredGroups: TemporalGroup[] = useMemo(
    () =>
      mockTemporalGroups
        .map((g) => ({
          ...g,
          activities: g.activities.filter((a) => activeFilters.has(a.source)),
        }))
        .filter((g) => g.activities.length > 0),
    [activeFilters],
  );

  // ---- pre-compute draft membership sets per draft ----
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // ---- build the interleaved flat feed ----
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    const insertedDrafts = new Set<string>();

    for (const group of filteredGroups) {
      items.push({ kind: 'group-header', group, filteredCount: group.activities.length });

      if (collapsed[group.key]) continue;

      // For each activity in the group, check if it is the first member of any
      // un-inserted draft. If so, insert the draft card BEFORE that activity.
      for (const activity of group.activities) {
        const draftIds = activityDraftMap[activity.id] ?? [];
        for (const draftId of draftIds) {
          if (!insertedDrafts.has(draftId)) {
            insertedDrafts.add(draftId);
            const draft = mockDraftStories.find((d) => d.id === draftId);
            if (draft) {
              // Only show draft if at least one of its tools passes the source filter
              const hasVisibleTool = draft.tools.some((t) => activeFilters.has(t));
              if (hasVisibleTool) {
                const contributing = getActivitiesForDraft(draft).filter((a) =>
                  activeFilters.has(a.source),
                );
                items.push({ kind: 'draft', draft, contributingActivities: contributing });
              }
            }
          }
        }

        items.push({ kind: 'activity', activity });
      }
    }

    return items;
  }, [filteredGroups, collapsed, activeFilters, draftActivitySets]);

  const totalCount = filteredGroups.reduce((s, g) => s + g.activities.length, 0);

  // ---- helpers for hover highlighting ----
  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  // ---- expanded draft: group contributing activities by source ----
  const expandedDraftGrouped = useMemo(() => {
    if (!expandedDraftId) return null;
    const draftItem = feed.find(
      (f): f is FeedItemDraft => f.kind === 'draft' && f.draft.id === expandedDraftId,
    );
    if (!draftItem) return null;

    const grouped: Record<string, MockActivity[]> = {};
    for (const a of draftItem.contributingActivities) {
      if (!grouped[a.source]) grouped[a.source] = [];
      grouped[a.source].push(a);
    }
    return grouped;
  }, [expandedDraftId, feed]);

  // ---- render ----
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Activity Timeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} activities &middot; {mockDraftStories.length} draft stories emerging
          </p>
        </div>

        {/* Source filter chips */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {ALL_SOURCES.map((source) => (
            <button
              key={source}
              onClick={() => toggleFilter(source)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border',
                activeFilters.has(source)
                  ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                  : 'bg-gray-100 border-transparent text-gray-400',
              )}
            >
              <SourceIcon source={source} className="w-3 h-3" />
              {SOURCE_META[source].name}
            </button>
          ))}
        </div>

        {/* Timeline feed */}
        <div className="relative">
          {/* Spine */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {feed.map((item, idx) => {
            // ---- GROUP HEADER ----
            if (item.kind === 'group-header') {
              const isCollapsed = collapsed[item.group.key];
              return (
                <div key={`gh-${item.group.key}`} className="mb-4 mt-2 first:mt-0">
                  <button
                    onClick={() => toggleGroup(item.group.key)}
                    className="relative flex items-center gap-3 z-10"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-white" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">{item.group.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.filteredCount}
                    </Badge>
                  </button>
                </div>
              );
            }

            // ---- ACTIVITY CARD ----
            if (item.kind === 'activity') {
              const { activity } = item;
              const belongsToDraft = activityDraftMap[activity.id] ?? [];
              const hasDraftMembership = belongsToDraft.length > 0;
              const isHighlighted = hoveredDraftActivityIds.has(activity.id);

              return (
                <div
                  key={activity.id}
                  className={cn(
                    'relative flex items-start gap-4 ml-4 pl-6 pb-3 group/activity transition-all duration-200',
                    isHighlighted && 'border-l-2 border-purple-300 ml-[14px]',
                  )}
                >
                  {/* Dot on spine */}
                  <div className="absolute left-0 top-2.5 flex items-center justify-center">
                    <div
                      className={cn(
                        'w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0',
                        hasDraftMembership && 'ring-2 ring-purple-300 ring-offset-1',
                      )}
                      style={{ backgroundColor: SOURCE_META[activity.source].color }}
                    />
                  </div>

                  {/* Activity card */}
                  <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${SOURCE_META[activity.source].color}18` }}
                        >
                          <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.title}
                            </p>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {timeAgo(activity.timestamp)}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate opacity-0 group-hover/activity:opacity-100 transition-opacity">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // ---- DRAFT STORY CARD ----
            if (item.kind === 'draft') {
              const { draft, contributingActivities } = item;
              const isExpanded = expandedDraftId === draft.id;

              return (
                <div
                  key={`draft-${draft.id}`}
                  className="relative ml-4 pl-6 pb-4 pt-1"
                  onMouseEnter={() => setHoveredDraftId(draft.id)}
                  onMouseLeave={() => setHoveredDraftId(null)}
                >
                  {/* Purple star on spine */}
                  <div className="absolute left-0 top-4 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center ring-2 ring-purple-300 ring-offset-1">
                      <Star className="w-2.5 h-2.5 text-purple-600 fill-purple-600" />
                    </div>
                  </div>

                  {/* Draft card body */}
                  <div
                    className={cn(
                      'border-2 border-dashed border-purple-300 rounded-2xl',
                      'bg-gradient-to-br from-purple-50/60 via-white to-white',
                      'p-5 cursor-pointer transition-all duration-200',
                      'hover:shadow-lg hover:border-purple-400',
                      isExpanded && 'shadow-lg border-purple-400',
                    )}
                    onClick={() =>
                      setExpandedDraftId((prev) => (prev === draft.id ? null : draft.id))
                    }
                  >
                    {/* Top row: Draft label + role badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[11px] font-serif italic text-purple-700 -rotate-3 inline-block select-none"
                      >
                        Draft
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-purple-200 text-purple-600"
                      >
                        {draft.dominantRole}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 leading-snug mb-1.5">
                      {draft.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {draft.description}
                    </p>

                    {/* Middle row: source icon stack + topic chips */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      {/* Overlapping source icon stack */}
                      <div className="flex items-center -space-x-1.5">
                        {draft.tools.map((tool) => (
                          <div
                            key={tool}
                            className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                            style={{ backgroundColor: SOURCE_META[tool].color }}
                          >
                            <SourceIcon source={tool} className="w-3 h-3 text-white" />
                          </div>
                        ))}
                      </div>

                      {/* Topic chips */}
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {draft.topics.map((topic) => (
                          <span
                            key={topic}
                            className="bg-purple-50 text-purple-700 text-[11px] px-1.5 py-0.5 rounded-md font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom row: metadata + CTA */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        <span>{draft.activityCount} activities</span>
                        <span className="mx-1.5">&middot;</span>
                        <span>{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</span>
                      </div>
                      <button
                        className="bg-purple-600 text-white rounded-lg px-3 py-1.5 text-[11px] font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Placeholder for create story action
                        }}
                      >
                        Create Story
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Expanded: contributing activities grouped by source */}
                    {isExpanded && expandedDraftGrouped && (
                      <div className="mt-4 pt-4 border-t border-purple-100">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
                          Contributing Activities
                        </p>
                        {Object.entries(expandedDraftGrouped).map(([source, activities]) => (
                          <div key={source} className="mb-3 last:mb-0">
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
                            <div className="pl-6 space-y-1.5">
                              {activities.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex items-center justify-between gap-2 text-xs"
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
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
