'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories,
  mockStoryStats,
  CATEGORY_META,
  FRAMEWORK_META,
  STATUS_META,
  getConfidenceLevel,
  type StoryCategory,
  type StoryStatus,
} from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  Hash,
  FileText,
  Figma,
  Video,
  BookOpen,
  Eye,
  TrendingUp,
  Award,
  ChevronDown,
  BarChart3,
  PieChart,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

function ToolIcon({ tool, className }: { tool: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <KanbanSquare className={className} />,
    confluence: <FileText className={className} />,
    slack: <Hash className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[tool] || <FileText className={className} />}</>;
}

type SortColumn = 'title' | 'status' | 'framework' | 'confidence' | 'wordCount' | 'dateRange';
type SortDirection = 'asc' | 'desc';

export function StoriesV20() {
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('confidence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedStatus, setSelectedStatus] = useState<StoryStatus | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [hoveredKPI, setHoveredKPI] = useState<string | null>(null);

  // Calculate metrics
  const totalStories = mockStories.length;
  const publishedCount = mockStories.filter((s) => s.status === 'published').length;
  const avgConfidence = Math.round(
    mockStories.reduce((sum, s) => sum + s.overallConfidence, 0) / totalStories
  );
  const totalWords = mockStories.reduce((sum, s) => sum + s.wordCount, 0);
  const avgWords = Math.round(totalWords / totalStories);

  // Status distribution (for funnel)
  const statusCounts = {
    draft: mockStories.filter((s) => s.status === 'draft').length,
    'needs-polish': mockStories.filter((s) => s.status === 'needs-polish').length,
    saved: mockStories.filter((s) => s.status === 'saved').length,
    published: mockStories.filter((s) => s.status === 'published').length,
  };

  // Category breakdown
  const categoryData = Object.entries(
    mockStories.reduce((acc, story) => {
      acc[story.category] = (acc[story.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, count]) => ({
    category: category as StoryCategory,
    count,
    percentage: (count / totalStories) * 100,
  }));

  // Confidence distribution (histogram bins)
  const confidenceBins = [
    { label: '0-20', min: 0, max: 20, count: 0 },
    { label: '21-40', min: 21, max: 40, count: 0 },
    { label: '41-60', min: 41, max: 60, count: 0 },
    { label: '61-80', min: 61, max: 80, count: 0 },
    { label: '81-100', min: 81, max: 100, count: 0 },
  ];
  mockStories.forEach((story) => {
    const bin = confidenceBins.find(
      (b) => story.overallConfidence >= b.min && story.overallConfidence <= b.max
    );
    if (bin) bin.count++;
  });
  const maxBinCount = Math.max(...confidenceBins.map((b) => b.count));

  // Framework usage
  const frameworkData = Object.entries(
    mockStories.reduce((acc, story) => {
      acc[story.framework] = (acc[story.framework] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([framework, count]) => ({
    framework,
    count,
    percentage: (count / totalStories) * 100,
  }));

  // Sort stories
  const filteredStories = selectedStatus
    ? mockStories.filter((s) => s.status === selectedStatus)
    : mockStories;

  const sortedStories = [...filteredStories].sort((a, b) => {
    let aVal: any = a[sortColumn];
    let bVal: any = b[sortColumn];

    if (sortColumn === 'confidence') {
      aVal = a.overallConfidence;
      bVal = b.overallConfidence;
    } else if (sortColumn === 'title') {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
    } else if (sortColumn === 'status') {
      aVal = a.status;
      bVal = b.status;
    } else if (sortColumn === 'framework') {
      aVal = a.framework;
      bVal = b.framework;
    } else if (sortColumn === 'wordCount') {
      aVal = a.wordCount;
      bVal = b.wordCount;
    } else if (sortColumn === 'dateRange') {
      aVal = a.dateRange;
      bVal = b.dateRange;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-500" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-500" />
    );
  };

  // KPI cards data
  const kpiCards = [
    {
      id: 'total',
      label: 'Total Stories',
      value: totalStories,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+2 this month',
    },
    {
      id: 'published',
      label: 'Published',
      value: publishedCount,
      icon: Eye,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: `${Math.round((publishedCount / totalStories) * 100)}% complete`,
    },
    {
      id: 'confidence',
      label: 'Avg Confidence',
      value: `${avgConfidence}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+5% from last week',
    },
    {
      id: 'quality',
      label: 'Avg Word Count',
      value: avgWords,
      icon: Award,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      trend: `${totalWords} total words`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">
              Portfolio insights and story metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            {selectedStatus ? (
              <Badge
                className="cursor-pointer"
                onClick={() => setSelectedStatus(null)}
              >
                {STATUS_META[selectedStatus].label} (click to clear)
              </Badge>
            ) : (
              <span className="text-sm text-slate-500">No filter applied</span>
            )}
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-12 gap-4">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.id}
              className={cn(
                'col-span-3 cursor-pointer transition-all hover:shadow-md',
                hoveredKPI === kpi.id && 'ring-2 ring-blue-400'
              )}
              onMouseEnter={() => setHoveredKPI(kpi.id)}
              onMouseLeave={() => setHoveredKPI(null)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">{kpi.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{kpi.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{kpi.trend}</p>
                  </div>
                  <div className={cn('p-3 rounded-lg', kpi.bgColor)}>
                    <kpi.icon className={cn('h-6 w-6', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Status Funnel */}
          <Card
            className={cn(
              'col-span-4 transition-all',
              hoveredPanel === 'funnel' && 'ring-2 ring-blue-400'
            )}
            onMouseEnter={() => setHoveredPanel('funnel')}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-600" />
                Status Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Funnel visualization */}
                <div className="relative">
                  {(['draft', 'needs-polish', 'saved', 'published'] as StoryStatus[]).map(
                    (status, idx) => {
                      const count = statusCounts[status];
                      const maxCount = Math.max(...Object.values(statusCounts));
                      const width = (count / maxCount) * 100;
                      const meta = STATUS_META[status];

                      return (
                        <div
                          key={status}
                          className="mb-2 cursor-pointer group"
                          onClick={() =>
                            setSelectedStatus(selectedStatus === status ? null : status)
                          }
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">
                              {meta.label}
                            </span>
                            <span className="text-slate-500">
                              {count} ({Math.round((count / totalStories) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
                            <div
                              className={cn(
                                'h-full flex items-center justify-center text-xs font-medium text-white transition-all group-hover:opacity-80',
                                meta.bgColor.replace('bg-', 'bg-opacity-100 bg-')
                              )}
                              style={{
                                width: `${width}%`,
                                background: meta.bgColor.includes('emerald')
                                  ? '#10b981'
                                  : meta.bgColor.includes('blue')
                                  ? '#3b82f6'
                                  : meta.bgColor.includes('amber')
                                  ? '#f59e0b'
                                  : '#6b7280',
                              }}
                            >
                              {count > 0 && count}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Click a segment to filter the story table
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card
            className={cn(
              'col-span-4 transition-all',
              hoveredPanel === 'categories' && 'ring-2 ring-blue-400'
            )}
            onMouseEnter={() => setHoveredPanel('categories')}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-slate-600" />
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map(({ category, count, percentage }) => {
                  const meta = CATEGORY_META[category];
                  return (
                    <div key={category} className="group cursor-pointer">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-700">{meta.label}</span>
                        <span className="text-slate-500">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className={cn(
                            'h-full flex items-center px-2 text-xs font-medium transition-all group-hover:opacity-80',
                            meta.bgColor,
                            meta.color
                          )}
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 15 && `${Math.round(percentage)}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Most common:</span>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_META[categoryData[0].category].label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confidence Distribution */}
          <Card
            className={cn(
              'col-span-4 transition-all',
              hoveredPanel === 'confidence' && 'ring-2 ring-blue-400'
            )}
            onMouseEnter={() => setHoveredPanel('confidence')}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-600" />
                Confidence Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Histogram */}
                <div className="flex items-end justify-between h-32 gap-2">
                  {confidenceBins.map((bin) => {
                    const heightPercent = maxBinCount > 0 ? (bin.count / maxBinCount) * 100 : 0;
                    return (
                      <div key={bin.label} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end h-full">
                          <div
                            className={cn(
                              'w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t transition-all hover:opacity-80',
                              bin.count === 0 && 'opacity-20'
                            )}
                            style={{ height: `${heightPercent}%` }}
                          >
                            {bin.count > 0 && (
                              <div className="text-center text-xs font-bold text-white pt-1">
                                {bin.count}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-600 font-medium">
                          {bin.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Average:</span>
                    <span className="font-medium text-slate-700">{avgConfidence}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Range:</span>
                    <span className="font-medium text-slate-700">
                      {Math.min(...mockStories.map((s) => s.overallConfidence))}% -{' '}
                      {Math.max(...mockStories.map((s) => s.overallConfidence))}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Framework Usage */}
          <Card
            className={cn(
              'col-span-6 transition-all',
              hoveredPanel === 'frameworks' && 'ring-2 ring-blue-400'
            )}
            onMouseEnter={() => setHoveredPanel('frameworks')}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-slate-600" />
                Framework Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                {/* Donut chart using conic gradient */}
                <div className="relative">
                  <div
                    className="w-32 h-32 rounded-full"
                    style={{
                      background: `conic-gradient(
                        from 0deg,
                        #3b82f6 0deg ${frameworkData[0]?.percentage * 3.6 || 0}deg,
                        #8b5cf6 ${frameworkData[0]?.percentage * 3.6 || 0}deg ${
                        (frameworkData[0]?.percentage + frameworkData[1]?.percentage) * 3.6 || 0
                      }deg,
                        #10b981 ${
                          (frameworkData[0]?.percentage + frameworkData[1]?.percentage) * 3.6 || 0
                        }deg 360deg
                      )`,
                    }}
                  >
                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{totalStories}</div>
                        <div className="text-xs text-slate-500">stories</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {frameworkData.map(({ framework, count, percentage }, idx) => {
                    const colors = ['#3b82f6', '#8b5cf6', '#10b981'];
                    const meta = FRAMEWORK_META[framework];
                    return (
                      <div key={framework} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors[idx] }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              {meta?.label || framework.toUpperCase()}
                            </span>
                            <span className="text-sm text-slate-500">
                              {count} ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: colors[idx],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                      Most used: {FRAMEWORK_META[frameworkData[0].framework]?.label || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Story Table */}
          <Card
            className={cn(
              'col-span-6 transition-all',
              hoveredPanel === 'table' && 'ring-2 ring-blue-400'
            )}
            onMouseEnter={() => setHoveredPanel('table')}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-600" />
                Story Details
                {selectedStatus && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {sortedStories.length} filtered
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-slate-200 text-xs font-medium text-slate-600 sticky top-0 bg-white">
                  <button
                    className="col-span-4 flex items-center gap-1 hover:text-slate-900"
                    onClick={() => handleSort('title')}
                  >
                    Title <SortIcon column="title" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-slate-900"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIcon column="status" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-slate-900"
                    onClick={() => handleSort('framework')}
                  >
                    Framework <SortIcon column="framework" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-slate-900"
                    onClick={() => handleSort('confidence')}
                  >
                    Confidence <SortIcon column="confidence" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-slate-900"
                    onClick={() => handleSort('wordCount')}
                  >
                    Words <SortIcon column="wordCount" />
                  </button>
                </div>

                {/* Table rows */}
                {sortedStories.map((story) => {
                  const isExpanded = expandedStoryId === story.id;
                  const statusMeta = STATUS_META[story.status];
                  const frameworkMeta = FRAMEWORK_META[story.framework];
                  const confidenceLevel = getConfidenceLevel(story.overallConfidence);

                  return (
                    <div key={story.id} className="border-b border-slate-100 last:border-0">
                      <div
                        className={cn(
                          'grid grid-cols-12 gap-2 py-2 text-xs cursor-pointer hover:bg-slate-50 rounded transition-colors',
                          isExpanded && 'bg-blue-50 hover:bg-blue-50'
                        )}
                        onClick={() =>
                          setExpandedStoryId(isExpanded ? null : story.id)
                        }
                      >
                        <div className="col-span-4 flex items-center gap-2 truncate">
                          <ChevronDown
                            className={cn(
                              'h-3 w-3 text-slate-400 flex-shrink-0 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                          <span className="font-medium text-slate-700 truncate">
                            {story.title}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          <div
                            className={cn('w-2 h-2 rounded-full', statusMeta.dotColor)}
                          />
                          <span className="text-slate-600">{statusMeta.label}</span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <Badge variant="outline" className="text-xs">
                            {frameworkMeta?.label || story.framework.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                confidenceLevel.color === 'text-red-600' && 'bg-red-500',
                                confidenceLevel.color === 'text-amber-600' && 'bg-amber-500',
                                confidenceLevel.color === 'text-emerald-600' &&
                                  'bg-emerald-500'
                              )}
                              style={{ width: `${story.overallConfidence}%` }}
                            />
                          </div>
                          <span className="text-slate-600 w-8 text-right">
                            {story.overallConfidence}%
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center text-slate-600">
                          {story.wordCount.toLocaleString()}
                        </div>
                      </div>

                      {/* Expanded section details */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 space-y-2 bg-blue-50/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-600">
                              Sections:
                            </span>
                            {story.sections.map((section) => {
                              const sectionConfidence = getConfidenceLevel(
                                section.confidence
                              );
                              return (
                                <div
                                  key={section.label}
                                  className="relative"
                                  onMouseEnter={() =>
                                    setHoveredSection(`${story.id}-${section.label}`)
                                  }
                                  onMouseLeave={() => setHoveredSection(null)}
                                >
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs cursor-pointer',
                                      sectionConfidence.bgColor,
                                      sectionConfidence.color
                                    )}
                                  >
                                    {section.label} ({section.confidence}%)
                                  </Badge>
                                  {hoveredSection === `${story.id}-${section.label}` && (
                                    <div className="absolute bottom-full left-0 mb-1 z-10 w-64 p-2 bg-slate-900 text-white text-xs rounded shadow-lg">
                                      <div className="font-medium mb-1">
                                        {section.label}
                                      </div>
                                      <div className="text-slate-300">
                                        {section.text.slice(0, 120)}...
                                      </div>
                                      <div className="text-slate-400 mt-1">
                                        {section.wordCount} words • {section.confidence}%
                                        confidence
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-4">
                              <span className="text-slate-600">
                                <span className="font-medium">Category:</span>{' '}
                                {CATEGORY_META[story.category].label}
                              </span>
                              <span className="text-slate-600">
                                <span className="font-medium">Date:</span> {story.dateRange}
                              </span>
                              <span className="text-slate-600">
                                <span className="font-medium">Activities:</span>{' '}
                                {story.activityCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {story.tools.map((tool) => (
                                <div
                                  key={tool}
                                  className="p-1 bg-white rounded border border-slate-200"
                                >
                                  <ToolIcon tool={tool} className="h-3 w-3 text-slate-600" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {sortedStories.length === 0 && (
                  <div className="text-center py-8 text-sm text-slate-500">
                    No stories match the current filter
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Footer */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Portfolio Health Insights
                </h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-600">Completion Rate:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {Math.round((publishedCount / totalStories) * 100)}%
                    </span>
                    <span className="text-slate-500 ml-1">
                      ({publishedCount} of {totalStories} published)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Quality Score:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {avgConfidence >= 80 ? 'Excellent' : avgConfidence >= 60 ? 'Good' : 'Needs Work'}
                    </span>
                    <span className="text-slate-500 ml-1">
                      (avg {avgConfidence}% confidence)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Framework Diversity:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {frameworkData.length} frameworks
                    </span>
                    <span className="text-slate-500 ml-1">
                      (STAR most common at {Math.round(frameworkData[0]?.percentage || 0)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
