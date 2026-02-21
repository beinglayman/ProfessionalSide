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
  ZoomIn, ZoomOut, Maximize2, ArrowUpRight, Star, X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SOURCES: ActivitySource[] = [
  'github', 'jira', 'slack', 'confluence', 'figma', 'google-meet',
];

const LANE_HEIGHT = 64;
const LANE_GAP = 8;
const NODE_SIZE = 32;
const LABEL_WIDTH = 140;
const RIVER_PADDING_LEFT = 40;
const RIVER_PADDING_RIGHT = 60;
const HEADER_HEIGHT = 40;
const BASE_WIDTH = 1200;

// ---------------------------------------------------------------------------
// Utilities (redeclared per-file convention)
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
// Time Scale helpers
// ---------------------------------------------------------------------------

interface TimeScale {
  minTime: number;
  maxTime: number;
  totalMs: number;
  toX: (ts: string) => number;
  riverWidth: number;
}

function buildTimeScale(activities: MockActivity[], baseWidth: number, zoom: number): TimeScale {
  const timestamps = activities.map(a => new Date(a.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const totalMs = maxTime - minTime || 1;
  const riverWidth = Math.max(baseWidth, 800) * zoom;

  const toX = (ts: string): number => {
    const t = new Date(ts).getTime();
    const ratio = (t - minTime) / totalMs;
    return RIVER_PADDING_LEFT + ratio * (riverWidth - RIVER_PADDING_LEFT - RIVER_PADDING_RIGHT);
  };

  return { minTime, maxTime, totalMs, toX, riverWidth };
}

// ---------------------------------------------------------------------------
// Tick mark generation for time axis
// ---------------------------------------------------------------------------

interface TimeTick {
  x: number;
  label: string;
}

function buildTimeTicks(scale: TimeScale, count: number): TimeTick[] {
  const ticks: TimeTick[] = [];
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric' };
  for (let i = 0; i <= count; i++) {
    const t = scale.minTime + (scale.totalMs * i) / count;
    const date = new Date(t);
    const ratio = i / count;
    const x = RIVER_PADDING_LEFT + ratio * (scale.riverWidth - RIVER_PADDING_LEFT - RIVER_PADDING_RIGHT);
    ticks.push({
      x,
      label: date.toLocaleDateString('en-US', opts),
    });
  }
  return ticks;
}

// ---------------------------------------------------------------------------
// Positioned data types
// ---------------------------------------------------------------------------

interface PositionedActivity extends MockActivity {
  x: number;
  laneIndex: number;
  linkedDraftIds: string[];
}

interface PositionedDraft {
  draft: MockDraftStory;
  xStart: number;
  xEnd: number;
  laneIndices: number[];
  topLane: number;
  bottomLane: number;
  activities: MockActivity[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV15() {
  // ---- State ----
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // ---- Pre-compute draft membership ----
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // ---- Time scale ----
  const scale = useMemo(
    () => buildTimeScale(mockActivities, BASE_WIDTH, zoomLevel),
    [zoomLevel],
  );

  // ---- Tick marks ----
  const ticks = useMemo(() => {
    const tickCount = Math.max(4, Math.round(6 * zoomLevel));
    return buildTimeTicks(scale, tickCount);
  }, [scale, zoomLevel]);

  // ---- Positioned activities ----
  const positionedActivities = useMemo((): PositionedActivity[] => {
    return mockActivities.map(a => {
      const laneIndex = ALL_SOURCES.indexOf(a.source);
      const x = scale.toX(a.timestamp);
      const linkedDraftIds = activityDraftMap[a.id] ?? [];
      return { ...a, x, laneIndex, linkedDraftIds };
    });
  }, [scale]);

  // ---- Activities grouped by source for lane rendering ----
  const activitiesBySource = useMemo(() => {
    const map: Record<ActivitySource, PositionedActivity[]> = {
      github: [], jira: [], slack: [], confluence: [], figma: [], 'google-meet': [],
    };
    for (const pa of positionedActivities) {
      map[pa.source].push(pa);
    }
    return map;
  }, [positionedActivities]);

  // ---- Positioned drafts ----
  const positionedDrafts = useMemo((): PositionedDraft[] => {
    return mockDraftStories.map(draft => {
      const xStart = scale.toX(draft.dateRange.start);
      const xEnd = scale.toX(draft.dateRange.end);
      const activities = getActivitiesForDraft(draft);
      const laneIndices = Array.from(
        new Set(draft.tools.map(t => ALL_SOURCES.indexOf(t)).filter(i => i >= 0))
      ).sort((a, b) => a - b);
      const topLane = Math.min(...laneIndices);
      const bottomLane = Math.max(...laneIndices);
      return { draft, xStart, xEnd, laneIndices, topLane, bottomLane, activities };
    });
  }, [scale]);

  // ---- Hover-derived highlights ----
  const hoveredNodeDraftIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    return new Set(activityDraftMap[hoveredNodeId] ?? []);
  }, [hoveredNodeId]);

  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  const isAnyHoverActive = hoveredNodeId !== null || hoveredDraftId !== null;

  // ---- Expanded draft data ----
  const expandedDraft = useMemo(() => {
    if (!expandedDraftId) return null;
    const pd = positionedDrafts.find(p => p.draft.id === expandedDraftId);
    if (!pd) return null;
    const grouped: Record<ActivitySource, MockActivity[]> = {
      github: [], jira: [], slack: [], confluence: [], figma: [], 'google-meet': [],
    };
    for (const a of pd.activities) {
      grouped[a.source].push(a);
    }
    return { ...pd, grouped };
  }, [expandedDraftId, positionedDrafts]);

  // ---- Layout geometry ----
  const totalLanesHeight = ALL_SOURCES.length * (LANE_HEIGHT + LANE_GAP) - LANE_GAP;
  const svgHeight = HEADER_HEIGHT + totalLanesHeight + 40;

  const laneY = (index: number): number => {
    return HEADER_HEIGHT + index * (LANE_HEIGHT + LANE_GAP) + LANE_HEIGHT / 2;
  };

  // ---- Zoom controls ----
  const zoomOptions = [0.5, 1, 2] as const;

  // ---- Determine if a node should be dimmed ----
  const isNodeDimmed = (activityId: string): boolean => {
    if (!isAnyHoverActive) return false;
    if (hoveredNodeId === activityId) return false;
    if (hoveredDraftActivityIds.has(activityId)) return false;
    if (hoveredNodeDraftIds.size > 0) {
      const nodeDrafts = activityDraftMap[activityId] ?? [];
      for (const dId of nodeDrafts) {
        if (hoveredNodeDraftIds.has(dId)) return false;
      }
    }
    return true;
  };

  // ---- Determine if a draft band should be highlighted ----
  const isDraftBandHighlighted = (draftId: string): boolean => {
    if (hoveredNodeDraftIds.has(draftId)) return true;
    if (hoveredDraftId === draftId) return true;
    return false;
  };

  const isDraftBandDimmed = (draftId: string): boolean => {
    if (!isAnyHoverActive) return false;
    return !isDraftBandHighlighted(draftId);
  };

  // ---- Tooltip state derived from hovered node ----
  const tooltipData = useMemo(() => {
    if (!hoveredNodeId) return null;
    const pa = positionedActivities.find(p => p.id === hoveredNodeId);
    if (!pa) return null;
    return pa;
  }, [hoveredNodeId, positionedActivities]);

  // ---- Render ----
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">River Flow</h1>
            <p className="text-sm text-gray-500 mt-1">
              {mockActivities.length} activities flowing across {ALL_SOURCES.length} source streams
              <span className="mx-1.5">&middot;</span>
              {mockDraftStories.length} draft stories
            </p>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <ZoomOut className="w-4 h-4 text-gray-400 ml-1" />
            {zoomOptions.map(z => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  zoomLevel === z
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {z}x
              </button>
            ))}
            <ZoomIn className="w-4 h-4 text-gray-400 mr-1" />
          </div>
        </div>

        {/* River Container */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex">
              {/* Fixed source lane labels */}
              <div
                className="shrink-0 border-r border-gray-200 bg-gray-50/80"
                style={{ width: LABEL_WIDTH }}
              >
                {/* Spacer for time axis header */}
                <div
                  className="border-b border-gray-200 flex items-center px-3"
                  style={{ height: HEADER_HEIGHT }}
                >
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Sources
                  </span>
                </div>

                {/* Source labels */}
                {ALL_SOURCES.map((source, idx) => {
                  const meta = SOURCE_META[source];
                  const count = activitiesBySource[source].length;
                  return (
                    <div
                      key={source}
                      className="flex items-center gap-2.5 px-3 border-b border-gray-100 last:border-b-0"
                      style={{ height: LANE_HEIGHT + (idx < ALL_SOURCES.length - 1 ? LANE_GAP : 0) }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}18` }}
                      >
                        <SourceIcon source={source} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {meta.name}
                        </p>
                        <p className="text-[10px] text-gray-400">{count} items</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable river area */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: scale.riverWidth, position: 'relative' }}>
                  {/* SVG river */}
                  <svg
                    width={scale.riverWidth}
                    height={svgHeight}
                    className="block"
                  >
                    {/* Time axis ticks */}
                    {ticks.map((tick, i) => (
                      <g key={i}>
                        <line
                          x1={tick.x}
                          y1={HEADER_HEIGHT - 4}
                          x2={tick.x}
                          y2={svgHeight}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                        <text
                          x={tick.x}
                          y={HEADER_HEIGHT - 12}
                          textAnchor="middle"
                          className="fill-gray-400"
                          fontSize={10}
                          fontWeight={500}
                        >
                          {tick.label}
                        </text>
                      </g>
                    ))}

                    {/* Draft bands (translucent purple vertical rectangles) */}
                    {positionedDrafts.map(pd => {
                      const highlighted = isDraftBandHighlighted(pd.draft.id);
                      const dimmed = isDraftBandDimmed(pd.draft.id);
                      const bandWidth = Math.max(pd.xEnd - pd.xStart, 24);
                      const topY = laneY(pd.topLane) - LANE_HEIGHT / 2 + 2;
                      const bottomY = laneY(pd.bottomLane) + LANE_HEIGHT / 2 - 2;
                      const bandHeight = bottomY - topY;

                      return (
                        <g
                          key={`draft-band-${pd.draft.id}`}
                          onMouseEnter={() => setHoveredDraftId(pd.draft.id)}
                          onMouseLeave={() => setHoveredDraftId(null)}
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            setExpandedDraftId(prev =>
                              prev === pd.draft.id ? null : pd.draft.id,
                            )
                          }
                        >
                          <rect
                            x={pd.xStart}
                            y={topY}
                            width={bandWidth}
                            height={bandHeight}
                            rx={8}
                            fill={highlighted ? 'rgba(147, 51, 234, 0.15)' : 'rgba(147, 51, 234, 0.07)'}
                            stroke={highlighted ? 'rgba(147, 51, 234, 0.5)' : 'rgba(147, 51, 234, 0.2)'}
                            strokeWidth={highlighted ? 2 : 1}
                            strokeDasharray={highlighted ? 'none' : '4 3'}
                            opacity={dimmed ? 0.3 : 1}
                            className="transition-all duration-200"
                          />

                          {/* Vertical connection lines across lanes */}
                          {pd.laneIndices.length > 1 && pd.laneIndices.map((li, liIdx) => {
                            if (liIdx === pd.laneIndices.length - 1) return null;
                            const nextLi = pd.laneIndices[liIdx + 1];
                            const y1 = laneY(li) + NODE_SIZE / 2 + 2;
                            const y2 = laneY(nextLi) - NODE_SIZE / 2 - 2;
                            const midX = pd.xStart + bandWidth / 2;
                            return (
                              <line
                                key={`conn-${li}-${nextLi}`}
                                x1={midX}
                                y1={y1}
                                x2={midX}
                                y2={y2}
                                stroke="rgba(147, 51, 234, 0.3)"
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                                opacity={dimmed ? 0.3 : 1}
                              />
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* Stream lines (horizontal line per lane) */}
                    {ALL_SOURCES.map((source, idx) => {
                      const y = laneY(idx);
                      const activities = activitiesBySource[source];
                      if (activities.length === 0) {
                        return (
                          <line
                            key={`stream-${source}`}
                            x1={RIVER_PADDING_LEFT - 10}
                            y1={y}
                            x2={scale.riverWidth - RIVER_PADDING_RIGHT + 10}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                          />
                        );
                      }
                      const sorted = [...activities].sort((a, b) => a.x - b.x);
                      const startX = Math.max(RIVER_PADDING_LEFT - 10, sorted[0].x - 20);
                      const endX = Math.min(
                        scale.riverWidth - RIVER_PADDING_RIGHT + 10,
                        sorted[sorted.length - 1].x + 20,
                      );
                      return (
                        <line
                          key={`stream-${source}`}
                          x1={startX}
                          y1={y}
                          x2={endX}
                          y2={y}
                          stroke={SOURCE_META[source].color}
                          strokeWidth={2}
                          strokeOpacity={0.2}
                        />
                      );
                    })}

                    {/* Activity nodes */}
                    {positionedActivities.map(pa => {
                      const cy = laneY(pa.laneIndex);
                      const dimmed = isNodeDimmed(pa.id);
                      const isHovered = hoveredNodeId === pa.id;
                      const hasDraftLink = pa.linkedDraftIds.length > 0;
                      const nodeRadius = isHovered ? NODE_SIZE / 2 + 4 : NODE_SIZE / 2;

                      return (
                        <g
                          key={`node-${pa.id}`}
                          onMouseEnter={() => setHoveredNodeId(pa.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          style={{ cursor: 'pointer' }}
                          className="transition-all duration-150"
                        >
                          {/* Purple ring for draft-linked nodes */}
                          {hasDraftLink && (
                            <circle
                              cx={pa.x}
                              cy={cy}
                              r={nodeRadius + 3}
                              fill="none"
                              stroke="rgba(147, 51, 234, 0.6)"
                              strokeWidth={2}
                              opacity={dimmed ? 0.25 : 1}
                            />
                          )}

                          {/* Main node circle */}
                          <circle
                            cx={pa.x}
                            cy={cy}
                            r={nodeRadius}
                            fill={SOURCE_META[pa.source].color}
                            opacity={dimmed ? 0.25 : 1}
                            className="transition-all duration-150"
                          />

                          {/* Icon placeholder (white center dot) */}
                          <circle
                            cx={pa.x}
                            cy={cy}
                            r={isHovered ? 5 : 4}
                            fill="white"
                            opacity={dimmed ? 0.25 : 0.9}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Draft label cards floating at top of each band */}
                  {positionedDrafts.map(pd => {
                    const bandWidth = Math.max(pd.xEnd - pd.xStart, 24);
                    const highlighted = isDraftBandHighlighted(pd.draft.id);
                    const dimmed = isDraftBandDimmed(pd.draft.id);
                    const labelLeft = pd.xStart + bandWidth / 2;

                    return (
                      <div
                        key={`draft-label-${pd.draft.id}`}
                        className={cn(
                          'absolute pointer-events-auto',
                          'transition-all duration-200',
                          dimmed && 'opacity-30',
                        )}
                        style={{
                          left: labelLeft,
                          top: HEADER_HEIGHT + pd.topLane * (LANE_HEIGHT + LANE_GAP) - 4,
                          transform: 'translate(-50%, -100%)',
                        }}
                      >
                        <button
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                            'bg-white border shadow-sm text-left whitespace-nowrap',
                            'hover:shadow-md transition-all duration-200',
                            highlighted
                              ? 'border-purple-400 shadow-purple-100'
                              : 'border-gray-200',
                          )}
                          onMouseEnter={() => setHoveredDraftId(pd.draft.id)}
                          onMouseLeave={() => setHoveredDraftId(null)}
                          onClick={() =>
                            setExpandedDraftId(prev =>
                              prev === pd.draft.id ? null : pd.draft.id,
                            )
                          }
                        >
                          <Star className="w-3 h-3 text-purple-500 fill-purple-500 shrink-0" />
                          <span className="text-[11px] font-semibold text-gray-800 max-w-[160px] truncate">
                            {pd.draft.title}
                          </span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Tooltip overlay for hovered node */}
                  {tooltipData && (
                    <div
                      className="absolute z-50 pointer-events-none"
                      style={{
                        left: tooltipData.x,
                        top: laneY(tooltipData.laneIndex) - NODE_SIZE / 2 - 8,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3 py-2.5 max-w-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: SOURCE_META[tooltipData.source].color }}
                          >
                            <SourceIcon source={tooltipData.source} className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wide">
                            {SOURCE_META[tooltipData.source].name}
                          </span>
                          <span className="text-[10px] text-gray-500 ml-auto">
                            {timeAgo(tooltipData.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-snug line-clamp-2">
                          {tooltipData.title}
                        </p>
                        {tooltipData.description && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                            {tooltipData.description}
                          </p>
                        )}
                        {tooltipData.linkedDraftIds.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-700">
                            <span className="text-[10px] text-purple-300">
                              Linked to {tooltipData.linkedDraftIds.length} draft{tooltipData.linkedDraftIds.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {/* Arrow */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expanded draft detail panel */}
        {expandedDraft && (
          <Card className="mt-4 border-purple-200 shadow-lg">
            <CardContent className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star className="w-4 h-4 text-purple-500 fill-purple-500 shrink-0" />
                    <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                      Draft Story
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-purple-200 text-purple-600"
                    >
                      {expandedDraft.draft.dominantRole}
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 leading-snug">
                    {expandedDraft.draft.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {expandedDraft.draft.description}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedDraftId(null)}
                  className="ml-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span>{expandedDraft.draft.activityCount} activities</span>
                <span>&middot;</span>
                <span>
                  {formatDateRange(
                    expandedDraft.draft.dateRange.start,
                    expandedDraft.draft.dateRange.end,
                  )}
                </span>
                <span>&middot;</span>
                <div className="flex items-center gap-1">
                  {expandedDraft.draft.topics.map(topic => (
                    <span
                      key={topic}
                      className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Overlapping source icons */}
              <div className="flex items-center gap-1.5 mb-5">
                {expandedDraft.draft.tools.map(tool => (
                  <div
                    key={tool}
                    className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                    style={{ backgroundColor: SOURCE_META[tool].color }}
                  >
                    <SourceIcon source={tool} className="w-3 h-3 text-white" />
                  </div>
                ))}
              </div>

              {/* Contributing activities grouped by source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ALL_SOURCES.map(source => {
                  const activities = expandedDraft.grouped[source];
                  if (!activities || activities.length === 0) return null;
                  const meta = SOURCE_META[source];
                  return (
                    <div key={source} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${meta.color}18` }}
                        >
                          <SourceIcon source={source} className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {meta.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                          {activities.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {activities.map(a => (
                          <div key={a.id} className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: meta.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-800 font-medium leading-snug line-clamp-2">
                                {a.title}
                              </p>
                              <span className="text-[10px] text-gray-400">
                                {timeAgo(a.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end">
                <button className="bg-purple-600 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1">
                  Create Story
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 px-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-400" />
            <span className="text-[11px] text-gray-500">Activity node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-400 ring-2 ring-purple-400 ring-offset-1" />
            <span className="text-[11px] text-gray-500">Draft-linked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 rounded bg-purple-200/60 border border-purple-300/60 border-dashed" />
            <span className="text-[11px] text-gray-500">Draft story span</span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-[11px] text-gray-400">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Scroll horizontally to explore the timeline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
