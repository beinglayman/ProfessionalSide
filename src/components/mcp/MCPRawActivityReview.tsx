import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  MessageSquare,
  FileText,
  Palette,
  Users,
  Calendar,
  GitCommit,
  AlertCircle,
  CheckSquare,
  Square,
  CheckCheck,
  SquareSlash
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

// Tool source icons
const toolIcons: Record<string, React.ReactNode> = {
  github: <GitPullRequest className="h-5 w-5" />,
  jira: <FileText className="h-5 w-5" />,
  figma: <Palette className="h-5 w-5" />,
  outlook: <Calendar className="h-5 w-5" />,
  confluence: <FileText className="h-5 w-5" />,
  slack: <MessageSquare className="h-5 w-5" />,
  teams: <Users className="h-5 w-5" />,
  zoom: <Users className="h-5 w-5" />,
  onedrive: <FileText className="h-5 w-5" />,
  onenote: <FileText className="h-5 w-5" />,
  sharepoint: <FileText className="h-5 w-5" />,
  google_workspace: <FileText className="h-5 w-5" />
};

// Tool colors
const toolColors: Record<string, string> = {
  github: 'bg-gray-100 text-gray-800 border-gray-300',
  jira: 'bg-blue-100 text-blue-800 border-blue-300',
  figma: 'bg-purple-100 text-purple-800 border-purple-300',
  outlook: 'bg-blue-100 text-blue-800 border-blue-300',
  confluence: 'bg-blue-100 text-blue-800 border-blue-300',
  slack: 'bg-purple-100 text-purple-800 border-purple-300',
  teams: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  zoom: 'bg-blue-100 text-blue-800 border-blue-300',
  onedrive: 'bg-blue-100 text-blue-800 border-blue-300',
  onenote: 'bg-purple-100 text-purple-800 border-purple-300',
  sharepoint: 'bg-blue-100 text-blue-800 border-blue-300',
  google_workspace: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

interface RawActivity {
  id: string;
  type: string;
  title: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
  url?: string;
}

interface MCPRawActivityReviewProps {
  rawData: Record<string, any>;
  sources: string[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onContinue: () => void;
  className?: string;
}

export function MCPRawActivityReview({
  rawData,
  sources,
  selectedIds,
  onSelectionChange,
  onContinue,
  className
}: MCPRawActivityReviewProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set(sources));

  // Extract all activities from raw data
  const extractActivities = (toolType: string, data: any): RawActivity[] => {
    const activities: RawActivity[] = [];

    switch (toolType) {
      case 'github':
        // GitHub PRs
        data.pullRequests?.forEach((pr: any) => {
          activities.push({
            id: `github-pr-${pr.id}`,
            type: 'Pull Request',
            title: pr.title,
            timestamp: pr.createdAt,
            url: pr.url,
            metadata: {
              state: pr.state,
              author: pr.author,
              additions: pr.additions,
              deletions: pr.deletions,
              filesChanged: pr.filesChanged
            }
          });
        });
        // GitHub Issues
        data.issues?.forEach((issue: any) => {
          activities.push({
            id: `github-issue-${issue.id}`,
            type: 'Issue',
            title: issue.title,
            timestamp: issue.createdAt,
            url: issue.url,
            metadata: {
              state: issue.state,
              assignee: issue.assignee,
              labels: issue.labels
            }
          });
        });
        // GitHub Commits
        data.commits?.forEach((commit: any) => {
          activities.push({
            id: `github-commit-${commit.sha}`,
            type: 'Commit',
            title: commit.message,
            timestamp: commit.timestamp,
            url: commit.url,
            metadata: {
              author: commit.author,
              repository: commit.repository
            }
          });
        });
        break;

      case 'jira':
        data.issues?.forEach((issue: any) => {
          activities.push({
            id: `jira-${issue.key}`,
            type: issue.type || 'Issue',
            title: `[${issue.key}] ${issue.summary}`,
            timestamp: issue.updated,
            url: issue.url,
            metadata: {
              status: issue.status,
              assignee: issue.assignee,
              priority: issue.priority,
              labels: issue.labels
            }
          });
        });
        break;

      case 'slack':
        data.messages?.forEach((msg: any, idx: number) => {
          activities.push({
            id: `slack-msg-${idx}`,
            type: 'Message',
            title: msg.text?.substring(0, 100) || 'Message',
            timestamp: msg.timestamp,
            metadata: {
              channel: msg.channel,
              user: msg.user,
              reactions: msg.reactions
            }
          });
        });
        break;

      case 'figma':
        data.files?.forEach((file: any) => {
          activities.push({
            id: `figma-${file.key}`,
            type: 'Design File',
            title: file.name,
            timestamp: file.lastModified,
            url: file.url,
            metadata: {
              version: file.version
            }
          });
        });
        break;

      case 'outlook':
      case 'teams':
        data.meetings?.forEach((meeting: any, idx: number) => {
          activities.push({
            id: `${toolType}-meeting-${idx}`,
            type: 'Meeting',
            title: meeting.subject || meeting.title,
            timestamp: meeting.startTime || meeting.start,
            metadata: {
              duration: meeting.duration,
              participants: meeting.participants || meeting.attendees
            }
          });
        });
        break;

      default:
        // Generic handling for other tools
        if (Array.isArray(data)) {
          data.forEach((item: any, idx: number) => {
            activities.push({
              id: `${toolType}-${idx}`,
              type: item.type || 'Activity',
              title: item.title || item.name || 'Untitled',
              timestamp: item.timestamp || item.createdAt || new Date(),
              metadata: item
            });
          });
        }
    }

    return activities;
  };

  // Get activities for each tool
  const toolActivities: Record<string, RawActivity[]> = {};
  let totalActivities = 0;

  sources.forEach(toolType => {
    const data = rawData[toolType];
    if (data) {
      toolActivities[toolType] = extractActivities(toolType, data);
      totalActivities += toolActivities[toolType].length;
    }
  });

  // Toggle tool expansion
  const toggleTool = (toolType: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolType)) {
      newExpanded.delete(toolType);
    } else {
      newExpanded.add(toolType);
    }
    setExpandedTools(newExpanded);
  };

  // Toggle single activity
  const toggleActivity = (activityId: string) => {
    const newSelected = selectedIds.includes(activityId)
      ? selectedIds.filter(id => id !== activityId)
      : [...selectedIds, activityId];
    onSelectionChange(newSelected);
  };

  // Select/deselect all for a tool
  const toggleAllTool = (toolType: string) => {
    const toolActivityIds = toolActivities[toolType].map(a => a.id);
    const allSelected = toolActivityIds.every(id => selectedIds.includes(id));

    const newSelected = allSelected
      ? selectedIds.filter(id => !toolActivityIds.includes(id))
      : [...new Set([...selectedIds, ...toolActivityIds])];

    onSelectionChange(newSelected);
  };

  // Select/deselect all
  const toggleAll = () => {
    const allIds = Object.values(toolActivities).flat().map(a => a.id);
    const allSelected = allIds.length === selectedIds.length;

    onSelectionChange(allSelected ? [] : allIds);
  };

  const selectedCount = selectedIds.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Review Activities</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {selectedCount === totalActivities ? (
              <>
                <SquareSlash className="h-4 w-4 mr-1" />
                Deselect All
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4 mr-1" />
                Select All
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Select the activities you want to include in your journal entry.{' '}
          <span className="font-medium text-gray-900">
            {selectedCount} of {totalActivities} selected
          </span>
        </p>
      </div>

      {/* Tool Groups */}
      <div className="space-y-4">
        {sources.map(toolType => {
          const activities = toolActivities[toolType] || [];
          if (activities.length === 0) return null;

          const isExpanded = expandedTools.has(toolType);
          const toolActivityIds = activities.map(a => a.id);
          const toolSelectedCount = toolActivityIds.filter(id => selectedIds.includes(id)).length;
          const allToolSelected = toolActivityIds.every(id => selectedIds.includes(id));

          return (
            <div key={toolType} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Tool Header */}
              <div
                className={cn(
                  'flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50',
                  toolColors[toolType] || 'bg-gray-100'
                )}
                onClick={() => toggleTool(toolType)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllTool(toolType);
                    }}
                    className="hover:opacity-70"
                  >
                    {allToolSelected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : toolSelectedCount > 0 ? (
                      <Square className="h-5 w-5 fill-current opacity-50" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    {toolIcons[toolType]}
                    <span className="font-semibold capitalize">
                      {toolType.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {toolSelectedCount}/{activities.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </div>

              {/* Activities List */}
              {isExpanded && (
                <div className="divide-y divide-gray-200 bg-white">
                  {activities.map(activity => {
                    const isSelected = selectedIds.includes(activity.id);

                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          'flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                          !isSelected && 'opacity-50'
                        )}
                        onClick={() => toggleActivity(activity.id)}
                      >
                        <button className="mt-0.5">
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {activity.type}
                                </Badge>
                                {activity.metadata?.state && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs',
                                      activity.metadata.state === 'merged' && 'bg-purple-100 text-purple-700',
                                      activity.metadata.state === 'open' && 'bg-green-100 text-green-700',
                                      activity.metadata.state === 'closed' && 'bg-gray-100 text-gray-700'
                                    )}
                                  >
                                    {activity.metadata.state}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {activity.title}
                              </p>
                              {activity.metadata && (
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                  {activity.metadata.author && (
                                    <span>by {activity.metadata.author}</span>
                                  )}
                                  {activity.metadata.assignee && (
                                    <span>assigned to {activity.metadata.assignee}</span>
                                  )}
                                  {activity.metadata.additions !== undefined && (
                                    <span className="text-green-600">
                                      +{activity.metadata.additions}
                                    </span>
                                  )}
                                  {activity.metadata.deletions !== undefined && (
                                    <span className="text-red-600">
                                      -{activity.metadata.deletions}
                                    </span>
                                  )}
                                  {activity.metadata.filesChanged && (
                                    <span>{activity.metadata.filesChanged} files</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {selectedCount === 0 ? (
            <span className="text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Please select at least one activity
            </span>
          ) : (
            <span>
              Ready to process <span className="font-semibold">{selectedCount}</span> selected{' '}
              {selectedCount === 1 ? 'activity' : 'activities'}
            </span>
          )}
        </p>

        <Button
          onClick={onContinue}
          disabled={selectedCount === 0}
          className="bg-primary-600 hover:bg-primary-700"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
