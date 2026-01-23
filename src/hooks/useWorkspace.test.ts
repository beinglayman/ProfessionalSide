import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../lib/api';
import { useWorkspaces, useCreateWorkspace, Workspace, CreateWorkspaceData } from './useWorkspace';

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useWorkspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('fetches workspaces successfully', async () => {
    const mockWorkspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'Personal Workspace',
        description: 'My personal workspace',
        organizationId: '',
        organization: { id: '', name: '', logo: undefined },
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        stats: { totalMembers: 1, totalJournalEntries: 5 },
        userRole: 'OWNER',
      },
      {
        id: 'ws-2',
        name: 'Team Workspace',
        description: 'Shared team workspace',
        organizationId: 'org-1',
        organization: { id: 'org-1', name: 'TechCorp', logo: undefined },
        isActive: true,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        stats: { totalMembers: 5, totalJournalEntries: 20 },
        userRole: 'MEMBER',
      },
    ];

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: mockWorkspaces },
    });

    const { result } = renderHook(() => useWorkspaces(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Personal Workspace');
    expect(result.current.data?.[1].organization.name).toBe('TechCorp');
    expect(api.get).toHaveBeenCalledWith('/workspaces');
  });

  it('handles empty workspaces list', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: [] },
    });

    const { result } = renderHook(() => useWorkspaces(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('handles API error gracefully', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkspaces(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useCreateWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates a personal workspace (no organizationId)', async () => {
    const newWorkspace = {
      id: 'ws-new',
      name: 'My New Workspace',
      description: 'A personal workspace',
      organizationId: '',
      organization: { id: '', name: '', logo: undefined },
      isActive: true,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      stats: { totalMembers: 1, totalJournalEntries: 0 },
      userRole: 'OWNER',
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: newWorkspace },
    });

    const { result } = renderHook(() => useCreateWorkspace(), {
      wrapper: createWrapper(),
    });

    const createData: CreateWorkspaceData = {
      name: 'My New Workspace',
      description: 'A personal workspace',
      // organizationId is intentionally omitted for personal workspace
    };

    await result.current.mutateAsync(createData);

    expect(api.post).toHaveBeenCalledWith('/workspaces', createData);
  });

  it('creates an organization workspace (with organizationId)', async () => {
    const newWorkspace = {
      id: 'ws-org',
      name: 'Team Project',
      description: 'Team workspace',
      organizationId: 'org-123',
      organization: { id: 'org-123', name: 'MyOrg', logo: undefined },
      isActive: true,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      stats: { totalMembers: 1, totalJournalEntries: 0 },
      userRole: 'OWNER',
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: newWorkspace },
    });

    const { result } = renderHook(() => useCreateWorkspace(), {
      wrapper: createWrapper(),
    });

    const createData: CreateWorkspaceData = {
      name: 'Team Project',
      description: 'Team workspace',
      organizationId: 'org-123',
    };

    await result.current.mutateAsync(createData);

    expect(api.post).toHaveBeenCalledWith('/workspaces', createData);
  });

  it('handles validation error (empty name)', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: 'Validation failed', details: [{ path: ['name'], message: 'Required' }] },
      },
    });

    const { result } = renderHook(() => useCreateWorkspace(), {
      wrapper: createWrapper(),
    });

    const createData: CreateWorkspaceData = {
      name: '',
    };

    await expect(result.current.mutateAsync(createData)).rejects.toBeDefined();
  });

  it('handles organization not found error', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error: 'Organization not found' },
      },
    });

    const { result } = renderHook(() => useCreateWorkspace(), {
      wrapper: createWrapper(),
    });

    const createData: CreateWorkspaceData = {
      name: 'Test Workspace',
      organizationId: 'non-existent-org',
    };

    await expect(result.current.mutateAsync(createData)).rejects.toBeDefined();
  });
});
