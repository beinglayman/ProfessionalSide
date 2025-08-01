export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  position: string;
  department: string;
  organization: string;
  skills: string[];
  isOnline?: boolean;
  lastActive?: Date;
  email?: string;
  bio?: string;
}

export interface Connection {
  id: string;
  userId: string; // The connected user
  connectionType: 'core' | 'extended';
  context: 'workspace-collaborator' | 'followed-professional' | 'industry-contact' | 'former-colleague';
  connectedAt: Date;
  lastInteraction?: Date;
  interactionCount: number;
  collaborationScore: number;
  appreciatedByCore: number;
  networkHealth: 'strong' | 'moderate' | 'weak';
  user: UserProfile;
  sharedWorkspaces: string[];
  mutualConnections: number;
  latestJournal?: {
    id: string;
    title: string;
    excerpt: string;
    createdAt: Date;
  };
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  requestMessage?: string;
  requestReason: 'workspace-collaborator' | 'industry-contact' | 'mutual-connection' | 'found-profile';
  requestedAt: Date;
  status: 'pending' | 'accepted' | 'declined';
  fromUser: UserProfile;
  mutualConnections: number;
  sharedWorkspaces: string[];
}

export interface Follower {
  id: string;
  followerId: string;
  followedUserId: string;
  followingSince: Date;
  followerReason: 'industry-expert' | 'content-appreciation' | 'mutual-follower' | 'workspace-interest';
  hasRequestedConnection: boolean;
  requestedAt?: Date;
  lastActivity?: Date;
  recentInteractions: number;
  follower: UserProfile;
  mutualConnections: number;
  sharedWorkspaces: string[];
}

export interface NetworkStats {
  totalConnections: number;
  coreConnections: number;
  extendedConnections: number;
  pendingRequests: number;
  totalFollowers: number;
  networkHealth: {
    score: number;
    status: 'excellent' | 'good' | 'needs-attention';
    recommendations: string[];
  };
  activityMetrics: {
    weeklyInteractions: number;
    monthlyGrowth: number;
    activeConnections: number;
  };
}

export interface NetworkSuggestion {
  id: string;
  type: 'promote-to-core' | 'cleanup-inactive' | 'capacity-warning' | 'reconnect';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  targetUsers?: string[]; // User IDs related to this suggestion
  metadata?: {
    inactivityDays?: number;
    collaborationScore?: number;
    lastInteractionDate?: Date;
  };
}

export interface BulkAction {
  type: 'move-to-core' | 'move-to-extended' | 'remove';
  userIds: string[];
}

export interface NetworkFilters {
  search?: string;
  skills?: string[];
  workspaces?: string[];
  connectionType?: 'core' | 'extended';
  department?: string;
  organization?: string;
  lastActivity?: 'week' | 'month' | 'quarter' | 'year';
}

export interface ConnectionActionRequest {
  userId: string;
  message?: string;
  reason?: ConnectionRequest['requestReason'];
}

export interface ConnectionUpdateRequest {
  connectionType: 'core' | 'extended';
  reason?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}