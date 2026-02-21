'use client';

import { useState, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, CATEGORY_META, FRAMEWORK_META, STATUS_META, SECTION_COLORS,
  getConfidenceLevel, type MockStory, type StoryCategory,
} from './mock-data';
import { Search, ChevronDown, FileText, GitBranch, KanbanSquare, Hash, Figma, Video } from 'lucide-react';

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

const categories: StoryCategory[] = ['projects-impact', 'leadership', 'growth', 'external'];

export function StoriesV3() {
  const [selectedStory, setSelectedStory] = useState<MockStory>(mockStories[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Set<StoryCategory>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return mockStories;
    const q = searchQuery.toLowerCase();
    return mockStories.filter(s => s.title.toLowerCase().includes(q));
  }, [searchQuery]);

  const toggleCat = (cat: StoryCategory) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const conf = getConfidenceLevel(selectedStory.overallConfidence);

  return (
    <div className="flex h-[700px] border rounded-lg overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 border-r bg-gray-50 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
        </div>

        {/* Grouped list */}
        <div className="flex-1 overflow-y-auto">
          {categories.map(cat => {
            const stories = filtered.filter(s => s.category === cat);
            if (stories.length === 0) return null;
            const collapsed = collapsedCats.has(cat);
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCat(cat)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                >
                  <span>{CATEGORY_META[cat].label}</span>
                  <ChevronDown className={cn('h-3 w-3 transition-transform', collapsed && '-rotate-90')} />
                </button>
                {!collapsed && stories.map(story => {
                  const status = STATUS_META[story.status];
                  const isActive = selectedStory.id === story.id;
                  return (
                    <button
                      key={story.id}
                      onClick={() => setSelectedStory(story)}
                      className={cn(
                        'flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors',
                        isActive ? 'bg-primary-50 border-r-2 border-primary-500' : 'hover:bg-gray-100'
                      )}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', status.dotColor)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm leading-snug truncate', isActive ? 'font-semibold text-primary-900' : 'text-gray-700')}>
                          {story.title}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[9px] px-1 py-0">
                          {FRAMEWORK_META[story.framework].label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn(CATEGORY_META[selectedStory.category].bgColor, CATEGORY_META[selectedStory.category].color, 'border-0')}>
                {CATEGORY_META[selectedStory.category].label}
              </Badge>
              <Badge variant="outline">{FRAMEWORK_META[selectedStory.framework].label}</Badge>
              <Badge className={cn(conf.bgColor, conf.color, 'border-0')}>{Math.round(selectedStory.overallConfidence * 100)}% confidence</Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{selectedStory.title}</h1>
            <div className="flex items-center gap-3 mt-3">
              {selectedStory.tools.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs text-gray-400">
                  <ToolIcon tool={t} className="h-3.5 w-3.5" />
                </span>
              ))}
            </div>
          </div>

          {/* Sections */}
          {selectedStory.sections.map(section => {
            const secConf = getConfidenceLevel(section.confidence);
            return (
              <div key={section.key} className={cn('border-l-4 pl-5 py-1', SECTION_COLORS[section.key] || 'border-gray-300')}>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{section.label}</h2>
                  <Badge className={cn(secConf.bgColor, secConf.color, 'border-0 text-[10px] px-1.5 py-0')}>
                    {Math.round(section.confidence * 100)}%
                  </Badge>
                  <span className="text-[10px] text-gray-400">{section.sourceCount} sources</span>
                </div>
                <p className="text-base text-gray-700 leading-relaxed">{section.text}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
