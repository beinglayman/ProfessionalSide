import React from 'react';
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
import { ChevronRight, Clock, Users, Hash } from 'lucide-react';

interface MinimalListVariantProps {
  entry: Format7JournalEntry;
}

const getToolIcon = (source: string, size = 'w-3 h-3') => {
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

const MinimalListVariant: React.FC<MinimalListVariantProps> = ({ entry }) => {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Minimal Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-medium text-gray-900">{entry.entry_metadata.title}</h2>
          {entry.entry_metadata.isAutomated && (
            <Badge variant="outline" className="text-xs">
              Auto
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">{entry.context.primary_focus}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>{entry.context.date_range.start}</span>
          <span>•</span>
          <span>{entry.summary.total_time_range_hours}h</span>
          <span>•</span>
          <span>{entry.activities.length} activities</span>
          <span>•</span>
          <span>{entry.summary.unique_collaborators.length} people</span>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-1">
        {entry.activities.map((activity) => (
          <div
            key={activity.id}
            className="group flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-md transition-colors"
          >
            {/* Time */}
            <span className="text-xs text-gray-400 w-14 flex-shrink-0">
              {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>

            {/* Tool Icon */}
            <div className="flex-shrink-0 opacity-60">
              {getToolIcon(activity.source)}
            </div>

            {/* Action */}
            <span className="text-sm text-gray-700 flex-1 truncate">
              {activity.action}
            </span>

            {/* Metadata */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {activity.importance === 'high' && (
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              )}

              {activity.collaborators.length > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activity.collaborators.length}
                </span>
              )}

              {activity.technologies.length > 0 && (
                <Badge variant="ghost" className="text-xs px-1 py-0">
                  {activity.technologies[0]}
                </Badge>
              )}

              {activity.evidence.metadata?.lines_added && (
                <span className="text-xs text-gray-400">
                  +{activity.evidence.metadata.lines_added}
                </span>
              )}
            </div>

            {/* Hover arrow */}
            <ChevronRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Minimal Footer */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          {/* Correlations */}
          {entry.correlations.length > 0 && (
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>{entry.correlations.length} correlations</span>
            </div>
          )}

          {/* Technologies */}
          <div className="flex items-center gap-2">
            <span>Tech:</span>
            <div className="flex gap-1">
              {entry.summary.technologies_used.slice(0, 3).map(tech => (
                <Badge key={tech} variant="ghost" className="text-xs px-1 py-0">
                  {tech}
                </Badge>
              ))}
              {entry.summary.technologies_used.length > 3 && (
                <span>+{entry.summary.technologies_used.length - 3}</span>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="flex items-center gap-2">
            <span>Skills:</span>
            <div className="flex gap-1">
              {entry.summary.skills_demonstrated.slice(0, 2).map(skill => (
                <Badge key={skill} variant="ghost" className="text-xs px-1 py-0">
                  {skill}
                </Badge>
              ))}
              {entry.summary.skills_demonstrated.length > 2 && (
                <span>+{entry.summary.skills_demonstrated.length - 2}</span>
              )}
            </div>
          </div>
        </div>

        {/* Collaborators */}
        {entry.summary.unique_collaborators.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500">Team:</span>
            <div className="flex -space-x-1">
              {entry.summary.unique_collaborators.slice(0, 6).map(collaborator => (
                <div
                  key={collaborator.id}
                  className="w-5 h-5 rounded-full border border-white overflow-hidden"
                  title={collaborator.name}
                >
                  {collaborator.avatar ? (
                    <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-[8px] font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                      {collaborator.initials?.[0]}
                    </div>
                  )}
                </div>
              ))}
              {entry.summary.unique_collaborators.length > 6 && (
                <div className="w-5 h-5 rounded-full border border-white bg-gray-100 flex items-center justify-center">
                  <span className="text-[8px] text-gray-600">+{entry.summary.unique_collaborators.length - 6}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalListVariant;