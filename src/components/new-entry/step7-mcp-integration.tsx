import React, { useState } from 'react';
import { Link, Sparkles, Database, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { MCPFlowModal } from './new-entry-modal-enhanced';
import { useMCPIntegrations } from '../../hooks/useMCP';

interface Step7MCPIntegrationProps {
  formData: any;
  onDataImported: (data: {
    title: string;
    description: string;
    skills: string[];
    workspaceEntry: any;
    networkEntry: any;
  }) => void;
  workspaceName?: string;
}

export function Step7MCPIntegration({
  formData,
  onDataImported,
  workspaceName
}: Step7MCPIntegrationProps) {
  const [showMCPFlow, setShowMCPFlow] = useState(false);
  const { data: integrations } = useMCPIntegrations();

  const connectedToolsCount = integrations?.integrations?.filter((i: any) => i.isConnected).length || 0;

  const handleMCPComplete = (data: any) => {
    // Pass the imported data back to the parent component
    onDataImported(data);
    setShowMCPFlow(false);
  };

  return (
    <>
      {/* MCP Import Section */}
      <div className="text-center space-y-4 pb-6 border-b border-gray-200">
        {connectedToolsCount > 0 ? (
          <>
            {/* Connected Tools State */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full text-sm text-blue-600">
                <Link className="h-3.5 w-3.5" />
                {connectedToolsCount} Tools Connected
              </div>
              <div className="max-w-md mx-auto">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Fetch your recent work and let AI organize it into journal entries
                </p>
              </div>
            </div>

            {/* Import Button */}
            <div className="pt-2">
              <Button
                onClick={() => setShowMCPFlow(true)}
                size="lg"
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Database className="h-4 w-4" />
                Fetch from Your Work
                <Sparkles className="h-4 w-4" />
              </Button>

              <p className="text-xs text-gray-500 mt-3">
                AI will fetch yesterday's work (before 5 PM) or today's work (after 5 PM)
              </p>
            </div>
          </>
        ) : (
          <>
            {/* No Tools Connected State */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full text-sm text-purple-600">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Work Import Available
              </div>

              <div className="max-w-lg mx-auto space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Connect your tools to import work automatically
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Connect GitHub, Jira, Figma, and other tools to let AI import and organize your work into professional journal entries.
                </p>
              </div>

              {/* Connect Button */}
              <div className="pt-2">
                <Button
                  onClick={() => window.location.href = '/settings/integrations'}
                  size="lg"
                  variant="outline"
                  className="gap-2"
                >
                  Connect Your Tools
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Optional: Show a preview if data was imported */}
      {formData.mcpImported && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Work imported from {formData.mcpSources?.length || 0} tools</span>
          </div>
        </div>
      )}

      {/* MCP Flow Modal */}
      <MCPFlowModal
        open={showMCPFlow}
        onOpenChange={setShowMCPFlow}
        onComplete={handleMCPComplete}
        workspaceName={workspaceName || formData.workspaceId}
      />
    </>
  );
}

export default Step7MCPIntegration;