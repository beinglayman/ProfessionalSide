import { api, ApiResponse } from '../lib/api';

export interface SystemSettings {
  invitationOnlyMode: boolean;
}

export interface InvitationTokenValidation {
  valid: boolean;
  email?: string;
  inviter?: {
    name: string;
    email: string;
  };
}

export interface InvitationRequestData {
  name: string;
  email: string;
  role: string;
  organization: string;
  linkedinUrl?: string;
  message?: string;
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

export interface InvitationQuota {
  remaining: number;
  isAdmin: boolean;
  hasQuota: boolean;
}

export interface InvitationStats {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  totalExpired: number;
}

export interface Invitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  inviter: {
    name: string;
    email: string;
  };
}

export class InvitationService {
  /**
   * Get system settings (public)
   */
  static async getSystemSettings(): Promise<ApiResponse<SystemSettings>> {
    const response = await api.get<ApiResponse<SystemSettings>>('/invitations/system-settings');
    return response.data;
  }

  /**
   * Validate invitation token (public)
   */
  static async validateInvitationToken(token: string): Promise<ApiResponse<InvitationTokenValidation>> {
    const response = await api.get<ApiResponse<InvitationTokenValidation>>(`/invitations/validate/${token}`);
    return response.data;
  }

  /**
   * Create invitation request (public)
   */
  static async createInvitationRequest(data: InvitationRequestData): Promise<ApiResponse<{ id: string; status: string; createdAt: string }>> {
    const response = await api.post<ApiResponse<{ id: string; status: string; createdAt: string }>>('/invitation-requests/create', data);
    return response.data;
  }

  /**
   * Check if invitation requests are enabled (public)
   */
  static async getRequestsEnabled(): Promise<ApiResponse<{ enabled: boolean; message: string }>> {
    const response = await api.get<ApiResponse<{ enabled: boolean; message: string }>>('/invitation-requests/enabled');
    return response.data;
  }

  /**
   * Get user's invitation quota (authenticated)
   */
  static async getInvitationQuota(): Promise<ApiResponse<{ quota: InvitationQuota; stats: InvitationStats }>> {
    const response = await api.get<ApiResponse<{ quota: InvitationQuota; stats: InvitationStats }>>('/invitations/quota');
    return response.data;
  }

  /**
   * Get user's invitation history (authenticated)
   */
  static async getInvitationHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<{ invitations: Invitation[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ invitations: Invitation[]; pagination: any }>>(`/invitations/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Create new invitation (authenticated)
   */
  static async createInvitation(email: string, message?: string): Promise<ApiResponse<{ invitation: Invitation; quotaRemaining: boolean }>> {
    const response = await api.post<ApiResponse<{ invitation: Invitation; quotaRemaining: boolean }>>('/invitations/create', {
      email,
      message
    });
    return response.data;
  }
}