import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { Button } from '../../components/ui/button';
import { 
  useUserProfile, 
  useUserSkills, 
  useUserExperiences, 
  useUserEducation, 
  useUserGoals, 
  useUserAchievements,
  useUserJournalEntries 
} from '../../hooks/useProfile';
import { useJournalEntries } from '../../hooks/useJournal';
import { JournalCard } from '../../components/journal/journal-card';
import { SkillCard } from '../../components/profile/skill-card';
import { AchievementCard } from '../../components/profile/achievement-card';
import { Edit, MapPin, Building2, Mail, Calendar, Users, FileText, Award, BookOpen, Target } from 'lucide-react';

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  
  // API queries
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: skills, isLoading: skillsLoading } = useUserSkills(userId);
  const { data: experiences, isLoading: experiencesLoading } = useUserExperiences(userId);
  const { data: education, isLoading: educationLoading } = useUserEducation(userId);
  const { data: goals, isLoading: goalsLoading } = useUserGoals(userId);
  const { data: achievements, isLoading: achievementsLoading } = useUserAchievements(userId);
  
  // Get journal entries using the existing hook
  const { data: journalData, isLoading: journalLoading } = useJournalEntries({
    userId: userId,
    page: 1,
    limit: 10
  });

  const isLoading = profileLoading || skillsLoading || experiencesLoading || 
                   educationLoading || goalsLoading || achievementsLoading || journalLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-gray-900">Profile not found</h2>
            <p className="text-gray-500 mt-2">The user profile you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const journalEntries = journalData?.entries || [];
  const isOwnProfile = !userId; // If no userId in params, it's the current user's profile

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start space-x-6">
            <img
              src={profile.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop'}
              alt={profile.name}
              className="h-24 w-24 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                  {profile.position && (
                    <p className="text-lg text-gray-600 mt-1">{profile.position}</p>
                  )}
                  {profile.company && (
                    <p className="text-gray-500 flex items-center mt-1">
                      <Building2 className="h-4 w-4 mr-1" />
                      {profile.company}
                    </p>
                  )}
                  {profile.location && (
                    <p className="text-gray-500 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile.location}
                    </p>
                  )}
                </div>
                {isOwnProfile && (
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
              
              {profile.bio && (
                <p className="text-gray-700 mt-4 max-w-2xl">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  {profile.stats.totalJournalEntries} entries
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {profile.stats.totalSkills} skills
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  {profile.stats.completedGoals}/{profile.stats.totalGoals} goals
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {profile.stats.networkConnections} connections
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex space-x-8 border-b border-gray-200 mb-6">
            <Tabs.Trigger
              value="overview"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger
              value="journal"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Journal Entries ({journalEntries.length})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="skills"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Skills ({skills?.length || 0})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="experience"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Experience
            </Tabs.Trigger>
            <Tabs.Trigger
              value="achievements"
              className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
            >
              Achievements ({achievements?.length || 0})
            </Tabs.Trigger>
          </Tabs.List>

          {/* Overview Tab */}
          <Tabs.Content value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Journal Entries */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Journal Entries</h3>
                <div className="space-y-4">
                  {journalEntries.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="border-l-4 border-primary-500 pl-4">
                      <h4 className="font-medium text-gray-900">{entry.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{entry.category}</span>
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {journalEntries.length === 0 && (
                    <p className="text-gray-500 text-sm">No journal entries yet.</p>
                  )}
                </div>
              </div>

              {/* Top Skills */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Skills</h3>
                <div className="space-y-3">
                  {skills?.slice(0, 5).map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{skill.skill.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full" 
                            style={{ width: `${skill.proficiency}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{skill.proficiency}%</span>
                      </div>
                    </div>
                  )) || <p className="text-gray-500 text-sm">No skills added yet.</p>}
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            {achievements && achievements.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Achievements</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {achievements.slice(0, 3).map((achievement) => (
                    <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Award className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(achievement.dateAchieved).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Tabs.Content>

          {/* Journal Tab */}
          <Tabs.Content value="journal">
            <div className="space-y-6">
              {journalEntries.map((entry) => (
                <JournalCard
                  key={entry.id}
                  journal={entry}
                  viewMode="network"
                  showMenuButton={false}
                  showAnalyticsButton={false}
                  showUserProfile={false}
                />
              ))}
              {journalEntries.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No journal entries</h3>
                  <p className="text-gray-500">This user hasn't shared any journal entries yet.</p>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Skills Tab */}
          <Tabs.Content value="skills">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {skills?.map((skill) => (
                <div key={skill.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{skill.skill.name}</h4>
                    <span className="text-sm text-gray-500">{skill.skill.category}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full" 
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{skill.proficiency}% proficiency</span>
                    <span>{skill.yearsOfExperience} years</span>
                  </div>
                  {skill.endorsements > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{skill.endorsements} endorsements</p>
                  )}
                </div>
              )) || (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No skills added</h3>
                  <p className="text-gray-500">This user hasn't added any skills yet.</p>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Experience Tab */}
          <Tabs.Content value="experience">
            <div className="space-y-6">
              {experiences?.map((experience) => (
                <div key={experience.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{experience.title}</h3>
                      <p className="text-gray-600">{experience.company}</p>
                      {experience.location && (
                        <p className="text-gray-500 text-sm">{experience.location}</p>
                      )}
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(experience.startDate).toLocaleDateString()} - {
                          experience.isCurrent ? 'Present' : 
                          experience.endDate ? new Date(experience.endDate).toLocaleDateString() : 'Present'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {experience.description && (
                    <p className="text-gray-700 mt-4">{experience.description}</p>
                  )}
                  
                  {experience.achievements.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Key Achievements</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {experience.achievements.map((achievement, index) => (
                          <li key={index} className="text-sm text-gray-600">{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {experience.skills.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {experience.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )) || (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No experience added</h3>
                  <p className="text-gray-500">This user hasn't added any work experience yet.</p>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Achievements Tab */}
          <Tabs.Content value="achievements">
            <div className="grid gap-6 md:grid-cols-2">
              {achievements?.map((achievement) => (
                <div key={achievement.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start space-x-4">
                    <Award className="h-8 w-8 text-yellow-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{achievement.title}</h3>
                      <p className="text-gray-600 mt-1">{achievement.description}</p>
                      
                      {achievement.issuer && (
                        <p className="text-sm text-gray-500 mt-2">Issued by {achievement.issuer}</p>
                      )}
                      
                      <p className="text-sm text-gray-500 mt-1">
                        Achieved on {new Date(achievement.dateAchieved).toLocaleDateString()}
                      </p>
                      
                      {achievement.expiryDate && (
                        <p className="text-sm text-gray-500">
                          Expires on {new Date(achievement.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                      
                      {achievement.skills.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {achievement.skills.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {achievement.credentialUrl && (
                        <a 
                          href={achievement.credentialUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
                        >
                          View Credential →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="col-span-full text-center py-12">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No achievements</h3>
                  <p className="text-gray-500">This user hasn't added any achievements yet.</p>
                </div>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}