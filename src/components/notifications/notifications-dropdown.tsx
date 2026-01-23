import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Settings,
  X,
  Heart,
  MessageSquare,
  Users,
  Award,
  Info,
  UserPlus,
  FileText,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../lib/api';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  Notification
} from '../../hooks/useNotifications';
import { useToast } from '../../contexts/ToastContext';

// Constants
const NOTIFICATIONS_DROPDOWN_LIMIT = 10;

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getIcon = () => {
    switch (notification.type) {
      case 'LIKE':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'MENTION':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'WORKSPACE_INVITE':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'WORKSPACE_INVITE_ACCEPTED':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'WORKSPACE_INVITE_DECLINED':
        return <X className="h-4 w-4 text-red-500" />;
      case 'CONNECTION_REQUEST':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'CONNECTION_ACCEPTED':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'CONNECTION_DECLINED':
        return <X className="h-4 w-4 text-red-500" />;
      case 'ACHIEVEMENT':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'SYSTEM':
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const handleAcceptInvitation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.invitationId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/invitations/${notification.data.invitationId}/accept-by-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert(`Successfully joined ${notification.data.workspaceName}!`);
        onMarkAsRead(notification.id);
        // Optionally reload page or update UI
        window.location.reload();
      } else {
        alert(result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvitation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.invitationId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/invitations/${notification.data.invitationId}/decline-by-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert('Invitation declined');
        onMarkAsRead(notification.id);
      } else {
        alert(result.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.connectionRequestId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/network/requests/${notification.data.connectionRequestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert('Connection request accepted!');
        onMarkAsRead(notification.id);
      } else {
        alert(result.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      alert('Failed to accept connection request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.data?.connectionRequestId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/network/requests/${notification.data.connectionRequestId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert('Connection request declined');
        onMarkAsRead(notification.id);
      } else {
        alert(result.error || 'Failed to decline connection request');
      }
    } catch (error) {
      console.error('Error declining connection request:', error);
      alert('Failed to decline connection request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative p-3 hover:bg-gray-50 cursor-pointer transition-colors",
        !notification.isRead && "bg-blue-50"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Notification Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={cn(
                "text-sm",
                !notification.isRead ? "font-medium text-gray-900" : "text-gray-700"
              )}>
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                {notification.sender && (
                  <div className="flex items-center space-x-1">
                    <img
                      src={notification.sender.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=20&h=20&fit=crop'}
                      alt={notification.sender.name}
                      className="h-4 w-4 rounded-full"
                    />
                    <span className="text-xs text-gray-500">
                      {notification.sender.name}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center space-x-1 ml-2">
                {!notification.isRead && (
                  <button
                    onClick={handleMarkAsRead}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3 text-gray-500" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="p-1 rounded hover:bg-red-100 transition-colors"
                  title="Delete"
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                </button>
              </div>
            )}
          </div>

          {/* Workspace Invitation Actions */}
          {notification.type === 'WORKSPACE_INVITE' && notification.data?.invitationId && (
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleAcceptInvitation}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs py-2 px-3 rounded-md transition-colors"
              >
                {isProcessing ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={handleDeclineInvitation}
                disabled={isProcessing}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-xs py-2 px-3 rounded-md transition-colors"
              >
                {isProcessing ? 'Declining...' : 'Decline'}
              </button>
            </div>
          )}

          {/* Connection Request Actions */}
          {notification.type === 'CONNECTION_REQUEST' && notification.data?.connectionRequestId && (
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleAcceptConnection}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs py-2 px-3 rounded-md transition-colors"
              >
                {isProcessing ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={handleDeclineConnection}
                disabled={isProcessing}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-xs py-2 px-3 rounded-md transition-colors"
              >
                {isProcessing ? 'Declining...' : 'Decline'}
              </button>
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationsDropdown() {
  const { toast } = useToast();

  // Fetch unread count (used as fallback when list hasn't loaded)
  const { data: unreadCount } = useUnreadNotificationCount();
  // Fetch notifications list - this is the source of truth when available
  const { data: notificationsData, isLoading, isError: listError } = useNotifications({
    limit: NOTIFICATIONS_DROPDOWN_LIMIT,
  });

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = notificationsData?.notifications || [];

  // Derive unread count from notifications list when available for consistency
  // This ensures badge and list are always in sync
  const derivedUnreadCount = notifications.filter(n => !n.isRead).length;
  const hasUnread = notificationsData
    ? derivedUnreadCount > 0
    : (unreadCount?.count || 0) > 0;
  const displayCount = notificationsData
    ? derivedUnreadCount
    : (unreadCount?.count || 0);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteMutation.mutateAsync(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" className="relative p-2">
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {displayCount > 9 ? '9+' : displayCount}
            </span>
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="w-80 max-h-96 overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          align="end"
          sideOffset={5}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {hasUnread && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
            {hasUnread && (
              <p className="text-xs text-gray-500 mt-1">
                {displayCount} unread notification{displayCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
              </div>
            ) : listError ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-500">Failed to load notifications</p>
                <p className="text-xs text-gray-400 mt-1">Please try again later</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  You'll see notifications here when something happens
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-primary-600 hover:text-primary-700"
                onClick={() => window.location.href = '/notifications'}
              >
                View all notifications
              </Button>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}