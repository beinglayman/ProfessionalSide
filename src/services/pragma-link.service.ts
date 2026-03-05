import { api, ApiResponse } from '../lib/api';

export interface PragmaLink {
  id: string;
  shortCode: string;
  token: string;
  tier: 'public' | 'recruiter' | 'mentor';
  label: string | null;
  views: number;
  lastViewedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatePragmaLinkRequest {
  storyId: string;
  tier: 'public' | 'recruiter' | 'mentor';
  label?: string;
  expiresAt?: string;
}

export interface CreatePragmaLinkResponse {
  id: string;
  shortCode: string;
  token: string;
  url: string;
  tier: string;
  label: string | null;
  expiresAt: string | null;
}

export interface RevokePragmaLinkResponse {
  success: boolean;
  revokedAt: string;
}

export interface PragmaResolveResponse {
  content: {
    id: string;
    title: string;
    framework: string;
    archetype: string | null;
    category: string | null;
    publishedAt: string | null;
    sections: Record<string, { summary: string }>;
    sources: Array<{
      id: string;
      label: string;
      sectionKey: string;
      toolType: string | null;
      sourceType: string;
      url: string | null;
      annotation: string | null;
    }>;
    annotations: Array<{
      id: string;
      storyId: string | null;
      derivationId: string | null;
      sectionKey: string;
      startOffset: number;
      endOffset: number;
      annotatedText: string;
      style: string;
      color: string | null;
      note: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    sourceCoverage?: { total: number; sourced: number };
  };
  tier: 'public' | 'recruiter' | 'mentor';
  author: {
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    avatar: string | null;
  };
}

export class PragmaLinkService {
  static async createLink(data: CreatePragmaLinkRequest): Promise<ApiResponse<CreatePragmaLinkResponse>> {
    const response = await api.post<ApiResponse<CreatePragmaLinkResponse>>('/pragma-links', data);
    return response.data;
  }

  static async listLinks(storyId: string): Promise<ApiResponse<PragmaLink[]>> {
    const response = await api.get<ApiResponse<PragmaLink[]>>(`/pragma-links?storyId=${storyId}`);
    return response.data;
  }

  static async revokeLink(linkId: string): Promise<ApiResponse<RevokePragmaLinkResponse>> {
    const response = await api.post<ApiResponse<RevokePragmaLinkResponse>>(`/pragma-links/${linkId}/revoke`);
    return response.data;
  }

  static async resolveLink(shortCode: string, token?: string): Promise<ApiResponse<PragmaResolveResponse>> {
    const params = token ? `?t=${token}` : '';
    const response = await api.get<ApiResponse<PragmaResolveResponse>>(`/pragma/resolve/${shortCode}${params}`);
    return response.data;
  }
}
