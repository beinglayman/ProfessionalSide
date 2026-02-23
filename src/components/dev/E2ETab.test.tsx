import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { E2ETab } from './E2ETab';

// --- Mocks ---

const mockLogout = vi.fn();
const mockDelete = vi.fn();
const mockGet = vi.fn();
const mockClear = vi.fn();

vi.mock('../../services/auth.service', () => ({
  AuthService: {
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

vi.mock('../../lib/api', () => ({
  api: {
    delete: (...args: any[]) => mockDelete(...args),
    get: (...args: any[]) => mockGet(...args),
  },
}));

vi.mock('../../lib/queryClient', () => ({
  queryClient: {
    clear: (...args: any[]) => mockClear(...args),
  },
}));

// --- Helpers ---

// Capture window.location.href assignments
let locationAssign: string | undefined;
const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  locationAssign = undefined;

  // Mock window.location.href setter
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      ...originalLocation,
      href: originalLocation.href,
      assign: vi.fn(),
    },
  });
  Object.defineProperty(window.location, 'href', {
    set: (url: string) => { locationAssign = url; },
    get: () => originalLocation.href,
  });

  // Default: all data-fetching endpoints return empty
  mockGet.mockResolvedValue({ data: { data: null } });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
  cleanup();
});

// --- Tests ---

describe('E2ETab', () => {
  describe('Rendering', () => {
    it('renders Reset Session and Delete User sections', () => {
      render(<E2ETab />);

      expect(screen.getAllByText('Reset Session').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/delete user/i).length).toBeGreaterThanOrEqual(1);
    });

    it('shows Reset Session button', () => {
      render(<E2ETab />);
      expect(screen.getByRole('button', { name: /reset session/i })).toBeInTheDocument();
    });

    it('shows Delete User button', () => {
      render(<E2ETab />);
      expect(screen.getByRole('button', { name: /delete user/i })).toBeInTheDocument();
    });

    it('shows data preview section', () => {
      render(<E2ETab />);
      expect(screen.getByText('What will be deleted')).toBeInTheDocument();
    });
  });

  describe('Reset Session', () => {
    it('calls AuthService.logout and clears local state', async () => {
      mockLogout.mockResolvedValue(undefined);
      const clearStorage = vi.spyOn(Storage.prototype, 'clear');

      render(<E2ETab />);
      fireEvent.click(screen.getByRole('button', { name: /reset session/i }));

      await vi.waitFor(() => {
        expect(mockLogout).toHaveBeenCalledOnce();
      });

      expect(mockClear).toHaveBeenCalled();
      expect(locationAssign).toBe('/login');

      clearStorage.mockRestore();
    });

    it('still clears state and redirects when logout fails (fail-safe)', async () => {
      mockLogout.mockRejectedValue(new Error('Network error'));
      const clearStorage = vi.spyOn(Storage.prototype, 'clear');

      render(<E2ETab />);
      fireEvent.click(screen.getByRole('button', { name: /reset session/i }));

      await vi.waitFor(() => {
        expect(mockLogout).toHaveBeenCalledOnce();
      });

      expect(mockClear).toHaveBeenCalled();
      expect(locationAssign).toBe('/login');

      clearStorage.mockRestore();
    });
  });

  describe('Delete User', () => {
    it('shows confirm/cancel buttons after clicking Delete User', () => {
      render(<E2ETab />);

      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));

      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls hard-delete endpoint and redirects on success', async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      render(<E2ETab />);

      // Click Delete User, then Confirm Delete
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
      fireEvent.click(screen.getByText('Confirm Delete'));

      await vi.waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/users/hard-delete');
      });

      expect(locationAssign).toBe('/login');
    });

    it('shows error when hard-delete fails', async () => {
      mockDelete
        .mockResolvedValueOnce({}) // MCP data wipe succeeds
        .mockRejectedValueOnce({
          response: { data: { error: 'Hard delete is not available in production' } },
        });

      render(<E2ETab />);

      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
      fireEvent.click(screen.getByText('Confirm Delete'));

      await vi.waitFor(() => {
        expect(
          screen.getByText('Hard delete is not available in production')
        ).toBeInTheDocument();
      });
    });

    it('cancel button hides confirm buttons', () => {
      render(<E2ETab />);

      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });
  });
});
