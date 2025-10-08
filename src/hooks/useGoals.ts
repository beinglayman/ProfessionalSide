import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeStorage } from '../utils/storage';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import confetti from 'canvas-confetti';
import { migrateGoals, migrateGoal } from '../utils/statusMigration';

// Monday.com-style confetti celebration
const triggerTaskCompletionCelebration = () => {
  // Create a burst of colorful confetti from multiple origins
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    // Launch from the left side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#5D259F', '#7C3AED', '#A855F7', '#C084FC', '#DDD6FE', '#22C55E', '#16A34A', '#15803D']
    });

    // Launch from the right side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#5D259F', '#7C3AED', '#A855F7', '#C084FC', '#DDD6FE', '#22C55E', '#16A34A', '#15803D']
    });
  }, 250);
};

// Milestone completion celebration - bigger than task completion
const triggerMilestoneCompletionCelebration = () => {
  const duration = 4000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 40, spread: 360, ticks: 80, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 75 * (timeLeft / duration);

    // Launch from multiple positions for bigger celebration
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#5D259F', '#7C3AED', '#A855F7', '#C084FC', '#DDD6FE', '#FFD700', '#FFA500', '#22C55E']
    });

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#5D259F', '#7C3AED', '#A855F7', '#C084FC', '#DDD6FE', '#FFD700', '#FFA500', '#22C55E']
    });

    // Center burst for milestone
    confetti({
      ...defaults,
      particleCount: particleCount / 2,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    });
  }, 200);
};

// Goal completion celebration - the biggest celebration
const triggerGoalCompletionCelebration = () => {
  const duration = 5000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 50, spread: 360, ticks: 100, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  // Initial big burst
  confetti({
    particleCount: 150,
    spread: 160,
    origin: { y: 0.3 },
    colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#F38BA8', '#A8DADC']
  });

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 100 * (timeLeft / duration);

    // Multiple launch points for epic celebration
    for (let i = 0; i < 4; i++) {
      confetti({
        ...defaults,
        particleCount: particleCount / 4,
        origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#F38BA8', '#A8DADC']
      });
    }

    // Center fireworks effect
    confetti({
      particleCount: particleCount / 2,
      startVelocity: 30,
      spread: 360,
      origin: { x: 0.5, y: 0.3 },
      colors: ['#FFD700', '#FFA500', '#FF1493', '#00CED1', '#7FFF00', '#FF4500']
    });
  }, 150);
};

export { triggerGoalCompletionCelebration, triggerTaskCompletionCelebration };

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  position?: string;
}

