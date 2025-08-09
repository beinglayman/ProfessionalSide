import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  NotificationDisplay, 
  NotificationFilters, 
  NotificationType,
  NotificationCategory
} from '../types/notifications';
import { Notification, useNotifications as useBaseNotifications } from './useNotifications';

// Transform backend notification to display format
const transformNotificationToDisplay = (notification: Notification): NotificationDisplay => {
  // Map backend types to our display types
  const typeMap: Record<string, NotificationType> = {
    'LIKE': 'profile_appreciated',
    'COMMENT': 'content_rechronicled',
    'MENTION': 'content_rechronicled',
    'WORKSPACE_INVITE': 'workspace_invitation_response',
    'CONNECTION_REQUEST': 'connection_request_received',
    'CONNECTION_ACCEPTED': 'connection_request_accepted',
    'CONNECTION_DECLINED': 'connection_request_accepted',
    'ACHIEVEMENT': 'goal_milestone_completed',
    'SYSTEM': 'feature_announcement'
  };

  // Map types to categories
  const categoryMap: Record<NotificationType, NotificationCategory> = {
    'connection_request_received': 'invitations',
    'connection_request_accepted': 'network',
    'profile_appreciated': 'network',
    'content_rechronicled': 'network',
    'skill_endorsed': 'network',
    'user_followed': 'network',
    'user_unfollowed': 'network',
    'workspace_journal_entry': 'workspace',
    'workspace_milestone_achieved': 'workspace',
    'workspace_invitation_response': 'workspace',
    'workspace_member_added': 'workspace',
    'workspace_member_removed': 'workspace',
    'workspace_project_update': 'workspace',
    'goal_milestone_completed': 'achievements',
    'skill_level_upgraded': 'achievements',
    'profile_completeness_achieved': 'achievements',
    'network_growth_milestone': 'achievements',
    'engagement_streak': 'achievements',
    'feature_announcement': 'system',
    'maintenance_notice': 'system',
    'policy_update': 'system',
    'security_alert': 'system'
  };

  const displayType = typeMap[notification.type] || 'feature_announcement';
  const category = categoryMap[displayType];

  return {
    id: notification.id,
    type: displayType,
    category,
    priority: notification.type === 'SYSTEM' ? 'high' : 'medium',
    isRead: notification.isRead,
    timestamp: new Date(notification.createdAt),
    title: notification.title,
    description: notification.message,
    relatedUser: notification.sender ? {
      id: notification.sender.id,
      name: notification.sender.name,
      avatar: notification.sender.avatar || '',
      profileLink: `/profile/${notification.sender.id}`
    } : undefined,
    // Add actionable content for connection requests
    actionableContent: notification.type === 'CONNECTION_REQUEST' ? {
      primaryAction: {
        label: 'Accept',
        action: () => console.log('Accept connection request', notification.id)
      },
      secondaryAction: {
        label: 'Decline',
        action: () => console.log('Decline connection request', notification.id)
      }
    } : undefined,
    metadata: {
      workspaceName: notification.data?.workspaceName,
      workspaceId: notification.data?.workspaceId,
      skillName: notification.data?.skillName,
      connectionType: notification.data?.connectionType
    }
  };
};

// NOTE: Mock data removed - only real backend data will be displayed

