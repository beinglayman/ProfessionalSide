/**
 * Shared hook for tool connection status and OAuth flows.
 *
 * Used by both onboarding (connect-tools step) and settings (integrations page)
 * to avoid duplicating connection detection, OAuth initiation, and disconnect logic.
 */

import { useState, useCallback, useMemo } from 'react';
import { MCPToolType } from '../services/mcp.service';
import { useMCPIntegrations, useMCPOAuth, useMCPGroupOAuth, useDisconnectIntegration } from './useMCP';
import {
  IntegrationGroupId,
  INTEGRATION_GROUPS,
  getToolGroupId,
  getOnboardingBucketId,
} from '../constants/tool-groups';
import { TOOL_METADATA } from '../constants/tools';

// ── Connection status types ────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'disconnected';

export interface GroupConnectionStatus {
  connected: number;
  total: number;
  allConnected: boolean;
  noneConnected: boolean;
  partiallyConnected: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useToolConnections() {
  const { data: integrationData, isLoading } = useMCPIntegrations();
  const integrations = integrationData?.integrations;

  /** Check if a single tool is connected. */
  const getConnectionStatus = useCallback(
    (toolType: MCPToolType): ConnectionStatus => {
      if (!integrations) return 'disconnected';
      const integration = integrations.find((i: any) => i.tool === toolType);
      return integration?.isConnected ? 'connected' : 'disconnected';
    },
    [integrations]
  );

  /** Check connection status of all tools in a group. */
  const getGroupConnectionStatus = useCallback(
    (groupId: IntegrationGroupId): GroupConnectionStatus => {
      const group = INTEGRATION_GROUPS.find(g => g.id === groupId);
      if (!group) return { connected: 0, total: 0, allConnected: false, noneConnected: true, partiallyConnected: false };

      const connectedCount = group.tools.filter(
        tool => getConnectionStatus(tool as MCPToolType) === 'connected'
      ).length;

      return {
        connected: connectedCount,
        total: group.tools.length,
        allConnected: connectedCount === group.tools.length,
        noneConnected: connectedCount === 0,
        partiallyConnected: connectedCount > 0 && connectedCount < group.tools.length,
      };
    },
    [getConnectionStatus]
  );

  /** Set of onboarding bucket IDs that have at least one connected tool. */
  const connectedBucketIds = useMemo(() => {
    const ids = new Set<string>();
    if (!integrations) return ids;
    for (const integration of integrations) {
      if (!(integration as any).isConnected) continue;
      const bucketId = getOnboardingBucketId((integration as any).toolType ?? (integration as any).tool);
      if (bucketId) ids.add(bucketId);
    }
    return ids;
  }, [integrations]);

  /** Get connectedAt date for a specific tool. */
  const getConnectedAt = useCallback(
    (toolType: MCPToolType): string | null => {
      if (!integrations) return null;
      const integration = integrations.find((i: any) => i.tool === toolType);
      return (integration as any)?.connectedAt ?? null;
    },
    [integrations]
  );

  return {
    integrations,
    isLoading,
    getConnectionStatus,
    getGroupConnectionStatus,
    connectedBucketIds,
    getConnectedAt,
  };
}

// ── OAuth Flow Hook ────────────────────────────────────────────────────────

export function useOAuthFlow() {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { mutate: initiateOAuth, isPending: isConnecting } = useMCPOAuth();
  const { mutate: initiateGroupOAuth, isPending: isGroupConnecting } = useMCPGroupOAuth();

  const handleConnect = useCallback(
    (toolType: MCPToolType) => {
      setConnectingId(toolType);
      setError('');
      initiateOAuth(
        { toolType },
        {
          onSuccess: (data: any) => {
            if (data.authUrl) window.location.href = data.authUrl;
          },
          onError: (err: any) => {
            const toolName = (TOOL_METADATA as any)[toolType]?.name ?? toolType;
            setError(err.response?.data?.error || `Failed to connect ${toolName}`);
            setConnectingId(null);
          },
        }
      );
    },
    [initiateOAuth]
  );

  const handleConnectGroup = useCallback(
    (groupId: IntegrationGroupId) => {
      setConnectingId(groupId);
      setError('');
      initiateGroupOAuth(
        { groupType: groupId },
        {
          onSuccess: (data: any) => {
            if (data.authUrl) window.location.href = data.authUrl;
          },
          onError: (err: any) => {
            setError(err.response?.data?.error || `Failed to connect ${groupId}`);
            setConnectingId(null);
          },
        }
      );
    },
    [initiateGroupOAuth]
  );

  return {
    connectingId,
    isConnecting: isConnecting || isGroupConnecting,
    error,
    setError,
    handleConnect,
    handleConnectGroup,
  };
}

// ── Disconnect Flow Hook ───────────────────────────────────────────────────

export interface PendingDisconnect {
  tools: MCPToolType[];
  label: string;
}

export function useDisconnectFlow() {
  const [disconnectingTool, setDisconnectingTool] = useState<MCPToolType | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<PendingDisconnect | null>(null);
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectIntegration();

  /** Opens the confirmation dialog for a single tool. */
  const requestDisconnect = useCallback(
    (toolType: MCPToolType) => {
      const toolName = (TOOL_METADATA as any)[toolType]?.name ?? toolType;
      setPendingDisconnect({ tools: [toolType], label: toolName });
    },
    []
  );

  /** Opens the confirmation dialog for all connected tools in a group. */
  const requestDisconnectGroup = useCallback(
    (groupId: IntegrationGroupId, getConnectionStatus: (t: MCPToolType) => ConnectionStatus) => {
      const group = INTEGRATION_GROUPS.find(g => g.id === groupId);
      if (!group) return;

      const connectedTools = group.tools.filter(
        t => getConnectionStatus(t as MCPToolType) === 'connected'
      ) as MCPToolType[];
      if (connectedTools.length === 0) return;

      const label = connectedTools
        .map(t => (TOOL_METADATA as any)[t]?.name ?? t)
        .join(' and ');
      setPendingDisconnect({ tools: connectedTools, label });
    },
    []
  );

  /** Executes the pending disconnect (called by ConfirmationDialog onConfirm). */
  const confirmDisconnect = useCallback(() => {
    if (!pendingDisconnect) return;
    for (const tool of pendingDisconnect.tools) {
      setDisconnectingTool(tool);
      disconnect(tool, {
        onSettled: () => setDisconnectingTool(null),
      });
    }
  }, [disconnect, pendingDisconnect]);

  return {
    disconnectingTool,
    isDisconnecting,
    pendingDisconnect,
    setPendingDisconnect,
    requestDisconnect,
    requestDisconnectGroup,
    confirmDisconnect,
  };
}
