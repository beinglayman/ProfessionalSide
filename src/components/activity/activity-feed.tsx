import React from 'react';
import { format } from 'date-fns';
import { Building2, Users, UserCircle2, BadgeCheck, Award } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ActivityItem {
  id: string;
  type: 'journal' | 'achievement';
  content: string;
  createdAt: Date;
  author: {
    name: string;
    avatar: string;
    role: string;
    department: string;
  };
  scope: 'team' | 'department' | 'organization';
  tags: string[];
  teammates: string[];
  endorsements: number;
  attestations: number;
  isAchievement?: boolean;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  networkType: 'organization' | 'global';
}

export function ActivityFeed({ activities, networkType }: ActivityFeedProps) {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-6">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={cn(
              'transform rounded-lg border bg-white p-6 shadow-sm transition-all duration-300 ease-in-out',
              activity.isAchievement
                ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-white shadow-yellow-100'
                : 'border-gray-200'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={activity.author.avatar}
                  alt={activity.author.name}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {activity.author.name}
                    </h3>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{activity.author.role}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{activity.author.department}</span>
                    <span>•</span>
                    <span>{format(activity.createdAt, "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: activity.content }}
              />

              {activity.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {activity.teammates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activity.teammates.map((teammate) => (
                    <span
                      key={teammate}
                      className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800"
                    >
                      @{teammate}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex space-x-4">
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <BadgeCheck className="mr-1.5 h-4 w-4" />
                    {activity.endorsements} Endorsements
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <Award className="mr-1.5 h-4 w-4" />
                    {activity.attestations} Attestations
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}