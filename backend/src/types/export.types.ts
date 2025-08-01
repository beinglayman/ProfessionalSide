export interface ExportRequest {
  format: 'json' | 'csv' | 'pdf';
  type: 'all' | 'journal_entries' | 'profile' | 'network' | 'achievements' | 'goals';
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: {
    workspaceId?: string;
    category?: string;
    tags?: string[];
    includePrivate?: boolean;
  };
}

export interface ExportProgress {
  id: string;
  userId: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalItems?: number;
  processedItems?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // When the download link expires
}

export interface ExportData {
  metadata: {
    exportId: string;
    userId: string;
    userName: string;
    userEmail: string;
    exportType: string;
    exportFormat: string;
    exportedAt: string;
    dateRange?: {
      from: string;
      to: string;
    };
    totalItems: number;
  };
  data: {
    profile?: UserProfileExport;
    journalEntries?: JournalEntryExport[];
    network?: NetworkExport;
    achievements?: AchievementExport[];
    goals?: GoalExport[];
    workspaces?: WorkspaceExport[];
  };
}

export interface UserProfileExport {
  id: string;
  name: string;
  email: string;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  joinedDate: string;
  profileCompleteness: number;
  skills: {
    name: string;
    category: string;
    level: string;
    endorsements: number;
    yearsOfExp: number;
  }[];
  experience?: any;
  education?: any;
  certifications?: any;
  languages?: any;
}

export interface JournalEntryExport {
  id: string;
  title: string;
  description: string;
  content: string;
  category?: string;
  tags: string[];
  skills: string[];
  visibility: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
  };
  collaborators: {
    id: string;
    name: string;
    role: string;
  }[];
  artifacts: {
    name: string;
    type: string;
    url: string;
  }[];
  outcomes: {
    category: string;
    title: string;
    description: string;
    metrics?: any;
  }[];
  analytics: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalAppreciates: number;
  };
}

export interface NetworkExport {
  connections: {
    id: string;
    name: string;
    email: string;
    company?: string;
    title?: string;
    status: string;
    tier: string;
    context?: string;
    connectedAt: string;
    sharedWorkspaces: string[];
  }[];
  sentRequests: {
    id: string;
    name: string;
    sentAt: string;
    status: string;
  }[];
  receivedRequests: {
    id: string;
    name: string;
    receivedAt: string;
    status: string;
  }[];
  totalConnections: number;
  coreConnections: number;
  extendedConnections: number;
}

export interface AchievementExport {
  id: string;
  title: string;
  description: string;
  impact?: string;
  skills: string[];
  status: string;
  achievedAt: string;
  attestations: {
    attesterName: string;
    comment?: string;
    attestedAt: string;
  }[];
}

export interface GoalExport {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  completed: boolean;
  completedDate?: string;
  progress: number;
  category?: string;
  priority: string;
  visibility: string;
  workspace?: {
    id: string;
    name: string;
  };
  milestones: {
    title: string;
    targetDate?: string;
    completed: boolean;
    completedDate?: string;
  }[];
  linkedJournalEntries: {
    id: string;
    title: string;
    contributionType: string;
    progressContribution: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceExport {
  id: string;
  name: string;
  description?: string;
  organization?: {
    id: string;
    name: string;
  };
  role: string;
  joinedAt: string;
  isActive: boolean;
  memberCount: number;
  journalEntryCount: number;
}

export interface ExportOptions {
  includeMetadata?: boolean;
  includeBinaryFiles?: boolean;
  includeAnalytics?: boolean;
  includePrivateData?: boolean;
  compression?: boolean;
}