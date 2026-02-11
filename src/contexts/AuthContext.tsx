import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthService, User, LoginRequest, RegisterRequest } from '../services/auth.service';
import { QueryKeys } from '../lib/queryClient';
import { enableDemoMode } from '../services/demo-mode.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const queryClient = useQueryClient();

  // Get current user query
  const {
    data: user,
    isLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: QueryKeys.currentUser,
    queryFn: async () => {
      const response = await AuthService.getCurrentUser();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get current user');
    },
    enabled: isAuthenticated && !!localStorage.getItem('inchronicle_access_token'),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 - user is not authenticated
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: AuthService.login,
    onSuccess: (response) => {
      if (response.success && response.data) {
        setIsAuthenticated(true);
        // Sync token state with localStorage (set by AuthService)
        setToken(localStorage.getItem('inchronicle_access_token'));
        queryClient.setQueryData(QueryKeys.currentUser, response.data.user);
        // Start in demo mode — demo has data, live may not
        enableDemoMode();
      } else {
        throw new Error(response.error || 'Login failed');
      }
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      setIsAuthenticated(false);
      setToken(null);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: AuthService.register,
    onSuccess: (response) => {
      if (response.success && response.data) {
        setIsAuthenticated(true);
        // Sync token state with localStorage (set by AuthService)
        setToken(localStorage.getItem('inchronicle_access_token'));
        queryClient.setQueryData(QueryKeys.currentUser, response.data.user);
        // Start in demo mode — demo has data, live may not
        enableDemoMode();
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      setIsAuthenticated(false);
      setToken(null);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: AuthService.logout,
    onSuccess: () => {
      setIsAuthenticated(false);
      setToken(null);
      queryClient.clear(); // Clear all cached data
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local state
      setIsAuthenticated(false);
      setToken(null);
      queryClient.clear();
    },
  });

  // Auth methods
  const login = async (data: LoginRequest) => {
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterRequest) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const hasToken = AuthService.isAuthenticated();
      setIsAuthenticated(hasToken);
      
      // Auto-login demo user if no token exists in development
      // DISABLED: Let user use real login instead of demo
      // if (!hasToken && import.meta.env.DEV) {
      //   console.log('🔧 Auto-creating demo user for development');
      //   createDemoUser();
      // }
    };

    const createDemoUser = () => {
      // Create a demo token and user for development
      const demoToken = 'demo_access_token_' + Date.now();
      const demoUser: User = {
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
      
      // Set the demo token and user
      localStorage.setItem('inchronicle_access_token', demoToken);
      localStorage.setItem('demo_user_data', JSON.stringify(demoUser));
      setIsAuthenticated(true);
      queryClient.setQueryData(QueryKeys.currentUser, demoUser);
      
      console.log('✅ Demo user created and authenticated');
    };

    checkAuth();

    // Listen for storage changes (logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inchronicle_access_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  // Get token from localStorage - use state to ensure stable reference
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('inchronicle_access_token')
      : null
  );

  // Sync token state with localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inchronicle_access_token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: AuthContextType = {
    user: user || null,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    token,
    login,
    register,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};