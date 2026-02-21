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
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Star, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';

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
    jira: <KanbanSquare className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnData {
  group: TemporalGroup;
  activities: MockActivity[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Activity card rendered inside a kanban column */
function ActivityCard({
  activity,
  isHighlighted,
  isDimmed,
}: {
  activity: MockActivity;
  isHighlighted: boolean;
  isDimmed: boolean;
}) {
  const hasDraftLink = (activityDraftMap[activity.id] ?? []).length > 0;

  return (
    <Card
      className={cn(
        'shadow-sm hover:shadow-md transition-all duration-200',
        hasDraftLink && 'border-l-4 border-l-purple-300',
        isHighlighted && 'ring-2 ring-purple-400 ring-offset-1 shadow-md',
        isDimmed && 'opacity-40',
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${SOURCE_META[activity.source].color}18` }}
          >
            <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                {activity.description}
              </p>
            )}
            <span className="text-[11px] text-gray-400 mt-1.5 block">
              {timeAgo(activity.timestamp)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Draft story card rendered inside a kanban column */
function DraftCard({
  draft,
  contributingActivities,
  isExpanded,
  onToggleExpand,
  onHoverStart,
  onHoverEnd,
  isDimmed,
}: {
  draft: MockDraftStory;
  contributingActivities: MockActivity[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  isDimmed: boolean;
}) {
  // Group contributing activities by source for the expanded view
  const groupedActivities = useMemo(() => {
    const grouped: Record<string, MockActivity[]> = {};
    for (const a of contributingActivities) {
      if (!grouped[a.source]) grouped[a.source] = [];
      grouped[a.source].push(a);
    }
    return grouped;
  }, [contributingActivities]);

  return (
    <div
      className={cn(
        'transition-all duration-200',
        isDimmed && 'opacity-40',
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div
        className={cn(
          'border-2 border-dashed border-purple-300 rounded-xl',
          'bg-gradient-to-br from-purple-50 via-purple-100/50 to-white',
          'p-4 cursor-pointer transition-all duration-200',
          'hover:shadow-lg hover:border-purple-400',
          isExpanded && 'shadow-lg border-purple-400',
        )}
        onClick={onToggleExpand}
      >
        {/* Top row: Star + Role */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide">
              Draft Story
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-purple-200 text-purple-600"
          >
            {draft.dominantRole}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2">
          {draft.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
          {draft.description}
        </p>

        {/* Overlapping source icon stack */}
        <div className="flex items-center justify-between gap-2 mb-3">
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
            {draft.topics.slice(0, 2).map((topic) => (
              <span
                key={topic}
                className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              >
                {topic}
              </span>
            ))}
            {draft.topics.length > 2 && (
              <span className="text-[10px] text-purple-400 font-medium">
                +{draft.topics.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: metadata + CTA */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            <span>{draft.activityCount} activities</span>
            <span className="mx-1">&middot;</span>
            <span>{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</span>
          </div>
          <button
            className="bg-purple-600 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              // Placeholder for create story action
            }}
          >
            Create Story
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Expand/collapse indicator */}
        <div className="flex items-center justify-center mt-2 pt-2 border-t border-purple-200/60">
          <span className="text-[10px] text-purple-500 font-medium flex items-center gap-1">
            {isExpanded ? (
              <>
                Hide activities
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show activities
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </span>
        </div>

        {/* Expanded: contributing activities list */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-purple-200/60 space-y-2">
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-2">
              Contributing Activities
            </p>
            {Object.entries(groupedActivities).map(([source, activities]) => (
              <div key={source} className="mb-2 last:mb-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: `${SOURCE_META[source as ActivitySource].color}18`,
                    }}
                  >
                    <SourceIcon
                      source={source as ActivitySource}
                      className="w-2.5 h-2.5"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700">
                    {SOURCE_META[source as ActivitySource].name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({activities.length})
                  </span>
                </div>
                <div className="pl-5 space-y-1">
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 text-[11px]"
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV2() {
  // ---- state ----
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);

  // ---- pre-compute draft membership sets ----
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // ---- build column data (activities only, drafts go to dedicated column) ----
  const columns: ColumnData[] = useMemo(() => {
    return mockTemporalGroups.map((group) => ({
      group,
      activities: group.activities,
    }));
  }, []);

  // ---- hovered draft activity IDs ----
  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  const isAnyDraftHovered = hoveredDraftId !== null;

  // ---- total counts ----
  const totalActivities = mockTemporalGroups.reduce((s, g) => s + g.activities.length, 0);

  // ---- render ----
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Kanban Columns</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalActivities} activities across {mockTemporalGroups.length} time periods
            <span className="mx-1.5">&middot;</span>
            {mockDraftStories.length} draft stories emerging
          </p>
        </div>

        {/* Kanban Grid: 5 temporal columns + 2-wide draft stories column */}
        <div className="grid grid-cols-7 gap-4">
          {/* ── Temporal activity columns ── */}
          {columns.map((column) => {
            const activityCount = column.activities.length;

            return (
              <div key={column.group.key} className="col-span-1 flex flex-col min-w-0">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {column.group.label}
                    </h2>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {activityCount}
                    </Badge>
                  </div>
                </div>

                {/* Column Header Accent Bar */}
                <div
                  className={cn(
                    'h-1 rounded-full mb-3',
                    column.group.key === 'today' && 'bg-blue-400',
                    column.group.key === 'yesterday' && 'bg-indigo-400',
                    column.group.key === 'this_week' && 'bg-violet-400',
                    column.group.key === 'last_week' && 'bg-purple-400',
                    column.group.key === 'older' && 'bg-gray-300',
                  )}
                />

                {/* Scrollable Card Area */}
                <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 pb-2 scrollbar-thin">
                  {column.activities.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-gray-400">No activities</p>
                    </div>
                  )}

                  {column.activities.map((activity) => {
                    const isHighlighted = hoveredDraftActivityIds.has(activity.id);
                    const isDimmed =
                      isAnyDraftHovered && !hoveredDraftActivityIds.has(activity.id);

                    return (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        isHighlighted={isHighlighted}
                        isDimmed={isDimmed}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Draft Stories column (spans 2 columns) ── */}
          <div className="col-span-2 flex flex-col min-w-0">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
                <h2 className="text-sm font-semibold text-purple-700">
                  Draft Stories
                </h2>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {mockDraftStories.length}
                </Badge>
              </div>
            </div>

            {/* Purple Accent Bar */}
            <div className="h-1 rounded-full mb-3 bg-purple-400" />

            {/* Scrollable Draft Cards */}
            <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 pb-2 scrollbar-thin">
              {mockDraftStories.map((draft) => {
                const isExpanded = expandedDraftId === draft.id;
                const contributing = getActivitiesForDraft(draft);

                return (
                  <DraftCard
                    key={`draft-${draft.id}`}
                    draft={draft}
                    contributingActivities={contributing}
                    isExpanded={isExpanded}
                    onToggleExpand={() =>
                      setExpandedDraftId((prev) =>
                        prev === draft.id ? null : draft.id,
                      )
                    }
                    onHoverStart={() => setHoveredDraftId(draft.id)}
                    onHoverEnd={() => setHoveredDraftId(null)}
                    isDimmed={
                      isAnyDraftHovered && hoveredDraftId !== draft.id
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
