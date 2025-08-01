import React from 'react';
import { Star, Users, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsements: number;
  journalCount?: number;
  startDate: Date;
}

interface SkillCardProps {
  skill: Skill;
  selected: boolean;
  onClick: () => void;
}

export function SkillCard({ skill, selected, onClick }: SkillCardProps) {
  const levelColors = {
    beginner: 'from-blue-500 to-blue-600',
    intermediate: 'from-green-500 to-green-600', 
    advanced: 'from-purple-500 to-purple-600',
    expert: 'from-amber-500 to-orange-600',
  };

  const levelWidths = {
    beginner: 'w-1/4',
    intermediate: 'w-1/2', 
    advanced: 'w-3/4',
    expert: 'w-full',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-lg border text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md',
        selected
          ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-primary-100 shadow-lg ring-2 ring-primary-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {/* Progress bar at top */}
      <div className="h-1 w-full rounded-t-lg bg-gray-100 overflow-hidden">
        <div 
          className={cn(
            'h-full rounded-t-lg bg-gradient-to-r transition-all duration-500',
            selected ? 'from-primary-400 to-primary-500' : `bg-gradient-to-r ${levelColors[skill.level]}`,
            levelWidths[skill.level]
          )}
        />
      </div>

      <div className="p-4">
        {/* Header with name and selection indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className={cn(
              'flex h-2 w-2 rounded-full transition-all duration-200',
              selected 
                ? 'bg-primary-500 ring-2 ring-primary-200' 
                : 'bg-gray-300 group-hover:bg-gray-400'
            )} />
            <h3 className={cn(
              "font-semibold text-sm leading-tight truncate transition-colors",
              selected ? "text-primary-900" : "text-gray-800 group-hover:text-gray-900"
            )}>
              {skill.name}
            </h3>
          </div>
          
          {/* Journal activity indicator */}
          {(skill.journalCount || 0) > 0 && (
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              selected 
                ? "bg-primary-200 text-primary-800" 
                : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
            )}>
              <Star className="h-3 w-3 fill-current" />
              <span>{skill.journalCount}</span>
            </div>
          )}
        </div>

        {/* Level badge */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
              selected 
                ? "bg-primary-200 text-primary-800 ring-1 ring-primary-300" 
                : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
            )}
          >
            {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}
          </span>
          
          {/* Selection checkmark */}
          {selected && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}