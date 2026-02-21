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
  Star, ArrowUpRight, ChevronDown, ChevronUp, Activity,
  BarChart3, Clock, Layers, TrendingUp,
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
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDateRange = (start: string, end: string): string => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${new Date(start).toLocaleDateString('en-US', opts)} – ${new Date(end).toLocaleDateString('en-US', opts)}`;
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
// Computed data helpers
// ---------------------------------------------------------------------------

const ALL_SOURCES: ActivitySource[] = ['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'];

function computeSourceCounts(activities: MockActivity[]) {
  const counts: Record<string, number> = {};
  for (const a of activities) counts[a.source] = (counts[a.source] || 0) + 1;
  return ALL_SOURCES
    .map((s) => ({ source: s, count: counts[s] || 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Horizontal bar for source distribution panel */
function SourceBar({ source, count, maxCount, isSelected, isDimmed, onClick, onMouseEnter, onMouseLeave }: {
  source: ActivitySource; count: number; maxCount: number; isSelected: boolean;
  isDimmed: boolean; onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const meta = SOURCE_META[source];
  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <button
      onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      className={cn(
        'w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all duration-200 text-left',
        isSelected && 'bg-gray-100 ring-2 ring-offset-1',
        isDimmed && 'opacity-40',
        !isSelected && !isDimmed && 'hover:bg-gray-50',
      )}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${meta.color}18` }}>
        <SourceIcon source={source} className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">{meta.name}</span>
          <span className="text-xs font-bold text-gray-900">{count}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${widthPct}%`, backgroundColor: meta.color }} />
        </div>
      </div>
    </button>
  );
}

/** Horizontal bar for temporal distribution panel */
function TemporalBar({ label, count, maxCount, index, total, isHighlighted, onMouseEnter, onMouseLeave }: {
  label: string; count: number; maxCount: number; index: number; total: number;
  isHighlighted: boolean; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const opacity = 1 - (index / Math.max(total - 1, 1)) * 0.6;
  return (
    <div
      className={cn('flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 cursor-default',
        isHighlighted && 'bg-blue-50 ring-1 ring-blue-200')}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    >
      <span className="text-xs font-medium text-gray-600 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden relative">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${widthPct}%`, backgroundColor: `rgba(59, 130, 246, ${opacity})` }} />
        {isHighlighted && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            <span className="text-[10px] font-bold text-blue-700">{count}</span>
          </div>
        )}
      </div>
      {!isHighlighted && (
        <span className="text-xs font-semibold text-gray-500 w-6 text-right shrink-0">{count}</span>
      )}
    </div>
  );
}

/** Activity row in the feed panel */
function FeedRow({ activity, isHighlighted, isDimmed, isExpanded, onClick }: {
  activity: MockActivity; isHighlighted: boolean; isDimmed: boolean; isExpanded: boolean; onClick: () => void;
}) {
  const meta = SOURCE_META[activity.source];
  const linkedDrafts = activityDraftMap[activity.id] ?? [];
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 border',
        isHighlighted && 'bg-purple-50 border-purple-200 ring-1 ring-purple-200 shadow-sm',
        isDimmed && 'opacity-35',
        !isHighlighted && !isDimmed && 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm',
        isExpanded && !isHighlighted && 'bg-blue-50/50 border-blue-200',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${meta.color}18` }}>
          <SourceIcon source={activity.source} className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-gray-900 leading-snug line-clamp-1">{activity.title}</p>
            <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 pt-0.5">{timeAgo(activity.timestamp)}</span>
          </div>
          {isExpanded && activity.description && (
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{activity.description}</p>
          )}
          {isExpanded && linkedDrafts.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-purple-500 font-medium">
                Linked to {linkedDrafts.length} draft{linkedDrafts.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/** Draft story card in the drafts panel */
function DraftPanel({ draft, isExpanded, isHovered, isDimmed, onToggle, onHoverStart, onHoverEnd }: {
  draft: MockDraftStory; isExpanded: boolean; isHovered: boolean; isDimmed: boolean;
  onToggle: () => void; onHoverStart: () => void; onHoverEnd: () => void;
}) {
  const contributing = useMemo(() => getActivitiesForDraft(draft), [draft]);
  return (
    <div
      className={cn('rounded-xl border overflow-hidden transition-all duration-200',
        isHovered && 'shadow-lg border-purple-300',
        isDimmed && 'opacity-40',
        !isHovered && !isDimmed && 'border-gray-200 hover:shadow-md')}
      onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
    >
      {/* Purple gradient header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <Badge className="bg-white/20 text-white border-0 text-[10px] backdrop-blur-sm">{draft.dominantRole}</Badge>
          <span className="text-[10px] text-purple-200">{draft.activityCount} activities</span>
        </div>
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{draft.title}</h3>
      </div>
      {/* Body */}
      <div className="p-4 bg-white">
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-3">{draft.description}</p>
        {/* Tools + date */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center -space-x-1">
            {draft.tools.map((tool) => (
              <div key={tool} className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                style={{ backgroundColor: SOURCE_META[tool].color }}>
                <SourceIcon source={tool} className="w-2.5 h-2.5 text-white" />
              </div>
            ))}
          </div>
          <span className="text-[10px] text-gray-400">{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</span>
        </div>
        {/* Topics */}
        <div className="flex flex-wrap gap-1 mb-3">
          {draft.topics.map((topic) => (
            <span key={topic} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded-md font-medium">{topic}</span>
          ))}
        </div>
        {/* Expand toggle + CTA */}
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="text-[11px] text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 transition-colors">
            {isExpanded ? <>Hide details <ChevronUp className="w-3 h-3" /></> : <>Show details <ChevronDown className="w-3 h-3" /></>}
          </button>
          <button className="bg-purple-600 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}>
            Create Story <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        {/* Expanded: contributing activities */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-2">Contributing Activities</p>
            {contributing.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${SOURCE_META[a.source].color}18` }}>
                  <SourceIcon source={a.source} className="w-2.5 h-2.5" />
                </div>
                <span className="text-[11px] text-gray-700 truncate flex-1">{a.title}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(a.timestamp)}</span>
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

