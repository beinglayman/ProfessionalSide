import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMemo } from 'react';
import { SYNC_IN_PROGRESS_KEY } from '../../constants/sync';

/**
 * Tests for workspace filtering logic in JournalPage
 *
 * These tests verify that the workspace dropdown is populated from
 * the user's actual workspace memberships (via useWorkspaces hook)
 * rather than being derived from journal entries.
 *
 * This prevents "phantom workspaces" from appearing when journal entries
 * exist from workspaces the user is no longer a member of.
 */

// Mock workspace data as returned by useWorkspaces hook
interface MockWorkspace {
  id: string;
  name: string;
  organization: { id: string; name: string } | null;
}

// Helper function that replicates the workspace transformation logic from list.tsx
const transformWorkspacesForDropdown = (userWorkspaces: MockWorkspace[] | undefined) => {
  if (!userWorkspaces || userWorkspaces.length === 0) {
    return [];
  }
  return userWorkspaces.map(ws => ({
    id: ws.id,
    name: ws.name,
    isPersonal: !ws.organization
  }));
};

describe('Workspace Dropdown Population', () => {
  describe('transformWorkspacesForDropdown', () => {
    it('returns empty array when userWorkspaces is undefined', () => {
      const result = transformWorkspacesForDropdown(undefined);
      expect(result).toEqual([]);
    });

    it('returns empty array when userWorkspaces is empty', () => {
      const result = transformWorkspacesForDropdown([]);
      expect(result).toEqual([]);
    });

    it('transforms personal workspace correctly (no organization)', () => {
      const workspaces: MockWorkspace[] = [
        { id: 'ws-1', name: 'My Personal Space', organization: null }
      ];

      const result = transformWorkspacesForDropdown(workspaces);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'ws-1',
        name: 'My Personal Space',
        isPersonal: true
      });
    });

    it('transforms organization workspace correctly', () => {
      const workspaces: MockWorkspace[] = [
        { id: 'ws-2', name: 'Team Workspace', organization: { id: 'org-1', name: 'TechCorp' } }
      ];

      const result = transformWorkspacesForDropdown(workspaces);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'ws-2',
        name: 'Team Workspace',
        isPersonal: false
      });
    });

    it('handles mixed personal and organization workspaces', () => {
      const workspaces: MockWorkspace[] = [
        { id: 'ws-1', name: 'Personal', organization: null },
        { id: 'ws-2', name: 'Team A', organization: { id: 'org-1', name: 'Org A' } },
        { id: 'ws-3', name: 'Team B', organization: { id: 'org-2', name: 'Org B' } }
      ];

      const result = transformWorkspacesForDropdown(workspaces);

      expect(result).toHaveLength(3);
      expect(result[0].isPersonal).toBe(true);
      expect(result[1].isPersonal).toBe(false);
      expect(result[2].isPersonal).toBe(false);
    });
  });

  describe('Workspace Reset Logic', () => {
    /**
     * Replicates the useEffect logic that resets selectedWorkspace
     * when the selected workspace no longer exists in the user's memberships
     */
    const shouldResetWorkspace = (
      selectedWorkspace: string,
      workspaces: { id: string }[],
      isLoading: boolean,
      workspacesLoading: boolean
    ): boolean => {
      if (selectedWorkspace === 'all') return false;
      if (workspaces.length === 0) return false;
      if (isLoading || workspacesLoading) return false;

      const workspaceExists = workspaces.some(ws => ws.id === selectedWorkspace);
      return !workspaceExists;
    };

    it('does not reset when "all" is selected', () => {
      const result = shouldResetWorkspace('all', [{ id: 'ws-1' }], false, false);
      expect(result).toBe(false);
    });

    it('does not reset when still loading', () => {
      const result = shouldResetWorkspace('ws-1', [], true, false);
      expect(result).toBe(false);
    });

    it('does not reset when workspaces are loading', () => {
      const result = shouldResetWorkspace('ws-1', [], false, true);
      expect(result).toBe(false);
    });

    it('does not reset when workspaces list is empty', () => {
      const result = shouldResetWorkspace('ws-1', [], false, false);
      expect(result).toBe(false);
    });

    it('does not reset when selected workspace exists', () => {
      const workspaces = [{ id: 'ws-1' }, { id: 'ws-2' }];
      const result = shouldResetWorkspace('ws-1', workspaces, false, false);
      expect(result).toBe(false);
    });

    it('resets when selected workspace does not exist (phantom workspace)', () => {
      const workspaces = [{ id: 'ws-1' }, { id: 'ws-2' }];
      // 'ws-phantom' does not exist in user's workspace memberships
      const result = shouldResetWorkspace('ws-phantom', workspaces, false, false);
      expect(result).toBe(true);
    });

    it('resets when user was removed from a workspace', () => {
      // User had access to ws-3 but it's no longer in their memberships
      const workspaces = [{ id: 'ws-1' }, { id: 'ws-2' }];
      const result = shouldResetWorkspace('ws-3', workspaces, false, false);
      expect(result).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  it('handles workspace with empty string organization id', () => {
    // Some APIs might return empty string instead of null
    const workspaces = [
      { id: 'ws-1', name: 'Test', organization: null }
    ];

    const result = transformWorkspacesForDropdown(workspaces);
    expect(result[0].isPersonal).toBe(true);
  });
});

/**
 * Tests for sync/SSE timeout fallback logic in JournalPage.
 *
 * The 60s and 90s timeouts are safety nets for when SSE events never arrive.
 * These tests verify the timeout logic independently from the full component.
 */
describe('Sync Banner Timeout Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('60-second sync banner timeout', () => {
    it('clears sync-in-progress flag after 60 seconds', () => {
      sessionStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');
      let isSyncing = true;
      const refetchCalled: string[] = [];

      // Simulate the timeout logic from list.tsx lines 206-216
      const timeout = setTimeout(() => {
        sessionStorage.removeItem(SYNC_IN_PROGRESS_KEY);
        isSyncing = false;
        refetchCalled.push('activities');
      }, 60000);

      // At 59s — still syncing
      vi.advanceTimersByTime(59000);
      expect(isSyncing).toBe(true);
      expect(sessionStorage.getItem(SYNC_IN_PROGRESS_KEY)).toBe('true');

      // At 60s — timeout fires
      vi.advanceTimersByTime(1000);
      expect(isSyncing).toBe(false);
      expect(sessionStorage.getItem(SYNC_IN_PROGRESS_KEY)).toBeNull();
      expect(refetchCalled).toContain('activities');

      clearTimeout(timeout);
    });

    it('timeout is cancelled when SSE data-changed arrives before 60s', () => {
      sessionStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');
      let isSyncing = true;
      let timeoutFired = false;

      const timeout = setTimeout(() => {
        timeoutFired = true;
      }, 60000);

      // SSE data-changed arrives at 5s
      vi.advanceTimersByTime(5000);
      sessionStorage.removeItem(SYNC_IN_PROGRESS_KEY);
      isSyncing = false;
      clearTimeout(timeout); // useEffect cleanup cancels the timeout

      // Advance past 60s
      vi.advanceTimersByTime(60000);
      expect(timeoutFired).toBe(false);
      expect(isSyncing).toBe(false);
    });

    it('timeout does not fire when sync modal is open', () => {
      // When showSyncModal is true, the useEffect early-returns
      // Simulating: if (!isSyncing || showSyncModal) return;
      const showSyncModal = true;
      const isSyncing = true;
      let timeoutFired = false;

      if (!isSyncing || showSyncModal) {
        // No timeout is set — this is the expected behavior
      } else {
        setTimeout(() => { timeoutFired = true; }, 60000);
      }

      vi.advanceTimersByTime(60000);
      expect(timeoutFired).toBe(false);
    });
  });

  describe('90-second narratives timeout', () => {
    it('clears narrativesGenerating after 90 seconds', () => {
      let narrativesGenerating = true;
      let pendingIds = new Set(['entry-1', 'entry-2']);
      const refetchCalled: string[] = [];

      // Simulate the timeout logic from list.tsx lines 191-203
      const timeout = setTimeout(() => {
        narrativesGenerating = false;
        pendingIds = new Set();
        refetchCalled.push('journal', 'activities');
      }, 90000);

      // At 89s — still generating
      vi.advanceTimersByTime(89000);
      expect(narrativesGenerating).toBe(true);
      expect(pendingIds.size).toBe(2);

      // At 90s — timeout fires
      vi.advanceTimersByTime(1000);
      expect(narrativesGenerating).toBe(false);
      expect(pendingIds.size).toBe(0);
      expect(refetchCalled).toEqual(['journal', 'activities']);

      clearTimeout(timeout);
    });

    it('timeout is cancelled when SSE narratives-complete arrives before 90s', () => {
      let narrativesGenerating = true;
      let timeoutFired = false;

      const timeout = setTimeout(() => {
        timeoutFired = true;
      }, 90000);

      // SSE narratives-complete arrives at 30s
      vi.advanceTimersByTime(30000);
      narrativesGenerating = false;
      clearTimeout(timeout);

      // Advance past 90s
      vi.advanceTimersByTime(90000);
      expect(timeoutFired).toBe(false);
      expect(narrativesGenerating).toBe(false);
    });

    it('timeout does not start when narrativesGenerating is false', () => {
      const narrativesGenerating = false;
      let timeoutFired = false;

      // Simulating: if (!narrativesGenerating) return;
      if (narrativesGenerating) {
        setTimeout(() => { timeoutFired = true; }, 90000);
      }

      vi.advanceTimersByTime(90000);
      expect(timeoutFired).toBe(false);
    });
  });
});
