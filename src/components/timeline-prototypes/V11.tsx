'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Star, ArrowUpRight, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Inline Utilities (redeclared per-file convention)
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

const RING_GROUP_ORDER: string[] = ['today', 'yesterday', 'this_week', 'last_week', 'older'];

const CX = 300;
const CY = 300;
const RING_RADII = [60, 115, 170, 225, 275];
const RING_LABELS = ['Today', 'Yesterday', 'This Week', 'Last Week', 'Older'];

const SOURCE_ANGLE_START: Record<ActivitySource, number> = {
  github: 0,
  jira: 60,
  slack: 120,
  confluence: 180,
  figma: 240,
  'google-meet': 300,
};

const DEG_TO_RAD = Math.PI / 180;

// Stable seeded pseudo-random for jitter so positions don't shift on re-render
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49271;
  return x - Math.floor(x);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * DEG_TO_RAD;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlottedActivity {
  activity: MockActivity;
  x: number;
  y: number;
  ringIndex: number;
  hasDraftLink: boolean;
  draftIds: string[];
}

interface DraftArcData {
  draft: MockDraftStory;
  path: string;
  activities: MockActivity[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV11() {
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<ActivitySource | null>(null);

  // Map temporal group key → ring index
  const groupRingMap = useMemo(() => {
    const map: Record<string, number> = {};
    RING_GROUP_ORDER.forEach((key, i) => { map[key] = i; });
    return map;
  }, []);

  // Pre-compute activity → temporal group mapping
  const activityGroupMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of mockTemporalGroups) {
      for (const act of group.activities) {
        map[act.id] = group.key;
      }
    }
    return map;
  }, []);

  // Pre-compute draft activity sets
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // Plotted activities with polar-to-Cartesian coordinates
  const plottedActivities = useMemo(() => {
    const results: PlottedActivity[] = [];
    let seedCounter = 0;

    for (const group of mockTemporalGroups) {
      const ringIndex = groupRingMap[group.key] ?? 0;
      const ringR = RING_RADII[ringIndex];
      const prevR = ringIndex > 0 ? RING_RADII[ringIndex - 1] : 20;
      const bandMid = (ringR + prevR) / 2;

      for (const activity of group.activities) {
        seedCounter++;
        const sectorStart = SOURCE_ANGLE_START[activity.source];
        const jitterAngle = seededRandom(seedCounter) * 44 + 8;
        const angle = sectorStart + jitterAngle;

        const radiusJitter = (seededRandom(seedCounter + 1000) - 0.5) * (ringR - prevR) * 0.6;
        const r = bandMid + radiusJitter;

        const pos = polarToCartesian(CX, CY, r, angle);
        const drafts = activityDraftMap[activity.id] ?? [];

        results.push({
          activity,
          x: pos.x,
          y: pos.y,
          ringIndex,
          hasDraftLink: drafts.length > 0,
          draftIds: drafts,
        });
      }
    }

    return results;
  }, [groupRingMap]);

  // Filtered plotted activities based on selected source
  const visibleActivities = useMemo(() => {
    if (!selectedSource) return plottedActivities;
    return plottedActivities.filter((p) => p.activity.source === selectedSource);
  }, [plottedActivities, selectedSource]);

  // Draft arc data
  const draftArcs = useMemo(() => {
    return mockDraftStories.map((draft): DraftArcData => {
      const acts = getActivitiesForDraft(draft);
      const actGroupKeys = new Set(acts.map((a) => activityGroupMap[a.id]).filter(Boolean));
      const actSources = new Set(acts.map((a) => a.source));

      // Ring range for the arc
      const ringIndices = Array.from(actGroupKeys).map((k) => groupRingMap[k] ?? 0);
      const minRing = Math.min(...ringIndices);
      const maxRing = Math.max(...ringIndices);

      const innerR = minRing > 0 ? RING_RADII[minRing - 1] + 4 : 24;
      const outerR = RING_RADII[maxRing] + 4;

      // Angle range spanning all relevant sources
      const sourceAngles = Array.from(actSources).map((s) => SOURCE_ANGLE_START[s]);
      const minAngle = Math.min(...sourceAngles);
      const maxAngle = Math.max(...sourceAngles) + 56;

      const path = describeArc(CX, CY, innerR, outerR, minAngle, maxAngle);

      return { draft, path, activities: acts };
    });
  }, [activityGroupMap, groupRingMap]);

  // Selected draft detail data
  const selectedDraft = useMemo(() => {
    if (!selectedDraftId) return null;
    return mockDraftStories.find((d) => d.id === selectedDraftId) ?? null;
  }, [selectedDraftId]);

  const selectedDraftActivities = useMemo(() => {
    if (!selectedDraft) return [];
    return getActivitiesForDraft(selectedDraft);
  }, [selectedDraft]);

  // Hover: which activity IDs belong to hovered draft
  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  // Hover: which draft IDs the hovered activity belongs to
  const hoveredActivityDraftIds = useMemo(() => {
    if (!hoveredActivityId) return new Set<string>();
    return new Set(activityDraftMap[hoveredActivityId] ?? []);
  }, [hoveredActivityId]);

  const isAnyDraftHovered = hoveredDraftId !== null;
  const isAnyActivityHovered = hoveredActivityId !== null;

  // Source counts for legend
  const sourceCounts = useMemo(() => {
    const counts: Record<ActivitySource, number> = {
      github: 0, jira: 0, slack: 0, confluence: 0, figma: 0, 'google-meet': 0,
    };
    for (const a of mockActivities) {
      counts[a.source]++;
    }
    return counts;
  }, []);

  const handleSourceClick = useCallback((source: ActivitySource) => {
    setSelectedSource((prev) => (prev === source ? null : source));
  }, []);

  const handleDraftArcClick = useCallback((draftId: string) => {
    setSelectedDraftId((prev) => (prev === draftId ? null : draftId));
  }, []);

  const totalActivities = mockActivities.length;

  // Find hovered activity for tooltip
  const hoveredPlotted = useMemo(() => {
    if (!hoveredActivityId) return null;
    return visibleActivities.find((p) => p.activity.id === hoveredActivityId) ?? null;
  }, [hoveredActivityId, visibleActivities]);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100">Radar Pulse</h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalActivities} activities across {mockTemporalGroups.length} time periods
            <span className="mx-1.5">&middot;</span>
            {mockDraftStories.length} draft stories detected
            {selectedSource && (
              <span className="ml-2 text-emerald-400">
                &middot; Filtering: {SOURCE_META[selectedSource].name}
              </span>
            )}
          </p>
        </div>

        {/* Radar Container */}
        <div className="flex justify-center">
          <div className="relative h-[600px] w-[600px]">
            <svg
              viewBox="0 0 600 600"
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.08))' }}
            >
              {/* Background */}
              <circle cx={CX} cy={CY} r={290} fill="#0a0f1a" />

              {/* Concentric rings */}
              {RING_RADII.map((r, i) => (
                <circle
                  key={`ring-${i}`}
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
              ))}

              {/* Ring labels */}
              {RING_RADII.map((r, i) => {
                const prevR = i > 0 ? RING_RADII[i - 1] : 20;
                const labelR = (r + prevR) / 2;
                return (
                  <text
                    key={`label-${i}`}
                    x={CX}
                    y={CY - labelR + 4}
                    textAnchor="middle"
                    className="fill-gray-600 text-[9px] font-medium select-none pointer-events-none"
                  >
                    {RING_LABELS[i]}
                  </text>
                );
              })}

              {/* Sector divider lines */}
              {ALL_SOURCES.map((source) => {
                const angle = SOURCE_ANGLE_START[source];
                const outer = polarToCartesian(CX, CY, 285, angle);
                return (
                  <line
                    key={`sector-${source}`}
                    x1={CX}
                    y1={CY}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="#1e293b"
                    strokeWidth={0.5}
                    opacity={0.5}
                  />
                );
              })}

              {/* Sector source labels */}
              {ALL_SOURCES.map((source) => {
                const angle = SOURCE_ANGLE_START[source] + 30;
                const labelPos = polarToCartesian(CX, CY, 292, angle);
                return (
                  <text
                    key={`slabel-${source}`}
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-gray-500 text-[8px] font-medium select-none pointer-events-none"
                  >
                    {SOURCE_META[source].name}
                  </text>
                );
              })}

              {/* Center dot */}
              <circle cx={CX} cy={CY} r={4} fill="#10b981" opacity={0.6} />
              <circle cx={CX} cy={CY} r={8} fill="none" stroke="#10b981" strokeWidth={0.5} opacity={0.3} />

              {/* Sweep line animation */}
              <line
                x1={CX}
                y1={CY}
                x2={CX}
                y2={CY - 280}
                stroke="#10b981"
                strokeWidth={1}
                opacity={0.15}
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${CX} ${CY}`}
                  to={`360 ${CX} ${CY}`}
                  dur="8s"
                  repeatCount="indefinite"
                />
              </line>

              {/* Draft arcs */}
              {draftArcs.map((arcData) => {
                const isHovered = hoveredDraftId === arcData.draft.id;
                const isSelected = selectedDraftId === arcData.draft.id;
                const isRelatedToHoveredActivity = isAnyActivityHovered && hoveredActivityDraftIds.has(arcData.draft.id);
                const isDimmed = isAnyDraftHovered && hoveredDraftId !== arcData.draft.id
                  && !isRelatedToHoveredActivity;

                return (
                  <path
                    key={`arc-${arcData.draft.id}`}
                    d={arcData.path}
                    fill={isHovered || isSelected || isRelatedToHoveredActivity
                      ? 'rgba(168, 85, 247, 0.2)'
                      : 'rgba(168, 85, 247, 0.08)'}
                    stroke={isHovered || isSelected || isRelatedToHoveredActivity
                      ? 'rgba(168, 85, 247, 0.6)'
                      : 'rgba(168, 85, 247, 0.2)'}
                    strokeWidth={isSelected ? 2 : 1}
                    className={cn(
                      'cursor-pointer transition-all duration-200',
                      isDimmed && 'opacity-20',
                    )}
                    onMouseEnter={() => setHoveredDraftId(arcData.draft.id)}
                    onMouseLeave={() => setHoveredDraftId(null)}
                    onClick={() => handleDraftArcClick(arcData.draft.id)}
                  />
                );
              })}

              {/* Activity dots */}
              {visibleActivities.map((plotted) => {
                const { activity, x, y, hasDraftLink, draftIds } = plotted;
                const color = SOURCE_META[activity.source].color;

                const isHovered = hoveredActivityId === activity.id;
                const isHighlightedByDraft = isAnyDraftHovered && hoveredDraftActivityIds.has(activity.id);
                const isDimmedByDraft = isAnyDraftHovered && !hoveredDraftActivityIds.has(activity.id);
                const isHighlightedBySelectedDraft = selectedDraftId
                  ? (draftActivitySets[selectedDraftId]?.has(activity.id) ?? false)
                  : false;

                const dotRadius = isHovered ? 7 : isHighlightedByDraft || isHighlightedBySelectedDraft ? 6 : 4.5;
                const opacity = isDimmedByDraft ? 0.15 : 1;

                return (
                  <g
                    key={activity.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredActivityId(activity.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                  >
                    {/* Purple ring for draft-linked dots */}
                    {hasDraftLink && (
                      <circle
                        cx={x}
                        cy={y}
                        r={dotRadius + 3}
                        fill="none"
                        stroke="rgba(168, 85, 247, 0.6)"
                        strokeWidth={1.5}
                        opacity={opacity}
                      />
                    )}

                    {/* Glow on hover */}
                    {(isHovered || isHighlightedByDraft) && (
                      <circle
                        cx={x}
                        cy={y}
                        r={dotRadius + 6}
                        fill={color}
                        opacity={0.15}
                      />
                    )}

                    {/* Main dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r={dotRadius}
                      fill={color}
                      opacity={opacity}
                      stroke={isHovered ? '#ffffff' : 'none'}
                      strokeWidth={isHovered ? 1.5 : 0}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredPlotted && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  left: hoveredPlotted.x,
                  top: hoveredPlotted.y,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-3 py-2 max-w-[220px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SOURCE_META[hoveredPlotted.activity.source].color }}
                    />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {SOURCE_META[hoveredPlotted.activity.source].name}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-100 leading-snug line-clamp-2">
                    {hoveredPlotted.activity.title}
                  </p>
                  {hoveredPlotted.activity.description && (
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      {hoveredPlotted.activity.description}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">
                    {timeAgo(hoveredPlotted.activity.timestamp)}
                  </p>
                  {hoveredPlotted.hasDraftLink && (
                    <div className="mt-1 pt-1 border-t border-gray-700">
                      <p className="text-[10px] text-purple-400">
                        Linked to {hoveredPlotted.draftIds.length} draft{hoveredPlotted.draftIds.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source Legend */}
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          {ALL_SOURCES.map((source) => {
            const isActive = selectedSource === source;
            const meta = SOURCE_META[source];
            return (
              <button
                key={source}
                onClick={() => handleSourceClick(source)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 text-xs font-medium',
                  isActive
                    ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-300',
                )}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <SourceIcon source={source} className="w-3.5 h-3.5" />
                <span>{meta.name}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    isActive ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500',
                  )}
                >
                  {sourceCounts[source]}
                </Badge>
              </button>
            );
          })}
          {selectedSource && (
            <button
              onClick={() => setSelectedSource(null)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-red-800/50 bg-red-950/30 text-red-400 text-xs font-medium hover:bg-red-950/60 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Draft stories summary row */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {mockDraftStories.map((draft) => {
            const isSelected = selectedDraftId === draft.id;
            const isHovered = hoveredDraftId === draft.id;

            return (
              <button
                key={draft.id}
                onClick={() => handleDraftArcClick(draft.id)}
                onMouseEnter={() => setHoveredDraftId(draft.id)}
                onMouseLeave={() => setHoveredDraftId(null)}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all duration-200',
                  isSelected
                    ? 'border-purple-500/60 bg-purple-950/40 shadow-lg shadow-purple-900/20'
                    : isHovered
                      ? 'border-purple-600/40 bg-gray-900'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700',
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Star className={cn(
                    'w-3.5 h-3.5',
                    isSelected ? 'text-purple-400 fill-purple-400' : 'text-purple-600 fill-purple-600',
                  )} />
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] px-1.5 py-0',
                      isSelected ? 'border-purple-400/40 text-purple-300' : 'border-purple-700/40 text-purple-500',
                    )}
                  >
                    {draft.dominantRole}
                  </Badge>
                </div>
                <h3 className={cn(
                  'text-xs font-semibold leading-snug line-clamp-2 mb-1',
                  isSelected ? 'text-purple-200' : 'text-gray-300',
                )}>
                  {draft.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center -space-x-1">
                    {draft.tools.map((tool) => (
                      <div
                        key={tool}
                        className="w-4 h-4 rounded-full flex items-center justify-center border border-gray-800"
                        style={{ backgroundColor: SOURCE_META[tool].color }}
                      >
                        <SourceIcon source={tool} className="w-2 h-2 text-white" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {draft.activityCount} activities
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel (expands below radar when a draft is selected) */}
        {selectedDraft && (
          <div className="mt-6 border border-purple-800/40 bg-gray-900/80 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-purple-400 fill-purple-400 shrink-0" />
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    Draft Story
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-purple-500/40 text-purple-300"
                  >
                    {selectedDraft.dominantRole}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-gray-100 leading-snug mb-1">
                  {selectedDraft.title}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-3">
                  {selectedDraft.description}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center -space-x-1.5">
                    {selectedDraft.tools.map((tool) => (
                      <div
                        key={tool}
                        className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-sm"
                        style={{ backgroundColor: SOURCE_META[tool].color }}
                      >
                        <SourceIcon source={tool} className="w-3 h-3 text-white" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {selectedDraft.activityCount} activities
                  </span>
                  <span className="text-xs text-gray-600">&middot;</span>
                  <span className="text-xs text-gray-500">
                    {formatDateRange(selectedDraft.dateRange.start, selectedDraft.dateRange.end)}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedDraft.topics.map((topic) => (
                      <span
                        key={topic}
                        className="bg-purple-950/60 text-purple-300 text-[10px] px-2 py-0.5 rounded-md font-medium border border-purple-800/30"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  className="bg-purple-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-purple-500 transition-colors inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Create Story
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedDraftId(null)}
                  className="w-7 h-7 rounded-lg border border-gray-700 bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 hover:text-gray-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contributing activities list */}
            <div className="border-t border-gray-800 pt-4">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-3">
                Contributing Activities
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDraftActivities.map((act) => {
                  const meta = SOURCE_META[act.source];
                  return (
                    <Card
                      key={act.id}
                      className="bg-gray-800/60 border-gray-700/50 shadow-none"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: `${meta.color}30` }}
                          >
                            <SourceIcon source={act.source} className="w-3 h-3 text-gray-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 leading-snug line-clamp-1">
                              {act.title}
                            </p>
                            {act.description && (
                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                                {act.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-500">
                                {meta.name}
                              </span>
                              <span className="text-[10px] text-gray-600">&middot;</span>
                              <span className="text-[10px] text-gray-500">
                                {timeAgo(act.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
