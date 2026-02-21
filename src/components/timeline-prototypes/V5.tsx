'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import {
  GitBranch, KanbanSquare, Hash, FileText, Figma, Video,
  ArrowUpRight, ChevronDown, ChevronUp, Newspaper, Clock,
  Calendar, Layers,
} from 'lucide-react';
import { Badge } from '../ui/badge';

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
// Role badge color mapping
// ---------------------------------------------------------------------------

const roleBadgeStyles: Record<string, string> = {
  Led: 'bg-purple-100 text-purple-800 border-purple-200',
  Contributed: 'bg-blue-100 text-blue-800 border-blue-200',
  Participated: 'bg-gray-100 text-gray-700 border-gray-200',
};

// ---------------------------------------------------------------------------
// EvidenceCard — compact activity card in evidence grid
// ---------------------------------------------------------------------------

function EvidenceCard({
  activity,
  isHovered,
  onHover,
  onLeave,
}: {
  activity: MockActivity;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const meta = SOURCE_META[activity.source];

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'bg-white rounded-lg border border-gray-100 p-3 transition-all duration-150',
        'border-l-4 hover:shadow-md cursor-default',
        isHovered && 'shadow-md ring-1 ring-gray-200'
      )}
      style={{ borderLeftColor: meta.color }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${meta.color}15` }}
        >
          <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug truncate">
            {activity.title}
          </p>
          {isHovered && activity.description ? (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {activity.description}
            </p>
          ) : (
            activity.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {activity.description}
              </p>
            )
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: meta.color }}
            >
              {meta.name}
            </span>
            <span className="text-[10px] text-gray-400">{timeAgo(activity.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroCard — full-width magazine-style draft story card
// ---------------------------------------------------------------------------

function HeroCard({
  draft,
  activities,
  isExpanded,
  onToggle,
  hoveredActivityId,
  onActivityHover,
  onActivityLeave,
}: {
  draft: MockDraftStory;
  activities: MockActivity[];
  isExpanded: boolean;
  onToggle: () => void;
  hoveredActivityId: string | null;
  onActivityHover: (id: string) => void;
  onActivityLeave: () => void;
}) {
  return (
    <div className="mb-10">
      {/* Hero card */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full text-left bg-white rounded-2xl shadow-sm border border-gray-200',
          'hover:shadow-md transition-shadow duration-200 cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
          isExpanded && 'shadow-md border-purple-200'
        )}
      >
        {/* Gradient accent bar */}
        <div className="h-1 rounded-t-2xl bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-500" />

        <div className="p-8">
          {/* Title row with expand indicator */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {draft.title}
            </h2>
            <div className="flex-shrink-0 mt-1">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Pull-quote style description */}
          <div className="border-l-4 border-purple-300 pl-4 mb-6">
            <p className="italic text-gray-600 text-base leading-relaxed">
              {draft.description}
            </p>
          </div>

          {/* Two-column metadata grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: role + tools */}
            <div className="space-y-4">
              {/* Role badge */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Role
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-semibold px-3 py-1',
                    roleBadgeStyles[draft.dominantRole]
                  )}
                >
                  {draft.dominantRole}
                </Badge>
              </div>

              {/* Tool icons with labels */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Tools
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {draft.tools.map((tool) => {
                    const meta = SOURCE_META[tool];
                    return (
                      <div key={tool} className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${meta.color}12` }}
                        >
                          <SourceIcon
                            source={tool}
                            className="w-3.5 h-3.5"
                          />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">
                          {meta.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: date range + topics */}
            <div className="space-y-4">
              {/* Date range */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Date Range
                </p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">
                    {formatDateRange(draft.dateRange.start, draft.dateRange.end)}
                  </span>
                </div>
              </div>

              {/* Topic chips */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: activity count callout + CTA */}
          <div className="flex items-end justify-between mt-6 pt-6 border-t border-gray-100">
            {/* Activity count callout */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-purple-600">
                {activities.length}
              </span>
              <span className="text-sm text-gray-500 font-medium">
                activities
              </span>
            </div>

            {/* CTA button */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg',
                'bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium',
                'transition-colors duration-150 shadow-sm'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              Create Story
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </button>

      {/* Evidence grid — expanded below hero */}
      {isExpanded && (
        <div className="mt-4 px-2">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Layers className="w-4 h-4 text-purple-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Evidence ({activities.length})
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activities.map((activity) => (
              <EvidenceCard
                key={activity.id}
                activity={activity}
                isHovered={hoveredActivityId === activity.id}
                onHover={() => onActivityHover(activity.id)}
                onLeave={onActivityLeave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WireFeedItem — compact unclaimed activity row
// ---------------------------------------------------------------------------

function WireFeedItem({
  activity,
  isHovered,
  onHover,
  onLeave,
}: {
  activity: MockActivity;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const meta = SOURCE_META[activity.source];

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-100',
        'hover:bg-gray-50 cursor-default',
        isHovered && 'bg-gray-50'
      )}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${meta.color}12` }}
      >
        <SourceIcon source={activity.source} className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate">
          {activity.title}
        </p>
        {isHovered && activity.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {activity.description}
          </p>
        )}
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
        style={{ color: meta.color }}
      >
        {meta.name}
      </span>
      <span className="text-[11px] text-gray-400 flex-shrink-0 w-16 text-right">
        {timeAgo(activity.timestamp)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component — Magazine Layout
// ---------------------------------------------------------------------------

export function TimelineV5() {
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  // Pre-compute activities for each draft
  const draftActivitiesMap = useMemo(() => {
    const map = new Map<string, MockActivity[]>();
    for (const draft of mockDraftStories) {
      map.set(draft.id, getActivitiesForDraft(draft));
    }
    return map;
  }, []);

  // Compute unclaimed activities: those not linked to any draft
  const unclaimedActivities = useMemo(() => {
    return mockActivities.filter(
      (a) => !activityDraftMap[a.id] || activityDraftMap[a.id].length === 0
    );
  }, []);

  // Group unclaimed activities by temporal group for wire feed
  const unclaimedByGroup = useMemo(() => {
    const unclaimedIds = new Set(unclaimedActivities.map((a) => a.id));
    const groups: { label: string; activities: MockActivity[] }[] = [];

    for (const group of mockTemporalGroups) {
      const matching = group.activities.filter((a) => unclaimedIds.has(a.id));
      if (matching.length > 0) {
        groups.push({ label: group.label, activities: matching });
      }
    }

    return groups;
  }, [unclaimedActivities]);

  const handleToggle = (draftId: string) => {
    setExpandedDraftId((prev) => (prev === draftId ? null : draftId));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Magazine Layout</h1>
              <p className="text-sm text-gray-500">
                Stories as hero cards with expandable evidence grids
              </p>
            </div>
          </div>

          {/* Summary stats bar */}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>
                <span className="font-semibold text-gray-800">{mockDraftStories.length}</span> draft stories
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>
                <span className="font-semibold text-gray-800">{mockActivities.length}</span> total activities
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-4 h-4 text-gray-400" />
              <span>
                <span className="font-semibold text-gray-800">{unclaimedActivities.length}</span> unclaimed
              </span>
            </div>
          </div>
        </div>

        {/* Draft story hero cards */}
        <div className="space-y-2">
          {mockDraftStories.map((draft) => {
            const activities = draftActivitiesMap.get(draft.id) ?? [];
            return (
              <HeroCard
                key={draft.id}
                draft={draft}
                activities={activities}
                isExpanded={expandedDraftId === draft.id}
                onToggle={() => handleToggle(draft.id)}
                hoveredActivityId={hoveredActivityId}
                onActivityHover={(id) => setHoveredActivityId(id)}
                onActivityLeave={() => setHoveredActivityId(null)}
              />
            );
          })}
        </div>

        {/* Wire Feed — unclaimed activities */}
        {unclaimedActivities.length > 0 && (
          <div className="mt-12">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Wire Feed</h2>
                <p className="text-xs text-gray-500">
                  Activities not yet linked to a draft story
                </p>
              </div>
              <div className="ml-auto">
                <Badge variant="secondary" className="text-xs">
                  {unclaimedActivities.length} activities
                </Badge>
              </div>
            </div>

            {/* Grouped unclaimed activities */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {unclaimedByGroup.map((group, groupIndex) => (
                <div key={group.label}>
                  {/* Group header */}
                  <div
                    className={cn(
                      'px-4 py-2.5 bg-gray-50 border-b border-gray-100',
                      groupIndex > 0 && 'border-t border-gray-100'
                    )}
                  >
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {group.label}
                    </p>
                  </div>

                  {/* Activity rows */}
                  <div className="divide-y divide-gray-50">
                    {group.activities.map((activity) => (
                      <WireFeedItem
                        key={activity.id}
                        activity={activity}
                        isHovered={hoveredActivityId === activity.id}
                        onHover={() => setHoveredActivityId(activity.id)}
                        onLeave={() => setHoveredActivityId(null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
