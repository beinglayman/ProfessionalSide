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
  Layers, ToggleLeft, ToggleRight, FolderOpen,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Utilities
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
  return `${s.toLocaleDateString('en-US', opts)} \u2013 ${e.toLocaleDateString('en-US', opts)}`;
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
// Role badge color mapping
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<MockDraftStory['dominantRole'], { bg: string; text: string }> = {
  Led: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Contributed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Participated: { bg: 'bg-green-100', text: 'text-green-700' },
};

// ---------------------------------------------------------------------------
// Helpers: group activities by source
// ---------------------------------------------------------------------------

function groupBySource(activities: MockActivity[]): Record<string, MockActivity[]> {
  const groups: Record<string, MockActivity[]> = {};
  for (const a of activities) {
    if (!groups[a.source]) groups[a.source] = [];
    groups[a.source].push(a);
  }
  return groups;
}

function groupByTemporalGroup(activities: MockActivity[]): { label: string; activities: MockActivity[] }[] {
  const activityIds = new Set(activities.map(a => a.id));
  const result: { label: string; activities: MockActivity[] }[] = [];
  for (const tg of mockTemporalGroups) {
    const matching = tg.activities.filter(a => activityIds.has(a.id));
    if (matching.length > 0) {
      result.push({ label: tg.label, activities: matching });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single nested child activity card */
function ChildActivityCard({
  activity,
  index,
  isHovered,
  onHover,
  onLeave,
}: {
  activity: MockActivity;
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const meta = SOURCE_META[activity.source];
  const draftIds = activityDraftMap[activity.id] || [];
  const isMultiDraft = draftIds.length > 1;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-default',
        'opacity-0 animate-[fadeSlideUp_0.3s_ease-out_forwards]',
        isHovered
          ? 'bg-gray-50 shadow-sm ring-1 ring-gray-200'
          : 'hover:bg-gray-50/60',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Source icon */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${meta.color}15` }}
      >
        <SourceIcon
          source={activity.source}
          className="w-3.5 h-3.5"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-800 leading-snug truncate">
            {activity.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {isMultiDraft && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 border-purple-300 text-purple-600 font-medium"
              >
                {draftIds.length} drafts
              </Badge>
            )}
            <span className="text-[11px] text-gray-400 whitespace-nowrap">
              {timeAgo(activity.timestamp)}
            </span>
          </div>
        </div>

        {/* Description shown on hover */}
        {isHovered && activity.description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed animate-[fadeIn_0.15s_ease-out]">
            {activity.description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Source sub-header divider within a parent card */
function SourceDivider({ source, count }: { source: ActivitySource; count: number }) {
  const meta = SOURCE_META[source];
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <div
        className="w-5 h-5 rounded flex items-center justify-center"
        style={{ backgroundColor: meta.color }}
      >
        <SourceIcon source={source} className="w-3 h-3 text-white" />
      </div>
      <span className="text-xs font-semibold text-gray-600">{meta.name}</span>
      <span className="text-[10px] text-gray-400">{count}</span>
      <div className="flex-1 h-px bg-gray-100 ml-1" />
    </div>
  );
}

/** Temporal sub-header divider within a parent card (for time-first mode) */
function TemporalDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] text-gray-400">{count}</span>
      <div className="flex-1 h-px bg-gray-100 ml-1" />
    </div>
  );
}

/** A parent card for a draft story */
function DraftParentCard({
  draft,
  activities,
  isExpanded,
  onToggle,
  hoveredChildId,
  onHoverChild,
  onLeaveChild,
  viewMode,
}: {
  draft: MockDraftStory;
  activities: MockActivity[];
  isExpanded: boolean;
  onToggle: () => void;
  hoveredChildId: string | null;
  onHoverChild: (id: string) => void;
  onLeaveChild: () => void;
  viewMode: 'drafts-first' | 'time-first';
}) {
  const sourceGroups = useMemo(() => groupBySource(activities), [activities]);
  const temporalGroups = useMemo(() => groupByTemporalGroup(activities), [activities]);

  let childIndex = 0;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 border-l-4 border-l-purple-400',
        isExpanded
          ? 'shadow-lg ring-1 ring-purple-100'
          : 'shadow-sm hover:shadow-md',
      )}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3 group cursor-pointer"
      >
        {/* Expand/collapse chevron */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
          isExpanded
            ? 'bg-purple-100 text-purple-600'
            : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
        )}>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge
              className={cn(
                'text-[10px] px-2 py-0 h-4 border-none font-bold',
                ROLE_COLORS[draft.dominantRole].bg,
                ROLE_COLORS[draft.dominantRole].text,
              )}
            >
              {draft.dominantRole}
            </Badge>
            <span className="text-[11px] text-gray-400">
              {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
            </span>
          </div>
          <h3 className={cn(
            'text-base font-bold leading-snug truncate',
            isExpanded ? 'text-purple-900' : 'text-gray-900',
          )}>
            {draft.title}
          </h3>
        </div>

        {/* Tools + count */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            {draft.tools.map(tool => (
              <div
                key={tool}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${SOURCE_META[tool].color}12` }}
              >
                <SourceIcon
                  source={tool}
                  className="w-3 h-3"
                />
              </div>
            ))}
          </div>
          <Badge variant="secondary" className="text-[11px] font-medium">
            {activities.length}
          </Badge>
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <CardContent className="px-5 pb-5 pt-0">
          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed mb-3 pl-11">
            {draft.description}
          </p>

          {/* Topic chips */}
          <div className="flex flex-wrap gap-1.5 mb-4 pl-11">
            {draft.topics.map(topic => (
              <span
                key={topic}
                className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full font-medium"
              >
                {topic}
              </span>
            ))}
          </div>

          {/* Nested activity cards */}
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 py-2 mb-4">
            {viewMode === 'drafts-first' ? (
              /* Group by source */
              Object.entries(sourceGroups).map(([source, acts]) => (
                <div key={source}>
                  <SourceDivider source={source as ActivitySource} count={acts.length} />
                  {acts.map(activity => {
                    const idx = childIndex++;
                    return (
                      <ChildActivityCard
                        key={activity.id}
                        activity={activity}
                        index={idx}
                        isHovered={hoveredChildId === activity.id}
                        onHover={() => onHoverChild(activity.id)}
                        onLeave={onLeaveChild}
                      />
                    );
                  })}
                </div>
              ))
            ) : (
              /* Group by temporal group */
              temporalGroups.map(tg => (
                <div key={tg.label}>
                  <TemporalDivider label={tg.label} count={tg.activities.length} />
                  {tg.activities.map(activity => {
                    const idx = childIndex++;
                    return (
                      <ChildActivityCard
                        key={activity.id}
                        activity={activity}
                        index={idx}
                        isHovered={hoveredChildId === activity.id}
                        onHover={() => onHoverChild(activity.id)}
                        onLeave={onLeaveChild}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* CTA */}
          <div className="pl-11">
            <button
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800',
                'transition-colors shadow-sm',
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Create Story
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/** Parent card for "Other Activities" (uncategorized) */
function OtherActivitiesCard({
  activities,
  isExpanded,
  onToggle,
  hoveredChildId,
  onHoverChild,
  onLeaveChild,
  viewMode,
}: {
  activities: MockActivity[];
  isExpanded: boolean;
  onToggle: () => void;
  hoveredChildId: string | null;
  onHoverChild: (id: string) => void;
  onLeaveChild: () => void;
  viewMode: 'drafts-first' | 'time-first';
}) {
  const sourceGroups = useMemo(() => groupBySource(activities), [activities]);
  const temporalGroups = useMemo(() => groupByTemporalGroup(activities), [activities]);

  let childIndex = 0;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 border-l-4 border-l-gray-300',
        isExpanded
          ? 'shadow-lg ring-1 ring-gray-200'
          : 'shadow-sm hover:shadow-md',
      )}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3 group cursor-pointer"
      >
        {/* Expand/collapse chevron */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
          isExpanded
            ? 'bg-gray-200 text-gray-600'
            : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
        )}>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-400 font-medium">Uncategorized</span>
          </div>
          <h3 className={cn(
            'text-base font-bold leading-snug',
            isExpanded ? 'text-gray-800' : 'text-gray-700',
          )}>
            Other Activities
          </h3>
        </div>

        {/* Count */}
        <Badge variant="secondary" className="text-[11px] font-medium shrink-0">
          {activities.length}
        </Badge>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <CardContent className="px-5 pb-5 pt-0">
          <p className="text-sm text-gray-500 mb-3 pl-11">
            Activities not yet associated with any draft story.
          </p>

          {/* Nested activity cards */}
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 py-2 mb-2">
            {viewMode === 'drafts-first' ? (
              Object.entries(sourceGroups).map(([source, acts]) => (
                <div key={source}>
                  <SourceDivider source={source as ActivitySource} count={acts.length} />
                  {acts.map(activity => {
                    const idx = childIndex++;
                    return (
                      <ChildActivityCard
                        key={activity.id}
                        activity={activity}
                        index={idx}
                        isHovered={hoveredChildId === activity.id}
                        onHover={() => onHoverChild(activity.id)}
                        onLeave={onLeaveChild}
                      />
                    );
                  })}
                </div>
              ))
            ) : (
              temporalGroups.map(tg => (
                <div key={tg.label}>
                  <TemporalDivider label={tg.label} count={tg.activities.length} />
                  {tg.activities.map(activity => {
                    const idx = childIndex++;
                    return (
                      <ChildActivityCard
                        key={activity.id}
                        activity={activity}
                        index={idx}
                        isHovered={hoveredChildId === activity.id}
                        onHover={() => onHoverChild(activity.id)}
                        onLeave={onLeaveChild}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TimelineV18() {
  const [expandedParentId, setExpandedParentId] = useState<string | null>('ds1');
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'drafts-first' | 'time-first'>('drafts-first');

  // Pre-compute activities for each draft
  const draftActivitiesMap = useMemo(() => {
    const map: Record<string, MockActivity[]> = {};
    for (const draft of mockDraftStories) {
      map[draft.id] = getActivitiesForDraft(draft);
    }
    return map;
  }, []);

  // Compute "other" activities not associated with any draft
  const otherActivities = useMemo(() => {
    return mockActivities.filter(a => {
      const draftIds = activityDraftMap[a.id];
      return !draftIds || draftIds.length === 0;
    });
  }, []);

  // Accordion toggle: clicking the currently-expanded parent collapses it;
  // clicking a different one expands it and collapses the previous
  const handleToggle = (parentId: string) => {
    setExpandedParentId(prev => prev === parentId ? null : parentId);
  };

  const totalActivities = mockActivities.length;
  const categorizedCount = totalActivities - otherActivities.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Keyframes for staggered child animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nested Cards</h1>
              <p className="text-sm text-gray-500">
                {mockDraftStories.length} draft stories &middot; {categorizedCount} categorized &middot; {otherActivities.length} other activities
              </p>
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-gray-400">
            Click a card header to expand. One panel open at a time.
          </p>
          <button
            onClick={() => setViewMode(prev => prev === 'drafts-first' ? 'time-first' : 'drafts-first')}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow',
              'text-gray-600 hover:text-gray-800',
            )}
          >
            {viewMode === 'drafts-first' ? (
              <ToggleLeft className="w-4 h-4 text-purple-500" />
            ) : (
              <ToggleRight className="w-4 h-4 text-purple-500" />
            )}
            {viewMode === 'drafts-first' ? 'Grouped by source' : 'Grouped by time'}
          </button>
        </div>

        {/* Parent cards stack */}
        <div className="space-y-3">
          {/* Draft story parent cards */}
          {mockDraftStories.map(draft => (
            <DraftParentCard
              key={draft.id}
              draft={draft}
              activities={draftActivitiesMap[draft.id] || []}
              isExpanded={expandedParentId === draft.id}
              onToggle={() => handleToggle(draft.id)}
              hoveredChildId={hoveredChildId}
              onHoverChild={setHoveredChildId}
              onLeaveChild={() => setHoveredChildId(null)}
              viewMode={viewMode}
            />
          ))}

          {/* "Other Activities" parent card */}
          {otherActivities.length > 0 && (
            <OtherActivitiesCard
              activities={otherActivities}
              isExpanded={expandedParentId === '__other__'}
              onToggle={() => handleToggle('__other__')}
              hoveredChildId={hoveredChildId}
              onHoverChild={setHoveredChildId}
              onLeaveChild={() => setHoveredChildId(null)}
              viewMode={viewMode}
            />
          )}
        </div>

        {/* Footer stats */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
          <span>{totalActivities} total activities</span>
          <span className="w-px h-3 bg-gray-200" />
          <span>{mockDraftStories.length} draft stories</span>
          <span className="w-px h-3 bg-gray-200" />
          <span>{Object.keys(SOURCE_META).length} sources integrated</span>
        </div>
      </div>
    </div>
  );
}
