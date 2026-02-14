import { useState, useMemo } from 'react';
import {
  FileText, MessageSquare, Code, Users, Paintbrush, Grid3X3, Target, Lightbulb,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { cn } from '../../lib/utils';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { useGoalsScorecard } from '../../hooks/useDashboard';
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

type ViewMode = 'competency' | 'kpi';

const COMPETENCY_AREAS = [
  { name: 'Code Quality', sources: ['github'], icon: Code },
  { name: 'Project Delivery', sources: ['jira'], icon: FileText },
  { name: 'Communication', sources: ['slack'], icon: MessageSquare },
  { name: 'Documentation', sources: ['confluence', 'google-docs'], icon: FileText },
  { name: 'Collaboration', sources: ['google-calendar', 'google-meet', 'outlook', 'teams'], icon: Users },
  { name: 'Design/Innovation', sources: ['figma'], icon: Paintbrush },
] as const;

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: 'bg-gray-100',
  1: 'bg-primary-100',
  2: 'bg-primary-200',
  3: 'bg-primary-400',
  4: 'bg-primary-600',
};

const KPI_STATUS_COLORS: Record<string, string> = {
  'on-track': 'bg-emerald-500',
  'at-risk': 'bg-amber-500',
  'behind': 'bg-red-500',
  'completed': 'bg-blue-500',
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
  const [view, setView] = useState<ViewMode>('competency');

  // ── Competency data ──
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

  // Map activities → competency × day grid
  const { grid, maxCount, hasData } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    let max = 0;

    for (const area of COMPETENCY_AREAS) {
      counts[area.name] = {};
      for (const day of last14Days) {
        counts[area.name][day] = 0;
      }
    }

    for (const activity of activities) {
      const day = getISODay(new Date(activity.timestamp));
      if (!last14Days.includes(day)) continue;

      for (const area of COMPETENCY_AREAS) {
        if (area.sources.includes(activity.source as any)) {
          counts[area.name][day] = (counts[area.name][day] ?? 0) + 1;
          if (counts[area.name][day] > max) max = counts[area.name][day];
        }
      }
    }

    const intensityGrid = COMPETENCY_AREAS.map((area) => ({
      name: area.name,
      icon: area.icon,
      days: last14Days.map((day) => toIntensity(counts[area.name][day] ?? 0, max)),
    }));

    return { grid: intensityGrid, maxCount: max, hasData: max > 0 };
  }, [activities, last14Days]);

  // ── KPI data ──
  const { data: scorecard } = useGoalsScorecard();
  const goals = scorecard?.goals ?? [];
  const hasGoals = goals.length > 0;

  const grouped = useMemo(() => {
    return goals.reduce<Record<string, typeof goals>>((acc, g) => {
      if (!acc[g.category]) acc[g.category] = [];
      acc[g.category].push(g);
      return acc;
    }, {});
  }, [goals]);

  const categories = Object.keys(grouped);

  const categoryAvgs = useMemo(() => {
    return categories.map((cat) => {
      const items = grouped[cat];
      const avg = items.reduce((sum, k) => sum + Math.min((k.progress / k.target) * 100, 100), 0) / items.length;
      return Math.round(avg);
    });
  }, [categories, grouped]);

  const radarData = useMemo(() => ({
    labels: categories,
    datasets: [{
      label: 'Completion %',
      data: categoryAvgs,
      backgroundColor: 'rgba(93, 37, 159, 0.2)',
      borderColor: '#7C3AED',
      borderWidth: 2,
      pointBackgroundColor: '#7C3AED',
      pointRadius: 4,
      fill: true,
    }],
  }), [categories, categoryAvgs]);

  const radarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { stepSize: 25, display: true, backdropColor: 'transparent', font: { size: 9 }, color: '#9CA3AF' },
        grid: { color: '#E5E7EB' },
        angleLines: { color: '#E5E7EB' },
        pointLabels: { font: { size: 11, weight: '500' as const }, color: '#374151' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { r: number } }) => `${ctx.parsed.r}% completion`,
        },
      },
    },
  }), []);

  // ── Day labels for heatmap ──
  const dayLabels = useMemo(() => {
    const months: { label: string; colStart: number }[] = [];
    let lastMonth = '';
    last14Days.forEach((dateStr, i) => {
      const d = new Date(dateStr);
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth) {
        months.push({ label: month, colStart: i });
        lastMonth = month;
      }
    });
    return months;
  }, [last14Days]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {view === 'competency' ? (
              <Grid3X3 className="h-5 w-5 text-primary-600" />
            ) : (
              <Target className="h-5 w-5 text-primary-600" />
            )}
            <CardTitle className="text-base">
              {view === 'competency' ? 'Role Competency Matrix' : 'KPI Radar Overview'}
            </CardTitle>
          </div>

          {/* Toggle */}
          <div className="flex rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setView('competency')}
              className={cn(
                'px-3 py-1.5 rounded-l-lg transition-colors',
                view === 'competency' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              Heatmap
            </button>
            <button
              onClick={() => setView('kpi')}
              className={cn(
                'px-3 py-1.5 rounded-r-lg transition-colors',
                view === 'kpi' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              KPI
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {view === 'competency' ? (
          hasData ? (
            <div>
              <div className="overflow-x-auto">
                <div className="inline-block">
                  {grid.map((area) => {
                    const Icon = area.icon;
                    return (
                      <div key={area.name} className="flex items-center gap-3 mb-1">
                        <div className="flex items-center gap-1.5 w-[130px] shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary-500" />
                          <span className="text-xs text-gray-600 truncate">{area.name}</span>
                        </div>
                        <div className="flex gap-[3px]">
                          {area.days.map((level, di) => (
                            <div
                              key={di}
                              className={cn(
                                'w-3 h-3 rounded-sm transition-transform hover:scale-125',
                                INTENSITY_COLORS[level]
                              )}
                              title={`${last14Days[di]} — ${area.name}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Day labels */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-[130px] shrink-0" />
                    <div className="flex relative" style={{ width: 14 * 15 }}>
                      {dayLabels.map((m) => (
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Grid3X3 className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Connect tools to see your competency heatmap</p>
            </div>
          )
        ) : hasGoals ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar chart */}
            <div className="h-[260px]">
              <Radar data={radarData} options={radarOptions} />
            </div>

            {/* Goal list */}
            <div className="space-y-1.5">
              {goals.map((goal) => {
                const pct = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
                return (
                  <div key={goal.id} className="flex items-center gap-2 text-xs">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', KPI_STATUS_COLORS[goal.status] ?? 'bg-gray-300')} />
                    <span className="text-gray-600 truncate flex-1">{goal.title}</span>
                    <span className="text-gray-800 font-medium tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Set up goals in your workspace to track KPIs</p>
          </div>
        )}
      </CardContent>

      {view === 'competency' && hasData && (
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
