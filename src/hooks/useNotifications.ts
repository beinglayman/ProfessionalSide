import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'MENTION' | 'WORKSPACE_INVITE' | 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'CONNECTION_DECLINED' | 'ACHIEVEMENT' | 'SYSTEM';
  title: string;
  message: string;
  data?: any; // JSON data for additional context
  isRead: boolean;
  recipientId: string;
  senderId?: string;
  relatedEntityType?: 'JOURNAL_ENTRY' | 'WORKSPACE' | 'USER' | 'COMMENT' | 'CONNECTION';
  relatedEntityId?: string;
  createdAt: string;
  readAt?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  likes: boolean;
  comments: boolean;
  mentions: boolean;
  workspaceInvites: boolean;
  connectionRequests: boolean;
  achievements: boolean;
  systemUpdates: boolean;
  digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY';
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface CreateNotificationData {
  type: Notification['type'];
  title: string;
  message: string;
  recipientId: string;
  relatedEntityType?: Notification['relatedEntityType'];
  relatedEntityId?: string;
  data?: any;
}

// Get notifications for current user
export function useNotifications(params: {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
} = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.type) queryParams.append('type', params.type);
        if (params.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());

        const response = await api.get(`/notifications?${queryParams}`);
        return response.data.data;
      } catch (error) {
        console.log('🔔 Backend unavailable, returning empty notifications');
        return { notifications: [], total: 0, page: 1, totalPages: 0 };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time feel
    retry: false, // Don't retry when backend is down
  });
}

// Get unread notification count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async (): Promise<{ count: number }> => {
      try {
        const response = await api.get('/notifications/unread-count');
        return response.data.data;
      } catch (error) {
        console.log('🔔 Backend unavailable, returning 0 unread notifications');
        return { count: 0 };
      }
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    retry: false, // Don't retry when backend is down
  });
}

// Get notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      try {
        const response = await api.get('/notifications/preferences');
        return response.data;
      } catch (error) {
        console.log('🔔 Backend unavailable, returning default preferences');
        return {
          id: 'default',
          userId: 'demo',
          emailNotifications: false,
          pushNotifications: false,
          likes: true,
          comments: true,
          mentions: true,
          workspaceInvites: true,
          connectionRequests: true,
          achievements: true,
          systemUpdates: true,
          digestFrequency: 'WEEKLY' as const,
          quietHoursStart: undefined,
          quietHoursEnd: undefined,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry when backend is down
  });
}

// Mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.put('/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const response = await api.put('/notifications/preferences', preferences);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

// Create notification (admin/system use)
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      const response = await api.post('/notifications', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}