import { useState, useMemo } from 'react';
import {
  FileText, MessageSquare, Code, Users, Paintbrush, Grid3X3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { cn } from '../../lib/utils';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { IntensityLevel } from '../dashboard-v2/types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

type ViewMode = 'heatmap' | 'radar';

const WORK_AREAS = [
  { name: 'Engineering', sources: ['github'], icon: Code },
  { name: 'Project Mgmt', sources: ['jira'], icon: FileText },
  { name: 'Communication', sources: ['slack', 'teams'], icon: MessageSquare },
  { name: 'Documentation', sources: ['confluence', 'google-docs'], icon: FileText },
  { name: 'Meetings', sources: ['google-calendar', 'google-meet', 'outlook'], icon: Users },
  { name: 'Design', sources: ['figma'], icon: Paintbrush },
] as const;

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: 'bg-gray-100',
  1: 'bg-primary-100',
  2: 'bg-primary-200',
  3: 'bg-primary-400',
  4: 'bg-primary-600',
};

function toIntensity(count: number, max: number): IntensityLevel {
  if (count === 0) return 0;
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function getISODay(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function CompetencyKPIWidget() {
  const [view, setView] = useState<ViewMode>('heatmap');

  const { data: activitiesData } = useActivities({ limit: 200 });
  const activities = useMemo(() => {
    if (!activitiesData) return [];
    if (isGroupedResponse(activitiesData)) {
      return activitiesData.groups.flatMap((g) => g.activities ?? []);
    }
    return activitiesData.data ?? [];
  }, [activitiesData]);

  // Build last 14 days
  const last14Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(getISODay(d));
    }
    return days;
  }, []);

  // Map activities → work area × day grid
  const { grid, hasData } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    let max = 0;

    for (const area of WORK_AREAS) {
      counts[area.name] = {};
      for (const day of last14Days) {
        counts[area.name][day] = 0;
      }
    }

    for (const activity of activities) {
      const day = getISODay(new Date(activity.timestamp));
      if (!last14Days.includes(day)) continue;

      for (const area of WORK_AREAS) {
        if (area.sources.includes(activity.source as any)) {
          counts[area.name][day] = (counts[area.name][day] ?? 0) + 1;
          if (counts[area.name][day] > max) max = counts[area.name][day];
        }
      }
    }

    const intensityGrid = WORK_AREAS.map((area) => {
      const rawCounts = last14Days.map((day) => counts[area.name][day] ?? 0);
      return {
        name: area.name,
        icon: area.icon,
        days: rawCounts.map((c) => toIntensity(c, max)),
        counts: rawCounts,
        total: rawCounts.reduce((s, c) => s + c, 0),
      };
    });

    return { grid: intensityGrid, hasData: max > 0 };
  }, [activities, last14Days]);

  // Radar values: average intensity per area, scaled to 0–100
  const radarValues = useMemo(() => {
    return grid.map((a) => {
      const avg = a.days.reduce((s, v) => s + v, 0) / a.days.length;
      return Math.round((avg / 4) * 100);
    });
  }, [grid]);

  const radarData = useMemo(() => ({
    labels: grid.map((a) => a.name),
    datasets: [{
      label: 'Activity %',
      data: radarValues,
      backgroundColor: 'rgba(93, 37, 159, 0.2)',
      borderColor: '#7C3AED',
      borderWidth: 2,
      pointBackgroundColor: '#7C3AED',
      pointRadius: 4,
      fill: true,
    }],
  }), [grid, radarValues]);

  const dynamicMax = Math.max(40, Math.ceil(Math.max(...radarValues, 1) / 10) * 10);

  const radarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: dynamicMax,
        ticks: { stepSize: dynamicMax / 4, display: true, backdropColor: 'transparent', font: { size: 9 }, color: '#9CA3AF' },
        grid: { color: '#E5E7EB' },
        angleLines: { color: '#E5E7EB' },
        pointLabels: {
          font: { size: 11, weight: '500' as const },
          color: '#374151',
          callback: (label: string, index: number) => `${label} (${radarValues[index]}%)`,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { r: number } }) => `${ctx.parsed.r}% activity level`,
        },
      },
    },
  }), [dynamicMax, radarValues]);

  // Column header labels for heatmap (day abbreviations with month markers)
  const columnLabels = useMemo(() => {
    let lastMonth = '';
    return last14Days.map((dateStr, i) => {
      const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone shift
      const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W...
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const showMonth = month !== lastMonth;
      if (showMonth) lastMonth = month;
      const isToday = i === last14Days.length - 1;
      return { dayAbbr, month: showMonth ? month : '', isToday };
    });
  }, [last14Days]);

  // Format a date string for tooltip display
  const formatTooltipDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Grid3X3 className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm text-gray-500">Connect tools to see your work distribution</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary-600" />
            <CardTitle className="text-base">Work Distribution</CardTitle>
          </div>

          {/* Toggle */}
          <div className="flex rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setView('heatmap')}
              className={cn(
                'px-3 py-1.5 rounded-l-lg transition-colors',
                view === 'heatmap' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              Heatmap
            </button>
            <button
              onClick={() => setView('radar')}
              className={cn(
                'px-3 py-1.5 rounded-r-lg transition-colors',
                view === 'radar' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              Radar
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? emptyState : view === 'heatmap' ? (
          <div className="space-y-0">
            {/* Column headers — month markers + day abbreviations */}
            <div className="flex items-end gap-3 mb-1.5">
              <div className="w-[120px] shrink-0" />
              <div className="flex gap-[3px]">
                {columnLabels.map((col, i) => (
                  <div key={i} className="w-3.5 text-center">
                    {col.month && (
                      <div className="text-[9px] font-medium text-gray-500 leading-none mb-0.5">{col.month}</div>
                    )}
                    <div className={cn(
                      'text-[9px] leading-none',
                      col.isToday ? 'text-primary-600 font-bold' : 'text-gray-400',
                    )}>
                      {col.dayAbbr}
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-10 shrink-0" />
            </div>

            {/* Heatmap rows */}
            {grid.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.name} className="flex items-center gap-3 mb-1">
                  <div className="flex items-center gap-1.5 w-[120px] shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary-500" />
                    <span className="text-xs text-gray-600 truncate">{area.name}</span>
                  </div>
                  <div className="flex gap-[3px]">
                    {area.days.map((level, di) => {
                      const count = area.counts[di];
                      return (
                        <div
                          key={di}
                          className={cn(
                            'w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125',
                            INTENSITY_COLORS[level],
                          )}
                          title={`${area.name} — ${formatTooltipDate(last14Days[di])}: ${count} ${count === 1 ? 'activity' : 'activities'}`}
                        />
                      );
                    })}
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-500 tabular-nums">
                    {area.total}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-[280px]">
            <Radar data={radarData} options={radarOptions} />
          </div>
        )}
      </CardContent>

      {hasData && view === 'heatmap' && (
        <CardFooter className="pt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as IntensityLevel[]).map((level) => (
              <div key={level} className={cn('w-3 h-3 rounded-sm', INTENSITY_COLORS[level])} />
            ))}
            <span>More</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
