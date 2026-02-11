import { useState, useMemo } from 'react';
import {
  Grid3X3,
  FileText,
  MessageSquare,
  Code,
  Users,
  GitBranch,
  Lightbulb,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/card';
import { cn } from '../../../lib/utils';
import type { CompetencyMatrixData, IntensityLevel, WidgetVariant } from '../types';

interface RoleCompetencyMatrixProps {
  data: CompetencyMatrixData;
  variant?: WidgetVariant;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  MessageSquare,
  Code,
  Users,
  GitBranch,
  Lightbulb,
};

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: 'bg-gray-100',
  1: 'bg-primary-100',
  2: 'bg-primary-200',
  3: 'bg-primary-400',
  4: 'bg-primary-600',
};

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  0: 'No activity',
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Very high',
};

function getMonthLabels(weekDates: string[]): { label: string; colStart: number; colSpan: number }[] {
  const months: { label: string; colStart: number; colSpan: number }[] = [];
  let currentMonthKey = '';
  let groupStart = 0;

  for (let i = 0; i <= weekDates.length; i++) {
    const monthKey = i < weekDates.length
      ? `${new Date(weekDates[i]).getFullYear()}-${new Date(weekDates[i]).getMonth()}`
      : '';

    if (monthKey !== currentMonthKey) {
      if (currentMonthKey !== '' && groupStart < i) {
        months.push({
          label: new Date(weekDates[groupStart]).toLocaleDateString('en-US', { month: 'short' }),
          colStart: groupStart,
          colSpan: i - groupStart,
        });
      }
      currentMonthKey = monthKey;
      groupStart = i;
    }
  }

  return months;
}

function Tooltip({
  children,
  content,
}: {
  children: React.ReactElement;
  content: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-50 -translate-x-1/2 -translate-y-full">
          <div className="whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-[10px] leading-tight text-white shadow-lg">
            {content}
          </div>
          <div className="mx-auto h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

function IntensityCell({
  level,
  weekDate,
  areaName,
}: {
  level: IntensityLevel;
  weekDate: string;
  areaName: string;
}) {
  const formattedDate = new Date(weekDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{areaName}</span>
          <span className="text-gray-300">Week of {formattedDate}</span>
          <span className="text-gray-300">{INTENSITY_LABELS[level]} activity</span>
        </div>
      }
    >
      <div
        className={cn(
          'h-3 w-3 rounded-[3px] transition-all duration-150 hover:scale-125 hover:ring-1 hover:ring-primary-300 hover:ring-offset-1',
          INTENSITY_COLORS[level]
        )}
      />
    </Tooltip>
  );
}

function Legend() {
  const levels: IntensityLevel[] = [0, 1, 2, 3, 4];

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400">Less</span>
      {levels.map((level) => (
        <div
          key={level}
          className={cn('h-3 w-3 rounded-[3px]', INTENSITY_COLORS[level])}
        />
      ))}
      <span className="text-[10px] text-gray-400">More</span>
    </div>
  );
}

export function RoleCompetencyMatrix({ data, variant = 'detailed' }: RoleCompetencyMatrixProps) {
  const isCompact = variant === 'compact';
  const isMinimal = variant === 'minimal';

  const monthLabels = useMemo(() => getMonthLabels(data.weekLabels), [data.weekLabels]);

  // Calculate totals per area for summary
  const areaSummaries = useMemo(() => {
    return data.areas.map((area) => {
      const total = area.weeks.reduce((sum, w) => sum + w, 0);
      const maxPossible = area.weeks.length * 4;
      return {
        name: area.name,
        icon: area.icon,
        score: Math.round((total / maxPossible) * 100),
      };
    });
  }, [data.areas]);

  if (isMinimal) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary-500" />
            <CardTitle className="text-base">Competency Matrix</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {areaSummaries.map((area) => {
              const IconComp = ICON_MAP[area.icon];
              return (
                <div key={area.name} className="flex items-center gap-2">
                  {IconComp && <IconComp className="h-3.5 w-3.5 text-gray-400" />}
                  <span className="flex-1 text-xs text-gray-600">{area.name}</span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-400"
                      style={{ width: `${area.score}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[10px] tabular-nums text-gray-400">{area.score}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Grid3X3 className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-base">Role Competency Matrix</CardTitle>
              {!isCompact && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {data.areas.length} competencies tracked over {data.totalWeeks} weeks
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Heatmap grid */}
            <div className="flex flex-col gap-1.5">
              {data.areas.map((area) => {
                const IconComp = ICON_MAP[area.icon];

                return (
                  <div key={area.name} className="flex items-center gap-2">
                    {/* Row label */}
                    <div className={cn('flex items-center gap-1.5 shrink-0', isCompact ? 'w-[90px]' : 'w-[130px]')}>
                      {IconComp && (
                        <IconComp className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      )}
                      <span className="truncate text-xs font-medium text-gray-600">
                        {area.name}
                      </span>
                    </div>

                    {/* Cells */}
                    <div className="flex gap-[3px]">
                      {area.weeks.map((level, weekIdx) => (
                        <IntensityCell
                          key={weekIdx}
                          level={level}
                          weekDate={data.weekLabels[weekIdx]}
                          areaName={area.name}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Month labels along the bottom */}
            <div className="mt-2 flex items-center">
              <div className={cn('shrink-0', isCompact ? 'w-[90px]' : 'w-[130px]')} />
              <div className="flex" style={{ gap: '3px' }}>
                {(() => {
                  const cells: React.ReactNode[] = [];
                  let weekIdx = 0;
                  for (const month of monthLabels) {
                    for (let i = 0; i < month.colSpan; i++) {
                      cells.push(
                        <div key={weekIdx} className="flex w-3 items-start justify-center">
                          {i === 0 && month.colSpan >= 2 && (
                            <span className="whitespace-nowrap text-[9px] text-gray-400">
                              {month.label}
                            </span>
                          )}
                        </div>
                      );
                      weekIdx++;
                    }
                  }
                  return cells;
                })()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between border-t border-gray-100 pt-3">
        <div className="flex flex-wrap gap-3">
          {areaSummaries.map((area) => (
            <span key={area.name} className="text-[10px] text-gray-400">
              <span className="font-medium text-gray-500">{area.name}:</span> {area.score}%
            </span>
          ))}
        </div>
        <Legend />
      </CardFooter>
    </Card>
  );
}
