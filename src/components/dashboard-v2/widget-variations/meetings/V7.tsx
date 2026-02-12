import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockMeetingsToAction } from '../../mock-data';
import type { MeetingsToActionData } from '../../types';

/**
 * V7 - Waffle Chart
 * 8x5 grid of 40 small squares (= 40 work hours).
 * First ~15 colored by meeting category (proportional).
 * Remaining squares: gray-100 (non-meeting time). Legend below.
 */
export function MeetingsV7() {
  const data: MeetingsToActionData = mockMeetingsToAction;
  const totalSquares = data.totalWorkHours; // 40

  // Assign squares to each category proportionally (round to whole squares)
  // We round each and adjust to ensure total meeting squares ~ 15
  const rawSquares = data.breakdown.map((b) => ({
    ...b,
    rawCount: b.hours, // 1 square = 1 hour
  }));

  // Round intelligently: floor all, then distribute remainder
  let assigned = rawSquares.map((b) => ({
    ...b,
    count: Math.floor(b.rawCount),
  }));
  let totalAssigned = assigned.reduce((s, b) => s + b.count, 0);
  const target = Math.round(data.meetingHours); // 15

  // Distribute remainder by largest fractional part
  const remainders = rawSquares
    .map((b, i) => ({ i, frac: b.rawCount - Math.floor(b.rawCount) }))
    .sort((a, b) => b.frac - a.frac);

  let idx = 0;
  while (totalAssigned < target && idx < remainders.length) {
    assigned[remainders[idx].i].count += 1;
    totalAssigned += 1;
    idx += 1;
  }

  // Build flat array of square colors
  const squares: Array<{ color: string; category: string }> = [];
  for (const item of assigned) {
    for (let i = 0; i < item.count; i++) {
      squares.push({ color: item.color, category: item.category });
    }
  }
  // Fill remaining with gray
  while (squares.length < totalSquares) {
    squares.push({ color: '#f3f4f6', category: 'Free time' });
  }

  const cols = 8;
  const rows = 5;

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
              {data.meetingPercentage}% of work week
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Waffle Grid */}
        <div
          className="grid gap-1.5 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            maxWidth: 360,
          }}
        >
          {squares.map((sq, i) => (
            <div
              key={i}
              className="aspect-square rounded-md transition-transform hover:scale-110"
              style={{ backgroundColor: sq.color }}
              title={`${sq.category}${sq.category !== 'Free time' ? ` (1h)` : ''}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-2">
          {data.breakdown.map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600 truncate">{item.category}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-gray-100" />
            <span className="text-xs text-gray-400">Free time</span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-3 text-[10px] text-gray-400 text-center">
          Each square = 1 hour &middot; {data.meetingHours}h of {data.totalWorkHours}h
        </p>
      </CardContent>
    </Card>
  );
}
