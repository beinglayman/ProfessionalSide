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
  Layers,
  ArrowUpCircle,
  ArrowDownCircle,
  Network
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { NewEntryModal } from '../../components/new-entry/new-entry-modal';
import { JournalCard } from '../../components/journal/journal-card';
import { JournalEntry } from '../../types/journal';

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
  fullContent: string;
  abstractContent: string;
  createdAt: Date;
  lastModified: Date;
  author: Author;
  collaborators: Collaborator[];
  artifacts: Artifact[];
  skills: string[];
  outcomes: Outcome[];
  visibility: 'private' | 'workspace' | 'network' | 'public';
  isPublished: boolean;
  publishedAt?: Date;
  likes: number;
  comments: number;
  hasLiked: boolean;
  tags: string[];
  category: string;
  source: 'workspace' | 'network';
  priority: number;
  appreciatedBy?: string[];
  hasAppreciated: boolean;
  recommendationReason?: 'skill_match' | 'connection_appreciated' | 'network_following' | 'trending';
  skillMatch?: {
    matchingSkills: string[];
    relevanceScore: number;
  };
}

interface Workspace {
  id: string;
  name: string;
  color: string;
  organization: string;
  activityCount: number;
}

interface TierMarker {
  isTierMarker: true;
  tier: string;
  tierLabel: string;
  tierIcon: any;
  tierColor: string;
}

type DisplayItem = ActivityEntry | TierMarker;

// Helper function to calculate skill match relevance
const calculateSkillMatch = (activitySkills: string[], userSkills: string[] = ['React.js', 'TypeScript', 'UX Design', 'Project Management']) => {
  const matchingSkills = activitySkills.filter(skill => 
    userSkills.some(userSkill => 
      userSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(userSkill.toLowerCase())
    )
  );
  const relevanceScore = matchingSkills.length / Math.max(activitySkills.length, 1);
  return { matchingSkills, relevanceScore };
};

// Convert ActivityEntry to JournalEntry format for JournalCard
const convertActivityToJournal = (activity: ActivityEntry): JournalEntry => {
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
      position: activity.author.position
    },
    collaborators: activity.collaborators,
    reviewers: [], // ActivityEntry doesn't have reviewers
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
    hasAppreciated: activity.hasAppreciated,
    discussCount: activity.comments,
    discussions: [], // We'll need to populate this based on activity comments
    rechronicles: 0, // ActivityEntry doesn't have rechronicles
    hasReChronicled: false,
    analytics: {
      viewCount: Math.floor(Math.random() * 1000) + 100, // Generate random analytics
      averageReadTime: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      engagementTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
      trendPercentage: Math.floor(Math.random() * 50) - 25 // -25 to +25
    }
  };
};

