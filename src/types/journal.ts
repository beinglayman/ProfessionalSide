// Shared types for journal entries across the application

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface Reviewer {
  id: string;
  name: string;
  avatar: string;
  department: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'document' | 'code' | 'design' | 'data' | 'presentation';
  url: string;
  size?: string;
  isConfidential?: boolean;
}

export interface Discussion {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: Date;
}

export interface JournalEntry {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  organizationName: string | null;
  description: string;
  fullContent: string; // Full content for workspace view
  abstractContent: string; // Sanitized content for network view
  createdAt: Date;
  lastModified: Date;
  author: {
    id?: string;
    name: string;
    avatar: string;
    position: string;
    connectionType?: 'core_connection' | 'extended_connection' | 'following' | 'none';
    connectionReason?: string;
  };
  collaborators: Collaborator[];
  reviewers: Reviewer[];
  artifacts: Artifact[];
  skills: string[];
  outcomes: {
    category: 'performance' | 'user-experience' | 'business' | 'technical' | 'team';
    title: string;
    description: string;
    metrics?: {
      before: string;
      after: string;
      improvement: string;
      trend: 'up' | 'down' | 'stable';
    };
    highlight?: string;
  }[];
  visibility: 'private' | 'workspace' | 'network';
  isPublished: boolean;
  publishedAt?: Date;
  likes: number;
  comments: number;
  hasLiked?: boolean;
  tags: string[];
  category: string;
  appreciates: number;
  hasAppreciated?: boolean;
  discussCount: number;
  discussions: Discussion[];
  rechronicles: number;
  hasReChronicled?: boolean;
  recommendationReason?: 'skill_match' | 'connection_appreciated' | 'network_following' | 'trending';
  analytics: {
    viewCount: number;
    averageReadTime: number; // in seconds
    engagementTrend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  };
  achievementType?: 'certification' | 'award' | 'milestone' | 'recognition'; // For achievement entries
  achievementTitle?: string; // Achievement title
  achievementDescription?: string; // Achievement description
  
  // Goal linking fields
  linkedGoals?: {
    goalId: string;
    goalTitle: string;
    contributionType: 'milestone' | 'progress' | 'blocker' | 'update';
    progressContribution: number; // percentage points contributed to goal
    linkedAt: Date;
    notes?: string;
  }[];
  
  // Rechronicle metadata (for rechronicled entries in user feed)
  isRechronicle?: boolean;
  rechronicleComment?: string;
  rechronicledAt?: Date;
  rechronicledBy?: {
    id: string;
    name: string;
    avatar: string;
    position: string;
  };
  originalEntry?: JournalEntry; // For nested original entry data when this is a rechronicle

  // Format7 rich journal entry data
  format7Data?: any; // Complete Format7 structure with activities, correlations, etc.

  // Network entry toggle - indicates if network version was generated
  generateNetworkEntry?: boolean;
}