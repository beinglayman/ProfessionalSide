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
import {
  GitBranch, KanbanSquare, Hash, FileText, Figma, Video,
  ChevronDown, ChevronRight, Layers, ArrowUpRight, Sparkles,
  FolderOpen, FolderClosed, ChevronsUpDown, ChevronsDownUp,
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
// Helper: group activities by source within a temporal group
// ---------------------------------------------------------------------------

function groupActivitiesBySource(
  activities: MockActivity[],
): { source: ActivitySource; meta: (typeof SOURCE_META)[ActivitySource]; activities: MockActivity[] }[] {
  const map: Partial<Record<ActivitySource, MockActivity[]>> = {};
  for (const a of activities) {
    if (!map[a.source]) map[a.source] = [];
    map[a.source]!.push(a);
  }
  // Sort source groups by number of activities (desc), then alphabetically
  return Object.entries(map)
    .sort(([, a], [, b]) => b!.length - a!.length)
    .map(([source, acts]) => ({
      source: source as ActivitySource,
      meta: SOURCE_META[source as ActivitySource],
      activities: acts!,
    }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single compact activity row inside a source sub-accordion. */
function ActivityRow({
  activity,
  isHighlighted,
}: {
  activity: MockActivity;
  isHighlighted: boolean;
}) {
  const meta = SOURCE_META[activity.source];
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        isHighlighted
          ? 'bg-purple-50 ring-1 ring-purple-200'
          : 'hover:bg-gray-50',
      )}
    >
      {/* Source icon */}
      <div
        className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
          isHighlighted && 'ring-1 ring-purple-300',
        )}
        style={{ backgroundColor: `${meta.color}14` }}
      >
        <SourceIcon
          source={activity.source}
          className="w-3.5 h-3.5"
        />
      </div>

      {/* Title */}
      <p
        className={cn(
          'flex-1 text-sm text-gray-800 truncate leading-snug',
          isHighlighted && 'text-purple-900 font-medium',
        )}
      >
        {activity.title}
      </p>

      {/* Timestamp */}
      <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
        {timeAgo(activity.timestamp)}
      </span>
    </div>
  );
}

