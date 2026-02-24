'use client';

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories,
  CATEGORY_META,
  FRAMEWORK_META,
  ARCHETYPE_META,
  STATUS_META,
  SECTION_COLORS,
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Award,
  TrendingUp,
  Clock,
  Star,
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

export function StoriesV14() {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<StoryCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StoryStatus | 'all'>('all');
  const [scrollHintLeft, setScrollHintLeft] = useState(false);
  const [scrollHintRight, setScrollHintRight] = useState(true);

  // Sort stories by date (most recent first, but we'll reverse for timeline display)
  const sortedStories = [...mockStories].sort((a, b) => {
    const dateA = new Date(a.dateRange.end);
    const dateB = new Date(b.dateRange.end);
    return dateB.getTime() - dateA.getTime();
  });

  // Apply filters
  const filteredStories = sortedStories.filter((story) => {
    if (categoryFilter !== 'all' && story.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && story.status !== statusFilter) return false;
    return true;
  });

  const selectedStory = selectedStoryId
    ? mockStories.find((s) => s.id === selectedStoryId)
    : null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollHintLeft(target.scrollLeft > 10);
    setScrollHintRight(
      target.scrollLeft < target.scrollWidth - target.clientWidth - 10
    );
  };

  const getStoryEndDate = (story: typeof mockStories[0]) => {
    return new Date(story.dateRange.end);
  };

  const formatDate = (dateRange: { start: string; end: string }) => {
    const date = new Date(dateRange.end);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Achievement Timeline
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Your career milestones charted across time
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>{filteredStories.length} achievements logged</span>
          </div>
        </div>

        {/* Main Container */}
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <Card className="w-64 shrink-0 h-fit sticky top-8 shadow-lg border-slate-200">
            <CardContent className="p-4 space-y-4">
              {/* Filter Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Filter className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-800">Filters</h3>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Category
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      categoryFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    All Categories
                  </button>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setCategoryFilter(key as StoryCategory)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        categoryFilter === key
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      <span>{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Status
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    All Statuses
                  </button>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key as StoryStatus)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        statusFilter === key
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      <div
                        className={cn('w-2 h-2 rounded-full', meta.dotColor)}
                      />
                      <span>{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Showing</span>
                  <span className="font-bold text-slate-800">
                    {filteredStories.length} / {mockStories.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Avg Confidence</span>
                  <span className="font-bold text-slate-800">
                    {Math.round(
                      (filteredStories.reduce((sum, s) => sum + s.overallConfidence, 0) /
                        filteredStories.length) *
                        100
                    )}
                    %
                  </span>
                </div>
              </div>

              {/* Reset */}
              {(categoryFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </CardContent>
          </Card>

          {/* Timeline Area */}
          <div className="flex-1 space-y-6">
            {/* Timeline Scroll Container */}
            <Card className="shadow-xl border-slate-200 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Scroll Hints */}
                  {scrollHintLeft && (
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 flex items-center justify-start pl-2 pointer-events-none">
                      <div className="bg-white rounded-full shadow-lg p-1">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                  )}
                  {scrollHintRight && (
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 flex items-center justify-end pr-2 pointer-events-none">
                      <div className="bg-white rounded-full shadow-lg p-1">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                  )}

                  {/* Scrollable Timeline */}
                  <div
                    className="overflow-x-auto overflow-y-visible"
                    onScroll={handleScroll}
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    <div className="min-w-max px-12 py-16">
                      {/* Timeline Container */}
                      <div className="relative" style={{ minHeight: '400px' }}>
                        {/* Horizontal Axis Line */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 rounded-full" />

                        {/* Story Nodes */}
                        <div className="flex items-center justify-start gap-24 relative">
                          {filteredStories.map((story, index) => {
                            const isAbove = index % 2 === 0;
                            const categoryMeta = CATEGORY_META[story.category];
                            const statusMeta = STATUS_META[story.status];
                            const archetypeMeta = ARCHETYPE_META[story.archetype];
                            const frameworkMeta = FRAMEWORK_META[story.framework];
                            const isSelected = selectedStoryId === story.id;
                            const isHovered = hoveredStoryId === story.id;
                            const isPublished = story.status === 'published';

                            return (
                              <div
                                key={story.id}
                                className="relative flex flex-col items-center shrink-0"
                                style={{
                                  marginTop: isAbove ? '-150px' : '150px',
                                }}
                              >
                                {/* Vertical Stem */}
                                <div
                                  className={cn(
                                    'absolute w-0.5 bg-gradient-to-b rounded-full transition-all',
                                    isSelected || isHovered
                                      ? 'from-blue-400 to-blue-600 w-1'
                                      : 'from-slate-300 to-slate-400',
                                    isAbove
                                      ? 'top-full h-32'
                                      : 'bottom-full h-32'
                                  )}
                                  style={{
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                  }}
                                />

                                {/* Story Node Container */}
                                <div
                                  className={cn(
                                    'flex flex-col items-center gap-3',
                                    isAbove ? 'flex-col-reverse' : 'flex-col'
                                  )}
                                >
                                  {/* Milestone Node */}
                                  <button
                                    onClick={() =>
                                      setSelectedStoryId(
                                        isSelected ? null : story.id
                                      )
                                    }
                                    onMouseEnter={() =>
                                      setHoveredStoryId(story.id)
                                    }
                                    onMouseLeave={() => setHoveredStoryId(null)}
                                    className={cn(
                                      'relative w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 group',
                                      isPublished
                                        ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 shadow-lg'
                                        : 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border-2 border-dashed border-slate-500',
                                      isSelected &&
                                        'scale-125 shadow-2xl ring-4 ring-blue-400 ring-opacity-50',
                                      isHovered &&
                                        !isSelected &&
                                        'scale-110 shadow-xl'
                                    )}
                                  >
                                    <span className="relative z-10">
                                      {archetypeMeta.emoji}
                                    </span>

                                    {/* Glow Effect */}
                                    {(isSelected || isHovered) && (
                                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-30 animate-pulse" />
                                    )}

                                    {/* Confidence Ring */}
                                    <svg
                                      className="absolute inset-0 w-full h-full -rotate-90"
                                      viewBox="0 0 100 100"
                                    >
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeDasharray={`${
                                          story.overallConfidence * 283
                                        } 283`}
                                        className={cn(
                                          'transition-all',
                                          story.overallConfidence >= 0.8
                                            ? 'text-green-500'
                                            : story.overallConfidence >= 0.7
                                            ? 'text-yellow-500'
                                            : 'text-orange-500'
                                        )}
                                        opacity="0.6"
                                      />
                                    </svg>

                                    {/* Hover Tooltip */}
                                    {isHovered && !isSelected && (
                                      <div
                                        className={cn(
                                          'absolute left-1/2 -translate-x-1/2 w-64 bg-slate-900 text-white p-3 rounded-lg shadow-2xl z-50 pointer-events-none',
                                          isAbove
                                            ? 'top-full mt-2'
                                            : 'bottom-full mb-2'
                                        )}
                                      >
                                        <div className="space-y-1">
                                          <div className="font-semibold text-sm">
                                            {story.title}
                                          </div>
                                          <div className="text-xs text-slate-300 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3" />
                                            Confidence: {Math.round(story.overallConfidence * 100)}%
                                          </div>
                                          <div className="text-xs text-slate-300 flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(story.dateRange)}
                                          </div>
                                        </div>
                                        {/* Arrow */}
                                        <div
                                          className={cn(
                                            'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45',
                                            isAbove ? '-top-1' : '-bottom-1'
                                          )}
                                        />
                                      </div>
                                    )}
                                  </button>

                                  {/* Info Card Below Node */}
                                  <Card
                                    className={cn(
                                      'w-48 shadow-md border transition-all duration-300',
                                      isSelected
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-slate-200 bg-white hover:shadow-lg'
                                    )}
                                  >
                                    <CardContent className="p-3 space-y-2">
                                      {/* Title */}
                                      <h4 className="font-semibold text-sm text-slate-800 line-clamp-2">
                                        {story.title}
                                      </h4>

                                      {/* Meta Row */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                          className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700"
                                        >
                                          {frameworkMeta.label}
                                        </Badge>
                                        <div
                                          className={cn(
                                            'w-1.5 h-1.5 rounded-full',
                                            statusMeta.dotColor
                                          )}
                                        />
                                      </div>

                                      {/* Date */}
                                      <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(story.dateRange)}
                                      </div>

                                      {/* Category */}
                                      <div className="text-xs text-slate-600 flex items-center gap-1">
                                        <span>{categoryMeta.label}</span>
                                      </div>

                                      {/* Word Count */}
                                      <div className="text-xs text-slate-500">
                                        {story.wordCount.toLocaleString()} words
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            {selectedStory && (
              <Card className="shadow-xl border-blue-300 bg-gradient-to-br from-white to-blue-50 animate-in slide-in-from-bottom-4 duration-300">
                <CardContent className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">
                          {ARCHETYPE_META[selectedStory.archetype].emoji}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">
                            {selectedStory.title}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className="text-xs bg-slate-100 text-slate-700"
                            >
                              {FRAMEWORK_META[selectedStory.framework].label}
                            </Badge>
                            <Badge
                              className={cn(
                                'text-xs',
                                STATUS_META[selectedStory.status].color,
                                STATUS_META[selectedStory.status].bgColor
                              )}
                            >
                              {STATUS_META[selectedStory.status].label}
                            </Badge>
                            <Badge
                              className={cn(
                                'text-xs',
                                CATEGORY_META[selectedStory.category].color,
                                CATEGORY_META[selectedStory.category].bgColor
                              )}
                            >
                              {CATEGORY_META[selectedStory.category].label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedStoryId(null)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  {/* Meta Info Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">
                        Confidence
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {Math.round(selectedStory.overallConfidence * 100)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {getConfidenceLevel(selectedStory.overallConfidence).label}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">
                        Word Count
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {selectedStory.wordCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">words</div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">
                        Activities
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {selectedStory.activityCount}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">events</div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Timeline</div>
                      <div className="text-sm font-semibold text-slate-800">
                        {selectedStory.dateRange.start} - {selectedStory.dateRange.end}
                      </div>
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Tools & Platforms
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedStory.tools.map((tool) => (
                        <div
                          key={tool}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700"
                        >
                          <ToolIcon tool={tool} className="w-4 h-4" />
                          <span className="capitalize">{tool}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Story Sections
                    </h3>
                    <div className="grid gap-3">
                      {selectedStory.sections.map((section, idx) => {
                        const sectionColor =
                          SECTION_COLORS[section.key] || 'border-gray-300';
                        const confidenceLevel = getConfidenceLevel(
                          section.confidence
                        );

                        return (
                          <Card
                            key={idx}
                            className={cn('border-l-4 shadow-sm hover:shadow-md transition-shadow', sectionColor)}
                          >
                            <CardContent className="p-4 space-y-3">
                              {/* Section Header */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <h4 className="font-semibold text-slate-800">
                                    {section.label}
                                  </h4>
                                  <p className="text-sm text-slate-600 line-clamp-2">
                                    {section.text}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-lg font-bold text-slate-800">
                                    {Math.round(section.confidence * 100)}%
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {confidenceLevel.label}
                                  </div>
                                </div>
                              </div>

                              {/* Confidence Bar */}
                              <div className="space-y-1">
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all duration-500',
                                      section.confidence >= 0.8
                                        ? 'bg-gradient-to-r from-green-400 to-green-600'
                                        : section.confidence >= 0.7
                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                        : 'bg-gradient-to-r from-orange-400 to-orange-600'
                                    )}
                                    style={{
                                      width: `${section.confidence * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>

                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {filteredStories.length === 0 && (
              <Card className="shadow-lg border-slate-200">
                <CardContent className="p-12 text-center">
                  <div className="inline-flex p-4 bg-slate-100 rounded-full mb-4">
                    <Award className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    No achievements found
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <button
                    onClick={() => {
                      setCategoryFilter('all');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
