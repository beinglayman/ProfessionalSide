import React from 'react';
import { format } from 'date-fns';
import { Award, Calendar, Users, CheckCircle2, FileText, ChevronRight, Star, Trophy, Badge, Globe, Lock, UserCheck, Briefcase, ThumbsUp, MessageSquare, RepeatIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface Collaborator {
  name: string;
  role: string;
  avatar: string;
}

interface Achievement {
  id: string;
  title: string;
  date: Date;
  skills: string[];
  impact: string;
  journalEntries: string[];
  collaborators: Collaborator[];
  reviewers: Collaborator[];
  status: 'completed' | 'in-progress';
  backgroundColor: string;
  visibility?: 'organization' | 'global';
  achievementType?: 'individual' | 'team' | 'org';
  workType?: string;
  description?: string;
  accomplishments?: string[];
}

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const isGlobal = achievement.visibility === 'global';
  const isOrganization = achievement.visibility === 'organization';
  const isWorkspaceView = true; // For achievements, always show full content
  
  const getAchievementIcon = (type?: string) => {
    switch (type) {
      case 'individual':
        return <Star className="h-5 w-5" />;
      case 'team':
        return <Trophy className="h-5 w-5" />;
      case 'org':
        return <Award className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };
  
  const borderStyle = isGlobal 
    ? 'border-purple-200 relative overflow-hidden' 
    : isOrganization 
    ? 'border-indigo-200' 
    : 'border-gray-200';
    
  const headerBgStyle = isGlobal 
    ? 'bg-gradient-to-r from-purple-50 to-fuchsia-50' 
    : isOrganization 
    ? 'bg-gradient-to-r from-indigo-100 to-blue-100' 
    : 'bg-gradient-to-br from-white to-primary-50';
    
  const iconBgStyle = isGlobal 
    ? 'bg-purple-100' 
    : isOrganization 
    ? 'bg-indigo-100' 
    : 'bg-primary-100';
    
  const iconColorStyle = isGlobal 
    ? 'text-purple-600' 
    : isOrganization 
    ? 'text-indigo-600' 
    : 'text-primary-600';

  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between mb-4 group/header">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {achievement.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(achievement.date, 'MMM d, yyyy')}
              </span>
              {achievement.status === 'completed' && (
                <>
                  <span>•</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Completed</span>
                </>
              )}
            </div>
          </div>
          
          {/* Visibility indicator */}
          <div className="flex flex-col items-end gap-2 min-w-fit">
            <div className="flex items-center gap-2 mb-1">
              {/* Achievement type tag */}
              <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                <Trophy className="h-3 w-3" />
                Achievement
              </span>
              {achievement.status === 'completed' ? (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                  <Calendar className="h-3 w-3" />
                  In Progress
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-3">
            {achievement.impact}
          </p>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {achievement.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Collaborators */}
        {achievement.collaborators && achievement.collaborators.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Collaborators:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievement.collaborators.map((collaborator) => (
                <div key={collaborator.name} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                  <img src={collaborator.avatar} alt={collaborator.name} className="h-5 w-5 rounded-full" />
                  <span className="text-sm text-gray-700">{collaborator.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviewers */}
        {achievement.reviewers && achievement.reviewers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <UserCheck className="h-4 w-4" />
              <span className="font-medium">Reviewers:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievement.reviewers.map((reviewer) => (
                <div key={reviewer.name} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                  <img src={reviewer.avatar} alt={reviewer.name} className="h-5 w-5 rounded-full" />
                  <span className="text-sm text-gray-700">{reviewer.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievement-specific sections */}
      <div className="px-6 py-4 space-y-4">
        {/* Business Impact - Achievement specific */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
          <h4 className="text-sm font-medium mb-2 text-yellow-800">
            Business Impact
          </h4>
          <p className="text-sm text-gray-700">{achievement.impact}</p>
        </div>
        
        {/* Description */}
        {achievement.description && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-medium mb-2 text-gray-800">
              Achievement Details
            </h4>
            <p className="text-sm text-gray-700">{achievement.description}</p>
          </div>
        )}
        
        {/* Accomplishments */}
        {achievement.accomplishments && achievement.accomplishments.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-medium mb-2 text-gray-800">
              Key Accomplishments
            </h4>
            <ul className="space-y-1">
              {achievement.accomplishments.map((accomplishment, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="mr-2 text-gray-400">•</span>
                  {accomplishment}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Supporting Documentation */}
        {achievement.journalEntries && achievement.journalEntries.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Supporting Journal Entries</h4>
            <div className="space-y-2">
              {achievement.journalEntries.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded px-3 py-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{entry}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with social actions */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600">
              <ThumbsUp className="h-4 w-4" />
              <span>Appreciate (12)</span>
            </button>
            <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600">
              <MessageSquare className="h-4 w-4" />
              <span>Discuss (3)</span>
            </button>
            <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600">
              <RepeatIcon className="h-4 w-4" />
              <span>ReChronicle (1)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}