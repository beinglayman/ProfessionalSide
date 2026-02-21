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
  GitBranch, SquareKanban, Hash, FileText, Figma, Video,
  ChevronDown, ChevronRight, Filter, Star, ArrowUp, ArrowDown,
} from 'lucide-react';

/* ─── Shared Utilities ─────────────────────────────────────────────── */

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

/* ─── Sort / filter types ──────────────────────────────────────────── */

type SortField = 'source' | 'title' | 'time';
type SortDirection = 'asc' | 'desc';

/* ─── Role badge styling ───────────────────────────────────────────── */

const ROLE_COLORS: Record<MockDraftStory['dominantRole'], string> = {
  Led: 'bg-amber-100 text-amber-700 border-amber-200',
  Contributed: 'bg-blue-100 text-blue-700 border-blue-200',
  Participated: 'bg-gray-100 text-gray-600 border-gray-200',
};

/* ─── Build grouped data structure ─────────────────────────────────── */

interface DraftGroup {
  draft: MockDraftStory;
  activities: MockActivity[];
}

interface TableSection {
  kind: 'draft' | 'uncategorized';
  draftGroup?: DraftGroup;
  activities: MockActivity[];
}

/* ─── Sort comparator ──────────────────────────────────────────────── */

function sortActivities(
  activities: MockActivity[],
  field: SortField,
  direction: SortDirection,
): MockActivity[] {
  const sorted = [...activities].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'source':
        cmp = SOURCE_META[a.source].name.localeCompare(SOURCE_META[b.source].name);
        break;
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'time':
        cmp = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        break;
    }
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/* ─── Column Header Button ─────────────────────────────────────────── */

function ColumnHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors',
        isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600',
        className,
      )}
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />
      )}
    </button>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */

