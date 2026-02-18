import { useState, useMemo } from 'react';
import { LayoutGrid, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { useMCPIntegrations } from '../../hooks/useMCP';

const CALENDAR_SOURCES = ['google-calendar', 'google-meet', 'outlook', 'teams'];

const CATEGORY_COLORS: Record<string, string> = {
  'Team Standup': '#5D259F',
  'One-on-One': '#7C3AED',
  'Sprint Planning': '#9061F9',
  'Design Review': '#A78BFA',
  'All Hands': '#C4B5FD',
  'External': '#DDD6FE',
  'Ad Hoc': '#CFAFF3',
  'Interview': '#E7D7F9',
  Other: '#F3EBFC',
};

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ['Team Standup', ['standup', 'stand-up', 'daily', 'scrum']],
  ['One-on-One', ['1:1', '1-1', 'one-on-one', 'one on one', '1on1']],
  ['Sprint Planning', ['sprint', 'planning', 'grooming', 'backlog', 'retro']],
  ['Design Review', ['design', 'review', 'ux', 'ui', 'wireframe', 'figma']],
  ['All Hands', ['all hands', 'all-hands', 'town hall', 'company']],
  ['External', ['external', 'client', 'customer', 'vendor', 'partner']],
  ['Interview', ['interview', 'hiring', 'candidate']],
  ['Ad Hoc', ['sync', 'catch up', 'catchup', 'quick chat']],
];

function categorizeMeeting(title: string): string {
  const lower = title.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}

function getTextColor(bgColor: string): string {
  const lightColors = ['#CFAFF3', '#E7D7F9', '#F3EBFC', '#DDD6FE', '#C4B5FD'];
  return lightColors.includes(bgColor) ? '#3b1764' : '#ffffff';
}

export function MeetingBreakdownWidget() {
  const { data: integrationsData } = useMCPIntegrations();
  const { data: activitiesData } = useActivities({ limit: 200 });
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const integrations = integrationsData?.integrations ?? [];
  const hasCalendarIntegration = integrations.some(
    (i) => i.isConnected && CALENDAR_SOURCES.includes(i.toolType)
  );

  const breakdown = useMemo(() => {
    if (!activitiesData) return [];

    const activities = isGroupedResponse(activitiesData)
      ? activitiesData.groups.flatMap((g) => g.activities ?? [])
      : activitiesData.data ?? [];

    const calendarActivities = activities.filter((a) => CALENDAR_SOURCES.includes(a.source));

    const counts: Record<string, number> = {};
    for (const a of calendarActivities) {
      const cat = categorizeMeeting(a.title);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([category, count]) => ({
        category,
        hours: count,
        color: CATEGORY_COLORS[category] ?? '#9CA3AF',
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [activitiesData]);

  const totalHours = breakdown.reduce((s, b) => s + b.hours, 0);

  if (!hasCalendarIntegration || breakdown.length === 0) {
    return (
      <Card className="overflow-hidden min-h-[280px]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <LayoutGrid className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              {hasCalendarIntegration
                ? 'No meeting data synced yet. Try syncing your calendar.'
                : 'Connect Google Calendar or Outlook to see meeting breakdown'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Split into two rows for treemap layout
  const row1 = breakdown.slice(0, Math.min(3, breakdown.length));
  const row2 = breakdown.slice(3);
  const row1Total = row1.reduce((s, b) => s + b.hours, 0);
  const row2Total = row2.reduce((s, b) => s + b.hours, 0);

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
          {item.hours}
        </span>
        {isHovered && (
          <span className="text-[10px] mt-0.5 opacity-80">{pct}% of total</span>
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden min-h-[280px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <LayoutGrid className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Meeting Breakdown</CardTitle>
          </div>
          <span className="text-xs text-gray-400">
            {totalHours} meetings total
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-1 rounded-lg overflow-hidden" style={{ height: 160 }}>
          <div className="flex gap-1" style={{ flex: row1Total / (totalHours || 1) }}>
            {row1.map((item) => renderBlock(item, item.hours / (row1Total || 1), true))}
          </div>

          {row2.length > 0 && (
            <div className="flex gap-1" style={{ flex: row2Total / (totalHours || 1) }}>
              {row2.map((item) => renderBlock(item, item.hours / (row2Total || 1), false))}
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] text-gray-400 text-center">
          {breakdown.length} meeting categories &middot; hover to inspect
        </p>
      </CardContent>
    </Card>
  );
}
