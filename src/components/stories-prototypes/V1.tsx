'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, mockStoryStats, CATEGORY_META, FRAMEWORK_META, SECTION_COLORS,
  getConfidenceLevel, type MockStory, type StoryCategory,
} from './mock-data';
import { BookOpen, Eye, FileText, GitBranch, KanbanSquare, Hash, Figma, Video } from 'lucide-react';

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

const SPINE_COLORS: Record<StoryCategory, string> = {
  'projects-impact': 'bg-blue-600',
  leadership: 'bg-purple-600',
  growth: 'bg-emerald-600',
  external: 'bg-amber-600',
};

const categories: StoryCategory[] = ['projects-impact', 'leadership', 'growth', 'external'];

export function StoriesV1() {
  const [selectedStory, setSelectedStory] = useState<MockStory | null>(null);
  const published = mockStories.filter(s => s.status === 'published').length;
  const avgConf = mockStoryStats.avgConfidence;

  return (
    <div className="space-y-6 p-6">
      {/* Stats header */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-gray-600">Total Stories</span>
          <span className="text-lg font-bold text-primary-900">{mockStories.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-gray-600">Published</span>
          <span className="text-lg font-bold text-emerald-700">{published}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Avg Confidence</span>
          <span className="text-lg font-bold text-primary-700">{avgConf}%</span>
        </div>
      </div>

      {/* Bookshelf */}
      {categories.map(cat => {
        const stories = mockStories.filter(s => s.category === cat);
        if (stories.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className={cn('text-sm font-semibold uppercase tracking-wider', CATEGORY_META[cat].color)}>
              {CATEGORY_META[cat].label}
            </h3>
            {/* Shelf row */}
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {stories.map(story => {
                  const conf = getConfidenceLevel(story.overallConfidence);
                  const isSelected = selectedStory?.id === story.id;
                  return (
                    <button
                      key={story.id}
                      onClick={() => setSelectedStory(isSelected ? null : story)}
                      className={cn(
                        'group relative flex h-44 w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-r-md border shadow-md transition-all hover:shadow-lg hover:-translate-y-1',
                        isSelected ? 'ring-2 ring-primary-500 -translate-y-2' : 'border-gray-200'
                      )}
                    >
                      {/* Spine */}
                      <div className={cn('w-6 flex-shrink-0 flex items-center justify-center', SPINE_COLORS[cat])}>
                        <span className="text-[10px] font-bold text-white [writing-mode:vertical-rl] rotate-180 truncate max-h-36 px-0.5">
                          {story.title}
                        </span>
                      </div>
                      {/* Cover */}
                      <div className="flex flex-1 flex-col justify-between p-2 bg-white">
                        <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-4">
                          {story.title}
                        </p>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {FRAMEWORK_META[story.framework].label}
                          </Badge>
                          <div className={cn('text-[10px] font-medium', conf.color)}>
                            {Math.round(story.overallConfidence * 100)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Shelf line */}
              <div className="h-2 w-full rounded bg-gradient-to-b from-amber-800 to-amber-900 shadow-inner" />
            </div>
          </div>
        );
      })}

      {/* Reading pane */}
      {selectedStory && (
        <Card className="border-primary-200 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-primary-900">{selectedStory.title}</CardTitle>
              <button onClick={() => setSelectedStory(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                Close
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(CATEGORY_META[selectedStory.category].bgColor, CATEGORY_META[selectedStory.category].color, 'border-0')}>
                {CATEGORY_META[selectedStory.category].label}
              </Badge>
              <Badge variant="outline">{FRAMEWORK_META[selectedStory.framework].label}</Badge>
              <div className="flex gap-1 ml-2">
                {selectedStory.tools.map(t => (
                  <ToolIcon key={t} tool={t} className="h-3.5 w-3.5 text-gray-500" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedStory.sections.map(section => {
              const secConf = getConfidenceLevel(section.confidence);
              return (
                <div key={section.key} className={cn('border-l-4 pl-4', SECTION_COLORS[section.key] || 'border-gray-300')}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{section.label}</h4>
                    <span className={cn('text-xs font-medium', secConf.color)}>{Math.round(section.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{section.text}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
