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
import { GitBranch, KanbanSquare, Hash, FileText, Figma, Video, Circle, ArrowUpDown, Target } from 'lucide-react';

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

// Map SECTION_COLORS border classes to actual fill colors for SVG
const SECTION_FILL_COLORS: Record<string, string> = {
  'border-blue-400': '#60a5fa',
  'border-amber-400': '#fbbf24',
  'border-primary-400': '#818cf8',
  'border-red-400': '#f87171',
  'border-emerald-400': '#34d399',
};

// Map category to ring stroke color
const CATEGORY_RING_COLORS: Record<string, string> = {
  'projects-impact': '#3b82f6',
  leadership: '#a855f7',
  growth: '#10b981',
  external: '#f59e0b',
};

type SortMode = 'confidence' | 'date' | 'category';

interface PolarSegment {
  story: MockStory;
  section: MockStory['sections'][0];
  startAngle: number;
  endAngle: number;
  radius: number;
  strokeWidth: number;
}

// Helper to create SVG arc path
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  strokeWidth: number
): string {
  const innerRadius = radius - strokeWidth / 2;
  const outerRadius = radius + strokeWidth / 2;

  const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
  const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

  const x1 = x + innerRadius * Math.cos(startAngleRad);
  const y1 = y + innerRadius * Math.sin(startAngleRad);
  const x2 = x + outerRadius * Math.cos(startAngleRad);
  const y2 = y + outerRadius * Math.sin(startAngleRad);

  const x3 = x + outerRadius * Math.cos(endAngleRad);
  const y3 = y + outerRadius * Math.sin(endAngleRad);
  const x4 = x + innerRadius * Math.cos(endAngleRad);
  const y4 = y + innerRadius * Math.sin(endAngleRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    'M', x1, y1,
    'L', x2, y2,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, x3, y3,
    'L', x4, y4,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, x1, y1,
    'Z',
  ].join(' ');
}

