'use client';

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  mockActivities,
  mockDraftStories,
  mockStats,
  SOURCE_META,
  type ActivitySource,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, BarChart3, Clock } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

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

export function TimelineV10() {
  // Find most active source
  const sortedSources = [...mockStats.bySource].sort((a, b) => b.count - a.count);
  const mostActive = sortedSources[0];

  // Chart data
  const chartData = {
    labels: sortedSources.map((s) => SOURCE_META[s.source].name),
    datasets: [
      {
        label: 'Activities',
        data: sortedSources.map((s) => s.count),
        backgroundColor: sortedSources.map((s) => SOURCE_META[s.source].color),
        borderRadius: 6,
        barThickness: 28,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { stepSize: 1, font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: '500' as const } },
      },
    },
  };

  const sortedActivities = [...mockActivities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Activity Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your professional activity</p>
        </div>

        {/* Stats Hero */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Total Activities
              </p>
              <p className="text-3xl font-bold text-gray-900">{mockStats.totalActivities}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Sources Connected
              </p>
              <p className="text-3xl font-bold text-gray-900">{mockStats.bySource.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Draft Stories
              </p>
              <p className="text-3xl font-bold text-primary-600">{mockStats.draftStoryCount}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                Most Active
              </p>
              <div className="flex items-center gap-2">
                <SourceIcon source={mostActive.source} className="w-5 h-5 text-gray-700" />
                <p className="text-lg font-bold text-gray-900">
                  {SOURCE_META[mostActive.source].name}
                </p>
              </div>
              <p className="text-xs text-gray-400">{mostActive.count} activities</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Activity by Source</h2>
            </div>
            <div className="h-[220px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Compact Activity List */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h2>
            <div className="divide-y divide-gray-100">
              {sortedActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${SOURCE_META[activity.source].color}15` }}
                  >
                    <SourceIcon source={activity.source} className="w-3 h-3" />
                  </div>
                  <p className="text-sm text-gray-900 truncate flex-1">{activity.title}</p>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Draft Stories Banners */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Draft Stories</h2>
          {mockDraftStories.map((story) => (
            <div
              key={story.id}
              className="rounded-xl p-5 text-white shadow-md"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-white/20 text-white text-[10px] border-0">
                      {story.dominantRole}
                    </Badge>
                    <span className="text-xs text-white/70">
                      {story.activityCount} activities
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{story.title}</h3>
                  <p className="text-sm text-white/80 line-clamp-2 mb-3">{story.description}</p>

                  <div className="flex items-center gap-4">
                    {/* Tool icons */}
                    <div className="flex items-center gap-1.5">
                      {story.tools.map((tool) => (
                        <div
                          key={tool}
                          className="w-6 h-6 rounded bg-white/20 flex items-center justify-center"
                        >
                          <SourceIcon source={tool} className="w-3.5 h-3.5 text-white" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-white/60">
                      {formatRange(story.dateRange.start, story.dateRange.end)}
                    </span>
                  </div>
                </div>
                <button className="shrink-0 bg-white text-primary-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors">
                  Create Story
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
