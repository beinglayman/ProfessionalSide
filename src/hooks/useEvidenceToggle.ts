/**
 * useEvidenceToggle - persist the Evidence on/off state for the story reader.
 *
 * Reader preference stored in localStorage so it persists across sessions.
 * First-time reader: default OFF (clean reading experience). Once the user
 * flips it on, that preference sticks until they flip it back.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'inchronicle:evidence-toggle';

export function useEvidenceToggle(): [boolean, (next: boolean) => void, () => void] {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  }, [on]);

  const set = useCallback((next: boolean) => setOn(next), []);
  const toggle = useCallback(() => setOn((v) => !v), []);

  return [on, set, toggle];
}
