'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories, CATEGORY_META, FRAMEWORK_META, SECTION_COLORS,
  getConfidenceLevel, type MockStory, type StoryCategory,
} from './mock-data';

const CAT_CIRCLE_COLORS: Record<StoryCategory, { fill: string; stroke: string; text: string }> = {
  'projects-impact': { fill: '#DBEAFE', stroke: '#3B82F6', text: 'text-blue-800' },
  leadership: { fill: '#F3E8FF', stroke: '#9333EA', text: 'text-purple-800' },
  growth: { fill: '#D1FAE5', stroke: '#10B981', text: 'text-emerald-800' },
  external: { fill: '#FEF3C7', stroke: '#F59E0B', text: 'text-amber-800' },
};

const categories: StoryCategory[] = ['projects-impact', 'leadership', 'growth', 'external'];

export function StoriesV6() {
  const [selectedStory, setSelectedStory] = useState<MockStory | null>(null);

  const centerX = 400;
  const centerY = 260;
  const catRadius = 160;
  const storyRadius = 100;

  // Layout: category nodes positioned radially around center, story nodes around each category
  const layout = useMemo(() => {
    const catNodes: { cat: StoryCategory; x: number; y: number; angle: number }[] = [];
    const usedCats = categories.filter(cat => mockStories.some(s => s.category === cat));

    usedCats.forEach((cat, i) => {
      const angle = (i / usedCats.length) * 2 * Math.PI - Math.PI / 2;
      catNodes.push({ cat, x: centerX + Math.cos(angle) * catRadius, y: centerY + Math.sin(angle) * catRadius, angle });
    });

    const storyNodes: { story: MockStory; x: number; y: number; catX: number; catY: number }[] = [];
    catNodes.forEach(catNode => {
      const stories = mockStories.filter(s => s.category === catNode.cat);
      stories.forEach((story, j) => {
        const spread = Math.PI * 0.6;
        const baseAngle = catNode.angle;
        const startAngle = baseAngle - spread / 2;
        const stepAngle = stories.length > 1 ? spread / (stories.length - 1) : 0;
        const angle = startAngle + j * stepAngle;
        storyNodes.push({
          story,
          x: catNode.x + Math.cos(angle) * storyRadius,
          y: catNode.y + Math.sin(angle) * storyRadius,
          catX: catNode.x,
          catY: catNode.y,
        });
      });
    });

    return { catNodes, storyNodes };
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* SVG mind map */}
      <div className="relative bg-gray-50 rounded-xl border overflow-hidden" style={{ height: 520 }}>
        <svg width="100%" height="100%" viewBox="0 0 800 520" className="absolute inset-0">
          {/* Lines: center -> category */}
          {layout.catNodes.map(catNode => (
            <line
              key={catNode.cat}
              x1={centerX} y1={centerY} x2={catNode.x} y2={catNode.y}
              stroke={CAT_CIRCLE_COLORS[catNode.cat].stroke}
              strokeWidth={2}
              strokeDasharray="6 3"
              opacity={0.4}
            />
          ))}
          {/* Lines: category -> story */}
          {layout.storyNodes.map(sn => (
            <line
              key={sn.story.id}
              x1={sn.catX} y1={sn.catY} x2={sn.x} y2={sn.y}
              stroke={CAT_CIRCLE_COLORS[sn.story.category].stroke}
              strokeWidth={1.5}
              opacity={0.3}
            />
          ))}
        </svg>

        {/* Center hub */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: centerX - 50, top: centerY - 24, width: 100, height: 48 }}
        >
          <div className="bg-primary-600 text-white text-[11px] font-bold px-3 py-2 rounded-full shadow-lg text-center leading-tight">
            My Career<br />Stories
          </div>
        </div>

        {/* Category nodes */}
        {layout.catNodes.map(catNode => {
          const colors = CAT_CIRCLE_COLORS[catNode.cat];
          return (
            <div
              key={catNode.cat}
              className="absolute flex items-center justify-center"
              style={{ left: catNode.x - 42, top: catNode.y - 16, width: 84, height: 32 }}
            >
              <div
                className={cn(colors.text, 'text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md text-center whitespace-nowrap')}
                style={{ backgroundColor: colors.fill, border: `2px solid ${colors.stroke}` }}
              >
                {CATEGORY_META[catNode.cat].label}
              </div>
            </div>
          );
        })}

        {/* Story nodes */}
        {layout.storyNodes.map(sn => {
          const conf = getConfidenceLevel(sn.story.overallConfidence);
          const colors = CAT_CIRCLE_COLORS[sn.story.category];
          const isSelected = selectedStory?.id === sn.story.id;
          return (
            <button
              key={sn.story.id}
              className={cn(
                'absolute flex flex-col items-center justify-center text-center transition-transform hover:scale-110',
                isSelected && 'scale-110'
              )}
              style={{ left: sn.x - 56, top: sn.y - 22, width: 112, height: 44 }}
              onClick={() => setSelectedStory(isSelected ? null : sn.story)}
            >
              <div
                className={cn('w-full rounded-md px-2 py-1 shadow-sm cursor-pointer', isSelected && 'ring-2 ring-primary-500')}
                style={{ backgroundColor: colors.fill, borderLeft: `3px solid ${colors.stroke}` }}
              >
                <p className="text-[9px] font-semibold text-gray-800 leading-tight line-clamp-2">{sn.story.title}</p>
                <span className={cn('text-[8px] font-medium', conf.color)}>{Math.round(sn.story.overallConfidence * 100)}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedStory && (
        <Card className="border-primary-200 shadow-md animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-900">{selectedStory.title}</CardTitle>
              <button onClick={() => setSelectedStory(null)} className="text-sm text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <div className="flex gap-2 mt-1">
              <Badge className={cn(CATEGORY_META[selectedStory.category].bgColor, CATEGORY_META[selectedStory.category].color, 'border-0')}>
                {CATEGORY_META[selectedStory.category].label}
              </Badge>
              <Badge variant="outline">{FRAMEWORK_META[selectedStory.framework].label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedStory.sections.map(sec => {
              const secConf = getConfidenceLevel(sec.confidence);
              return (
                <div key={sec.key} className={cn('border-l-4 pl-4', SECTION_COLORS[sec.key] || 'border-gray-300')}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">{sec.label}</h4>
                    <span className={cn('text-[10px] font-medium', secConf.color)}>{Math.round(sec.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{sec.text}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
