import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { networkService } from '../services/network.service';
import {
  Connection,
  ConnectionRequest,
  Follower,
  NetworkStats,
  NetworkSuggestion,
  NetworkFilters,
  BulkAction,
  ConnectionActionRequest,
  ConnectionUpdateRequest,
} from '../types/network';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const NETWORK_QUERY_KEYS = {
  connections: (type?: 'core' | 'extended', filters?: NetworkFilters) => 
    ['network', 'connections', type, filters],
  connectionRequests: () => ['network', 'requests'],
  followers: (filters?: NetworkFilters) => ['network', 'followers', filters],
  networkStats: () => ['network', 'stats'],
  networkSuggestions: () => ['network', 'suggestions'],
  availableSkills: () => ['network', 'filters', 'skills'],
  availableWorkspaces: () => ['network', 'filters', 'workspaces'],
  availableDepartments: () => ['network', 'filters', 'departments'],
  availableOrganizations: () => ['network', 'filters', 'organizations'],
};

// Connections Hook
export function useConnections(type?: 'core' | 'extended', filters?: NetworkFilters) {
  const result = useQuery({
    queryKey: NETWORK_QUERY_KEYS.connections(type, filters),
    queryFn: () => networkService.getConnections(type, filters),
    select: (data) => {
      // Handle the actual API response structure
      if (data && data.data && data.data.data && Array.isArray(data.data.data)) {
        return data.data.data; // Extract the actual connections array
      } else if (data && data.data && Array.isArray(data.data)) {
        return data.data; // Fallback for simpler structure
      }
      console.warn('Unexpected data structure in useConnections:', data);
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Debug: Log when data changes
  React.useEffect(() => {
    if (result.data) {
      console.log(`🔄 useConnections(${type}) data updated:`, {
        count: Array.isArray(result.data) ? result.data.length : 'not array',
        hasYashSaini: Array.isArray(result.data) ? result.data.some((conn: any) => conn.name === 'Yash Saini') : false,
        connectionNames: Array.isArray(result.data) ? result.data.map((conn: any) => conn.name).slice(0, 5) : [],
        isLoading: result.isLoading,
        isFetching: result.isFetching
      });
    }
  }, [result.data, result.isLoading, result.isFetching, type]);
  
  return result;
}

// Connection Requests Hook
export function useConnectionRequests() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.connectionRequests(),
    queryFn: () => networkService.getConnectionRequests(),
    select: (data) => {
      // Handle the actual API response structure
      if (data && data.data && Array.isArray(data.data)) {
        return data.data;
      }
      return data?.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds for real-time feel
  });
}

// Followers Hook
export function useFollowers(filters?: NetworkFilters) {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.followers(filters),
    queryFn: () => networkService.getFollowers(filters),
    select: (data) => {
      // Handle the actual API response structure
      if (data && data.data && data.data.data && Array.isArray(data.data.data)) {
        return data.data; // Return the paginated response structure
      } else if (data && data.data && Array.isArray(data.data)) {
        return { data: data.data }; // Wrap in paginated structure
      }
      return data?.data || { data: [] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Network Stats Hook
export function useNetworkStats() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.networkStats(),
    queryFn: () => networkService.getNetworkStats(),
    select: (data) => data?.data || {},
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Network Suggestions Hook
export function useNetworkSuggestions() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.networkSuggestions(),
    queryFn: () => networkService.getNetworkSuggestions(),
    select: (data) => data.data,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Filter Options Hooks
export function useAvailableSkills() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.availableSkills(),
    queryFn: () => networkService.getAvailableSkills(),
    select: (data) => data.data,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAvailableWorkspaces() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.availableWorkspaces(),
    queryFn: () => networkService.getAvailableWorkspaces(),
    select: (data) => data.data,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAvailableDepartments() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.availableDepartments(),
    queryFn: () => networkService.getAvailableDepartments(),
    select: (data) => data.data,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAvailableOrganizations() {
  return useQuery({
    queryKey: NETWORK_QUERY_KEYS.availableOrganizations(),
    queryFn: () => networkService.getAvailableOrganizations(),
    select: (data) => data.data,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Mutation Hooks
export function useConnectionMutations() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const moveConnectionMutation = useMutation({
    mutationFn: ({ connectionId, updateData }: { connectionId: string; updateData: ConnectionUpdateRequest }) =>
      networkService.moveConnection(connectionId, updateData),
    onMutate: async ({ connectionId, updateData }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['network', 'connections'] });

      // Snapshot the previous values for ALL filter combinations
      const previousConnections = {
        core: queryClient.getQueriesData({ queryKey: ['network', 'connections', 'core'], exact: false }),
        extended: queryClient.getQueriesData({ queryKey: ['network', 'connections', 'extended'], exact: false })
      };
      const previousStats = queryClient.getQueriesData({ queryKey: ['network', 'stats'], exact: false });

      // Optimistically update the cache
      const targetType = updateData.connectionType;
      const sourceType = targetType === 'core' ? 'extended' : 'core';

      // First, find the connection to move BEFORE removing it  
      let connectionToMove: Connection | undefined;
      // Get ALL cache entries for the source type (including different filter combinations)
      const sourceCacheEntries = queryClient.getQueriesData({ 
        queryKey: ['network', 'connections', sourceType],
        exact: false // This will match all queries that start with this pattern
      });
      
      // Debug: Log cache structure (can be removed in production)
      // console.log(`🔍 Moving ${connectionId} from ${sourceType} to ${targetType}`);
      
      for (const [queryKey, data] of sourceCacheEntries) {
        if (data && Array.isArray(data)) {
          // Cache stores the data directly (after select transformation)
          connectionToMove = (data as Connection[]).find((conn: Connection) => conn.id === connectionId);
          if (connectionToMove) break;
        } else if (data && (data as any).data) {
          // Handle the actual cache structure we're seeing
          const connections = (data as any).data;
          
          if (Array.isArray(connections)) {
            // data.data is an array of connections
            connectionToMove = connections.find((conn: Connection) => conn.id === connectionId);
            if (connectionToMove) break;
          } else if (connections.data && Array.isArray(connections.data)) {
            // data.data.data is an array of connections (nested API response)
            connectionToMove = connections.data.find((conn: Connection) => conn.id === connectionId);
            if (connectionToMove) break;
          }
        }
      }

      if (connectionToMove) {
        // Update source queries (remove connection) - update ALL filter combinations
        queryClient.setQueriesData(
          { queryKey: ['network', 'connections', sourceType], exact: false },
          (old: any) => {
            if (Array.isArray(old)) {
              // Cache stores data directly (after select transformation)
              return old.filter((conn: Connection) => conn.id !== connectionId);
            } else if (old?.data) {
              // Handle the actual cache structure we're seeing
              const connections = old.data;
              
              if (Array.isArray(connections)) {
                // data.data is an array of connections
                return {
                  ...old,
                  data: connections.filter((conn: Connection) => conn.id !== connectionId)
                };
              } else if (connections.data && Array.isArray(connections.data)) {
                // data.data.data is an array of connections (nested API response)
                return {
                  ...old,
                  data: {
                    ...connections,
                    data: connections.data.filter((conn: Connection) => conn.id !== connectionId)
                  }
                };
              }
            }
            return old;
          }
        );

        // Update target queries (add connection with updated type) - update ALL filter combinations
        queryClient.setQueriesData(
          { queryKey: ['network', 'connections', targetType], exact: false },
          (old: any) => {
            const updatedConnection = {
              ...connectionToMove,
              connectionType: targetType
            };
            
            if (Array.isArray(old)) {
              // Cache stores data directly (after select transformation)
              return [...old, updatedConnection];
            } else if (old?.data) {
              // Handle the actual cache structure we're seeing
              const connections = old.data;
              
              if (Array.isArray(connections)) {
                // data.data is an array of connections
                return {
                  ...old,
                  data: [...connections, updatedConnection]
                };
              } else if (connections.data && Array.isArray(connections.data)) {
                // data.data.data is an array of connections (nested API response)
                return {
                  ...old,
                  data: {
                    ...connections,
                    data: [...connections.data, updatedConnection]
                  }
                };
              }
            }
            return old;
          }
        );

        // Optimistically update network stats
        queryClient.setQueriesData(
          { queryKey: ['network', 'stats'], exact: false },
          (old: any) => {
            if (!old) return old;
            
            console.log(`📊 Stats before update:`, { 
              core: old.coreConnections, 
              extended: old.extendedConnections 
            });
            
            const updates = { ...old };
            
            // Get current counts - if stats are undefined, calculate from cache
            let currentCore = updates.coreConnections;
            let currentExtended = updates.extendedConnections;
            
            if (currentCore === undefined || currentExtended === undefined) {
              // Calculate from cache if stats don't exist
              const coreCache = queryClient.getQueryData(['network', 'connections', 'core']) as any;
              const extendedCache = queryClient.getQueryData(['network', 'connections', 'extended']) as any;
              
              currentCore = currentCore ?? (Array.isArray(coreCache) ? coreCache.length : 1);
              currentExtended = currentExtended ?? (Array.isArray(extendedCache) ? extendedCache.length : 0);
            }
            
            if (targetType === 'core') {
              updates.coreConnections = currentCore + 1;
              updates.extendedConnections = Math.max(currentExtended - 1, 0);
            } else {
              updates.extendedConnections = currentExtended + 1;
              updates.coreConnections = Math.max(currentCore - 1, 0);
            }
            
            console.log(`📊 Stats after update:`, { 
              core: updates.coreConnections, 
              extended: updates.extendedConnections 
            });
            
            return updates;
          }
        );
        
        // Debug: Log the cache entries we're updating
        const sourceCacheEntriesAfter = queryClient.getQueriesData({ 
          queryKey: ['network', 'connections', sourceType], exact: false 
        });
        const targetCacheEntriesAfter = queryClient.getQueriesData({ 
          queryKey: ['network', 'connections', targetType], exact: false 
        });
        
        console.log(`✅ Moved ${connectionToMove.name} from ${sourceType} to ${targetType} network`);
        console.log(`🔍 Updated ${sourceCacheEntriesAfter.length} source cache entries and ${targetCacheEntriesAfter.length} target cache entries`);
        
        // Verify the connection was actually moved in cache
        const connectionStillInSource = sourceCacheEntriesAfter.some(([_, data]) => {
          if (Array.isArray(data)) {
            return data.some((conn: Connection) => conn.id === connectionId);
          } else if (data && (data as any).data && Array.isArray((data as any).data)) {
            return (data as any).data.some((conn: Connection) => conn.id === connectionId);
          } else if (data && (data as any).data && (data as any).data.data && Array.isArray((data as any).data.data)) {
            return (data as any).data.data.some((conn: Connection) => conn.id === connectionId);
          }
          return false;
        });
        
        const connectionInTarget = targetCacheEntriesAfter.some(([_, data]) => {
          if (Array.isArray(data)) {
            return data.some((conn: Connection) => conn.id === connectionId);
          } else if (data && (data as any).data && Array.isArray((data as any).data)) {
            return (data as any).data.some((conn: Connection) => conn.id === connectionId);
          } else if (data && (data as any).data && (data as any).data.data && Array.isArray((data as any).data.data)) {
            return (data as any).data.data.some((conn: Connection) => conn.id === connectionId);
          }
          return false;
        });
        
        console.log(`🔍 Cache verification: Still in ${sourceType}? ${connectionStillInSource}, In ${targetType}? ${connectionInTarget}`);
      }

      // Return a context object with the snapshotted value
      return { previousConnections, previousStats };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConnections) {
        context.previousConnections.core.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousConnections.extended.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousStats) {
        context.previousStats.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      addToast('Failed to update connection', 'error');
      console.error('Error updating connection:', err);
    },
    onSuccess: (data) => {
      // Don't invalidate connections - let optimistic update remain
      console.log('✅ API call successful, keeping optimistic updates');
      addToast('Connection updated successfully', 'success');
    },
    onSettled: () => {
      // Check if optimistic updates are still in place
      const coreCache = queryClient.getQueriesData({ queryKey: ['network', 'connections', 'core'], exact: false });
      const extendedCache = queryClient.getQueriesData({ queryKey: ['network', 'connections', 'extended'], exact: false });
      
      console.log('🔍 Final cache state after mutation:');
      console.log('Core cache entries:', coreCache.length);
      console.log('Extended cache entries:', extendedCache.length);
      
      // Don't invalidate - keep optimistic updates
    },
  });

  const removeConnectionMutation = useMutation({
    mutationFn: (connectionId: string) => networkService.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'stats'] });
      addToast('Connection removed successfully', 'success');
    },
    onError: (error) => {
      addToast('Failed to remove connection', 'error');
      console.error('Error removing connection:', error);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (actions: BulkAction[]) => networkService.bulkUpdateConnections(actions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'stats'] });
      addToast('Bulk action completed successfully', 'success');
    },
    onError: (error) => {
      addToast('Failed to complete bulk action', 'error');
      console.error('Error in bulk action:', error);
    },
  });

  return {
    moveConnection: moveConnectionMutation.mutate,
    removeConnection: removeConnectionMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    isMovingConnection: moveConnectionMutation.isPending,
    isRemovingConnection: removeConnectionMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
  };
}

