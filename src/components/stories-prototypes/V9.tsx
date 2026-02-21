'use client';

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, mockStoryStats, CATEGORY_META, FRAMEWORK_META, ARCHETYPE_META, SECTION_COLORS,
  getConfidenceLevel,
} from './mock-data';
import { ChevronLeft, ChevronRight, BookOpen, Eye, TrendingUp, FileText, GitBranch, KanbanSquare, Hash, Figma, Video } from 'lucide-react';

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

export function StoriesV9() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = mockStories.length;

  const goNext = () => setCurrentIndex(i => (i + 1) % total);
  const goPrev = () => setCurrentIndex(i => (i - 1 + total) % total);

  const avgConf = mockStoryStats.avgConfidence;
  const published = mockStoryStats.published;

  return (
    <div className="p-6 space-y-8">
      {/* Card stack */}
      <div className="flex flex-col items-center">
        {/* Stack container */}
        <div className="relative w-full max-w-lg" style={{ height: 420 }}>
          {mockStories.map((story, idx) => {
            const offset = ((idx - currentIndex + total) % total);
            // Only render top 3 cards
            if (offset > 2 && offset < total - 0) return null;
            const isCurrent = offset === 0;
            const zIndex = 10 - offset;
            const translateY = offset * 12;
            const scale = 1 - offset * 0.04;
            const opacity = offset > 2 ? 0 : 1 - offset * 0.15;

            const cat = CATEGORY_META[story.category];
            const arch = ARCHETYPE_META[story.archetype];
            const conf = getConfidenceLevel(story.overallConfidence);
            const excerpt = story.sections[0].text.slice(0, 150) + '...';

            return (
              <Card
                key={story.id}
                className={cn(
                  'absolute inset-x-0 mx-auto transition-all duration-300 ease-out shadow-lg overflow-hidden',
                  isCurrent ? 'shadow-xl' : 'pointer-events-none'
                )}
                style={{
                  zIndex,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  opacity,
                  maxWidth: '100%',
                }}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Top badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn(cat.bgColor, cat.color, 'border-0')}>{cat.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{arch.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{FRAMEWORK_META[story.framework].label}</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{story.title}</h3>

                  {/* Tool icons */}
                  <div className="flex items-center gap-2">
                    {story.tools.map(t => (
                      <ToolIcon key={t} tool={t} className="h-4 w-4 text-gray-400" />
                    ))}
                  </div>

                  {/* Excerpt */}
                  <p className="text-sm text-gray-500 leading-relaxed">{excerpt}</p>

                  {/* Confidence bars per section */}
                  <div className="space-y-2">
                    {story.sections.map(sec => {
                      const secConf = getConfidenceLevel(sec.confidence);
                      const barColor = sec.confidence >= 0.8 ? 'bg-emerald-500' : sec.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-400';
                      return (
                        <div key={sec.key} className="flex items-center gap-3">
                          <span className="text-[10px] font-medium text-gray-500 w-16 text-right truncate">{sec.label}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                            <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${sec.confidence * 100}%` }} />
                          </div>
                          <span className={cn('text-[10px] font-medium w-8', secConf.color)}>{Math.round(sec.confidence * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={goPrev}
            className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-600">
            {currentIndex + 1} of {total}
          </span>
          <button
            onClick={goNext}
            className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Quick stats below stack */}
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{mockStoryStats.total}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{published}</p>
            <p className="text-[10px] text-gray-500">Published</p>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{avgConf}%</p>
            <p className="text-[10px] text-gray-500">Avg Confidence</p>
          </div>
        </div>
      </div>
    </div>
  );
}
