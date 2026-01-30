/**
 * Sync Progress Modal
 *
 * Shows simulated progress when syncing demo data.
 * For real mode, will show actual API sync progress.
 */

import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SyncIntegration {
  id: string;
  name: string;
  icon: string;
  status: 'pending' | 'syncing' | 'done' | 'error';
  itemCount?: number;
  itemLabel?: string;
}

interface SyncProgressModalProps {
  open: boolean;
  onClose: () => void;
  integrations: SyncIntegration[];
  isComplete: boolean;
  onComplete?: () => void;
}

export function SyncProgressModal({
  open,
  onClose,
  integrations,
  isComplete,
  onComplete,
}: SyncProgressModalProps) {
  if (!open) return null;

  const completedCount = integrations.filter(i => i.status === 'done').length;
  const progress = integrations.length > 0 ? (completedCount / integrations.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isComplete ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isComplete ? 'Sync Complete' : 'Syncing Your Work'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isComplete
              ? 'Your activities have been imported successfully.'
              : 'Importing activities from your connected tools...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Integrations list */}
        <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                integration.status === 'syncing' && "bg-primary-50",
                integration.status === 'done' && "bg-green-50",
              )}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                {integration.status === 'pending' && (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
                {integration.status === 'syncing' && (
                  <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                )}
                {integration.status === 'done' && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {integration.status === 'error' && (
                  <Circle className="h-5 w-5 text-red-500" />
                )}

                {/* Integration name */}
                <span className={cn(
                  "font-medium",
                  integration.status === 'pending' && "text-gray-400",
                  integration.status === 'syncing' && "text-primary-700",
                  integration.status === 'done' && "text-green-700",
                )}>
                  {integration.name}
                </span>
              </div>

              {/* Item count */}
              {integration.status === 'done' && integration.itemCount !== undefined && (
                <span className="text-sm text-green-600">
                  {integration.itemCount} {integration.itemLabel || 'items'}
                </span>
              )}
              {integration.status === 'syncing' && (
                <span className="text-sm text-primary-500">Fetching...</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {isComplete ? (
            <button
              onClick={() => {
                onComplete?.();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
            >
              View Your Journal
            </button>
          ) : (
            <p className="text-center text-sm text-gray-500">
              This may take a moment...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
