import { api, setAuthToken, setRefreshToken, clearAuthTokens, ApiResponse } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  title?: string;
  company?: string;
  location?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  profile?: {
    profileCompleteness: number;
    joinedDate: string;
    lastActiveAt: string;
    showEmail: boolean;
    showLocation: boolean;
    showCompany: boolean;
  };
  workspaceMemberships?: Array<{
    id: string;
    role: string;
    workspace: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  skills?: Array<{
    id: string;
    level: string;
    endorsements: number;
    projects: number;
    yearsOfExp: number;
    skill: {
      id: string;
      name: string;
      category: string;
    };
  }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  title?: string;
  company?: string;
  location?: string;
  invitationToken?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
    
    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken } = response.data.data;
      setAuthToken(accessToken);
      setRefreshToken(refreshToken);
    }
    
    return response.data;
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    
    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken } = response.data.data;
      setAuthToken(accessToken);
      setRefreshToken(refreshToken);
    }
    
    return response.data;
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<ApiResponse<User>> {
    // In development, check for demo user data first
    if (import.meta.env.DEV) {
      const demoUserData = localStorage.getItem('demo_user_data');
      if (demoUserData) {
        try {
          const demoUser = JSON.parse(demoUserData);
          return {
            success: true,
            data: demoUser,
            error: null
          };
        } catch (error) {
          console.error('Failed to parse demo user data:', error);
        }
      }
    }
    
    try {
      const response = await api.get<ApiResponse<User>>('/auth/me');
      return response.data;
    } catch (error) {
      // If API call fails and we're in development with a token, try to use demo user
      if (import.meta.env.DEV && this.isAuthenticated()) {
        console.warn('API call failed, but demo token exists. Creating fallback demo user.');
        const fallbackUser: User = {
          id: 'demo_user_id',
          name: 'Demo User',
          email: 'demo@example.com',
          title: 'Software Engineer',
          company: 'Demo Company',
          location: 'San Francisco, CA',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
          bio: 'Demo user for development and testing',
          createdAt: new Date().toISOString(),
          profile: {
            profileCompleteness: 85,
            joinedDate: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            showEmail: true,
            showLocation: true,
            showCompany: true
          }
        };
        return {
          success: true,
          data: fallbackUser,
          error: null
        };
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await api.post<ApiResponse<null>>('/auth/logout');
      return response.data;
    } finally {
      // Always clear tokens locally, even if API call fails
      clearAuthTokens();
    }
  }

  /**
   * Change password
   */
  static async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>('/auth/change-password', data);
    
    // If password change is successful, clear tokens to force re-login
    if (response.data.success) {
      clearAuthTokens();
    }
    
    return response.data;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    
    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      setAuthToken(accessToken);
      setRefreshToken(newRefreshToken);
    }
    
    return response.data;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('inchronicle_access_token');
  }
}