import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip);

function getHealthColor(score: number) {
  if (score >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Healthy' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' };
}

function getFreshnessInfo(days: number) {
  if (days <= 7) return { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Fresh' };
  if (days <= 21) return { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Aging' };
  return { color: 'text-red-600', bg: 'bg-red-100', label: 'Stale' };
}

export function StoryHealthV2() {
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);
  const coveredCount = data.coverageAreas.filter((a) => a.covered).length;
  const coveragePercent = Math.round((coveredCount / data.coverageAreas.length) * 100);

  const donutData = {
    labels: ['Published', 'Drafts'],
    datasets: [
      {
        data: [data.publishedCount, data.draftCount],
        backgroundColor: ['#10b981', '#f59e0b'],
        hoverBackgroundColor: ['#059669', '#d97706'],
        borderWidth: 0,
        cutout: '72%',
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: '#270F40',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            `${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  } as const;

  const barData = {
    labels: data.quarterLabels,
    datasets: [
      {
        data: data.storiesPerQuarter,
        backgroundColor: '#9F5FE7',
        hoverBackgroundColor: '#5D259F',
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { backgroundColor: '#270F40', padding: 8, cornerRadius: 6 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 10 } }, border: { display: false } },
      y: { grid: { color: '#F5F5F5' }, ticks: { color: '#999', font: { size: 10 }, stepSize: 2 }, border: { display: false }, beginAtZero: true },
    },
  } as const;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
            <BookOpen className="h-[18px] w-[18px] text-primary-500" />
          </div>
          <CardTitle className="text-lg">Story Health</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">
        {/* Donut + Stats side by side */}
        <div className="flex gap-6">
          {/* Left: Donut */}
          <div className="relative flex h-40 w-40 flex-shrink-0 items-center justify-center">
            <Doughnut data={donutData} options={donutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{data.totalStories}</span>
              <span className="text-[10px] font-medium text-gray-400">total</span>
            </div>
          </div>

          {/* Right: Stats panel */}
          <div className="flex flex-1 flex-col justify-center gap-3">
            {/* Health score */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Health Score</p>
              <Badge className={cn('mt-1 border-0 px-2.5 py-0.5 text-xs font-bold', health.bg, health.text)}>
                {data.healthScore}/100 &middot; {health.label}
              </Badge>
            </div>

            {/* Freshness */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Freshness</p>
              <span className={cn('mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', freshness.bg, freshness.color)}>
                {data.avgDaysSinceEdit}d &middot; {freshness.label}
              </span>
            </div>

            {/* Coverage */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Coverage</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">
                  {coveredCount}/{data.coverageAreas.length}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini bar chart */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Stories per Quarter</p>
          <div className="h-28">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
