import axios from 'axios';

// API Configuration - Production and development support
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3002/api/v1' : 'https://backend-production-76d6.up.railway.app/api/v1');

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('inchronicle_access_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('inchronicle_access_token', token);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('inchronicle_refresh_token');
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem('inchronicle_refresh_token', token);
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem('inchronicle_access_token');
  localStorage.removeItem('inchronicle_refresh_token');
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('🔒 401 error received, attempting token refresh...');
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken } = response.data.data;
          setAuthToken(accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          console.log('🔄 Refresh token failed, redirecting to login');
          clearAuthTokens();
          
          // Only redirect if we're not on a public page
          const currentPath = window.location.pathname;
          const publicPaths = ['/', '/login', '/register', '/about', '/privacy', '/terms'];
          if (!publicPaths.includes(currentPath)) {
            window.location.href = '/login';
          }
        }
      } else {
        // No refresh token, redirect to login only if on protected page
        console.log('🚫 No refresh token found');
        clearAuthTokens();
        
        const currentPath = window.location.pathname;
        const publicPaths = ['/', '/login', '/register', '/about', '/privacy', '/terms'];
        if (!publicPaths.includes(currentPath)) {
          console.log('🚫 Redirecting to login from protected page');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Error type
export interface ApiError {
  success: false;
  error: string;
  details?: any;
}