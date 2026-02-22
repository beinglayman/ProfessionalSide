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
  type MockStory,
} from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  Hash,
  FileText,
  Figma,
  Video,
  Leaf,
  Droplets,
  Sun,
  Sprout,
  TreePine,
  Flower2,
  Sparkles,
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

export function StoriesV16() {
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | null>(null);

  // Group stories by category
  const storiesByCategory = mockStories.reduce((acc, story) => {
    if (!acc[story.category]) {
      acc[story.category] = [];
    }
    acc[story.category].push(story);
    return acc;
  }, {} as Record<StoryCategory, MockStory[]>);

  // Filter stories
  const filteredStories = selectedCategory
    ? mockStories.filter((s) => s.category === selectedCategory)
    : mockStories;

  // Stories that need polish
  const needsWaterCount = mockStories.filter((s) => s.status === 'needs-polish').length;

  const getPlantHeight = (story: MockStory) => {
    const baseHeights = {
      draft: 32,
      'needs-polish': 64,
      saved: 96,
      published: 128,
    };
    const baseHeight = baseHeights[story.status];
    const scaleFactor = 0.6 + story.confidence * 0.4;
    return baseHeight * scaleFactor;
  };

  const renderPlant = (story: MockStory) => {
    const height = getPlantHeight(story);
    const isHovered = hoveredStoryId === story.id;
    const isSelected = selectedStoryId === story.id;

    switch (story.status) {
      case 'draft':
        // Seed: small gray circle with a tiny line below
        return (
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className={cn(
                  'rounded-full bg-gradient-to-br from-gray-400 to-gray-500 shadow-sm transition-all duration-300',
                  isHovered && 'scale-110 shadow-md',
                  isSelected && 'ring-2 ring-gray-600 ring-offset-2'
                )}
                style={{ width: height, height: height }}
              >
                <div className="absolute inset-0 rounded-full bg-white/20" />
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gray-300"
                style={{ top: height, height: height * 0.3 }}
              />
            </div>
          </div>
        );

      case 'needs-polish':
        // Sprout: vertical stem with two small leaves at top
        return (
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Leaves */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
                <div
                  className={cn(
                    'w-6 h-4 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full -rotate-45 transition-all duration-300',
                    isHovered && 'scale-125'
                  )}
                />
                <div
                  className={cn(
                    'w-6 h-4 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full rotate-45 transition-all duration-300',
                    isHovered && 'scale-125'
                  )}
                />
              </div>
              {/* Stem */}
              <div
                className={cn(
                  'w-1.5 bg-gradient-to-b from-amber-600 to-amber-700 rounded-full transition-all duration-300',
                  isHovered && 'w-2',
                  isSelected && 'ring-2 ring-amber-500 ring-offset-2'
                )}
                style={{ height: height }}
              />
              {/* Sprout icon at top */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Sprout
                  className={cn(
                    'w-4 h-4 text-amber-500 transition-all duration-300',
                    isHovered && 'w-5 h-5'
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 'saved':
        // Bloom: stem with flower at top
        return (
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Flower petals */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <div className="relative w-12 h-12">
                  {/* Petals */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <div
                      key={angle}
                      className={cn(
                        'absolute top-1/2 left-1/2 w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full transition-all duration-300',
                        isHovered && 'scale-110'
                      )}
                      style={{
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-10px)`,
                      }}
                    />
                  ))}
                  {/* Center */}
                  <div
                    className={cn(
                      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full transition-all duration-300',
                      isHovered && 'scale-125'
                    )}
                  />
                </div>
              </div>
              {/* Stem */}
              <div
                className={cn(
                  'w-2 bg-gradient-to-b from-green-500 to-green-600 rounded-full transition-all duration-300',
                  isHovered && 'w-2.5',
                  isSelected && 'ring-2 ring-blue-500 ring-offset-2'
                )}
                style={{ height: height }}
              />
              {/* Small leaves on stem */}
              <div className="absolute top-1/2 left-0 -translate-x-full">
                <div className="w-3 h-2 bg-green-400 rounded-full -rotate-45" />
              </div>
              <div className="absolute top-2/3 right-0 translate-x-full">
                <div className="w-3 h-2 bg-green-400 rounded-full rotate-45" />
              </div>
            </div>
          </div>
        );

      case 'published':
        // Fruit Tree: tall stem with leafy crown
        return (
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Leafy crown */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <div className="relative">
                  {/* Tree crown layers */}
                  <div
                    className={cn(
                      'w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full transition-all duration-300',
                      isHovered && 'scale-110'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute top-2 left-1/2 -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full transition-all duration-300',
                      isHovered && 'scale-110'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full transition-all duration-300',
                      isHovered && 'scale-110'
                    )}
                  />
                  {/* Fruits/flowers on tree */}
                  <div className="absolute top-3 left-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                  </div>
                  <div className="absolute top-5 right-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                  </div>
                  <div className="absolute top-7 left-1/2">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                  </div>
                  {/* Sparkles for published */}
                  <Sparkles
                    className={cn(
                      'absolute -top-2 -right-2 w-4 h-4 text-yellow-400 transition-all duration-300',
                      isHovered && 'w-5 h-5 animate-pulse'
                    )}
                  />
                </div>
              </div>
              {/* Trunk */}
              <div
                className={cn(
                  'w-3 bg-gradient-to-b from-amber-700 to-amber-800 rounded-full transition-all duration-300',
                  isHovered && 'w-4',
                  isSelected && 'ring-2 ring-emerald-500 ring-offset-2'
                )}
                style={{ height: height }}
              />
              {/* Branches */}
              <div className="absolute top-1/3 left-0 -translate-x-full">
                <div className="w-4 h-1.5 bg-amber-700 rounded-full -rotate-45" />
              </div>
              <div className="absolute top-1/2 right-0 translate-x-full">
                <div className="w-4 h-1.5 bg-amber-700 rounded-full rotate-45" />
              </div>
              <div className="absolute top-2/3 left-0 -translate-x-full translate-y-2">
                <div className="w-3 h-1.5 bg-amber-700 rounded-full -rotate-30" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-amber-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <TreePine className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-amber-600 bg-clip-text text-transparent">
              Story Garden
            </h1>
            <Flower2 className="w-8 h-8 text-pink-500" />
          </div>
          <p className="text-gray-600 text-lg">
            Watch your stories grow from seeds to thriving trees
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Sun className="w-4 h-4 text-yellow-500" />
              <span>{mockStories.filter((s) => s.status === 'published').length} Mature Trees</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Flower2 className="w-4 h-4 text-blue-500" />
              <span>{mockStories.filter((s) => s.status === 'saved').length} Blooms</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Droplets className="w-4 h-4" />
              <span>{needsWaterCount} Need Water</span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              !selectedCategory
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            All Gardens
          </button>
          {Object.keys(storiesByCategory).map((cat) => {
            const category = cat as StoryCategory;
            const meta = CATEGORY_META[category];
            return (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(selectedCategory === category ? null : category)
                }
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                  selectedCategory === category
                    ? `${meta.bgColor} ${meta.color} shadow-md`
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {meta.label} ({storiesByCategory[category].length})
              </button>
            );
          })}
        </div>

        {/* Garden Bed */}
        <Card className="bg-gradient-to-b from-amber-50 to-amber-100 border-2 border-amber-200 shadow-xl">
          <CardContent className="p-8">
            <div className="space-y-8">
              {Object.entries(storiesByCategory).map(([cat, stories]) => {
                const category = cat as StoryCategory;
                const meta = CATEGORY_META[category];

                if (selectedCategory && selectedCategory !== category) {
                  return null;
                }

                return (
                  <div key={category} className="space-y-4">
                    {/* Category Row Label */}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'px-4 py-2 rounded-lg font-medium text-sm',
                          meta.bgColor,
                          meta.color
                        )}
                      >
                        {meta.label}
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-amber-300 to-transparent" />
                    </div>

                    {/* Garden Row */}
                    <div className="relative">
                      {/* Plants */}
                      <div className="flex items-end gap-8 px-6 pb-4 min-h-[200px]">
                        {stories.map((story) => (
                          <div
                            key={story.id}
                            className="relative group cursor-pointer"
                            onMouseEnter={() => setHoveredStoryId(story.id)}
                            onMouseLeave={() => setHoveredStoryId(null)}
                            onClick={() =>
                              setSelectedStoryId(
                                selectedStoryId === story.id ? null : story.id
                              )
                            }
                          >
                            {/* Plant */}
                            <div className="flex flex-col items-center gap-2">
                              {renderPlant(story)}

                              {/* Story Title */}
                              <div className="text-center max-w-[120px]">
                                <p className="text-xs font-medium text-gray-700 line-clamp-2">
                                  {story.title}
                                </p>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  <div
                                    className={cn(
                                      'w-1.5 h-1.5 rounded-full',
                                      STATUS_META[story.status].dotColor
                                    )}
                                  />
                                  <span className="text-xs text-gray-500">
                                    {Math.round(story.confidence * 100)}%
                                  </span>
                                </div>
                              </div>

                              {/* Needs Water Indicator */}
                              {story.status === 'needs-polish' && (
                                <div className="absolute -top-8 -right-2">
                                  <Droplets className="w-4 h-4 text-blue-400 animate-bounce" />
                                </div>
                              )}
                            </div>

                            {/* Hover Info Card */}
                            {hoveredStoryId === story.id && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <Card className="w-72 shadow-xl border-2">
                                  <CardContent className="p-4 space-y-3">
                                    <div>
                                      <h3 className="font-semibold text-sm text-gray-900 mb-1">
                                        {story.title}
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          className={cn(
                                            STATUS_META[story.status].bgColor,
                                            STATUS_META[story.status].color,
                                            'text-xs'
                                          )}
                                        >
                                          {STATUS_META[story.status].label}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                          {story.framework.toUpperCase()} •{' '}
                                          {ARCHETYPE_META[story.archetype].label}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Sections as Branches/Petals */}
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                        <Leaf className="w-3 h-3" />
                                        Growth Branches:
                                      </div>
                                      {story.sections.map((section, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          <div
                                            className={cn(
                                              'w-2 h-2 rounded-full',
                                              SECTION_COLORS[
                                                idx % SECTION_COLORS.length
                                              ].replace('bg-', 'bg-')
                                            )}
                                          />
                                          <span className="text-gray-600 flex-1">
                                            {section.title}
                                          </span>
                                          <span
                                            className={cn(
                                              'font-medium',
                                              section.confidence >= 0.8
                                                ? 'text-emerald-600'
                                                : section.confidence >= 0.6
                                                ? 'text-blue-600'
                                                : 'text-amber-600'
                                            )}
                                          >
                                            {Math.round(section.confidence * 100)}%
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Tools */}
                                    <div className="flex items-center gap-1 pt-2 border-t border-gray-200">
                                      {story.tools.slice(0, 4).map((tool, idx) => (
                                        <div
                                          key={idx}
                                          className="p-1 bg-gray-100 rounded"
                                        >
                                          <ToolIcon tool={tool} className="w-3 h-3 text-gray-600" />
                                        </div>
                                      ))}
                                      {story.tools.length > 4 && (
                                        <span className="text-xs text-gray-500 ml-1">
                                          +{story.tools.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Soil Line */}
                      <div className="h-6 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-lg border-t-2 border-amber-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-amber-900/50" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Story Detail Panel */}
        {selectedStoryId && (
          <Card className="border-2 shadow-xl animate-in slide-in-from-top-4 duration-300">
            <CardContent className="p-6">
              {(() => {
                const story = mockStories.find((s) => s.id === selectedStoryId);
                if (!story) return null;

                return (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-gray-900">
                            {story.title}
                          </h2>
                          {story.status === 'published' && (
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge
                            className={cn(
                              CATEGORY_META[story.category].bgColor,
                              CATEGORY_META[story.category].color
                            )}
                          >
                            {CATEGORY_META[story.category].label}
                          </Badge>
                          <Badge
                            className={cn(
                              STATUS_META[story.status].bgColor,
                              STATUS_META[story.status].color
                            )}
                          >
                            {STATUS_META[story.status].label}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {FRAMEWORK_META[story.framework].label} •{' '}
                            {ARCHETYPE_META[story.archetype].label}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedStoryId(null)}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>

                    {/* Confidence */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          Overall Growth Health
                        </span>
                        <span className="font-bold text-emerald-600">
                          {Math.round(story.confidence * 100)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${story.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <TreePine className="w-4 h-4 text-emerald-600" />
                        Growth Branches
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {story.sections.map((section, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md',
                              SECTION_COLORS[idx % SECTION_COLORS.length]
                                .replace('bg-', 'bg-')
                                .replace('-500', '-50'),
                              SECTION_COLORS[idx % SECTION_COLORS.length]
                                .replace('bg-', 'border-')
                                .replace('-500', '-200')
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-sm text-gray-900 flex-1">
                                {section.title}
                              </h4>
                              <div
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  section.confidence >= 0.8
                                    ? 'bg-emerald-500'
                                    : section.confidence >= 0.6
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                )}
                              />
                            </div>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {section.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {section.source}
                              </span>
                              <span
                                className={cn(
                                  'text-xs font-semibold',
                                  section.confidence >= 0.8
                                    ? 'text-emerald-600'
                                    : section.confidence >= 0.6
                                    ? 'text-blue-600'
                                    : 'text-amber-600'
                                )}
                              >
                                {Math.round(section.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Nourishment Sources
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {story.tools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
                          >
                            <ToolIcon tool={tool} className="w-3.5 h-3.5 text-gray-600" />
                            <span className="text-xs text-gray-700 capitalize">
                              {tool.replace('-', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Updated:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(story.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Growth Guide Legend */}
        <Card className="bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              Growth Stages
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-gray-400 to-gray-500" />
                <div className="text-xs font-medium text-gray-700">Seed</div>
                <div className="text-xs text-gray-500">Draft stage</div>
              </div>
              <div className="text-center space-y-2">
                <div className="flex flex-col items-center">
                  <Sprout className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-xs font-medium text-gray-700">Sprout</div>
                <div className="text-xs text-gray-500">Needs polish</div>
              </div>
              <div className="text-center space-y-2">
                <div className="flex flex-col items-center">
                  <Flower2 className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-xs font-medium text-gray-700">Bloom</div>
                <div className="text-xs text-gray-500">Saved & ready</div>
              </div>
              <div className="text-center space-y-2">
                <div className="flex flex-col items-center">
                  <TreePine className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-xs font-medium text-gray-700">Tree</div>
                <div className="text-xs text-gray-500">Published</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
