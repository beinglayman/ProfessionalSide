import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Globe, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Trash2, Info, Lightbulb, Clock, Zap, TrendingUp, ChevronDown, ChevronUp, Heart, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { ConnectionCard } from '../../components/network/connection-card';
import NetworkProgress from '../../components/network/network-progress';
import {
  useConnections,
  useConnectionRequests,
  useFollowers,
  useNetworkStats,
  useNetworkSuggestions,
  useConnectionMutations,
  useConnectionRequestMutations,
  useFollowerMutations,
  useNetworkFilters,
  useNetworkSearch,
  useAvailableSkills,
  useAvailableWorkspaces,
} from '../../hooks/useNetwork';
import { Connection, ConnectionRequest, Follower, NetworkSuggestion } from '../../types/network';

type NetworkTab = 'core' | 'extended' | 'requests' | 'followers';

type BulkAction = 'move-to-core' | 'move-to-extended' | 'remove' | 'follow';

interface NetworkPageProps {}

// Sample connection data with enhanced management properties
const sampleConnections: Connection[] = [
  {
    id: 'conn-001',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    position: 'Senior Frontend Engineer',
    department: 'Engineering',
    organization: 'TechCorp',
    connectionType: 'core',
    context: 'workspace-collaborator',
    mutualConnections: 12,
    sharedWorkspaces: ['React Component Library', 'Design System'],
    latestJournal: {
      title: 'Building Accessible React Components',
      abstract: 'Implemented comprehensive accessibility features in our design system, including ARIA labels, keyboard navigation, and screen reader support. This initiative improved our app\'s accessibility score from 68% to 94%.',
      createdAt: new Date('2025-06-23T10:30:00Z'),
      skills: ['React', 'Accessibility', 'TypeScript', 'Design Systems']
    },
    skills: ['React', 'TypeScript', 'Frontend Architecture', 'Accessibility'],
    isOnline: true,
    connectedAt: new Date('2024-08-15T10:00:00Z'),
    lastInteraction: new Date('2025-06-24T14:30:00Z'),
    interactionCount: 47,
    collaborationScore: 92,
    appreciatedByCore: 5,
    networkHealth: 'strong'
  },
  {
    id: 'conn-002',
    name: 'Marcus Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    position: 'DevOps Engineer',
    department: 'Infrastructure',
    organization: 'TechCorp',
    connectionType: 'core',
    context: 'workspace-collaborator',
    mutualConnections: 8,
    sharedWorkspaces: ['Backend API Migration'],
    latestJournal: {
      title: 'Kubernetes Migration Success',
      abstract: 'Led the migration of our microservices architecture from Docker Swarm to Kubernetes. Achieved 99.9% uptime during transition and reduced deployment time by 60%.',
      createdAt: new Date('2025-06-22T14:15:00Z'),
      skills: ['Kubernetes', 'Docker', 'DevOps', 'Microservices']
    },
    skills: ['Kubernetes', 'AWS', 'Docker', 'Infrastructure'],
    isOnline: false,
    lastActive: new Date('2025-06-25T16:20:00Z'),
    connectedAt: new Date('2024-09-20T14:00:00Z'),
    lastInteraction: new Date('2025-06-22T09:15:00Z'),
    interactionCount: 28,
    collaborationScore: 85,
    appreciatedByCore: 3,
    networkHealth: 'strong'
  },
  {
    id: 'conn-003',
    name: 'Dr. Emily Watson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    position: 'Chief Technology Officer',
    department: 'Executive',
    organization: 'InnovateLabs',
    connectionType: 'extended',
    context: 'followed-professional',
    mutualConnections: 23,
    sharedWorkspaces: [],
    latestJournal: {
      title: 'AI Ethics in Product Development',
      abstract: 'Establishing ethical AI guidelines for our product development lifecycle. Created frameworks for bias detection, explainable AI decisions, and responsible data usage.',
      createdAt: new Date('2025-06-21T09:45:00Z'),
      skills: ['AI Ethics', 'Machine Learning', 'Leadership', 'Product Strategy']
    },
    skills: ['AI/ML', 'Leadership', 'Strategy', 'Ethics'],
    isOnline: true,
    connectedAt: new Date('2025-02-10T11:30:00Z'),
    lastInteraction: new Date('2025-06-21T16:45:00Z'),
    interactionCount: 15,
    collaborationScore: 78,
    appreciatedByCore: 4,
    networkHealth: 'moderate',
    suggestedPromotionReason: 'High engagement and appreciated by 4 core connections'
  },
  {
    id: 'conn-004',
    name: 'Alex Kim',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    position: 'UX Research Manager',
    department: 'Design',
    organization: 'DesignFirst',
    connectionType: 'core',
    context: 'former-colleague',
    mutualConnections: 15,
    sharedWorkspaces: ['User Research Initiative'],
    latestJournal: {
      title: 'Remote User Testing at Scale',
      abstract: 'Developed a comprehensive remote user testing framework that scales across multiple product teams. Increased research participation by 300% and reduced time-to-insights by 50%.',
      createdAt: new Date('2025-06-20T11:30:00Z'),
      skills: ['User Research', 'Remote Testing', 'Data Analysis', 'Team Leadership']
    },
    skills: ['UX Research', 'Data Analysis', 'Design Thinking', 'Leadership'],
    isOnline: false,
    lastActive: new Date('2025-06-24T13:45:00Z'),
    connectedAt: new Date('2024-06-10T09:00:00Z'),
    lastInteraction: new Date('2025-06-20T11:20:00Z'),
    interactionCount: 52,
    collaborationScore: 88,
    appreciatedByCore: 6,
    networkHealth: 'strong'
  },
  {
    id: 'conn-005',
    name: 'Jennifer Liu',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
    position: 'Product Marketing Manager',
    department: 'Marketing',
    organization: 'TechCorp',
    connectionType: 'core',
    context: 'workspace-collaborator',
    mutualConnections: 9,
    sharedWorkspaces: ['Q2 Product Launch', 'Marketing Analytics'],
    latestJournal: {
      title: 'Data-Driven Product Positioning',
      abstract: 'Implemented a new product positioning strategy based on comprehensive market research and user behavior analytics. Resulted in 40% increase in conversion rates and improved brand perception scores.',
      createdAt: new Date('2025-06-19T15:20:00Z'),
      skills: ['Product Marketing', 'Market Research', 'Analytics', 'Brand Strategy']
    },
    skills: ['Product Marketing', 'Analytics', 'Strategy', 'Communication'],
    isOnline: true,
    connectedAt: new Date('2024-11-05T13:30:00Z'),
    lastInteraction: new Date('2025-06-25T10:45:00Z'),
    interactionCount: 34,
    collaborationScore: 79,
    appreciatedByCore: 2,
    networkHealth: 'strong'
  },
  {
    id: 'conn-006',
    name: 'David Park',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    position: 'Senior Backend Engineer',
    department: 'Engineering',
    organization: 'DataFlow Inc',
    connectionType: 'extended',
    context: 'industry-contact',
    mutualConnections: 6,
    sharedWorkspaces: [],
    latestJournal: {
      title: 'GraphQL Federation Architecture',
      abstract: 'Designed and implemented a federated GraphQL architecture that unified 12 microservices into a single, cohesive API. Improved developer experience and reduced integration complexity by 70%.',
      createdAt: new Date('2025-06-18T08:30:00Z'),
      skills: ['GraphQL', 'Microservices', 'API Design', 'System Architecture']
    },
    skills: ['Node.js', 'GraphQL', 'System Design', 'Microservices'],
    isOnline: false,
    lastActive: new Date('2025-06-23T10:15:00Z'),
    connectedAt: new Date('2025-01-18T16:20:00Z'),
    lastInteraction: new Date('2025-06-18T14:30:00Z'),
    interactionCount: 12,
    collaborationScore: 82,
    appreciatedByCore: 3,
    networkHealth: 'moderate',
    suggestedPromotionReason: 'Strong technical collaboration and skill overlap'
  },
  // Add some inactive connections to demonstrate cleanup suggestions
  {
    id: 'conn-007',
    name: 'Tom Wilson',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
    position: 'Product Manager',
    department: 'Product',
    organization: 'StartupCorp',
    connectionType: 'extended',
    context: 'industry-contact',
    mutualConnections: 2,
    sharedWorkspaces: [],
    skills: ['Product Management', 'Strategy', 'Analytics'],
    isOnline: false,
    lastActive: new Date('2024-12-15T09:00:00Z'),
    connectedAt: new Date('2024-05-20T11:30:00Z'),
    lastInteraction: new Date('2024-10-05T16:20:00Z'), // 2+ months ago
    interactionCount: 3,
    collaborationScore: 25,
    appreciatedByCore: 0,
    networkHealth: 'weak'
  },
  {
    id: 'conn-008',
    name: 'Rachel Green',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    position: 'Marketing Specialist',
    department: 'Marketing',
    organization: 'OldCompany Ltd',
    connectionType: 'extended',
    context: 'former-colleague',
    mutualConnections: 1,
    sharedWorkspaces: [],
    skills: ['Digital Marketing', 'Content Creation'],
    isOnline: false,
    lastActive: new Date('2024-08-10T14:00:00Z'),
    connectedAt: new Date('2023-12-10T09:00:00Z'), // Over a year ago
    lastInteraction: new Date('2024-08-10T14:00:00Z'), // 4+ months ago
    interactionCount: 2,
    collaborationScore: 15,
    appreciatedByCore: 0,
    networkHealth: 'weak'
  },
  {
    id: 'conn-009',
    name: 'Mike Johnson',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    position: 'Sales Representative',
    department: 'Sales',
    organization: 'Legacy Systems Inc',
    connectionType: 'extended',
    context: 'industry-contact',
    mutualConnections: 0,
    sharedWorkspaces: [],
    skills: ['Sales', 'Customer Relations'],
    isOnline: false,
    lastActive: new Date('2024-06-01T10:00:00Z'),
    connectedAt: new Date('2023-08-15T12:00:00Z'), // Over a year ago
    lastInteraction: undefined, // Never interacted since connection
    interactionCount: 0,
    collaborationScore: 5,
    appreciatedByCore: 0,
    networkHealth: 'weak'
  },
  {
    id: 'conn-010',
    name: 'Anna Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    position: 'HR Manager',
    department: 'Human Resources',
    organization: 'Corporate Solutions',
    connectionType: 'extended',
    context: 'industry-contact',
    mutualConnections: 1,
    sharedWorkspaces: [],
    skills: ['Human Resources', 'Talent Acquisition'],
    isOnline: false,
    lastActive: new Date('2024-04-20T08:00:00Z'),
    connectedAt: new Date('2023-11-05T15:30:00Z'), // Over a year ago
    lastInteraction: new Date('2024-04-20T08:00:00Z'), // 8+ months ago
    interactionCount: 1,
    collaborationScore: 10,
    appreciatedByCore: 0,
    networkHealth: 'weak'
  }
];

