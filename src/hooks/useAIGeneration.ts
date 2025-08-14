import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

interface EntryData {
  title: string;
  description: string;
  result: string;
  primaryFocusArea: string;
  workCategory: string;
  workTypes: string[];
  skillsApplied: string[];
  artifacts: any[];
  collaborators: string[];
  reviewers: string[];
  tags: string[];
  workspaceId: string;
  projects: string[];
  departments: string[];
}

interface GeneratedEntryContent {
  title: string;
  description: string;
  outcomes: Array<{
    category: 'performance' | 'technical' | 'user-experience' | 'business';
    title: string;
    description: string;
  }>;
}

interface GeneratedEntry {
  workspaceEntry: GeneratedEntryContent;
  networkEntry: GeneratedEntryContent;
}

/**
 * Hook for generating AI-powered journal entries
 */
export function useGenerateAIEntries() {
  return useMutation({
    mutationFn: async (entryData: EntryData): Promise<GeneratedEntry> => {
      const response = await api.post('/ai-entries/generate', entryData);
      return response.data.data;
    },
    onError: (error: any) => {
      console.error('AI entry generation failed:', error);
    }
  });
}

/**
 * Hook to test AI service connection
 */
export function useTestAIConnection() {
  return useMutation({
    mutationFn: async (): Promise<{ connected: boolean; message: string }> => {
      const response = await api.post('/ai-entries/test-connection');
      return response.data.data;
    }
  });
}

/**
 * Hook to check AI service configuration status
 */
export function useAIConfigStatus() {
  return useMutation({
    mutationFn: async (): Promise<{
      configured: boolean;
      requiredEnvVars: string[];
      missingVars: string[];
    }> => {
      const response = await api.get('/ai-entries/config-status');
      return response.data.data;
    }
  });
}