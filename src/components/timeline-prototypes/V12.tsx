'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap, getDayKey,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Star, ArrowUpRight, X, ChevronDown, ChevronUp, Activity } from 'lucide-react';

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
// Constants
// ---------------------------------------------------------------------------

const ALL_SOURCES: ActivitySource[] = ['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CellKey {
  source: ActivitySource;
  day: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellKeyStr(source: ActivitySource, day: string): string {
  return `${source}::${day}`;
}

function parseCellKey(key: string): CellKey {
  const [source, day] = key.split('::');
  return { source: source as ActivitySource, day };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function formatDayLabel(dayKey: string): string {
  const d = new Date(dayKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayShort(dayKey: string): string {
  const d = new Date(dayKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const s = new Date(getDayKey(start) + 'T12:00:00');
  const e = new Date(getDayKey(end) + 'T12:00:00');
  const current = new Date(s);
  while (current <= e) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Popover showing activities in a cell */
function CellPopover({
  activities,
  source,
  day,
  onClose,
}: {
  activities: MockActivity[];
  source: ActivitySource;
  day: string;
  onClose: () => void;
}) {
  const meta = SOURCE_META[source];
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: `${meta.color}18` }}
          >
            <SourceIcon source={source} className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-gray-700">{meta.name}</span>
          <span className="text-[10px] text-gray-400">{formatDayLabel(day)}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Activity list */}
      <div className="max-h-48 overflow-y-auto p-2 space-y-1.5">
        {activities.map((a) => {
          const linked = (activityDraftMap[a.id] ?? []).length > 0;
          return (
            <div
              key={a.id}
              className={cn(
                'rounded-lg px-2.5 py-2 text-xs bg-gray-50/60 hover:bg-gray-100/80 transition-colors',
                linked && 'border-l-2 border-l-purple-400',
              )}
            >
              <p className="font-medium text-gray-800 leading-snug line-clamp-2">{a.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(a.timestamp)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Draft summary card */
function DraftCard({
  draft,
  isHovered,
  isExpanded,
  onHover,
  onLeave,
  onClick,
}: {
  draft: MockDraftStory;
  isHovered: boolean;
  isExpanded: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const draftActivities = getActivitiesForDraft(draft);
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 border-2',
        isHovered
          ? 'border-purple-400 shadow-lg shadow-purple-100/50 scale-[1.01]'
          : 'border-purple-200 hover:border-purple-300 shadow-sm',
        isExpanded && 'border-purple-500 ring-2 ring-purple-200 ring-offset-1',
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
            <Star className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{draft.title}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{draft.description}</p>

            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {draft.tools.map((t) => (
                <div
                  key={t}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${SOURCE_META[t].color}14` }}
                >
                  <SourceIcon source={t} className="w-3 h-3" />
                </div>
              ))}
              <span className="text-[10px] text-gray-400 ml-1">{draft.activityCount} activities</span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-200 text-purple-600">
                {draft.dominantRole}
              </Badge>
              <span className="text-[10px] text-gray-400">{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</span>
            </div>

            {/* Expanded: show linked activities */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Linked Activities</p>
                {draftActivities.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <SourceIcon source={a.source} className="w-3 h-3 text-gray-400" />
                    <span className="truncate">{a.title}</span>
                  </div>
                ))}
                {draftActivities.length > 5 && (
                  <p className="text-[10px] text-gray-400">+{draftActivities.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV12() {
  // -- State --
  const [hoveredCell, setHoveredCell] = useState<CellKey | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellKey | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);

  // -- Build the matrix --
  const { matrix, uniqueDays, maxCount } = useMemo(() => {
    const mat: Record<string, Record<string, MockActivity[]>> = {};
    const daySet = new Set<string>();

    for (const src of ALL_SOURCES) {
      mat[src] = {};
    }

    for (const a of mockActivities) {
      const day = getDayKey(a.timestamp);
      daySet.add(day);
      if (!mat[a.source][day]) mat[a.source][day] = [];
      mat[a.source][day].push(a);
    }

    const sortedDays = Array.from(daySet).sort();
    let max = 0;
    for (const src of ALL_SOURCES) {
      for (const day of sortedDays) {
        const count = (mat[src][day] ?? []).length;
        if (count > max) max = count;
      }
    }

    return { matrix: mat, uniqueDays: sortedDays, maxCount: max };
  }, []);

  // -- Draft overlay data: which cells belong to each draft --
  const draftCellSets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const draft of mockDraftStories) {
      const cellSet = new Set<string>();
      const draftDays = getDaysInRange(draft.dateRange.start, draft.dateRange.end);
      for (const source of draft.tools) {
        for (const day of draftDays) {
          if (uniqueDays.includes(day)) {
            cellSet.add(cellKeyStr(source, day));
          }
        }
      }
      sets[draft.id] = cellSet;
    }
    return sets;
  }, [uniqueDays]);

  // -- Hovered draft cells --
  const hoveredDraftCells = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftCellSets[hoveredDraftId] ?? new Set();
  }, [hoveredDraftId, draftCellSets]);

  // -- Cell color computation --
  const getCellBg = useCallback((source: ActivitySource, day: string, count: number): string => {
    if (count === 0) return 'rgba(249, 250, 251, 1)'; // gray-50
    const { r, g, b } = hexToRgb(SOURCE_META[source].color);
    const opacity = 0.15 + Math.min(count / 3, 1) * 0.65;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }, []);

  // -- Check if a cell is part of draft overlay --
  const isCellInDraft = useCallback((source: ActivitySource, day: string): string[] => {
    const key = cellKeyStr(source, day);
    const draftIds: string[] = [];
    for (const draft of mockDraftStories) {
      if (draftCellSets[draft.id]?.has(key)) {
        draftIds.push(draft.id);
      }
    }
    return draftIds;
  }, [draftCellSets]);

  // -- Selected cell activities --
  const selectedActivities = useMemo(() => {
    if (!selectedCell) return [];
    return matrix[selectedCell.source]?.[selectedCell.day] ?? [];
  }, [selectedCell, matrix]);

  // -- Handlers --
  const handleCellHover = useCallback((source: ActivitySource, day: string) => {
    setHoveredCell({ source, day });
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleCellClick = useCallback((source: ActivitySource, day: string) => {
    const current = selectedCell;
    if (current && current.source === source && current.day === day) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ source, day });
    }
  }, [selectedCell]);

  // -- Total activity count --
  const totalActivities = mockActivities.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Activity className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Activity Heatmap</h2>
            <p className="text-sm text-gray-500">
              GitHub contribution graph style — {totalActivities} activities across {ALL_SOURCES.length} sources
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 ml-1">
          <span className="text-[11px] text-gray-500 font-medium">Intensity:</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-sm bg-gray-100 border border-gray-200" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-200" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-400" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-600" />
            <span className="text-[10px] text-gray-400 ml-1">Low to High</span>
          </div>
          <div className="flex items-center gap-1.5 ml-4">
            <div className="w-3.5 h-3.5 rounded-sm border-2 border-purple-400 bg-purple-50" />
            <span className="text-[10px] text-gray-400">Draft story overlay</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div
              className="inline-grid min-w-full"
              style={{
                gridTemplateColumns: `140px repeat(${uniqueDays.length}, 32px)`,
                gridTemplateRows: `36px repeat(${ALL_SOURCES.length}, 32px)`,
              }}
            >
              {/* Header row: empty corner + day labels */}
              <div className="sticky left-0 z-20 bg-white border-b border-r border-gray-100 flex items-center px-3">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Source</span>
              </div>
              {uniqueDays.map((day) => {
                const isHoveredCol = hoveredCell?.day === day;
                const isSelectedCol = selectedCell?.day === day;
                return (
                  <div
                    key={`header-${day}`}
                    className={cn(
                      'flex flex-col items-center justify-center border-b border-gray-100 transition-colors duration-100',
                      isHoveredCol && 'bg-blue-50/60',
                      isSelectedCol && 'bg-blue-100/50',
                    )}
                  >
                    <span className="text-[9px] font-medium text-gray-400 leading-none">{formatDayShort(day)}</span>
                    <span className="text-[9px] text-gray-300 leading-none mt-0.5">
                      {new Date(day + 'T12:00:00').getDate()}
                    </span>
                  </div>
                );
              })}

              {/* Source rows */}
              {ALL_SOURCES.map((source, rowIdx) => {
                const meta = SOURCE_META[source];
                const isHoveredRow = hoveredCell?.source === source;
                const isSelectedRow = selectedCell?.source === source;

                return (
                  <React.Fragment key={source}>
                    {/* Row header */}
                    <div
                      className={cn(
                        'sticky left-0 z-20 bg-white flex items-center gap-2.5 px-3 border-r border-gray-100 transition-colors duration-100',
                        rowIdx < ALL_SOURCES.length - 1 && 'border-b border-b-gray-50',
                        isHoveredRow && 'bg-blue-50/60',
                        isSelectedRow && 'bg-blue-100/50',
                      )}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}14` }}
                      >
                        <SourceIcon source={source} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate">{meta.name}</span>
                    </div>

                    {/* Data cells */}
                    {uniqueDays.map((day) => {
                      const activities = matrix[source]?.[day] ?? [];
                      const count = activities.length;
                      const cellKey = cellKeyStr(source, day);

                      const isHovered = hoveredCell?.source === source && hoveredCell?.day === day;
                      const isSelected = selectedCell?.source === source && selectedCell?.day === day;
                      const isInHoveredRow = hoveredCell?.source === source;
                      const isInHoveredCol = hoveredCell?.day === day;
                      const isInDraftHover = hoveredDraftCells.has(cellKey);
                      const cellDrafts = isCellInDraft(source, day);
                      const hasDraftOverlay = cellDrafts.length > 0;

                      return (
                        <div
                          key={cellKey}
                          className={cn(
                            'relative flex items-center justify-center cursor-pointer transition-all duration-100',
                            rowIdx < ALL_SOURCES.length - 1 && 'border-b border-b-gray-50/50',
                            // Crosshair highlight
                            !isHovered && (isInHoveredRow || isInHoveredCol) && 'bg-blue-50/30',
                            // Selected crosshair
                            isSelected && 'ring-2 ring-inset ring-gray-800 z-10',
                            // Draft hover highlight
                            isInDraftHover && 'ring-2 ring-inset ring-purple-400 z-10',
                          )}
                          onMouseEnter={() => handleCellHover(source, day)}
                          onMouseLeave={handleCellLeave}
                          onClick={() => handleCellClick(source, day)}
                        >
                          {/* Cell fill */}
                          <div
                            className={cn(
                              'w-[26px] h-[26px] rounded-[4px] transition-all duration-150',
                              isHovered && 'scale-110 shadow-sm',
                              count === 0 && 'border border-gray-100',
                            )}
                            style={{
                              backgroundColor: getCellBg(source, day, count),
                            }}
                          />

                          {/* Draft overlay indicator */}
                          {hasDraftOverlay && (
                            <div className="absolute inset-0.5 rounded-[4px] border-2 border-purple-300/60 pointer-events-none" />
                          )}

                          {/* Count badge for cells with many activities */}
                          {count >= 2 && (
                            <span className="absolute text-[8px] font-bold text-white pointer-events-none drop-shadow-sm">
                              {count}
                            </span>
                          )}

                          {/* Popover on hover */}
                          {isHovered && count > 0 && (
                            <CellPopover
                              activities={activities}
                              source={source}
                              day={day}
                              onClose={() => setHoveredCell(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Cell Detail Panel */}
      {selectedCell && selectedActivities.length > 0 && (
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${SOURCE_META[selectedCell.source].color}18` }}
                >
                  <SourceIcon source={selectedCell.source} className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {SOURCE_META[selectedCell.source].name}
                </span>
                <span className="text-xs text-gray-400">{formatDayLabel(selectedCell.day)}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {selectedActivities.map((a) => {
                const linked = (activityDraftMap[a.id] ?? []).length > 0;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'px-5 py-3.5 hover:bg-gray-50/50 transition-colors',
                      linked && 'border-l-3 border-l-purple-300',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{a.title}</p>
                        {a.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linked && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-200 text-purple-500">
                            Draft linked
                          </Badge>
                        )}
                        <span className="text-[11px] text-gray-400">{timeAgo(a.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {ALL_SOURCES.slice(0, 3).map((source) => {
          const meta = SOURCE_META[source];
          const sourceActivities = mockActivities.filter((a) => a.source === source);
          const activeDays = new Set(sourceActivities.map((a) => getDayKey(a.timestamp)));
          return (
            <div
              key={source}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 bg-white"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}14` }}
              >
                <SourceIcon source={source} className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{sourceActivities.length}</p>
                <p className="text-[10px] text-gray-400">{meta.name} across {activeDays.size} days</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draft Story Overlays Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-gray-800">Draft Stories</h3>
          <span className="text-xs text-gray-400">Highlighted on the heatmap</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockDraftStories.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              isHovered={hoveredDraftId === draft.id}
              isExpanded={expandedDraftId === draft.id}
              onHover={() => setHoveredDraftId(draft.id)}
              onLeave={() => setHoveredDraftId(null)}
              onClick={() =>
                setExpandedDraftId((prev) => (prev === draft.id ? null : draft.id))
              }
            />
          ))}
        </div>
      </div>

      {/* Grid Legend / Footer */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-4">
          {ALL_SOURCES.map((source) => {
            const meta = SOURCE_META[source];
            const { r, g, b } = hexToRgb(meta.color);
            return (
              <div key={source} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, 0.55)` }}
                />
                <span className="text-[10px] text-gray-400">{meta.name}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-300">
          {uniqueDays.length} days &middot; {ALL_SOURCES.length} sources &middot; {totalActivities} events
        </p>
      </div>
    </div>
  );
}
