import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { workspaceService } from '../../services/workspace.service';
import {
  Building2,
  Calendar,
  Check,
  Clock,
  Code,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Grid,
  List,
  Lock,
  Mail,
  MoreVertical,
  Paperclip,
  Plus,
  Tag,
  User,
  Users,
  Briefcase,
  FileCode,
  FileImage,
  FileVideo,
  Archive,
  ChevronDown,
  MessageSquare,
  FolderOpen,
  Settings,
  UserPlus,
  Download,
  Share2,
  Eye,
  Heart,
  BarChart3,
  Zap,
  Palette,
  Database,
  Shield,
  Sparkles,
  TrendingUp,
  TrendingDown,
  X,
  ArrowLeft,
  Search,
  Filter,
  Globe,
  DollarSign,
  Star,
  ArrowUpRight,
  ThumbsUp,
  Target,
  Link,
  Megaphone,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import confetti from 'canvas-confetti';
import { useWorkspace, useWorkspaceMembers, useWorkspaceFiles, useUploadFile, useDeleteFile, useUpdateFile, useWorkspaceCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useWorkspace';
import { useToast } from '../../contexts/ToastContext';
import { useJournalEntries, useToggleAppreciate, useRechronicleEntry } from '../../hooks/useJournal';
import { useWorkspaceGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useToggleMilestone, useLinkJournalEntry, Goal, TeamMember as GoalTeamMember, getEffectiveProgress, shouldShowCompletionDialog, useCreateTask, useUpdateTask, useDeleteTask, useCompleteMilestone, useWorkspaceLabels } from '../../hooks/useGoals';
import { migrateStatus, isGoalOverdue } from '../../utils/statusMigration';
import { useQueryClient } from '@tanstack/react-query';
import { useGoalNotifications } from '../../hooks/useGoalNotifications';
import MilestoneGroup from '../../components/MilestoneGroup';
import NetworkPolicySettings from '../../components/workspace/network-policy-settings';
import WorkspaceSettingsPanel from '../../components/workspace/workspace-settings-panel';
import { JournalCard } from '../../components/journal/journal-card';
import JournalEnhanced from '../../components/format7/journal-enhanced';
import { JournalEntry } from '../../types/journal';
import { JournalService } from '../../services/journal.service';
import { NewEntryModal } from '../../components/new-entry/new-entry-modal';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, getAuthToken } from '../../lib/api';
import { GoalCompletionDialog } from '../../components/goals/goal-completion-dialog';
import { GoalStatusWorkflow } from '../../components/GoalStatusWorkflow';
import { UnifiedStatusBar, UnifiedStatusBarMobile } from '../../components/UnifiedStatusBar';
import { GoalProgressDialog } from '../../components/goals/goal-progress-dialog';

// --- TYPES ---

interface EditRecord {
  id: string;
  editedBy: TeamMember;
  editedAt: Date;
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

interface JournalEntryRouterLink {
  journalEntryId: string;
  linkedAt: Date;
  linkedBy: TeamMember;
  contributionType: 'milestone' | 'progress' | 'blocker' | 'update';
  progressContribution: number; // percentage points contributed to goal
}

interface Milestone {
  id: string;
  title: string;
  targetDate: Date;
  completed: boolean;
  completedDate: Date | null;
  completedViaJournalEntry?: string; // journal entry ID that marked this complete
  lastToggleTime?: number; // timestamp to prevent double toggles in StrictMode
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  position: string;
  isOwner?: boolean;
  joinedDate?: string;
  contributions?: number;
  status?: string;
}

// Using Goal interface from useGoals.ts - removed local duplicate

// --- MOCK DATA ---

// Mock journal entries removed - now using API data
const journalEntries_REMOVED = [
  {
    id: "a-001",
    title: "Launched New E-commerce Checkout Flow",
    workspaceId: "clp123456-abcd-4567-8901-abcdef123456", // Example UUID - will be replaced with actual backend ID
    workspaceName: "Q1 Conversion Optimization",
    organizationName: "RetailTech Solutions",
    description: "Redesigned the entire checkout experience resulting in significant conversion improvements.",
    fullContent: "Led a comprehensive redesign of RetailTech's checkout flow, focusing on reducing cart abandonment and improving conversion rates. Implemented a streamlined 3-step process, added guest checkout options, and integrated multiple payment methods including Apple Pay and Google Pay. The new design reduced the number of form fields by 60% and included real-time validation to prevent user errors.",
    abstractContent: "Led a major e-commerce checkout redesign project focused on improving conversion rates. Implemented streamlined user flows, guest checkout options, and modern payment integrations. The project involved extensive user research and A/B testing.",
    createdAt: new Date("2025-06-10T14:30:00"),
    lastModified: new Date("2025-06-10T16:45:00"),
    author: {
      id: "auth-001",
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      position: "Senior UX Designer",
      department: "Product Design",
      organization: "RetailTech Solutions",
      isConnection: true
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
    publishedAt: new Date("2025-06-10T17:00:00"),
    likes: 42,
    comments: 12,
    hasLiked: false,
    tags: ["ux-design", "e-commerce", "conversion", "checkout"],
    category: "Design",
    source: "network",
    connectionType: "direct",
    linkedGoals: [
      {
        goalId: "goal-001",
        goalTitle: "Optimize Conversion Funnel",
        contributionType: "milestone",
        progressContribution: 35,
        linkedAt: new Date("2025-06-10T16:45:00"),
        notes: "Major milestone completion - new checkout flow launched and showing positive results"
      },
      {
        goalId: "goal-002", 
        goalTitle: "Enhance User Experience",
        contributionType: "progress",
        progressContribution: 20,
        linkedAt: new Date("2025-06-10T16:45:00"),
        notes: "Significant UX improvements implemented in checkout process"
      }
    ]
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
      isConnection: false
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
    visibility: "workspace",
    isPublished: false,
    likes: 0,
    comments: 0,
    tags: ["machine-learning", "recommendations", "python", "aws"],
    category: "Engineering",
    source: "workspace"
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
      organization: "TechCorp Solutions"
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
    visibility: "workspace",
    isPublished: false,
    likes: 0,
    comments: 0,
    tags: ["security", "mobile", "audit", "penetration-testing"],
    category: "Security",
    source: "workspace"
  },
  {
    id: "a-004",
    title: "Data Visualization Dashboard for Customer Analytics",
    workspaceId: "product-workspace",
    workspaceName: "Product Team",
    organizationName: "TechCorp Solutions",
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
      isConnection: true
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
    comments: 7,
    hasLiked: true,
    tags: ["data-visualization", "analytics", "react", "d3js"],
    category: "Engineering",
    source: "network",
    connectionType: "direct"
  }
];

// Artifacts are now loaded from API via useWorkspaceFiles hook

// Workspace stats now calculated dynamically from API data

// Goals are now loaded via API

// --- HELPER FUNCTIONS & COMPONENTS ---

// Goal status styling
const getGoalStatusColor = (status: Goal['status']) => {
  switch (status) {
    case 'yet-to-start': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'achieved': return 'bg-green-100 text-green-700 border-green-200';
    case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
    case 'pending-review': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// Goal priority styling
const getGoalPriorityColor = (priority: Goal['priority']) => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-600';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'critical': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

// RACI role styling
const getRACIRoleColor = (role: 'R' | 'A' | 'C' | 'I') => {
  switch (role) {
    case 'R': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'A': return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'C': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'I': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};


// Get goal status display text
const getGoalStatusText = (status: Goal['status']) => {
  switch (status) {
    case 'yet-to-start': return 'Yet to start';
    case 'in-progress': return 'In Progress';
    case 'achieved': return 'Achieved';
    case 'blocked': return 'Blocked';
    case 'pending-review': return 'Pending Review';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

// Goal Card Component
const GoalCard = ({ 
  goal, 
  onToggleMilestone, 
  onViewHistory, 
  onQuickAction, 
  isQuickActionOpen, 
  onQuickUpdateStatus, 
  onQuickUpdatePriority, 
  onDuplicate,
  onEditGoal,
  onLinkedEntries,
  onDeleteGoal,
  onAdjustProgress,
  workspaceLabels,
  workspaceMembers
}: { 
  goal: Goal;
  onToggleMilestone?: (goalId: string, milestoneId: string, coords?: { x: number; y: number }) => void;
  onViewHistory?: () => void;
  onQuickAction?: (goalId: string | null) => void;
  isQuickActionOpen?: boolean;
  onQuickUpdateStatus?: (goalId: string, status: string) => void;
  onQuickUpdatePriority?: (goalId: string, priority: string) => void;
  onDuplicate?: (goalId: string) => void;
  onEditGoal?: (goalId: string) => void;
  onLinkedEntries?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onAdjustProgress?: (goalId: string) => void;
  workspaceLabels?: any[];
  workspaceMembers?: any[];
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hoveredMilestone, setHoveredMilestone] = React.useState<string | null>(null);
  const [milestonesExpanded, setMilestonesExpanded] = React.useState(false);
  const [expandedMilestones, setExpandedMilestones] = React.useState<Set<string>>(new Set());
  
  // Initialize milestone completion mutation
  const completeMilestoneMutation = useCompleteMilestone();
  
  // Initialize task management mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  
  // Initialize goal update mutation for status changes
  const updateGoalMutation = useUpdateGoal();
  
  const isOverdue = isGoalOverdue(goal);
  const hasRecentEdits = goal.editHistory.some(edit => 
    new Date().getTime() - new Date(edit.editedAt).getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
  );

  // Helper function to get milestone status (with fallback for backward compatibility)
  const getMilestoneStatus = (milestone: any) => {
    if (milestone.status) return milestone.status;
    return milestone.completed ? 'completed' : 'incomplete';
  };

  // Helper function to get milestone display
  const getMilestoneDisplay = (milestone: any) => {
    const status = getMilestoneStatus(milestone);
    switch (status) {
      case 'completed': return { icon: '✓', color: 'bg-green-500' };
      case 'partial': return { icon: '◐', color: 'bg-yellow-500' };
      case 'incomplete': return { icon: '○', color: 'bg-gray-300 hover:bg-gray-400' };
      default: return { icon: '○', color: 'bg-gray-300 hover:bg-gray-400' };
    }
  };

  const completedMilestones = goal.milestones.filter(m => getMilestoneStatus(m) === 'completed').length;
  const partialMilestones = goal.milestones.filter(m => getMilestoneStatus(m) === 'partial').length;
  const totalMilestones = goal.milestones.length;
  const daysUntilDue = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Smart status icon based on goal state
  const getStatusIcon = () => {
    if (goal.status === 'completed') return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    if (goal.status === 'blocked') return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    if (goal.status === 'in-progress') return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />;
    return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
  };

  // Smart urgency indicator
  const getUrgencyIndicator = () => {
    if (isOverdue) return { color: 'border-l-red-500', label: 'Overdue', urgent: true };
    if (daysUntilDue !== null && daysUntilDue <= 3) return { color: 'border-l-orange-500', label: `${daysUntilDue}d left`, urgent: true };
    if (daysUntilDue !== null && daysUntilDue <= 7) return { color: 'border-l-yellow-500', label: `${daysUntilDue}d left`, urgent: false };
    return { color: 'border-l-gray-200', label: '', urgent: false };
  };

  const urgency = getUrgencyIndicator();

  return (
    <div 
      className={cn(
        "relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer",
        isExpanded && "shadow-lg ring-2 ring-primary-100",
        goal.status === 'completed' && "border-green-300"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {goal.status === 'completed' && (
        <div className="absolute -top-2 -left-2 bg-green-600 text-white text-[10px] font-semibold px-2 py-1 rounded shadow">
          Completed
        </div>
      )}
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-4">
            {/* Status Indicator & Title */}
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-1">
                {getStatusIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2">
                    {goal.title}
                  </h3>
                  {goal.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-600 text-white">
                      <Check className="h-3 w-3" /> Completed
                    </span>
                  )}
                </div>
                
                {/* Metadata Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
                    getGoalStatusColor(goal.status)
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      goal.status === 'completed' && "bg-green-500",
                      goal.status === 'in-progress' && "bg-blue-500",
                      goal.status === 'blocked' && "bg-red-500",
                      goal.status === 'not-started' && "bg-gray-400"
                    )} />
                    {getGoalStatusText(goal.status)}
                  </span>
                  
                  {/* Priority Badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
                    getGoalPriorityColor(goal.priority)
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      goal.priority === 'critical' && "bg-red-600",
                      goal.priority === 'high' && "bg-orange-600",
                      goal.priority === 'medium' && "bg-yellow-600",
                      goal.priority === 'low' && "bg-green-600"
                    )} />
                    {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                  </span>
                  
                  {/* Due Date */}
                  {goal.targetDate && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                    </span>
                  )}
                  
                  {/* Urgency Badge */}
                  {urgency.urgent && urgency.label && (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
                      isOverdue 
                        ? "bg-red-50 text-red-700 border-red-200" 
                        : "bg-orange-50 text-orange-700 border-orange-200"
                    )}>
                      <Clock className="h-3 w-3" />
                      {urgency.label}
                    </span>
                  )}
                  
                  {/* Category Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700">
                    <Tag className="h-3 w-3" />
                    {goal.category}
                  </span>
                  
                  {/* Assigned To Badge */}
                  {goal.assignedTo ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {goal.assignedTo.avatar ? (
                        <img
                          src={goal.assignedTo.avatar}
                          alt={goal.assignedTo.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-purple-200 flex items-center justify-center text-[10px] font-semibold text-purple-700">
                          {goal.assignedTo.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                        </div>
                      )}
                      <span>Assigned: {goal.assignedTo.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                      <User className="h-3 w-3" />
                      <span>Unassigned</span>
                    </span>
                  )}
                  
                  {/* Reviewer Badge */}
                  {goal.reviewer ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {goal.reviewer.avatar ? (
                        <img
                          src={goal.reviewer.avatar}
                          alt={goal.reviewer.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-semibold text-blue-700">
                          {goal.reviewer.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                        </div>
                      )}
                      <span>Reviewer: {goal.reviewer.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                      <User className="h-3 w-3" />
                      <span>No reviewer</span>
                    </span>
                  )}
                </div>
                
                {/* Alert Badges - Only Recent Updates */}
                {hasRecentEdits && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-blue-700">Recently Updated</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              {/* More Options Button */}
              <div className="relative">
                <button 
                  className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md",
                    isQuickActionOpen && "opacity-100 bg-gray-100"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onQuickAction?.(isQuickActionOpen ? null : goal.id);
                  }}
                  title="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                
                {/* Goal Actions Dropdown */}
                {isQuickActionOpen && (
                  <div 
                    className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                      Goal Actions
                    </div>
                    
                    {/* Simplified Menu - Only 4 Essential Options */}
                    <div className="py-1">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditGoal?.(goal.id);
                        }}
                      >
                        <Edit3 className="h-4 w-4 text-gray-400" />
                        Edit Goal
                      </button>
                      
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onAdjustProgress?.(goal.id);
                        }}
                      >
                        <BarChart3 className="h-4 w-4 text-gray-400" />
                        Adjust Progress
                      </button>
                      
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDuplicate?.(goal.id);
                        }}
                      >
                        <Copy className="h-4 w-4 text-gray-400" />
                        Duplicate Goal
                      </button>
                      
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-red-600"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteGoal?.(goal.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Goal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Milestones & Team Row */}
        <div className="flex items-center justify-between">
          {/* Milestones */}
          {goal.milestones.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {goal.milestones.slice(0, 5).map((milestone) => {
                  const display = getMilestoneDisplay(milestone);
                  const status = getMilestoneStatus(milestone);
                  return (
                    <button
                      key={milestone.id}
                      className={cn(
                        "w-5 h-5 rounded-full transition-all duration-200 hover:scale-110 flex items-center justify-center text-xs font-medium text-white border-2 border-white shadow-sm",
                        display.color
                      )}
                      title={`${milestone.title} (${status})`}
                      onMouseEnter={() => setHoveredMilestone(milestone.id)}
                      onMouseLeave={() => setHoveredMilestone(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMilestone?.(goal.id, milestone.id, { x: e.clientX, y: e.clientY });
                      }}
                    >
                      {display.icon}
                    </button>
                  );
                })}
                {goal.milestones.length > 5 && (
                  <span className="text-xs text-gray-400 ml-1">+{goal.milestones.length - 5}</span>
                )}
              </div>
              <span className="text-xs text-gray-500" title={`${completedMilestones} completed, ${partialMilestones} partial, ${totalMilestones - completedMilestones - partialMilestones} incomplete`}>
                {completedMilestones}
                {partialMilestones > 0 && <span className="text-yellow-600">+{partialMilestones}◐</span>}
                /{totalMilestones}
              </span>
            </div>
          )}

          {/* Team Avatars */}
          <div className="flex items-center gap-1">
            {goal.assignedTo && (
              <RouterLink to={`/profile/${goal.assignedTo.id}`} className="block">
                <div className="w-5 h-5 rounded-full border border-purple-200 hover:border-purple-400 overflow-hidden transition-colors cursor-pointer" title={`Assigned to: ${goal.assignedTo.name}`}>
                  <img 
                    src={goal.assignedTo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(goal.assignedTo.name)}&background=random`} 
                    alt={goal.assignedTo.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(goal.assignedTo.name)}&background=random`;
                    }}
                  />
                </div>
              </RouterLink>
            )}
            {goal.reviewer && (
              <RouterLink to={`/profile/${goal.reviewer.id}`} className="block">
                <div className="w-5 h-5 rounded-full border border-blue-200 hover:border-blue-400 overflow-hidden transition-colors cursor-pointer" title={`Reviewer: ${goal.reviewer.name}`}>
                  <img 
                    src={goal.reviewer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(goal.reviewer.name)}&background=random`} 
                    alt={goal.reviewer.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(goal.reviewer.name)}&background=random`;
                    }}
                  />
                </div>
              </RouterLink>
            )}
            {goal.linkedJournalEntries && goal.linkedJournalEntries.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <MessageSquare className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">{goal.linkedJournalEntries.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Unified Status Bar */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="hidden sm:block">
            <UnifiedStatusBar 
              goal={goal}
              onStatusChange={async (goalId: string, newStatus: Goal['status']) => {
                try {
                  await updateGoalMutation.mutateAsync({ 
                    goalId, 
                    data: { status: newStatus } 
                  });
                } catch (error) {
                  // Error handling is managed by the mutation's onError callback
                  // Re-throw to let the component handle UI states
                  throw error;
                }
              }}
              disabled={updateGoalMutation.isPending}
            />
          </div>
          <div className="sm:hidden">
            <UnifiedStatusBarMobile 
              goal={goal}
              onStatusChange={async (goalId: string, newStatus: Goal['status']) => {
                try {
                  await updateGoalMutation.mutateAsync({ 
                    goalId, 
                    data: { status: newStatus } 
                  });
                } catch (error) {
                  // Error handling is managed by the mutation's onError callback
                  // Re-throw to let the component handle UI states
                  throw error;
                }
              }}
              disabled={updateGoalMutation.isPending}
            />
          </div>
        </div>

        {/* Expand Indicator (only show when collapsed) */}
        {!isExpanded && (
          <div className="flex items-center justify-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>Click to expand</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {goal.description}
              </p>
            </div>

            {/* Milestones Accordion */}
            {/* Monday.com-style Milestone Groups */}
            {goal.milestones.length > 0 && (
              <div className="space-y-3">
                {goal.milestones.map((milestone) => (
                  <MilestoneGroup
                    key={milestone.id}
                    milestone={milestone}
                    goalId={goal.id}
                    workspaceMembers={workspaceMembers?.map(member => ({
                      id: member.user?.id || '',
                      name: member.user?.name || 'Unknown',
                      email: member.user?.email || '',
                      avatar: member.user?.avatar,
                      position: member.user?.title
                    })).filter(member => member.id !== '') || []}
                    workspaceLabels={workspaceLabels}
                    isExpanded={expandedMilestones.has(milestone.id)}
                    onToggleExpanded={() => {
                      const newExpanded = new Set(expandedMilestones);
                      if (newExpanded.has(milestone.id)) {
                        newExpanded.delete(milestone.id);
                      } else {
                        newExpanded.add(milestone.id);
                      }
                      setExpandedMilestones(newExpanded);
                    }}
                    onToggleCompletion={() => {
                      completeMilestoneMutation.mutate({
                        goalId: goal.id,
                        milestoneId: milestone.id,
                        completed: !milestone.completed
                      });
                    }}
                    onCreateTask={(task) => {
                      createTaskMutation.mutate({
                        goalId: goal.id,
                        milestoneId: milestone.id,
                        task
                      });
                    }}
                    onUpdateTask={(taskId, updates) => {
                      // Find the current task to get its completion state
                      const currentTask = milestone.tasks?.find(t => t.id === taskId);
                      const previouslyCompleted = currentTask?.completed || false;
                      
                      updateTaskMutation.mutate({
                        goalId: goal.id,
                        milestoneId: milestone.id,
                        taskId,
                        updates,
                        previouslyCompleted
                      });
                    }}
                    onDeleteTask={(taskId) => {
                      deleteTaskMutation.mutate({
                        goalId: goal.id,
                        milestoneId: milestone.id,
                        taskId
                      });
                    }}
                    updateTaskId={
                      updateTaskMutation.isPending && 
                      updateTaskMutation.variables?.goalId === goal.id &&
                      updateTaskMutation.variables?.milestoneId === milestone.id
                        ? updateTaskMutation.variables?.taskId 
                        : undefined
                    }
                    deleteTaskId={
                      deleteTaskMutation.isPending && 
                      deleteTaskMutation.variables?.goalId === goal.id &&
                      deleteTaskMutation.variables?.milestoneId === milestone.id
                        ? deleteTaskMutation.variables?.taskId 
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {/* Linked Journal Entries */}
            {goal.linkedJournalEntries && goal.linkedJournalEntries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Linked Journal Entries</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {goal.linkedJournalEntries.length} linked
                  </span>
                </div>
                <div className="space-y-2">
                  {goal.linkedJournalEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer group/entry"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to journal entry or open entry modal
                        console.log('Navigate to journal entry:', entry.id);
                      }}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center group-hover/entry:bg-primary-200 transition-all">
                        <FileText className="w-3 h-3 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 font-medium group-hover/entry:text-primary-900 transition-all">
                          {entry.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all",
                            entry.contributionType === 'milestone' && "bg-green-50 text-green-700 group-hover/entry:bg-green-100",
                            entry.contributionType === 'progress' && "bg-blue-50 text-blue-700 group-hover/entry:bg-blue-100",
                            entry.contributionType === 'blocker' && "bg-red-50 text-red-700 group-hover/entry:bg-red-100",
                            entry.contributionType === 'update' && "bg-gray-50 text-gray-700 group-hover/entry:bg-gray-100"
                          )}>
                            {entry.contributionType}
                          </span>
                          {entry.progressContribution > 0 && (
                            <span className="text-xs text-gray-500 group-hover/entry:text-gray-600">
                              +{entry.progressContribution}% progress
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {format(new Date(entry.linkedAt), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover/entry:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Completion Notes (if any) */}
            {goal.completionNotes && goal.completionNotes.trim() && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Completion Summary</span>
                </div>
                <div className="relative overflow-hidden rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(16,185,129,0.15) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                  <div className="relative p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{goal.completionNotes}</p>
                        <div className="mt-2 text-xs text-gray-500">Marked complete • Great job finishing this goal</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              {/* Category tag moved to top metadata row with other badges */}
              {/* Removed bottom action buttons - moved to Quick Actions dropdown */}
            </div>
            
            {/* Collapse Button at Bottom */}
            <div className="flex items-center justify-center pt-4 border-t border-gray-200">
              <button
                className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <span>Click to collapse</span>
                <ChevronDown className="h-3 w-3 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Goal List Item Component (for list view)
const GoalListItem = ({ 
  goal, 
  onToggleMilestone, 
  onViewHistory, 
  onQuickAction, 
  isQuickActionOpen, 
  onQuickUpdateStatus, 
  onQuickUpdatePriority, 
  onDuplicate,
  onEditGoal,
  onLinkedEntries
}: { 
  goal: Goal;
  onToggleMilestone?: (goalId: string, milestoneId: string, coords?: { x: number; y: number }) => void;
  onViewHistory?: () => void;
  onQuickAction?: (goalId: string | null) => void;
  isQuickActionOpen?: boolean;
  onQuickUpdateStatus?: (goalId: string, status: string) => void;
  onQuickUpdatePriority?: (goalId: string, priority: string) => void;
  onDuplicate?: (goalId: string) => void;
  onEditGoal?: (goalId: string) => void;
  onLinkedEntries?: (goalId: string) => void;
}) => {
  const isOverdue = isGoalOverdue(goal);
  const hasRecentEdits = goal.editHistory.some(edit => 
    new Date().getTime() - new Date(edit.editedAt).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn("group rounded-lg p-4 hover:shadow-md transition-all border bg-white", goal.status === 'completed' ? "border-green-300" : "border-gray-200")}>
      <div className="flex items-center justify-between">
        {/* Left section: Priority, Title, and Status */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Priority indicator */}
          <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getPriorityColor(goal.priority))} />
          
          {/* Title and meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">{goal.title}</h3>
              {goal.status === 'completed' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-600 text-white flex-shrink-0">Completed</span>
              )}
              {hasRecentEdits && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex-shrink-0">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                  Updated
                </span>
              )}
              {isOverdue && goal.status !== 'completed' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 flex-shrink-0">
                  Overdue
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full", getStatusColor(goal.status).split(' ')[0])} />
                {goal.status.replace('-', ' ')}
              </span>
              <span>{goal.category}</span>
              {goal.targetDate && (
                <span>{format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Middle section: Progress bar */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0 mx-6">
          <div className="w-24">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{goal.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all", goal.status === 'completed' ? "bg-green-500" : "bg-primary-500")}
                style={{ width: `${goal.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right section: Avatars and actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Team Avatars */}
          <div className="flex items-center gap-1">
            {goal.assignedTo && (
              <RouterLink to={`/profile/${goal.assignedTo.id}`}>
                <img 
                  src={goal.assignedTo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(goal.assignedTo.name)}&background=random`} 
                  alt={goal.assignedTo.name}
                  className="w-6 h-6 rounded-full border-2 border-white hover:border-purple-300 transition-colors cursor-pointer"
                  title={`Assigned to: ${goal.assignedTo.name}`}
                />
              </RouterLink>
            )}
            {goal.reviewer && (
              <RouterLink to={`/profile/${goal.reviewer.id}`}>
                <img 
                  src={goal.reviewer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(goal.reviewer.name)}&background=random`} 
                  alt={goal.reviewer.name}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 border-white hover:border-blue-300 transition-colors cursor-pointer",
                    goal.assignedTo && "-ml-1"
                  )}
                  title={`Reviewer: ${goal.reviewer.name}`}
                />
              </RouterLink>
            )}
          </div>

          {/* Journal entries count */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MessageSquare className="h-3 w-3" />
            <span>{goal.linkedJournalEntries.length}</span>
            {goal.linkedJournalEntries.length > 0 && (
              <div className="ml-1 flex items-center gap-0.5">
                {goal.linkedJournalEntries.slice(0, 2).map((link) => (
                  <div
                    key={link.journalEntryId}
                    className="w-1 h-1 rounded-full bg-primary-500"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick Actions Button */}
            <button 
              className={cn(
                "p-1 text-gray-400 hover:text-gray-600 rounded transition-colors",
                isQuickActionOpen && "bg-gray-100 text-gray-600"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction?.(isQuickActionOpen ? null : goal.id);
              }}
              title="Quick actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {goal.editHistory.length > 0 && (
              <button 
                className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                onClick={() => onViewHistory?.()}
                title="View edit history"
              >
                History ({goal.editHistory.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile progress bar */}
      <div className="sm:hidden mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{goal.progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-500 h-2 rounded-full transition-all"
            style={{ width: `${goal.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Quick Actions Dropdown for List View */}
      {isQuickActionOpen && (
        <div className="absolute right-4 top-12 z-20 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
            Quick Actions
          </div>
          
          {/* Milestone Actions */}
          {goal.milestones.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-400">Milestones</div>
              {goal.milestones.map(milestone => {
                const display = getMilestoneDisplay(milestone);
                const status = getMilestoneStatus(milestone);
                return (
                  <button
                    key={milestone.id}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMilestone?.(goal.id, milestone.id, { x: e.clientX, y: e.clientY });
                    }}
                  >
                    <span>{display.icon} {milestone.title}</span>
                    <span className="text-xs text-gray-400 capitalize">{status}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Goal Actions */}
          <div className={cn("py-1", goal.milestones.length > 0 && "border-t border-gray-100")}>
            <div className="px-3 py-1 text-xs font-medium text-gray-400">Goal</div>
            {goal.status !== 'completed' && (
              <button
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickUpdateStatus?.(goal.id, 'completed');
                }}
              >
                Mark Goal as Accomplished
              </button>
            )}
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEditGoal?.(goal.id);
              }}
            >
              Edit Goal
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onLinkedEntries?.(goal.id);
              }}
            >
              View/Edit Linked Entries
            </button>
          </div>
          
          {/* Status Updates */}
          <div className="py-1 border-t border-gray-100">
            <div className="px-3 py-1 text-xs font-medium text-gray-400">Change Status</div>
            {['in-progress', 'blocked', 'cancelled'].filter(status => status !== goal.status).map(status => (
              <button
                key={status}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickUpdateStatus?.(goal.id, status);
                }}
              >
                Mark as {status.replace('-', ' ')}
              </button>
            ))}
          </div>
          
          {/* Priority Updates */}
          <div className="py-1 border-t border-gray-100">
            <div className="px-3 py-1 text-xs font-medium text-gray-400">Change Priority</div>
            {['critical', 'high', 'medium', 'low'].filter(priority => priority !== goal.priority).map(priority => (
              <button
                key={priority}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickUpdatePriority?.(goal.id, priority);
                }}
              >
                Set {priority} priority
              </button>
            ))}
          </div>
          
          {/* Other Actions */}
          <div className="py-1 border-t border-gray-100">
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(goal.id);
              }}
            >
              Duplicate goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add/Edit Goal Side Panel Component
const GoalSidePanel = ({ 
  isOpen, 
  onClose, 
  goal, 
  teamMembers, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal?: Goal;
  teamMembers?: TeamMember[];
  onSave?: (goalData: any) => void;
}) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || 'Product',
    priority: goal?.priority || 'medium',
    status: goal?.status ? migrateStatus(goal.status) : 'yet-to-start',
    targetDate: goal?.targetDate ? format(new Date(goal.targetDate), 'yyyy-MM-dd') : '',
    assignedTo: goal?.assignedTo || teamMembers?.[0] || null,
    reviewer: goal?.reviewer || null,
    milestones: goal?.milestones || [],
    tags: goal?.tags || []
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [newMilestone, setNewMilestone] = useState({ 
    title: '', 
    targetDate: ''
  });
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState({ title: '', targetDate: '' });
  const [tagInput, setTagInput] = useState('');
  const [showTemplateSection, setShowTemplateSection] = useState(false);

  const categories = ['Product', 'Marketing', 'Engineering', 'Security', 'Operations', 'Design'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const statuses: Goal['status'][] = ['yet-to-start', 'in-progress', 'blocked', 'pending-review', 'achieved', 'cancelled'];

  const goalTemplates = [
    {
      id: 'product-launch',
      title: 'Product Launch',
      description: 'Launch a new product or feature',
      category: 'Product',
      priority: 'high',
      icon: <Star className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-600',
      milestones: [
        { title: 'Market Research Complete', targetDate: null },
        { title: 'MVP Development', targetDate: null },
        { title: 'Beta Testing', targetDate: null },
        { title: 'Launch Campaign', targetDate: null }
      ]
    },
    {
      id: 'marketing-campaign',
      title: 'Marketing Campaign',
      description: 'Execute a comprehensive marketing campaign',
      category: 'Marketing',
      priority: 'medium',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-green-100 text-green-600',
      milestones: [
        { title: 'Campaign Strategy', targetDate: null },
        { title: 'Content Creation', targetDate: null },
        { title: 'Campaign Launch', targetDate: null },
        { title: 'Performance Analysis', targetDate: null }
      ]
    },
    {
      id: 'security-audit',
      title: 'Security Audit',
      description: 'Conduct comprehensive security assessment',
      category: 'Security',
      priority: 'critical',
      icon: <Shield className="h-6 w-6" />,
      color: 'bg-red-100 text-red-600',
      milestones: [
        { title: 'Vulnerability Assessment', targetDate: null },
        { title: 'Penetration Testing', targetDate: null },
        { title: 'Report Generation', targetDate: null },
        { title: 'Remediation Plan', targetDate: null }
      ]
    },
    {
      id: 'team-training',
      title: 'Team Training Program',
      description: 'Implement comprehensive team training initiative',
      category: 'Operations',
      priority: 'medium',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600',
      milestones: [
        { title: 'Training Needs Assessment', targetDate: null },
        { title: 'Curriculum Development', targetDate: null },
        { title: 'Training Delivery', targetDate: null },
        { title: 'Skills Assessment', targetDate: null }
      ]
    },
    {
      id: 'ui-redesign',
      title: 'UI/UX Redesign',
      description: 'Redesign user interface for better user experience',
      category: 'Design',
      priority: 'medium',
      icon: <Palette className="h-6 w-6" />,
      color: 'bg-indigo-100 text-indigo-600',
      milestones: [
        { title: 'User Research', targetDate: null },
        { title: 'Design System', targetDate: null },
        { title: 'Prototype Creation', targetDate: null },
        { title: 'Implementation', targetDate: null }
      ]
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure Upgrade',
      description: 'Upgrade and modernize infrastructure',
      category: 'Engineering',
      priority: 'high',
      icon: <Database className="h-6 w-6" />,
      color: 'bg-orange-100 text-orange-600',
      milestones: [
        { title: 'Infrastructure Audit', targetDate: null },
        { title: 'Migration Planning', targetDate: null },
        { title: 'System Migration', targetDate: null },
        { title: 'Performance Testing', targetDate: null }
      ]
    }
  ];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Product',
      priority: 'medium',
      status: 'yet-to-start',
      targetDate: '',
      assignedTo: teamMembers.find(m => m.id === currentUser?.id) || teamMembers[0] || null,
      reviewer: null,
      milestones: [],
      tags: []
    });
    setCurrentStep(1);
    setNewMilestone({ title: '', targetDate: '' });
    setTagInput('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTemplateSelect = (template: any) => {
    const now = new Date();
    const targetDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    
    setFormData({
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      status: 'yet-to-start',
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      assignedTo: teamMembers?.[0] || null,
      reviewer: null,
      milestones: template.milestones.map((milestone: any, index: number) => ({
        id: `milestone-${Date.now()}-${index}`,
        title: milestone.title,
        targetDate: milestone.targetDate ? new Date(milestone.targetDate) : targetDate,
        completed: false,
        completedDate: null
      })),
      tags: [template.category.toLowerCase()]
    });
    setCurrentStep(1);
    setShowTemplateSection(false);
  };

  const addMilestone = () => {
    if (newMilestone.title && newMilestone.targetDate) {
      const milestone: Milestone = {
        id: `milestone-${Date.now()}`,
        title: newMilestone.title,
        targetDate: new Date(newMilestone.targetDate),
        completed: false,
        completedDate: null,
        tasks: []
      };
      setFormData(prev => ({
        ...prev,
        milestones: [...prev.milestones, milestone]
      }));
      setNewMilestone({ title: '', targetDate: '' });
    }
  };


  const removeMilestone = (id: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id)
    }));
  };

  const startEditingMilestone = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setEditingMilestone({
      title: milestone.title,
      targetDate: format(new Date(milestone.targetDate), 'yyyy-MM-dd')
    });
  };

  const saveEditingMilestone = () => {
    if (!editingMilestoneId || !editingMilestone.title || !editingMilestone.targetDate) return;
    
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === editingMilestoneId 
          ? { ...m, title: editingMilestone.title, targetDate: new Date(editingMilestone.targetDate) }
          : m
      )
    }));
    setEditingMilestoneId(null);
    setEditingMilestone({ title: '', targetDate: '' });
  };

  const cancelEditingMilestone = () => {
    setEditingMilestoneId(null);
    setEditingMilestone({ title: '', targetDate: '' });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleAssignedToChange = (member: TeamMember | null) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: member
    }));
  };

  const handleReviewerChange = (member: TeamMember | null) => {
    setFormData(prev => ({
      ...prev,
      reviewer: member
    }));
  };

  const handleSave = () => {
    // Validation
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      alert('Description is required');
      return;
    }
    
    // Create edit records for changed fields
    const editRecords: EditRecord[] = [];
    const currentUserTeamMember = teamMembers.find(m => m.id === currentUser?.id) || teamMembers[0];
    const now = new Date();
    
    if (goal) {
      // Track changes for existing goal
      const changes = [
        { field: 'title', old: goal.title, new: formData.title },
        { field: 'description', old: goal.description, new: formData.description },
        { field: 'category', old: goal.category, new: formData.category },
        { field: 'priority', old: goal.priority, new: formData.priority },
        { field: 'status', old: goal.status, new: formData.status },
        { field: 'targetDate', old: goal.targetDate, new: formData.targetDate ? new Date(formData.targetDate) : null },
        { field: 'assignedTo', old: goal.assignedTo?.id, new: formData.assignedTo?.id },
        { field: 'reviewer', old: goal.reviewer?.id, new: formData.reviewer?.id },
        { field: 'milestones', old: goal.milestones.length, new: formData.milestones.length },
        { field: 'tags', old: goal.tags.sort(), new: formData.tags.sort() }
      ];
      
      changes.forEach(change => {
        const oldValue = Array.isArray(change.old) ? change.old.join(',') : String(change.old || '');
        const newValue = Array.isArray(change.new) ? change.new.join(',') : String(change.new || '');
        
        if (oldValue !== newValue) {
          editRecords.push({
            id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            editedBy: currentUserTeamMember,
            editedAt: now,
            field: change.field,
            oldValue: change.old,
            newValue: change.new,
            reason: getEditReason(change.field, change.old, change.new)
          });
        }
      });
      
      // Update existing goal with edit history
      const updatedGoal = {
        ...goal,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
        assignedTo: formData.assignedTo,
        reviewer: formData.reviewer,
        milestones: formData.milestones,
        tags: formData.tags,
        lastUpdated: now,
        editHistory: [...goal.editHistory, ...editRecords]
      };
      onSave?.(updatedGoal);
    } else {
      // Create new goal
      const newGoal: Goal = {
        id: `goal-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        status: formData.status as any,
        priority: formData.priority as any,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
        createdDate: now,
        createdBy: currentUser,
        lastUpdated: now,
        editHistory: [{
          id: `edit-${Date.now()}`,
          editedBy: currentUser,
          editedAt: now,
          field: 'created',
          oldValue: null,
          newValue: 'Goal created',
          reason: 'Initial goal creation'
        }],
        assignedTo: formData.assignedTo,
        reviewer: formData.reviewer,
        progressPercentage: 0,
        linkedJournalEntries: [],
        milestones: formData.milestones,
        tags: formData.tags,
        category: formData.category
      };
      
      onSave?.(newGoal);
    }
    
    console.log('Saving goal with edit tracking:', formData);
    handleClose();
  };
  
  // Helper function to generate user-friendly edit reasons
  const getEditReason = (field: string, oldValue: any, newValue: any): string => {
    switch (field) {
      case 'title':
        return `Title changed from "${oldValue}" to "${newValue}"`;
      case 'description':
        return 'Goal description updated';
      case 'status':
        return `Status changed from ${oldValue} to ${newValue}`;
      case 'priority':
        return `Priority changed from ${oldValue} to ${newValue}`;
      case 'targetDate':
        return oldValue ? (newValue ? 'Target date updated' : 'Target date removed') : 'Target date added';
      case 'category':
        return `Category changed from ${oldValue} to ${newValue}`;
      case 'responsible':
      case 'consulted':
      case 'informed':
        return `${field} team members updated`;
      case 'accountable':
        return 'Accountable person changed';
      case 'milestones':
        return 'Milestones updated';
      case 'tags':
        return 'Tags updated';
      default:
        return `${field} updated`;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-xl border-l border-gray-200 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {goal ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {goal ? 'Update goal details and assignments' : 'Define objectives and assign responsibilities'}
              </p>
              {!goal && (
                <button
                  onClick={() => setShowTemplateSection(!showTemplateSection)}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  {showTemplateSection ? 'Hide templates' : 'Use a template'}
                </button>
              )}
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-center p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              {[1, 2].map((step) => (
                <button
                  key={step}
                  onClick={() => setCurrentStep(step)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentStep === step
                      ? "bg-primary-500 text-white"
                      : currentStep > step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  )}
                >
                  {currentStep > step ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Template Selection Section */}
          {!goal && showTemplateSection && (
            <div className="border-b border-gray-200 bg-gray-50 p-4">
              <div className="mb-3">
                <h3 className="text-lg font-medium text-gray-900 mb-1">Choose a Template</h3>
                <p className="text-sm text-gray-600">Start with a proven template to accelerate goal creation</p>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {goalTemplates.map((template) => (
                  <div 
                    key={template.id} 
                    className="group border border-gray-200 rounded-lg p-3 hover:bg-white hover:shadow-sm transition-all cursor-pointer bg-white/50"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md flex-shrink-0", template.color)}>
                        <div className="w-4 h-4">
                          {template.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{template.title}</h4>
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ml-2",
                            template.priority === 'critical' ? 'bg-red-100 text-red-700' :
                            template.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          )}>
                            {template.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{template.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{template.category}</span>
                          <span className="text-xs text-gray-500">{template.milestones.length} milestones</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 text-center">
                <button
                  onClick={() => setShowTemplateSection(false)}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Skip templates and create from scratch
                </button>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter goal title..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the goal, its purpose, and expected outcomes..."
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Goal['priority'] }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                        >
                          {priorities.map(priority => (
                            <option key={priority} value={priority}>
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {goal && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Goal['status'] }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                        >
                          {statuses.map(status => (
                            <option key={status} value={status}>
                              {getGoalStatusText(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Timeline & Milestones */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Team Assignment & Timeline</h3>
                  
                  <div className="space-y-4">
                    {/* Team Assignment Section */}
                    <div className="space-y-4">
                      {/* Assigned To */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assigned to <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-2">(Primary person responsible for this goal)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => handleAssignedToChange(member)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                                formData.assignedTo?.id === member.id
                                  ? "border-primary-300 bg-primary-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <img 
                                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
                                alt={member.name} 
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.position}</p>
                              </div>
                              {formData.assignedTo?.id === member.id && (
                                <div className="ml-auto">
                                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reviewer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reviewer
                          <span className="text-xs text-gray-500 ml-2">(Optional - Person who reviews progress and completion)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {/* None Option */}
                          <button
                            onClick={() => handleReviewerChange(null)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                              !formData.reviewer
                                ? "border-gray-400 bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">No Reviewer</p>
                              <p className="text-xs text-gray-400">Self-managed goal</p>
                            </div>
                            {!formData.reviewer && (
                              <div className="ml-auto">
                                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </button>
                          {teamMembers.filter(member => member.id !== formData.assignedTo?.id).map((member) => (
                            <button
                              key={member.id}
                              onClick={() => handleReviewerChange(member)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                                formData.reviewer?.id === member.id
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <img 
                                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
                                alt={member.name} 
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.position}</p>
                              </div>
                              {formData.reviewer?.id === member.id && (
                                <div className="ml-auto">
                                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Milestones</label>
                      
                      {/* Add Milestone */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="space-y-4">
                          {/* Milestone Basic Info */}
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Milestone title..."
                              value={newMilestone.title}
                              onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                            />
                            <input
                              type="date"
                              value={newMilestone.targetDate}
                              onChange={(e) => setNewMilestone(prev => ({ ...prev, targetDate: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                            />
                          </div>


                          {/* Add Milestone Button */}
                          <div className="flex justify-end pt-2 border-t border-gray-200">
                            <Button
                              onClick={addMilestone}
                              size="sm"
                              disabled={!newMilestone.title || !newMilestone.targetDate}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Milestone
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Milestone List */}
                      <div className="space-y-2">
                        {formData.milestones.map((milestone) => (
                          <div key={milestone.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                            {editingMilestoneId === milestone.id ? (
                              /* Editing Mode */
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={editingMilestone.title}
                                  onChange={(e) => setEditingMilestone(prev => ({ ...prev, title: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                                  placeholder="Milestone title..."
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="date"
                                    value={editingMilestone.targetDate}
                                    onChange={(e) => setEditingMilestone(prev => ({ ...prev, targetDate: e.target.value }))}
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                                  />
                                  <Button
                                    onClick={saveEditingMilestone}
                                    size="sm"
                                    disabled={!editingMilestone.title || !editingMilestone.targetDate}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    onClick={cancelEditingMilestone}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Display Mode */
                              <div className="flex items-center justify-between">
                                <div className="flex-1 cursor-pointer" onClick={() => startEditingMilestone(milestone)}>
                                  <p className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors">{milestone.title}</p>
                                  <p className="text-xs text-gray-500">
                                    Due: {format(new Date(milestone.targetDate), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEditingMilestone(milestone)}
                                    className="text-gray-400 hover:text-primary-500 p-1 rounded transition-colors"
                                    title="Edit milestone"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => removeMilestone(milestone.id)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                    title="Delete milestone"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {currentStep < 2 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600">
                  {goal ? 'Update Goal' : 'Create Goal'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const getArtefactIcon = (type: string) => {
  switch (type) {
    case 'Design': return <Palette className="h-5 w-5" />;
    case 'Code': return <Code className="h-5 w-5" />;
    case 'Product Document': return <Briefcase className="h-5 w-5" />;
    case 'Business Document': return <BarChart3 className="h-5 w-5" />;
    case 'Process Document': return <Zap className="h-5 w-5" />;
    case 'Meeting Notes': return <Users className="h-5 w-5" />;
    case 'Research': return <Search className="h-5 w-5" />;
    case 'Analytics & Reports': return <TrendingUp className="h-5 w-5" />;
    case 'Presentations': return <ExternalLink className="h-5 w-5" />;
    case 'Learning & Development': return <Star className="h-5 w-5" />;
    case 'Marketing Materials': return <Megaphone className="h-5 w-5" />;
    case 'Technical Documentation': return <FileText className="h-5 w-5" />;
    default: return <Archive className="h-5 w-5" />;
  }
};

const getArtefactColor = (type: string) => {
  switch (type) {
    case 'Design': return 'bg-purple-100 text-purple-600 border-purple-200';
    case 'Code': return 'bg-green-100 text-green-600 border-green-200';
    case 'Product Document': return 'bg-blue-100 text-blue-600 border-blue-200';
    case 'Business Document': return 'bg-orange-100 text-orange-600 border-orange-200';
    case 'Process Document': return 'bg-red-100 text-red-600 border-red-200';
    case 'Meeting Notes': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
    case 'Research': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
    case 'Analytics & Reports': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    case 'Presentations': return 'bg-rose-100 text-rose-600 border-rose-200';
    case 'Learning & Development': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    case 'Marketing Materials': return 'bg-pink-100 text-pink-600 border-pink-200';
    case 'Technical Documentation': return 'bg-slate-100 text-slate-600 border-slate-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

// Helper function to handle artifact download
const handleArtifactDownload = (artifact: any) => {
  console.log('🔗 Downloading artifact:', {
    name: artifact.name,
    url: artifact.url,
    isExternalLink: artifact.isExternalLink,
    type: artifact.type
  });

  if (!artifact.url) {
    console.error('❌ No URL available for artifact:', artifact.name);
    alert('Download URL not available for this artifact');
    return;
  }

  if (artifact.isExternalLink) {
    // For external links, open in new tab/window
    console.log('🌐 Opening external link:', artifact.url);
    window.open(artifact.url, '_blank');
  } else {
    // For uploaded files (including artifacts from journal entries), trigger download
    console.log('⬇️ Triggering download for:', artifact.url);
    
    // Check if this is an API endpoint that needs authentication
    if (artifact.url.includes('/api/') || artifact.url.includes('/files/')) {
      // For API downloads, use fetch with authentication
      console.log('🔐 API download detected, using authenticated fetch');
      
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No auth token available for download');
        alert('Authentication required for download');
        return;
      }
      
      fetch(artifact.url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = artifact.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('❌ Download failed:', error);
        alert(`Download failed: ${error.message}`);
      });
    } else {
      // For direct file URLs, use simple download
      let downloadUrl = artifact.url;
      if (downloadUrl.startsWith('/')) {
        downloadUrl = `${window.location.origin}${downloadUrl}`;
        console.log('🔧 Made URL absolute:', downloadUrl);
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = artifact.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

// Helper function to get the appropriate action button text
const getArtifactActionText = (artifact: any) => {
  if (artifact.isExternalLink) {
    return 'Open Link';
  } else {
    return 'Download';
  }
};

// Helper function to get the appropriate action icon
const getArtifactActionIcon = (artifact: any) => {
  if (artifact.isExternalLink) {
    return <ExternalLink className="h-4 w-4" />;
  } else {
    return <Download className="h-4 w-4" />;
  }
};

const getJournalIcon = (type: string) => {
  switch (type) {
    case 'milestone': return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'announcement': return <Sparkles className="h-4 w-4 text-blue-500" />;
    default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
  }
};

// Convert workspace journal entry to JournalEntry format
const convertWorkspaceEntryToJournal = (entry: any): JournalEntry => {
  return {
    id: entry.id,
    title: entry.title,
    workspaceId: entry.workspaceId,
    workspaceName: entry.workspaceName,
    organizationName: entry.organizationName,
    description: entry.description,
    fullContent: entry.fullContent,
    abstractContent: entry.abstractContent || entry.fullContent,
    createdAt: entry.createdAt,
    lastModified: entry.lastModified,
    author: {
      name: entry.author.name,
      avatar: entry.author.avatar,
      position: entry.author.position
    },
    collaborators: entry.collaborators || [],
    reviewers: entry.reviewers || [],
    artifacts: entry.artifacts || [],
    skills: entry.skills || [],
    outcomes: entry.outcomes || [],
    visibility: entry.visibility,
    isPublished: entry.isPublished,
    publishedAt: entry.publishedAt,
    likes: entry.likes,
    comments: entry.comments,
    hasLiked: entry.hasLiked,
    tags: entry.tags || [],
    category: entry.category,
    appreciates: entry.likes, // Map likes to appreciates
    hasAppreciated: entry.hasLiked,
    discussCount: entry.comments,
    discussions: [], // We'll need to populate this based on workspace comments
    rechronicles: 0, // Workspace entries don't have rechronicles
    hasReChronicled: false,
    analytics: {
      viewCount: Math.floor(Math.random() * 1000) + 100, // Generate random analytics
      averageReadTime: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      engagementTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
      trendPercentage: Math.floor(Math.random() * 50) - 25 // -25 to +25
    },
    linkedGoals: entry.linkedGoals || [],
    format7Data: entry.format7Data
  };
};

// Invite Team Member Side Panel Component
const InviteTeamMemberSidePanel = ({ 
  isOpen, 
  onClose,
  workspaceId 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  workspaceId: string | undefined; 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Editor',
    message: '',
    permissions: {
      canEdit: true,
      canComment: true,
      canInvite: true,
      canManageSettings: false
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showPermissions, setShowPermissions] = useState(false);

  const roles = [
    { 
      value: 'Admin', 
      label: 'Admin', 
      description: 'Full access to workspace and settings',
      icon: <Shield className="h-4 w-4" />,
      color: 'text-red-600'
    },
    { 
      value: 'Editor', 
      label: 'Editor', 
      description: 'Can view, edit, and manage content',
      icon: <User className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    { 
      value: 'Viewer', 
      label: 'Viewer', 
      description: 'Can view and comment on content',
      icon: <Eye className="h-4 w-4" />,
      color: 'text-gray-600'
    }
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Editor',
      message: '',
      permissions: {
        canEdit: true,
        canComment: true,
        canInvite: true,
        canManageSettings: false
      }
    });
    setCurrentStep(1);
    setShowPermissions(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendInvitation = async () => {
    // Validation
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    
    try {
      if (!workspaceId) {
        alert('Workspace ID not found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role.toLowerCase(),
          message: formData.message,
          permissions: formData.permissions
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Invitation sent successfully to ${formData.email}!${result.data.hasExistingAccount ? ' They will also receive a notification.' : ' They will receive an email.'}`);
        handleClose();
      } else {
        alert(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  };

  const updatePermissionsBasedOnRole = (role: string) => {
    let permissions = { ...formData.permissions };
    
    switch (role) {
      case 'Admin':
        permissions = {
          canEdit: true,
          canComment: true,
          canInvite: true,
          canManageSettings: true
        };
        break;
      case 'Editor':
        permissions = {
          canEdit: true,
          canComment: true,
          canInvite: true,
          canManageSettings: false
        };
        break;
      case 'Viewer':
        permissions = {
          canEdit: false,
          canComment: true,
          canInvite: false,
          canManageSettings: false
        };
        break;
    }
    
    setFormData(prev => ({ ...prev, role, permissions }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Invite Team Member
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add a new member to your workspace
              </p>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-center p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              {[1, 2].map((step) => (
                <button
                  key={step}
                  onClick={() => setCurrentStep(step)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentStep === step
                      ? "bg-primary-500 text-white"
                      : currentStep > step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  )}
                >
                  {currentStep > step ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Member Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="name@company.com"
                          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Personal Message (Optional)
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Add a personal message to the invitation..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Role & Permissions */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Permissions</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Role
                      </label>
                      <div className="space-y-2">
                        {roles.map((role) => (
                          <button
                            key={role.value}
                            onClick={() => updatePermissionsBasedOnRole(role.value)}
                            className={cn(
                              "w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left",
                              formData.role === role.value
                                ? "border-primary-300 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <div className={cn("mt-0.5", role.color)}>
                              {role.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{role.label}</h4>
                                {formData.role === role.value && (
                                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Permissions Toggle */}
                    <div className="border-t border-gray-200 pt-4">
                      <button
                        onClick={() => setShowPermissions(!showPermissions)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          Customize Permissions
                        </span>
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 text-gray-500 transition-transform",
                            showPermissions && "rotate-180"
                          )} 
                        />
                      </button>
                      
                      {showPermissions && (
                        <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-4">
                          {[
                            { key: 'canEdit', label: 'Can edit content', description: 'Allows editing articles, files, and goals' },
                            { key: 'canComment', label: 'Can comment', description: 'Allows commenting on content' },
                            { key: 'canInvite', label: 'Can invite members', description: 'Allows inviting new team members' },
                            { key: 'canManageSettings', label: 'Can manage settings', description: 'Allows changing workspace settings' }
                          ].map((permission) => (
                            <div key={permission.key} className="flex items-start gap-3">
                              <button
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [permission.key]: !prev.permissions[permission.key as keyof typeof prev.permissions]
                                  }
                                }))}
                                className={cn(
                                  "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                  formData.permissions[permission.key as keyof typeof formData.permissions]
                                    ? "bg-primary-500 border-primary-500"
                                    : "border-gray-300 hover:border-gray-400"
                                )}
                              >
                                {formData.permissions[permission.key as keyof typeof formData.permissions] && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{permission.label}</p>
                                <p className="text-xs text-gray-600">{permission.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                
                {currentStep < 2 ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!formData.email.trim() || !formData.name.trim()}
                  >
                    Next
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendInvitation}
                    disabled={!formData.email.trim() || !formData.name.trim()}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


const EditFileSidePanel = ({ 
  isOpen, 
  onClose,
  file,
  workspaceId,
  availableCategories 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  file: any;
  workspaceId: string;
  availableCategories: string[];
}) => {
  const [name, setName] = useState(file?.name || '');
  const [description, setDescription] = useState(file?.description || '');
  const [category, setCategory] = useState('');
  const updateFileMutation = useUpdateFile();
  const toast = useToast();

  React.useEffect(() => {
    if (file) {
      setName(file.name || '');
      setDescription(file.description || '');
      // Ensure the file's category is selected if it exists in available categories
      if (file.category && availableCategories.includes(file.category)) {
        setCategory(file.category);
      } else if (availableCategories.length > 0) {
        setCategory(availableCategories[0]);
      } else {
        setCategory('Design');
      }
    }
  }, [file, availableCategories]);

  const handleUpdate = async () => {
    if (!file) return;
    
    try {
      await updateFileMutation.mutateAsync({
        workspaceId,
        fileId: file.id,
        name,
        description,
        category
      });
      
      toast.success('File updated successfully!', `"${name}" has been updated with your changes.`);
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update file', 'Please try again or check your connection.');
    }
  };

  if (!isOpen || !file) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit File</h2>
              <p className="text-sm text-gray-500 mt-1">Update file information and metadata</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                    <p className="text-xs text-gray-500">{file.size} bytes • {file.mimeType}</p>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter display name for this file"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                />
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this file..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="bg-primary-500 hover:bg-primary-600" 
              disabled={updateFileMutation.isPending}
              onClick={handleUpdate}
            >
              {updateFileMutation.isPending ? 'Updating...' : 'Update File'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

const CreateCategorySidePanel = ({ 
  isOpen, 
  onClose,
  workspaceId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  workspaceId: string;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const updateCategoryMutation = useUpdateCategory();
  const { data: workspaceCategories } = useWorkspaceCategories(workspaceId);
  const toast = useToast();

  const handleCreateCategory = async () => {
    if (!name.trim()) {
      toast.error('Category name is required', 'Please enter a name for the category.');
      return;
    }

    try {
      const categoryData = {
        workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        color
      };
      console.log('Creating category with data:', categoryData);
      await createCategoryMutation.mutateAsync(categoryData);
      
      // Reset form
      setName('');
      setDescription('');
      setColor('#3B82F6');
      
      toast.success('Category created successfully!', `"${name.trim()}" has been added to your workspace.`);
      onClose();
    } catch (error) {
      console.error('Create category error:', error);
      // Show more specific error message
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error('Failed to create category', `${errorMessage}. Please try again.`);
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setColor(category.color);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !name.trim()) {
      toast.error('Category name is required', 'Please enter a name for the category.');
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        workspaceId,
        categoryId: editingCategory.id,
        name: name.trim(),
        description: description.trim() || undefined,
        color
      });
      
      // Reset form
      setEditingCategory(null);
      setName('');
      setDescription('');
      setColor('#3B82F6');
      
      toast.success('Category updated successfully!', `"${name.trim()}" has been updated.`);
    } catch (error) {
      console.error('Update category error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error('Failed to update category', `${errorMessage}. Please try again.`);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor('#3B82F6');
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string, fileCount: number) => {
    if (fileCount > 0) {
      toast.error('Cannot delete category', `"${categoryName}" has ${fileCount} file(s). Please reassign or delete these files first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync({ workspaceId, categoryId });
      toast.success('Category deleted successfully!', `"${categoryName}" has been removed from your workspace.`);
    } catch (error) {
      console.error('Delete category error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error('Failed to delete category', `${errorMessage}`);
    }
  };
  
  const colorOptions = [
    { value: '#3B82F6', label: 'Blue', class: 'bg-blue-100 text-blue-600 border-blue-200' },
    { value: '#10B981', label: 'Green', class: 'bg-green-100 text-green-600 border-green-200' },
    { value: '#8B5CF6', label: 'Purple', class: 'bg-purple-100 text-purple-600 border-purple-200' },
    { value: '#F97316', label: 'Orange', class: 'bg-orange-100 text-orange-600 border-orange-200' },
    { value: '#EF4444', label: 'Red', class: 'bg-red-100 text-red-600 border-red-200' },
    { value: '#EAB308', label: 'Yellow', class: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
  ];

  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Categories</h2>
              <p className="text-sm text-gray-500 mt-1">Create new categories and manage existing ones</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {/* Existing Categories */}
              {workspaceCategories && workspaceCategories.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Categories</h3>
                  <div className="space-y-2">
                    {workspaceCategories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full border-2"
                            style={{ backgroundColor: category.color, borderColor: category.color }}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{category.name}</p>
                            {category.description && (
                              <p className="text-sm text-gray-500">{category.description}</p>
                            )}
                            <p className="text-xs text-gray-400">{category.fileCount} files</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditCategory(category)}
                            disabled={updateCategoryMutation.isPending}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Edit category"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id, category.name, category.fileCount)}
                            disabled={deleteCategoryMutation.isPending}
                            className={cn(
                              "p-2 rounded-lg transition-colors disabled:opacity-50",
                              category.fileCount > 0 
                                ? "text-gray-400 hover:text-gray-500 hover:bg-gray-50 cursor-not-allowed" 
                                : "text-red-400 hover:text-red-600 hover:bg-red-50"
                            )}
                            title={category.fileCount > 0 ? `Cannot delete - ${category.fileCount} files using this category` : "Delete category"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Category */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
                <div className="space-y-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Marketing Assets, Code Snippets"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this category contains..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setColor(option.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                        color === option.value 
                          ? `${option.class} border-current` 
                          : "bg-white border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <Button variant="outline" onClick={editingCategory ? handleCancelEdit : onClose}>
              {editingCategory ? 'Cancel Edit' : 'Cancel'}
            </Button>
            {editingCategory ? (
              <Button 
                className="bg-blue-500 hover:bg-blue-600"
                disabled={updateCategoryMutation.isPending}
                onClick={handleUpdateCategory}
              >
                <Edit className="h-4 w-4 mr-2" />
                {updateCategoryMutation.isPending ? 'Updating...' : 'Update Category'}
              </Button>
            ) : (
              <Button 
                className="bg-primary-500 hover:bg-primary-600"
                disabled={createCategoryMutation.isPending}
                onClick={handleCreateCategory}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const AddFileSidePanel = ({ 
  isOpen, 
  onClose,
  workspaceId,
  availableCategories
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  workspaceId: string;
  availableCategories: string[];
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState(availableCategories[0] || 'Design');
  const [description, setDescription] = useState('');
  const uploadFileMutation = useUploadFile();
  const toast = useToast();
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    try {
      // Upload files sequentially to ensure proper error handling
      for (const file of files) {
        await uploadFileMutation.mutateAsync({
          workspaceId,
          file,
          description,
          category
        });
      }
      
      toast.success(
        `Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}!`,
        files.length === 1 ? `"${files[0].name}" has been added to your workspace.` : `${files.length} files have been added to your workspace.`
      );
      onClose();
      // No need to manually reload - React Query will invalidate and refetch
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files', 'Please try again or check your file size and format.');
    }
  };

  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add Files</h2>
              <p className="text-sm text-gray-500 mt-1">Upload files to your workspace</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* File Upload Area */}
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-gray-400"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Paperclip className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Support for documents, images, code files, and more
              </p>
            </div>
          </div>
          
          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Selected Files</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the files..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all resize-none"
            />
          </div>
          
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="bg-primary-500 hover:bg-primary-600" 
              disabled={files.length === 0 || uploadFileMutation.isPending}
              onClick={handleUpload}
            >
              <Plus className="h-4 w-4 mr-2" />
              {uploadFileMutation.isPending ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} ${files.length === 1 ? 'File' : 'Files'}` : 'Files'}`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// Goal Linking Side Panel Component
const GoalLinkingSidePanel = ({ 
  isOpen, 
  onClose, 
  journalEntry,
  goals,
  onSave
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  journalEntry: { id: string; title: string; linkedGoals: any[] };
  goals: Goal[];
  onSave: (links: any[]) => void;
}) => {
  const { user: currentUser } = useAuth();
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    journalEntry.linkedGoals.map(link => link.goalId)
  );
  const [goalContributions, setGoalContributions] = useState<{[key: string]: {
    contributionType: string;
    progressContribution: number;
    notes: string;
  }}>({});

  // Initialize goal contributions from current links
  useEffect(() => {
    const contributions: any = {};
    journalEntry.linkedGoals.forEach(link => {
      contributions[link.goalId] = {
        contributionType: link.contributionType,
        progressContribution: link.progressContribution,
        notes: link.notes || ''
      };
    });
    setGoalContributions(contributions);
  }, [journalEntry.linkedGoals]);

  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoals(prev => {
      const newSelection = prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId];
      
      // Initialize contribution data for newly selected goals
      if (!prev.includes(goalId)) {
        setGoalContributions(prevContrib => ({
          ...prevContrib,
          [goalId]: {
            contributionType: 'progress',
            progressContribution: 10,
            notes: ''
          }
        }));
      }
      
      return newSelection;
    });
  };

  const updateGoalContribution = (goalId: string, field: string, value: any) => {
    setGoalContributions(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    // Here you would save the goal links to your backend
    const goalLinks = selectedGoals.map(goalId => ({
      goalId,
      goalTitle: goals.find(g => g.id === goalId)?.title || '',
      contributionType: goalContributions[goalId]?.contributionType || 'progress',
      progressContribution: goalContributions[goalId]?.progressContribution || 0,
      linkedAt: new Date(),
      notes: goalContributions[goalId]?.notes || ''
    }));
    
    console.log('Saving goal links for journal entry:', journalEntry.id, goalLinks);
    
    // Update the linked journal entries in goals data as well
    const currentUserTeamMember = teamMembers.find(m => m.id === currentUser?.id) || teamMembers[0];
    const now = new Date();
    
    goals.forEach(goal => {
      const isLinked = selectedGoals.includes(goal.id);
      const existingLinkIndex = goal.linkedJournalEntries.findIndex(
        link => link.journalEntryId === journalEntry.id
      );
      
      let editRecord: EditRecord | null = null;
      
      if (isLinked && existingLinkIndex === -1) {
        // Add new link
        goal.linkedJournalEntries.push({
          journalEntryId: journalEntry.id,
          linkedAt: new Date(),
          linkedBy: currentUserTeamMember, // Current user
          contributionType: goalContributions[goal.id]?.contributionType as any || 'progress',
          progressContribution: goalContributions[goal.id]?.progressContribution || 0
        });
        
        editRecord = {
          id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          editedBy: currentUser,
          editedAt: now,
          field: 'linkedJournalEntries',
          oldValue: goal.linkedJournalEntries.length - 1,
          newValue: goal.linkedJournalEntries.length,
          reason: `Journal entry "${journalEntry.title}" linked to goal`
        };
      } else if (!isLinked && existingLinkIndex !== -1) {
        // Remove existing link
        goal.linkedJournalEntries.splice(existingLinkIndex, 1);
        
        editRecord = {
          id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          editedBy: currentUser,
          editedAt: now,
          field: 'linkedJournalEntries',
          oldValue: goal.linkedJournalEntries.length + 1,
          newValue: goal.linkedJournalEntries.length,
          reason: `Journal entry "${journalEntry.title}" unlinked from goal`
        };
      } else if (isLinked && existingLinkIndex !== -1) {
        // Update existing link
        const oldContribution = goal.linkedJournalEntries[existingLinkIndex].contributionType;
        const newContribution = goalContributions[goal.id]?.contributionType as any || 'progress';
        
        goal.linkedJournalEntries[existingLinkIndex] = {
          ...goal.linkedJournalEntries[existingLinkIndex],
          contributionType: newContribution,
          progressContribution: goalContributions[goal.id]?.progressContribution || 0
        };
        
        if (oldContribution !== newContribution) {
          editRecord = {
            id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            editedBy: currentUserTeamMember,
            editedAt: now,
            field: 'linkedJournalEntries',
            oldValue: oldContribution,
            newValue: newContribution,
            reason: `Journal entry link contribution type updated from ${oldContribution} to ${newContribution}`
          };
        }
      }
      
      // Add edit record if there was a change
      if (editRecord) {
        goal.editHistory.push(editRecord);
        goal.updatedAt = now.toISOString();
      }
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between bg-white border-b border-gray-200 p-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Link Goals</h2>
              <p className="text-sm text-gray-500 mt-1">
                Connect "{journalEntry.title}" to relevant goals and track progress
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">

            <div className="space-y-4">
              {goals.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              const contribution = goalContributions[goal.id];
              
              return (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGoalSelection(goal.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                          goal.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          goal.status === 'blocked' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {goal.status.replace('-', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{goal.category}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Progress: {goal.progressPercentage}%</span>
                        <span>Priority: {goal.priority}</span>
                        {goal.targetDate && (
                          <span>Due: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                        )}
                      </div>

                      {/* Contribution Details - Only show if selected */}
                      {isSelected && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">Contribution Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contribution Type
                              </label>
                              <select
                                value={contribution?.contributionType || 'progress'}
                                onChange={(e) => updateGoalContribution(goal.id, 'contributionType', e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                              >
                                <option value="progress">Progress Update</option>
                                <option value="milestone">Milestone Completion</option>
                                <option value="blocker">Blocker Identified</option>
                                <option value="update">General Update</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Progress Contribution (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={contribution?.progressContribution || 0}
                                onChange={(e) => updateGoalContribution(goal.id, 'progressContribution', parseInt(e.target.value))}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                              </label>
                              <input
                                type="text"
                                value={contribution?.notes || ''}
                                onChange={(e) => updateGoalContribution(goal.id, 'notes', e.target.value)}
                                placeholder="Additional context..."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedGoals.length} goal{selectedGoals.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-primary-500 hover:bg-primary-600">
                  Save Links
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Edit History Modal Component
const EditHistoryModal = ({ 
  isOpen, 
  onClose, 
  goal 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: Goal;
}) => {
  if (!isOpen) return null;

  const sortedHistory = [...goal.editHistory].sort((a, b) => 
    new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime()
  );

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'title': return <FileText className="h-4 w-4" />;
      case 'description': return <MessageSquare className="h-4 w-4" />;
      case 'status': return <Clock className="h-4 w-4" />;
      case 'priority': return <Star className="h-4 w-4" />;
      case 'targetDate': return <Calendar className="h-4 w-4" />;
      case 'category': return <Tag className="h-4 w-4" />;
      case 'responsible':
      case 'accountable':
      case 'consulted':
      case 'informed': return <Users className="h-4 w-4" />;
      case 'milestones': return <Target className="h-4 w-4" />;
      case 'tags': return <Tag className="h-4 w-4" />;
      case 'created': return <Plus className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getFieldColor = (field: string) => {
    switch (field) {
      case 'created': return 'text-green-600 bg-green-100';
      case 'title':
      case 'description': return 'text-blue-600 bg-blue-100';
      case 'status': return 'text-purple-600 bg-purple-100';
      case 'priority': return 'text-orange-600 bg-orange-100';
      case 'targetDate': return 'text-indigo-600 bg-indigo-100';
      case 'responsible':
      case 'accountable':
      case 'consulted':
      case 'informed': return 'text-teal-600 bg-teal-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit History</h2>
              <p className="text-sm text-gray-500 mt-1">
                Changes made to "{goal.title}"
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No edit history</h3>
              <p className="text-sm text-gray-500">This goal hasn't been modified yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedHistory.map((edit, index) => (
                <div key={edit.id} className="relative">
                  {/* Timeline line */}
                  {index < sortedHistory.length - 1 && (
                    <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                      getFieldColor(edit.field)
                    )}>
                      {getFieldIcon(edit.field)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <img 
                              src={edit.editedBy.avatar} 
                              alt={edit.editedBy.name}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {edit.editedBy.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {edit.field === 'created' ? 'created this goal' : `updated ${edit.field}`}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(new Date(edit.editedAt))}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {edit.reason}
                        </p>
                        
                        {edit.field !== 'created' && edit.oldValue !== null && (
                          <div className="text-xs bg-gray-50 rounded p-2 border-l-2 border-gray-300">
                            <div className="space-y-1">
                              {edit.oldValue && (
                                <div>
                                  <span className="font-medium text-red-600">Before: </span>
                                  <span className="text-gray-700">
                                    {Array.isArray(edit.oldValue) ? edit.oldValue.join(', ') : String(edit.oldValue)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-green-600">After: </span>
                                <span className="text-gray-700">
                                  {Array.isArray(edit.newValue) ? edit.newValue.join(', ') : String(edit.newValue)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500">
                          {format(new Date(edit.editedAt), 'MMM d, yyyy \'at\' h:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Goal Templates Modal Component
const GoalTemplatesModal = ({ 
  isOpen, 
  onClose, 
  onSelectTemplate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectTemplate: (template: any) => void;
}) => {
  const goalTemplates = [
    {
      id: 'product-launch',
      title: 'Product Launch',
      description: 'Launch a new product or feature',
      category: 'Product',
      priority: 'high',
      icon: <Star className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-600',
      milestones: [
        { title: 'Market Research Complete', days: 30 },
        { title: 'MVP Development', days: 60 },
        { title: 'Beta Testing', days: 90 },
        { title: 'Launch Campaign', days: 120 }
      ],
      suggestedTeam: ['Product Manager', 'Developer', 'Designer', 'Marketing']
    },
    {
      id: 'marketing-campaign',
      title: 'Marketing Campaign',
      description: 'Execute a comprehensive marketing campaign',
      category: 'Marketing',
      priority: 'medium',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-green-100 text-green-600',
      milestones: [
        { title: 'Campaign Strategy', days: 14 },
        { title: 'Content Creation', days: 30 },
        { title: 'Campaign Launch', days: 45 },
        { title: 'Performance Analysis', days: 60 }
      ],
      suggestedTeam: ['Marketing Manager', 'Content Creator', 'Designer']
    },
    {
      id: 'security-audit',
      title: 'Security Audit',
      description: 'Conduct comprehensive security assessment',
      category: 'Security',
      priority: 'critical',
      icon: <Shield className="h-6 w-6" />,
      color: 'bg-red-100 text-red-600',
      milestones: [
        { title: 'Vulnerability Assessment', days: 7 },
        { title: 'Penetration Testing', days: 14 },
        { title: 'Report Generation', days: 21 },
        { title: 'Remediation Plan', days: 28 }
      ],
      suggestedTeam: ['Security Engineer', 'DevOps', 'System Admin']
    },
    {
      id: 'team-training',
      title: 'Team Training Program',
      description: 'Implement comprehensive team training initiative',
      category: 'Operations',
      priority: 'medium',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600',
      milestones: [
        { title: 'Training Needs Assessment', days: 7 },
        { title: 'Curriculum Development', days: 21 },
        { title: 'Training Delivery', days: 60 },
        { title: 'Skills Assessment', days: 75 }
      ],
      suggestedTeam: ['HR Manager', 'Team Lead', 'Training Coordinator']
    },
    {
      id: 'ui-redesign',
      title: 'UI/UX Redesign',
      description: 'Redesign user interface for better user experience',
      category: 'Design',
      priority: 'medium',
      icon: <Palette className="h-6 w-6" />,
      color: 'bg-indigo-100 text-indigo-600',
      milestones: [
        { title: 'User Research', days: 14 },
        { title: 'Design System', days: 30 },
        { title: 'Prototype Creation', days: 45 },
        { title: 'Implementation', days: 90 }
      ],
      suggestedTeam: ['UX Designer', 'UI Designer', 'Frontend Developer']
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure Upgrade',
      description: 'Upgrade and modernize infrastructure',
      category: 'Engineering',
      priority: 'high',
      icon: <Database className="h-6 w-6" />,
      color: 'bg-orange-100 text-orange-600',
      milestones: [
        { title: 'Infrastructure Audit', days: 7 },
        { title: 'Migration Planning', days: 21 },
        { title: 'System Migration', days: 60 },
        { title: 'Performance Testing', days: 75 }
      ],
      suggestedTeam: ['DevOps Engineer', 'Backend Developer', 'System Admin']
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Goal Templates</h2>
              <p className="text-sm text-gray-500 mt-1">
                Start with a proven template to accelerate goal creation
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalTemplates.map((template) => (
              <div key={template.id} className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn("p-3 rounded-lg", template.color)}>
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{template.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {template.category}
                      </span>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                        template.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        template.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}>
                        {template.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">Included Milestones</div>
                    <div className="space-y-1">
                      {template.milestones.slice(0, 3).map((milestone, index) => (
                        <div key={index} className="flex items-center text-xs text-gray-600">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                          {milestone.title}
                        </div>
                      ))}
                      {template.milestones.length > 3 && (
                        <div className="text-xs text-gray-400">+{template.milestones.length - 3} more</div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onSelectTemplate(template)}
                    className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Choose a template to get started quickly, or create a custom goal from scratch.
            </span>
            <Button variant="outline" onClick={onClose}>
              Create Custom Goal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to get the correct icon component for an artifact type
const getArtifactIconComponent = (type: string) => {
  switch (type) {
    case 'document': return <FileText className="h-3.5 w-3.5" />;
    case 'code': return <Code className="h-3.5 w-3.5" />;
    case 'design': return <FileImage className="h-3.5 w-3.5" />;
    case 'data': return <BarChart3 className="h-3.5 w-3.5" />;
    default: return <FileText className="h-3.5 w-3.5" />;
  }
};

// --- MAIN PAGE COMPONENT ---

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('timeline');
  const [showInviteSidePanel, setShowInviteSidePanel] = useState(false);
  const [showCategorySidePanel, setShowCategorySidePanel] = useState(false);
  const [artefactView, setArtefactView] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showFileSidePanel, setShowFileSidePanel] = useState(false);
  const [showEditFileSidePanel, setShowEditFileSidePanel] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [viewType, setViewType] = useState('grid');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showGoalPanel, setShowGoalPanel] = useState(false);
  
  // Goals filtering, searching & sorting state
  const [showGoalFilters, setShowGoalFilters] = useState(false);
  const [goalSearchQuery, setGoalSearchQuery] = useState('');
  
  // Fetch workspace data from backend
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId || '');
  
  // If workspace loading fails, use URL parameter as fallback
  const workspaceIdForAPI = workspace?.id || workspaceId || '';

  // Fetch workspace members
  const { data: workspaceMembers, isLoading: membersLoading, error: membersError } = useWorkspaceMembers(workspaceIdForAPI);
  
  
  // Fetch workspace files
  const { data: workspaceFilesData, isLoading: filesLoading } = useWorkspaceFiles(workspaceIdForAPI, {
    limit: 50 // Get first 50 files
  });

  // Fetch workspace categories
  const { data: workspaceCategories, isLoading: categoriesLoading } = useWorkspaceCategories(workspaceIdForAPI);

  // File management hooks
  const deleteFileMutation = useDeleteFile();
  const toast = useToast();

  // File action handlers
  const handleEditFile = (file: any) => {
    setSelectedFile(file);
    setShowEditFileSidePanel(true);
  };

  const handleDeleteFile = async (file: any) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFileMutation.mutateAsync({
        workspaceId: workspaceIdForAPI,
        fileId: file.id
      });
      toast.success('File deleted successfully!', `"${file.name}" has been removed from your workspace.`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file', 'Please try again or check your connection.');
    }
  };

  // Helper function to check if current user can edit/delete a file
  const canUserEditFile = (file: any) => {
    if (!currentUser || !workspaceMembers) return false;
    
    // Check if user uploaded the file
    if (file.uploadedById === currentUser.id) return true;
    
    // Find current user's role in workspace
    const currentUserMember = workspaceMembers.find(member => member.userId === currentUser.id);
    if (!currentUserMember) return false;
    
    // Check if user is admin or has editor role with edit permissions
    if (currentUserMember.role === 'ADMIN' || currentUserMember.role === 'OWNER') return true;
    
    // Check for editor with edit permissions
    if (currentUserMember.role === 'MEMBER') {
      const permissions = currentUserMember.permissions as any;
      return permissions?.canEdit === true;
    }
    
    return false;
  };

  // Fetch journal entries for this workspace using the actual workspace ID from backend
  // Only fetch when workspace is loaded and we have a valid workspace ID
  // Enable API call now that workspace exists properly
  const { data: journalData, isLoading: journalLoading, error: journalError } = useJournalEntries({
    limit: 100 // Get all entries without workspace filter to avoid CUID validation issues
  }, true); // Always enabled - don't wait for workspace to load

  // Appreciate mutation for journal entries
  const toggleAppreciateMutation = useToggleAppreciate();

  const handleAppreciate = async (entryId: string) => {
    try {
      await toggleAppreciateMutation.mutateAsync(entryId);
    } catch (error) {
      console.error('Failed to toggle appreciate:', error);
    }
  };

  // ReChronicle mutation for journal entries
  const rechronicleMutation = useRechronicleEntry();

  const handleRechronicle = async (entryId: string) => {
    try {
      await rechronicleMutation.mutateAsync({ id: entryId });
    } catch (error) {
      console.error('Failed to rechronicle:', error);
    }
  };

  // Publish handler for draft journal entries
  const handlePublishToggle = async (journal: JournalEntry) => {
    try {
      await JournalService.publishJournalEntry(journal.id, {
        visibility: 'network',
        abstractContent: journal.abstractContent || journal.description
      });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    } catch (error) {
      console.error('Failed to publish entry:', error);
    }
  };

  // Discard handler for draft journal entries
  const handleDiscardDraft = async (journal: JournalEntry) => {
    if (!confirm('Are you sure you want to discard this draft? This action cannot be undone.')) {
      return;
    }
    try {
      await JournalService.deleteJournalEntry(journal.id);
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    } catch (error) {
      console.error('Failed to discard draft:', error);
    }
  };

  // We no longer need fallback calls since we're doing client-side filtering
  const [goalStatusFilter, setGoalStatusFilter] = useState<string>('all');
  const [goalPriorityFilter, setGoalPriorityFilter] = useState<string>('all');
  const [goalAssigneeFilter, setGoalAssigneeFilter] = useState<string>('all');
  const [goalCategoryFilter, setGoalCategoryFilter] = useState<string>('all');
  const [goalDueDateFilter, setGoalDueDateFilter] = useState<string>('all');
  const [goalSortBy, setGoalSortBy] = useState<string>('created');
  const [goalSortOrder, setGoalSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Goal linking side panel state
  const [showGoalLinkPanel, setShowGoalLinkPanel] = useState(false);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<{
    id: string;
    title: string;
    linkedGoals: any[];
  } | null>(null);
  
  // Edit history modal state
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  const [selectedGoalForHistory, setSelectedGoalForHistory] = useState<Goal | null>(null);
  
  // Quick actions state
  const [quickActionGoalId, setQuickActionGoalId] = useState<string | null>(null);
  
  // Goal editing state
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  
  // Goal templates state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Goal completion and progress dialogs
  const [completionDialogGoal, setCompletionDialogGoal] = useState<Goal | null>(null);
  const [progressDialogGoal, setProgressDialogGoal] = useState<Goal | null>(null);
  const confettiCooldownRef = useRef<number>(0);
  const celebrateMilestone = (coords?: { x: number; y: number }) => {
    const now = Date.now();
    if (now - (confettiCooldownRef.current || 0) < 600) return;
    confettiCooldownRef.current = now;
    const origin = coords
      ? { x: Math.min(Math.max(coords.x / window.innerWidth, 0), 1), y: Math.min(Math.max(coords.y / window.innerHeight, 0), 1) }
      : { x: 0.5, y: 0.3 };
    confetti({ particleCount: 40, spread: 60, startVelocity: 35, origin, ticks: 200, scalar: 0.9 });
    setTimeout(() => {
      confetti({ particleCount: 30, spread: 80, startVelocity: 25, origin, ticks: 160, scalar: 0.8 });
    }, 120);
  };
  
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Close quick actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionGoalId) {
        setQuickActionGoalId(null);
      }
    };

    if (quickActionGoalId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [quickActionGoalId]);
  
  // Transform workspace members to match the expected format
  const teamMembers = useMemo(() => {
    if (!workspaceMembers) {
      return [];
    }
    
    const transformed = workspaceMembers.map((member, index) => {
      const isCurrentUser = member.user.id === currentUser?.id;
      
      console.log(`🔄 Processing member ${index} (${isCurrentUser ? 'CURRENT USER' : 'other user'}):`, {
        userId: member.user.id,
        name: member.user.name,
        title: member.user.title,
        email: member.user.email,
        role: member.role,
        isCurrentUser
      });
      
      const transformedMember = {
        id: member.user.id,
        name: member.user.name,
        avatar: member.user.avatar || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop`,
        position: member.user.title || 'Team Member',
        isOwner: member.role === 'OWNER',
        joinedDate: member.joinedAt,
        contributions: 0, // Will be calculated from journal entries
        status: 'active',
      };
      
      
      return transformedMember;
    });
    
    // Find current user in transformed data
    const currentUserInTeam = transformed.find(m => m.id === currentUser?.id);
    return transformed;
  }, [workspaceMembers, currentUser?.id]);

  // Load goals from API
  const { data: goals = [], isLoading: goalsLoading, error: goalsError } = useWorkspaceGoals(workspaceIdForAPI || '');
  const { data: workspaceLabels = [] } = useWorkspaceLabels(workspaceIdForAPI || '');
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const queryClient = useQueryClient();
  const deleteGoalMutation = useDeleteGoal();
  const toggleMilestoneMutation = useToggleMilestone();
  const linkJournalEntryMutation = useLinkJournalEntry();
  const { notifyGoalCreated, notifyGoalStatusChanged, notifyMilestoneCompleted } = useGoalNotifications();
  
  // Task management mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const completeMilestoneMutation = useCompleteMilestone();
  
  // Goals are loaded via API hook - no manual initialization needed
  
  // Goals persistence would be handled by API in a real application
  // For demo purposes, goals are kept in local state only
  
  // Goals filtering and sorting logic
  const filteredAndSortedGoals = useMemo(() => {
    let filtered = goals.filter(goal => {
      // Search query filter
      if (goalSearchQuery.trim()) {
        const query = goalSearchQuery.toLowerCase();
        const matchesTitle = goal.title.toLowerCase().includes(query);
        const matchesDescription = goal.description.toLowerCase().includes(query);
        const matchesTags = goal.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        const matchesCategory = goal.category.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesTags && !matchesCategory) {
          return false;
        }
      }

      // Status filter
      if (goalStatusFilter !== 'all' && goal.status !== goalStatusFilter) {
        return false;
      }

      // Priority filter
      if (goalPriorityFilter !== 'all' && goal.priority !== goalPriorityFilter) {
        return false;
      }

      // Category filter
      if (goalCategoryFilter !== 'all' && goal.category !== goalCategoryFilter) {
        return false;
      }

      // Assignee filter (checks if user is in responsible, accountable, consulted, or informed)
      if (goalAssigneeFilter !== 'all') {
        const isAssigned = [
          ...goal.responsible,
          goal.accountable,
          ...goal.consulted,
          ...goal.informed
        ].some(member => member.id === goalAssigneeFilter);
        
        if (!isAssigned) {
          return false;
        }
      }

      // Due date filter
      if (goalDueDateFilter !== 'all') {
        const now = new Date();
        const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
        
        switch (goalDueDateFilter) {
          case 'overdue':
            if (!targetDate || targetDate >= now || goal.status === 'completed') {
              return false;
            }
            break;
          case 'this-week':
            if (!targetDate) return false;
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (targetDate < now || targetDate > weekFromNow) {
              return false;
            }
            break;
          case 'this-month':
            if (!targetDate) return false;
            const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            if (targetDate < now || targetDate > monthFromNow) {
              return false;
            }
            break;
          case 'no-date':
            if (targetDate) return false;
            break;
        }
      }

      return true;
    });

    // Sort goals
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (goalSortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          const statusOrder = { 'not-started': 1, 'in-progress': 2, blocked: 3, completed: 4, cancelled: 5 };
          aValue = statusOrder[a.status as keyof typeof statusOrder];
          bValue = statusOrder[b.status as keyof typeof statusOrder];
          break;
        case 'progress':
          aValue = a.progressPercentage;
          bValue = b.progressPercentage;
          break;
        case 'targetDate':
          aValue = a.targetDate ? new Date(a.targetDate).getTime() : 0;
          bValue = b.targetDate ? new Date(b.targetDate).getTime() : 0;
          break;
        case 'created':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (goalSortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [goals, goalSearchQuery, goalStatusFilter, goalPriorityFilter, goalAssigneeFilter, goalCategoryFilter, goalDueDateFilter, goalSortBy, goalSortOrder]);
  
  // Get journal entries from API and filter client-side by workspaceId
  const actualJournalEntries = useMemo(() => {
    let entries = journalData?.entries || [];

    // DEBUG: Log all entries and their workspaceIds
    console.log('🔍 Workspace page debug:', {
      urlWorkspaceId: workspaceId,
      apiWorkspaceId: workspace?.id,
      totalEntriesFromAPI: entries.length,
      entriesSummary: entries.map(e => ({
        id: e.id,
        title: e.title?.substring(0, 30),
        workspaceId: e.workspaceId,
        isPublished: e.isPublished,
        visibility: e.visibility,
        matchesUrl: e.workspaceId === workspaceId,
        matchesApi: e.workspaceId === workspace?.id
      }))
    });

    // Always filter client-side since we're fetching all entries now
    if (entries.length > 0) {
      entries = entries.filter(entry =>
        entry.workspaceId === workspace?.id ||
        entry.workspaceId === workspaceId
      );
    }

    console.log('🔍 After filter:', entries.length, 'entries');
    
    // If no entries from API and there's an error, entries will remain empty
    // and we'll fall back to mock data in the logic below
    
    // If API returns entries, use them; otherwise fall back to mock data
    if (entries.length > 0) {
      return entries;
    } else if (!journalLoading) {
      // For now, return empty array as mock data is being removed
      // TODO: Remove this fallback when backend provides all needed data
      return [];
    }
    
    // Return empty array if still loading or error
    return [];
  }, [journalData, workspaceId, workspace?.id, journalLoading, journalError]);


  const owner = teamMembers.find(m => m.isOwner);
  const members = teamMembers.filter(m => !m.isOwner);
  // Helper function to categorize journal entries
  const categorizeJournalEntry = (entry: any) => {
    const title = entry.title?.toLowerCase() || '';
    const content = entry.content?.toLowerCase() || '';
    const combined = `${title} ${content}`;
    
    if (combined.includes('meeting') || combined.includes('standup') || combined.includes('sync')) {
      return 'Meeting Notes';
    } else if (combined.includes('research') || combined.includes('analysis') || combined.includes('findings')) {
      return 'Research';
    } else if (combined.includes('report') || combined.includes('analytics') || combined.includes('metrics')) {
      return 'Analytics & Reports';
    } else if (combined.includes('presentation') || combined.includes('slide') || combined.includes('demo')) {
      return 'Presentations';
    } else if (combined.includes('learning') || combined.includes('training') || combined.includes('course')) {
      return 'Learning & Development';
    } else if (combined.includes('marketing') || combined.includes('campaign') || combined.includes('promotion')) {
      return 'Marketing Materials';
    } else if (combined.includes('technical') || combined.includes('documentation') || combined.includes('guide')) {
      return 'Technical Documentation';
    } else if (combined.includes('process') || combined.includes('workflow') || combined.includes('procedure')) {
      return 'Process Document';
    } else if (combined.includes('product') || combined.includes('requirement') || combined.includes('spec')) {
      return 'Product Document';
    } else {
      return 'Business Document';
    }
  };

  // Transform workspace files to match the expected format
  const artefacts = useMemo(() => {
    const fileArtefacts = workspaceFilesData?.data?.files ? workspaceFilesData.data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      type: file.mimeType?.includes('image') ? 'Design' : 
            file.mimeType?.includes('pdf') ? 'Product Document' : 
            file.mimeType?.includes('code') ? 'Code' : 'Business Document',
      category: file.category || (file.mimeType?.includes('image') ? 'Design' : 'Document'),
      uploader: teamMembers.find(m => m.id === file.uploadedById) || {
        id: file.uploadedById || 'unknown',
        name: 'Unknown User',
        avatar: '/default-avatar.png',
        department: 'Unknown',
        position: 'Unknown'
      },
      date: file.createdAt,
      uploadedAt: new Date(file.createdAt),
      size: file.size,
      downloads: 0, // Not tracked yet
      views: 0, // Not tracked yet
      isShared: false, // Not tracked yet
      // Include original file data for editing
      originalName: file.originalName,
      mimeType: file.mimeType,
      description: file.description,
      uploadedById: file.uploadedById,
      url: file.url || `${API_BASE_URL}/files/${file.id}/download`, // For download/link functionality
      isExternalLink: file.type === 'link',
    })) : [];

    // Transform journal entry artifacts to artifacts
    const journalArtefacts = actualJournalEntries.flatMap((entry: any) => {
      if (!entry.artifacts || entry.artifacts.length === 0) {
        return [];
      }
      
      return entry.artifacts.map((artifact: any) => ({
        id: `journal-${entry.id}-artifact-${artifact.id}`,
        name: artifact.name,
        type: artifact.type === 'document' ? 'Product Document' :
              artifact.type === 'code' ? 'Code' :
              artifact.type === 'design' ? 'Design' :
              artifact.type === 'data' ? 'Business Document' :
              artifact.type === 'presentation' ? 'Presentations' : 'Business Document',
        category: artifact.type === 'document' ? 'Product Document' :
                  artifact.type === 'code' ? 'Code' :
                  artifact.type === 'design' ? 'Design' :
                  artifact.type === 'data' ? 'Business Document' :
                  artifact.type === 'presentation' ? 'Presentations' : 'Business Document',
        uploader: teamMembers.find(m => m.id === entry.author?.id) || {
          id: entry.author?.id || 'unknown',
          name: entry.author?.name || 'Unknown Author',
          avatar: entry.author?.avatar || '/default-avatar.png',
          department: 'Unknown',
          position: 'Unknown'
        },
        date: entry.createdAt,
        uploadedAt: new Date(entry.createdAt),
        size: artifact.size || 'Unknown size',
        downloads: 0,
        views: 0,
        isShared: false,
        // Artifact-specific fields
        originalName: artifact.name,
        mimeType: artifact.type,
        description: `Artifact from journal entry: ${entry.title}`,
        uploadedById: entry.author?.id,
        url: artifact.url || `${API_BASE_URL}/files/${artifact.id}/download`, // Direct artifact URL or constructed download URL
        isExternalLink: artifact.url?.startsWith('http') && !artifact.url?.includes(window.location.host),
        sourceJournalEntry: entry, // Keep reference to source journal entry
      }));
    });

    // Combine file artifacts and journal artifacts
    return [...fileArtefacts, ...journalArtefacts];
  }, [workspaceFilesData, teamMembers, actualJournalEntries]);

  // Combine predefined categories with custom workspace categories
  const predefinedCategories = [
    'Design', 
    'Code', 
    'Product Document', 
    'Business Document', 
    'Process Document',
    'Meeting Notes',
    'Research',
    'Analytics & Reports',
    'Presentations',
    'Learning & Development',
    'Marketing Materials',
    'Technical Documentation'
  ];
  const customCategories = workspaceCategories?.map(cat => cat.name) || [];
  const allCategories = [...new Set([...predefinedCategories, ...customCategories])];
  const artefactCategories = ['All', ...allCategories];

  const filteredArtefacts = selectedCategory === 'All' 
    ? artefacts 
    : artefacts.filter(a => a.category === selectedCategory);

  const categoryStats = allCategories.map(cat => {
    // Check if this is a custom category with real file count
    const customCategory = workspaceCategories?.find(wc => wc.name === cat);
    let count = 0;
    
    if (customCategory) {
      // Use real file count from backend, plus journal entry artifacts in this category
      const fileCount = customCategory.fileCount;
      const journalArtifactCount = artefacts.filter(a => a.category === cat && a.sourceJournalEntry).length;
      count = fileCount + journalArtifactCount;
    } else {
      // For predefined categories, count all artifacts (files + journal entry artifacts)
      count = artefacts.filter(a => a.category === cat).length;
    }
    
    return {
      name: cat,
      count,
      icon: getArtefactIcon(cat),
      color: getArtefactColor(cat),
      isCustom: customCategories.includes(cat)
    };
  }).sort((a, b) => {
    // Sort by count (descending), then by name (ascending)
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name);
  });

  // Calculate items per row based on grid columns
  const getItemsPerRow = () => {
    // Based on responsive grid: grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7
    if (window.innerWidth >= 1280) return 7; // xl
    if (window.innerWidth >= 1024) return 6; // lg
    if (window.innerWidth >= 768) return 4;  // md
    return 3; // default
  };

  const [itemsPerRow, setItemsPerRow] = useState(getItemsPerRow);

  React.useEffect(() => {
    const handleResize = () => setItemsPerRow(getItemsPerRow());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleCategories = showAllCategories ? categoryStats : categoryStats.slice(0, itemsPerRow);
  const hasHiddenCategories = categoryStats.length > itemsPerRow;

  // Dynamic workspace stats based on real data
  const workspaceStats = useMemo(() => ({
    totalArtefacts: artefacts.length,
    totalJournalEntries: actualJournalEntries.length,
    totalGoals: goals.length,
    activeUsers: teamMembers.length,
    lastActivity: actualJournalEntries.length > 0 ? 
      formatDistanceToNow(new Date(actualJournalEntries[0].createdAt), { addSuffix: true }) : 
      'No recent activity',
  }), [artefacts.length, actualJournalEntries.length, teamMembers.length, actualJournalEntries, goals.length]);

  // Handle loading and error states (moved after all hooks)
  if (isLoading || journalLoading || membersLoading || filesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }
  
  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading workspace</p>
          <Button onClick={() => navigate('/workspaces')}>
            Back to Workspaces
          </Button>
        </div>
      </div>
    );
  }
  
  const currentWorkspace = {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description || '',
    category: workspace.organization ? 'Team Workspace' : 'Personal Workspace',
    organizationName: workspace.organization?.name || null,
    isPersonal: !workspace.organization,
    isOwner: workspace.userRole === 'OWNER'
  };

  // Get filter counts for display
  const activeFilterCount = [
    goalStatusFilter !== 'all',
    goalPriorityFilter !== 'all',
    goalAssigneeFilter !== 'all',
    goalCategoryFilter !== 'all',
    goalDueDateFilter !== 'all',
    goalSearchQuery.trim() !== ''
  ].filter(Boolean).length;

  // Function to open goal linking side panel for a journal entry
  const handleLinkGoalsToEntry = (journalEntry: any) => {
    setSelectedJournalEntry({
      id: journalEntry.id,
      title: journalEntry.title,
      linkedGoals: journalEntry.linkedGoals || []
    });
    setShowGoalLinkPanel(true);
  };

  // Function to open edit history modal for a goal
  const handleViewEditHistory = (goal: Goal) => {
    setSelectedGoalForHistory(goal);
    setShowEditHistoryModal(true);
  };

  // Function to calculate and update goal progress based on linked journal entries
  const updateGoalProgress = (goal: Goal) => {
    let totalProgress = 0;
    goal.linkedJournalEntries.forEach(link => {
      totalProgress += link.progressContribution;
    });
    
    // Add milestone completion progress (completed = 1.0, partial = 0.5, incomplete = 0.0)
    const milestoneWeightedProgress = goal.milestones.reduce((acc, milestone) => {
      const status = milestone.status || (milestone.completed ? 'completed' : 'incomplete');
      switch (status) {
        case 'completed': return acc + 1.0;
        case 'partial': return acc + 0.5;
        case 'incomplete': return acc + 0.0;
        default: return acc + 0.0;
      }
    }, 0);
    const milestoneProgress = goal.milestones.length > 0 ? (milestoneWeightedProgress / goal.milestones.length) * 30 : 0;
    
    const calculatedProgress = Math.min(100, totalProgress + milestoneProgress);
    
    // Update the goal if progress has changed
    if (goal.progressPercentage !== calculatedProgress) {
      const goalIndex = goals.findIndex(g => g.id === goal.id);
      if (goalIndex !== -1) {
        goals[goalIndex].progressPercentage = calculatedProgress;
        
        // Auto-update status based on progress
        if (calculatedProgress >= 100 && goal.status !== 'completed') {
          goals[goalIndex].status = 'completed';
        } else if (calculatedProgress > 0 && goal.status === 'not-started') {
          goals[goalIndex].status = 'in-progress';
        }
      }
    }
  };

  // Function to cycle milestone through three states: incomplete -> partial -> completed -> incomplete

  const toggleMilestone = async (goalId: string, milestoneId: string, coords?: { x: number; y: number }) => {
    console.log('🎯 toggleMilestone called:', { goalId, milestoneId, timestamp: Date.now() });
    
    try {
      const goal = goals.find(g => g.id === goalId);
      const milestone = goal?.milestones.find(m => m.id === milestoneId);
      
      if (!goal || !milestone) {
        console.error('Goal or milestone not found');
        return;
      }
      
      // Backend toggles boolean completed; treat a click from not-completed as completion
      const wasCompleted = !!milestone.completed;
      const willBeCompleted = !wasCompleted;
      
      // Toggle milestone via API - for now, use the existing API but we'll need to update it to support status
      await toggleMilestoneMutation.mutateAsync({ goalId, milestoneId });
      
      // Send notification and celebration if milestone was completed (first click)
      if (willBeCompleted) {
        celebrateMilestone(coords);
        if (currentUser) {
          await notifyMilestoneCompleted(goal, milestone, currentUser as GoalTeamMember);
        }
      }
      
      // Wait for the query to update and check for completion dialog
      setTimeout(() => {
        console.log('🎯 Checking completion dialog after timeout...');
        // Refetch the goal to get the latest state
        const updatedGoal = goals.find(g => g.id === goalId);
        if (updatedGoal) {
          console.log('🎯 Found updated goal:', updatedGoal.title);
          
          // Simulate the updated progress by calculating what it should be
          const simulatedGoal = {
            ...updatedGoal,
            milestones: updatedGoal.milestones.map(m => 
              m.id === milestoneId 
                ? { ...m, completed: willBeCompleted, status: (willBeCompleted ? 'completed' : 'incomplete') as any }
                : m
            )
          };
          
          const effectiveProgress = getEffectiveProgress(simulatedGoal);
          console.log('🎯 Simulated goal progress:', effectiveProgress);
          
          // Check if completion dialog should be shown
          if (shouldShowCompletionDialog(simulatedGoal)) {
            console.log('🎯 Showing completion dialog for goal:', simulatedGoal.title);
            setCompletionDialogGoal(simulatedGoal);
          } else {
            console.log('🎯 Completion dialog not shown for goal:', simulatedGoal.title);
          }
        } else {
          console.log('🎯 Updated goal not found!');
        }
      }, 1000); // Wait for query to update
      
      console.log(`✅ Milestone completion toggled: ${wasCompleted} -> ${willBeCompleted}`);
      
    } catch (error) {
      console.error('❌ Failed to toggle milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  // Quick action functions
  const quickUpdateStatus = async (goalId: string, newStatus: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) {
        console.error('Goal not found');
        return;
      }
      
      const oldStatus = goal.status;
      await updateGoalMutation.mutateAsync({ goalId, data: { status: newStatus as Goal['status'] } });
      
      // Send notification if status changed
      if (currentUser && oldStatus !== newStatus) {
        await notifyGoalStatusChanged(goal, oldStatus, newStatus, currentUser as GoalTeamMember);
      }
      
      toast.success('Goal status updated successfully');
    } catch (error) {
      console.error('Failed to update goal status:', error);
      toast.error('Failed to update goal status');
    }
    setQuickActionGoalId(null);
  };

  const quickUpdatePriority = async (goalId: string, newPriority: string) => {
    try {
      await updateGoalMutation.mutateAsync({ goalId, data: { priority: newPriority as Goal['priority'] } });
      toast.success('Goal priority updated successfully');
    } catch (error) {
      console.error('Failed to update goal priority:', error);
      toast.error('Failed to update goal priority');
    }
    setQuickActionGoalId(null);
  };

  const duplicateGoal = async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal || !workspaceIdForAPI || !currentUser) {
        console.error('Goal, workspace, or user not found');
        return;
      }

      const duplicateData = {
        title: `${goal.title} (Copy)`,
        description: goal.description,
        priority: goal.priority,
        targetDate: goal.targetDate,
        category: goal.category,
        accountableId: goal.accountable.id,
        responsibleIds: goal.responsible.map(r => r.id),
        consultedIds: goal.consulted?.map(c => c.id) || [],
        informedIds: goal.informed?.map(i => i.id) || [],
        milestones: goal.milestones.map(m => ({
          title: m.title,
          description: m.description,
          targetDate: m.targetDate,
          assignedTo: m.assignedTo
        }))
      };

      await createGoalMutation.mutateAsync({ 
        workspaceId: workspaceIdForAPI, 
        data: duplicateData 
      });
      
      toast.success('Goal duplicated successfully');
      
    } catch (error) {
      console.error('Failed to duplicate goal:', error);
      toast.error('Failed to duplicate goal');
    }
    setQuickActionGoalId(null);
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) {
        console.error('Goal not found');
        return;
      }

      if (confirm(`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`)) {
        await deleteGoalMutation.mutateAsync({ goalId, workspaceId });
        toast.success('Goal deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to delete goal');
    }
    setQuickActionGoalId(null);
  };

  // Template handler function
  const handleTemplateSelection = async (template: any) => {
    if (!workspaceIdForAPI || !currentUser) {
      toast.error('Unable to create goal - workspace or user not found');
      return;
    }

    try {
      const goalData = {
        title: template.title,
        description: template.description,
        priority: template.priority,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        category: template.category,
        assignedToId: currentUser.id, // Set current user as assigned by default
        reviewerId: null,
        accountableId: currentUser.id, // Set current user as accountable
        responsibleIds: [], // Empty array for responsible users
        consultedIds: [], // Empty array for consulted users
        informedIds: [], // Empty array for informed users
        milestones: template.milestones ? template.milestones.map((milestone: any) => ({
          title: milestone.title,
          description: milestone.description || '',
          targetDate: new Date(Date.now() + (milestone.days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: currentUser.id
        })) : []
      };

      // Create the goal using the API
      await createGoalMutation.mutateAsync({
        workspaceId: workspaceIdForAPI,
        data: goalData
      });

      // Send notification about goal creation
      notifyGoalCreated(goalData.title, currentUser.name || currentUser.email);

      // Show success toast
      toast.success('Goal created successfully from template');

      // Close the template modal
      setShowTemplateModal(false);

    } catch (error) {
      console.error('Failed to create goal from template:', error);
      toast.error('Failed to create goal from template');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => navigate('/workspaces/discovery')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Workspaces</span>
            </button>
            <div className="flex items-center gap-2">
              {currentWorkspace.isOwner && (
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                  onClick={() => setShowInviteSidePanel(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              )}
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-2"
                onClick={() => setShowSettingsPanel(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Workspace Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {currentWorkspace.isPersonal ? (
                  <div className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium">
                    <Lock className="h-3 w-3" />
                    Personal
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium">
                    <Building2 className="h-3 w-3" />
                    {currentWorkspace.organizationName}
                  </div>
                )}
                <div className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium">
                  <Tag className="h-3 w-3" />
                  {currentWorkspace.category}
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-1">
                {currentWorkspace.name}
              </h1>
              <p className="text-gray-300 text-sm max-w-2xl">
                {currentWorkspace.description || 'Collaborative workspace for developing and executing comprehensive strategies.'}
              </p>
            </div>

            {/* Quick Stats - Now inline */}
            <div className="hidden lg:grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-white/60" />
                  <div>
                    <p className="text-xs text-white/60">Team</p>
                    <p className="text-sm font-semibold">{teamMembers.length} members</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-white/60" />
                  <div>
                    <p className="text-xs text-white/60">Goals</p>
                    <p className="text-sm font-semibold">{goals.length} active</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-white/60" />
                  <div>
                    <p className="text-xs text-white/60">Files</p>
                    <p className="text-sm font-semibold">{workspaceStats.totalArtefacts}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-white/60" />
                  <div>
                    <p className="text-xs text-white/60">Journal</p>
                    <p className="text-sm font-semibold">{workspaceStats.totalJournalEntries}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/60" />
                  <div>
                    <p className="text-xs text-white/60">Activity</p>
                    <p className="text-sm font-semibold">{workspaceStats.lastActivity}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="grid grid-cols-5 gap-2 mt-4 lg:hidden">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <Users className="h-4 w-4 text-white/60 mx-auto mb-1" />
              <p className="text-xs font-semibold">{teamMembers.length}</p>
              <p className="text-xs text-white/60">Team</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <Target className="h-4 w-4 text-white/60 mx-auto mb-1" />
              <p className="text-xs font-semibold">{goals.length}</p>
              <p className="text-xs text-white/60">Goals</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <FolderOpen className="h-4 w-4 text-white/60 mx-auto mb-1" />
              <p className="text-xs font-semibold">{workspaceStats.totalArtefacts}</p>
              <p className="text-xs text-white/60">Files</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <MessageSquare className="h-4 w-4 text-white/60 mx-auto mb-1" />
              <p className="text-xs font-semibold">{workspaceStats.totalJournalEntries}</p>
              <p className="text-xs text-white/60">Journal</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <Clock className="h-4 w-4 text-white/60 mx-auto mb-1" />
              <p className="text-xs font-semibold">2h</p>
              <p className="text-xs text-white/60">ago</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Team Section - Now more compact */}
        <div className="mt-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{teamMembers.length} members</span>
                <button
              className="ml-2 px-2 py-2 text-primary-500 hover:bg-primary-50 rounded-full transition-colors"
              title="Add Workspace"
              style={{ outline: 'none', background: 'none', border: 'none' }}
              onClick={() => setShowInviteSidePanel(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
              </div>
            
            </div>
            <div className="flex flex-wrap gap-2">
              {owner && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
                  <div className="relative">
                    <RouterLink to={`/profile/${owner.id}`}>
                      <img src={owner.avatar} alt={owner.name} className="h-8 w-8 rounded-full hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer" />
                    </RouterLink>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                      owner.status === 'active' ? 'bg-green-500' : owner.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <RouterLink to={`/profile/${owner.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors">
                        {owner.name}
                      </RouterLink>
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-700">
                        Owner
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{owner.position}</p>
                  </div>
                </div>
              )}
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
                  <div className="relative">
                    <RouterLink to={`/profile/${member.id}`}>
                      <img src={member.avatar} alt={member.name} className="h-8 w-8 rounded-full hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer" />
                    </RouterLink>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                      member.status === 'active' ? 'bg-green-500' : member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    )} />
                  </div>
                  <div>
                    <RouterLink to={`/profile/${member.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors">
                      {member.name}
                    </RouterLink>
                    <p className="text-xs text-gray-500">{member.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Enhanced Tabs */}
        <div className="sticky top-0 z-10 bg-gray-50 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-200">
          <div className="mx-auto max-w-7xl">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
                  activeTab === 'timeline' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Journal Entries
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
                  activeTab === 'goals' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <Target className="h-4 w-4" />
                Goals
              </button>
              <button
                onClick={() => setActiveTab('artefacts')}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
                  activeTab === 'artefacts' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <FolderOpen className="h-4 w-4" />
                Artefacts
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6 pb-12">
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Top controls: summary, search/filter, new entry */}
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {actualJournalEntries.length} journal {actualJournalEntries.length === 1 ? 'entry' : 'entries'}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setShowSearchFilters(!showSearchFilters)}
                  >
                    <Search className="h-4 w-4" />
                    <span>Search & Filter</span>
                    {/* Placeholder for filter count badge */}
                    {/* <span className="ml-1 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">1</span> */}
                    <ChevronDown className={`h-4 w-4 transition-transform ${showSearchFilters ? 'rotate-180' : ''}`} />
                  </button>
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
              {/* Search & Filter UI */}
              {showSearchFilters && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search journal entries..."
                          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    
                    {/* Filter Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500">
                          <option>All Authors</option>
                          <option>Alex Rivera</option>
                          <option>Maria Santos</option>
                          <option>Lisa Wang</option>
                          <option>Jennifer Park</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500">
                          <option>All Categories</option>
                          <option>Design</option>
                          <option>Engineering</option>
                          <option>Security</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500">
                          <option>All Time</option>
                          <option>Last 7 days</option>
                          <option>Last 30 days</option>
                          <option>Last 90 days</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button className="text-sm text-gray-600 hover:text-gray-900">Clear all filters</button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowSearchFilters(false)}>Close</Button>
                        <Button size="sm">Apply Filters</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Journal Entries */}
              {actualJournalEntries.length > 0 ? (
                actualJournalEntries.map(entry => {
                  // If using mock data, convert it to JournalEntry format
                  const journalEntry = entry.workspaceId === workspaceId && !entry.author?.id ?
                    convertWorkspaceEntryToJournal(entry) : entry;

                  // Render JournalEnhanced for Format7 entries with AI-grouped categories
                  if (journalEntry.format7Data?.entry_metadata?.title) {
                    const isDraft = !journalEntry.isPublished && journalEntry.visibility !== 'network';
                    return (
                      <JournalEnhanced
                        key={entry.id}
                        entry={journalEntry.format7Data}
                        workspaceName={journalEntry.workspaceName}
                        correlations={journalEntry.format7Data?.correlations}
                        categories={journalEntry.format7Data?.categories}
                        onAppreciate={() => handleAppreciate(entry.id)}
                        onReChronicle={() => handleRechronicle(entry.id)}
                        isDraft={isDraft}
                        onPublish={isDraft ? () => handlePublishToggle(journalEntry) : undefined}
                        onDiscard={isDraft ? () => handleDiscardDraft(journalEntry) : undefined}
                      />
                    );
                  }

                  // Regular JournalCard for non-Format7 entries
                  return (
                    <JournalCard
                      key={entry.id}
                      journal={journalEntry}
                      viewMode="workspace"
                      showMenuButton={false}
                      showAnalyticsButton={true}
                      showUserProfile={true}
                      onAppreciate={() => handleAppreciate(entry.id)}
                      onReChronicle={() => handleRechronicle(entry.id)}
                      onPublishToggle={handlePublishToggle}
                      customActions={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkGoalsToEntry(entry)}
                          className="flex items-center gap-1"
                        >
                          <RouterLink className="h-3.5 w-3.5" />
                          Link Goals
                          {entry.linkedGoals && entry.linkedGoals.length > 0 && (
                            <span className="ml-1 bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full text-xs">
                              {entry.linkedGoals.length}
                            </span>
                          )}
                        </Button>
                      }
                    />
                  );
                })
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No journal entries</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no journal entries for this workspace yet.
                  </p>
                  <div className="mt-6">
                    <Button 
                      onClick={() => setShowNewEntryModal(true)}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first entry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'artefacts' && (
            <div>
              {/* Category Overview Cards */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Categories</h3>
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium"
                    onClick={() => setShowCategorySidePanel(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Category
                  </button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                  {visibleCategories.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={cn(
                        "relative p-2 rounded-lg border-2 transition-all text-left",
                        selectedCategory === cat.name 
                          ? `${cat.color} border-current` 
                          : "bg-white border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full",
                          selectedCategory === cat.name ? "bg-white/20" : "bg-gray-100"
                        )}>
                          {React.cloneElement(cat.icon, { className: "h-3 w-3" })}
                        </div>
                        <span className="text-sm font-bold">{cat.count}</span>
                      </div>
                      <p className="text-xs font-medium truncate" title={cat.name}>{cat.name}</p>
                    </button>
                  ))}
                </div>
                
                {hasHiddenCategories && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      {showAllCategories ? (
                        <>
                          <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                          Show Less Categories
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 transition-transform" />
                          Show {categoryStats.length - itemsPerRow} More Categories
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Filters and View Toggle */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      selectedCategory === 'All' 
                        ? "bg-primary-100 text-primary-700" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    All Categories
                  </button>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <button
                    onClick={() => setViewType(viewType === 'grid' ? 'list' : 'grid')}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {viewType === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                    {viewType === 'grid' ? 'List View' : 'Grid View'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium"
                    onClick={() => setShowFileSidePanel(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add File
                  </button>
                </div>
              </div>

              {/* Artefacts Grid/List */}
              <div className={cn(
                viewType === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                  : "space-y-3"
              )}>
                {filteredArtefacts.map((artefact) => (
                  <div key={artefact.id} className={cn(
                    "group relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all",
                    viewType === 'list' && "flex items-center gap-4 p-4"
                  )}>
                    {viewType === 'grid' && (
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn(
                            "inline-flex items-center justify-center w-10 h-10 rounded-lg",
                            getArtefactColor(artefact.category)
                          )}>
                            {React.cloneElement(getArtefactIcon(artefact.type), { className: "h-5 w-5 text-white" })}
                          </div>
                          {canUserEditFile(artefact) && (
                            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const menu = e.currentTarget.nextElementSibling as HTMLElement;
                                  menu.classList.toggle('hidden');
                                }}
                              >
                                <MoreVertical className="h-4 w-4 text-gray-400" />
                              </button>
                              <div className="hidden absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditFile(artefact);
                                    (e.target as HTMLElement).closest('.absolute')?.classList.add('hidden');
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(artefact);
                                    (e.target as HTMLElement).closest('.absolute')?.classList.add('hidden');
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1 truncate">{artefact.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">
                          {artefact.size} • {artefact.category}
                          {artefact.sourceJournalEntry && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-blue-600 font-medium">From Journal</span>
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <RouterLink to={`/profile/${artefact.uploader.id}`}>
                            <img 
                              src={artefact.uploader.avatar} 
                              alt={artefact.uploader.name}
                              className="h-4 w-4 rounded-full hover:ring-1 hover:ring-primary-300 transition-all cursor-pointer"
                            />
                          </RouterLink>
                          <RouterLink to={`/profile/${artefact.uploader.id}`} className="text-xs text-gray-500 hover:text-primary-600 truncate transition-colors">
                            {artefact.uploader.name}
                          </RouterLink>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{format(artefact.uploadedAt, 'MMM d')}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {artefact.sourceJournalEntry && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // RouterLink to the workspace where this journal entry is located
                                  const workspaceId = artefact.sourceJournalEntry.workspaceId || artefact.sourceJournalEntry.workspace?.id;
                                  if (workspaceId) {
                                    window.open(`/workspaces/${workspaceId}`, '_blank');
                                  } else {
                                    window.open(`/journal/list`, '_blank');
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                title="View in Workspace"
                              >
                                <Eye className="h-3 w-3" />
                                Journal
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArtifactDownload(artefact);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                              title={getArtifactActionText(artefact)}
                            >
                              {getArtifactActionIcon(artefact)}
                              {getArtifactActionText(artefact)}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {viewType === 'list' && (
                      <>
                        <div className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0",
                          getArtefactColor(artefact.category)
                        )}>
                          {React.cloneElement(getArtefactIcon(artefact.type), { className: "h-4 w-4 text-white" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{artefact.name}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                            <p className="text-sm text-gray-500">
                              {artefact.size} • {artefact.category}
                              {artefact.sourceJournalEntry && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="text-blue-600 font-medium">From Journal</span>
                                </>
                              )}
                            </p>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <div className="flex items-center gap-1 min-w-0">
                              <RouterLink to={`/profile/${artefact.uploader.id}`}>
                                <img 
                                  src={artefact.uploader.avatar} 
                                  alt={artefact.uploader.name}
                                  className="h-4 w-4 rounded-full flex-shrink-0 hover:ring-1 hover:ring-primary-300 transition-all cursor-pointer"
                                />
                              </RouterLink>
                              <RouterLink to={`/profile/${artefact.uploader.id}`} className="text-sm text-gray-500 hover:text-primary-600 truncate transition-colors">
                                {artefact.uploader.name}
                              </RouterLink>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{format(artefact.uploadedAt, 'MMM d')}</span>
                          {artefact.sourceJournalEntry && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // RouterLink to the workspace where this journal entry is located
                                const workspaceId = artefact.sourceJournalEntry.workspaceId || artefact.sourceJournalEntry.workspace?.id;
                                if (workspaceId) {
                                  window.open(`/workspaces/${workspaceId}`, '_blank');
                                } else {
                                  window.open(`/journal/list`, '_blank');
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                              title="View in Workspace"
                            >
                              <Eye className="h-3 w-3" />
                              Journal
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArtifactDownload(artefact);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                            title={getArtifactActionText(artefact)}
                          >
                            {getArtifactActionIcon(artefact)}
                            {getArtifactActionText(artefact)}
                          </button>
                          {canUserEditFile(artefact) && (
                            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const menu = e.currentTarget.nextElementSibling as HTMLElement;
                                  menu.classList.toggle('hidden');
                                }}
                              >
                                <MoreVertical className="h-4 w-4 text-gray-400" />
                              </button>
                              <div className="hidden absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditFile(artefact);
                                    (e.target as HTMLElement).closest('.absolute')?.classList.add('hidden');
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(artefact);
                                    (e.target as HTMLElement).closest('.absolute')?.classList.add('hidden');
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {filteredArtefacts.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <FolderOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No artefacts found</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedCategory === 'All' 
                      ? 'Get started by uploading your first file.' 
                      : `No files found in the ${selectedCategory} category.`
                    }
                  </p>
                  <button
                    onClick={() => setShowFileSidePanel(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Upload File
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-8">
              {/* Subtle Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Goals */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <Target className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Goals</p>
                      <p className="text-xl font-semibold text-gray-900">{goals.length}</p>
                    </div>
                  </div>
                </div>
                
                {/* In Progress */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <div className="h-4 w-4 flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">In Progress</p>
                      <p className="text-xl font-semibold text-gray-900">{goals.filter(g => g.status === 'in-progress').length}</p>
                    </div>
                  </div>
                </div>
                
                {/* Completed */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <div className="h-4 w-4 flex items-center justify-center">
                        <div className="w-3 h-3 text-green-600 font-bold text-xs">✓</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-xl font-semibold text-gray-900">{goals.filter(g => migrateStatus(g.status) === 'achieved').length}</p>
                    </div>
                  </div>
                </div>
                
                {/* Overdue */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-red-50 rounded-lg">
                      <Clock className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Overdue</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {goals.filter(g => isGoalOverdue(g)).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Top Controls */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Results Summary with Visual Indicators */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">
                        Showing <span className="text-primary-600 font-bold">{filteredAndSortedGoals.length}</span> of <span className="font-bold">{goals.length}</span> goals
                      </span>
                    </div>
                    {activeFilterCount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-px bg-gray-300"></div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                          <Filter className="h-3 w-3" />
                          {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Search & Filter Toggle */}
                    <button
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        showGoalFilters 
                          ? "bg-primary-500 text-white shadow-md" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                      onClick={() => setShowGoalFilters(!showGoalFilters)}
                    >
                      <Search className="h-4 w-4" />
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          showGoalFilters ? "bg-white text-primary-500" : "bg-primary-500 text-white"
                        )}>
                          {activeFilterCount}
                        </span>
                      )}
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        showGoalFilters && "rotate-180"
                      )} />
                    </button>


                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        className="group bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={() => setShowGoalPanel(true)}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-200" />
                        <span>Add Goal</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Search & Filter UI */}
              {showGoalFilters && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 space-y-6 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary-500" />
                      Search & Filter Goals
                    </h3>
                    <button 
                      onClick={() => setShowGoalFilters(false)}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Enhanced Search Bar */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Quick Search
                      </label>
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="text"
                          value={goalSearchQuery}
                          onChange={(e) => setGoalSearchQuery(e.target.value)}
                          placeholder="Search by title, description, tags, or category..."
                          className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all group-hover:border-gray-400"
                        />
                        {goalSearchQuery && (
                          <button
                            onClick={() => setGoalSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        )}
                      </div>
                      {goalSearchQuery && (
                        <div className="text-xs text-gray-500 pl-4">
                          Found {filteredAndSortedGoals.length} result{filteredAndSortedGoals.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                    
                    {/* Interactive Filter Chips */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filter by Category
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'Product', 'Marketing', 'Engineering', 'Security', 'Operations', 'Design'].map(category => {
                          const count = category === 'all' ? goals.length : goals.filter(g => g.category === category).length;
                          const isActive = goalCategoryFilter === category;
                          return (
                            <button
                              key={category}
                              onClick={() => setGoalCategoryFilter(category)}
                              className={cn(
                                "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive 
                                  ? "bg-primary-500 text-white shadow-md" 
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                              )}
                            >
                              <span>{category === 'all' ? 'All Categories' : category}</span>
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                isActive ? "bg-white text-primary-500" : "bg-gray-200 text-gray-600"
                              )}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Status Filter */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          Status
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'all', label: 'All Statuses', color: 'bg-gray-500' },
                            { value: 'not-started', label: 'Not Started', color: 'bg-gray-400' },
                            { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
                            { value: 'completed', label: 'Completed', color: 'bg-green-500' },
                            { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
                            { value: 'cancelled', label: 'Cancelled', color: 'bg-orange-500' }
                          ].map(status => {
                            const count = status.value === 'all' ? goals.length : goals.filter(g => g.status === status.value).length;
                            const isActive = goalStatusFilter === status.value;
                            return (
                              <label key={status.value} className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                isActive 
                                  ? "border-primary-200 bg-primary-50" 
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              )}>
                                <input
                                  type="radio"
                                  name="status"
                                  value={status.value}
                                  checked={isActive}
                                  onChange={(e) => setGoalStatusFilter(e.target.value)}
                                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                                <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                                <span className="text-sm flex-1">{status.label}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{count}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Priority Filter */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          Priority
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'all', label: 'All Priorities', color: 'bg-gray-500' },
                            { value: 'critical', label: 'Critical', color: 'bg-red-500' },
                            { value: 'high', label: 'High', color: 'bg-orange-500' },
                            { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
                            { value: 'low', label: 'Low', color: 'bg-gray-400' }
                          ].map(priority => {
                            const count = priority.value === 'all' ? goals.length : goals.filter(g => g.priority === priority.value).length;
                            const isActive = goalPriorityFilter === priority.value;
                            return (
                              <label key={priority.value} className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                isActive 
                                  ? "border-primary-200 bg-primary-50" 
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              )}>
                                <input
                                  type="radio"
                                  name="priority"
                                  value={priority.value}
                                  checked={isActive}
                                  onChange={(e) => setGoalPriorityFilter(e.target.value)}
                                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                                <div className={`w-3 h-3 rounded-full ${priority.color}`}></div>
                                <span className="text-sm flex-1">{priority.label}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{count}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Additional Filters Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Team Assignment Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Team Assignment</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {[
                            { value: 'all', label: 'All Team Members', icon: Users },
                            ...teamMembers.map(member => ({
                              value: member.id,
                              label: member.name,
                              icon: User,
                              avatar: member.avatar
                            }))
                          ].map((assignee) => {
                            const count = assignee.value === 'all' 
                              ? goals.length 
                              : goals.filter(g => g.assignedTo?.some(a => a.id === assignee.value) || (assignee.value === 'unassigned' && (!g.assignedTo || g.assignedTo.length === 0))).length;
                            
                            return (
                              <label
                                key={assignee.value}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-gray-50",
                                  goalAssigneeFilter === assignee.value
                                    ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200"
                                    : "border-gray-200"
                                )}
                              >
                                <input
                                  type="radio"
                                  name="assignee-filter"
                                  value={assignee.value}
                                  checked={goalAssigneeFilter === assignee.value}
                                  onChange={(e) => setGoalAssigneeFilter(e.target.value)}
                                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  {assignee.avatar ? (
                                    <img src={assignee.avatar} alt={assignee.label} className="w-6 h-6 rounded-full" />
                                  ) : (
                                    <assignee.icon className="w-4 h-4 text-gray-500" />
                                  )}
                                  <span className="text-sm flex-1">{assignee.label}</span>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{count}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Due Date Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Due Date Range</label>
                        <div className="space-y-2">
                          {[
                            { value: 'all', label: 'All Dates', icon: Calendar },
                            { value: 'overdue', label: 'Overdue', icon: Clock },
                            { value: 'this-week', label: 'Due This Week', icon: Calendar },
                            { value: 'this-month', label: 'Due This Month', icon: Calendar },
                            { value: 'no-date', label: 'No Due Date', icon: Calendar }
                          ].map((dateRange) => {
                            const count = goals.filter(goal => {
                              switch (dateRange.value) {
                                case 'all': return true;
                                case 'overdue': return goal.targetDate && new Date(goal.targetDate) < new Date();
                                case 'this-week': {
                                  const weekFromNow = new Date();
                                  weekFromNow.setDate(weekFromNow.getDate() + 7);
                                  return goal.targetDate && new Date(goal.targetDate) <= weekFromNow && new Date(goal.targetDate) >= new Date();
                                }
                                case 'this-month': {
                                  const monthFromNow = new Date();
                                  monthFromNow.setMonth(monthFromNow.getMonth() + 1);
                                  return goal.targetDate && new Date(goal.targetDate) <= monthFromNow && new Date(goal.targetDate) >= new Date();
                                }
                                case 'no-date': return !goal.targetDate;
                                default: return false;
                              }
                            }).length;
                            
                            return (
                              <label
                                key={dateRange.value}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-gray-50",
                                  goalDueDateFilter === dateRange.value
                                    ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200"
                                    : "border-gray-200"
                                )}
                              >
                                <input
                                  type="radio"
                                  name="due-date-filter"
                                  value={dateRange.value}
                                  checked={goalDueDateFilter === dateRange.value}
                                  onChange={(e) => setGoalDueDateFilter(e.target.value)}
                                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                                <dateRange.icon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm flex-1">{dateRange.label}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{count}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Sort Controls */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Sort & Order</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Sort by:</span>
                          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                            {[
                              { value: 'created', label: 'Created', icon: Calendar },
                              { value: 'title', label: 'Title', icon: FileText },
                              { value: 'priority', label: 'Priority', icon: Star },
                              { value: 'status', label: 'Status', icon: Target },
                              { value: 'progress', label: 'Progress', icon: BarChart3 },
                              { value: 'targetDate', label: 'Due Date', icon: Clock }
                            ].map((sortOption) => (
                              <button
                                key={sortOption.value}
                                onClick={() => setGoalSortBy(sortOption.value)}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-2 text-xs font-medium transition-all duration-200 border-r border-gray-300 last:border-r-0",
                                  goalSortBy === sortOption.value
                                    ? "bg-primary-500 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-50"
                                )}
                              >
                                <sortOption.icon className="w-3 h-3" />
                                <span className="hidden sm:inline">{sortOption.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Order:</span>
                          <button
                            onClick={() => setGoalSortOrder(goalSortOrder === 'asc' ? 'desc' : 'asc')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200",
                              "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            {goalSortOrder === 'asc' ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                <span>Ascending</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                <span>Descending</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reset Filters */}
                    {activeFilterCount > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setGoalSearchQuery('');
                            setGoalStatusFilter('all');
                            setGoalPriorityFilter('all');
                            setGoalAssigneeFilter('all');
                            setGoalCategoryFilter('all');
                            setGoalDueDateFilter('all');
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Goals List */}
              <div className="space-y-4">
                {filteredAndSortedGoals.length > 0 ? (
                  filteredAndSortedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      workspaceMembers={teamMembers}
                      workspaceLabels={workspaceLabels}
                      updateGoalMutation={updateGoalMutation}
                      queryClient={queryClient}
                      onToggleMilestone={toggleMilestone}
                      onViewHistory={() => handleViewEditHistory(goal)}
                      onQuickAction={setQuickActionGoalId}
                      isQuickActionOpen={quickActionGoalId === goal.id}
                      onQuickUpdateStatus={quickUpdateStatus}
                      onQuickUpdatePriority={quickUpdatePriority}
                      onDuplicate={duplicateGoal}
                      onDeleteGoal={deleteGoal}
                      onEditGoal={(goalId) => setEditGoalId(goalId)}
                      onAdjustProgress={(goalId) => {
                        const goal = goals.find(g => g.id === goalId);
                        if (goal) setProgressDialogGoal(goal);
                      }}
                      onLinkedEntries={(goalId) => {
                        // Find the first journal entry that links to this goal for the modal
                        const linkedEntry = actualJournalEntries.find(entry => 
                          entry.linkedGoals?.some(link => link.goalId === goalId)
                        );
                        if (linkedEntry) {
                          handleLinkGoalsToEntry(linkedEntry);
                        } else {
                          // Create a temporary entry for linking
                          handleLinkGoalsToEntry({ 
                            id: 'temp-entry', 
                            title: 'Link to Goal', 
                            linkedGoals: [] 
                          });
                        }
                      }}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <Target className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {activeFilterCount > 0 ? 'No goals match your filters' : 'No goals yet'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {activeFilterCount > 0 
                        ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                        : 'Get started by creating your first goal or using a template.'
                      }
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {activeFilterCount > 0 ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setGoalSearchQuery('');
                            setGoalStatusFilter('all');
                            setGoalPriorityFilter('all');
                            setGoalAssigneeFilter('all');
                            setGoalCategoryFilter('all');
                            setGoalDueDateFilter('all');
                          }}
                        >
                          Clear Filters
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowGoalPanel(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Goal
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modals and Side Panels */}
        {showNewEntryModal && (
          <NewEntryModal
            open={showNewEntryModal}
            onOpenChange={setShowNewEntryModal}
          />
        )}

        {(showGoalPanel || editGoalId) && (
          <GoalSidePanel
            isOpen={showGoalPanel || !!editGoalId}
            onClose={() => {
              setShowGoalPanel(false);
              setEditGoalId(null);
            }}
            goal={editGoalId ? goals.find(g => g.id === editGoalId) : undefined}
            teamMembers={teamMembers}
            onSave={(goalData) => {
              // Handle saving goal (create or update)
              console.log('Saving goal:', goalData);
              setShowGoalPanel(false);
              setEditGoalId(null);
            }}
          />
        )}

        {showGoalLinkPanel && selectedJournalEntry && (
          <GoalLinkingSidePanel
            isOpen={showGoalLinkPanel}
            onClose={() => {
              setShowGoalRouterLinkPanel(false);
              setSelectedJournalEntry(null);
            }}
            journalEntry={selectedJournalEntry}
            goals={goals}
            onSave={(links) => {
              // Handle linking goals to journal entry
              console.log('RouterLinking goals:', links);
              setShowGoalRouterLinkPanel(false);
              setSelectedJournalEntry(null);
            }}
          />
        )}

        {showEditHistoryModal && selectedGoalForHistory && (
          <EditHistoryModal
            isOpen={showEditHistoryModal}
            onClose={() => {
              setShowEditHistoryModal(false);
              setSelectedGoalForHistory(null);
            }}
            goal={selectedGoalForHistory}
          />
        )}

        {showTemplateModal && (
          <GoalTemplatesModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onSelectTemplate={handleTemplateSelection}
          />
        )}

        {/* Workspace Settings Side Panel */}
        <WorkspaceSettingsPanel
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
          workspace={{
            id: workspaceIdForAPI,
            name: workspace?.name || 'Workspace',
            description: workspace?.description,
            organization: workspace?.organization
          }}
          userRole={currentUser?.id === workspace?.ownerId ? 'OWNER' : 'admin'} // Default to admin for now
          onWorkspaceUpdate={async (data) => {
            try {
              await workspaceService.updateWorkspace(workspaceId, data);
              toast.success('Workspace updated successfully');
              // Refresh workspace data
              window.location.reload();
            } catch (error) {
              console.error('Error updating workspace:', error);
              toast.error('Failed to update workspace');
            }
          }}
          onArchiveWorkspace={async () => {
            try {
              await workspaceService.archiveWorkspace(workspaceId);
              toast.success('Workspace archived successfully');
              navigate('/workspaces/discovery');
            } catch (error) {
              console.error('Error archiving workspace:', error);
              toast.error('Failed to archive workspace');
            }
          }}
        />

        {/* Invite Team Member Side Panel */}
        <InviteTeamMemberSidePanel
          isOpen={showInviteSidePanel}
          onClose={() => setShowInviteSidePanel(false)}
          workspaceId={workspaceId}
        />

        {/* Create Category Side Panel */}
        <CreateCategorySidePanel
          isOpen={showCategorySidePanel}
          onClose={() => setShowCategorySidePanel(false)}
          workspaceId={workspaceIdForAPI}
        />

        {/* Add File Side Panel */}
        <AddFileSidePanel
          isOpen={showFileSidePanel}
          onClose={() => setShowFileSidePanel(false)}
          workspaceId={workspaceId || ''}
          availableCategories={allCategories}
        />

        {/* Edit File Side Panel */}
        <EditFileSidePanel
          isOpen={showEditFileSidePanel}
          onClose={() => {
            setShowEditFileSidePanel(false);
            setSelectedFile(null);
          }}
          file={selectedFile}
          workspaceId={workspaceId || ''}
          availableCategories={allCategories}
        />


        {/* Goal Side Panel */}
        {(showGoalPanel || editGoalId) && (
          <GoalSidePanel
            isOpen={showGoalPanel || !!editGoalId}
            onClose={() => {
              setShowGoalPanel(false);
              setEditGoalId(null);
            }}
            goal={editGoalId ? goals.find(g => g.id === editGoalId) : undefined}
            teamMembers={teamMembers}
            onSave={async (goalData) => {
              if (!workspaceIdForAPI || !currentUser) {
                toast.error('Unable to save goal - workspace or user not found');
                return;
              }

              console.log('🎯 onSave called with goalData:', goalData);
              console.log('🎯 workspaceIdForAPI:', workspaceIdForAPI);
              console.log('🎯 currentUser:', currentUser);
              console.log('🎯 editGoalId:', editGoalId);

              try {
                if (editGoalId) {
                  // Update existing goal
                  console.log('🎯 Updating existing goal:', editGoalId);
                  await updateGoalMutation.mutateAsync({ goalId: editGoalId, data: goalData });
                  toast.success('Goal updated successfully');
                } else {
                  // Create new goal
                  console.log('🎯 Creating new goal...');
                  if (!currentUser) {
                    console.log('❌ No currentUser available');
                    toast.error('User information not available');
                    return;
                  }
                  
                  const createData = {
                    title: goalData.title,
                    description: goalData.description,
                    priority: goalData.priority,
                    targetDate: goalData.targetDate,
                    category: goalData.category,
                    assignedToId: goalData.assignedTo?.id || null,
                    reviewerId: goalData.reviewer?.id || null,
                    accountableId: goalData.accountable?.id || currentUser.id,
                    responsibleIds: goalData.responsible?.map(r => r.id) || [currentUser.id],
                    consultedIds: goalData.consulted?.map(c => c.id) || [],
                    informedIds: goalData.informed?.map(i => i.id) || [],
                    milestones: goalData.milestones?.map(m => ({
                      title: m.title,
                      description: m.description,
                      targetDate: m.targetDate,
                      assignedTo: m.assignedTo
                    })) || []
                  };

                  const createdGoal = await createGoalMutation.mutateAsync({ 
                    workspaceId: workspaceIdForAPI, 
                    data: createData 
                  });
                  
                  console.log('🎯 Goal created successfully:', createdGoal);
                  console.log('🎯 WorkspaceId for invalidation:', workspaceIdForAPI);
                  
                  // Send notifications
                  await notifyGoalCreated(createdGoal, currentUser as GoalTeamMember);
                  
                  toast.success('Goal created successfully');
                }
                
                setShowGoalPanel(false);
                setEditGoalId(null);
                
              } catch (error) {
                console.error('Failed to save goal:', error);
                toast.error('Failed to save goal');
              }
            }}
          />
        )}

        {/* Goal RouterLinking Side Panel */}
        {showGoalLinkPanel && selectedJournalEntry && (
          <GoalLinkingSidePanel
            isOpen={showGoalLinkPanel}
            onClose={() => {
              setShowGoalRouterLinkPanel(false);
              setSelectedJournalEntry(null);
            }}
            journalEntry={selectedJournalEntry}
            goals={goals}
            onSave={(links) => {
              console.log('Goal links saved:', links);
              setShowGoalRouterLinkPanel(false);
              setSelectedJournalEntry(null);
            }}
          />
        )}

        {/* Edit History Modal */}
        {showEditHistoryModal && selectedGoalForHistory && (
          <EditHistoryModal
            isOpen={showEditHistoryModal}
            onClose={() => {
              setShowEditHistoryModal(false);
              setSelectedGoalForHistory(null);
            }}
            goal={selectedGoalForHistory}
          />
        )}

        {/* Goal Templates Modal */}
        {showTemplateModal && (
          <GoalTemplatesModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onSelectTemplate={handleTemplateSelection}
          />
        )}

        {/* New Entry Modal */}
        <NewEntryModal
          open={showNewEntryModal}
          onOpenChange={setShowNewEntryModal}
        />

        {/* Goal Completion Dialog */}
        {completionDialogGoal && (
          <GoalCompletionDialog
            goal={completionDialogGoal}
            isOpen={!!completionDialogGoal}
            onClose={() => setCompletionDialogGoal(null)}
            onCompleted={(completedGoal, meta) => {
              setCompletionDialogGoal(null);
              // Update UI feedback and celebrate around the goal area
              toast.success(`Goal "${completedGoal.title || 'Untitled Goal'}" completed!`);
              // Confetti burst centered horizontally near the goal list
              confetti({ particleCount: 70, spread: 70, startVelocity: 35, origin: { x: 0.5, y: 0.25 }, ticks: 200, scalar: 0.9 });
              setTimeout(() => confetti({ particleCount: 50, spread: 90, startVelocity: 25, origin: { x: 0.5, y: 0.25 }, ticks: 160, scalar: 0.8 }), 120);
              // If user added notes and backend doesn't echo them immediately, optimistically update cache
              if (meta?.notes && meta.notes.trim()) {
                const goalIndex = goals.findIndex(g => g.id === completedGoal.id);
                if (goalIndex !== -1) {
                  goals[goalIndex].completionNotes = meta.notes.trim();
                }
              }
            }}
          />
        )}

        {/* Goal Progress Dialog */}
        {progressDialogGoal && (
          <GoalProgressDialog
            goal={progressDialogGoal}
            isOpen={!!progressDialogGoal}
            onClose={() => setProgressDialogGoal(null)}
            onUpdated={(updatedGoal) => {
              setProgressDialogGoal(null);
              // Check if completion dialog should be shown after progress update
              setTimeout(() => {
                const freshGoal = goals.find(g => g.id === updatedGoal.id);
                if (freshGoal && shouldShowCompletionDialog(freshGoal)) {
                  setCompletionDialogGoal(freshGoal);
                }
              }, 500);
            }}
          />
        )}

      </div>
    </div>
  );
}
