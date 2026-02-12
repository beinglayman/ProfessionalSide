import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V3 - Stacked Bar
 * Single wide horizontal bar with 6 colored segments stacked left-to-right.
 * Legend row below with color, category, and hours.
 * Subtle footer text showing totals.
 */
export function MeetingsV3() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const totalHours = data.meetingHours;

  function getTextColor(bgColor: string): string {
    const lightColors = ['#CFAFF3', '#E7D7F9', '#F3EBFC'];
    return lightColors.includes(bgColor) ? '#3b1764' : '#ffffff';
  }

  // Short labels for narrow segments
  function getShortLabel(category: string): string {
    const map: Record<string, string> = {
      'Standup': 'SU',
      'Sprint Planning': 'SP',
      '1:1s': '1:1',
      'Team Sync': 'TS',
      'All Hands': 'AH',
      'Ad-hoc': 'AH',
    };
    return map[category] || category.charAt(0);
  }

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
        {/* Stacked Horizontal Bar */}
        <div className="flex h-11 w-full overflow-hidden rounded-lg">
          {data.breakdown.map((item, i) => {
            const widthPct = (item.hours / totalHours) * 100;
            const isWide = widthPct > 14;
            return (
              <div
                key={item.category}
                className={cn(
                  'flex items-center justify-center transition-all hover:opacity-80',
                  i === 0 && 'rounded-l-lg',
                  i === data.breakdown.length - 1 && 'rounded-r-lg'
                )}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: item.color,
                  color: getTextColor(item.color),
                }}
                title={`${item.category}: ${item.hours}h`}
              >
                <span className="text-xs font-semibold truncate px-1">
                  {isWide ? item.category : getShortLabel(item.category)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scale */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-gray-400">0h</span>
          <span className="text-[10px] text-gray-400">{totalHours}h</span>
        </div>

        {/* Legend */}
        <div className="mt-5 space-y-2">
          {data.breakdown.map((item) => {
            const pct = ((item.hours / totalHours) * 100).toFixed(0);
            return (
              <div key={item.category} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700 flex-1">{item.category}</span>
                <span className="text-sm font-medium text-gray-900">{item.hours}h</span>
                <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          {data.meetingHours}h total &middot; {data.meetingPercentage}% of week
        </p>
      </CardContent>
    </Card>
  );
}
