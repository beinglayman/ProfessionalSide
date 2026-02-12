import { useState } from 'react';
import { FileText, MessageSquare, Code, Users, GitBranch, Lightbulb, Grid3X3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, MessageSquare, Code, Users, GitBranch, Lightbulb,
};

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: 'bg-gray-100',
  1: 'bg-primary-100',
  2: 'bg-primary-200',
  3: 'bg-primary-400',
  4: 'bg-primary-600',
};

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Very High',
};

function getScore(weeks: IntensityLevel[]): number {
  return Math.round((weeks.reduce((s, w) => s + w, 0) / (weeks.length * 4)) * 100);
}

function getMonthLabels(weekLabels: string[]): { label: string; colStart: number }[] {
  const months: { label: string; colStart: number }[] = [];
  let lastMonth = '';
  weekLabels.forEach((dateStr, i) => {
    const d = new Date(dateStr);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    if (month !== lastMonth) {
      months.push({ label: month, colStart: i });
      lastMonth = month;
    }
  });
  return months;
}

export function CompetencyV1() {
  const { areas, weekLabels, totalWeeks } = mockCompetencyMatrix;
  const months = getMonthLabels(weekLabels);
  const [tooltip, setTooltip] = useState<{ area: string; date: string; level: IntensityLevel; x: number; y: number } | null>(null);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Role Competency Matrix</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="overflow-x-auto">
          <div className="inline-block">
            {/* Grid rows */}
            {areas.map((area) => {
              const Icon = ICON_MAP[area.icon];
              return (
                <div key={area.name} className="flex items-center gap-3 mb-1">
                  <div className="flex items-center gap-1.5 w-[130px] shrink-0">
                    {Icon && <Icon className="h-3.5 w-3.5 text-primary-500" />}
                    <span className="text-xs text-gray-600 truncate">{area.name}</span>
                  </div>
                  <div className="flex gap-[3px]">
                    {area.weeks.map((level, wi) => (
                      <div
                        key={wi}
                        className={cn('w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125', INTENSITY_COLORS[level])}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ area: area.name, date: weekLabels[wi], level, x: rect.left, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Month labels */}
            <div className="flex items-center gap-3 mt-2">
              <div className="w-[130px] shrink-0" />
              <div className="flex relative" style={{ width: totalWeeks * 15 }}>
                {months.map((m) => (
                  <span
                    key={m.label + m.colStart}
                    className="text-[10px] text-gray-400 absolute"
                    style={{ left: m.colStart * 15 }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div className="fixed z-50 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md shadow-lg pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y - 40 }}>
            <div className="font-medium">{tooltip.area}</div>
            <div className="text-gray-300">{new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &middot; {INTENSITY_LABELS[tooltip.level]}</div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-start gap-3 pt-2">
        {/* Area scores */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {areas.map((area) => {
            const Icon = ICON_MAP[area.icon];
            return (
              <div key={area.name} className="flex items-center gap-1 text-xs text-gray-500">
                {Icon && <Icon className="h-3 w-3" />}
                <span>{area.name}:</span>
                <span className="font-semibold text-gray-700">{getScore(area.weeks)}%</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as IntensityLevel[]).map((level) => (
            <div key={level} className={cn('w-3 h-3 rounded-sm', INTENSITY_COLORS[level])} />
          ))}
          <span>More</span>
        </div>
      </CardFooter>
    </Card>
  );
}
