'use client';

import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, mockStoryStats, CATEGORY_META, FRAMEWORK_META, STATUS_META, SECTION_COLORS, TOOL_META,
  getConfidenceLevel,
} from './mock-data';
import { BookOpen, Eye, TrendingUp, FileText, GitBranch, SquareKanban, Hash, Figma, Video } from 'lucide-react';

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

export function StoriesV7() {
  const sorted = [...mockStories].sort((a, b) => b.overallConfidence - a.overallConfidence);
  const featured = sorted[0];
  const recent = sorted.slice(1, 3);
  const avgConf = mockStoryStats.avgConfidence;
  const publishedPct = Math.round((mockStoryStats.published / mockStoryStats.total) * 100);
  const featConf = getConfidenceLevel(featured.overallConfidence);

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 grid-rows-[auto_auto] gap-4">
        {/* Featured — large tile (col-span-2, row-span-2) */}
        <Card className="col-span-2 row-span-2 border-primary-200 shadow-md overflow-hidden">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={cn(CATEGORY_META[featured.category].bgColor, CATEGORY_META[featured.category].color, 'border-0')}>
                {CATEGORY_META[featured.category].label}
              </Badge>
              <Badge variant="outline">{FRAMEWORK_META[featured.framework].label}</Badge>
              <Badge className="bg-primary-100 text-primary-700 border-0 text-[10px]">Featured</Badge>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{featured.title}</h2>

            {/* First two sections */}
            <div className="space-y-4 flex-1">
              {featured.sections.slice(0, 2).map(sec => (
                <div key={sec.key} className={cn('border-l-3 pl-4', SECTION_COLORS[sec.key] || 'border-gray-300')}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{sec.label}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{sec.text}</p>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-1.5">
                {featured.tools.map(t => (
                  <span key={t} title={TOOL_META[t].name}>
                    <ToolIcon tool={t} className="h-4 w-4 text-gray-400" />
                  </span>
                ))}
              </div>
              {/* Confidence gauge */}
              <div className="flex items-center gap-2">
                <div className="relative h-10 w-10">
                  <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke={featured.overallConfidence >= 0.8 ? '#10B981' : featured.overallConfidence >= 0.6 ? '#F59E0B' : '#EF4444'}
                      strokeWidth="3"
                      strokeDasharray={`${featured.overallConfidence * 94.2} 94.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                    {Math.round(featured.overallConfidence * 100)}
                  </span>
                </div>
                <span className={cn('text-xs font-medium', featConf.color)}>{featConf.label}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medium tiles — recent stories */}
        {recent.map(story => {
          const cat = CATEGORY_META[story.category];
          const status = STATUS_META[story.status];
          const conf = getConfidenceLevel(story.overallConfidence);
          return (
            <Card key={story.id} className="col-span-1 row-span-2 shadow-sm">
              <CardContent className="p-5 h-full flex flex-col">
                <Badge className={cn(cat.bgColor, cat.color, 'border-0 text-[10px] self-start mb-2')}>{cat.label}</Badge>
                <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{story.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed flex-1">
                  {story.sections[0].text.slice(0, 120)}...
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <Badge className={cn(status.bgColor, status.color, 'border-0 text-[10px]')}>{status.label}</Badge>
                  <span className={cn('text-xs font-medium', conf.color)}>{Math.round(story.overallConfidence * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Small stat tile 1: Total stories */}
        <Card className="col-span-1 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mockStoryStats.total}</p>
              <p className="text-xs text-gray-500">Total Stories</p>
            </div>
          </CardContent>
        </Card>

        {/* Small stat tile 2: Published % */}
        <Card className="col-span-1 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Eye className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{publishedPct}%</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
          </CardContent>
        </Card>

        {/* Small stat tile 3: Avg confidence circular progress */}
        <Card className="col-span-1 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3"
                  strokeDasharray={`${(avgConf / 100) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-700">
                {avgConf}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Avg Confidence</p>
              <p className="text-xs text-gray-500">{avgConf}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Small stat tile 4: total activities (bonus) */}
        <Card className="col-span-1 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mockStoryStats.totalActivities}</p>
              <p className="text-xs text-gray-500">Activities</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
