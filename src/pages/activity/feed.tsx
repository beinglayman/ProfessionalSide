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
import { JournalEntry } from '../../types/journal';
import { useJournalEntries } from '../../hooks/useJournal';

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
    achievementDescription: activity.achievementDescription
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
    createdAt: new Date("2025-07-02T14:30:00"),
    lastModified: new Date("2025-07-02T16:45:00"),
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
        url: "/files/research-report",
        size: "4.8 MB",
        isConfidential: true
      }
    ],
    skills: ["UX Design", "User Research", "A/B Testing", "Conversion Optimization", "Figma"],
    skillMatch: calculateSkillMatch(["UX Design", "User Research", "A/B Testing", "Conversion Optimization", "Figma"], currentUserSkills),
    appreciatedBy: ["user-123", "user-456", "user-789"],
    hasAppreciated: false,
    recommendationReason: 'skill_match',
    outcomes: [
      {
        category: "business",
        title: "Dramatic conversion improvement",
        description: "Cart abandonment reduced significantly with the new streamlined flow",
        metrics: {
          before: "68%",
          after: "32%",
          improvement: "-36%",
          trend: "down"
        }
      },
      {
        category: "user-experience",
        title: "Faster checkout completion",
        description: "Users complete checkout process much quicker with fewer steps",
        metrics: {
          before: "4.2 min",
          after: "1.8 min",
          improvement: "-57%",
          trend: "down"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-07-02T17:00:00"),
    likes: 42,
    comments: 2,
    hasLiked: false,
    tags: ["ux-design", "e-commerce", "conversion", "checkout"],
    category: "Design",
    source: "network",
    connectionType: "direct"
  },
  // Core Network Activity (Workspace View)
  {
    id: "a-001-workspace",
    title: "Launched New E-commerce Checkout Flow",
    workspaceId: "ws-101",
    workspaceName: "Q1 Conversion Optimization",
    organizationName: "RetailTech Solutions",
    description: "Redesigned the entire checkout experience resulting in significant conversion improvements.",
    fullContent: "Led a comprehensive redesign of RetailTech's checkout flow, focusing on reducing cart abandonment and improving conversion rates. Implemented a streamlined 3-step process, added guest checkout options, and integrated multiple payment methods including Apple Pay and Google Pay. The new design reduced the number of form fields by 60% and included real-time validation to prevent user errors. All changes were validated through extensive user testing and A/B testing with real customers.",
    abstractContent: "Led a major e-commerce checkout redesign project focused on improving conversion rates. Implemented streamlined user flows, guest checkout options, and modern payment integrations. The project involved extensive user research and A/B testing.",
    createdAt: new Date("2025-07-02T14:30:00"),
    lastModified: new Date("2025-07-02T16:45:00"),
    author: {
      id: "auth-001-ws",
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
        id: "c-101-ws",
        name: "Emma Thompson",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Frontend Developer"
      },
      {
        id: "c-102-ws",
        name: "James Wilson",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        role: "Product Manager"
      }
    ],
    artifacts: [
      {
        id: "art-001-ws",
        name: "Checkout_Flow_Wireframes.fig",
        type: "design",
        url: "/files/checkout-wireframes",
        size: "32.1 MB",
        isConfidential: true
      },
      {
        id: "art-002-ws",
        name: "User_Research_Report.pdf",
        type: "document",
        url: "/files/research-report",
        size: "4.8 MB",
        isConfidential: true
      },
      {
        id: "art-003-ws",
        name: "AB_Test_Results.xlsx",
        type: "data",
        url: "/files/ab-test-results",
        size: "2.1 MB",
        isConfidential: true
      }
    ],
    skills: ["UX Design", "User Research", "A/B Testing", "Conversion Optimization", "Figma"],
    skillMatch: calculateSkillMatch(["UX Design", "User Research", "A/B Testing", "Conversion Optimization", "Figma"], currentUserSkills),
    appreciatedBy: ["user-123", "user-456", "user-789"],
    hasAppreciated: false,
    recommendationReason: 'skill_match',
    outcomes: [
      {
        category: "business",
        title: "Dramatic conversion improvement",
        description: "Cart abandonment reduced significantly with the new streamlined flow",
        metrics: {
          before: "68%",
          after: "32%",
          improvement: "-36%",
          trend: "down"
        }
      },
      {
        category: "user-experience",
        title: "Faster checkout completion",
        description: "Users complete checkout process much quicker with fewer steps",
        metrics: {
          before: "4.2 min",
          after: "1.8 min",
          improvement: "-57%",
          trend: "down"
        }
      }
    ],
    visibility: "workspace",
    isPublished: false,
    publishedAt: new Date("2025-07-02T17:00:00"),
    likes: 28,
    comments: 2,
    hasLiked: false,
    tags: ["ux-design", "e-commerce", "conversion", "checkout"],
    category: "Design",
    source: "workspace",
    connectionType: "direct"
  },
  {
    id: "a-002",
    title: "AI-Powered Recommendation Engine Implementation",
    workspaceId: "ws-205",
    workspaceName: "ML Platform Development",
    organizationName: "TechCorp Solutions",
    description: "Built and deployed a machine learning recommendation system that personalizes product suggestions.",
    fullContent: "Developed and implemented a sophisticated ML recommendation engine for TechCorp's e-commerce platform using collaborative filtering and content-based algorithms. The system processes over 50M user interactions daily and provides real-time personalized recommendations. Built using Python, TensorFlow, and deployed on AWS with auto-scaling capabilities. Includes A/B testing framework and comprehensive analytics dashboard.",
    abstractContent: "Developed a machine learning recommendation system for an e-commerce platform. Implemented collaborative filtering algorithms and real-time personalization features. The system handles high-volume user interactions and includes comprehensive analytics.",
    createdAt: new Date("2025-06-09T11:15:00"),
    lastModified: new Date("2025-06-09T15:30:00"),
    author: {
      id: "auth-002",
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      position: "ML Engineer",
      department: "Engineering",
      organization: "TechCorp Solutions",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "Both of you work in Machine Learning",
      matchedSkills: ["Machine Learning"]
    },
    collaborators: [
      {
        id: "c-201",
        name: "David Kim",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
        role: "Data Scientist"
      },
      {
        id: "c-202",
        name: "Sarah Chen",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Backend Developer"
      }
    ],
    artifacts: [
      {
        id: "art-003",
        name: "ML_Model_Architecture.pdf",
        type: "document",
        url: "/files/ml-architecture",
        size: "2.3 MB"
      },
      {
        id: "art-004",
        name: "recommendation_engine.py",
        type: "code",
        url: "/files/recommendation-code",
        size: "89 KB"
      }
    ],
    skills: ["Machine Learning", "Python", "TensorFlow", "AWS", "Data Science"],
    skillMatch: calculateSkillMatch(["Machine Learning", "Python", "TensorFlow", "AWS", "Data Science"], currentUserSkills),
    appreciatedBy: ["user-111", "user-222"],
    hasAppreciated: true,
    recommendationReason: 'skill_match',
    outcomes: [
      {
        category: "business",
        title: "Increased user engagement",
        description: "Personalized recommendations drive more product discoveries",
        metrics: {
          before: "2.3 items",
          after: "4.7 items",
          improvement: "+104%",
          trend: "up"
        }
      },
      {
        category: "technical",
        title: "High-performance system",
        description: "Real-time recommendations with sub-100ms response times",
        highlight: "99.9% uptime, <100ms response"
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-09T17:00:00"),
    likes: 18,
    comments: 1,
    tags: ["machine-learning", "recommendations", "python", "aws"],
    category: "Engineering",
    source: "network"
  },
  {
    id: "a-003",
    title: "Mobile App Security Audit & Enhancements",
    workspaceId: "ws-301",
    workspaceName: "Security Hardening Initiative",
    organizationName: null,
    description: "Conducted comprehensive security audit and implemented critical security improvements for mobile applications.",
    fullContent: "Performed thorough security audit of our mobile applications across iOS and Android platforms. Identified and resolved 15 critical vulnerabilities including improper data storage, insufficient transport layer protection, and weak authentication mechanisms. Implemented certificate pinning, enhanced encryption protocols, and added biometric authentication support. All changes passed penetration testing and received security team approval.",
    abstractContent: "Conducted comprehensive security audit for mobile applications and implemented critical security enhancements. Addressed vulnerabilities related to data storage, encryption, and authentication. All improvements passed security validation testing.",
    createdAt: new Date("2025-06-08T09:45:00"),
    lastModified: new Date("2025-06-08T17:20:00"),
    author: {
      id: "auth-003",
      name: "Lisa Wang",
      avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop",
      position: "Security Engineer",
      department: "Security",
      organization: "TechCorp Solutions",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "You share 2 common connections"
    },
    collaborators: [
      {
        id: "c-301",
        name: "Michael Brown",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
        role: "Mobile Developer"
      }
    ],
    artifacts: [
      {
        id: "art-005",
        name: "Security_Audit_Report.pdf",
        type: "document",
        url: "/files/security-audit",
        size: "5.1 MB",
        isConfidential: true
      },
      {
        id: "art-006",
        name: "security_patches.zip",
        type: "code",
        url: "/files/security-patches",
        size: "245 KB",
        isConfidential: true
      }
    ],
    skills: ["Mobile Security", "Penetration Testing", "iOS", "Android", "Cryptography"],
    outcomes: [
      {
        category: "technical",
        title: "Zero critical vulnerabilities",
        description: "Successfully resolved all identified security issues",
        highlight: "100% vulnerability resolution"
      },
      {
        category: "business",
        title: "Enhanced user trust",
        description: "Improved security posture increases user confidence",
        highlight: "SOC 2 compliance achieved"
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-08T18:00:00"),
    likes: 12,
    comments: 4,
    tags: ["security", "mobile", "audit", "penetration-testing"],
    category: "Security",
    source: "network"
  },
  {
    id: "a-004",
    title: "Data Visualization Dashboard for Customer Analytics",
    workspaceId: "ws-401",
    workspaceName: "Customer Insights Platform",
    organizationName: "DataFlow Analytics",
    description: "Created interactive dashboards that help teams visualize and understand customer behavior patterns.",
    fullContent: "Designed and developed a comprehensive analytics dashboard using D3.js and React for DataFlow Analytics' customer insights platform. The dashboard provides real-time visualization of customer journey data, cohort analysis, and predictive analytics. Implemented custom chart components, interactive filters, and export functionality. The solution processes over 2M data points daily and provides actionable insights to product and marketing teams.",
    abstractContent: "Developed interactive analytics dashboards for customer behavior analysis. Created real-time visualizations and custom chart components. The platform processes high-volume data and provides actionable insights to business teams.",
    createdAt: new Date("2025-06-07T13:20:00"),
    lastModified: new Date("2025-06-07T18:15:00"),
    author: {
      id: "auth-004",
      name: "Jennifer Park",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      position: "Frontend Developer",
      department: "Engineering",
      organization: "DataFlow Analytics",
      isConnection: true,
      connectionType: 'extended_connection',
      connectionReason: "Both of you work in React.js",
      matchedSkills: ["React", "TypeScript"]
    },
    collaborators: [
      {
        id: "c-401",
        name: "Robert Johnson",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        role: "Data Analyst"
      }
    ],
    artifacts: [
      {
        id: "art-007",
        name: "Dashboard_Components.tsx",
        type: "code",
        url: "/files/dashboard-components",
        size: "156 KB"
      },
      {
        id: "art-008",
        name: "Analytics_Mockups.fig",
        type: "design",
        url: "/files/analytics-mockups",
        size: "28.7 MB"
      }
    ],
    skills: ["D3.js", "React", "Data Visualization", "TypeScript", "Analytics"],
    outcomes: [
      {
        category: "user-experience",
        title: "Intuitive data exploration",
        description: "Teams can now easily explore complex customer data",
        metrics: {
          before: "Manual reports",
          after: "Self-service dashboard",
          improvement: "Real-time insights",
          trend: "up"
        }
      },
      {
        category: "business",
        title: "Faster decision making",
        description: "Reduced time from data to insights significantly",
        highlight: "85% faster insights generation"
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-07T19:00:00"),
    likes: 28,
    comments: 2,
    hasLiked: true,
    tags: ["data-visualization", "analytics", "react", "d3js"],
    category: "Engineering",
    source: "network",
    connectionType: "direct"
  },
  {
    id: "a-005",
    title: "Cloud Infrastructure Migration to AWS",
    workspaceId: "ws-501",
    workspaceName: "Infrastructure Modernization",
    organizationName: "CloudTech Enterprises",
    description: "Led the complete migration of legacy infrastructure to AWS cloud platform, reducing costs and improving scalability.",
    fullContent: "Successfully migrated CloudTech's entire legacy infrastructure to AWS, including 50+ servers, databases, and applications. Implemented Infrastructure as Code using Terraform, set up CI/CD pipelines with AWS CodePipeline, and established monitoring with CloudWatch. The migration reduced infrastructure costs by 40% and improved system reliability to 99.9% uptime.",
    abstractContent: "Led a comprehensive cloud infrastructure migration project for an enterprise client. Implemented modern DevOps practices and achieved significant cost savings while improving system reliability and scalability.",
    createdAt: new Date("2025-06-06T08:00:00"),
    lastModified: new Date("2025-06-06T17:45:00"),
    author: {
      id: "auth-005",
      name: "Robert Chen",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      position: "DevOps Engineer",
      department: "Infrastructure",
      organization: "CloudTech Enterprises",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "Both of you work in Node.js"
    },
    collaborators: [
      {
        id: "c-501",
        name: "Jessica Martinez",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Cloud Architect"
      },
      {
        id: "c-502",
        name: "Ahmed Hassan",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        role: "Systems Administrator"
      }
    ],
    artifacts: [
      {
        id: "art-009",
        name: "migration_plan.pdf",
        type: "document",
        url: "/files/migration-plan",
        size: "3.2 MB",
        isConfidential: true
      },
      {
        id: "art-010",
        name: "terraform_infrastructure.tf",
        type: "code",
        url: "/files/terraform-code",
        size: "125 KB"
      }
    ],
    skills: ["AWS", "Terraform", "DevOps", "CI/CD", "Docker", "Kubernetes"],
    outcomes: [
      {
        category: "business",
        title: "Significant cost reduction",
        description: "Reduced infrastructure costs through cloud optimization and resource rightsizing",
        metrics: {
          before: "$25,000/month",
          after: "$15,000/month",
          improvement: "-40%",
          trend: "down"
        }
      },
      {
        category: "technical",
        title: "Improved system reliability",
        description: "Enhanced uptime and performance through modern cloud infrastructure",
        metrics: {
          before: "96.5%",
          after: "99.9%",
          improvement: "+3.4%",
          trend: "up"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-06T18:00:00"),
    likes: 35,
    comments: 8,
    hasLiked: false,
    tags: ["cloud", "aws", "migration", "devops", "infrastructure"],
    category: "Infrastructure",
    source: "network",
    connectionType: "direct"
  },
  {
    id: "a-006",
    title: "Automated Testing Framework Implementation",
    workspaceId: "ws-601",
    workspaceName: "QA Automation Initiative",
    organizationName: "TechCorp Solutions",
    description: "Built comprehensive automated testing framework reducing manual testing effort by 80%.",
    fullContent: "Developed and implemented a comprehensive automated testing framework using Cypress and Jest for TechCorp's web applications. Created over 200 automated test cases covering unit, integration, and end-to-end testing. Set up parallel test execution and integrated with CI/CD pipeline. Reduced manual testing time from 40 hours to 8 hours per release cycle.",
    abstractContent: "Developed automated testing framework for web applications. Implemented comprehensive test coverage and CI/CD integration, significantly reducing manual testing effort and improving software quality.",
    createdAt: new Date("2025-06-05T14:20:00"),
    lastModified: new Date("2025-06-05T19:15:00"),
    author: {
      id: "auth-006",
      name: "Lisa Wong",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      position: "QA Engineer",
      department: "Quality Assurance",
      organization: "TechCorp Solutions"
    },
    collaborators: [
      {
        id: "c-601",
        name: "Tom Rodriguez",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        role: "Frontend Developer"
      }
    ],
    artifacts: [
      {
        id: "art-011",
        name: "testing_framework_docs.md",
        type: "document",
        url: "/files/testing-docs",
        size: "856 KB"
      },
      {
        id: "art-012",
        name: "cypress_tests.zip",
        type: "code",
        url: "/files/cypress-tests",
        size: "2.1 MB"
      }
    ],
    skills: ["Cypress", "Jest", "Test Automation", "JavaScript", "CI/CD"],
    outcomes: [
      {
        category: "performance",
        title: "Massive reduction in testing time",
        description: "Automated testing framework dramatically reduced manual testing effort",
        metrics: {
          before: "40 hours",
          after: "8 hours",
          improvement: "-80%",
          trend: "down"
        }
      },
      {
        category: "technical",
        title: "Improved test coverage",
        description: "Comprehensive automated test suite with 95% code coverage",
        highlight: "95% test coverage achieved"
      }
    ],
    visibility: "workspace",
    isPublished: false,
    likes: 0,
    comments: 0,
    tags: ["testing", "automation", "qa", "cypress", "ci-cd"],
    category: "Quality Assurance",
    source: "workspace"
  },
  {
    id: "a-007",
    title: "Mobile App UX Research & Redesign",
    workspaceId: "ws-701",
    workspaceName: "Mobile Experience Team",
    organizationName: "UserFirst Design",
    description: "Conducted extensive UX research and redesigned mobile app improving user satisfaction by 45%.",
    fullContent: "Led comprehensive UX research project for UserFirst Design's mobile application, including user interviews, usability testing, and competitor analysis. Redesigned the entire user interface based on findings, implementing a new design system and navigation structure. Conducted A/B testing with 5,000 users and achieved 45% improvement in user satisfaction scores.",
    abstractContent: "Conducted UX research and redesigned mobile application interface. Implemented data-driven design improvements resulting in significant user satisfaction gains through systematic testing and iteration.",
    createdAt: new Date("2025-06-04T11:30:00"),
    lastModified: new Date("2025-06-04T16:20:00"),
    author: {
      id: "auth-007",
      name: "Emma Thompson",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      position: "UX Researcher",
      department: "Design",
      organization: "UserFirst Design",
      isConnection: true,
      connectionType: 'following',
      connectionReason: "You share 3 common connections",
      commonConnections: 3
    },
    collaborators: [
      {
        id: "c-701",
        name: "Carlos Silva",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
        role: "UI Designer"
      },
      {
        id: "c-702",
        name: "Anna Lee",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
        role: "Product Manager"
      }
    ],
    artifacts: [
      {
        id: "art-013",
        name: "ux_research_report.pdf",
        type: "document",
        url: "/files/ux-research",
        size: "4.7 MB",
        isConfidential: true
      },
      {
        id: "art-014",
        name: "mobile_app_designs.fig",
        type: "design",
        url: "/files/mobile-designs",
        size: "15.3 MB"
      }
    ],
    skills: ["UX Research", "Mobile Design", "Figma", "User Testing", "Design Systems"],
    outcomes: [
      {
        category: "user-experience",
        title: "Dramatic improvement in user satisfaction",
        description: "User satisfaction scores increased significantly after redesign implementation",
        metrics: {
          before: "6.2/10",
          after: "9.0/10",
          improvement: "+45%",
          trend: "up"
        }
      },
      {
        category: "business",
        title: "Increased app store ratings",
        description: "App store ratings improved from 3.2 to 4.6 stars",
        metrics: {
          before: "3.2 stars",
          after: "4.6 stars",
          improvement: "+44%",
          trend: "up"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-04T17:00:00"),
    likes: 52,
    comments: 1,
    hasLiked: true,
    tags: ["ux-research", "mobile-design", "user-testing", "figma"],
    category: "Design",
    source: "network",
    connectionType: "direct"
  },
  {
    id: "a-008",
    title: "API Performance Optimization & Monitoring",
    workspaceId: "ws-801",
    workspaceName: "Backend Performance Team",
    organizationName: "TechCorp Solutions",
    description: "Optimized critical API endpoints and implemented comprehensive monitoring system.",
    fullContent: "Identified and resolved performance bottlenecks in TechCorp's core API infrastructure. Implemented database query optimization, added Redis caching layer, and set up comprehensive monitoring with Datadog. Reduced average API response time from 1.2s to 180ms and established real-time alerting for performance degradation.",
    abstractContent: "Optimized backend API performance through database tuning and caching strategies. Implemented monitoring and alerting systems to maintain optimal performance at scale.",
    createdAt: new Date("2025-06-03T10:45:00"),
    lastModified: new Date("2025-06-03T18:30:00"),
    author: {
      id: "auth-008",
      name: "Michael Johnson",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      position: "Backend Engineer",
      department: "Engineering",
      organization: "TechCorp Solutions"
    },
    collaborators: [
      {
        id: "c-801",
        name: "Sofia Patel",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Database Administrator"
      }
    ],
    artifacts: [
      {
        id: "art-015",
        name: "performance_optimization_report.pdf",
        type: "document",
        url: "/files/perf-report",
        size: "2.8 MB"
      }
    ],
    skills: ["Node.js", "Redis", "PostgreSQL", "API Optimization", "Monitoring"],
    outcomes: [
      {
        category: "performance",
        title: "Massive API speed improvement",
        description: "Reduced API response times through optimization and caching",
        metrics: {
          before: "1.2s",
          after: "180ms",
          improvement: "-85%",
          trend: "down"
        }
      }
    ],
    visibility: "workspace",
    isPublished: false,
    likes: 0,
    comments: 0,
    tags: ["api", "performance", "backend", "optimization", "monitoring"],
    category: "Engineering",
    source: "workspace"
  },
  {
    id: "a-009",
    title: "Blockchain Payment Integration",
    workspaceId: "ws-901",
    workspaceName: "FinTech Innovation",
    organizationName: "CryptoFlow Systems",
    description: "Integrated blockchain-based payment system for secure, decentralized transactions.",
    fullContent: "Designed and implemented a blockchain payment integration for CryptoFlow's platform using Ethereum smart contracts. Built secure wallet connectivity, transaction verification, and real-time payment tracking. Implemented multi-signature security and gas optimization strategies.",
    abstractContent: "Developed blockchain payment integration for a financial platform. Implemented secure smart contract architecture and optimized transaction processing for improved user experience.",
    createdAt: new Date("2025-06-02T16:30:00"),
    lastModified: new Date("2025-06-02T20:15:00"),
    author: {
      id: "auth-009",
      name: "Kevin Zhang",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      position: "Blockchain Developer",
      department: "Engineering",
      organization: "CryptoFlow Systems",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "You share 4 common connections"
    },
    collaborators: [
      {
        id: "c-901",
        name: "Rachel Park",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Smart Contract Auditor"
      }
    ],
    artifacts: [],
    skills: ["Blockchain", "Ethereum", "Smart Contracts", "Web3", "Solidity"],
    outcomes: [
      {
        category: "technical",
        title: "Secure payment processing",
        description: "Zero security incidents with 99.8% transaction success rate",
        highlight: "99.8% success rate"
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-02T21:00:00"),
    likes: 47,
    comments: 9,
    hasLiked: false,
    tags: ["blockchain", "ethereum", "payments", "web3", "fintech"],
    category: "Engineering",
    source: "network",
    connectionType: "direct"
  },
  {
    id: "a-010",
    title: "AI-Powered Content Moderation System",
    workspaceId: "ws-1001",
    workspaceName: "AI Safety Initiative",
    organizationName: "SocialTech Platforms",
    description: "Built machine learning system for automated content moderation with 94% accuracy.",
    fullContent: "Developed an advanced AI content moderation system using transformer models and computer vision. The system automatically detects and flags inappropriate content including hate speech, spam, and harmful imagery. Achieved 94% accuracy with minimal false positives through careful model tuning and human-in-the-loop validation.",
    abstractContent: "Developed AI-powered content moderation system using machine learning and computer vision. Achieved high accuracy in detecting inappropriate content while minimizing false positives through advanced model architecture.",
    createdAt: new Date("2025-06-01T12:00:00"),
    lastModified: new Date("2025-06-01T18:45:00"),
    author: {
      id: "auth-010",
      name: "Priya Sharma",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      position: "ML Engineer",
      department: "AI Research",
      organization: "SocialTech Platforms",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "Both of you work in Machine Learning"
    },
    collaborators: [
      {
        id: "c-1001",
        name: "James Liu",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        role: "Data Scientist"
      }
    ],
    artifacts: [],
    skills: ["Machine Learning", "Python", "TensorFlow", "Computer Vision", "NLP"],
    outcomes: [
      {
        category: "technical",
        title: "High accuracy content detection",
        description: "Achieved 94% accuracy in content moderation with low false positive rate",
        metrics: {
          before: "Manual review",
          after: "94% automated",
          improvement: "94% accuracy",
          trend: "up"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-01T19:00:00"),
    likes: 63,
    comments: 15,
    hasLiked: true,
    tags: ["machine-learning", "ai", "content-moderation", "tensorflow"],
    category: "AI/ML",
    source: "network",
    connectionType: "direct"
  },
  {
    id: "a-011",
    title: "Sustainable Architecture Design for Green Building",
    workspaceId: "ws-1101",
    workspaceName: "Sustainable Design Lab",
    organizationName: "EcoDesign Studios",
    description: "Designed LEED Platinum certified building with 60% energy reduction.",
    fullContent: "Led the architectural design for EcoDesign's first LEED Platinum certified office building. Incorporated solar panels, rainwater harvesting, green roofs, and passive cooling systems. The building achieved 60% energy reduction compared to conventional designs and serves as a model for sustainable architecture.",
    abstractContent: "Designed sustainable office building achieving LEED Platinum certification. Integrated renewable energy systems and innovative design elements resulting in significant energy savings and environmental impact reduction.",
    createdAt: new Date("2025-05-31T09:30:00"),
    lastModified: new Date("2025-05-31T17:20:00"),
    author: {
      id: "auth-011",
      name: "Marcus Thompson",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      position: "Sustainable Architect",
      department: "Design",
      organization: "EcoDesign Studios",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "You share the workspace Sustainability Projects"
    },
    collaborators: [
      {
        id: "c-1101",
        name: "Nina Rodriguez",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
        role: "Environmental Engineer"
      }
    ],
    artifacts: [],
    skills: ["Sustainable Design", "LEED Certification", "AutoCAD", "Green Architecture"],
    outcomes: [
      {
        category: "business",
        title: "Significant energy savings",
        description: "Building achieved 60% energy reduction compared to conventional designs",
        metrics: {
          before: "Standard building",
          after: "LEED Platinum",
          improvement: "-60% energy",
          trend: "down"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-05-31T18:00:00"),
    likes: 38,
    comments: 6,
    hasLiked: false,
    tags: ["sustainable-design", "leed", "green-building", "architecture"],
    category: "Architecture",
    source: "network",
    connectionType: "direct"
  },
  {
    id: "a-012",
    title: "Cybersecurity Incident Response Framework",
    workspaceId: "ws-1201",
    workspaceName: "Security Operations",
    organizationName: "SecureNet Solutions",
    description: "Developed comprehensive incident response framework reducing breach response time by 75%.",
    fullContent: "Created and implemented a comprehensive cybersecurity incident response framework for SecureNet Solutions. Established automated threat detection, incident classification, and response procedures. Trained security team on new protocols and integrated with SIEM systems for real-time monitoring.",
    abstractContent: "Developed cybersecurity incident response framework with automated detection and classification systems. Implemented comprehensive protocols and training programs resulting in significantly faster breach response times.",
    createdAt: new Date("2025-05-30T14:15:00"),
    lastModified: new Date("2025-05-30T19:30:00"),
    author: {
      id: "auth-012",
      name: "Sarah Kim",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      position: "Security Analyst",
      department: "Cybersecurity",
      organization: "SecureNet Solutions",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "Both of you work in TypeScript"
    },
    collaborators: [
      {
        id: "c-1201",
        name: "Alex Rivera",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
        role: "Security Engineer"
      }
    ],
    artifacts: [],
    skills: ["Cybersecurity", "Incident Response", "SIEM", "Security Protocols"],
    outcomes: [
      {
        category: "performance",
        title: "Faster incident response",
        description: "Dramatically reduced time to detect and respond to security incidents",
        metrics: {
          before: "4 hours",
          after: "1 hour",
          improvement: "-75%",
          trend: "down"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-05-30T20:00:00"),
    likes: 29,
    comments: 4,
    hasLiked: false,
    tags: ["cybersecurity", "incident-response", "siem", "security"],
    category: "Security",
    source: "network",
    connectionType: "direct"
  },
  // Discovery - Skill Match Activity
  {
    id: "a-013",
    title: "Advanced TypeScript Patterns for React Applications",
    workspaceId: "ws-1301",
    workspaceName: "Frontend Architecture Guild",
    organizationName: "TypeScript Pro",
    description: "Comprehensive guide to advanced TypeScript patterns specifically for React applications.",
    fullContent: "Explored advanced TypeScript patterns including conditional types, mapped types, and template literal types in React contexts. Created reusable type utilities for props validation, state management, and API response handling. The guide includes practical examples and performance considerations for enterprise applications.",
    abstractContent: "Developed comprehensive guide to advanced TypeScript patterns for React development. Created reusable type utilities and practical examples for enterprise-scale applications.",
    createdAt: new Date("2025-06-20T11:45:00"),
    lastModified: new Date("2025-06-20T16:00:00"),
    author: {
      id: "auth-013",
      name: "Daniel Lee",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
      position: "Staff Frontend Engineer",
      department: "Engineering",
      organization: "TypeScript Pro",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "Strong skill match in React.js and TypeScript",
      matchedSkills: ["React.js", "TypeScript"]
    },
    collaborators: [
      {
        id: "c-1301",
        name: "Maya Patel",
        avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop",
        role: "Senior Frontend Developer"
      }
    ],
    artifacts: [],
    skills: ["TypeScript", "React.js", "Frontend Architecture", "Type Safety"],
    skillMatch: calculateSkillMatch(["TypeScript", "React.js", "Frontend Architecture", "Type Safety"], currentUserSkills),
    appreciatedBy: [],
    hasAppreciated: false,
    recommendationReason: 'skill_match',
    outcomes: [
      {
        category: "technical",
        title: "Improved type safety",
        description: "Advanced patterns reduced runtime errors by 90% in production",
        metrics: {
          before: "12 errors/week",
          after: "1 error/week",
          improvement: "-92%",
          trend: "down"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-20T17:00:00"),
    likes: 156,
    comments: 34,
    hasLiked: false,
    tags: ["typescript", "react", "frontend-architecture", "type-safety"],
    category: "Engineering",
    source: "network",
    connectionType: "direct"
  },
  // Core Network Achievement Entry
  {
    id: "a-013-achievement",
    title: "Achieved Microsoft Azure Solutions Architect Expert Certification",
    workspaceId: "ws-1301",
    workspaceName: "Cloud Infrastructure Team",
    organizationName: "CloudTech Solutions",
    description: "Successfully obtained the Microsoft Azure Solutions Architect Expert certification, demonstrating advanced skills in Azure cloud architecture.",
    fullContent: "Completed the rigorous Microsoft Azure Solutions Architect Expert certification after 6 months of preparation. This certification validates expertise in designing and implementing solutions that run on Azure, including compute, network, storage, and security. The certification covers advanced topics like hybrid networking, identity management, and disaster recovery planning.",
    abstractContent: "Achieved Microsoft Azure Solutions Architect Expert certification, demonstrating advanced cloud architecture expertise and commitment to professional development in cloud technologies.",
    createdAt: new Date("2025-07-01T15:00:00"),
    lastModified: new Date("2025-07-01T15:30:00"),
    author: {
      id: "auth-013-achievement",
      name: "Marcus Johnson",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      position: "Senior Cloud Architect",
      department: "Infrastructure",
      organization: "CloudTech Solutions",
      isConnection: true,
      connectionType: 'core_connection',
      connectionReason: "Direct workspace collaborator in Cloud Infrastructure Team",
      connectedAt: new Date("2025-01-20T10:00:00"),
      sharedWorkspaces: ["Cloud Infrastructure Team", "DevOps Excellence"],
      commonConnections: 12,
      matchedSkills: ["Node.js", "TypeScript"]
    },
    collaborators: [],
    artifacts: [
      {
        id: "art-cert-001",
        name: "Azure_Architect_Certificate.pdf",
        type: "document",
        url: "/files/azure-certificate",
        size: "1.2 MB"
      }
    ],
    skills: ["Azure", "Cloud Architecture", "Solution Design", "Infrastructure", "DevOps"],
    skillMatch: calculateSkillMatch(["Azure", "Cloud Architecture", "Solution Design", "Infrastructure", "DevOps"], currentUserSkills),
    appreciatedBy: ["user-123", "user-456"],
    hasAppreciated: false,
    recommendationReason: 'skill_match',
    outcomes: [
      {
        category: "technical",
        title: "Advanced certification achieved",
        description: "Demonstrated mastery of Azure cloud architecture principles and best practices",
        highlight: "Microsoft Azure Solutions Architect Expert"
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-07-01T16:00:00"),
    likes: 24,
    comments: 1,
    hasLiked: false,
    tags: ["azure", "certification", "cloud-architecture", "professional-development"],
    category: "Achievement",
    source: "network",
    connectionType: "direct",
    achievementType: "certification", // Special flag for achievement entries
    achievementTitle: "Microsoft Azure Solutions Architect Expert",
    achievementDescription: "Advanced certification in Azure cloud architecture and solution design"
  },
  // Core Network Achievement Entry (Workspace View)
  {
    id: "a-013-achievement-workspace",
    title: "Achieved Microsoft Azure Solutions Architect Expert Certification",
    workspaceId: "ws-1301",
    workspaceName: "Cloud Infrastructure Team",
    organizationName: "CloudTech Solutions",
    description: "Successfully obtained the Microsoft Azure Solutions Architect Expert certification, demonstrating advanced skills in Azure cloud architecture.",
    fullContent: "Completed the rigorous Microsoft Azure Solutions Architect Expert certification after 6 months of preparation. This certification validates expertise in designing and implementing solutions that run on Azure, including compute, network, storage, and security. The certification covers advanced topics like hybrid networking, identity management, and disaster recovery planning. This achievement demonstrates commitment to professional development and mastery of cloud architecture principles.",
    abstractContent: "Achieved Microsoft Azure Solutions Architect Expert certification, demonstrating advanced cloud architecture expertise and commitment to professional development in cloud technologies.",
    createdAt: new Date("2025-07-01T15:00:00"),
    lastModified: new Date("2025-07-01T15:30:00"),
    author: {
      id: "auth-013-achievement-ws",
      name: "Marcus Johnson",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      position: "Senior Cloud Architect",
      department: "Infrastructure",
      organization: "CloudTech Solutions",
      isConnection: true,
      connectionType: 'core_connection',
      connectionReason: "Direct workspace collaborator in Cloud Infrastructure Team",
      connectedAt: new Date("2025-01-20T10:00:00"),
      sharedWorkspaces: ["Cloud Infrastructure Team", "DevOps Excellence"],
      commonConnections: 12,
      matchedSkills: ["Node.js", "TypeScript"]
    },
    collaborators: [],
    artifacts: [
      {
        id: "art-cert-001-ws",
        name: "Azure_Architect_Certificate.pdf",
        type: "document",
        url: "/files/azure-certificate",
        size: "1.2 MB"
      },
      {
        id: "art-cert-002-ws",
        name: "Certification_Study_Plan.pdf",
        type: "document",
        url: "/files/certification-study-plan",
        size: "850 KB",
        isConfidential: true
      }
    ],
    skills: ["Azure", "Cloud Architecture", "Solution Design", "Infrastructure", "DevOps"],
    skillMatch: calculateSkillMatch(["Azure", "Cloud Architecture", "Solution Design", "Infrastructure", "DevOps"], currentUserSkills),
    appreciatedBy: ["user-123", "user-456"],
    hasAppreciated: false,
    recommendationReason: 'skill_match',
    outcomes: [
      {
        category: "technical",
        title: "Advanced certification achieved",
        description: "Demonstrated mastery of Azure cloud architecture principles and best practices",
        highlight: "Microsoft Azure Solutions Architect Expert"
      },
      {
        category: "team",
        title: "Enhanced team capabilities",
        description: "Certification strengthens the team's cloud expertise and project delivery capabilities",
        highlight: "Expert-level Azure knowledge"
      }
    ],
    visibility: "workspace",
    isPublished: false,
    publishedAt: new Date("2025-07-01T16:00:00"),
    likes: 15,
    comments: 1,
    hasLiked: false,
    tags: ["azure", "certification", "cloud-architecture", "professional-development"],
    category: "Achievement",
    source: "workspace",
    connectionType: "direct",
    achievementType: "certification", // Special flag for achievement entries
    achievementTitle: "Microsoft Azure Solutions Architect Expert",
    achievementDescription: "Advanced certification in Azure cloud architecture and solution design"
  },
  // Discovery - Appreciated by Network Activity
  {
    id: "a-014",
    title: "Machine Learning Model Deployment at Scale",
    workspaceId: "ws-1401",
    workspaceName: "AI Infrastructure Team",
    organizationName: "MLOps Solutions",
    description: "Comprehensive MLOps pipeline for deploying ML models in production environments.",
    fullContent: "Built end-to-end MLOps pipeline supporting deployment of 200+ ML models across multiple environments. Implemented automated model versioning, A/B testing framework, and monitoring systems. The pipeline includes model validation, rollback capabilities, and performance tracking with 99.9% uptime.",
    abstractContent: "Developed comprehensive MLOps pipeline for large-scale ML model deployment. Implemented automated workflows, monitoring, and A/B testing with high availability guarantees.",
    createdAt: new Date("2025-06-19T14:30:00"),
    lastModified: new Date("2025-06-19T18:45:00"),
    author: {
      id: "auth-014",
      name: "Rajesh Kumar",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      position: "MLOps Engineer",
      department: "AI Infrastructure",
      organization: "MLOps Solutions",
      isConnection: false,
      connectionType: 'none',
      connectionReason: "Appreciated by 3 professionals in your network",
      matchedSkills: ["Machine Learning"]
    },
    collaborators: [
      {
        id: "c-1401",
        name: "Priya Singh",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "Data Engineer"
      }
    ],
    artifacts: [],
    skills: ["MLOps", "Machine Learning", "Python", "Kubernetes", "CI/CD"],
    skillMatch: calculateSkillMatch(["MLOps", "Machine Learning", "Python", "Kubernetes", "CI/CD"], currentUserSkills),
    appreciatedBy: ["auth-001", "auth-002", "auth-004"], // Appreciated by network connections
    hasAppreciated: false,
    recommendationReason: 'connection_appreciated',
    outcomes: [
      {
        category: "performance",
        title: "Reduced deployment time",
        description: "Automated pipeline reduced model deployment time dramatically",
        metrics: {
          before: "2-3 days",
          after: "15 minutes",
          improvement: "-99%",
          trend: "down"
        }
      }
    ],
    visibility: "network",
    isPublished: true,
    publishedAt: new Date("2025-06-19T19:00:00"),
    likes: 89,
    comments: 21,
    hasLiked: false,
    tags: ["mlops", "machine-learning", "devops", "automation"],
    category: "AI/ML",
    source: "network",
    connectionType: "direct"
  }
];

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
  const { data: journalData, isLoading: journalLoading } = useJournalEntries({
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
    source: entry.visibility === 'network' ? 'network' : 'workspace'
  });

  // Get activities from API or fallback to sample data
  const activities = useMemo(() => {
    console.log('🔍 Activity data loading status:', {
      journalLoading,
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
    console.log('⚠️ No API data available, using sample activities');
    return sampleActivities; // Fallback to sample data if API data not available
  }, [journalData, journalLoading]);

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
      // Filter by view mode
      if (viewMode === 'network') {
        // Network view: only show entries with network visibility
        // Note: entries with network visibility should be considered published by default
        if (activity.visibility !== 'network') {
          console.log(`❌ Excluding activity "${activity.title}" from network view: visibility=${activity.visibility}, isPublished=${activity.isPublished}`);
          return false;
        }
        console.log(`✅ Including activity "${activity.title}" in network view: visibility=${activity.visibility}, isPublished=${activity.isPublished}`);
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
      isPublished: a.isPublished,
      source: a.source
    })));
    
    return filtered;
  }, [activities, viewMode, searchQuery, selectedCategory, selectedSkills, selectedWorkspace]);

  // Intelligent prioritization for two-tier network system
  const prioritizedActivities = useMemo(() => {
    if (viewMode !== 'network') {
      // Workspace view: use original sorting
      const sorted = [...filteredActivities];
      if (sortBy === 'recent') {
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else {
        sorted.sort((a, b) => b.likes - a.likes);
      }
      return sorted;
    }

    // Network view: implement intelligent prioritization
    const getNetworkTier = (activity: ActivityEntry): number => {
      const connectionType = activity.author.connectionType;
      
      // Tier 1: Core Network (highest priority)
      if (connectionType === 'core_connection') return 1;
      
      // Tier 2: Extended Network
      if (connectionType === 'extended_connection') return 2;
      
      // Tier 3: Following
      if (connectionType === 'following') return 3;
      
      // Tier 4: Skill-based discoveries and appreciated content
      if (connectionType === 'none') {
        // Prioritize appreciated content within discovery tier
        if (activity.appreciatedBy && activity.appreciatedBy.length > 0) return 4.1;
        // Regular skill-based content
        return 4.2;
      }
      
      return 5; // Fallback
    };

    const getEngagementScore = (activity: ActivityEntry): number => {
      return (activity.likes || 0) * 1.0 + (activity.comments || 0) * 2.0;
    };

    const sorted = [...filteredActivities].sort((a, b) => {
      const tierA = getNetworkTier(a);
      const tierB = getNetworkTier(b);
      
      // Primary sort: by network tier
      if (tierA !== tierB) {
        return tierA - tierB;
      }
      
      // Secondary sort within same tier
      if (sortBy === 'recent') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        // For popularity, consider engagement score
        const engagementA = getEngagementScore(a);
        const engagementB = getEngagementScore(b);
        if (engagementA !== engagementB) {
          return engagementB - engagementA;
        }
        // Fallback to recency
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return sorted;
  }, [filteredActivities, sortBy, viewMode]);

  // Get displayed activities with tier transition markers
  const displayedActivities = useMemo(() => {
    const activities = prioritizedActivities.slice(0, displayedCount);
    
    // Add tier transition markers for network view
    if (viewMode === 'network' && activities.length > 0) {
      const activitiesWithMarkers: FeedItem[] = [];
      let currentTier = '';
      
      activities.forEach((activity, index) => {
        const tierMap = {
          'core_connection': 'core',
          'extended_connection': 'extended', 
          'following': 'following',
          'none': 'discovery'
        };
        
        const activityTier = tierMap[activity.author.connectionType || 'none'] || 'discovery';
        
        // Add tier marker if tier changes
        if (activityTier !== currentTier && index > 0) {
          const tierLabels = {
            'core': { label: 'Core Network', icon: Layers, color: 'bg-blue-50 border-blue-200' },
            'extended': { label: 'Extended Network', icon: Network, color: 'bg-purple-50 border-purple-200' },
            'following': { label: 'Following', icon: Eye, color: 'bg-indigo-50 border-indigo-200' },
            'discovery': { label: 'Professional Discovery', icon: Sparkles, color: 'bg-amber-50 border-amber-200' }
          };
          
          const tierInfo = tierLabels[activityTier as keyof typeof tierLabels];
          if (tierInfo) {
            activitiesWithMarkers.push({
              isTierMarker: true,
              tier: activityTier,
              tierLabel: tierInfo.label,
              tierIcon: tierInfo.icon,
              tierColor: tierInfo.color
            });
          }
        }
        
        currentTier = activityTier;
        activitiesWithMarkers.push(activity);
      });
      
      return activitiesWithMarkers;
    }
    
    return activities;
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

  // Interaction handlers
  const handleAppreciate = (entryId: string) => {
    setAppreciatedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
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

  const handleRechronicle = (entryId: string) => {
    setRechronicledEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
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
    
    return (
      <JournalCard
        key={activity.id}
        journal={journalEntry}
        viewMode={viewMode}
        showMenuButton={false}
        showAnalyticsButton={false}
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