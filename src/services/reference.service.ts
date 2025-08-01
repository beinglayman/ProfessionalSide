import { api, ApiResponse } from '../lib/api';

export interface FocusArea {
  id: string;
  label: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCategory {
  id: string;
  label: string;
  focusAreaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkType {
  id: string;
  label: string;
  workCategoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCategoryWithTypes extends WorkCategory {
  workTypes: WorkType[];
}

export interface FocusAreaWithHierarchy extends FocusArea {
  workCategories: Array<WorkCategoryWithTypes & {
    workTypes: Array<WorkType & { skills: Skill[] }>;
  }>;
}

export class ReferenceService {
  /**
   * Get all focus areas
   */
  static async getFocusAreas(): Promise<ApiResponse<FocusArea[]>> {
    const response = await api.get<ApiResponse<FocusArea[]>>('/reference/focus-areas');
    return response.data;
  }

  /**
   * Get work categories for a specific focus area
   */
  static async getWorkCategories(focusAreaId: string): Promise<ApiResponse<WorkCategory[]>> {
    const response = await api.get<ApiResponse<WorkCategory[]>>(`/reference/work-categories/${focusAreaId}`);
    return response.data;
  }

  /**
   * Get work types for a specific work category
   */
  static async getWorkTypes(workCategoryId: string): Promise<ApiResponse<WorkType[]>> {
    const response = await api.get<ApiResponse<WorkType[]>>(`/reference/work-types/${workCategoryId}`);
    return response.data;
  }

  /**
   * Get all skills
   */
  static async getSkills(params?: {
    category?: string;
    workTypeId?: string;
  }): Promise<ApiResponse<Skill[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.category) {
      searchParams.append('category', params.category);
    }
    
    if (params?.workTypeId) {
      searchParams.append('workTypeId', params.workTypeId);
    }
    
    const queryString = searchParams.toString();
    const url = queryString ? `/reference/skills?${queryString}` : '/reference/skills';
    
    const response = await api.get<ApiResponse<Skill[]>>(url);
    return response.data;
  }

  /**
   * Get skills for multiple work types
   */
  static async getSkillsForWorkTypes(workTypeIds: string[]): Promise<ApiResponse<Skill[]>> {
    const searchParams = new URLSearchParams();
    searchParams.append('workTypeIds', workTypeIds.join(','));
    
    const response = await api.get<ApiResponse<Skill[]>>(`/reference/skills-for-work-types?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * Get skills for a specific work type
   */
  static async getSkillsForWorkType(workTypeId: string): Promise<ApiResponse<Skill[]>> {
    const response = await api.get<ApiResponse<Skill[]>>(`/reference/skills-for-work-type/${workTypeId}`);
    return response.data;
  }

  /**
   * Get complete hierarchical data for a focus area
   */
  static async getHierarchicalData(focusAreaId: string): Promise<ApiResponse<FocusAreaWithHierarchy>> {
    const response = await api.get<ApiResponse<FocusAreaWithHierarchy>>(`/reference/hierarchical-data/${focusAreaId}`);
    return response.data;
  }
}