export function TimelineV6() {
  // ---- state ----
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedDraftIds, setExpandedDraftIds] = useState<Set<string>>(
    new Set([...mockDraftStories.map((d) => d.id), '__uncategorized__']),
  );
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<ActivitySource>>(new Set(ALL_SOURCES));

  // ---- handlers ----
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleDraft = (draftId: string) => {
    setExpandedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  };

  const toggleFilter = (source: ActivitySource) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  // ---- pre-compute draft membership ----
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // ---- hovered draft activity IDs ----
  const hoveredActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  // ---- filtered activities ----
  const filteredActivities = useMemo(
    () => mockActivities.filter((a) => activeFilters.has(a.source)),
    [activeFilters],
  );

  // ---- build sections: group activities under drafts + uncategorized ----
  const sections: TableSection[] = useMemo(() => {
    const claimedIds = new Set<string>();
    const result: TableSection[] = [];

    // Build draft groups
    for (const draft of mockDraftStories) {
      const draftActIds = draftActivityMap[draft.id] || [];
      const matchedActivities = draftActIds
        .map((id) => filteredActivities.find((a) => a.id === id))
        .filter((a): a is MockActivity => a !== undefined);

      if (matchedActivities.length > 0) {
        result.push({
          kind: 'draft',
          draftGroup: { draft, activities: sortActivities(matchedActivities, sortField, sortDirection) },
          activities: sortActivities(matchedActivities, sortField, sortDirection),
        });
        matchedActivities.forEach((a) => claimedIds.add(a.id));
      }
    }

    // Uncategorized: activities not belonging to any draft
    const unclaimed = filteredActivities.filter((a) => !claimedIds.has(a.id));
    if (unclaimed.length > 0) {
      result.push({
        kind: 'uncategorized',
        activities: sortActivities(unclaimed, sortField, sortDirection),
      });
    }

    return result;
  }, [filteredActivities, sortField, sortDirection]);

  // ---- stats ----
  const totalCount = filteredActivities.length;
  const draftCount = sections.filter((s) => s.kind === 'draft').length;

  // ---- find draft name for an activity ----
  const getDraftNameForActivity = (activityId: string): string | null => {
    const draftIds = activityDraftMap[activityId];
    if (!draftIds || draftIds.length === 0) return null;
    const draft = mockDraftStories.find((d) => d.id === draftIds[0]);
    return draft ? draft.title : null;
  };

  // ---- render ----
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dense Table</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} activities &middot; {draftCount} draft stories &middot; sortable columns with
            expandable draft sections
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

        {/* Table card */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Table header */}
          <div className="flex items-center border-b border-gray-200 bg-gray-50/80 px-3 py-2.5">
            {/* Source column */}
            <div className="w-[40px] shrink-0">
              <ColumnHeader
                label="Src"
                field="source"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </div>

            {/* Title column */}
            <div className="flex-1 min-w-0 px-2">
              <ColumnHeader
                label="Title"
                field="title"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </div>

            {/* Time column */}
            <div className="w-[100px] shrink-0 text-right">
              <ColumnHeader
                label="Time"
                field="time"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="justify-end"
              />
            </div>

            {/* Draft membership column */}
            <div className="w-[120px] shrink-0 text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Draft
              </span>
            </div>
          </div>

          {/* Table body */}
          <div>
            {sections.map((section) => {
              if (section.kind === 'draft' && section.draftGroup) {
                const { draft, activities } = section.draftGroup;
                const isExpanded = expandedDraftIds.has(draft.id);
                const isHovered = hoveredDraftId === draft.id;

                return (
                  <div key={`draft-${draft.id}`}>
                    {/* Draft section header */}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors',
                        'bg-purple-50/70 border-b border-purple-100/80',
                        isHovered && 'bg-purple-100/80',
                      )}
                      onClick={() => toggleDraft(draft.id)}
                      onMouseEnter={() => setHoveredDraftId(draft.id)}
                      onMouseLeave={() => setHoveredDraftId(null)}
                    >
                      {/* Expand/collapse chevron */}
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-purple-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-500" />
                        )}
                      </div>

                      {/* Star icon */}
                      <Star className="w-3.5 h-3.5 text-purple-500 fill-purple-400 shrink-0" />

                      {/* Draft title */}
                      <span className="text-sm font-bold text-gray-900 truncate flex-1 min-w-0">
                        {draft.title}
                      </span>

                      {/* Source icon stack */}
                      <div className="flex -space-x-1 shrink-0 mr-2">
                        {draft.tools.map((tool) => (
                          <div
                            key={tool}
                            className="w-5 h-5 rounded-full flex items-center justify-center border border-white"
                            style={{ backgroundColor: `${SOURCE_META[tool].color}20` }}
                          >
                            <SourceIcon source={tool} className="w-2.5 h-2.5" />
                          </div>
                        ))}
                      </div>

                      {/* Activity count badge */}
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-purple-100 text-purple-700 border-purple-200 shrink-0"
                      >
                        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                      </Badge>

                      {/* Role badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] shrink-0 border',
                          ROLE_COLORS[draft.dominantRole],
                        )}
                      >
                        {draft.dominantRole}
                      </Badge>
                    </div>

                    {/* Draft activity rows */}
                    {isExpanded &&
                      activities.map((activity, rowIndex) => {
                        const isActivityHovered = hoveredActivityIds.has(activity.id);

                        return (
                          <div
                            key={activity.id}
                            className={cn(
                              'flex items-center py-1.5 px-3 text-sm transition-colors border-b border-gray-100 last:border-b-0',
                              rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                              'hover:bg-gray-50',
                              isActivityHovered && 'bg-purple-50/50 hover:bg-purple-50/70',
                            )}
                          >
                            {/* Source icon */}
                            <div className="w-[40px] shrink-0 flex items-center justify-center">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{
                                  backgroundColor: `${SOURCE_META[activity.source].color}14`,
                                }}
                              >
                                <SourceIcon
                                  source={activity.source}
                                  className="w-3 h-3"
                                />
                              </div>
                            </div>

                            {/* Title */}
                            <div className="flex-1 min-w-0 px-2">
                              <p className="text-sm text-gray-800 truncate">
                                {activity.title}
                              </p>
                            </div>

                            {/* Time */}
                            <div className="w-[100px] shrink-0 text-right">
                              <span className="font-mono text-xs text-gray-400">
                                {timeAgo(activity.timestamp)}
                              </span>
                            </div>

                            {/* Draft membership */}
                            <div className="w-[120px] shrink-0 text-right">
                              <span className="inline-block max-w-full truncate text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                {draft.title.length > 18
                                  ? draft.title.slice(0, 18) + '...'
                                  : draft.title}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              }

              // ---- Uncategorized section ----
              if (section.kind === 'uncategorized') {
                const isExpanded = expandedDraftIds.has('__uncategorized__');

                return (
                  <div key="uncategorized">
                    {/* Uncategorized header */}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors',
                        'bg-gray-100/60 border-b border-gray-200/80',
                      )}
                      onClick={() => toggleDraft('__uncategorized__')}
                    >
                      {/* Expand/collapse chevron */}
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Title */}
                      <span className="text-sm font-semibold text-gray-500 flex-1">
                        Uncategorized
                      </span>

                      {/* Count badge */}
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-gray-200 text-gray-500 shrink-0"
                      >
                        {section.activities.length}{' '}
                        {section.activities.length === 1 ? 'activity' : 'activities'}
                      </Badge>
                    </div>

                    {/* Uncategorized activity rows */}
                    {isExpanded &&
                      section.activities.map((activity, rowIndex) => (
                        <div
                          key={activity.id}
                          className={cn(
                            'flex items-center py-1.5 px-3 text-sm transition-colors border-b border-gray-100 last:border-b-0',
                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                            'hover:bg-gray-50',
                          )}
                        >
                          {/* Source icon */}
                          <div className="w-[40px] shrink-0 flex items-center justify-center">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: `${SOURCE_META[activity.source].color}14`,
                              }}
                            >
                              <SourceIcon
                                source={activity.source}
                                className="w-3 h-3"
                              />
                            </div>
                          </div>

                          {/* Title */}
                          <div className="flex-1 min-w-0 px-2">
                            <p className="text-sm text-gray-800 truncate">
                              {activity.title}
                            </p>
                          </div>

                          {/* Time */}
                          <div className="w-[100px] shrink-0 text-right">
                            <span className="font-mono text-xs text-gray-400">
                              {timeAgo(activity.timestamp)}
                            </span>
                          </div>

                          {/* Draft membership — empty for uncategorized */}
                          <div className="w-[120px] shrink-0 text-right">
                            <span className="text-[10px] text-gray-300">—</span>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/50 border-t border-gray-200 text-xs text-gray-400">
            <span>
              {totalCount} total activities across {ALL_SOURCES.filter((s) => activeFilters.has(s)).length} sources
            </span>
            <span>
              {draftCount} draft {draftCount === 1 ? 'story' : 'stories'} &middot;{' '}
              {sections.find((s) => s.kind === 'uncategorized')?.activities.length ?? 0} uncategorized
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