// Sample connection requests data
const sampleConnectionRequests: ConnectionRequest[] = [
  {
    id: 'req-001',
    name: 'Jennifer Adams',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    position: 'Senior UX Designer',
    department: 'Design',
    organization: 'InnovateTech',
    mutualConnections: 5,
    sharedWorkspaces: ['Design System Updates'],
    skills: ['UX Design', 'Prototyping', 'User Research'],
    requestedAt: new Date('2025-06-24T14:30:00Z'),
    requestMessage: 'Hi! I noticed we have mutual connections and work on similar design challenges. Would love to connect and potentially collaborate.',
    isOnline: true,
    requestReason: 'workspace-collaborator'
  },
  {
    id: 'req-002',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    position: 'Full Stack Developer',
    department: 'Engineering',
    organization: 'StartupVenture',
    mutualConnections: 3,
    sharedWorkspaces: [],
    skills: ['React', 'Node.js', 'TypeScript', 'GraphQL'],
    requestedAt: new Date('2025-06-23T09:15:00Z'),
    requestMessage: 'Saw your excellent work on the React component library. Our teams might benefit from sharing best practices!',
    isOnline: false,
    requestReason: 'industry-contact'
  },
  {
    id: 'req-003',
    name: 'Lisa Zhang',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    position: 'Product Manager',
    department: 'Product',
    organization: 'TechCorp Solutions',
    mutualConnections: 8,
    sharedWorkspaces: ['Backend API Migration'],
    skills: ['Product Strategy', 'Agile', 'Data Analysis'],
    requestedAt: new Date('2025-06-22T16:45:00Z'),
    isOnline: true,
    requestReason: 'mutual-connection'
  }
];