// Sample data for activity feed with enhanced two-tier network structure
const sampleActivities: ActivityEntry[] = [
  // Core Network Activity
  {
    id: "a-001",
    title: "Launched New E-commerce Checkout Flow",
    workspaceId: "ws-101",
    workspaceName: "Q1 Conversion Optimization",
    organizationName: "RetailTech Solutions",
    description: "Redesigned the entire checkout experience resulting in significant conversion improvements.",
    fullContent: "Led a comprehensive redesign of RetailTech's checkout flow, focusing on reducing cart abandonment and improving conversion rates. Implemented a streamlined 3-step process, added guest checkout options, and integrated multiple payment methods including Apple Pay and Google Pay. The new design reduced the number of form fields by 60% and included real-time validation to prevent user errors.",
    abstractContent: "Led a major e-commerce checkout redesign project focused on improving conversion rates. Implemented streamlined user flows, guest checkout options, and modern payment integrations. The project involved extensive user research and A/B testing.",
    createdAt: new Date("2025-06-25T14:30:00"),
    lastModified: new Date("2025-06-25T16:45:00"),
    author: {
      id: "auth-001",
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      position: "Senior UX Designer",
      department: "Product Design",
      organization: "RetailTech Solutions",
      isConnection: true,
      connectionType: 'core_connection',
      connectionReason: "Direct workspace collaborator in Q1 Conversion Optimization",
      connectedAt: new Date("2025-01-15T10:00:00"),
      sharedWorkspaces: ["Q1 Conversion Optimization", "Design System Updates"],
      commonConnections: 8,
      matchedSkills: ["UX Design", "A/B Testing"]
    },
    collaborators: [
      {
        id: "c-101",
        name: "Emma Thompson",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Frontend Developer"
      },
      {
        id: "c-102",
        name: "James Wilson",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        role: "Product Manager"
      }
    ],
    artifacts: [
      {
        id: "art-001",
        name: "Checkout_Flow_Wireframes.fig",
        type: "design",
        url: "/files/checkout-wireframes",
        size: "32.1 MB",
        isConfidential: true
      },
      {
        id: "art-002",
        name: "User_Research_Report.pdf",
        type: "document",
        url: "/files/user-research",
        size: "4.2 MB"
      }
    ],
    skills: ["UX Design", "User Research", "A/B Testing", "E-commerce"],
    outcomes: [
      {
        category: 'performance',
        title: 'Conversion Rate Improvement',
        description: 'Achieved a 23% increase in checkout conversion rates across all device types.',
        metrics: {
          before: '2.8%',
          after: '3.4%',
          improvement: '+23%',
          trend: 'up'
        }
      },
      {
        category: 'user-experience',
        title: 'Reduced Cart Abandonment',
        description: 'Cart abandonment rates decreased significantly due to streamlined checkout process.',
        metrics: {
          before: '68%',
          after: '51%',
          improvement: '-17%',
          trend: 'up'
        }
      }
    ],
    visibility: 'network',
    isPublished: true,
    publishedAt: new Date("2025-06-25T17:00:00"),
    likes: 28,
    comments: 12,
    hasLiked: false,
    tags: ["checkout", "conversion", "ux", "e-commerce"],
    category: "Product Design",
    source: 'network',
    priority: 5,
    appreciatedBy: ["user1", "user2", "user3", "user4", "user5"],
    hasAppreciated: true,
    recommendationReason: 'skill_match',
    skillMatch: {
      matchingSkills: ["UX Design"],
      relevanceScore: 0.85
    }
  },
  // Add more sample activities as needed
];

