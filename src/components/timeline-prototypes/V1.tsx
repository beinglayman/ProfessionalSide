'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  mockTemporalGroups,
  mockActivities,
  SOURCE_META,
  type ActivitySource,
  type TemporalGroup,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ChevronDown, ChevronRight, Filter } from 'lucide-react';

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

export function TimelineV1() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeFilters, setActiveFilters] = useState<Set<ActivitySource>>(new Set(ALL_SOURCES));

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleFilter = (source: ActivitySource) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const filteredGroups: TemporalGroup[] = mockTemporalGroups.map((g) => ({
    ...g,
    activities: g.activities.filter((a) => activeFilters.has(a.source)),
  })).filter((g) => g.activities.length > 0);

  const totalCount = filteredGroups.reduce((s, g) => s + g.activities.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Activity Timeline</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount} activities across your tools</p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {ALL_SOURCES.map((source) => (
            <button
              key={source}
              onClick={() => toggleFilter(source)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border',
                activeFilters.has(source)
                  ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                  : 'bg-gray-100 border-transparent text-gray-400'
              )}
            >
              <SourceIcon source={source} className="w-3 h-3" />
              {SOURCE_META[source].name}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Spine */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {filteredGroups.map((group) => {
            const isCollapsed = collapsed[group.key];
            return (
              <div key={group.key} className="mb-6">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="relative flex items-center gap-3 mb-3 z-10"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-white" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">{group.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.activities.length}
                  </Badge>
                </button>

                {/* Activities */}
                {!isCollapsed &&
                  group.activities.map((activity) => (
                    <div key={activity.id} className="relative flex items-start gap-4 ml-4 pl-6 pb-4">
                      {/* Dot on spine */}
                      <div
                        className="absolute left-0 top-2.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0"
                        style={{ backgroundColor: SOURCE_META[activity.source].color }}
                      />
                      {/* Card */}
                      <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${SOURCE_META[activity.source].color}18` }}
                            >
                              <SourceIcon
                                source={activity.source}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {activity.title}
                                </p>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {timeAgo(activity.timestamp)}
                                </span>
                              </div>
                              {activity.description && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
