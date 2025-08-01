import React from 'react';
import { format } from 'date-fns';
import { Users, Target, Clock, ExternalLink, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GoalCardProps {
  goal: {
    title: string;
    status: 'completed' | 'in-progress' | 'not-started';
    relatedSkills: string[];
    description: string;
    successCriteria: string;
    progress: number;
    completionDate?: Date;
    expectedDate?: Date;
    validationLink?: {
      url: string;
      type: string;
      description: string;
    };
    mentor?: {
      name: string;
      role: string;
      avatar: string;
    };
    teamMembers?: Array<{
      name: string;
      avatar: string;
    }>;
    stakeholders?: Array<{
      name: string;
      role: string;
      avatar: string;
    }>;
  };
}

export function GoalCard({ goal }: GoalCardProps) {
  const statusColors = {
    completed: {
      text: 'text-green-800',
      bg: 'bg-green-100',
      progress: 'bg-green-500',
    },
    'in-progress': {
      text: 'text-blue-800',
      bg: 'bg-blue-100',
      progress: 'bg-blue-500',
    },
    'not-started': {
      text: 'text-gray-800',
      bg: 'bg-gray-100',
      progress: 'bg-gray-500',
    },
  };

  const statusLabels = {
    completed: 'Completed',
    'in-progress': 'In Progress',
    'not-started': 'Not Started',
  };

  const getValidationIcon = (type: string) => {
    switch (type) {
      case 'certification':
        return 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=50&h=50&fit=crop';
      case 'github':
        return 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
      case 'course':
        return 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=50&h=50&fit=crop';
      default:
        return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=50&h=50&fit=crop';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
          <div className="mt-1 flex items-center space-x-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusColors[goal.status].bg,
                statusColors[goal.status].text
              )}
            >
              {statusLabels[goal.status]}
            </span>
            {(goal.completionDate || goal.expectedDate) && (
              <span className="flex items-center space-x-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>
                  {goal.completionDate
                    ? `Completed ${format(goal.completionDate, 'MMMM yyyy')}`
                    : `Expected ${format(goal.expectedDate!, 'MMMM yyyy')}`}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {goal.relatedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800"
            >
              {skill}
            </span>
          ))}
        </div>

        <div>
          <p className="text-sm text-gray-700">{goal.description}</p>
          <div className="mt-2 rounded-md bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">Success Criteria</p>
            <p className="mt-1 text-sm text-gray-700">{goal.successCriteria}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-900">{goal.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full transition-all duration-300 ease-in-out',
                statusColors[goal.status].progress
              )}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* Validation Link */}
        {goal.validationLink && (
          <div className="group relative rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center space-x-4">
              <img
                src={getValidationIcon(goal.validationLink.type)}
                alt={goal.validationLink.type}
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  External Validation
                </h4>
                <a
                  href={goal.validationLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <span>View Validation</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="group relative">
                <Info className="h-5 w-5 cursor-help text-gray-400" />
                <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white group-hover:block">
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                  {goal.validationLink.description}
                </div>
              </div>
            </div>
          </div>
        )}

        {goal.mentor && (
          <div className="flex items-center space-x-3 rounded-md bg-primary-50 p-3">
            <Target className="h-5 w-5 text-primary-500" />
            <div className="flex items-center space-x-3">
              <img
                src={goal.mentor.avatar}
                alt={goal.mentor.name}
                className="h-8 w-8 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-primary-800">
                  Mentored by {goal.mentor.name}
                </p>
                <p className="text-sm text-primary-700">{goal.mentor.role}</p>
              </div>
            </div>
          </div>
        )}

        {goal.teamMembers && goal.teamMembers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Team Collaboration</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {goal.teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center space-x-2 rounded-full bg-gray-100 px-3 py-1"
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-6 w-6 rounded-full"
                  />
                  <span className="text-sm text-gray-700">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {goal.stakeholders && goal.stakeholders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Stakeholders</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {goal.stakeholders.map((stakeholder) => (
                <div
                  key={stakeholder.name}
                  className="flex items-center space-x-2 rounded-full bg-gray-100 px-3 py-1"
                >
                  <img
                    src={stakeholder.avatar}
                    alt={stakeholder.name}
                    className="h-6 w-6 rounded-full"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">{stakeholder.name}</span>
                    <span className="text-gray-500"> • {stakeholder.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}