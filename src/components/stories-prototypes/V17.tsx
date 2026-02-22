'use client';

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories,
  mockStoryStats,
  CATEGORY_META,
  FRAMEWORK_META,
  ARCHETYPE_META,
  STATUS_META,
  SECTION_COLORS,
  getConfidenceLevel,
} from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  Hash,
  FileText,
  Figma,
  Video,
  Newspaper,
  ChevronDown,
  Calendar,
  TrendingUp,
  Layers,
  Clock,
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

type SortCriteria = 'confidence' | 'date' | 'category' | 'framework';

export function StoriesV17() {
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortCriteria>('confidence');
  const [showEditionSelector, setShowEditionSelector] = useState(false);

  // Sort stories based on criteria
  const sortedStories = [...mockStories].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.overallConfidence - a.overallConfidence;
      case 'date':
        return new Date(b.dateRange.end).getTime() - new Date(a.dateRange.end).getTime();
      case 'category':
        return a.category.localeCompare(b.category);
      case 'framework':
        return a.framework.localeCompare(b.framework);
      default:
        return 0;
    }
  });

  // Categorize stories
  const publishedStories = sortedStories.filter(s => s.status === 'published');
  const headlineStory = publishedStories[0];
  const columnStories = publishedStories.slice(1);
  const draftStories = sortedStories.filter(
    s => s.status === 'draft' || s.status === 'needs-polish' || s.status === 'saved'
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const editionLabels: Record<SortCriteria, string> = {
    confidence: 'Premium Edition',
    date: 'Latest Edition',
    category: 'Categorized Edition',
    framework: 'Framework Edition',
  };

  const renderHeadlineStory = () => {
    if (!headlineStory) return null;

    const isExpanded = expandedStoryId === headlineStory.id;
    const displaySections = isExpanded
      ? headlineStory.sections
      : headlineStory.sections.slice(0, 2);

    const archetype = ARCHETYPE_META[headlineStory.archetype as keyof typeof ARCHETYPE_META];
    const framework = FRAMEWORK_META[headlineStory.framework as keyof typeof FRAMEWORK_META];
    const category = CATEGORY_META[headlineStory.category as keyof typeof CATEGORY_META];

    return (
      <div className="border-b-2 border-gray-900 pb-8 mb-8">
        {/* Headline Story Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-6xl">{archetype.emoji}</span>
              <div>
                <Badge variant="outline" className="border-gray-900 text-gray-900 font-bold">
                  {archetype.label}
                </Badge>
              </div>
            </div>
            <h1
              className="text-5xl font-bold leading-tight mb-3 cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() =>
                setExpandedStoryId(isExpanded ? null : headlineStory.id)
              }
            >
              {headlineStory.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{headlineStory.dateRange.start} - {headlineStory.dateRange.end}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">
                  {Math.round(headlineStory.overallConfidence * 100)}% Confidence
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{headlineStory.wordCount} words</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <Badge className={cn('font-semibold', category.color)}>
                {category.label}
              </Badge>
            </div>
            <div className="mb-2">
              <Badge variant="outline" className="border-blue-600 text-blue-700">
                {framework.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Headline Story Sections */}
        <div className="space-y-6">
          {displaySections.map((section, idx) => {
            const sectionColor = SECTION_COLORS[section.key as keyof typeof SECTION_COLORS];
            const isSelected = selectedSection === section.key;

            return (
              <div key={section.key} className="relative">
                <h3
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider mb-2 cursor-pointer hover:opacity-70 transition-opacity inline-block',
                    isSelected ? `border-b-2 ${sectionColor} pb-1` : ''
                  )}
                  onClick={() =>
                    setSelectedSection(isSelected ? null : section.key)
                  }
                >
                  {section.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-lg leading-relaxed text-gray-800">
                    <span className="float-left text-6xl font-bold leading-none mr-2 mt-1">
                      {section.text.charAt(0)}
                    </span>
                    {section.text.substring(1)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Confidence: {Math.round(section.confidence * 100)}%
                      </span>
                      <span className="text-gray-600">
                        {section.sourceCount} sources
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {headlineStory.tools.map(tool => (
                        <div
                          key={tool}
                          className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                        >
                          <ToolIcon tool={tool} className="w-3 h-3" />
                          <span className="capitalize">{tool}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isExpanded && headlineStory.sections.length > 2 && (
          <button
            onClick={() => setExpandedStoryId(headlineStory.id)}
            className="mt-4 text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1"
          >
            <span>Continue reading</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {isExpanded && (
          <button
            onClick={() => setExpandedStoryId(null)}
            className="mt-4 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            Collapse story
          </button>
        )}
      </div>
    );
  };

  const renderColumnStory = (story: typeof mockStories[0]) => {
    const isExpanded = expandedStoryId === story.id;
    const displaySections = isExpanded ? story.sections : story.sections.slice(0, 1);

    const archetype = ARCHETYPE_META[story.archetype as keyof typeof ARCHETYPE_META];
    const framework = FRAMEWORK_META[story.framework as keyof typeof FRAMEWORK_META];
    const category = CATEGORY_META[story.category as keyof typeof CATEGORY_META];

    return (
      <Card
        key={story.id}
        className="border-gray-300 hover:border-gray-500 transition-colors cursor-pointer"
        onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
      >
        <CardContent className="p-4">
          {/* Column Story Header */}
          <div className="flex items-start gap-2 mb-2">
            <span className="text-3xl">{archetype.emoji}</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold leading-tight mb-1 hover:text-gray-700">
                {story.title}
              </h2>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className="text-xs border-gray-900">
                  {archetype.label}
                </Badge>
                <Badge className={cn('text-xs', category.color)}>
                  {category.label}
                </Badge>
                <Badge variant="outline" className="text-xs border-blue-600 text-blue-700">
                  {framework.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Column Story Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-600 mb-3 border-b border-gray-200 pb-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{story.dateRange.start}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-semibold">
                {Math.round(story.overallConfidence * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{story.wordCount}w</span>
            </div>
          </div>

          {/* Column Story Sections */}
          <div className="space-y-3">
            {displaySections.map(section => {
              const sectionColor = SECTION_COLORS[section.key as keyof typeof SECTION_COLORS];
              const isSelected = selectedSection === section.key;

              return (
                <div key={section.key}>
                  <h4
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider mb-1 cursor-pointer hover:opacity-70 inline-block',
                      isSelected ? `border-b-2 ${sectionColor} pb-0.5` : ''
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSection(isSelected ? null : section.key);
                    }}
                  >
                    {section.label}
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {isExpanded || displaySections.length === 1
                      ? section.text
                      : section.text.substring(0, 150) + '...'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{Math.round(section.confidence * 100)}% confidence</span>
                    <span>{section.sourceCount} sources</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tools */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600 font-semibold">Sources:</span>
                {story.tools.map(tool => (
                  <div
                    key={tool}
                    className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                  >
                    <ToolIcon tool={tool} className="w-3 h-3" />
                    <span className="capitalize">{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isExpanded && story.sections.length > 1 && (
            <div className="mt-2 text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1">
              <span>Read more</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderClassifieds = () => {
    if (draftStories.length === 0) return null;

    return (
      <div className="border-2 border-gray-900 p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-3 border-b-2 border-gray-900 pb-2">
          <Layers className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Work in Progress
          </h3>
        </div>
        <div className="space-y-3">
          {draftStories.map(story => {
            const archetype = ARCHETYPE_META[story.archetype as keyof typeof ARCHETYPE_META];
            const status = STATUS_META[story.status as keyof typeof STATUS_META];
            const confidenceLevel = getConfidenceLevel(story.overallConfidence);

            return (
              <div
                key={story.id}
                className="border border-gray-300 p-2 bg-white hover:bg-gray-50 cursor-pointer transition-colors text-xs"
                onClick={() => setExpandedStoryId(story.id)}
              >
                <div className="flex items-start gap-1 mb-1">
                  <span className="text-lg">{archetype.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-bold leading-tight mb-1 text-sm">
                      {story.title}
                    </h4>
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <Badge
                        variant="outline"
                        className={cn('text-xs px-1 py-0', status.color)}
                      >
                        {status.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs px-1 py-0', confidenceLevel.color)}
                      >
                        {Math.round(story.overallConfidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{story.dateRange.start}</span>
                      <span>•</span>
                      <span>{story.wordCount}w</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl border-4 border-gray-900 p-8">
        {/* Masthead */}
        <div className="border-b-4 border-gray-900 pb-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Newspaper className="w-8 h-8" />
              <h1 className="text-4xl font-bold tracking-tight">
                THE CAREER CHRONICLE
              </h1>
            </div>
            <div className="text-right">
              <div className="relative">
                <button
                  onClick={() => setShowEditionSelector(!showEditionSelector)}
                  className="text-xs font-semibold uppercase tracking-wider border border-gray-900 px-2 py-1 hover:bg-gray-100 flex items-center gap-1"
                >
                  <span>{editionLabels[sortBy]}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showEditionSelector && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-900 shadow-lg z-10 min-w-[180px]">
                    {(Object.keys(editionLabels) as SortCriteria[]).map(criteria => (
                      <button
                        key={criteria}
                        onClick={() => {
                          setSortBy(criteria);
                          setShowEditionSelector(false);
                        }}
                        className={cn(
                          'block w-full text-left px-3 py-2 text-xs hover:bg-gray-100',
                          sortBy === criteria ? 'bg-gray-100 font-bold' : ''
                        )}
                      >
                        {editionLabels[criteria]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Vol. 1</span>
              <span>•</span>
              <span>{today}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{mockStoryStats.total} Stories</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{Math.round(mockStoryStats.avgConfidence * 100)}% Avg</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{mockStoryStats.totalActivities} Activities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Above the Fold - Headline Story */}
        {renderHeadlineStory()}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column Articles - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {columnStories.map(story => renderColumnStory(story))}
            </div>
          </div>

          {/* Classifieds Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            {renderClassifieds()}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-900 mt-8 pt-4">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">All the Stories Fit to Print</span>
              <span>•</span>
              <span>Powered by Your Career Data</span>
            </div>
            <div className="flex items-center gap-4">
              {Object.entries(FRAMEWORK_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', meta.color)} />
                  <span className="text-xs">{meta.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-5xl mx-auto mt-6 bg-white border border-gray-300 p-4">
        <h3 className="text-sm font-bold mb-2 uppercase tracking-wider">
          Reading Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <h4 className="font-semibold mb-1">Story Sections</h4>
            <div className="space-y-1">
              {Object.entries(SECTION_COLORS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={cn('w-3 h-1', color)} />
                  <span className="capitalize">{key.replace('-', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Confidence Levels</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>High (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>Medium (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span>Low (&lt;60%)</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Interactions</h4>
            <div className="space-y-1">
              <p>• Click headline to expand full story</p>
              <p>• Click column articles to read more</p>
              <p>• Click section labels to highlight</p>
              <p>• Select Edition to sort stories</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
