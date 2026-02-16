import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText, MessageSquare, Code, Users, Paintbrush, Grid3X3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { cn } from '../../lib/utils';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import type { IntensityLevel } from '../dashboard-v2/types';

const SOURCE_NAMES: Record<string, string> = {
  github: 'GitHub', jira: 'Jira', confluence: 'Confluence', slack: 'Slack',
  teams: 'Teams', figma: 'Figma', 'google-docs': 'Google Docs',
  'google-calendar': 'Calendar', 'google-meet': 'Meet', outlook: 'Outlook',
};

const WORK_AREAS = [
  { name: 'Engineering', sources: ['github'], icon: Code },
  { name: 'Project Mgmt', sources: ['jira'], icon: FileText },
  { name: 'Communication', sources: ['slack', 'teams'], icon: MessageSquare },
  { name: 'Documentation', sources: ['confluence', 'google-docs'], icon: FileText },
  { name: 'Meetings', sources: ['google-calendar', 'google-meet', 'outlook'], icon: Users },
  { name: 'Design', sources: ['figma'], icon: Paintbrush },
] as const;

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: 'bg-gray-100',
  1: 'bg-primary-100',
  2: 'bg-primary-200',
  3: 'bg-primary-400',
  4: 'bg-primary-600',
};

function toIntensity(count: number, max: number): IntensityLevel {
  if (count === 0) return 0;
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function getISODay(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function CompetencyKPIWidget() {
  const { data: activitiesData } = useActivities({ limit: 400 });
  const activities = useMemo(() => {
    if (!activitiesData) return [];
    if (isGroupedResponse(activitiesData)) {
      return activitiesData.groups.flatMap((g) => g.activities ?? []);
    }
    return activitiesData.data ?? [];
  }, [activitiesData]);

  // Build last 35 days (5 weeks max)
  const last35Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(getISODay(d));
    }
    return days;
  }, []);

  // Responsive week count based on container width
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleWeeks, setVisibleWeeks] = useState(4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - 184; // label + gaps + totals
      const weeks = available >= 844 ? 5 : available >= 674 ? 4 : available >= 504 ? 3 : available >= 334 ? 2 : 1;
      setVisibleWeeks(weeks);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visibleDays = useMemo(() => last35Days.slice(-(visibleWeeks * 7)), [last35Days, visibleWeeks]);

  const isWeekStart = (index: number) => index > 0 && index % 7 === 0;

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  // Map activities → work area × day grid (with per-source breakdown per cell)
  const { grid, hasData } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const sourceCounts: Record<string, Record<string, Record<string, number>>> = {}; // area → day → source → count
    let max = 0;

    for (const area of WORK_AREAS) {
      counts[area.name] = {};
      sourceCounts[area.name] = {};
      for (const day of visibleDays) {
        counts[area.name][day] = 0;
        sourceCounts[area.name][day] = {};
      }
    }

    for (const activity of activities) {
      const day = getISODay(new Date(activity.timestamp));
      if (!visibleDays.includes(day)) continue;

      for (const area of WORK_AREAS) {
        if (area.sources.includes(activity.source as any)) {
          counts[area.name][day] = (counts[area.name][day] ?? 0) + 1;
          sourceCounts[area.name][day][activity.source] = (sourceCounts[area.name][day][activity.source] ?? 0) + 1;
          if (counts[area.name][day] > max) max = counts[area.name][day];
        }
      }
    }

    // Also collect per-cell activity titles for rich tooltips
    const cellActivities: Record<string, Record<string, { title: string; source: string }[]>> = {};
    for (const area of WORK_AREAS) {
      cellActivities[area.name] = {};
      for (const day of visibleDays) cellActivities[area.name][day] = [];
    }
    for (const activity of activities) {
      const day = getISODay(new Date(activity.timestamp));
      if (!visibleDays.includes(day)) continue;
      for (const area of WORK_AREAS) {
        if (area.sources.includes(activity.source as any)) {
          cellActivities[area.name][day].push({ title: activity.title, source: activity.source });
        }
      }
    }

    const intensityGrid = WORK_AREAS.map((area) => {
      const rawCounts = visibleDays.map((day) => counts[area.name][day] ?? 0);
      const sourceBreakdowns = visibleDays.map((day) => {
        return Object.entries(sourceCounts[area.name][day] ?? {})
          .sort((a, b) => b[1] - a[1])
          .map(([src, cnt]) => ({ source: SOURCE_NAMES[src] ?? src, count: cnt }));
      });
      const recentItems = visibleDays.map((day) => {
        return (cellActivities[area.name][day] ?? []).slice(0, 2).map((a) => ({
          title: a.title.length > 35 ? a.title.slice(0, 35).trimEnd() + '…' : a.title,
          source: SOURCE_NAMES[a.source] ?? a.source,
        }));
      });
      return {
        name: area.name,
        icon: area.icon,
        days: rawCounts.map((c) => toIntensity(c, max)),
        counts: rawCounts,
        sourceBreakdowns,
        recentItems,
        total: rawCounts.reduce((s, c) => s + c, 0),
      };
    });

    return { grid: intensityGrid, hasData: max > 0 };
  }, [activities, visibleDays]);

  // Hover tooltip state
  const [hoveredCell, setHoveredCell] = useState<{ areaIdx: number; dayIdx: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleCellHover = useCallback((e: React.MouseEvent, areaIdx: number, dayIdx: number) => {
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    setHoveredCell({ areaIdx, dayIdx });
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  // Column header labels for heatmap (day abbreviations with month markers)
  const columnLabels = useMemo(() => {
    let lastMonth = '';
    return visibleDays.map((dateStr, i) => {
      const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone shift
      const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W...
      const dayNum = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const showMonth = month !== lastMonth;
      if (showMonth) lastMonth = month;
      const isToday = i === visibleDays.length - 1;
      return { dayAbbr, dayNum, month: showMonth ? month : '', isToday };
    });
  }, [visibleDays]);

  // Format a date string for tooltip display
  const formatTooltipDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Grid3X3 className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm text-gray-500">Connect tools to see your work distribution</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary-600" />
          <div>
            <CardTitle className="text-base">Work Distribution</CardTitle>
            <p className="text-xs text-gray-400">Last {visibleWeeks} {visibleWeeks === 1 ? 'week' : 'weeks'}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div ref={containerRef}>
        {!hasData ? emptyState : (
          <div className="relative space-y-0" ref={gridContainerRef}>
            {/* Column headers — month markers + day abbreviations */}
            <div className="flex items-end gap-3 mb-1.5">
              <div className="w-[120px] shrink-0" />
              <div className="flex gap-1 flex-1">
                {columnLabels.map((col, i) => (
                  <div key={i} className={cn('w-[20px] text-center', isWeekStart(i) && 'ml-1.5')}>
                    {col.month && (
                      <div className="text-[8px] font-medium text-gray-500 leading-none mb-0.5">{col.month}</div>
                    )}
                    <div className={cn(
                      'text-[8px] leading-none',
                      col.isToday ? 'text-primary-600 font-bold' : isWeekend(visibleDays[i]) ? 'text-gray-300' : 'text-gray-400',
                    )}>
                      {col.dayAbbr}
                    </div>
                    <div className={cn(
                      'text-[7px] leading-none mt-0.5',
                      col.isToday ? 'text-primary-600 font-bold' : 'text-gray-300',
                    )}>
                      {col.dayNum}
                    </div>
                    {col.isToday && (
                      <div className="mx-auto mt-0.5 w-1 h-1 rounded-full bg-primary-500" />
                    )}
                  </div>
                ))}
              </div>
              <span className="w-10 shrink-0 text-right text-[8px] font-medium text-gray-400">Total</span>
            </div>

            {/* Heatmap rows (hide empty rows) */}
            {grid.filter((area) => area.total > 0).map((area, areaIdx) => {
              const Icon = area.icon;
              return (
                <div key={area.name} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-1.5 w-[120px] shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary-500" />
                    <span className="text-xs text-gray-600 truncate">{area.name}</span>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {area.days.map((level, di) => {
                      const isToday = di === visibleDays.length - 1;
                      return (
                        <div
                          key={di}
                          className={cn(
                            'w-[20px] h-[20px] rounded-sm transition-transform hover:scale-110 cursor-default',
                            INTENSITY_COLORS[level],
                            isWeekStart(di) && 'ml-1.5',
                            isWeekend(visibleDays[di]) && level === 0 && 'bg-gray-50',
                            isToday && 'ring-1 ring-primary-400',
                          )}
                          onMouseEnter={(e) => handleCellHover(e, areaIdx, di)}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-500 tabular-nums">
                    {area.total}
                  </span>
                </div>
              );
            })}

            {/* Hover tooltip */}
            {hoveredCell && tooltipPos && (() => {
              const visibleAreas = grid.filter((a) => a.total > 0);
              const area = visibleAreas[hoveredCell.areaIdx];
              if (!area) return null;
              const di = hoveredCell.dayIdx;
              const count = area.counts[di];
              const items = area.recentItems[di];
              const remaining = count - items.length;
              const dateStr = formatTooltipDate(visibleDays[di]);

              return (
                <div
                  className="absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                  style={{ left: tooltipPos.x, top: tooltipPos.y + 24, transform: 'translateX(-50%)' }}
                >
                  <div className="rounded-lg bg-gray-900 text-white shadow-xl min-w-[180px] max-w-[260px] overflow-hidden">
                    {/* Header */}
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-700/60">
                      <p className="text-[11px] font-semibold">{area.name}</p>
                      <p className="text-[10px] text-gray-400">{dateStr}</p>
                    </div>

                    {count === 0 ? (
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] text-gray-500">No activity</p>
                      </div>
                    ) : (
                      <div className="px-3 py-2">
                        {/* Activity list */}
                        <div className="space-y-1.5">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="w-1 h-3.5 rounded-full bg-primary-500/60 shrink-0 mt-px" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-gray-200 leading-tight truncate">{item.title}</p>
                                <p className="text-[9px] text-gray-500">{item.source}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {remaining > 0 && (
                          <p className="text-[9px] text-gray-500 mt-1.5">+{remaining} more</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        </div>
      </CardContent>

      {hasData && (
        <CardFooter className="pt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as IntensityLevel[]).map((level) => (
              <div key={level} className={cn('w-3 h-3 rounded-sm', INTENSITY_COLORS[level])} />
            ))}
            <span>More</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
