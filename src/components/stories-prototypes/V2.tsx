'use client';

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, CATEGORY_META, FRAMEWORK_META, STATUS_META, SECTION_COLORS, TOOL_META,
  getConfidenceLevel, type MockStory,
} from './mock-data';
import { Star, FileText, GitBranch, KanbanSquare, Hash, Figma, Video, ChevronDown } from 'lucide-react';

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

const CONF_BAR_COLORS: Record<string, string> = {
  Strong: 'bg-emerald-500',
  Fair: 'bg-amber-500',
  Weak: 'bg-red-500',
};

export function StoriesV2() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const featured = [...mockStories].sort((a, b) => b.overallConfidence - a.overallConfidence)[0];
  const rest = mockStories.filter(s => s.id !== featured.id);

  const renderCard = (story: MockStory, isFeatured: boolean) => {
    const cat = CATEGORY_META[story.category];
    const conf = getConfidenceLevel(story.overallConfidence);
    const status = STATUS_META[story.status];
    const expanded = expandedId === story.id;
    const excerpt = story.sections[0].text.slice(0, 100) + '...';
    const startDate = new Date(story.dateRange.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endDate = new Date(story.dateRange.end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return (
      <Card
        key={story.id}
        className={cn(
          'relative overflow-hidden cursor-pointer transition-shadow hover:shadow-lg break-inside-avoid mb-4',
          isFeatured && 'border-primary-300 shadow-md'
        )}
        onClick={() => setExpandedId(expanded ? null : story.id)}
      >
        {isFeatured && (
          <div className="absolute top-3 right-0 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-l-full flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" /> Featured
          </div>
        )}
        <CardContent className="p-5 space-y-3">
          {/* Category pill */}
          <Badge className={cn(cat.bgColor, cat.color, 'border-0 text-[11px]')}>{cat.label}</Badge>

          {/* Title */}
          <h3 className={cn('font-semibold text-gray-900 leading-snug', isFeatured ? 'text-lg' : 'text-base')}>
            {story.title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-gray-500 leading-relaxed">{excerpt}</p>

          {/* Tool icons */}
          <div className="flex items-center gap-2">
            {story.tools.map(t => (
              <span key={t} className="flex items-center gap-1 text-gray-400" title={TOOL_META[t].name}>
                <ToolIcon tool={t} className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>

          {/* Confidence meter */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Confidence</span>
              <span className={cn('font-medium', conf.color)}>{Math.round(story.overallConfidence * 100)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full transition-all', CONF_BAR_COLORS[conf.label])}
                style={{ width: `${story.overallConfidence * 100}%` }}
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>{startDate} - {endDate}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{story.activityCount} activities</Badge>
              <Badge className={cn(status.bgColor, status.color, 'border-0 text-[10px] px-1.5 py-0')}>{status.label}</Badge>
            </div>
          </div>

          {/* Expand indicator */}
          <div className="flex justify-center">
            <ChevronDown className={cn('h-4 w-4 text-gray-300 transition-transform', expanded && 'rotate-180')} />
          </div>

          {/* Expanded sections */}
          {expanded && (
            <div className="space-y-3 pt-3 border-t border-gray-100 animate-in fade-in-0 slide-in-from-top-1">
              {story.sections.map(sec => {
                const secConf = getConfidenceLevel(sec.confidence);
                return (
                  <div key={sec.key} className={cn('border-l-3 pl-3', SECTION_COLORS[sec.key] || 'border-gray-300')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{sec.label}</span>
                      <span className={cn('text-[10px] font-medium', secConf.color)}>{Math.round(sec.confidence * 100)}%</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{sec.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Featured */}
      {renderCard(featured, true)}

      {/* Masonry grid */}
      <div className="columns-1 lg:columns-2 gap-4">
        {rest.map(story => renderCard(story, false))}
      </div>
    </div>
  );
}
