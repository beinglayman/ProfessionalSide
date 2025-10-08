import React, { useState, useEffect } from 'react';
import { Download, Shield, Loader2, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '../ui/dropdown-menu';
import { MCPConsentDialog } from './MCPConsentDialog';
import { MCPDataReview } from './MCPDataReview';
import { useMCPTools, useMCPFetch, useMCPDataProcessor } from '../../hooks/useMCP';
import { MCPToolType } from '../../services/mcp.service';
import { useToast } from '../../contexts/ToastContext';

interface MCPIntegrationButtonProps {
  onDataImport: (data: {
    content?: string;
    artifacts?: any[];
    skills?: string[];
    collaborators?: string[];
  }) => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export const MCPIntegrationButton: React.FC<MCPIntegrationButtonProps> = ({
  onDataImport,
  className = '',
  variant = 'default'
}) => {
  const toast = useToast();
  const { tools, isLoading: isLoadingTools } = useMCPTools();
  const { fetch, sessions, clearSession, isLoading: isFetching } = useMCPFetch();
  const { processData } = useMCPDataProcessor();

  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showDataReview, setShowDataReview] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [selectedTools, setSelectedTools] = useState<MCPToolType[]>([]);

  // Get connected tools
  const connectedTools = tools.filter(tool => tool.isConnected);
  const hasConnectedTools = connectedTools.length > 0;

  // Handle quick import (with default tools)
  const handleQuickImport = () => {
    if (!hasConnectedTools) {
      toast.error('No connections', 'Please connect at least one tool first');
      return;
    }

    // Select all connected tools by default
    const defaultTools = connectedTools.map(t => t.toolType as MCPToolType);
    setSelectedTools(defaultTools);
    setShowConsentDialog(true);
  };

  // Handle selective import
  const handleSelectiveImport = (toolType: MCPToolType) => {
    setSelectedTools([toolType]);
    setShowConsentDialog(true);
  };

  // Handle consent confirmation
  const handleConsentConfirm = async (tools: MCPToolType[], consentGiven: boolean) => {
    if (!consentGiven || tools.length === 0) return;

    // Fetch data from selected tools
    fetch(
      {
        toolTypes: tools,
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          end: new Date().toISOString()
        },
        consentGiven: true
      },
      {
        onSuccess: (data) => {
          // Find the first successful session to review
          const successfulResult = data.results.find(r => r.success && r.sessionId);
          if (successfulResult) {
            setCurrentSession({
              toolType: successfulResult.toolType,
              data: successfulResult.data,
              sessionId: successfulResult.sessionId,
              expiresAt: successfulResult.expiresAt
            });
            setShowDataReview(true);
          } else {
            toast.error('No data available', 'No data available from selected tools');
          }
        }
      }
    );

    setShowConsentDialog(false);
  };

  // Handle data selection from review
  const handleDataSelect = (selectedItems: any[]) => {
    if (!currentSession) return;

    // Process the selected data
    const processed = processData(currentSession.toolType, {
      ...currentSession.data,
      // Filter to only selected items
      commits: currentSession.data.commits?.filter((c: any) =>
        selectedItems.some(item => item.id === `commit-${c.sha}`)
      ),
      pullRequests: currentSession.data.pullRequests?.filter((pr: any) =>
        selectedItems.some(item => item.id === `pr-${pr.id}`)
      ),
      issues: currentSession.data.issues?.filter((i: any) =>
        selectedItems.some(item => item.id === `issue-${i.id}`)
      )
    });

    // Import the processed data
    onDataImport({
      content: processed.summary + '\n\n' + processed.highlights.join('\n'),
      artifacts: processed.artifacts,
      skills: processed.skills,
      collaborators: [] // TODO: Extract from data
    });

    // Clear the session
    if (currentSession.sessionId) {
      clearSession(currentSession.sessionId);
    }

    setShowDataReview(false);
    setCurrentSession(null);

    toast.success('Import successful', 'Data imported successfully');
  };

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuickImport}
          disabled={!hasConnectedTools || isFetching}
          className={`gap-2 ${className}`}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Import from tools
        </Button>

        {/* Dialogs */}
        <MCPConsentDialog
          isOpen={showConsentDialog}
          onClose={() => setShowConsentDialog(false)}
          onConfirm={handleConsentConfirm}
          availableTools={selectedTools}
          defaultSelected={selectedTools}
        />

        {showDataReview && currentSession && (
          <Dialog open={showDataReview} onOpenChange={setShowDataReview}>
            <DialogContent className="max-w-3xl">
              <MCPDataReview
                toolType={currentSession.toolType}
                data={currentSession.data}
                sessionId={currentSession.sessionId}
                expiresAt={currentSession.expiresAt}
                onSelect={handleDataSelect}
                onCancel={() => setShowDataReview(false)}
                onClearSession={() => {
                  if (currentSession.sessionId) {
                    clearSession(currentSession.sessionId);
                  }
                  setShowDataReview(false);
                  setCurrentSession(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  // Default variant with dropdown
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={!hasConnectedTools || isFetching}
            className={`gap-2 ${className}`}
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import from Tools
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Import Work Activity
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 text-xs text-gray-500">
            Data fetched temporarily, not saved
          </div>
          <DropdownMenuSeparator />

          {/* Quick import all */}
          <DropdownMenuItem
            onClick={handleQuickImport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Import from all connected
            <span className="ml-auto text-xs text-gray-500">
              {connectedTools.length}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Individual tools */}
          {connectedTools.map(tool => (
            <DropdownMenuItem
              key={tool.toolType}
              onClick={() => handleSelectiveImport(tool.toolType as MCPToolType)}
              className="gap-2"
            >
              <Check className="h-4 w-4 text-green-600" />
              {tool.toolType.charAt(0).toUpperCase() + tool.toolType.slice(1)}
            </DropdownMenuItem>
          ))}

          {connectedTools.length === 0 && (
            <div className="px-2 py-4 text-sm text-gray-500 text-center">
              No tools connected yet.
              <br />
              <a href="/settings/integrations" className="text-blue-600 hover:underline">
                Connect tools
              </a>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <MCPConsentDialog
        isOpen={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onConfirm={handleConsentConfirm}
        availableTools={selectedTools}
        defaultSelected={selectedTools}
      />

      {showDataReview && currentSession && (
        <Dialog open={showDataReview} onOpenChange={setShowDataReview}>
          <DialogContent className="max-w-3xl">
            <MCPDataReview
              toolType={currentSession.toolType}
              data={currentSession.data}
              sessionId={currentSession.sessionId}
              expiresAt={currentSession.expiresAt}
              onSelect={handleDataSelect}
              onCancel={() => setShowDataReview(false)}
              onClearSession={() => {
                if (currentSession.sessionId) {
                  clearSession(currentSession.sessionId);
                }
                setShowDataReview(false);
                setCurrentSession(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Add missing imports to match the component
import {
  Dialog,
  DialogContent,
} from '../ui/dialog';
import { DropdownMenuTrigger } from '../ui/dropdown-menu';