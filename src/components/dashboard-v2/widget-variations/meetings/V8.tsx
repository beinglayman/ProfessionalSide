import React from 'react';
import { Clock } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

ChartJS.register(ArcElement, Tooltip);

/**
 * V8 - Pie Chart
 * Chart.js full Pie chart (no center hole). Slices with percentage labels.
 * Largest slice (Team Sync) offset/exploded slightly. Legend to the right.
 */
export function MeetingsV8() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const totalHours = data.meetingHours;

  // Find the largest slice index for explosion offset
  const maxIdx = data.breakdown.reduce(
    (maxI, b, i, arr) => (b.hours > arr[maxI].hours ? i : maxI),
    0
  );

  const chartData = {
    labels: data.breakdown.map((b) => b.category),
    datasets: [
      {
        data: data.breakdown.map((b) => b.hours),
        backgroundColor: data.breakdown.map((b) => b.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 10,
        // Offset the largest slice
        offset: data.breakdown.map((_, i) => (i === maxIdx ? 12 : 0)),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleFont: { size: 12, weight: 600 as const },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { label?: string; parsed?: number }) => {
            const pct = ((ctx.parsed ?? 0) / totalHours * 100).toFixed(0);
            return ` ${ctx.label}: ${ctx.parsed}h (${pct}%)`;
          },
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
          <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-start gap-6">
          {/* Pie Chart */}
          <div className="flex-1" style={{ height: 220, minWidth: 180 }}>
            <Pie data={chartData} options={chartOptions} />
          </div>

          {/* Right-side Legend */}
          <div className="shrink-0 space-y-2.5 pt-2">
            {data.breakdown.map((item) => {
              const pct = ((item.hours / totalHours) * 100).toFixed(0);
              return (
                <div key={item.category} className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      {item.category}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {item.hours}h &middot; {pct}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badge */}
        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
            {data.meetingHours}h ({data.meetingPercentage}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
