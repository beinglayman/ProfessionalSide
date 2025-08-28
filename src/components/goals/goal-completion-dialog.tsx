import React, { useState } from 'react';
import { Goal, useUpdateGoal, getEffectiveProgress } from '../../hooks/useGoals';
import { Button } from '../ui/button';
import { X, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

interface GoalCompletionDialogProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: (goal: Goal, meta?: { notes?: string }) => void;
}

export const GoalCompletionDialog: React.FC<GoalCompletionDialogProps> = ({
  goal,
  isOpen,
  onClose,
  onCompleted
}) => {
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateGoalMutation = useUpdateGoal();
  const { success, error: toastError, info } = useToast();

  const handleMarkComplete = async () => {
    setIsSubmitting(true);
    try {
      const finalProgress = Math.max(100, getEffectiveProgress(goal));
      const updatedGoal = await updateGoalMutation.mutateAsync({
        goalId: goal.id,
        data: { 
          status: 'completed',
          // Ensure progress reflects completion
          progressOverride: finalProgress,
          completionNotes: completionNotes?.trim() || undefined
        }
      });

      success(`Goal "${goal.title}" marked as completed!`);
      onCompleted?.({ ...goal, ...updatedGoal } as Goal, { notes: completionNotes });
      onClose();
    } catch (error) {
      console.error('Error completing goal:', error);
      toastError('Failed to mark goal as completed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepInProgress = () => {
    info('Goal remains in progress');
    onClose();
  };

  if (!isOpen) return null;

  const effectiveProgress = getEffectiveProgress(goal);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] transform transition-all flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Goal Ready for Completion?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Great! All milestones are complete. Ready to mark this goal as completed?
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
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Goal Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{goal.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">{Math.round(effectiveProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${effectiveProgress}%` }}
                  />
                </div>
              </div>

              {/* Milestone Summary */}
              {goal.milestones && goal.milestones.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Milestones</span>
                    <span className="text-gray-900">
                      {goal.milestones.filter(m => m.completed || m.status === 'completed').length} / {goal.milestones.length} completed
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Individual Milestones Status */}
            {goal.milestones && goal.milestones.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">Milestone Status</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {goal.milestones.map((milestone) => {
                    const isCompleted = milestone.completed || milestone.status === 'completed';
                    const isPartial = milestone.status === 'partial';
                    return (
                      <div
                        key={milestone.id}
                        className={`p-3 rounded-lg border ${
                          isCompleted 
                            ? 'bg-green-50 border-green-200' 
                            : isPartial
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : isPartial
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                            {isCompleted ? '✓' : isPartial ? '◐' : '○'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              isCompleted ? 'text-green-800' : isPartial ? 'text-yellow-800' : 'text-gray-700'
                            }`}>
                              {milestone.title}
                            </p>
                            {milestone.targetDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {new Date(milestone.targetDate).toLocaleDateString()}
                                {isCompleted && milestone.completedAt && (
                                  <span className="ml-2 text-green-600">
                                    ✓ Completed {new Date(milestone.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-800 font-medium mb-1">
                    Excellent! All milestones are now complete.
                  </p>
                  <p className="text-amber-700">
                    Since all milestones have been achieved, you can now mark this goal as completed. 
                    The goal will be moved to your completed goals list, but you can still edit it later if needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Completion Notes */}
            <div>
              <label htmlFor="completion-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Completion Notes (Optional)
              </label>
              <textarea
                id="completion-notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Add any final notes about this goal's completion..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleKeepInProgress}
              disabled={isSubmitting}
            >
              Keep In Progress
            </Button>
            <Button
              onClick={handleMarkComplete}
              disabled={isSubmitting}
              className={cn(
                "bg-green-600 hover:bg-green-700 text-white",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Completing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};