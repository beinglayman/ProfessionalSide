import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { E2ETab } from './E2ETab';

// --- Mocks ---

const mockLogout = vi.fn();
const mockDelete = vi.fn();
const mockClear = vi.fn();

vi.mock('../../services/auth.service', () => ({
  AuthService: {
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

vi.mock('../../lib/api', () => ({
  api: {
    delete: (...args: any[]) => mockDelete(...args),
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

  // Mock window.confirm to auto-accept
  vi.spyOn(window, 'confirm').mockReturnValue(true);
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

      // Heading + button both contain these texts, so use getAllByText
      expect(screen.getAllByText('Reset Session').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Delete User').length).toBeGreaterThanOrEqual(1);
    });

    it('shows Reset Session button', () => {
      render(<E2ETab />);
      expect(screen.getByRole('button', { name: /reset session/i })).toBeInTheDocument();
    });

    it('shows Delete User button', () => {
      render(<E2ETab />);
      expect(screen.getByRole('button', { name: /delete user/i })).toBeInTheDocument();
    });
  });

  describe('Reset Session', () => {
    it('calls AuthService.logout and clears local state', async () => {
      mockLogout.mockResolvedValue(undefined);
      const clearStorage = vi.spyOn(Storage.prototype, 'clear');

      render(<E2ETab />);
      fireEvent.click(screen.getByRole('button', { name: /reset session/i }));

      // Wait for async logout
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

      // Should still clear and redirect despite logout failure
      expect(mockClear).toHaveBeenCalled();
      expect(locationAssign).toBe('/login');

      clearStorage.mockRestore();
    });

    it('does nothing when confirm is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<E2ETab />);
      fireEvent.click(screen.getByRole('button', { name: /reset session/i }));

      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('Delete User', () => {
    it('shows type-to-confirm after first confirm dialog', () => {
      render(<E2ETab />);

      // Click Delete User button
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));

      // Should show type-to-confirm input
      expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    it('does not show confirm dialog when window.confirm is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<E2ETab />);
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));

      // Should NOT show type-to-confirm
      expect(screen.queryByPlaceholderText('Type DELETE')).not.toBeInTheDocument();
    });

    it('confirm button is disabled until user types DELETE', () => {
      render(<E2ETab />);
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));

      const confirmBtn = screen.getByText('Confirm Delete');
      expect(confirmBtn).toBeDisabled();

      // Type partial text
      fireEvent.change(screen.getByPlaceholderText('Type DELETE'), {
        target: { value: 'DEL' },
      });
      expect(confirmBtn).toBeDisabled();

      // Type full text
      fireEvent.change(screen.getByPlaceholderText('Type DELETE'), {
        target: { value: 'DELETE' },
      });
      expect(confirmBtn).not.toBeDisabled();
    });

    it('calls hard-delete endpoint and redirects on success', async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      render(<E2ETab />);

      // Step 1: click Delete User
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));

      // Step 2: type DELETE and confirm
      fireEvent.change(screen.getByPlaceholderText('Type DELETE'), {
        target: { value: 'DELETE' },
      });
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
      fireEvent.change(screen.getByPlaceholderText('Type DELETE'), {
        target: { value: 'DELETE' },
      });
      fireEvent.click(screen.getByText('Confirm Delete'));

      await vi.waitFor(() => {
        expect(
          screen.getByText('Hard delete is not available in production')
        ).toBeInTheDocument();
      });
    });

    it('cancel button hides confirm dialog', () => {
      render(<E2ETab />);

      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
      expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText('Type DELETE')).not.toBeInTheDocument();
    });
  });
});
