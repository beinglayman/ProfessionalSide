'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap, getDayKey,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import {
  GitBranch, SquareKanban, Hash, FileText, Figma, Video,
  Star, X, ChevronRight, Calendar,
} from 'lucide-react';

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

// ---------------------------------------------------------------------------
// Calendar Grid Computation
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Returns a date set to midnight UTC. */
function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Get the Monday that starts the week for a given date. */
function getMonday(d: Date): Date {
  const dt = toDateOnly(d);
  const day = dt.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // how far back to Monday
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt;
}

/** Add N days to a date (returns new Date). */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/** Format YYYY-MM-DD from a Date. */
function dateToKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Diff in days between two dates (a - b). */
function dayDiff(a: Date, b: Date): number {
  return Math.round((toDateOnly(a).getTime() - toDateOnly(b).getTime()) / 86400000);
}

interface CalendarDay {
  key: string; // YYYY-MM-DD
  date: Date;
  dayOfMonth: number;
  isToday: boolean;
  weekIndex: number; // row index in the grid
  dayOfWeekIndex: number; // 0=Mon ... 6=Sun
  monthLabel: string | null; // non-null if first day of month or first visible day of month
}

interface CalendarGrid {
  days: CalendarDay[];
  weekCount: number;
  gridStart: Date; // the Monday that starts the grid
  activitiesByDay: Record<string, MockActivity[]>;
}

function buildCalendarGrid(): CalendarGrid {
  // Find min and max dates across all activities
  const timestamps = mockActivities.map(a => new Date(a.timestamp).getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  // Align to week boundaries (Monday start)
  const gridStart = getMonday(minDate);
  const gridEnd = addDays(getMonday(maxDate), 6); // end of that week (Sunday)

  const todayKey = new Date().toISOString().slice(0, 10);

  // Build day-by-day
  const days: CalendarDay[] = [];
  let current = new Date(gridStart);
  let weekIndex = 0;
  const seenMonths = new Set<number>();

  while (current <= gridEnd) {
    const key = dateToKey(current);
    const dayOfWeekIndex = days.length % 7;

    if (dayOfWeekIndex === 0 && days.length > 0) {
      weekIndex++;
    }

    const month = current.getUTCMonth();
    let monthLabel: string | null = null;
    if (!seenMonths.has(month) || current.getUTCDate() === 1) {
      monthLabel = MONTH_NAMES[month];
      seenMonths.add(month);
    }

    days.push({
      key,
      date: new Date(current),
      dayOfMonth: current.getUTCDate(),
      isToday: key === todayKey,
      weekIndex,
      dayOfWeekIndex,
      monthLabel,
    });

    current = addDays(current, 1);
  }

  // Group activities by day key
  const activitiesByDay: Record<string, MockActivity[]> = {};
  for (const activity of mockActivities) {
    const dayKey = getDayKey(activity.timestamp);
    if (!activitiesByDay[dayKey]) activitiesByDay[dayKey] = [];
    activitiesByDay[dayKey].push(activity);
  }

  return {
    days,
    weekCount: weekIndex + 1,
    gridStart,
    activitiesByDay,
  };
}

// ---------------------------------------------------------------------------
// Draft Bar positioning
// ---------------------------------------------------------------------------

interface DraftBarPosition {
  draft: MockDraftStory;
  startCol: number; // 0-based column
  startRow: number; // 0-based week/row
  endCol: number;
  endRow: number;
  spanDays: number;
  lane: number; // vertical stacking lane within the calendar
}

function computeDraftBars(grid: CalendarGrid): DraftBarPosition[] {
  const bars: DraftBarPosition[] = [];

  for (const draft of mockDraftStories) {
    const draftStart = toDateOnly(new Date(draft.dateRange.start));
    const draftEnd = toDateOnly(new Date(draft.dateRange.end));

    // Clamp to grid
    const clampedStart = draftStart < grid.gridStart ? grid.gridStart : draftStart;
    const clampedEnd = draftEnd > addDays(grid.gridStart, grid.days.length - 1)
      ? addDays(grid.gridStart, grid.days.length - 1)
      : draftEnd;

    const startOffset = dayDiff(clampedStart, grid.gridStart);
    const endOffset = dayDiff(clampedEnd, grid.gridStart);

    if (startOffset < 0 || endOffset < 0) continue;

    const startCol = startOffset % 7;
    const startRow = Math.floor(startOffset / 7);
    const endCol = endOffset % 7;
    const endRow = Math.floor(endOffset / 7);

    bars.push({
      draft,
      startCol,
      startRow,
      endCol,
      endRow,
      spanDays: endOffset - startOffset + 1,
      lane: 0,
    });
  }

  // Simple lane assignment to avoid overlaps
  bars.sort((a, b) => {
    const aStart = a.startRow * 7 + a.startCol;
    const bStart = b.startRow * 7 + b.startCol;
    return aStart - bStart;
  });

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    let lane = 0;
    const barStartIndex = bar.startRow * 7 + bar.startCol;
    const barEndIndex = bar.endRow * 7 + bar.endCol;

    // Check against previous bars for overlaps
    for (let j = 0; j < i; j++) {
      const other = bars[j];
      const otherStart = other.startRow * 7 + other.startCol;
      const otherEnd = other.endRow * 7 + other.endCol;
      if (barStartIndex <= otherEnd && barEndIndex >= otherStart) {
        // overlapping
        if (other.lane >= lane) {
          lane = other.lane + 1;
        }
      }
    }
    bar.lane = lane;
  }

  return bars;
}

