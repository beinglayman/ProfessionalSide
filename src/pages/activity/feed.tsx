import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Calendar,
  Users,
  Building2,
  CheckCircle2,
  Shield,
  FileText,
  Code,
  Image,
  BarChart,
  MessageSquare,
  ThumbsUp,
  Briefcase,
  ArrowUpRight,
  Zap,
  Heart,
  DollarSign,
  Settings,
  Star,
  ExternalLink,
  Plus,
  Paperclip,
  Eye,
  ChevronDown,
  UserPlus,
  UserX,
  Send,
  Clock,
  Sparkles,
  Badge,
  MoreHorizontal,
  Layers,
  ArrowUpCircle,
  ArrowDownCircle,
  Network
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { NewEntryModal } from '../../components/new-entry/new-entry-modal';
import { JournalCard } from '../../components/journal/journal-card';
import JournalEnhanced from '../../components/format7/journal-enhanced';
import { JournalEntry } from '../../types/journal';
import { useJournalEntries, useToggleAppreciate, useRechronicleEntry } from '../../hooks/useJournal';

// Types
interface Author {
  id: string;
  name: string;
  avatar: string;
  position: string;
  department?: string;
  organization?: string;
  isConnection?: boolean;
  isFollowing?: boolean;
  connectionType?: 'core_connection' | 'extended_connection' | 'following' | 'none';
  connectionReason?: string; // e.g., "You share the workspace Design enhancements", "Both of you work in React.JS", "You share 3 common connections"
  followedAt?: Date;
  connectedAt?: Date;
  sharedWorkspaces?: string[];
  commonConnections?: number;
  matchedSkills?: string[];
}

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface Artifact {
  id: string;
  name: string;
  type: 'document' | 'code' | 'design' | 'data' | 'presentation';
  url: string;
  size?: string;
  isConfidential?: boolean;
}

interface Outcome {
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
}

interface ActivityEntry {
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
  author: Author;
  collaborators: Collaborator[];
  artifacts: Artifact[];
  skills: string[];
  outcomes: Outcome[];
  visibility: 'private' | 'workspace' | 'network';
  isPublished: boolean;
  publishedAt?: Date;
  likes: number;
  comments: number;
  hasLiked?: boolean;
  tags: string[];
  category: string;
  source: 'network' | 'workspace'; // Determines which view this appears in
  connectionType?: 'direct' | 'second-degree' | 'colleague'; // For network view
  appreciatedBy?: string[]; // User IDs who appreciated this
  hasAppreciated?: boolean;
  skillMatch?: {
    matchingSkills: string[];
    relevanceScore: number;
  };
  followedBy?: string[]; // User IDs following this author
  recommendationReason?: 'skill_match' | 'connection_appreciated' | 'network_following' | 'trending';
  achievementType?: 'certification' | 'award' | 'milestone' | 'recognition'; // For achievement entries
  achievementTitle?: string; // Achievement title
  achievementDescription?: string; // Achievement description
  format7Data?: any; // Format7 structure for rich journal entries
  format7DataNetwork?: any; // Sanitized Format7 structure for network view
  reviewers?: Array<{
    id: string;
    name: string;
    avatar: string;
    department: string;
  }>;
}

interface TierMarker {
  isTierMarker: true;
  tier: string;
  tierLabel: string;
  tierIcon: any;
  tierColor: string;
}

type FeedItem = ActivityEntry | TierMarker;

// Current user's skills (this would come from user profile in real app)
const currentUserSkills = ['React.js', 'TypeScript', 'UX Design', 'Node.js', 'Machine Learning'];

// Default feed age limit in days (should come from user settings)
const DEFAULT_FEED_AGE_LIMIT_DAYS = 7;

// Enhanced function to calculate skill matching and relevance
const calculateSkillMatch = (activitySkills: string[], userSkills: string[]) => {
  const matchingSkills = activitySkills.filter(skill => userSkills.includes(skill));
  const relevanceScore = matchingSkills.length / Math.max(activitySkills.length, 1);
  return { matchingSkills, relevanceScore };
};

