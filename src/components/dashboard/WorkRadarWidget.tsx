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
import type { IntensityLevel } from '../dashboard-v2/types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

const WORK_AREAS = [
  { name: 'Engineering', sources: ['github'], icon: Code },
  { name: 'Project Mgmt', sources: ['jira'], icon: FileText },
  { name: 'Communication', sources: ['slack', 'teams'], icon: MessageSquare },
  { name: 'Documentation', sources: ['confluence', 'google-docs'], icon: FileText },
  { name: 'Meetings', sources: ['google-calendar', 'google-meet', 'outlook'], icon: Users },
  { name: 'Design', sources: ['figma'], icon: Paintbrush },
] as const;

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
    const counts: Record<string, Record<string, number>> = {};
    let max = 0;

    for (const area of WORK_AREAS) {
      counts[area.name] = {};
      for (const day of last28Days) {
        counts[area.name][day] = 0;
      }
    }

    for (const activity of activities) {
      const day = getISODay(new Date(activity.timestamp));
      if (!last28Days.includes(day)) continue;

      for (const area of WORK_AREAS) {
        if (area.sources.includes(activity.source as any)) {
          counts[area.name][day] = (counts[area.name][day] ?? 0) + 1;
          if (counts[area.name][day] > max) max = counts[area.name][day];
        }
      }
    }

    return WORK_AREAS.map((area) => {
      const rawCounts = last28Days.map((day) => counts[area.name][day] ?? 0);
      return {
        name: area.name,
        days: rawCounts.map((c) => toIntensity(c, max)),
      };
    });
  }, [activities, last28Days]);

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