// ---------------------------------------------------------------------------
// Activity Dot Component
// ---------------------------------------------------------------------------

function ActivityDot({
  activity,
  isHighlighted,
  isDimmed,
}: {
  activity: MockActivity;
  isHighlighted: boolean;
  isDimmed: boolean;
}) {
  const meta = SOURCE_META[activity.source];

  return (
    <div
      className={cn(
        'group relative w-4 h-4 rounded-full flex items-center justify-center transition-all duration-150',
        isHighlighted && 'ring-2 ring-purple-400 ring-offset-1 scale-125',
        isDimmed && 'opacity-25',
      )}
      style={{ backgroundColor: meta.color }}
      title={`${meta.name}: ${activity.title}`}
    >
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center gap-1 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-50 shadow-lg pointer-events-none">
        <SourceIcon source={activity.source} className="w-3 h-3 text-white" />
        <span className="max-w-[180px] truncate">{activity.title}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day Cell Component
// ---------------------------------------------------------------------------

function DayCell({
  day,
  activities,
  isSelected,
  hoveredDraftId,
  onClick,
}: {
  day: CalendarDay;
  activities: MockActivity[];
  isSelected: boolean;
  hoveredDraftId: string | null;
  onClick: () => void;
}) {
  const hasActivities = activities.length > 0;
  const maxVisible = 3;
  const visibleActivities = activities.slice(0, maxVisible);
  const overflowCount = activities.length - maxVisible;

  // Determine which activity IDs are linked to the hovered draft
  const highlightedIds = useMemo(() => {
    if (!hoveredDraftId) return null;
    const ids = draftActivityMap[hoveredDraftId] || [];
    return new Set(ids);
  }, [hoveredDraftId]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'min-h-[120px] bg-white border border-gray-100 p-2 text-left transition-all duration-150 relative',
        'hover:border-gray-300 hover:shadow-sm',
        day.isToday && 'border-blue-400 bg-blue-50/30',
        isSelected && 'border-purple-400 bg-purple-50/30 ring-1 ring-purple-200',
        !hasActivities && 'opacity-70',
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            'text-xs font-medium',
            day.isToday ? 'text-blue-600 font-bold' : 'text-gray-500',
          )}
        >
          {day.dayOfMonth}
        </span>
        {day.isToday && (
          <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide">Today</span>
        )}
      </div>

      {/* Month label if first of month */}
      {day.monthLabel && day.dayOfMonth === 1 && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day.monthLabel}</span>
      )}

      {/* Activity dots */}
      {hasActivities && (
        <div className="flex flex-wrap gap-1 mt-1">
          {visibleActivities.map(activity => {
            const isHighlighted = highlightedIds ? highlightedIds.has(activity.id) : false;
            const isDimmed = highlightedIds !== null && !isHighlighted;
            return (
              <ActivityDot
                key={activity.id}
                activity={activity}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
              />
            );
          })}
        </div>
      )}

      {/* Overflow count */}
      {overflowCount > 0 && (
        <p className="text-[10px] text-gray-400 mt-1">+{overflowCount} more</p>
      )}

      {/* Activity count badge */}
      {hasActivities && (
        <div className="absolute bottom-1.5 right-1.5">
          <span className="text-[10px] text-gray-400 font-medium">{activities.length}</span>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Draft Bar Overlay
// ---------------------------------------------------------------------------

function DraftBarOverlay({
  bars,
  grid,
  hoveredDraftId,
  onHover,
  onLeave,
  onClickDraft,
  selectedDraftId,
}: {
  bars: DraftBarPosition[];
  grid: CalendarGrid;
  hoveredDraftId: string | null;
  onHover: (id: string) => void;
  onLeave: () => void;
  onClickDraft: (id: string) => void;
  selectedDraftId: string | null;
}) {
  // For each bar, we render segments per row (week) it spans
  return (
    <>
      {bars.map(bar => {
        const segments: React.ReactNode[] = [];

        for (let row = bar.startRow; row <= bar.endRow; row++) {
          const segStartCol = row === bar.startRow ? bar.startCol : 0;
          const segEndCol = row === bar.endRow ? bar.endCol : 6;
          const colSpan = segEndCol - segStartCol + 1;

          // Position: each cell is 1/7 of grid width
          const leftPercent = (segStartCol / 7) * 100;
          const widthPercent = (colSpan / 7) * 100;

          // Vertical: account for header row + week row height + lane offset
          // Header row: 32px, each week row: 120px min
          const cellHeight = 120;
          const headerHeight = 32;
          const laneHeight = 22;
          const topPx = headerHeight + row * cellHeight + cellHeight - 4 - (bar.lane + 1) * laneHeight;

          const isHovered = hoveredDraftId === bar.draft.id;
          const isSelected = selectedDraftId === bar.draft.id;
          const isDimmed = hoveredDraftId !== null && !isHovered;

          segments.push(
            <div
              key={`${bar.draft.id}-row-${row}`}
              className={cn(
                'absolute h-5 rounded-full flex items-center gap-1 px-2 cursor-pointer transition-all duration-150 z-10',
                'bg-purple-500/80 hover:bg-purple-600/90',
                isHovered && 'bg-purple-600 shadow-md shadow-purple-200 z-20',
                isSelected && 'bg-purple-700 ring-2 ring-purple-300 z-20',
                isDimmed && 'opacity-40',
              )}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                top: `${topPx}px`,
              }}
              onMouseEnter={() => onHover(bar.draft.id)}
              onMouseLeave={onLeave}
              onClick={(e) => {
                e.stopPropagation();
                onClickDraft(bar.draft.id);
              }}
              title={bar.draft.title}
            >
              <Star className="w-3 h-3 text-white/80 shrink-0" />
              <span className="text-[10px] text-white font-medium truncate leading-none">
                {row === bar.startRow ? bar.draft.title : ''}
              </span>
            </div>
          );
        }

        return <React.Fragment key={bar.draft.id}>{segments}</React.Fragment>;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel (shown when a day is clicked)
// ---------------------------------------------------------------------------

function DayDetailPanel({
  dayKey,
  activities,
  onClose,
  expandedActivityId,
  onToggleActivity,
}: {
  dayKey: string;
  activities: MockActivity[];
  onClose: () => void;
  expandedActivityId: string | null;
  onToggleActivity: (id: string) => void;
}) {
  const dateObj = new Date(dayKey + 'T00:00:00Z');
  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // Group activities by source
  const sourceGroups = useMemo(() => {
    const groups: Record<string, MockActivity[]> = {};
    for (const a of activities) {
      if (!groups[a.source]) groups[a.source] = [];
      groups[a.source].push(a);
    }
    return groups;
  }, [activities]);

  // Related drafts for this day's activities
  const relatedDrafts = useMemo(() => {
    const draftIds = new Set<string>();
    for (const a of activities) {
      const ids = activityDraftMap[a.id] || [];
      ids.forEach(id => draftIds.add(id));
    }
    return mockDraftStories.filter(d => draftIds.has(d.id));
  }, [activities]);

  return (
    <div className="col-span-7 bg-white border border-gray-200 rounded-xl shadow-lg p-5 mt-2 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{formatted}</h3>
            <p className="text-xs text-gray-500">{activities.length} activit{activities.length === 1 ? 'y' : 'ies'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Activity list */}
      <div className="space-y-2 mb-4">
        {activities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map(activity => {
            const meta = SOURCE_META[activity.source];
            const isExpanded = expandedActivityId === activity.id;
            const linkedDrafts = activityDraftMap[activity.id] || [];

            return (
              <div
                key={activity.id}
                className={cn(
                  'border border-gray-100 rounded-lg transition-all duration-150 cursor-pointer',
                  isExpanded ? 'bg-gray-50 border-gray-200' : 'hover:bg-gray-50',
                )}
                onClick={() => onToggleActivity(activity.id)}
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Source icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}15` }}
                  >
                    <SourceIcon source={activity.source} className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{activity.description}</p>
                    )}
                  </div>

                  {/* Time + linked indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(activity.timestamp)}</span>
                    {linkedDrafts.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-purple-500" title="Linked to draft" />
                    )}
                    <ChevronRight
                      className={cn(
                        'w-3.5 h-3.5 text-gray-400 transition-transform duration-150',
                        isExpanded && 'rotate-90',
                      )}
                    />
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {meta.name}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-gray-600 leading-relaxed mb-2">{activity.description}</p>
                    )}
                    {activity.rawData && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                        {Object.entries(activity.rawData).map(([key, value]) => (
                          <span key={key}>
                            <span className="font-medium text-gray-600">{key}:</span>{' '}
                            {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                    {linkedDrafts.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Linked Draft Stories
                        </p>
                        {linkedDrafts.map(dId => {
                          const draft = mockDraftStories.find(d => d.id === dId);
                          if (!draft) return null;
                          return (
                            <div key={dId} className="flex items-center gap-1.5 text-xs text-purple-600">
                              <Star className="w-3 h-3" />
                              <span>{draft.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Related drafts section */}
      {relatedDrafts.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Related Draft Stories
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedDrafts.map(draft => (
              <div
                key={draft.id}
                className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100"
              >
                <Star className="w-3.5 h-3.5 text-purple-500" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-purple-900 truncate">{draft.title}</p>
                  <p className="text-[10px] text-purple-500">{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source summary chips */}
      {Object.keys(sourceGroups).length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(sourceGroups).map(([source, acts]) => {
              const meta = SOURCE_META[source as ActivitySource];
              return (
                <div
                  key={source}
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${meta.color}10`, color: meta.color }}
                >
                  <SourceIcon source={source as ActivitySource} className="w-3 h-3" />
                  {meta.name} ({acts.length})
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft Detail Panel (shown when a draft bar is clicked)
// ---------------------------------------------------------------------------

function DraftDetailPanel({
  draft,
  onClose,
}: {
  draft: MockDraftStory;
  onClose: () => void;
}) {
  const activities = getActivitiesForDraft(draft);

  return (
    <div className="col-span-7 bg-white border border-purple-200 rounded-xl shadow-lg p-5 mt-2 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Star className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{draft.title}</h3>
            <p className="text-xs text-gray-500">
              {formatDateRange(draft.dateRange.start, draft.dateRange.end)} · {draft.activityCount} activities
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] ml-2',
              draft.dominantRole === 'Led' && 'bg-purple-100 text-purple-700',
              draft.dominantRole === 'Contributed' && 'bg-blue-100 text-blue-700',
              draft.dominantRole === 'Participated' && 'bg-gray-100 text-gray-600',
            )}
          >
            {draft.dominantRole}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{draft.description}</p>

      {/* Topics */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {draft.topics.map(topic => (
          <span
            key={topic}
            className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5"
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Contributing activities */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Contributing Activities ({activities.length})
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map(activity => {
              const meta = SOURCE_META[activity.source];
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}15` }}
                  >
                    <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{activity.title}</p>
                    {activity.description && (
                      <p className="text-[10px] text-gray-400 truncate">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                    {timeAgo(activity.timestamp)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Tools */}
      <div className="border-t border-gray-100 pt-3 mt-3">
        <div className="flex items-center gap-1.5">
          {draft.tools.map(src => {
            const meta = SOURCE_META[src];
            return (
              <div
                key={src}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}15` }}
                title={meta.name}
              >
                <SourceIcon source={src} className="w-3 h-3" />
              </div>
            );
          })}
          <span className="text-[11px] text-gray-400 ml-1">
            {draft.tools.length} tools used
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV3() {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Build the calendar grid
  const grid = useMemo(() => buildCalendarGrid(), []);

  // Compute draft bar positions
  const draftBars = useMemo(() => computeDraftBars(grid), [grid]);

  // Max lane count for bottom padding on draft bars
  const maxLane = useMemo(() => Math.max(0, ...draftBars.map(b => b.lane)), [draftBars]);

  // Handle day cell click
  const handleDayClick = useCallback((dayKey: string) => {
    setSelectedDraftId(null);
    if (selectedDayKey === dayKey) {
      setSelectedDayKey(null);
      setExpandedActivityId(null);
    } else {
      setSelectedDayKey(dayKey);
      setExpandedActivityId(null);
    }
  }, [selectedDayKey]);

  // Handle draft bar click
  const handleDraftClick = useCallback((draftId: string) => {
    setSelectedDayKey(null);
    setExpandedActivityId(null);
    if (selectedDraftId === draftId) {
      setSelectedDraftId(null);
    } else {
      setSelectedDraftId(draftId);
    }
  }, [selectedDraftId]);

  // Toggle expanded activity
  const handleToggleActivity = useCallback((activityId: string) => {
    setExpandedActivityId(prev => prev === activityId ? null : activityId);
  }, []);

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedDayKey(null);
    setExpandedActivityId(null);
  }, []);

  const handleCloseDraftDetail = useCallback(() => {
    setSelectedDraftId(null);
  }, []);

  // Find the week row for the selected day (to insert detail panel after that row)
  const selectedDayInfo = useMemo(() => {
    if (!selectedDayKey) return null;
    return grid.days.find(d => d.key === selectedDayKey) || null;
  }, [selectedDayKey, grid]);

  // Find selected draft bar row for inserting detail below
  const selectedDraftBar = useMemo(() => {
    if (!selectedDraftId) return null;
    return draftBars.find(b => b.draft.id === selectedDraftId) || null;
  }, [selectedDraftId, draftBars]);

  // Find the week index to show the detail panel after
  const detailAfterWeek = useMemo(() => {
    if (selectedDayInfo) return selectedDayInfo.weekIndex;
    if (selectedDraftBar) return selectedDraftBar.endRow;
    return null;
  }, [selectedDayInfo, selectedDraftBar]);

  // Group days by week for rendering
  const weeks = useMemo(() => {
    const result: CalendarDay[][] = [];
    for (let w = 0; w < grid.weekCount; w++) {
      result.push(grid.days.filter(d => d.weekIndex === w));
    }
    return result;
  }, [grid]);

  // Activity stats
  const totalDays = useMemo(() => {
    return Object.keys(grid.activitiesByDay).length;
  }, [grid]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar Grid</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            {mockActivities.length} activities across {totalDays} days · {mockDraftStories.length} draft stories
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-purple-500/80" />
            <span>Draft story span</span>
          </div>
          {(['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'] as ActivitySource[]).map(src => (
            <div key={src} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SOURCE_META[src].color }}
              />
              <span>{SOURCE_META[src].name}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="relative">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-0">
            {DAY_NAMES.map(name => (
              <div
                key={name}
                className="h-8 flex items-center justify-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Week rows with draft bar overlay */}
          <div className="relative">
            {/* Draft bar overlays */}
            <DraftBarOverlay
              bars={draftBars}
              grid={grid}
              hoveredDraftId={hoveredDraftId}
              onHover={setHoveredDraftId}
              onLeave={() => setHoveredDraftId(null)}
              onClickDraft={handleDraftClick}
              selectedDraftId={selectedDraftId}
            />

            {/* Week rows */}
            {weeks.map((weekDays, weekIndex) => (
              <React.Fragment key={weekIndex}>
                {/* Grid row for this week */}
                <div className="grid grid-cols-7 gap-0">
                  {weekDays.map(day => {
                    const activities = grid.activitiesByDay[day.key] || [];
                    return (
                      <DayCell
                        key={day.key}
                        day={day}
                        activities={activities}
                        isSelected={selectedDayKey === day.key}
                        hoveredDraftId={hoveredDraftId}
                        onClick={() => handleDayClick(day.key)}
                      />
                    );
                  })}
                  {/* Pad incomplete weeks (shouldn't happen with Monday alignment but safety) */}
                  {weekDays.length < 7 &&
                    Array.from({ length: 7 - weekDays.length }).map((_, i) => (
                      <div key={`pad-${i}`} className="min-h-[120px] bg-gray-50 border border-gray-50" />
                    ))
                  }
                </div>

                {/* Day detail panel inserted after the selected week */}
                {detailAfterWeek === weekIndex && selectedDayKey && !selectedDraftId && (
                  <div className="grid grid-cols-7 gap-0">
                    <DayDetailPanel
                      dayKey={selectedDayKey}
                      activities={grid.activitiesByDay[selectedDayKey] || []}
                      onClose={handleCloseDetail}
                      expandedActivityId={expandedActivityId}
                      onToggleActivity={handleToggleActivity}
                    />
                  </div>
                )}

                {/* Draft detail panel inserted after the relevant week */}
                {detailAfterWeek === weekIndex && selectedDraftId && !selectedDayKey && selectedDraftBar && (
                  <div className="grid grid-cols-7 gap-0">
                    <DraftDetailPanel
                      draft={selectedDraftBar.draft}
                      onClose={handleCloseDraftDetail}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span>{grid.weekCount} weeks shown</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            <span>Today highlighted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            <span>Draft story bars (click to expand)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Click any day cell to view activity details</span>
          </div>
        </div>
      </div>
    </div>
  );
}
