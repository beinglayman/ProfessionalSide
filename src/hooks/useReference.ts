import { useQuery } from '@tanstack/react-query';
import { ReferenceService, FocusArea, WorkCategory, WorkType, Skill, FocusAreaWithHierarchy } from '../services/reference.service';

/**
 * Hook to fetch all focus areas
 */
export const useFocusAreas = () => {
  return useQuery({
    queryKey: ['focusAreas'],
    queryFn: async () => {
      const response = await ReferenceService.getFocusAreas();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch focus areas');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch work categories for a specific focus area
 */
export const useWorkCategories = (focusAreaId: string | null) => {
  return useQuery({
    queryKey: ['workCategories', focusAreaId],
    queryFn: async () => {
      if (!focusAreaId) return [];
      
      const response = await ReferenceService.getWorkCategories(focusAreaId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch work categories');
      }
      return response.data;
    },
    enabled: !!focusAreaId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch work types for a specific work category
 */
export const useWorkTypes = (workCategoryId: string | null) => {
  return useQuery({
    queryKey: ['workTypes', workCategoryId],
    queryFn: async () => {
      if (!workCategoryId) return [];
      
      const response = await ReferenceService.getWorkTypes(workCategoryId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch work types');
      }
      return response.data;
    },
    enabled: !!workCategoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch all skills
 */
export const useSkills = (params?: { category?: string; workTypeId?: string }) => {
  return useQuery({
    queryKey: ['skills', params],
    queryFn: async () => {
      const response = await ReferenceService.getSkills(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch skills');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch skills for multiple work types
 */
export const useSkillsForWorkTypes = (workTypeIds: string[]) => {
  return useQuery({
    queryKey: ['skillsForWorkTypes', workTypeIds],
    queryFn: async () => {
      if (workTypeIds.length === 0) return [];
      
      const response = await ReferenceService.getSkillsForWorkTypes(workTypeIds);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch skills for work types');
      }
      return response.data;
    },
    enabled: workTypeIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch skills for a specific work type
 */
export const useSkillsForWorkType = (workTypeId: string | null) => {
  return useQuery({
    queryKey: ['skillsForWorkType', workTypeId],
    queryFn: async () => {
      if (!workTypeId) return [];
      
      const response = await ReferenceService.getSkillsForWorkType(workTypeId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch skills for work type');
      }
      return response.data;
    },
    enabled: !!workTypeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch complete hierarchical data for a focus area
 */
export const useHierarchicalData = (focusAreaId: string | null) => {
  return useQuery({
    queryKey: ['hierarchicalData', focusAreaId],
    queryFn: async () => {
      if (!focusAreaId) return null;
      
      const response = await ReferenceService.getHierarchicalData(focusAreaId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch hierarchical data');
      }
      return response.data;
    },
    enabled: !!focusAreaId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};