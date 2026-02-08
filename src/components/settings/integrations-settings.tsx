import React, { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  Clock,
  Database,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMCPIntegrations, useMCPOAuth, useMCPGroupOAuth, useDisconnectIntegration } from '../../hooks/useMCP';
import { MCPToolType, MCPIntegrationGroup } from '../../types/mcp.types';
import { ToolIcon, ToolType } from '../icons/ToolIcons';
import { TOOL_METADATA } from '../../constants/tools';

// Names from TOOL_METADATA; descriptions are settings-specific (action-oriented for onboarding)
const toolConfigs: Record<MCPToolType, { name: string; description: string }> = {
  github:           { name: TOOL_METADATA.github.name,           description: 'Connect your GitHub account to import code contributions, pull requests, and repository activity.' },
  jira:             { name: TOOL_METADATA.jira.name,             description: 'Import task completions, story points, and sprint activity from Jira.' },
  figma:            { name: TOOL_METADATA.figma.name,            description: 'Sync design contributions, file edits, and comments from Figma projects.' },
  outlook:          { name: TOOL_METADATA.outlook.name,          description: 'Import meeting notes, email summaries, and calendar events from Outlook.' },
  confluence:       { name: TOOL_METADATA.confluence.name,       description: 'Import documentation updates, page edits, and knowledge base contributions.' },
  slack:            { name: TOOL_METADATA.slack.name,            description: 'Import important messages, thread discussions, and team collaboration highlights.' },
  teams:            { name: TOOL_METADATA.teams.name,            description: 'Sync meeting notes, chat discussions, and collaboration activity from Microsoft Teams.' },
  onedrive:         { name: TOOL_METADATA.onedrive.name,         description: 'Import OneDrive file changes and collaboration activity.' },
  onenote:          { name: TOOL_METADATA.onenote.name,          description: 'Import OneNote pages, notebooks, and note-taking activity.' },
  sharepoint:       { name: TOOL_METADATA.sharepoint.name,       description: 'Import SharePoint site activity, documents, and list updates.' },
  zoom:             { name: TOOL_METADATA.zoom.name,             description: 'Import Zoom meeting recordings, transcripts, and participant data.' },
  google_workspace: { name: TOOL_METADATA.google_workspace.name, description: 'Import Google Docs, Sheets, Slides, Drive files, and Meet recordings.' },
};

// Integration groups configuration
const integrationGroups: MCPIntegrationGroup[] = [
  {
    id: 'atlassian',
    name: 'Atlassian Suite',
    description: 'Connect once to authorize both Jira and Confluence',
    tools: ['jira', 'confluence'],
    providerName: 'Atlassian'
  },
  {
    id: 'microsoft',
    name: 'Microsoft Suite',
    description: 'Connect once to authorize Outlook, Teams, OneDrive, and OneNote',
    tools: ['outlook', 'teams', 'onedrive', 'onenote'],
    providerName: 'Microsoft'
  }
];

// Standalone tools (not part of any group)
const standaloneTools: MCPToolType[] = ['github', 'figma', 'slack', 'zoom', 'google_workspace'];

