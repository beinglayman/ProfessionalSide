import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Users,
  Briefcase,
  Trophy,
  Settings,
  MessageSquare,
  Heart,
  UserPlus,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  Info,
  Star,
  Building2,
  Target,
  Award,
  Zap,
  Globe,
  FileText,
  Calendar,
  ArrowUpRight,
  Check,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { NotificationDisplay, NotificationType } from '../../types/notifications';

interface NotificationCardProps {
  notification: NotificationDisplay;
  isSelected: boolean;
  onSelect: (isSelected: boolean) => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onDelete: () => void;
}

export function NotificationCard({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete
}: NotificationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Get appropriate icon and color for notification type
  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { className: "h-5 w-5" };
    
    switch (type) {
      // Workspace notifications
      case 'workspace_journal_entry':
        return <FileText {...iconProps} className="h-5 w-5 text-blue-600" />;
      case 'workspace_milestone_achieved':
        return <Target {...iconProps} className="h-5 w-5 text-green-600" />;
      case 'workspace_invitation_response':
        return <Building2 {...iconProps} className="h-5 w-5 text-purple-600" />;
      case 'workspace_member_added':
      case 'workspace_member_removed':
        return <Users {...iconProps} className="h-5 w-5 text-orange-600" />;
      case 'workspace_project_update':
        return <Briefcase {...iconProps} className="h-5 w-5 text-indigo-600" />;
      
      // Network notifications
      case 'connection_request_received':
      case 'connection_request_accepted':
        return <UserPlus {...iconProps} className="h-5 w-5 text-blue-600" />;
      case 'profile_appreciated':
        return <Heart {...iconProps} className="h-5 w-5 text-red-600" />;
      case 'content_rechronicled':
        return <MessageSquare {...iconProps} className="h-5 w-5 text-green-600" />;
      case 'skill_endorsed':
        return <Star {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case 'user_followed':
      case 'user_unfollowed':
        return <Eye {...iconProps} className="h-5 w-5 text-purple-600" />;
      
      // Achievement notifications
      case 'goal_milestone_completed':
        return <Trophy {...iconProps} className="h-5 w-5 text-gold-600" />;
      case 'skill_level_upgraded':
        return <Zap {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case 'profile_completeness_achieved':
        return <Award {...iconProps} className="h-5 w-5 text-blue-600" />;
      case 'network_growth_milestone':
        return <Globe {...iconProps} className="h-5 w-5 text-green-600" />;
      case 'engagement_streak':
        return <Calendar {...iconProps} className="h-5 w-5 text-orange-600" />;
      
      // System notifications
      case 'feature_announcement':
        return <Bell {...iconProps} className="h-5 w-5 text-blue-600" />;
      case 'maintenance_notice':
        return <Settings {...iconProps} className="h-5 w-5 text-gray-600" />;
      case 'policy_update':
        return <FileText {...iconProps} className="h-5 w-5 text-purple-600" />;
      case 'security_alert':
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-red-600" />;
      
      default:
        return <Bell {...iconProps} className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const handleActionClick = async (action: () => Promise<void> | void) => {
    setIsProcessingAction(true);
    try {
      await action();
    } finally {
      setIsProcessingAction(false);
      setShowActions(false);
    }
  };

  const handlePrimaryAction = () => {
    if (notification.actionableContent?.primaryAction) {
      handleActionClick(notification.actionableContent.primaryAction.action);
    }
  };

  const handleSecondaryAction = () => {
    if (notification.actionableContent?.secondaryAction) {
      handleActionClick(notification.actionableContent.secondaryAction.action);
    }
  };

  return (
    <div className={cn(
      "relative rounded-lg border-l-4 bg-white shadow-sm transition-all hover:shadow-md",
      notification.isRead ? 'border-l-gray-300' : getPriorityColor(notification.priority),
      notification.isRead ? 'opacity-75' : '',
      isSelected ? 'ring-2 ring-primary-500' : ''
    )}>
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </div>

      <div className="pl-12 pr-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Notification Icon */}
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type)}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      "text-sm font-medium truncate",
                      notification.isRead ? "text-gray-700" : "text-gray-900"
                    )}>
                      {notification.title}
                    </h3>
                    
                    {/* Priority Badge */}
                    {notification.priority === 'high' && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        High
                      </span>
                    )}
                    
                    {/* Grouped Badge */}
                    {notification.isGrouped && notification.groupCount && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {notification.groupCount} items
                      </span>
                    )}
                  </div>

                  <p className={cn(
                    "text-sm line-clamp-2",
                    notification.isRead ? "text-gray-500" : "text-gray-700"
                  )}>
                    {notification.description}
                  </p>

                  {/* Related User/Content Info */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    {notification.relatedUser && (
                      <Link
                        to={notification.relatedUser.profileLink}
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                      >
                        <img
                          src={notification.relatedUser.avatar}
                          alt={notification.relatedUser.name}
                          className="h-4 w-4 rounded-full"
                        />
                        <span className="truncate max-w-[120px]">
                          {notification.relatedUser.name}
                        </span>
                      </Link>
                    )}
                    
                    {notification.metadata?.workspaceName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {notification.metadata.workspaceName}
                        </span>
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </span>
                  </div>

                  {/* Related Content Preview */}
                  {notification.relatedContent && (
                    <div className="mt-3 p-2 bg-gray-50 rounded border">
                      <Link
                        to={notification.relatedContent.link}
                        className="flex items-center gap-2 text-sm hover:text-primary-600 transition-colors"
                      >
                        <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium truncate">
                          {notification.relatedContent.title}
                        </span>
                      </Link>
                      {notification.relatedContent.preview && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                          {notification.relatedContent.preview}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {showActions && (
                    <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="p-1">
                        {!notification.isRead ? (
                          <button
                            onClick={() => handleActionClick(onMarkAsRead)}
                            disabled={isProcessingAction}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                            Mark as Read
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActionClick(onMarkAsUnread)}
                            disabled={isProcessingAction}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                            Mark as Unread
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleActionClick(onDelete)}
                          disabled={isProcessingAction}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actionable Content Buttons */}
              {notification.actionableContent && (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handlePrimaryAction}
                    disabled={isProcessingAction}
                    className={cn(
                      "h-8 px-3 text-xs",
                      notification.actionableContent.primaryAction.variant === 'danger' &&
                      "bg-red-600 hover:bg-red-700 text-white"
                    )}
                  >
                    {notification.actionableContent.primaryAction.label}
                  </Button>
                  
                  {notification.actionableContent.secondaryAction && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSecondaryAction}
                      disabled={isProcessingAction}
                      className="h-8 px-3 text-xs"
                    >
                      {notification.actionableContent.secondaryAction.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unread Indicator */}
      {!notification.isRead && (
        <div className="absolute top-4 right-4">
          <div className="h-2 w-2 rounded-full bg-primary-500"></div>
        </div>
      )}

      {/* Click Overlay for Selection */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={() => onSelect(!isSelected)}
        style={{ zIndex: -1 }}
      />
    </div>
  );
}