export function useConnectionRequestMutations() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const sendRequestMutation = useMutation({
    mutationFn: ({ userId, requestData }: { userId: string; requestData: ConnectionActionRequest }) =>
      networkService.sendConnectionRequest(userId, requestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'requests'] });
      addToast('Connection request sent successfully', 'success');
    },
    onError: (error) => {
      addToast('Failed to send connection request', 'error');
      console.error('Error sending connection request:', error);
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => networkService.acceptConnectionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'stats'] });
      addToast('Connection request accepted', 'success');
    },
    onError: (error) => {
      addToast('Failed to accept connection request', 'error');
      console.error('Error accepting connection request:', error);
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: (requestId: string) => networkService.declineConnectionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'requests'] });
      addToast('Connection request declined', 'success');
    },
    onError: (error) => {
      addToast('Failed to decline connection request', 'error');
      console.error('Error declining connection request:', error);
    },
  });

  return {
    sendRequest: sendRequestMutation.mutate,
    acceptRequest: acceptRequestMutation.mutate,
    declineRequest: declineRequestMutation.mutate,
    isSendingRequest: sendRequestMutation.isPending,
    isAcceptingRequest: acceptRequestMutation.isPending,
    isDecliningRequest: declineRequestMutation.isPending,
  };
}

export function useFollowerMutations() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const connectWithFollowerMutation = useMutation({
    mutationFn: (followerId: string) => networkService.connectWithFollower(followerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['network', 'followers'] });
      addToast('Connection request sent to follower', 'success');
    },
    onError: (error) => {
      addToast('Failed to send connection request', 'error');
      console.error('Error connecting with follower:', error);
    },
  });

  return {
    connectWithFollower: connectWithFollowerMutation.mutate,
    isConnectingWithFollower: connectWithFollowerMutation.isPending,
  };
}

// Custom hook for managing network filters
export function useNetworkFilters(initialFilters?: NetworkFilters) {
  const [filters, setFilters] = useState<NetworkFilters>(initialFilters || {});

  const updateFilter = useCallback((key: keyof NetworkFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof NetworkFilters];
    return Array.isArray(value) ? value.length > 0 : !!value;
  });

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    setFilters,
  };
}

// Utility hook for network search with debouncing
export function useNetworkSearch(delay: number = 500) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, delay]);

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
  };
}