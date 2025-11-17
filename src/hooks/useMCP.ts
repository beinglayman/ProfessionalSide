import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import { mcpService, MCPToolType } from '../services/mcp.service';

// Export specific hooks for the integrations component
export function useMCPIntegrations() {
  return useQuery({
    queryKey: ['mcp', 'integrations'],
    queryFn: () => mcpService.getIntegrationStatus(),
    staleTime: 30 * 1000,
  });
}

export function useMCPIntegrationValidation() {
  return useQuery({
    queryKey: ['mcp', 'integrations', 'validation'],
    queryFn: () => mcpService.validateIntegrations(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1, // Only retry once on failure
    // Don't fail the query if validation fails - gracefully degrade
    // This allows the UI to still show tools even if validation is unavailable
    useErrorBoundary: false
  });
}

export function useMCPOAuth() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ toolType }: { toolType: MCPToolType }) =>
      mcpService.initiateOAuth(toolType),
    onSuccess: (data) => {
      // Return the auth URL for redirect
      return data;
    },
    onError: (error: any) => {
      toast.error('Connection failed', error.response?.data?.error || 'Failed to initiate connection');
    }
  });
}

export function useMCPGroupOAuth() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ groupType }: { groupType: 'atlassian' | 'microsoft' }) =>
      mcpService.initiateGroupOAuth(groupType),
    onSuccess: (data) => {
      // Return the auth URL for redirect
      return data;
    },
    onError: (error: any) => {
      toast.error('Connection failed', error.response?.data?.error || 'Failed to initiate group connection');
    }
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (toolType: MCPToolType) =>
      mcpService.disconnectIntegration(toolType),
    onSuccess: (data, toolType) => {
      toast.success('Disconnected successfully', `Your ${toolType} integration has been removed`);
      queryClient.invalidateQueries({ queryKey: ['mcp', 'integrations'] });
    },
    onError: (error: any) => {
      toast.error('Disconnection failed', error.response?.data?.error || 'Failed to disconnect');
    }
  });
}

/**
 * Hook for MCP tool operations
 */
export function useMCPTools() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Get available tools
  const {
    data: toolsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['mcp', 'tools'],
    queryFn: () => mcpService.getAvailableTools(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get integration status
  const { data: integrationsData } = useQuery({
    queryKey: ['mcp', 'integrations'],
    queryFn: () => mcpService.getIntegrationStatus(),
    staleTime: 5 * 60 * 1000,
  });

  // Initiate OAuth
  const initiateOAuthMutation = useMutation({
    mutationFn: (toolType: MCPToolType) => mcpService.initiateOAuth(toolType),
    onSuccess: (data) => {
      // Open OAuth URL in new window
      const authWindow = window.open(
        data.authUrl,
        'mcp-oauth',
        'width=600,height=700,scrollbars=yes'
      );

      // Check for window close
      const checkInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          // Refetch tools and integrations
          queryClient.invalidateQueries({ queryKey: ['mcp'] });
        }
      }, 1000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to initiate connection');
    }
  });

  // Disconnect integration
  const disconnectMutation = useMutation({
    mutationFn: (toolType: MCPToolType) => mcpService.disconnectIntegration(toolType),
    onSuccess: (data, toolType) => {
      toast.success(`${mcpService.getToolDisplayName(toolType)} disconnected successfully`);
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to disconnect');
    }
  });

  return {
    tools: toolsData?.tools || [],
    privacyStatus: toolsData?.privacyStatus,
    integrations: integrationsData?.integrations || [],
    isLoading,
    error,
    refetch,
    initiateOAuth: initiateOAuthMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: initiateOAuthMutation.isPending,
    isDisconnecting: disconnectMutation.isPending
  };
}

/**
 * Hook for fetching data from MCP tools
 */
