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
import { JournalService } from '../../services/journal.service';



export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [selectedSkills, setSelectedSkills] = useState(new Set<string>());
  const [activeTab, setActiveTab] = useState('achievements');
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Achievements and journal entries state
  const [achievements, setAchievements] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [isLoadingJournalEntries, setIsLoadingJournalEntries] = useState(false);
  const [achievementsError, setAchievementsError] = useState<string | null>(null);
  const [journalEntriesError, setJournalEntriesError] = useState<string | null>(null);
  
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

  // Fetch public journal entries for this user
  const fetchPublicJournalEntries = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingJournalEntries(true);
      setJournalEntriesError(null);
      
      // Fetch journal entries with network visibility (public to network)
      const response = await JournalService.getJournalEntries({
        authorId: userId,
        visibility: 'network'
      });
      
      if (response.success && response.data) {
        setJournalEntries(response.data);
      } else {
        setJournalEntries([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch journal entries:', error);
      setJournalEntriesError(error instanceof Error ? error.message : 'Failed to load published work');
      setJournalEntries([]);
    } finally {
      setIsLoadingJournalEntries(false);
    }
  };

  // Fetch public achievements for this user
  const fetchPublicAchievements = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingAchievements(true);
      setAchievementsError(null);
      
      // For now, achievements might be embedded in journal entries or come from a separate endpoint
      // TODO: Replace with actual achievements API when available
      // Using journal entries as a proxy for achievements for now
      const response = await JournalService.getJournalEntries({
        authorId: userId,
        visibility: 'network',
        category: 'achievement' // If achievements are stored as a category
      });
      
      if (response.success && response.data) {
        // Transform journal entries to achievement-like objects
        const achievementData = response.data.map(entry => ({
          id: entry.id,
          title: entry.title,
          date: entry.createdAt,
          skills: entry.skills || [],
          impact: entry.description,
          status: 'completed' as const,
          backgroundColor: '#5D259F',
        }));
        setAchievements(achievementData);
      } else {
        setAchievements([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch achievements:', error);
      setAchievementsError(error instanceof Error ? error.message : 'Failed to load achievements');
      setAchievements([]);
    } finally {
      setIsLoadingAchievements(false);
    }
  };

  // Fetch achievements and journal entries when profile loads
  useEffect(() => {
    if (profileData && userId) {
      fetchPublicJournalEntries();
      fetchPublicAchievements();
    }
  }, [profileData, userId]);

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
    if (selectedSkills.size === 0) return journalEntries;
    return journalEntries.filter(entry =>
      entry.skills?.some((skill: string) => selectedSkills.has(skill))
    );
  }, [selectedSkills, journalEntries]);

  const filteredAchievements = useMemo(() => {
    if (selectedSkills.size === 0) return achievements;
    return achievements.filter(achievement =>
      achievement.skills?.some((skill: string) => selectedSkills.has(skill))
    );
  }, [selectedSkills, achievements]);

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
                    {isLoadingAchievements ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading achievements...</p>
                      </div>
                    ) : achievementsError ? (
                      <div className="text-center py-8 text-red-500">
                        <p>Error loading achievements: {achievementsError}</p>
                      </div>
                    ) : filteredAchievements.length > 0 ? (
                      filteredAchievements.map((achievement) => (
                        <AchievementCard key={achievement.id} achievement={achievement} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>
                          {selectedSkills.size === 0
                            ? 'No public achievements available'
                            : 'No achievements found for the selected skills'}
                        </p>
                        <p className="text-sm mt-2">
                          {selectedSkills.size === 0 
                            ? 'This user hasn\'t shared any achievements publicly yet.'
                            : 'Try adjusting your skill filters to see more content.'}
                        </p>
                      </div>
                    )}
                  </Tabs.Content>

                  <Tabs.Content value="journal" className="space-y-4">
                    {isLoadingJournalEntries ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading published work...</p>
                      </div>
                    ) : journalEntriesError ? (
                      <div className="text-center py-8 text-red-500">
                        <p>Error loading published work: {journalEntriesError}</p>
                      </div>
                    ) : filteredJournalEntries.length > 0 ? (
                      filteredJournalEntries.map((entry) => (
                        <JournalEntry key={entry.id} entry={entry} viewMode="network" />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>
                          {selectedSkills.size === 0
                            ? 'No published work available'
                            : 'No published work found for the selected skills'}
                        </p>
                        <p className="text-sm mt-2">
                          {selectedSkills.size === 0 
                            ? 'This user hasn\'t published any work to their network yet.'
                            : 'Try adjusting your skill filters to see more content.'}
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