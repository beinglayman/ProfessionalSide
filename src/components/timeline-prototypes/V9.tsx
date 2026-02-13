'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockActivities,
  mockDraftStories,
  SOURCE_META,
  type ActivitySource,
  type MockActivity,
  type MockDraftStory,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ArrowLeft, ArrowRight, Filter } from 'lucide-react';

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

const ALL_SOURCES: ActivitySource[] = ['github', 'jira', 'slack', 'confluence', 'figma', 'google-meet'];

type CarouselItem = { type: 'activity'; data: MockActivity } | { type: 'story'; data: MockDraftStory };

function RawDataField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500 capitalize">{label.replace(/([A-Z])/g, ' $1')}</span>
      <span className="text-xs font-medium text-gray-900">{String(value)}</span>
    </div>
  );
}

export function TimelineV9() {
  const [activeFilters, setActiveFilters] = useState<Set<ActivitySource>>(new Set(ALL_SOURCES));
  const [currentIndex, setCurrentIndex] = useState(0);

  const toggleFilter = (source: ActivitySource) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const items: CarouselItem[] = useMemo(() => {
    const activities = mockActivities
      .filter((a) => activeFilters.has(a.source))
      .map((a) => ({ type: 'activity' as const, data: a }));
    const stories = mockDraftStories.map((s) => ({ type: 'story' as const, data: s }));
    return [...activities, ...stories];
  }, [activeFilters]);

  const clampedIndex = Math.min(currentIndex, Math.max(0, items.length - 1));
  const current = items[clampedIndex];

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(items.length - 1, i + 1));

  if (!current) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">No activities match your filter.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Focus View</h1>
          <p className="text-sm text-gray-500 mt-1">Browse activities one at a time</p>
        </div>

        {/* Source filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {ALL_SOURCES.map((source) => (
            <button
              key={source}
              onClick={() => toggleFilter(source)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                activeFilters.has(source) ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-400'
              )}
              style={activeFilters.has(source) ? { backgroundColor: SOURCE_META[source].color } : undefined}
            >
              <SourceIcon source={source} className="w-3 h-3" />
              {SOURCE_META[source].name}
            </button>
          ))}
        </div>

        {/* Carousel Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goPrev}
            disabled={clampedIndex === 0}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-500">
            {clampedIndex + 1} of {items.length}
          </span>
          <button
            onClick={goNext}
            disabled={clampedIndex === items.length - 1}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Current Item Card */}
        {current.type === 'activity' ? (
          <Card className="shadow-lg border-t-4" style={{ borderTopColor: SOURCE_META[current.data.source].color }}>
            <CardContent className="p-8">
              {/* Source + time */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: SOURCE_META[current.data.source].color }}
                >
                  <SourceIcon source={current.data.source} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {SOURCE_META[current.data.source].name}
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(current.data.timestamp)}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">Activity</Badge>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-3">{current.data.title}</h2>

              {/* Description */}
              {current.data.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-6">{current.data.description}</p>
              )}

              {/* Raw data fields */}
              {current.data.rawData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Details</p>
                  {Object.entries(current.data.rawData).map(([k, v]) => (
                    <RawDataField key={k} label={k} value={v} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-t-4 border-t-primary-500">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-700">Draft Story</p>
                  <p className="text-xs text-gray-400">{current.data.activityCount} activities</p>
                </div>
                <Badge className="ml-auto bg-primary-100 text-primary-700 text-xs">
                  {current.data.dominantRole}
                </Badge>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-3">{current.data.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{current.data.description}</p>

              {/* Tools */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">Tools:</span>
                {current.data.tools.map((tool) => (
                  <div
                    key={tool}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${SOURCE_META[tool].color}15` }}
                  >
                    <SourceIcon source={tool} className="w-3.5 h-3.5" />
                  </div>
                ))}
              </div>

              {/* Topics */}
              <div className="flex flex-wrap gap-1.5">
                {current.data.topics.map((topic) => (
                  <span key={topic} className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs rounded-full font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
