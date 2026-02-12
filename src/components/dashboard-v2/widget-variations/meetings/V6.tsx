import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V6 - Bubble Chart
 * 6 SVG circles positioned within the card. Circle radius proportional to hours
 * (sqrt scaling for area). Largest circle centered, others arranged around it.
 */
export function MeetingsV6() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const maxHours = Math.max(...data.breakdown.map((b) => b.hours));

  // Sort descending so largest bubble is first (center)
  const sorted = [...data.breakdown].sort((a, b) => b.hours - a.hours);

  // Sqrt-scaled radius: largest gets ~70, smallest ~25
  const minR = 25;
  const maxR = 70;
  function getRadius(hours: number) {
    return minR + (maxR - minR) * Math.sqrt(hours / maxHours);
  }

  // Manual positions for 6 bubbles in a packed arrangement
  // Center is 200,180. Others orbit around.
  const positions = [
    { x: 200, y: 175 },  // largest - center
    { x: 310, y: 145 },  // 2nd
    { x: 105, y: 155 },  // 3rd
    { x: 280, y: 270 },  // 4th
    { x: 130, y: 275 },  // 5th
    { x: 310, y: 265 },  // 6th (will be small, tuck into corner)
  ];

  function getTextColor(bgColor: string): string {
    const lightColors = ['#CFAFF3', '#E7D7F9', '#F3EBFC'];
    return lightColors.includes(bgColor) ? '#3b1764' : '#ffffff';
  }

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
              {data.meetingHours}h meetings &middot; {data.meetingPercentage}% of week
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <svg viewBox="0 0 400 340" className="w-full" style={{ maxHeight: 310 }}>
          {sorted.map((item, i) => {
            const r = getRadius(item.hours);
            const pos = positions[i];
            const textColor = getTextColor(item.color);
            const fontSize = r > 45 ? 12 : 10;
            const hourSize = r > 45 ? 16 : 13;

            return (
              <g key={item.category} className="transition-transform duration-200 hover:scale-105" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={item.color}
                  opacity={0.92}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={pos.x}
                  y={pos.y - 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight="600"
                  fill={textColor}
                >
                  {item.category}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={hourSize}
                  fontWeight="800"
                  fill={textColor}
                >
                  {item.hours}h
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