// Sample followers data
const sampleFollowers: Follower[] = [
  {
    id: 'fol-001',
    name: 'Alex Thompson',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    position: 'Junior Frontend Developer',
    department: 'Engineering',
    organization: 'WebDev Studios',
    followingSince: new Date('2025-05-15T10:00:00Z'),
    mutualConnections: 2,
    sharedWorkspaces: [],
    skills: ['React', 'CSS', 'JavaScript'],
    isOnline: true,
    hasRequestedConnection: true,
    requestedAt: new Date('2025-06-25T11:30:00Z'),
    followerReason: 'content-appreciation',
    lastActivity: new Date('2025-06-25T09:00:00Z'),
    recentInteractions: 8
  },
  {
    id: 'fol-002',
    name: 'Maria Santos',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    position: 'Senior Data Scientist',
    department: 'Analytics',
    organization: 'DataCorp',
    followingSince: new Date('2025-04-20T14:20:00Z'),
    mutualConnections: 4,
    sharedWorkspaces: [],
    skills: ['Python', 'Machine Learning', 'Data Visualization'],
    isOnline: false,
    hasRequestedConnection: false,
    followerReason: 'industry-expert',
    lastActivity: new Date('2025-06-24T16:45:00Z'),
    recentInteractions: 12
  },
  {
    id: 'fol-003',
    name: 'Robert Chen',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    position: 'DevOps Engineer',
    department: 'Infrastructure',
    organization: 'CloudFirst Inc',
    followingSince: new Date('2025-06-10T08:15:00Z'),
    mutualConnections: 6,
    sharedWorkspaces: ['Backend API Migration'],
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    isOnline: true,
    hasRequestedConnection: false,
    followerReason: 'workspace-interest',
    lastActivity: new Date('2025-06-26T07:30:00Z'),
    recentInteractions: 5
  },
  {
    id: 'fol-004',
    name: 'Sarah Mitchell',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    position: 'Technical Writer',
    department: 'Documentation',
    organization: 'OpenSource Foundation',
    followingSince: new Date('2025-03-30T12:00:00Z'),
    mutualConnections: 1,
    sharedWorkspaces: [],
    skills: ['Technical Writing', 'Documentation', 'API Documentation'],
    isOnline: false,
    hasRequestedConnection: true,
    requestedAt: new Date('2025-06-20T15:20:00Z'),
    followerReason: 'content-appreciation',
    lastActivity: new Date('2025-06-25T14:00:00Z'),
    recentInteractions: 15
  },
  {
    id: 'fol-005',
    name: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
    position: 'Software Architect',
    department: 'Engineering',
    organization: 'Enterprise Solutions Ltd',
    followingSince: new Date('2025-02-14T09:45:00Z'),
    mutualConnections: 9,
    sharedWorkspaces: ['React Component Library'],
    skills: ['System Architecture', 'Microservices', 'Scalability'],
    isOnline: true,
    hasRequestedConnection: false,
    followerReason: 'mutual-follower',
    lastActivity: new Date('2025-06-26T10:15:00Z'),
    recentInteractions: 3
  }
];

