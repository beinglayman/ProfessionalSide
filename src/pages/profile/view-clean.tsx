import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { Button } from '../../components/ui/button';
import { Edit, MapPin, Building2, Mail, Calendar, ChevronDown, ChevronUp, UserPlus, Send, UserCheck, Eye, Clock, UserX, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/useProfile';

// Component interfaces for skills (dynamic from profile data)
interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsements?: number;
  projects?: number;
  startDate?: Date;
  relatedAchievements?: string[];
}

// Transform profile topSkills into skill objects
function transformTopSkillsToSkills(topSkills: string[] = []): Skill[] {
  return topSkills.map(skillName => ({
    name: skillName,
    level: 'intermediate' as const, // Default level
    endorsements: Math.floor(Math.random() * 50) + 10, // Placeholder data
    projects: Math.floor(Math.random() * 10) + 3, // Placeholder data
    startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3), // Random date within 3 years
    relatedAchievements: []
  }));
}

// Simple SkillCard component
function SkillCard({ skill, selected, onClick }: { skill: Skill; selected: boolean; onClick: () => void }) {
  const levelColors = {
    beginner: 'bg-gray-100 text-gray-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-green-100 text-green-700',
    expert: 'bg-purple-100 text-purple-700'
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{skill.name}</h3>
        <div className="flex items-center space-x-1">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${levelColors[skill.level]}`}>
            {skill.level}
          </span>
        </div>
      </div>
      {skill.endorsements && skill.projects && (
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
          <span>{skill.endorsements} endorsements</span>
          <span>{skill.projects} projects</span>
        </div>
      )}
    </div>
  );
}

// Simple SkillSummary component
function SkillSummary({ selectedSkills }: { selectedSkills: Skill[] }) {
  if (selectedSkills.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Selected Skills Overview ({selectedSkills.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedSkills.map((skill) => (
          <div key={skill.name} className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900">{skill.name}</h4>
            <p className="text-sm text-gray-600 capitalize">{skill.level} level</p>
            {skill.endorsements && (
              <p className="text-xs text-gray-500 mt-1">{skill.endorsements} endorsements</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileViewPageClean() {
  const { profile, isLoading, error, updateProfile, refetch } = useProfile();
  const [selectedSkills, setSelectedSkills] = useState(new Set<string>());
  const [activeTab, setActiveTab] = useState('journal');
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Follow/Connection states - In real app, this would come from user context
  const [isOwnProfile] = useState(true); // Change to false to see follow/connect buttons
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'following' | 'connected' | 'pending_follow' | 'pending_connection'>('none');
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Transform profile data into skills format
  const skills = useMemo(() => {
    if (!profile?.topSkills) return [];
    return transformTopSkillsToSkills(profile.topSkills);
  }, [profile?.topSkills]);

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
    setSelectedSkills(new Set(skills.map(skill => skill.name)));
  };

  const clearAllSkills = () => {
    setSelectedSkills(new Set());
  };

  const selectedSkillsData = useMemo(() => 
    skills.filter(skill => selectedSkills.has(skill.name)),
    [skills, selectedSkills]
  );

  // Follow/Connection handlers
  const handleFollowUser = () => {
    setIsLoadingConnection(true);
    setConnectionStatus('pending_follow');
    
    // Simulate API call
    setTimeout(() => {
      setConnectionStatus('following');
      setIsLoadingConnection(false);
    }, 1000);
  };

  const handleUnfollowUser = () => {
    setConnectionStatus('none');
  };

  const handleSendConnectionRequest = () => {
    setIsLoadingConnection(true);
    setConnectionStatus('pending_connection');
    
    // Simulate API call
    setTimeout(() => {
      setIsLoadingConnection(false);
      // Connection request remains pending until approved
    }, 1000);
  };

  const renderConnectionButton = () => {
    if (isOwnProfile) {
      return (
        <Button variant="outline" asChild>
          <Link to="/profile/edit">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      );
    }

    switch (connectionStatus) {
      case 'none':
        return (
          <Button
            onClick={handleFollowUser}
            disabled={isLoadingConnection}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoadingConnection ? (
              <Clock className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Follow for Updates
          </Button>
        );
      
      case 'following':
        return (
          <div className="flex gap-2">
            <Button
              onClick={handleSendConnectionRequest}
              disabled={isLoadingConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoadingConnection ? (
                <Clock className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Connect Request
            </Button>
            <Button
              variant="outline"
              onClick={handleUnfollowUser}
              className="text-gray-600 hover:text-gray-900"
            >
              <UserX className="mr-2 h-4 w-4" />
              Unfollow
            </Button>
          </div>
        );
      
      case 'connected':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>
            <Button variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Message
            </Button>
          </div>
        );
      
      case 'pending_follow':
        return (
          <Button disabled className="bg-gray-100 text-gray-500">
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Following...
          </Button>
        );
      
      case 'pending_connection':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Eye className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Following</span>
            </div>
            <Button disabled className="bg-gray-100 text-gray-500">
              <Clock className="mr-2 h-4 w-4" />
              Request Sent
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load profile: {error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">🔍 Debug: Profile Data</h3>
            <div className="text-xs text-yellow-700 font-mono">
              <div>Industry: "{profile.industry}" (length: {profile.industry?.length || 0})</div>
              <div>Years of Experience: {profile.yearsOfExperience} (type: {typeof profile.yearsOfExperience})</div>
              <div>Specializations: [{profile.specializations?.join(', ') || 'none'}]</div>
              <div>Top Skills: [{profile.topSkills?.join(', ') || 'none'}]</div>
              <div>Career Highlights: "{profile.careerHighlights}" (length: {profile.careerHighlights?.length || 0})</div>
              <div>Career Goals: [{profile.careerGoals?.join(', ') || 'none'}]</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    src={profile.avatar || '/default-avatar.png'}
                    alt={profile.name}
                    className="h-28 w-28 rounded-full ring-4 ring-white shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-600 border-4 border-white shadow-sm"></div>
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {profile.name}
                    </h1>
                  </div>
                  <p className="text-xl text-gray-600 font-medium">{profile.title}</p>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    {profile.location && (
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-4 w-4" />
                        {profile.location}
                      </div>
                    )}
                    {profile.company && (
                      <div className="flex items-center">
                        <Building2 className="mr-1 h-4 w-4" />
                        {profile.company}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {renderConnectionButton()}
            </div>

            <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500">
              {profile.id && (
                <div className="flex items-center">
                  <Mail className="mr-1 h-4 w-4" />
                  User ID: {profile.id}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Profile Created
              </div>
            </div>

            {profile.bio && (
              <div className="mt-8 relative">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                  <p className="max-w-4xl text-gray-700 leading-relaxed">{profile.bio}</p>
                  <button 
                    className="absolute -bottom-2 right-4 rounded-full bg-white border border-gray-200 shadow-sm p-2 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                    onClick={() => setBioExpanded(!bioExpanded)}
                    aria-label={bioExpanded ? "Show less" : "Show more"}
                  >
                    {bioExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {bioExpanded && (
              <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Professional Profile</h3>
                </div>
                
                {/* Professional Information Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Industry */}
                  {profile.industry && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Industry</h4>
                      <p className="text-gray-700">{profile.industry}</p>
                    </div>
                  )}

                  {/* Years of Experience */}
                  {profile.yearsOfExperience !== undefined && profile.yearsOfExperience !== null && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                      <p className="text-gray-700">{profile.yearsOfExperience} years</p>
                    </div>
                  )}

                  {/* Specializations */}
                  {profile.specializations && profile.specializations.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 md:col-span-2">
                      <h4 className="font-semibold text-gray-900 mb-2">Specializations</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.specializations.map((spec, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Career Highlights */}
                  {profile.careerHighlights && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 md:col-span-2">
                      <h4 className="font-semibold text-gray-900 mb-2">Career Highlights</h4>
                      <p className="text-gray-700">{profile.careerHighlights}</p>
                    </div>
                  )}

                  {/* Career Goals */}
                  {profile.careerGoals && profile.careerGoals.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 md:col-span-2">
                      <h4 className="font-semibold text-gray-900 mb-2">Career Goals</h4>
                      <div className="space-y-1">
                        {profile.careerGoals.map((goal, index) => (
                          <p key={index} className="text-gray-700">• {goal}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Summary */}
      {skills.length > 0 && (
        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SkillSummary selectedSkills={selectedSkillsData} />
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Skills Section - More compact */}
          {skills.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Skills Filter</h2>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSkills}
                    className="text-xs px-2 py-1 h-7"
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSkills}
                    className="text-xs px-2 py-1 h-7"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {skills.map((skill) => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    selected={selectedSkills.has(skill.name)}
                    onClick={() => toggleSkill(skill.name)}
                  />
                ))}  
              </div>
              <div className="text-xs text-gray-500 border-t pt-2">
                {selectedSkills.size === 0 
                  ? "Showing all entries" 
                  : `Filtered by ${selectedSkills.size} skill${selectedSkills.size !== 1 ? 's' : ''}`
                }
              </div>
            </div>
          )}

          {/* Tabs Section */}
          <div className={skills.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex space-x-4 border-b border-gray-200">
                <Tabs.Trigger
                  value="achievements"
                  className={cn(
                    'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === 'achievements'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  Achievements
                </Tabs.Trigger>
                
                <Tabs.Trigger
                  value="journal"
                  className={cn(
                    'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === 'journal'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  Journal
                </Tabs.Trigger>
                
                <Tabs.Trigger
                  value="skills-growth"
                  className={cn(
                    'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === 'skills-growth'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  Skills Growth
                </Tabs.Trigger>
              </Tabs.List>

              <div className="mt-6">
                <Tabs.Content value="achievements" className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">
                      No achievements available yet. Complete the onboarding flow to see your achievements here.
                    </p>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="journal" className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-gray-600">
                      No journal entries available yet. Start creating journal entries to see them here.
                    </p>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="skills-growth" className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600">
                      Skills growth tracking will be available once you have more data and activities recorded.
                    </p>
                  </div>
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </div>
        </div>
      </div>
    </div>
  );
}