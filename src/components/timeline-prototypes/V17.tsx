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
  ChevronDown, ChevronRight, ArrowUpRight, Sparkles,
  GanttChart, Eye, EyeOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants & Utilities
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<MockDraftStory['dominantRole'], { bg: string; text: string; bar: string }> = {
  Led: { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'from-purple-500 to-purple-600' },
  Contributed: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'from-blue-500 to-blue-600' },
  Participated: { bg: 'bg-green-100', text: 'text-green-700', bar: 'from-green-500 to-green-600' },
};

const LABEL_WIDTH = 200;

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
  return `${s.toLocaleDateString('en-US', opts)} \u2013 ${e.toLocaleDateString('en-US', opts)}`;
};

const formatShortDate = (ts: string): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
// Time scale computation
// ---------------------------------------------------------------------------

interface TimeScale {
  earliest: number;
  latest: number;
  totalRange: number;
  toPercent: (ts: number) => number;
  gridLines: { percent: number; label: string }[];
}

function computeTimeScale(drafts: MockDraftStory[], activities: MockActivity[]): TimeScale {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const draft of drafts) {
    const s = new Date(draft.dateRange.start).getTime();
    const e = new Date(draft.dateRange.end).getTime();
    if (s < earliest) earliest = s;
    if (e > latest) latest = e;
  }
  for (const act of activities) {
    const t = new Date(act.timestamp).getTime();
    if (t < earliest) earliest = t;
    if (t > latest) latest = t;
  }
  const rawRange = latest - earliest;
  const padding = rawRange * 0.02;
  earliest -= padding;
  latest += padding;
  const totalRange = latest - earliest;

  const toPercent = (ts: number) => (totalRange === 0 ? 50 : ((ts - earliest) / totalRange) * 100);

  const gridLineCount = 6;
  const gridLines: { percent: number; label: string }[] = [];
  for (let i = 0; i <= gridLineCount; i++) {
    const t = earliest + (totalRange * i) / gridLineCount;
    const d = new Date(t);
    gridLines.push({
      percent: (i / gridLineCount) * 100,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  return { earliest, latest, totalRange, toPercent, gridLines };
}

// ---------------------------------------------------------------------------
// Diamond milestone marker
// ---------------------------------------------------------------------------

function DiamondMarker({ activity, leftPercent, isHovered, onMouseEnter, onMouseLeave }: {
  activity: MockActivity; leftPercent: number; isHovered: boolean;
  onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const meta = SOURCE_META[activity.source];
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
      style={{ left: `${leftPercent}%` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          'w-3 h-3 rotate-45 border-2 border-white shadow-sm transition-all duration-150 cursor-pointer',
          isHovered && 'scale-150 shadow-md ring-2 ring-white/50',
        )}
        style={{ backgroundColor: meta.color }}
      />
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-xl whitespace-nowrap max-w-xs">
            <div className="flex items-center gap-1.5 mb-1">
              <SourceIcon source={activity.source} className="w-3 h-3 text-white/80" />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.name}
              </span>
              <span className="text-[10px] text-gray-400 ml-1">{timeAgo(activity.timestamp)}</span>
            </div>
            <p className="text-xs font-medium leading-snug truncate max-w-[240px]">{activity.title}</p>
            {activity.description && (
              <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[240px]">{activity.description}</p>
            )}
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded detail row
// ---------------------------------------------------------------------------

function DraftDetailRow({ draft, activities }: { draft: MockDraftStory; activities: MockActivity[] }) {
  return (
    <div className="col-span-full bg-purple-50/60 border border-purple-100 rounded-lg mx-2 mb-2 overflow-hidden animate-[fadeSlideDown_0.2s_ease-out]">
      <div className="px-5 py-4">
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{draft.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {draft.topics.map((topic) => (
            <span key={topic} className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              {topic}
            </span>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-purple-100 overflow-hidden">
          <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
              Contributing Activities ({activities.length})
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.map((act) => {
              const meta = SOURCE_META[act.source];
              return (
                <div key={act.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}15` }}
                  >
                    <SourceIcon source={act.source} className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{act.title}</p>
                    {act.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{act.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">{timeAgo(act.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <button className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
            'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-sm',
          )}>
            <Sparkles className="w-3.5 h-3.5" />
            Create Story
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TimelineV17() {
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [showUncategorized, setShowUncategorized] = useState(true);

  const draftActivitiesMap = useMemo(() => {
    const map: Record<string, MockActivity[]> = {};
    for (const draft of mockDraftStories) map[draft.id] = getActivitiesForDraft(draft);
    return map;
  }, []);

  const standaloneActivities = useMemo(() => {
    return mockActivities.filter((a) => {
      const draftIds = activityDraftMap[a.id];
      return !draftIds || draftIds.length === 0;
    });
  }, []);

  const timeScale = useMemo(() => computeTimeScale(mockDraftStories, mockActivities), []);

  const toggleExpand = (draftId: string) => {
    setExpandedDraftId((prev) => (prev === draftId ? null : draftId));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <GanttChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gantt Bars</h1>
              <p className="text-sm text-gray-500">
                {mockDraftStories.length} draft stories &middot; {mockActivities.length} activities &middot; {standaloneActivities.length} standalone
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-[52px]">
            Project Gantt chart with horizontal time bars for drafts and diamond milestones for activities
          </p>
        </div>

        {/* Legend */}
        <div className="mb-6 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-8 h-3 rounded bg-gradient-to-r from-purple-500 to-purple-600" />
            <span>Draft story bar</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rotate-45 bg-gray-700 border border-white shadow-sm" />
            <span>Activity milestone</span>
          </div>
          <div className="flex items-center gap-4">
            {(Object.entries(SOURCE_META) as [ActivitySource, typeof SOURCE_META[ActivitySource]][]).map(
              ([source, meta]) => (
                <div key={source} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span>{meta.name}</span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Gantt Chart */}
        <Card className="overflow-hidden shadow-sm border-gray-200">
          <CardContent className="p-0">
            {/* Column header row */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="shrink-0 px-4 py-3 border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Draft Stories</span>
              </div>
              <div className="flex-1 relative py-3 px-4">
                {timeScale.gridLines.map((line, i) => (
                  <div key={i} className="absolute top-0 bottom-0 flex flex-col justify-center" style={{ left: `${line.percent}%` }}>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap -translate-x-1/2">{line.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt rows */}
            <div className="relative">
              {mockDraftStories.map((draft) => {
                const activities = draftActivitiesMap[draft.id] || [];
                const draftStart = new Date(draft.dateRange.start).getTime();
                const draftEnd = new Date(draft.dateRange.end).getTime();
                const barLeft = timeScale.toPercent(draftStart);
                const barWidth = timeScale.toPercent(draftEnd) - barLeft;
                const isExpanded = expandedDraftId === draft.id;
                const isHovered = hoveredDraftId === draft.id;
                const roleStyle = ROLE_COLORS[draft.dominantRole];

                return (
                  <React.Fragment key={draft.id}>
                    <div
                      className={cn(
                        'flex border-b border-gray-100 transition-colors duration-150',
                        isHovered && !isExpanded && 'bg-purple-50/40',
                        isExpanded && 'bg-purple-50/20',
                      )}
                      onMouseEnter={() => setHoveredDraftId(draft.id)}
                      onMouseLeave={() => setHoveredDraftId(null)}
                    >
                      {/* Label column */}
                      <div
                        className={cn(
                          'shrink-0 border-r border-gray-100 px-3 py-3 cursor-pointer',
                          'flex flex-col justify-center gap-1.5 transition-colors hover:bg-purple-50/60',
                        )}
                        style={{ width: LABEL_WIDTH }}
                        onClick={() => toggleExpand(draft.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <h3 className="text-sm font-semibold text-gray-800 leading-tight truncate">{draft.title}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5">
                          <Badge className={cn('text-[9px] px-1.5 py-0 h-4 border-none font-bold', roleStyle.bg, roleStyle.text)}>
                            {draft.dominantRole}
                          </Badge>
                          <div className="flex items-center gap-0.5">
                            {draft.tools.map((tool) => (
                              <div key={tool} className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${SOURCE_META[tool].color}15` }}>
                                <SourceIcon source={tool} className="w-2.5 h-2.5" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bar area */}
                      <div className="flex-1 relative py-3 px-2">
                        {timeScale.gridLines.map((line, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-dashed border-gray-100" style={{ left: `${line.percent}%` }} />
                        ))}
                        <div
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer',
                            'bg-gradient-to-r shadow-sm transition-all duration-200',
                            roleStyle.bar,
                            isHovered && 'shadow-md scale-y-110',
                            isExpanded && 'shadow-lg ring-2 ring-purple-300 ring-offset-1',
                          )}
                          style={{ left: `${barLeft}%`, width: `${Math.max(barWidth, 1)}%` }}
                          onClick={() => toggleExpand(draft.id)}
                        >
                          {isHovered && activities.length > 0 && (
                            <div className="absolute -top-2 -right-2 z-20">
                              <Badge className="bg-white text-purple-700 border border-purple-200 shadow-sm text-[10px] px-1.5 py-0 h-4 font-bold">
                                {activities.length}
                              </Badge>
                            </div>
                          )}
                          {activities.map((act) => {
                            const actTime = new Date(act.timestamp).getTime();
                            const barRange = draftEnd - draftStart;
                            const actLeftInBar = barRange > 0 ? ((actTime - draftStart) / barRange) * 100 : 50;
                            return (
                              <DiamondMarker
                                key={act.id}
                                activity={act}
                                leftPercent={Math.max(5, Math.min(95, actLeftInBar))}
                                isHovered={hoveredActivityId === act.id}
                                onMouseEnter={() => setHoveredActivityId(act.id)}
                                onMouseLeave={() => setHoveredActivityId(null)}
                              />
                            );
                          })}
                          {barWidth > 15 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">
                                {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && <DraftDetailRow draft={draft} activities={activities} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Time axis footer */}
            <div className="flex border-t border-gray-200 bg-gray-50">
              <div className="shrink-0 border-r border-gray-200" style={{ width: LABEL_WIDTH }} />
              <div className="flex-1 relative py-2 px-4">
                {timeScale.gridLines.map((line, i) => (
                  <div key={i} className="absolute top-0 bottom-0 flex flex-col justify-center" style={{ left: `${line.percent}%` }}>
                    <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap -translate-x-1/2">{line.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Standalone Activities */}
        {standaloneActivities.length > 0 && (
          <div className="mt-8">
            <button onClick={() => setShowUncategorized((prev) => !prev)} className="flex items-center gap-2 mb-4 group cursor-pointer">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                showUncategorized ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
              )}>
                {showUncategorized ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800 leading-tight">Standalone Activities</h2>
                <p className="text-xs text-gray-400">{standaloneActivities.length} activities not linked to any draft</p>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform ml-1', !showUncategorized && '-rotate-90')} />
            </button>

            {showUncategorized && (
              <Card className="overflow-hidden shadow-sm border-gray-200">
                <CardContent className="p-0">
                  <div className="grid grid-cols-[36px_1fr_100px_100px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Src</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Activity</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Date</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Time</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {standaloneActivities
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((act) => {
                        const meta = SOURCE_META[act.source];
                        return (
                          <div key={act.id} className="grid grid-cols-[36px_1fr_100px_100px] gap-3 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${meta.color}15` }}>
                              <SourceIcon source={act.source} className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{act.title}</p>
                              {act.description && <p className="text-xs text-gray-400 truncate mt-0.5">{act.description}</p>}
                            </div>
                            <span className="text-xs text-gray-500 text-right whitespace-nowrap">{formatShortDate(act.timestamp)}</span>
                            <span className="text-xs text-gray-400 text-right whitespace-nowrap">{timeAgo(act.timestamp)}</span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <span className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
            <GanttChart className="w-4 h-4" />
            {mockActivities.length} activities &middot; {mockDraftStories.length} stories &middot;{' '}
            {formatDateRange(new Date(timeScale.earliest).toISOString(), new Date(timeScale.latest).toISOString())}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      </div>
    </div>
  );
}