// Convert ActivityEntry to JournalEntry format with interaction states
const convertActivityToJournal = (
  activity: ActivityEntry, 
  appreciatedEntries: Set<string>, 
  rechronicledEntries: Set<string>
): JournalEntry => {
  const discussions = sampleDiscussions[activity.id] || [];
  return {
    id: activity.id,
    title: activity.title,
    workspaceId: activity.workspaceId,
    workspaceName: activity.workspaceName,
    organizationName: activity.organizationName,
    description: activity.description,
    fullContent: activity.fullContent,
    abstractContent: activity.abstractContent,
    createdAt: activity.createdAt,
    lastModified: activity.lastModified,
    author: {
      name: activity.author.name,
      avatar: activity.author.avatar,
      position: activity.author.position,
      connectionType: activity.author.connectionType,
      connectionReason: activity.author.connectionReason
    },
    collaborators: activity.collaborators,
    reviewers: activity.reviewers || [],
    artifacts: activity.artifacts,
    skills: activity.skills,
    outcomes: activity.outcomes,
    visibility: activity.visibility,
    isPublished: activity.isPublished,
    publishedAt: activity.publishedAt,
    likes: activity.likes,
    comments: activity.comments,
    hasLiked: activity.hasLiked,
    tags: activity.tags,
    category: activity.category,
    appreciates: activity.appreciatedBy?.length || 0,
    hasAppreciated: appreciatedEntries.has(activity.id),
    discussCount: activity.comments,
    discussions: discussions,
    rechronicles: rechronicledEntries.has(activity.id) ? 1 : 0,
    hasReChronicled: rechronicledEntries.has(activity.id),
    recommendationReason: activity.recommendationReason,
    analytics: {
      viewCount: Math.floor(Math.random() * 1000) + 100, // Generate random analytics
      averageReadTime: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      engagementTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
      trendPercentage: Math.floor(Math.random() * 50) - 25 // -25 to +25
    },
    achievementType: activity.achievementType,
    achievementTitle: activity.achievementTitle,
    achievementDescription: activity.achievementDescription,
    format7Data: activity.format7Data,
    format7DataNetwork: activity.format7DataNetwork
  };
};

