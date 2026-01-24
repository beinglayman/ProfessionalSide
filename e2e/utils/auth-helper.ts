import { Page } from '@playwright/test';

/**
 * Authentication Helper for E2E Tests
 *
 * Handles login flow for authenticated screenshot capture.
 * Credentials loaded from environment variables (e2e/.env.e2e)
 */

/** Max time to wait for login redirect (ms) */
const LOGIN_TIMEOUT_MS = 30000;

/** Delay after login for page to stabilize (ms) */
const POST_LOGIN_DELAY_MS = 1000;

export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Load credentials from environment variables
 */
export function getCredentials(): AuthCredentials {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing E2E credentials. Set E2E_EMAIL and E2E_PASSWORD environment variables.\n' +
        'You can create e2e/.env.e2e file (see e2e/.env.example)'
    );
  }

  return { email, password };
}

/**
 * Login to the application
 *
 * @param page - Playwright page
 * @param credentials - Optional credentials (uses env vars if not provided)
 */
export async function login(
  page: Page,
  credentials?: AuthCredentials
): Promise<void> {
  const { email, password } = credentials || getCredentials();

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in credentials using label-based selectors for reliability
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);

  // Click login button
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: LOGIN_TIMEOUT_MS,
  });

  // Wait for the page to stabilize after login redirect
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(POST_LOGIN_DELAY_MS);
}

// NOTE: Removed unused functions (isLoggedIn, logout, saveAuthState, etc.)
// per Code Masters review. Add back when needed for auth state persistence.
