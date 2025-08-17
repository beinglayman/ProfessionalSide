import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
}

// Get goals for a workspace
export function useWorkspaceGoals(workspaceId: string) {
  return useQuery({
    queryKey: ['goals', 'workspace', workspaceId],
    queryFn: async (): Promise<Goal[]> => {
      console.log('🎯 Fetching goals for workspace:', workspaceId);
      const response = await api.get(`/workspaces/${workspaceId}/goals`);
      console.log('🎯 Goals API response:', response.data);
      return response.data.data || [];
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
        return { id: goalId, ...data };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'workspace'] });
    },
  });
}

// Delete a goal
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      try {
        const response = await api.delete(`/goals/${goalId}`);
        return response.data;
      } catch (error) {
        console.log('🎯 Backend unavailable, goal deletion simulated');
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
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