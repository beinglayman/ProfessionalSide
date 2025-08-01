import React from 'react';
import { format, isWeekend } from 'date-fns';
import { Flame, CheckCircle2, Circle, Plus, Trophy, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface JournalStreakProps {
  currentStreak: number;
  personalBest: number;
  todayCompleted: boolean;
  weekProgress: Array<{
    date: Date;
    completed: boolean;
    isToday: boolean;
  }>;
  historicalData: Array<{
    date: Date;
    completed: boolean;
  }>;
  milestones: Array<{
    days: number;
    name: string;
    reached: boolean;
  }>;
  entryTypes: Array<{
    type: string;
    percentage: number;
  }>;
}

export function JournalStreak({
  currentStreak,
  personalBest,
  todayCompleted,
  weekProgress,
  historicalData,
  milestones,
  entryTypes,
}: JournalStreakProps) {
  const pieChartData = {
    labels: entryTypes.map(type => type.type),
    datasets: [
      {
        data: entryTypes.map(type => type.percentage),
        backgroundColor: [
          'rgba(93, 37, 159, 0.8)',  // Primary color
          'rgba(93, 37, 159, 0.6)',
          'rgba(93, 37, 159, 0.4)',
          'rgba(93, 37, 159, 0.2)',
        ],
        borderColor: [
          'rgba(93, 37, 159, 1)',
          'rgba(93, 37, 159, 1)',
          'rgba(93, 37, 159, 1)',
          'rgba(93, 37, 159, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Find next milestone
  const nextMilestone = milestones.find(m => !m.reached) || { days: 0, name: 'All milestones reached!', reached: true };
  const daysToNextMilestone = nextMilestone.days - currentStreak;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Flame className="mr-2 h-5 w-5 text-primary-500" />
            Journal Streak
          </h2>
          <p className="text-sm text-gray-500">Keep up your daily journaling habit</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Section - Streak Counter with Visual Enhancement */}
        <div className="flex flex-col items-center justify-center bg-primary-50 rounded-lg p-4">
          <div className="text-center relative">
            <div className="flex items-center justify-center">
              <div className="text-6xl font-bold text-primary-500 relative">
                {currentStreak}
                <Flame className="absolute -top-4 -right-4 h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-2 text-sm font-medium text-gray-700">day streak</div>
            <div className="mt-2 flex items-center justify-center text-sm text-gray-600">
              <Trophy className="mr-1 h-4 w-4 text-yellow-500" />
              Personal best: {personalBest} days
            </div>
          </div>
          
          {/* Next Milestone */}
          {nextMilestone.days > 0 && (
            <div className="mt-4 w-full bg-white rounded-md p-3 border border-primary-100">
              <div className="text-xs text-gray-500">Next milestone</div>
              <div className="text-sm font-medium">{nextMilestone.name}</div>
              <div className="text-xs text-primary-600">{daysToNextMilestone} days to go</div>
              <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 rounded-full" 
                  style={{ width: `${(currentStreak / nextMilestone.days) * 100}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Weekly Calendar View */}
        <div className="flex flex-col justify-between bg-gray-50 rounded-lg p-4">
          <div>
            <div className="flex items-center mb-3">
              <Calendar className="mr-2 h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">This week</span>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-5 text-xs font-medium text-gray-600">
                {weekProgress.map((day) => (
                  <div key={day.date.toString()} className="text-center">
                    {format(day.date, 'EEE')}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                {weekProgress.map((day) => (
                  <div key={day.date.toString()} className="flex flex-col items-center">
                    <div className="text-xs text-gray-500">{format(day.date, 'd')}</div>
                    <div className={cn(
                      "mt-1 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-300",
                      day.completed 
                        ? "bg-green-100 text-green-600 border border-green-200" 
                        : day.isToday
                        ? "bg-primary-100 text-primary-600 border border-primary-200 animate-pulse"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    )}>
                      {day.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="text-xs text-gray-500 mb-2">Weekly progress</div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ 
                  width: `${(weekProgress.filter(d => d.completed).length / weekProgress.length) * 100}%` 
                }} 
              />
            </div>
            
            {/* Additional stats to fill space */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-xs text-gray-500">
                <span className="font-medium text-green-600">
                  {weekProgress.filter(d => d.completed).length}/{weekProgress.length}
                </span> days completed
              </div>
              <div className="text-xs text-gray-500 text-right">
                <span className="font-medium text-primary-600">
                  {weekProgress.length - weekProgress.filter(d => d.completed).length}
                </span> days remaining
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Time Estimate and Button - Repositioned to match Profile Completeness widget */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
          <span className="text-sm text-gray-700">Keep your streak going</span>
        </div>
        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50 bg-primary-500 text-white hover:bg-primary-600 h-8 px-3 py-2">
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </button>
      </div>
    </div>
  );
}