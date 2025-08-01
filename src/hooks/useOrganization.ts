import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  description?: string;
}

// Get all organizations
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async (): Promise<Organization[]> => {
      const response = await api.get('/organizations');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create organization mutation
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrganizationData) => {
      const response = await api.post('/organizations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}