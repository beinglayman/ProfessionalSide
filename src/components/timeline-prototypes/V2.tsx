'use client';

import React from 'react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  mockActivities,
  groupBySource,
  SOURCE_META,
  type ActivitySource,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video } from 'lucide-react';

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

const TINT_MAP: Record<ActivitySource, string> = {
  github: 'bg-gray-50',
  jira: 'bg-blue-50',
  slack: 'bg-purple-50',
  confluence: 'bg-slate-50',
  figma: 'bg-orange-50',
  'google-meet': 'bg-teal-50',
};

export function TimelineV2() {
  const grouped = groupBySource(mockActivities);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Board</h1>
        <p className="text-sm text-gray-500 mt-1">
          {mockActivities.length} activities organized by source
        </p>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ALL_SOURCES.map((source) => {
          const activities = (grouped[source] || []).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          const meta = SOURCE_META[source];

          return (
            <div
              key={source}
              className={`flex-shrink-0 w-72 rounded-xl ${TINT_MAP[source]} border border-gray-200`}
            >
              {/* Column header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: meta.color }}
                  >
                    <SourceIcon source={source} className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{meta.name}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {activities.length}
                  </Badge>
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
                {activities.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No activities</p>
                )}
                {activities.map((activity) => (
                  <Card key={activity.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-gray-500 mt-1.5 truncate">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{timeAgo(activity.timestamp)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
