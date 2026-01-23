import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Query configuration constants
const NOTIFICATIONS_STALE_TIME = 30 * 1000; // 30 seconds
const NOTIFICATIONS_REFETCH_INTERVAL = 60 * 1000; // 1 minute
const NOTIFICATIONS_RETRY_COUNT = 2;
const NOTIFICATIONS_RETRY_DELAY = 1000; // 1 second

const UNREAD_COUNT_STALE_TIME = 15 * 1000; // 15 seconds
const UNREAD_COUNT_REFETCH_INTERVAL = 30 * 1000; // 30 seconds

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
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.type) queryParams.append('type', params.type);
      if (params.isRead !== undefined && params.isRead !== null) {
        queryParams.append('isRead', params.isRead.toString());
      }

      const endpoint = `/notifications?${queryParams}`;
      console.log('🔔 Fetching notifications from:', `${api.defaults.baseURL}${endpoint}`);
      const response = await api.get(endpoint);
      console.log('🔔 Successfully received notifications:', response.data.data);
      return response.data.data;
    },
    staleTime: NOTIFICATIONS_STALE_TIME,
    refetchInterval: NOTIFICATIONS_REFETCH_INTERVAL,
    retry: NOTIFICATIONS_RETRY_COUNT,
    retryDelay: NOTIFICATIONS_RETRY_DELAY,
  });
}

// Get unread notification count
// Note: This is a fallback - the dropdown derives count from the list when available
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async (): Promise<{ count: number }> => {
      const response = await api.get('/notifications/unread-count');
      return response.data.data;
    },
    staleTime: UNREAD_COUNT_STALE_TIME,
    refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL,
    retry: NOTIFICATIONS_RETRY_COUNT,
    retryDelay: NOTIFICATIONS_RETRY_DELAY,
  });
}

// Get notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      try {
        const response = await api.get('/email/preferences');
        return response.data.data;
      } catch (error) {
        console.log('🔔 Backend unavailable, returning default preferences');
        return {
          id: 'default',
          userId: 'demo',
          emailNotifications: true,
          pushNotifications: true,
          likes: true,
          comments: true,
          mentions: true,
          workspaceInvites: true,
          connectionRequests: true,
          achievements: true,
          systemUpdates: true,
          digestFrequency: 'DAILY' as const,
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
      const response = await api.put('/email/preferences', preferences);
      return response.data.data;
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