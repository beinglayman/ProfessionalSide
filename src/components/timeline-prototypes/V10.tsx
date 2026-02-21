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
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ChevronDown, ChevronRight, Star, ArrowUpRight, ArrowLeft, Eye } from 'lucide-react';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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
    jira: <SquareKanban className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Compact activity row used in the left-column timeline feed. */
function ActivityCard({
  activity,
  isHighlighted,
  isLast,
}: {
  activity: MockActivity;
  isHighlighted: boolean;
  isLast: boolean;
}) {
  const meta = SOURCE_META[activity.source];
  return (
    <div className="relative flex gap-3">
      {/* Timeline spine connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10',
            isHighlighted ? 'ring-2 ring-purple-300 ring-offset-2' : '',
          )}
          style={{ backgroundColor: `${meta.color}18` }}
        >
          <SourceIcon source={activity.source} className="w-3.5 h-3.5" style={{ color: meta.color } as React.CSSProperties} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 min-h-[16px]" />}
      </div>

      {/* Card body */}
      <div
        className={cn(
          'flex-1 mb-3 rounded-xl px-4 py-3 transition-all',
          isHighlighted
            ? 'bg-purple-50/70 ring-2 ring-purple-200 shadow-sm'
            : 'bg-white border border-gray-100 hover:border-gray-200',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium text-gray-900 leading-snug', isHighlighted && 'text-purple-900')}>
            {activity.title}
          </p>
          <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
            {timeAgo(activity.timestamp)}
          </span>
        </div>
        {activity.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{activity.description}</p>
        )}
      </div>
    </div>
  );
}

/** Inline expanded draft card rendered inside the activity feed. */
function InlineDraftCard({
  draft,
  onDeactivate,
}: {
  draft: MockDraftStory;
  onDeactivate: () => void;
}) {
  return (
    <div className="relative flex gap-3">
      {/* Spine connector -- decorative purple dot */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shrink-0 z-10 shadow-md">
          <Star className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="w-px flex-1 bg-purple-300 min-h-[16px]" />
      </div>

      {/* The card itself */}
      <div className="flex-1 mb-3 bg-white border-2 border-purple-400 rounded-2xl p-5 shadow-md relative">
        {/* Back to sidebar button */}
        <button
          onClick={onDeactivate}
          className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] text-purple-500 hover:text-purple-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to sidebar
        </button>

        {/* Role badge */}
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-purple-100 text-purple-700 text-[10px] border-0">
            {draft.dominantRole}
          </Badge>
          <span className="text-[11px] text-gray-400">{draft.activityCount} activities</span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 mb-1.5 pr-24">{draft.title}</h3>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{draft.description}</p>

        {/* Source icons */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            {draft.tools.map((tool) => (
              <div
                key={tool}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${SOURCE_META[tool].color}15` }}
              >
                <SourceIcon source={tool} className="w-3.5 h-3.5" style={{ color: SOURCE_META[tool].color } as React.CSSProperties} />
              </div>
            ))}
          </div>
        </div>

        {/* Topic chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {draft.topics.map((topic) => (
            <span
              key={topic}
              className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          Create Story
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Sidebar draft card -- resting (non-activated) state. */
function SidebarDraftCard({
  draft,
  onActivate,
}: {
  draft: MockDraftStory;
  onActivate: () => void;
}) {
  return (
    <button
      onClick={onActivate}
      className="w-full text-left bg-white border border-gray-200 border-l-4 border-l-purple-400 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <p className="font-semibold text-sm text-gray-900 line-clamp-1">{draft.title}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[11px] text-gray-400">{draft.activityCount} activities</span>
        <span className="text-gray-200">|</span>
        <div className="flex items-center gap-1">
          {draft.tools.map((tool) => (
            <SourceIcon
              key={tool}
              source={tool}
              className="w-3 h-3 text-gray-400"
            />
          ))}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] text-purple-500 font-medium mt-2">
        <ArrowUpRight className="w-3 h-3" />
        Create Story
      </span>
    </button>
  );
}

/** Ghost placeholder in sidebar when a draft is activated. */
function SidebarGhost({
  draft,
  onDeactivate,
}: {
  draft: MockDraftStory;
  onDeactivate: () => void;
}) {
  return (
    <button
      onClick={onDeactivate}
      className="w-full text-left bg-purple-50/50 border border-dashed border-purple-200 rounded-xl p-3 cursor-pointer hover:bg-purple-50 transition-colors"
    >
      <p className="text-sm text-purple-400 font-medium flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" />
        Viewing in timeline
      </p>
      <p className="text-[11px] text-purple-300 mt-0.5 line-clamp-1">{draft.title}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TimelineV10() {
  const [activatedDraftIds, setActivatedDraftIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Activate / deactivate helpers
  const activateDraft = (id: string) => {
    setActivatedDraftIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const deactivateDraft = (id: string) => {
    setActivatedDraftIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Build the set of highlighted activity IDs (activities belonging to any activated draft)
  const highlightedActivityIds = useMemo(() => {
    const set = new Set<string>();
    for (const draftId of activatedDraftIds) {
      const activityIds = draftActivityMap[draftId];
      if (activityIds) {
        for (const aId of activityIds) set.add(aId);
      }
    }
    return set;
  }, [activatedDraftIds]);

  // For each activated draft, find its insertion point: the index of its most recent
  // contributing activity within each temporal group.
  const draftInsertionMap = useMemo(() => {
    const map: Record<string, { groupKey: string; afterActivityId: string }> = {};
    for (const draftId of activatedDraftIds) {
      const activityIds = draftActivityMap[draftId];
      if (!activityIds || activityIds.length === 0) continue;

      // Find which temporal group contains the most recent activity for this draft
      for (const group of mockTemporalGroups) {
        const matchInGroup = group.activities.find((a) => activityIds.includes(a.id));
        if (matchInGroup) {
          map[draftId] = { groupKey: group.key, afterActivityId: matchInGroup.id };
          break; // First temporal group match = most recent since groups are chronological
        }
      }
    }
    return map;
  }, [activatedDraftIds]);

  // Map from draft ID to MockDraftStory for quick lookup
  const draftMap = useMemo(
    () => Object.fromEntries(mockDraftStories.map((d) => [d.id, d])),
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Kanban + Inline Timeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            Click a draft story in the sidebar to expand it inline within the activity feed
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr,280px] gap-6">
          {/* ==================== LEFT COLUMN -- Activity Feed ==================== */}
          <div>
            {mockTemporalGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key);

              // Determine which activated drafts should be inserted in this group
              const draftsInGroup = Object.entries(draftInsertionMap)
                .filter(([, info]) => info.groupKey === group.key)
                .map(([draftId]) => draftId);

              return (
                <div key={group.key} className="mb-6">
                  {/* Group heading */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="flex items-center gap-2 mb-3 group cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    )}
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
                      {group.label}
                    </h2>
                    <span className="text-[11px] text-gray-300 font-normal">
                      {group.activities.length} activities
                    </span>
                  </button>

                  {/* Group content */}
                  {!isCollapsed && (
                    <div className="pl-1">
                      {group.activities.map((activity, idx) => {
                        const isHighlighted = highlightedActivityIds.has(activity.id);
                        const isLastInGroup = idx === group.activities.length - 1 && draftsInGroup.length === 0;

                        // Check if any activated draft should render after this activity
                        const draftsAfterThis = draftsInGroup.filter(
                          (draftId) => draftInsertionMap[draftId]?.afterActivityId === activity.id,
                        );

                        return (
                          <React.Fragment key={activity.id}>
                            <ActivityCard
                              activity={activity}
                              isHighlighted={isHighlighted}
                              isLast={isLastInGroup && draftsAfterThis.length === 0}
                            />
                            {/* Render inline draft cards that anchor after this activity */}
                            {draftsAfterThis.map((draftId) => {
                              const draft = draftMap[draftId];
                              if (!draft) return null;
                              return (
                                <InlineDraftCard
                                  key={`inline-${draftId}`}
                                  draft={draft}
                                  onDeactivate={() => deactivateDraft(draftId)}
                                />
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ==================== RIGHT COLUMN -- Sticky Draft Sidebar ==================== */}
          <div className="sticky top-6 self-start">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Draft Stories
              </h2>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {mockDraftStories.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {mockDraftStories.map((draft) => {
                const isActivated = activatedDraftIds.has(draft.id);

                if (isActivated) {
                  return (
                    <SidebarGhost
                      key={draft.id}
                      draft={draft}
                      onDeactivate={() => deactivateDraft(draft.id)}
                    />
                  );
                }

                return (
                  <SidebarDraftCard
                    key={draft.id}
                    draft={draft}
                    onActivate={() => activateDraft(draft.id)}
                  />
                );
              })}
            </div>

            {/* Sidebar footer hint */}
            <p className="text-[11px] text-gray-300 mt-5 text-center leading-relaxed">
              Click a draft to see it in context within the activity timeline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
