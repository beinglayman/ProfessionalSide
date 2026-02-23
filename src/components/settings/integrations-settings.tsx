import React, { useState, useMemo } from 'react';
import {
  Link2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
  Database,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { cn } from '../../lib/utils';
import { MCPToolType } from '../../types/mcp.types';
import { ToolIcon, ToolType } from '../icons/ToolIcons';
import { TOOL_METADATA } from '../../constants/tools';
import {
  INTEGRATION_GROUPS,
  STANDALONE_TOOLS,
  IntegrationGroupId,
  IntegrationGroup,
  StandaloneTool,
} from '../../constants/tool-groups';
import {
  useToolConnections,
  useOAuthFlow,
  useDisconnectFlow,
  GroupConnectionStatus,
} from '../../hooks/useToolConnections';

// ── Discriminated union for the unified list ──────────────────────────────

type IntegrationItem =
  | { kind: 'group'; group: IntegrationGroup; status: GroupConnectionStatus }
  | { kind: 'standalone'; tool: StandaloneTool; connected: boolean };

function isItemConnected(item: IntegrationItem): boolean {
  return item.kind === 'group'
    ? !item.status.noneConnected
    : item.connected;
}

export function IntegrationsSettings() {
  const {
    isLoading: integrationsLoading,
    getConnectionStatus,
    getGroupConnectionStatus,
    getConnectedAt,
  } = useToolConnections();

  const {
    connectingId,
    isConnecting,
    handleConnect,
    handleConnectGroup,
  } = useOAuthFlow();

  const {
    disconnectingTool,
    isDisconnecting,
    pendingDisconnect,
    setPendingDisconnect,
    requestDisconnect,
    requestDisconnectGroup,
    confirmDisconnect,
  } = useDisconnectFlow();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(INTEGRATION_GROUPS.map(g => g.id))
  );

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

  // ── Unified sorted items ──────────────────────────────────────────────

  const items = useMemo((): IntegrationItem[] => {
    const all: IntegrationItem[] = [
      ...INTEGRATION_GROUPS.map(group => ({
        kind: 'group' as const,
        group,
        status: getGroupConnectionStatus(group.id as IntegrationGroupId),
      })),
      ...STANDALONE_TOOLS.map(tool => ({
        kind: 'standalone' as const,
        tool,
        connected: getConnectionStatus(tool.toolType as MCPToolType) === 'connected',
      })),
    ];

    // Connected first, stable order within each bucket
    return all.sort((a, b) => {
      const aConn = isItemConnected(a) ? 0 : 1;
      const bConn = isItemConnected(b) ? 0 : 1;
      return aConn - bConn;
    });
  }, [getConnectionStatus, getGroupConnectionStatus]);

  // ── Summary counts ────────────────────────────────────────────────────

  const totalItems = items.length;
  const connectedCount = items.filter(isItemConnected).length;

  // Find the boundary index where "Available" section starts
  const firstAvailableIdx = items.findIndex(item => !isItemConnected(item));

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
          Connect external tools to automatically import your work activity.
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

      {/* Summary Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {connectedCount} of {totalItems} integrations connected
          </span>
          <span className="text-xs text-gray-500">
            {connectedCount === totalItems ? 'All connected' : `${totalItems - connectedCount} available`}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (connectedCount / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Unified Integration List */}
      <div className="space-y-4">
        {items.map((item, idx) => {
          // Insert section labels at boundaries
          const showConnectedLabel = idx === 0 && connectedCount > 0;
          const showAvailableLabel =
            connectedCount === 0
              ? idx === 0 // nothing connected — label before first item
              : idx === firstAvailableIdx && firstAvailableIdx > 0;

          return (
            <React.Fragment key={item.kind === 'group' ? item.group.id : item.tool.toolType}>
              {showConnectedLabel && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Connected
                </h3>
              )}
              {showAvailableLabel && (
                <h3 className={cn(
                  "text-xs font-semibold uppercase tracking-wider text-gray-500",
                  connectedCount > 0 && "pt-2"
                )}>
                  Available
                </h3>
              )}

              {item.kind === 'group'
                ? renderGroup(item.group, item.status)
                : renderStandalone(item.tool, item.connected)}
            </React.Fragment>
          );
        })}
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
              <li>Once connected, you can import data to create career stories</li>
              <li>Your data is fetched on-demand and never stored permanently without consent</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Disconnect */}
      <ConfirmationDialog
        open={pendingDisconnect !== null}
        onOpenChange={(open) => { if (!open) setPendingDisconnect(null); }}
        title="Disconnect Integration"
        description={`Are you sure you want to disconnect ${pendingDisconnect?.label ?? ''}? You can reconnect at any time.`}
        variant="destructive"
        confirmLabel="Disconnect"
        onConfirm={confirmDisconnect}
        isLoading={isDisconnecting}
      />
    </div>
  );

  // ── Render helpers (closures over component state) ────────────────────

  function renderGroup(group: IntegrationGroup, groupStatus: GroupConnectionStatus) {
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                  onClick={() => handleConnectGroup(group.id as IntegrationGroupId)}
                  className="bg-primary-600 hover:bg-primary-700"
                  disabled={isConnecting && connectingId === group.id}
                >
                  {isConnecting && connectingId === group.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Connect {group.providerName}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => requestDisconnectGroup(group.id as IntegrationGroupId, getConnectionStatus)}
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
              const toolMeta = (TOOL_METADATA as any)[toolType];
              const status = getConnectionStatus(toolType as MCPToolType);
              const isConnected = status === 'connected';
              const isProcessing =
                (connectingId === toolType && isConnecting) ||
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
                            {toolMeta?.name ?? toolType}
                          </h4>
                          {isConnected && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Connected</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {toolMeta?.description ?? ''}
                        </p>
                        {isConnected && (
                          <div className="text-xs text-gray-500 mt-2">
                            Connected on {new Date(
                              getConnectedAt(toolType as MCPToolType) || ''
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
                          onClick={() => requestDisconnect(toolType as MCPToolType)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(toolType as MCPToolType)}
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
  }

  function renderStandalone(tool: StandaloneTool, isConnected: boolean) {
    const isProcessing =
      (connectingId === tool.toolType && isConnecting) ||
      (disconnectingTool === tool.toolType && isDisconnecting);

    return (
      <div
        className={cn(
          "bg-white border rounded-lg p-6 transition-all",
          isConnected ? "border-green-200 bg-green-50/30" : "border-gray-200",
          isProcessing && "opacity-75"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="p-3 rounded-lg bg-gray-50">
              <ToolIcon tool={tool.iconTool} size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {tool.name}
                </h3>
                {isConnected && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {tool.description}
              </p>
              {isConnected && (
                <div className="text-xs text-gray-500">
                  Connected on {new Date(
                    getConnectedAt(tool.toolType as MCPToolType) || ''
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
                onClick={() => requestDisconnect(tool.toolType as MCPToolType)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={() => handleConnect(tool.toolType as MCPToolType)}
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
  }
}

export default IntegrationsSettings;
