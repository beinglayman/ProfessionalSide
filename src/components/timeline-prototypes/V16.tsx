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
import {
  GitBranch, KanbanSquare, Hash, FileText, Figma, Video,
  Star, ArrowUpRight, ChevronDown, ChevronUp, Filter, X, Layers, Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants & Utilities
// ---------------------------------------------------------------------------

const ALL_SOURCES: ActivitySource[] = [
  'github', 'jira', 'slack', 'confluence', 'figma', 'google-meet',
];

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
    jira: <KanbanSquare className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

// ---------------------------------------------------------------------------
// Card height classification & feed builder
// ---------------------------------------------------------------------------

type CardHeight = 'compact' | 'medium' | 'tall';

function classifyCardHeight(a: MockActivity): CardHeight {
  if (a.rawData) return 'tall';
  if (a.description) return 'medium';
  return 'compact';
}

type MasonryItem =
  | { kind: 'activity'; activity: MockActivity }
  | { kind: 'draft'; draft: MockDraftStory };

function buildMasonryFeed(): MasonryItem[] {
  const items: MasonryItem[] = [];
  const insertedDrafts = new Set<string>();
  let activityCounter = 0;
  let draftIndex = 0;

  for (const group of mockTemporalGroups) {
    for (const activity of group.activities) {
      items.push({ kind: 'activity', activity });
      activityCounter++;

      // Insert a draft after every ~6 activities
      if (activityCounter % 6 === 0 && draftIndex < mockDraftStories.length) {
        const draft = mockDraftStories[draftIndex];
        if (!insertedDrafts.has(draft.id)) {
          insertedDrafts.add(draft.id);
          items.push({ kind: 'draft', draft });
          draftIndex++;
        }
      }
    }
  }

  // Append remaining drafts
  for (; draftIndex < mockDraftStories.length; draftIndex++) {
    if (!insertedDrafts.has(mockDraftStories[draftIndex].id))
      items.push({ kind: 'draft', draft: mockDraftStories[draftIndex] });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourceFilterChip({ source, isActive, onToggle }: {
  source: ActivitySource; isActive: boolean; onToggle: () => void;
}) {
  const meta = SOURCE_META[source];
  return (
    <button
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        'border transition-all duration-200 cursor-pointer select-none',
        isActive
          ? 'border-transparent text-white shadow-sm hover:shadow-md'
          : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600',
      )}
      style={isActive ? { backgroundColor: meta.color } : undefined}
    >
      <SourceIcon source={source} className="w-3 h-3" />
      <span>{meta.name}</span>
      {isActive && <X className="w-3 h-3 opacity-70" />}
    </button>
  );
}

function MasonryActivityCard({ activity, isHighlightedByDraft, isExpanded, onToggleExpand }: {
  activity: MockActivity; isHighlightedByDraft: boolean; isExpanded: boolean; onToggleExpand: () => void;
}) {
  const meta = SOURCE_META[activity.source];
  const height = classifyCardHeight(activity);
  const hasRawData = !!activity.rawData;

  return (
    <div
      className={cn(
        'break-inside-avoid mb-4 group cursor-pointer',
        'transition-all duration-200',
      )}
      onClick={onToggleExpand}
    >
      <Card
        className={cn(
          'overflow-hidden border-l-[3px] transition-all duration-200',
          'hover:shadow-lg hover:-translate-y-0.5',
          isHighlightedByDraft && 'ring-2 ring-purple-400 ring-offset-2 shadow-md',
          isExpanded && 'shadow-lg',
        )}
        style={{ borderLeftColor: meta.color }}
      >
        <CardContent className="p-0">
          {/* Header strip */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}15` }}
              >
                <SourceIcon
                  source={activity.source}
                  className="w-3 h-3"
                />
              </div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: meta.color }}
              >
                {meta.name}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">
              {timeAgo(activity.timestamp)}
            </span>
          </div>

          {/* Title */}
          <div className="px-3 pb-2">
            <p className="text-sm font-semibold text-gray-900 leading-snug mt-1">
              {activity.title}
            </p>

            {/* Description -- compact cards hide, medium show truncated, tall show full */}
            {activity.description && (
              <p
                className={cn(
                  'text-xs text-gray-500 mt-1.5 leading-relaxed',
                  height === 'medium' && !isExpanded && 'line-clamp-2',
                  height === 'compact' && 'hidden',
                  isExpanded && 'line-clamp-none',
                )}
              >
                {activity.description}
              </p>
            )}
          </div>

          {/* Raw data preview (tall cards) */}
          {hasRawData && !isExpanded && (
            <div className="px-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {activity.rawData!.state !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      activity.rawData!.state === 'merged'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-gray-50 text-gray-600',
                    )}
                  >
                    {String(activity.rawData!.state)}
                  </span>
                )}
                {activity.rawData!.storyPoints !== undefined && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                    {String(activity.rawData!.storyPoints)} pts
                  </span>
                )}
                {activity.rawData!.priority !== undefined && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                    {String(activity.rawData!.priority)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Expanded raw data -- full key-value pairs */}
          {isExpanded && hasRawData && (
            <div className="px-3 pb-3">
              <div className="bg-gray-50 rounded-lg p-2.5 mt-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Details
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {Object.entries(activity.rawData!).map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-1 min-w-0">
                      <span className="text-[10px] text-gray-400 shrink-0">{key}:</span>
                      <span className="text-[10px] text-gray-700 font-medium truncate">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Draft link indicators */}
          {(activityDraftMap[activity.id]?.length ?? 0) > 0 && (
            <div className="px-3 pb-2.5">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
                <span className="text-[10px] text-purple-500 font-medium">
                  Linked to {activityDraftMap[activity.id].length} draft{activityDraftMap[activity.id].length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Expand indicator for cards with raw data */}
          {hasRawData && (
            <div
              className={cn(
                'flex justify-center py-1 border-t border-gray-100',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                isExpanded && 'opacity-100',
              )}
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MasonryDraftCard({ draft, isExpanded, isHovered, onToggleExpand, onMouseEnter, onMouseLeave }: {
  draft: MockDraftStory; isExpanded: boolean; isHovered: boolean;
  onToggleExpand: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const contributingActivities = useMemo(() => getActivitiesForDraft(draft), [draft]);

  return (
    <div
      className="break-inside-avoid mb-4 col-span-full"
      style={{ columnSpan: 'all' } as React.CSSProperties}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden cursor-pointer',
          'transition-all duration-300',
          'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600',
          isHovered && 'shadow-xl shadow-purple-200/60 scale-[1.005]',
          isExpanded && 'shadow-xl shadow-purple-200/60',
        )}
        onClick={onToggleExpand}
      >
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
        </div>

        <div className="relative p-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-purple-100 uppercase tracking-wider">
                Draft Story
              </span>
            </div>
            <Badge className="bg-white/20 text-white text-[10px] border-0 backdrop-blur-sm">
              {draft.dominantRole}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white leading-snug mb-2">
            {draft.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-purple-100 leading-relaxed mb-4 line-clamp-2">
            {draft.description}
          </p>

          {/* Meta row: tools + topics */}
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Source icons */}
            <div className="flex items-center -space-x-1">
              {draft.tools.map((tool) => (
                <div
                  key={tool}
                  className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-purple-500 shadow-sm"
                  style={{ backgroundColor: SOURCE_META[tool].color }}
                >
                  <SourceIcon source={tool} className="w-3 h-3 text-white" />
                </div>
              ))}
            </div>

            {/* Topics */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {draft.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-0.5 bg-white/15 text-white text-[10px] rounded-full font-medium backdrop-blur-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* Date range + activity count */}
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-purple-200">
              <span>{draft.activityCount} activities</span>
              <span className="mx-1.5 opacity-50">|</span>
              <span>{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</span>
            </div>

            {/* CTA */}
            <button
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5',
                'bg-white text-purple-700 text-xs font-bold rounded-lg',
                'hover:bg-purple-50 transition-colors shadow-sm',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              Create Story
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {/* Expand chevron */}
          <div className="flex justify-center mt-3">
            <ChevronDown
              className={cn(
                'w-5 h-5 text-purple-200 transition-transform duration-300',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </div>

        {/* Expanded: contributing activities grid */}
        {isExpanded && (
          <div className="relative px-5 pb-5">
            <div className="border-t border-white/20 pt-4">
              <p className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider mb-3">
                Contributing Activities ({contributingActivities.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {contributingActivities.map((act) => {
                  const actMeta = SOURCE_META[act.source];
                  return (
                    <div
                      key={act.id}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 hover:bg-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: actMeta.color }}
                        >
                          <SourceIcon source={act.source} className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[10px] text-purple-200 font-medium">
                          {actMeta.name}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium leading-snug line-clamp-2">
                        {act.title}
                      </p>
                      <p className="text-[10px] text-purple-300 mt-1">{timeAgo(act.timestamp)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function TimelineV16() {
  const [activeFilters, setActiveFilters] = useState<Set<ActivitySource>>(
    new Set(ALL_SOURCES),
  );
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  const masonryFeed = useMemo(() => buildMasonryFeed(), []);

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

  const toggleFilter = (source: ActivitySource) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        // Don't allow removing all filters
        if (next.size > 1) next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const resetFilters = () => setActiveFilters(new Set(ALL_SOURCES));
  const allActive = activeFilters.size === ALL_SOURCES.length;

  const filteredFeed = useMemo(() => {
    return masonryFeed.filter((item) => {
      if (item.kind === 'draft') return true; // drafts always visible
      return activeFilters.has(item.activity.source);
    });
  }, [masonryFeed, activeFilters]);

  const visibleActivityCount = filteredFeed.filter((i) => i.kind === 'activity').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* ===================== HEADER ===================== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Masonry Wall
              </h1>
              <p className="text-sm text-gray-500">
                {visibleActivityCount} activities &middot; {mockDraftStories.length} draft stories
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-[52px]">
            Pinterest-style masonry with variable-height cards cascading into columns
          </p>
        </div>

        {/* ===================== SOURCE FILTER CHIPS ===================== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sources
            </span>
            {!allActive && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-purple-500 hover:text-purple-700 font-medium ml-2 transition-colors"
              >
                Reset all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_SOURCES.map((source) => (
              <SourceFilterChip
                key={source}
                source={source}
                isActive={activeFilters.has(source)}
                onToggle={() => toggleFilter(source)}
              />
            ))}
          </div>
        </div>

        {/* ===================== MASONRY GRID ===================== */}
        <div
          className="columns-1 sm:columns-2 lg:columns-3 gap-4"
          style={{ columnFill: 'balance' } as React.CSSProperties}
        >
          {filteredFeed.map((item) => {
            if (item.kind === 'draft') {
              return (
                <MasonryDraftCard
                  key={`draft-${item.draft.id}`}
                  draft={item.draft}
                  isExpanded={expandedDraftId === item.draft.id}
                  isHovered={hoveredDraftId === item.draft.id}
                  onToggleExpand={() =>
                    setExpandedDraftId((prev) =>
                      prev === item.draft.id ? null : item.draft.id,
                    )
                  }
                  onMouseEnter={() => setHoveredDraftId(item.draft.id)}
                  onMouseLeave={() => setHoveredDraftId(null)}
                />
              );
            }

            const { activity } = item;
            const isHighlighted = hoveredDraftActivityIds.has(activity.id);

            return (
              <MasonryActivityCard
                key={activity.id}
                activity={activity}
                isHighlightedByDraft={isHighlighted}
                isExpanded={expandedActivityId === activity.id}
                onToggleExpand={() =>
                  setExpandedActivityId((prev) =>
                    prev === activity.id ? null : activity.id,
                  )
                }
              />
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <span className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
            <Layers className="w-4 h-4" /> End of wall &middot; {mockActivities.length} total activities
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      </div>
    </div>
  );
}
