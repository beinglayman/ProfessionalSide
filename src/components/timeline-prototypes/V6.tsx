'use client';

import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockTemporalGroups,
  SOURCE_META,
  type ActivitySource,
  type MockActivity,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ChevronDown, ChevronUp } from 'lucide-react';

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

type SortCol = 'time' | 'source' | 'title';

function getDetails(activity: MockActivity): string {
  const rd = activity.rawData as Record<string, unknown> | undefined;
  if (!rd) return '—';
  switch (activity.source) {
    case 'github': return `PR #${rd.number} · +${rd.additions}/-${rd.deletions} · ${rd.commits} commits`;
    case 'jira': return `${rd.key} · ${rd.priority} · ${rd.storyPoints} pts`;
    case 'slack': return `#${rd.channelId} · ${rd.reactions} reactions`;
    case 'google-meet': return `${rd.attendees} attendees · ${rd.duration}min`;
    case 'figma': return `File: ${rd.fileKey}`;
    default: return '—';
  }
}

export function TimelineV6() {
  const [sortCol, setSortCol] = useState<SortCol>('time');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc((p) => !p);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortIndicator = ({ col }: { col: SortCol }) =>
    sortCol === col ? (
      sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3 opacity-30" />
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Activity Table</h1>
          <p className="text-sm text-gray-500 mt-1">Dense spreadsheet view of all activities</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[100px_100px_1fr_1.2fr_180px] bg-gray-50 border-b border-gray-200">
            <button
              onClick={() => handleSort('time')}
              className="flex items-center gap-1 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
            >
              Time <SortIndicator col="time" />
            </button>
            <button
              onClick={() => handleSort('source')}
              className="flex items-center gap-1 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
            >
              Source <SortIndicator col="source" />
            </button>
            <button
              onClick={() => handleSort('title')}
              className="flex items-center gap-1 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
            >
              Title <SortIndicator col="title" />
            </button>
            <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Description
            </div>
            <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Details
            </div>
          </div>

          {/* Grouped Rows */}
          {mockTemporalGroups.map((group) => {
            const sorted = [...group.activities].sort((a, b) => {
              let cmp = 0;
              switch (sortCol) {
                case 'time': cmp = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); break;
                case 'source': cmp = a.source.localeCompare(b.source); break;
                case 'title': cmp = a.title.localeCompare(b.title); break;
              }
              return sortAsc ? -cmp : cmp;
            });

            return (
              <React.Fragment key={group.key}>
                {/* Group separator */}
                <div className="grid grid-cols-[1fr] bg-primary-50 border-y border-primary-100 sticky top-0 z-10">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                      {group.label}
                    </span>
                    <Badge className="bg-primary-100 text-primary-700 text-[10px]">
                      {group.activities.length}
                    </Badge>
                  </div>
                </div>

                {/* Data rows */}
                {sorted.map((activity, idx) => (
                  <div
                    key={activity.id}
                    className={cn(
                      'grid grid-cols-[100px_100px_1fr_1.2fr_180px] border-b border-gray-100 hover:bg-gray-50 transition-colors',
                      idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                    )}
                  >
                    <div className="px-4 py-2.5 text-xs text-gray-400 flex items-center">
                      {timeAgo(activity.timestamp)}
                    </div>
                    <div className="px-4 py-2.5 flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${SOURCE_META[activity.source].color}15` }}
                      >
                        <SourceIcon source={activity.source} className="w-3 h-3" />
                      </div>
                      <span className="text-xs text-gray-600 hidden lg:inline">
                        {SOURCE_META[activity.source].name}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 text-sm font-medium text-gray-900 truncate flex items-center">
                      {activity.title}
                    </div>
                    <div className="px-4 py-2.5 text-xs text-gray-500 truncate flex items-center">
                      {activity.description || '—'}
                    </div>
                    <div className="px-4 py-2.5 text-[11px] text-gray-500 truncate flex items-center">
                      {getDetails(activity)}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
