import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { Button } from '../../components/ui/button';
import { AchievementCard } from '../../components/profile/achievement-card';
import { JournalEntry } from '../../components/profile/journal-entry';
import { SkillCard } from '../../components/profile/skill-card';
import { SkillSummary } from '../../components/profile/skill-summary';
import { MapPin, Building2, Calendar, ChevronDown, ChevronUp, UserPlus, Send, UserCheck, Clock, UserX, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { profileApiService, ProfileData } from '../../services/profile-api.service';

// Sample public profile data - in reality this would come from API based on user ID
const publicProfile = {
  id: 'user-123',
  name: 'Sarah Chen',
  title: 'Senior Frontend Developer',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  location: 'San Francisco, CA',
  company: 'TechCorp Inc.',
  joined: new Date('2022-03-15'),
  bio: 'Passionate frontend developer with expertise in React and modern web technologies. Focused on creating exceptional user experiences and mentoring junior developers.',
  
  // Public skills (limited to what user has made visible)
  skills: [
    {
      name: 'React.js',
      level: 'expert' as const,
      endorsements: 42,
      projects: 15,
      startDate: new Date('2020-01-15'),
    },
    {
      name: 'TypeScript',
      level: 'advanced' as const,
      endorsements: 38,
      projects: 12,
      startDate: new Date('2020-06-01'),
    },
    {
      name: 'UI/UX Design',
      level: 'intermediate' as const,
      endorsements: 25,
      projects: 8,
      startDate: new Date('2021-03-15'),
    },
    {
      name: 'Node.js',
      level: 'intermediate' as const,
      endorsements: 20,
      projects: 6,
      startDate: new Date('2021-09-01'),
    },
  ],

  // Public achievements (only those marked as visible to network/public)
  achievements: [
    {
      id: '1',
      title: 'E-commerce Platform Performance Optimization',
      date: new Date('2025-02-15'),
      skills: ['React.js', 'TypeScript'],
      impact: 'Improved site loading speed by 65% and reduced bounce rate by 28%',
      status: 'completed' as const,
      backgroundColor: '#5D259F',
    },
    {
      id: '2',
      title: 'Design System Component Library Development',
      date: new Date('2025-01-15'),
      skills: ['React.js', 'UI/UX Design'],
      impact: 'Created 35+ reusable components that reduced development time by 40%',
      status: 'completed' as const,
      backgroundColor: '#5D259F',
    },
  ],

  // Connection/relationship status with current viewer
  relationshipStatus: 'none' as 'none' | 'connected' | 'pending_connection',
  connectionType: null as 'core' | 'extended' | null,
  
  // Stats visible to public
  stats: {
    achievements: 8,
    journalEntries: 24,
    connections: 87,
    followers: 156,
  },
};

// Sample public journal entries (only network/public visibility)
const publicJournalEntries = [
  {
    id: 'j-001',
    title: 'Built Custom React Hook Library',
    workspaceId: 'ws-001',
    workspaceName: 'Frontend Innovation',
    organizationName: 'TechCorp Solutions',
    description: 'Created a reusable React hooks library that standardized functionality across multiple projects, improving development efficiency and code quality.',
    fullContent: 'Created a reusable React hooks library that standardized functionality across multiple projects, improving development efficiency and code quality.',
    abstractContent: 'Created a reusable React hooks library that standardized functionality across multiple projects, improving development efficiency and code quality.',
    createdAt: new Date('2025-02-15'),
    lastModified: new Date('2025-02-15'),
    author: {
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      position: 'Senior Frontend Developer'
    },
    collaborators: [],
    reviewers: [],
    artifacts: [],
    skills: ['React.js', 'TypeScript', 'Custom Hook Patterns'],
    outcomes: [
      {
        category: 'performance' as const,
        title: 'Reduced code duplication',
        description: 'Eliminated 60% of duplicate code across React projects through reusable hooks.',
        metrics: {
          before: '40%',
          after: '90%',
          improvement: '+50%',
          trend: 'up' as const
        }
      },
    ],
    visibility: 'network' as const,
    isPublished: true,
    publishedAt: new Date('2025-02-15'),
    likes: 24,
    comments: 8,
    hasLiked: false,
    tags: ['react', 'typescript', 'hooks'],
    category: 'Engineering',
    appreciates: 15,
    hasAppreciated: false,
    discussCount: 8,
    discussions: [],
    rechronicles: 3,
    hasReChronicled: false,
  },
  {
    id: 'j-002',
    title: 'Implemented Responsive Design System',
    workspaceId: 'ws-002',
    workspaceName: 'Design System',
    organizationName: 'TechCorp Solutions',
    description: 'Developed a scalable design system that standardized UI components across multiple products, improving consistency and development velocity.',
    fullContent: 'Developed a scalable design system that standardized UI components across multiple products, improving consistency and development velocity.',
    abstractContent: 'Developed a scalable design system that standardized UI components across multiple products, improving consistency and development velocity.',
    createdAt: new Date('2025-01-25'),
    lastModified: new Date('2025-01-25'),
    author: {
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      position: 'Senior Frontend Developer'
    },
    collaborators: [],
    reviewers: [],
    artifacts: [],
    skills: ['UI/UX Design', 'React.js', 'Responsive Design'],
    outcomes: [
      {
        category: 'user-experience' as const,
        title: 'Improved accessibility',
        description: 'Achieved 100% WCAG AA compliance across all components.',
        highlight: 'WCAG AA compliant'
      }
    ],
    visibility: 'network' as const,
    isPublished: true,
    publishedAt: new Date('2025-01-25'),
    likes: 18,
    comments: 5,
    hasLiked: false,
    tags: ['design-system', 'ui', 'accessibility'],
    category: 'Design',
    appreciates: 12,
    hasAppreciated: false,
    discussCount: 5,
    discussions: [],
    rechronicles: 2,
    hasReChronicled: false,
  }
];

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [selectedSkills, setSelectedSkills] = useState(new Set<string>());
  const [activeTab, setActiveTab] = useState('achievements');
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Connection states
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'connected' | 'pending_connection'>('none');
  const [connectionType, setConnectionType] = useState<'core' | 'extended' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate total years of experience
  const calculateYearsOfExperience = () => {
    if (!profileData) return 0;
    
    const workExperiences = profileData.workExperiences || profileData.onboardingData?.workExperiences || [];
    
    let totalMonths = 0;
    const now = new Date();
    
    workExperiences.forEach((exp: { startDate: string; endDate?: string; isCurrentRole?: boolean }) => {
      if (!exp.startDate) return;
      
      const startDate = new Date(exp.startDate);
      const endDate = exp.isCurrentRole ? now : (exp.endDate ? new Date(exp.endDate) : now);
      
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
      
      totalMonths += diffMonths;
    });
    
    return Math.round(totalMonths / 12);
  };

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) {
        setProfileError('User ID is required');
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        setProfileError(null);
        console.log('🔍 Fetching public profile for userId:', userId);
        
        const data = await profileApiService.getPublicProfile(userId);
        console.log('✅ Public profile data received:', data);
        
        setProfileData(data);
        
        // Simulate determining connection status and type
        // In a real app, this would come from the API response
        const mockConnectionStatus = 'none'; // Default to 'none' so users can test connect flow
        const mockConnectionType = Math.random() > 0.5 ? 'core' : 'extended'; // Random for demo
        
        if (mockConnectionStatus === 'connected') {
          setConnectionStatus('connected');
          setConnectionType(mockConnectionType);
        }
      } catch (error) {
        console.error('❌ Failed to fetch public profile:', error);
        setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  const toggleSkill = (skillName: string) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  const selectAllSkills = () => {
    const allSkillNames = availableSkills.map(skill => skill.name);
    setSelectedSkills(new Set(allSkillNames));
  };

  const clearAllSkills = () => {
    setSelectedSkills(new Set());
  };

  // Get all available skills from various sources
  const availableSkills = useMemo(() => {
    if (!profileData) return [];
    
    console.log('🔍 Debug - profileData:', profileData);
    console.log('🔍 Debug - profileData.topSkills:', profileData?.topSkills);
    console.log('🔍 Debug - profileData.onboardingData:', profileData?.onboardingData);
    console.log('🔍 Debug - profileData.onboardingData.skills:', profileData?.onboardingData?.skills);
    console.log('🔍 Debug - profileData.onboardingData.topSkills:', profileData?.onboardingData?.topSkills);
    
    // Try multiple sources for skills data
    let skills = [];
    
    // 1. Try topSkills from main profile
    if (profileData.topSkills && profileData.topSkills.length > 0) {
      skills = profileData.topSkills.map(skill => ({
        name: skill,
        level: 'intermediate' as const,
        endorsements: 0,
        projects: 0,
        startDate: new Date()
      }));
      console.log('🎯 Using profileData.topSkills:', skills);
    }
    // 2. Try skills from onboardingData
    else if (profileData.onboardingData?.skills && profileData.onboardingData.skills.length > 0) {
      skills = profileData.onboardingData.skills.map((skill: string | { name?: string; proficiency?: string; level?: string; endorsements?: number; projects?: number; startDate?: Date }) => {
        if (typeof skill === 'string') {
          return {
            name: skill,
            level: 'intermediate' as const,
            endorsements: 0,
            projects: 0,
            startDate: new Date()
          };
        }
        return {
          name: skill.name || String(skill),
          level: (skill.proficiency || skill.level || 'intermediate') as 'intermediate',
          endorsements: skill.endorsements || 0,
          projects: skill.projects || 0,
          startDate: skill.startDate || new Date()
        };
      });
      console.log('🎯 Using onboardingData.skills:', skills);
    }
    // 3. Try topSkills from onboardingData
    else if (profileData.onboardingData?.topSkills && profileData.onboardingData.topSkills.length > 0) {
      skills = profileData.onboardingData.topSkills.map(skill => ({
        name: skill,
        level: 'intermediate' as const,
        endorsements: 0,
        projects: 0,
        startDate: new Date()
      }));
      console.log('🎯 Using onboardingData.topSkills:', skills);
    }
    
    console.log('🛠️ Debug - final availableSkills:', skills);
    
    return skills;
  }, [profileData]);

  const selectedSkillsData = useMemo(() => 
    availableSkills.filter(skill => selectedSkills.has(skill.name)),
    [selectedSkills, availableSkills]
  );

  const filteredJournalEntries = useMemo(() => {
    if (selectedSkills.size === 0) return publicJournalEntries;
    return publicJournalEntries.filter(entry =>
      entry.skills.some(skill => selectedSkills.has(skill))
    );
  }, [selectedSkills]);

  const filteredAchievements = useMemo(() => {
    // For now using mock achievements, but this would be filtered based on real achievements from profileData
    if (selectedSkills.size === 0) return publicProfile.achievements;
    return publicProfile.achievements.filter(achievement =>
      achievement.skills.some(skill => selectedSkills.has(skill))
    );
  }, [selectedSkills]);

  // Connection handlers
  const handleSendConnectionRequest = () => {
    setIsLoading(true);
    setConnectionStatus('pending_connection');
    
    // Simulate API call to send connection request
    setTimeout(() => {
      setIsLoading(false);
      // User will now appear in the network>followers section of the requester
    }, 1000);
  };

  const handleCancelConnectionRequest = () => {
    setConnectionStatus('none');
  };

  const renderConnectionButton = () => {
    switch (connectionStatus) {
      case 'none':
        return (
          <Button
            onClick={handleSendConnectionRequest}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <Clock className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Connect
          </Button>
        );
      
      case 'connected': {
        const networkTypeLabel = connectionType === 'core' ? 'Core Network' : 'Extended Network';
        const networkTypeColor = connectionType === 'core' 
          ? 'bg-purple-50 border-purple-200 text-purple-700' 
          : 'bg-blue-50 border-blue-200 text-blue-700';
        const iconColor = connectionType === 'core' ? 'text-purple-600' : 'text-blue-600';
        
        return (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${networkTypeColor}`}>
              <UserCheck className={`h-4 w-4 ${iconColor}`} />
              <span className="text-sm font-medium">{networkTypeLabel}</span>
            </div>
            <Button variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Message
            </Button>
          </div>
        );
      }
      
      case 'pending_connection':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Connection Request Sent</span>
            </div>
            <Button
              variant="outline"
              onClick={handleCancelConnectionRequest}
              className="text-gray-600 hover:text-gray-900"
            >
              <UserX className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{profileError || 'Profile not found'}</p>
          <Button asChild>
            <Link to="/network">Back to Network</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
            <Link to="/network">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Network
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={profileData.avatar || '/default-avatar.png'}
                    alt={profileData.name}
                    className="h-20 w-20 rounded-full border-2 border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-green-500 border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {profileData.name}
                  </h1>
                  <p className="text-lg text-gray-600">{profileData.title}</p>
                  <div className="mt-1 flex items-center space-x-3 text-sm text-gray-500">
                    {profileData.location && (
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-3.5 w-3.5" />
                        {profileData.location}
                      </div>
                    )}
                    {profileData.company && (
                      <div className="flex items-center">
                        <Building2 className="mr-1 h-3.5 w-3.5" />
                        {profileData.company}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {renderConnectionButton()}
            </div>

            <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                Member since {new Date().getFullYear()}
              </div>
              
              {/* Public Stats - Using real data where available */}
              <div className="flex items-center space-x-4">
                <span>
                  Work Experience {calculateYearsOfExperience()}+ years
                </span>
                {(profileData.industry || profileData.onboardingData?.industry) && (
                  <span>
                    {profileData.industry || profileData.onboardingData?.industry}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-700 leading-relaxed">
                  {profileData.bio || 'No bio available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Summary */}
      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SkillSummary selectedSkills={selectedSkillsData} />
      </div>

      {/* Main Content */}
      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Skills Section */}
          <div className="space-y-3">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium text-gray-900">Skills</h2>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSkills}
                    className="text-xs px-2 py-1 h-6"
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSkills}
                    className="text-xs px-2 py-1 h-6"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {availableSkills.length > 0 ? (
                  availableSkills.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      selected={selectedSkills.has(skill.name)}
                      onClick={() => toggleSkill(skill.name)}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No skills available</p>
                )}
              </div>
              <div className="text-xs text-gray-500 border-t pt-2 mt-3">
                {selectedSkills.size === 0 
                  ? "Showing all content" 
                  : `Filtered by ${selectedSkills.size} skill${selectedSkills.size !== 1 ? 's' : ''}`
                }
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border">
              <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List className="flex border-b border-gray-200 px-4">
                  <Tabs.Trigger
                    value="achievements"
                    className={cn(
                      'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                      activeTab === 'achievements'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Achievements
                  </Tabs.Trigger>
                  
                  <Tabs.Trigger
                    value="journal"
                    className={cn(
                      'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                      activeTab === 'journal'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Published Work
                  </Tabs.Trigger>
                </Tabs.List>

                <div className="p-4">
                  <Tabs.Content value="achievements" className="space-y-4">
                    {filteredAchievements.map((achievement) => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}
                    {filteredAchievements.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>
                          {selectedSkills.size === 0
                            ? 'No public achievements available'
                            : 'No achievements found for the selected skills'}
                        </p>
                      </div>
                    )}
                  </Tabs.Content>

                  <Tabs.Content value="journal" className="space-y-4">
                    {filteredJournalEntries.map((entry) => (
                      <JournalEntry key={entry.id} entry={entry} viewMode="network" />
                    ))}
                    {filteredJournalEntries.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>
                          {selectedSkills.size === 0
                            ? 'No published work available'
                            : 'No published work found for the selected skills'}
                        </p>
                      </div>
                    )}
                  </Tabs.Content>
                </div>
              </Tabs.Root>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}