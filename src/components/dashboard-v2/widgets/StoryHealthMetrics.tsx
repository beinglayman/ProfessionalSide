import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import type { StoryHealthData, WidgetVariant } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface StoryHealthMetricsProps {
  data: StoryHealthData;
  variant?: WidgetVariant;
}

function getHealthColor(score: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (score >= 75)
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Healthy' };
  if (score >= 50)
    return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Attention' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' };
}

function getFreshnessColor(days: number): string {
  if (days <= 7) return 'bg-emerald-500';
  if (days <= 21) return 'bg-amber-500';
  return 'bg-red-500';
}

export const StoryHealthMetrics: React.FC<StoryHealthMetricsProps> = ({
  data,
  variant = 'detailed',
}) => {
  const health = getHealthColor(data.healthScore);
  const coveredCount = data.coverageAreas.filter((a) => a.covered).length;

  const chartData = {
    labels: data.quarterLabels,
    datasets: [
      {
        data: data.storiesPerQuarter,
        backgroundColor: '#9F5FE7',
        hoverBackgroundColor: '#5D259F',
        borderRadius: 6,
        barThickness: variant === 'compact' ? 20 : 28,
      },
    ],
  };

  const chartOptions = {
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
          label: (ctx: { parsed: { y: number } }) =>
            `${ctx.parsed.y} stories`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#999999',
          font: { family: 'Inter', size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: '#F5F5F5' },
        ticks: {
          color: '#999999',
          font: { family: 'Inter', size: 11 },
          stepSize: 2,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  } as const;

  if (variant === 'minimal') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <BookOpen className="h-4 w-4 text-primary-500" />
              </div>
              <CardTitle className="text-base">Story Health</CardTitle>
            </div>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                health.bg,
                health.text
              )}
            >
              {data.healthScore}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">
              {data.totalStories}
            </span>
            <span className="text-sm text-gray-400">stories</span>
          </div>
          <div className="mt-1 flex gap-3 text-xs text-gray-400">
            <span>
              <span className="font-medium text-emerald-600">
                {data.publishedCount}
              </span>{' '}
              published
            </span>
            <span>
              <span className="font-medium text-amber-600">
                {data.draftCount}
              </span>{' '}
              drafts
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <BookOpen className="h-[18px] w-[18px] text-primary-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Story Health</CardTitle>
              <p className="mt-0.5 text-xs text-gray-400">
                {coveredCount}/{data.coverageAreas.length} areas covered
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              'border-0 px-3 py-1 text-xs font-bold',
              health.bg,
              health.text
            )}
          >
            {data.healthScore}/100 &middot; {health.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">
        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {data.totalStories}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">
              Published
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {data.publishedCount}
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-500">
              Drafts
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {data.draftCount}
            </p>
          </div>
        </div>

        {/* Bar chart */}
        {variant === 'detailed' && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">
              Stories per Quarter
            </p>
            <div className="h-40">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Coverage areas */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">
            Coverage Areas
          </p>
          <div
            className={cn(
              'grid gap-2',
              variant === 'compact' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
            )}
          >
            {data.coverageAreas.map((item) => (
              <div
                key={item.area}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs',
                  item.covered
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                )}
              >
                {item.covered ? (
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="truncate font-medium">{item.area}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Freshness */}
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>
              Last edited{' '}
              <span className="font-semibold text-gray-800">
                {data.avgDaysSinceEdit} days ago
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                getFreshnessColor(data.avgDaysSinceEdit)
              )}
            />
            <span className="text-xs text-gray-400">
              {data.avgDaysSinceEdit <= 7
                ? 'Fresh'
                : data.avgDaysSinceEdit <= 21
                  ? 'Aging'
                  : 'Stale'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
