import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DataExportRequest {
  includeProfile?: boolean;
  includeJournalEntries?: boolean;
  includeAchievements?: boolean;
  includeConnections?: boolean;
  includeWorkspaces?: boolean;
  format?: 'json' | 'csv';
}

export interface DataExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  estimatedCompletionTime?: string;
}

// Hook to request data export
export function useRequestDataExport() {
  return useMutation({
    mutationFn: async (options: DataExportRequest = {}) => {
      const response = await api.post('/users/export-data', {
        includeProfile: true,
        includeJournalEntries: true,
        includeAchievements: true,
        includeConnections: true,
        includeWorkspaces: true,
        format: 'json',
        ...options
      });
      return response.data;
    },
  });
}

// Hook to check export status
export function useCheckExportStatus() {
  return useMutation({
    mutationFn: async (exportId: string): Promise<DataExportResponse> => {
      const response = await api.get(`/users/export-data/${exportId}/status`);
      return response.data.data;
    },
  });
}

// Hook to download export data
export function useDownloadExportData() {
  return useMutation({
    mutationFn: async (exportId: string) => {
      const response = await api.get(`/users/export-data/${exportId}/download`, {
        responseType: 'blob',
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inchronicle-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
  });
}

// Hook to delete user profile
export function useDeleteProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (confirmation: { password?: string; confirmText: string }) => {
      const response = await api.delete('/users/profile', {
        data: confirmation
      });
      return response.data;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Clear local storage
      localStorage.removeItem('inchronicle_access_token');
      localStorage.removeItem('inchronicle_refresh_token');
      localStorage.removeItem('onboarding_complete_data');
      
      // Clear any other app-specific storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('inchronicle_')) {
          localStorage.removeItem(key);
        }
      });
    },
  });
}

// Hook to update privacy settings
export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: {
      profileVisibility?: 'public' | 'private';
      showEmail?: boolean;
      showLocation?: boolean;
      showCompany?: boolean;
      showConnections?: boolean;
      allowSearchEngineIndexing?: boolean;
    }) => {
      const response = await api.put('/users/privacy-settings', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'privacy-settings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Hook to get privacy settings
export function usePrivacySettings() {
  return useQuery({
    queryKey: ['user', 'privacy-settings'],
    queryFn: async () => {
      try {
        const response = await api.get('/users/privacy-settings');
        console.log('🔍 Privacy settings API response:', response.data);
        const data = response.data.data;
        console.log('📋 Privacy settings data:', data);
        return data; // API returns data in response.data.data format
      } catch (error) {
        console.error('❌ Privacy settings API error:', error);
        // Return default privacy settings if not found
        return {
          profileVisibility: 'private',
          showEmail: false,
          showLocation: true,
          showCompany: true,
          showConnections: true,
          allowSearchEngineIndexing: false,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}