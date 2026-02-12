import { FileText, MessageSquare, Code, Users, GitBranch, Lightbulb, Grid3X3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockCompetencyMatrix } from '../../mock-data';
import type { CompetencyMatrixData, IntensityLevel } from '../../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, MessageSquare, Code, Users, GitBranch, Lightbulb,
};

const INTENSITY_HEX: Record<IntensityLevel, string> = {
  0: '#E6E6E6',
  1: '#E7D7F9',
  2: '#CFAFF3',
  3: '#9F5FE7',
  4: '#4B1E80',
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

export function CompetencyV4() {
  const { areas, weekLabels, totalWeeks } = mockCompetencyMatrix;
  const months = getMonthLabels(weekLabels);
  const segW = 14;
  const segGap = 1;
  const totalW = totalWeeks * (segW + segGap);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <CardTitle className="text-base">Competency Timeline</CardTitle>
        </div>
        <p className="text-xs text-gray-400 mt-1">26-week Gantt-style intensity view</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex items-center mb-2">
              <div className="w-[130px] shrink-0" />
              <div className="relative" style={{ width: totalW }}>
                {months.map((m) => (
                  <span
                    key={m.label + m.colStart}
                    className="text-[10px] text-gray-400 font-medium absolute"
                    style={{ left: m.colStart * (segW + segGap) }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="w-[50px] shrink-0" />
            </div>

            {/* Rows */}
            {areas.map((area) => {
              const Icon = ICON_MAP[area.icon];
              const score = getScore(area.weeks);
              return (
                <div key={area.name} className="flex items-center mb-1.5 group">
                  {/* Label */}
                  <div className="flex items-center gap-1.5 w-[130px] shrink-0">
                    {Icon && <Icon className="h-3.5 w-3.5 text-primary-500" />}
                    <span className="text-xs text-gray-600 truncate">{area.name}</span>
                  </div>

                  {/* Segments */}
                  <div className="flex" style={{ gap: segGap }}>
                    {area.weeks.map((level, wi) => (
                      <div
                        key={wi}
                        className="h-5 rounded-[2px] transition-opacity group-hover:opacity-90"
                        style={{
                          width: segW,
                          backgroundColor: INTENSITY_HEX[level],
                        }}
                        title={`${area.name} - ${new Date(weekLabels[wi]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: Level ${level}`}
                      />
                    ))}
                  </div>

                  {/* Score */}
                  <div className="w-[50px] shrink-0 text-right">
                    <span className={cn(
                      'text-xs font-semibold',
                      score >= 60 ? 'text-primary-600' : score >= 40 ? 'text-amber-600' : 'text-gray-400'
                    )}>
                      {score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