export function IntegrationsSettings() {
  const { data, isLoading: integrationsLoading } = useMCPIntegrations();
  const integrations = data?.integrations;
  const { mutate: initiateOAuth, isPending: isConnecting } = useMCPOAuth();
  const { mutate: initiateGroupOAuth, isPending: isGroupConnecting } = useMCPGroupOAuth();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectIntegration();
  const [connectingTool, setConnectingTool] = useState<MCPToolType | null>(null);
  const [connectingGroup, setConnectingGroup] = useState<string | null>(null);
  const [disconnectingTool, setDisconnectingTool] = useState<MCPToolType | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['atlassian', 'microsoft']));

  const handleConnect = (toolType: MCPToolType) => {
    setConnectingTool(toolType);
    initiateOAuth(
      { toolType },
      {
        onSuccess: (data) => {
          // Redirect to OAuth URL
          if (data.authUrl) {
            window.location.href = data.authUrl;
          }
        },
        onError: (error) => {
          console.error('OAuth initiation failed:', error);
          setConnectingTool(null);
        }
      }
    );
  };

  const handleDisconnect = (toolType: MCPToolType) => {
    if (!confirm(`Are you sure you want to disconnect ${toolConfigs[toolType].name}?`)) {
      return;
    }

    setDisconnectingTool(toolType);
    disconnect(
      toolType,
      {
        onSuccess: () => {
          setDisconnectingTool(null);
        },
        onError: (error) => {
          console.error('Disconnect failed:', error);
          setDisconnectingTool(null);
        }
      }
    );
  };

  const getConnectionStatus = (toolType: MCPToolType) => {
    if (!integrations) return 'disconnected';
    const integration = integrations.find(i => i.tool === toolType);
    return integration?.isConnected ? 'connected' : 'disconnected';
  };

  const getGroupConnectionStatus = (group: MCPIntegrationGroup) => {
    const connectedCount = group.tools.filter(tool => getConnectionStatus(tool) === 'connected').length;
    return {
      connected: connectedCount,
      total: group.tools.length,
      allConnected: connectedCount === group.tools.length,
      noneConnected: connectedCount === 0,
      partiallyConnected: connectedCount > 0 && connectedCount < group.tools.length
    };
  };

  const handleConnectGroup = (group: MCPIntegrationGroup) => {
    setConnectingGroup(group.id);
    initiateGroupOAuth(
      { groupType: group.id },
      {
        onSuccess: (data) => {
          // Redirect to OAuth URL (will authorize both tools at once)
          if (data.authUrl) {
            window.location.href = data.authUrl;
          }
        },
        onError: (error) => {
          console.error('Group OAuth initiation failed:', error);
          setConnectingGroup(null);
        }
      }
    );
  };

  const handleDisconnectGroup = (group: MCPIntegrationGroup) => {
    const connectedTools = group.tools.filter(tool => getConnectionStatus(tool) === 'connected');

    if (connectedTools.length === 0) return;

    const toolNames = connectedTools.map(tool => toolConfigs[tool].name).join(' and ');
    if (!confirm(`Are you sure you want to disconnect ${toolNames}?`)) {
      return;
    }

    // Disconnect all connected tools in the group
    connectedTools.forEach(tool => {
      setDisconnectingTool(tool);
      disconnect(tool, {
        onSettled: () => setDisconnectingTool(null)
      });
    });
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (integrationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
        <p className="mt-2 text-gray-600">
          Connect external tools to automatically import your work activity into journal entries.
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-blue-900">Privacy-First Design</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <div className="flex items-start">
                <Lock className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>OAuth tokens are encrypted with AES-256 and stored securely</span>
              </div>
              <div className="flex items-start">
                <Database className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>Data is fetched on-demand and temporarily cached (30 minutes)</span>
              </div>
              <div className="flex items-start">
                <Clock className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>No automatic background syncing - you control when to import</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Tools */}
      <div className="space-y-6">
        {/* Grouped Integrations */}
        {integrationGroups.map(group => {
          const groupStatus = getGroupConnectionStatus(group);
          const isExpanded = expandedGroups.has(group.id);

          return (
            <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Group Header */}
              <div
                className={cn(
                  "bg-gray-50 border-b border-gray-200 p-4 cursor-pointer hover:bg-gray-100 transition-colors",
                  groupStatus.allConnected && "bg-green-50 border-green-200"
                )}
                onClick={() => toggleGroupExpanded(group.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                        {groupStatus.allConnected && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">All Connected</span>
                          </div>
                        )}
                        {groupStatus.partiallyConnected && (
                          <div className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                            {groupStatus.connected}/{groupStatus.total} Connected
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    {groupStatus.noneConnected ? (
                      <Button
                        onClick={() => handleConnectGroup(group)}
                        className="bg-primary-600 hover:bg-primary-700"
                        disabled={isGroupConnecting && connectingGroup === group.id}
                      >
                        {isGroupConnecting && connectingGroup === group.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4 mr-2" />
                        )}
                        Connect {group.providerName}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleDisconnectGroup(group)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        disabled={isDisconnecting}
                      >
                        Disconnect All
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Tools (Collapsible) */}
              {isExpanded && (
                <div className="bg-white divide-y divide-gray-100">
                  {group.tools.map(toolType => {
                    const config = toolConfigs[toolType];
                    const status = getConnectionStatus(toolType);
                    const isConnected = status === 'connected';
                    const isProcessing =
                      (connectingTool === toolType && isConnecting) ||
                      (disconnectingTool === toolType && isDisconnecting);

                    return (
                      <div
                        key={toolType}
                        className={cn(
                          "p-4 transition-all",
                          isConnected && "bg-green-50/30"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-3 rounded-lg bg-gray-50">
                              <ToolIcon tool={toolType as ToolType} size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-base font-semibold text-gray-900">
                                  {config.name}
                                </h4>
                                {isConnected && (
                                  <div className="flex items-center space-x-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs font-medium">Connected</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {config.description}
                              </p>
                              {isConnected && integrations && (
                                <div className="text-xs text-gray-500 mt-2">
                                  Connected on {new Date(
                                    integrations.find(i => i.tool === toolType)?.connectedAt || ''
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {isProcessing ? (
                              <Button disabled variant="outline" size="sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </Button>
                            ) : isConnected ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect(toolType)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                Disconnect
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleConnect(toolType)}
                                className="bg-primary-600 hover:bg-primary-700"
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                Connect
                              </Button>
                            )}
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

        {/* Standalone Integrations */}
        <div className="space-y-4">
          {standaloneTools.map(toolType => {
            const config = toolConfigs[toolType];
            const status = getConnectionStatus(toolType);
            const isConnected = status === 'connected';
            const isProcessing =
              (connectingTool === toolType && isConnecting) ||
              (disconnectingTool === toolType && isDisconnecting);

            return (
              <div
                key={toolType}
                className={cn(
                  "bg-white border rounded-lg p-6 transition-all",
                  isConnected ? "border-green-200 bg-green-50/30" : "border-gray-200",
                  isProcessing && "opacity-75"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <ToolIcon tool={toolType as ToolType} size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {config.name}
                        </h3>
                        {isConnected && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Connected</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {config.description}
                      </p>
                      {isConnected && integrations && (
                        <div className="text-xs text-gray-500">
                          Connected on {new Date(
                            integrations.find(i => i.tool === toolType)?.connectedAt || ''
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {isProcessing ? (
                      <Button disabled variant="outline">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : isConnected ? (
                      <Button
                        variant="outline"
                        onClick={() => handleDisconnect(toolType)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleConnect(toolType)}
                        className="bg-primary-600 hover:bg-primary-700"
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-900">How it works</h4>
            <ol className="mt-2 text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Click "Connect" to authorize InChronicle to access your tool</li>
              <li>You'll be redirected to the tool's OAuth page to grant permissions</li>
              <li>Once connected, you can import data when creating new journal entries</li>
              <li>Your data is fetched on-demand and never stored permanently without consent</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsSettings;