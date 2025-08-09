export type NotificationCategory = 
  | 'all'
  | 'workspace' 
  | 'network'
  | 'invitations'
  | 'achievements'
  | 'system';

export type NotificationPriority = 'high' | 'medium' | 'low';

export type NotificationType = 
  // Workspace notifications
  | 'workspace_journal_entry'
  | 'workspace_milestone_achieved'
  | 'workspace_invitation_response'
  | 'workspace_member_added'
  | 'workspace_member_removed'
  | 'workspace_project_update'
  
  // Network notifications
  | 'connection_request_received'
  | 'connection_request_accepted'
  | 'profile_appreciated'
  | 'content_rechronicled'
  | 'skill_endorsed'
  | 'user_followed'
  | 'user_unfollowed'
  
  // Achievement notifications
  | 'goal_milestone_completed'
  | 'skill_level_upgraded'
  | 'profile_completeness_achieved'
  | 'network_growth_milestone'
  | 'engagement_streak'
  
  // System notifications
  | 'feature_announcement'
  | 'maintenance_notice'
  | 'policy_update'
  | 'security_alert';

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface RelatedUser {
  id: string;
  name: string;
  avatar: string;
  position?: string;
  profileLink: string;
}

export interface RelatedContent {
  type: 'journal' | 'workspace' | 'goal' | 'milestone' | 'connection_request';
  id: string;
  title: string;
  link: string;
  preview?: string;
}

export interface NotificationMetadata {
  workspaceName?: string;
  workspaceId?: string;
  skillName?: string;
  connectionType?: 'core' | 'extended';
  achievementType?: string;
  count?: number; // For grouped notifications
}

export interface NotificationDisplay {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  timestamp: Date;
  title: string;
  description: string;
  actionableContent?: {
    primaryAction: NotificationAction;
    secondaryAction?: NotificationAction;
  };
  relatedUser?: RelatedUser;
  relatedUsers?: RelatedUser[]; // For grouped notifications
  relatedContent?: RelatedContent;
  metadata?: NotificationMetadata;
  groupId?: string; // For grouping similar notifications
  isGrouped?: boolean;
  groupCount?: number;
}

export interface NotificationFilters {
  category: NotificationCategory;
  dateRange: {
    start?: Date;
    end?: Date;
  };
  isRead: boolean | null; // null = all, true = read, false = unread
  searchQuery: string;
  userId?: string; // Filter by specific user
  priority?: NotificationPriority;
}

export interface NotificationsPagination {
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

export interface NotificationsPageState {
  notifications: NotificationDisplay[];
  filteredNotifications: NotificationDisplay[];
  filters: NotificationFilters;
  pagination: NotificationsPagination;
  selectedNotifications: Set<string>;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

// Predefined date ranges
export const DATE_RANGES: DateRange[] = [
  {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date(),
    label: 'Last 24 hours'
  },
  {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
    label: 'Last 7 days'
  },
  {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
    label: 'Last 30 days'
  },
  {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    end: new Date(),
    label: 'Last 3 months'
  }
];

export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, string> = {
  all: 'All Notifications',
  workspace: 'Workspace Activity',
  network: 'Network Updates', 
  invitations: 'Invitations & Requests',
  achievements: 'Goals & Achievements',
  system: 'System Updates'
};