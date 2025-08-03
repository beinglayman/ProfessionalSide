import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { Button } from '../../components/ui/button';
import { AchievementCard } from '../../components/profile/achievement-card';
import { JournalCard } from '../../components/journal/journal-card';
import { JournalEntry as JournalEntryType } from '../../types/journal';
import { SkillCard } from '../../components/profile/skill-card';
import { SkillSummary } from '../../components/profile/skill-summary';
import { SkillsGrowth } from '../../components/dashboard/skills-growth';
import { Edit, MapPin, Building2, Mail, Calendar, ChevronDown, ChevronUp, UserPlus, Send, UserCheck, Eye, Clock, UserX, Briefcase, Award, Target, Heart, Sparkles, TrendingUp, Users, Code2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/useProfile';
import { useJournalEntries } from '../../hooks/useJournal';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';

// Component interfaces for skills (dynamic from profile data)
interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsements?: number;
  projects?: number;
  startDate?: Date;
  relatedAchievements?: string[];
  journalCount?: number;
  isFromProfile?: boolean;
}

// Transform profile topSkills into skill objects
function transformTopSkillsToSkills(topSkills: string[] = []): Skill[] {
  return topSkills.map(skillName => ({
    name: skillName,
    level: 'intermediate' as const, // Default level
    endorsements: Math.floor(Math.random() * 50) + 10, // Placeholder data
    projects: Math.floor(Math.random() * 10) + 3, // Placeholder data
    startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3), // Random date within 3 years
    relatedAchievements: [],
    journalCount: 0,
    isFromProfile: true
  }));
}

