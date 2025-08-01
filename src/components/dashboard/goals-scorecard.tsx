import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle2, AlertCircle, Clock, Target, CalendarClock, 
  ChevronRight, CheckCircle, XCircle, AlertTriangle,
  Timer, Check, ArrowUpRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface Goal {
  id: number;
  title: string;
  status: 'achieved' | 'not-achieved' | 'on-track' | 'delayed' | 'upcoming';
  metric: string;
  progress: number;
}

interface TimelineGoal {
  title: string;
  status: 'achieved' | 'not-achieved' | 'on-track' | 'delayed' | 'upcoming';
  position: string;
  date: string;
}

interface GoalsSummary {
  achieved: number;
  notAchieved: number;
  onTrack: number;
  delayed: number;
  upcoming: number;
}

interface GoalsScorecardProps {
  summary: GoalsSummary;
  timeline: TimelineGoal[];
  goals: Goal[];
}

export function GoalsScorecard({ summary, timeline, goals }: GoalsScorecardProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'on-track' | 'needs-attention' | 'upcoming'>('all');

  const statusColors = {
    achieved: 'bg-green-500',
    'not-achieved': 'bg-red-500',
    'on-track': 'bg-emerald-500',
    delayed: 'bg-amber-500',
    upcoming: 'bg-blue-500',
  };

  const statusBgColors = {
    achieved: 'bg-green-50',
    'not-achieved': 'bg-red-50',
    'on-track': 'bg-gray-50',
    delayed: 'bg-amber-50',
    upcoming: 'bg-blue-50',
  };

  const statusIcons = {
    achieved: CheckCircle,
    'not-achieved': XCircle,
    'on-track': Target,
    delayed: AlertTriangle,
    upcoming: Clock,
  };

  const filteredGoals = goals.filter(goal => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'on-track') return goal.status === 'on-track';
    if (activeFilter === 'needs-attention') return ['delayed', 'not-achieved'].includes(goal.status);
    if (activeFilter === 'upcoming') return goal.status === 'upcoming';
    return true;
  });

  // Generate dates for the timeline
  const timelineDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 7 + i);
    return date;
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header with Summary */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Goals Scorecard</h2>
        </div>
      </div>

      {/* Summary Section */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-2 flex justify-between">
        {[
          { key: 'achieved', label: 'Achieved', color: 'text-green-600' },
          { key: 'notAchieved', label: 'Not Achieved', color: 'text-red-600' },
          { key: 'onTrack', label: 'On Track', color: 'text-emerald-600' },
          { key: 'delayed', label: 'Delayed', color: 'text-amber-600' },
          { key: 'upcoming', label: 'Upcoming', color: 'text-blue-600' },
        ].map(({ key, label, color }) => (
          <div key={key} className="text-center px-2">
            <div className={cn("text-lg font-bold", color)}>
              {summary[key as keyof GoalsSummary]}
            </div>
            <div className="text-xs text-gray-500">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Goal Timeline</h3>
        </div>
        <div className="relative h-16">
          {/* Timeline line */}
          <div className="absolute left-0 right-0 top-10 h-1 bg-gray-200" />
          
          {/* Today marker */}
          <div className="absolute left-[50%] top-3 h-14 w-1 bg-indigo-500 z-10">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-indigo-500">
              Today
            </div>
          </div>

          {/* Timeline goals */}
          {timeline.map((goal, index) => (
            <div
              key={index}
              className="absolute top-10 -translate-y-1/2 z-20"
              style={{ left: goal.position }}
              data-title={goal.title}
            >
              <div
                className={cn(
                  'h-3 w-3 rounded-full cursor-pointer',
                  statusColors[goal.status]
                )}
                title={`${goal.title} - ${format(new Date(goal.date), 'MMM d')}`}
              />
            </div>
          ))}

          {/* Date markers */}
          <div className="flex justify-between pt-11">
            {timelineDates.map((date, index) => (
              <div
                key={index}
                className={cn(
                  'text-center text-xs',
                  format(date, 'MMM d') === format(new Date(), 'MMM d')
                    ? 'font-medium text-indigo-500'
                    : 'text-gray-500'
                )}
              >
                <div 
                  className={cn(
                    format(date, 'MMM d') === format(new Date(), 'MMM d') && 
                    "bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto"
                  )}
                >
                  {format(date, 'd')}
                </div>
                <div>{format(date, 'EEE')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Your Goals</h3>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'on-track', label: 'On Track' },
              { value: 'needs-attention', label: 'Needs Attention' },
              { value: 'upcoming', label: 'Upcoming' },
            ].map((filter) => (
              <button
                key={filter.value}
                className={cn(
                  "px-2 py-1 text-xs rounded-md border",
                  activeFilter === filter.value 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                    : "bg-gray-50 border-gray-200 text-gray-600"
                )}
                onClick={() => setActiveFilter(filter.value as typeof activeFilter)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredGoals.map((goal) => {
            const StatusIcon = statusIcons[goal.status];
            return (
              <div
                key={goal.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-1 transition-all hover:-translate-y-0.5 hover:shadow-sm',
                  statusBgColors[goal.status],
                  goal.status === 'achieved' && 'border-l-4 border-l-green-500',
                  goal.status === 'not-achieved' && 'border-l-4 border-l-red-500',
                  goal.status === 'on-track' && 'border-l-4 border-l-emerald-500',
                  goal.status === 'delayed' && 'border-l-4 border-l-amber-500',
                  goal.status === 'upcoming' && 'border-l-4 border-l-blue-500'
                )}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={cn(
                    'h-4 w-4',
                    goal.status === 'achieved' && 'text-green-500',
                    goal.status === 'not-achieved' && 'text-red-500',
                    goal.status === 'on-track' && 'text-emerald-500',
                    goal.status === 'delayed' && 'text-amber-500',
                    goal.status === 'upcoming' && 'text-blue-500'
                  )} />
                  <div className="text-xs text-gray-900">{goal.title}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {goal.metric}
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {goal.progress}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded">
                    <Timer className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}