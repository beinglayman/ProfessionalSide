import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, Play, Pause, AlertTriangle, Eye, Trophy, X, Loader2, RotateCcw } from 'lucide-react';
import { Goal } from '../hooks/useGoals';
import { cn } from '../lib/utils';
import { migrateStatus, isValidStatus } from '../utils/statusMigration';

interface GoalStatusWorkflowProps {
  goal: Goal;
  onStatusChange: (goalId: string, newStatus: Goal['status']) => Promise<void>;
  disabled?: boolean;
  showRetryButton?: boolean;
}

const statusConfig = {
  'yet-to-start': {
    label: 'Yet to start',
    icon: Clock,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    hoverColor: 'hover:bg-gray-200',
  },
  'in-progress': {
    label: 'In progress',
    icon: Play,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
  },
  'blocked': {
    label: 'Blocked',
    icon: Pause,
    color: 'bg-red-100 text-red-700 border-red-200',
    hoverColor: 'hover:bg-red-200',
  },
  'cancelled': {
    label: 'Cancelled',
    icon: X,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    hoverColor: 'hover:bg-gray-200',
  },
  'pending-review': {
    label: 'Pending review',
    icon: Eye,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    hoverColor: 'hover:bg-orange-200',
  },
  'achieved': {
    label: 'Achieved',
    icon: Trophy,
    color: 'bg-green-100 text-green-700 border-green-200',
    hoverColor: 'hover:bg-green-200',
  },
} as const;

// Helper function to safely get status configuration with migration support
const getStatusConfig = (status: string) => {
  const migratedStatus = migrateStatus(status);
  return statusConfig[migratedStatus];
};

// Define valid transitions for each status (supports both old and new status values via migration)
const getValidTransitions = (currentStatus: string): Goal['status'][] => {
  const migratedStatus = migrateStatus(currentStatus);
  
  const transitions: Record<Goal['status'], Goal['status'][]> = {
    'yet-to-start': ['in-progress', 'cancelled'],
    'in-progress': ['blocked', 'pending-review', 'achieved', 'cancelled'],
    'blocked': ['in-progress', 'cancelled'],
    'pending-review': ['in-progress', 'achieved', 'cancelled'],
    'achieved': ['in-progress'], // Allow editing completed goals back to in-progress
    'cancelled': ['in-progress'], // Allow restarting cancelled goals
  };
  
  return transitions[migratedStatus] || [];
};

export const GoalStatusWorkflow: React.FC<GoalStatusWorkflowProps> = ({
  goal,
  onStatusChange,
  disabled = false,
  showRetryButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastFailedStatus, setLastFailedStatus] = useState<Goal['status'] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Safely get status configuration with migration support
  const currentStatus = getStatusConfig(goal.status);
  const Icon = currentStatus.icon;
  const migratedStatus = migrateStatus(goal.status);
  const availableTransitions = getValidTransitions(goal.status);

  // Clear error state when goal status changes successfully
  useEffect(() => {
    if (lastFailedStatus && goal.status !== lastFailedStatus) {
      setLastFailedStatus(null);
      setErrorMessage(null);
    }
  }, [goal.status, lastFailedStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusTransition = async (newStatus: Goal['status']) => {
    if (isUpdating || disabled) return;

    try {
      setIsUpdating(true);
      setErrorMessage(null);
      setLastFailedStatus(null);
      
      await onStatusChange(goal.id, newStatus);
      setIsOpen(false);
    } catch (error) {
      // Store failed status for retry functionality
      setLastFailedStatus(newStatus);
      
      // Extract user-friendly error message
      let friendlyMessage = 'Failed to update status';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          friendlyMessage = 'Network error - check your connection';
        } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
          friendlyMessage = 'You don\'t have permission to change this status';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          friendlyMessage = 'Invalid status change';
        } else {
          friendlyMessage = error.message;
        }
      }
      setErrorMessage(friendlyMessage);
      
      // Keep dropdown open on error for retry
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedStatus) {
      handleStatusTransition(lastFailedStatus);
    }
  };

  // Don't show dropdown if no transitions available
  const hasTransitions = availableTransitions.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && hasTransitions && setIsOpen(!isOpen)}
        disabled={disabled || !hasTransitions || isUpdating}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all',
          currentStatus.color,
          hasTransitions && !disabled && !isUpdating && currentStatus.hoverColor,
          (isUpdating || disabled) && 'opacity-50 cursor-not-allowed',
          !hasTransitions && 'cursor-default'
        )}
        title={
          !hasTransitions 
            ? 'Status cannot be changed from this state'
            : isUpdating 
            ? 'Updating status...'
            : 'Click to change status'
        }
        aria-label={`Current status: ${currentStatus.label}. ${hasTransitions ? 'Click to change status' : 'Status cannot be changed'}`}
      >
        {isUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
        <span>{currentStatus.label}</span>
        {hasTransitions && !disabled && !isUpdating && (
          <ChevronDown className={cn(
            'h-3 w-3 transition-transform',
            isOpen && 'rotate-180'
          )} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && hasTransitions && (
        <div className="absolute top-full left-0 mt-1 z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
            Transition to
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}
          
          {/* Retry Button */}
          {lastFailedStatus && showRetryButton && (
            <div className="px-3 py-2 border-b border-gray-100">
              <button
                onClick={handleRetry}
                disabled={isUpdating}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors',
                  isUpdating && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                <span>Retry {getStatusConfig(lastFailedStatus).label}</span>
              </button>
            </div>
          )}
          
          <div className="py-1">
            {availableTransitions.map((status) => {
              const config = getStatusConfig(status);
              const StatusIcon = config.icon;
              const isFailed = status === lastFailedStatus;
              
              return (
                <button
                  key={status}
                  onClick={() => handleStatusTransition(status)}
                  disabled={isUpdating}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2',
                    isUpdating && 'opacity-50 cursor-not-allowed',
                    isFailed && 'bg-red-50 text-red-700 hover:bg-red-100'
                  )}
                  aria-label={`Change status to ${config.label}`}
                >
                  <StatusIcon className={cn(
                    'h-4 w-4',
                    isFailed ? 'text-red-500' : 'text-gray-400'
                  )} />
                  <span className="flex-1">{config.label}</span>
                  {status === 'achieved' && (
                    <span className="text-xs text-green-600">🎉</span>
                  )}
                  {isFailed && (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                </button>
              );
            })}
          </div>
          
        </div>
      )}
      
      {/* Error State Indicator */}
      {errorMessage && !isOpen && (
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" 
             title={errorMessage}
             aria-label="Status update failed" />
      )}
    </div>
  );
};