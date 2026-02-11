/**
 * RegisterPage Tests
 *
 * Tests for:
 * - Form rendering (email, password, confirm password)
 * - Client-side validation (password match, length, complexity)
 * - Form submission with valid data
 * - Error display on registration failure
 * - Password visibility toggles
 * - Navigation link to login page
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './register';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    isLoading: false,
  }),
}));

vi.mock('../../components/layouts/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RegisterPage', () => {
  describe('Rendering', () => {
    it('renders the heading', () => {
      renderRegisterPage();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderRegisterPage();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      renderRegisterPage();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('renders login link', () => {
      renderRegisterPage();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  describe('Client-Side Validation', () => {
    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1');
      await user.type(screen.getByLabelText('Confirm password'), 'Password2');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Abc1');
      await user.type(screen.getByLabelText('Confirm password'), 'Abc1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows error when password lacks uppercase', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password1');
      await user.type(screen.getByLabelText('Confirm password'), 'password1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText(/must contain at least one lowercase letter, one uppercase letter/)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows error when password lacks number', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Passwordd');
      await user.type(screen.getByLabelText('Confirm password'), 'Passwordd');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText(/must contain at least one lowercase letter, one uppercase letter, and one number/)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows error when password lacks lowercase', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'PASSWORD1');
      await user.type(screen.getByLabelText('Confirm password'), 'PASSWORD1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText(/must contain at least one lowercase letter, one uppercase letter, and one number/)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('Successful Registration', () => {
    it('calls register with name, email, password', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({});
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1');
      await user.type(screen.getByLabelText('Confirm password'), 'Password1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          name: 'User',
          email: 'test@example.com',
          password: 'Password1',
        });
      });
    });

    it('navigates to /onboarding on success', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({});
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1');
      await user.type(screen.getByLabelText('Confirm password'), 'Password1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  describe('Registration Failure', () => {
    it('shows error message from server', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce(new Error('Email already registered'));
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'taken@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1');
      await user.type(screen.getByLabelText('Confirm password'), 'Password1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('shows fallback error on unexpected failure', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce({});
      renderRegisterPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1');
      await user.type(screen.getByLabelText('Confirm password'), 'Password1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('An error occurred during registration. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Password Toggle', () => {
    it('toggles password field visibility', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = passwordInput.closest('div')!.querySelector('button')!;
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('toggles confirm password field visibility', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const confirmInput = screen.getByLabelText('Confirm password');
      expect(confirmInput).toHaveAttribute('type', 'password');

      const toggleButton = confirmInput.closest('div')!.querySelector('button')!;
      await user.click(toggleButton);

      expect(confirmInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Error Clearing', () => {
    it('clears previous error on new submission', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      // Trigger mismatch error
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1');
      await user.type(screen.getByLabelText('Confirm password'), 'Password2');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

      // Fix and resubmit
      await user.clear(screen.getByLabelText('Confirm password'));
      await user.type(screen.getByLabelText('Confirm password'), 'Password1');
      mockRegister.mockResolvedValueOnce({});
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
      });
    });
  });
});
