import React, { useState, useEffect } from 'react';
import { Goal, useUpdateGoalProgress, getEffectiveProgress, calculateMilestoneBasedProgress } from '../../hooks/useGoals';
import { Button } from '../ui/button';
import { X, BarChart3, Target, RotateCcw, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

interface GoalProgressDialogProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (goal: Goal) => void;
}

export const GoalProgressDialog: React.FC<GoalProgressDialogProps> = ({
  goal,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [progressValue, setProgressValue] = useState(0);
  const [useAutoCalculation, setUseAutoCalculation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateProgressMutation = useUpdateGoalProgress();
  const { showToast } = useToast();

  // Initialize state when dialog opens
  useEffect(() => {
    if (isOpen && goal) {
      const currentProgress = getEffectiveProgress(goal);
      setProgressValue(currentProgress);
      setUseAutoCalculation(goal.autoCalculateProgress !== false && !goal.progressOverride);
    }
  }, [isOpen, goal]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProgressMutation.mutateAsync({
        goalId: goal.id,
        progressOverride: useAutoCalculation ? null : progressValue,
        autoCalculateProgress: useAutoCalculation
      });

      showToast(
        useAutoCalculation 
          ? 'Goal progress set to auto-calculate from milestones' 
          : `Goal progress manually set to ${progressValue}%`,
        'success'
      );
      
      onClose();
    } catch (error) {
      console.error('Error updating goal progress:', error);
      showToast('Failed to update goal progress', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateMilestoneProgress = () => {
    if (!goal.milestones) return 0;
    return calculateMilestoneBasedProgress(goal.milestones);
  };

  const milestoneBasedProgress = calculateMilestoneProgress();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 transform transition-all">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Adjust Goal Progress
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set manual progress or use auto-calculation
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Goal Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{goal.title}</h3>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Current Progress</span>
                <span className="font-medium">{getEffectiveProgress(goal)}%</span>
              </div>
            </div>

            {/* Progress Calculation Method */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Progress Calculation Method</span>
              </div>

              {/* Auto-calculate option */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="calculation-method"
                    checked={useAutoCalculation}
                    onChange={() => setUseAutoCalculation(true)}
                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900">Auto-calculate from milestones</span>
                      <span className="text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        {milestoneBasedProgress}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Progress is automatically calculated based on completed milestones
                    </p>
                    {goal.milestones && goal.milestones.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {goal.milestones.filter(m => m.completed || m.status === 'completed').length} of {goal.milestones.length} milestones completed
                      </div>
                    )}
                  </div>
                </label>

                {/* Manual override option */}
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="calculation-method"
                    checked={!useAutoCalculation}
                    onChange={() => setUseAutoCalculation(false)}
                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">Set manual progress</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Override milestone-based calculation with a custom progress value
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Manual Progress Slider */}
            {!useAutoCalculation && (
              <div className="space-y-4 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <label htmlFor="progress-slider" className="text-sm font-medium text-gray-700">
                    Progress Percentage
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={progressValue}
                      onChange={(e) => setProgressValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <input
                    id="progress-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={progressValue}
                    onChange={(e) => setProgressValue(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  
                  {/* Visual progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={cn(
                        "h-3 rounded-full transition-all duration-300",
                        progressValue >= 100 ? "bg-green-500" :
                        progressValue >= 75 ? "bg-blue-500" :
                        progressValue >= 50 ? "bg-yellow-500" :
                        "bg-primary-500"
                      )}
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Reset to milestone-based */}
                <button
                  type="button"
                  onClick={() => setProgressValue(milestoneBasedProgress)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to milestone-based ({milestoneBasedProgress}%)
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </div>
              ) : (
                'Update Progress'
              )}
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5D259F;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5D259F;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </>
  );
};