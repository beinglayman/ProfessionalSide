import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockStoryHealth } from '../../mock-data';
import type { StoryHealthData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

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

export function StoryHealthV10() {
  const [expanded, setExpanded] = useState(false);
  const data = mockStoryHealth;
  const health = getHealthColor(data.healthScore);
  const freshness = getFreshnessInfo(data.avgDaysSinceEdit);
  const coveredCount = data.coverageAreas.filter((a) => a.covered).length;
  const publishedPercent = Math.round((data.publishedCount / data.totalStories) * 100);

  const chartData = {
    labels: data.quarterLabels,
    datasets: [{
      data: data.storiesPerQuarter,
      backgroundColor: '#9F5FE7',
      hoverBackgroundColor: '#5D259F',
      borderRadius: 4,
      barThickness: 22,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: '#270F40',
        padding: 8,
        cornerRadius: 6,
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} stories`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 10 } }, border: { display: false } },
      y: { grid: { color: '#F5F5F5' }, ticks: { color: '#999', font: { size: 10 }, stepSize: 2 }, border: { display: false }, beginAtZero: true },
    },
  } as const;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Compact row */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-gray-50/60"
        >
          {/* Health score badge */}
          <Badge className={cn('border-0 px-2.5 py-0.5 text-xs font-bold', health.bg, health.text)}>
            {data.healthScore}
          </Badge>

          {/* Total stories */}
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{data.totalStories}</span> stories
          </span>

          {/* Published percent */}
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-emerald-700">{publishedPercent}%</span> published
          </span>

          {/* Coverage */}
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{coveredCount}/{data.coverageAreas.length}</span> coverage
          </span>

          {/* Freshness */}
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className={cn('h-2 w-2 rounded-full', freshness.color)} />
            <span className="font-semibold text-gray-900">{data.avgDaysSinceEdit}d</span>
          </span>

          {/* Expand/collapse icon */}
          <span className="ml-auto text-gray-400">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-5 border-t border-gray-100 px-5 pb-5 pt-4">
            {/* Stat cards row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Total</p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">{data.totalStories}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">Published</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-700">{data.publishedCount}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">Drafts</p>
                <p className="mt-0.5 text-xl font-bold text-amber-700">{data.draftCount}</p>
              </div>
            </div>

            {/* Bar chart */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Stories per Quarter</p>
              <div className="h-36">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Coverage grid */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Coverage Areas</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.coverageAreas.map((item) => (
                  <div
                    key={item.area}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                      item.covered ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
                    )}
                  >
                    {item.covered ? (
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{item.area}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Freshness details */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  Last edited{' '}
                  <span className="font-semibold text-gray-800">{data.avgDaysSinceEdit} days ago</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', freshness.color)} />
                <span className="text-xs font-medium text-gray-500">{freshness.label}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
