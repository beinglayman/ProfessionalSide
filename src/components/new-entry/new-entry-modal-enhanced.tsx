import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Check, RepeatIcon, Link, ArrowRight, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useMCPMultiSource } from '../../hooks/useMCPMultiSource';
import { MCPSourceSelector } from '../mcp/MCPSourceSelector';
import { MCPActivityReview } from '../mcp/MCPActivityReview';

interface MCPFlowModalProps {
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

export function MCPFlowModal({ open, onOpenChange, onComplete, workspaceName = 'Professional Work' }: MCPFlowModalProps) {
  const [step, setStep] = useState<'select' | 'review' | 'preview'>('select');
  const { data: integrations } = useMCPIntegrations();
  const mcpMultiSource = useMCPMultiSource();

  const connectedTools = integrations?.integrations?.filter((i: any) => i.isConnected) || [];

  // Handle MCP data fetch
  const handleFetchActivities = async (toolTypes: string[], dateRange: { start: Date; end: Date }) => {
    try {
      await mcpMultiSource.fetchAndProcess(toolTypes, dateRange, {
        quality: 'balanced',
        generateContent: true,
        workspaceName
      });

      // Move to review step once data is fetched
      if (mcpMultiSource.organizedData) {
        setStep('review');
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  // Handle activity selection and continuation
  const handleContinueWithSelection = async (selectedData: any) => {
    // If we already have generated content, move to preview
    if (mcpMultiSource.generatedContent) {
      setStep('preview');
    } else {
      // Generate content if not already done
      try {
        await mcpMultiSource.processStage('generate', selectedData, { workspaceName });
        setStep('preview');
      } catch (error) {
        console.error('Failed to generate content:', error);
      }
    }
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
      onOpenChange(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pull Work from Connected Tools</h2>
              <p className="text-sm text-gray-600">
                Select which tools to import activities from and choose the time period
              </p>
            </div>

            {connectedTools.length > 0 ? (
              <MCPSourceSelector
                onFetch={handleFetchActivities}
                isLoading={mcpMultiSource.isFetching}
                className="max-w-2xl mx-auto"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Activities</h2>
              <p className="text-sm text-gray-600">
                AI has organized your work. Select which activities to include in your journal entry
              </p>
            </div>

            {mcpMultiSource.organizedData && (
              <MCPActivityReview
                activities={mcpMultiSource.organizedData}
                onSelectionChange={(selectedIds) => {
                  // Handle selection changes if needed
                  console.log('Selected activities:', selectedIds);
                }}
                onContinue={handleContinueWithSelection}
                isProcessing={mcpMultiSource.isProcessing}
                className="max-w-4xl mx-auto"
              />
            )}
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Generated Journal Entries</h2>
              <p className="text-sm text-gray-600">
                Review your generated entries before adding them to your journal
              </p>
            </div>

            {mcpMultiSource.generatedContent && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Workspace Entry Preview */}
                <div className="border border-blue-200 rounded-lg bg-blue-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900">Workspace Version</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Detailed with IPR
                    </span>
                  </div>
                  <h4 className="text-base font-medium text-gray-900 mb-2">
                    {mcpMultiSource.generatedContent.workspaceEntry.title}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {mcpMultiSource.generatedContent.workspaceEntry.description}
                  </p>

                  {mcpMultiSource.generatedContent.workspaceEntry.outcomes && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Key Outcomes:</h5>
                      {mcpMultiSource.generatedContent.workspaceEntry.outcomes.map((outcome: any, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded">
                            {outcome.category}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{outcome.title}</p>
                            <p className="text-xs text-gray-600">{outcome.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Network Entry Preview */}
                <div className="border border-purple-200 rounded-lg bg-purple-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-900">Network Version</h3>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Abstract, No IPR
                    </span>
                  </div>
                  <h4 className="text-base font-medium text-gray-900 mb-2">
                    {mcpMultiSource.generatedContent.networkEntry.title}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {mcpMultiSource.generatedContent.networkEntry.description}
                  </p>

                  {mcpMultiSource.generatedContent.networkEntry.outcomes && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Professional Outcomes:</h5>
                      {mcpMultiSource.generatedContent.networkEntry.outcomes.map((outcome: any, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded">
                            {outcome.category}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{outcome.title}</p>
                            <p className="text-xs text-gray-600">{outcome.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested Tags */}
                {mcpMultiSource.generatedContent.suggestedTags && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-500">Suggested tags:</span>
                    {mcpMultiSource.generatedContent.suggestedTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep('review')}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Review
                  </Button>

                  <Button
                    onClick={handleConfirmAndUse}
                    className="gap-2"
                  >
                    Use These Entries
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  // Navigation bar
  const renderNavigation = () => {
    const steps = [
      { key: 'select', label: 'Select Sources', icon: Link },
      { key: 'review', label: 'Review Activities', icon: Database },
      { key: 'preview', label: 'Preview Entries', icon: Sparkles }
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-between mb-6 pb-6 border-b">
        <div className="flex items-center space-x-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isComplete = idx < currentIndex;

            return (
              <div
                key={s.key}
                className={cn(
                  'flex items-center space-x-2',
                  idx < steps.length - 1 && 'pr-4'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                    isActive && 'bg-primary-600 text-white',
                    isComplete && 'bg-green-600 text-white',
                    !isActive && !isComplete && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'text-primary-600',
                    isComplete && 'text-green-600',
                    !isActive && !isComplete && 'text-gray-500'
                  )}
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-4" />
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            mcpMultiSource.reset();
            onOpenChange(false);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => onOpenChange(false)}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 overflow-y-auto flex-1">
            {renderNavigation()}
            {renderStepContent()}
          </div>

          {/* Progress indicator */}
          {mcpMultiSource.isFetching && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${mcpMultiSource.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MCPFlowModal;