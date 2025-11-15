import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Format7JournalEntry } from './sample-data';
import {
  GithubIcon,
  JiraIcon,
  SlackIcon,
  TeamsIcon,
  FigmaIcon,
  ConfluenceIcon,
} from '../icons/ToolIcons';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface MinimalVariantMProps {
  entry: Format7JournalEntry;
}

const getToolIcon = (source: string, size = 'w-4 h-4') => {
  switch (source) {
    case 'github': return <GithubIcon className={size} />;
    case 'jira': return <JiraIcon className={size} />;
    case 'slack': return <SlackIcon className={size} />;
    case 'teams': return <TeamsIcon className={size} />;
    case 'figma': return <FigmaIcon className={size} />;
    case 'confluence': return <ConfluenceIcon className={size} />;
    default: return null;
  }
};

const MinimalVariantM: React.FC<MinimalVariantMProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleActivity = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const excerpt = entry.context.primary_focus.slice(0, 112) + '...';

  return (
    <div className="w-full">
      {/* Entry Title */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Minimal - Variant M: Outlined + Icon-First Team</h3>
      </div>

      {/* Light border instead of border-2 */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{entry.entry_metadata.title}</h2>
              {entry.entry_metadata.isAutomated && (
                <Badge variant="default" className="text-xs">Auto</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{entry.summary.total_time_range_hours}h span</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {isExpanded ? entry.context.primary_focus : excerpt}
          </p>

          {/* Full-width horizontal cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Tools - Full width card with rounded bubble tags */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Tools:</span>
              <div className="flex gap-1.5 flex-1 flex-wrap items-center">
                {Array.from(new Set(entry.activities.map(a => a.source))).slice(0, 3).map(source => (
                  <div key={source} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                    {getToolIcon(source, 'w-3.5 h-3.5')}
                    <span className="text-xs text-gray-700 capitalize">{source}</span>
                  </div>
                ))}
                {Array.from(new Set(entry.activities.map(a => a.source))).length > 3 && (
                  <div className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                    +{Array.from(new Set(entry.activities.map(a => a.source))).length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Team - Full width card with profile cards */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Team:</span>
              <div className="flex gap-2 flex-1 items-center">
                {entry.summary.unique_collaborators.slice(0, 2).map(collaborator => (
                  <div key={collaborator.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      {collaborator.avatar ? (
                        <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                          {collaborator.initials}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium text-gray-900 truncate max-w-[60px]">{collaborator.name.split(' ')[0]}</div>
                    </div>
                  </div>
                ))}
                {entry.summary.unique_collaborators.length > 2 && (
                  <div className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                    +{entry.summary.unique_collaborators.length - 2}
                  </div>
                )}
              </div>
            </div>

            {/* Tech - Full width card with rounded bubble tags */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Tech:</span>
              <div className="flex gap-1.5 flex-1 flex-wrap">
                {entry.summary.technologies_used.slice(0, 3).map(tech => (
                  <Badge key={tech} variant="secondary" className="text-xs rounded-full px-2 py-0.5">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activities with lighter outlined cards */}
        {isExpanded && (
          <>
            <div className="space-y-3 mb-6">
              {entry.activities.map((activity) => {
                const isActivityExpanded = expandedActivities.has(activity.id);

                return (
                  <div key={activity.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleActivity(activity.id)}
                    >
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        {getToolIcon(activity.source, 'w-5 h-5')}
                        <span className="text-[10px] text-gray-400">
                          {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-gray-900">{activity.action}</span>
                          {activity.importance === 'high' && (
                            <Badge variant="destructive" className="text-xs">High</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activity.technologies.slice(0, 3).map(tech => (
                            <Badge key={tech} variant="outline" className="text-xs px-1.5 py-0.5">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {isActivityExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {isActivityExpanded && (
                      <div className="px-3 pb-3 bg-gray-50 border-t border-gray-200">
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Team Section - Using Icon-First Layout style */}
            <div className="grid grid-cols-2 gap-5 mb-6">
              {/* Collaborators */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">Collaborators</h4>
                <div className="space-y-2">
                  {entry.summary.unique_collaborators.map(collaborator => (
                    <div key={collaborator.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {collaborator.avatar ? (
                          <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                            {collaborator.initials}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{collaborator.name}</div>
                        <div className="text-xs text-gray-500 truncate">{collaborator.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewers */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">Reviewers</h4>
                <div className="space-y-2">
                  {entry.summary.unique_reviewers.map(reviewer => (
                    <div key={reviewer.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {reviewer.avatar ? (
                          <img src={reviewer.avatar} alt={reviewer.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${reviewer.color}`}>
                            {reviewer.initials}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{reviewer.name}</div>
                        <div className="text-xs text-gray-500 truncate">{reviewer.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Show More/Less Link */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
    </div>
  );
};

export default MinimalVariantM;
