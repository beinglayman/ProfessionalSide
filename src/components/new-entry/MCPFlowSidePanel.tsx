import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sparkles, Database, ArrowRight, Loader2, Globe, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useMCPMultiSource } from '../../hooks/useMCPMultiSource';
import { useWorkspaces, useWorkspaceMembers, WorkspaceMember } from '../../hooks/useWorkspace';
import { MCPSourceSelector } from '../mcp/MCPSourceSelector';
import { MCPRawActivityReview } from '../mcp/MCPRawActivityReview';
import { MCPActivityReview } from '../mcp/MCPActivityReview';
import { Format7EntryEditor } from './Format7EntryEditor';

// Build marker for cache busting - DO NOT REMOVE
const MCP_PANEL_VERSION = 'v3-2025-11-21T14:10:00Z';

interface MCPFlowSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    title: string;
    description: string;
    skills: string[];
    activities: any;
    format7Entry?: any;
    workspaceEntry: any;
    networkEntry: any;
    goalLinking?: {
      linkedGoalId: string | null;
      markGoalAsComplete: boolean;
    };
  }) => void;
  workspaceName?: string;
}

export function MCPFlowSidePanel({
  open,
  onOpenChange,
  onComplete,
  workspaceName = 'Professional Work'
}: MCPFlowSidePanelProps) {
  // 4-step flow state
  const [step, setStep] = useState<'select' | 'rawReview' | 'correlations' | 'preview'>('select');
  const [isProcessing, setIsProcessing] = useState(false);

  // Activity selection state
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Editable entry state
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [editableDescription, setEditableDescription] = useState<string>('');
  const [format7Entry, setFormat7Entry] = useState<any>(null);

  // Workspace selection state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string>(workspaceName);

  // Goal linking state
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);
  const [markGoalAsComplete, setMarkGoalAsComplete] = useState(false);

  // Network entry state (dual-view system)
  const [generateNetworkEntry, setGenerateNetworkEntry] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState<'workspace' | 'network'>('workspace');
  const [networkEntryData, setNetworkEntryData] = useState<{
    networkTitle: string;
    networkContent: string;
    format7DataNetwork: any;
    sanitizationLog: any;
  } | null>(null);
  const [editableNetworkTitle, setEditableNetworkTitle] = useState<string>('');
  const [editableNetworkContent, setEditableNetworkContent] = useState<string>('');
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [sanitizationError, setSanitizationError] = useState<string | null>(null);
  const [sanitizationExpanded, setSanitizationExpanded] = useState(false);

  // Ref for scroll container
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: integrations } = useMCPIntegrations();
  const mcpMultiSource = useMCPMultiSource();
  const { data: workspaces = [], isLoading: workspacesLoading, isError: workspacesError } = useWorkspaces();
  const { data: workspaceMembers = [] } = useWorkspaceMembers(selectedWorkspaceId || '');

  const connectedTools = integrations?.integrations?.filter((i: any) => i.isConnected) || [];

  // Helper function to match format7 collaborators to workspace members by name
  const matchCollaboratorsToMembers = (
    format7Collaborators: Array<{ id: string; name: string; role?: string }> | undefined,
    members: WorkspaceMember[]
  ): Array<{ userId: string; role: string }> => {
    if (!format7Collaborators || !members || members.length === 0) return [];

    const matched: Array<{ userId: string; role: string }> = [];
    const matchedUserIds = new Set<string>();

    for (const collab of format7Collaborators) {
      const normalizedName = collab.name.toLowerCase().trim();

      // Find matching workspace member by name (case-insensitive)
      const member = members.find(m => {
        const memberName = m.user.name.toLowerCase().trim();
        // Exact match first
        if (memberName === normalizedName) return true;
        // Then try partial matches
        if (memberName.includes(normalizedName) || normalizedName.includes(memberName)) return true;
        return false;
      });

      if (member && !matchedUserIds.has(member.userId)) {
        matchedUserIds.add(member.userId);
        matched.push({
          userId: member.userId,
          role: collab.role || 'collaborator'
        });
      }
    }

    return matched;
  };

  // Initialize workspace based on workspaceName prop
  // Force re-initialization when panel opens to ensure clean state
  useEffect(() => {
    console.log('[MCPFlow] Workspace initialization check:', {
      open,
      workspacesLength: workspaces.length,
      workspacesLoading,
      workspacesError,
      selectedWorkspaceId,
      workspaceName
    });

    if (open && workspaces.length > 0 && !workspacesLoading) {
      // Try to find workspace by name
      const workspace = workspaces.find(w => w.name === workspaceName);
      if (workspace) {
        console.log('[MCPFlow] Setting workspace by name:', workspace.name);
        setSelectedWorkspaceId(workspace.id);
        setSelectedWorkspaceName(workspace.name);
      } else {
        console.log('[MCPFlow] Setting default workspace:', workspaces[0].name);
        // Default to first workspace (typically "My Workspace")
        setSelectedWorkspaceId(workspaces[0].id);
        setSelectedWorkspaceName(workspaces[0].name);
      }
    }
  }, [open, workspaces, workspacesLoading, workspaceName]); // Trigger on panel open and workspace data changes

  // Scroll to top when step changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [step]);

  // Show error if workspaces failed to load
  useEffect(() => {
    if (workspacesError) {
      console.error('[MCPFlow] Failed to load workspaces:', workspacesError);
      alert('Failed to load workspaces. Please refresh the page and try again.');
    }
  }, [workspacesError]);

  // Step 1: Fetch raw activities (no AI processing)
  const handleFetchActivities = async (
    toolTypes: string[],
    dateRange: { start: Date; end: Date },
    workspaceInfo: { workspaceId: string; workspaceName: string },
    goalInfo: { linkedGoalId: string | null; markGoalAsComplete: boolean }
  ) => {
    // Store the selected date range for later use in transform API
    setSelectedDateRange(dateRange);

    // Store workspace and goal info from Step 1
    setSelectedWorkspaceId(workspaceInfo.workspaceId);
    setSelectedWorkspaceName(workspaceInfo.workspaceName);
    setLinkedGoalId(goalInfo.linkedGoalId);
    setMarkGoalAsComplete(goalInfo.markGoalAsComplete);

    console.log('[MCPFlow] Step 1 - Workspace/Goal selection:', {
      workspaceId: workspaceInfo.workspaceId,
      workspaceName: workspaceInfo.workspaceName,
      linkedGoalId: goalInfo.linkedGoalId,
      markGoalAsComplete: goalInfo.markGoalAsComplete
    });

    try {
      console.log('[MCPFlow] Step 1: Fetching raw activities from:', toolTypes);

      // Use fetchActivities to get raw data only
      const result = await mcpMultiSource.fetchActivities(toolTypes, dateRange);

      console.log('[MCPFlow] Raw data fetched:', {
        sources: result.sources,
        rawData: result.rawData
      });

      // Auto-select all activity IDs
      const allIds = extractAllActivityIds(result.rawData, result.sources);
      setSelectedActivityIds(allIds);

      console.log('[MCPFlow] Auto-selected all activities:', allIds.length);

      // Move to raw review step
      if (allIds.length > 0) {
        setStep('rawReview');
      } else {
        alert('No activities found for the selected date range and tools. Try expanding your date range or selecting different tools.');
      }
    } catch (error: any) {
      console.error('[MCPFlow] Failed to fetch activities:', error);
      alert(`Error fetching activities: ${error.message}\n\nPlease try again or check your internet connection.`);
    }
  };

  // Helper: Extract all activity IDs from raw data
  const extractAllActivityIds = (rawData: Record<string, any>, sources: string[]): string[] => {
    const ids: string[] = [];

    sources.forEach(toolType => {
      const data = rawData[toolType];
      if (!data) return;

      switch (toolType) {
        case 'github':
          data.pullRequests?.forEach((pr: any) => ids.push(`github-pr-${pr.id}`));
          data.issues?.forEach((issue: any) => ids.push(`github-issue-${issue.id}`));
          data.commits?.forEach((commit: any) => ids.push(`github-commit-${commit.sha}`));
          data.repositories?.forEach((repo: any) => ids.push(`github-repo-${repo.name}`));
          break;
        case 'jira':
          data.issues?.forEach((issue: any) => ids.push(`jira-${issue.key}`));
          data.projects?.forEach((project: any) => ids.push(`jira-project-${project.key}`));
          data.sprints?.forEach((sprint: any) => ids.push(`jira-sprint-${sprint.id}`));
          break;
        case 'slack':
          data.messages?.forEach((msg: any, idx: number) => ids.push(`slack-msg-${idx}`));
          data.threads?.forEach((thread: any) => ids.push(`slack-thread-${thread.id}`));
          data.channels?.forEach((channel: any) => ids.push(`slack-channel-${channel.id}`));
          break;
        case 'figma':
          data.files?.forEach((file: any) => ids.push(`figma-${file.key}`));
          data.components?.forEach((component: any) => ids.push(`figma-component-${component.key}`));
          data.comments?.forEach((comment: any) => ids.push(`figma-comment-${comment.id}`));
          break;
        case 'outlook':
          data.meetings?.forEach((meeting: any, idx: number) => ids.push(`outlook-meeting-${idx}`));
          data.emails?.forEach((email: any) => ids.push(`outlook-email-${email.id}`));
          break;
        case 'teams':
          data.meetings?.forEach((meeting: any, idx: number) => ids.push(`teams-meeting-${idx}`));
          data.teams?.forEach((team: any) => ids.push(`teams-team-${team.id}`));
          data.channels?.forEach((channel: any) => ids.push(`teams-channel-${channel.id}`));
          data.chats?.forEach((chat: any) => ids.push(`teams-chat-${chat.id}`));
          data.chatMessages?.forEach((message: any) => ids.push(`teams-chatmsg-${message.id}`));
          data.channelMessages?.forEach((message: any) => ids.push(`teams-channelmsg-${message.id}`));
          break;
        case 'confluence':
          data.pages?.forEach((page: any) => ids.push(`confluence-page-${page.id}`));
          data.blogPosts?.forEach((post: any) => ids.push(`confluence-blog-${post.id}`));
          data.comments?.forEach((comment: any) => ids.push(`confluence-comment-${comment.id}`));
          data.spaces?.forEach((space: any) => ids.push(`confluence-space-${space.id}`));
          break;
        case 'onenote':
          data.notebooks?.forEach((notebook: any) => ids.push(`onenote-notebook-${notebook.id}`));
          data.sections?.forEach((section: any) => ids.push(`onenote-section-${section.id}`));
          data.pages?.forEach((page: any) => ids.push(`onenote-page-${page.id}`));
          break;
        case 'google_workspace':
          data.driveFiles?.forEach((file: any) => ids.push(`google-drive-${file.id}`));
          data.docs?.forEach((doc: any) => ids.push(`google-doc-${doc.id}`));
          data.sheets?.forEach((sheet: any) => ids.push(`google-sheet-${sheet.id}`));
          data.slides?.forEach((slide: any) => ids.push(`google-slide-${slide.id}`));
          data.meetRecordings?.forEach((recording: any) => ids.push(`google-meet-${recording.id}`));
          break;
        case 'zoom':
          data.meetings?.forEach((meeting: any) => ids.push(`zoom-meeting-${meeting.id}`));
          data.upcomingMeetings?.forEach((meeting: any) => ids.push(`zoom-upcoming-${meeting.id}`));
          data.recordings?.forEach((recording: any) => ids.push(`zoom-recording-${recording.id}`));
          break;
        case 'sharepoint':
          data.sites?.forEach((site: any) => ids.push(`sharepoint-site-${site.id}`));
          data.recentFiles?.forEach((file: any) => ids.push(`sharepoint-file-${file.id}`));
          data.lists?.forEach((list: any) => ids.push(`sharepoint-list-${list.id}`));
          break;
        case 'onedrive':
          data.recentFiles?.forEach((file: any) => ids.push(`onedrive-recent-${file.id}`));
          data.sharedFiles?.forEach((file: any) => ids.push(`onedrive-shared-${file.id}`));
          data.folders?.forEach((folder: any) => ids.push(`onedrive-folder-${folder.id}`));
          break;
        default:
          // Generic handling
          if (Array.isArray(data)) {
            data.forEach((item: any, idx: number) => ids.push(`${toolType}-${idx}`));
          }
      }
    });

    return ids;
  };

  // Step 2: Continue from raw review
  const handleContinueFromRawReview = async () => {
    console.log('[MCPFlow] Step 2: User selected', selectedActivityIds.length, 'activities');

    // Move to Step 3 IMMEDIATELY (before processing starts)
    setStep('correlations');

    // THEN start processing
    setIsProcessing(true);

    try {
      // Run AI processing (this takes 10-30 seconds)
      await handleProcessSelectedActivities();
    } catch (error) {
      console.error('[MCPFlow] AI processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3: Process selected activities with AI
  const handleProcessSelectedActivities = async () => {
    try {
      console.log('[MCPFlow] ==================== STEP 3: AI PROCESSING ====================');
      console.log('[MCPFlow] Selected tools:', mcpMultiSource.sources);
      console.log('[MCPFlow] Selected activity IDs:', selectedActivityIds);

      // Log raw data summary before filtering
      console.log('[MCPFlow] Raw data BEFORE filtering:');
      mcpMultiSource.sources.forEach(toolType => {
        const data = mcpMultiSource.rawActivities[toolType];
        if (data) {
          const itemCounts: any = {};
          Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
              itemCounts[key] = data[key].length;
            }
          });
          console.log(`  - ${toolType}:`, itemCounts);
        } else {
          console.log(`  - ${toolType}: NO DATA`);
        }
      });

      // Filter raw data to only include selected activities
      const filteredData = filterDataBySelectedIds(
        mcpMultiSource.rawActivities,
        mcpMultiSource.sources,
        selectedActivityIds
      );

      // Log filtered data summary
      console.log('[MCPFlow] Filtered data AFTER filtering:');
      Object.keys(filteredData).forEach(toolType => {
        const data = filteredData[toolType];
        const itemCounts: any = {};
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key])) {
            itemCounts[key] = data[key].length;
          }
        });
        console.log(`  - ${toolType}:`, itemCounts);
      });

      console.log('[MCPFlow] Full filtered data object:', filteredData);

      // Process with AI agents progressively - pass filtered data through all stages
      console.log('[MCPFlow] Running analyze stage with filtered data...');
      const analyzeResult = await mcpMultiSource.processStage('analyze', filteredData, { quality: 'balanced' });

      console.log('[MCPFlow] Running correlate stage with analyzed data...');
      const correlateResult = await mcpMultiSource.processStage('correlate', analyzeResult.result);

      console.log('[MCPFlow] Running generate stage with correlated data...');
      await mcpMultiSource.processStage('generate', correlateResult.result, {
        generateContent: true,
        workspaceName
      });

      console.log('[MCPFlow] AI processing complete, Step 3 will display results');
      // User will click "Continue" in Step 3 to trigger generateFormat7Preview()
      // The MCPActivityReview component has onContinue={generateFormat7Preview} wired up

    } catch (error: any) {
      console.error('[MCPFlow] Failed to process activities:', error);
      alert(`Error processing activities: ${error.message}\n\nPlease try again.`);
    }
  };

  // Helper: Filter raw data by selected IDs
  const filterDataBySelectedIds = (
    rawData: Record<string, any>,
    sources: string[],
    selectedIds: string[]
  ): Record<string, any> => {
    const filtered: Record<string, any> = {};

    sources.forEach(toolType => {
      const data = rawData[toolType];
      if (!data) return;

      switch (toolType) {
        case 'github':
          filtered[toolType] = {
            pullRequests: data.pullRequests?.filter((pr: any) =>
              selectedIds.includes(`github-pr-${pr.id}`)
            ) || [],
            issues: data.issues?.filter((issue: any) =>
              selectedIds.includes(`github-issue-${issue.id}`)
            ) || [],
            commits: data.commits?.filter((commit: any) =>
              selectedIds.includes(`github-commit-${commit.sha}`)
            ) || [],
            repositories: data.repositories?.filter((repo: any) =>
              selectedIds.includes(`github-repo-${repo.name}`)
            ) || []
          };
          break;
        case 'jira':
          filtered[toolType] = {
            issues: data.issues?.filter((issue: any) =>
              selectedIds.includes(`jira-${issue.key}`)
            ) || [],
            projects: data.projects?.filter((project: any) =>
              selectedIds.includes(`jira-project-${project.key}`)
            ) || [],
            sprints: data.sprints?.filter((sprint: any) =>
              selectedIds.includes(`jira-sprint-${sprint.id}`)
            ) || []
          };
          break;
        case 'slack':
          filtered[toolType] = {
            messages: data.messages?.filter((msg: any, idx: number) =>
              selectedIds.includes(`slack-msg-${idx}`)
            ) || [],
            threads: data.threads?.filter((thread: any) =>
              selectedIds.includes(`slack-thread-${thread.id}`)
            ) || [],
            channels: data.channels?.filter((channel: any) =>
              selectedIds.includes(`slack-channel-${channel.id}`)
            ) || []
          };
          break;
        case 'figma':
          filtered[toolType] = {
            files: data.files?.filter((file: any) =>
              selectedIds.includes(`figma-${file.key}`)
            ) || [],
            components: data.components?.filter((component: any) =>
              selectedIds.includes(`figma-component-${component.key}`)
            ) || [],
            comments: data.comments?.filter((comment: any) =>
              selectedIds.includes(`figma-comment-${comment.id}`)
            ) || []
          };
          break;
        case 'outlook':
          filtered[toolType] = {
            meetings: data.meetings?.filter((meeting: any, idx: number) =>
              selectedIds.includes(`outlook-meeting-${idx}`)
            ) || [],
            emails: data.emails?.filter((email: any) =>
              selectedIds.includes(`outlook-email-${email.id}`)
            ) || []
          };
          break;
        case 'teams':
          filtered[toolType] = {
            meetings: data.meetings?.filter((meeting: any, idx: number) =>
              selectedIds.includes(`teams-meeting-${idx}`)
            ) || [],
            teams: data.teams?.filter((team: any) =>
              selectedIds.includes(`teams-team-${team.id}`)
            ) || [],
            channels: data.channels?.filter((channel: any) =>
              selectedIds.includes(`teams-channel-${channel.id}`)
            ) || [],
            chats: data.chats?.filter((chat: any) =>
              selectedIds.includes(`teams-chat-${chat.id}`)
            ) || [],
            chatMessages: data.chatMessages?.filter((message: any) =>
              selectedIds.includes(`teams-chatmsg-${message.id}`)
            ) || [],
            channelMessages: data.channelMessages?.filter((message: any) =>
              selectedIds.includes(`teams-channelmsg-${message.id}`)
            ) || []
          };
          break;
        case 'confluence':
          filtered[toolType] = {
            pages: data.pages?.filter((page: any) =>
              selectedIds.includes(`confluence-page-${page.id}`)
            ) || [],
            blogPosts: data.blogPosts?.filter((post: any) =>
              selectedIds.includes(`confluence-blog-${post.id}`)
            ) || [],
            comments: data.comments?.filter((comment: any) =>
              selectedIds.includes(`confluence-comment-${comment.id}`)
            ) || [],
            spaces: data.spaces?.filter((space: any) =>
              selectedIds.includes(`confluence-space-${space.id}`)
            ) || []
          };
          break;
        case 'onenote':
          filtered[toolType] = {
            notebooks: data.notebooks?.filter((notebook: any) =>
              selectedIds.includes(`onenote-notebook-${notebook.id}`)
            ) || [],
            sections: data.sections?.filter((section: any) =>
              selectedIds.includes(`onenote-section-${section.id}`)
            ) || [],
            pages: data.pages?.filter((page: any) =>
              selectedIds.includes(`onenote-page-${page.id}`)
            ) || []
          };
          break;
        case 'google_workspace':
          filtered[toolType] = {
            driveFiles: data.driveFiles?.filter((file: any) =>
              selectedIds.includes(`google-drive-${file.id}`)
            ) || [],
            docs: data.docs?.filter((doc: any) =>
              selectedIds.includes(`google-doc-${doc.id}`)
            ) || [],
            sheets: data.sheets?.filter((sheet: any) =>
              selectedIds.includes(`google-sheet-${sheet.id}`)
            ) || [],
            slides: data.slides?.filter((slide: any) =>
              selectedIds.includes(`google-slide-${slide.id}`)
            ) || [],
            meetRecordings: data.meetRecordings?.filter((recording: any) =>
              selectedIds.includes(`google-meet-${recording.id}`)
            ) || []
          };
          break;
        case 'zoom':
          filtered[toolType] = {
            meetings: data.meetings?.filter((meeting: any) =>
              selectedIds.includes(`zoom-meeting-${meeting.id}`)
            ) || [],
            upcomingMeetings: data.upcomingMeetings?.filter((meeting: any) =>
              selectedIds.includes(`zoom-upcoming-${meeting.id}`)
            ) || [],
            recordings: data.recordings?.filter((recording: any) =>
              selectedIds.includes(`zoom-recording-${recording.id}`)
            ) || []
          };
          break;
        case 'sharepoint':
          filtered[toolType] = {
            sites: data.sites?.filter((site: any) =>
              selectedIds.includes(`sharepoint-site-${site.id}`)
            ) || [],
            recentFiles: data.recentFiles?.filter((file: any) =>
              selectedIds.includes(`sharepoint-file-${file.id}`)
            ) || [],
            lists: data.lists?.filter((list: any) =>
              selectedIds.includes(`sharepoint-list-${list.id}`)
            ) || []
          };
          break;
        case 'onedrive':
          filtered[toolType] = {
            recentFiles: data.recentFiles?.filter((file: any) =>
              selectedIds.includes(`onedrive-recent-${file.id}`)
            ) || [],
            sharedFiles: data.sharedFiles?.filter((file: any) =>
              selectedIds.includes(`onedrive-shared-${file.id}`)
            ) || [],
            folders: data.folders?.filter((folder: any) =>
              selectedIds.includes(`onedrive-folder-${folder.id}`)
            ) || []
          };
          break;
        default:
          // For any unknown tools, filter generic array data
          console.warn(`[MCPFlow] Unknown tool type '${toolType}' - attempting generic filtering`);
          if (Array.isArray(data)) {
            filtered[toolType] = data.filter((_: any, idx: number) =>
              selectedIds.includes(`${toolType}-${idx}`)
            );
          } else {
            // If it's an object with array properties, pass through as-is
            // This maintains backward compatibility but won't filter
            filtered[toolType] = data;
          }
      }
    });

    return filtered;
  };

  // Helper: Generate consistent person ID from name
  const generatePersonId = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  // Helper: Extract initials from name
  const extractInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Assign consistent color gradient
  const assignConsistentColor = (name: string): string => {
    const gradients = [
      'from-purple-400 to-pink-400',
      'from-blue-400 to-cyan-400',
      'from-green-400 to-teal-400',
      'from-orange-400 to-red-400',
      'from-indigo-400 to-purple-400',
      'from-yellow-400 to-orange-400',
      'from-pink-400 to-rose-400',
      'from-teal-400 to-cyan-400'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  };

  // Helper: Create rich Collaborator object
  const createCollaborator = (name: string): any => {
    return {
      id: generatePersonId(name),
      name: name,
      initials: extractInitials(name),
      avatar: null,
      color: assignConsistentColor(name),
      role: '',
      department: ''
    };
  };

  // Helper: Transform organized activities to Format7 activity structure
  const transformToFormat7Activities = (
    organizedData: any,
    selectedIds: string[]
  ): any[] => {
    if (!organizedData?.categories) return [];

    const format7Activities: any[] = [];

    // Iterate through all categories
    organizedData.categories.forEach((category: any) => {
      category.items?.forEach((activity: any) => {
        // Only include selected activities
        if (!selectedIds.includes(activity.id)) return;

        // Transform to Format7 activity structure
        format7Activities.push({
          id: activity.id,
          source: activity.source,
          action: activity.title, // title → action
          description: activity.description,
          timestamp: activity.timestamp,
          importance: activity.importance || 'medium',
          technologies: activity.skills || [], // skills → technologies
          category: activity.category,
          metadata: activity.metadata || {}
        });
      });
    });

    return format7Activities;
  };

  // Helper: Build Format7 summary statistics
  const buildFormat7Summary = (activities: any[], organizedData: any): any => {
    const summary = {
      total_time_range_hours: 0,
      activities_by_type: {} as Record<string, number>,
      activities_by_source: {} as Record<string, number>,
      unique_collaborators: [] as any[],
      unique_reviewers: [] as any[],
      technologies_used: organizedData?.extractedSkills || [],
      skills_demonstrated: organizedData?.extractedSkills || []
    };

    const collaboratorsMap = new Map<string, any>();
    const reviewersMap = new Map<string, any>();
    let earliestTime: Date | null = null;
    let latestTime: Date | null = null;

    activities.forEach(activity => {
      // Count by category/type
      const type = activity.category || 'Other';
      summary.activities_by_type[type] = (summary.activities_by_type[type] || 0) + 1;

      // Count by source
      const source = activity.source || 'Unknown';
      summary.activities_by_source[source] = (summary.activities_by_source[source] || 0) + 1;

      // Extract collaborators and reviewers based on source
      if (activity.source === 'github') {
        // GitHub: extract author, reviewers, assignees
        if (activity.metadata?.author) {
          const name = activity.metadata.author;
          if (!collaboratorsMap.has(name)) {
            collaboratorsMap.set(name, createCollaborator(name));
          }
        }
        if (activity.metadata?.reviewers) {
          activity.metadata.reviewers.forEach((name: string) => {
            if (!reviewersMap.has(name)) {
              reviewersMap.set(name, createCollaborator(name));
            }
          });
        }
        if (activity.metadata?.assignees) {
          activity.metadata.assignees.forEach((name: string) => {
            if (!collaboratorsMap.has(name)) {
              collaboratorsMap.set(name, createCollaborator(name));
            }
          });
        }
      } else if (activity.source === 'jira') {
        // Jira: extract assignee, reporter
        if (activity.metadata?.assignee) {
          const name = activity.metadata.assignee;
          if (!collaboratorsMap.has(name)) {
            collaboratorsMap.set(name, createCollaborator(name));
          }
        }
        if (activity.metadata?.reporter) {
          const name = activity.metadata.reporter;
          if (!collaboratorsMap.has(name)) {
            collaboratorsMap.set(name, createCollaborator(name));
          }
        }
      } else if (activity.source === 'teams' || activity.source === 'slack') {
        // Teams/Slack: extract sender and participants
        if (activity.metadata?.from) {
          const name = activity.metadata.from;
          if (!collaboratorsMap.has(name)) {
            collaboratorsMap.set(name, createCollaborator(name));
          }
        }
        if (activity.metadata?.participants) {
          activity.metadata.participants.forEach((name: string) => {
            if (!collaboratorsMap.has(name)) {
              collaboratorsMap.set(name, createCollaborator(name));
            }
          });
        }
      } else if (activity.source === 'outlook') {
        // Outlook: extract meeting attendees
        if (activity.metadata?.attendees) {
          activity.metadata.attendees.forEach((name: string) => {
            if (!collaboratorsMap.has(name)) {
              collaboratorsMap.set(name, createCollaborator(name));
            }
          });
        }
      } else if (activity.source === 'confluence') {
        // Confluence: extract author
        if (activity.metadata?.author) {
          const name = activity.metadata.author;
          if (!collaboratorsMap.has(name)) {
            collaboratorsMap.set(name, createCollaborator(name));
          }
        }
      }

      // Calculate time range
      if (activity.timestamp) {
        const activityTime = new Date(activity.timestamp);
        if (!earliestTime || activityTime < earliestTime) {
          earliestTime = activityTime;
        }
        if (!latestTime || activityTime > latestTime) {
          latestTime = activityTime;
        }
      }
    });

    summary.unique_collaborators = Array.from(collaboratorsMap.values());
    summary.unique_reviewers = Array.from(reviewersMap.values());

    // Calculate total time range in hours
    if (earliestTime && latestTime) {
      summary.total_time_range_hours = Math.round(
        (latestTime.getTime() - earliestTime.getTime()) / (1000 * 60 * 60)
      );
    }

    return summary;
  };

  // Helper: Extract artifacts (URLs, files, documents) from activities
  const extractArtifacts = (activities: any[]): any[] => {
    const artifacts: any[] = [];
    const seenUrls = new Set<string>();

    activities.forEach(activity => {
      // Extract URL from metadata
      if (activity.metadata?.url && !seenUrls.has(activity.metadata.url)) {
        artifacts.push({
          type: 'link',
          title: activity.action || activity.title || 'Link',
          url: activity.metadata.url,
          source: activity.source
        });
        seenUrls.add(activity.metadata.url);
      }

      // Extract files from metadata
      if (activity.metadata?.files) {
        activity.metadata.files.forEach((file: any) => {
          if (file.url && !seenUrls.has(file.url)) {
            artifacts.push({
              type: 'file',
              title: file.name || file.title || 'File',
              url: file.url,
              source: activity.source
            });
            seenUrls.add(file.url);
          }
        });
      }
    });

    return artifacts;
  };

  // Step 4: Generate Format7 preview
  const generateFormat7Preview = async (correlateResultData?: any) => {
    try {
      console.log('[MCPFlow] Generating Format7 preview using backend transformer...');

      // Extract correlations array from CorrelationResult if provided directly
      // This avoids race condition where state hasn't updated yet
      const correlationsToSend = correlateResultData?.correlations || mcpMultiSource.correlations || [];

      // Call backend transformer service
      // Debug: Log correlations being sent to backend
      console.log('[MCPFlow] Correlations being sent to backend:', {
        count: correlationsToSend?.length || 0,
        data: correlationsToSend,
        source: correlateResultData ? 'direct from correlateResult' : 'from hook state'
      });

      // Filter activities to only include selected ones
      const filteredActivities = filterDataBySelectedIds(
        mcpMultiSource.rawActivities,
        mcpMultiSource.sources,
        selectedActivityIds
      );

      const response = await api.post('/mcp/transform-format7', {
        activities: filteredActivities,
        organizedData: mcpMultiSource.organizedData,
        correlations: correlationsToSend,
        generatedContent: mcpMultiSource.generatedContent,
        selectedActivityIds: selectedActivityIds,
        options: {
          workspaceName,
          privacy: 'team',
          dateRange: selectedDateRange ? {
            start: selectedDateRange.start.toISOString(),
            end: selectedDateRange.end.toISOString()
          } : {
            start: new Date().toISOString(),
            end: new Date().toISOString()
          }
        }
      });

      const result = response.data;
      const format7Entry = result.data || result;

      console.log('[MCPFlow] Format7 entry received from backend:', {
        activities: format7Entry.activities?.length || 0,
        collaborators: format7Entry.summary?.unique_collaborators?.length || 0,
        reviewers: format7Entry.summary?.unique_reviewers?.length || 0,
        correlations: format7Entry.correlations?.length || 0,
        categories: format7Entry.categories?.length || 0
      });

      // Debug: Log actual correlations data
      if (format7Entry.correlations && format7Entry.correlations.length > 0) {
        console.log('[MCPFlow] Correlations data:', format7Entry.correlations);
      } else {
        console.warn('[MCPFlow] No correlations in Format7 entry!');
      }

      // Set editable fields from AI-generated content
      setEditableTitle(format7Entry.entry_metadata.title);
      setEditableDescription(format7Entry.context.primary_focus);
      setFormat7Entry(format7Entry);

      // Generate network entry if toggle is ON - await to ensure data is ready before transitioning
      if (generateNetworkEntry) {
        await generateNetworkEntryContent(format7Entry);
      }

      // Move to preview step - now network data is ready
      setStep('preview');

    } catch (error: any) {
      console.error('[MCPFlow] Failed to generate Format7 preview:', error);
      alert(`Error generating preview: ${error.message}\n\nPlease try again or check your connection.`);
    }
  };

  // Generate sanitized network entry content
  const generateNetworkEntryContent = async (entry: any) => {
    console.log('[MCPFlow] Generating network entry (sanitized version)...');
    setIsSanitizing(true);
    setSanitizationError(null);

    if (!entry) {
      console.warn('[MCPFlow] No entry provided for network generation');
      setIsSanitizing(false);
      return;
    }

    try {
      const response = await api.post('/mcp/sanitize-for-network', {
        title: entry.entry_metadata?.title || editableTitle,
        description: entry.context?.primary_focus || editableDescription,
        fullContent: entry.context?.primary_focus || editableDescription,
        format7Data: entry
      });

      const result = response.data?.data || response.data;

      console.log('[MCPFlow] Network entry generated:', {
        hasNetworkTitle: !!result.networkTitle,
        hasNetworkContent: !!result.networkContent,
        hasFormat7DataNetwork: !!result.format7DataNetwork,
        itemsStripped: result.sanitizationLog?.itemsStripped || 0
      });

      setNetworkEntryData({
        networkTitle: result.networkTitle,
        networkContent: result.networkContent,
        format7DataNetwork: result.format7DataNetwork,
        sanitizationLog: result.sanitizationLog
      });
      // Initialize editable state for network view
      setEditableNetworkTitle(result.networkTitle);
      setEditableNetworkContent(result.networkContent);

    } catch (error: any) {
      console.error('[MCPFlow] Failed to generate network entry:', error);
      setSanitizationError(error.message || 'Failed to generate network version');
    } finally {
      setIsSanitizing(false);
    }
  };

  // Handle final confirmation with edited data
  const handleConfirmAndCreate = () => {
    console.log('[MCPFlow] Creating entry with edited data');
    console.log('[MCPFlow] Selected workspace:', {
      selectedWorkspaceId,
      selectedWorkspaceName,
      hasWorkspace: !!selectedWorkspaceId
    });
    console.log('[MCPFlow] Goal linking:', {
      linkedGoalId,
      markGoalAsComplete
    });

    // Update Format7 entry with final edited values
    const finalFormat7Entry = format7Entry ? {
      ...format7Entry,
      entry_metadata: {
        ...format7Entry.entry_metadata,
        title: editableTitle
      },
      context: {
        ...format7Entry.context,
        primary_focus: editableDescription
      }
    } : null;

    // Match format7 collaborators and reviewers to workspace members
    const matchedCollaborators = matchCollaboratorsToMembers(
      finalFormat7Entry?.summary?.unique_collaborators,
      workspaceMembers
    );
    const matchedReviewers = matchCollaboratorsToMembers(
      finalFormat7Entry?.summary?.unique_reviewers,
      workspaceMembers
    );

    console.log('[MCPFlow] Matched collaborators:', {
      format7CollaboratorsCount: finalFormat7Entry?.summary?.unique_collaborators?.length || 0,
      format7ReviewersCount: finalFormat7Entry?.summary?.unique_reviewers?.length || 0,
      workspaceMembersCount: workspaceMembers.length,
      matchedCollaboratorsCount: matchedCollaborators.length,
      matchedReviewersCount: matchedReviewers.length,
      matchedCollaborators,
      matchedReviewers
    });

    // Create entry data with user edits
    const entryData = {
      title: editableTitle,
      description: editableDescription,
      skills: mcpMultiSource.organizedData?.extractedSkills || [],
      activities: mcpMultiSource.organizedData,
      format7Entry: finalFormat7Entry,
      workspaceEntry: {
        title: editableTitle,
        description: editableDescription,
        workspaceId: selectedWorkspaceId,
        workspaceName: selectedWorkspaceName,
        collaborators: matchedCollaborators,
        reviewers: matchedReviewers.map(r => ({ userId: r.userId, department: '' }))
      },
      networkEntry: generateNetworkEntry && networkEntryData ? {
        networkTitle: editableNetworkTitle,
        networkContent: editableNetworkContent,
        // Apply user edits to format7DataNetwork so they persist when displayed
        format7DataNetwork: {
          ...networkEntryData.format7DataNetwork,
          entry_metadata: {
            ...networkEntryData.format7DataNetwork?.entry_metadata,
            title: editableNetworkTitle
          },
          context: {
            ...networkEntryData.format7DataNetwork?.context,
            primary_focus: editableNetworkContent
          }
        },
        sanitizationLog: networkEntryData.sanitizationLog,
        generateNetworkEntry: true
      } : {
        generateNetworkEntry: false
      },
      goalLinking: linkedGoalId ? {
        linkedGoalId,
        markGoalAsComplete
      } : undefined
    };

    console.log('[MCPFlow] Sending data to parent:', {
      hasWorkspaceId: !!entryData.workspaceEntry.workspaceId,
      workspaceId: entryData.workspaceEntry.workspaceId,
      title: entryData.title
    });

    // Pass data to parent - parent will close panel after successful creation
    console.log('[MCPFlow] About to call onComplete callback, typeof:', typeof onComplete);
    try {
      onComplete(entryData);
      console.log('[MCPFlow] onComplete callback returned successfully');
    } catch (error) {
      console.error('[MCPFlow] Error in onComplete callback:', error);
    }

    // Don't close immediately - let parent handle closing after API success
    // This prevents losing user data if API call fails
  };

  const handleClose = () => {
    console.log('[MCPFlow] Closing panel and resetting state');
    setStep('select');
    setSelectedActivityIds([]);
    setEditableTitle('');
    setEditableDescription('');
    setFormat7Entry(null);
    setSelectedWorkspaceId(''); // Reset workspace state for clean reopen
    setSelectedWorkspaceName(workspaceName); // Reset to default workspace name
    setLinkedGoalId(null); // Reset goal linking
    setMarkGoalAsComplete(false);
    // Reset network entry state
    setGenerateNetworkEntry(true);
    setActivePreviewTab('workspace');
    setNetworkEntryData(null);
    setIsSanitizing(false);
    setSanitizationError(null);
    mcpMultiSource.reset();
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'rawReview') setStep('select');
    else if (step === 'correlations') setStep('rawReview');
    else if (step === 'preview') setStep('correlations');
  };

  const getStepInfo = () => {
    const steps = {
      select: { number: 1, total: 4, title: 'Select Data Sources' },
      rawReview: { number: 2, total: 4, title: 'Review Activities' },
      correlations: { number: 3, total: 4, title: 'AI Analysis & Correlations' },
      preview: { number: 4, total: 4, title: 'Preview Entry' }
    };
    return steps[step];
  };

  const stepInfo = getStepInfo();

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fetch activities from your work</h3>
              <p className="text-sm text-gray-600">
                Select which tools to import activities from and choose the time period
              </p>
            </div>

            {connectedTools.length > 0 ? (
              <MCPSourceSelector
                onFetch={handleFetchActivities}
                isLoading={mcpMultiSource.isFetching}
                defaultWorkspaceId={selectedWorkspaceId}
              />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Connected</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                  Connect your work tools to automatically import and organize your activities
                </p>
                <Button asChild className="gap-2">
                  <Link to="/settings?tab=integrations">
                    Connect Tools
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        );

      case 'rawReview':
        return (
          <MCPRawActivityReview
            rawData={mcpMultiSource.rawActivities || {}}
            sources={mcpMultiSource.sources || []}
            errors={mcpMultiSource.errors || undefined}
            selectedIds={selectedActivityIds}
            onSelectionChange={setSelectedActivityIds}
            onContinue={handleContinueFromRawReview}
          />
        );

      case 'correlations':
        return (
          <div className="space-y-6 relative">
            {/* Loading Overlay during AI processing */}
            {isProcessing && (
              <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[60] flex items-start justify-center pt-32 rounded-lg">
                <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow-lg">
                  <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Processing with AI</h3>
                    <p className="text-sm text-gray-600 max-w-sm">
                      Analyzing and correlating your {selectedActivityIds.length} activities... This may take 10-30 seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis & Correlations</h3>
              <p className="text-sm text-gray-600">
                AI is analyzing your {selectedActivityIds.length} selected activities to find patterns and connections
              </p>
            </div>

            {mcpMultiSource.organizedData ? (
              // Show AI-organized results
              <MCPActivityReview
                activities={mcpMultiSource.organizedData}
                onSelectionChange={(selectedIds) => {
                  console.log('Correlation view - activities:', selectedIds);
                }}
                onContinue={generateFormat7Preview}
                isProcessing={mcpMultiSource.isProcessing}
              />
            ) : (
              // Initial state - trigger processing
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                  Click below to have AI analyze your selected activities and identify patterns, correlations, and key achievements
                </p>
                <Button
                  onClick={handleProcessSelectedActivities}
                  disabled={mcpMultiSource.isProcessing}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {mcpMultiSource.isProcessing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );

      case 'preview':
        // Use the stored Format7 entry with live updates for title and description
        const previewEntry = format7Entry ? {
          ...format7Entry,
          entry_metadata: {
            ...format7Entry.entry_metadata,
            title: editableTitle
          },
          context: {
            ...format7Entry.context,
            primary_focus: editableDescription
          }
        } : null;

        // Network view entry (sanitized version)
        const networkPreviewEntry = networkEntryData?.format7DataNetwork ? {
          ...networkEntryData.format7DataNetwork,
          entry_metadata: {
            ...networkEntryData.format7DataNetwork.entry_metadata,
            title: editableNetworkTitle
          },
          context: {
            ...networkEntryData.format7DataNetwork.context,
            primary_focus: editableNetworkContent
          }
        } : null;

        // Calculate sanitization stats
        const sanitizationStats = networkEntryData?.sanitizationLog?.categories || {};
        const totalItemsStripped = networkEntryData?.sanitizationLog?.itemsStripped || 0;

        return (
          <div className="space-y-6">
            {/* Preview Tabs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b">
                <button
                  onClick={() => setActivePreviewTab('workspace')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activePreviewTab === 'workspace'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Lock className="h-4 w-4" />
                  Workspace View
                </button>
                {generateNetworkEntry && (
                  <button
                    onClick={() => setActivePreviewTab('network')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                      activePreviewTab === 'network'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    Network View
                    {isSanitizing && (
                      <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                    )}
                  </button>
                )}
              </div>

              {/* Tab Content */}
              {activePreviewTab === 'workspace' ? (
                <Format7EntryEditor
                  initialEntry={previewEntry}
                  onTitleChange={setEditableTitle}
                  onDescriptionChange={setEditableDescription}
                  editableTitle={editableTitle}
                  editableDescription={editableDescription}
                  isPreview={true}
                  selectedWorkspaceId={selectedWorkspaceId}
                  workspaceName={selectedWorkspaceName}
                  correlations={format7Entry?.correlations}
                  categories={format7Entry?.categories}
                />
              ) : (
                <div className="space-y-4">
                  {isSanitizing ? (
                    <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-center space-y-3">
                        <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto" />
                        <p className="text-sm text-gray-600">Generating network-safe version...</p>
                      </div>
                    </div>
                  ) : sanitizationError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600">
                        Failed to generate network version: {sanitizationError}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateNetworkEntryContent(format7Entry)}
                        className="mt-2"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : networkPreviewEntry ? (
                    <>
                      {/* Sanitization summary - expandable */}
                      {totalItemsStripped > 0 && (
                        <div className="bg-purple-50 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setSanitizationExpanded(!sanitizationExpanded)}
                            className="w-full flex items-center justify-between gap-2 text-sm text-gray-600 px-3 py-2 hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <EyeOff className="h-4 w-4 text-purple-600" />
                              <span>
                                <strong>{totalItemsStripped}</strong> confidential items hidden in this view
                                {Object.entries(sanitizationStats).some(([, items]) => (items as string[]).length > 0) && (
                                  <span className="text-gray-500">
                                    {' '}(
                                    {Object.entries(sanitizationStats)
                                      .filter(([, items]) => (items as string[]).length > 0)
                                      .map(([key, items]) => `${(items as string[]).length} ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`)
                                      .join(', ')}
                                    )
                                  </span>
                                )}
                              </span>
                            </div>
                            {sanitizationExpanded ? (
                              <ChevronUp className="h-4 w-4 text-purple-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-purple-600" />
                            )}
                          </button>
                          {sanitizationExpanded && networkEntryData?.sanitizationLog?.items?.length > 0 && (
                            <div className="px-3 pb-3 border-t border-purple-100">
                              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                                {networkEntryData.sanitizationLog.items.map((item: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-purple-400">•</span>
                                    <span className="break-all">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      <Format7EntryEditor
                        initialEntry={networkPreviewEntry}
                        onTitleChange={setEditableNetworkTitle}
                        onDescriptionChange={setEditableNetworkContent}
                        editableTitle={editableNetworkTitle}
                        editableDescription={editableNetworkContent}
                        isPreview={true}
                        selectedWorkspaceId={selectedWorkspaceId}
                        workspaceName={selectedWorkspaceName}
                        correlations={networkPreviewEntry?.correlations}
                        categories={networkPreviewEntry?.categories}
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-center space-y-3">
                        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                        <p className="text-sm text-gray-600">Network view not available</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateNetworkEntryContent(format7Entry)}
                        >
                          Generate Now
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Side Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-screen w-full max-w-3xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{stepInfo.title}</h2>
              <p className="text-xs text-gray-500">Step {stepInfo.number} of {stepInfo.total}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/80 transition-colors"
            disabled={mcpMultiSource.isFetching || mcpMultiSource.isProcessing}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
            style={{ width: `${(stepInfo.number / stepInfo.total) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 flex-shrink-0">
          {/* Network Entry Toggle - shown only in preview step */}
          {step === 'preview' && (
            <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newValue = !generateNetworkEntry;
                    setGenerateNetworkEntry(newValue);
                    // If turning ON and no network data yet, generate it
                    if (newValue && !networkEntryData && format7Entry && !isSanitizing) {
                      generateNetworkEntryContent(format7Entry);
                    }
                    // Reset to workspace tab if turning off
                    if (!newValue) {
                      setActivePreviewTab('workspace');
                    }
                  }}
                  className={cn(
                    'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
                    generateNetworkEntry ? 'bg-purple-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      generateNetworkEntry ? 'left-4' : 'left-0.5'
                    )}
                  />
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-gray-700">Generate Network Entry</span>
                  <span className="text-gray-500">(visible to your network)</span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons Row */}
          <div className="flex items-center justify-between p-6">
            <Button
              variant="outline"
              onClick={step === 'select' ? handleClose : handleBack}
              disabled={mcpMultiSource.isFetching || mcpMultiSource.isProcessing}
            >
              {step === 'select' ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {step === 'preview' && (
                <Button
                  onClick={() => {
                    console.log('[MCPFlow] Create Entry button clicked', {
                      editableTitle,
                      selectedWorkspaceId,
                      selectedWorkspaceName,
                      isProcessing: mcpMultiSource.isProcessing,
                      buttonEnabled: !(!editableTitle || mcpMultiSource.isProcessing || workspacesLoading || !selectedWorkspaceId)
                    });
                    handleConfirmAndCreate();
                  }}
                  disabled={!editableTitle || mcpMultiSource.isProcessing || workspacesLoading || !selectedWorkspaceId}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Create Entry
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MCPFlowSidePanel;
