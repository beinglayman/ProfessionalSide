import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DashboardStats {
  totalJournalEntries: number;
  totalSkills: number;
  totalGoals: number;
  completedGoals: number;
  currentStreak: number;
  profileCompleteness: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  monthlyProgress: {
    month: string;
    journalEntries: number;
    skillsAdded: number;
    goalsCompleted: number;
  }[];
  recentActivity: {
    id: string;
    type: 'journal' | 'skill' | 'goal' | 'achievement';
    title: string;
    description: string;
    date: string;
    status: string;
    metadata?: any;
  }[];
}

export interface ProfileCompleteness {
  overallProgress: number;
  categories: {
    name: string;
    progress: number;
    total: number;
    completed: number;
  }[];
  recommendations: string[];
  timeToComplete: string;
  impactStats: string;
}

export interface JournalStreak {
  currentStreak: number;
  personalBest: number;
  todayCompleted: boolean;
  weekProgress: {
    date: Date;
    completed: boolean;
    isToday: boolean;
  }[];
  historicalData: {
    date: Date;
    completed: boolean;
  }[];
  milestones: {
    days: number;
    name: string;
    reached: boolean;
  }[];
  entryTypes: {
    type: string;
    percentage: number;
  }[];
}

export interface SkillsGrowth {
  periods: {
    label: string;
    skills: {
      name: string;
      value: number;
      category: string;
    }[];
  }[];
  benchmarks: Record<string, number>;
  trends: {
    skill: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
    period: string;
  }[];
}

export interface GoalsScorecard {
  currentQuarter: string;
  overallProgress: number;
  goals: {
    id: string;
    title: string;
    progress: number;
    target: number;
    unit: string;
    category: string;
    dueDate: string;
    status: 'on-track' | 'at-risk' | 'behind' | 'completed';
    lastUpdated: string;
  }[];
  trends: {
    label: string;
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await api.get('/dashboard/stats');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useProfileCompleteness() {
  return useQuery({
    queryKey: ['dashboard', 'profile-completeness'],
    queryFn: async (): Promise<ProfileCompleteness> => {
      const response = await api.get('/dashboard/profile-completeness');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useJournalStreak() {
  return useQuery({
    queryKey: ['dashboard', 'journal-streak'],
    queryFn: async (): Promise<JournalStreak> => {
      const response = await api.get('/dashboard/journal-streak');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSkillsGrowth() {
  return useQuery({
    queryKey: ['dashboard', 'skills-growth'],
    queryFn: async (): Promise<SkillsGrowth> => {
      const response = await api.get('/dashboard/skills-growth');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useGoalsScorecard() {
  return useQuery({
    queryKey: ['dashboard', 'goals-scorecard'],
    queryFn: async (): Promise<GoalsScorecard> => {
      const response = await api.get('/dashboard/goals-scorecard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-activity');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}