export function ProfileViewPage() {
  const [selectedSkills, setSelectedSkills] = useState(new Set<string>());
  const [activeTab, setActiveTab] = useState('journal');
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Follow/Connection states - In real app, this would come from user context
  const [isOwnProfile] = useState(true); // Change to false to see follow/connect buttons
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'following' | 'connected' | 'pending_follow' | 'pending_connection'>('none');
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);

  // Use production-ready profile hook
  const { profile, isLoading, error, refetch } = useProfile();

  // Get current user for filtering journal entries
  const { user } = useAuth();

  // Fetch real journal entries with network visibility only
  const {
    data: journalEntriesData,
    isLoading: isLoadingJournalEntries,
    error: journalEntriesError
  } = useJournalEntries({
    authorId: user?.id,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 100
  });

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

  const clearAllSkills = () => {
    setSelectedSkills(new Set());
  };

  // Create dynamic skills from profile skills and topSkills combined with journal entries
  const combinedSkills = useMemo(() => {
    const realJournalEntries = journalEntriesData?.entries || [];
    
    // Get skills from both topSkills and full onboarding skills data
    const topSkillsData = profile?.topSkills ? transformTopSkillsToSkills(profile.topSkills) : [];
    const onboardingSkills = profile?.onboardingData?.skills || [];
    
    console.log('🔍 Profile topSkills:', profile?.topSkills);
    console.log('🔍 Profile onboardingData.skills:', onboardingSkills);
    
    // Transform onboarding skills to the format we need
    const fullSkillsData = onboardingSkills.map((skill: any) => ({
      name: skill.name || skill,
      level: skill.proficiency || 'intermediate',
      endorsements: Math.floor(Math.random() * 50) + 10,
      projects: Math.floor(Math.random() * 10) + 3,
      startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3),
      relatedAchievements: [],
      journalCount: 0,
      isFromProfile: true
    }));
    
    console.log('🔍 Transformed skills data:', fullSkillsData);
    
    // Combine both data sources, prioritizing full skills data over topSkills
    const profileSkills = fullSkillsData.length > 0 ? fullSkillsData : topSkillsData;
    
    // Create a map to count skill occurrences and merge with profile skills
    const skillMap = new Map();
    
    // Start with profile skills (if they exist)
    profileSkills.forEach((skill: Skill) => {
      skillMap.set(skill.name, {
        ...skill,
        journalCount: 0, // Will be updated from journal entries
      });
    });
    
    // Count skills from journal entries and add new ones
    realJournalEntries.forEach((entry: JournalEntryType) => {
      entry.skills.forEach((skillName: string) => {
        if (skillMap.has(skillName)) {
          // Increment count for existing skill
          const existingSkill = skillMap.get(skillName);
          existingSkill.journalCount = (existingSkill.journalCount || 0) + 1;
        } else {
          // Add new skill from journal entry
          skillMap.set(skillName, {
            name: skillName,
            level: 'beginner' as const, // Default level for journal-only skills
            endorsements: Math.floor(Math.random() * 20) + 5,
            projects: Math.floor(Math.random() * 5) + 1,
            startDate: new Date(), // Use current date for new skills
            relatedAchievements: [],
            journalCount: 1,
            isFromProfile: false
          });
        }
      });
    });
    
    // Convert map to array and sort by journal count (most used first), then by name
    return Array.from(skillMap.values()).sort((a, b) => {
      if (b.journalCount !== a.journalCount) {
        return b.journalCount - a.journalCount; // Sort by journal count desc
      }
      return a.name.localeCompare(b.name); // Then by name asc
    });
  }, [journalEntriesData, profile?.topSkills]);

  const selectAllSkills = () => {
    setSelectedSkills(new Set(combinedSkills.map((skill: Skill) => skill.name)));
  };

  const selectedSkillsData = useMemo(() => 
    combinedSkills.filter((skill: Skill) => selectedSkills.has(skill.name)),
    [selectedSkills, combinedSkills]
  );

  const filteredJournalEntries = useMemo(() => {
    // Use real journal entries data, fallback to empty array if loading or no data
    const realJournalEntries = journalEntriesData?.entries || [];
    
    if (selectedSkills.size === 0) return realJournalEntries;
    return realJournalEntries.filter((entry: JournalEntryType) =>
      entry.skills.some((skill: string) => selectedSkills.has(skill))
    );
  }, [selectedSkills, journalEntriesData]);

  const filteredAchievements = useMemo(() => {
    // No achievements from profile data yet - return empty array
    return [];
  }, [selectedSkills]);

  // Generate dynamic skills growth data based on combined skills
  const dynamicSkillsGrowthData = useMemo(() => {
    if (combinedSkills.length === 0) return [];

    // Get all unique skill names from combined skills
    const allSkillNames = combinedSkills.map((skill: Skill) => skill.name);
    
    // Generate growth data for each skill based on its properties
    const generateSkillValue = (skillName: string, year: number, baseSkill: Skill) => {
      const currentYear = new Date().getFullYear();
      const skillStartYear = baseSkill?.startDate ? new Date(baseSkill.startDate).getFullYear() : currentYear - 2;
      
      // If the year is before the skill start date, return 0
      if (year < skillStartYear) return 0;
      
      // Calculate years of experience with this skill
      const yearsOfExperience = Math.max(0, year - skillStartYear);
      
      // Base value calculation based on skill level and experience
      let baseValue = 20; // Starting value
      
      // Adjust based on skill level from profile
      if (baseSkill?.level) {
        switch (baseSkill.level) {
          case 'expert': baseValue = 70; break;
          case 'advanced': baseValue = 55; break;
          case 'intermediate': baseValue = 40; break;
          case 'beginner': baseValue = 25; break;
        }
      }
      
      // Add growth based on years of experience
      const experienceBonus = Math.min(yearsOfExperience * 8, 30);
      
      // Add bonus based on journal usage (more journal entries = more practice)
      const journalBonus = Math.min((baseSkill?.journalCount || 0) * 3, 15);
      
      // Add some randomness for realistic variation
      const randomVariation = Math.random() * 10 - 5;
      
      // Calculate final value
      const finalValue = Math.max(0, Math.min(100, baseValue + experienceBonus + journalBonus + randomVariation));
      
      return Math.round(finalValue);
    };
    
    return [
      {
        label: 'Current (2025)',
        skills: allSkillNames.map(name => {
          const baseSkill = combinedSkills.find((s: Skill) => s.name === name)!;
          return {
            name,
            value: generateSkillValue(name, 2025, baseSkill),
            category: 'Technical' as const
          };
        })
      },
      {
        label: '2024',
        skills: allSkillNames.map(name => {
          const baseSkill = combinedSkills.find((s: Skill) => s.name === name)!;
          const currentValue = generateSkillValue(name, 2025, baseSkill);
          const previousValue = Math.max(0, currentValue - Math.random() * 15 - 5);
          return {
            name,
            value: Math.round(previousValue),
            category: 'Technical' as const
          };
        })
      },
      {
        label: '2023',
        skills: allSkillNames.map(name => {
          const baseSkill = combinedSkills.find((s: Skill) => s.name === name)!;
          const currentValue = generateSkillValue(name, 2025, baseSkill);
          const previousValue = Math.max(0, currentValue - Math.random() * 25 - 10);
          return {
            name,
            value: Math.round(previousValue),
            category: 'Technical' as const
          };
        })
      },
      {
        label: '2022',
        skills: allSkillNames.map(name => {
          const baseSkill = combinedSkills.find((s: Skill) => s.name === name)!;
          const currentValue = generateSkillValue(name, 2025, baseSkill);
          const previousValue = Math.max(0, currentValue - Math.random() * 35 - 15);
          return {
            name,
            value: Math.round(previousValue),
            category: 'Technical' as const
          };
        })
      }
    ];
  }, [combinedSkills]);

  // Generate dynamic benchmarks based on combined skills
  const dynamicSkillsBenchmarks = useMemo(() => {
    const benchmarks: { [key: string]: number } = {};
    
    combinedSkills.forEach((skill: Skill) => {
      // Set industry benchmark based on skill level and usage
      let benchmark = 65; // Default industry average
      
      if (skill.level === 'expert') benchmark = 80;
      else if (skill.level === 'advanced') benchmark = 75;
      else if (skill.level === 'intermediate') benchmark = 70;
      else if (skill.level === 'beginner') benchmark = 60;
      
      // Adjust based on journal usage (popular skills have higher benchmarks)
      if (skill.journalCount && skill.journalCount > 5) benchmark += 5;
      else if (skill.journalCount && skill.journalCount > 10) benchmark += 10;
      
      benchmarks[skill.name] = Math.min(100, benchmark);
    });
    
    return benchmarks;
  }, [combinedSkills]);

  const filteredSkillsGrowthData = useMemo(() => {
    if (selectedSkills.size === 0) return dynamicSkillsGrowthData;
    return dynamicSkillsGrowthData.map(period => ({
      ...period,
      skills: period.skills.filter(skill => selectedSkills.has(skill.name))
    }));
  }, [selectedSkills, dynamicSkillsGrowthData]);

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
          <Link to="/onboarding">
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

  // Show loading state
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

  // Show error state
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

  // Show empty state if no profile data
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Complete Your Profile</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Your professional profile is not yet set up. Complete the onboarding process to showcase your skills, experience, and achievements.
            </p>
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg">
              <Link to="/onboarding">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      {/* Profile Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Link to="/onboarding" className="block">
                    {isLoading ? (
                      <div className="h-28 w-28 rounded-full ring-4 ring-white shadow-lg bg-gray-200 animate-pulse" />
                    ) : (
                      <img
                        src={getAvatarUrl(profile?.avatar)}
                        alt={profile?.name || 'Profile'}
                        className="h-28 w-28 rounded-full ring-4 ring-white shadow-lg hover:ring-primary-500 transition-all duration-200 cursor-pointer object-cover"
                        onError={handleAvatarError}
                      />
                    )}
                    <div className="absolute inset-0 h-28 w-28 rounded-full bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                      <Edit className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </Link>
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-600 border-4 border-white shadow-sm"></div>
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <Link to="/onboarding" className="hover:text-primary-600 transition-colors">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {profile.name}
                      </h1>
                    </Link>
                  </div>
                  <Link to="/onboarding" className="hover:text-primary-600 transition-colors">
                    <p className="text-xl text-gray-600 font-medium">{profile.title}</p>
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
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
                    {profile.industry && (
                      <div className="flex items-center">
                        <Briefcase className="mr-1 h-4 w-4" />
                        {profile.industry}
                      </div>
                    )}
                    {profile.yearsOfExperience !== undefined && profile.yearsOfExperience !== null && (
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {profile.yearsOfExperience} years experience
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {renderConnectionButton()}
            </div>


            {profile.bio && (
              <div className="mt-8 relative">
                <div className="bg-gradient-to-br from-primary-25 via-white to-primary-50 rounded-xl p-8 border border-primary-100 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-25/30 to-transparent opacity-60"></div>
                  <p className="relative w-full text-gray-700 leading-relaxed text-base">{profile.bio}</p>
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
                <div className="flex items-center space-x-3 mb-8">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Professional Profile</h3>
                </div>
                
                {/* Professional Information Display */}
                <div className="space-y-8">

                  {/* Specializations */}
                  {profile.specializations && profile.specializations.length > 0 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <Target className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-gray-900">Specializations</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.specializations.map((spec, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Career Highlights */}
                  {profile.careerHighlights && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <Award className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-gray-900">Career Highlights</h4>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{profile.careerHighlights}</p>
                    </div>
                  )}

                  {/* Work Experience */}
                  {profile.workExperiences && profile.workExperiences.length > 0 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-gray-900">Work Experience</h4>
                      </div>
                      <div className="space-y-4">
                        {profile.workExperiences.slice(0, 3).map((experience, index) => (
                          <div key={index} className="border-l-2 border-gray-200 pl-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900">{experience.title}</h5>
                                <p className="text-sm text-blue-600 font-medium">{experience.company}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {experience.startDate && new Date(experience.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  {' - '}
                                  {experience.isCurrentRole ? 'Present' : experience.endDate && new Date(experience.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  {experience.location && ` • ${experience.location}`}
                                </p>
                              </div>
                            </div>
                            {experience.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{experience.description}</p>
                            )}
                          </div>
                        ))}
                        {profile.workExperiences.length > 3 && (
                          <p className="text-sm text-gray-500 italic">
                            +{profile.workExperiences.length - 3} more positions
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {profile.education && profile.education.length > 0 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                        <h4 className="font-semibold text-gray-900">Education</h4>
                      </div>
                      <div className="space-y-3">
                        {profile.education.slice(0, 2).map((edu, index) => (
                          <div key={index} className="border-l-2 border-gray-200 pl-4">
                            <h5 className="font-medium text-gray-900">{edu.degree}</h5>
                            <p className="text-sm text-blue-600">{edu.fieldOfStudy}</p>
                            <p className="text-sm text-gray-600">{edu.institution}</p>
                            <p className="text-xs text-gray-500">
                              {edu.startYear} - {edu.isCurrentlyStudying ? 'Present' : edu.endYear}
                              {edu.location && ` • ${edu.location}`}
                            </p>
                          </div>
                        ))}
                        {profile.education.length > 2 && (
                          <p className="text-sm text-gray-500 italic">
                            +{profile.education.length - 2} more qualifications
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {profile.certifications && profile.certifications.length > 0 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <Award className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-gray-900">Certifications</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {profile.certifications.slice(0, 4).map((cert, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <h5 className="font-medium text-gray-900 text-sm">{cert.name}</h5>
                            <p className="text-xs text-blue-600">{cert.issuingOrganization}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {cert.issueDate && new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              {cert.neverExpires ? ' • No Expiration' : cert.expirationDate && ` - ${new Date(cert.expirationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                            </p>
                          </div>
                        ))}
                        {profile.certifications.length > 4 && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-center">
                            <p className="text-sm text-gray-500">+{profile.certifications.length - 4} more</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Career Goals & Professional Interests */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Career Goals */}
                    {profile.careerGoals && profile.careerGoals.length > 0 && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-4">
                          <Target className="w-4 h-4 text-gray-500" />
                          <h4 className="font-semibold text-gray-900">Career Goals</h4>
                        </div>
                        <div className="space-y-2">
                          {profile.careerGoals.map((goal, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <p className="text-sm text-gray-700">{goal}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Professional Interests */}
                    {profile.professionalInterests && profile.professionalInterests.length > 0 && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-4">
                          <Heart className="w-4 h-4 text-gray-500" />
                          <h4 className="font-semibold text-gray-900">Professional Interests</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.professionalInterests.map((interest, index) => (
                            <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Summary - Always show for onboarded users */}
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SkillSummary 
          selectedSkills={selectedSkillsData} 
          hasJournalEntries={(journalEntriesData?.entries?.length || 0) > 0}
          hasOnboardingSkills={combinedSkills.length > 0}
        />
      </div>

      {/* Main Content */}
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Skills Section - More compact */}
          {combinedSkills.length > 0 && (
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
                {combinedSkills.map((skill) => (
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
          <div className={combinedSkills.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
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
                      No achievements available yet. Complete more onboarding steps to see your achievements here.
                    </p>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="journal" className="space-y-6">
                  {filteredJournalEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="transform transition-all duration-300 ease-in-out"
                    >
                      <JournalCard 
                        journal={entry}
                        viewMode="network"
                        showMenuButton={false}
                        showAnalyticsButton={true}
                        showUserProfile={false}
                      />
                    </div>
                  ))}
                  {filteredJournalEntries.length === 0 && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="text-gray-600">
                        {selectedSkills.size === 0
                          ? 'No journal entries available yet. Start creating journal entries to see them here.'
                          : 'No journal entries found for the selected skills'}
                      </p>
                    </div>
                  )}
                </Tabs.Content>

                <Tabs.Content value="skills-growth" className="space-y-6">
                  {dynamicSkillsGrowthData.length > 0 ? (
                    <SkillsGrowth periods={filteredSkillsGrowthData} benchmarks={dynamicSkillsBenchmarks} />
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">
                        Skills growth tracking will be available once you have skills data from your profile.
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
  );
}