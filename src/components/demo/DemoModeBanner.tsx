/**
 * DemoModeBanner - persistent, unmissable banner shown when the app is
 * running in demo mode.
 *
 * Why this exists: demo mode routes every API call to the demo sourceMode
 * on the backend, which hides real production data. The toggle is an
 * undocumented Cmd/Ctrl+E keyboard shortcut (see
 * src/services/demo-mode.service.ts) so it can flip on accidentally -
 * someone hits Cmd+E in a form, their real data "disappears", confusing
 * them for hours.
 *
 * The banner makes that state impossible to miss and gives a one-click
 * exit. Rendered at the very top of the app shell in App.tsx,
 * unconditionally - it only paints itself when isDemoMode() is true.
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { isDemoMode, disableDemoMode } from '../../services/demo-mode.service';

export const DemoModeBanner: React.FC = () => {
  const [on, setOn] = useState<boolean>(() => isDemoMode());

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ isDemo: boolean }>).detail;
      setOn(Boolean(detail?.isDemo));
    };
    window.addEventListener('demo-mode-changed', handler);
    // Also catch localStorage writes from other tabs.
    const storageHandler = () => setOn(isDemoMode());
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('demo-mode-changed', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  if (!on) return null;

  const handleExit = () => {
    disableDemoMode();
    // Reload so every in-flight query re-fetches without the X-Demo-Mode
    // header. Otherwise cached react-query results stay on screen and
    // it looks like the exit did nothing.
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-[60] w-full bg-amber-400 text-amber-950 border-b border-amber-500 shadow-[0_1px_0_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto max-w-7xl flex items-center gap-3 px-4 py-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1 text-sm">
          <strong className="font-semibold">Demo mode is on.</strong>{' '}
          <span className="opacity-90">
            You're viewing seeded demo data. Your real activities and stories are hidden until you exit.
          </span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900 transition-colors"
        >
          <X className="h-3 w-3" />
          Exit demo mode
        </button>
      </div>
    </div>
  );
};
