import { api } from '../lib/api';

export interface WorkspaceUpdateData {
  name?: string;
  description?: string;
  category?: string;
  organization?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

class WorkspaceService {
  
  /**
   * Archive a workspace
   */
  async archiveWorkspace(workspaceId: string): Promise<ApiResponse<any>> {
    const response = await api.put<ApiResponse<any>>(`/workspaces/${workspaceId}/archive`);
    return response.data;
  }

  /**
   * Unarchive a workspace
   */
  async unarchiveWorkspace(workspaceId: string): Promise<ApiResponse<any>> {
    const response = await api.put<ApiResponse<any>>(`/workspaces/${workspaceId}/unarchive`);
    return response.data;
  }

  /**
   * Update workspace information
   */
  async updateWorkspace(workspaceId: string, updateData: WorkspaceUpdateData): Promise<ApiResponse<any>> {
    const response = await api.put<ApiResponse<any>>(`/workspaces/${workspaceId}`, updateData);
    return response.data;
  }

  /**
   * Get workspace details
   */
  async getWorkspace(workspaceId: string): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`/workspaces/${workspaceId}`);
    return response.data;
  }

  /**
   * Get all workspaces for the current user
   */
  async getWorkspaces(): Promise<ApiResponse<any[]>> {
    const response = await api.get<ApiResponse<any[]>>('/workspaces');
    return response.data;
  }
}

export const workspaceService = new WorkspaceService();
export default workspaceService;