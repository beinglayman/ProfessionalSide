import React from 'react';
import { Goal } from '../hooks/useGoals';
import { GoalStatusWorkflow } from './GoalStatusWorkflow';
import { cn } from '../lib/utils';
import { migrateStatus } from '../utils/statusMigration';

interface UnifiedStatusBarProps {
  goal: Goal;
  onStatusChange: (goalId: string, newStatus: Goal['status']) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// Helper function to get effective progress (with override)
const getEffectiveProgress = (goal: Goal): number => {
  return goal.progressOverride !== undefined && goal.progressOverride !== null
    ? goal.progressOverride
    : goal.progressPercentage;
};

// Status-aware progress bar colors
const getProgressColor = (status: string, progress: number): string => {
  const migratedStatus = migrateStatus(status);
  
  // Special handling for achieved status
  if (migratedStatus === 'achieved') return 'bg-green-500';
  
  // Color based on status for active goals
  switch (migratedStatus) {
    case 'yet-to-start': return 'bg-gray-400';
    case 'in-progress': return progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-blue-400' : 'bg-blue-300';
    case 'blocked': return 'bg-red-400';
    case 'pending-review': return 'bg-orange-400';
    case 'cancelled': return 'bg-gray-300';
    default: return 'bg-primary-500';
  }
};

// Calculate milestone completion info
const getMilestoneInfo = (milestones: Goal['milestones']) => {
  const total = milestones.length;
  const completed = milestones.filter(m => m.status === 'completed' || m.completed).length;
  const partial = milestones.filter(m => m.status === 'partial').length;
  
  return { total, completed, partial };
};

export const UnifiedStatusBar: React.FC<UnifiedStatusBarProps> = ({
  goal,
  onStatusChange,
  disabled = false,
  className,
}) => {
  const progress = getEffectiveProgress(goal);
  const progressColor = getProgressColor(goal.status, progress);
  const milestoneInfo = getMilestoneInfo(goal.milestones);

  // Format milestone text
  const getMilestoneText = () => {
    if (milestoneInfo.total === 0) return 'No milestones';
    
    if (milestoneInfo.partial > 0) {
      return `${milestoneInfo.completed}+${milestoneInfo.partial}/${milestoneInfo.total} milestones`;
    }
    
    return `${milestoneInfo.completed}/${milestoneInfo.total} milestones`;
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Status Workflow Button */}
      <GoalStatusWorkflow
        goal={goal}
        onStatusChange={onStatusChange}
        disabled={disabled}
      />

      {/* Progress Bar Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{progress}%</span>
            <span className="text-gray-400">•</span>
            <span>{getMilestoneText()}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              progressColor
            )}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>

        {/* Status-specific indicators */}
        {migrateStatus(goal.status) === 'achieved' && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-green-600 font-medium">
              🎉 Goal achieved!
            </span>
          </div>
        )}
        
        {migrateStatus(goal.status) === 'blocked' && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-red-600 font-medium">
              ⚠️ Blocked - needs attention
            </span>
          </div>
        )}
        
        {migrateStatus(goal.status) === 'pending-review' && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-orange-600 font-medium">
              👀 Awaiting review
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile-optimized version for smaller screens
export const UnifiedStatusBarMobile: React.FC<UnifiedStatusBarProps> = ({
  goal,
  onStatusChange,
  disabled = false,
  className,
}) => {
  const progress = getEffectiveProgress(goal);
  const progressColor = getProgressColor(goal.status, progress);
  const milestoneInfo = getMilestoneInfo(goal.milestones);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Status and Progress Info */}
      <div className="flex items-center justify-between">
        <GoalStatusWorkflow
          goal={goal}
          onStatusChange={onStatusChange}
          disabled={disabled}
        />
        
        <div className="text-right">
          <div className="text-sm font-medium text-gray-800">
            {progress}%
          </div>
          <div className="text-xs text-gray-500">
            {milestoneInfo.completed}/{milestoneInfo.total} milestones
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={cn(
            'h-full transition-all duration-500 rounded-full',
            progressColor
          )}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
};