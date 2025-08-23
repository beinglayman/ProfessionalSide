import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeStorage } from '../utils/storage';
import { api } from '../lib/api';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  position?: string;
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
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
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
  
  // RACI assignments
  accountable: TeamMember;
  responsible: TeamMember[];
  consulted?: TeamMember[];
  informed?: TeamMember[];
  
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
  accountableId: string;
  responsibleIds: string[];
  consultedIds?: string[];
  informedIds?: string[];
  milestones?: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'completedBy'>[];
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  status?: Goal['status'];
  priority?: Goal['priority'];
  targetDate?: string;
  category?: string;
  accountableId?: string;
  responsibleIds?: string[];
  consultedIds?: string[];
  informedIds?: string[];
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
      console.log('🎯 Fetching goals for workspace:', workspaceId);
      try {
        const response = await api.get(`/workspaces/${workspaceId}/goals`);
        console.log('🎯 Goals API response:', response.data);
        console.log('🎯 Goals API response data array:', response.data.data);
        let goals = response.data.data || [];
        // Apply optimistic overrides from local storage if backend is missing updates
        try {
          const raw = SafeStorage.getItem('goal_overrides');
          if (raw) {
            const overrides = JSON.parse(raw) as Record<string, Partial<Goal>>;
            goals = goals.map((g: Goal) => overrides[g.id] ? { ...g, ...overrides[g.id] } : g);
          }
        } catch (e) {
          console.warn('Failed to apply goal overrides from storage');
        }
        console.log('🎯 Returning goals array:', goals);
        console.log('🎯 Number of goals:', goals.length);
        return goals;
      } catch (error) {
        console.log('🎯 Goals API error:', error);
        console.log('🎯 Returning empty goals array due to error');
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
      return response.data.data;
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

  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: UpdateGoalData }) => {
      try {
        const response = await api.put(`/goals/${goalId}`, data);
        return response.data.data;
      } catch (error) {
        console.log('🎯 Backend unavailable, goal update simulated');
        return { id: goalId, ...data, simulated: true } as any;
      }
    },
    onSuccess: (data, variables) => {
      // Optimistically merge into workspace goals cache for immediate UI update
      queryClient.getQueryCache().findAll(['goals', 'workspace']).forEach((query) => {
        queryClient.setQueryData(query.queryKey, (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          const updated = oldData.map((g: any) => g.id === variables.goalId ? { ...g, ...data } : g);
          // Persist override to local storage so it survives refresh while backend is down
          try {
            const raw = SafeStorage.getItem('goal_overrides');
            const overrides = raw ? JSON.parse(raw) : {};
            overrides[variables.goalId] = { ...(overrides[variables.goalId] || {}), ...data };
            SafeStorage.setItem('goal_overrides', JSON.stringify(overrides));
          } catch {}
          return updated;
        });
      });
      // Only refetch from server if this wasn't simulated (i.e., backend responded)
      if (!(data as any)?.simulated) {
        queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
        queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
      } else {
        // keep overrides for a while; optional: schedule cleanup when backend confirms
      }
    },
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
    result: effectiveProgress >= 100 && goal.status !== 'completed' && requiresManualCompletion
  });
  
  return effectiveProgress >= 100 && 
         goal.status !== 'completed' && 
         requiresManualCompletion;
};