export function ActivityFeedPage() {
  const [viewMode, setViewMode] = useState<'workspace' | 'network'>('network');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(5);

  // Get unique workspaces from activities
  const workspaces: Workspace[] = useMemo(() => {
    const uniqueWorkspaces = new Map<string, Workspace>();
    sampleActivities.forEach(activity => {
      if (!uniqueWorkspaces.has(activity.workspaceId)) {
        uniqueWorkspaces.set(activity.workspaceId, {
          id: activity.workspaceId,
          name: activity.workspaceName,
          color: `bg-${['blue', 'green', 'purple', 'pink', 'yellow'][Math.floor(Math.random() * 5)]}-100`,
          organization: activity.organizationName || 'Unknown',
          activityCount: 1
        });
      } else {
        const workspace = uniqueWorkspaces.get(activity.workspaceId)!;
        workspace.activityCount++;
      }
    });
    return Array.from(uniqueWorkspaces.values());
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    sampleActivities.forEach(activity => cats.add(activity.category));
    return Array.from(cats).sort();
  }, []);

  // Get unique skills
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    sampleActivities.forEach(activity => {
      activity.skills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills).sort();
  }, []);

  // Filter activities based on view mode and selected workspace
  const filteredActivities = useMemo(() => {
    return sampleActivities.filter(activity => {
      // Filter by view mode
      if (viewMode === 'network') {
        // Network view: only show published activities from connections
        if (activity.source !== 'network' || !activity.isPublished) {
          return false;
        }
      } else {
        // Workspace view: show all workspace activities
        if (activity.source !== 'workspace') {
          return false;
        }
      }

      // Filter by workspace
      if (selectedWorkspace !== 'all' && activity.workspaceId !== selectedWorkspace) {
        return false;
      }

      // Filter by category
      if (selectedCategory !== 'all' && activity.category !== selectedCategory) {
        return false;
      }

      // Filter by skills
      if (selectedSkills.length > 0) {
        const hasMatchingSkill = selectedSkills.some(skill => 
          activity.skills.some(activitySkill => 
            activitySkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (!hasMatchingSkill) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const titleMatch = activity.title.toLowerCase().includes(queryLower);
        const descriptionMatch = activity.description.toLowerCase().includes(queryLower);
        const authorMatch = activity.author.name.toLowerCase().includes(queryLower);
        const skillsMatch = activity.skills.some(skill => skill.toLowerCase().includes(queryLower));
        
        if (!titleMatch && !descriptionMatch && !authorMatch && !skillsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [viewMode, selectedWorkspace, selectedCategory, selectedSkills, searchQuery]);

  // Priority and sorting logic for network view
  const prioritizedActivities = useMemo(() => {
    if (viewMode !== 'network') {
      // Workspace view: sort by most recent
      return [...filteredActivities].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const getNetworkTier = (activity: ActivityEntry): number => {
      if (activity.author.connectionType === 'core_connection') return 1;
      if (activity.author.connectionType === 'extended_connection') return 2;
      if (activity.author.connectionType === 'following') return 3;
      if (activity.recommendationReason) return 4;
      
      return 5; // Fallback
    };

    const getEngagementScore = (activity: ActivityEntry): number => {
      return (activity.likes || 0) * 1.0 + (activity.comments || 0) * 2.0;
    };

    const sorted = [...filteredActivities].sort((a, b) => {
      const tierA = getNetworkTier(a);
      const tierB = getNetworkTier(b);
      
      if (tierA !== tierB) {
        return tierA - tierB;
      }
      
      // Within same tier, sort by engagement and recency
      const engagementA = getEngagementScore(a);
      const engagementB = getEngagementScore(b);
      const recencyA = a.createdAt.getTime();
      const recencyB = b.createdAt.getTime();
      
      // Combined score: 70% engagement, 30% recency
      const scoreA = (engagementA * 0.7) + (recencyA / 1000000 * 0.3);
      const scoreB = (engagementB * 0.7) + (recencyB / 1000000 * 0.3);
      
      return scoreB - scoreA;
    });

    return sorted;
  }, [filteredActivities, viewMode]);

  // Create display items with tier markers for network view
  const displayedActivities: DisplayItem[] = useMemo(() => {
    if (viewMode !== 'network') {
      return prioritizedActivities.slice(0, displayedCount);
    }

    const items: DisplayItem[] = [];
    let currentTier: number | null = null;
    let count = 0;
    
    for (const activity of prioritizedActivities) {
      if (count >= displayedCount) break;
      
      const tier = activity.author.connectionType === 'core_connection' ? 1 :
                   activity.author.connectionType === 'extended_connection' ? 2 :
                   activity.author.connectionType === 'following' ? 3 :
                   activity.recommendationReason ? 4 : 5;
      
      if (tier !== currentTier) {
        const tierLabels = {
          1: { label: "Core Network", icon: Users, color: "bg-blue-50 border-blue-200" },
          2: { label: "Extended Network", icon: Network, color: "bg-green-50 border-green-200" },
          3: { label: "Following", icon: Eye, color: "bg-purple-50 border-purple-200" },
          4: { label: "Recommended", icon: Sparkles, color: "bg-amber-50 border-amber-200" },
          5: { label: "Discover", icon: Star, color: "bg-gray-50 border-gray-200" }
        };
        
        const tierInfo = tierLabels[tier as keyof typeof tierLabels];
        items.push({
          isTierMarker: true,
          tier: tier.toString(),
          tierLabel: tierInfo.label,
          tierIcon: tierInfo.icon,
          tierColor: tierInfo.color
        });
        currentTier = tier;
      }
      
      items.push(activity);
      count++;
    }
    
    return items;
  }, [prioritizedActivities, viewMode, displayedCount]);

  // Render activity card using JournalCard component
  const renderActivityCard = (activity: ActivityEntry) => {
    const journalEntry = convertActivityToJournal(activity);
    
    return (
      <JournalCard
        key={activity.id}
        journal={journalEntry}
        viewMode={viewMode}
        showMenuButton={false}
        showAnalyticsButton={false}
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
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    viewMode === 'workspace' 
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  onClick={() => setViewMode('workspace')}
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Workspace
                </button>
                <button
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    viewMode === 'network' 
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  onClick={() => setViewMode('network')}
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Network
                </button>
              </div>

              <Button 
                size="sm"
                className="bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition-all duration-200 hover:shadow-md"
                onClick={() => setShowNewEntryModal(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Entry
              </Button>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        {prioritizedActivities.length > 0 ? (
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