export function TimelineV20() {
  const [selectedSource, setSelectedSource] = useState<ActivitySource | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [hoveredSource, setHoveredSource] = useState<ActivitySource | null>(null);
  const [hoveredTemporalGroup, setHoveredTemporalGroup] = useState<string | null>(null);

  // Source distribution
  const sourceCounts = useMemo(() => computeSourceCounts(mockActivities), []);
  const maxSourceCount = useMemo(() => Math.max(...sourceCounts.map((s) => s.count), 1), [sourceCounts]);

  // Temporal distribution (filtered when source selected)
  const temporalCounts = useMemo(() => {
    return mockTemporalGroups.map((g) => ({
      group: g,
      count: selectedSource ? g.activities.filter((a) => a.source === selectedSource).length : g.activities.length,
    }));
  }, [selectedSource]);
  const maxTemporalCount = useMemo(() => Math.max(...temporalCounts.map((t) => t.count), 1), [temporalCounts]);

  // Feed activities (filtered + sorted)
  const feedActivities = useMemo(() => {
    const sorted = [...mockActivities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return selectedSource ? sorted.filter((a) => a.source === selectedSource) : sorted;
  }, [selectedSource]);

  // Draft-to-activity linking
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) sets[draftId] = new Set(actIds);
    return sets;
  }, []);

  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  const hoveredTemporalActivityIds = useMemo(() => {
    if (!hoveredTemporalGroup) return new Set<string>();
    const group = mockTemporalGroups.find((g) => g.key === hoveredTemporalGroup);
    return group ? new Set(group.activities.map((a) => a.id)) : new Set<string>();
  }, [hoveredTemporalGroup]);

  // Stats
  const uniqueSources = useMemo(() => new Set(mockActivities.map((a) => a.source)).size, []);
  const overallDateRange = useMemo(() => {
    const sorted = [...mockActivities].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return sorted.length ? formatDateRange(sorted[0].timestamp, sorted[sorted.length - 1].timestamp) : 'N/A';
  }, []);

  const isAnyDraftHovered = hoveredDraftId !== null;
  const isAnyTemporalHovered = hoveredTemporalGroup !== null;

  const handleSourceClick = (source: ActivitySource) => {
    setSelectedSource((prev) => (prev === source ? null : source));
    setExpandedActivityId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50/80 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Panels</h1>
            <p className="text-sm text-gray-500">
              Analytics dashboard with coordinated widget panels
              {selectedSource && (
                <Badge variant="outline" className="text-[10px] ml-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedSource(null)}>
                  Filtering: {SOURCE_META[selectedSource].name} &times;
                </Badge>
              )}
            </p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Source Distribution (col-span-4) */}
          <Card className="col-span-4">
            <div className="p-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Source Distribution</h2>
              </div>
              <Badge variant="secondary" className="text-[10px]">{sourceCounts.length} sources</Badge>
            </div>
            <CardContent className="p-3 pt-3">
              <div className="space-y-1">
                {sourceCounts.map((entry) => (
                  <SourceBar key={entry.source} source={entry.source} count={entry.count} maxCount={maxSourceCount}
                    isSelected={selectedSource === entry.source}
                    isDimmed={selectedSource !== null && selectedSource !== entry.source}
                    onClick={() => handleSourceClick(entry.source)}
                    onMouseEnter={() => setHoveredSource(entry.source)}
                    onMouseLeave={() => setHoveredSource(null)} />
                ))}
              </div>
              {selectedSource && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => setSelectedSource(null)}
                    className="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors">
                    Clear filter
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Temporal Chart (col-span-8) */}
          <Card className="col-span-8">
            <div className="p-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Activity Over Time</h2>
              </div>
              {selectedSource && (
                <Badge variant="outline" className="text-[10px]">Filtered by {SOURCE_META[selectedSource].name}</Badge>
              )}
            </div>
            <CardContent className="p-4 pt-3">
              <div className="space-y-1.5">
                {temporalCounts.map((entry, index) => (
                  <TemporalBar key={entry.group.key} label={entry.group.label} count={entry.count}
                    maxCount={maxTemporalCount} index={index} total={temporalCounts.length}
                    isHighlighted={hoveredTemporalGroup === entry.group.key}
                    onMouseEnter={() => setHoveredTemporalGroup(entry.group.key)}
                    onMouseLeave={() => setHoveredTemporalGroup(null)} />
                ))}
              </div>
              <div className="flex items-center justify-end gap-4 mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-[10px] text-gray-400">Recent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-200" />
                  <span className="text-[10px] text-gray-400">Older</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Feed (col-span-5) */}
          <Card className="col-span-5">
            <div className="p-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Recent Feed</h2>
              </div>
              <Badge variant="secondary" className="text-[10px]">{feedActivities.length} items</Badge>
            </div>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto p-3 space-y-1.5">
                {feedActivities.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-400">No activities for this source</p>
                    <button onClick={() => setSelectedSource(null)}
                      className="text-xs text-blue-500 hover:text-blue-700 mt-2 font-medium">Clear filter</button>
                  </div>
                )}
                {feedActivities.map((activity) => {
                  const hlDraft = isAnyDraftHovered && hoveredDraftActivityIds.has(activity.id);
                  const dimDraft = isAnyDraftHovered && !hoveredDraftActivityIds.has(activity.id);
                  const hlTemporal = isAnyTemporalHovered && hoveredTemporalActivityIds.has(activity.id);
                  const dimTemporal = isAnyTemporalHovered && !hoveredTemporalActivityIds.has(activity.id);
                  return (
                    <FeedRow key={activity.id} activity={activity}
                      isHighlighted={hlDraft || hlTemporal}
                      isDimmed={(dimDraft && !hlTemporal) || (dimTemporal && !hlDraft)}
                      isExpanded={expandedActivityId === activity.id}
                      onClick={() => setExpandedActivityId((prev) => prev === activity.id ? null : activity.id)} />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Draft Stories (col-span-7) */}
          <Card className="col-span-7">
            <div className="p-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
                <h2 className="text-sm font-semibold text-purple-700">Draft Stories</h2>
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">{mockDraftStories.length} drafts</Badge>
            </div>
            <CardContent className="p-4 pt-4">
              <div className="space-y-4">
                {mockDraftStories.map((draft) => (
                  <DraftPanel key={draft.id} draft={draft}
                    isExpanded={expandedDraftId === draft.id}
                    isHovered={hoveredDraftId === draft.id}
                    isDimmed={isAnyDraftHovered && hoveredDraftId !== draft.id}
                    onToggle={() => setExpandedDraftId((prev) => prev === draft.id ? null : draft.id)}
                    onHoverStart={() => setHoveredDraftId(draft.id)}
                    onHoverEnd={() => setHoveredDraftId(null)} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats Bar (col-span-12) */}
          <div className="col-span-12 grid grid-cols-4 gap-3">
            {[
              { icon: <Activity className="w-4 h-4 text-blue-500" />, label: 'Total Activities', value: String(mockActivities.length) },
              { icon: <Star className="w-4 h-4 text-purple-500" />, label: 'Draft Stories', value: String(mockDraftStories.length) },
              { icon: <Layers className="w-4 h-4 text-emerald-500" />, label: 'Sources', value: String(uniqueSources) },
              { icon: <Clock className="w-4 h-4 text-amber-500" />, label: 'Date Range', value: overallDateRange },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{stat.icon}</div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
