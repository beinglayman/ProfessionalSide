'use client';

import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockActivities,
  groupBySource,
  SOURCE_META,
  type ActivitySource,
  type MockActivity,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, MessageSquare } from 'lucide-react';

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

export function TimelineV7() {
  const [selectedSource, setSelectedSource] = useState<ActivitySource | 'all'>('all');
  const grouped = groupBySource(mockActivities);

  const displayActivities: MockActivity[] =
    selectedSource === 'all'
      ? mockActivities
      : (grouped[selectedSource] || []);

  const sortedActivities = [...displayActivities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-[220px] bg-gray-900 text-gray-300 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-400" />
            Channels
          </h2>
        </div>

        {/* All Channels */}
        <button
          onClick={() => setSelectedSource('all')}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors',
            selectedSource === 'all' && 'bg-primary-900/40 text-white border-l-2 border-primary-400'
          )}
        >
          <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center">
            <Hash className="w-3 h-3 text-gray-400" />
          </div>
          <span className="flex-1 text-left">All Channels</span>
          <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-[10px]">
            {mockActivities.length}
          </Badge>
        </button>

        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sources</p>
        </div>

        {ALL_SOURCES.map((source) => {
          const count = (grouped[source] || []).length;
          if (count === 0) return null;
          return (
            <button
              key={source}
              onClick={() => setSelectedSource(source)}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors',
                selectedSource === source && 'bg-primary-900/40 text-white border-l-2 border-primary-400'
              )}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ backgroundColor: `${SOURCE_META[source].color}40` }}
              >
                <SourceIcon source={source} className="w-3 h-3 text-gray-300" />
              </div>
              <span className="flex-1 text-left">{SOURCE_META[source].name}</span>
              <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">
                {count}
              </span>
            </button>
          );
        })}

        <div className="flex-1" />
        <div className="p-4 border-t border-gray-700">
          <p className="text-[10px] text-gray-500">
            {mockActivities.length} total activities
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
          {selectedSource === 'all' ? (
            <>
              <Hash className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">All Channels</h2>
              <span className="text-sm text-gray-400">{sortedActivities.length} messages</span>
            </>
          ) : (
            <>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: SOURCE_META[selectedSource].color }}
              >
                <SourceIcon source={selectedSource} className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {SOURCE_META[selectedSource].name}
              </h2>
              <span className="text-sm text-gray-400">{sortedActivities.length} messages</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {sortedActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 max-w-2xl">
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: SOURCE_META[activity.source].color }}
              >
                <SourceIcon source={activity.source} className="w-4 h-4 text-white" />
              </div>

              {/* Bubble */}
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {SOURCE_META[activity.source].name}
                  </span>
                  <span className="text-[11px] text-gray-400">{timeAgo(activity.timestamp)}</span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-gray-900 leading-relaxed">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
