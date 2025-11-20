import { useState, useCallback } from 'react';
import { api } from '../lib/api';
// TODO: Add toast notifications when toast library is available
// import { toast } from 'sonner';

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
  errors: Record<string, string> | null;
  analyzedActivities: any;
  correlations: any;
  generatedContent: any;
  organizedData: any;
  format7Entry: any; // Format7JournalEntry structure
}

interface FetchOptions {
  quality?: 'quick' | 'balanced' | 'high';
  generateContent?: boolean;
  workspaceName?: string;
  privacy?: 'private' | 'team' | 'network' | 'public';
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
    errors: null,
    analyzedActivities: null,
    correlations: null,
    generatedContent: null,
    organizedData: null,
    format7Entry: null
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
      errors: null,
      analyzedActivities: null,
      correlations: null,
      generatedContent: null,
      organizedData: null,
      format7Entry: null
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
      console.log('[useMCPMultiSource] ========== API CALL STARTING ==========');
      console.log('[useMCPMultiSource] Calling API with toolTypes:', toolTypes);
      console.log('[useMCPMultiSource] Date range:', dateRange);

      // Use the all-in-one endpoint for better performance
      const response = await api.post('/mcp/fetch-and-process', {
        toolTypes,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        },
        consentGiven: true,
        quality: options.quality || 'balanced',
        generateContent: options.generateContent !== false,
        workspaceName: options.workspaceName || 'Professional Work'
      });

      const result = response.data;

      console.log('[useMCPMultiSource] ========== API RESPONSE RECEIVED ==========');
      console.log('[useMCPMultiSource] Response sources:', result.data?.sources);
      console.log('[useMCPMultiSource] Organized data categories:', Object.keys(result.data?.organized || {}));
      console.log('[useMCPMultiSource] Total activities:', result.data?.organized ?
        Object.values(result.data.organized).reduce((sum: number, cat: any) => sum + (cat.items?.length || 0), 0) : 0);

      setState({
        isFetching: false,
        fetchError: null,
        stage: 'complete',
        progress: 100,
        sessionId: result.data.sessionId,
        sources: result.data.sources,
        rawActivities: result.data.rawData,
        errors: result.data.errors || null,
        analyzedActivities: result.data.analysis,
        correlations: result.data.correlations,
        generatedContent: result.data.content,
        organizedData: result.data.organized
      });

      // toast.success(`Successfully processed activities from ${result.data.sources.length} tool(s)`);

      return result.data;
    } catch (error: any) {
      console.error('Failed to fetch and process:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error config:', error.config?.data);

      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch activities';

      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchError: errorMessage,
        stage: 'idle',
        progress: 0
      }));

      // toast.error(errorMessage);
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
      // First, just fetch the data
      const response = await api.post('/mcp/fetch-multi-source', {
        toolTypes,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        },
        consentGiven: true
      });

      const result = response.data;

      setState(prev => ({
        ...prev,
        isFetching: false,
        stage: 'idle',
        progress: 30,
        sessionId: result.data.sessionId,
        sources: result.data.sources,
        rawActivities: result.data.rawData,
        errors: result.data.errors || null,
        organizedData: result.data.organized
      }));

      // toast.success(`Fetched activities from ${result.data.sources.length} tool(s)`);

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

      // toast.error(error.message || 'Failed to fetch activities');
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
      const response = await api.post('/mcp/process-agents', {
        stage,
        sessionId: state.sessionId,
        data: data || state.organizedData,
        options
      });

      const result = response.data;

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
          // Extract just the correlations array from CorrelationResult object
          updates.correlations = result.data.result?.correlations || [];
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

      // toast.success(`${stage} stage completed successfully`);

      return result.data;
    } catch (error: any) {
      console.error(`Failed to process ${stage}:`, error);

      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchError: error.message
      }));

      // toast.error(error.message || `Failed to process ${stage} stage`);
      throw error;
    }
  }, [state.sessionId, state.organizedData]);

  // Fetch and process with Format7 transformation
  const fetchAndProcessFormat7 = useCallback(async (
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
      console.log('[useMCPMultiSource] ========== FORMAT7 API CALL STARTING ==========');
      console.log('[useMCPMultiSource] Calling Format7 endpoint with toolTypes:', toolTypes);
      console.log('[useMCPMultiSource] Date range:', dateRange);
      console.log('[useMCPMultiSource] Privacy:', options.privacy);

      // Call the Format7 generation endpoint
      const response = await api.post('/mcp/generate-format7-entry', {
        toolTypes,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        },
        consentGiven: true,
        quality: options.quality || 'balanced',
        privacy: options.privacy || 'team',
        workspaceName: options.workspaceName || 'Professional Work'
      });

      const format7Entry = response.data.data;

      console.log('[useMCPMultiSource] ========== FORMAT7 RESPONSE RECEIVED ==========');
      console.log('[useMCPMultiSource] Entry title:', format7Entry?.entry_metadata?.title);
      console.log('[useMCPMultiSource] Entry type:', format7Entry?.entry_metadata?.type);
      console.log('[useMCPMultiSource] Activities:', format7Entry?.activities?.length);
      console.log('[useMCPMultiSource] Sources:', format7Entry?.context?.sources_included);

      setState({
        isFetching: false,
        fetchError: null,
        stage: 'complete',
        progress: 100,
        sessionId: null, // Format7 endpoint doesn't use sessions
        sources: format7Entry?.context?.sources_included || [],
        rawActivities: null,
        errors: null,
        analyzedActivities: null,
        correlations: format7Entry?.correlations || [],
        generatedContent: null,
        organizedData: null,
        format7Entry: format7Entry
      });

      // toast.success(`Successfully generated Format7 entry from ${format7Entry?.context?.sources_included?.length || 0} tool(s)`);

      return format7Entry;
    } catch (error: any) {
      console.error('Failed to fetch and process Format7:', error);
      console.error('Error response:', error.response?.data);

      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate Format7 entry';

      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchError: errorMessage,
        stage: 'idle',
        progress: 0
      }));

      // toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Get session data
  const getSession = useCallback(async (sessionId: string) => {
    try {
      const response = await api.get(`/mcp/sessions/${sessionId}`);
      return response.data.data.session;
    } catch (error: any) {
      console.error('Failed to get session:', error);
      // toast.error(error.message || 'Failed to get session data');
      throw error;
    }
  }, []);

  // Clear session data
  const clearSession = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await api.delete(`/mcp/sessions/${state.sessionId}`);
      reset();
      // toast.success('Session cleared successfully');
    } catch (error: any) {
      console.error('Failed to clear session:', error);
      // toast.error('Failed to clear session');
    }
  }, [state.sessionId, reset]);

  return {
    // State
    ...state,

    // Actions
    fetchAndProcess,
    fetchActivities,
    processStage,
    fetchAndProcessFormat7,
    getSession,
    clearSession,
    reset,

    // Computed
    isProcessing: state.isFetching,
    hasData: !!state.organizedData,
    hasGeneratedContent: !!state.generatedContent,
    hasFormat7Entry: !!state.format7Entry,
    canGenerate: !!state.analyzedActivities && !!state.correlations
  };
}

export default useMCPMultiSource;