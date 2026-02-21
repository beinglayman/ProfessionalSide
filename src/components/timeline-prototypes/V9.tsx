'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups, mockDraftStories, mockActivities, SOURCE_META,
  getActivitiesForDraft, draftActivityMap, activityDraftMap, groupBySource,
  type ActivitySource, type MockDraftStory, type MockActivity,
} from './mock-data';
import { Badge } from '../ui/badge';
import {
  GitBranch, KanbanSquare, Hash, FileText, Figma, Video,
  ChevronLeft, ChevronRight, Calendar, ArrowUpRight, Sparkles,
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
// Main Component
// ---------------------------------------------------------------------------

export function TimelineV9() {
  const [focusedDraftIndex, setFocusedDraftIndex] = useState<number>(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentDraft = mockDraftStories[focusedDraftIndex];
  const contributingActivities = useMemo(
    () => getActivitiesForDraft(currentDraft),
    [focusedDraftIndex],
  );
  const grouped = useMemo(() => {
    const raw = groupBySource(contributingActivities);
    // Filter out sources with 0 activities
    const filtered: Partial<Record<ActivitySource, MockActivity[]>> = {};
    for (const [source, acts] of Object.entries(raw)) {
      if (acts && acts.length > 0) {
        filtered[source as ActivitySource] = acts;
      }
    }
    return filtered;
  }, [contributingActivities]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setFocusedDraftIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setFocusedDraftIndex(prev => Math.min(mockDraftStories.length - 1, prev + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Scroll focused thumbnail into view
  useEffect(() => {
    const el = thumbnailRefs.current[focusedDraftIndex];
    if (el && thumbnailStripRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    // Reset expanded activity when switching drafts
    setExpandedActivityId(null);
  }, [focusedDraftIndex]);

  const goToPrev = () => setFocusedDraftIndex(prev => Math.max(0, prev - 1));
  const goToNext = () => setFocusedDraftIndex(prev => Math.min(mockDraftStories.length - 1, prev + 1));

  const isFirst = focusedDraftIndex === 0;
  const isLast = focusedDraftIndex === mockDraftStories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Focus Carousel</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mockDraftStories.length} draft stories from {mockActivities.length} activities
            {' '}&mdash; use arrows to navigate
          </p>
        </div>

        {/* ================================================================= */}
        {/* THUMBNAIL STRIP */}
        {/* ================================================================= */}
        <div
          ref={thumbnailStripRef}
          className="flex gap-3 overflow-x-auto pb-3 mb-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {mockDraftStories.map((draft, idx) => {
            const isFocused = idx === focusedDraftIndex;
            return (
              <button
                key={draft.id}
                ref={(el) => { thumbnailRefs.current[idx] = el; }}
                onClick={() => setFocusedDraftIndex(idx)}
                className={cn(
                  'min-w-[200px] p-3 rounded-xl border text-left transition-all duration-200 shrink-0',
                  isFocused
                    ? 'ring-2 ring-purple-400 bg-purple-50 border-purple-200 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
                )}
              >
                {/* Title (truncated) */}
                <p className={cn(
                  'text-sm font-semibold truncate mb-2',
                  isFocused ? 'text-purple-900' : 'text-gray-900',
                )}>
                  {draft.title}
                </p>

                {/* Tool icons + activity count */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {draft.tools.map((tool) => (
                      <div
                        key={tool}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${SOURCE_META[tool].color}18` }}
                      >
                        <SourceIcon
                          source={tool}
                          className="w-3 h-3"
                        />
                      </div>
                    ))}
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    isFocused ? 'text-purple-600' : 'text-gray-400',
                  )}>
                    {draft.activityCount} acts
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* SPOTLIGHT CARD + NAVIGATION */}
        {/* ================================================================= */}
        <div className="relative flex items-center gap-4 mb-8">
          {/* Prev button */}
          <button
            onClick={goToPrev}
            disabled={isFirst}
            className={cn(
              'w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center shrink-0 transition-colors',
              isFirst
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-gray-50 active:bg-gray-100',
            )}
            aria-label="Previous draft"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Spotlight card */}
          <div
            key={currentDraft.id}
            className="flex-1 p-8 rounded-2xl shadow-lg border-2 border-purple-200 bg-white animate-in fade-in duration-300"
          >
            {/* Top row: role badge + position indicator */}
            <div className="flex items-center justify-between mb-4">
              <Badge
                className={cn(
                  'text-xs font-bold px-3 py-1 border-none',
                  ROLE_COLORS[currentDraft.dominantRole].bg,
                  ROLE_COLORS[currentDraft.dominantRole].text,
                )}
              >
                {currentDraft.dominantRole}
              </Badge>
              <span className="text-xs text-gray-400 font-medium">
                {focusedDraftIndex + 1} / {mockDraftStories.length}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
              {currentDraft.title}
            </h2>

            {/* Full description */}
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {currentDraft.description}
            </p>

            {/* Tool icons row (large) */}
            <div className="flex items-center gap-3 mb-4">
              {currentDraft.tools.map((tool) => (
                <div
                  key={tool}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: `${SOURCE_META[tool].color}12` }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: SOURCE_META[tool].color }}
                  >
                    <SourceIcon source={tool} className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: SOURCE_META[tool].color }}
                  >
                    {SOURCE_META[tool].name}
                  </span>
                </div>
              ))}
            </div>

            {/* Topic chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {currentDraft.topics.map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="text-xs font-medium bg-gray-100 text-gray-700 border-none"
                >
                  {topic}
                </Badge>
              ))}
            </div>

            {/* Date range + activity count */}
            <div className="flex items-center gap-4 mb-5 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDateRange(currentDraft.dateRange.start, currentDraft.dateRange.end)}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-gray-600">
                {currentDraft.activityCount} activities
              </span>
            </div>

            {/* Create Story CTA */}
            <button
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold',
                'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800',
                'transition-colors shadow-sm',
              )}
            >
              <Sparkles className="w-4 h-4" />
              Create Story
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Next button */}
          <button
            onClick={goToNext}
            disabled={isLast}
            className={cn(
              'w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center shrink-0 transition-colors',
              isLast
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-gray-50 active:bg-gray-100',
            )}
            aria-label="Next draft"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* ACTIVITY PANEL */}
        {/* ================================================================= */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Contributing Activities</h3>
          <p className="text-xs text-gray-500 mb-4">
            {contributingActivities.length} activities across{' '}
            {Object.keys(grouped).length} sources
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(grouped).map(([source, activities]) => {
            const src = source as ActivitySource;
            const meta = SOURCE_META[src];

            return (
              <div key={src} className="space-y-2">
                {/* Source group header */}
                <div className="flex items-center gap-2 px-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: meta.color }}
                  >
                    <SourceIcon source={src} className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {meta.name}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {activities!.length}
                  </span>
                </div>

                {/* Activity cards */}
                {activities!.map((activity) => {
                  const isExpanded = expandedActivityId === activity.id;
                  return (
                    <button
                      key={activity.id}
                      onClick={() =>
                        setExpandedActivityId(prev =>
                          prev === activity.id ? null : activity.id,
                        )
                      }
                      className={cn(
                        'w-full text-left rounded-lg bg-white border border-gray-100 p-3 shadow-sm',
                        'hover:shadow-md hover:border-gray-200 transition-all duration-200',
                        isExpanded && 'ring-1 ring-purple-200 border-purple-100',
                      )}
                      style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {activity.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                          {timeAgo(activity.timestamp)}
                        </span>
                      </div>

                      {activity.description && (
                        <p
                          className={cn(
                            'text-xs text-gray-500 mt-1.5 leading-relaxed',
                            !isExpanded && 'line-clamp-1',
                          )}
                        >
                          {activity.description}
                        </p>
                      )}

                      {/* Expanded details */}
                      {isExpanded && activity.rawData && (
                        <div className="mt-3 pt-2.5 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(activity.rawData).map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md"
                              >
                                <span className="font-medium text-gray-800">{key}:</span>
                                <span>{String(value)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {contributingActivities.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No contributing activities found for this draft.</p>
          </div>
        )}

        {/* Bottom navigation dots */}
        <div className="flex items-center justify-center gap-2 mt-10 mb-4">
          {mockDraftStories.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setFocusedDraftIndex(idx)}
              className={cn(
                'rounded-full transition-all duration-200',
                idx === focusedDraftIndex
                  ? 'w-8 h-2.5 bg-purple-500'
                  : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400',
              )}
              aria-label={`Go to draft ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
