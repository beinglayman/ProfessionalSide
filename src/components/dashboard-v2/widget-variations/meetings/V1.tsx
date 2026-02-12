import React from 'react';
import { Clock } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

ChartJS.register(ArcElement, Tooltip);

/**
 * V1 - Hero Donut
 * Large Chart.js Doughnut chart (80% of card area). Center text: "14.5h" bold + "meetings".
 * 2x3 legend grid below. Subtle header subtitle with work-week percentage.
 */
export function MeetingsV1() {
  const data: MeetingsToActionData = mockMeetingsToAction;

  const chartData = {
    labels: data.breakdown.map((b) => b.category),
    datasets: [
      {
        data: data.breakdown.map((b) => b.hours),
        backgroundColor: data.breakdown.map((b) => b.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
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
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.meetingPercentage}% of {data.totalWorkHours}h work week
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Hero Donut */}
        <div className="relative mx-auto" style={{ height: 220, width: 220 }}>
          <Doughnut data={chartData} options={chartOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-gray-900">
              {data.meetingHours}h
            </span>
            <span className="text-xs text-gray-500">meetings</span>
          </div>
        </div>

        {/* 2x3 Legend Grid */}
        <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-2.5">
          {data.breakdown.map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {item.category}
                </p>
                <p className="text-[10px] text-gray-400">{item.hours}h</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
