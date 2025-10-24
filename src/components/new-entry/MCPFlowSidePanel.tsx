import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Database, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useMCPMultiSource } from '../../hooks/useMCPMultiSource';
import { MCPSourceSelector } from '../mcp/MCPSourceSelector';
import { MCPActivityReview } from '../mcp/MCPActivityReview';

interface MCPFlowSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    title: string;
    description: string;
    skills: string[];
    activities: any;
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
  const [step, setStep] = useState<'select' | 'review' | 'preview'>('select');
  const { data: integrations } = useMCPIntegrations();
  const mcpMultiSource = useMCPMultiSource();

  const connectedTools = integrations?.integrations?.filter((i: any) => i.isConnected) || [];

  // Handle MCP data fetch
  const handleFetchActivities = async (toolTypes: string[], dateRange: { start: Date; end: Date }) => {
    try {
      console.log('[MCPFlow] Starting fetch with:', { toolTypes, dateRange });

      const result = await mcpMultiSource.fetchAndProcess(toolTypes, dateRange, {
        quality: 'balanced',
        generateContent: true,
        workspaceName
      });

      console.log('[MCPFlow] Fetch completed, result:', result);

      // Move to review step once data is fetched
      if (result && result.organized) {
        console.log('[MCPFlow] Moving to review step with organized data');
        setStep('review');
      } else {
        console.warn('[MCPFlow] No organized data in result:', result);
        alert('No activities found for the selected date range and tools. Try expanding your date range or selecting different tools.');
      }
    } catch (error: any) {
      console.error('[MCPFlow] Failed to fetch activities:', error);
      console.error('[MCPFlow] Error details:', error.response?.data || error.message);

      // Show user-friendly error message
      const errorMsg = error.response?.data?.error || error.message || 'Failed to fetch activities';
      alert(`Error fetching activities: ${errorMsg}\n\nPlease try again or check your internet connection.`);
    }
  };

  // Handle activity selection and continuation
  const handleContinueWithSelection = async (selectedData: any) => {
    // fetchAndProcess already generated content in handleFetchActivities
    // No need to call processStage again since it was done during fetch
    console.log('[MCPFlowSidePanel] Moving to preview with generated content');
    console.log('[MCPFlowSidePanel] Current mcpMultiSource state:', {
      hasGeneratedContent: !!mcpMultiSource.generatedContent,
      hasOrganizedData: !!mcpMultiSource.organizedData,
      generatedContent: mcpMultiSource.generatedContent,
      organizedData: mcpMultiSource.organizedData,
      stage: mcpMultiSource.stage
    });
    setStep('preview');
  };

  // Handle final confirmation
  const handleConfirmAndUse = () => {
    if (mcpMultiSource.generatedContent && mcpMultiSource.organizedData) {
      onComplete({
        title: mcpMultiSource.generatedContent.workspaceEntry.title,
        description: mcpMultiSource.generatedContent.workspaceEntry.description,
        skills: mcpMultiSource.organizedData.extractedSkills || [],
        activities: mcpMultiSource.organizedData,
        workspaceEntry: mcpMultiSource.generatedContent.workspaceEntry,
        networkEntry: mcpMultiSource.generatedContent.networkEntry
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('select');
    mcpMultiSource.reset();
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'review') setStep('select');
    else if (step === 'preview') setStep('review');
  };

  const getStepInfo = () => {
    const steps = {
      select: { number: 1, total: 3, title: 'Select Data Sources' },
      review: { number: 2, total: 3, title: 'Review Activities' },
      preview: { number: 3, total: 3, title: 'Preview Entry' }
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

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Your Activities</h3>
              <p className="text-sm text-gray-600">
                AI has organized your work. Select which activities to include in your journal entry
              </p>
            </div>

            {mcpMultiSource.organizedData && (
              <MCPActivityReview
                activities={mcpMultiSource.organizedData}
                onSelectionChange={(selectedIds) => {
                  console.log('Selected activities:', selectedIds);
                }}
                onContinue={handleContinueWithSelection}
                isProcessing={mcpMultiSource.isProcessing}
              />
            )}
          </div>
        );

      case 'preview':
        // Debug logging
        console.log('[MCPFlowSidePanel] Preview step - generatedContent:', mcpMultiSource.generatedContent);
        console.log('[MCPFlowSidePanel] Preview step - organizedData:', mcpMultiSource.organizedData);
        console.log('[MCPFlowSidePanel] Preview step - hasGeneratedContent:', mcpMultiSource.hasGeneratedContent);

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Your Entry</h3>
              <p className="text-sm text-gray-600">
                Review the AI-generated journal entry before creating
              </p>
            </div>

            {mcpMultiSource.generatedContent ? (
              <div className="space-y-6">
                {/* Workspace Entry */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Workspace Entry</h4>
                  </div>

                  <h5 className="text-lg font-semibold text-gray-900 mb-3">
                    {mcpMultiSource.generatedContent.workspaceEntry.title}
                  </h5>

                  <div className="prose prose-sm max-w-none text-gray-700">
                    {mcpMultiSource.generatedContent.workspaceEntry.description}
                  </div>

                  {mcpMultiSource.organizedData?.extractedSkills && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Skills Detected:</p>
                      <div className="flex flex-wrap gap-2">
                        {mcpMultiSource.organizedData.extractedSkills.map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Network Entry */}
                {mcpMultiSource.generatedContent.networkEntry && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Network Share</h4>
                    </div>

                    <h5 className="text-lg font-semibold text-gray-900 mb-3">
                      {mcpMultiSource.generatedContent.networkEntry.title}
                    </h5>

                    <div className="prose prose-sm max-w-none text-gray-700">
                      {mcpMultiSource.generatedContent.networkEntry.description}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  No generated content available. Check console for debugging information.
                </p>
              </div>
            )}
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
            disabled={mcpMultiSource.isFetching}
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
                onClick={handleConfirmAndUse}
                disabled={!mcpMultiSource.generatedContent || mcpMultiSource.isProcessing}
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
