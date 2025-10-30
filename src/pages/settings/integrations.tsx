import React, { useState } from 'react';
import { Shield, Check, X, Loader2, ExternalLink, RefreshCw, Trash2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { MCPPrivacyNotice } from '../../components/mcp/MCPPrivacyNotice';
import { useMCPTools, useMCPPrivacy } from '../../hooks/useMCP';
import { MCPToolType } from '../../services/mcp.service';
import { useToast } from '../../contexts/ToastContext';
import { ToolIcon, type ToolType } from '../../components/icons/ToolIcons';

const toolDescriptions: Record<MCPToolType, string> = {
  [MCPToolType.GITHUB]: 'Import commits, pull requests, and issues from your repositories',
  [MCPToolType.JIRA]: 'Import tickets, sprints, and project updates',
  [MCPToolType.FIGMA]: 'Import design files and component updates',
  [MCPToolType.OUTLOOK]: 'Import meeting notes and calendar events',
  [MCPToolType.CONFLUENCE]: 'Import documentation and wiki pages',
  [MCPToolType.SLACK]: 'Import team discussions and important messages',
  [MCPToolType.TEAMS]: 'Import Teams chat messages and channel activity',
  [MCPToolType.SHAREPOINT]: 'Import SharePoint site activity, documents, and list updates',
  [MCPToolType.ONEDRIVE]: 'Import OneDrive file changes and collaboration activity',
  [MCPToolType.ONENOTE]: 'Import OneNote pages, notebooks, and note-taking activity',
};

const IntegrationsPage: React.FC = () => {
  const {
    tools,
    integrations,
    isLoading,
    initiateOAuth,
    disconnect,
    isConnecting,
    isDisconnecting,
    refetch
  } = useMCPTools();

  const {
    privacyStatus,
    auditHistory,
    deleteAllData,
    isDeletingData,
    refetchAudit
  } = useMCPPrivacy();

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [connectingTool, setConnectingTool] = useState<MCPToolType | null>(null);

  const handleConnect = (toolType: MCPToolType) => {
    setConnectingTool(toolType);
    initiateOAuth(toolType);
  };

  const handleDisconnect = (toolType: MCPToolType) => {
    if (confirm(`Are you sure you want to disconnect ${toolType}? This will clear all associated tokens.`)) {
      disconnect(toolType);
    }
  };

  const handleDeleteAllData = () => {
    if (confirm('Are you sure you want to delete all MCP data? This includes all integrations and audit logs. This action cannot be undone.')) {
      deleteAllData();
    }
  };

  const getToolStatus = (toolType: MCPToolType) => {
    const tool = tools.find(t => t.toolType === toolType);
    const integration = integrations.find(i => i.toolType === toolType);

    return {
      isAvailable: tool?.isAvailable || false,
      isConnected: tool?.isConnected || false,
      lastUsedAt: integration?.lastUsedAt,
      scope: integration?.scope
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">
          Connect your external tools to import work activity into journal entries
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="mb-8">
        <MCPPrivacyNotice variant="detailed" />
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.values(MCPToolType).map(toolType => {
          const status = getToolStatus(toolType);
          const isCurrentlyConnecting = isConnecting && connectingTool === toolType;

          return (
            <Card key={toolType} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status.isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <ToolIcon tool={toolType as ToolType} size={24} disabled={!status.isConnected} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {toolType.charAt(0).toUpperCase() + toolType.slice(1)}
                      </CardTitle>
                      {status.isConnected && (
                        <div className="flex items-center gap-1 mt-1">
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Connected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {toolDescriptions[toolType]}
                </CardDescription>

                {status.lastUsedAt && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Clock className="h-3 w-3" />
                    Last used: {new Date(status.lastUsedAt).toLocaleDateString()}
                  </div>
                )}

                {status.isConnected ? (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDisconnect(toolType)}
                      disabled={isDisconnecting}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                    {status.scope && (
                      <p className="text-xs text-gray-500 text-center">
                        Scope: {status.scope}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(toolType)}
                    disabled={isCurrentlyConnecting || !status.isAvailable}
                  >
                    {isCurrentlyConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {status.isAvailable ? 'Connect' : 'Not Available'}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Privacy Controls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm">Session Duration</span>
              </div>
              <p className="text-sm text-gray-600">
                Fetched data auto-deletes after {privacyStatus?.sessionDuration || 30} minutes
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm">Data Retention</span>
              </div>
              <p className="text-sm text-gray-600">
                {privacyStatus?.dataRetention === 'none'
                  ? 'No external data is stored'
                  : privacyStatus?.dataRetention}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="font-medium text-sm mb-1">Audit History</p>
              <p className="text-xs text-gray-600">
                View your MCP activity log
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAuditLog(!showAuditLog);
                if (!showAuditLog) refetchAudit();
              }}
            >
              {showAuditLog ? 'Hide' : 'View'} Audit Log
            </Button>
          </div>

          {showAuditLog && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
              <h4 className="font-medium text-sm mb-3">Recent Activity</h4>
              {auditHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {auditHistory.slice(0, 10).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded ${
                          entry.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.action.replace('_', ' ')}
                        </span>
                        <span className="text-gray-600">{entry.toolType}</span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border border-red-200 bg-red-50 rounded-lg p-4" role="alert">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-red-900">Danger Zone</strong>
                    <p className="text-sm text-red-800 mt-1">
                      Delete all MCP data including integrations and audit logs
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAllData}
                    disabled={isDeletingData}
                  >
                    {isDeletingData ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete All Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Q: How does InChronicle protect my data?</strong><br />
              A: We never store data from your external tools. Data is fetched on-demand and automatically deleted after 30 minutes.
            </p>
            <p>
              <strong>Q: What happens when I disconnect a tool?</strong><br />
              A: Only the authentication token is removed. Since we don't store any data from the tool, there's nothing else to delete.
            </p>
            <p>
              <strong>Q: Can InChronicle access my tools without my permission?</strong><br />
              A: No. We only access tools when you explicitly request data import during journal creation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsPage;