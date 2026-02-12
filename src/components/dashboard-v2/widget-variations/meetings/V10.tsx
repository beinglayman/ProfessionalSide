import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V10 - Ring Segments
 * Large SVG ring (single thick ring). 6 arc segments colored by category,
 * lengths proportional to hours. Hover state highlights segment with tooltip.
 * Center: "14.5h" bold + "meetings". Gap between segments.
 */
export function MeetingsV10() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const [hovered, setHovered] = useState<number | null>(null);

  const totalHours = data.meetingHours;
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 105;
  const strokeWidth = 28;
  const gapDeg = 3; // gap between segments in degrees
  const totalGap = gapDeg * data.breakdown.length;
  const availableDeg = 360 - totalGap;

  // Build arc paths
  let currentAngle = -90; // start from top
  const arcs = data.breakdown.map((item, i) => {
    const sweepDeg = (item.hours / totalHours) * availableDeg;
    const startAngle = currentAngle;
    const endAngle = startAngle + sweepDeg;
    currentAngle = endAngle + gapDeg;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = sweepDeg > 180 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    ].join(' ');

    // Tooltip position: midpoint of arc
    const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const tooltipX = cx + (radius + 50) * Math.cos(midRad);
    const tooltipY = cy + (radius + 50) * Math.sin(midRad);

    return { ...item, d, index: i, tooltipX, tooltipY, sweepDeg };
  });

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
            {data.meetingPercentage}% of week
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full"
            style={{ maxHeight: 280, maxWidth: 280 }}
          >
            {arcs.map((arc) => (
              <path
                key={arc.category}
                d={arc.d}
                fill="none"
                stroke={arc.color}
                strokeWidth={hovered === arc.index ? strokeWidth + 6 : strokeWidth}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                opacity={hovered !== null && hovered !== arc.index ? 0.4 : 1}
                onMouseEnter={() => setHovered(arc.index)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}

            {/* Center text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="800" fill="#111827">
              {data.meetingHours}h
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#9ca3af">
              meetings
            </text>

            {/* Hover tooltip */}
            {hovered !== null && (
              <g>
                <rect
                  x={arcs[hovered].tooltipX - 48}
                  y={arcs[hovered].tooltipY - 16}
                  width={96}
                  height={32}
                  rx={6}
                  fill="#1a1a1a"
                  opacity={0.92}
                />
                <text
                  x={arcs[hovered].tooltipX}
                  y={arcs[hovered].tooltipY + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="600"
                  fill="white"
                >
                  {arcs[hovered].category}: {arcs[hovered].hours}h
                </text>
              </g>
            )}
          </svg>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2">
            {data.breakdown.map((item, i) => (
              <div
                key={item.category}
                className={cn(
                  'flex items-center gap-2 transition-opacity',
                  hovered !== null && hovered !== i ? 'opacity-40' : 'opacity-100'
                )}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
