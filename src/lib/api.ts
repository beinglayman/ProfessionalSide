import axios from 'axios';

// API Configuration - Production and development support
const envApiUrl = import.meta.env.VITE_API_URL;
const isValidUrl = envApiUrl && !envApiUrl.includes('old-railway-domains');

export const API_BASE_URL = isValidUrl ? envApiUrl :
  (import.meta.env.DEV ? 'http://localhost:3002/api/v1' : 'https://api.inchronicle.com/api/v1');

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

// Enhanced API instances for different use cases

// API instance for multipart/form-data (file uploads)
export const apiFormData = axios.create({
  baseURL: API_BASE_URL,
  // Don't set Content-Type for form data - let browser set it with boundary
});

// API instance for public endpoints (no auth required)
export const apiPublic = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Apply auth interceptor to form data instance
apiFormData.interceptors.request.use(
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

// Apply same response interceptor to form data instance
apiFormData.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          setAuthToken(accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiFormData(originalRequest);
        } catch (refreshError) {
          clearAuthTokens();
          const currentPath = window.location.pathname;
          const publicPaths = ['/', '/login', '/register', '/about', '/privacy', '/terms'];
          if (!publicPaths.includes(currentPath)) {
            window.location.href = '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

// Utility functions for common API patterns

/**
 * Get full URL for relative paths (useful for file downloads, etc.)
 */
export const getFullApiUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

/**
 * Create FormData instance with proper handling
 */
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });
  return formData;
};

/**
 * Enhanced error handler for API responses
 */
export const handleApiError = (error: any): never => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.error || error.response.data?.message || `HTTP ${error.response.status}`;
    throw new Error(message);
  } else if (error.request) {
    // Request was made but no response
    throw new Error('Network error - please check your connection');
  } else {
    // Something else happened
    throw new Error(error.message || 'An unexpected error occurred');
  }
};