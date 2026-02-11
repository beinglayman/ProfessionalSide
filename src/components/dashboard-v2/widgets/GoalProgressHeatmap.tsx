import React, { useMemo, useState } from 'react';
import { Flame, Zap, Calendar, Target } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import type { GoalProgressHeatmapData, HeatmapDay, IntensityLevel, WidgetVariant } from '../types';

interface GoalProgressHeatmapProps {
  data: GoalProgressHeatmapData;
  variant?: WidgetVariant;
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const DAY_LABEL_WIDTH = 32;
const MONTH_LABEL_HEIGHT = 18;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: '#E6E6E6',
  1: '#E7D7F9',
  2: '#CFAFF3',
  3: '#9F5FE7',
  4: '#4B1E80',
};

interface TooltipData {
  day: HeatmapDay;
  x: number;
  y: number;
}

function buildWeekGrid(days: HeatmapDay[]) {
  if (days.length === 0) return [];

  const firstDate = new Date(days[0].date + 'T00:00:00');
  const firstDayOfWeek = firstDate.getDay();

  const grid: (HeatmapDay | null)[][] = [];
  let currentWeek: (HeatmapDay | null)[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (const day of days) {
    if (currentWeek.length === 7) {
      grid.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    grid.push(currentWeek);
  }

  return grid;
}

function getMonthLabels(weeks: (HeatmapDay | null)[][]) {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks.length; w++) {
    const firstRealDay = weeks[w].find((d) => d !== null);
    if (!firstRealDay) continue;
    const month = new Date(firstRealDay.date + 'T00:00:00').getMonth();
    if (month !== lastMonth) {
      labels.push({ label: MONTH_NAMES[month], weekIndex: w });
      lastMonth = month;
    }
  }

  return labels;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const GoalProgressHeatmap: React.FC<GoalProgressHeatmapProps> = ({
  data,
  variant = 'detailed',
}) => {
  const isMinimal = variant === 'minimal';
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const weeks = useMemo(() => buildWeekGrid(data.days), [data.days]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  const totalWidth = DAY_LABEL_WIDTH + weeks.length * (CELL_SIZE + CELL_GAP);
  const totalHeight = MONTH_LABEL_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <Flame className="h-5 w-5 text-primary-500" />
            </div>
            <CardTitle className="text-lg">Goal Progress</CardTitle>
          </div>
          <Badge className="gap-1 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
            <Zap className="h-3 w-3" />
            {data.currentStreak} day streak
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Heatmap */}
        <div className="relative overflow-x-auto pb-2">
          <svg
            width={totalWidth}
            height={totalHeight}
            className="block"
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Month labels */}
            {monthLabels.map(({ label, weekIndex }) => (
              <text
                key={`${label}-${weekIndex}`}
                x={DAY_LABEL_WIDTH + weekIndex * (CELL_SIZE + CELL_GAP)}
                y={12}
                className="fill-gray-400 text-[10px]"
              >
                {label}
              </text>
            ))}

            {/* Day labels */}
            {DAY_LABELS.map((label, idx) => (
              <text
                key={idx}
                x={0}
                y={MONTH_LABEL_HEIGHT + idx * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
                className="fill-gray-400 text-[10px]"
              >
                {label}
              </text>
            ))}

            {/* Heatmap cells */}
            {weeks.map((week, wIdx) =>
              week.map((day, dIdx) => {
                if (!day) return null;
                const x = DAY_LABEL_WIDTH + wIdx * (CELL_SIZE + CELL_GAP);
                const y = MONTH_LABEL_HEIGHT + dIdx * (CELL_SIZE + CELL_GAP);

                return (
                  <rect
                    key={day.date}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2.5}
                    ry={2.5}
                    fill={INTENSITY_COLORS[day.intensity]}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={(e) => {
                      const svgRect = (e.target as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
                      if (svgRect) {
                        setTooltip({
                          day,
                          x: x + CELL_SIZE / 2,
                          y: y,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y - 8}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="text-xs font-semibold text-gray-900">
                {formatDate(tooltip.day.date)}
              </p>
              <p className="text-xs text-gray-500">
                {tooltip.day.count} contribution{tooltip.day.count !== 1 ? 's' : ''}
              </p>
              {tooltip.day.details.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {tooltip.day.details.map((detail, idx) => (
                    <li key={idx} className="text-[10px] text-gray-500">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Bottom section: Stats + Legend */}
        {!isMinimal && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            {/* Stats pills */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <p className="text-xs text-gray-500">Current Streak</p>
                  <p className="text-sm font-bold text-gray-900">
                    {data.currentStreak} days
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <Target className="h-3.5 w-3.5 text-primary-500" />
                <div>
                  <p className="text-xs text-gray-500">Longest Streak</p>
                  <p className="text-sm font-bold text-gray-900">
                    {data.longestStreak} days
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <Calendar className="h-3.5 w-3.5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Active Days</p>
                  <p className="text-sm font-bold text-gray-900">
                    {data.totalActiveDays}
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs text-gray-400">Less</span>
              {([0, 1, 2, 3, 4] as IntensityLevel[]).map((level) => (
                <div
                  key={level}
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: INTENSITY_COLORS[level] }}
                />
              ))}
              <span className="ml-1 text-xs text-gray-400">More</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
