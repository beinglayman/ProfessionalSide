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
import { ChevronDown, ChevronUp, Clock, Heart, MessageSquare, Repeat2, Building2, Calendar } from 'lucide-react';

interface FeedOutlinedMinimalProps {
  entry: Format7JournalEntry;
  showUserProfile?: boolean;
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

const FeedOutlinedMinimal: React.FC<FeedOutlinedMinimalProps> = ({ entry, showUserProfile = true }) => {
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

  // Mock author data - in real implementation, this would come from props
  const author = {
    name: "Sarah Johnson",
    title: "Senior Software Engineer",
    organization: "TechCorp Inc.",
    avatar: "https://i.pravatar.cc/150?img=1"
  };

  return (
    <div className="w-full">
      {/* Entry Title */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Feed View: Outlined Minimal (with Author Profile)</h3>
      </div>

      {/* Card with hover shadow */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Top Tags Row */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-1">
              Workspace
            </Badge>
            {entry.entry_metadata.isAutomated && (
              <Badge variant="outline" className="text-xs">Auto</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{entry.summary.total_time_range_hours}h span</span>
          </div>
        </div>

        {/* Author Profile Section */}
        {showUserProfile && (
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-primary-300 transition-colors cursor-pointer overflow-hidden flex-shrink-0">
                {author.avatar ? (
                  <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {author.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>

              {/* Author Info */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-gray-900 hover:text-primary-600 cursor-pointer transition-colors">
                  {author.name}
                </div>
                <div className="text-sm text-gray-600 truncate">{author.title}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{author.organization}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(entry.entry_metadata.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6">
          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{entry.entry_metadata.title}</h2>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {isExpanded ? entry.context.primary_focus : excerpt}
          </p>

          {/* Metadata Cards - Tools, Team, Tech */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Tools Card */}
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

            {/* Team Card */}
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

            {/* Tech Card */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Tech:</span>
              <div className="flex gap-1.5 flex-1 flex-wrap">
                {entry.summary.technologies_used.slice(0, 2).map(tech => (
                  <Badge key={tech} className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs rounded-full px-2 py-0.5">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Expanded Activities Section */}
          {isExpanded && (
            <>
              <div className="space-y-3 mb-4">
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

              {/* Team Sections */}
              <div className="grid grid-cols-2 gap-5 mb-4">
                {/* Collaborators */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Collaborators</h4>
                  <div className="space-y-2">
                    {entry.summary.unique_collaborators.map(collaborator => (
                      <div key={collaborator.id} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
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
                      <div key={reviewer.id} className="flex items-center gap-2 p-2 bg-green-50 border border-green-100 rounded-md">
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
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-purple-600 transition-colors">
              <Heart className="w-4 h-4 mr-1" />
              <span className="text-xs">Appreciate</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-purple-600 transition-colors">
              <MessageSquare className="w-4 h-4 mr-1" />
              <span className="text-xs">Discuss</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-purple-600 transition-colors">
              <Repeat2 className="w-4 h-4 mr-1" />
              <span className="text-xs">ReChronicle</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedOutlinedMinimal;
