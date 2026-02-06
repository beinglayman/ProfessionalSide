import {
  Connection,
  ConnectionRequest,
  Follower,
  NetworkStats,
  NetworkSuggestion,
  BulkAction,
  NetworkFilters,
  ConnectionActionRequest,
  ConnectionUpdateRequest,
  ApiResponse,
  PaginatedResponse,
} from '../types/network';
import { api } from '../lib/api';

class NetworkService {
  // Removed custom makeRequest - now using centralized api client with proper auth handling

  // Connection Management
  async getConnections(
    type?: 'core' | 'extended',
    filters?: NetworkFilters
  ): Promise<ApiResponse<PaginatedResponse<Connection>>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.skills?.length) params.append('skills', filters.skills.join(','));
    if (filters?.workspaces?.length) params.append('workspaces', filters.workspaces.join(','));
    if (filters?.department) params.append('department', filters.department);
    if (filters?.organization) params.append('organization', filters.organization);
    if (filters?.lastActivity) params.append('lastActivity', filters.lastActivity);

    const queryString = params.toString();
    const endpoint = `/network/connections${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<ApiResponse<PaginatedResponse<Connection>>>(endpoint);
    return response.data;
  }

  async moveConnection(
    connectionId: string,
    updateData: ConnectionUpdateRequest
  ): Promise<ApiResponse<Connection>> {
    const response = await api.put<ApiResponse<Connection>>(`/network/connections/${connectionId}`, updateData);
    return response.data;
  }

  async removeConnection(connectionId: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/network/connections/${connectionId}`);
    return response.data;
  }

  async bulkUpdateConnections(actions: BulkAction[]): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/network/connections/bulk', { actions });
    return response.data;
  }

  // Connection Requests
  async getConnectionRequests(): Promise<ApiResponse<ConnectionRequest[]>> {
    const response = await api.get<ApiResponse<ConnectionRequest[]>>('/network/requests');
    return response.data;
  }

  async sendConnectionRequest(
    userId: string,
    requestData: ConnectionActionRequest
  ): Promise<ApiResponse<ConnectionRequest>> {
    const response = await api.post<ApiResponse<ConnectionRequest>>('/network/requests', { ...requestData, userId });
    return response.data;
  }

  async acceptConnectionRequest(requestId: string): Promise<ApiResponse<Connection>> {
    const response = await api.post<ApiResponse<Connection>>(`/network/requests/${requestId}/accept`);
    return response.data;
  }

  async declineConnectionRequest(requestId: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>(`/network/requests/${requestId}/decline`);
    return response.data;
  }

  // Followers
  async getFollowers(filters?: NetworkFilters): Promise<ApiResponse<PaginatedResponse<Follower>>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.skills?.length) params.append('skills', filters.skills.join(','));
    if (filters?.department) params.append('department', filters.department);
    if (filters?.organization) params.append('organization', filters.organization);

    const queryString = params.toString();
    const endpoint = `/network/followers${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<ApiResponse<PaginatedResponse<Follower>>>(endpoint);
    return response.data;
  }

  async connectWithFollower(followerId: string): Promise<ApiResponse<ConnectionRequest>> {
    const response = await api.post<ApiResponse<ConnectionRequest>>(`/network/followers/${followerId}/connect`);
    return response.data;
  }

  // Network Analytics
  async getNetworkStats(): Promise<ApiResponse<NetworkStats>> {
    const response = await api.get<ApiResponse<NetworkStats>>('/network/stats');
    return response.data;
  }

  async getNetworkSuggestions(): Promise<ApiResponse<NetworkSuggestion[]>> {
    const response = await api.get<ApiResponse<NetworkSuggestion[]>>('/network/suggestions');
    return response.data;
  }

  // Search and Discovery
  async searchUsers(
    query: string,
    filters?: Omit<NetworkFilters, 'search'>
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.skills?.length) params.append('skills', filters.skills.join(','));
    if (filters?.department) params.append('department', filters.department);
    if (filters?.organization) params.append('organization', filters.organization);

    const queryString = params.toString();
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>(`/network/search?${queryString}`);
    return response.data;
  }

  // Follow
  async followUser(userId: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>(`/network/follow/${userId}`);
    return response.data;
  }

  async unfollowUser(userId: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/network/follow/${userId}`);
    return response.data;
  }

  async getFollowStatus(userId: string): Promise<ApiResponse<{ isFollowing: boolean; followingCount: number; maxFollowing: number }>> {
    const response = await api.get<ApiResponse<{ isFollowing: boolean; followingCount: number; maxFollowing: number }>>(`/network/follow/${userId}/status`);
    return response.data;
  }

  async getFollowCounts(userId: string): Promise<ApiResponse<{ followerCount: number; followingCount: number }>> {
    const response = await api.get<ApiResponse<{ followerCount: number; followingCount: number }>>(`/network/follow/${userId}/counts`);
    return response.data;
  }

  // Utility methods for filters
  async getAvailableSkills(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/network/filters/skills');
    return response.data;
  }

  async getAvailableWorkspaces(): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>('/network/filters/workspaces');
    return response.data;
  }

  async getAvailableDepartments(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/network/filters/departments');
    return response.data;
  }

  async getAvailableOrganizations(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/network/filters/organizations');
    return response.data;
  }
}

export const networkService = new NetworkService();
export default networkService;