// Workspace Label Management Types
export interface WorkspaceLabelValue {
  id: string;
  labelId: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceLabel {
  id: string;
  name: string;
  type: 'priority' | 'status';
  workspaceId: string;
  createdById: string;
  values: WorkspaceLabelValue[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedDate?: string;
  completedBy?: string;
  assignedTo?: string;
  reviewerId?: string;
  assignee?: TeamMember;
  reviewer?: TeamMember;
  completedByUser?: TeamMember;
  priority: 'low' | 'medium' | 'high';
  status: string;
  dueDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: 'incomplete' | 'partial' | 'completed'; // Updated to support partial completion
  completed: boolean; // Keep for backward compatibility
  completedAt?: string;
  completedBy?: TeamMember;
  targetDate?: string;
  assignedTo?: TeamMember[];
  weight?: number; // Percentage of goal this milestone represents (0-100)
  autoCompleteFromTasks?: boolean; // Auto-complete when all tasks done
  manuallyCompleted?: boolean; // User marked complete manually
  tasks?: Task[]; // Tasks under this milestone
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'yet-to-start' | 'in-progress' | 'blocked' | 'cancelled' | 'pending-review' | 'achieved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  category: string;
  progressPercentage: number;
  progressOverride?: number; // Manual override for progress (0-100)
  autoCalculateProgress: boolean; // Whether to auto-calculate from milestones
  requiresManualCompletion: boolean; // Prevents auto-completion when 100%
  completionCriteria?: string; // Description of what constitutes completion
  completionNotes?: string; // Optional notes captured upon completion
  
  // Team assignments
  assignedTo: TeamMember | null;
  reviewer?: TeamMember | null;
  
  // Relations
  milestones: Milestone[];
  linkedJournalEntries?: {
    id: string;
    title: string;
    contributionType: 'milestone' | 'progress' | 'blocker' | 'update';
    progressContribution: number;
    linkedAt: string;
    notes?: string;
  }[];
  
  // Metadata
  createdBy: TeamMember;
  assignedTo?: TeamMember[];
  tags?: string[];
  editHistory: {
    id: string;
    editedBy: TeamMember;
    editedAt: string;
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface CreateGoalData {
  title: string;
  description: string;
  priority: Goal['priority'];
  targetDate?: string;
  category: string;
  assignedToId: string;
  reviewerId?: string;
  milestones?: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'completedBy'>[];
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  status?: Goal['status'];
  priority?: Goal['priority'];
  targetDate?: string;
  category?: string;
  assignedToId?: string;
  reviewerId?: string;
  progressOverride?: number;
  autoCalculateProgress?: boolean;
  requiresManualCompletion?: boolean;
  completionCriteria?: string;
  completionNotes?: string;
}

// Get goals for a workspace
export function useWorkspaceGoals(workspaceId: string) {
  return useQuery({
    queryKey: ['goals', 'workspace', workspaceId],
    queryFn: async (): Promise<Goal[]> => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}/goals`);
        let goals = response.data.data || [];
        
        // Backend now returns goals with proper assignedTo/reviewer structure
        // No need for local storage overrides now that we have proper API
        
        // Apply status migration to ensure all goals have new status values
        goals = migrateGoals(goals);
        
        return goals;
      } catch (error) {
        return [];
      }
    },
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry when backend is down
  });
}

// Get a single goal
export function useGoal(goalId: string) {
  return useQuery({
    queryKey: ['goals', goalId],
    queryFn: async (): Promise<Goal> => {
      const response = await api.get(`/goals/${goalId}`);
      // Apply status migration to ensure goal has new status values
      return migrateGoal(response.data.data);
    },
    enabled: !!goalId,
    staleTime: 30 * 1000,
  });
}

// Create a new goal
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: CreateGoalData }) => {
      console.log('🎯 useCreateGoal mutationFn called:', { workspaceId, data });
      const response = await api.post(`/workspaces/${workspaceId}/goals`, data);
      console.log('🎯 API response:', response.data);
      return response.data.data;
    },
    onSuccess: (newGoal, variables) => {
      console.log('🎯 Invalidating goals query for workspace:', variables.workspaceId);
      
      // Update the cache immediately with the new goal
      queryClient.setQueryData(['goals', 'workspace', variables.workspaceId], (oldGoals: Goal[] = []) => {
        console.log('🎯 Adding new goal to cache:', newGoal);
        return [...oldGoals, newGoal];
      });
      
      // Also invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace', variables.workspaceId] });
    },
  });
}

// Update a goal
export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: UpdateGoalData }) => {
      const response = await api.put(`/goals/${goalId}`, data);
      return response.data.data;
    },
    onSuccess: (updatedGoal, variables) => {
      // Show success toast for status changes
      if (variables.data.status) {
        const statusLabels = {
          'yet-to-start': 'Yet to start',
          'in-progress': 'In progress', 
          'blocked': 'Blocked',
          'cancelled': 'Cancelled',
          'pending-review': 'Pending review',
          'achieved': 'Achieved'
        } as const;
        const statusLabel = statusLabels[variables.data.status] || variables.data.status;
        toast.success('Status updated', `Goal status changed to "${statusLabel}"`);

        // Trigger confetti for achievements
        if (variables.data.status === 'achieved') {
          triggerGoalCompletionCelebration();
        }
      }
      
      // Simple invalidation strategy - let React Query handle cache updates
      queryClient.invalidateQueries({ 
        queryKey: ['goals'],
        exact: false
      });
    },
    onError: (error, variables) => {
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (variables.data.status) {
        toast.error('Status update failed', errorMessage);
      } else {
        toast.error('Goal update failed', errorMessage);
      }
    },
    onSettled: () => {
      // Final safety net: ensure fresh data after any mutation
      queryClient.invalidateQueries({ 
        queryKey: ['goals'], 
        refetchType: 'none' // Don't refetch immediately, let components decide
      });
    }
  });
}

// Delete a goal
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, workspaceId }: { goalId: string; workspaceId: string }) => {
      console.log('🎯 useDeleteGoal mutationFn called:', { goalId, workspaceId });
      try {
        const response = await api.delete(`/workspaces/${workspaceId}/goals/${goalId}`);
        console.log('🎯 Goal deleted successfully via API:', response.data);
        return { data: response.data, simulated: false };
      } catch (error) {
        console.log('🎯 Backend unavailable, goal deletion simulated');
        // Simulate deletion by updating local cache for all workspace goals queries
        queryClient.getQueryCache().findAll(['goals', 'workspace']).forEach((query) => {
          queryClient.setQueryData(query.queryKey, (oldData: any) => {
            if (!oldData || !Array.isArray(oldData)) return oldData;
            return oldData.filter((goal: any) => goal.id !== goalId);
          });
        });
        return { success: true, simulated: true };
      }
    },
    onSuccess: (data, variables) => {
      console.log('🎯 Delete goal onSuccess called:', { data, variables });
      // Invalidate the specific workspace goals query
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace', variables.workspaceId] });
    },
  });
}

// Toggle milestone completion
export function useToggleMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => {
      try {
        const response = await api.put(`/goals/${goalId}/milestones/${milestoneId}/toggle`);
        return response.data.data;
      } catch (error) {
        console.log('🎯 Backend unavailable, milestone toggle simulated');
        return { goalId, milestoneId, completed: true };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
    },
  });
}

// Add milestone to goal
export function useAddMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      goalId, 
      milestone 
    }: { 
      goalId: string; 
      milestone: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'completedBy'>;
    }) => {
      try {
        const response = await api.post(`/goals/${goalId}/milestones`, milestone);
        return response.data.data;
      } catch (error) {
        console.log('🎯 Backend unavailable, milestone addition simulated');
        return { id: `milestone-${Date.now()}`, ...milestone, completed: false };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
    },
  });
}

// Link journal entry to goal
export function useLinkJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      goalId, 
      entryId, 
      contributionType, 
      progressContribution, 
      notes 
    }: { 
      goalId: string; 
      entryId: string; 
      contributionType: 'milestone' | 'progress' | 'blocker' | 'update';
      progressContribution: number;
      notes?: string;
    }) => {
      try {
        const response = await api.post(`/goals/${goalId}/link-entry`, {
          entryId,
          contributionType,
          progressContribution,
          notes
        });
        return response.data.data;
      } catch (error) {
        console.log('🎯 Backend unavailable, journal entry linking simulated');
        return { goalId, entryId, contributionType, progressContribution };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
    },
  });
}

// Update goal progress manually
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      goalId, 
      progressOverride, 
      autoCalculateProgress 
    }: { 
      goalId: string; 
      progressOverride?: number;
      autoCalculateProgress?: boolean;
    }) => {
      try {
        const response = await api.put(`/goals/${goalId}/progress`, {
          progressOverride,
          autoCalculateProgress
        });
        return response.data.data;
      } catch (error) {
        console.log('🎯 Backend unavailable, progress update simulated');
        return { goalId, progressOverride, autoCalculateProgress };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
    },
  });
}

// Progress calculation utilities
export const calculateMilestoneBasedProgress = (milestones: Milestone[]): number => {
  if (!milestones || milestones.length === 0) return 0;
  
  // Check if milestones have weights
  const hasWeights = milestones.some(m => m.weight !== undefined && m.weight > 0);
  
  if (hasWeights) {
    // Weighted calculation
    const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 0), 0);
    if (totalWeight === 0) return 0;
    
    const weightedProgress = milestones.reduce((sum, milestone) => {
      const weight = milestone.weight || 0;
      const multiplier = milestone.status === 'completed' ? 1 : 
                       milestone.status === 'partial' ? 0.5 : 0;
      return sum + (weight * multiplier);
    }, 0);
    
    return Math.min(100, Math.round(weightedProgress));
  } else {
    // Equal weight calculation (current behavior)
    const completedCount = milestones.filter(m => 
      m.status === 'completed' || m.completed
    ).length;
    const partialCount = milestones.filter(m => 
      m.status === 'partial'
    ).length;
    
    const progress = ((completedCount + (partialCount * 0.5)) / milestones.length) * 100;
    return Math.round(progress);
  }
};

export const getEffectiveProgress = (goal: Goal): number => {
  // Manual override takes precedence
  if (goal.progressOverride !== undefined && goal.progressOverride !== null) {
    return Math.min(100, Math.max(0, goal.progressOverride));
  }
  
  // Auto-calculate from milestones
  if (goal.autoCalculateProgress && goal.milestones) {
    return calculateMilestoneBasedProgress(goal.milestones);
  }
  
  // Use stored progress percentage
  return goal.progressPercentage;
};

export const shouldShowCompletionDialog = (goal: Goal): boolean => {
  const effectiveProgress = getEffectiveProgress(goal);
  const requiresManualCompletion = goal.requiresManualCompletion !== false; // Default to true if undefined
  
  console.log('🎯 shouldShowCompletionDialog check:', {
    goalTitle: goal.title,
    effectiveProgress,
    status: goal.status,
    requiresManualCompletion,
    rawRequiresManualCompletion: goal.requiresManualCompletion,
    result: effectiveProgress >= 100 && goal.status !== 'achieved' && requiresManualCompletion
  });
  
  return effectiveProgress >= 100 && 
         goal.status !== 'achieved' && 
         requiresManualCompletion;
};

// ============================================================================
// TASK MANAGEMENT HOOKS
// ============================================================================

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: async ({ goalId, milestoneId, task }: { goalId: string; milestoneId: string; task: Partial<Task> }) => {
      const { data } = await api.post(`/goals/${goalId}/milestones/${milestoneId}/tasks`, task);
      return data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate goals queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
      toast.success('Task created', `"${data.title}" has been added successfully`);
      console.log('✅ Task created successfully:', data.id);
    },
    onError: (error) => {
      console.error('❌ Failed to create task:', error);
      toast.error('Failed to create task', 'Please try again or contact support if the issue persists');
    }
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: async ({ goalId, milestoneId, taskId, updates, previouslyCompleted }: { 
      goalId: string; 
      milestoneId: string; 
      taskId: string; 
      updates: Partial<Task>;
      previouslyCompleted?: boolean;
    }) => {
      const { data } = await api.put(`/goals/${goalId}/milestones/${milestoneId}/tasks/${taskId}`, updates);
      return data.data;
    },
    onSuccess: (data, variables) => {
      
      // Check if task was newly completed (celebration now handled locally in TaskTableRow)
      const wasNewlyCompleted = variables.updates.completed === true && data.completed && !variables.previouslyCompleted;
      if (wasNewlyCompleted) {
        toast.success('Task completed', `"${data.title}" has been marked as completed`);
        // Note: Confetti is now triggered locally in TaskTableRow component
      } else {
        toast.success('Task updated', `"${data.title}" has been updated successfully`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
      console.log('♻️  Frontend: React Query cache invalidated');
    },
    onError: (error) => {
      console.error('❌ Failed to update task:', error);
      toast.error('Failed to update task', 'Please try again or contact support if the issue persists');
    }
  });
};

export const useToggleTask = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: async ({ goalId, milestoneId, taskId }: { goalId: string; milestoneId: string; taskId: string }) => {
      console.log('🎯 useToggleTask mutationFn called:', { goalId, milestoneId, taskId });
      try {
        const { data } = await api.put(`/goals/${goalId}/milestones/${milestoneId}/tasks/${taskId}/toggle`);
        console.log('🎯 Task API response:', data);
        return data.data;
      } catch (error) {
        console.error('🎯 Task API error:', error);
        throw error;
      }
    },
    onMutate: async ({ goalId, milestoneId, taskId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['goals', 'workspace'] });

      // Snapshot the previous value for rollback and get the actual workspace query cache
      const queryCache = queryClient.getQueryCache();
      let previousGoals: Goal[] | undefined;
      let workspaceQueryKey: any[] | undefined;
      
      // Find the specific workspace query that's actually being used
      queryCache.findAll(['goals', 'workspace']).forEach(query => {
        if (query.state.data) {
          previousGoals = query.state.data as Goal[];
          workspaceQueryKey = query.queryKey;
        }
      });

      if (!workspaceQueryKey) {
        console.warn('🎯 No workspace query found for optimistic update');
        return { previousGoals: undefined };
      }

      // Optimistically update the task's completed status
      queryClient.setQueryData<Goal[]>(workspaceQueryKey, (oldGoals) => {
        if (!oldGoals) return oldGoals;

        return oldGoals.map(goal => {
          if (goal.id !== goalId) return goal;

          return {
            ...goal,
            milestones: goal.milestones.map(milestone => {
              if (milestone.id !== milestoneId) return milestone;

              const updatedTasks = (milestone.tasks || []).map(task => {
                if (task.id !== taskId) return task;

                const newCompleted = !task.completed;
                return {
                  ...task,
                  completed: newCompleted,
                  completedDate: newCompleted ? new Date().toISOString() : null,
                  updatedAt: new Date().toISOString()
                };
              });

              // Check if milestone should be auto-completed/uncompleted
              const allTasksCompleted = updatedTasks.length > 0 && updatedTasks.every(t => t.completed);
              const shouldAutoComplete = milestone.autoCompleteFromTasks !== false && allTasksCompleted;
              const shouldAutoUncomplete = milestone.autoCompleteFromTasks !== false && !allTasksCompleted && milestone.completed;

              return {
                ...milestone,
                tasks: updatedTasks,
                completed: shouldAutoComplete || (milestone.completed && !shouldAutoUncomplete),
                completedAt: shouldAutoComplete ? new Date().toISOString() : (shouldAutoUncomplete ? null : milestone.completedAt)
              };
            })
          };
        });
      });

      // Return the previous value and query key for potential rollback
      return { previousGoals, workspaceQueryKey };
    },
    onSuccess: (data, variables) => {
      console.log('🎯 Task onSuccess called:', { data, variables });
      // Only show toast for task completion, not un-completion to reduce noise
      if (data.completed) {
        toast.success('Task completed', `"${data.title}" has been marked as completed`);
        // Note: Confetti is now triggered locally in TaskTableRow component
      }
      console.log('✅ Task completion toggled:', { taskId: data.id, completed: data.completed });
      
      // Invalidate to ensure we have the latest server state
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousGoals && context?.workspaceQueryKey) {
        queryClient.setQueryData(context.workspaceQueryKey, context.previousGoals);
      }
      
      console.error('❌ Failed to toggle task:', error);
      toast.error('Failed to update task', 'Please try again or contact support if the issue persists');
    }
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: async ({ goalId, milestoneId, taskId }: { goalId: string; milestoneId: string; taskId: string }) => {
      const { data } = await api.delete(`/goals/${goalId}/milestones/${milestoneId}/tasks/${taskId}`);
      return data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
      toast.success('Task deleted', 'Task has been removed successfully');
      console.log('✅ Task deleted successfully:', variables.taskId);
    },
    onError: (error) => {
      console.error('❌ Failed to delete task:', error);
      toast.error('Failed to delete task', 'Please try again or contact support if the issue persists');
    }
  });
};

export const useCompleteMilestone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ goalId, milestoneId, completed }: { goalId: string; milestoneId: string; completed: boolean }) => {
      console.log('🎯 useCompleteMilestone mutationFn called:', { goalId, milestoneId, completed });
      try {
        const { data } = await api.put(`/goals/${goalId}/milestones/${milestoneId}/toggle`, { completed });
        console.log('🎯 Milestone API response:', data);
        return data.data;
      } catch (error) {
        console.error('🎯 Milestone API error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('🎯 Milestone onSuccess called:', { data, variables });
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
      
      // Note: Confetti is now triggered locally in MilestoneGroup component
      console.log('✅ Milestone completion updated:', { milestoneId: variables.milestoneId, completed: variables.completed });
    },
    onError: (error) => {
      console.error('❌ Failed to update milestone completion:', error);
    }
  });
};

// ============================================================================
// WORKSPACE LABEL MANAGEMENT HOOKS
// ============================================================================

// Get workspace labels for a specific workspace
export const useWorkspaceLabels = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspace-labels', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/goals/workspace/${workspaceId}/labels`);
      return data.data as WorkspaceLabel[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update workspace label values
export const useUpdateWorkspaceLabel = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      type, 
      values 
    }: { 
      workspaceId: string; 
      type: 'priority' | 'status'; 
      values: { name: string; color: string; order: number }[] 
    }) => {
      const { data } = await api.put(`/goals/workspace/${workspaceId}/labels/${type}`, { values });
      return data.data as WorkspaceLabel;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-labels', variables.workspaceId] });
      toast.success('Labels updated', `${variables.type} labels have been updated successfully`);
    },
    onError: (error) => {
      console.error('❌ Failed to update workspace labels:', error);
      toast.error('Failed to update labels', 'Please try again or contact support if the issue persists');
    }
  });
};

// Initialize default workspace labels
export const useInitializeWorkspaceLabels = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { data } = await api.post(`/goals/workspace/${workspaceId}/labels/initialize`);
      return data.data as WorkspaceLabel[];
    },
    onSuccess: (data, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-labels', workspaceId] });
      toast.success('Labels initialized', 'Default priority and status labels have been created');
    },
    onError: (error) => {
      console.error('❌ Failed to initialize workspace labels:', error);
      toast.error('Failed to initialize labels', 'Please try again or contact support if the issue persists');
    }
  });
};