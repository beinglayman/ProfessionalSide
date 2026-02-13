'use client';

import { useState } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, CATEGORY_META, FRAMEWORK_META, SECTION_COLORS,
  getConfidenceLevel,
} from './mock-data';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export function StoriesV5() {
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(true);

  const story = mockStories[currentStoryIdx];
  const section = story.sections[currentSlide];
  const totalSlides = story.sections.length;
  const conf = getConfidenceLevel(section.confidence);

  const goNext = () => {
    if (currentSlide < totalSlides - 1) setCurrentSlide(s => s + 1);
  };
  const goPrev = () => {
    if (currentSlide > 0) setCurrentSlide(s => s - 1);
  };

  const selectStory = (idx: number) => {
    setCurrentStoryIdx(idx);
    setCurrentSlide(0);
  };

  const coachingTip = section.confidence >= 0.8
    ? 'This section is well-supported by evidence. Emphasize the quantitative results.'
    : section.confidence >= 0.6
      ? 'Consider adding more specific details or metrics to strengthen this section.'
      : 'This section needs more evidence. Try to recall concrete examples or data points.';

  return (
    <div className="flex h-[600px] bg-gray-950 rounded-xl overflow-hidden">
      {/* Main presentation area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {/* Story selector */}
            <div className="relative">
              <select
                value={currentStoryIdx}
                onChange={e => selectStory(Number(e.target.value))}
                className="appearance-none bg-gray-900 text-white text-sm border border-gray-700 rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {mockStories.map((s, i) => (
                  <option key={s.id} value={i}>{s.title.slice(0, 50)}{s.title.length > 50 ? '...' : ''}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
            <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px]">
              {FRAMEWORK_META[story.framework].label}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Slide {currentSlide + 1} of {totalSlides}
            </span>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showNotes ? 'Hide' : 'Show'} Notes
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          <div className="max-w-3xl w-full text-center space-y-6">
            {/* Section label */}
            <div className="flex items-center justify-center gap-3">
              <div className={cn('h-1 w-12 rounded-full', SECTION_COLORS[section.key]?.replace('border-', 'bg-') || 'bg-gray-600')} />
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
                {section.label}
              </h2>
              <div className={cn('h-1 w-12 rounded-full', SECTION_COLORS[section.key]?.replace('border-', 'bg-') || 'bg-gray-600')} />
            </div>

            {/* Section text */}
            <p className="text-lg text-gray-200 leading-relaxed">
              {section.text}
            </p>

            {/* Confidence */}
            <Badge className={cn(conf.bgColor, conf.color, 'border-0 text-xs')}>
              {Math.round(section.confidence * 100)}% confidence - {section.sourceCount} sources
            </Badge>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className={cn('flex items-center gap-1 text-sm transition-colors', currentSlide === 0 ? 'text-gray-700' : 'text-gray-400 hover:text-white')}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {story.sections.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === currentSlide ? 'w-6 bg-primary-500' : 'w-2 bg-gray-700 hover:bg-gray-500'
                )}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            disabled={currentSlide === totalSlides - 1}
            className={cn('flex items-center gap-1 text-sm transition-colors', currentSlide === totalSlides - 1 ? 'text-gray-700' : 'text-gray-400 hover:text-white')}
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Speaker notes panel */}
      {showNotes && (
        <aside className="w-72 border-l border-gray-800 bg-gray-900 p-5 flex flex-col gap-4 overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Speaker Notes</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-800">
              <p className="text-xs font-medium text-gray-400 mb-1">Coaching Tip</p>
              <p className="text-sm text-gray-300 leading-relaxed">{coachingTip}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800">
              <p className="text-xs font-medium text-gray-400 mb-1">Section Info</p>
              <p className="text-sm text-gray-300">
                {section.sourceCount} source{section.sourceCount !== 1 ? 's' : ''} referenced
              </p>
              <p className="text-sm text-gray-300 mt-1">
                Confidence: <span className={cn('font-medium', conf.color)}>{conf.label}</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800">
              <p className="text-xs font-medium text-gray-400 mb-1">Story Overview</p>
              <p className="text-sm text-gray-300">{CATEGORY_META[story.category].label}</p>
              <p className="text-sm text-gray-300 mt-1">Overall: {Math.round(story.overallConfidence * 100)}%</p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
