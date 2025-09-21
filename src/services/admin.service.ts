import { api, ApiResponse } from '../lib/api';

export interface AdminStats {
  invitations: {
    totalSent: number;
    totalAccepted: number;
    totalPending: number;
    totalExpired: number;
  };
  requests: {
    totalPending: number;
    totalApproved: number;
    totalDenied: number;
  };
  users: {
    totalUsers: number;
    totalQuotaRemaining: number;
    totalWithQuota: number;
  };
}

export interface InvitationRequest {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  linkedinUrl?: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  adminMessage?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  invitationQuotaRemaining: number;
  invitationQuotaTotal: number;
  createdAt: string;
  lastActiveAt?: string;
}

export interface SystemSettings {
  invitationOnlyMode: boolean;
  invitationRequestsEnabled: boolean;
  defaultInvitationQuota: number;
}

export class AdminService {
  /**
   * Get admin dashboard statistics
   */
  static async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    const response = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return response.data;
  }

  /**
   * Get all invitation requests
   */
  static async getInvitationRequests(
    page: number = 1,
    limit: number = 20,
    status?: 'pending' | 'approved' | 'denied'
  ): Promise<ApiResponse<{ requests: InvitationRequest[]; pagination: any }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    
    const response = await api.get<ApiResponse<{ requests: InvitationRequest[]; pagination: any }>>(`/admin/invitation-requests?${params}`);
    return response.data;
  }

  /**
   * Review invitation request
   */
  static async reviewInvitationRequest(
    requestId: string,
    decision: 'approved' | 'denied',
    adminMessage?: string
  ): Promise<ApiResponse<{ request: InvitationRequest; invitationSent?: boolean }>> {
    const response = await api.post<ApiResponse<{ request: InvitationRequest; invitationSent?: boolean }>>(
      `/admin/invitation-requests/${requestId}/review`,
      { decision, adminMessage }
    );
    return response.data;
  }

  /**
   * Get user list with pagination
   */
  static async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<ApiResponse<{ users: UserSummary[]; pagination: any }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    const response = await api.get<ApiResponse<{ users: UserSummary[]; pagination: any }>>(`/admin/users?${params}`);
    return response.data;
  }

  /**
   * Grant invitations to a user
   */
  static async grantInvitations(
    userId: string,
    quantity: number,
    reason?: string
  ): Promise<ApiResponse<{ user: UserSummary; newQuota: number }>> {
    const response = await api.post<ApiResponse<{ user: UserSummary; newQuota: number }>>(
      `/admin/users/${userId}/grant-invitations`,
      { quantity, reason }
    );
    return response.data;
  }

  /**
   * Get system settings
   */
  static async getSystemSettings(): Promise<ApiResponse<SystemSettings>> {
    const response = await api.get<ApiResponse<SystemSettings>>('/admin/system-settings');
    return response.data;
  }

  /**
   * Update system settings
   */
  static async updateSystemSettings(settings: Partial<SystemSettings>): Promise<ApiResponse<SystemSettings>> {
    const response = await api.put<ApiResponse<SystemSettings>>('/admin/system-settings', settings);
    return response.data;
  }

  /**
   * Manually trigger monthly quota replenishment
   */
  static async triggerQuotaReplenishment(): Promise<ApiResponse<{ 
    processed: number; 
    replenished: number; 
    errors: number;
    details: string[];
  }>> {
    const response = await api.post<ApiResponse<{ 
      processed: number; 
      replenished: number; 
      errors: number;
      details: string[];
    }>>('/admin/trigger-replenishment');
    return response.data;
  }

  /**
   * Create invitation on behalf of user
   */
  static async createInvitation(
    email: string,
    message?: string
  ): Promise<ApiResponse<{ invitation: any; quotaRemaining: boolean }>> {
    const response = await api.post<ApiResponse<{ invitation: any; quotaRemaining: boolean }>>(
      '/admin/invitations/create',
      { email, message }
    );
    return response.data;
  }
}