import React from 'react';
import { Clock } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * V4 - Vertical Bars
 * Chart.js Bar chart with 6 vertical bars (one per category).
 * Color-coded, value labels above each bar, clean grid.
 */
export function MeetingsV4() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const maxHours = Math.max(...data.breakdown.map((b) => b.hours));

  const chartData = {
    labels: data.breakdown.map((b) => b.category),
    datasets: [
      {
        data: data.breakdown.map((b) => b.hours),
        backgroundColor: data.breakdown.map((b) => b.color),
        borderRadius: 6,
        borderSkipped: false as const,
        barThickness: 36,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#9ca3af',
        },
      },
      y: {
        beginAtZero: true,
        max: Math.ceil(maxHours + 1),
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          font: { size: 10 },
          color: '#9ca3af',
          callback: (val: string | number) => `${val}h`,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleFont: { size: 12, weight: 600 as const },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { label?: string; parsed?: { y?: number } }) =>
            ` ${ctx.parsed?.y}h`,
        },
      },
    },
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Hours per category this week</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height: 240 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Footer */}
        <p className="mt-3 text-xs text-gray-400 text-center">
          {data.meetingHours}h total ({data.meetingPercentage}% of {data.totalWorkHours}h week)
        </p>
      </CardContent>
    </Card>
  );
}
