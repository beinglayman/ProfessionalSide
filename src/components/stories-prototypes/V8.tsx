'use client';

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, CATEGORY_META, FRAMEWORK_META, SECTION_COLORS, TOOL_META,
  getConfidenceLevel, type MockStory,
} from './mock-data';
import { ChevronDown, FileText, GitBranch, SquareKanban, Hash, Figma, Video } from 'lucide-react';

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

function StoryPanel({ story, label }: { story: MockStory; label: string }) {
  const cat = CATEGORY_META[story.category];
  const conf = getConfidenceLevel(story.overallConfidence);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className={cn(cat.bgColor, cat.color, 'border-0')}>{cat.label}</Badge>
        <Badge variant="outline">{FRAMEWORK_META[story.framework].label}</Badge>
      </div>
      <h3 className="text-lg font-bold text-gray-900 leading-snug">{story.title}</h3>

      {/* Sections */}
      <div className="space-y-4">
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

      {/* Tools row */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {story.tools.map(t => (
          <span key={t} className="flex items-center gap-1 text-xs text-gray-400" title={TOOL_META[t].name}>
            <ToolIcon tool={t} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{TOOL_META[t].name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StoriesV8() {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);

  const leftStory = mockStories[leftIdx];
  const rightStory = mockStories[rightIdx];

  const leftConf = leftStory.overallConfidence;
  const rightConf = rightStory.overallConfidence;

  // Tool overlap
  const leftTools = new Set(leftStory.tools);
  const rightTools = new Set(rightStory.tools);
  const sharedTools = leftStory.tools.filter(t => rightTools.has(t));
  const leftOnlyTools = leftStory.tools.filter(t => !rightTools.has(t));
  const rightOnlyTools = rightStory.tools.filter(t => !leftTools.has(t));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Story Comparison</h2>
        <p className="text-sm text-gray-500 mt-1">Compare two stories side-by-side</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
        {/* Left panel */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="relative">
              <select
                value={leftIdx}
                onChange={e => setLeftIdx(Number(e.target.value))}
                className="w-full appearance-none rounded-md border bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                {mockStories.map((s, i) => (
                  <option key={s.id} value={i}>{s.title.slice(0, 55)}{s.title.length > 55 ? '...' : ''}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <StoryPanel story={leftStory} label="Left" />
          </CardContent>
        </Card>

        {/* Comparison indicators */}
        <div className="flex flex-col items-center justify-center gap-6 min-w-[160px]">
          {/* Confidence comparison */}
          <div className="bg-white border rounded-lg p-4 w-full shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 text-center">Confidence</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6 text-right">{Math.round(leftConf * 100)}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${leftConf * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6 text-right">{Math.round(rightConf * 100)}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${rightConf * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Source count */}
          <div className="bg-white border rounded-lg p-4 w-full shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">Sources</p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-lg font-bold text-primary-700">
                {leftStory.sections.reduce((s, sec) => s + sec.sourceCount, 0)}
              </span>
              <span className="text-xs text-gray-400">vs</span>
              <span className="text-lg font-bold text-amber-700">
                {rightStory.sections.reduce((s, sec) => s + sec.sourceCount, 0)}
              </span>
            </div>
          </div>

          {/* Tool overlap */}
          <div className="bg-white border rounded-lg p-4 w-full shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">Tool Overlap</p>
            {sharedTools.length > 0 && (
              <div className="flex items-center justify-center gap-1 mb-1">
                {sharedTools.map(t => <ToolIcon key={t} tool={t} className="h-3.5 w-3.5 text-emerald-500" />)}
                <span className="text-[9px] text-emerald-600 ml-1">Shared</span>
              </div>
            )}
            {leftOnlyTools.length > 0 && (
              <div className="flex items-center justify-center gap-1 mb-1">
                {leftOnlyTools.map(t => <ToolIcon key={t} tool={t} className="h-3.5 w-3.5 text-primary-400" />)}
                <span className="text-[9px] text-primary-500 ml-1">Left only</span>
              </div>
            )}
            {rightOnlyTools.length > 0 && (
              <div className="flex items-center justify-center gap-1">
                {rightOnlyTools.map(t => <ToolIcon key={t} tool={t} className="h-3.5 w-3.5 text-amber-400" />)}
                <span className="text-[9px] text-amber-500 ml-1">Right only</span>
              </div>
            )}
          </div>

          {/* Activity count */}
          <div className="bg-white border rounded-lg p-4 w-full shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">Activities</p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-lg font-bold text-primary-700">{leftStory.activityCount}</span>
              <span className="text-xs text-gray-400">vs</span>
              <span className="text-lg font-bold text-amber-700">{rightStory.activityCount}</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="relative">
              <select
                value={rightIdx}
                onChange={e => setRightIdx(Number(e.target.value))}
                className="w-full appearance-none rounded-md border bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                {mockStories.map((s, i) => (
                  <option key={s.id} value={i}>{s.title.slice(0, 55)}{s.title.length > 55 ? '...' : ''}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <StoryPanel story={rightStory} label="Right" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
