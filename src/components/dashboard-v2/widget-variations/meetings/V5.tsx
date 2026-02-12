import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V5 - Radial Bars
 * SVG-based starburst: 6 bars radiating outward from a central point.
 * Each bar length proportional to hours, colored by category.
 * Labels at tip, center circle with "14.5h".
 */
export function MeetingsV5() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const maxHours = Math.max(...data.breakdown.map((b) => b.hours));

  const cx = 200;
  const cy = 200;
  const innerRadius = 50;
  const maxBarLength = 110;
  const barWidth = 22;
  const angleStep = 360 / data.breakdown.length;

  function getTextColor(bgColor: string): string {
    const lightColors = ['#CFAFF3', '#E7D7F9', '#F3EBFC'];
    return lightColors.includes(bgColor) ? '#3b1764' : '#ffffff';
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
          </div>
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
            {data.meetingPercentage}%
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <svg viewBox="0 0 400 400" className="w-full" style={{ maxHeight: 320 }}>
          {data.breakdown.map((item, i) => {
            const angle = (angleStep * i - 90) * (Math.PI / 180);
            const barLength = (item.hours / maxHours) * maxBarLength;

            const x1 = cx + Math.cos(angle) * innerRadius;
            const y1 = cy + Math.sin(angle) * innerRadius;
            const x2 = cx + Math.cos(angle) * (innerRadius + barLength);
            const y2 = cy + Math.sin(angle) * (innerRadius + barLength);

            // Label position (slightly beyond bar tip)
            const labelR = innerRadius + barLength + 18;
            const lx = cx + Math.cos(angle) * labelR;
            const ly = cy + Math.sin(angle) * labelR;

            // Hours label at mid-bar
            const midR = innerRadius + barLength / 2;
            const mx = cx + Math.cos(angle) * midR;
            const my = cy + Math.sin(angle) * midR;

            return (
              <g key={item.category}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={item.color}
                  strokeWidth={barWidth}
                  strokeLinecap="round"
                  className="transition-all duration-300 hover:opacity-80"
                />
                {/* Hours on bar */}
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="700"
                  fill={getTextColor(item.color)}
                >
                  {item.hours}h
                </text>
                {/* Category label at tip */}
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {item.category}
                </text>
              </g>
            );
          })}

          {/* Center circle */}
          <circle cx={cx} cy={cy} r={innerRadius - 4} fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#111827">
            {data.meetingHours}h
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#9ca3af">
            meetings
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}
