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

  // Helper: Safely format timestamp
  const formatTimestamp = (timestamp: Date | string | undefined | null): string => {
    if (!timestamp) return 'No date';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM d, h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Extract all activities from raw data
  const extractActivities = (toolType: string, data: any): RawActivity[] => {
    const activities: RawActivity[] = [];

    // Debug: Log what data we received
    console.log(`[MCPRawActivityReview] === Extracting ${toolType} ===`);
    console.log(`[MCPRawActivityReview] ${toolType} - Data keys:`, data ? Object.keys(data) : 'NO DATA');
    console.log(`[MCPRawActivityReview] ${toolType} - Full data:`, data);

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
        // GitHub Repositories
        data.repositories?.forEach((repo: any) => {
          activities.push({
            id: `github-repo-${repo.name}`,
            type: 'Repository',
            title: repo.name,
            timestamp: repo.lastActivity,
            metadata: {
              language: repo.language,
              description: repo.description
            }
          });
        });
        break;

      case 'jira':
        console.log('[MCPRawActivityReview] Jira - issues:', data.issues?.length || 0);
        console.log('[MCPRawActivityReview] Jira - projects:', data.projects?.length || 0);
        console.log('[MCPRawActivityReview] Jira - sprints:', data.sprints?.length || 0);
        data.issues?.forEach((issue: any) => {
          activities.push({
            id: `jira-${issue.key}`,
            type: issue.issueType || 'Issue',
            title: `[${issue.key}] ${issue.summary}`,
            timestamp: issue.updated,
            url: issue.url,
            metadata: {
              status: issue.status,
              assignee: issue.assignee,
              priority: issue.priority,
              labels: issue.labels || []
            }
          });
        });
        data.projects?.forEach((project: any) => {
          activities.push({
            id: `jira-project-${project.key}`,
            type: 'Project',
            title: project.name,
            timestamp: new Date().toISOString(),
            metadata: {
              key: project.key,
              lead: project.lead
            }
          });
        });
        data.sprints?.forEach((sprint: any) => {
          activities.push({
            id: `jira-sprint-${sprint.id}`,
            type: 'Sprint',
            title: sprint.name,
            timestamp: sprint.startDate || sprint.endDate || new Date().toISOString(),
            metadata: {
              state: sprint.state,
              startDate: sprint.startDate,
              endDate: sprint.endDate
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
        data.threads?.forEach((thread: any) => {
          activities.push({
            id: `slack-thread-${thread.id}`,
            type: 'Thread',
            title: thread.originalMessage?.substring(0, 100) || 'Thread',
            timestamp: thread.timestamp,
            metadata: {
              channel: thread.channelName,
              channelId: thread.channelId,
              replyCount: thread.replyCount,
              participants: thread.participants,
              lastReply: thread.lastReply
            }
          });
        });
        data.channels?.forEach((channel: any) => {
          activities.push({
            id: `slack-channel-${channel.id}`,
            type: 'Channel',
            title: channel.name,
            timestamp: new Date().toISOString(),
            metadata: {
              isPrivate: channel.isPrivate,
              isMember: channel.isMember,
              topic: channel.topic,
              purpose: channel.purpose,
              memberCount: channel.memberCount
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
        data.components?.forEach((component: any) => {
          activities.push({
            id: `figma-component-${component.key}`,
            type: 'Component',
            title: component.name,
            timestamp: new Date().toISOString(),
            metadata: {
              description: component.description
            }
          });
        });
        data.comments?.forEach((comment: any) => {
          activities.push({
            id: `figma-comment-${comment.id}`,
            type: 'Comment',
            title: comment.message?.substring(0, 100) || 'Comment',
            timestamp: comment.createdAt,
            metadata: {
              fileKey: comment.fileKey
            }
          });
        });
        break;

      case 'outlook':
        data.meetings?.forEach((meeting: any, idx: number) => {
          activities.push({
            id: `outlook-meeting-${idx}`,
            type: 'Meeting',
            title: meeting.subject || meeting.title,
            timestamp: meeting.startTime || meeting.start,
            metadata: {
              duration: meeting.duration,
              participants: meeting.participants || meeting.attendees
            }
          });
        });
        data.emails?.forEach((email: any) => {
          activities.push({
            id: `outlook-email-${email.id}`,
            type: 'Email',
            title: email.subject,
            timestamp: email.receivedDateTime || email.sentDateTime,
            metadata: {
              from: email.from,
              to: email.toRecipients,
              hasAttachments: email.hasAttachments,
              importance: email.importance,
              isRead: email.isRead
            }
          });
        });
        break;

      case 'teams':
        data.meetings?.forEach((meeting: any, idx: number) => {
          activities.push({
            id: `teams-meeting-${idx}`,
            type: 'Meeting',
            title: meeting.subject || meeting.title,
            timestamp: meeting.startTime || meeting.start,
            metadata: {
              duration: meeting.duration,
              participants: meeting.participants || meeting.attendees
            }
          });
        });
        data.teams?.forEach((team: any) => {
          activities.push({
            id: `teams-team-${team.id}`,
            type: 'Team',
            title: team.displayName,
            timestamp: new Date().toISOString(),
            metadata: {
              description: team.description,
              visibility: team.visibility
            }
          });
        });
        data.channels?.forEach((channel: any) => {
          activities.push({
            id: `teams-channel-${channel.id}`,
            type: 'Channel',
            title: channel.displayName,
            timestamp: new Date().toISOString(),
            metadata: {
              teamId: channel.teamId,
              description: channel.description
            }
          });
        });
        data.chats?.forEach((chat: any) => {
          activities.push({
            id: `teams-chat-${chat.id}`,
            type: 'Chat',
            title: chat.topic || 'Chat',
            timestamp: chat.lastUpdatedDateTime,
            metadata: {
              chatType: chat.chatType,
              members: chat.members
            }
          });
        });
        data.chatMessages?.forEach((message: any) => {
          activities.push({
            id: `teams-chatmsg-${message.id}`,
            type: 'Chat Message',
            title: message.body?.content?.substring(0, 100) || 'Message',
            timestamp: message.createdDateTime,
            metadata: {
              chatId: message.chatId,
              from: message.from
            }
          });
        });
        data.channelMessages?.forEach((message: any) => {
          activities.push({
            id: `teams-channelmsg-${message.id}`,
            type: 'Channel Message',
            title: message.body?.content?.substring(0, 100) || 'Message',
            timestamp: message.createdDateTime,
            metadata: {
              channelId: message.channelId,
              from: message.from
            }
          });
        });
        break;

      case 'confluence':
        console.log('[MCPRawActivityReview] Confluence - pages:', data.pages?.length || 0);
        console.log('[MCPRawActivityReview] Confluence - blogPosts:', data.blogPosts?.length || 0);
        console.log('[MCPRawActivityReview] Confluence - comments:', data.comments?.length || 0);
        console.log('[MCPRawActivityReview] Confluence - spaces:', data.spaces?.length || 0);
        data.pages?.forEach((page: any) => {
          activities.push({
            id: `confluence-page-${page.id}`,
            type: 'Page',
            title: page.title,
            timestamp: page.lastModified || page.created,
            url: page.url,
            metadata: {
              spaceKey: page.space?.key || '',
              spaceName: page.space?.name || '',
              author: page.lastModifiedBy || '',
              version: page.version
            }
          });
        });
        data.blogPosts?.forEach((post: any) => {
          activities.push({
            id: `confluence-blog-${post.id}`,
            type: 'Blog Post',
            title: post.title,
            timestamp: post.publishedDate || post.created,
            url: post.url,
            metadata: {
              spaceKey: post.space?.key || '',
              spaceName: post.space?.name || '',
              author: post.author || ''
            }
          });
        });
        data.comments?.forEach((comment: any) => {
          activities.push({
            id: `confluence-comment-${comment.id}`,
            type: 'Comment',
            title: comment.content?.substring(0, 100) || 'Comment',
            timestamp: comment.createdAt,
            metadata: {
              pageId: comment.pageId,
              author: comment.author || ''
            }
          });
        });
        data.spaces?.forEach((space: any) => {
          activities.push({
            id: `confluence-space-${space.id}`,
            type: 'Space',
            title: space.name,
            timestamp: new Date().toISOString(),
            metadata: {
              key: space.key,
              type: space.type,
              description: space.description
            }
          });
        });
        break;

      case 'onenote':
        data.notebooks?.forEach((notebook: any) => {
          activities.push({
            id: `onenote-notebook-${notebook.id}`,
            type: 'Notebook',
            title: notebook.displayName,
            timestamp: notebook.lastModifiedDateTime || new Date().toISOString(),
            metadata: {
              isDefault: notebook.isDefault,
              sectionsCount: notebook.sections?.length || 0
            }
          });
        });
        data.sections?.forEach((section: any) => {
          activities.push({
            id: `onenote-section-${section.id}`,
            type: 'Section',
            title: section.displayName,
            timestamp: section.lastModifiedDateTime || new Date().toISOString(),
            metadata: {
              notebookId: section.parentNotebook?.id,
              pagesCount: section.pages?.length || 0
            }
          });
        });
        data.pages?.forEach((page: any) => {
          activities.push({
            id: `onenote-page-${page.id}`,
            type: 'Page',
            title: page.title,
            timestamp: page.lastModifiedDateTime,
            url: page.webUrl,
            metadata: {
              sectionId: page.parentSection?.id,
              level: page.level
            }
          });
        });
        break;

      case 'google_workspace':
        console.log('[MCPRawActivityReview] Google Workspace - driveFiles:', data.driveFiles?.length || 0);
        console.log('[MCPRawActivityReview] Google Workspace - docs:', data.docs?.length || 0);
        console.log('[MCPRawActivityReview] Google Workspace - sheets:', data.sheets?.length || 0);
        console.log('[MCPRawActivityReview] Google Workspace - slides:', data.slides?.length || 0);
        console.log('[MCPRawActivityReview] Google Workspace - meetRecordings:', data.meetRecordings?.length || 0);
        data.driveFiles?.forEach((file: any) => {
          activities.push({
            id: `google-drive-${file.id}`,
            type: 'Drive File',
            title: file.name,
            timestamp: file.modifiedTime,
            url: file.webViewLink,
            metadata: {
              mimeType: file.mimeType,
              size: file.size,
              owners: file.owners
            }
          });
        });
        data.docs?.forEach((doc: any) => {
          activities.push({
            id: `google-doc-${doc.id}`,
            type: 'Google Doc',
            title: doc.title,
            timestamp: doc.modifiedTime,
            url: doc.webViewLink,
            metadata: {
              author: doc.lastModifiedBy || ''
            }
          });
        });
        data.sheets?.forEach((sheet: any) => {
          activities.push({
            id: `google-sheet-${sheet.id}`,
            type: 'Google Sheet',
            title: sheet.title,
            timestamp: sheet.modifiedTime,
            url: sheet.webViewLink,
            metadata: {
              sheetCount: sheet.sheets?.length || 0,
              author: sheet.lastModifiedBy || ''
            }
          });
        });
        data.slides?.forEach((slide: any) => {
          activities.push({
            id: `google-slide-${slide.id}`,
            type: 'Google Slides',
            title: slide.title,
            timestamp: slide.modifiedTime,
            url: slide.webViewLink,
            metadata: {
              slideCount: slide.slides?.length || 0,
              author: slide.lastModifiedBy || ''
            }
          });
        });
        data.meetRecordings?.forEach((recording: any) => {
          activities.push({
            id: `google-meet-${recording.id}`,
            type: 'Meet Recording',
            title: recording.name,
            timestamp: recording.createdTime,
            url: recording.webViewLink,
            metadata: {
              duration: recording.duration,
              participants: recording.participants
            }
          });
        });
        break;

      case 'zoom':
        data.meetings?.forEach((meeting: any) => {
          activities.push({
            id: `zoom-meeting-${meeting.id}`,
            type: 'Meeting',
            title: meeting.topic,
            timestamp: meeting.start_time,
            url: meeting.join_url,
            metadata: {
              duration: meeting.duration,
              participants: meeting.participants_count,
              host: meeting.host_email
            }
          });
        });
        data.upcomingMeetings?.forEach((meeting: any) => {
          activities.push({
            id: `zoom-upcoming-${meeting.id}`,
            type: 'Upcoming Meeting',
            title: meeting.topic,
            timestamp: meeting.start_time,
            url: meeting.join_url,
            metadata: {
              duration: meeting.duration,
              host: meeting.host_email
            }
          });
        });
        data.recordings?.forEach((recording: any) => {
          activities.push({
            id: `zoom-recording-${recording.id}`,
            type: 'Recording',
            title: recording.topic,
            timestamp: recording.start_time,
            url: recording.share_url,
            metadata: {
              duration: recording.duration,
              fileSize: recording.total_size
            }
          });
        });
        break;

      case 'sharepoint':
        data.sites?.forEach((site: any) => {
          activities.push({
            id: `sharepoint-site-${site.id}`,
            type: 'Site',
            title: site.displayName || site.name,
            timestamp: site.lastModifiedDateTime || new Date().toISOString(),
            url: site.webUrl,
            metadata: {
              description: site.description,
              siteUrl: site.siteUrl
            }
          });
        });
        data.recentFiles?.forEach((file: any) => {
          activities.push({
            id: `sharepoint-file-${file.id}`,
            type: 'File',
            title: file.name,
            timestamp: file.lastModifiedDateTime,
            url: file.webUrl,
            metadata: {
              size: file.size,
              modifiedBy: file.lastModifiedBy
            }
          });
        });
        data.lists?.forEach((list: any) => {
          activities.push({
            id: `sharepoint-list-${list.id}`,
            type: 'List',
            title: list.displayName,
            timestamp: list.lastModifiedDateTime || new Date().toISOString(),
            url: list.webUrl,
            metadata: {
              description: list.description,
              itemCount: list.itemCount
            }
          });
        });
        break;

      case 'onedrive':
        data.recentFiles?.forEach((file: any) => {
          activities.push({
            id: `onedrive-recent-${file.id}`,
            type: 'Recent File',
            title: file.name,
            timestamp: file.lastModifiedDateTime,
            url: file.webUrl,
            metadata: {
              size: file.size,
              modifiedBy: file.lastModifiedBy
            }
          });
        });
        data.sharedFiles?.forEach((file: any) => {
          activities.push({
            id: `onedrive-shared-${file.id}`,
            type: 'Shared File',
            title: file.name,
            timestamp: file.lastModifiedDateTime,
            url: file.webUrl,
            metadata: {
              size: file.size,
              sharedBy: file.sharedBy
            }
          });
        });
        data.folders?.forEach((folder: any) => {
          activities.push({
            id: `onedrive-folder-${folder.id}`,
            type: 'Folder',
            title: folder.name,
            timestamp: folder.lastModifiedDateTime || new Date().toISOString(),
            url: folder.webUrl,
            metadata: {
              itemCount: folder.folder?.childCount || 0
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

    console.log(`[MCPRawActivityReview] ${toolType} - Total activities extracted: ${activities.length}`);
    return activities;
  };

  // Get activities for each tool
  const toolActivities: Record<string, RawActivity[]> = {};
  let totalActivities = 0;

  console.log('[MCPRawActivityReview] ========== PROCESSING RAW DATA ==========');
  console.log('[MCPRawActivityReview] Sources to process:', sources);
  console.log('[MCPRawActivityReview] Raw data keys:', Object.keys(rawData || {}));

  sources.forEach(toolType => {
    const data = rawData[toolType];
    console.log(`[MCPRawActivityReview] Processing ${toolType}, has data:`, !!data);
    if (data) {
      toolActivities[toolType] = extractActivities(toolType, data);
      console.log(`[MCPRawActivityReview] ${toolType} extracted ${toolActivities[toolType].length} activities`);
      totalActivities += toolActivities[toolType].length;
    } else {
      console.log(`[MCPRawActivityReview] ${toolType} has NO DATA`);
    }
  });

  console.log('[MCPRawActivityReview] ========== EXTRACTION COMPLETE ==========');
  console.log('[MCPRawActivityReview] Total activities across all tools:', totalActivities);

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
                              {formatTimestamp(activity.timestamp)}
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
