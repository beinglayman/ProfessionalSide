'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity,
} from './mock-data';
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Star, ArrowUpRight, Info, ChevronDown, ChevronRight } from 'lucide-react';

/* ── Utilities ──────────────────────────────────────────────── */

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

/* ── Constants ──────────────────────────────────────────────── */

const ALL_SOURCES: ActivitySource[] = ['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'];
const LANE_HEIGHT = 64; // px – matches h-16
const LABEL_WIDTH = 120; // px – left column
const CONTENT_WIDTH = 1200; // px – scrollable content area
const HEADER_HEIGHT = 32; // px – time axis row

const ROLE_COLORS: Record<string, string> = {
  Led: 'text-amber-600',
  Contributed: 'text-blue-600',
  Participated: 'text-gray-500',
};

/* ── Component ──────────────────────────────────────────────── */

export function TimelineV8() {
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});

  /* ── Time mapping ──────────────────────────────────────────── */

  const timeRange = useMemo(() => {
    const timestamps = mockActivities.map(a => new Date(a.timestamp).getTime());
    // Also include draft date ranges to ensure overlays fit
    for (const draft of mockDraftStories) {
      timestamps.push(new Date(draft.dateRange.start).getTime());
      timestamps.push(new Date(draft.dateRange.end).getTime());
    }
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return { min, max, span: max - min };
  }, []);

  const timeToX = (timestamp: string): number => {
    const t = new Date(timestamp).getTime();
    if (timeRange.span === 0) return CONTENT_WIDTH / 2;
    // Newest on the left, oldest on the right (or left-to-right chronological)
    // Let's go left = oldest, right = newest
    return ((t - timeRange.min) / timeRange.span) * CONTENT_WIDTH;
  };

  /* ── Time axis markers ─────────────────────────────────────── */

  const timeMarkers = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    const nowMs = Date.now();
    const points = [
      { label: 'Now', offset: 0 },
      { label: '1d ago', offset: 1 * 86400000 },
      { label: '3d ago', offset: 3 * 86400000 },
      { label: '1w ago', offset: 7 * 86400000 },
      { label: '2w ago', offset: 14 * 86400000 },
      { label: '3w ago', offset: 21 * 86400000 },
    ];
    for (const p of points) {
      const ts = nowMs - p.offset;
      if (ts >= timeRange.min && ts <= timeRange.max) {
        const x = ((ts - timeRange.min) / timeRange.span) * CONTENT_WIDTH;
        labels.push({ label: p.label, x });
      }
    }
    return labels;
  }, [timeRange]);

  /* ── Activities grouped by source ──────────────────────────── */

  const activitiesBySource = useMemo(() => {
    const map: Record<ActivitySource, MockActivity[]> = {
      github: [], jira: [], slack: [], confluence: [], figma: [], 'google-meet': [],
    };
    for (const a of mockActivities) {
      map[a.source].push(a);
    }
    return map;
  }, []);

  /* ── Visible sources (not collapsed) ───────────────────────── */

  const visibleSources = ALL_SOURCES.filter(s => !collapsedSources[s]);

  /* ── Lane Y positions (accounting for collapsed rows) ────── */

  const laneYMap = useMemo(() => {
    const map: Record<string, number> = {};
    let y = 0;
    for (const source of ALL_SOURCES) {
      map[source] = y;
      y += collapsedSources[source] ? 28 : LANE_HEIGHT;
    }
    return map;
  }, [collapsedSources]);

  const totalGridHeight = useMemo(() => {
    let h = 0;
    for (const source of ALL_SOURCES) {
      h += collapsedSources[source] ? 28 : LANE_HEIGHT;
    }
    return h;
  }, [collapsedSources]);

  /* ── Draft overlay geometry ────────────────────────────────── */

  const draftOverlays = useMemo(() => {
    return mockDraftStories.map(draft => {
      const x1 = timeToX(draft.dateRange.start);
      const x2 = timeToX(draft.dateRange.end);
      const xStart = Math.min(x1, x2);
      const xEnd = Math.max(x1, x2);
      const width = Math.max(xEnd - xStart, 40); // minimum 40px

      // Determine vertical span based on tool lanes
      const toolIndices = draft.tools.map(t => ALL_SOURCES.indexOf(t)).filter(i => i >= 0);
      if (toolIndices.length === 0) return null;

      const firstSource = ALL_SOURCES[Math.min(...toolIndices)];
      const lastSource = ALL_SOURCES[Math.max(...toolIndices)];
      const yStart = laneYMap[firstSource];
      const yEnd = laneYMap[lastSource] + (collapsedSources[lastSource] ? 28 : LANE_HEIGHT);
      const height = yEnd - yStart;

      return {
        draft,
        x: xStart,
        width,
        y: yStart,
        height,
        activities: getActivitiesForDraft(draft),
      };
    }).filter(Boolean) as {
      draft: MockDraftStory;
      x: number;
      width: number;
      y: number;
      height: number;
      activities: MockActivity[];
    }[];
  }, [laneYMap, collapsedSources]);

  /* ── Activity IDs covered by hovered draft ─────────────────── */

  const hoveredActivityIds = useMemo(() => {
    if (!hoveredDraftId) return null;
    const ids = draftActivityMap[hoveredDraftId];
    return ids ? new Set(ids) : null;
  }, [hoveredDraftId]);

  /* ── Toggle source collapse ────────────────────────────────── */

  const toggleSource = (source: ActivitySource) => {
    setCollapsedSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  /* ── Expanded draft data ───────────────────────────────────── */

  const expandedDraft = expandedDraftId
    ? mockDraftStories.find(d => d.id === expandedDraftId) ?? null
    : null;
  const expandedActivities = expandedDraft ? getActivitiesForDraft(expandedDraft) : [];

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Swimlane Overlay</h1>
            <span className="text-[10px] font-mono bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">V8</span>
          </div>
          <p className="text-sm text-gray-500">
            {mockActivities.length} activities across {ALL_SOURCES.length} sources
            {' '}&middot;{' '}
            {mockDraftStories.length} draft stories overlaid
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2.5 rounded bg-purple-100/80 border border-purple-300/60" />
            <span>Draft Story Overlay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white border border-gray-200 shadow-sm" />
            <span>Activity</span>
          </div>
          <span className="text-gray-300">|</span>
          <span>Click overlay to expand &middot; Hover to highlight</span>
        </div>

        {/* Main swimlane container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {/* ── Left fixed label column ──────────────────────── */}
            <div className="shrink-0 border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
              {/* Time axis placeholder in label col */}
              <div
                className="border-b border-gray-200 bg-gray-50 flex items-center px-3"
                style={{ height: HEADER_HEIGHT }}
              >
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Source</span>
              </div>

              {/* Source rows */}
              {ALL_SOURCES.map((source) => {
                const meta = SOURCE_META[source];
                const isCollapsed = !!collapsedSources[source];
                const count = activitiesBySource[source].length;
                return (
                  <button
                    key={source}
                    onClick={() => toggleSource(source)}
                    className={cn(
                      'w-full flex items-center gap-1.5 px-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                      isCollapsed ? 'opacity-50' : '',
                    )}
                    style={{ height: isCollapsed ? 28 : LANE_HEIGHT }}
                    title={isCollapsed ? `Expand ${meta.name}` : `Collapse ${meta.name}`}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                    )}
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.color }}
                    >
                      <SourceIcon source={source} className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-700 truncate">{meta.name}</span>
                    <span className="text-[9px] text-gray-400 ml-auto shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Right scrollable content area ───────────────── */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: CONTENT_WIDTH, position: 'relative' }}>
                {/* Time axis header */}
                <div
                  className="border-b border-gray-200 bg-gray-50 relative"
                  style={{ height: HEADER_HEIGHT, width: CONTENT_WIDTH }}
                >
                  {timeMarkers.map((marker) => (
                    <div
                      key={marker.label}
                      className="absolute top-0 flex flex-col items-center justify-center"
                      style={{ left: marker.x, height: HEADER_HEIGHT, transform: 'translateX(-50%)' }}
                    >
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                        {marker.label}
                      </span>
                    </div>
                  ))}
                  {/* Tick lines */}
                  {timeMarkers.map((marker) => (
                    <div
                      key={`tick-${marker.label}`}
                      className="absolute bg-gray-200"
                      style={{
                        left: marker.x,
                        top: HEADER_HEIGHT - 4,
                        width: 1,
                        height: 4,
                      }}
                    />
                  ))}
                </div>

                {/* Swimlane grid (relative container for overlays) */}
                <div className="relative" style={{ height: totalGridHeight, width: CONTENT_WIDTH }}>
                  {/* Vertical grid lines behind everything */}
                  {timeMarkers.map((marker) => (
                    <div
                      key={`line-${marker.label}`}
                      className="absolute top-0 bg-gray-100"
                      style={{
                        left: marker.x,
                        width: 1,
                        height: totalGridHeight,
                        zIndex: 0,
                      }}
                    />
                  ))}

                  {/* Swimlane row backgrounds and activities */}
                  {ALL_SOURCES.map((source, idx) => {
                    const isCollapsed = !!collapsedSources[source];
                    const yPos = laneYMap[source];
                    const rowHeight = isCollapsed ? 28 : LANE_HEIGHT;
                    const activities = activitiesBySource[source];

                    return (
                      <div
                        key={source}
                        className={cn(
                          'absolute left-0 border-b border-gray-100',
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                        )}
                        style={{
                          top: yPos,
                          height: rowHeight,
                          width: CONTENT_WIDTH,
                          zIndex: 1,
                        }}
                      >
                        {!isCollapsed && activities.map((activity) => {
                          const x = timeToX(activity.timestamp);
                          const isDimmed = hoveredActivityIds !== null && !hoveredActivityIds.has(activity.id);
                          const belongsToDraft = activityDraftMap[activity.id]?.length > 0;

                          return (
                            <div
                              key={activity.id}
                              className={cn(
                                'absolute rounded-full px-2 py-1 text-[11px] bg-white border shadow-sm',
                                'whitespace-nowrap overflow-hidden max-w-[140px] truncate cursor-default',
                                'transition-all duration-200',
                                isDimmed ? 'opacity-20' : 'opacity-100',
                                belongsToDraft ? 'border-purple-200' : 'border-gray-200',
                              )}
                              style={{
                                left: x,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 2,
                              }}
                              title={`${activity.title}\n${timeAgo(activity.timestamp)}`}
                            >
                              <span className="text-gray-700">{activity.title}</span>
                            </div>
                          );
                        })}

                        {isCollapsed && (
                          <div className="flex items-center h-full px-4">
                            <span className="text-[10px] text-gray-400 italic">
                              {activities.length} activities collapsed
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ── Draft Overlay Bars ──────────────────────── */}
                  {draftOverlays.map((overlay) => {
                    const isHovered = hoveredDraftId === overlay.draft.id;
                    const isExpanded = expandedDraftId === overlay.draft.id;

                    return (
                      <div
                        key={overlay.draft.id}
                        className={cn(
                          'absolute rounded-lg cursor-pointer transition-all duration-200',
                          'border flex items-start px-3 py-1.5 group',
                          isHovered || isExpanded
                            ? 'bg-purple-200/70 border-purple-400 shadow-md backdrop-blur-[2px]'
                            : 'bg-purple-100/50 border-purple-300/60 backdrop-blur-[2px]',
                        )}
                        style={{
                          left: overlay.x,
                          top: overlay.y,
                          width: overlay.width,
                          height: overlay.height,
                          zIndex: isHovered || isExpanded ? 10 : 5,
                        }}
                        onMouseEnter={() => setHoveredDraftId(overlay.draft.id)}
                        onMouseLeave={() => setHoveredDraftId(null)}
                        onClick={() =>
                          setExpandedDraftId(prev =>
                            prev === overlay.draft.id ? null : overlay.draft.id
                          )
                        }
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Info
                            className={cn(
                              'w-3.5 h-3.5 shrink-0 transition-colors',
                              isHovered || isExpanded ? 'text-purple-600' : 'text-purple-400',
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-bold truncate transition-colors',
                              isHovered || isExpanded ? 'text-purple-800' : 'text-purple-700',
                            )}
                          >
                            {overlay.draft.title}
                          </span>
                        </div>

                        {/* Hover tooltip-like extras */}
                        {(isHovered || isExpanded) && overlay.width > 200 && (
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <span className="text-[10px] text-purple-600 font-medium">
                              {overlay.activities.length} activities
                            </span>
                            <span className={cn('text-[10px] font-semibold', ROLE_COLORS[overlay.draft.dominantRole])}>
                              &middot; {overlay.draft.dominantRole}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Expanded Draft Detail Panel ───────────────────── */}
          {expandedDraft && (
            <div className="border-t-2 border-purple-300 bg-gradient-to-b from-purple-50 to-white p-5">
              <div className="max-w-4xl">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-purple-500" />
                      <h3 className="text-base font-bold text-gray-900 truncate">
                        {expandedDraft.title}
                      </h3>
                      <span className={cn(
                        'text-[11px] font-semibold px-1.5 py-0.5 rounded',
                        expandedDraft.dominantRole === 'Led'
                          ? 'bg-amber-100 text-amber-700'
                          : expandedDraft.dominantRole === 'Contributed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600',
                      )}>
                        {expandedDraft.dominantRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {expandedDraft.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedDraftId(null)}
                    className="ml-4 text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
                  >
                    &times;
                  </button>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {/* Topics */}
                  <div className="flex items-center gap-1.5">
                    {expandedDraft.topics.map(topic => (
                      <span
                        key={topic}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <span className="text-gray-300">|</span>

                  {/* Source icons */}
                  <div className="flex items-center gap-1">
                    {expandedDraft.tools.map(tool => (
                      <div
                        key={tool}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: SOURCE_META[tool].color }}
                        title={SOURCE_META[tool].name}
                      >
                        <SourceIcon source={tool} className="w-3 h-3 text-white" />
                      </div>
                    ))}
                  </div>

                  <span className="text-gray-300">|</span>

                  {/* Date range */}
                  <span className="text-[11px] text-gray-500">
                    {timeAgo(expandedDraft.dateRange.start)} &mdash; {timeAgo(expandedDraft.dateRange.end)}
                  </span>
                </div>

                {/* Activity list */}
                <div className="mb-4">
                  <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Linked Activities ({expandedActivities.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {expandedActivities
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(activity => {
                        const meta = SOURCE_META[activity.source];
                        return (
                          <div
                            key={activity.id}
                            className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm"
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: meta.color }}
                            >
                              <SourceIcon source={activity.source} className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {activity.title}
                              </p>
                              <p className="text-[10px] text-gray-400">{timeAgo(activity.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* CTA */}
                <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                  Create Story
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
