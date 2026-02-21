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
  ArrowUpRight, Sparkles, X, ZoomIn, ZoomOut,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Utilities (redeclared per-file)
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
    jira: <KanbanSquare className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

// ---------------------------------------------------------------------------
// Source color helpers
// ---------------------------------------------------------------------------

/** Returns a lighter tinted background color for source regions */
function sourceRegionBg(source: ActivitySource): string {
  const colors: Record<ActivitySource, string> = {
    github: 'rgba(36,41,46,0.06)',
    jira: 'rgba(0,82,204,0.06)',
    slack: 'rgba(74,21,75,0.06)',
    confluence: 'rgba(23,43,77,0.06)',
    figma: 'rgba(242,78,30,0.06)',
    'google-meet': 'rgba(0,137,123,0.06)',
  };
  return colors[source];
}

/** Returns a medium tinted background for individual tiles */
function tileBg(source: ActivitySource): string {
  const colors: Record<ActivitySource, string> = {
    github: 'rgba(36,41,46,0.10)',
    jira: 'rgba(0,82,204,0.10)',
    slack: 'rgba(74,21,75,0.10)',
    confluence: 'rgba(23,43,77,0.10)',
    figma: 'rgba(242,78,30,0.10)',
    'google-meet': 'rgba(0,137,123,0.10)',
  };
  return colors[source];
}

