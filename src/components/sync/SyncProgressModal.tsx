/**
 * Sync Progress Modal
 *
 * Shows sync progress:
 * - Syncing: spinner while backend works
 * - Complete: shows what was synced, auto-closes after delay
 */

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, Sparkles, Clock, Link2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SyncState, SyncIntegration, EntryPreview } from '../../services/sync.service';

export type { SyncIntegration } from '../../services/sync.service';

interface SyncProgressModalProps {
  open: boolean;
  onClose: () => void;
  state: SyncState | null;
  onComplete?: () => void;
}

/**
 * Integration logo SVGs
 */
const IntegrationIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
  const iconClass = cn("w-4 h-4", className);

  switch (icon) {
    case 'github':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      );
    case 'jira':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="#2684FF">
          <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024 12.483V1.005A1.005 1.005 0 0023.013 0z"/>
        </svg>
      );
    case 'confluence':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="#2684FF">
          <path d="M.87 18.257c-.248.382-.53.875-.763 1.245a.764.764 0 00.255 1.04l4.965 3.054a.764.764 0 001.058-.26c.199-.332.454-.763.733-1.221 1.967-3.247 3.945-2.853 7.508-1.146l4.957 2.377a.764.764 0 001.028-.382l2.212-5.181a.764.764 0 00-.382-1.005l-4.9-2.35c-5.255-2.514-9.678-2.024-12.67 3.829z"/>
          <path d="M23.13 5.743c.249-.382.531-.875.764-1.246a.764.764 0 00-.256-1.04L18.673.404a.764.764 0 00-1.058.26c-.199.331-.454.762-.733 1.22-1.967 3.247-3.945 2.854-7.508 1.147L4.418.653a.764.764 0 00-1.028.382L1.178 6.216a.764.764 0 00.382 1.005l4.9 2.35c5.256 2.514 9.678 2.024 12.67-3.828z"/>
        </svg>
      );
    case 'slack':
      return (
        <svg className={iconClass} viewBox="0 0 24 24">
          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A"/>
          <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0"/>
          <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z" fill="#2EB67D"/>
          <path d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" fill="#ECB22E"/>
        </svg>
      );
    case 'figma':
      return (
        <svg className={iconClass} viewBox="0 0 24 24">
          <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z" fill="#0ACF83"/>
          <path d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z" fill="#A259FF"/>
          <path d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z" fill="#F24E1E"/>
          <path d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z" fill="#FF7262"/>
          <path d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" fill="#1ABCFE"/>
        </svg>
      );
    case 'google':
      return (
        <svg className={iconClass} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case 'outlook':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="#0078D4">
          <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.924v-6.09l1.613 1.18c.104.078.222.117.354.117.13 0 .25-.04.354-.118L24 7.387zm-.874-.652L16.203 12.5l-1.96-1.435V5.226h8.924c.237 0 .434.083.593.243.16.16.24.357.24.597v.67zM14.243 5.226v6.339L7.03 6.09V4.556c0-.23.08-.425.236-.58.16-.155.356-.233.596-.233h6.382v1.483zm0 6.842v6.706H7.862c-.24 0-.437-.08-.596-.234-.157-.152-.236-.346-.236-.576v-1.062l7.213-4.834zM6.254 8.05v8.69L0 12.395l6.254-4.346z"/>
        </svg>
      );
    default:
      return <Sparkles className={iconClass} />;
  }
};

/**
 * Get header content based on phase
 */
function getHeaderContent(phase: string, totalActivities: number, totalEntries: number): { title: string; subtitle: string } {
  switch (phase) {
    case 'fetching':
      return { title: 'Syncing...', subtitle: 'Fetching activities from connected tools...' };
    case 'activities-synced':
      return { title: 'Activities Imported', subtitle: `${totalActivities} activities synced. Identifying draft stories...` };
    case 'generating-stories':
      return { title: 'Creating Stories', subtitle: `Organizing ${totalActivities} activities into ${totalEntries} draft stories...` };
    case 'complete':
      return { title: 'Sync Complete!', subtitle: `${totalActivities} activities imported. Stories enhancing in background...` };
    default:
      return { title: 'Syncing...', subtitle: 'Please wait...' };
  }
}

export function SyncProgressModal({
  open,
  onClose,
  state,
  onComplete,
}: SyncProgressModalProps) {
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close modal 2.5 seconds after completion
  useEffect(() => {
    if (state?.phase === 'complete') {
      autoCloseTimerRef.current = setTimeout(() => {
        onComplete?.();
        onClose();
      }, 2500);
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [state?.phase, onComplete, onClose]);

  if (!open || !state) return null;

  const { phase, integrations, entries, totalActivities, totalEntries } = state;
  const isComplete = phase === 'complete';
  const isFetching = phase === 'fetching';
  const showIntegrations = integrations.length > 0 && phase !== 'fetching';
  const showEntries = entries.length > 0;
  const isGeneratingStories = phase === 'generating-stories';

  const { title, subtitle } = getHeaderContent(phase, totalActivities, totalEntries);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - always dismissible */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {isComplete ? (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <>
          {/* Integrations - show immediately when activities are synced */}
          {showIntegrations && (
            <div className={cn("px-4 py-3", showEntries && "border-b border-gray-100")}>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Activities Imported
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-gray-50 text-gray-700 text-xs"
                  >
                    <IntegrationIcon icon={integration.icon} />
                    <span className="font-medium truncate">{integration.name}</span>
                    <span className="ml-auto font-medium text-gray-900">{integration.itemCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entries - show with generating/done status */}
          {showEntries && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                {isGeneratingStories ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                )}
                Draft Stories {isGeneratingStories ? 'Identified' : 'Created'}
              </div>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 py-1.5 px-2 text-xs text-gray-700"
                  >
                    {entry.groupingMethod === 'time' ? (
                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1">{entry.title}</span>
                    {entry.status === 'generating' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary-500 flex-shrink-0" />
                    ) : (
                      <span className="text-gray-500 flex-shrink-0">{entry.activityCount}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          {isComplete ? (
            <button
              onClick={() => {
                onComplete?.();
                onClose();
              }}
              className="w-full py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              View Your Journal
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              Sync continues in background if you close this
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
