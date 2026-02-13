'use client';

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  mockTemporalGroups,
  mockDraftStories,
  SOURCE_META,
  type ActivitySource,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, Clock } from 'lucide-react';

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

const formatRange = (start: string, end: string) => {
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${s} — ${e}`;
};

export function TimelineV4() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Full-width header */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Stream</h1>
        <p className="text-sm text-gray-500 mt-1">Your work feed and draft career stories</p>
      </div>

      <div className="max-w-7xl mx-auto flex gap-0">
        {/* Left Panel — Activity Feed (55%) */}
        <div className="w-[55%] pr-6 border-r border-gray-200">
          {mockTemporalGroups.map((group) => (
            <div key={group.key} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {group.activities.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {group.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${SOURCE_META[activity.source].color}15` }}
                    >
                      <SourceIcon source={activity.source} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-400 truncate">{activity.description}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel — Draft Stories (45%) */}
        <div className="w-[45%] pl-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Draft Stories</h2>
            <Badge className="bg-primary-100 text-primary-700 text-xs">
              {mockDraftStories.length}
            </Badge>
          </div>

          <div className="space-y-4">
            {mockDraftStories.map((story) => (
              <Card key={story.id} className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                      {story.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {story.dominantRole}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{story.description}</p>

                  {/* Tool icons */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {story.tools.map((tool) => (
                      <div
                        key={tool}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${SOURCE_META[tool].color}15` }}
                      >
                        <SourceIcon source={tool} className="w-3 h-3" />
                      </div>
                    ))}
                  </div>

                  {/* Topic chips */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {story.topics.map((topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] rounded-full font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{story.activityCount} activities</span>
                      <span>{formatRange(story.dateRange.start, story.dateRange.end)}</span>
                    </div>
                    <button className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                      Create Story
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
