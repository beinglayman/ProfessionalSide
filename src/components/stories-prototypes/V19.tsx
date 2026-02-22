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
  Folder,
  FolderOpen,
  Grid,
  List,
  ChevronRight,
  SortAsc,
  SortDesc,
  X,
  Eye,
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

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'confidence';

export function StoriesV19() {
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | 'all'>('all');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  // Filter and sort stories
  const filteredStories = mockStories.filter(
    (story) => selectedCategory === 'all' || story.category === selectedCategory
  );

  const sortedStories = [...filteredStories].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'date') {
      comparison = a.dateRange.localeCompare(b.dateRange);
    } else if (sortBy === 'confidence') {
      comparison = a.overallConfidence - b.overallConfidence;
    }
    return sortAsc ? comparison : -comparison;
  });

  const selectedStory = mockStories.find((s) => s.id === selectedStoryId);
  const expandedStoryData = mockStories.find((s) => s.id === expandedStory);

  // Category counts
  const categoryCounts: Record<string, number> = {
    all: mockStories.length,
  };
  mockStories.forEach((story) => {
    categoryCounts[story.category] = (categoryCounts[story.category] || 0) + 1;
  });

  // Get document icon color based on status
  const getStatusColor = (status: string) => {
    const meta = STATUS_META[status as keyof typeof STATUS_META];
    if (!meta) return 'text-gray-400';
    if (meta.dotColor.includes('emerald')) return 'text-emerald-500';
    if (meta.dotColor.includes('blue')) return 'text-blue-500';
    if (meta.dotColor.includes('amber')) return 'text-amber-500';
    return 'text-gray-400';
  };

  // Breadcrumb
  const getBreadcrumb = () => {
    const parts = ['Stories'];
    if (selectedCategory !== 'all') {
      parts.push(CATEGORY_META[selectedCategory as StoryCategory].label);
    }
    if (selectedStory) {
      parts.push(selectedStory.title);
    }
    return parts;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">File Manager</h1>
          <p className="text-sm text-gray-500">
            Browse and manage your stories like files in a desktop file manager
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex h-[700px]">
              {/* Left Sidebar - Folder Tree */}
              <div className="w-[200px] border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Folders
                  </h3>
                </div>

                {/* All Stories */}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedStoryId(null);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-gray-200 transition-colors mb-1',
                    selectedCategory === 'all' ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                  )}
                >
                  {selectedCategory === 'all' ? (
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Folder className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="flex-1 text-left truncate">All Stories</span>
                  <span className="text-xs text-gray-500">{categoryCounts.all}</span>
                </button>

                {/* Category Folders */}
                <div className="mt-3 space-y-1">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const count = categoryCounts[key] || 0;
                    const isSelected = selectedCategory === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedCategory(key as StoryCategory);
                          setSelectedStoryId(null);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-gray-200 transition-colors',
                          isSelected
                            ? `bg-${meta.color}-100 text-${meta.color}-900`
                            : 'text-gray-700'
                        )}
                        style={
                          isSelected
                            ? {
                                backgroundColor: meta.color === 'blue' ? '#dbeafe' :
                                                 meta.color === 'purple' ? '#f3e8ff' :
                                                 meta.color === 'emerald' ? '#d1fae5' :
                                                 '#fef3c7',
                                color: meta.color === 'blue' ? '#1e3a8a' :
                                       meta.color === 'purple' ? '#581c87' :
                                       meta.color === 'emerald' ? '#065f46' :
                                       '#78350f',
                              }
                            : {}
                        }
                      >
                        {isSelected ? (
                          <FolderOpen className="h-4 w-4" />
                        ) : (
                          <Folder className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="flex-1 text-left truncate">{meta.label}</span>
                        <span className="text-xs text-gray-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center Panel - File View */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="border-b border-gray-200 bg-white p-3">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                    {getBreadcrumb().map((part, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1" />}
                        <span
                          className={cn(
                            index === getBreadcrumb().length - 1
                              ? 'text-gray-900 font-medium'
                              : 'text-gray-500'
                          )}
                        >
                          {part.length > 30 ? part.slice(0, 30) + '...' : part}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="flex border border-gray-300 rounded">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={cn(
                            'px-2 py-1 text-xs',
                            viewMode === 'grid'
                              ? 'bg-gray-200 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <Grid className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            'px-2 py-1 text-xs border-l border-gray-300',
                            viewMode === 'list'
                              ? 'bg-gray-200 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Sort Controls */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
                      >
                        <option value="name">Name</option>
                        <option value="date">Date</option>
                        <option value="confidence">Confidence</option>
                      </select>

                      <button
                        onClick={() => setSortAsc(!sortAsc)}
                        className="px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                      >
                        {sortAsc ? (
                          <SortAsc className="h-3.5 w-3.5" />
                        ) : (
                          <SortDesc className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      {sortedStories.length} {sortedStories.length === 1 ? 'file' : 'files'}
                    </div>
                  </div>
                </div>

                {/* File Grid/List */}
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {sortedStories.map((story) => (
                        <button
                          key={story.id}
                          onClick={() => setSelectedStoryId(story.id)}
                          onDoubleClick={() => setExpandedStory(story.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded hover:bg-gray-100 transition-colors text-center',
                            selectedStoryId === story.id ? 'bg-blue-50 ring-2 ring-blue-400' : ''
                          )}
                        >
                          <FileText className={cn('h-12 w-12', getStatusColor(story.status))} />
                          <div className="w-full">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {story.title}
                            </div>
                            <Badge
                              variant="outline"
                              className="mt-1 text-xs"
                              style={{
                                borderColor: FRAMEWORK_META[story.framework].color,
                                color: FRAMEWORK_META[story.framework].color,
                              }}
                            >
                              {FRAMEWORK_META[story.framework].label}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">{story.dateRange}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">
                              Name
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">
                              Status
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">
                              Framework
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">
                              Confidence
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStories.map((story) => (
                            <tr
                              key={story.id}
                              onClick={() => setSelectedStoryId(story.id)}
                              onDoubleClick={() => setExpandedStory(story.id)}
                              className={cn(
                                'border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                                selectedStoryId === story.id ? 'bg-blue-50' : ''
                              )}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <FileText
                                    className={cn('h-4 w-4', getStatusColor(story.status))}
                                  />
                                  <span className="text-sm text-gray-900 truncate max-w-[200px]">
                                    {story.title}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor:
                                      STATUS_META[story.status as keyof typeof STATUS_META]
                                        ?.dotColor.includes('emerald')
                                        ? '#10b981'
                                        : STATUS_META[story.status as keyof typeof STATUS_META]
                                            ?.dotColor.includes('blue')
                                        ? '#3b82f6'
                                        : STATUS_META[story.status as keyof typeof STATUS_META]
                                            ?.dotColor.includes('amber')
                                        ? '#f59e0b'
                                        : '#9ca3af',
                                  }}
                                >
                                  {STATUS_META[story.status as keyof typeof STATUS_META]?.label}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: FRAMEWORK_META[story.framework].color,
                                    color: FRAMEWORK_META[story.framework].color,
                                  }}
                                >
                                  {FRAMEWORK_META[story.framework].label}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full',
                                        story.overallConfidence >= 80
                                          ? 'bg-emerald-500'
                                          : story.overallConfidence >= 60
                                          ? 'bg-blue-500'
                                          : story.overallConfidence >= 40
                                          ? 'bg-amber-500'
                                          : 'bg-red-500'
                                      )}
                                      style={{ width: `${story.overallConfidence}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 w-8 text-right">
                                    {story.overallConfidence}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-xs text-gray-600">{story.dateRange}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sortedStories.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Folder className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No files in this folder</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Properties */}
              <div className="w-[280px] border-l border-gray-200 bg-gray-50 overflow-y-auto">
                {selectedStory ? (
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
                        <button
                          onClick={() => setExpandedStory(selectedStory.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Eye className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      </div>
                      <FileText className={cn('h-16 w-16 mb-2', getStatusColor(selectedStory.status))} />
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {selectedStory.title}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="text-gray-500 mb-1">Status</div>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor:
                              STATUS_META[selectedStory.status as keyof typeof STATUS_META]
                                ?.dotColor.includes('emerald')
                                ? '#10b981'
                                : STATUS_META[selectedStory.status as keyof typeof STATUS_META]
                                    ?.dotColor.includes('blue')
                                ? '#3b82f6'
                                : STATUS_META[selectedStory.status as keyof typeof STATUS_META]
                                    ?.dotColor.includes('amber')
                                ? '#f59e0b'
                                : '#9ca3af',
                          }}
                        >
                          {STATUS_META[selectedStory.status as keyof typeof STATUS_META]?.label}
                        </Badge>
                      </div>

                      <div>
                        <div className="text-gray-500 mb-1">Framework</div>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: FRAMEWORK_META[selectedStory.framework].color,
                            color: FRAMEWORK_META[selectedStory.framework].color,
                          }}
                        >
                          {FRAMEWORK_META[selectedStory.framework].label}
                        </Badge>
                      </div>

                      <div>
                        <div className="text-gray-500 mb-1">Category</div>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor:
                              CATEGORY_META[selectedStory.category as StoryCategory].color ===
                              'blue'
                                ? '#3b82f6'
                                : CATEGORY_META[selectedStory.category as StoryCategory].color ===
                                  'purple'
                                ? '#a855f7'
                                : CATEGORY_META[selectedStory.category as StoryCategory].color ===
                                  'emerald'
                                ? '#10b981'
                                : '#f59e0b',
                          }}
                        >
                          {CATEGORY_META[selectedStory.category as StoryCategory].label}
                        </Badge>
                      </div>

                      <div>
                        <div className="text-gray-500 mb-1">Archetype</div>
                        <div className="text-gray-900">
                          {ARCHETYPE_META[selectedStory.archetype].label}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500 mb-1">Date Range</div>
                        <div className="text-gray-900">{selectedStory.dateRange}</div>
                      </div>

                      <div>
                        <div className="text-gray-500 mb-1">Word Count</div>
                        <div className="text-gray-900">{selectedStory.wordCount} words</div>
                      </div>

                      <div>
                        <div className="text-gray-500 mb-1">Overall Confidence</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full',
                                selectedStory.overallConfidence >= 80
                                  ? 'bg-emerald-500'
                                  : selectedStory.overallConfidence >= 60
                                  ? 'bg-blue-500'
                                  : selectedStory.overallConfidence >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${selectedStory.overallConfidence}%` }}
                            />
                          </div>
                          <span className="text-gray-900 font-medium">
                            {selectedStory.overallConfidence}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-2">Tools Used</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedStory.tools.map((tool) => (
                          <div
                            key={tool}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                          >
                            <ToolIcon tool={tool} className="h-3 w-3" />
                            <span>{tool}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-2">
                        Sections ({selectedStory.sections.length})
                      </div>
                      <div className="space-y-2">
                        {selectedStory.sections.map((section) => {
                          const sectionColor =
                            SECTION_COLORS[section.title as keyof typeof SECTION_COLORS];
                          const confidenceLevel = getConfidenceLevel(section.confidence);
                          return (
                            <div
                              key={section.title}
                              className="bg-white border border-gray-200 rounded p-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium text-gray-900 truncate flex-1">
                                  {section.title}
                                </div>
                                <div
                                  className={cn(
                                    'text-xs font-medium',
                                    confidenceLevel === 'high'
                                      ? 'text-emerald-600'
                                      : confidenceLevel === 'medium'
                                      ? 'text-blue-600'
                                      : confidenceLevel === 'low'
                                      ? 'text-amber-600'
                                      : 'text-red-600'
                                  )}
                                >
                                  {section.confidence}%
                                </div>
                              </div>
                              <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${section.confidence}%`,
                                    backgroundColor: sectionColor,
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-600 line-clamp-2">
                                {section.text}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{section.sources.length} sources</span>
                                <span>•</span>
                                <span>{section.wordCount} words</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-xs">Select a file to view properties</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Story Modal */}
      {expandedStoryData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FileText
                  className={cn('h-6 w-6', getStatusColor(expandedStoryData.status))}
                />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {expandedStoryData.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: FRAMEWORK_META[expandedStoryData.framework].color,
                        color: FRAMEWORK_META[expandedStoryData.framework].color,
                      }}
                    >
                      {FRAMEWORK_META[expandedStoryData.framework].label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor:
                          STATUS_META[expandedStoryData.status as keyof typeof STATUS_META]
                            ?.dotColor.includes('emerald')
                            ? '#10b981'
                            : STATUS_META[expandedStoryData.status as keyof typeof STATUS_META]
                                ?.dotColor.includes('blue')
                            ? '#3b82f6'
                            : STATUS_META[expandedStoryData.status as keyof typeof STATUS_META]
                                ?.dotColor.includes('amber')
                            ? '#f59e0b'
                            : '#9ca3af',
                      }}
                    >
                      {STATUS_META[expandedStoryData.status as keyof typeof STATUS_META]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setExpandedStory(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Category</div>
                  <div className="text-gray-900">
                    {CATEGORY_META[expandedStoryData.category as StoryCategory].label}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Archetype</div>
                  <div className="text-gray-900">
                    {ARCHETYPE_META[expandedStoryData.archetype].label}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Date Range</div>
                  <div className="text-gray-900">{expandedStoryData.dateRange}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">Overall Confidence</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {expandedStoryData.overallConfidence}%
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full',
                      expandedStoryData.overallConfidence >= 80
                        ? 'bg-emerald-500'
                        : expandedStoryData.overallConfidence >= 60
                        ? 'bg-blue-500'
                        : expandedStoryData.overallConfidence >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${expandedStoryData.overallConfidence}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Sections ({expandedStoryData.sections.length})
                </h3>
                {expandedStoryData.sections.map((section) => {
                  const sectionColor =
                    SECTION_COLORS[section.title as keyof typeof SECTION_COLORS];
                  const confidenceLevel = getConfidenceLevel(section.confidence);
                  return (
                    <div key={section.title} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{section.title}</h4>
                        <div
                          className={cn(
                            'text-sm font-medium',
                            confidenceLevel === 'high'
                              ? 'text-emerald-600'
                              : confidenceLevel === 'medium'
                              ? 'text-blue-600'
                              : confidenceLevel === 'low'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          )}
                        >
                          {section.confidence}%
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full"
                          style={{
                            width: `${section.confidence}%`,
                            backgroundColor: sectionColor,
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{section.text}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{section.sources.length} sources</span>
                        <span>•</span>
                        <span>{section.wordCount} words</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tools Used</h3>
                <div className="flex flex-wrap gap-2">
                  {expandedStoryData.tools.map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded text-sm text-gray-700"
                    >
                      <ToolIcon tool={tool} className="h-4 w-4" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
