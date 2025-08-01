import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Users, 
  Globe, 
  UserPlus, 
  UserMinus, 
  TrendingUp, 
  Bell, 
  X, 
  Check, 
  AlertCircle,
  Building2,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import workspaceNetworkService, { NetworkNotification } from '../../services/workspace-network';

interface NetworkNotificationsProps {
  onNotificationAction?: (notificationId: string, action: string) => void;
  maxNotifications?: number;
}

const notificationIcons = {
  workspace_connection_added: UserPlus,
  workspace_connection_promoted: TrendingUp,
  workspace_connection_departed: UserMinus
};

const notificationColors = {
  workspace_connection_added: 'bg-green-50 border-green-200 text-green-800',
  workspace_connection_promoted: 'bg-blue-50 border-blue-200 text-blue-800',
  workspace_connection_departed: 'bg-orange-50 border-orange-200 text-orange-800'
};

export function NetworkNotifications({ 
  onNotificationAction, 
  maxNotifications = 10 
}: NetworkNotificationsProps) {
  const [notifications, setNotifications] = useState<NetworkNotification[]>([]);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load notifications from service
    const allNotifications = workspaceNetworkService.getNotifications();
    setNotifications(allNotifications.slice(0, maxNotifications));
  }, [maxNotifications]);

  const handleAction = (notificationId: string, action: string) => {
    // Execute action in service
    workspaceNetworkService.executeNotificationAction(notificationId, action);
    
    // Update local state
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, read: true }
          : n
      )
    );

    // Notify parent component
    onNotificationAction?.(notificationId, action);

    // Remove notification if dismissed or remove action
    if (action === 'dismiss' || action === 'remove') {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const markAsRead = (notificationId: string) => {
    workspaceNetworkService.markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        workspaceNetworkService.markNotificationAsRead(n.id);
      }
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No network notifications</p>
        <p className="text-sm mt-1">You'll be notified when workspace collaborators are added to your network</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Network Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map(notification => {
          const IconComponent = notificationIcons[notification.type];
          const isExpanded = expandedNotifications.has(notification.id);
          const colorClass = notificationColors[notification.type];

          return (
            <div
              key={notification.id}
              className={cn(
                'border rounded-lg transition-all duration-200',
                notification.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300 shadow-sm',
                !notification.read && 'ring-1 ring-primary-100'
              )}
            >
              {/* Main notification content */}
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className={cn(
                    'p-2 rounded-lg flex-shrink-0',
                    colorClass
                  )}>
                    <IconComponent className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={cn(
                          'text-sm font-medium',
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        )}>
                          {notification.title}
                        </h4>
                        <p className={cn(
                          'text-sm mt-1',
                          notification.read ? 'text-gray-500' : 'text-gray-700'
                        )}>
                          {notification.message}
                        </p>
                        
                        {/* Metadata */}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>Workspace</span>
                          </span>
                          <span>{format(notification.timestamp, 'MMM d, h:mm a')}</span>
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {notification.actions.map(action => (
                            <Button
                              key={action.action}
                              variant={action.action === 'dismiss' ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleAction(notification.id, action.action)}
                              className={cn(
                                'text-xs',
                                action.action === 'remove' && 'bg-red-600 hover:bg-red-700 text-white',
                                action.action === 'move_to_core' && 'bg-blue-600 hover:bg-blue-700 text-white',
                                action.action === 'move_to_extended' && 'bg-green-600 hover:bg-green-700 text-white'
                              )}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mark as read button */}
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more link if there are more notifications */}
      {notifications.length >= maxNotifications && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact notification summary for header/dashboard
export function NetworkNotificationSummary() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NetworkNotification[]>([]);

  useEffect(() => {
    const unread = workspaceNetworkService.getUnreadNotifications();
    setUnreadCount(unread.length);
    setRecentNotifications(unread.slice(0, 3));
  }, []);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Bell className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">
            {unreadCount} new network update{unreadCount !== 1 ? 's' : ''}
          </h4>
          <p className="text-sm text-blue-700 mt-1">
            {recentNotifications.length > 0 
              ? recentNotifications[0].title
              : 'Check your network notifications for workspace collaboration updates'
            }
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-100">
          View All
        </Button>
      </div>
    </div>
  );
}

export default NetworkNotifications;