import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V9 - Category Cards
 * 2x3 grid of mini stat cards. Each card has a colored left border (4px),
 * clock icon, category name, hours as a large bold number, and a subtle
 * "of 14.5h" subtitle. Hover reveals additional percentage context.
 */
export function MeetingsV9() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const totalHours = data.meetingHours;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Sort by hours descending so the biggest categories appear first
  const sorted = [...data.breakdown].sort((a, b) => b.hours - a.hours);

  // Map for rank badge text
  function getRankLabel(index: number): string | null {
    if (index === 0) return 'Top';
    if (index === sorted.length - 1) return 'Least';
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.meetingPercentage}% of {data.totalWorkHours}h
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {sorted.map((item, i) => {
            const pct = ((item.hours / totalHours) * 100).toFixed(0);
            const isHovered = hoveredIdx === i;
            const rankLabel = getRankLabel(i);

            return (
              <div
                key={item.category}
                className={cn(
                  'relative flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3.5 transition-all duration-200',
                  isHovered ? 'shadow-md bg-white' : 'hover:shadow-sm'
                )}
                style={{ borderLeftWidth: 4, borderLeftColor: item.color }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex-1 min-w-0">
                  {/* Category label with icon */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-500 truncate">
                      {item.category}
                    </span>
                    {/* Rank badge for top/bottom */}
                    {rankLabel && (
                      <span
                        className={cn(
                          'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                          i === 0
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {rankLabel}
                      </span>
                    )}
                  </div>

                  {/* Hours - primary metric */}
                  <p className="text-2xl font-bold text-gray-900 leading-none">
                    {item.hours}h
                  </p>

                  {/* Subtle subtitle */}
                  <p className="text-[10px] text-gray-400 mt-1">
                    of {totalHours}h &middot; {pct}%
                  </p>
                </div>

                {/* Subtle percentage bar at bottom */}
                <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.hours / totalHours) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-4 text-[10px] text-gray-400 text-center">
          {sorted.length} categories &middot; {totalHours}h total meetings
        </p>
      </CardContent>
    </Card>
  );
}
