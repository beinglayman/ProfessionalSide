/**
 * LoginPage Tests
 *
 * Tests for:
 * - Form rendering (email, password fields, submit button)
 * - Form submission with valid credentials
 * - Error display on login failure
 * - Password visibility toggle
 * - Loading state during submission
 * - Navigation link to register page
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin = vi.fn();
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
    login: mockLogin,
    isLoading: false,
  }),
}));

// Mock AuthLayout to render children without the full carousel
vi.mock('../../components/layouts/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  describe('Rendering', () => {
    it('renders the heading', () => {
      renderLoginPage();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('renders email and password fields', () => {
      renderLoginPage();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      renderLoginPage();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      renderLoginPage();
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('renders register link', () => {
      renderLoginPage();
      expect(screen.getByText('Create one')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls login with email and password on submit', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({});
      renderLoginPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('navigates to /timeline on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({});
      renderLoginPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/timeline');
      });
    });

    it('shows error message on login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderLoginPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('shows fallback error on unexpected failure shape', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce({});
      renderLoginPage();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Password Toggle', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click the toggle button (the eye icon button)
      const toggleButton = screen.getByLabelText('Password')
        .closest('div')!
        .querySelector('button')!;
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });
});
