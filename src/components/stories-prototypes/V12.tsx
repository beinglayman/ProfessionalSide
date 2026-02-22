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
  type MockStory,
} from './mock-data';
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Radar, Target, TrendingUp, Zap } from 'lucide-react';

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

interface RadarPoint {
  x: number;
  y: number;
  confidence: number;
  label: string;
  sectionKey: string;
}

interface StoryRadarData {
  story: MockStory;
  points: RadarPoint[];
  color: string;
  bgColor: string;
  strokeColor: string;
}

const STORY_COLORS = [
  {
    name: 'Blue',
    color: 'text-blue-700',
    bgColor: 'fill-blue-500/30',
    strokeColor: 'stroke-blue-600',
    borderColor: 'border-blue-500',
    dotColor: 'fill-blue-600',
    ringColor: 'ring-blue-500',
  },
  {
    name: 'Purple',
    color: 'text-purple-700',
    bgColor: 'fill-purple-500/30',
    strokeColor: 'stroke-purple-600',
    borderColor: 'border-purple-500',
    dotColor: 'fill-purple-600',
    ringColor: 'ring-purple-500',
  },
];

export function StoriesV12() {
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);

  const centerX = 200;
  const centerY = 200;
  const radius = 140;

  const toggleStory = (storyId: string) => {
    setSelectedStoryIds(prev => {
      if (prev.includes(storyId)) {
        return prev.filter(id => id !== storyId);
      }
      if (prev.length >= 2) {
        return [prev[1], storyId];
      }
      return [...prev, storyId];
    });
  };

  const calculateRadarData = (story: MockStory, colorIndex: number): StoryRadarData => {
    const numSections = story.sections.length;
    const points: RadarPoint[] = story.sections.map((section, index) => {
      const angle = (2 * Math.PI * index) / numSections - Math.PI / 2;
      const distance = radius * section.confidence;
      return {
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle),
        confidence: section.confidence,
        label: section.label,
        sectionKey: section.key,
      };
    });

    const colors = STORY_COLORS[colorIndex];
    return {
      story,
      points,
      color: colors.color,
      bgColor: colors.bgColor,
      strokeColor: colors.strokeColor,
    };
  };

  const selectedStories = selectedStoryIds
    .map(id => mockStories.find(s => s.id === id))
    .filter((s): s is MockStory => s !== undefined);

  const radarDataList = selectedStories.map((story, index) => calculateRadarData(story, index));

  const maxSections = Math.max(...mockStories.map(s => s.sections.length), 4);
  const gridAngles = Array.from({ length: maxSections }, (_, i) => {
    return (2 * Math.PI * i) / maxSections - Math.PI / 2;
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const primaryStory = selectedStories[0];
  const activeAxes = primaryStory ? primaryStory.sections : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Radar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Confidence Radar</h1>
            <p className="text-sm text-gray-600">Multi-axis visualization of story strength dimensions</p>
          </div>
        </div>
      </div>

      {/* Main Content: Radar + Detail */}
      <div className="grid grid-cols-11 gap-6">
        {/* Left: Radar Chart (55%) */}
        <div className="col-span-6">
          <Card className="h-full border-gray-200 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Chart Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Section Confidence Analysis</h3>
                  </div>
                  {selectedStories.length === 0 && (
                    <span className="text-xs text-gray-500">Select up to 2 stories to compare</span>
                  )}
                </div>

                {/* SVG Radar Chart */}
                <div className="relative bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg p-4 border border-gray-100">
                  <svg viewBox="0 0 400 400" className="w-full h-auto">
                    {/* Grid circles */}
                    {gridLevels.map((level, idx) => (
                      <circle
                        key={`grid-${level}`}
                        cx={centerX}
                        cy={centerY}
                        r={radius * level}
                        fill="none"
                        stroke={idx === gridLevels.length - 1 ? '#94a3b8' : '#cbd5e1'}
                        strokeWidth={idx === gridLevels.length - 1 ? '1.5' : '1'}
                        strokeDasharray={idx === gridLevels.length - 1 ? '0' : '4 4'}
                        opacity="0.6"
                      />
                    ))}

                    {/* Confidence level labels */}
                    {gridLevels.map((level, idx) => (
                      <text
                        key={`level-${level}`}
                        x={centerX + 4}
                        y={centerY - radius * level + 4}
                        fontSize="9"
                        fill="#64748b"
                        fontWeight="500"
                      >
                        {Math.round(level * 100)}%
                      </text>
                    ))}

                    {/* Axis lines and labels */}
                    {activeAxes.map((section, index) => {
                      const angle = (2 * Math.PI * index) / activeAxes.length - Math.PI / 2;
                      const endX = centerX + radius * Math.cos(angle);
                      const endY = centerY + radius * Math.sin(angle);
                      const labelDistance = radius + 30;
                      const labelX = centerX + labelDistance * Math.cos(angle);
                      const labelY = centerY + labelDistance * Math.sin(angle);

                      const isHovered = hoveredAxis === section.key;

                      return (
                        <g key={`axis-${section.key}`}>
                          {/* Axis line */}
                          <line
                            x1={centerX}
                            y1={centerY}
                            x2={endX}
                            y2={endY}
                            stroke={isHovered ? '#3b82f6' : '#94a3b8'}
                            strokeWidth={isHovered ? '2' : '1.5'}
                            opacity={isHovered ? '0.9' : '0.5'}
                          />

                          {/* Hover zone (invisible wide line for better interaction) */}
                          <line
                            x1={centerX}
                            y1={centerY}
                            x2={endX}
                            y2={endY}
                            stroke="transparent"
                            strokeWidth="20"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredAxis(section.key)}
                            onMouseLeave={() => setHoveredAxis(null)}
                          />

                          {/* Axis label */}
                          <text
                            x={labelX}
                            y={labelY}
                            fontSize="11"
                            fontWeight={isHovered ? '700' : '600'}
                            fill={isHovered ? '#1e40af' : '#475569'}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ pointerEvents: 'none' }}
                          >
                            {section.label}
                          </text>

                          {/* Section color indicator */}
                          <circle
                            cx={labelX}
                            cy={labelY + 12}
                            r="3"
                            className={SECTION_COLORS[section.key]?.replace('border-', 'fill-') || 'fill-gray-400'}
                            opacity="0.7"
                          />
                        </g>
                      );
                    })}

                    {/* Story polygons */}
                    {radarDataList.map((radarData, radarIndex) => {
                      const polygonPoints = radarData.points.map(p => `${p.x},${p.y}`).join(' ');
                      const isHovered = hoveredStoryId === radarData.story.id;

                      return (
                        <g key={`polygon-${radarData.story.id}`}>
                          {/* Filled polygon */}
                          <polygon
                            points={polygonPoints}
                            className={radarData.bgColor}
                            opacity={isHovered ? '0.5' : '0.35'}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredStoryId(radarData.story.id)}
                            onMouseLeave={() => setHoveredStoryId(null)}
                          />

                          {/* Polygon stroke */}
                          <polygon
                            points={polygonPoints}
                            fill="none"
                            className={radarData.strokeColor}
                            strokeWidth={isHovered ? '3' : '2'}
                            opacity={isHovered ? '1' : '0.8'}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredStoryId(radarData.story.id)}
                            onMouseLeave={() => setHoveredStoryId(null)}
                          />

                          {/* Vertex dots */}
                          {radarData.points.map((point, pointIndex) => {
                            const showValue = hoveredAxis === point.sectionKey;
                            return (
                              <g key={`point-${radarData.story.id}-${pointIndex}`}>
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={showValue || isHovered ? '5' : '3.5'}
                                  className={STORY_COLORS[radarIndex].dotColor}
                                  opacity={isHovered ? '1' : '0.9'}
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => {
                                    setHoveredStoryId(radarData.story.id);
                                    setHoveredAxis(point.sectionKey);
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredStoryId(null);
                                    setHoveredAxis(null);
                                  }}
                                />

                                {/* Confidence value tooltip */}
                                {showValue && (
                                  <g>
                                    <rect
                                      x={point.x - 18}
                                      y={point.y - 28}
                                      width="36"
                                      height="18"
                                      rx="4"
                                      fill="#1e293b"
                                      opacity="0.95"
                                    />
                                    <text
                                      x={point.x}
                                      y={point.y - 17}
                                      fontSize="11"
                                      fontWeight="700"
                                      fill="#fff"
                                      textAnchor="middle"
                                    >
                                      {Math.round(point.confidence * 100)}%
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* Center dot */}
                    <circle cx={centerX} cy={centerY} r="4" fill="#64748b" opacity="0.6" />

                    {/* Overall confidence labels (hoverable) */}
                    {radarDataList.map((radarData, index) => {
                      const isHovered = hoveredStoryId === radarData.story.id;
                      if (!isHovered) return null;

                      return (
                        <g key={`conf-label-${radarData.story.id}`}>
                          <rect
                            x={centerX - 60}
                            y={centerY + 50 + index * 25}
                            width="120"
                            height="20"
                            rx="4"
                            className={STORY_COLORS[index].bgColor.replace('/30', '')}
                            opacity="0.2"
                          />
                          <text
                            x={centerX}
                            y={centerY + 63 + index * 25}
                            fontSize="11"
                            fontWeight="700"
                            className={STORY_COLORS[index].color}
                            textAnchor="middle"
                          >
                            Overall: {Math.round(radarData.story.overallConfidence * 100)}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend */}
                {selectedStories.length > 0 && (
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-600">Selected Stories:</span>
                    <div className="flex gap-3">
                      {selectedStories.map((story, index) => (
                        <div key={story.id} className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-sm',
                              STORY_COLORS[index].borderColor,
                              STORY_COLORS[index].bgColor.replace('fill-', 'bg-').replace('/30', '/40'),
                              'border-2'
                            )}
                          />
                          <span className="text-xs font-medium text-gray-700 max-w-[140px] truncate">
                            {story.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Story Detail (45%) */}
        <div className="col-span-5">
          <Card className="h-full border-gray-200 shadow-md">
            <CardContent className="p-6">
              {selectedStories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                  <div className="p-4 rounded-full bg-gray-100">
                    <Radar className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">No Stories Selected</h3>
                    <p className="text-sm text-gray-600 max-w-xs">
                      Select up to 2 stories from the list below to visualize and compare their section-by-section confidence levels on the radar chart.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>First story appears in blue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>Second story appears in purple</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedStories.map((story, index) => {
                    const confLevel = getConfidenceLevel(story.overallConfidence);
                    return (
                      <div
                        key={story.id}
                        className={cn(
                          'space-y-3 pb-6',
                          index < selectedStories.length - 1 && 'border-b border-gray-200'
                        )}
                      >
                        {/* Story header */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                'mt-0.5 w-3 h-3 rounded-sm flex-shrink-0',
                                STORY_COLORS[index].borderColor,
                                STORY_COLORS[index].bgColor.replace('fill-', 'bg-').replace('/30', '/40'),
                                'border-2'
                              )}
                            />
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight">{story.title}</h4>
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-2 pl-5">
                            <Badge className={cn(CATEGORY_META[story.category].bgColor, CATEGORY_META[story.category].color, 'border-0 text-[10px] px-2 py-0.5')}>
                              {CATEGORY_META[story.category].label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {FRAMEWORK_META[story.framework].label}
                            </Badge>
                            <Badge
                              className={cn(
                                confLevel.bgColor,
                                confLevel.color,
                                'border-0 text-[10px] px-2 py-0.5'
                              )}
                            >
                              {Math.round(story.overallConfidence * 100)}% {confLevel.label}
                            </Badge>
                          </div>

                          {/* Tools and stats */}
                          <div className="flex items-center gap-3 pl-5 text-xs text-gray-600">
                            <div className="flex gap-1">
                              {story.tools.map(tool => (
                                <ToolIcon key={tool} tool={tool} className="h-3 w-3 text-gray-500" />
                              ))}
                            </div>
                            <span className="text-[10px]">{story.wordCount} words</span>
                          </div>
                        </div>

                        {/* Section breakdown */}
                        <div className="space-y-2 pl-5">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-gray-500" />
                            <h5 className="text-xs font-semibold text-gray-700">Section Confidence</h5>
                          </div>
                          <div className="space-y-1.5">
                            {story.sections.map(section => {
                              const sectionConf = getConfidenceLevel(section.confidence);
                              const isHighlighted = hoveredAxis === section.key;
                              return (
                                <div
                                  key={section.key}
                                  className={cn(
                                    'flex items-center justify-between p-2 rounded transition-colors',
                                    isHighlighted ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-gray-50'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        'w-1.5 h-1.5 rounded-full',
                                        SECTION_COLORS[section.key]?.replace('border-', 'bg-') || 'bg-gray-400'
                                      )}
                                    />
                                    <span className="text-xs font-medium text-gray-700">{section.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={cn('text-xs font-semibold', sectionConf.color)}>
                                      {Math.round(section.confidence * 100)}%
                                    </span>
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          'h-full rounded-full transition-all',
                                          sectionConf.color.replace('text-', 'bg-')
                                        )}
                                        style={{ width: `${section.confidence * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Archetype */}
                        <div className="pl-5 flex items-center gap-2">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-gray-600">
                            Archetype: <span className="font-semibold text-gray-900">{ARCHETYPE_META[story.archetype].label}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Story Selector Row */}
      <Card className="border-gray-200 shadow-md">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Story Library</h3>
              <span className="text-xs text-gray-500">
                {selectedStoryIds.length} of 2 selected • Click to toggle
              </span>
            </div>

            {/* Story chips */}
            <div className="grid grid-cols-2 gap-3">
              {mockStories.map(story => {
                const isSelected = selectedStoryIds.includes(story.id);
                const selectionIndex = selectedStoryIds.indexOf(story.id);
                const confLevel = getConfidenceLevel(story.overallConfidence);

                return (
                  <button
                    key={story.id}
                    onClick={() => toggleStory(story.id)}
                    className={cn(
                      'relative p-3 rounded-lg border-2 text-left transition-all group',
                      'hover:shadow-md hover:-translate-y-0.5',
                      isSelected
                        ? cn(
                            'shadow-md -translate-y-0.5',
                            selectionIndex === 0
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                              : 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                          )
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div
                        className={cn(
                          'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                          selectionIndex === 0 ? 'bg-blue-600' : 'bg-purple-600'
                        )}
                      >
                        {selectionIndex + 1}
                      </div>
                    )}

                    <div className="space-y-2 pr-8">
                      {/* Title */}
                      <h4 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                        {story.title}
                      </h4>

                      {/* Metadata row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={cn(
                            CATEGORY_META[story.category].bgColor,
                            CATEGORY_META[story.category].color,
                            'border-0 text-[9px] px-1.5 py-0.5'
                          )}
                        >
                          {CATEGORY_META[story.category].label}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">
                          {FRAMEWORK_META[story.framework].label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              confLevel.color.replace('text-', 'bg-')
                            )}
                          />
                          <span className={cn('text-[10px] font-semibold', confLevel.color)}>
                            {Math.round(story.overallConfidence * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Section count */}
                      <div className="flex items-center gap-1 text-[10px] text-gray-600">
                        <Target className="h-3 w-3" />
                        <span>{story.sections.length} sections</span>
                        <span className="text-gray-400">•</span>
                        <span>{story.wordCount} words</span>
                      </div>

                      {/* Mini confidence bars */}
                      <div className="flex gap-1">
                        {story.sections.map(section => (
                          <div
                            key={section.key}
                            className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                            title={`${section.label}: ${Math.round(section.confidence * 100)}%`}
                          >
                            <div
                              className={cn(
                                'h-full rounded-full',
                                SECTION_COLORS[section.key]?.replace('border-', 'bg-') || 'bg-gray-400'
                              )}
                              style={{ width: `${section.confidence * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info footer */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Radar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <span className="font-semibold">How to use:</span> Select up to 2 stories to overlay their confidence patterns on the radar chart. Each axis represents a story section (Situation, Task, Action, Result, etc.). The distance from center to each vertex shows that section's confidence level (0% at center, 100% at edge). Hover over axes or polygon areas to see detailed confidence values. Use this view to identify which sections need strengthening or to compare narrative structures between stories.
        </div>
      </div>
    </div>
  );
}
