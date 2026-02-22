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
  type MockStory,
} from './mock-data';
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, ChevronDown, ChevronRight } from 'lucide-react';

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

const PIPELINE_STATUSES: StoryStatus[] = ['draft', 'needs-polish', 'saved', 'published'];

const categories: StoryCategory[] = ['projects-impact', 'leadership', 'growth', 'external'];

export function StoriesV11() {
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | null>(null);
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);

  // Filter stories by category if selected
  const filteredStories = selectedCategory
    ? mockStories.filter(s => s.category === selectedCategory)
    : mockStories;

  // Group stories by status
  const storyByStatus: Record<StoryStatus, MockStory[]> = {
    draft: filteredStories.filter(s => s.status === 'draft'),
    'needs-polish': filteredStories.filter(s => s.status === 'needs-polish'),
    saved: filteredStories.filter(s => s.status === 'saved'),
    published: filteredStories.filter(s => s.status === 'published'),
  };

  const toggleCategory = (category: StoryCategory) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const toggleStoryExpansion = (storyId: string) => {
    setExpandedStoryId(expandedStoryId === storyId ? null : storyId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <KanbanSquare className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Story Pipeline</h1>
              <p className="text-sm text-gray-600">Track stories from draft to published</p>
            </div>
          </div>

          {/* Category filter chips */}
          <div className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
            <span className="text-sm font-medium text-gray-600 self-center">Filter by:</span>
            {categories.map(cat => {
              const count = mockStories.filter(s => s.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-all hover:shadow-md',
                    isSelected
                      ? cn(CATEGORY_META[cat].bgColor, CATEGORY_META[cat].color, 'ring-2 ring-offset-2',
                          cat === 'projects-impact' ? 'ring-blue-500' :
                          cat === 'leadership' ? 'ring-purple-500' :
                          cat === 'growth' ? 'ring-emerald-500' : 'ring-amber-500')
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {CATEGORY_META[cat].label}
                  <span className="ml-2 text-xs opacity-75">({count})</span>
                </button>
              );
            })}
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="rounded-full px-4 py-2 text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Kanban columns */}
        <div className="grid grid-cols-4 gap-6">
          {PIPELINE_STATUSES.map(status => {
            const stories = storyByStatus[status];
            const meta = STATUS_META[status];
            const isEmpty = stories.length === 0;

            return (
              <div key={status} className="flex flex-col space-y-3">
                {/* Column header */}
                <div className={cn(
                  'rounded-lg p-4 shadow-sm border',
                  meta.bgColor,
                  'border-gray-200'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-3 w-3 rounded-full', meta.dotColor)} />
                      <h2 className={cn('text-sm font-bold uppercase tracking-wide', meta.color)}>
                        {meta.label}
                      </h2>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {stories.length}
                    </Badge>
                  </div>
                </div>

                {/* Column content */}
                <div className="flex-1 space-y-3 min-h-[400px]">
                  {isEmpty ? (
                    // Empty state
                    <div className={cn(
                      'rounded-lg border-2 border-dashed p-8 text-center',
                      status === 'draft' ? 'border-gray-300 bg-gray-50' :
                      status === 'needs-polish' ? 'border-amber-300 bg-amber-50' :
                      status === 'saved' ? 'border-blue-300 bg-blue-50' :
                      'border-emerald-300 bg-emerald-50'
                    )}>
                      <div className="space-y-2">
                        <div className={cn(
                          'mx-auto h-12 w-12 rounded-full flex items-center justify-center',
                          meta.bgColor
                        )}>
                          <div className={cn('h-6 w-6 rounded-full', meta.dotColor)} />
                        </div>
                        <p className={cn('text-sm font-medium', meta.color)}>
                          No {meta.label.toLowerCase()} stories
                        </p>
                        <p className="text-xs text-gray-500">
                          {status === 'draft' && 'Start writing to create drafts'}
                          {status === 'needs-polish' && 'Polish your drafts to move them here'}
                          {status === 'saved' && 'Save polished stories for later'}
                          {status === 'published' && 'Publish stories to share them'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Story cards
                    stories.map(story => {
                      const isExpanded = expandedStoryId === story.id;
                      const isHovered = hoveredStoryId === story.id;
                      const conf = getConfidenceLevel(story.overallConfidence);

                      return (
                        <Card
                          key={story.id}
                          onMouseEnter={() => setHoveredStoryId(story.id)}
                          onMouseLeave={() => setHoveredStoryId(null)}
                          className={cn(
                            'cursor-pointer transition-all duration-200 border',
                            status === 'published' && 'border-l-4 border-l-emerald-500',
                            status === 'draft' && 'border-l-4 border-l-gray-400',
                            status === 'needs-polish' && 'border-l-4 border-l-amber-500',
                            status === 'saved' && 'border-l-4 border-l-blue-500',
                            isHovered && 'shadow-lg -translate-y-1',
                            isExpanded && 'ring-2 ring-primary-500 shadow-xl'
                          )}
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Card header - clickable */}
                            <button
                              onClick={() => toggleStoryExpansion(story.id)}
                              className="w-full text-left space-y-3"
                            >
                              {/* Title and expand icon */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={cn(
                                  'text-sm font-semibold text-gray-900 leading-tight flex-1',
                                  isHovered ? 'text-primary-700' : ''
                                )}>
                                  {story.title}
                                </h3>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                )}
                              </div>

                              {/* Metadata row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={cn(
                                  'text-xs px-2 py-0.5 border-0',
                                  CATEGORY_META[story.category].bgColor,
                                  CATEGORY_META[story.category].color
                                )}>
                                  {CATEGORY_META[story.category].label}
                                </Badge>
                                <span className="text-lg" title={ARCHETYPE_META[story.archetype].label}>
                                  {ARCHETYPE_META[story.archetype].emoji}
                                </span>
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                  {FRAMEWORK_META[story.framework].label}
                                </Badge>
                              </div>

                              {/* Tool icons */}
                              <div className="flex items-center gap-1.5">
                                {story.tools.map(tool => (
                                  <div
                                    key={tool}
                                    className="rounded bg-gray-100 p-1.5 hover:bg-gray-200 transition-colors"
                                  >
                                    <ToolIcon tool={tool} className="h-3 w-3 text-gray-600" />
                                  </div>
                                ))}
                              </div>

                              {/* Confidence bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Confidence</span>
                                  <span className={cn('font-semibold', conf.color)}>
                                    {Math.round(story.overallConfidence * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full transition-all duration-300 rounded-full',
                                      story.overallConfidence >= 0.8 ? 'bg-emerald-500' :
                                      story.overallConfidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${story.overallConfidence * 100}%` }}
                                  />
                                </div>
                              </div>

                              {/* Word count */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{story.wordCount} words</span>
                                <span>{story.sections.length} sections</span>
                              </div>
                            </button>

                            {/* Expanded sections */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-gray-200 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                  Sections
                                </h4>
                                {story.sections.map(section => {
                                  const sectionConf = getConfidenceLevel(section.confidence);
                                  const sectionKey = section.key.toLowerCase();
                                  const borderColor = SECTION_COLORS[sectionKey] || 'border-gray-300';

                                  return (
                                    <div
                                      key={section.key}
                                      className={cn(
                                        'border-l-4 pl-3 space-y-1',
                                        borderColor
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                          {section.label}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <div className={cn(
                                            'h-2 w-2 rounded-full',
                                            section.confidence >= 0.8 ? 'bg-emerald-500' :
                                            section.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                          )} />
                                          <span className={cn('text-xs font-medium', sectionConf.color)}>
                                            {Math.round(section.confidence * 100)}%
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                        {section.text}
                                      </p>
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <FileText className="h-3 w-3" />
                                        <span>{section.sourceCount} sources</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline footer stats */}
        <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center space-y-1">
              <div className="text-3xl font-bold text-gray-400">
                {storyByStatus.draft.length}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Drafts in Progress
              </div>
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 transition-all duration-500"
                  style={{ width: `${(storyByStatus.draft.length / mockStories.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-3xl font-bold text-amber-600">
                {storyByStatus['needs-polish'].length}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Needs Polish
              </div>
              <div className="h-1 w-full bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${(storyByStatus['needs-polish'].length / mockStories.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-3xl font-bold text-blue-600">
                {storyByStatus.saved.length}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Saved Stories
              </div>
              <div className="h-1 w-full bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(storyByStatus.saved.length / mockStories.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-3xl font-bold text-emerald-600">
                {storyByStatus.published.length}
              </div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Published
              </div>
              <div className="h-1 w-full bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(storyByStatus.published.length / mockStories.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overall pipeline health */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KanbanSquare className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Pipeline Completion</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-700">
                  {Math.round((storyByStatus.published.length / mockStories.length) * 100)}%
                </span>
                <span className="text-xs text-gray-500">
                  ({storyByStatus.published.length} of {mockStories.length} published)
                </span>
              </div>
            </div>
            <div className="mt-2 h-3 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                style={{ width: `${(storyByStatus.published.length / mockStories.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Filter status */}
          {selectedCategory && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    CATEGORY_META[selectedCategory].bgColor,
                    CATEGORY_META[selectedCategory].color
                  )}>
                    {CATEGORY_META[selectedCategory].label}
                  </div>
                  <span className="text-sm text-gray-600">
                    Showing {filteredStories.length} of {mockStories.length} stories
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Clear filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="rounded-lg bg-white p-2 shadow-sm">
                <KanbanSquare className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-bold text-gray-900">Kanban Pipeline Guide</h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-700">
                <div className="space-y-1">
                  <p><strong>Click a card</strong> to expand and view section details with confidence ratings</p>
                  <p><strong>Hover cards</strong> to see full title and lift effect</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Filter by category</strong> to focus on specific story types</p>
                  <p><strong>Colored borders</strong> indicate story status (emerald = published, gray = draft)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
