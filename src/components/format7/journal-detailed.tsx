import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Format7JournalEntry } from './sample-data';
import {
  GithubIcon,
  JiraIcon,
  SlackIcon,
  TeamsIcon,
  FigmaIcon,
  ConfluenceIcon,
} from '../icons/ToolIcons';
import { ChevronDown, ChevronUp, Heart, MessageSquare, Repeat2, Trophy, Target } from 'lucide-react';

interface JournalDetailedProps {
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

const JournalDetailed: React.FC<JournalDetailedProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleActivity = (activityId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      newSet.has(activityId) ? newSet.delete(activityId) : newSet.add(activityId);
      return newSet;
    });
  };

  const excerpt = entry.context.primary_focus.slice(0, 150) + '...';

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500">Journal View: Detailed Card (without Author)</h3>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
        {/* Content */}
        <div className="p-6">
          {/* Title with Date */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2 flex-1">
              <Trophy className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <h2 className="text-xl font-bold text-gray-900">{entry.entry_metadata.title}</h2>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(entry.entry_metadata.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </div>
          </div>

          {/* Achievement Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-900">Achievement Unlocked</span>
            </div>
            <p className="text-sm text-purple-700">Successful completion of critical WebSocket integration</p>
          </div>

          {/* Linked Goals */}
          <div className="mb-4 py-3 bg-primary-50 border-l-4 border-primary-500 -mx-6 px-6 rounded-r-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-semibold text-primary-900">Linked Goal</span>
            </div>
            <p className="text-sm text-primary-700">Q4 2025: Implement real-time collaboration features</p>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            {isExpanded ? entry.context.primary_focus : excerpt}
          </p>

          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {/* Tools */}
            <div
              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <div className="text-xs font-semibold text-gray-700 mb-2">Tools Used</div>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(entry.activities.map(a => a.source))).slice(0, 3).map(source => (
                  <div key={source} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                    {getToolIcon(source, 'w-4 h-4')}
                    <span className="text-xs text-gray-700 capitalize font-medium">{source}</span>
                  </div>
                ))}
                {Array.from(new Set(entry.activities.map(a => a.source))).length > 3 && (
                  <div className="px-2.5 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                    +{Array.from(new Set(entry.activities.map(a => a.source))).length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Team */}
            <div
              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <div className="text-xs font-semibold text-gray-700 mb-2">Team Members</div>
              <div className="flex gap-2">
                {entry.summary.unique_collaborators.slice(0, 2).map(collaborator => (
                  <div key={collaborator.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                      {collaborator.avatar ? (
                        <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                          {collaborator.initials}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{collaborator.name.split(' ')[0]}</span>
                  </div>
                ))}
                {entry.summary.unique_collaborators.length > 2 && (
                  <div className="px-2 py-1 bg-gray-200 rounded-full text-xs font-semibold">
                    +{entry.summary.unique_collaborators.length - 2}
                  </div>
                )}
              </div>
            </div>

            {/* Technologies */}
            <div
              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <div className="text-xs font-semibold text-gray-700 mb-2">Technologies</div>
              <div className="flex flex-wrap gap-1.5">
                {entry.summary.technologies_used.slice(0, 3).map(tech => (
                  <Badge key={tech} className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs rounded-full px-2 py-0.5">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Expanded Activities */}
          {isExpanded && (
            <>
              <div className="space-y-3 mb-5">
                {entry.activities.map((activity) => {
                  const isActivityExpanded = expandedActivities.has(activity.id);
                  return (
                    <div key={activity.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
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

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-900">{activity.action}</span>
                            {activity.importance === 'high' && (
                              <Badge variant="destructive">High Priority</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {activity.technologies.map(tech => (
                              <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {isActivityExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>

                      {isActivityExpanded && (
                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-sm text-gray-600 leading-relaxed">{activity.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Team Sections */}
              <div className="grid grid-cols-2 gap-6 mb-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Collaborators</h4>
                  <div className="space-y-2">
                    {entry.summary.unique_collaborators.map(collaborator => (
                      <div key={collaborator.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {collaborator.avatar ? (
                            <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                              {collaborator.initials}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{collaborator.name}</div>
                          <div className="text-sm text-gray-500">{collaborator.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Reviewers</h4>
                  <div className="space-y-2">
                    {entry.summary.unique_reviewers.map(reviewer => (
                      <div key={reviewer.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {reviewer.avatar ? (
                            <img src={reviewer.avatar} alt={reviewer.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${reviewer.color}`}>
                              {reviewer.initials}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{reviewer.name}</div>
                          <div className="text-sm text-gray-500">{reviewer.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
          >
            {isExpanded ? 'Show Less ▲' : 'Show More ▼'}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-3">
            <Button variant="ghost" className="text-gray-600 hover:text-purple-600 transition-colors">
              <Heart className="w-4 h-4 mr-2" />
              Appreciate
            </Button>
            <Button variant="ghost" className="text-gray-600 hover:text-purple-600 transition-colors">
              <MessageSquare className="w-4 h-4 mr-2" />
              Discuss
            </Button>
            <Button variant="ghost" className="text-gray-600 hover:text-purple-600 transition-colors">
              <Repeat2 className="w-4 h-4 mr-2" />
              ReChronicle
            </Button>
          </div>
          <Button variant="outline" size="sm">
            View Analytics
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JournalDetailed;
