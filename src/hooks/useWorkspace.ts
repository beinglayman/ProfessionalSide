import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    logo?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalMembers: number;
    totalJournalEntries: number;
  };
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  members?: WorkspaceMember[];
  categories?: WorkspaceCategory[];
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    title?: string;
    company?: string;
  };
}


export interface WorkspaceFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedById: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  organizationId: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface InviteMemberData {
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  message?: string;
}

export interface WorkspaceCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color: string;
}

// Get all workspaces for current user
export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<Workspace[]> => {
      const response = await api.get('/workspaces');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get specific workspace by ID
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async (): Promise<Workspace> => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.data;
    },
    enabled: !!workspaceId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Get workspace members
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'members'],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      try {
        console.log('🔍 API: Fetching workspace members for:', workspaceId);
        const response = await api.get(`/workspaces/${workspaceId}/members`);
        console.log('✅ API: Workspace members response:', response.data);
        
        // The API returns { success: true, data: [members] }
        // So we should access response.data.data, not response.data.data.data
        const membersData = response.data.data;
        console.log('📊 API: Members data:', membersData);
        
        // Ensure we always return an array
        if (Array.isArray(membersData)) {
          return membersData;
        }
        
        console.warn('⚠️ API: Members data is not an array:', typeof membersData, membersData);
        return [];
      } catch (error) {
        console.error('❌ API: Failed to fetch workspace members:', error);
        console.log('🔄 API: Returning empty array as fallback');
        return [];
      }
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on error for debugging
  });
}

// Get workspace categories
export function useWorkspaceCategories(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'categories'],
    queryFn: async (): Promise<WorkspaceCategory[]> => {
      const response = await api.get(`/workspaces/${workspaceId}/categories`);
      return response.data.data;
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get workspace files
export function useWorkspaceFiles(workspaceId: string, params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'files', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);

      const response = await api.get(`/workspaces/${workspaceId}/files?${queryParams}`);
      return response.data;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get workspace journal entries
export function useWorkspaceJournalEntries(workspaceId: string, params: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
} = {}) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'journal-entries', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/workspaces/${workspaceId}/journal-entries?${queryParams}`);
      return response.data;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Create workspace mutation
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkspaceData) => {
      const response = await api.post('/workspaces', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Update workspace mutation
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, ...data }: { workspaceId: string } & UpdateWorkspaceData) => {
      const response = await api.put(`/workspaces/${workspaceId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Delete workspace mutation
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const response = await api.delete(`/workspaces/${workspaceId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Invite member mutation
export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, ...data }: { workspaceId: string } & InviteMemberData) => {
      const response = await api.post(`/workspaces/${workspaceId}/members`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });
}

// Update member role mutation
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, memberId, role }: { 
      workspaceId: string; 
      memberId: string; 
      role: 'ADMIN' | 'MEMBER' | 'VIEWER';
    }) => {
      const response = await api.put(`/workspaces/${workspaceId}/members/${memberId}`, { role });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'members'] });
    },
  });
}

// Remove member mutation
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, memberId }: { workspaceId: string; memberId: string }) => {
      const response = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });
}

// Create category mutation
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, ...data }: { workspaceId: string } & CreateCategoryData) => {
      const response = await api.post(`/workspaces/${workspaceId}/categories`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'categories'] });
    },
  });
}

// Update category mutation
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      categoryId, 
      ...data 
    }: { 
      workspaceId: string; 
      categoryId: string;
    } & Partial<CreateCategoryData>) => {
      const response = await api.put(`/workspaces/${workspaceId}/categories/${categoryId}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'files'] });
    },
  });
}

// Delete category mutation
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, categoryId }: { workspaceId: string; categoryId: string }) => {
      const response = await api.delete(`/workspaces/${workspaceId}/categories/${categoryId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'categories'] });
    },
  });
}

// Upload file mutation
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, file, description, category }: { 
      workspaceId: string; 
      file: File;
      description?: string;
      category?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (description) formData.append('description', description);
      if (category) formData.append('category', category);

      const response = await api.post(`/workspaces/${workspaceId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'files'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });
}

// Delete file mutation
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, fileId }: { workspaceId: string; fileId: string }) => {
      const response = await api.delete(`/workspaces/${workspaceId}/files/${fileId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'files'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });
}

// Update file mutation
export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      fileId, 
      name, 
      description, 
      category 
    }: { 
      workspaceId: string; 
      fileId: string;
      name?: string;
      description?: string;
      category?: string;
    }) => {
      const response = await api.put(`/workspaces/${workspaceId}/files/${fileId}`, {
        name,
        description,
        category
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId, 'files'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });
}