export function useMCPFetch() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Map<string, any>>(new Map());
  const [isConsenting, setIsConsenting] = useState(false);

  const fetchMutation = useMutation({
    mutationFn: ({
      toolTypes,
      dateRange,
      consentGiven
    }: {
      toolTypes: MCPToolType[];
      dateRange?: { start?: string; end?: string };
      consentGiven: boolean;
    }) => mcpService.fetchData(toolTypes, dateRange, consentGiven),
    onSuccess: (data) => {
      // Store sessions in state
      data.results.forEach(result => {
        if (result.sessionId) {
          setSessions(prev => new Map(prev).set(result.sessionId, result));
        }
      });

      // Show privacy notice
      toast.info(data.privacyNotice, {
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to fetch data');
    }
  });

  // Clear session
  const clearSessionMutation = useMutation({
    mutationFn: (sessionId: string) => mcpService.clearSession(sessionId),
    onSuccess: (data, sessionId) => {
      setSessions(prev => {
        const newSessions = new Map(prev);
        newSessions.delete(sessionId);
        return newSessions;
      });
      toast.success('Session data cleared');
    }
  });

  // Clear all sessions
  const clearAllSessionsMutation = useMutation({
    mutationFn: () => mcpService.clearAllSessions(),
    onSuccess: (data) => {
      setSessions(new Map());
      toast.success(data.message);
    }
  });

  const fetchWithConsent = useCallback(
    async (toolTypes: MCPToolType[], dateRange?: { start?: string; end?: string }) => {
      setIsConsenting(true);
      // The actual consent UI will be shown in the component
      // This just triggers the flow
    },
    []
  );

  return {
    fetch: fetchMutation.mutate,
    fetchWithConsent,
    isLoading: fetchMutation.isPending,
    sessions,
    clearSession: clearSessionMutation.mutate,
    clearAllSessions: clearAllSessionsMutation.mutate,
    isConsenting,
    setIsConsenting
  };
}

/**
 * Hook for MCP privacy operations
 */
export function useMCPPrivacy() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Get privacy status
  const { data: privacyData } = useQuery({
    queryKey: ['mcp', 'privacy'],
    queryFn: () => mcpService.getPrivacyStatus(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get audit history
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    refetch: refetchAudit
  } = useQuery({
    queryKey: ['mcp', 'audit'],
    queryFn: () => mcpService.getAuditHistory(),
    staleTime: 60 * 1000, // 1 minute
  });

  // Delete all MCP data
  const deleteAllDataMutation = useMutation({
    mutationFn: () => mcpService.deleteAllMCPData(),
    onSuccess: (data) => {
      toast.success(data.message);
      // Clear all MCP-related cache
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete data');
    }
  });

  return {
    privacyStatus: privacyData?.status,
    privacyMessage: privacyData?.message,
    auditHistory: auditData?.history || [],
    auditPrivacyNotice: auditData?.privacyNotice,
    isLoadingAudit,
    refetchAudit,
    deleteAllData: deleteAllDataMutation.mutate,
    isDeletingData: deleteAllDataMutation.isPending
  };
}

/**
 * Hook for processing fetched MCP data
 */
export function useMCPDataProcessor() {
  const processGitHubData = useCallback((data: any) => {
    return mcpService.processGitHubActivity(data);
  }, []);

  const processJiraData = useCallback((data: any) => {
    // TODO: Implement Jira data processing
    return {
      summary: 'Jira activity',
      highlights: [],
      skills: [],
      artifacts: []
    };
  }, []);

  const processFigmaData = useCallback((data: any) => {
    // TODO: Implement Figma data processing
    return {
      summary: 'Figma activity',
      highlights: [],
      skills: [],
      artifacts: []
    };
  }, []);

  const processData = useCallback((toolType: MCPToolType, data: any) => {
    switch (toolType) {
      case MCPToolType.GITHUB:
        return processGitHubData(data);
      case MCPToolType.JIRA:
        return processJiraData(data);
      case MCPToolType.FIGMA:
        return processFigmaData(data);
      default:
        return {
          summary: '',
          highlights: [],
          skills: [],
          artifacts: []
        };
    }
  }, [processGitHubData, processJiraData, processFigmaData]);

  return {
    processData,
    processGitHubData,
    processJiraData,
    processFigmaData
  };
}