'use client';

import { useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  mockStories, mockStoryStats, CATEGORY_META, FRAMEWORK_META, STATUS_META, SECTION_COLORS, TOOL_META,
  getConfidenceLevel,
} from './mock-data';
import { BookOpen, Eye, TrendingUp, Award, ChevronDown, FileText, GitBranch, SquareKanban, Hash, Figma, Video } from 'lucide-react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, RadialLinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, RadialLinearScale, Tooltip, Legend);

function ToolIcon({ tool, className }: { tool: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <SquareKanban className={className} />,
    confluence: <FileText className={className} />,
    slack: <Hash className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[tool] || <FileText className={className} />}</>;
}

const DOUGHNUT_COLORS = ['#3B82F6', '#9333EA', '#10B981', '#F59E0B'];

export function StoriesV10() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const avgConf = mockStoryStats.avgConfidence;

  // Doughnut data — category breakdown
  const doughnutData = {
    labels: mockStoryStats.byCategory.map(c => CATEGORY_META[c.category].label),
    datasets: [{
      data: mockStoryStats.byCategory.map(c => c.count),
      backgroundColor: DOUGHNUT_COLORS,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { size: 11 }, padding: 12 } },
    },
    cutout: '65%',
  };

  // Bar data — confidence per story
  const barData = {
    labels: mockStories.map(s => s.title.slice(0, 25) + '...'),
    datasets: [{
      label: 'Confidence %',
      data: mockStories.map(s => Math.round(s.overallConfidence * 100)),
      backgroundColor: mockStories.map(s =>
        s.overallConfidence >= 0.8 ? '#10B981' : s.overallConfidence >= 0.6 ? '#F59E0B' : '#EF4444'
      ),
      borderRadius: 4,
      barThickness: 20,
    }],
  };

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { max: 100, grid: { color: '#F3F4F6' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mockStoryStats.total}</p>
              <p className="text-xs text-gray-500">Total Stories</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Eye className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mockStoryStats.published}</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            {/* Confidence gauge */}
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3"
                  strokeDasharray={`${(avgConf / 100) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-700">
                {avgConf}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgConf}%</p>
              <p className="text-xs text-gray-500">Avg Confidence</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mockStoryStats.totalActivities}</p>
              <p className="text-xs text-gray-500">Total Activities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Category Breakdown</h3>
            <div style={{ height: 220 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Confidence per Story</h3>
            <div style={{ height: 220 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Story list */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {mockStories.map(story => {
              const cat = CATEGORY_META[story.category];
              const status = STATUS_META[story.status];
              const conf = getConfidenceLevel(story.overallConfidence);
              const expanded = expandedId === story.id;
              const dateStr = new Date(story.dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={story.id}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : story.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Status dot */}
                    <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', status.dotColor)} />

                    {/* Title */}
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{story.title}</span>

                    {/* Framework chip */}
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex-shrink-0">
                      {FRAMEWORK_META[story.framework].label}
                    </Badge>

                    {/* Category */}
                    <Badge className={cn(cat.bgColor, cat.color, 'border-0 text-[9px] px-1.5 py-0 flex-shrink-0')}>
                      {cat.label}
                    </Badge>

                    {/* Confidence bar */}
                    <div className="w-20 flex-shrink-0">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full">
                        <div
                          className={cn('h-full rounded-full', story.overallConfidence >= 0.8 ? 'bg-emerald-500' : story.overallConfidence >= 0.6 ? 'bg-amber-500' : 'bg-red-400')}
                          style={{ width: `${story.overallConfidence * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="flex gap-1 flex-shrink-0">
                      {story.tools.slice(0, 3).map(t => (
                        <ToolIcon key={t} tool={t} className="h-3 w-3 text-gray-400" />
                      ))}
                      {story.tools.length > 3 && <span className="text-[9px] text-gray-400">+{story.tools.length - 3}</span>}
                    </div>

                    {/* Date */}
                    <span className="text-[10px] text-gray-400 w-14 text-right flex-shrink-0">{dateStr}</span>

                    {/* Expand icon */}
                    <ChevronDown className={cn('h-4 w-4 text-gray-300 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
                  </button>

                  {/* Expanded sections */}
                  {expanded && (
                    <div className="px-10 pb-4 space-y-3 animate-in fade-in-0 slide-in-from-top-1">
                      {story.sections.map(sec => {
                        const secConf = getConfidenceLevel(sec.confidence);
                        return (
                          <div key={sec.key} className={cn('border-l-3 pl-4', SECTION_COLORS[sec.key] || 'border-gray-300')}>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{sec.label}</h4>
                              <span className={cn('text-[10px] font-medium', secConf.color)}>{Math.round(sec.confidence * 100)}%</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{sec.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
