/**
 * E2ETab Component
 *
 * E2E testing tools within the unified dev console.
 * Provides Reset Session and Delete User actions for test teardown.
 */

import React, { useState } from 'react';
import { LogOut, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { AuthService } from '../../services/auth.service';
import { queryClient } from '../../lib/queryClient';

export const E2ETab: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleResetSession = async () => {
    if (!window.confirm('Reset session? You\'ll be logged out.')) return;

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
    if (confirmText !== 'DELETE') return;

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
      setConfirmText('');
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

      {/* Delete User */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Delete User
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Hard-delete the current user and all associated data. The email becomes
          reusable for re-registration. Only works in non-production environments.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => {
              if (window.confirm('Delete this user and all their data? This cannot be undone.')) {
                setShowDeleteConfirm(true);
              }
            }}
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-800 hover:bg-red-900/30 disabled:opacity-50 text-red-400 text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete User
          </button>
        ) : (
          <div className="space-y-3 p-3 border border-red-800 rounded-lg bg-red-900/10">
            <p className="text-xs text-red-400">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full text-sm bg-gray-800 text-gray-200 border border-gray-600 rounded px-3 py-1.5 placeholder-gray-500 focus:ring-1 focus:ring-red-500 focus:border-red-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText('');
                }}
                className="flex-1 py-1.5 px-3 text-xs text-gray-400 hover:text-gray-200 border border-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={confirmText !== 'DELETE' || isDeleting}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-xs text-red-400 border border-red-800 hover:bg-red-900/30 disabled:opacity-50 rounded transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
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
