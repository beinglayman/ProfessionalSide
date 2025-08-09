import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import {
  Bell,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  X,
  Trash2,
  Archive,
  MoreHorizontal,
  AlertCircle,
  Star,
  MessageSquare,
  UserPlus,
  Trophy,
  Settings,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { NotificationCard } from '../../components/notifications/notification-card';
import { NotificationFilters } from '../../components/notifications/notification-filters';
import { useNotificationsPage } from '../../hooks/useNotificationsPage';
import { 
  NotificationCategory, 
  NotificationDisplay, 
  NotificationFilters as FilterType,
  NOTIFICATION_CATEGORIES,
  DATE_RANGES 
} from '../../types/notifications';

export default function NotificationsPage() {
  // State
  const [filters, setFilters] = useState<FilterType>({
    category: 'all',
    dateRange: {},
    isRead: null,
    searchQuery: '',
    priority: undefined
  });
  
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Custom hook for notifications data
  const {
    notifications,
    isLoading,
    error,
    hasMore,
    totalUnread,
    markAsRead,
    markAsUnread,
    deleteNotifications,
    markAllAsRead,
    loadMore,
    refresh,
    isRefreshing
  } = useNotificationsPage(filters);

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(n => n.category === filters.category);
    }
    
    // Read status filter
    if (filters.isRead !== null) {
      filtered = filtered.filter(n => n.isRead === filters.isRead);
    }
    
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

  // Group notifications by date for better organization
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationDisplay[]> = {};
    
    filteredNotifications.forEach(notification => {
      let groupKey: string;
      
      if (isToday(notification.timestamp)) {
        groupKey = 'Today';
      } else if (isYesterday(notification.timestamp)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(notification.timestamp)) {
        groupKey = 'This Week';
      } else if (isThisMonth(notification.timestamp)) {
        groupKey = 'This Month';
      } else {
        groupKey = format(notification.timestamp, 'MMMM yyyy');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    
    return groups;
  }, [filteredNotifications]);

  // Category counts for tab badges
  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      all: notifications.length,
      workspace: 0,
      network: 0,
      invitations: 0,
      achievements: 0,
      system: 0
    };
    
    notifications.forEach(n => {
      if (n.category !== 'all') {
        counts[n.category]++;
      }
    });
    
    return counts;
  }, [notifications]);

  // Handle notification selection
  const handleNotificationSelect = useCallback((notificationId: string, isSelected: boolean) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(notificationId);
      } else {
        newSet.delete(notificationId);
      }
      return newSet;
    });
  }, []);

  // Bulk actions
  const handleSelectAll = useCallback(() => {
    setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
  }, [filteredNotifications]);

  const handleDeselectAll = useCallback(() => {
    setSelectedNotifications(new Set());
  }, []);

  const handleBulkMarkAsRead = useCallback(async () => {
    const selectedIds = Array.from(selectedNotifications);
    await markAsRead(selectedIds);
    setSelectedNotifications(new Set());
    setShowBulkActions(false);
  }, [selectedNotifications, markAsRead]);

  const handleBulkMarkAsUnread = useCallback(async () => {
    const selectedIds = Array.from(selectedNotifications);
    await markAsUnread(selectedIds);
    setSelectedNotifications(new Set());
    setShowBulkActions(false);
  }, [selectedNotifications, markAsUnread]);

  const handleBulkDelete = useCallback(async () => {
    if (window.confirm(`Delete ${selectedNotifications.size} notifications?`)) {
      const selectedIds = Array.from(selectedNotifications);
      await deleteNotifications(selectedIds);
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
    }
  }, [selectedNotifications, deleteNotifications]);

  // Update bulk actions visibility based on selection
  useEffect(() => {
    setShowBulkActions(selectedNotifications.size > 0);
  }, [selectedNotifications.size]);

  // Load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 1000 >= 
        document.documentElement.offsetHeight &&
        hasMore &&
        !isLoading
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, loadMore]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl flex items-center gap-3">
                <Bell className="h-8 w-8 text-primary-600" />
                All Notifications
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Stay updated with all your professional activities and connections
              </p>
              {totalUnread > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    {totalUnread} unread
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Mark all as read
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(filters.searchQuery || filters.isRead !== null || filters.category !== 'all') && (
                  <span className="ml-1 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                    {[
                      filters.searchQuery !== '',
                      filters.isRead !== null,
                      filters.category !== 'all',
                      filters.priority !== undefined
                    ].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-1 overflow-x-auto scrollbar-hide px-4 sm:px-0 -mx-4 sm:mx-0">
            {(Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).map((category) => (
              <button
                key={category}
                onClick={() => setFilters({ ...filters, category })}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 px-3 sm:px-6 text-sm font-medium transition-colors flex-shrink-0",
                  filters.category === category
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="hidden sm:inline">{NOTIFICATION_CATEGORIES[category]}</span>
                  <span className="sm:hidden">{NOTIFICATION_CATEGORIES[category].split(' ')[0]}</span>
                  {categoryCounts[category] > 0 && (
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      filters.category === category
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {categoryCounts[category]}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6">
            <NotificationFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleSelectAll}>
                  Select All ({filteredNotifications.length})
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                  Clear Selection
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkMarkAsRead}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark Read
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkMarkAsUnread}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Eye className="h-4 w-4 mr-1" />
                Mark Unread
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredNotifications.length} of {notifications.length} notifications
            {notifications.length === 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                (Real backend data only - no mock data)
              </span>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900">Loading notifications...</h3>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-300 p-12 text-center bg-red-50">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-sm font-medium text-red-900">Failed to load notifications</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <Button
                onClick={refresh}
                className="mt-4"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900">No notifications found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.category !== 'all' || filters.searchQuery || filters.isRead !== null
                  ? 'Try adjusting your filters to see more notifications'
                  : notifications.length === 0
                    ? 'No notifications available from backend. Start engaging on the platform to receive notifications!'
                    : 'Stay active on the platform to receive more notifications'}
              </p>
              {notifications.length === 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Real data only:</strong> You're seeing live data from the backend. 
                    Create some activity (journal entries, connections, goals) to generate notifications!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Grouped Notifications */}
          {!isLoading && !error && Object.keys(groupedNotifications).length > 0 && (
            Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
              <div key={dateGroup} className="space-y-4">
                <div className="sticky top-0 z-10 flex items-center gap-3 bg-gray-50 py-2 px-2 -mx-2 rounded-lg backdrop-blur-sm bg-opacity-95">
                  <h3 className="text-sm font-semibold text-gray-900">{dateGroup}</h3>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {groupNotifications.length} notification{groupNotifications.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-500 sm:hidden">
                    {groupNotifications.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {groupNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      style={{ 
                        // Optimize rendering by adding slight delay for non-visible items
                        animationDelay: `${Math.min(index * 50, 500)}ms` 
                      }}
                      className="animate-fade-in"
                    >
                      <NotificationCard
                        notification={notification}
                        isSelected={selectedNotifications.has(notification.id)}
                        onSelect={(isSelected) => handleNotificationSelect(notification.id, isSelected)}
                        onMarkAsRead={() => markAsRead([notification.id])}
                        onMarkAsUnread={() => markAsUnread([notification.id])}
                        onDelete={() => deleteNotifications([notification.id])}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Load More */}
          {hasMore && !isLoading && (
            <div className="flex justify-center py-8">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Loading More Indicator */}
          {isLoading && notifications.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading more notifications...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}