/**
 * E2ETab Component
 *
 * E2E testing tools within the unified dev console.
 * Provides Reset Session and Delete User actions for test teardown.
 * Shows a data preview of what will be deleted for the current user.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Trash2, Loader2, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { api } from '../../lib/api';
import { AuthService } from '../../services/auth.service';
import { queryClient } from '../../lib/queryClient';

interface UserDataCounts {
  email: string;
  name: string;
  integrations: number;
  stories: number;
  clusters: number;
  activities: number;
  journalEntries: number;
}

function useUserDataCounts() {
  const [counts, setCounts] = useState<UserDataCounts | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch in parallel from existing endpoints
      const [profileRes, integrationsRes, storiesRes, clustersRes] = await Promise.allSettled([
        api.get('/users/profile/me'),
        api.get('/mcp/integrations'),
        api.get('/career-stories/stories'),
        api.get('/career-stories/clusters'),
      ]);

      const profile = profileRes.status === 'fulfilled' ? profileRes.value.data?.data : null;
      const integrations = integrationsRes.status === 'fulfilled'
        ? (integrationsRes.value.data?.data?.integrations ?? [])
        : [];
      const stories = storiesRes.status === 'fulfilled'
        ? (integrationsRes.value.data?.data?.stories ?? storiesRes.value.data?.data ?? [])
        : [];
      const clusters = clustersRes.status === 'fulfilled'
        ? (clustersRes.value.data?.data ?? [])
        : [];

      setCounts({
        email: profile?.email ?? '(unknown)',
        name: profile?.name ?? '(unknown)',
        integrations: integrations.filter((i: any) => i.isConnected).length,
        stories: Array.isArray(stories) ? stories.length : 0,
        clusters: Array.isArray(clusters) ? clusters.length : 0,
        activities: Array.isArray(clusters)
          ? clusters.reduce((sum: number, c: any) => sum + (c.activityCount ?? c.activities?.length ?? 0), 0)
          : 0,
        journalEntries: 0, // No lightweight count endpoint — omit rather than over-fetch
      });
    } catch {
      setCounts(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { counts, isLoading, refetch: fetch };
}

export const E2ETab: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { counts, isLoading: countsLoading, refetch } = useUserDataCounts();

  const handleResetSession = async () => {
    setIsResetting(true);
    setError(null);
    try {
      await AuthService.logout();
    } catch {
      // Server-side logout failed — clear client state anyway
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      // Wipe MCP integrations
      try {
        await api.delete('/mcp/data');
      } catch {
        // MCP data endpoint may not exist yet — continue
      }

      // Hard-delete user (non-production only)
      await api.delete('/users/hard-delete');

      // Clear local state and redirect
      localStorage.clear();
      sessionStorage.clear();
      queryClient.clear();
      window.location.href = '/login';
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to delete user';
      setError(msg);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Reset Session */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Reset Session</h3>
        <p className="text-xs text-gray-500 mb-3">
          Logout, clear localStorage/sessionStorage, clear React Query cache, and reload.
        </p>
        <button
          onClick={handleResetSession}
          disabled={isResetting}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-600 hover:border-gray-500 hover:bg-gray-800 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          {isResetting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Reset Session
            </>
          )}
        </button>
      </div>

      {/* Delete User & Re-onboard */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Delete User & Re-onboard
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Hard-delete the current user and all data, then redirect to login.
          Register with the same email to re-run onboarding from scratch.
        </p>

        {/* Data preview */}
        <div className="mb-3 p-3 border border-gray-700 rounded-lg bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Database size={12} />
              <span className="font-medium">What will be deleted</span>
            </div>
            <button
              onClick={refetch}
              disabled={countsLoading}
              className="p-1 text-gray-500 hover:text-gray-300 rounded"
              title="Refresh counts"
            >
              <RefreshCw size={12} className={countsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {countsLoading && !counts ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" />
              Loading...
            </div>
          ) : counts ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-gray-500">User</div>
              <div className="text-gray-300 font-mono truncate">{counts.name} ({counts.email})</div>
              <div className="text-gray-500">Integrations</div>
              <div className="text-gray-300 font-mono">{counts.integrations} connected</div>
              <div className="text-gray-500">Career Stories</div>
              <div className="text-gray-300 font-mono">{counts.stories}</div>
              <div className="text-gray-500">Clusters</div>
              <div className="text-gray-300 font-mono">{counts.clusters}</div>
              <div className="text-gray-500">Activities</div>
              <div className="text-gray-300 font-mono">{counts.activities}</div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Could not load user data</div>
          )}
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-800 hover:bg-red-900/30 disabled:opacity-50 text-red-400 text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete User
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 px-3 text-xs text-gray-400 hover:text-gray-200 border border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirm Delete
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>E2E tools for test account lifecycle management.</p>
        <p>Reset Session clears all client state. Delete User removes the account from the database.</p>
      </div>
    </div>
  );
};
