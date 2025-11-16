import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Database, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useMCPMultiSource } from '../../hooks/useMCPMultiSource';
import { MCPSourceSelector } from '../mcp/MCPSourceSelector';
import { MCPRawActivityReview } from '../mcp/MCPRawActivityReview';
import { MCPActivityReview } from '../mcp/MCPActivityReview';
import { Format7EntryEditor } from './Format7EntryEditor';

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

  // Activity selection state
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  // Editable entry state
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [editableDescription, setEditableDescription] = useState<string>('');
  const [format7Entry, setFormat7Entry] = useState<any>(null);

  const { data: integrations } = useMCPIntegrations();
  const mcpMultiSource = useMCPMultiSource();

  const connectedTools = integrations?.integrations?.filter((i: any) => i.isConnected) || [];

  // Step 1: Fetch raw activities (no AI processing)
  const handleFetchActivities = async (toolTypes: string[], dateRange: { start: Date; end: Date }) => {
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
          break;
        case 'jira':
          data.issues?.forEach((issue: any) => ids.push(`jira-${issue.key}`));
          break;
        case 'slack':
          data.messages?.forEach((msg: any, idx: number) => ids.push(`slack-msg-${idx}`));
          break;
        case 'figma':
          data.files?.forEach((file: any) => ids.push(`figma-${file.key}`));
          break;
        case 'outlook':
        case 'teams':
          data.meetings?.forEach((meeting: any, idx: number) => ids.push(`${toolType}-meeting-${idx}`));
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
  const handleContinueFromRawReview = () => {
    console.log('[MCPFlow] Step 2: User selected', selectedActivityIds.length, 'activities');
    setStep('correlations');
  };

  // Step 3: Process selected activities with AI
  const handleProcessSelectedActivities = async () => {
    try {
      console.log('[MCPFlow] Step 3: Processing selected activities with AI');

      // Filter raw data to only include selected activities
      const filteredData = filterDataBySelectedIds(
        mcpMultiSource.rawActivities,
        mcpMultiSource.sources,
        selectedActivityIds
      );

      console.log('[MCPFlow] Filtered data:', filteredData);

      // Process with AI agents progressively
      console.log('[MCPFlow] Running analyze stage...');
      await mcpMultiSource.processStage('analyze', filteredData, { quality: 'balanced' });

      console.log('[MCPFlow] Running correlate stage...');
      await mcpMultiSource.processStage('correlate');

      console.log('[MCPFlow] Running generate stage...');
      await mcpMultiSource.processStage('generate', null, {
        generateContent: true,
        workspaceName
      });

      console.log('[MCPFlow] AI processing complete, moving to preview');

      // Generate Format7 entry from AI-processed data
      await generateFormat7Preview();

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
            ) || []
          };
          break;
        case 'jira':
          filtered[toolType] = {
            issues: data.issues?.filter((issue: any) =>
              selectedIds.includes(`jira-${issue.key}`)
            ) || []
          };
          break;
        case 'slack':
          filtered[toolType] = {
            messages: data.messages?.filter((msg: any, idx: number) =>
              selectedIds.includes(`slack-msg-${idx}`)
            ) || []
          };
          break;
        case 'figma':
          filtered[toolType] = {
            files: data.files?.filter((file: any) =>
              selectedIds.includes(`figma-${file.key}`)
            ) || []
          };
          break;
        default:
          // Pass through other tool data
          filtered[toolType] = data;
      }
    });

    return filtered;
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
      unique_collaborators: [] as string[],
      unique_reviewers: [] as string[],
      technologies_used: organizedData?.extractedSkills || [],
      skills_demonstrated: organizedData?.extractedSkills || []
    };

    const collaboratorsSet = new Set<string>();
    const reviewersSet = new Set<string>();
    let earliestTime: Date | null = null;
    let latestTime: Date | null = null;

    activities.forEach(activity => {
      // Count by category/type
      const type = activity.category || 'Other';
      summary.activities_by_type[type] = (summary.activities_by_type[type] || 0) + 1;

      // Count by source
      const source = activity.source || 'Unknown';
      summary.activities_by_source[source] = (summary.activities_by_source[source] || 0) + 1;

      // Extract collaborators and reviewers from metadata
      if (activity.metadata?.participants) {
        activity.metadata.participants.forEach((person: string) => {
          collaboratorsSet.add(person);
        });
      }

      if (activity.metadata?.reviewers) {
        activity.metadata.reviewers.forEach((person: string) => {
          reviewersSet.add(person);
        });
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

    summary.unique_collaborators = Array.from(collaboratorsSet);
    summary.unique_reviewers = Array.from(reviewersSet);

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
  const generateFormat7Preview = async () => {
    try {
      console.log('[MCPFlow] Generating Format7 preview from AI-processed data');

      // Extract AI-generated title and description
      const title = mcpMultiSource.generatedContent?.workspaceEntry?.title ||
                    mcpMultiSource.organizedData?.suggestedTitle ||
                    'Untitled Entry';
      const description = mcpMultiSource.generatedContent?.workspaceEntry?.description ||
                         mcpMultiSource.organizedData?.contextSummary ||
                         '';

      setEditableTitle(title);
      setEditableDescription(description);

      // Transform organized activities to Format7 structure
      const format7Activities = transformToFormat7Activities(
        mcpMultiSource.organizedData,
        selectedActivityIds
      );

      console.log('[MCPFlow] Transformed activities:', format7Activities.length);

      // Build summary statistics
      const summary = buildFormat7Summary(format7Activities, mcpMultiSource.organizedData);

      // Extract artifacts
      const artifacts = extractArtifacts(format7Activities);

      // Calculate time range from activities
      let timeRange = { start: '', end: '' };
      if (format7Activities.length > 0) {
        const timestamps = format7Activities
          .map(a => new Date(a.timestamp))
          .filter(d => !isNaN(d.getTime()));

        if (timestamps.length > 0) {
          const earliest = new Date(Math.min(...timestamps.map(d => d.getTime())));
          const latest = new Date(Math.max(...timestamps.map(d => d.getTime())));
          timeRange = {
            start: earliest.toISOString().split('T')[0],
            end: latest.toISOString().split('T')[0]
          };
        }
      }

      // Build complete Format7 entry
      const completeFormat7Entry = {
        entry_metadata: {
          title: title,
          date: timeRange.end || new Date().toISOString().split('T')[0],
          type: 'learning', // Could be determined by AI or activity types
          workspace: workspaceName,
          privacy: 'team',
          isAutomated: true,
          created_at: new Date().toISOString()
        },
        context: {
          date_range: timeRange,
          sources_included: mcpMultiSource.sources || [],
          total_activities: format7Activities.length,
          primary_focus: description
        },
        activities: format7Activities,
        summary: summary,
        correlations: mcpMultiSource.correlations || [],
        artifacts: artifacts
      };

      // Store the complete entry
      setFormat7Entry(completeFormat7Entry);

      console.log('[MCPFlow] Format7 entry generated:', {
        activities: format7Activities.length,
        collaborators: summary.unique_collaborators.length,
        technologies: summary.technologies_used.length,
        artifacts: artifacts.length
      });

      // Move to preview step
      setStep('preview');

    } catch (error: any) {
      console.error('[MCPFlow] Failed to generate preview:', error);
      alert(`Error generating preview: ${error.message}`);
    }
  };

  // Handle final confirmation with edited data
  const handleConfirmAndCreate = () => {
    console.log('[MCPFlow] Creating entry with edited data');

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

    // Create entry data with user edits
    onComplete({
      title: editableTitle,
      description: editableDescription,
      skills: mcpMultiSource.organizedData?.extractedSkills || [],
      activities: mcpMultiSource.organizedData,
      format7Entry: finalFormat7Entry,
      workspaceEntry: {
        title: editableTitle,
        description: editableDescription
      },
      networkEntry: mcpMultiSource.generatedContent?.networkEntry || null
    });

    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setSelectedActivityIds([]);
    setEditableTitle('');
    setEditableDescription('');
    setFormat7Entry(null);
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
      preview: { number: 4, total: 4, title: 'Preview & Edit Entry' }
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pull Work from Connected Tools</h3>
              <p className="text-sm text-gray-600">
                Select which tools to import activities from and choose the time period
              </p>
            </div>

            {connectedTools.length > 0 ? (
              <MCPSourceSelector
                onFetch={handleFetchActivities}
                isLoading={mcpMultiSource.isFetching}
              />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Connected</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                  Connect your work tools to automatically import and organize your activities
                </p>
                <Button
                  onClick={() => window.location.href = '/settings/integrations'}
                  className="gap-2"
                >
                  Go to Integrations
                  <ArrowRight className="h-4 w-4" />
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
            selectedIds={selectedActivityIds}
            onSelectionChange={setSelectedActivityIds}
            onContinue={handleContinueFromRawReview}
          />
        );

      case 'correlations':
        return (
          <div className="space-y-6">
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

        return (
          <Format7EntryEditor
            initialEntry={previewEntry}
            onTitleChange={setEditableTitle}
            onDescriptionChange={setEditableDescription}
            editableTitle={editableTitle}
            editableDescription={editableDescription}
          />
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
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
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
                onClick={handleConfirmAndCreate}
                disabled={!editableTitle || mcpMultiSource.isProcessing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Create Entry
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default MCPFlowSidePanel;
