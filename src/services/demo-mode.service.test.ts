/**
 * Demo Mode Service Tests
 *
 * Unit tests for the global demo mode service.
 * Tests localStorage interactions and event dispatching.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
  toggleDemoMode,
  getDemoSyncStatus,
  setDemoSyncStatus,
  clearDemoSyncStatus,
  DemoSyncStatus,
} from './demo-mode.service';

describe('Demo Mode Service', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  // Mock window.dispatchEvent
  const dispatchEventMock = vi.fn();

  beforeEach(() => {
    // Reset mocks
    localStorageMock.clear();
    vi.clearAllMocks();

    // Replace global localStorage
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Replace dispatchEvent
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: localStorageMock,
        dispatchEvent: dispatchEventMock,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isDemoMode', () => {
    it('returns true by default (demo mode ON by default)', () => {
      expect(isDemoMode()).toBe(true);
    });

    it('returns false when explicitly set to "false"', () => {
      localStorageMock.setItem('app-demo-mode', 'false');
      expect(isDemoMode()).toBe(false);
    });

    it('returns true when set to "true"', () => {
      localStorageMock.setItem('app-demo-mode', 'true');
      expect(isDemoMode()).toBe(true);
    });

    it('returns true for any value other than "false"', () => {
      localStorageMock.setItem('app-demo-mode', 'invalid');
      expect(isDemoMode()).toBe(true);
    });
  });

  describe('enableDemoMode', () => {
    it('sets localStorage to "true"', () => {
      enableDemoMode();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('app-demo-mode', 'true');
    });

    it('dispatches demo-mode-changed event with isDemo: true', () => {
      enableDemoMode();
      expect(dispatchEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'demo-mode-changed',
          detail: { isDemo: true },
        })
      );
    });
  });

  describe('disableDemoMode', () => {
    it('sets localStorage to "false"', () => {
      disableDemoMode();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('app-demo-mode', 'false');
    });

    it('dispatches demo-mode-changed event with isDemo: false', () => {
      disableDemoMode();
      expect(dispatchEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'demo-mode-changed',
          detail: { isDemo: false },
        })
      );
    });
  });

  describe('toggleDemoMode', () => {
    it('toggles from ON to OFF', () => {
      // Demo mode is ON by default
      const result = toggleDemoMode();
      expect(result).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('app-demo-mode', 'false');
    });

    it('toggles from OFF to ON', () => {
      localStorageMock.setItem('app-demo-mode', 'false');
      const result = toggleDemoMode();
      expect(result).toBe(true);
    });

    it('returns the new state', () => {
      expect(toggleDemoMode()).toBe(false); // ON -> OFF
      expect(toggleDemoMode()).toBe(true); // OFF -> ON
    });
  });

  describe('getDemoSyncStatus', () => {
    it('returns default status when nothing stored', () => {
      const status = getDemoSyncStatus();
      expect(status).toEqual({
        hasSynced: false,
        lastSyncAt: null,
        activityCount: 0,
        entryCount: 0,
        clusterCount: 0,
      });
    });

    it('parses stored status from localStorage', () => {
      const storedStatus: DemoSyncStatus = {
        hasSynced: true,
        lastSyncAt: '2024-01-15T10:00:00Z',
        activityCount: 42,
        entryCount: 5,
        clusterCount: 3,
      };
      localStorageMock.setItem('app-demo-sync-status', JSON.stringify(storedStatus));

      const status = getDemoSyncStatus();
      expect(status).toEqual(storedStatus);
    });

    it('returns default status on parse error', () => {
      localStorageMock.setItem('app-demo-sync-status', 'invalid json');

      const status = getDemoSyncStatus();
      expect(status).toEqual({
        hasSynced: false,
        lastSyncAt: null,
        activityCount: 0,
        entryCount: 0,
        clusterCount: 0,
      });
    });
  });

  describe('setDemoSyncStatus', () => {
    it('stores status as JSON in localStorage', () => {
      const status: DemoSyncStatus = {
        hasSynced: true,
        lastSyncAt: '2024-01-15T10:00:00Z',
        activityCount: 10,
        entryCount: 2,
        clusterCount: 1,
      };

      setDemoSyncStatus(status);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'app-demo-sync-status',
        JSON.stringify(status)
      );
    });

    it('dispatches demo-sync-status-changed event', () => {
      const status: DemoSyncStatus = {
        hasSynced: true,
        lastSyncAt: null,
        activityCount: 5,
        entryCount: 1,
        clusterCount: 1,
      };

      setDemoSyncStatus(status);

      expect(dispatchEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'demo-sync-status-changed',
          detail: status,
        })
      );
    });
  });

  describe('clearDemoSyncStatus', () => {
    it('removes status from localStorage', () => {
      clearDemoSyncStatus();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('app-demo-sync-status');
    });

    it('dispatches event with default status', () => {
      clearDemoSyncStatus();

      expect(dispatchEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'demo-sync-status-changed',
          detail: {
            hasSynced: false,
            lastSyncAt: null,
            activityCount: 0,
            entryCount: 0,
            clusterCount: 0,
          },
        })
      );
    });
  });
});