/** Source sub-accordion inside a temporal group. */
function SourceAccordion({
  source,
  meta,
  activities,
  isExpanded,
  onToggle,
  highlightedIds,
}: {
  source: ActivitySource;
  meta: (typeof SOURCE_META)[ActivitySource];
  activities: MockActivity[];
  isExpanded: boolean;
  onToggle: () => void;
  highlightedIds: Set<string>;
}) {
  const highlightCount = activities.filter((a) => highlightedIds.has(a.id)).length;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      {/* Sub-accordion header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          'hover:bg-gray-50/80',
          isExpanded && 'border-b border-gray-100',
        )}
      >
        {/* Source icon chip */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${meta.color}18` }}
        >
          <SourceIcon source={source} className="w-4 h-4" />
        </div>

        {/* Source name + count */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">
            {meta.name}
          </span>
          <span className="text-xs text-gray-400 ml-2">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>

        {/* Highlight indicator */}
        {highlightCount > 0 && (
          <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            {highlightCount} linked
          </span>
        )}

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Animated content area */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 py-2 space-y-0.5">
            {activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                isHighlighted={highlightedIds.has(activity.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Temporal group accordion (top-level). */
function GroupAccordion({
  group,
  isExpanded,
  onToggle,
  expandedSources,
  onToggleSource,
  highlightedIds,
}: {
  group: TemporalGroup;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSources: Set<string>;
  onToggleSource: (key: string) => void;
  highlightedIds: Set<string>;
}) {
  const sourceGroups = useMemo(
    () => groupActivitiesBySource(group.activities),
    [group.activities],
  );

  const highlightCount = group.activities.filter((a) => highlightedIds.has(a.id)).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Group header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-5 py-4 text-left transition-all',
          'hover:bg-gray-50/60',
          isExpanded && 'bg-gray-50/40 border-b border-gray-100',
        )}
      >
        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="w-5 h-5 text-gray-500 shrink-0" />
        ) : (
          <FolderClosed className="w-5 h-5 text-gray-400 shrink-0" />
        )}

        {/* Label */}
        <div className="flex-1 min-w-0">
          <h2 className={cn(
            'text-sm font-bold uppercase tracking-wider',
            isExpanded ? 'text-gray-800' : 'text-gray-600',
          )}>
            {group.label}
          </h2>
        </div>

        {/* Activity count badge */}
        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
          {group.activities.length}
        </span>

        {/* Source indicator pills (collapsed preview) */}
        {!isExpanded && (
          <div className="flex items-center gap-1 shrink-0">
            {sourceGroups.map(({ source, meta }) => (
              <div
                key={source}
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}18` }}
              >
                <SourceIcon source={source} className="w-3 h-3" />
              </div>
            ))}
          </div>
        )}

        {/* Highlight indicator */}
        {highlightCount > 0 && (
          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
            {highlightCount} linked
          </span>
        )}

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 transition-transform" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 transition-transform" />
        )}
      </button>

      {/* Animated group content */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 py-3 space-y-2">
            {sourceGroups.map(({ source, meta, activities }) => {
              const sourceKey = `${group.key}::${source}`;
              return (
                <SourceAccordion
                  key={source}
                  source={source}
                  meta={meta}
                  activities={activities}
                  isExpanded={expandedSources.has(sourceKey)}
                  onToggle={() => onToggleSource(sourceKey)}
                  highlightedIds={highlightedIds}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pinned draft story card with expand/collapse. */
function DraftCard({
  draft,
  isExpanded,
  isHovered,
  onToggle,
  onHoverStart,
  onHoverEnd,
}: {
  draft: MockDraftStory;
  isExpanded: boolean;
  isHovered: boolean;
  onToggle: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const contributingActivities = useMemo(
    () => getActivitiesForDraft(draft),
    [draft],
  );

  return (
    <Card
      className={cn(
        'border-2 transition-all duration-200 cursor-pointer overflow-hidden',
        isExpanded
          ? 'border-purple-400 shadow-lg bg-white'
          : isHovered
            ? 'border-purple-300 shadow-md bg-purple-50/30'
            : 'border-purple-200 shadow-sm bg-white hover:shadow-md hover:border-purple-300',
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-purple-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
        )}

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {draft.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {/* Tool icons */}
            <div className="flex items-center gap-1">
              {draft.tools.map((tool) => (
                <div
                  key={tool}
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${SOURCE_META[tool].color}18` }}
                >
                  <SourceIcon source={tool} className="w-3 h-3" />
                </div>
              ))}
            </div>
            <span className="text-[11px] text-gray-400">
              {draft.activityCount} activities
            </span>
          </div>
        </div>

        {/* Role badge */}
        <Badge
          className={cn(
            'text-[10px] font-bold border-none shrink-0',
            ROLE_COLORS[draft.dominantRole].bg,
            ROLE_COLORS[draft.dominantRole].text,
          )}
        >
          {draft.dominantRole}
        </Badge>
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="px-5 pb-5 pt-0">
            {/* Divider */}
            <div className="border-t border-purple-100 mb-4" />

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {draft.description}
            </p>

            {/* Date range */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span className="font-medium">
                {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
              </span>
            </div>

            {/* Topic chips */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {draft.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>

            {/* Contributing activities */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Contributing Activities
              </p>
              <div className="space-y-1">
                {contributingActivities.map((activity) => {
                  const meta = SOURCE_META[activity.source];
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}18` }}
                      >
                        <SourceIcon source={activity.source} className="w-3 h-3" />
                      </div>
                      <p className="flex-1 text-xs text-gray-700 truncate">
                        {activity.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {timeAgo(activity.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create Story CTA */}
            <button
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold',
                'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800',
                'transition-colors shadow-sm',
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Create Story
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV13() {
  // Temporal group expansion state (which groups are open)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(['today', 'yesterday']),
  );

  // Source sub-accordion expansion state (keys are "groupKey::source")
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    () => new Set(['today::github', 'today::jira', 'yesterday::github']),
  );

  // Draft card state
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);

  // Toggle helpers
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSource = useCallback((key: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleDraft = useCallback((id: string) => {
    setExpandedDraftId((prev) => (prev === id ? null : id));
  }, []);

  // Expand all / collapse all
  const allGroupKeys = useMemo(
    () => mockTemporalGroups.map((g) => g.key),
    [],
  );

  const allSourceKeys = useMemo(() => {
    const keys: string[] = [];
    for (const group of mockTemporalGroups) {
      const sources = new Set(group.activities.map((a) => a.source));
      for (const source of sources) {
        keys.push(`${group.key}::${source}`);
      }
    }
    return keys;
  }, []);

  const allExpanded =
    expandedGroups.size === allGroupKeys.length &&
    expandedSources.size >= allSourceKeys.length;

  const handleExpandCollapseAll = useCallback(() => {
    if (allExpanded) {
      // Collapse all
      setExpandedGroups(new Set());
      setExpandedSources(new Set());
    } else {
      // Expand all
      setExpandedGroups(new Set(allGroupKeys));
      setExpandedSources(new Set(allSourceKeys));
    }
  }, [allExpanded, allGroupKeys, allSourceKeys]);

  // Highlighted activity IDs based on hovered draft
  const highlightedActivityIds = useMemo(() => {
    const set = new Set<string>();
    const targetDraftId = hoveredDraftId || expandedDraftId;
    if (targetDraftId) {
      const activityIds = draftActivityMap[targetDraftId];
      if (activityIds) {
        for (const id of activityIds) set.add(id);
      }
    }
    return set;
  }, [hoveredDraftId, expandedDraftId]);

  // Stats for header
  const totalSources = useMemo(() => {
    const sources = new Set(mockActivities.map((a) => a.source));
    return sources.size;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* ================================================================= */}
        {/* HEADER */}
        {/* ================================================================= */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accordion Stack</h1>
              <p className="text-sm text-gray-500">
                {mockActivities.length} activities across {totalSources} sources
                {' '}&mdash; {mockDraftStories.length} draft stories
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* PINNED DRAFT STORY CARDS */}
        {/* ================================================================= */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Draft Stories
              </h2>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {mockDraftStories.length}
              </Badge>
            </div>
            <p className="text-[11px] text-gray-400">
              Hover to highlight linked activities below
            </p>
          </div>

          <div className="space-y-3">
            {mockDraftStories.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                isExpanded={expandedDraftId === draft.id}
                isHovered={hoveredDraftId === draft.id}
                onToggle={() => toggleDraft(draft.id)}
                onHoverStart={() => setHoveredDraftId(draft.id)}
                onHoverEnd={() => setHoveredDraftId(null)}
              />
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* DIVIDER */}
        {/* ================================================================= */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Activity Timeline
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* EXPAND / COLLAPSE ALL CONTROL */}
        {/* ================================================================= */}
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={handleExpandCollapseAll}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              'bg-white border border-gray-200 text-gray-600',
              'hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100',
              'shadow-sm',
            )}
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5" />
                Expand All
              </>
            )}
          </button>
        </div>

        {/* ================================================================= */}
        {/* TEMPORAL GROUP ACCORDIONS */}
        {/* ================================================================= */}
        <div className="space-y-3">
          {mockTemporalGroups.map((group) => (
            <GroupAccordion
              key={group.key}
              group={group}
              isExpanded={expandedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              expandedSources={expandedSources}
              onToggleSource={toggleSource}
              highlightedIds={highlightedActivityIds}
            />
          ))}
        </div>

        {/* ================================================================= */}
        {/* FOOTER */}
        {/* ================================================================= */}
        <div className="mt-10 mb-4 text-center">
          <p className="text-[11px] text-gray-300 leading-relaxed">
            {mockTemporalGroups.length} time periods &middot;{' '}
            {mockActivities.length} activities &middot;{' '}
            {totalSources} sources
          </p>
        </div>
      </div>
    </div>
  );
}
