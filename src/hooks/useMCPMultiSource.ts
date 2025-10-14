import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface MCPMultiSourceState {
  // Fetch state
  isFetching: boolean;
  fetchError: string | null;

  // Processing stages
  stage: 'idle' | 'fetching' | 'analyzing' | 'correlating' | 'generating' | 'complete';
  progress: number;

  // Data
  sessionId: string | null;
  sources: string[];
  rawActivities: any;
  analyzedActivities: any;
  correlations: any;
  generatedContent: any;
  organizedData: any;
}

interface FetchOptions {
  quality?: 'quick' | 'balanced' | 'high';
  generateContent?: boolean;
  workspaceName?: string;
}

export function useMCPMultiSource() {
  const [state, setState] = useState<MCPMultiSourceState>({
    isFetching: false,
    fetchError: null,
    stage: 'idle',
    progress: 0,
    sessionId: null,
    sources: [],
    rawActivities: null,
    analyzedActivities: null,
    correlations: null,
    generatedContent: null,
    organizedData: null
  });

  // Reset state
  const reset = useCallback(() => {
    setState({
      isFetching: false,
      fetchError: null,
      stage: 'idle',
      progress: 0,
      sessionId: null,
      sources: [],
      rawActivities: null,
      analyzedActivities: null,
      correlations: null,
      generatedContent: null,
      organizedData: null
    });
  }, []);

  // Fetch and process activities from MCP tools
  const fetchAndProcess = useCallback(async (
    toolTypes: string[],
    dateRange: { start: Date; end: Date },
    options: FetchOptions = {}
  ) => {
    setState(prev => ({
      ...prev,
      isFetching: true,
      fetchError: null,
      stage: 'fetching',
      progress: 10
    }));

    try {
      const token = localStorage.getItem('inchronicle_access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use the all-in-one endpoint for better performance
      const response = await fetch('/api/v1/mcp/fetch-and-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          toolTypes,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          },
          consentGiven: true,
          quality: options.quality || 'balanced',
          generateContent: options.generateContent !== false,
          workspaceName: options.workspaceName || 'Professional Work'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch and process activities');
      }

      const result = await response.json();

      setState({
        isFetching: false,
        fetchError: null,
        stage: 'complete',
        progress: 100,
        sessionId: result.data.sessionId,
        sources: result.data.sources,
        rawActivities: result.data.rawData,
        analyzedActivities: result.data.analysis,
        correlations: result.data.correlations,
        generatedContent: result.data.content,
        organizedData: result.data.organized
      });

      toast.success(`Successfully processed activities from ${result.data.sources.length} tool(s)`);

      return result.data;
    } catch (error: any) {
      console.error('Failed to fetch and process:', error);

      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchError: error.message,
        stage: 'idle',
        progress: 0
      }));

      toast.error(error.message || 'Failed to fetch activities');
      throw error;
    }
  }, []);

  // Progressive processing (fetch first, then process stage by stage)
  const fetchActivities = useCallback(async (
    toolTypes: string[],
    dateRange: { start: Date; end: Date }
  ) => {
    setState(prev => ({
      ...prev,
      isFetching: true,
      fetchError: null,
      stage: 'fetching',
      progress: 10
    }));

    try {
      const token = localStorage.getItem('inchronicle_access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // First, just fetch the data
      const response = await fetch('/api/v1/mcp/fetch-multi-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          toolTypes,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          },
          consentGiven: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch activities');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        isFetching: false,
        stage: 'idle',
        progress: 30,
        sessionId: result.data.sessionId,
        sources: result.data.sources,
        rawActivities: result.data.rawData,
        organizedData: result.data.organized
      }));

      toast.success(`Fetched activities from ${result.data.sources.length} tool(s)`);

      return result.data;
    } catch (error: any) {
      console.error('Failed to fetch activities:', error);

      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchError: error.message,
        stage: 'idle',
        progress: 0
      }));

      toast.error(error.message || 'Failed to fetch activities');
      throw error;
    }
  }, []);

  // Process a specific stage
  const processStage = useCallback(async (
    stage: 'analyze' | 'correlate' | 'generate',
    data?: any,
    options?: any
  ) => {
    const stageProgress = {
      analyze: 50,
      correlate: 70,
      generate: 90
    };

    setState(prev => ({
      ...prev,
      isFetching: true,
      stage: stage as any,
      progress: stageProgress[stage]
    }));

    try {
      const token = localStorage.getItem('inchronicle_access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/v1/mcp/process-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stage,
          sessionId: state.sessionId,
          data: data || state.organizedData,
          options
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to process ${stage} stage`);
      }

      const result = await response.json();

      // Update state based on stage
      setState(prev => {
        const updates: any = {
          ...prev,
          isFetching: false,
          progress: result.data.progress || stageProgress[stage] + 10
        };

        if (stage === 'analyze') {
          updates.analyzedActivities = result.data.result;
        } else if (stage === 'correlate') {
          updates.correlations = result.data.result;
        } else if (stage === 'generate') {
          updates.generatedContent = result.data.result;
          updates.stage = 'complete';
        }

        if (result.data.nextStage) {
          updates.stage = prev.stage; // Keep current stage until explicitly changed
        } else {
          updates.stage = 'complete';
        }

        return updates;
      });

      toast.success(`${stage} stage completed successfully`);

      return result.data;
    } catch (error: any) {
      console.error(`Failed to process ${stage}:`, error);

      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchError: error.message
      }));

      toast.error(error.message || `Failed to process ${stage} stage`);
      throw error;
    }
  }, [state.sessionId, state.organizedData]);

  // Get session data
  const getSession = useCallback(async (sessionId: string) => {
    try {
      const token = localStorage.getItem('inchronicle_access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/v1/mcp/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get session');
      }

      const result = await response.json();
      return result.data.session;
    } catch (error: any) {
      console.error('Failed to get session:', error);
      toast.error(error.message || 'Failed to get session data');
      throw error;
    }
  }, []);

  // Clear session data
  const clearSession = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      const token = localStorage.getItem('inchronicle_access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      await fetch(`/api/v1/mcp/sessions/${state.sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      reset();
      toast.success('Session cleared successfully');
    } catch (error: any) {
      console.error('Failed to clear session:', error);
      toast.error('Failed to clear session');
    }
  }, [state.sessionId, reset]);

  return {
    // State
    ...state,

    // Actions
    fetchAndProcess,
    fetchActivities,
    processStage,
    getSession,
    clearSession,
    reset,

    // Computed
    isProcessing: state.isFetching,
    hasData: !!state.organizedData,
    hasGeneratedContent: !!state.generatedContent,
    canGenerate: !!state.analyzedActivities && !!state.correlations
  };
}

export default useMCPMultiSource;