// Sample discussion data
const sampleDiscussions: Record<string, Array<{
  id: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  createdAt: Date;
}>> = {
  "a-001": [
    {
      id: "d-001-1",
      content: "Great work on this! The new flow is so much smoother. I particularly like how you've handled the guest checkout option.",
      author: {
        name: "Sarah Chen",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-07-02T18:15:00")
    },
    {
      id: "d-001-2", 
      content: "The 60% reduction in form fields is impressive! Have you considered A/B testing this against the old flow to measure impact?",
      author: {
        name: "Mike Rodriguez",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-07-02T19:30:00")
    }
  ],
  "a-002": [
    {
      id: "d-002-1",
      content: "Fascinating approach to recommendation algorithms! How did you handle cold start problems for new users?",
      author: {
        name: "Dr. Emily Watson",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-06-09T20:45:00")
    }
  ],
  "a-004": [
    {
      id: "d-004-1",
      content: "Love the visualization approach! The D3.js components look really clean. Would you be open to sharing some of the chart templates?",
      author: {
        name: "Alex Kim",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-06-07T21:15:00")
    },
    {
      id: "d-004-2",
      content: "This could be really useful for our analytics dashboard too. The real-time processing is impressive!",
      author: {
        name: "Lisa Park",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-06-08T09:20:00")
    }
  ],
  "a-001-workspace": [
    {
      id: "d-001-ws-1",
      content: "Great work on this! The new flow is so much smoother. I particularly like how you've handled the guest checkout option.",
      author: {
        name: "Sarah Chen",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-07-02T18:15:00")
    },
    {
      id: "d-001-ws-2", 
      content: "The 60% reduction in form fields is impressive! Have you considered A/B testing this against the old flow to measure impact?",
      author: {
        name: "Mike Rodriguez",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-07-02T19:30:00")
    }
  ],
  "a-007": [
    {
      id: "d-007-1",
      content: "45% improvement in user satisfaction is remarkable! What were the key pain points you identified in the research?",
      author: {
        name: "Jennifer Lee",
        avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-06-04T19:45:00")
    }
  ],
  "a-013-achievement": [
    {
      id: "d-013-1",
      content: "Congratulations on the Azure certification! That's a significant achievement. How long did you prepare for it?",
      author: {
        name: "David Thompson",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-07-01T17:30:00")
    }
  ],
  "a-013-achievement-workspace": [
    {
      id: "d-013-ws-1",
      content: "Congratulations on the Azure certification! That's a significant achievement. How long did you prepare for it?",
      author: {
        name: "David Thompson",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
      },
      createdAt: new Date("2025-07-01T17:30:00")
    }
  ]
};

// No sample data - using real API data only
const sampleActivities: ActivityEntry[] = [];

export function ActivityFeedPage() {
  const [viewMode, setViewMode] = useState<'workspace' | 'network'>('network');
  
  // Debug: Force console output
  React.useEffect(() => {
    console.log('🚀 ActivityFeedPage component mounted');
    console.log('🔍 Initial viewMode:', viewMode);
  }, []);
  
  // Debug: Track viewMode changes
  React.useEffect(() => {
    console.log('📱 ViewMode changed to:', viewMode);
  }, [viewMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  
  // Interaction states
  const [appreciatedEntries, setAppreciatedEntries] = useState<Set<string>>(new Set());
  const [rechronicledEntries, setRechronicledEntries] = useState<Set<string>>(new Set());
  const [discussOpenEntries, setDiscussOpenEntries] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Follow/Connection states
  
  // Fetch real journal entries from API - fetch all entries and filter in frontend
  const { data: journalData, isLoading: journalLoading, isError: journalError, error } = useJournalEntries({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 100 // Fetch more entries to ensure we get both workspace and network entries
  });
  const [pendingFollows, setPendingFollows] = useState<Set<string>>(new Set());
  const [pendingConnectionRequests, setPendingConnectionRequests] = useState<Set<string>>(new Set());
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'follow' | 'connection_request';
    message: string;
    timestamp: Date;
    authorId: string;
    authorName: string;
    authorAvatar: string;
  }>>([]);

  // Get unique skills and categories
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    sampleActivities.forEach(activity => {
      activity.skills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills).sort();
  }, []);

  // Convert journal entries to activity entries
  const convertJournalToActivity = (entry: JournalEntry): ActivityEntry => ({
    id: entry.id,
    title: entry.title,
    workspaceId: entry.workspaceId,
    workspaceName: entry.workspaceName,
    organizationName: entry.organizationName || null,
    author: {
      ...entry.author,
      id: entry.author.name, // Use name as ID if not available
      connectionType: 'none' as const // Default connection type
    },
    createdAt: entry.createdAt,
    lastModified: entry.lastModified,
    category: entry.category || 'General',
    skills: entry.skills,
    likes: entry.likes,
    comments: entry.comments,
    appreciatedBy: [], // Will be populated by backend if needed
    hasLiked: entry.hasLiked,
    hasAppreciated: entry.hasAppreciated,
    visibility: entry.visibility,
    isPublished: entry.isPublished || entry.visibility === 'network', // Network entries should be considered published
    publishedAt: entry.publishedAt,
    description: entry.description,
    fullContent: entry.fullContent,
    abstractContent: entry.abstractContent || entry.description, // Use abstract or fallback to description
    artifacts: entry.artifacts,
    outcomes: entry.outcomes,
    collaborators: entry.collaborators,
    tags: entry.tags,
    source: entry.visibility === 'network' ? 'network' : 'workspace',
    achievementType: entry.achievementType,
    achievementTitle: entry.achievementTitle,
    achievementDescription: entry.achievementDescription,
    format7Data: entry.format7Data,
    format7DataNetwork: entry.format7DataNetwork,
    reviewers: entry.reviewers
  });

  // Get activities from API - no dummy data fallback
  const activities = useMemo(() => {
    console.log('🔍 Activity data loading status:', {
      journalLoading,
      journalError,
      hasJournalData: !!journalData,
      hasEntries: !!journalData?.entries,
      entriesCount: journalData?.entries?.length || 0
    });
    
    if (journalData?.entries) {
      console.log('📊 Raw journal entries from API:', journalData.entries.map(e => ({
        id: e.id,
        title: e.title,
        visibility: e.visibility,
        isPublished: e.isPublished,
        publishedAt: e.publishedAt
      })));
      const converted = journalData.entries.map(convertJournalToActivity);
      console.log('📊 Converted activities:', converted.map(a => ({
        id: a.id,
        title: a.title,
        visibility: a.visibility,
        isPublished: a.isPublished,
        source: a.source
      })));
      return converted;
    }
    
    // If loading or error, return empty array
    if (journalLoading || journalError) {
      console.log(journalLoading ? '⏳ Still loading journal data' : '❌ Error loading journal data');
      return [];
    }
    
    // No data available
    console.log('📭 No journal entries available');
    return [];
  }, [journalData, journalLoading, journalError]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    activities.forEach(activity => cats.add(activity.category));
    return Array.from(cats).sort();
  }, [activities]);

  // Get unique workspaces from activities
  const workspaces = useMemo(() => {
    const uniqueWorkspaces = new Map();
    activities.forEach(activity => {
      if (!uniqueWorkspaces.has(activity.workspaceId)) {
        uniqueWorkspaces.set(activity.workspaceId, {
          id: activity.workspaceId,
          name: activity.workspaceName,
          isPersonal: !activity.organizationName
        });
      }
    });
    return Array.from(uniqueWorkspaces.values());
  }, [activities]);

  // Filter activities based on view mode and selected workspace
  const filteredActivities = useMemo(() => {
    console.log(`🔍 Filtering activities for viewMode: ${viewMode}`);
    console.log(`🔍 Total activities before filtering: ${activities.length}`);
    
    const filtered = activities.filter(activity => {
      // Exclude auto-generated entries - they should only appear on workspace page
      // (auto-generated entries have visibility: 'private', but this is a safety check)
      if (activity.tags?.includes('auto-generated')) {
        console.log(`❌ Excluding activity "${activity.title}" (auto-generated)`);
        return false;
      }

      // Filter by view mode - visibility alone controls access
      if (viewMode === 'network') {
        // Network view: only show entries with network visibility
        if (activity.visibility !== 'network') {
          console.log(`❌ Excluding activity "${activity.title}" from network view: visibility=${activity.visibility}`);
          return false;
        }
        // Skip entries without format7DataNetwork in network view (no fallback to workspace view)
        if (activity.format7Data && !activity.format7DataNetwork) {
          console.log(`❌ Excluding activity "${activity.title}" from network view: no format7DataNetwork available`);
          return false;
        }
        console.log(`✅ Including activity "${activity.title}" in network view: visibility=${activity.visibility}`);
      } else {
        // Workspace view: only show entries with workspace visibility
        if (activity.visibility !== 'workspace') {
          return false;
        }
        // Workspace tab filter
        if (selectedWorkspace !== 'all' && activity.workspaceId !== selectedWorkspace) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          activity.title.toLowerCase().includes(searchLower) ||
          activity.description.toLowerCase().includes(searchLower) ||
          activity.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          activity.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
          activity.author.name.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && activity.category !== selectedCategory) {
        return false;
      }

      // Skills filter
      if (selectedSkills.length > 0) {
        const hasSelectedSkill = selectedSkills.some(skill => 
          activity.skills.includes(skill)
        );
        if (!hasSelectedSkill) return false;
      }

      return true;
    });
    
    console.log(`🔍 Filtered activities count: ${filtered.length}`);
    console.log(`🔍 Filtered activities:`, filtered.map(a => ({
      id: a.id,
      title: a.title,
      visibility: a.visibility,
      source: a.source
    })));
    
    return filtered;
  }, [activities, viewMode, searchQuery, selectedCategory, selectedSkills, selectedWorkspace]);

  // Sophisticated feed prioritization with workspace and network logic
  const prioritizedActivities = useMemo(() => {
    // First, filter out entries older than 7 days (configurable)
    const now = new Date();
    const ageLimit = now.getTime() - (DEFAULT_FEED_AGE_LIMIT_DAYS * 24 * 60 * 60 * 1000);
    const recentActivities = filteredActivities.filter(activity => 
      activity.createdAt.getTime() >= ageLimit
    );

    if (viewMode === 'workspace') {
      // WORKSPACE VIEW SORTING LOGIC
      // 1. Core connections in common workspaces (sorted by recency)
      // 2. Extended connections in common workspaces (sorted by recency) 
      // 3. Other users in common workspaces (sorted by recency)
      
      const coreWorkspaceEntries: ActivityEntry[] = [];
      const extendedWorkspaceEntries: ActivityEntry[] = [];
      const otherWorkspaceEntries: ActivityEntry[] = [];

      recentActivities.forEach(activity => {
        // Only include entries from common workspaces (workspace source indicates shared workspace)
        if (activity.source === 'workspace') {
          if (activity.author.connectionType === 'core_connection') {
            coreWorkspaceEntries.push(activity);
          } else if (activity.author.connectionType === 'extended_connection') {
            extendedWorkspaceEntries.push(activity);
          } else {
            otherWorkspaceEntries.push(activity);
          }
        }
      });

      // Sort each group by recency
      const sortByRecency = (a: ActivityEntry, b: ActivityEntry) => 
        b.createdAt.getTime() - a.createdAt.getTime();

      coreWorkspaceEntries.sort(sortByRecency);
      extendedWorkspaceEntries.sort(sortByRecency);
      otherWorkspaceEntries.sort(sortByRecency);

      return [...coreWorkspaceEntries, ...extendedWorkspaceEntries, ...otherWorkspaceEntries];
    } else {
      // NETWORK VIEW SORTING LOGIC
      // 1. Core network entries (NOT from shared workspaces, sorted by recency)
      // 2. Extended network entries (NOT from shared workspaces, sorted by recency)
      // 3. Discovery entries (sorted by skill match relevance, then recency)

      const coreNetworkEntries: ActivityEntry[] = [];
      const extendedNetworkEntries: ActivityEntry[] = [];
      const discoveryEntries: ActivityEntry[] = [];

      recentActivities.forEach(activity => {
        if (activity.author.connectionType === 'core_connection' && activity.source === 'network') {
          // Core network entries not from shared workspaces
          coreNetworkEntries.push(activity);
        } else if (activity.author.connectionType === 'extended_connection' && activity.source === 'network') {
          // Extended network entries not from shared workspaces
          extendedNetworkEntries.push(activity);
        } else if (activity.author.connectionType === 'none' || activity.author.connectionType === 'following') {
          // Discovery entries
          discoveryEntries.push(activity);
        }
      });

      // Sort core and extended by recency
      const sortByRecency = (a: ActivityEntry, b: ActivityEntry) => 
        b.createdAt.getTime() - a.createdAt.getTime();

      coreNetworkEntries.sort(sortByRecency);
      extendedNetworkEntries.sort(sortByRecency);

      // Sort discovery entries by skill match relevance, then recency
      discoveryEntries.sort((a, b) => {
        const skillMatchA = calculateSkillMatch(a.skills, currentUserSkills);
        const skillMatchB = calculateSkillMatch(b.skills, currentUserSkills);

        // Primary sort: number of matching skills (descending)
        if (skillMatchA.matchingSkills.length !== skillMatchB.matchingSkills.length) {
          return skillMatchB.matchingSkills.length - skillMatchA.matchingSkills.length;
        }

        // Secondary sort: relevance score (descending)
        if (skillMatchA.relevanceScore !== skillMatchB.relevanceScore) {
          return skillMatchB.relevanceScore - skillMatchA.relevanceScore;
        }

        // Tertiary sort: recency (newer first)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return [...coreNetworkEntries, ...extendedNetworkEntries, ...discoveryEntries];
    }
  }, [filteredActivities, sortBy, viewMode]);

  // Get displayed activities with enhanced tier transition markers
  const displayedActivities = useMemo(() => {
    const activities = prioritizedActivities.slice(0, displayedCount);
    
    if (activities.length === 0) return [];

    const activitiesWithMarkers: FeedItem[] = [];
    let lastTierType = '';

    activities.forEach((activity, index) => {
      let currentTierType = '';
      let tierInfo = null;

      if (viewMode === 'workspace') {
        // Workspace view tier markers
        if (activity.author.connectionType === 'core_connection' && activity.source === 'workspace') {
          currentTierType = 'core-workspace';
          tierInfo = { 
            label: 'Core Connections in Shared Workspaces', 
            icon: Layers, 
            color: 'bg-blue-50 border-blue-200' 
          };
        } else if (activity.author.connectionType === 'extended_connection' && activity.source === 'workspace') {
          currentTierType = 'extended-workspace';
          tierInfo = { 
            label: 'Extended Connections in Shared Workspaces', 
            icon: Network, 
            color: 'bg-purple-50 border-purple-200' 
          };
        } else if (activity.source === 'workspace') {
          currentTierType = 'others-workspace';
          tierInfo = { 
            label: 'Other Users in Shared Workspaces', 
            icon: Building2, 
            color: 'bg-gray-50 border-gray-200' 
          };
        }
      } else {
        // Network view tier markers
        if (activity.author.connectionType === 'core_connection' && activity.source === 'network') {
          currentTierType = 'core-network';
          tierInfo = { 
            label: 'Core Network', 
            icon: Layers, 
            color: 'bg-blue-50 border-blue-200' 
          };
        } else if (activity.author.connectionType === 'extended_connection' && activity.source === 'network') {
          currentTierType = 'extended-network';
          tierInfo = { 
            label: 'Extended Network', 
            icon: Network, 
            color: 'bg-purple-50 border-purple-200' 
          };
        } else if (activity.author.connectionType === 'none' || activity.author.connectionType === 'following') {
          currentTierType = 'discovery';
          tierInfo = { 
            label: 'Professional Discovery', 
            icon: Sparkles, 
            color: 'bg-amber-50 border-amber-200' 
          };
        }
      }

      // Add tier marker when tier changes
      if (currentTierType !== lastTierType && tierInfo) {
        activitiesWithMarkers.push({
          isTierMarker: true,
          tier: currentTierType,
          tierLabel: tierInfo.label,
          tierIcon: tierInfo.icon,
          tierColor: tierInfo.color
        });
        lastTierType = currentTierType;
      }

      activitiesWithMarkers.push(activity);
    });
    
    return activitiesWithMarkers;
  }, [prioritizedActivities, displayedCount, viewMode]);

  // Load more activities
  const loadMoreActivities = () => {
    if (isLoading || displayedCount >= prioritizedActivities.length) return;
    
    setIsLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + 5, prioritizedActivities.length));
      setIsLoading(false);
    }, 500);
  };

  // Reset displayed count when filters change
  React.useEffect(() => {
    setDisplayedCount(5);
  }, [viewMode, searchQuery, selectedCategory, selectedSkills, selectedWorkspace, sortBy]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdowns(new Set());
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Infinite scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 1000 >= 
        document.documentElement.offsetHeight
      ) {
        loadMoreActivities();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, displayedCount, prioritizedActivities.length]);

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  // Follow/Connection handlers
  const handleFollowUser = (authorId: string, authorName: string, authorAvatar: string) => {
    setPendingFollows(prev => new Set([...prev, authorId]));
    
    // Simulate API call
    setTimeout(() => {
      setPendingFollows(prev => {
        const newSet = new Set(prev);
        newSet.delete(authorId);
        return newSet;
      });
      
      // Auto-approve follow and add notification
      setNotifications(prev => [...prev, {
        id: `follow-${Date.now()}`,
        type: 'follow',
        message: `You are now following ${authorName}`,
        timestamp: new Date(),
        authorId,
        authorName,
        authorAvatar
      }]);
      
      // Update activity to show following status
      // In a real app, this would update the database
    }, 1000);
  };

  const handleUnfollowUser = (authorId: string, authorName: string) => {
    // In a real app, this would call API to unfollow
    setNotifications(prev => [...prev, {
      id: `unfollow-${Date.now()}`,
      type: 'follow',
      message: `You unfollowed ${authorName}`,
      timestamp: new Date(),
      authorId,
      authorName,
      authorAvatar: ''
    }]);
  };

  const handleSendConnectionRequest = (authorId: string, authorName: string, authorAvatar: string) => {
    setPendingConnectionRequests(prev => new Set([...prev, authorId]));
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(authorId);
      return newSet;
    });
    
    // Simulate API call
    setTimeout(() => {
      setPendingConnectionRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(authorId);
        return newSet;
      });
      
      // Add notification
      setNotifications(prev => [...prev, {
        id: `connection-${Date.now()}`,
        type: 'connection_request',
        message: `Connection request sent to ${authorName}`,
        timestamp: new Date(),
        authorId,
        authorName,
        authorAvatar
      }]);
    }, 1000);
  };

  const toggleDropdown = (authorId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(authorId)) {
        newSet.delete(authorId);
      } else {
        newSet.add(authorId);
      }
      return newSet;
    });
  };

  const handleMoveToCore = (authorId: string, authorName: string) => {
    // Handle moving to core network
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(authorId);
      return newSet;
    });
    setNotifications(prev => [...prev, {
      id: `core-${Date.now()}`,
      type: 'connection_request',
      message: `Moved ${authorName} to Core Network`,
      timestamp: new Date(),
      authorId,
      authorName,
      authorAvatar: ''
    }]);
  };

  const handleMoveToExtended = (authorId: string, authorName: string) => {
    // Handle moving to extended network
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(authorId);
      return newSet;
    });
    setNotifications(prev => [...prev, {
      id: `extended-${Date.now()}`,
      type: 'connection_request',
      message: `Moved ${authorName} to Extended Network`,
      timestamp: new Date(),
      authorId,
      authorName,
      authorAvatar: ''
    }]);
  };

  // Appreciate mutation
  const toggleAppreciateMutation = useToggleAppreciate();

  // ReChronicle mutation
  const rechronicleMutation = useRechronicleEntry();

  // Interaction handlers
  const handleAppreciate = async (entryId: string) => {
    try {
      // Optimistically update UI
      setAppreciatedEntries(prev => {
        const newSet = new Set(prev);
        if (newSet.has(entryId)) {
          newSet.delete(entryId);
        } else {
          newSet.add(entryId);
        }
        return newSet;
      });
      // Persist to database
      await toggleAppreciateMutation.mutateAsync(entryId);
    } catch (error) {
      // Revert on error
      setAppreciatedEntries(prev => {
        const newSet = new Set(prev);
        if (newSet.has(entryId)) {
          newSet.delete(entryId);
        } else {
          newSet.add(entryId);
        }
        return newSet;
      });
      console.error('Failed to toggle appreciate:', error);
    }
  };

  const handleDiscuss = (entryId: string) => {
    // Toggle discuss panel visibility for the entry
    setDiscussOpenEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleRechronicle = async (entryId: string) => {
    // Optimistic UI update
    const wasRechronicled = rechronicledEntries.has(entryId);
    setRechronicledEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });

    try {
      await rechronicleMutation.mutateAsync({ id: entryId });
    } catch (error) {
      // Revert on error
      setRechronicledEntries(prev => {
        const newSet = new Set(prev);
        if (wasRechronicled) {
          newSet.add(entryId);
        } else {
          newSet.delete(entryId);
        }
        return newSet;
      });
      console.error('Failed to rechronicle:', error);
    }
  };

  const handleCommentInputChange = (entryId: string, value: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [entryId]: value
    }));
  };

  const handleAddComment = (entryId: string) => {
    const commentText = commentInputs[entryId];
    if (!commentText?.trim()) return;
    
    // In a real app, this would send the comment to the server
    console.log('Adding comment to entry', entryId, ':', commentText);
    
    // Clear the input
    setCommentInputs(prev => ({
      ...prev,
      [entryId]: ''
    }));
  };

  // Get connection type display info with enhanced two-tier network indicators
  const getConnectionTypeInfo = (activity: ActivityEntry) => {
    const connectionType = activity.author.connectionType;
    const isAppreciated = activity.appreciatedBy && activity.appreciatedBy.length > 0;
    
    switch (connectionType) {
      case 'core_connection':
        return {
          label: 'Core Network',
          icon: Layers,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
          priority: 'high'
        };
      case 'extended_connection':
        return {
          label: 'Extended Network',
          icon: Network,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          dotColor: 'bg-purple-500',
          priority: 'medium'
        };
      case 'following':
        return {
          label: 'Following',
          icon: Eye,
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dotColor: 'bg-indigo-500',
          priority: 'medium'
        };
      case 'none':
        // Discovery content indicators
        if (isAppreciated) {
          return {
            label: 'Appreciated by Network',
            icon: Heart,
            color: 'bg-rose-50 text-rose-700 border-rose-200',
            dotColor: 'bg-rose-500',
            priority: 'low'
          };
        } else {
          return {
            label: 'Skill Match',
            icon: Sparkles,
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            dotColor: 'bg-amber-500',
            priority: 'low'
          };
        }
      default:
        return null;
    }
  };

  // Render activity card
  const renderActivityCard = (activity: ActivityEntry) => {
    const journalEntry = convertActivityToJournal(activity, appreciatedEntries, rechronicledEntries);

    // Render JournalEnhanced for Format7 entries with AI-grouped categories
    // Use appropriate data based on viewMode: network view uses format7DataNetwork, workspace uses format7Data
    if (journalEntry.format7Data?.entry_metadata?.title) {
      const entryData = viewMode === 'network'
        ? journalEntry.format7DataNetwork
        : journalEntry.format7Data;

      // Skip if no data available for the current view mode
      if (!entryData) return null;

      return (
        <JournalEnhanced
          key={activity.id}
          entry={entryData}
          mode="expanded"
          workspaceName={journalEntry.workspaceName}
          correlations={entryData?.correlations}
          categories={entryData?.categories}
          showUserProfile={true}
          author={{
            name: journalEntry.author?.name || "Unknown",
            title: journalEntry.author?.position || "",
            avatar: journalEntry.author?.avatar
          }}
          onAppreciate={() => handleAppreciate(activity.id)}
          onDiscuss={() => handleDiscuss(activity.id)}
          onReChronicle={() => handleRechronicle(activity.id)}
        />
      );
    }

    // Regular JournalCard for non-Format7 entries
    return (
      <JournalCard
        key={activity.id}
        journal={journalEntry}
        viewMode={viewMode}
        showMenuButton={false}
        showAnalyticsButton={false}
        showUserProfile={true}
        onAppreciate={() => handleAppreciate(activity.id)}
        onToggleDiscuss={() => handleDiscuss(activity.id)}
        onReChronicle={() => handleRechronicle(activity.id)}
        isDiscussOpen={discussOpenEntries.has(activity.id)}
        commentInput={commentInputs[activity.id] || ''}
        onCommentInputChange={handleCommentInputChange}
        onAddComment={() => handleAddComment(activity.id)}
      />
    );
  };
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Activity Feed
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Stay updated with professional activities from your network and workspaces
              </p>
            </div>
            
            {/* Workspace/Network Toggle & New Entry Button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full bg-gray-100 p-0.5 shadow-sm">
                <button
                  className={cn(
                    "rounded-full px-2 sm:px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap",
                    viewMode === 'workspace' 
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setViewMode('workspace')}
                >
                  <span className="hidden xs:inline">Workspace Feed</span>
                  <span className="xs:hidden">Workspace</span>
                </button>
                <button
                  className={cn(
                    "rounded-full px-2 sm:px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap",
                    viewMode === 'network' 
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setViewMode('network')}
                >
                  <span className="hidden xs:inline">Network Feed</span>
                  <span className="xs:hidden">Network</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Info Banner */}
        <div className={cn(
          "mb-6 p-4 rounded-lg flex items-start gap-3",
          viewMode === 'network' ? "bg-purple-50 border border-purple-200" : "bg-blue-50 border border-blue-200"
        )}>
          <div className="flex-shrink-0">
            {viewMode === 'network' ? 
              <Users className="h-5 w-5 text-purple-600" /> : 
              <Building2 className="h-5 w-5 text-blue-600" />
            }
          </div>
          <div className="flex-1">
            <h3 className={cn(
              "text-sm font-medium",
              viewMode === 'network' ? "text-purple-900" : "text-blue-900"
            )}>
              {viewMode === 'network' ? 'Network Activity Feed' : 'Workspace Activity Feed'}
            </h3>
            <p className={cn(
              "mt-1 text-sm",
              viewMode === 'network' ? "text-purple-700" : "text-blue-700"
            )}>
              {viewMode === 'network' 
                ? 'See published journal entries from professionals in your network. Client details and confidential information are abstracted for privacy.'
                : 'Full access to activities from your workspace colleagues including detailed project information, artifacts, and confidential details.'}
            </p>
          </div>
        </div>

        {/* Results Summary with Search/Filter Toggle */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {prioritizedActivities.length} {prioritizedActivities.length === 1 ? 'activity' : 'activities'} from your {viewMode}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowSearchFilters(!showSearchFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden xs:inline">Search & Filter</span>
              <span className="xs:hidden">Filter</span>
              {(searchQuery || selectedCategory !== 'all' || selectedSkills.length > 0) && (
                <span className="ml-1 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                  {[searchQuery !== '', selectedCategory !== 'all', selectedSkills.length > 0].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showSearchFilters && "rotate-180")} />
            </button>
            <Button 
              size="sm"
              className="bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition-all duration-200 hover:shadow-md w-full sm:w-auto"
              onClick={() => setShowNewEntryModal(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Workspace Tabs (only in workspace view) */}
        {viewMode === 'workspace' && (
          <div className="mb-6 border-b border-gray-200">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                className={cn(
                  "relative px-3 sm:px-4 py-2 text-sm font-medium transition-colors flex items-center group whitespace-nowrap flex-shrink-0",
                  selectedWorkspace === 'all'
                    ? "text-primary-600"
                    : "text-gray-500 hover:text-primary-600"
                )}
                style={{ outline: 'none', background: 'none', border: 'none' }}
                onClick={() => setSelectedWorkspace('all')}
              >
                <span className="hidden sm:inline">All Workspaces</span>
                <span className="sm:hidden">All</span>
                {selectedWorkspace === 'all' && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-500 rounded-full" />
                )}
              </button>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  className={cn(
                    "relative px-3 sm:px-4 py-2 text-sm font-medium transition-colors flex items-center group whitespace-nowrap flex-shrink-0",
                    selectedWorkspace === ws.id
                      ? "text-primary-600"
                      : "text-gray-500 hover:text-primary-600"
                  )}
                  style={{ outline: 'none', background: 'none', border: 'none' }}
                  onClick={() => setSelectedWorkspace(ws.id)}
                  title={ws.name}
                >
                  <span className="mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7V6a2 2 0 012-2h2a2 2 0 012 2v1m0 0v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7m6 0h6m0 0V6a2 2 0 012-2h2a2 2 0 012 2v1m0 0v10a2 2 0 01-2 2h-2a2 2 0 01-2-2V7" /></svg>
                  </span>
                  <span className="max-w-[120px] sm:max-w-none truncate">{ws.name}</span>
                  {selectedWorkspace === ws.id && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters - Expandable */}
        {showSearchFilters && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-600 hidden sm:inline">Sort by:</span>
                <select
                  className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-gray-100", "w-full sm:w-auto")}
              >
                <Filter className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Filters</span>
                <span className="xs:hidden">Filter</span>
                {(selectedCategory !== 'all' || selectedSkills.length > 0) && (
                  <span className="ml-2 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                    {[selectedCategory !== 'all', selectedSkills.length > 0].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Spacer for desktop, hidden on mobile */}
                  <div className="hidden md:block"></div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedSkills([]);
                        setSearchQuery('');
                      }}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>

                {/* Skills Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills ({selectedSkills.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                          selectedSkills.includes(skill)
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {journalLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 mb-4"></div>
            <h3 className="text-sm font-medium text-gray-900">Loading activities...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we fetch the latest activity data</p>
          </div>
        ) : journalError ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-300 p-12 text-center bg-red-50">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-red-900">Failed to load activities</h3>
            <p className="mt-1 text-sm text-red-600">
              {error?.message || 'There was an error loading the activity feed. Please try refreshing the page.'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : prioritizedActivities.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6">
              {displayedActivities.map((item, index) => {
                // Handle tier markers
                if ('isTierMarker' in item) {
                  const TierIcon = item.tierIcon;
                  return (
                    <div key={`tier-${item.tier}-${index}`} className={cn("p-4 rounded-lg border", item.tierColor)}>
                      <div className="flex items-center gap-3">
                        <TierIcon className="h-5 w-5 text-gray-600" />
                        <h3 className="text-sm font-medium text-gray-900">{item.tierLabel}</h3>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                    </div>
                  );
                }
                // Handle regular activities
                return renderActivityCard(item);
              })}
            </div>
            
            {/* Loading Indicator for Infinite Scroll */}
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600"></div>
                  <span className="text-sm">Loading more activities...</span>
                </div>
              </div>
            )}
            
            {/* End of Results Indicator */}
            {displayedCount >= prioritizedActivities.length && prioritizedActivities.length > 5 && (
              <div className="flex justify-center py-8">
                <div className="text-sm text-gray-500">
                  You've reached the end of the feed
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900">No activities found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedSkills.length > 0 || selectedCategory !== 'all'
                ? 'Try adjusting your filters or search query'
                : viewMode === 'network' 
                  ? 'Connect with more professionals to see their published work'
                  : 'No recent workspace activity to display'}
            </p>
          </div>
        )}
        <NewEntryModal 
          open={showNewEntryModal} 
          onOpenChange={setShowNewEntryModal} 
        />
      </div>
    </div>
  );
}