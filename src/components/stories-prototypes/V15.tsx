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
  TOOL_META,
  SECTION_COLORS,
  getConfidenceLevel,
  type StoryCategory,
  type ToolType,
} from './mock-data';
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Grid3X3, AlertTriangle, Eye } from 'lucide-react';

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

const ALL_TOOLS: ToolType[] = ['github', 'jira', 'confluence', 'slack', 'figma', 'google-meet'];
const ALL_CATEGORIES: StoryCategory[] = ['projects-impact', 'leadership', 'growth', 'external'];

interface MatrixCell {
  tool: ToolType;
  category: StoryCategory;
  count: number;
  storyIds: string[];
}

interface SelectedCell {
  tool: ToolType;
  category: StoryCategory;
}

export function StoriesV15() {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [hoveredCell, setHoveredCell] = useState<SelectedCell | null>(null);
  const [showGaps, setShowGaps] = useState(false);

  // Build the matrix data
  const matrixData: MatrixCell[][] = ALL_TOOLS.map(tool =>
    ALL_CATEGORIES.map(category => {
      const stories = mockStories.filter(
        s => s.tools.includes(tool) && s.category === category
      );
      return {
        tool,
        category,
        count: stories.length,
        storyIds: stories.map(s => s.id),
      };
    })
  );

  // Calculate row and column totals
  const rowTotals = ALL_TOOLS.map(tool => {
    const stories = mockStories.filter(s => s.tools.includes(tool));
    return stories.length;
  });

  const columnTotals = ALL_CATEGORIES.map(category => {
    const stories = mockStories.filter(s => s.category === category);
    return stories.length;
  });

  // Calculate max count for cell intensity scaling
  const maxCount = Math.max(...matrixData.flat().map(cell => cell.count));

  // Get selected cell data
  const selectedCellData = selectedCell
    ? matrixData
        .flat()
        .find(cell => cell.tool === selectedCell.tool && cell.category === selectedCell.category)
    : null;

  const selectedStories = selectedCellData
    ? mockStories.filter(s => selectedCellData.storyIds.includes(s.id))
    : [];

  // Calculate gap statistics
  const gapCells = matrixData.flat().filter(cell => cell.count === 0);
  const totalCells = ALL_TOOLS.length * ALL_CATEGORIES.length;
  const coveragePercent = Math.round(((totalCells - gapCells.length) / totalCells) * 100);

  const handleCellClick = (tool: ToolType, category: StoryCategory) => {
    if (selectedCell?.tool === tool && selectedCell?.category === category) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ tool, category });
    }
  };

  const getCellOpacity = (count: number): string => {
    if (count === 0) return '0';
    const intensity = count / maxCount;
    if (intensity >= 0.8) return '100';
    if (intensity >= 0.6) return '80';
    if (intensity >= 0.4) return '60';
    if (intensity >= 0.2) return '40';
    return '20';
  };

  const getCellBgColor = (tool: ToolType, category: StoryCategory, count: number): string => {
    const isSelected = selectedCell?.tool === tool && selectedCell?.category === category;
    const isHovered = hoveredCell?.tool === tool && hoveredCell?.category === category;
    const isRowHighlight = hoveredCell?.tool === tool;
    const isColHighlight = hoveredCell?.category === category;

    if (isSelected) return 'bg-primary-600';
    if (isHovered) return 'bg-primary-500';

    if (showGaps && count === 0) return 'bg-red-50 border-red-200';

    if (isRowHighlight || isColHighlight) {
      return 'bg-primary-100 border-primary-300';
    }

    if (count === 0) return 'bg-gray-50 border-gray-200';

    const opacity = getCellOpacity(count);
    return `bg-primary-${opacity === '100' ? '500' : opacity === '80' ? '400' : opacity === '60' ? '300' : opacity === '40' ? '200' : '100'} border-primary-200`;
  };

  const getCellTextColor = (tool: ToolType, category: StoryCategory, count: number): string => {
    const isSelected = selectedCell?.tool === tool && selectedCell?.category === category;
    const isHovered = hoveredCell?.tool === tool && hoveredCell?.category === category;

    if (isSelected || isHovered) return 'text-white';
    if (count === 0) return 'text-gray-400';

    const opacity = getCellOpacity(count);
    if (opacity === '100' || opacity === '80') return 'text-white';
    return 'text-gray-700';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3X3 className="h-6 w-6 text-primary-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Skill Matrix</h2>
            <p className="text-sm text-gray-600">Tools × Categories Coverage</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-700">{coveragePercent}%</div>
            <div className="text-xs text-gray-600">Coverage</div>
          </div>
          <button
            onClick={() => setShowGaps(!showGaps)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              showGaps
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            {showGaps ? 'Hide Gaps' : 'Show Gaps'}
          </button>
        </div>
      </div>

      {/* Matrix Grid */}
      <Card className="border-gray-200 shadow-md">
        <CardContent className="p-6">
          <div className="grid gap-0" style={{ gridTemplateColumns: '160px repeat(4, 1fr) 80px' }}>
            {/* Header Row */}
            <div className="p-3"></div>
            {ALL_CATEGORIES.map(category => (
              <div key={category} className="p-3 text-center">
                <div className={cn('text-xs font-semibold uppercase tracking-wider', CATEGORY_META[category].color)}>
                  {CATEGORY_META[category].label}
                </div>
              </div>
            ))}
            <div className="p-3 text-center">
              <div className="text-xs font-semibold text-gray-600 uppercase">Total</div>
            </div>

            {/* Tool Rows */}
            {ALL_TOOLS.map((tool, toolIndex) => (
              <>
                {/* Tool Label */}
                <div
                  key={`label-${tool}`}
                  className={cn(
                    'p-3 flex items-center gap-2 border-t border-gray-200 transition-colors',
                    hoveredCell?.tool === tool && 'bg-primary-50'
                  )}
                >
                  <ToolIcon tool={tool} className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{TOOL_META[tool].name}</span>
                </div>

                {/* Cells for this tool */}
                {ALL_CATEGORIES.map((category, categoryIndex) => {
                  const cellData = matrixData[toolIndex][categoryIndex];
                  const bgColor = getCellBgColor(tool, category, cellData.count);
                  const textColor = getCellTextColor(tool, category, cellData.count);

                  return (
                    <button
                      key={`cell-${tool}-${category}`}
                      onClick={() => handleCellClick(tool, category)}
                      onMouseEnter={() => setHoveredCell({ tool, category })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        'p-4 border-t border-r border-gray-200 relative transition-all cursor-pointer group',
                        bgColor
                      )}
                    >
                      <div className={cn('text-2xl font-bold', textColor)}>
                        {cellData.count}
                      </div>

                      {/* Hover Tooltip */}
                      {hoveredCell?.tool === tool && hoveredCell?.category === category && cellData.count > 0 && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                          {cellData.count} {cellData.count === 1 ? 'story' : 'stories'}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Row Total */}
                <div
                  key={`total-${tool}`}
                  className={cn(
                    'p-4 border-t border-gray-200 flex items-center justify-center transition-colors',
                    hoveredCell?.tool === tool && 'bg-primary-50'
                  )}
                >
                  <span className="text-lg font-bold text-gray-700">{rowTotals[toolIndex]}</span>
                </div>
              </>
            ))}

            {/* Column Totals Row */}
            <div className="p-3 border-t-2 border-gray-300">
              <div className="text-xs font-semibold text-gray-600 uppercase">Total</div>
            </div>
            {ALL_CATEGORIES.map((category, index) => (
              <div
                key={`col-total-${category}`}
                className={cn(
                  'p-3 border-t-2 border-gray-300 text-center transition-colors',
                  hoveredCell?.category === category && 'bg-primary-50'
                )}
              >
                <span className="text-lg font-bold text-gray-700">{columnTotals[index]}</span>
              </div>
            ))}
            <div className="p-3 border-t-2 border-gray-300 text-center">
              <span className="text-lg font-bold text-primary-700">{mockStories.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis Summary */}
      {showGaps && (
        <Card className="border-red-200 bg-red-50/50 shadow-md animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Gap Analysis</h3>
                <p className="text-sm text-red-700 mt-1">
                  Found {gapCells.length} empty cell{gapCells.length !== 1 ? 's' : ''} ({100 - coveragePercent}% gaps).
                  {gapCells.length > 0 && ' Consider adding stories for:'}
                </p>
                {gapCells.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {gapCells.slice(0, 6).map(cell => (
                      <Badge
                        key={`gap-${cell.tool}-${cell.category}`}
                        variant="outline"
                        className="bg-white border-red-300 text-red-700 text-xs"
                      >
                        {TOOL_META[cell.tool].name} × {CATEGORY_META[cell.category].label}
                      </Badge>
                    ))}
                    {gapCells.length > 6 && (
                      <Badge variant="outline" className="bg-white border-red-300 text-red-700 text-xs">
                        +{gapCells.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Cell Detail */}
      {selectedCell && selectedCellData && selectedStories.length > 0 && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {TOOL_META[selectedCell.tool].name} × {CATEGORY_META[selectedCell.category].label}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedStories.length} {selectedStories.length === 1 ? 'story' : 'stories'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Close
            </button>
          </div>

          {/* Story Cards */}
          <div className="space-y-3">
            {selectedStories.map(story => {
              const conf = getConfidenceLevel(story.overallConfidence);
              return (
                <Card key={story.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Title and Metadata */}
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-2">{story.title}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={cn(
                              CATEGORY_META[story.category].bgColor,
                              CATEGORY_META[story.category].color,
                              'border-0 text-xs'
                            )}
                          >
                            {CATEGORY_META[story.category].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {FRAMEWORK_META[story.framework].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ARCHETYPE_META[story.archetype].emoji} {ARCHETYPE_META[story.archetype].label}
                          </Badge>
                          <div className={cn('text-xs font-medium px-2 py-1 rounded', conf.bgColor, conf.color)}>
                            {Math.round(story.overallConfidence * 100)}% confidence
                          </div>
                        </div>
                      </div>

                      {/* Tools */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">Tools:</span>
                        <div className="flex gap-1.5">
                          {story.tools.map(tool => (
                            <div
                              key={tool}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                                tool === selectedCell.tool
                                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                                  : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              <ToolIcon tool={tool} className="h-3 w-3" />
                              <span>{TOOL_META[tool].name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sections */}
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-2">Sections:</div>
                        <div className="flex flex-wrap gap-2">
                          {story.sections.map(section => {
                            const secConf = getConfidenceLevel(section.confidence);
                            return (
                              <div
                                key={section.key}
                                className={cn(
                                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-l-4 bg-gray-50',
                                  SECTION_COLORS[section.key] || 'border-gray-300'
                                )}
                              >
                                <span className="text-xs font-medium text-gray-700">{section.label}</span>
                                <div
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    section.confidence >= 0.8
                                      ? 'bg-emerald-500'
                                      : section.confidence >= 0.6
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  )}
                                  title={`${Math.round(section.confidence * 100)}% confidence`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-100">
                        <span>{story.wordCount} words</span>
                        <span>{story.activityCount} activities</span>
                        <span>
                          {new Date(story.dateRange.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          {' → '}
                          {new Date(story.dateRange.end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State for Selected Cell */}
      {selectedCell && selectedCellData && selectedStories.length === 0 && (
        <Card className="border-gray-200 bg-gray-50 shadow-md animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No Stories Found</h3>
            <p className="text-sm text-gray-600">
              No stories use {TOOL_META[selectedCell.tool].name} for {CATEGORY_META[selectedCell.category].label}.
            </p>
            <p className="text-xs text-gray-500 mt-2">This is a gap in your story coverage.</p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Interaction Guide
              </h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Hover cell → crosshair highlight + tooltip</li>
                <li>• Click cell → view matching stories</li>
                <li>• Cell intensity = story count</li>
                <li>• Red cells (gaps mode) = no coverage</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Coverage Insights
              </h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Row totals = tool usage across all categories</li>
                <li>• Column totals = category coverage across all tools</li>
                <li>• Gaps reveal under-represented combinations</li>
                <li>• Darker cells = more stories</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
