import { api, ApiResponse } from '../lib/api';

export interface WorkspaceInvitation {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  inviterId: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canInvite: boolean;
    canManageSettings: boolean;
  };
  message?: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  createdAt: string;
  updatedAt: string;
  hasExistingAccount?: boolean;
  workspace?: {
    name: string;
  };
  inviter?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface InviteMemberRequest {
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  message?: string;
  permissions?: {
    canEdit: boolean;
    canComment: boolean;
    canInvite: boolean;
    canManageSettings: boolean;
  };
}

export interface InviteMemberResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending';
  expiresAt: string;
  hasExistingAccount: boolean;
}

export class WorkspaceInvitationService {
  /**
   * Send workspace invitation
   */
  static async sendInvitation(
    workspaceId: string,
    invitationData: InviteMemberRequest
  ): Promise<ApiResponse<InviteMemberResponse>> {
    const response = await api.post(
      `/workspaces/${workspaceId}/invitations`,
      invitationData
    );
    return response.data;
  }

  /**
   * Get workspace invitations (for admins/owners)
   */
  static async getWorkspaceInvitations(
    workspaceId: string
  ): Promise<ApiResponse<WorkspaceInvitation[]>> {
    const response = await api.get(`/workspaces/${workspaceId}/invitations`);
    return response.data;
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(token: string): Promise<ApiResponse<any>> {
    const response = await api.post(`/workspaces/invitations/${token}/accept`);
    return response.data;
  }

  /**
   * Decline invitation
   */
  static async declineInvitation(token: string): Promise<ApiResponse<null>> {
    const response = await api.post(`/workspaces/invitations/${token}/decline`);
    return response.data;
  }

  /**
   * Get pending invitations for current user
   */
  static async getUserPendingInvitations(): Promise<ApiResponse<WorkspaceInvitation[]>> {
    const response = await api.get('/notifications?type=WORKSPACE_INVITE&unread=true');
    return response.data;
  }

  /**
   * Cancel invitation (for admins/owners)
   */
  static async cancelInvitation(
    workspaceId: string,
    invitationId: string
  ): Promise<ApiResponse<null>> {
    const response = await api.delete(
      `/workspaces/${workspaceId}/invitations/${invitationId}`
    );
    return response.data;
  }

  /**
   * Resend invitation (for admins/owners)
   */
  static async resendInvitation(
    workspaceId: string,
    invitationId: string
  ): Promise<ApiResponse<WorkspaceInvitation>> {
    const response = await api.post(
      `/workspaces/${workspaceId}/invitations/${invitationId}/resend`
    );
    return response.data;
  }
}

export default WorkspaceInvitationService;