export function StoriesV18() {
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [hoveredSection, setHoveredSection] = useState<{ storyId: string; sectionKey: string } | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('confidence');

  // Sort stories based on current sort mode
  const getSortedStories = (): MockStory[] => {
    const stories = [...mockStories];
    switch (sortMode) {
      case 'confidence':
        return stories.sort((a, b) => b.overallConfidence - a.overallConfidence);
      case 'date':
        return stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'category':
        return stories.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return stories;
    }
  };

  const sortedStories = getSortedStories();
  const selectedStory = sortedStories.find((s) => s.id === selectedStoryId);

  // Generate polar ring segments
  const centerX = 250;
  const centerY = 250;
  const baseRadius = 60;
  const radiusIncrement = 35;
  const strokeWidth = 25;

  const segments: PolarSegment[] = [];

  sortedStories.forEach((story, storyIndex) => {
    const radius = baseRadius + storyIndex * radiusIncrement;
    const numSections = story.sections.length;
    const degreesPerSection = 360 / numSections;

    story.sections.forEach((section, sectionIndex) => {
      const sectionStartAngle = sectionIndex * degreesPerSection;
      const sectionAngle = degreesPerSection * section.confidence;
      const sectionEndAngle = sectionStartAngle + sectionAngle;

      segments.push({
        story,
        section,
        startAngle: sectionStartAngle,
        endAngle: sectionEndAngle,
        radius,
        strokeWidth,
      });
    });
  });

  // Calculate ring label positions
  const getRingLabelPosition = (storyIndex: number) => {
    const radius = baseRadius + storyIndex * radiusIncrement;
    const angle = -90; // Start at top
    const angleRad = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    return { x, y };
  };

  // Get section fill color
  const getSectionColor = (sectionKey: string): string => {
    const borderClass = SECTION_COLORS[sectionKey] || 'border-gray-400';
    return SECTION_FILL_COLORS[borderClass] || '#9ca3af';
  };

  // Toggle sort mode
  const cycleSortMode = () => {
    const modes: SortMode[] = ['confidence', 'date', 'category'];
    const currentIndex = modes.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSortMode(modes[nextIndex]);
  };

  // Format sort mode label
  const getSortModeLabel = (): string => {
    switch (sortMode) {
      case 'confidence':
        return 'Confidence';
      case 'date':
        return 'Date';
      case 'category':
        return 'Category';
      default:
        return 'Confidence';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Polar Rings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Concentric rings encode story sections and confidence levels
          </p>
        </div>
        <button
          onClick={cycleSortMode}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowUpDown className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Sort: {getSortModeLabel()}</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Left panel: Polar chart */}
        <div className="flex-shrink-0">
          <Card className="p-6">
            <div className="relative">
              <svg
                viewBox="0 0 500 500"
                className="h-[500px] w-[500px]"
                onMouseLeave={() => {
                  setHoveredStoryId(null);
                  setHoveredSection(null);
                }}
              >
                {/* Center dot */}
                <circle cx={centerX} cy={centerY} r="4" fill="#6b7280" opacity="0.3" />

                {/* Segments */}
                {segments.map((segment, idx) => {
                  const isHovered = hoveredSection?.storyId === segment.story.id && hoveredSection?.sectionKey === segment.section.key;
                  const isStoryHovered = hoveredStoryId === segment.story.id;
                  const fillColor = getSectionColor(segment.section.key);

                  const path = describeArc(
                    centerX,
                    centerY,
                    segment.radius,
                    segment.startAngle,
                    segment.endAngle,
                    segment.strokeWidth
                  );

                  return (
                    <path
                      key={`${segment.story.id}-${segment.section.key}-${idx}`}
                      d={path}
                      fill={fillColor}
                      opacity={isHovered ? 1 : isStoryHovered ? 0.85 : 0.7}
                      stroke="white"
                      strokeWidth="1"
                      className="transition-opacity cursor-pointer"
                      onMouseEnter={() => {
                        setHoveredStoryId(segment.story.id);
                        setHoveredSection({ storyId: segment.story.id, sectionKey: segment.section.key });
                      }}
                      onClick={() => setSelectedStoryId(segment.story.id === selectedStoryId ? null : segment.story.id)}
                    />
                  );
                })}

                {/* Ring labels */}
                {sortedStories.map((story, storyIndex) => {
                  const pos = getRingLabelPosition(storyIndex);
                  const isHovered = hoveredStoryId === story.id;
                  const isSelected = selectedStoryId === story.id;

                  return (
                    <g key={`label-${story.id}`}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="8"
                        fill={CATEGORY_RING_COLORS[story.category] || '#6b7280'}
                        opacity={isHovered || isSelected ? 1 : 0.6}
                        className="transition-opacity cursor-pointer"
                        onMouseEnter={() => setHoveredStoryId(story.id)}
                        onClick={() => setSelectedStoryId(story.id === selectedStoryId ? null : story.id)}
                      />
                      {(isHovered || isSelected) && (
                        <text
                          x={pos.x + 12}
                          y={pos.y + 4}
                          fontSize="11"
                          fontWeight="600"
                          fill="#1f2937"
                          className="pointer-events-none"
                        >
                          {story.title.substring(0, 30)}...
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {hoveredSection && (
                <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: getSectionColor(hoveredSection.sectionKey),
                      }}
                    />
                    <span className="text-xs font-semibold text-gray-700 uppercase">
                      {segments.find((s) => s.story.id === hoveredSection.storyId && s.section.key === hoveredSection.sectionKey)?.section.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">
                      Confidence: {Math.round((segments.find((s) => s.story.id === hoveredSection.storyId && s.section.key === hoveredSection.sectionKey)?.section.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                    {segments.find((s) => s.story.id === hoveredSection.storyId && s.section.key === hoveredSection.sectionKey)?.section.text}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right panel: Legend + Detail */}
        <div className="flex-1 space-y-6">
          {/* Legend */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-600" />
              Stories ({sortedStories.length})
            </h3>
            <div className="space-y-2">
              {sortedStories.map((story, storyIndex) => {
                const isHovered = hoveredStoryId === story.id;
                const isSelected = selectedStoryId === story.id;
                const conf = getConfidenceLevel(story.overallConfidence);

                return (
                  <button
                    key={story.id}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                      isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                    )}
                    onMouseEnter={() => setHoveredStoryId(story.id)}
                    onMouseLeave={() => setHoveredStoryId(null)}
                    onClick={() => setSelectedStoryId(story.id === selectedStoryId ? null : story.id)}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: CATEGORY_RING_COLORS[story.category] || '#6b7280',
                        opacity: isHovered || isSelected ? 1 : 0.6,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {story.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {FRAMEWORK_META[story.framework].label}
                        </Badge>
                        <span className={cn('text-[10px] font-medium', conf.color)}>
                          {Math.round(story.overallConfidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium">
                      Ring {storyIndex + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Section legend */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Section Colors</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries({
                situation: 'Situation',
                task: 'Task',
                action: 'Action',
                result: 'Result',
                challenge: 'Challenge',
                obstacles: 'Obstacles',
              }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSectionColor(key) }}
                  />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Detail panel */}
          {selectedStory && (
            <Card className="border-primary-200 shadow-md animate-in fade-in-0 slide-in-from-right-2 duration-300">
              <CardContent className="p-4 space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {selectedStory.title}
                    </h3>
                    <button
                      onClick={() => setSelectedStoryId(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn(CATEGORY_META[selectedStory.category].bgColor, CATEGORY_META[selectedStory.category].color, 'border-0 text-xs')}>
                      {CATEGORY_META[selectedStory.category].label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {FRAMEWORK_META[selectedStory.framework].label}
                    </Badge>
                    <Badge
                      className={cn(
                        STATUS_META[selectedStory.status].bgColor,
                        STATUS_META[selectedStory.status].color,
                        'border-0 text-xs'
                      )}
                    >
                      {STATUS_META[selectedStory.status].label}
                    </Badge>
                    <div className="flex gap-1">
                      {selectedStory.tools.map((t) => (
                        <ToolIcon key={t} tool={t} className="h-3 w-3 text-gray-500" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  {selectedStory.sections.map((section) => {
                    const secConf = getConfidenceLevel(section.confidence);
                    return (
                      <div
                        key={section.key}
                        className={cn('border-l-4 pl-3', SECTION_COLORS[section.key] || 'border-gray-300')}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            {section.label}
                          </h4>
                          <span className={cn('text-[10px] font-medium', secConf.color)}>
                            {Math.round(section.confidence * 100)}%
                          </span>
                          <span className="text-[10px] text-gray-500">
                            ({section.sourceCount} {section.sourceCount === 1 ? 'source' : 'sources'})
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {section.text}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Metadata */}
                <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Archetype:</span>
                    <span className="ml-1 font-medium text-gray-700">
                      {ARCHETYPE_META[selectedStory.archetype].label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Word count:</span>
                    <span className="ml-1 font-medium text-gray-700">
                      {selectedStory.wordCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Activities:</span>
                    <span className="ml-1 font-medium text-gray-700">
                      {selectedStory.activityCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Overall:</span>
                    <span className={cn('ml-1 font-medium', getConfidenceLevel(selectedStory.overallConfidence).color)}>
                      {Math.round(selectedStory.overallConfidence * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Help text */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Circle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <p className="font-medium mb-1">How to read this visualization:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Each concentric ring represents one story (innermost = highest confidence)</li>
              <li>Rings are divided into colored segments representing framework sections (Situation, Task, Action, Result, etc.)</li>
              <li>Arc length of each segment encodes section confidence (full arc = 100%, partial arc = lower confidence)</li>
              <li>Hover over segments to see section details, click rings to view full story</li>
              <li>Use the Sort button to reorder rings by confidence, date, or category</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
