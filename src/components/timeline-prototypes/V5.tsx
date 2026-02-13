'use client';

import React, { useState } from 'react';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  mockActivities,
  SOURCE_META,
  type ActivitySource,
  type MockActivity,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, Filter } from 'lucide-react';

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

function GithubCard({ activity }: { activity: MockActivity }) {
  const rd = activity.rawData as Record<string, number> | undefined;
  const adds = rd?.additions ?? 0;
  const dels = rd?.deletions ?? 0;
  const total = adds + dels || 1;
  return (
    <>
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-2">{activity.title}</p>
      {activity.description && <p className="text-xs text-gray-500 mb-3">{activity.description}</p>}
      {rd && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">PR #{rd.number}</p>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex">
            <div className="bg-green-500 h-full" style={{ width: `${(adds / total) * 100}%` }} />
            <div className="bg-red-400 h-full" style={{ width: `${(dels / total) * 100}%` }} />
          </div>
          <div className="flex gap-3 text-[10px] text-gray-500">
            <span className="text-green-600">+{adds}</span>
            <span className="text-red-500">-{dels}</span>
            <span>{rd.commits} commits</span>
            <span>{rd.reviews} reviews</span>
          </div>
        </div>
      )}
    </>
  );
}

function JiraCard({ activity }: { activity: MockActivity }) {
  const rd = activity.rawData as Record<string, unknown> | undefined;
  return (
    <>
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-2">{activity.title}</p>
      {activity.description && <p className="text-xs text-gray-500 mb-2">{activity.description}</p>}
      {rd && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{rd.priority as string}</Badge>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {rd.status as string}
          </span>
          <span className="text-[10px] text-gray-500">{rd.storyPoints as number} pts</span>
        </div>
      )}
    </>
  );
}

function DefaultCard({ activity }: { activity: MockActivity }) {
  const rd = activity.rawData as Record<string, unknown> | undefined;
  return (
    <>
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{activity.title}</p>
      {activity.description && <p className="text-xs text-gray-500 mb-2">{activity.description}</p>}
      {rd && activity.source === 'slack' && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>#{rd.channelId as string}</span>
          <span>{rd.reactions as number} reactions</span>
        </div>
      )}
      {rd && activity.source === 'google-meet' && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>{rd.attendees as number} attendees</span>
          <span>{rd.duration as number}min</span>
        </div>
      )}
      {rd && activity.source === 'figma' && (
        <div className="text-[10px] text-gray-500">File: {rd.fileKey as string}</div>
      )}
    </>
  );
}

export function TimelineV5() {
  const [activeFilters, setActiveFilters] = useState<Set<ActivitySource>>(new Set(ALL_SOURCES));

  const toggleFilter = (source: ActivitySource) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const filtered = mockActivities.filter((a) => activeFilters.has(a.source));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Magazine View</h1>
          <p className="text-sm text-gray-500 mt-1">Rich activity cards in a masonry layout</p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {ALL_SOURCES.map((source) => (
            <button
              key={source}
              onClick={() => toggleFilter(source)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                activeFilters.has(source)
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400'
              )}
              style={activeFilters.has(source) ? { backgroundColor: SOURCE_META[source].color } : undefined}
            >
              <SourceIcon source={source} className="w-3 h-3" />
              {SOURCE_META[source].name}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <div className="columns-3 gap-4 space-y-4">
          {filtered.map((activity) => (
            <div
              key={activity.id}
              className="break-inside-avoid bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
            >
              {/* Colored top border */}
              <div className="h-1" style={{ backgroundColor: SOURCE_META[activity.source].color }} />
              <div className="p-4">
                {/* Source badge + time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <SourceIcon source={activity.source} className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] font-medium text-gray-500 uppercase">
                      {SOURCE_META[activity.source].name}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{timeAgo(activity.timestamp)}</span>
                </div>

                {/* Content varies by source */}
                {activity.source === 'github' && <GithubCard activity={activity} />}
                {activity.source === 'jira' && <JiraCard activity={activity} />}
                {!['github', 'jira'].includes(activity.source) && <DefaultCard activity={activity} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
