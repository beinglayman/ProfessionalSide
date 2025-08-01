import { api, ApiResponse } from '../lib/api';
import { User } from './auth.service';

export interface UpdateProfileRequest {
  name?: string;
  title?: string;
  bio?: string;
  location?: string;
  company?: string;
  avatar?: string;
  showEmail?: boolean;
  showLocation?: boolean;
  showCompany?: boolean;
  experience?: string;
  education?: string;
  certifications?: string;
  languages?: string;
}

export interface AddUserSkillRequest {
  skillName: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExp?: number;
  projects?: number;
  startDate?: string;
  isVisible?: boolean;
}

export interface UpdateUserSkillRequest {
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExp?: number;
  projects?: number;
  startDate?: string;
  isVisible?: boolean;
}

export interface SearchUsersParams {
  query: string;
  skills?: string[];
  location?: string;
  company?: string;
  page?: number;
  limit?: number;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  level: string;
  endorsements: number;
  projects: number;
  startDate?: string;
  yearsOfExp: number;
  isVisible: boolean;
  skill: Skill;
}

export class UserService {
  /**
   * Get current user's full profile
   */
  static async getMyProfile(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/users/profile/me');
    return response.data;
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`/users/${userId}`);
    return response.data;
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>('/users/profile', data);
    return response.data;
  }

  /**
   * Get user skills
   */
  static async getUserSkills(userId?: string): Promise<ApiResponse<UserSkill[]>> {
    const endpoint = userId ? `/users/${userId}/skills` : '/users/skills/my';
    const response = await api.get<ApiResponse<UserSkill[]>>(endpoint);
    return response.data;
  }

  /**
   * Add skill to user
   */
  static async addUserSkill(data: AddUserSkillRequest): Promise<ApiResponse<UserSkill>> {
    const response = await api.post<ApiResponse<UserSkill>>('/users/skills', data);
    return response.data;
  }

  /**
   * Update user skill
   */
  static async updateUserSkill(skillId: string, data: UpdateUserSkillRequest): Promise<ApiResponse<UserSkill>> {
    const response = await api.put<ApiResponse<UserSkill>>(`/users/skills/${skillId}`, data);
    return response.data;
  }

  /**
   * Remove user skill
   */
  static async removeUserSkill(skillId: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/users/skills/${skillId}`);
    return response.data;
  }

  /**
   * Search users
   */
  static async searchUsers(params: SearchUsersParams): Promise<ApiResponse<User[]>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.append(key, value.join(','));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    
    const response = await api.get<ApiResponse<User[]>>(`/users/search?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * Get all available skills
   */
  static async getAllSkills(): Promise<ApiResponse<Skill[]>> {
    const response = await api.get<ApiResponse<Skill[]>>('/users/skills/all');
    return response.data;
  }

  /**
   * Endorse user skill
   */
  static async endorseUserSkill(userId: string, skillId: string): Promise<ApiResponse<UserSkill>> {
    const response = await api.post<ApiResponse<UserSkill>>(`/users/${userId}/skills/${skillId}/endorse`);
    return response.data;
  }

  /**
   * Upload user avatar (placeholder)
   */
  static async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post<ApiResponse<{ avatarUrl: string }>>(
      '/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
}