interface UseNotificationsPageReturn {
  notifications: NotificationDisplay[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalUnread: number;
  markAsRead: (ids: string[]) => Promise<void>;
  markAsUnread: (ids: string[]) => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useNotificationsPage(filters: NotificationFilters): UseNotificationsPageReturn {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [localNotifications, setLocalNotifications] = useState<NotificationDisplay[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLocalUpdates, setHasLocalUpdates] = useState(false);

  // Use the existing hook for backend data with real-time polling
  const { 
    data: backendData, 
    isLoading: backendLoading, 
    error: backendError,
    refetch
  } = useBaseNotifications({ 
    page, 
    limit: 20,
    type: filters.category !== 'all' ? filters.category.toUpperCase() : undefined,
    isRead: filters.isRead !== null ? filters.isRead : undefined
  });
  
  // Debug logging for parameters
  useEffect(() => {
    console.log('🔔 useNotificationsPage params:', {
      page,
      limit: 20,
      type: filters.category !== 'all' ? filters.category.toUpperCase() : undefined,
      isRead: filters.isRead !== null ? filters.isRead : undefined,
      originalIsRead: filters.isRead
    });
  }, [page, filters.category, filters.isRead]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && !isRefreshing) {
        refetch();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch, isRefreshing]);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefreshing) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch, isRefreshing]);

  // Transform and merge notifications - ONLY REAL DATA
  const notifications = useMemo(() => {
    let baseNotifications: NotificationDisplay[] = [];
    
    // Only use real backend data - no mock data fallback
    if (backendData?.notifications) {
      baseNotifications = backendData.notifications.map(transformNotificationToDisplay);
      console.log(`🔔 Loaded ${baseNotifications.length} real notifications from backend`);
    } else {
      console.log('🔔 No backend notifications data available');
    }

    // Apply local updates if any
    if (hasLocalUpdates && localNotifications.length > 0) {
      // Merge local changes with backend data
      const updatedNotifications = baseNotifications.map(backendNotif => {
        const localUpdate = localNotifications.find(local => local.id === backendNotif.id);
        return localUpdate || backendNotif;
      });
      
      // Add any local notifications not in backend data
      const backendIds = new Set(baseNotifications.map(n => n.id));
      const newLocalNotifications = localNotifications.filter(local => !backendIds.has(local.id));
      
      return [...updatedNotifications, ...newLocalNotifications];
    }
    
    return baseNotifications;
  }, [backendData, localNotifications, hasLocalUpdates]);

  // Apply client-side filters
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.description.toLowerCase().includes(query) ||
        n.relatedUser?.name.toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      filtered = filtered.filter(n => 
        n.timestamp >= filters.dateRange.start! && 
        n.timestamp <= filters.dateRange.end!
      );
    }

    return filtered;
  }, [notifications, filters]);

  const totalUnread = useMemo(() => {
    return filteredNotifications.filter(n => !n.isRead).length;
  }, [filteredNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    try {
      // Mark as read in backend
      await Promise.all(ids.map(async (id) => {
        try {
          await api.put(`/notifications/${id}/read`);
        } catch (error) {
          console.log('Backend unavailable, updating locally only');
        }
      }));

      // Update local state immediately
      setHasLocalUpdates(true);
      setLocalNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const updatedNotifications = prev.map(notification => 
          ids.includes(notification.id) 
            ? { ...notification, isRead: true }
            : notification
        );
        
        // Add notifications that aren't in local state yet
        const newNotifications = notifications
          .filter(n => ids.includes(n.id) && !existingIds.has(n.id))
          .map(n => ({ ...n, isRead: true }));
          
        return [...updatedNotifications, ...newNotifications];
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [queryClient]);

  const markAsUnread = useCallback(async (ids: string[]) => {
    try {
      // Mark as unread in backend
      await Promise.all(ids.map(async (id) => {
        try {
          await api.delete(`/notifications/${id}/read`);
        } catch (error) {
          console.log('Backend unavailable, updating locally only');
        }
      }));

      // Update local state immediately
      setHasLocalUpdates(true);
      setLocalNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const updatedNotifications = prev.map(notification => 
          ids.includes(notification.id) 
            ? { ...notification, isRead: false }
            : notification
        );
        
        // Add notifications that aren't in local state yet
        const newNotifications = notifications
          .filter(n => ids.includes(n.id) && !existingIds.has(n.id))
          .map(n => ({ ...n, isRead: false }));
          
        return [...updatedNotifications, ...newNotifications];
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to mark notifications as unread:', error);
    }
  }, [queryClient]);

  const deleteNotifications = useCallback(async (ids: string[]) => {
    try {
      // Delete from backend
      await Promise.all(ids.map(async (id) => {
        try {
          await api.delete(`/notifications/${id}`);
        } catch (error) {
          console.log('Backend unavailable, updating locally only');
        }
      }));

      // Update local state immediately
      setHasLocalUpdates(true);
      setLocalNotifications(prev => 
        prev.filter(notification => !ids.includes(notification.id))
      );

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Mark all as read in backend
      try {
        await api.put('/notifications/mark-all-read');
      } catch (error) {
        console.log('Backend unavailable, updating locally only');
      }

      // Update local state immediately  
      setHasLocalUpdates(true);
      setLocalNotifications(notifications.map(notification => ({ ...notification, isRead: true })));

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [queryClient]);

  const loadMore = useCallback(async () => {
    if (backendData?.totalPages && page < backendData.totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, backendData?.totalPages]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    
    try {
      // Clear local updates and refresh from backend
      setHasLocalUpdates(false);
      setLocalNotifications([]);
      
      // Refetch data from backend
      const result = await refetch();
      
      console.log('✅ Notifications refreshed successfully');
      
      // Optional: You could add a success toast here if you have a toast context
      // toast.success('Notifications refreshed');
      
    } catch (error) {
      console.error('❌ Failed to refresh notifications:', error);
      
      // Optional: You could add an error toast here
      // toast.error('Failed to refresh notifications');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  return {
    notifications: filteredNotifications,
    isLoading: backendLoading && page === 1,
    error: backendError ? 'Failed to load notifications' : null,
    hasMore: backendData ? page < (backendData.totalPages || 1) : false,
    totalUnread,
    markAsRead,
    markAsUnread,
    deleteNotifications,
    markAllAsRead,
    loadMore,
    refresh,
    isRefreshing
  };
}