export function NetworkPage({}: NetworkPageProps) {
  const [activeTab, setActiveTab] = useState<NetworkTab>('core');
  
  // Enhanced network management state
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set());
  const [draggedConnection, setDraggedConnection] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [networkWarnings, setNetworkWarnings] = useState<string[]>([]);

  // Network filters and search
  const { filters, updateFilter, clearFilters, hasActiveFilters } = useNetworkFilters();
  const { searchQuery, debouncedQuery, setSearchQuery } = useNetworkSearch();

  // Dynamic data hooks
  const { data: coreConnectionsData, isLoading: coreLoading, error: coreError } = useConnections('core', { ...filters, search: debouncedQuery });
  const { data: extendedConnectionsData, isLoading: extendedLoading, error: extendedError } = useConnections('extended', { ...filters, search: debouncedQuery });
  const { data: connectionRequestsData, isLoading: requestsLoading } = useConnectionRequests();
  const { data: followersData, isLoading: followersLoading } = useFollowers(filters);
  const { data: networkStats, isLoading: statsLoading } = useNetworkStats();
  const { data: suggestions, isLoading: suggestionsLoading } = useNetworkSuggestions();
  
  // Filter options
  const { data: availableSkills } = useAvailableSkills();
  const { data: availableWorkspaces } = useAvailableWorkspaces();

  // Mutations
  const { moveConnection, removeConnection, bulkUpdate } = useConnectionMutations();
  const { sendRequest, acceptRequest, declineRequest } = useConnectionRequestMutations();
  const { connectWithFollower } = useFollowerMutations();

  // Extract connections - data is now returned directly as array from useConnections
  const coreConnections = coreConnectionsData || [];
  const extendedConnections = extendedConnectionsData || [];
  
  // Debug: Log what the main component receives
  React.useEffect(() => {
    console.log('🖥️ Main component data update:', {
      activeTab,
      coreCount: coreConnections.length,
      extendedCount: extendedConnections.length,
      coreHasYash: coreConnections.some((c: any) => c.name === 'Yash Saini'),
      extendedHasYash: extendedConnections.some((c: any) => c.name === 'Yash Saini'),
      coreNames: coreConnections.map((c: any) => c.name).slice(0, 3),
      extendedNames: extendedConnections.map((c: any) => c.name).slice(0, 3)
    });
  }, [activeTab, coreConnections, extendedConnections]);
  
  const networkCounts = {
    core: coreConnections.length, // Use actual array length instead of stats
    extended: extendedConnections.length, // Use actual array length instead of stats  
    requests: connectionRequestsData?.length || 0,
    followers: networkStats?.totalFollowers || (followersData?.data?.length || 0)
  };
  
  // Debug: Log the counts being used
  React.useEffect(() => {
    console.log('📊 Network counts displayed:', {
      core: networkCounts.core,
      extended: networkCounts.extended,
      statsCore: networkStats?.coreConnections,
      statsExtended: networkStats?.extendedConnections
    });
  }, [networkCounts.core, networkCounts.extended, networkStats?.coreConnections, networkStats?.extendedConnections]);
  
  // Network capacity analysis
  const coreCapacityWarning = networkCounts.core >= 80;
  const extendedCapacityWarning = networkCounts.extended >= 160;
  const coreCapacityFull = networkCounts.core >= 100;
  const extendedCapacityFull = networkCounts.extended >= 200;
  
  // Check for network warnings
  React.useEffect(() => {
    const warnings: string[] = [];
    if (coreCapacityWarning && !coreCapacityFull) {
      warnings.push('Your Core Network is approaching capacity. Consider reviewing connections.');
    }
    if (coreCapacityFull) {
      warnings.push('Your Core Network is full (100/100). You must remove connections before adding new ones.');
    }
    if (extendedCapacityWarning && !extendedCapacityFull) {
      warnings.push('Your Extended Network is approaching capacity. Consider organizing connections.');
    }
    if (extendedCapacityFull) {
      warnings.push('Your Extended Network is full (200/200). You must remove connections before adding new ones.');
    }
    setNetworkWarnings(warnings);
  }, [networkCounts.core, networkCounts.extended, coreCapacityWarning, extendedCapacityWarning, coreCapacityFull, extendedCapacityFull]);

  // Use dynamic filter options
  const allSkills = availableSkills || [];
  const allWorkspaces = availableWorkspaces || [];

  // Filter connections - filtering is now handled by API, so we just return the current connections
  const filteredConnections = useMemo(() => {
    const connections = activeTab === 'core' ? coreConnections : extendedConnections;
    console.log(`🔄 filteredConnections updated for ${activeTab}:`, {
      count: connections.length,
      names: connections.map((c: any) => c.name).slice(0, 3),
      hasYash: connections.some((c: any) => c.name === 'Yash Saini')
    });
    return connections;
  }, [activeTab, coreConnections, extendedConnections]);

  // Use dynamic suggestions from API, with fallback for network capacity warnings
  const smartSuggestions = useMemo(() => {
    const apiSuggestions = suggestions || [];
    const localSuggestions = [];

    // Add local capacity warnings if not already provided by API
    if (coreCapacityWarning && !apiSuggestions.some(s => s.type === 'capacity-warning')) {
      localSuggestions.push({
        id: 'core-capacity',
        type: 'capacity-warning' as const,
        title: 'Core Network Approaching Capacity',
        description: `You have ${networkCounts.core}/100 core connections. Consider reviewing less active connections.`,
        priority: 'high' as const,
        actionable: true
      });
    }
    
    if (extendedCapacityWarning && !apiSuggestions.some(s => s.type === 'capacity-warning')) {
      localSuggestions.push({
        id: 'extended-capacity', 
        type: 'capacity-warning' as const,
        title: 'Extended Network Approaching Capacity',
        description: `You have ${networkCounts.extended}/200 extended connections. Consider cleanup or promotion to core.`,
        priority: 'medium' as const,
        actionable: true
      });
    }

    return [...apiSuggestions, ...localSuggestions].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [suggestions, coreCapacityWarning, extendedCapacityWarning, networkCounts]);
  
  const tabs = [
    { 
      id: 'core' as NetworkTab, 
      label: 'My Core Network', 
      count: networkCounts.core,
      maxCount: 100,
      icon: Users,
      warningThreshold: 80
    },
    { 
      id: 'extended' as NetworkTab, 
      label: 'My Extended Network', 
      count: networkCounts.extended,
      maxCount: 200,
      icon: Globe,
      warningThreshold: 160
    },
    { 
      id: 'requests' as NetworkTab, 
      label: 'Connection Requests', 
      count: networkCounts.requests,
      icon: UserPlus 
    },
    { 
      id: 'followers' as NetworkTab, 
      label: 'Followers', 
      count: networkCounts.followers,
      icon: Heart 
    },
  ];

  // Bulk action handlers
  const handleSelectConnection = useCallback((connectionId: string, isSelected: boolean) => {
    setSelectedConnections(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(connectionId);
      } else {
        newSet.delete(connectionId);
      }
      return newSet;
    });
  }, []);
  
  const handleSelectAll = useCallback(() => {
    const allIds = filteredConnections.map(conn => conn.id);
    setSelectedConnections(new Set(allIds));
  }, [filteredConnections]);
  
  const handleDeselectAll = useCallback(() => {
    setSelectedConnections(new Set());
  }, []);
  
  const handleBulkAction = useCallback((action: BulkAction) => {
    const selectedIds = Array.from(selectedConnections);
    
    const bulkActions = [];
    
    if (action === 'move-to-core') {
      bulkActions.push({ type: 'move-to-core' as const, userIds: selectedIds });
    } else if (action === 'move-to-extended') {
      bulkActions.push({ type: 'move-to-extended' as const, userIds: selectedIds });
    } else if (action === 'remove') {
      bulkActions.push({ type: 'remove' as const, userIds: selectedIds });
    }
    
    if (bulkActions.length > 0) {
      bulkUpdate(bulkActions);
      setSelectedConnections(new Set());
      setShowBulkActions(false);
    }
  }, [selectedConnections, bulkUpdate]);
  
  // Drag and drop handlers
  const handleDragStart = useCallback((connectionId: string) => {
    setDraggedConnection(connectionId);
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setDraggedConnection(null);
  }, []);
  
  const handleDrop = useCallback(async (targetTab: 'core' | 'extended') => {
    console.log('🎯 handleDrop called with:', { targetTab, draggedConnection });
    console.log('🎯 moveConnection function:', typeof moveConnection);
    
    if (draggedConnection) {
      const connectionData = {
        connectionId: draggedConnection,
        updateData: {
          connectionType: targetTab,
          reason: `Moved to ${targetTab} network via drag and drop`
        }
      };
      
      console.log('🎯 About to call moveConnection with:', connectionData);
      
      try {
        moveConnection(connectionData);
      } catch (error) {
        console.error('🎯 moveConnection error:', error);
      }
      
      setDraggedConnection(null);
    }
  }, [draggedConnection, moveConnection]);
  
  // Tab drop handlers
  const handleTabDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  
  const handleTabDrop = useCallback((e: React.DragEvent, targetTab: 'core' | 'extended') => {
    e.preventDefault();
    if (draggedConnection) {
      // Check capacity before allowing drop
      const targetIsFull = (targetTab === 'core' && coreCapacityFull) || 
                           (targetTab === 'extended' && extendedCapacityFull);
      
      if (targetIsFull) {
        // Show error feedback
        console.log(`Cannot move to ${targetTab} - network is full`);
        return;
      }
      
      handleDrop(targetTab);
    }
  }, [draggedConnection, handleDrop, coreCapacityFull, extendedCapacityFull]);
  
  // Get dragged connection details
  const draggedConnectionData = useMemo(() => {
    if (!draggedConnection) return null;
    // Look in both core and extended connections for the dragged item
    const allConnections = [...coreConnections, ...extendedConnections];
    return allConnections.find(conn => conn.id === draggedConnection);
  }, [draggedConnection, coreConnections, extendedConnections]);
  
  const renderNetworkContent = () => {
    const connections = filteredConnections;
    
    return (
      <div className="space-y-6">        
        {/* Management mode actions - only show when management mode is active */}
        {isManagementMode && (activeTab === 'core' || activeTab === 'extended') && (
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-4">
              {!draggedConnection && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                  <Info className="h-3 w-3" />
                  <span>Drag cards to tabs above to move between networks</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{selectedConnections.size} selected</span>
                {selectedConnections.size > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBulkActions(!showBulkActions)}
                  >
                    Actions
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                Clear
              </Button>
            </div>
          </div>
        )}
        
        {/* Bulk actions panel */}
        {showBulkActions && selectedConnections.size > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                Actions for {selectedConnections.size} connection{selectedConnections.size !== 1 ? 's' : ''}
              </h4>
              <Button size="sm" variant="ghost" onClick={() => setShowBulkActions(false)}>
                ×
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTab === 'extended' && !coreCapacityFull && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('move-to-core')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  Move to Core
                </Button>
              )}
              {activeTab === 'core' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('move-to-extended')}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  Move to Extended
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('remove')}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}
        
        {/* Page Controls */}
        <div className="flex items-center justify-end gap-4">
          {/* Smart Network Insights Button */}
          {smartSuggestions.length > 0 && (
            <button
              onClick={() => setShowSmartSuggestions(!showSmartSuggestions)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Lightbulb className="h-4 w-4" />
              <span>Insights</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {smartSuggestions.length}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showSmartSuggestions && "rotate-180")} />
            </button>
          )}
          
          <button
            onClick={() => setShowSearchFilters(!showSearchFilters)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search & Filter</span>
            {(searchQuery || hasActiveFilters) && (
              <span className="ml-1 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                {[searchQuery !== '', hasActiveFilters].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSearchFilters && "rotate-180")} />
          </button>
          
          {/* Management Mode Toggle */}
          {(activeTab === 'core' || activeTab === 'extended') && (
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={isManagementMode}
                  onChange={(e) => {
                    setIsManagementMode(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedConnections(new Set());
                      setShowBulkActions(false);
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Management Mode
              </label>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        {showSearchFilters && (
          <div className="mb-4 space-y-3">
            {/* Search and Filters in One Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {/* Search Input */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  />
                </div>
              </div>

              {/* Skill Filter */}
              <div>
                <select
                  value={filters.skills?.[0] || ''}
                  onChange={(e) => updateFilter('skills', e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">All Skills</option>
                  {allSkills.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              {/* Workspace Filter */}
              <div>
                <select
                  value={filters.workspaces?.[0] || ''}
                  onChange={(e) => updateFilter('workspaces', e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">All Workspaces</option>
                  {allWorkspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.name}>{workspace.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filter Tags and Clear Button */}
            {(searchQuery || hasActiveFilters) && (
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ml-1 hover:bg-blue-200 rounded p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.skills?.map(skill => (
                    <span key={skill} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      {skill}
                      <button
                        onClick={() => updateFilter('skills', [])}
                        className="ml-1 hover:bg-green-200 rounded p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {filters.workspaces?.map(workspace => (
                    <span key={workspace} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {workspace}
                      <button
                        onClick={() => updateFilter('workspaces', [])}
                        className="ml-1 hover:bg-purple-200 rounded p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    clearFilters();
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Smart Network Insights Panel */}
        {showSmartSuggestions && smartSuggestions.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <h3 className="text-sm font-medium text-blue-900">Smart Network Insights</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {smartSuggestions.slice(0, 6).map((suggestion) => {
                const priorityColors = {
                  high: 'bg-red-50 border-red-200 text-red-800',
                  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                  low: 'bg-green-50 border-green-200 text-green-800'
                };
                
                const suggestionIcons = {
                  'network-health': TrendingUp,
                  'activity': Clock,
                  'connection': Zap
                };
                
                const SuggestionIcon = suggestionIcons[suggestion.type];
                
                return (
                  <div key={suggestion.id} className="flex items-start gap-2 p-3 bg-white rounded-md border border-gray-200">
                    <div className={cn('p-1 rounded-full', priorityColors[suggestion.priority])}>
                      <SuggestionIcon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-gray-900 mb-1">{suggestion.title}</h4>
                      <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs h-6 px-2"
                        onClick={() => {
                          console.log('Executing suggestion action:', suggestion.action);
                          // Handle different suggestion actions
                          if (suggestion.type === 'capacity-warning') {
                            setIsManagementMode(true);
                            setShowSmartSuggestions(false);
                          }
                          // Add more action handlers as needed
                        }}
                      >
                        {suggestion.action}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {smartSuggestions.length > 6 && (
              <div className="text-center pt-3 border-t border-blue-200 mt-3">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-blue-600 hover:text-blue-700 text-xs"
                  onClick={() => {
                    console.log('View all insights clicked');
                    // Could navigate to a dedicated insights page or expand all suggestions
                    // For now, just expand the suggestions panel if collapsed
                    setShowSmartSuggestions(true);
                  }}
                >
                  View all {smartSuggestions.length} insights
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Connections display */}
        {connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map(connection => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                viewMode="grid"
                isManagementMode={isManagementMode}
                isSelected={selectedConnections.has(connection.id)}
                onSelect={(isSelected) => handleSelectConnection(connection.id, isSelected)}
                onMessage={() => {
                  console.log('Message', connection.name);
                  // Open messaging interface or navigate to messages
                  window.open(`/messages?user=${connection.id}`, '_blank');
                }}
                onViewProfile={() => {
                  console.log('View profile', connection.name);
                  // Navigate to user profile
                  window.open(`/profile/${connection.id}`, '_blank');
                }}
                onDragStart={() => handleDragStart(connection.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggedConnection === connection.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No connections found matching your criteria</p>
            {(searchQuery || hasActiveFilters) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  clearFilters();
                }}
                className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'core':
        return (
          <div className="space-y-6">
            {/* Network warnings */}
            {networkWarnings.length > 0 && (
              <div className="space-y-2">
                {networkWarnings.map((warning, index) => (
                  <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800">{warning}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Core Network Info Card - Hidden in Management Mode */}
            {!isManagementMode && (
              <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900">
                      My Core Network
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Your closest professional connections including workspace collaborators and chosen connections. Limited to 100 connections for meaningful relationships.
                    </p>
                  </div>
                </div>
                <NetworkProgress
                  type="core"
                  current={networkCounts.core}
                  max={100}
                  warningThreshold={80}
                />
              </div>
            )}
            
            {/* Drop zone for drag and drop */}
            {draggedConnection && activeTab !== 'core' && (
              <div 
                className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-6 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop('core')}
              >
                <ArrowUpCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700 font-medium">Drop here to move to Core Network</p>
              </div>
            )}
            
            {renderNetworkContent()}
          </div>
        );

      case 'extended':
        return (
          <div className="space-y-6">
            {/* Network warnings */}
            {networkWarnings.length > 0 && (
              <div className="space-y-2">
                {networkWarnings.map((warning, index) => (
                  <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800">{warning}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Extended Network Info Card - Hidden in Management Mode */}
            {!isManagementMode && (
              <div className="mb-6 p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <Globe className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-purple-900">
                      My Extended Network
                    </h3>
                    <p className="mt-1 text-sm text-purple-700">
                      Professionals in your extended network connected over common industry/skills or through mutual contacts. Limited to 200 connections for quality networking.
                    </p>
                  </div>
                </div>
                <NetworkProgress
                  type="extended"
                  current={networkCounts.extended}
                  max={200}
                  warningThreshold={160}
                />
              </div>
            )}
            
            {/* Drop zone for drag and drop */}
            {draggedConnection && activeTab !== 'extended' && (
              <div 
                className="border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg p-6 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop('extended')}
              >
                <ArrowDownCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-purple-700 font-medium">Drop here to move to Extended Network</p>
              </div>
            )}
            
            {renderNetworkContent()}
          </div>
        );


      case 'requests':
        return (
          <div className="space-y-6">
            
            {/* Connection Requests List */}
            <div className="space-y-4">
              {requestsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading connection requests...</p>
                </div>
              ) : connectionRequestsData && connectionRequestsData.length > 0 ? (
                connectionRequestsData.map((request) => {
                const requestReasonLabels = {
                  'workspace-collaborator': 'Workspace Collaborator',
                  'industry-contact': 'Industry Contact',
                  'mutual-connection': 'Mutual Connection',
                  'found-profile': 'Found Profile'
                };
                
                const requestReasonColors = {
                  'workspace-collaborator': 'bg-blue-100 text-blue-700 border-blue-200',
                  'industry-contact': 'bg-purple-100 text-purple-700 border-purple-200',
                  'mutual-connection': 'bg-green-100 text-green-700 border-green-200',
                  'found-profile': 'bg-gray-100 text-gray-700 border-gray-200'
                };
                
                return (
                  <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Link to={`/profile/${request.id}`}>
                          <img
                            src={request.avatar}
                            alt={request.name}
                            className="h-12 w-12 rounded-full object-cover hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer"
                          />
                        </Link>
                        {request.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <Link to={`/profile/${request.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 truncate transition-colors">
                                {request.name}
                              </Link>
                              <div className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                                requestReasonColors[request.requestReason]
                              )}>
                                {requestReasonLabels[request.requestReason]}
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-1">
                              {request.position} at {request.organization}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                              {request.mutualConnections > 0 && (
                                <span className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {request.mutualConnections} mutual
                                </span>
                              )}
                              {request.sharedWorkspaces.length > 0 && (
                                <span className="flex items-center">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {request.sharedWorkspaces.length} shared workspace{request.sharedWorkspaces.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <span>Requested {new Date(request.requestedAt).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Request message */}
                            {request.requestMessage && (
                              <div className="bg-gray-50 rounded-md p-3 mb-2">
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  "{request.requestMessage}"
                                </p>
                              </div>
                            )}
                            
                            {/* Skills */}
                            <div className="flex flex-wrap gap-1">
                              {request.skills.slice(0, 2).map((skill) => (
                                <span key={skill} className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))}
                              {request.skills.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{request.skills.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions - positioned on the right */}
                          <div className="flex flex-col space-y-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200 hover:border-green-300 h-8 px-3"
                              onClick={() => acceptRequest(request.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 h-8 px-3"
                              onClick={() => declineRequest(request.id)}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 h-8 px-3 text-xs"
                              onClick={() => window.open(`/profile/${request.id}`, '_blank')}
                            >
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
              ) : (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No connection requests</p>
                  <p className="text-gray-500">When people send you connection requests, they'll appear here.</p>
                </div>
              )}
            </div>
          </div>
        );



      case 'followers':
        return (
          <div className="space-y-6">
            
            {/* Followers List */}
            <div className="space-y-4">
              {followersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading followers...</p>
                </div>
              ) : followersData?.data && followersData.data.length > 0 ? (
                followersData.data.map((follower) => {
                const followerReasonLabels = {
                  'industry-expert': 'Industry Expert',
                  'content-appreciation': 'Content Appreciation',
                  'mutual-follower': 'Mutual Follower',
                  'workspace-interest': 'Workspace Interest'
                };
                
                const followerReasonColors = {
                  'industry-expert': 'bg-purple-100 text-purple-700 border-purple-200',
                  'content-appreciation': 'bg-pink-100 text-pink-700 border-pink-200',
                  'mutual-follower': 'bg-blue-100 text-blue-700 border-blue-200',
                  'workspace-interest': 'bg-green-100 text-green-700 border-green-200'
                };
                
                return (
                  <div key={follower.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Link to={`/profile/${follower.id}`}>
                          <img
                            src={follower.avatar}
                            alt={follower.name}
                            className="h-12 w-12 rounded-full object-cover hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer"
                          />
                        </Link>
                        {follower.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <Link to={`/profile/${follower.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 truncate transition-colors">
                                {follower.name}
                              </Link>
                              <div className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                                followerReasonColors[follower.followerReason]
                              )}>
                                {followerReasonLabels[follower.followerReason]}
                              </div>
                              {follower.hasRequestedConnection && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                  Connection Requested
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-1">
                              {follower.position} at {follower.organization}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                              {follower.mutualConnections > 0 && (
                                <span className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {follower.mutualConnections} mutual
                                </span>
                              )}
                              {follower.sharedWorkspaces.length > 0 && (
                                <span className="flex items-center">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {follower.sharedWorkspaces.length} shared workspace{follower.sharedWorkspaces.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <span>Following since {new Date(follower.followingSince).toLocaleDateString()}</span>
                              <span className="flex items-center">
                                <Heart className="h-3 w-3 mr-1 text-pink-500" />
                                {follower.recentInteractions} recent interactions
                              </span>
                            </div>
                            
                            {/* Connection request info */}
                            {follower.hasRequestedConnection && follower.requestedAt && (
                              <div className="bg-orange-50 border border-orange-200 rounded-md p-2 mb-2">
                                <p className="text-xs text-orange-800">
                                  <UserPlus className="h-3 w-3 inline mr-1" />
                                  Requested to connect on {new Date(follower.requestedAt).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            
                            {/* Skills */}
                            <div className="flex flex-wrap gap-1">
                              {follower.skills.slice(0, 2).map((skill) => (
                                <span key={skill} className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))}
                              {follower.skills.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{follower.skills.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions - positioned on the right */}
                          <div className="flex flex-col space-y-2 flex-shrink-0">
                            {follower.hasRequestedConnection ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200 hover:border-green-300 h-8 px-3"
                                  onClick={() => acceptRequest(follower.id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 h-8 px-3"
                                  onClick={() => declineRequest(follower.id)}
                                >
                                  Decline
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 h-8 px-3"
                                onClick={() => connectWithFollower(follower.id)}
                              >
                                Connect
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 h-8 px-3 text-xs"
                              onClick={() => window.open(`/profile/${follower.id}`, '_blank')}
                            >
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No followers yet</p>
                  <p className="text-gray-500">When people follow you, they'll appear here.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                My Network
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Build meaningful work relationships, not just a collection of contacts.
              </p>
            </div>
            
          </div>
        </div>
        

        {/* Tab Navigation with Drop Zones */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              const isDropTarget = draggedConnection && (tab.id === 'core' || tab.id === 'extended');
              const isValidDropTarget = isDropTarget && draggedConnectionData && 
                draggedConnectionData.connectionType !== tab.id;
              const isCapacityFull = (tab.id === 'core' && coreCapacityFull) || 
                                   (tab.id === 'extended' && extendedCapacityFull);
              const canDrop = isValidDropTarget && !isCapacityFull;
              
              
              // Define drop zone styles
              const getDropZoneStyles = () => {
                if (!isDropTarget) return '';
                
                if (canDrop) {
                  return tab.id === 'core' 
                    ? 'ring-2 ring-blue-300 bg-blue-50 border-blue-300' 
                    : 'ring-2 ring-purple-300 bg-purple-50 border-purple-300';
                } else if (isCapacityFull) {
                  return 'ring-2 ring-red-300 bg-red-50 border-red-300 cursor-not-allowed';
                } else {
                  return 'opacity-50 cursor-not-allowed';
                }
              };
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onDragOver={isDropTarget ? handleTabDragOver : undefined}
                  onDrop={isValidDropTarget && canDrop ? (e) => handleTabDrop(e, tab.id as 'core' | 'extended') : undefined}
                  className={cn(
                    'group relative min-w-0 flex-shrink-0 overflow-hidden whitespace-nowrap border-b-2 py-4 px-6 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    getDropZoneStyles()
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={cn(
                        'ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {tab.maxCount ? `${tab.count}/${tab.maxCount}` : tab.count}
                      </span>
                    )}
                  </div>
                  
                  {/* Drop indicator */}
                  {isDropTarget && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {canDrop ? (
                        <div className={cn(
                          "flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full",
                          tab.id === 'core' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {tab.id === 'core' ? (
                            <>
                              <ArrowUpCircle className="h-3 w-3" />
                              <span>Move to Core</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownCircle className="h-3 w-3" />
                              <span>Move to Extended</span>
                            </>
                          )}
                        </div>
                      ) : isCapacityFull ? (
                        <div className="flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Full</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          <span>Same tier</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default NetworkPage;