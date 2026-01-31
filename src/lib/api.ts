import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getErrorConsole } from '../contexts/ErrorConsoleContext';
import { isDemoMode } from '../services/demo-mode.service';

// API Configuration - Production and development support
const envApiUrl = import.meta.env.VITE_API_URL;
const isValidUrl = envApiUrl && !envApiUrl.includes('professionalside-production');

export const API_BASE_URL = isValidUrl ? envApiUrl :
  (import.meta.env.DEV ? 'http://localhost:3002/api/v1' : 'https://ps-backend-1758551070.azurewebsites.net/api/v1');

// Extend axios config to include trace ID
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _traceId?: string;
    _retry?: boolean;
  }
}

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

// Request interceptor - add auth token AND start trace
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add demo mode header
    if (isDemoMode()) {
      config.headers['X-Demo-Mode'] = 'true';
    }

    // Start request trace
    const { startTrace } = getErrorConsole();
    if (startTrace) {
      const traceId = startTrace({
        method: config.method?.toUpperCase() || 'GET',
        url: config.url || '',
        baseURL: config.baseURL,
        headers: config.headers as Record<string, string>,
        params: config.params,
        data: config.data,
      });
      config._traceId = traceId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - end trace AND handle token refresh
api.interceptors.response.use(
  (response) => {
    // End successful trace
    const { endTrace } = getErrorConsole();
    const traceId = response.config._traceId;
    if (endTrace && traceId) {
      endTrace(traceId, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;
    const traceId = originalRequest?._traceId;

    // Handle 401 with token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
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

    // Fail trace for any error
    const { failTrace } = getErrorConsole();
    if (failTrace && traceId) {
      failTrace(
        traceId,
        {
          message: error.message,
          code: error.code,
          stack: error.stack,
        },
        error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        } : undefined
      );
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = unknown> {
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
  details?: unknown;
}
