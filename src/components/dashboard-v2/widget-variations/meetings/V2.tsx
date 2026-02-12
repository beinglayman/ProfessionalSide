import React, { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V2 - Treemap
 * Pure CSS/div-based treemap. Container filled with 6 colored rectangles sized
 * proportionally to hours. Each block shows category name + hours.
 * Hover highlights the selected block and shows additional detail.
 */
export function MeetingsV2() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const totalHours = data.meetingHours;
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Sort breakdown descending by hours for better treemap layout
  const sorted = [...data.breakdown].sort((a, b) => b.hours - a.hours);

  // Split into two rows for a nicer treemap layout
  // Row 1: first 3 items (largest categories), Row 2: last 3 items (smaller)
  const row1 = sorted.slice(0, 3);
  const row2 = sorted.slice(3);
  const row1Total = row1.reduce((s, b) => s + b.hours, 0);
  const row2Total = row2.reduce((s, b) => s + b.hours, 0);

  function getTextColor(bgColor: string): string {
    // Lighter colors get dark text, darker colors get white text
    const lightColors = ['#CFAFF3', '#E7D7F9', '#F3EBFC'];
    return lightColors.includes(bgColor) ? '#3b1764' : '#ffffff';
  }

  function renderBlock(
    item: { category: string; hours: number; color: string },
    flexBase: number,
    isLargeRow: boolean
  ) {
    const isHovered = hoveredCategory === item.category;
    const isDimmed = hoveredCategory !== null && !isHovered;
    const pct = ((item.hours / totalHours) * 100).toFixed(0);

    return (
      <div
        key={item.category}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-md transition-all duration-200 cursor-default',
          isDimmed && 'opacity-50',
          isHovered && 'ring-2 ring-white shadow-lg z-10'
        )}
        style={{
          flex: flexBase,
          backgroundColor: item.color,
          color: getTextColor(item.color),
        }}
        onMouseEnter={() => setHoveredCategory(item.category)}
        onMouseLeave={() => setHoveredCategory(null)}
      >
        <span className={cn(isLargeRow ? 'text-sm' : 'text-xs', 'font-semibold')}>
          {item.category}
        </span>
        <span className={cn(isLargeRow ? 'text-lg' : 'text-base', 'font-bold mt-0.5')}>
          {item.hours}h
        </span>
        {/* Show percentage on hover */}
        {isHovered && (
          <span className="text-[10px] mt-0.5 opacity-80">{pct}% of total</span>
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <LayoutGrid className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
          </div>
          <span className="text-xs text-gray-400">
            {data.meetingHours}h / {data.totalWorkHours}h ({data.meetingPercentage}%)
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-1 rounded-lg overflow-hidden" style={{ height: 280 }}>
          {/* Row 1 - Larger categories */}
          <div
            className="flex gap-1"
            style={{ flex: row1Total / totalHours }}
          >
            {row1.map((item) => renderBlock(item, item.hours / row1Total, true))}
          </div>

          {/* Row 2 - Smaller categories */}
          <div
            className="flex gap-1"
            style={{ flex: row2Total / totalHours }}
          >
            {row2.map((item) => renderBlock(item, item.hours / row2Total, false))}
          </div>
        </div>

        {/* Footer summary */}
        <p className="mt-3 text-[10px] text-gray-400 text-center">
          {data.breakdown.length} meeting categories &middot; hover to inspect
        </p>
      </CardContent>
    </Card>
  );
}
