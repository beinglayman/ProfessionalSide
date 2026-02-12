import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { color: 'bg-emerald-500', label: 'Fresh' };
  if (days <= 21) return { color: 'bg-amber-500', label: 'Aging' };
  return { color: 'bg-red-500', label: 'Stale' };
}

export function StoryHealthV7() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);

  const lineData = {
    labels: data.quarterLabels,
    datasets: [
      {
        data: data.storiesPerQuarter,
        borderColor: '#9F5FE7',
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
          const chart = ctx.chart;
          const { ctx: chartCtx, chartArea } = chart;
          if (!chartArea) return 'rgba(159, 95, 231, 0.1)';
          const gradient = chartCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(159, 95, 231, 0.3)');
          gradient.addColorStop(1, 'rgba(159, 95, 231, 0.02)');
          return gradient;
        },
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#9F5FE7',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#5D259F',
        pointHoverBorderColor: '#fff',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: '#270F40',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} stories`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#999', font: { family: 'Inter', size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { color: '#999', font: { family: 'Inter', size: 11 }, stepSize: 2 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  } as const;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Hero chart with floating badges */}
        <div className="relative">
          {/* Floating badges in top-right */}
          <div className="absolute right-0 top-0 z-10 flex flex-col gap-1.5">
            <Badge className={cn('border-0 px-2.5 py-0.5 text-xs font-bold shadow-sm', health.bg, health.text)}>
              {data.healthScore} &middot; {health.label}
            </Badge>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {data.publishedCount} published
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {data.draftCount} drafts
              </span>
            </div>
          </div>

          <p className="mb-1 text-lg font-semibold text-gray-900">Stories per Quarter</p>
          <p className="mb-4 text-xs text-gray-400">Quarterly story creation trend</p>

          <div className="h-48">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Coverage tags */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-gray-500">Coverage Areas</p>
          <div className="flex flex-wrap gap-1.5">
            {data.coverageAreas.map((item) => (
              <span
                key={item.area}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  item.covered
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
                )}
              >
                {item.area}
              </span>
            ))}
          </div>
        </div>

        {/* Freshness badge bottom-right */}
        <div className="mt-4 flex justify-end">
          <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">{data.avgDaysSinceEdit}d ago</span>
            <span className={cn('h-2 w-2 rounded-full', freshness.color)} />
            <span className="text-[10px] text-gray-400">{freshness.label}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
