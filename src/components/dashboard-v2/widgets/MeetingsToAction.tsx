import React from 'react';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../ui/card';
import { cn } from '../../../lib/utils';
import type { MeetingsToActionData, WidgetVariant } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MeetingsToActionProps {
  data: MeetingsToActionData;
  variant?: WidgetVariant;
}

function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 10,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#E6E6E6"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#5D259F"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export const MeetingsToAction: React.FC<MeetingsToActionProps> = ({
  data,
  variant = 'detailed',
}) => {
  const isMinimal = variant === 'minimal';

  const completionDelta = data.completionRate - data.previousWeekCompletion;
  const isImproving = completionDelta >= 0;

  const chartData = {
    labels: data.breakdown.map((b) => b.category),
    datasets: [
      {
        data: data.breakdown.map((b) => b.hours),
        backgroundColor: data.breakdown.map((b) => b.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#181818',
        titleFont: { size: 12, weight: 600 as const },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { label?: string; parsed?: number }) =>
            ` ${ctx.label}: ${ctx.parsed}h`,
        },
      },
    },
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
            <Clock className="h-5 w-5 text-primary-500" />
          </div>
          <CardTitle className="text-lg">Meetings-to-Action</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className={cn(
            'grid items-center gap-6',
            isMinimal ? 'grid-cols-1' : 'grid-cols-3'
          )}
        >
          {/* Left: Doughnut chart */}
          {!isMinimal && (
            <div className="flex flex-col items-center">
              <div className="relative h-[160px] w-[160px]">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {data.meetingHours}h
                  </span>
                  <span className="text-xs text-gray-500">meetings</span>
                </div>
              </div>

              {/* Breakdown legend */}
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {data.breakdown.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-600">
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Center: Key stat */}
          <div className="flex flex-col items-center text-center">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-5">
              <span className="block text-3xl font-bold text-primary-500">
                {data.meetingPercentage}%
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                of work week in meetings
              </span>
              <div className="mx-auto mt-3 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    'h-full rounded-full',
                    data.meetingPercentage > 50
                      ? 'bg-red-400'
                      : data.meetingPercentage > 35
                        ? 'bg-amber-400'
                        : 'bg-green-400'
                  )}
                  style={{ width: `${data.meetingPercentage}%` }}
                />
              </div>
              <span className="mt-1.5 block text-xs text-gray-400">
                {data.meetingHours}h of {data.totalWorkHours}h
              </span>
            </div>
          </div>

          {/* Right: Action item completion */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <CircularProgress percentage={data.completionRate} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {Math.round(data.completionRate)}%
                </span>
                <span className="text-[10px] text-gray-500">completed</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs font-medium text-gray-700">
                {data.actionItemsCompleted} / {data.actionItemsTotal} action
                items
              </p>

              {/* Week-over-week trend */}
              <div
                className={cn(
                  'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  isImproving
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                )}
              >
                {isImproving ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isImproving ? '+' : ''}
                {completionDelta.toFixed(1)}% vs last week
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
