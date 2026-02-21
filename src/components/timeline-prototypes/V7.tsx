'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap,
  type ActivitySource, type MockDraftStory, type MockActivity, type TemporalGroup,
} from './mock-data';
import {
  GitBranch, KanbanSquare, Hash, FileText, Figma, Video,
  Star, ArrowUpRight, ChevronDown, MessageCircle,
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
// Types for the interleaved chat feed
// ---------------------------------------------------------------------------

type FeedItemActivity = { kind: 'activity'; activity: MockActivity };
type FeedItemDraft = { kind: 'draft'; draft: MockDraftStory; contributingActivities: MockActivity[] };
type FeedItemDivider = { kind: 'divider'; label: string };
type FeedItem = FeedItemActivity | FeedItemDraft | FeedItemDivider;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV7() {
  // ---- state ----
  const [expandedBubbleId, setExpandedBubbleId] = useState<string | null>(null);
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);

  // ---- pre-compute draft membership sets ----
  const draftActivitySets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [draftId, actIds] of Object.entries(draftActivityMap)) {
      sets[draftId] = new Set(actIds);
    }
    return sets;
  }, []);

  // ---- build interleaved chat feed ----
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    const insertedDrafts = new Set<string>();

    for (const group of mockTemporalGroups) {
      // Add timestamp divider
      items.push({ kind: 'divider', label: group.label });

      // For each activity, check if it is the first member of any un-inserted draft
      for (const activity of group.activities) {
        const draftIds = activityDraftMap[activity.id] ?? [];
        for (const draftId of draftIds) {
          if (!insertedDrafts.has(draftId)) {
            insertedDrafts.add(draftId);
            const draft = mockDraftStories.find((d) => d.id === draftId);
            if (draft) {
              const contributing = getActivitiesForDraft(draft);
              items.push({ kind: 'draft', draft, contributingActivities: contributing });
            }
          }
        }

        items.push({ kind: 'activity', activity });
      }
    }

    return items;
  }, []);

  // ---- hovered draft activity IDs for highlighting ----
  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    return draftActivitySets[hoveredDraftId] ?? new Set<string>();
  }, [hoveredDraftId, draftActivitySets]);

  // ---- contributing activities for expanded draft ----
  const expandedDraftContributing = useMemo(() => {
    if (!expandedDraftId) return null;
    const draftItem = feed.find(
      (f): f is FeedItemDraft => f.kind === 'draft' && f.draft.id === expandedDraftId,
    );
    if (!draftItem) return null;
    return draftItem.contributingActivities;
  }, [expandedDraftId, feed]);

  const anyHovered = hoveredDraftId !== null;

  const totalCount = mockActivities.length;

  // ---- render ----
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Chat Bubbles
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            {totalCount} activities &middot; {mockDraftStories.length} draft stories
          </p>
        </div>

        {/* Chat window */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <div className="space-y-3">
            {feed.map((item, idx) => {
              // ---- TIMESTAMP DIVIDER ----
              if (item.kind === 'divider') {
                return (
                  <div
                    key={`divider-${item.label}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-300" />
                  </div>
                );
              }

              // ---- DRAFT SYSTEM MESSAGE ----
              if (item.kind === 'draft') {
                const { draft, contributingActivities } = item;
                const isExpanded = expandedDraftId === draft.id;

                return (
                  <div
                    key={`draft-${draft.id}`}
                    className="flex justify-center py-1"
                    onMouseEnter={() => setHoveredDraftId(draft.id)}
                    onMouseLeave={() => setHoveredDraftId(null)}
                  >
                    <div
                      className={cn(
                        'w-full max-w-md bg-purple-50 border border-purple-200 rounded-xl p-4',
                        'cursor-pointer transition-all duration-200',
                        'hover:border-purple-300 hover:shadow-md',
                        isExpanded && 'border-purple-300 shadow-md',
                      )}
                      onClick={() =>
                        setExpandedDraftId((prev) => (prev === draft.id ? null : draft.id))
                      }
                    >
                      {/* Top row: star + label + role */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-purple-500 fill-purple-500" />
                          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
                            Draft Story
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-purple-200 text-purple-600"
                        >
                          {draft.dominantRole}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1">
                        {draft.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                        {draft.description}
                      </p>

                      {/* Tool icons + topic chips */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center -space-x-1.5">
                          {draft.tools.map((tool) => (
                            <div
                              key={tool}
                              className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-purple-50 shadow-sm"
                              style={{ backgroundColor: SOURCE_META[tool].color }}
                            >
                              <SourceIcon source={tool} className="w-3 h-3 text-white" />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {draft.topics.map((topic) => (
                            <span
                              key={topic}
                              className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom row: metadata + CTA */}
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-gray-400">
                          <span>{draft.activityCount} activities</span>
                          <span className="mx-1">&middot;</span>
                          <span>{formatDateRange(draft.dateRange.start, draft.dateRange.end)}</span>
                        </div>
                        <button
                          className="bg-purple-600 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          Create Story
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Expanded: contributing activities as mini-bubble list */}
                      {isExpanded && expandedDraftContributing && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-2">
                            Contributing Activities
                          </p>
                          <div className="space-y-1.5">
                            {expandedDraftContributing.map((act) => (
                              <div
                                key={act.id}
                                className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-purple-100"
                              >
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: SOURCE_META[act.source].color }}
                                >
                                  <SourceIcon source={act.source} className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-xs text-gray-700 truncate flex-1">
                                  {act.title}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {timeAgo(act.timestamp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expand indicator */}
                      <div className="flex justify-center mt-2">
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-purple-400 transition-transform duration-200',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              // ---- ACTIVITY BUBBLE ----
              if (item.kind === 'activity') {
                const { activity } = item;
                const meta = SOURCE_META[activity.source];
                const isExpanded = expandedBubbleId === activity.id;
                const isHighlighted = hoveredDraftActivityIds.has(activity.id);
                const isDimmed = anyHovered && !isHighlighted;

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      'flex items-start gap-2.5 transition-all duration-200',
                      isDimmed && 'opacity-40',
                    )}
                  >
                    {/* Source avatar */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        'transition-all duration-200',
                        isHighlighted && 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-100',
                      )}
                      style={{ backgroundColor: meta.color }}
                    >
                      <SourceIcon source={activity.source} className="w-4 h-4 text-white" />
                    </div>

                    {/* Chat bubble */}
                    <div
                      className={cn(
                        'relative max-w-[85%] bg-white rounded-2xl rounded-tl-sm shadow-sm',
                        'px-3.5 py-2.5 cursor-pointer transition-all duration-200',
                        'hover:shadow-md',
                        isHighlighted && 'ring-2 ring-purple-300 shadow-md',
                        isExpanded && 'shadow-md',
                      )}
                      onClick={() =>
                        setExpandedBubbleId((prev) =>
                          prev === activity.id ? null : activity.id,
                        )
                      }
                    >
                      {/* Source label */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: meta.color }}
                        >
                          {meta.name}
                        </span>
                      </div>

                      {/* Message text (title) */}
                      <p className="text-sm text-gray-900 leading-snug">
                        {activity.title}
                      </p>

                      {/* Expanded description */}
                      {isExpanded && activity.description && (
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                          {activity.description}
                        </p>
                      )}

                      {/* Expanded raw data */}
                      {isExpanded && activity.rawData && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {activity.rawData.additions !== undefined && (
                            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              +{String(activity.rawData.additions)}
                            </span>
                          )}
                          {activity.rawData.deletions !== undefined && (
                            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                              -{String(activity.rawData.deletions)}
                            </span>
                          )}
                          {activity.rawData.storyPoints !== undefined && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {String(activity.rawData.storyPoints)} pts
                            </span>
                          )}
                          {activity.rawData.attendees !== undefined && (
                            <span className="text-[10px] font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                              {String(activity.rawData.attendees)} attendees
                            </span>
                          )}
                          {activity.rawData.reactions !== undefined && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              {String(activity.rawData.reactions)} reactions
                            </span>
                          )}
                          {activity.rawData.duration !== undefined && (
                            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {String(activity.rawData.duration)}min
                            </span>
                          )}
                          {activity.rawData.state !== undefined && (
                            <span className={cn(
                              'text-[10px] font-medium px-1.5 py-0.5 rounded',
                              activity.rawData.state === 'merged'
                                ? 'text-purple-600 bg-purple-50'
                                : 'text-gray-600 bg-gray-50',
                            )}>
                              {String(activity.rawData.state)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-[10px] text-gray-400 mt-1 text-right">
                        {timeAgo(activity.timestamp)}
                      </p>

                      {/* Draft link indicator */}
                      {(activityDraftMap[activity.id]?.length ?? 0) > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                          <Star className="w-2.5 h-2.5 text-purple-500 fill-purple-500" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Bottom spacer with "end of conversation" indicator */}
          <div className="flex items-center gap-3 pt-4 mt-3">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              End of timeline
            </span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
