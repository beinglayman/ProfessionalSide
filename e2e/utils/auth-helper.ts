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

export type CredentialProfile = 'default' | 'real-oauth';

export interface CredentialOptions {
  profile?: CredentialProfile;
}

const REAL_OAUTH_PROFILE: CredentialProfile = 'real-oauth';

function resolveEnvKeys(profile: CredentialProfile): {
  emailKey: string;
  passwordKey: string;
} {
  if (profile === REAL_OAUTH_PROFILE) {
    return {
      emailKey: 'E2E_REAL_EMAIL',
      passwordKey: 'E2E_REAL_PASSWORD',
    };
  }

  return {
    emailKey: 'E2E_EMAIL',
    passwordKey: 'E2E_PASSWORD',
  };
}

function resolveCredentials(profile: CredentialProfile): AuthCredentials {
  const { emailKey, passwordKey } = resolveEnvKeys(profile);
  const fallbackToDefault = profile === REAL_OAUTH_PROFILE;

  const email =
    process.env[emailKey] || (fallbackToDefault ? process.env.E2E_EMAIL : undefined);
  const password =
    process.env[passwordKey] || (fallbackToDefault ? process.env.E2E_PASSWORD : undefined);

  if (!email || !password) {
    const guidance = profile === REAL_OAUTH_PROFILE
      ? 'Set E2E_REAL_EMAIL + E2E_REAL_PASSWORD (or fallback E2E_EMAIL + E2E_PASSWORD).'
      : 'Set E2E_EMAIL + E2E_PASSWORD.';

    throw new Error(`Missing E2E credentials for profile "${profile}". ${guidance}`);
  }

  return { email, password };
}

/**
 * Load credentials from environment variables
 */
export function getCredentials(options: CredentialOptions = {}): AuthCredentials {
  return resolveCredentials(options.profile || 'default');
}

/**
 * Load credentials for real OAuth provider tests.
 * Falls back to E2E_EMAIL/E2E_PASSWORD when dedicated real credentials are not set.
 */
export function getRealOAuthCredentials(): AuthCredentials {
  return resolveCredentials(REAL_OAUTH_PROFILE);
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
