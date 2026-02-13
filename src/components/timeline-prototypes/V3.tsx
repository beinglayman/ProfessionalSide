'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  mockActivities,
  getDayKey,
  SOURCE_META,
  type ActivitySource,
  type MockActivity,
} from './mock-data';
import { GitBranch, SquareKanban, Hash, FileText, Figma, Video, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

function SourceIcon({ source, className }: { source: ActivitySource; className?: string }) {
  const icons: Record<ActivitySource, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <SquareKanban className={className} />,
    slack: <Hash className={className} />,
    confluence: <FileText className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[source]}</>;
}

const DOT_COLORS: Record<ActivitySource, string> = {
  github: 'bg-gray-800',
  jira: 'bg-blue-600',
  slack: 'bg-purple-800',
  confluence: 'bg-slate-700',
  figma: 'bg-orange-500',
  'google-meet': 'bg-teal-600',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function TimelineV3() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const activityByDay = useMemo(() => {
    const map: Record<string, MockActivity[]> = {};
    for (const a of mockActivities) {
      const key = getDayKey(a.timestamp);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday-based: 0=Mon ... 6=Sun
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  const getDayKeyForCell = (day: number) => {
    const { year, month } = currentMonth;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const prevMonth = () => setCurrentMonth((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
  const nextMonth = () => setCurrentMonth((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });

  const selectedActivities = selectedDay ? (activityByDay[selectedDay] || []) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="shadow-sm mb-4">
          <CardContent className="p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={idx} className="bg-gray-50 h-20" />;
                const dk = getDayKeyForCell(day);
                const dayActivities = activityByDay[dk] || [];
                const isSelected = selectedDay === dk;
                const sources = [...new Set(dayActivities.map((a) => a.source))];
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(isSelected ? null : dk)}
                    className={cn(
                      'h-20 bg-white p-2 text-left hover:bg-primary-50 transition-colors relative',
                      isSelected && 'ring-2 ring-primary-500 bg-primary-50'
                    )}
                  >
                    <span className={cn('text-sm font-medium', isSelected ? 'text-primary-700' : 'text-gray-700')}>
                      {day}
                    </span>
                    {sources.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {sources.map((src) => (
                          <div key={src} className={cn('w-2 h-2 rounded-full', DOT_COLORS[src])} />
                        ))}
                      </div>
                    )}
                    {dayActivities.length > 0 && (
                      <span className="absolute bottom-1.5 right-2 text-[10px] text-gray-400">
                        {dayActivities.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {selectedDay && (
          <Card className="shadow-sm animate-in slide-in-from-top-2">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Activities on {selectedDay}
                <Badge variant="secondary" className="ml-2 text-xs">{selectedActivities.length}</Badge>
              </h3>
              {selectedActivities.length === 0 ? (
                <p className="text-sm text-gray-400">No activities on this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedActivities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                           style={{ backgroundColor: `${SOURCE_META[a.source].color}20` }}>
                        <SourceIcon source={a.source} className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                        {a.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.description}</p>}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(a.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
