'use client';

import { useState } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, CATEGORY_META, FRAMEWORK_META, SECTION_COLORS,
  getConfidenceLevel,
} from './mock-data';
import { Clock } from 'lucide-react';

export function StoriesV4() {
  const [claps, setClaps] = useState<Record<string, number>>({});

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-0">
      {mockStories.map((story, idx) => {
        const cat = CATEGORY_META[story.category];
        const readTime = Math.max(1, Math.ceil(story.wordCount / 200));
        const storyClaps = claps[story.id] || 0;
        const dateStr = new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        return (
          <div key={story.id}>
            {/* Article */}
            <article className="py-10">
              {/* Framework badge */}
              <div className="flex items-center justify-between mb-4">
                <Badge className={cn(cat.bgColor, cat.color, 'border-0 text-xs')}>
                  {cat.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {FRAMEWORK_META[story.framework].label}
                </Badge>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-serif font-bold text-gray-900 leading-tight mb-3">
                {story.title}
              </h2>

              {/* Author line */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
                <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-700">Y</span>
                </div>
                <span className="font-medium text-gray-700">You</span>
                <span className="text-gray-300">-</span>
                <span>{dateStr}</span>
                <span className="text-gray-300">-</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {readTime} min read
                </span>
              </div>

              {/* Sections as prose */}
              <div className="space-y-6">
                {story.sections.map(section => (
                  <div key={section.key}>
                    <h3 className={cn(
                      'text-[11px] font-semibold uppercase tracking-[0.15em] mb-2 pl-3 border-l-3',
                      SECTION_COLORS[section.key] || 'border-gray-300',
                      'text-gray-400'
                    )}>
                      {section.label}
                    </h3>
                    <p className="text-base text-gray-700 leading-[1.8] font-serif">
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Clap / confidence row */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setClaps(prev => ({ ...prev, [story.id]: (prev[story.id] || 0) + 1 }))}
                  className="group flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <span className="flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 group-hover:border-primary-300 group-hover:bg-primary-50 transition-colors">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.37 2.07a1 1 0 0 1 1.26 0l.1.08 4.5 4.5a1 1 0 0 1-1.32 1.5l-.1-.08L13 5.24V15a1 1 0 0 1-2 0V5.24L8.17 8.07a1 1 0 0 1-1.5-1.32l.08-.1 4.5-4.5.12-.08zM4 14a1 1 0 0 1 2 0v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4a1 1 0 1 1 2 0v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4z" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium">{storyClaps || ''}</span>
                </button>
                <div className="flex items-center gap-2">
                  {(() => {
                    const c = getConfidenceLevel(story.overallConfidence);
                    return (
                      <span className={cn('text-xs font-medium', c.color)}>
                        {c.label} ({Math.round(story.overallConfidence * 100)}%)
                      </span>
                    );
                  })()}
                </div>
              </div>
            </article>

            {/* Separator */}
            {idx < mockStories.length - 1 && (
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Read Next</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
