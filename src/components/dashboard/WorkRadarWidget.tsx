import { useMemo } from 'react';
import { FileText, MessageSquare, Code, Users, Paintbrush, RadarIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

const WORK_AREAS = [
  { name: 'Engineering', sources: ['github'], icon: Code },
  { name: 'Project Mgmt', sources: ['jira'], icon: FileText },
  { name: 'Communication', sources: ['slack', 'teams'], icon: MessageSquare },
  { name: 'Documentation', sources: ['confluence', 'google-docs'], icon: FileText },
  { name: 'Meetings', sources: ['google-calendar', 'google-meet', 'outlook'], icon: Users },
  { name: 'Design', sources: ['figma'], icon: Paintbrush },
] as const;

function getISODay(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function WorkRadarWidget() {
  const { data: activitiesData } = useActivities({ limit: 400 });
  const activities = useMemo(() => {
    if (!activitiesData) return [];
    if (isGroupedResponse(activitiesData)) {
      return activitiesData.groups.flatMap((g) => g.activities ?? []);
    }
    return activitiesData.data ?? [];
  }, [activitiesData]);

  const last28Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(getISODay(d));
    }
    return days;
  }, []);

  const grid = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const area of WORK_AREAS) {
      counts[area.name] = 0;
    }

    for (const activity of activities) {
      const day = getISODay(new Date(activity.timestamp));
      if (!last28Days.includes(day)) continue;

      for (const area of WORK_AREAS) {
        if (area.sources.includes(activity.source as any)) {
          counts[area.name]++;
        }
      }
    }

    return WORK_AREAS.map((area) => ({
      name: area.name,
      total: counts[area.name],
    }));
  }, [activities, last28Days]);

  const maxTotal = Math.max(...grid.map((a) => a.total), 1);

  const radarValues = useMemo(() => {
    return grid.map((a) => Math.round((a.total / maxTotal) * 100));
  }, [grid, maxTotal]);

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

  const dynamicMax = Math.ceil(Math.max(...radarValues, 1) / 10) * 10;

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
          callback: (label: string, index: number) => `${label} (${grid[index].total})`,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { r: number } }) => `${ctx.parsed.r}% relative activity`,
        },
      },
    },
  }), [dynamicMax, radarValues, grid]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
            <RadarIcon className="h-[18px] w-[18px] text-primary-500" />
          </div>
          <CardTitle className="text-lg">Work Radar</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </CardContent>
    </Card>
  );
}