/** Returns a hover-state tinted background for individual tiles */
function tileHoverBg(source: ActivitySource): string {
  const colors: Record<ActivitySource, string> = {
    github: 'rgba(36,41,46,0.18)',
    jira: 'rgba(0,82,204,0.18)',
    slack: 'rgba(74,21,75,0.18)',
    confluence: 'rgba(23,43,77,0.18)',
    figma: 'rgba(242,78,30,0.18)',
    'google-meet': 'rgba(0,137,123,0.18)',
  };
  return colors[source];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceGroup {
  source: ActivitySource;
  activities: MockActivity[];
  proportion: number; // 0–1, fraction of total activities
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single activity tile within a source region */
function ActivityTile({
  activity,
  isHighlighted,
  isDimmed,
  isHovered,
  onHoverStart,
  onHoverEnd,
}: {
  activity: MockActivity;
  isHighlighted: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const hasDraftLink = (activityDraftMap[activity.id] ?? []).length > 0;

  return (
    <div
      className={cn(
        'relative rounded-lg p-2.5 cursor-default transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isHighlighted && 'ring-2 ring-purple-400 ring-offset-1 shadow-md',
        isDimmed && 'opacity-30',
        hasDraftLink && 'border-t-2 border-t-purple-400',
      )}
      style={{
        backgroundColor: isHovered
          ? tileHoverBg(activity.source)
          : tileBg(activity.source),
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Truncated title */}
      <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 mb-1">
        {activity.title}
      </p>
      {/* Timestamp */}
      <span className="text-[10px] text-gray-500">
        {timeAgo(activity.timestamp)}
      </span>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 pointer-events-none">
          <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3 py-2.5 text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <SourceIcon source={activity.source} className="w-3.5 h-3.5 text-white" />
              <span className="font-semibold text-white/90">
                {SOURCE_META[activity.source].name}
              </span>
            </div>
            <p className="font-medium text-white leading-snug mb-1">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-white/70 leading-snug mb-1">
                {activity.description}
              </p>
            )}
            <p className="text-white/50 mt-1">{timeAgo(activity.timestamp)}</p>
            {hasDraftLink && (
              <div className="mt-1.5 pt-1.5 border-t border-white/20">
                <span className="text-purple-300 text-[10px] font-medium">
                  Linked to {(activityDraftMap[activity.id] ?? []).length} draft{(activityDraftMap[activity.id] ?? []).length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Source region header within the treemap */
function SourceRegionHeader({
  source,
  count,
  isSelected,
  onClick,
}: {
  source: ActivitySource;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meta = SOURCE_META[source];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 w-full text-left transition-colors rounded-t-lg',
        'hover:bg-black/5',
        isSelected && 'bg-black/5',
      )}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${meta.color}25` }}
      >
        <SourceIcon source={source} className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm font-semibold text-gray-800 truncate">
        {meta.name}
      </span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto shrink-0">
        {count}
      </Badge>
      {isSelected ? (
        <ZoomOut className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      ) : (
        <ZoomIn className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      )}
    </button>
  );
}

/** Floating glassmorphism draft card anchored at the treemap bottom */
function DraftGlassCard({
  draft,
  isHovered,
  isExpanded,
  onHoverStart,
  onHoverEnd,
  onClick,
  linkedActivityCount,
}: {
  draft: MockDraftStory;
  isHovered: boolean;
  isExpanded: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  linkedActivityCount: number;
}) {
  const contributingActivities = useMemo(
    () => getActivitiesForDraft(draft),
    [draft],
  );

  const groupedBySource = useMemo(() => {
    const map: Partial<Record<ActivitySource, MockActivity[]>> = {};
    for (const a of contributingActivities) {
      if (!map[a.source]) map[a.source] = [];
      map[a.source]!.push(a);
    }
    return Object.entries(map) as [ActivitySource, MockActivity[]][];
  }, [contributingActivities]);

  return (
    <div
      className={cn(
        'flex-1 min-w-0 cursor-pointer transition-all duration-200',
        isHovered && !isExpanded && 'scale-[1.02]',
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
    >
      <div
        className={cn(
          'rounded-xl backdrop-blur-md border transition-all duration-200',
          isExpanded
            ? 'bg-white/90 border-purple-300 shadow-xl'
            : isHovered
              ? 'bg-white/85 border-purple-200 shadow-lg'
              : 'bg-white/80 border-white/40 shadow-md',
        )}
      >
        {/* Card header */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
                Draft
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] border-purple-200 text-purple-600 px-1.5 py-0"
            >
              {draft.dominantRole}
            </Badge>
          </div>

          <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 mb-1.5">
            {draft.title}
          </h3>

          <div className="flex items-center gap-2">
            {/* Tool icon stack */}
            <div className="flex items-center -space-x-1">
              {draft.tools.map((tool) => (
                <div
                  key={tool}
                  className="w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm"
                  style={{ backgroundColor: SOURCE_META[tool].color }}
                >
                  <SourceIcon source={tool} className="w-2.5 h-2.5 text-white" />
                </div>
              ))}
            </div>
            <span className="text-[10px] text-gray-500">
              {linkedActivityCount} activities
            </span>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0">
            <div className="border-t border-purple-100 pt-3 mb-3" />

            {/* Description */}
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              {draft.description}
            </p>

            {/* Date range */}
            <p className="text-[10px] text-gray-400 mb-2">
              {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
            </p>

            {/* Topic chips */}
            <div className="flex flex-wrap gap-1 mb-3">
              {draft.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded-md font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>

            {/* Contributing activities grouped by source */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Contributing Activities
              </p>
              <div className="space-y-2">
                {groupedBySource.map(([source, acts]) => (
                  <div key={source}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${SOURCE_META[source].color}18` }}
                      >
                        <SourceIcon source={source} className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-700">
                        {SOURCE_META[source].name}
                      </span>
                      <span className="text-[10px] text-gray-400">({acts.length})</span>
                    </div>
                    <div className="pl-5 space-y-0.5">
                      {acts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 text-[10px]"
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

            {/* Create Story CTA */}
            <button
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold',
                'bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Sparkles className="w-3 h-3" />
              Create Story
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV14() {
  // ---- state ----
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<ActivitySource | null>(null);

  // ---- group activities by source ----
  const sourceGroups: SourceGroup[] = useMemo(() => {
    const map: Partial<Record<ActivitySource, MockActivity[]>> = {};
    for (const activity of mockActivities) {
      if (!map[activity.source]) map[activity.source] = [];
      map[activity.source]!.push(activity);
    }

    const total = mockActivities.length;
    const groups: SourceGroup[] = [];

    // Sort by activity count descending for treemap layout
    const entries = Object.entries(map) as [ActivitySource, MockActivity[]][];
    entries.sort((a, b) => b[1].length - a[1].length);

    for (const [source, activities] of entries) {
      groups.push({
        source,
        activities,
        proportion: activities.length / total,
      });
    }

    return groups;
  }, []);

  // ---- pre-compute draft membership sets ----
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // ---- hovered draft activity IDs ----
  const hoveredDraftActivityIds = useMemo(() => {
    const targetId = hoveredDraftId || expandedDraftId;
    if (!targetId) return new Set<string>();
    return draftActivitySets[targetId] ?? new Set<string>();
  }, [hoveredDraftId, expandedDraftId, draftActivitySets]);

  const isAnyDraftActive = hoveredDraftId !== null || expandedDraftId !== null;

  // ---- compute visible source groups (zoom behavior) ----
  const visibleSourceGroups = useMemo(() => {
    if (selectedSource) {
      return sourceGroups.filter((g) => g.source === selectedSource);
    }
    return sourceGroups;
  }, [sourceGroups, selectedSource]);

  // ---- source proportions for flex widths ----
  const sourceFlexValues = useMemo(() => {
    if (selectedSource) {
      // Selected source takes full width
      return new Map<ActivitySource, number>([[selectedSource, 1]]);
    }
    const map = new Map<ActivitySource, number>();
    for (const group of sourceGroups) {
      // Minimum proportion so small groups are still visible
      const flex = Math.max(group.proportion, 0.08);
      map.set(group.source, flex);
    }
    return map;
  }, [selectedSource, sourceGroups]);

  // ---- total unique sources ----
  const totalSources = sourceGroups.length;

  // ---- handlers ----
  const handleSourceClick = (source: ActivitySource) => {
    setSelectedSource((prev) => (prev === source ? null : source));
  };

  const handleDraftHoverStart = (draftId: string) => {
    setHoveredDraftId(draftId);
  };

  const handleDraftHoverEnd = () => {
    setHoveredDraftId(null);
  };

  const handleDraftClick = (draftId: string) => {
    setExpandedDraftId((prev) => (prev === draftId ? null : draftId));
  };

  // ---- render ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <KanbanSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Treemap Tiles</h1>
              <p className="text-sm text-gray-500">
                {mockActivities.length} activities across {totalSources} sources
                <span className="mx-1.5">&middot;</span>
                {mockDraftStories.length} draft stories emerging
              </p>
            </div>
          </div>

          {/* Zoom indicator */}
          {selectedSource && (
            <div className="mt-3 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Zoomed into {SOURCE_META[selectedSource].name}
              </Badge>
              <button
                onClick={() => setSelectedSource(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <X className="w-3 h-3" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* TREEMAP CONTAINER                                                 */}
        {/* ================================================================= */}
        <div className="relative">
          {/* Treemap regions */}
          <div
            className={cn(
              'flex gap-2 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm',
              selectedSource ? 'h-auto min-h-[500px]' : 'h-[500px]',
            )}
          >
            {visibleSourceGroups.map((group) => {
              const flex = sourceFlexValues.get(group.source) ?? group.proportion;
              const isZoomed = selectedSource === group.source;

              return (
                <div
                  key={group.source}
                  className={cn(
                    'flex flex-col min-w-0 transition-all duration-500 ease-in-out',
                    isZoomed && 'flex-1',
                  )}
                  style={{
                    flex: isZoomed ? undefined : `${flex} 1 0%`,
                    backgroundColor: sourceRegionBg(group.source),
                  }}
                >
                  {/* Source region header */}
                  <SourceRegionHeader
                    source={group.source}
                    count={group.activities.length}
                    isSelected={isZoomed}
                    onClick={() => handleSourceClick(group.source)}
                  />

                  {/* Activity tiles grid */}
                  <div
                    className={cn(
                      'flex-1 overflow-y-auto p-2',
                      isZoomed
                        ? 'grid grid-cols-3 gap-2 auto-rows-min content-start'
                        : 'grid grid-cols-1 gap-1.5 auto-rows-min content-start',
                    )}
                  >
                    {group.activities.map((activity) => {
                      const isHighlighted = hoveredDraftActivityIds.has(activity.id);
                      const isDimmed = isAnyDraftActive && !hoveredDraftActivityIds.has(activity.id);

                      return (
                        <ActivityTile
                          key={activity.id}
                          activity={activity}
                          isHighlighted={isHighlighted}
                          isDimmed={isDimmed}
                          isHovered={hoveredActivityId === activity.id}
                          onHoverStart={() => setHoveredActivityId(activity.id)}
                          onHoverEnd={() => setHoveredActivityId(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* GLASSMORPHISM DRAFT CARDS (anchored at bottom of treemap)         */}
          {/* ================================================================= */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <div
              className={cn(
                'flex gap-3 transition-all duration-300',
                expandedDraftId ? 'items-end' : 'items-end',
              )}
            >
              {mockDraftStories.map((draft) => {
                const linkedCount = (draftActivityMap[draft.id] ?? []).length;

                return (
                  <DraftGlassCard
                    key={draft.id}
                    draft={draft}
                    isHovered={hoveredDraftId === draft.id}
                    isExpanded={expandedDraftId === draft.id}
                    onHoverStart={() => handleDraftHoverStart(draft.id)}
                    onHoverEnd={handleDraftHoverEnd}
                    onClick={() => handleDraftClick(draft.id)}
                    linkedActivityCount={linkedCount}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SOURCE LEGEND                                                     */}
        {/* ================================================================= */}
        <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
          {sourceGroups.map((group) => {
            const meta = SOURCE_META[group.source];
            const isActive = selectedSource === group.source;

            return (
              <button
                key={group.source}
                onClick={() => handleSourceClick(group.source)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded flex items-center justify-center',
                    isActive ? 'bg-white/20' : '',
                  )}
                  style={!isActive ? { backgroundColor: `${meta.color}18` } : undefined}
                >
                  <SourceIcon
                    source={group.source}
                    className={cn('w-3 h-3', isActive && 'text-white')}
                  />
                </div>
                <span>{meta.name}</span>
                <span className={cn('text-[10px]', isActive ? 'text-white/60' : 'text-gray-400')}>
                  ({group.activities.length})
                </span>
              </button>
            );
          })}

          {selectedSource && (
            <button
              onClick={() => setSelectedSource(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ZoomOut className="w-3 h-3" />
              Show All
            </button>
          )}
        </div>

        {/* ================================================================= */}
        {/* PROPORTIONAL BAR VISUALIZATION                                    */}
        {/* ================================================================= */}
        <div className="mt-4 mb-2">
          <div className="flex h-2 rounded-full overflow-hidden shadow-inner bg-gray-100">
            {sourceGroups.map((group) => (
              <div
                key={group.source}
                className={cn(
                  'transition-all duration-500 cursor-pointer',
                  selectedSource && selectedSource !== group.source && 'opacity-30',
                )}
                style={{
                  width: `${group.proportion * 100}%`,
                  backgroundColor: SOURCE_META[group.source].color,
                }}
                onClick={() => handleSourceClick(group.source)}
                title={`${SOURCE_META[group.source].name}: ${group.activities.length} activities (${Math.round(group.proportion * 100)}%)`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-gray-400">
              Area proportional to activity volume
            </p>
            <p className="text-[10px] text-gray-400">
              {mockActivities.length} total activities
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER                                                            */}
        {/* ================================================================= */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-[11px] text-gray-300 leading-relaxed">
            {totalSources} sources &middot;{' '}
            {mockActivities.length} activities &middot;{' '}
            {mockDraftStories.length} draft stories
          </p>
        </div>
      </div>
    </div>
  );
}
