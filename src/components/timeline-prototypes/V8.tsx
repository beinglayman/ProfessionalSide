'use client';

import React, { useState } from 'react';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  mockActivities,
  groupBySource,
  SOURCE_META,
  type ActivitySource,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ChevronDown, ChevronRight, Clock } from 'lucide-react';

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

const ROW_BG = ['bg-white', 'bg-gray-50'];

export function TimelineV8() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const grouped = groupBySource(mockActivities);

  const toggleRow = (source: string) =>
    setCollapsed((prev) => ({ ...prev, [source]: !prev[source] }));

  // Generate approximate date markers from activities
  const timeMarkers = ['Today', '2d ago', '5d ago', '1w ago', '2w+'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Swimlane View</h1>
          <p className="text-sm text-gray-500 mt-1">
            Horizontal lanes for each source — {mockActivities.length} activities
          </p>
        </div>

        {/* Time axis header */}
        <div className="flex items-center mb-2">
          <div className="w-[140px] shrink-0" />
          <div className="flex-1 flex justify-between px-4">
            {timeMarkers.map((marker) => (
              <div key={marker} className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                <Clock className="w-3 h-3" />
                {marker}
              </div>
            ))}
          </div>
        </div>

        {/* Swimlane rows */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {ALL_SOURCES.map((source, idx) => {
            const activities = (grouped[source] || []).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const isCollapsed = collapsed[source];
            const meta = SOURCE_META[source];

            return (
              <div
                key={source}
                className={cn(
                  'border-b border-gray-100 last:border-b-0',
                  ROW_BG[idx % 2]
                )}
              >
                <div className="flex items-center">
                  {/* Source label */}
                  <button
                    onClick={() => toggleRow(source)}
                    className="w-[140px] shrink-0 flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: meta.color }}
                    >
                      <SourceIcon source={source} className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                      {meta.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {activities.length}
                    </Badge>
                  </button>

                  {/* Horizontal scrollable lane */}
                  {!isCollapsed && (
                    <div className="flex-1 overflow-x-auto py-3 pr-4">
                      <div className="flex gap-3">
                        {activities.map((activity) => (
                          <div
                            key={activity.id}
                            className="shrink-0 w-[200px] bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug mb-1.5">
                              {activity.title}
                            </p>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {timeAgo(activity.timestamp)}
                            </span>
                          </div>
                        ))}
                        {activities.length === 0 && (
                          <p className="text-xs text-gray-400 py-2 px-3">No activities</p>
                        )}
                      </div>
                    </div>
                  )}

                  {isCollapsed && (
                    <div className="flex-1 py-3 px-4">
                      <p className="text-xs text-gray-400 italic">
                        {activities.length} activities hidden
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
